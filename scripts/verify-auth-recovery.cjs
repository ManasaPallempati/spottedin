const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const os = require('node:os');
const { chromium } = require(process.env.SPOTTED_PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const proof = path.resolve(process.env.SPOTTED_AUTH_EVIDENCE_DIR || path.join(os.tmpdir(), 'spotted-auth-proof-' + Date.now()));
fs.mkdirSync(proof, {recursive:true});
const origin = 'http://127.0.0.1:4188';
// Accept the feature branch's hash routes and current staging's clean URLs.
function appRoute(value){const u=new URL(value);return u.hash.startsWith('#/')?u.hash.slice(1).split('?')[0]:u.pathname;}
const env = {...process.env, VITE_SUPABASE_URL:'http://127.0.0.1:54321', VITE_SUPABASE_ANON_KEY:'synthetic-test-key', VITE_SITE_ORIGIN:origin, VITE_NOINDEX:'true'};
const server = spawn(process.execPath, [root+'/node_modules/vite/bin/vite.js', '--host','127.0.0.1','--port','4188','--strictPort'],{cwd:root,env,windowsHide:true,stdio:['ignore','pipe','pipe']});
const logs=[];server.stdout.on('data',b=>logs.push(b.toString()));server.stderr.on('data',b=>logs.push(b.toString()));
const checks=[], requests=[], errors=[], blocked=[];
const user={id:'11111111-1111-4111-8111-111111111111',aud:'authenticated',role:'authenticated',email:'fixture@example.invalid',email_confirmed_at:'2026-10-21T00:00:00Z',app_metadata:{provider:'email',providers:['email']},user_metadata:{name:'Fixture',handle:'fixture'},created_at:'2026-10-21T00:00:00Z'};
const profile={id:user.id,handle:'fixture',name:'Fixture',date_of_birth:'2000-01-01',avatar_emoji:null,bio:null,city:null,rating:0,sales:0};
const token={access_token:'eyJhbGciOiJub25lIn0.'+Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.synthetic',refresh_token:'synthetic-refresh',token_type:'bearer',expires_in:3600,user};
let mode='success';let updates=0;
function ok(name,condition,details){checks.push({name,passed:!!condition,...details});if(!condition)throw new Error(name);}
async function main(){
 for(let i=0;i<100;i++){try{if((await fetch(origin)).ok)break;}catch{} await new Promise(r=>setTimeout(r,100));}
 const browser=await chromium.launch({...(process.env.CHROME_EXECUTABLE_PATH ? {executablePath:process.env.CHROME_EXECUTABLE_PATH} : {channel:'chrome'}),headless:true});
 try{
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.route('**/*',async route=>{
  const req=route.request(), u=new URL(req.url());
  if(u.origin===origin)return route.continue();
  if(u.origin!=='http://127.0.0.1:54321'){blocked.push({origin:u.origin,type:req.resourceType()});return route.abort();}
  requests.push({method:req.method(),path:u.pathname,queryKeys:[...u.searchParams.keys()]});
  const reply=(status,body)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
  if(u.pathname==='/auth/v1/recover'){
   ok('Reset redirect uses isolated origin',u.searchParams.get('redirect_to')===origin);
   if(mode==='rate')return reply(429,{code:'over_email_send_rate_limit',msg:'Email rate limit exceeded'});
   return reply(200,{});
  }
  if(u.pathname==='/auth/v1/token')return reply(200,token);
  if(u.pathname==='/auth/v1/user'&&req.method()==='PUT'){
   updates++;if(mode==='same')return reply(422,{code:'same_password',msg:'New password should be different from the old password.'});
   return reply(200,user);
  }
  if(u.pathname==='/auth/v1/user')return reply(200,user);
  if(u.pathname==='/auth/v1/logout')return reply(204,null);
  if(u.pathname==='/rest/v1/profiles')return reply(200,profile);
  if(u.pathname.startsWith('/rest/v1/'))return reply(req.method()==='GET'?200:201,[]);
  if(u.pathname.startsWith('/functions/v1/'))return reply(200,{enabled:false});
  return reply(400,{message:'Unmatched mock endpoint'});
 });
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/#/login');
 await page.getByRole('link',{name:'Forgot password?'}).click();
 await page.getByLabel('Email',{exact:true}).fill('fixture@example.invalid');
 mode='rate';await page.getByRole('button',{name:'Send reset link'}).click();
 await page.getByRole('alert').filter({hasText:'Too many emails'}).waitFor();
 ok('Rate limit is actionable and retry enabled',await page.getByRole('button',{name:'Send reset link'}).isEnabled());
 mode='success';await page.getByRole('button',{name:'Send reset link'}).click();
 await page.getByText(/If an account exists for that email/).waitFor();
 ok('Forgot flow has neutral success copy',true);
 await page.screenshot({path:proof+'/forgot-success-mobile.png',fullPage:true});
 await page.goto(origin+'/?code=synthetic-recovery-code');
 await page.getByRole('heading',{name:'Choose a new password'}).waitFor();
 await page.getByLabel('New password',{exact:true}).waitFor();
 ok('PKCE recovery callback reaches reset form',appRoute(page.url())==='/reset-password');
 await page.getByLabel('New password',{exact:true}).fill('ValidTest1!');
 await page.getByLabel('Confirm new password',{exact:true}).fill('OtherTest1!');
 await page.getByRole('button',{name:'Update password'}).click();
 await page.getByRole('alert').filter({hasText:'Those passwords do not match'}).waitFor();
 ok('Mismatch prevents API update',updates===0);
 await page.getByLabel('New password',{exact:true}).fill('abcdefgh');
 await page.getByLabel('Confirm new password',{exact:true}).fill('abcdefgh');
 await page.getByRole('button',{name:'Update password'}).click();
 await page.getByRole('alert').filter({hasText:'uppercase'}).waitFor();
 ok('Shared password policy prevents API update',updates===0);
 await page.getByLabel('New password',{exact:true}).fill('ValidTest1!');
 await page.getByLabel('Confirm new password',{exact:true}).fill('ValidTest1!');
 mode='same';await page.getByRole('button',{name:'Update password'}).click();
 await page.getByRole('alert').filter({hasText:'different from your old'}).waitFor();
 ok('Same password error is actionable',updates===1);
 await page.screenshot({path:proof+'/reset-form-mobile.png',fullPage:true});
 mode='success';await page.getByRole('button',{name:'Update password'}).click();
 await page.getByRole('heading',{name:'Log in',exact:true}).waitFor();
 await page.getByRole('status').filter({hasText:'Your password has been updated'}).waitFor();
 ok('Successful update signs out and returns to login',updates===2 && requests.some(r=>r.path==='/auth/v1/logout'));
 await page.screenshot({path:proof+'/reset-success-mobile.png',fullPage:true});
 await page.goto(origin+'/#/reset-password');
 await page.getByText('That link has expired or has already been used. Please request a new one.').waitFor();
 ok('No session renders new-link recovery state',await page.getByRole('link',{name:'Send a new reset link'}).isVisible());
 await page.screenshot({path:proof+'/expired-mobile.png',fullPage:true});
 await page.goto(origin+'/?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
 await page.getByRole('alert').filter({hasText:'That link has expired'}).waitFor();
 ok('Expired callback cleans URL and explains recovery',!page.url().includes('otp_expired') && await page.getByRole('link',{name:'Forgot password?'}).isVisible());
 await page.getByRole('button',{name:'Continue with Google'}).click();
 await page.waitForURL('http://127.0.0.1:54321/auth/v1/authorize**');
 await page.goto(origin+'/#/login?next=%2Faccount');
 await page.getByRole('link',{name:'Forgot password?'}).click();
 await page.getByLabel('Email',{exact:true}).fill('fixture@example.invalid');
 await page.getByRole('button',{name:'Send reset link'}).click();
 await page.getByText(/If an account exists for that email/).waitFor();
 await page.goto(origin+'/?code=synthetic-recovery-code-2');
 await page.waitForTimeout(500);
 ok('Abandoned OAuth cannot hijack password recovery',appRoute(page.url())==='/reset-password',{url:page.url()});
 ok('No browser runtime errors',errors.length===0);
 await context.close();
 }finally{await browser.close();}
}
main().then(()=>{fs.writeFileSync(proof+'/result.json',JSON.stringify({status:'passed',checks,requests,blocked,errors,isolation:{app:origin,supabase:'loopback mock',externalRequests:'blocked'},limits:['Mocked GoTrue: no real email sent, delivery/allowlist/browser-device roundtrip unverified']},null,2));console.log(JSON.stringify({status:'passed',checks:checks.length,proof}));}).catch(e=>{fs.writeFileSync(proof+'/result.json',JSON.stringify({status:'failed',error:e.stack,checks,requests,blocked,errors},null,2));console.error(e.stack);process.exitCode=1;}).finally(()=>{server.kill();fs.writeFileSync(proof+'/vite.log',logs.join(''));});
