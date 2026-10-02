import { chromium } from 'playwright';
import assert from 'node:assert/strict';

// Deterministic UI regression; real authorization and persistence have separate backend tests.
const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_BROWSER_CHANNEL || 'chrome'});
const page=await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'});
const support=[];
let signedOut=false;
const records={LOGIN_SUCCESS:[{id:'event',email:'admin@example.com',status:'SUCCESS',reason:'OTP verified login',createdAt:new Date().toISOString()}],
 BLOCKED_LOGIN:[{id:'blocked',email:'owner@example.com',status:'BLOCKED',reason:'Too many attempts'}],OTP_EXEMPTION:[]};
const calls=[];const errors=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('requestfailed',request=>console.error('Request failed:',request.url(),request.failure()?.errorText));
await page.route('**/api/v1/**',async route=>{
 const request=route.request(),url=new URL(request.url()),path=url.pathname,method=request.method();
 const body=request.postDataJSON();calls.push({path,method,body});let data={};
 if(path.endsWith('/auth/refresh')) {
  if(signedOut || request.headers()['x-auth-audience']==='customer') return route.fulfill({status:401,json:{message:'No customer session'}});
  data={userId:'admin',name:'Administrator',email:'admin@example.com',role:'ADMIN',accessToken:'memory-access'};
 } else if(path.endsWith('/auth/logout')) { signedOut=true; }
 else if(path.endsWith('/auth/login')) { data={requiresOtp:true,challengeId:'password-challenge'}; }
 else if(path.endsWith('/auth/otp/login')) {
  assert.equal(body.challengeId,'password-challenge');assert.equal(body.otp,'123456');signedOut=false;
  data={userId:'admin',name:'Administrator',email:'admin@example.com',role:'ADMIN',accessToken:'verified-memory-access'};
 } else if(path.endsWith('/security/support') && method==='POST') {
  assert.equal(body.role,undefined);data={id:'agent',...body,role:'SUPPORT',status:'PENDING',createdAt:new Date().toISOString()};support.push(data);
 } else if(path.endsWith('/security/support')) data={content:support,totalPages:1};
 else if(path.endsWith('/approve')) {support[0].status='ACTIVE';data=support[0];}
 else if(path.endsWith('/terminate')) {support[0].status='TERMINATED';data=support[0];}
 else if(path.endsWith('/security/records')) data={content:records[url.searchParams.get('kind')]||[],totalPages:1};
 else if(path.endsWith('/admin/users')) data={content:[{id:'owner',email:'owner@example.com',role:'OWNER'}],totalPages:1};
 else if(path.endsWith('/security/otp-exemptions')) {
  data={id:'grant',email:'owner@example.com',status:'ACTIVE',reason:body.reason,expiresAt:new Date(Date.now()+86400000).toISOString()};records.OTP_EXEMPTION.push(data);
 } else if(path.endsWith('/revoke')) records.OTP_EXEMPTION[0].status='REVOKED';
 else if(path.includes('revenue-trend')) data=[];
 else if(path.endsWith('/users/stats')) data={total:1,admin:1};
 await route.fulfill({json:{success:true,data}});
});
const click=name=>page.getByRole('button',{name,exact:true}).click();
const tab=name=>page.getByRole('tab',{name,exact:true}).click();
const status=value=>page.getByRole('cell',{name:value,exact:true}).waitFor();
const reason=value=>page.getByLabel('Reason',{exact:true}).last().fill(value);
try {
 await page.goto(`${process.env.SECURITY_SMOKE_URL||'http://127.0.0.1:4179'}/admin`);
 await click('Login Security');await status('admin@example.com');
 await tab('Support Accounts');await page.getByLabel('Name',{exact:true}).fill('Support Agent');
 await page.getByLabel('Account email').fill('agent@example.com');await click('Create pending account');await status('PENDING');
 await click('Approve');await reason('Identity verified');await click('Confirm approve');await status('ACTIVE');
 await click('Terminate');await reason('Employment ended');await click('Confirm terminate');await status('TERMINATED');
 assert.equal(await page.getByRole('button',{name:'Approve',exact:true}).count(),0);
 await tab('OTP Exemptions');await page.getByLabel('Account email').fill('owner@example.com');await reason('Temporary exception');
 await page.getByLabel('Expires in days').fill('1');await click('Grant exemption');await status('ACTIVE');
 await click('Revoke');await reason('Exception ended');await click('Confirm revoke');await status('REVOKED');
 await tab('Blocked Logins');await click('Clear account lock');await reason('Owner verified');await click('Confirm unblock');
 await page.getByText('Account attempt lock cleared. IP limits and account status still apply.',{exact:true}).waitFor();
 await tab('Reset Password');await page.getByLabel('Account email').fill('owner@example.com');await reason('Owner requested reset');await click('Send reset request');
 await page.getByText('Sessions revoked and password reset requested. The user completes the reset using the email code.').waitFor();
 const storage=await page.evaluate(()=>Object.entries(localStorage));
 assert.ok(!storage.some(([key,value])=>/token|refresh/.test(key)||value.includes('memory-access')));
 assert.deepEqual(errors,[]);
 await page.screenshot({path:'/private/tmp/aviqr-admin-login-security.png',fullPage:true});
 await click('Sign out');await page.goto(`${process.env.SECURITY_SMOKE_URL||'http://127.0.0.1:4179'}/login`);
 await page.getByPlaceholder('you@restaurant.in').first().fill('admin@example.com');
 await page.locator('input[type=password]').fill('A secure admin password');await click('Sign in');
 await page.getByRole('group',{name:'One-time password'}).waitFor();
 assert.ok(page.url().endsWith('/login'));
 await page.locator('.otp-box').first().fill('123456');await page.waitForURL('**/admin');
 const afterLogin=await page.evaluate(()=>Object.entries(localStorage));
 assert.ok(!afterLogin.some(([key,value])=>/token|refresh/.test(key)||value.includes('verified-memory-access')));
 assert.deepEqual(errors,[]);
 console.log('PASS: support lifecycle, OTP exemption/revocation, blocked-login controls, password resets, password→OTP login, no stored browser tokens.');
 console.log(`Verified ${calls.filter(call=>call.path.includes('/admin/security/')).length} security API interactions.`);
} catch (error) { await page.screenshot({path:'/private/tmp/aviqr-security-smoke-failure.png',fullPage:true}); console.error('UI errors:',errors); console.error('API paths:',calls.map(call=>call.path)); throw error; } finally {await browser.close();}
