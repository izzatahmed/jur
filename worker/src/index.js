/**
 * UJ Open Research Hub: limited PILOT upload receiver for GitHub Pages.
 * Writes submissions to a PRIVATE GitHub repository via the Contents API.
 * Not a clinical data or production scholarly publishing system.
 * Secrets are configured in Cloudflare Workers, never browser code.
 */
const MAX_BYTES=5*1024*1024;
const REQUIRED=['title','abstract','discipline','studyType','fullName','email','affiliation','country','ethics'];
const MAX_LENGTHS={title:220,abstract:3000,discipline:120,studyType:120,fullName:140,email:200,affiliation:200,country:100,ethics:140,keywords:200,orcid:80};
const encoder=new TextEncoder();
function cors(origin,env){return {'Access-Control-Allow-Origin':origin===env.ALLOWED_ORIGIN?origin:'null','Vary':'Origin','Access-Control-Allow-Methods':'POST, OPTIONS, GET','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'7200','Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8','X-Content-Type-Options':'nosniff'};}
function respond(req,env,body,status=200){return new Response(JSON.stringify(body),{status,headers:cors(req.headers.get('Origin'),env)});}
function validateFields(form){let obj={};for(const key of REQUIRED.concat(['keywords','orcid'])){const v=form.get(key);if(v!==null && typeof v!=='string')return null;const s=typeof v==='string'?v.trim():'';if(REQUIRED.includes(key)&&!s)return null;if(s.length>(MAX_LENGTHS[key]||200))return null;obj[key]=s;}if(obj.title.length<8||obj.abstract.length<80)return null;if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(obj.email))return null;return obj;}
function b64(buffer){const bytes=new Uint8Array(buffer);const chunkSize=0x6000;let out='';for(let i=0;i<bytes.length;i+=chunkSize){out+=String.fromCharCode(...bytes.subarray(i,i+chunkSize));}return btoa(out);}
async function githubRequest(env,path,method='GET',payload){const url=`https://api.github.com/repos/${encodeURIComponent(env.GITHUB_OWNER)}/${encodeURIComponent(env.GITHUB_REPO)}${path}`;const rsp=await fetch(url,{method,headers:{'Accept':'application/vnd.github+json','Authorization':`Bearer ${env.GITHUB_TOKEN}`,'X-GitHub-Api-Version':'2022-11-28','User-Agent':'uj-orh-submission-pilot','Content-Type':'application/json'},body:payload?JSON.stringify(payload):undefined});if(!rsp.ok){throw new Error(`Private repository operation failed (GitHub HTTP ${rsp.status}).`);}return rsp.json();}
async function verifyTurnstile(env,token,ip){const fd=new FormData();fd.append('secret',env.TURNSTILE_SECRET);fd.append('response',token);if(ip)fd.append('remoteip',ip);const resp=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:fd});if(!resp.ok)return false;const data=await resp.json();if(!data.success)return false;if(env.ALLOWED_TURNSTILE_HOSTNAME && data.hostname!==env.ALLOWED_TURNSTILE_HOSTNAME)return false;return true;}
function validFileHeader(name,bytes){const lower=name.toLowerCase();if(lower.endsWith('.pdf')){return bytes[0]===37&&bytes[1]===80&&bytes[2]===68&&bytes[3]===70&&bytes[4]===45;}if(lower.endsWith('.docx')){return bytes[0]===80&&bytes[1]===75&&bytes[2]===3&&bytes[3]===4;}return false;}
export default {
 async fetch(request,env){
  const url=new URL(request.url);const origin=request.headers.get('Origin');
  if(request.method==='OPTIONS'){return new Response(null,{status:204,headers:cors(origin,env)});}
  if(url.pathname==='/api/health'&&request.method==='GET')return respond(request,env,{status:'pilot_receiver',configured:!!(env.GITHUB_TOKEN&&env.TURNSTILE_SECRET&&env.GITHUB_OWNER&&env.GITHUB_REPO)});
  if(url.pathname!=='/api/submit'||request.method!=='POST')return respond(request,env,{message:'Not found.'},404);
  if(origin!==env.ALLOWED_ORIGIN)return respond(request,env,{message:'Unauthorized website origin.'},403);
  if(!(env.GITHUB_TOKEN&&env.TURNSTILE_SECRET&&env.GITHUB_OWNER&&env.GITHUB_REPO))return respond(request,env,{message:'Pilot receiver not configured.'},503);
  const clen=Number(request.headers.get('Content-Length')||0);if(clen>MAX_BYTES+30000)return respond(request,env,{message:'Manuscript too large; maximum 5 MB.'},413);
  if(!(request.headers.get('Content-Type')||'').includes('multipart/form-data'))return respond(request,env,{message:'Expected multipart form submission.'},415);
  let data;try{data=await request.formData();}catch{return respond(request,env,{message:'Invalid submission form.'},400);}
  if(String(data.get('website')||'').trim())return respond(request,env,{message:'Unable to process submission.'},400);
  const fields=validateFields(data);if(!fields)return respond(request,env,{message:'Required manuscript or author information missing or invalid.'},400);
  if(data.get('originality')!=='on'||data.get('privacy')!=='on')return respond(request,env,{message:'Required declarations not confirmed.'},400);
  const token=data.get('turnstileToken');if(typeof token!=='string'||token.length<10||token.length>2500)return respond(request,env,{message:'Complete the anti-bot verification.'},400);
  const verified=await verifyTurnstile(env,token,request.headers.get('CF-Connecting-IP'));
  if(!verified)return respond(request,env,{message:'Anti-bot verification unsuccessful or expired.'},403);
  const file=data.get('file');if(!(file instanceof File)||file.size===0||file.size>MAX_BYTES)return respond(request,env,{message:'Please provide a PDF or DOCX smaller than 5 MB.'},413);
  const buffer=await file.arrayBuffer();const bytes=new Uint8Array(buffer.slice(0,8));if(!validFileHeader(file.name,bytes))return respond(request,env,{message:'Unsupported or invalid file type. PDF and DOCX only.'},415);
  // Ensure destination is private: refuse writes to a public repository.
  let repo;try{repo=await githubRequest(env,'');}catch{return respond(request,env,{message:'Private repository is inaccessible; check server configuration.'},503);}
  if(repo.private!==true)return respond(request,env,{message:'For researcher privacy, the destination GitHub repository must be private.'},503);
  const id=`UJORH-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${crypto.randomUUID().slice(0,8).toUpperCase()}`;
  const ext=file.name.toLowerCase().endsWith('.pdf')?'pdf':'docx';const location=`/contents/submissions/${id}`;
  const metadata={submissionId:id,receivedAt:new Date().toISOString(),status:'received_pending_screening',confidential:true,publiclyReleased:false,originalFileName:file.name,originalFileSize:file.size,manuscriptFile:`manuscript.${ext}`,...fields,declarations:{permissionFromAllAuthors:true,noIdentifiablePatientInformation:true,acceptedPrototypeTerms:true}};
  try{
    await githubRequest(env,`${location}/manuscript.${ext}`,'PUT',{message:`Receive ${id} manuscript (private pilot)`,content:b64(buffer)});
    const metaBytes=encoder.encode(JSON.stringify(metadata,null,2));
    await githubRequest(env,`${location}/submission.json`,'PUT',{message:`Add ${id} private submission metadata`,content:b64(metaBytes.buffer)});
  }catch(e){return respond(request,env,{message:`Submission ${id} could not be fully confirmed. It may be partially stored; contact the administrator with this ID instead of immediately resubmitting.`,submissionId:id},502);}
  return respond(request,env,{ok:true,submissionId:id,status:'received_pending_screening',publiclyReleased:false},201);
 }
};
