export const requiredWorkflows = {
 'ci.yml':['Backend (build + unit tests)','Web (test + build)','Mobile (logic + component tests)','Deployment gate tests'],
 'security.yml':['Secrets','Dependencies','Infrastructure','SAST (java-kotlin)','SAST (javascript-typescript)'],
};
export async function gateDeployment(github,{owner,repo,sha,controlSha}){
 if(!/^[a-f0-9]{40}$/.test(sha)||!/^[a-f0-9]{40}$/.test(controlSha))throw new Error('Deployment requires resolved commit SHAs');
 for(const path of ['.github/scripts/check-sarif.mjs','.github/scripts/gate-deployment.mjs']){
  const [trusted,target]=await Promise.all([github.rest.repos.getContent({owner,repo,path,ref:controlSha}),github.rest.repos.getContent({owner,repo,path,ref:sha})]);
  if(trusted.data.sha!==target.data.sha)throw new Error(`${path} differs from the security control in the workflow revision`);
 }
 for(const [workflow,requiredJobs] of Object.entries(requiredWorkflows)){
  const path=`.github/workflows/${workflow}`;
  const [trusted,target]=await Promise.all([github.rest.repos.getContent({owner,repo,path,ref:controlSha}),github.rest.repos.getContent({owner,repo,path,ref:sha})]);
  if(trusted.data.sha!==target.data.sha)throw new Error(`${workflow} differs from the workflow revision that started deployment; run the deployment from a branch containing the same pipeline controls`);
  const response=await github.rest.actions.listWorkflowRuns({owner,repo,workflow_id:workflow,head_sha:sha,event:'push',per_page:100});
  const run=response.data.workflow_runs.filter(r=>r.head_sha===sha).sort((a,b)=>b.id-a.id)[0];
  if(!run || run.status!=='completed'||run.conclusion!=='success')throw new Error(`${workflow} must pass for the exact deployment commit`);
  const jobs=await github.paginate(github.rest.actions.listJobsForWorkflowRun,{owner,repo,run_id:run.id,filter:'latest',per_page:100});
  for(const name of requiredJobs)if(!jobs.some(job=>job.name===name&&job.conclusion==='success'))throw new Error(`${name} must pass; skipped checks do not qualify`);
 }
}
