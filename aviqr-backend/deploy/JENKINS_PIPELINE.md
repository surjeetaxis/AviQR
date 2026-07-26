# Jenkins staging → production pipeline

How this repo goes live: `Jenkinsfile` (repo root) builds every service once,
auto-deploys that build to **staging**, then — after a human approves — promotes
the *exact same* backend jars to **production**. This replaces the old flow
where each redeploy re-ran `git checkout <ref> && gradlew build` on the box
itself (`deploy/deploy.sh`, still kept for manual/emergency use).

```
push to master
  └─ Build & Test (parallel: backend / web / mobile)
       └─ Package release        — jars built once; web built twice (staging
       │                           API URL, production API URL) since Vite
       │                           inlines VITE_API_URL at build time
       └─ Deploy to Staging       — auto, no approval
            └─ Smoke test staging
                 └─ Promote to Production?  — manual `input`, gated
                      └─ Deploy to Production — same jars as staging, just
                                                 the prod-flavored web bundle
```

Rollback on either box is now a symlink swap + service restart (`release.sh`),
not a rebuild — seconds instead of minutes, and it can't fail due to a bad
`git checkout` mid-rollback the way the old script could.

## 1. One-time change on the existing production server

Today's systemd units point `ExecStart` at the live git checkout
(`/var/www/aviqr/aviqr-backend/<svc>/build/libs/<svc>-1.0.0.jar`). The release
model needs a stable path that a symlink can repoint, independent of the git
working tree. Run once, during a maintenance window:

```bash
sudo systemctl stop 'aviqr-*'

mkdir -p /var/www/aviqr/releases
# One-off bootstrap release from what's live right now, so `current` has
# something to point at before the first Jenkins deploy:
BOOT=bootstrap
mkdir -p /var/www/aviqr/releases/$BOOT/backend /var/www/aviqr/releases/$BOOT/web
for svc in service-registry api-gateway auth-service shop-mall-service menu-ocr-service \
           order-qr-service payment-service hotel-service support-service \
           notification-report-review-service; do
  cp /var/www/aviqr/aviqr-backend/$svc/build/libs/$svc-1.0.0.jar \
     /var/www/aviqr/releases/$BOOT/backend/$svc.jar
done
cp -r /var/www/aviqr/aviqr-ui-web/dist /var/www/aviqr/releases/$BOOT/web/dist-production
ln -sfn /var/www/aviqr/releases/$BOOT/web/dist-production /var/www/aviqr/releases/$BOOT/web/dist-current
ln -sfn /var/www/aviqr/releases/$BOOT /var/www/aviqr/current

# Point every unit at the stable path instead of the git checkout:
for svc in service-registry api-gateway auth-service shop-mall-service menu-ocr-service \
           order-qr-service payment-service hotel-service support-service \
           notification-report-review-service; do
  sudo sed -i "s#ExecStart=.*#ExecStart=/usr/bin/java --enable-preview -Xms256m -Xmx512m -Dspring.profiles.active=production -jar /var/www/aviqr/current/backend/${svc}.jar#" \
    /etc/systemd/system/aviqr-${svc}.service
done
sudo systemctl daemon-reload

# Nginx: change the static root from aviqr-ui-web/dist to the stable path
sudo sed -i 's#root /var/www/aviqr/aviqr-ui-web/dist;#root /var/www/aviqr/current/web/dist-current;#' \
  /etc/nginx/sites-available/aviqr
sudo nginx -t && sudo systemctl reload nginx

sudo systemctl start 'aviqr-*'
```

Also create a `deploy` system user (or reuse the existing SSH deploy user) that
can run `sudo systemctl restart/status/is-active aviqr-*` and `sudo systemctl
reload nginx` passwordless — same sudoers snippet already used for the GitHub
Actions deploy in `DEPLOYMENT_NO_DOCKER.md`.

## 2. Provision the new staging server

Staging is a **separate VM**, not a second set of processes on the prod box —
so a crashed load test or bad migration on staging can't take prod down. Repeat
`DEPLOYMENT_NO_DOCKER.md` Part 2 ("LIVE SERVER") on the new box end to end
(Java 21, Postgres/Mongo/Redis/RabbitMQ, per-service `aviqr_<svc>` databases,
Nginx, systemd units), with two differences:

- Every systemd unit sets `Environment=SPRING_PROFILES_ACTIVE=staging` (not
  `production`) and `ExecStart` uses `/var/www/aviqr/current/backend/<svc>.jar`
  from the start — do steps 1's stable-path setup as part of the initial
  install rather than retrofitting it.
- DNS/TLS: `staging.aviqr.in` (web) and `staging-api.aviqr.in` (gateway),
  certbot cert for both.

Every service already ships an `application-staging.properties` next to
`application-production.properties` (see e.g.
`order-qr-service/src/main/resources/`), so no code changes are needed — the
profile just needs to actually be activated on this box.

## 3. Jenkins setup (one time)

- **Plugins**: Pipeline, Git, SSH Agent Plugin, Timestamper.
- **Credentials** (Manage Jenkins → Credentials): `staging-ssh-key` and
  `production-ssh-key`, each an "SSH Username with private key" for the
  `deploy` user on that box.
- **Job**: a Multibranch Pipeline (or single Pipeline job) pointed at this repo
  so it picks up `Jenkinsfile` automatically on push.
- **Approvers**: the `input` step's `submitter: 'release-approvers'` refers to
  a Jenkins user/group name — create that group (Manage Jenkins → Users, or
  your role-strategy plugin) and add whoever should be allowed to click
  "Deploy to Production". Anyone not in that list can view but not approve.
- Adjust the `STAGING_HOST` / `PRODUCTION_HOST` / `*_API_URL` values at the top
  of `Jenkinsfile` if the actual hostnames differ from the placeholders above.

## 4. What to do with the existing GitHub Actions workflows

`.github/workflows/ci.yml` and `deploy-production.yml` still work and can stay
as a backup/reference. Once the Jenkins pipeline is verified end-to-end,
disable `deploy-production.yml`'s triggers (or delete it) so the same push
doesn't get deployed to production twice, from two different systems.
`ci.yml` can keep running as the PR gate, or be retired in favor of Jenkins's
`Build & Test` stage — either is fine, they do the same checks.
