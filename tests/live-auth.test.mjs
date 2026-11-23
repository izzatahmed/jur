import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../editorial-worker/src/index.js';
const t = new TextEncoder();
const b64 = obj => Buffer.from(typeof obj === 'string'?obj:JSON.stringify(obj)).toString('base64url');
const env={GITHUB_OWNER:'izzatahmed',GITHUB_REPO:'jus',GITHUB_TOKEN:'test-token-not-real',ACCESS_TEAM_DOMAIN:'https://ujtesting.cloudflareaccess.com',ACCESS_AUD:'A_VALID_DEMO_AUDIENCE',ADMIN_EMAILS:'editor@example.org',ASSETS:{fetch:async()=>new Response('<p>Private dashboard content</p>',{headers:{'content-type':'text/html'}})}};
async function signedJWT({email='editor@example.org',aud=env.ACCESS_AUD}={}){
 const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const jwk=await crypto.subtle.exportKey('jwk',pair.publicKey);jwk.kid='test-kid-1';
 const issued=Math.floor(Date.now()/1000);const h=b64({alg:'RS256',kid:jwk.kid,typ:'JWT'});const p=b64({iss:env.ACCESS_TEAM_DOMAIN,aud:[aud],email,sub:'sample-user',iat:issued,exp:issued+120});
 const sig=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,t.encode(`${h}.${p}`));return {token:`${h}.${p}.${Buffer.from(sig).toString('base64url')}`,jwk};
}
test('Signed Access JWT protects all static editorial assets',async()=>{
 const {token,jwk}=await signedJWT();const previous=globalThis.fetch;
 try{globalThis.fetch=async url=>{assert.match(String(url),/cloudflareaccess\.com\/cdn-cgi\/access\/certs/);return Response.json({keys:[jwk]})};
 const req=new Request('https://example.workers.dev/',{headers:{'Cf-Access-Jwt-Assertion':token}});const resp=await worker.fetch(req,env);assert.equal(resp.status,200);assert.match(await resp.text(),/Private dashboard/);assert.equal(resp.headers.get('X-Frame-Options'),'DENY');
 }finally{globalThis.fetch=previous}
});
test('Signed token for the wrong Audience or email cannot enter',async()=>{
 for(const props of [{aud:'WRONG_AUDIENCE'},{email:'outsider@example.org'}]){
 const {token,jwk}=await signedJWT(props);const old=globalThis.fetch;
 try{globalThis.fetch=async()=>Response.json({keys:[jwk]});const r=await worker.fetch(new Request('https://example.workers.dev/',{headers:{'Cf-Access-Jwt-Assertion':token}}),env);assert.equal(r.status,401)}finally{globalThis.fetch=old}
 }
});
