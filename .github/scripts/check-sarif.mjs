import {readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
export function highSeverityFindings(document){
 if(!Array.isArray(document.runs)||document.runs.length===0)throw new Error('Missing SAST analysis results');
 const findings=[];
 for(const run of document.runs){
  for(const notice of run.invocations||[])if(notice.executionSuccessful===false)throw new Error('SAST execution failed');
  const drivers=[run.tool?.driver,...(run.tool?.extensions||[])].filter(Boolean);
  for(const result of run.results||[]){
   const rules=drivers.flatMap(driver=>driver.rules||[]);const rule=rules.find(rule=>rule.id===result.ruleId);
   const severity=Number(rule?.properties?.['security-severity']||0);
   if(severity>=7 || result.level==='error')findings.push(result.ruleId||'unknown rule');
  }
 }
 return findings;
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
 const directory=process.argv[2];const files=readdirSync(directory).filter(name=>name.endsWith('.sarif'));if(files.length===0)throw new Error('No SAST reports found');
 let count=0;for(const file of files){const findings=highSeverityFindings(JSON.parse(readFileSync(join(directory,file),'utf8')));count+=findings.length;for(const rule of findings)console.error('High severity SAST finding:',rule);}
 if(count>0)throw new Error(`${count} SAST findings block deployment`);
 console.log('SAST severity gate passed.');
}
