'use strict';
const $ = id => document.getElementById(id);
const fields = {
 plan: [['strengths','Interests and strengths to build on'],['situation','One situation we want to make easier'],['message','The child’s chosen message or signal'],['mode','How they want to communicate','select',['Speech','Pointing or a card','Writing or typing','Drawing','A supporter helps','A mix / their own choice']],['location','Where we will keep the tool'],['response','What the supporter will do when they notice it'],['backup','What helps if the child cannot use the signal'],['pause','Pause arrangements: place, supervision and reconnecting'],['child_view','The child’s view / choices (including if not discussed yet)'],['introduced_by','Who will introduce it?'],['review_date','When shall we check in? (optional)','date']],
 try: [['action','One thing we have agreed to try'],['person','Who has agreed to help?'],['when','When or in which routine?'],['status','Where are we up to?','select',['Suggested - not yet agreed','Agreed to try','Introduced','Tried','Changed together','Paused / not for us']],['note','Anything useful to know (optional)']],
 review: [['date','Date of the opportunity','date'],['situation','Situation / what was tried'],['message','What the child wanted to communicate, if known'],['mode','How they communicated','select',['Speech','Card or pointing','Writing / typing / drawing','Someone helped','Could not communicate it','Not tried yet','Other / not sure']],['support','Support used (optional)'],['response','What the adult did'],['outcome','Did it help?','select',['Not sure','Yes','A little','No','Made it harder','Not tried yet']],['child_view','The child’s view, if offered'],['next','Keep, change or leave it? What next?']],
 comment: [['comment','A thought, suggestion or correction']],
 dismissal: [['date','Date','date'],['destination','Verified destination'],['handover','Receiving adult / location and handover time'],['checked','Checked against / verified with'],['child_view','Child’s check or correction, if offered'],['unclear','If unclear: who checks, and where the child waits with supervision']]
};
const names={plan:'Our plan',try:'Next step',review:'Did it help?',comment:'Comment',dismissal:'After-school check',access:'Access update'};
const messages=[['PRIVATE','Can we talk away from other people?'],['CHECK','That is not what I mean. Please check.'],['PAUSE','I need a moment.'],['WRITE','I want to write or point instead.'],['HELP','Please show me the first step.'],['TODAY’S PLAN','Please check where I am going today.'],['LATER','I cannot explain now.'],['MY WORDS','Choose your own words.']];
let db=null, demo=false, state=null, busy=false, authBusy=false, dirty=false, lastSend=0, loaded=[], activeUser=null, requestSerial=0;
const pending=new Map();
const dirtyForms=new Set();
function markClean(kind){dirtyForms.delete(kind);dirty=dirtyForms.size>0;}
function notice(message,error=false){$('notice').textContent=message;$('notice').classList.toggle('error',error);}
function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;}
function buildForms(){
 for(const [kind,defs] of Object.entries(fields)){
  const form=$(kind+'Form');
  for(const [key,label,type,options] of defs){
   const l=el('label',label);let input;
   if(type==='select'){input=el('select');for(const v of options){const o=el('option',v);o.value=v;input.append(o);}}
   else if(type==='date'){input=el('input');input.type='date';}
   else{input=el('textarea');input.maxLength=1800;input.rows=2;}
   input.name=key;input.id=kind+'-'+key;l.htmlFor=input.id;l.append(input);form.append(l);
  }
  const b=el('button',kind==='plan'?'Save agreed plan':kind==='comment'?'Add comment':'Save update');b.type='submit';form.append(b);
  form.addEventListener('input',()=>{dirtyForms.add(kind);dirty=true;$('saveLabel').textContent=demo?'Example · not saved':'Unsaved changes';});
  form.addEventListener('submit',e=>{e.preventDefault();save(kind,form);});
 }
 for(const kind of ['review','dismissal'])$(kind+'Form').elements.date.value=today();
}
function showSection(id){for(const section of document.querySelectorAll('.page'))section.hidden=section.id!==id;for(const b of $('navigation').querySelectorAll('button')){if(b.dataset.section===id)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}}
function renderCards(){
 $('cardGrid').replaceChildren();messages.forEach(([title,text],i)=>{const card=el('article',undefined,'message-card');card.append(el('h3',title),el('p',i===7?($('customCard').value||text):text));$('cardGrid').append(card);});
}
function renderData(target,data,kind){
 target.replaceChildren();const dl=el('dl');const labels=Object.fromEntries((fields[kind]||[]).map(f=>[f[0],f[1]]));
 for(const [key,value] of Object.entries(data||{})){if(value===null||value===''||typeof value==='object')continue;dl.append(el('dt',labels[key]||key.replaceAll('_',' ')),el('dd',String(value)));}
 target.append(dl);
}
function renderHistory(){
 $('historyList').replaceChildren();
 for(const item of loaded){const a=el('article',undefined,'entry');a.append(el('h3',names[item.kind]||item.kind),el('p',`${item.actor_label} · ${item.actor_role} · ${new Date(item.created_at).toLocaleString('en-AU')} · update ${item.revision}`,'meta'));const d=el('div');renderData(d,item.payload,item.kind);a.append(d);$('historyList').append(a);}
 const reviews=loaded.filter(e=>e.kind==='review');const outcomes=reviews.reduce((o,e)=>{const k=e.payload.outcome||'Not sure';o[k]=(o[k]||0)+1;return o;},{});
 $('stats').textContent=reviews.length?`${reviews.length} review update${reviews.length===1?'':'s'} among the ${loaded.length} updates loaded: ${Object.entries(outcomes).map(([k,n])=>`${k}: ${n}`).join(' · ')}. These are informal observations, not scores.`:'No review updates in the entries loaded. A brief note after a real opportunity is enough.';
 $('older').hidden=!loaded.length||Math.min(...loaded.map(e=>e.revision))<=1;
 const step=loaded.find(e=>e.kind==='try');if(step)renderData($('latestStep'),step.payload,'try');else $('latestStep').textContent='No next step recorded yet.';
}
function renderWorkspace(preserveDrafts=false){
 document.body.classList.add('signed-in');$('workspace').hidden=false;$('spaceTitle').textContent=state.label;
 $('accessLabel').textContent=`Your role: ${state.role==='owner'?'coordinator':state.role} · ${state.can_write?'Can contribute':'View only'}`;
 $('saveLabel').textContent=demo?'Example · not saved':dirty?'Unsaved changes':`Saved record · update ${state.revision}`;
 renderData($('planRead'),state.plan,'plan');if(!state.plan)$('planRead').textContent='No agreed plan saved yet. Start with one useful idea.';
 if(!preserveDrafts){for(const d of fields.plan)$('planForm').elements[d[0]].value=state.plan?.[d[0]]||((d[2]==='select')?d[3][0]:'');}
 for(const kind of Object.keys(fields)){const form=$(kind+'Form');const can=state.can_write&&(kind!=='plan'||['owner','clinician'].includes(state.role));form.hidden=!can;}
 $('roster').replaceChildren(el('p','Coordinator · manages this workspace and its access'));
 for(const m of state.team||[]){$('roster').append(el('p',`${m.label} · ${m.role} · ${!m.active?'Access removed':m.can_write?'Can contribute':'View only'}${m.email?' · '+m.email:''}`));}
 $('memberForm').hidden=state.role!=='owner'||demo;
 renderHistory();
}
async function rpc(name,args={}){const {data,error}=await db.rpc('advocacy_'+name,args);if(error)throw error;return data;}
async function reload(preserveDrafts=false){
 if(!state||demo)return;
 const sid=state.id,serial=++requestSerial;
 const data=await rpc('load',{p_space:sid});if(serial!==requestSerial||sid!==state?.id)return;
 state=data;loaded=data.entries;renderWorkspace(preserveDrafts);
}
async function run(fn){if(busy)return;busy=true;const buttons=[...document.querySelectorAll('button')];const disabled=buttons.map(b=>b.disabled);buttons.forEach(b=>b.disabled=true);try{await fn();}catch(e){notice(e.message||'Something did not complete. Your text is still here. Please try again.',true);}finally{buttons.forEach((b,i)=>b.disabled=disabled[i]);busy=false;}}
async function save(kind,form){
 if(!state)return;const payload=Object.fromEntries(new FormData(form));
 const key=kind==='plan'?'message':kind==='try'?'action':kind==='comment'?'comment':kind==='review'?'situation':'destination';
 if(!String(payload[key]||'').trim()){notice('Add '+(kind==='plan'?'the chosen message':kind==='try'?'a next step':kind==='comment'?'your comment':kind==='review'?'the situation':'the verified destination')+' before saving.',true);form.elements[key].focus();return;}
 await run(async()=>{
  if(demo){const item={id:crypto.randomUUID(),space_id:state.id,revision:state.revision+1,kind,payload,actor_label:'Example supporter',actor_role:'owner',created_at:new Date().toISOString()};loaded.unshift(item);state.revision++;if(kind==='plan')state.plan=payload;markClean(kind);renderWorkspace(true);notice('Example updated on screen only. Nothing was saved.');return;}
  const encoded=JSON.stringify(payload);let token=pending.get(kind);if(!token||token.encoded!==encoded||token.space!==state.id){token={id:crypto.randomUUID(),encoded,space:state.id};pending.set(kind,token);}
  notice('Saving…');const result=await rpc('save',{p_space:state.id,p_kind:kind,p_payload:payload,p_expected:state.revision,p_id:token.id});
  // Read the committed record back before showing saved status. Keep id for retry until read-back succeeds.
  const data=await rpc('load',{p_space:state.id,p_before:result.saved_revision+1});
  const committed=data.entries.find(e=>e.id===result.id);if(!committed||JSON.stringify(Object.keys(committed.payload).sort().map(k=>[k,committed.payload[k]]))!==JSON.stringify(Object.keys(payload).sort().map(k=>[k,payload[k]])))throw new Error('Save returned, but read-back could not be confirmed. Refresh to check before retrying.');
  pending.delete(kind);markClean(kind);await reload(true);
  if(kind!=='plan'){form.reset();if(form.elements.date)form.elements.date.value=today();}
  notice('Saved and checked. People with access to this workspace can see the update.');
 });
}
function clearWorkspace(){++requestSerial;state=null;loaded=[];pending.clear();dirtyForms.clear();dirty=false;document.body.classList.remove('signed-in');$('workspace').hidden=true;$('spaceTitle').textContent='';$('historyList').replaceChildren();$('roster').replaceChildren();$('planRead').replaceChildren();for(const kind of Object.keys(fields))$(kind+'Form').reset();$('memberForm').reset();$('customCard').value='';renderCards();}
async function populate(){
 const listing=await rpc('list');$('spaces').replaceChildren(new Option('Choose a workspace',''));
 listing.spaces.forEach(s=>$('spaces').add(new Option(s.label,s.id)));
 $('createForm').hidden=!listing.can_create;$('workspaceBar').hidden=false;$('login').hidden=true;$('logout').hidden=false;
 if(listing.spaces.length===1){$('spaces').value=listing.spaces[0].id;state={id:listing.spaces[0].id};await reload();}
 notice(listing.spaces.length?'Choose a workspace, or continue below.':listing.can_create?'Create a private self-advocacy workspace to begin.':'No self-advocacy workspace has been shared with this email yet. Ask the coordinator to check the email and access.');
}
async function authChanged(event,session){
 if(demo)return;
 const uid=session?.user?.id||null;if(uid===activeUser&&event!=='SIGNED_OUT')return;
 activeUser=uid;clearWorkspace();
 if(!session){$('workspaceBar').hidden=true;$('login').hidden=false;$('logout').hidden=true;$('email').value='';$('code').value='';return;}
 try{await populate();}catch(e){notice(e.message,true);}
}
async function sendCode(){
 if(authBusy||!db)return;if(!$('email').reportValidity())return;
 if(Date.now()<lastSend+60000){notice('Please wait a minute before requesting another code.');return;}
 authBusy=true;$('send').disabled=true;
 try{const {error}=await db.auth.signInWithOtp({email:$('email').value.trim(),options:{shouldCreateUser:true,emailRedirectTo:location.origin+location.pathname}});if(error)throw error;lastSend=Date.now();notice('Check your email and junk folder. Enter the 6- or 8-digit code from the newest message.');$('code').focus();}catch(e){notice('The code request did not complete. '+e.message,true);}finally{authBusy=false;$('send').disabled=false;}
}
async function verifyCode(e){
 e.preventDefault();if(authBusy||!db)return;const token=$('code').value.trim();if(!/^(?:\d{6}|\d{8})$/.test(token)){notice('Enter the full 6- or 8-digit code from your email.',true);return;}
 authBusy=true;$('verify').disabled=true;try{const {error}=await db.auth.verifyOtp({email:$('email').value.trim(),token,type:'email'});if(error)throw error;$('code').value='';}catch(e){notice('The code could not be verified. Check the newest email or request another code.',true);}finally{authBusy=false;$('verify').disabled=false;}
}
function explore(){
 clearWorkspace();demo=true;state={id:'example',label:'Example workspace',role:'owner',can_write:true,revision:0,plan:null,team:[]};
 $('login').hidden=true;$('workspaceBar').hidden=true;$('logout').hidden=false;$('logout').textContent='Leave example';renderWorkspace();showSection('overview');notice('Example only. Entries stay on this screen and are lost when you leave or reload. Use fictional information.');
}
buildForms();renderCards();
$('navigation').addEventListener('click',e=>{if(e.target.dataset.section)showSection(e.target.dataset.section);});
document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>showSection(b.dataset.go));
$('customCard').oninput=renderCards;$('printCards').onclick=()=>window.print();$('demo').onclick=explore;$('send').onclick=sendCode;$('authForm').onsubmit=verifyCode;
$('spaces').onchange=()=>run(async()=>{if(dirty&&!confirm('Discard unsaved changes and switch workspace?')){$('spaces').value=state?.id||'';return;}const sid=$('spaces').value;clearWorkspace();if(sid){state={id:sid};await reload();showSection('overview');notice('Workspace loaded.');}});
$('refresh').onclick=()=>run(async()=>{await reload(true);notice(dirty?'Saved updates refreshed. Your unsaved text is kept; compare it with the saved plan before saving.':'Saved updates refreshed.');});
$('createForm').onsubmit=e=>{e.preventDefault();run(async()=>{if(dirty&&!confirm('Discard unsaved changes and create another workspace?'))return;const id=await rpc('create',{p_label:$('newLabel').value.trim()});clearWorkspace();await populate();$('spaces').value=id;state={id};await reload();$('newLabel').value='';notice('Private workspace created. Only the coordinator has access until supporters are added.');});};
$('memberForm').onsubmit=e=>{e.preventDefault();run(async()=>{const v=Object.fromEntries(new FormData(e.target));if(!confirm(v.access==='removed'?`Remove ${v.label}’s access to this workspace?`:`Give ${v.label} (${v.email}) ${v.access==='read'?'view-only':'contribution'} access to all saved entries in this workspace?`))return;await rpc('member',{p_space:state.id,p_email:v.email,p_label:v.label,p_role:v.role,p_write:v.access==='write',p_active:v.access!=='removed',p_expected:state.revision});await reload(true);e.target.reset();notice('Access updated. No email has been sent.');});};
$('older').onclick=()=>run(async()=>{if(demo)return;const data=await rpc('load',{p_space:state.id,p_before:Math.min(...loaded.map(e=>e.revision))});loaded.push(...data.entries.filter(e=>!loaded.some(x=>x.id===e.id)));renderHistory();if(!data.entries.length)$('older').hidden=true;});
$('export').onclick=()=>run(async()=>{if(!state||demo)return;let data=await rpc('load',{p_space:state.id});const currentPlan=data.plan;const entries=[...data.entries];while(data.entries.length===100){data=await rpc('load',{p_space:state.id,p_before:Math.min(...data.entries.map(e=>e.revision))});entries.push(...data.entries);}const blob=new Blob([JSON.stringify({tool:'Whiz Kids Self-Advocacy',exported_at:new Date().toISOString(),workspace:state.label,plan:currentPlan,entries},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=el('a');a.href=url;a.download='self-advocacy-record.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notice('Record downloaded. Store it with the child’s authorised records.');});
$('logout').onclick=()=>run(async()=>{if(dirty&&!confirm('Leave without saving the text still on this screen?'))return;if(demo){demo=false;clearWorkspace();$('logout').textContent='Sign out';$('login').hidden=false;$('logout').hidden=true;activeUser=null;const {data}=db?await db.auth.getSession():{data:{session:null}};if(data.session)await authChanged('SIGNED_IN',data.session);notice('Example closed. Nothing was saved.');return;}const {error}=await db.auth.signOut({scope:'local'});if(error)throw error;clearWorkspace();notice('Signed out on this device.');});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
if(!window.supabase){notice('Sign-in could not load. Check your connection and reload. You can still explore the example.',true);$('send').disabled=$('verify').disabled=true;}
else{db=window.supabase.createClient('https://fplfahemudvbeqqcmvbe.supabase.co','sb_publishable_d96rRFBUU96nRKwYMDKRJA_Mo-BFkQd');db.auth.onAuthStateChange((event,session)=>{setTimeout(()=>authChanged(event,session),0);});}

