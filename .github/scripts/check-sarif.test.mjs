import {test} from 'node:test';import assert from 'node:assert/strict';import {highSeverityFindings} from './check-sarif.mjs';
const fixture=(score,level='warning')=>({runs:[{tool:{driver:{rules:[{id:'security-test',properties:{'security-severity':score}}]}},results:[{ruleId:'security-test',level}]}]});
test('high and critical findings block even if CodeQL analysis succeeded',()=>{assert.deepEqual(highSeverityFindings(fixture('7.5')),['security-test']);assert.deepEqual(highSeverityFindings(fixture('9.8')),['security-test']);});
test('lower severity does not block deployment',()=>assert.deepEqual(highSeverityFindings(fixture('4.3')),[]));
test('error findings block without a numeric score',()=>assert.deepEqual(highSeverityFindings(fixture('0','error')),['security-test']));
test('empty or failed analysis is rejected',()=>{assert.throws(()=>highSeverityFindings({runs:[]}));assert.throws(()=>highSeverityFindings({runs:[{invocations:[{executionSuccessful:false}]}]}));});
