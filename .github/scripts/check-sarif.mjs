import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const locationOf=result=>result.locations?.[0]?.physicalLocation?.artifactLocation?.uri||'';
// An exception applies to one rule in one file, needs a reason, and stops applying on its expiry date.
export function activeExceptions(entries,today=new Date().toISOString().slice(0,10)){
 if(!Array.isArray(entries))throw new Error('SAST exceptions must be a list');
 for(const e of entries)if(!e.rule||!e.path||!e.reason||!/^\d{4}-\d{2}-\d{2}$/.test(e.expires||''))throw new Error(`Invalid SAST exception: ${JSON.stringify(e)}`);
 return entries.filter(e=>e.expires>=today);
}
export function highSeverityFindings(document,exceptions=[]){
 if(!Array.isArray(document.runs)||document.runs.length===0)throw new Error('Missing SAST analysis results');
 const findings=[];
 for(const run of document.runs){
  for(const notice of run.invocations||[])if(notice.executionSuccessful===false)throw new Error('SAST execution failed');
  const drivers=[run.tool?.driver,...(run.tool?.extensions||[])].filter(Boolean);
  for(const result of run.results||[]){
   const rules=drivers.flatMap(driver=>driver.rules||[]);const rule=rules.find(rule=>rule.id===result.ruleId);
   const severity=Number(rule?.properties?.['security-severity']||0);
   if(!(severity>=7 || result.level==='error'))continue;
   const path=locationOf(result);
   if(exceptions.some(e=>e.rule===result.ruleId&&e.path===path)){console.log('Accepted SAST exception:',result.ruleId,path);continue;}
   findings.push(path?`${result.ruleId||'unknown rule'} at ${path}:${result.locations[0].physicalLocation.region?.startLine??'?'}`:(result.ruleId||'unknown rule'));
  }
 }
 return findings;
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
 const directory=process.argv[2];const files=readdirSync(directory).filter(name=>name.endsWith('.sarif'));if(files.length===0)throw new Error('No SAST reports found');
 const exceptionFile=process.argv[3]||'.github/security/sast-exceptions.json';
 const exceptions=existsSync(exceptionFile)?activeExceptions(JSON.parse(readFileSync(exceptionFile,'utf8'))):[];
 let count=0;for(const file of files){const findings=highSeverityFindings(JSON.parse(readFileSync(join(directory,file),'utf8')),exceptions);count+=findings.length;for(const finding of findings)console.error('High severity SAST finding:',finding);}
 if(count>0)throw new Error(`${count} SAST findings block deployment`);
 console.log('SAST severity gate passed.');
}
