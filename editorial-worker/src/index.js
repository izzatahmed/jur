/* UJORH V3 LIMITED PILOT. All requests (including assets) must pass Cloudflare Access JWT validation.
   This worker NEVER publishes to the public repository; it only edits private editorial.json files in jus.
   Not production ready for confidential medical submissions or externally authenticated reviewers. */
const ENCODER=new TextEncoder();
const ALLOWED_ACTIONS=new Set(['screen','hold','assign','review','revision','certify','stage']);
const SCORES=['rigor','evidence','originality','relevance','reproducibility'];
const HDR={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store, no-cache, must-revalidate','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','X-Frame-Options':'DENY'};
function json(data,status=200){return new Response(JSON.stringify(data),{status,headers:HDR})}
const reject=(message,status)=>json({message},status);
function base64urlBytes(s){if(!/^[A-Za-z0-9_-]+$/.test(s))throw Error('Invalid JWT segment');let raw=atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4));return Uint8Array.from(raw,c=>c.charCodeAt(0))}
function unbase(s){return JSON.parse(new TextDecoder().decode(base64urlBytes(s)))}
const githubHost='https://api.github.com';
function config(env){if(!env.GITHUB_TOKEN||!env.GITHUB_OWNER||!env.GITHUB_REPO||!env.ACCESS_AUD||!env.ACCESS_TEAM_DOMAIN||!env.ADMIN_EMAILS)return false;
if(String(env.ACCESS_AUD).includes('REPLACE')||String(env.ADMIN_EMAILS).includes('REPLACE')||String(env.ACCESS_TEAM_DOMAIN).includes('REPLACE'))return false;
if(!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com\/?$/.test(env.ACCESS_TEAM_DOMAIN))return false;
if(!/^[A-Za-z0-9_-]{4,}$/.test(env.ACCESS_AUD))return false;
if(!env.ADMIN_EMAILS.includes('@'))return false;return true}
async function verifyAccess(req,env){if(!config(env))return null;
 const team=env.ACCESS_TEAM_DOMAIN.replace(/\/$/,'');
 const assertion=req.headers.get('Cf-Access-Jwt-Assertion') || (req.headers.get('Cookie')||'').match(/(?:^|;\s*)CF_Authorization=([^;]+)/)?.[1];
 if(!assertion)return null;
 try{
  const parts=assertion.split('.');if(parts.length!==3)return null;
  const header=unbase(parts[0]),claims=unbase(parts[1]);
  if(header.alg!=='RS256'||typeof header.kid!=='string'||!header.kid||claims.iss!==team)return null;
  const aud=Array.isArray(claims.aud)?claims.aud:[claims.aud];
  const now=Math.floor(Date.now()/1000);
  if(!aud.includes(env.ACCESS_AUD)||typeof claims.exp!=='number'||claims.exp<=now||typeof claims.iat!=='number'||claims.iat>now+120||(claims.nbf && claims.nbf>now))return null;
  const email=String(claims.email||'').toLowerCase().trim();
  const authorized=env.ADMIN_EMAILS.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
  if(!email||!authorized.includes(email))return null;
  const rsp=await fetch(`${team}/cdn-cgi/access/certs`,{headers:{Accept:'application/json'}});
  if(!rsp.ok)return null;
  const certs=await rsp.json(), jwk=certs.keys?.find(x=>x.kid===header.kid&&x.kty==='RSA'&&x.use!=='enc');
  if(!jwk)return null;
  const pub=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  const ok=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',pub,base64urlBytes(parts[2]),ENCODER.encode(parts[0]+'.'+parts[1]));
  return ok?{email,subject:String(claims.sub||'')}:null;
 }catch{return null}
}
function ghHeaders(env){return {'Accept':'application/vnd.github+json','Authorization':`Bearer ${env.GITHUB_TOKEN}`,'X-GitHub-Api-Version':'2022-11-28','User-Agent':'uj-orh-private-editorial-pilot','Content-Type':'application/json'}}
async function gh(env,path,method='GET',body){let url=`${githubHost}/repos/${encodeURIComponent(env.GITHUB_OWNER)}/${encodeURIComponent(env.GITHUB_REPO)}${path}`;
const rsp=await fetch(url,{method,headers:ghHeaders(env),body:body?JSON.stringify(body):undefined});
if(rsp.status===404)return {missing:true};if(!rsp.ok){const e=new Error(`GitHub API error ${rsp.status}`);e.http=rsp.status;throw e}return await rsp.json()}
function decodeContent(file){if(file?.missing)return null;if(file.encoding!=='base64'||typeof file.content!=='string')throw Error('Unsupported GitHub file format');const bytes=Uint8Array.from(atob(file.content.replace(/\s/g,'')),c=>c.charCodeAt(0));return JSON.parse(new TextDecoder().decode(bytes))}
function encodeContent(obj){return btoa(Array.from(ENCODER.encode(JSON.stringify(obj,null,2)),c=>String.fromCharCode(c)).join(''))}
function validId(id){return /^(?:UJORH-\d{8}-[A-Z0-9]{8}|DEMO-[A-Za-z0-9-]+)$/.test(id)}
function editorial(){return {status:'received',assignments:[],reviews:[],consent:false,editorApproval:false,screening:null,audit:[],updatedAt:null}}
async function getRecord(env,id){const repo=await gh(env,'');if(repo.missing||repo.private!==true)throw Error('Editorial destination must be private');const raw=await gh(env,`/contents/submissions/${id}/submission.json`);if(raw.missing)return null;let m=decodeContent(raw);
const efile=await gh(env,`/contents/submissions/${id}/editorial.json`);m.editorial=efile.missing?editorial():decodeContent(efile);m.status=m.editorial.status;delete m.email; // never transmit author email to browser in pilot
return {record:m,sha:efile.missing?null:efile.sha}}
async function list(env){const repo=await gh(env,'');if(repo.missing||repo.private!==true)throw Error('Private repository could not be verified');const entries=await gh(env,'/contents/submissions');if(entries.missing)return [];
const ids=entries.filter(x=>x.type==='dir'&&validId(x.name)).slice(0,18).map(x=>x.name);
const records=[];for(const id of ids){try{let o=await getRecord(env,id);if(o)records.push(o.record)}catch{}}return records.sort((a,b)=>String(b.receivedAt||'').localeCompare(String(a.receivedAt||'')))}
function signedAction(action,record,payload,user){let ed=record.editorial||editorial();ed.assignments ||= [];ed.reviews ||= [];ed.audit ||= [];
const safeText=(v,max=500)=>typeof v==='string'&&v.trim().length<=max?v.trim():null;
let detail='';switch(action){
case 'screen':ed.status='screening';ed.screening={summary:'Administrative checklist recorded. This step does not constitute automated AI analysis or scientific validation.'};detail='Initial checklist documented';break;
case 'hold':ed.status='hold';detail='Certification withheld pending resolution';break;
case 'assign':{const name=safeText(payload.name,70);if(!name||ed.assignments.includes(name))throw Error('Distinct reviewer label required');ed.assignments.push(name);ed.status='reviewing';detail=`Reviewer label ${name} registered; no notification sent`;break}
case 'review':{const reviewer=safeText(payload.reviewer,70),notes=safeText(payload.notes,1800);if(!reviewer||!notes||notes.length<12||!['accept','revise','reject'].includes(payload.recommendation))throw Error('Invalid scientific review');if(ed.reviews.some(r=>r.reviewer.toLowerCase()===reviewer.toLowerCase()))throw Error('Duplicate reviewer label');let scores={};for(const k of SCORES){const value=payload.scores?.[k];if(!Number.isInteger(value)||value<0||value>100)throw Error('Review score outside 0–100');scores[k]=value}ed.reviews.push({reviewer,notes,recommendation:payload.recommendation,scores,recordedBy:user.email,at:new Date().toISOString(),independenceVerified:false});ed.status='reviewing';detail=`Report for ${reviewer} transcribed by administrator (not independently authenticated)`;break}
case 'revision':ed.status='revision';detail='Further revisions requested';break;
case 'certify':{const reviews=ed.reviews;if(reviews.length<2||new Set(reviews.map(r=>r.reviewer.toLowerCase())).size<2||reviews.some(r=>r.recommendation==='reject'))throw Error('Two distinct supportive reports required');const means=reviews.map(r=>SCORES.reduce((s,k)=>s+r.scores[k],0)/SCORES.length);if(means.reduce((s,n)=>s+n,0)/means.length<60)throw Error('Insufficient provisional assessment');ed.status='candidate';detail='Editorial certification candidate only; reviewer independence unverified';break}
case 'stage':{if(!['candidate','staged'].includes(ed.status))throw Error('Certification candidate prerequisite');if(payload.consent!==true||payload.approval!==true)throw Error('Publication consent and editor approval declarations required');ed.consent=true;ed.editorApproval=true;ed.status='staged';detail='Private publication staging record only; no public write or file release';break}
default:throw Error('Unsupported editorial action')}
ed.updatedAt=new Date().toISOString();ed.audit.unshift({at:ed.updatedAt,action,by:user.email,detail});return ed}
async function writeEditorial(env,id,ed,sha){const payload={message:`Editorial pilot: ${id} updated (private)`,content:encodeContent(ed)};if(sha)payload.sha=sha;return await gh(env,`/contents/submissions/${id}/editorial.json`,'PUT',payload)}
function sameOrigin(req){const origin=req.headers.get('Origin');return !origin||origin===new URL(req.url).origin}
export default {async fetch(request,env){
 const url=new URL(request.url);
 if(!config(env))return reject('Editorial Worker is locked: configure Cloudflare Access and private repository settings first.',503);
 const user=await verifyAccess(request,env);
 if(!user)return reject('Not authorized. Open the Cloudflare Access-protected editorial link and sign in with an approved email.',401);
 try{
 if(url.pathname==='/api/submissions'&&request.method==='GET')return json({editor:user.email,records:await list(env)});
 const match=url.pathname.match(/^\/api\/submissions\/([^/]+)(?:\/actions)?$/);
 if(match){const id=match[1];if(!validId(id))return reject('Invalid manuscript identifier',400);
  if(request.method==='GET'&&url.pathname.endsWith(id)){const o=await getRecord(env,id);return o?json(o.record):reject('Manuscript not found',404)}
  if(request.method==='POST'&&url.pathname.endsWith('/actions')){
   if(!sameOrigin(request)||request.headers.get('X-UJORH-Admin-Action')!=='1'||!(request.headers.get('Content-Type')||'').startsWith('application/json'))return reject('Invalid action request',403);
   if(Number(request.headers.get('Content-Length')||0)>12000)return reject('Action too large',413);
   let payload;try{payload=await request.json()}catch{return reject('Invalid JSON',400)};
   if(!ALLOWED_ACTIONS.has(payload.action))return reject('Unsupported action',400);
   const o=await getRecord(env,id);if(!o)return reject('Manuscript not found',404);
   let next;try{next=signedAction(payload.action,o.record,payload,user)}catch(e){return reject(e.message,400)}
   await writeEditorial(env,id,next,o.sha);o.record.editorial=next;o.record.status=next.status;
   return json({ok:true,record:o.record});
  }
 }
 if(url.pathname.startsWith('/api/'))return reject('API route not found',404);
 const resp=await env.ASSETS.fetch(request);const h=new Headers(resp.headers);h.set('Cache-Control','private, no-store');h.set('X-Frame-Options','DENY');h.set('X-Content-Type-Options','nosniff');h.set('Referrer-Policy','no-referrer');h.set('Content-Security-Policy',"default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");return new Response(resp.body,{status:resp.status,headers:h});
 }catch(e){const http=e.http===409?409:503;return reject(http===409?'Concurrent editorial modification: reload and retry.':'Private editorial operation failed; inspect Worker logs without sharing tokens.',http)}
 }};
export {validId,config,signedAction,editorial,decodeContent};
