/* UJORH v3.2: transparent, provisional scientific decision rules.
 * Human reviewers remain responsible. This is NOT an autonomous AI or a proof of independent reviews.
 * Keep this file byte-identical to the browser copy in docs/editorial-demo/assets and editorial-worker/public/assets.
 */
export const SCORE_KEYS = Object.freeze(['rigor','evidence','originality','relevance','reproducibility']);
export const RELIABILITY_WEIGHTS = Object.freeze({rigor:0.4,evidence:0.4,reproducibility:0.2});
export const CONTRIBUTION_WEIGHTS = Object.freeze({originality:0.5,relevance:0.5});
const round2=n=>Math.round(n*10)/10;
const isScore=n=>Number.isInteger(n)&&n>=0&&n<=100;
export function validScores(obj){return !!obj&&SCORE_KEYS.every(k=>isScore(obj[k]));}
export function weightedScore(scores,weights){if(!validScores(scores))return null;return round2(Object.entries(weights).reduce((n,[key,w])=>n+scores[key]*w,0));}
export function gradeReliability(n){if(n===null||!Number.isFinite(n))return 'Not assessed';return n>=90?'A+':n>=80?'A':n>=70?'B':n>=60?'C':'Below threshold';}
export function currentReviews(editorial){const round=Number.isInteger(editorial?.round)&&editorial.round>0?editorial.round:1;return (editorial?.reviews||[]).filter(r=>(r.round||1)===round);}
export function evaluationSummary(editorial){const rs=currentReviews(editorial).filter(r=>validScores(r.scores));const mean=(weight)=>rs.length?round2(rs.reduce((s,r)=>s+weightedScore(r.scores,weight),0)/rs.length):null;
 const dimensions={};for(const k of SCORE_KEYS){dimensions[k]=rs.length?round2(rs.reduce((s,r)=>s+r.scores[k],0)/rs.length):null;}
 const reliability=mean(RELIABILITY_WEIGHTS),contribution=mean(CONTRIBUTION_WEIGHTS);
 return {round:editorial?.round||1,reports:rs.length,reliability,contribution,grade:gradeReliability(reliability),dimensions};}
export function certificationGate(editorial){const e=editorial||{},rs=currentReviews(e),problems=[];if(!e.screening?.complete)problems.push('A recorded editorial screening is required.');
 if(e.integrityHold||e.status==='hold')problems.push('An unresolved integrity or editorial hold remains.');
 if(e.revisionOpen)problems.push('The requested revision has not been documented as received.');
 if(rs.length<2)problems.push('Two current-round reports are required.');
 const names=rs.map(r=>String(r.reviewer||'').trim().toLowerCase());if(new Set(names).size!==rs.length)problems.push('Reviewer labels must be distinct.');
 const assigned=(e.assignments||[]).map(x=>String(x).trim().toLowerCase());if(rs.some(r=>!assigned.includes(String(r.reviewer||'').trim().toLowerCase())))problems.push('Each reviewer must have a recorded assignment.');
 if(rs.some(r=>r.recommendation!=='accept'))problems.push('Every current-round report must explicitly recommend acceptance; revise/reject cannot be certified.');
 if(rs.some(r=>r.criticalConcern===true))problems.push('An unresolved critical methodological concern remains.');
 if(rs.some(r=>!validScores(r.scores)))problems.push('All current-round reports require valid five-dimension scores.');
 const s=evaluationSummary(e);
 if(s.reliability===null||s.reliability<70)problems.push('Mean reliability must be at least 70/100.');
 if(rs.some(r=>{const rel=weightedScore(r.scores,RELIABILITY_WEIGHTS);return rel===null||rel<65}))problems.push('Each reviewer reliability assessment must be at least 65/100.');
 if(['rigor','evidence','reproducibility'].some(k=>s.dimensions[k]===null||s.dimensions[k]<60))problems.push('Core reliability dimensions must each average at least 60/100.');
 return {eligible:problems.length===0,problems,summary:s,caveat:'Provisional candidate only: independently verified reviewers and final editorial certification are not implemented.'};}

