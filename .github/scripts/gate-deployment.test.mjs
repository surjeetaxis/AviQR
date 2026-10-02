import test from 'node:test';import assert from 'node:assert/strict';
import {gateDeployment,requiredWorkflows} from './gate-deployment.mjs';
const sha='a'.repeat(40),controlSha='b'.repeat(40);
function fixture({conclusion='success',status='completed',changed=false,skipped=false,wrongSha=false}={}){
 return {rest:{repos:{getContent:async({ref})=>({data:{sha:changed&&ref===sha?'changed':'trusted'}})},actions:{listWorkflowRuns:async()=>({data:{workflow_runs:[{id:1,head_sha:wrongSha?'c'.repeat(40):sha,status,conclusion}]}}),listJobsForWorkflowRun:()=>{}}},paginate:async()=>Object.values(requiredWorkflows).flat().map((name,index)=>({name,conclusion:skipped&&index===0?'skipped':'success'}))};
}
test('permits successful exact commit with all expected jobs',()=>gateDeployment(fixture(),{owner:'owner',repo:'repo',sha,controlSha}));
for(const [name,options] of Object.entries({failed:{conclusion:'failure'},running:{status:'in_progress'},changed:{changed:true},skipped:{skipped:true},wrongCommit:{wrongSha:true}}))test(`rejects ${name}`,()=>assert.rejects(gateDeployment(fixture(options),{owner:'owner',repo:'repo',sha,controlSha,timeoutMs:0})));
test('waits for queued and running checks, then verifies completed jobs',async()=>{
 const github=fixture();let calls=0,waits=0,time=0;
 github.rest.actions.listWorkflowRuns=async()=>({data:{workflow_runs:++calls===1?[]:[{id:1,head_sha:sha,status:calls===2?'queued':calls===3?'in_progress':'completed',conclusion:calls>3?'success':null}]}});
 await gateDeployment(github,{owner:'owner',repo:'repo',sha,controlSha,timeoutMs:100,pollMs:10,now:()=>time,sleep:async ms=>{time+=ms;waits++;},log:()=>{}});
 assert.equal(waits,3);
});
test('a check that fails after waiting still blocks deployment',async()=>{
 const github=fixture();let calls=0;
 github.rest.actions.listWorkflowRuns=async()=>({data:{workflow_runs:[{id:1,head_sha:sha,status:++calls===1?'in_progress':'completed',conclusion:calls===1?null:'failure'}]}});
 await assert.rejects(gateDeployment(github,{owner:'owner',repo:'repo',sha,controlSha,sleep:async()=>{},log:()=>{}}),/finished with failure/);
});
