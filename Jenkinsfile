// AviQR Jenkins pipeline — build once, deploy to staging automatically,
// promote the SAME artifact to production behind a manual approval gate.
//
// One-time Jenkins/server setup required before this runs: see
// aviqr-backend/deploy/JENKINS_PIPELINE.md
//
// Flow (Package/Deploy/Promote stages only run on `master`; feature branches
// and PRs just get Build & Test — same split as .github/workflows/ci.yml):
//   Build & Test (parallel) -> Package release -> Deploy to Staging
//   -> Smoke test staging -> [manual approval] -> Deploy to Production

pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds(abortPrevious: true)
    buildDiscarder(logRotator(numToKeepStr: '30'))
  }

  environment {
    STAGING_HOST        = 'staging.aviqr.in'
    STAGING_USER        = 'deploy'
    STAGING_API_URL     = 'https://staging-api.aviqr.in'
    PRODUCTION_HOST     = 'api.aviqr.in'
    PRODUCTION_USER     = 'deploy'
    PRODUCTION_API_URL  = 'https://api.aviqr.in'
    RELEASE_ID          = "${env.GIT_COMMIT ? env.GIT_COMMIT.take(12) : 'build-' + env.BUILD_NUMBER}"
  }

  stages {

    stage('Build & Test') {
      parallel {
        stage('Backend') {
          steps {
            dir('aviqr-backend') {
              sh './gradlew build --no-daemon'
            }
          }
          post {
            always {
              junit testResults: 'aviqr-backend/*/build/test-results/test/*.xml', allowEmptyResults: true
            }
          }
        }
        stage('Web') {
          steps {
            dir('aviqr-ui-web') {
              sh 'npm ci'
              sh 'npm test'
            }
          }
        }
        stage('Mobile') {
          steps {
            dir('aviqr-mobile-expo') {
              sh 'npm ci'
              sh 'npm run test:logic'
              sh 'npm run test:components'
            }
          }
        }
      }
    }

    stage('Package release') {
      when { branch 'master' }
      steps {
        sh "aviqr-backend/deploy/package-release.sh '${RELEASE_ID}' '${STAGING_API_URL}' '${PRODUCTION_API_URL}'"
        archiveArtifacts artifacts: "release-${RELEASE_ID}.tar.gz", fingerprint: true
      }
    }

    stage('Deploy to Staging') {
      when { branch 'master' }
      steps {
        sshagent(credentials: ['staging-ssh-key']) {
          sh """
            ssh -o StrictHostKeyChecking=accept-new ${STAGING_USER}@${STAGING_HOST} 'mkdir -p /var/www/aviqr/incoming'
            scp -o StrictHostKeyChecking=accept-new release-${RELEASE_ID}.tar.gz ${STAGING_USER}@${STAGING_HOST}:/var/www/aviqr/incoming/
            ssh -o StrictHostKeyChecking=accept-new ${STAGING_USER}@${STAGING_HOST} 'bash /var/www/aviqr/aviqr-backend/deploy/release.sh staging ${RELEASE_ID} /var/www/aviqr/incoming/release-${RELEASE_ID}.tar.gz'
          """
        }
      }
    }

    stage('Smoke test staging') {
      when { branch 'master' }
      steps {
        sh "curl -sf ${STAGING_API_URL}/actuator/health | grep -q '\"status\":\"UP\"'"
        // Optional: run a fast subset of aviqr-api-tests against staging here,
        // e.g. `pytest test_health.py test_auth.py --base-url ${STAGING_API_URL}`
      }
    }

    // NOTE: this pauses on an executor while waiting for approval. Fine for a
    // small single-agent setup; if that starts blocking other builds, move to
    // `agent none` at the pipeline level with `stash`/`unstash` between stages
    // so only this stage runs with no node held.
    stage('Promote to Production?') {
      when { branch 'master' }
      steps {
        timeout(time: 24, unit: 'HOURS') {
          input message: "Deploy ${RELEASE_ID} (verified on staging) to PRODUCTION?", submitter: 'release-approvers'
        }
      }
    }

    stage('Deploy to Production') {
      when { branch 'master' }
      steps {
        sshagent(credentials: ['production-ssh-key']) {
          sh """
            ssh -o StrictHostKeyChecking=accept-new ${PRODUCTION_USER}@${PRODUCTION_HOST} 'mkdir -p /var/www/aviqr/incoming'
            scp -o StrictHostKeyChecking=accept-new release-${RELEASE_ID}.tar.gz ${PRODUCTION_USER}@${PRODUCTION_HOST}:/var/www/aviqr/incoming/
            ssh -o StrictHostKeyChecking=accept-new ${PRODUCTION_USER}@${PRODUCTION_HOST} 'bash /var/www/aviqr/aviqr-backend/deploy/release.sh production ${RELEASE_ID} /var/www/aviqr/incoming/release-${RELEASE_ID}.tar.gz'
          """
        }
      }
    }
  }

  post {
    success { echo "Pipeline succeeded for release ${RELEASE_ID}" }
    failure { echo "Pipeline failed for release ${RELEASE_ID} — check stage logs above" }
    always {
      archiveArtifacts artifacts: 'aviqr-backend/*/build/reports/tests/**', allowEmptyArchive: true, fingerprint: false
    }
  }
}