export function makeEditorialRecord(){return {schema:'ujorh-editorial-v3.2',status:'received',round:1,revisionOpen:false,integrityHold:false,revisionHistory:[],assignments:[],reviews:[],consent:false,editorApproval:false,screening:null,audit:[],updatedAt:null}}
function recordAudit(e,action,user,detail,from){
 const at=new Date().toISOString();const audit=e.audit ||= [];
 const seq=audit.reduce((n,event)=>Math.max(n,Number(event.seq)||0),0)+1;
 const event={seq,at,action,by:user.email,from,to:e.status,round:e.round||1,detail};
 audit.unshift(event);e.updatedAt=at;
}
export function applyEditorialAction(action,record,payload,user){
 const ed=record.editorial||makeEditorialRecord();ed.assignments ||= [];ed.reviews ||= [];ed.audit ||= [];ed.revisionHistory ||= [];
 ed.round=Number.isInteger(ed.round)&&ed.round>0?ed.round:1;
 const safeText=(v,max=500)=>typeof v==='string'&&v.trim().length>0&&v.trim().length<=max?v.trim():null;
 if(['staged','published'].includes(ed.status))throw Error('Staged records are locked from further editorial changes in this pilot');
 const from=ed.status;let detail='';
 switch(action){
 case 'screen':
  if(ed.integrityHold)throw Error('Clear the editorial hold before screening');
  if(ed.status==='candidate')throw Error('Re-screening a candidate requires a new editorial round');
  ed.status='screening';ed.screening={complete:true,at:new Date().toISOString(),recordedBy:user.email,summary:'Administrator-recorded screening checklist. Research ethics and methods still require independent verification; NO AI analysis performed.'};
  detail='Administrative completeness screening recorded; not independent scientific verification';break;
 case 'hold':ed.status='hold';ed.integrityHold=true;ed.round++;ed.revisionOpen=false;detail='Editorial hold placed; previous-round reports cannot support certification';break;
 case 'clear_hold':{
  if(!ed.integrityHold)throw Error('No active hold to clear');
  const reason=safeText(payload.reason,1200);if(!reason||reason.length<20)throw Error('Document the resolution of the hold in at least 20 characters');
  ed.integrityHold=false;ed.status='screening';ed.round++;detail='Hold released by editor; fresh round and fresh reports required. Reason: '+reason;break}
 case 'assign':{
  if(ed.revisionOpen||ed.integrityHold||ed.status==='candidate')throw Error('Resolve revision/hold or restart editorial round before assigning');
  const name=safeText(payload.name,70);if(!name||ed.assignments.some(x=>x.toLowerCase()===name.toLowerCase()))throw Error('A distinct reviewer label must be provided');
  ed.assignments.push(name);ed.status='reviewing';detail=`Reviewer label ${name} registered; NO invitation or identity verification sent`;break}
 case 'review':{
  if(ed.revisionOpen||ed.integrityHold||ed.status==='candidate')throw Error('Cannot record a report while revision, hold, or candidacy remains active');
  const reviewer=safeText(payload.reviewer,70),notes=safeText(payload.notes,1800);
  if(!reviewer||!notes||notes.length<12||!['accept','revise','reject'].includes(payload.recommendation))throw Error('Invalid scientific review');
  if(!ed.assignments.some(x=>x.toLowerCase()===reviewer.toLowerCase()))throw Error('Assign this reviewer label before recording a report');
  if(ed.reviews.some(r=>(r.round||1)===ed.round&&r.reviewer.toLowerCase()===reviewer.toLowerCase()))throw Error('Duplicate current-round reviewer report');
  if(!validScores(payload.scores))throw Error('All five score dimensions must be integers between 0 and 100');
  ed.reviews.push({round:ed.round,reviewer,notes,recommendation:payload.recommendation,scores:Object.fromEntries(SCORE_KEYS.map(k=>[k,payload.scores[k]])),criticalConcern:payload.criticalConcern===true,recordedBy:user.email,at:new Date().toISOString(),independenceVerified:false});
  ed.status='reviewing';detail=`Round ${ed.round} reviewer assessment transcribed by administrator: ${reviewer} (${payload.recommendation}); independent reviewer NOT verified`;break}
 case 'revision':{
  if(ed.revisionOpen||ed.integrityHold)throw Error('Revision already pending or record on hold');
  const reason=safeText(payload.reason,1200)||'Revision required by editorial assessment';
  ed.round++;ed.revisionOpen=true;ed.status='revision';ed.revisionHistory.push({requestedAt:new Date().toISOString(),round:ed.round,reason,received:false});
  detail='New review round '+ed.round+'; revision remains outstanding. '+reason;break}
 case 'revision_received':{
  if(!ed.revisionOpen)throw Error('No outstanding revision to record');
  const version=safeText(payload.version,100),notes=safeText(payload.notes,1200);
  if(!version||!notes||notes.length<20)throw Error('Document a revision version and verification note (at least 20 characters)');
  const current=ed.revisionHistory.at(-1);if(current){current.received=true;current.version=version;current.notes=notes;current.receivedAt=new Date().toISOString();current.recordedBy=user.email}
  ed.revisionOpen=false;ed.status='screening';ed.screening=null;detail='Revision receipt manually documented for '+version+'; file identity NOT independently verified. Re-screen and obtain new reports.';break}
 case 'certify':{
  const gate=certificationGate(ed);if(!gate.eligible)throw Error('Certification gate blocked: '+gate.problems.join(' '));
  ed.status='candidate';ed.provisionalEvaluation=gate.summary;
  detail=`Private editorial candidate only: reliability ${gate.summary.reliability}/100 (${gate.summary.grade}), contribution ${gate.summary.contribution}/100; reviewer independence unverified`;break}
 case 'stage':{
  if(ed.status!=='candidate')throw Error('Certification candidate prerequisite');
  const gate=certificationGate(ed);if(!gate.eligible)throw Error('Candidate must be revalidated before private staging: '+gate.problems.join(' '));
  if(payload.consent!==true||payload.approval!==true)throw Error('Publication consent and editor approval declarations required');
  ed.consent=true;ed.editorApproval=true;ed.status='staged';detail='PRIVATE publication staging only; no public release, DOI or independent reviewer validation';break}
 default:throw Error('Unsupported editorial action');
 }
 recordAudit(ed,action,user,detail,from);return ed;
}
