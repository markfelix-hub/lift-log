/* Lift Log programme data and helpers. Shared by app.js and tests/programme-test.html. */
'use strict';

/* ---------- helpers ---------- */
function slug(s){return String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');}
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function pad(n){return (n<10?'0':'')+n;}
function today(){var d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
function fdate(s){var p=String(s).split('-');if(p.length!==3)return s;var d=new Date(+p[0],+p[1]-1,+p[2]);return d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'});}
function fdateLong(s){var p=String(s).split('-');if(p.length!==3)return s;var d=new Date(+p[0],+p[1]-1,+p[2]);return d.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'});}
function topNum(r){var m=String(r).match(/\d+/g);return m?+m[m.length-1]:null;}
function clone(o){return JSON.parse(JSON.stringify(o));}
function has(t){return !!t&&(t.kg!=null||t.reps!=null);}
function numOrNull(v){if(v===''||v==null)return null;var n=parseFloat(v);return isFinite(n)?n:null;}

/* ---------- programme data ---------- */
/* x(name, sets, reps, cue, rest, opts). opts: bw (no weight), unit:'sec', assist, est (my addition, tagged MINE) */
function x(name,sets,reps,cue,rest,o){
  o=o||{};
  var it={name:name,sets:sets,reps:String(reps),cue:cue||'',rest:rest||0};
  Object.keys(o).forEach(function(k){it[k]=o[k];});
  it.key=slug(name)+(it.unit==='sec'?'-sec':'');
  return it;
}
function info(name,text){return {kind:'info',key:slug(name),name:name,text:text};}
var BW={bw:true},SEC={unit:'sec'},BWSEC={bw:true,unit:'sec'},MINE={est:true},AS={assist:true};
var ASSIST='Log the assistance kg. Lower is stronger.';
function warm(dowel,swing){
  return [info('Warm-up','Arm hugs 20s, arm circles 20s, trunk rotations 20s, dowel pass-through '+dowel+'s, forward and lateral leg swings '+swing+'. Light cardio first if you like.')];
}
function plan(src,note,sec){return {src:src,note:note,sections:sec};}

var G_NOTE='Exactly as Gavin wrote it (Feb/Mar sheets). Tempo 2 sec up, 2 sec down unless stated.';
var FREE_NOTE='Freestyle block built from Gavin\'s exercises. Cards tagged MINE are not from Gavin. Same rule as his: more reps first, then more weight.';
var M2_NOTE='Same sets, reps and rest as Month 1, slot for slot. Exercises are swapped for others Gavin gave you (Jan screenshots, other days). MINE = not from Gavin.';

var PROG={
 m1:{label:'Month 1',sub:'Gavin exact',
  gym:{
   push:plan('gavin',G_NOTE,[
    {h:'Warm-up',blocks:[warm(30,'30s')]},
    {h:'Core',blocks:[[x('DB Pullover-Leg Raise to Toe Reach',3,10,'Brace abs, long legs, back pressed down.',60,BW)]]},
    {h:'Main workout',blocks:[
     [x('DB Incline Bench Press',3,12,'Smooth tempo, press evenly.',0),x('Push Up',3,10,'Chest to floor, full range.',60,BW)],
     [x('DB Seated Shoulder Press',3,12,'Slow tempo, stable core.',60)],
     [x('DB Incline Bench Tricep Kickback',3,15,'Tense hard at the top, no swinging.',60)],
     [x('Seated Chest Press Machine',3,12,'Stretch chest, soft elbows.',60)],
     [x('Cable Straight Bar Tricep Pushdown',3,12,'Full lockout, elbows pinned.',60)]]}]),
   pull:plan('gavin',G_NOTE,[
    {h:'Warm-up',blocks:[warm(30,'20s each side')]},
    {h:'Core',blocks:[[x('Hanging Knee Raise',3,10,'No swing, control the descent.',0,BW),x('Cable Kneeling Crunch',3,15,'Round from abs, slow squeeze.',0)]]},
    {h:'Main workout',blocks:[
     [x('Assisted Chin Up',3,6,'Pull from elbows, stiffen body. '+ASSIST,60,AS)],
     [x('Reverse Grip Lat Pulldown',3,12,'3-0-3-0 tempo. Pull from elbows.',60)],
     [x('DB Single Arm Row',3,12,'Pull from elbows. No rest between arms.',0)],
     [x('Incline DB Reverse Fly',3,15,'Light weight, slowly lower.',0),x('DB Incline Bicep Curl',3,10,'3-0-3-0 tempo. Full extension, slow.',60)]]}]),
   legs:plan('gavin',G_NOTE,[
    {h:'Warm-up',blocks:[warm(40,'20s each side')]},
    {h:'Core and glutes',blocks:[[x('DB Glute Bridge',3,'10/side','Hips tall, control the march.',0),x('Bicycles',3,50,'25 per side. Long legs, slow, controlled.',0,BW)]]},
    {h:'Main workout',blocks:[
     [x('DB Romanian Deadlift',3,10,'2-0-1-0 tempo. Soft knees, hinge back.',60)],
     [x('Seated Leg Press',3,12,'2-0-2-0 tempo. Good range, no long pauses.',60)],
     [x('Seated Leg Extension Machine',3,'10-12','2-0-2-0 tempo. Smooth, slowly down.',60)],
     [x('DB Alternating Reverse Lunge',3,'10/leg','Step back, stable torso.',45)],
     [x('Swiss Ball Leg Curl',3,'10-15','Controlled lift, slow descent.',60,BW)],
     [x('Leg Press Calf Raises',3,'15-20','Full stretch, hard squeeze.',45)]]}]),
   arms:plan('gavin',G_NOTE,[
    {h:'Warm-up',blocks:[warm(30,'20s each side')]},
    {h:'Core',blocks:[[x('Hanging Knee Raise',3,15,'No swing, control the descent.',0,BW),x('Cable Kneeling Crunch',3,15,'Round from abs, slow squeeze.',0)]]},
    {h:'Main workout',blocks:[
     [x('DB Pullover',3,'12-15','Ribs down, long controlled arc.',0),x('DB Alt. Bicep Curl Iso Hold',3,'8-12','Light weight, hold hard at 90 degrees.',60)],
     [x('DB Standing OH Tricep Extension',3,12,'Elbows tight, full lockout.',0),x('DB Incline Bicep Curl',3,10,'Stretch fully at the bottom, slow curl.',45)],
     [x('Cable Rope OH Tricep Extension',3,12,'Pause briefly in the stretch.',0),x('Cable Straight Bar Bicep Curl',3,12,'Hard squeeze at the top, elbows fixed.',60)]]}])
  },
  home:{
   push:plan('gavin',G_NOTE,[
    {h:'Warm-up',blocks:[warm(30,'30s')]},
    {h:'Core',blocks:[[x('Bicycles',3,45,'Alternate with the toe reach. 15 sec rest between. Brace abs, long legs.',15,BWSEC),x('Weighted Toe Reach',3,45,'Tense abs at the top.',15,BWSEC)]]},
    {h:'Main workout',blocks:[
     [x('Push Up',4,10,'2-0-2-0. Chest to floor, full range.',60,BW)],
     [x('DB Standing Shoulder Press',3,12,'Slow tempo, stable core, do not arch your back.',60)],
     [x('DB Lateral Raise',3,12,'Tense hard at the top, no swinging.',60)],
     [x('Tricep Dips',4,15,'Full lockout, elbows pinned.',30,BW)]]}]),
   pull:plan('gavin',G_NOTE,[
    {h:'Warm-up',blocks:[warm(30,'20s each side')]},
    {h:'Core',blocks:[[x('DB Pullover-Leg Raise to Toe Reach',3,10,'On the floor, let the DB kiss the floor. Lower back pushed down, single leg if needed.',60,BW)]]},
    {h:'Main workout',blocks:[
     [x('DB Bent Over Row',3,12,'Pull from elbows, retract shoulders. Watch your back position.',0),x('Seated DB Reverse Fly',3,15,'Light weight, strict control. Gavin wrote 5kg for set 1.',60)],
     [x('DB Single Arm Row',3,'12-15','Back flat, no twisting, pull from the elbow.',60)],
     [x('DB Standing Bicep Curl',3,12,'Elbows pinned to hips.',60)]]}]),
   legs:plan('gavin',G_NOTE,[
    {h:'Warm-up',blocks:[warm(40,'20s each side')]},
    {h:'Core and glutes',blocks:[[x('Bodyweight Single Leg Glute Bridge',3,'10/side','Hips tall, no rocking.',0,BW),x('Bicycles',3,50,'Long legs, slow tempo.',0,BW)]]},
    {h:'Main workout',blocks:[
     [x('DB Romanian Deadlift',3,10,'Soft knees, hinge back.',60)],
     [x('DB Squat',3,12,'Chest tall, smooth tempo.',60)],
     [x('DB Alternating Reverse Lunge',3,'10/leg','Step back, stable torso.',45)],
     [x('DB Standing Calf Raise',3,15,'',45)]]}]),
   arms:plan('gavin',G_NOTE,[
    {h:'Warm-up',blocks:[warm(30,'20s each side')]},
    {h:'Core',blocks:[[x('Weighted Toe Reach',3,15,'No swing, control the descent.',0,BW),x('Reverse Crunch',3,15,'Round from abs, slow squeeze.',30,BW)]]},
    {h:'Main workout',blocks:[
     [x('DB Standing Bicep Curl',3,10,'Stretch fully at the bottom, slow curl.',45)],
     [x('DB Alt. Bicep Curl Iso Hold',3,'8-12','Light weight, hold hard at 90 degrees.',60)],
     [x('DB Standing OH Tricep Extension',3,12,'Elbows tight, full lockout.',0)],
     [x('Tricep Dips',3,15,'Pause briefly in the stretch.',0,BW),x('DB Hammer Curl',3,12,'Hard squeeze at the top, elbows fixed.',60)]]}])
  }},
 m2:{label:'Month 2',sub:'Same sets, new moves',
  gym:{
   push:plan('free',M2_NOTE,[
    {h:'Warm-up',blocks:[warm(30,'30s')]},
    {h:'Core',blocks:[[x('Hanging Knee Raise',3,10,'No swing, control the descent.',60,BW)]]},
    {h:'Main workout',blocks:[
     [x('DB Chest Press',3,12,'Full stretch, press evenly.',0),x('Push Up',3,10,'Chest to floor, full range.',60,BW)],
     [x('DB Standing Shoulder Press',3,12,'Slow tempo, stable core, do not arch your back.',60)],
     [x('DB Chest Fly',3,12,'Soft elbows, wide arc.',60)],
     [x('Cable Rope Tricep Pushdown',3,15,'Full lockout, elbows pinned.',60)],
     [x('DB Lateral Raise',3,12,'Tense hard at the top, no swinging.',60)]]}]),
   pull:plan('free',M2_NOTE,[
    {h:'Warm-up',blocks:[warm(30,'20s each side')]},
    {h:'Core',blocks:[[x('DB Pullover-Leg Raise to Toe Reach',3,10,'Lower back pushed down, single leg if needed.',0,BW),x('Cable Kneeling Crunch',3,15,'Round from abs, slow squeeze.',0)]]},
    {h:'Main workout',blocks:[
     [x('Assisted Chin Up',3,6,'Pull from elbows, stiffen body. '+ASSIST,60,AS)],
     [x('Reverse Grip Lat Pulldown',3,12,'3-0-3-0 tempo. Pull from elbows.',60)],
     [x('DB Bent Over Row',3,12,'Pull from elbows, retract shoulders. Watch your back position.',60)],
     [x('Incline DB Reverse Fly',3,15,'Light weight, slowly lower.',0),x('Barbell Bicep Curl',3,10,'Strict, no swinging.',60)]]}]),
   legs:plan('free',M2_NOTE,[
    {h:'Warm-up',blocks:[warm(40,'20s each side')]},
    {h:'Core and glutes',blocks:[[x('Bodyweight Single Leg Glute Bridge',3,'10/side','Hips tall, no rocking.',0,BW),x('Bicycles',3,50,'25 per side. Long legs, slow, controlled.',0,BW)]]},
    {h:'Main workout',blocks:[
     [x('DB Romanian Deadlift',3,10,'2-0-1-0 tempo. Soft knees, hinge back.',60)],
     [x('DB Squat',3,12,'Chest tall, smooth tempo.',60)],
     [x('Seated Leg Extension Machine',3,'10-12','2-0-2-0 tempo. Smooth, slowly down.',60)],
     [x('DB Alternating Reverse Lunge',3,'10/leg','Step back, stable torso.',45)],
     [x('Swiss Ball Leg Curl',3,'10-15','Controlled lift, slow descent.',60,BW)],
     [x('DB Standing Calf Raise',3,15,'Full stretch, hard squeeze.',45)]]}]),
   arms:plan('free',M2_NOTE,[
    {h:'Warm-up',blocks:[warm(30,'20s each side')]},
    {h:'Core',blocks:[[x('Weighted Toe Reach',3,15,'No swing, control the descent.',0,BW),x('Cable Kneeling Crunch',3,15,'Round from abs, slow squeeze.',0)]]},
    {h:'Main workout',blocks:[
     [x('DB Pullover',3,'12-15','Ribs down, long controlled arc.',0),x('DB Hammer Curl',3,'8-12','Hard squeeze at the top, elbows fixed.',60)],
     [x('DB Standing OH Tricep Extension',3,12,'Elbows tight, full lockout.',0),x('Barbell Bicep Curl',3,10,'Stretch fully at the bottom, slow curl.',45)],
     [x('Cable Rope Tricep Pushdown',3,12,'Pause briefly at the bottom.',0),x('Cable Straight Bar Bicep Curl',3,12,'Hard squeeze at the top, elbows fixed.',60)]]},
    {h:'Finish',blocks:[
     [info('Squat Tabata','4 mins. Body weight squats, 20 sec per round x 8 rounds. Note rounds completed.')],
     [info('Finisher: Seven','7 DB (or band) thrusters, 7 KB (or DB) swings, 7 push ups. 7 rounds, fast, good form. Note your time.')]]}])
  },
  home:{
   push:plan('free',M2_NOTE,[
    {h:'Warm-up',blocks:[warm(30,'30s')]},
    {h:'Core',blocks:[[x('DB Pullover-Leg Raise to Toe Reach',3,10,'Brace abs, long legs, back pressed down.',60,BW)]]},
    {h:'Main workout',blocks:[
     [x('DB Floor Press',4,10,'2-0-2-0. Elbows at 45 degrees, pause on the floor.',60,MINE)],
     [x('DB Standing Shoulder Press',3,12,'Slow tempo, stable core, do not arch your back.',60)],
     [x('DB Lateral Raise',3,12,'Tense hard at the top, no swinging.',60)],
     [x('DB Standing OH Tricep Extension',4,15,'Elbows tight, full lockout.',30)]]}]),
   pull:plan('free',M2_NOTE,[
    {h:'Warm-up',blocks:[warm(30,'20s each side')]},
    {h:'Core',blocks:[[x('Reverse Crunch',3,10,'Round from abs, slow squeeze.',60,BW)]]},
    {h:'Main workout',blocks:[
     [x('DB Single Arm Row',3,12,'Back flat, no twisting, pull from the elbow. No rest between arms.',0),x('Seated DB Reverse Fly',3,15,'Light weight, strict control.',60)],
     [x('DB Bent Over Row',3,'12-15','Pull from elbows, retract shoulders. Watch your back position.',60)],
     [x('DB Hammer Curl',3,12,'Elbows pinned to hips.',60)]]}]),
   legs:plan('free',M2_NOTE,[
    {h:'Warm-up',blocks:[warm(40,'20s each side')]},
    {h:'Core and glutes',blocks:[[x('DB Glute Bridge',3,'10/side','Hips tall, no rocking.',0),x('Bicycles',3,50,'Long legs, slow tempo.',0,BW)]]},
    {h:'Main workout',blocks:[
     [x('DB Romanian Deadlift',3,10,'Soft knees, hinge back.',60)],
     [x('DB Squat',3,12,'Chest tall, smooth tempo.',60)],
     [x('DB Step Up',3,'10/leg','Sturdy chair or step. Stable torso.',45,MINE)],
     [x('DB Single Leg Calf Raise',3,15,'Hold a wall for balance.',45,MINE)]]}]),
   arms:plan('free',M2_NOTE,[
    {h:'Warm-up',blocks:[warm(30,'20s each side')]},
    {h:'Core',blocks:[[x('Reverse Crunch',3,15,'Round from abs, slow squeeze.',0,BW),x('Weighted Toe Reach',3,15,'No swing, control the descent.',30,BW)]]},
    {h:'Main workout',blocks:[
     [x('DB Hammer Curl',3,10,'Stretch fully at the bottom, slow curl.',45)],
     [x('DB Alt. Bicep Curl Iso Hold',3,'8-12','Light weight, hold hard at 90 degrees.',60)],
     [x('DB Standing OH Tricep Extension',3,12,'Elbows tight, full lockout.',0)],
     [x('Tricep Dips',3,15,'Pause briefly in the stretch.',0,BW),x('DB Standing Bicep Curl',3,12,'Hard squeeze at the top, elbows fixed.',60)]]},
    {h:'Finish',blocks:[
     [info('Squat Tabata','4 mins. Body weight squats, 20 sec per round x 8 rounds. Note rounds completed.')],
     [info('Finisher: Seven','7 DB thrusters, 7 DB swings, 7 push ups. 7 rounds, fast, good form. Note your time.')]]}])
  }},
 jan:{label:'Jan',sub:'Old screenshots',
  gym:{
   push:plan('gavin','Your January screenshots (old plan). The page cut off below the tricep pushdown, so the lateral raise is my addition.',[
    {h:'Core',blocks:[[x('Hanging Knee Raise',3,10,'',0,BW),x('Cable Kneeling Crunch',3,10,'',0)]]},
    {h:'Main workout',blocks:[
     [x('DB Chest Press',3,12,'',0),x('DB Chest Fly',3,12,'',0)],
     [x('DB Seated Shoulder Press',3,12,'',0)],
     [x('Cable Straight Bar Tricep Pushdown',3,15,'',0)],
     [x('DB Lateral Raise',3,'12-15','Added by me, light and slow.',0,MINE)]]}]),
   arms:plan('gavin','Your January screenshots (old plan).',[
    {h:'Core',blocks:[[x('Cable Kneeling Crunch',3,'10-15','',0)]]},
    {h:'Main workout',blocks:[
     [x('Barbell Bicep Curl',3,'10-12','',0)],
     [x('DB Incline Bicep Curl',3,10,'',0),x('DB Standing OH Tricep Extension',3,15,'',0)],
     [x('Cable Rope Tricep Pushdown',3,15,'',0),x('Cable Straight Bar Bicep Curl',3,15,'',0)],
     [x('DB Hammer Curl',3,'10-12','',0)]]},
    {h:'Finish',blocks:[
     [info('Squat Tabata','4 mins. Body weight squats, 20 sec per round x 8 rounds. Note rounds completed.')],
     [info('Finisher: Seven','7 DB (or band) thrusters, 7 KB (or DB) swings, 7 push ups. 7 rounds, fast, good form. Note your time.')]]}])
  },home:{}}
};
var DAYS=[['push','Push'],['pull','Pull'],['legs','Legs'],['arms','Arms']];
var MODES=[['gym','Gym'],['home','Home']];
function getPlan(p,m,d){var a=PROG[p];return (a&&a[m]&&a[m][d])||null;}
var ITEMS={};
Object.keys(PROG).forEach(function(p){['gym','home'].forEach(function(m){DAYS.forEach(function(d){
  var pl=getPlan(p,m,d);if(!pl)return;
  pl.sections.forEach(function(sec){sec.blocks.forEach(function(b){b.forEach(function(it){if(!ITEMS[it.key])ITEMS[it.key]=it;});});});
});});});
function planItems(pl){var out=[];pl.sections.forEach(function(sec){sec.blocks.forEach(function(b){b.forEach(function(it){out.push(it);});});});return out;}
