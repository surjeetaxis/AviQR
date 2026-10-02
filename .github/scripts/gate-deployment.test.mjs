import test from 'node:test';import assert from 'node:assert/strict';
import {gateDeployment,requiredWorkflows} from './gate-deployment.mjs';
const sha='a'.repeat(40),controlSha='b'.repeat(40);
function fixture({conclusion='success',status='completed',changed=false,skipped=false,wrongSha=false}={}){
 return {rest:{repos:{getContent:async({ref})=>({data:{sha:changed&&ref===sha?'changed':'trusted'}})},actions:{listWorkflowRuns:async()=>({data:{workflow_runs:[{id:1,head_sha:wrongSha?'c'.repeat(40):sha,status,conclusion}]}}),listJobsForWorkflowRun:()=>{}}},paginate:async()=>Object.values(requiredWorkflows).flat().map((name,index)=>({name,conclusion:skipped&&index===0?'skipped':'success'}))};
}
test('permits successful exact commit with all expected jobs',()=>gateDeployment(fixture(),{owner:'owner',repo:'repo',sha,controlSha}));
for(const [name,options] of Object.entries({failed:{conclusion:'failure'},running:{status:'in_progress'},changed:{changed:true},skipped:{skipped:true},wrongCommit:{wrongSha:true}}))test(`rejects ${name}`,()=>assert.rejects(gateDeployment(fixture(options),{owner:'owner',repo:'repo',sha,controlSha})));
