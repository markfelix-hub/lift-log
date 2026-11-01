(function(){
'use strict';

function curItem(key){var pl=getPlan(S.prog,S.mode,S.day);if(pl){var all=planItems(pl);for(var i=0;i<all.length;i++)if(all[i].key===key)return all[i];}return ITEMS[key];}

/* ---------- state ---------- */
var S={prog:'m1',mode:'gym',day:'push',date:today(),view:'log',sessions:{},db:null,conn:'connecting',pending:{},ver:{},confirm:null,copyText:null,copied:false,open:{},backupMsg:null};
try{var pr=JSON.parse(localStorage.getItem('liftlog.prefs')||'{}');if(pr.prog&&PROG[pr.prog])S.prog=pr.prog;if(pr.mode==='gym'||pr.mode==='home')S.mode=pr.mode;if(pr.day&&PROG.m1.gym[pr.day])S.day=pr.day;}catch(e){}
function savePrefs(){try{localStorage.setItem('liftlog.prefs',JSON.stringify({prog:S.prog,mode:S.mode,day:S.day}));}catch(e){}}
try{var pend=JSON.parse(localStorage.getItem('liftlog.pending')||'{}');Object.keys(pend).forEach(function(id){S.sessions[id]=pend[id];S.pending[id]=true;S.ver[id]=1;});}catch(e){}
function persistLocal(){try{var o={};Object.keys(S.pending).forEach(function(id){if(S.sessions[id])o[id]=S.sessions[id];});if(Object.keys(o).length)localStorage.setItem('liftlog.pending',JSON.stringify(o));else localStorage.removeItem('liftlog.pending');}catch(e){}}

function curId(){return S.date+'_'+S.day+'_'+S.prog+(S.mode==='home'?'_home':'');}
function curSession(){return S.sessions[curId()]||null;}
function ensureSession(){
  var id=curId();
  if(!S.sessions[id])S.sessions[id]={id:id,date:S.date,day:S.day,prog:S.prog,mode:S.mode,status:'open',logs:{},info:{},notes:'',updated:new Date().toISOString()};
  return S.sessions[id];
}
function setsArr(s,key,n){
  if(!s.logs[key])s.logs[key]=[];
  while(s.logs[key].length<n)s.logs[key].push({kg:null,reps:null,done:false});
  return s.logs[key];
}
function prevFor(key,id,date){
  var best=null;
  Object.keys(S.sessions).forEach(function(sid){
    if(sid===id)return;
    var s=S.sessions[sid];
    if(!s||!s.logs||!s.logs[key]||s.date>date)return;
    if(!s.logs[key].some(has))return;
    if(!best||s.date>best.date||(s.date===best.date&&(s.updated||'')>(best.updated||'')))best=s;
  });
  return best?{date:best.date,sets:best.logs[key]}:null;
}
function fmt(it,t){
  if(!t)return '';
  var u=(it&&it.unit==='sec')?'s':'';
  var a='';
  if(t.kg!=null)a+=t.kg+'kg'+((it&&it.assist)?' assist':'');
  if(t.reps!=null)a+=(a?' × ':'')+t.reps+u;
  return a;
}

/* ---------- saving ---------- */
var timer=null,flushing=false,again=false;
function markDirty(id){if(S.sessions[id])S.sessions[id].updated=new Date().toISOString();S.pending[id]=true;S.ver[id]=(S.ver[id]||0)+1;persistLocal();setConn('saving');clearTimeout(timer);timer=setTimeout(flush,700);}
function setConn(c){S.conn=c;updateStatus();}
function statusInfo(){
  var m={connecting:['Opening…',''],idle:['Ready',''],saving:['Saving…',''],saved:['Saved on phone','ok'],error:['Not saved · tap to retry','err'],nodb:['Saved (basic storage)','']};
  return m[S.conn]||m.idle;
}
function updateStatus(){
  var el=document.getElementById('st');if(!el)return;
  var i=statusInfo();el.textContent=i[0];el.className='pill '+i[1];
}
async function flush(){
  if(flushing){again=true;return;}
  if(!S.db){if(Object.keys(S.pending).length)setConn('nodb');return;}
  flushing=true;
  try{
    do{
      again=false;
      var ids=Object.keys(S.pending);
      for(var k=0;k<ids.length;k++){
        var id=ids[k],doc=S.sessions[id];
        if(!doc){delete S.pending[id];continue;}
      }
      var vers={};ids.forEach(function(id){vers[id]=S.ver[id];});
      await idbPut(ids.filter(function(id){return S.sessions[id];}).map(function(id){return clone(S.sessions[id]);}));
      ids.forEach(function(id){if(S.ver[id]===vers[id])delete S.pending[id];else again=true;});
      persistLocal();
    }while(again);
    setConn('saved');
  }catch(e){setConn('error');}
  finally{flushing=false;}
}
function saveNow(){clearTimeout(timer);persistLocal();if(Object.keys(S.pending).length)flush();}
document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')saveNow();syncWake();});
window.addEventListener('pagehide',saveNow);

/* ---------- IndexedDB: one store, keyed by session id ---------- */
function openDB(){
  return new Promise(function(res,rej){
    if(!window.indexedDB)return rej(new Error('no indexedDB'));
    var rq=indexedDB.open('liftlog',1);
    rq.onupgradeneeded=function(){rq.result.createObjectStore('sessions',{keyPath:'id'});};
    rq.onsuccess=function(){var db=rq.result;db.onversionchange=function(){db.close();};res(db);};
    rq.onerror=function(){rej(rq.error);};
    rq.onblocked=function(){rej(new Error('blocked'));};
  });
}
function idbTx(mode,fn){
  return new Promise(function(res,rej){
    var tx=S.db.transaction('sessions',mode),st=tx.objectStore('sessions'),out=fn(st);
    tx.oncomplete=function(){res(out&&out.result);};
    tx.onerror=tx.onabort=function(){rej(tx.error);};
  });
}
function idbPut(docs){return idbTx('readwrite',function(st){docs.forEach(function(d){st.put(d);});});}
function idbDelete(id){return idbTx('readwrite',function(st){st.delete(id);});}
function idbAll(){return idbTx('readonly',function(st){return st.getAll();});}

/* ---------- first run: seed history, ask to keep data ---------- */
async function seedOnce(){
  try{if(localStorage.getItem('liftlog.seeded'))return;}catch(e){}
  var seed=[];
  try{var r=await fetch('seed-history.json');if(r.ok)seed=await r.json();}catch(e){return;}
  var have={};(await idbAll()).forEach(function(s){have[s.id]=true;});
  var fresh=(Array.isArray(seed)?seed:[]).filter(function(s){return validSession(s)&&!have[s.id];});
  if(fresh.length)await idbPut(fresh);
  try{localStorage.setItem('liftlog.seeded','1');}catch(e){}
}
function askPersist(){
  try{if(!localStorage.getItem('liftlog.firstRun'))localStorage.setItem('liftlog.firstRun',new Date().toISOString());}catch(e){}
  if(navigator.storage&&navigator.storage.persist){
    navigator.storage.persisted().then(function(p){if(!p)return navigator.storage.persist();}).catch(function(){});
  }
}

/* ---------- backup ---------- */
function validSession(s){return !!s&&typeof s.id==='string'&&typeof s.date==='string'&&typeof s.day==='string'&&typeof s.logs==='object';}
function lsGet(k){try{return localStorage.getItem(k);}catch(e){return null;}}
function daysSince(iso){var t=Date.parse(iso||'');return isFinite(t)?Math.floor((Date.now()-t)/864e5):null;}
function backupDue(){
  if(!Object.keys(S.sessions).length)return null;
  var d=daysSince(lsGet('liftlog.lastBackup')||lsGet('liftlog.firstRun'));
  return d!=null&&d>14?d:null;
}
function backupBlob(){
  var all=Object.keys(S.sessions).sort().map(function(id){return S.sessions[id];});
  var data={app:'lift-log',format:1,exported:new Date().toISOString(),sessions:all};
  return new Blob([JSON.stringify(data,null,1)],{type:'application/json'});
}
function backupName(){return 'lift-log-backup-'+today()+'.json';}
function markBackedUp(){try{localStorage.setItem('liftlog.lastBackup',new Date().toISOString());}catch(e){}}
function exportBackup(){
  var url=URL.createObjectURL(backupBlob()),a=document.createElement('a');
  a.href=url;a.download=backupName();document.body.appendChild(a);a.click();a.remove();
  setTimeout(function(){URL.revokeObjectURL(url);},4000);
  markBackedUp();S.backupMsg='Backup saved as '+backupName()+'. Keep it somewhere safe, like iCloud Drive, Google Drive or email.';render();
}
function canShareFile(){
  try{return !!(navigator.canShare&&navigator.canShare({files:[new File(['{}'],'t.json',{type:'application/json'})]}));}catch(e){return false;}
}
function shareBackup(){
  var f=new File([backupBlob()],backupName(),{type:'application/json'});
  navigator.share({files:[f],title:'Lift Log backup'}).then(function(){
    markBackedUp();S.backupMsg='Backup shared.';render();
  },function(){});
}
function importBackup(text){
  var data;
  try{data=JSON.parse(text);}catch(e){S.backupMsg='That file is not a Lift Log backup.';render();return;}
  var list=Array.isArray(data)?data:(data&&Array.isArray(data.sessions)?data.sessions:null);
  if(!list){S.backupMsg='That file is not a Lift Log backup.';render();return;}
  var added=0,updated=0,kept=0;
  list.forEach(function(s){
    if(!validSession(s))return;
    var cur=S.sessions[s.id];
    if(cur&&(cur.updated||'')>=(s.updated||'')){kept++;return;}
    if(cur)updated++;else added++;
    s=clone(s);s.info=s.info||{};s.notes=s.notes||'';s.status=s.status||'open';s.mode=s.mode||'gym';
    S.sessions[s.id]=s;S.pending[s.id]=true;S.ver[s.id]=(S.ver[s.id]||0)+1;
  });
  persistLocal();flush();
  S.backupMsg='Imported: '+added+' new, '+updated+' updated, '+kept+' already up to date.';render();
}
document.getElementById('importFile').addEventListener('change',function(e){
  var f=e.target.files&&e.target.files[0];if(!f)return;
  var rd=new FileReader();
  rd.onload=function(){importBackup(String(rd.result));};
  rd.onerror=function(){S.backupMsg='Could not read that file.';render();};
  rd.readAsText(f);e.target.value='';
});

/* ---------- screen wake lock while a session is open ---------- */
var wake=null,wakeBusy=false;
async function syncWake(){
  if(!('wakeLock' in navigator)||wakeBusy)return;
  var s=curSession(),want=document.visibilityState==='visible'&&S.view==='log'&&!(s&&s.status==='done')&&!!getPlan(S.prog,S.mode,S.day);
  wakeBusy=true;
  try{
    if(want&&!wake){wake=await navigator.wakeLock.request('screen');wake.addEventListener('release',function(){wake=null;});}
    else if(!want&&wake){var w=wake;wake=null;await w.release();}
  }catch(e){wake=null;}
  finally{wakeBusy=false;}
}

/* ---------- rendering ---------- */
var CHECK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

function exHTML(it,s,id){
  var arr=(s&&s.logs&&s.logs[it.key])||[];
  var prev=prevFor(it.key,id,S.date);
  var h='<div class="ex"><div class="ex-h"><div class="ex-name">'+esc(it.name)+(it.est?'<span class="est">MINE</span>':'')+'</div><div class="target">'+it.sets+' × '+esc(it.reps)+(it.unit==='sec'?' sec':'')+'</div></div>';
  if(it.cue||it.rest)h+='<div class="cue">'+esc((it.rest?'Rest '+it.rest+'s. ':'')+(it.cue||''))+'</div>';
  if(prev&&prev.sets.some(has)){
    h+='<div class="last"><span>Last, '+esc(fdate(prev.date))+': '+prev.sets.filter(has).map(function(t){return esc(fmt(it,t));}).join(' · ')+'</span><button class="link" data-act="useLast" data-key="'+it.key+'">Use these</button></div>';
  }else h+='<div class="last"><span>No earlier log yet</span></div>';
  var bw=!!it.bw;
  h+='<div class="sets"><div class="row hd'+(bw?' bw':'')+'"><span>Set</span>'+(bw?'':'<span>'+(it.assist?'Assist kg':'Kg')+'</span>')+'<span>'+(it.unit==='sec'?'Sec':'Reps')+'</span><span></span></div>';
  for(var i=0;i<it.sets;i++){
    var t=arr[i]||{kg:null,reps:null,done:false};
    var pt=prev&&prev.sets[i]?prev.sets[i]:null;
    var kgPh=pt&&pt.kg!=null?pt.kg:'';
    var rpPh=pt&&pt.reps!=null?pt.reps:(topNum(it.reps)!=null?topNum(it.reps):'');
    h+='<div class="row'+(bw?' bw':'')+(t.done?' done':'')+'"><span class="n">'+(i+1)+'</span>';
    if(!bw)h+='<input class="num" id="kg-'+it.key+'-'+i+'" type="number" inputmode="decimal" step="0.5" min="0" placeholder="'+esc(kgPh)+'" value="'+(t.kg==null?'':esc(t.kg))+'" data-key="'+it.key+'" data-i="'+i+'" data-f="kg" aria-label="'+esc(it.name)+' set '+(i+1)+' kilograms">';
    h+='<input class="num" id="rp-'+it.key+'-'+i+'" type="number" inputmode="numeric" step="1" min="0" placeholder="'+esc(rpPh)+'" value="'+(t.reps==null?'':esc(t.reps))+'" data-key="'+it.key+'" data-i="'+i+'" data-f="reps" aria-label="'+esc(it.name)+' set '+(i+1)+' '+(it.unit==='sec'?'seconds':'reps')+'">';
    h+='<button class="chk" type="button" aria-pressed="'+(t.done?'true':'false')+'" aria-label="Mark set '+(i+1)+' done" data-act="tick" data-key="'+it.key+'" data-i="'+i+'">'+CHECK+'</button></div>';
  }
  return h+'</div></div>';
}
function infoHTML(it,s){
  var d=(s&&s.info&&s.info[it.key])||{done:false,text:''};
  return '<div class="ex"><div class="ex-h"><div class="ex-name">'+esc(it.name)+'</div></div><div class="infoText">'+esc(it.text)+'</div>'+
    '<div class="infoRow"><input id="in-'+it.key+'" type="text" placeholder="Note: time, rounds, weight" value="'+esc(d.text)+'" data-info="'+it.key+'" aria-label="'+esc(it.name)+' note">'+
    '<button class="chk" type="button" aria-pressed="'+(d.done?'true':'false')+'" aria-label="Mark '+esc(it.name)+' done" data-act="infoTick" data-key="'+it.key+'">'+CHECK+'</button></div></div>';
}
function countProgress(){
  var plan=getPlan(S.prog,S.mode,S.day),s=curSession(),total=0,done=0;if(!plan)return {total:0,done:0};
  planItems(plan).forEach(function(it){
    if(it.kind==='info'){total++;if(s&&s.info&&s.info[it.key]&&s.info[it.key].done)done++;return;}
    total+=it.sets;
    var arr=s&&s.logs&&s.logs[it.key];
    if(arr)arr.forEach(function(t,i){if(i<it.sets&&t&&t.done)done++;});
  });
  return {total:total,done:done};
}
function updateProgress(){
  var c=countProgress(),a=document.getElementById('pt'),b=document.getElementById('pb');
  if(a)a.textContent=c.done+' of '+c.total+' sets done';
  if(b){b.style.width=(c.total?Math.round(c.done/c.total*100):0)+'%';b.className=(c.total&&c.done===c.total)?'full':'';}
}
function logHTML(){
  var plan=getPlan(S.prog,S.mode,S.day),s=curSession(),id=curId(),h='';
  h+='<div class="seg" role="group" aria-label="Programme">'+['m1','m2','jan'].map(function(p){
    return '<button type="button" aria-pressed="'+(S.prog===p?'true':'false')+'" data-act="prog" data-v="'+p+'">'+PROG[p].label+'<small>'+PROG[p].sub+'</small></button>';
  }).join('')+'</div>';
  h+='<div class="seg" role="group" aria-label="Where you train">'+MODES.map(function(m){
    return '<button type="button" aria-pressed="'+(S.mode===m[0]?'true':'false')+'" data-act="mode" data-v="'+m[0]+'">'+m[1]+'</button>';
  }).join('')+'</div>';
  h+='<div class="dateRow"><div class="wd">'+esc(fdateLong(S.date))+'</div><input id="date" type="date" value="'+esc(S.date)+'" aria-label="Session date"><button class="link" type="button" data-act="today">Today</button></div>';
  if(S.conn==='nodb')h+='<div class="banner">This browser blocked the app\'s database, so sets are kept in basic storage. Export a backup from History after each session.</div>';
  if(s&&s.status==='done'&&backupDue())h+='<div class="banner info">Nice work. Your last backup was over two weeks ago. Tap History, then Export backup.</div>';
  if(!plan){return h+'<div class="banner info">This day is not in the January screenshots. Pick Month 1 or Month 2.</div>';}
  if(plan.est)h+='<div class="banner">Estimated by Claude, not your trainer\'s actual plan. Swap anything your gym cannot support.</div>';
  if(plan.note)h+='<div class="banner info">'+esc(plan.note)+'</div>';
  h+='<div class="banner info">Tempo 2 sec up, 2 sec down. Rest about 60 sec. No rest inside a superset, rest after the pair.</div>';
  h+='<div class="prog"><div class="t"><span id="pt"></span><span>'+(s&&s.status==='done'?'Finished':'In progress')+'</span></div><div class="bar"><i id="pb"></i></div></div>';
  plan.sections.forEach(function(sec){
    h+='<div class="sec-h">'+esc(sec.h)+'</div>';
    sec.blocks.forEach(function(b){
      var ss=b.length>1;
      h+='<div class="blk'+(ss?' ss':'')+'">'+(ss?'<span class="ss-tag">SUPERSET</span>':'');
      b.forEach(function(it){h+=it.kind==='info'?infoHTML(it,s):exHTML(it,s,id);});
      h+='</div>';
    });
  });
  h+='<div class="sec-h">Notes</div><textarea id="notes" placeholder="How did it feel? Anything to change next time?" aria-label="Session notes">'+esc(s?s.notes:'')+'</textarea>';
  h+='<div class="actions"><button class="btn'+(S.confirm==='reset'?' danger':'')+'" type="button" data-act="'+(S.confirm==='reset'?'resetYes':'reset')+'">'+(S.confirm==='reset'?'Tap again to clear':'Clear')+'</button>'+
     '<button class="btn '+(s&&s.status==='done'?'done':'primary')+'" type="button" data-act="finish">'+(s&&s.status==='done'?'Finished. Tap to reopen':'Finish session')+'</button></div>';
  return h;
}
function sessionSummary(s){
  var done=0,total=0;
  Object.keys(s.logs||{}).forEach(function(k){(s.logs[k]||[]).forEach(function(t){if(has(t)||t.done)total++;if(t.done)done++;});});
  return {done:done,total:total};
}
function histHTML(){
  var ids=Object.keys(S.sessions).sort(function(a,b){
    var A=S.sessions[a],B=S.sessions[b];
    if(A.date!==B.date)return A.date<B.date?1:-1;
    return (B.updated||'')>(A.updated||'')?1:-1;
  });
  var h='<div class="seg" role="group" aria-label="History tools"><button type="button" data-act="copyAll">'+(S.copied?'Copied':'Copy all history as text')+'<small>Paste into ChatGPT or Claude</small></button></div>';
  if(S.copyText)h+='<div class="copybox"><textarea id="copyText" readonly aria-label="History text">'+esc(S.copyText)+'</textarea></div>';
  var lb=daysSince(lsGet('liftlog.lastBackup')),due=backupDue();
  h+='<div class="seg" role="group" aria-label="Backup"><button type="button" data-act="export">Export backup<small>'+(lb==null?'Never backed up':'Last: '+(lb===0?'today':lb===1?'yesterday':lb+' days ago'))+'</small></button><button type="button" data-act="import">Import backup<small>Merges, newest wins</small></button></div>';
  if(canShareFile())h+='<div style="text-align:center"><button class="link" type="button" data-act="share">Or share the backup file (Files, Drive, email)</button></div>';
  if(S.backupMsg)h+='<div class="banner info" role="status">'+esc(S.backupMsg)+'</div>';
  else if(due)h+='<div class="banner">It has been '+due+' days since your last backup. Tap Export backup and keep the file somewhere safe.</div>';
  if(!ids.length)return h+'<div class="empty">No sessions saved yet. Log a set on the Log tab and it appears here.</div>';
  ids.forEach(function(id){
    var s=S.sessions[id],sm=sessionSummary(s),dl=(DAYS.filter(function(d){return d[0]===s.day;})[0]||['',s.day])[1];
    h+='<details class="hcard" data-id="'+esc(id)+'"'+(S.open[id]?' open':'')+'><summary><div><div class="hn">'+esc(dl)+' · '+esc(PROG[s.prog]?PROG[s.prog].label:s.prog)+(s.mode==='home'?' · Home':'')+'</div><div class="hs">'+esc(fdate(s.date))+' · '+sm.done+' sets done</div></div><span class="st'+(s.status==='done'?' done':'')+'">'+(s.status==='done'?'Finished':'Open')+'</span></summary><div class="hbody">';
    var any=false;
    Object.keys(s.logs||{}).forEach(function(k){
      var arr=s.logs[k].filter(has);if(!arr.length)return;any=true;
      var it=ITEMS[k];
      h+='<div class="hex"><b>'+esc(it?it.name:k)+'</b><div>'+s.logs[k].filter(has).map(function(t){return esc(fmt(it,t));}).join(' · ')+'</div></div>';
    });
    Object.keys(s.info||{}).forEach(function(k){
      var d=s.info[k];if(!d||(!d.done&&!d.text))return;any=true;
      h+='<div class="hex"><b>'+esc(ITEMS[k]?ITEMS[k].name:k)+'</b><div>'+(d.done?'Done':'')+(d.text?(d.done?' · ':'')+esc(d.text):'')+'</div></div>';
    });
    if(!any)h+='<div class="hex"><div>No sets logged.</div></div>';
    if(s.notes)h+='<div class="hex"><b>Notes</b><div>'+esc(s.notes)+'</div></div>';
    h+='<div class="hact"><button class="btn" type="button" data-act="open" data-id="'+esc(id)+'">Open</button><button class="btn'+(S.confirm==='del:'+id?' danger':'')+'" type="button" data-act="'+(S.confirm==='del:'+id?'delYes':'del')+'" data-id="'+esc(id)+'">'+(S.confirm==='del:'+id?'Tap again to delete':'Delete')+'</button></div></div></details>';
  });
  return h;
}
function render(soft){
  var ae=document.activeElement;
  if(soft&&ae&&(ae.tagName==='INPUT'||ae.tagName==='TEXTAREA')&&document.getElementById('app').contains(ae))return;
  var i=statusInfo();
  var h='<header><div class="top"><h1>Lift Log</h1><button id="st" class="pill '+i[1]+'" type="button" data-act="retry" aria-live="polite">'+esc(i[0])+'</button></div>';
  h+='<div class="tabs" role="group" aria-label="Workout day">'+DAYS.map(function(d){return '<button class="tab" type="button" aria-pressed="'+(S.day===d[0]?'true':'false')+'" data-act="day" data-v="'+d[0]+'">'+d[1]+'</button>';}).join('')+'</div></header>';
  h+='<div class="seg" role="group" aria-label="View">'+[['log','Log'],['history','History']].map(function(v){return '<button type="button" aria-pressed="'+(S.view===v[0]?'true':'false')+'" data-act="view" data-v="'+v[0]+'">'+v[1]+'</button>';}).join('')+'</div>';
  h+=(S.view==='log'?logHTML():histHTML());
  document.getElementById('app').innerHTML=h;
  if(S.view==='log')updateProgress();
  if(S.copyText){var ta=document.getElementById('copyText');if(ta){ta.focus();ta.select();}}
  syncWake();
}

/* ---------- actions ---------- */
function buildText(){
  var ids=Object.keys(S.sessions).sort(function(a,b){var A=S.sessions[a],B=S.sessions[b];return A.date<B.date?1:(A.date>B.date?-1:0);});
  var out=['LIFT LOG (weights in kg; "assist" = assisted chin-up assistance, lower is stronger)',''];
  ids.forEach(function(id){
    var s=S.sessions[id],sm=sessionSummary(s);
    out.push(s.date+' | '+s.day+' | '+(PROG[s.prog]?PROG[s.prog].label:s.prog)+(s.mode==='home'?' (home)':' (gym)')+' | '+(s.status==='done'?'finished':'in progress')+' | '+sm.done+' sets done');
    Object.keys(s.logs||{}).forEach(function(k){
      var it=ITEMS[k],arr=s.logs[k].filter(has);if(!arr.length)return;
      out.push('  '+(it?it.name:k)+': '+arr.map(function(t){return fmt(it,t);}).join(', '));
    });
    Object.keys(s.info||{}).forEach(function(k){var d=s.info[k];if(d&&(d.done||d.text))out.push('  '+(ITEMS[k]?ITEMS[k].name:k)+': '+(d.done?'done ':'')+(d.text||''));});
    if(s.notes)out.push('  Notes: '+s.notes);
    out.push('');
  });
  return out.join('\n');
}
var app=document.getElementById('app');
app.addEventListener('input',function(e){
  var t=e.target;
  if(t.matches&&t.matches('input.num')){
    var s=ensureSession(),it=curItem(t.getAttribute('data-key'));
    var arr=setsArr(s,it.key,it.sets),i=+t.getAttribute('data-i'),f=t.getAttribute('data-f');
    arr[i][f]=numOrNull(t.value);
    markDirty(curId());updateProgress();
  }else if(t.id==='notes'){
    var s2=ensureSession();s2.notes=t.value;markDirty(curId());
  }else if(t.hasAttribute&&t.hasAttribute('data-info')){
    var s3=ensureSession(),k=t.getAttribute('data-info');
    s3.info[k]=s3.info[k]||{done:false,text:''};s3.info[k].text=t.value;markDirty(curId());
  }
});
app.addEventListener('change',function(e){
  if(e.target.id==='date'&&e.target.value){S.date=e.target.value;S.confirm=null;render();}
});
app.addEventListener('toggle',function(e){var d=e.target;if(d&&d.classList&&d.classList.contains('hcard')){S.open[d.getAttribute('data-id')]=d.open;}},true);
app.addEventListener('click',function(e){
  var b=e.target.closest?e.target.closest('[data-act]'):null;if(!b)return;
  var act=b.getAttribute('data-act'),v=b.getAttribute('data-v'),key=b.getAttribute('data-key'),id=b.getAttribute('data-id');
  if(act==='day'){S.day=v;S.confirm=null;savePrefs();render();}
  else if(act==='prog'){S.prog=v;S.confirm=null;savePrefs();render();}
  else if(act==='mode'){S.mode=v;S.confirm=null;savePrefs();render();}
  else if(act==='view'){S.view=v;S.confirm=null;S.copyText=null;S.backupMsg=null;render();window.scrollTo(0,0);}
  else if(act==='export'){exportBackup();}
  else if(act==='share'){shareBackup();}
  else if(act==='import'){S.backupMsg=null;document.getElementById('importFile').click();}
  else if(act==='today'){S.date=today();render();}
  else if(act==='retry'){if(S.conn==='error'||Object.keys(S.pending).length)flush();}
  else if(act==='tick'){
    var it=curItem(key),s=ensureSession(),arr=setsArr(s,key,it.sets),i=+b.getAttribute('data-i'),t=arr[i];
    t.done=!t.done;
    if(t.done){
      var prev=prevFor(key,curId(),S.date),before=i>0?arr[i-1]:null,pt=prev&&prev.sets[i]?prev.sets[i]:null;
      if(t.kg==null&&!it.bw)t.kg=(before&&before.kg!=null)?before.kg:(pt&&pt.kg!=null?pt.kg:null);
      if(t.reps==null)t.reps=(before&&before.reps!=null)?before.reps:(pt&&pt.reps!=null?pt.reps:topNum(it.reps));
    }
    markDirty(curId());render();
  }
  else if(act==='infoTick'){
    var s4=ensureSession();s4.info[key]=s4.info[key]||{done:false,text:''};s4.info[key].done=!s4.info[key].done;markDirty(curId());render();
  }
  else if(act==='useLast'){
    var it2=curItem(key),s5=ensureSession(),arr2=setsArr(s5,key,it2.sets),pv=prevFor(key,curId(),S.date);
    if(pv){for(var j=0;j<it2.sets;j++){var p=pv.sets[j];if(!p)continue;if(arr2[j].kg==null&&!it2.bw&&p.kg!=null)arr2[j].kg=p.kg;if(arr2[j].reps==null&&p.reps!=null)arr2[j].reps=p.reps;}markDirty(curId());render();}
  }
  else if(act==='finish'){var s6=ensureSession();s6.status=s6.status==='done'?'open':'done';markDirty(curId());render();}
  else if(act==='reset'){S.confirm='reset';render();}
  else if(act==='resetYes'){var s7=ensureSession();s7.logs={};s7.info={};s7.notes='';s7.status='open';S.confirm=null;markDirty(curId());render();}
  else if(act==='copyAll'){
    var text=buildText();
    var shown=function(){S.copied=true;S.copyText=null;render();setTimeout(function(){S.copied=false;if(S.view==='history')render(true);},2000);};
    var fallback=function(){S.copyText=text;render();};
    if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(shown,fallback);}else fallback();
  }
  else if(act==='open'){var s8=S.sessions[id];if(s8){S.date=s8.date;S.day=s8.day;S.prog=s8.prog;S.mode=s8.mode||'gym';S.view='log';S.confirm=null;savePrefs();render();window.scrollTo(0,0);}}
  else if(act==='del'){S.confirm='del:'+id;render();}
  else if(act==='delYes'){
    S.confirm=null;delete S.pending[id];persistLocal();
    var gone=S.sessions[id];delete S.sessions[id];render();
    if(S.db){idbDelete(id).catch(function(){if(gone){S.sessions[id]=gone;render();}});}
  }
});

/* ---------- boot ---------- */
render();
(async function(){
  askPersist();
  try{S.db=await openDB();}catch(e){S.db=null;}
  if(!S.db){S.conn='nodb';render(true);return;}
  try{
    await seedOnce();
    (await idbAll()).forEach(function(d){if(!S.pending[d.id])S.sessions[d.id]=d;});
    S.conn='saved';
  }catch(e){S.conn='error';}
  render(true);updateStatus();
  if(Object.keys(S.pending).length)flush();
})();
if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol)){
  window.addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){});});
}
})();
