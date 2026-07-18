(() => {
'use strict';
const c=document.querySelector('#game'),g=c.getContext('2d'),W=480,H=720,PHONE_RENDER=(window.matchMedia?.('(pointer:coarse)').matches||window.innerWidth<760),RENDER_SCALE=Math.min(PHONE_RENDER?1.5:2,Math.max(1,window.devicePixelRatio||1));c.width=W*RENDER_SCALE;c.height=H*RENDER_SCALE;g.setTransform(RENDER_SCALE,0,0,RENDER_SCALE,0,0);
const $=s=>document.querySelector(s),scoreEl=$('#score'),comboEl=$('#combo'),stageEl=$('#stage-label'),statusEl=$('#status-label'),over=$('#overlay'),title=$('#overlay-title'),msg=$('#overlay-message'),btn=$('#start-button'),bombBtn=$('#bomb-button'),gameSelect=$('#game-select'),hellBtn=$('#hell-mode'),stage6Btn=$('#stage6-retry');
const key=new Set(),R=(a,b)=>Math.random()*(b-a)+a,clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),hit=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)<(a.r+b.r),pad=n=>String(Math.floor(n)).padStart(6,'0');
const STAGES=[
 {name:'さよなら色の丘',sky:['#ffd0dc','#8dbbe9','#4b4779'],accent:'#ff5f89',bullet:'#ffef54',boss:'泣き虫くじら',story:'なくした手紙が、風のなかで呼んでいる。'},
 {name:'雨粒キャンディ通り',sky:['#baf1d8','#5d9dc7','#174b67'],accent:'#24bca4',bullet:'#ff5a36',boss:'忘れもの王子',story:'思い出は甘く、雨あがりだけ少し苦い。'},
 {name:'琥珀時計の砂漠',sky:['#ffd36d','#b55b55','#512d55'],accent:'#ffcb45',bullet:'#36e7ff',boss:'逆さま時計鳥',story:'止まった時間を、ふたりで追い越していく。'},
 {name:'月影サーカス',sky:['#173d59','#17213e','#080d27'],accent:'#f77ac8',bullet:'#ffe45c',boss:'ひとりぼっち団長',story:'拍手の消えたテントで、最後の幕が上がる。'},
 {name:'夜明けを閉じた城',sky:['#3a102d','#120f2c','#050713'],accent:'#ff456c',bullet:'#63f7ff',boss:'永遠夜のノクス',story:'別れを拒む夜へ。朝を連れ戻すために。'},
 {name:'宇宙の墓場',sky:['#050611','#130a26','#010208'],accent:'#62f5ff',bullet:'#ffe45c',boss:'宇宙将軍 GHOSTBEAST',story:'ブラックホールの底で、滅びた星々の残骸が目を覚ます。'}
];
let mode='title',last=0,time=0,stage=0,stageTime=0,score=0,combo=1,comboClock=0,spawnClock=0,bossMade=false,midBossMade=false,banner=0,flash=0,shake=0,pointer=false,activePointer=null,dragX=0,dragY=0,finaleTime=0,finalBoss=null,trueEnding=false,bombDrops=0,lastHitSound=0,lastShieldSound=0,lastTapTime=0,lastTapX=0,lastTapY=0;
const activeTouches=new Set();
let player,shots=[],enemies=[],enemyShots=[],particles=[],notes=[],items=[],traps=[],mineLines=[],callouts=[],beamFx=[],deathBorder=null,bossShield=null,bombFx=null,selectedDifficulty='normal',selectedShip='clione',lastHudState='';
let trapClock=5,skillDodges=0,hellUnlocked=false,stage6Unlocked=false,stage6Checkpoint=null;
const MAX_PARTICLES=260,MAX_NOTES=72,MAX_CALLOUTS=20,bulletLimit=()=>Math.min({easy:240,normal:300,hard:360,hell:440}[selectedDifficulty]||300,PHONE_RENDER?380:480);
try{hellUnlocked=localStorage.getItem('heartbeat-hell')==='1'}catch(_){}
try{stage6Unlocked=localStorage.getItem('heartbeat-stage6')==='1';stage6Checkpoint=JSON.parse(localStorage.getItem('heartbeat-stage6-checkpoint')||'null')}catch(_){}
const DIFFICULTIES={
 easy:{label:'EASY',enemy:.9,bullets:1.05,speed:.88,hp:1.12,bossHp:1.38,fire:.9,drops:{weapon:.9,bomb:.012,heal:.02,star:.025}},
 normal:{label:'NORMAL',enemy:1,bullets:1.3,speed:1,hp:1.3,bossHp:1.85,fire:1,drops:{weapon:.72,bomb:.006,heal:.012,star:.015}},
 hard:{label:'HARD',enemy:1.28,bullets:1.55,speed:1.18,hp:1.55,bossHp:2.4,fire:1.22,drops:{weapon:.5,bomb:.0025,heal:.005,star:.007}},
 hell:{label:'HELL',enemy:1.6,bullets:2.15,speed:1.33,hp:2,bossHp:3.1,fire:1.55,drops:{weapon:.35,bomb:.001,heal:.002,star:.0035}}
};
const SHIPS={clione:{name:'ルミ',speed:1,damage:1,rate:1,bomb:'クイック・ハート'},ribbon:{name:'メルティ',speed:1.52,damage:.82,rate:.76,bomb:'くまちゃんパレード'},hammer:{name:'ガンガ',speed:.56,damage:1.42,rate:1.18,bomb:'コズミック・ナパーム'}};
const diff=()=>DIFFICULTIES[selectedDifficulty],ship=()=>SHIPS[selectedShip];
const WEAPONS={shot:{name:'TWIN SHOT',color:'#fff3a6'},laser:{name:'HEART LASER',color:'#6ff8ff'},missile:{name:'CHASE MISSILE',color:'#ff8bab'}};
const stars=Array.from({length:55},()=>({x:R(0,W),y:R(0,H),s:R(1,3),v:R(15,55),a:R(.2,.75)}));
const spaceDebris=Array.from({length:26},(_,i)=>({x:R(0,W),y:R(0,H),s:R(5,18),v:R(12,38),a:R(0,7),spin:R(-1.4,1.4),kind:i%4}));
let audio=null,musicTimer=null,beat=0;
function tone(freq,d=.12,type='sine',vol=.035){
 if(!audio)return;const o=audio.createOscillator(),q=audio.createGain();o.type=type;o.frequency.value=freq;q.gain.setValueAtTime(vol,audio.currentTime);q.gain.exponentialRampToValueAtTime(.001,audio.currentTime+d);o.connect(q).connect(audio.destination);o.start();o.stop(audio.currentTime+d);
}
function noise(d=.12,vol=.025,cutoff=900){
 if(!audio)return;const len=Math.max(1,Math.floor(audio.sampleRate*d)),buf=audio.createBuffer(1,len,audio.sampleRate),data=buf.getChannelData(0);for(let i=0;i<len;i++)data[i]=(Math.random()*2-1)*(1-i/len);const src=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();src.buffer=buf;filter.type='lowpass';filter.frequency.value=cutoff;gain.gain.value=vol;src.connect(filter).connect(gain).connect(audio.destination);src.start();
}
function sfx(kind){
 if(!audio)return;
 if(kind==='shot')tone(920,.025,'square',.0045);
 else if(kind==='laser'){tone(1280,.055,'sawtooth',.005);tone(640,.06,'triangle',.004)}
 else if(kind==='missile'){tone(230,.08,'sawtooth',.009);noise(.045,.006,500)}
 else if(kind==='hit'){if(time-lastHitSound>.055){tone(420,.035,'square',.006);lastHitSound=time}}
 else if(kind==='destroy'){tone(620,.11,'triangle',.025);tone(260,.16,'square',.012);noise(.1,.018,1200)}
 else if(kind==='bomb'){noise(.75,.085,650);[110,165,220,330].forEach((f,i)=>setTimeout(()=>tone(f,.65,'sawtooth',.035),i*55));tone(55,1.1,'square',.055)}
}
function musicStart(){
 audio ||= new (window.AudioContext||window.webkitAudioContext)();audio.resume();clearInterval(musicTimer);
 const melody=[523,659,784,659,587,698,880,698,494,587,740,587,440,523,659,392];
 const graveMelody=[147,220,294,233,131,196,262,175,110,165,247,185];
 const bossMelodies=[[220,262,277,330,220,349,330,277],[196,247,294,262,185,233,277,330],[175,208,247,294,165,196,233,277],[147,175,208,247,139,165,196,233],[110,131,156,185,104,123,147,175],[82,98,117,139,78,93,110,147]];
 musicTimer=setInterval(()=>{if(mode!=='play')return;
  if(bossMade){const seq=bossMelodies[stage],f=seq[beat++%seq.length];tone(f,.14,beat%2?'sawtooth':'square',.029);tone(f/2,.22,'square',.021);if(beat%2===0)tone(stage>2?58:70,.07,'sawtooth',.038);if(beat%4===3)noise(.035,.008,300)}
  else if(stage===5){const f=graveMelody[beat++%graveMelody.length];tone(f,.32,beat%2?'triangle':'sawtooth',.022);tone(f/2,.5,'sine',.018);if(beat%3===0)noise(.08,.006,420)}
  else{const f=melody[beat++%melody.length];tone(f,.22,'triangle',.026);if(beat%4===1)tone(f/2,.3,'sine',.018)}
 },190);
}
function reset(){
 time=stageTime=score=0;stage=0;combo=1;comboClock=0;spawnClock=.7;trapClock=5;skillDodges=0;bossMade=false;midBossMade=false;bombDrops=0;finaleTime=0;finalBoss=null;trueEnding=false;bossShield=null;bombFx=null;deathBorder=null;beamFx=[];shots=[];enemies=[];enemyShots=[];particles=[];notes=[];items=[];traps=[];mineLines=[];callouts=[];lastHudState='';
 player={x:W/2,y:H-90,r:3.5,hp:5,bombs:3,cd:0,laserCd:0,missileCd:0,inv:1,power:0,trail:[],drones:[],droneCd:0,funnelGauge:1,levels:{shot:1,laser:0,missile:0}};
 hud();banner=2.3;
}
function launchPlay(){mode='play';gameSelect.classList.add('locked');over.classList.add('hidden');musicStart()}
function start(){reset();launchPlay()}
function saveStage6Checkpoint(){
 stage6Unlocked=true;stage6Checkpoint={ship:selectedShip,hp:player.hp,bombs:Math.min(5,player.bombs+1),levels:{...player.levels}};stage6Btn.hidden=false;try{localStorage.setItem('heartbeat-stage6','1');localStorage.setItem('heartbeat-stage6-checkpoint',JSON.stringify(stage6Checkpoint))}catch(_){}
}
function startStage6(){
 selectedDifficulty='hell';if(stage6Checkpoint?.ship&&SHIPS[stage6Checkpoint.ship])selectedShip=stage6Checkpoint.ship;document.querySelectorAll('[data-difficulty]').forEach(x=>x.classList.toggle('active',x.dataset.difficulty==='hell'));document.querySelectorAll('[data-ship]').forEach(x=>x.classList.toggle('active',x.dataset.ship===selectedShip));reset();stage=5;spawnClock=.5;trapClock=4;player.hp=Math.max(3,Math.min(5,stage6Checkpoint?.hp||3));player.bombs=Math.max(2,Math.min(5,stage6Checkpoint?.bombs||2));for(const k of ['shot','laser','missile'])player.levels[k]=clamp(stage6Checkpoint?.levels?.[k]??(k==='shot'?3:2),k==='shot'?1:0,3);banner=3;hud();launchPlay();
}
function hud(){const state=[Math.floor(score),combo,stage,selectedDifficulty,selectedShip,player.hp,player.bombs,player.levels.shot,player.levels.laser,player.levels.missile].join('|');if(state===lastHudState)return;lastHudState=state;scoreEl.textContent=pad(score);comboEl.textContent='× '+String(combo).padStart(3,'0');stageEl.textContent=diff().label+'・'+ship().name+'　STAGE '+(stage+1)+'　'+STAGES[stage].name;statusEl.textContent='♥'.repeat(player.hp)+'♡'.repeat(5-player.hp)+'　BOMB '+'●'.repeat(player.bombs)+'○'.repeat(5-player.bombs)}
function gameOver(clear=false){
 mode='over';clearInterval(musicTimer);title.innerHTML=clear?'THE END<br>また会う日まで':'DREAM<br>OVER';msg.textContent=clear?'小さな星は、朝を見つけました。':'スコア '+pad(score);btn.textContent=clear?'もう一度':'リトライ';gameSelect.classList.remove('locked');over.classList.remove('hidden');
}
function unlockHell(){
 if(hellUnlocked)return;hellUnlocked=true;hellBtn.hidden=false;hellBtn.parentElement.classList.add('hell-unlocked');try{localStorage.setItem('heartbeat-hell','1')}catch(_){}callouts.push({x:W/2,y:92,text:'HELL MODE UNLOCKED',life:5,color:'#ff527f'});
}
function beginFinale(e,isTrue=false){
 mode='finale';finaleTime=0;trueEnding=isTrue;finalBoss={x:e.x,y:e.y};enemyShots=[];beamFx=[];mineLines=[];deathBorder=null;bossShield=null;shots=[];items=[];enemies=[];clearInterval(musicTimer);shake=isTrue?34:24;flash=1;
 for(let i=0;i<90;i++)burst(e.x+R(-55,55),e.y+R(-35,35),i%2?'#63f7ff':'#ff456c',2);
 tone(110,1.8,'sawtooth',.055);
}
function showEnding(){
 mode='ending';title.innerHTML=trueEnding?'HEARTFUL<br>PARADE':'MORNING<br>FOUND';msg.innerHTML=trueEnding?'宇宙将軍は恒星の光へほどけ、宇宙はHEARTFUL PARADEを取り戻した。<br>奇跡の星々が満開の天の川となり、あなたの軌跡を永遠に照らしている。<br><br>TRUE END　SCORE '+pad(score):'夜は消えず、朝の居場所になった。<br>ノクスは最後に笑い、小さな星へ姿を変えた。<br><br>「さよならは、また会うための光。」<br><br>SCORE '+pad(score);btn.textContent=trueEnding?'銀河をもう一度':'物語をもう一度';gameSelect.classList.remove('locked');over.classList.remove('hidden');
}
function resolveBossDefeat(e){
 if(!e||e.resolved)return;e.resolved=true;e.dead=true;for(const part of enemies)if(part.type==='bossPart'&&part.parent===e)part.dead=true;dropItem(e);score+=e.worth*combo;shake=stage===5?38:24;burst(e.x,e.y,STAGES[stage].accent,stage===5?180:90);tone(150,.8,'triangle',.04);
 const lastStage=selectedDifficulty==='hell'?5:4;
 if(stage<lastStage){if(stage===4&&selectedDifficulty==='hell')saveStage6Checkpoint();stage++;stageTime=0;bossMade=false;midBossMade=false;bombDrops=0;beat=0;spawnClock=stage===5?.5:2;trapClock=stage===5?4:5;bossShield=null;deathBorder=null;beamFx=[];traps=[];mineLines=[];player.bombs=Math.min(5,player.bombs+1);enemyShots=[];shots=[];banner=3;hud()}
 else{if(selectedDifficulty==='hard')unlockHell();hud();beginFinale(e,stage===5&&selectedDifficulty==='hell')}
}
function burst(x,y,color,n=12){n=Math.min(n,MAX_PARTICLES);const overflow=particles.length+n-MAX_PARTICLES;if(overflow>0)particles.splice(0,overflow);while(n--){const a=R(0,7),v=R(40,220);particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,l:R(.3,.9),s:R(2,6),color})}}
function dropItem(e){
 const drops=diff().drops,offset=()=>R(-18,18);
 if(Math.random()<drops.star)items.push({x:e.x+offset(),y:e.y-12,r:14,kind:'star',phase:0,vy:62});
 if(e.type!=='boss'&&Math.random()<drops.heal)items.push({x:e.x+offset(),y:e.y,r:14,kind:'heal',phase:0,vy:64});
 if(e.type!=='boss'&&Math.random()<drops.bomb)items.push({x:e.x+offset(),y:e.y+8,r:14,kind:'bomb',phase:0,vy:60});
 if(e.type==='boss'||Math.random()<Math.min(.85,(e.type==='tough'?.6:.16)*drops.weapon)){const types=['shot','laser','missile'],kind=types[Math.floor(R(0,types.length))];items.push({x:e.x,y:e.y,r:13,kind,phase:0,vy:75})}
}
function dropMidBossRewards(e){
 items.push({x:e.x-18,y:e.y,r:14,kind:'heal',phase:0,vy:62});
 const quota=stage<3?1:2;while(bombDrops<quota){items.push({x:e.x+18+(bombDrops*18),y:e.y-8*bombDrops,r:14,kind:'bomb',phase:bombDrops,vy:58});bombDrops++}
}
function fireWeapon(){
 const lv=player.levels,power=(player.power>0?1.4:1)*ship().damage,count=1+lv.shot;
 for(let i=0;i<count;i++){const spread=selectedShip==='ribbon'?72:selectedShip==='hammer'?35:55,vx=(i-(count-1)/2)*spread;shots.push({x:player.x+(i-(count-1)/2)*7,y:player.y-20,r:selectedShip==='hammer'?7:4,vx,vy:selectedShip==='ribbon'?-620:-560,type:'shot',ship:selectedShip,damage:power*(selectedShip==='hammer'?1.22:1)})}
 player.cd=.13*ship().rate;sfx('shot');
 if(lv.laser>0&&player.laserCd<=0){const size=selectedShip==='ribbon'?.78:selectedShip==='hammer'?1.35:1,width=[0,6,13,22][lv.laser]*size;shots.push({x:player.x,y:player.y-30,r:width,vx:0,vy:-690,type:'laser',ship:selectedShip,width,damage:(.5+lv.laser*.22)*power,pierce:2+lv.laser});player.laserCd=.19*ship().rate;sfx('laser')}
 if(lv.missile>0&&player.missileCd<=0){for(let i=0;i<lv.missile;i++)shots.push({x:player.x+(i-(lv.missile-1)/2)*14,y:player.y-8,r:selectedShip==='ribbon'?5:selectedShip==='hammer'?10:7,vx:(i-(lv.missile-1)/2)*90,vy:selectedShip==='ribbon'?-285:-240,type:'missile',ship:selectedShip,damage:2.5*power*(selectedShip==='hammer'?1.18:1),life:3});player.missileCd=.72*ship().rate;sfx('missile')}
}
function addCombo(amount=1){
 combo=Math.min(999,combo+amount);player.funnelGauge+=amount;comboClock=3;if(player.funnelGauge>=999&&!player.drones.length)activateDrones();
}
function activateDrones(){
 if(player.drones.length||player.funnelGauge<999)return;player.funnelGauge-=999;for(let i=0;i<3;i++)player.drones.push({x:player.x,y:player.y,r:7,hp:3,inv:8,phase:i*Math.PI*2/3});callouts.push({x:W/2,y:105,text:'999 CHARGE — SHADOW PARADE!',life:2.4,color:'#fff36b'});tone(1318,.3,'triangle',.045);tone(1760,.5,'triangle',.035);
}
function updateDrones(dt){
 player.droneCd-=dt;for(const d of player.drones){d.inv=Math.max(0,d.inv-dt);d.phase+=dt*(1.35+Math.sin(d.phase)*.18);let tx=player.x+Math.cos(d.phase)*58,ty=player.y-18+Math.sin(d.phase)*34,ax=0,ay=0;for(const b of enemyShots){const dx=d.x-b.x,dy=d.y-b.y,dist=Math.hypot(dx,dy);if(dist<105&&dist>1){const risk=(105-dist)/105;ax+=dx/dist*risk;ay+=dy/dist*risk}}const avoid=Math.hypot(ax,ay);if(avoid){tx+=ax/avoid*42;ty+=ay/avoid*34}d.x=clamp(d.x+(tx-d.x)*6.5*dt,16,W-16);d.y=clamp(d.y+(ty-d.y)*6.5*dt,32,H-30)}
 if(player.drones.length&&player.droneCd<=0){const targets=enemies.filter(e=>!e.dead);for(const d of player.drones){const t=targets.reduce((best,e)=>!best||Math.hypot(e.x-d.x,e.y-d.y)<Math.hypot(best.x-d.x,best.y-d.y)?e:best,null);if(t){const a=Math.atan2(t.y-d.y,t.x-d.x);shots.push({x:d.x,y:d.y,r:4,vx:Math.cos(a)*520,vy:Math.sin(a)*520,type:'shot',ship:selectedShip,drone:true,damage:.7*ship().damage})}}player.droneCd=.28}
 if(!player.drones.length&&player.funnelGauge>=999)activateDrones();
}
function addEnemy(type=Math.random()<(0.2+stage*.08)?'tough':'small'){
 if(stage===5)type=Math.random()<.58?'spaceRay':'scrap';
 if(type==='spaceRay'||type==='scrap'){const scrap=type==='scrap',hp=(scrap?24:11)*diff().hp;enemies.push({x:R(50,W-50),y:-42,r:scrap?27:24,hp,max:hp,v:scrap?62:88,phase:R(0,7),shoot:R(.65,1.15),type,hellMove:Math.floor(R(0,3)),worth:scrap?1150:760});return}
 const tough=type==='tough',scale=stage<2?stage:1.4+(stage-2)*.3,hp=tough?10+scale*7:2+scale*2;
 const max=hp*diff().hp;enemies.push({x:R(45,W-45),y:-35,r:tough?24:15,hp:max,max,v:(tough?55:85)*(.82+stage*.18),phase:R(0,7),shoot:R(1.1,2)/(1+stage*.15),type,hellMove:Math.floor(R(0,3)),worth:tough?800:180});
}
function addMidBoss(){
 const hp=(90+stage*55)*diff().hp;
 midBossMade=true;
 enemies.push({x:W/2,y:-50,r:stage===5?48:38,hp,max:hp,v:58,phase:0,shoot:.8,type:'midboss',grave:stage===5,worth:2500+stage*700});
 banner=1.8;
 tone(196,.35,'sawtooth',.03);
}
function addBoss(){
 const hp=[520,760,900,1100,1750,2200][stage]*diff().bossHp,r=[66,72,78,86,112,176][stage];bossMade=true;beat=0;enemyShots=[];beamFx=[];deathBorder=null;
 if(stage===5){const main={x:W/2,y:-r-20,r:56,visualR:r,hp,max:hp,v:48,phase:0,shoot:.8,shieldCd:5.2,type:'boss',bossId:5,name:'GHOSTBEAST',phase2:false,attackCycle:0,worth:52000},sideHp=460*diff().bossHp;enemies.push(main);for(const side of [-1,1])enemies.push({x:W/2+side*116,y:-r,r:39,hp:sideHp,max:sideHp,v:0,phase:side<0?0:Math.PI,shoot:.7,type:'bossPart',side,parent:main,worth:8500});callouts.push({x:W/2,y:105,text:'TRUE LAST BOSS — GHOSTBEAST',life:4,color:'#ffef78'})}
 else enemies.push({x:W/2,y:-r-20,r,hp,max:hp,v:45,phase:0,shoot:1,shieldCd:5.6,type:'boss',bossId:stage,worth:8000+stage*5000});banner=3;tone(stage===5?72:130,stage===5?1.3:.8,'sawtooth',stage===5?.06:.04);
}
function hazard(e,q,speed,kind='orb',extra={}){
 speed*=diff().speed;enemyShots.push({x:e.x,y:e.y,r:kind==='bomb'||kind==='bubble'?11:kind==='tentacle'?8:kind==='yoyo'?9:6,vx:Math.cos(q)*speed,vy:Math.sin(q)*speed,color:STAGES[stage].bullet,shape:stage,kind,spin:extra.spin||0,trail:[],...extra});
}
function addThunderbolt(e){
 const x2=clamp(player.x+R(-42,42),24,W-24);beamFx.push({x1:e.x,y1:e.y+24,x2,y2:H+20,width:13,telegraph:.72,life:1.32,hit:false,kind:'thunder'});callouts.push({x:x2,y:H-96,text:'THUNDERBOLT',life:1.1,color:'#75f9ff'});
}
function addDeathBorder(){
 if(deathBorder)return;deathBorder={warning:.85,life:3.2,height:42,hit:false};callouts.push({x:W/2,y:H/2,text:'DEATH BEAM — CENTER!',life:1.4,color:'#ff7652'});
}
function updateBossHazards(dt){
 for(const b of beamFx){b.telegraph-=dt;b.life-=dt;if(b.telegraph<=0&&!b.hit){const vx=b.x2-b.x1,vy=b.y2-b.y1,len2=vx*vx+vy*vy,t=clamp(((player.x-b.x1)*vx+(player.y-b.y1)*vy)/len2,0,1),px=b.x1+vx*t,py=b.y1+vy*t;if(Math.hypot(player.x-px,player.y-py)<b.width+player.r){b.hit=true;damage()}}}beamFx=beamFx.filter(b=>b.life>0);
 if(deathBorder){deathBorder.warning-=dt;deathBorder.life-=dt;if(deathBorder.warning<=0&&!deathBorder.hit&&(player.y<deathBorder.height+player.r||player.y>H-deathBorder.height-player.r)){deathBorder.hit=true;damage()}if(deathBorder.life<=0)deathBorder=null}
}
function transformGhostbeast(e){
 if(e.phase2)return;e.phase2=true;e.name='DEATHBEAST';e.visualR=92;e.r=48;e.shieldCd=2.8;e.attackCycle=0;bossShield=null;enemyShots=[];beamFx=[];deathBorder=null;for(const p of enemies)if(p.type==='bossPart'&&p.parent===e){p.dead=true;burst(p.x,p.y,'#ff8a42',55)}flash=1;shake=34;burst(e.x,e.y,'#ff456c',150);callouts.push({x:W/2,y:126,text:'CORE BREAK — DEATHBEAST',life:4,color:'#ffef63'});noise(.8,.08,520);tone(73,1.2,'sawtooth',.065);
}
function addMineBarrier(){
 const gapWidth=selectedDifficulty==='hell'?40:selectedDifficulty==='hard'?48:selectedDifficulty==='normal'?56:68,gap=R(gapWidth+24,W-gapWidth-24),group=time,created=[];for(let x=24;x<W-20;x+=43){if(Math.abs(x-gap)<gapWidth)continue;const mine={x,y:-24-Math.abs(x-gap)*.035,r:13,vy:(48+stage*7)*diff().speed,phase:R(0,7),group,kind:'mine',breakable:false};traps.push(mine);created.push(mine)}
 const innerSafe=gapWidth+58,eligible=created.filter(t=>Math.abs(t.x-gap)>=innerSafe&&t.x>38&&t.x<W-38),pool=eligible.length?eligible:created.slice().sort((a,b)=>Math.abs(b.x-gap)-Math.abs(a.x-gap)).slice(0,2),breakable=pool[Math.floor(R(0,pool.length))];if(breakable){breakable.breakable=true;breakable.hp=breakable.maxHp={easy:18,normal:25,hard:34,hell:44}[selectedDifficulty]}
 if(selectedDifficulty==='hell'){for(let i=0;i<2;i++){const x=i?W-56:56;if(Math.abs(x-gap)>70)traps.push({x,y:-125-i*110,r:18,vy:34+stage*5,phase:R(0,7),group,kind:'vortex'})}}mineLines.push({gap,width:gapWidth+10,tick:.24,waves:0,maxWaves:{easy:3,normal:4,hard:5,hell:6}[selectedDifficulty],group});if(mineLines.length>3)mineLines.shift();callouts.push({x:gap,y:76,text:selectedDifficulty==='hell'?'⚠ HELL GATE':'⚠ MINE ROUTE',life:1.8,color:selectedDifficulty==='hell'?'#d778aa':'#d4b46c'});if(breakable)callouts.push({x:breakable.x,y:104,text:'BREAKABLE MINE',life:1.45,color:'#8dcfaf'});
}
function startBossShield(e){
 if(bossShield)return;const duration=stage===5&&e.phase2?1.8:{easy:2,normal:2.25,hard:2.5,hell:2.75}[selectedDifficulty];bossShield={boss:e,time:duration,max:duration};callouts.push({x:W/2,y:96,text:'AT FIELD — GUARD',life:duration,color:'#e5c778'});tone(96,.35,'sawtooth',.026);tone(192,.45,'square',.016);
}
function updateBossShield(dt){
 if(!bossShield)return;bossShield.time-=dt;if(bossShield.boss?.dead||bossShield.time<=0){if(!bossShield.boss?.dead)callouts.push({x:W/2,y:102,text:'AT FIELD DOWN',life:1.1,color:'#8fdde0'});bossShield=null}
}
function bossShielded(e){return !!bossShield&&(e===bossShield.boss||(e.type==='bossPart'&&e.parent===bossShield.boss))}
function updateMineLines(dt){
 const interval={easy:.96,normal:.8,hard:.68,hell:.58}[selectedDifficulty],step={easy:60,normal:56,hard:52,hell:48}[selectedDifficulty],speed=(148+stage*7)*Math.min(1.2,diff().speed),cap=bulletLimit();for(const m of mineLines){m.tick-=dt;if(m.tick>0||m.waves>=m.maxWaves)continue;m.tick=interval;m.waves++;const offset=m.waves%2*step*.5;for(let x=-10+offset;x<W+10&&enemyShots.length<cap;x+=step){if(Math.abs(x-m.gap)<m.width)continue;enemyShots.push({x,y:-9,r:4.8,vx:Math.sin((x+m.waves*17)*.04)*6,vy:speed,color:'#e4b96f',kind:'mineLine',trail:[],noTrail:true})}}mineLines=mineLines.filter(m=>m.waves<m.maxWaves);
}
function updateTraps(dt){
 trapClock-=dt;if(trapClock<=0){addMineBarrier();const base=selectedDifficulty==='hell'?(bossMade?5.8:R(4.8,6.4)):bossMade?10.5:R(7.5,10),travel=(H+60)/((48+stage*7)*diff().speed);trapClock=Math.min(base,travel*.68)}for(const t of traps){t.y+=t.vy*dt;t.phase+=dt*(t.kind==='vortex'?4.4:2.4);if(t.kind==='vortex'){t.x=clamp(t.x+Math.sin(t.phase)*16*dt,28,W-28);const dx=t.x-player.x,dy=t.y-player.y,d=Math.hypot(dx,dy);if(d<155&&d>20){const pull=(155-d)/155*72;player.x=clamp(player.x+dx/d*pull*dt,18,W-18);player.y=clamp(player.y+dy/d*pull*dt,28,H-22)}}if(!t.dead&&hit(player,t)){t.dead=true;callouts.push({x:player.x,y:player.y-42,text:t.kind==='vortex'?'GRAVITY LOCK!':'CAPTURED!',life:1.5,color:'#ff6b62'});burst(t.x,t.y,t.kind==='vortex'?'#ff5bd1':'#ff765c',30);damage()}}traps=traps.filter(t=>!t.dead&&t.y<H+35);updateMineLines(dt);
}
function enemyFire(e){
 const target=player.drones.length&&Math.random()<.62?player.drones[Math.floor(R(0,player.drones.length))]:player,aimed=Math.atan2(target.y-e.y,target.x-e.x);
 if(e.type==='spaceRay'){const n=12;for(let i=0;i<n;i++)hazard(e,e.phase*.7+i*Math.PI*2/n,142,'electron',{r:5,spin:(i%2?1:-1)*.06});for(let i=-1;i<=1;i++)hazard(e,aimed+i*.18,195,'orb');return}
 if(e.type==='scrap'){for(let i=-3;i<=3;i++)hazard(e,aimed+i*.15,R(155,225),i%3===0?'bomb':'orb',{fuse:R(2.2,3.2),spin:i*.06});for(let i=0;i<8;i++)hazard(e,e.phase+i*Math.PI/4,118,'electron',{spin:i%2?.12:-.12});return}
 if(e.type==='bossPart'){const n=24;for(let i=0;i<n;i++)hazard(e,e.phase*(e.side<0?1.7:-1.7)+i*Math.PI*2/n,178+(i%3)*22,i%5===0?'electron':'orb',{r:i%4===0?8:5,spin:(i%2?1:-1)*.11});for(let i=-5;i<=5;i++)hazard(e,aimed+i*.085,238+Math.abs(i)*8,'orb',{r:i%3===0?9:5});return}
 if(e.type==='midboss'){
  if(e.grave){for(let i=0;i<18;i++)hazard(e,e.phase+i*Math.PI/9,155+(i%2)*45,i%3===0?'electron':'shuriken',{spin:i%2?.18:-.18});for(let i=-3;i<=3;i++)hazard(e,aimed+i*.13,220,'orb',{r:i%2?5:9});return}
  const count=Math.max(3,Math.round((5+stage)*diff().bullets));
  for(let i=0;i<count;i++)hazard(e,aimed+(i-(count-1)/2)*.2,145+stage*12,stage%2?'shuriken':'orb',{spin:(i%2?1:-1)*.08});
  if(selectedDifficulty==='hell')for(let i=0;i<9;i++)hazard(e,e.phase+i*Math.PI*2/9,122+stage*8,'shuriken',{spin:(i%2?1:-1)*.18});
  return;
 }
 if(e.type==='boss'){
  if(stage===5){e.attackCycle=(e.attackCycle||0)+1;if(!e.phase2){const n=18;for(let i=0;i<n;i++)hazard(e,e.phase*1.35+i*Math.PI*2/n,148+(i%2)*34,i%4===0?'electron':'orb',{r:i%5===0?9:5,spin:i%2?.1:-.1});for(let i=-3;i<=3;i++)hazard(e,aimed+i*.12,205,'electron',{r:6});if(e.attackCycle%3===0)addThunderbolt(e)}else{const n=46;for(let i=0;i<n;i++){const q=aimed+R(-1.65,1.65)+(i%7)*.17,speed=R(95,285)*diff().speed,r=R(3,13);enemyShots.push({x:e.x+R(-28,28),y:e.y+R(-18,30),r,vx:Math.cos(q)*speed,vy:Math.sin(q)*speed,color:i%4===0?'#ff5b39':i%3===0?'#ffe45c':'#b96cff',shape:5,kind:'doom',spin:R(-.22,.22),trail:[]})}if(e.attackCycle%4===0)addDeathBorder();if(e.attackCycle%7===0)addThunderbolt(e)}return}
  const barrage=Math.max(3,Math.round([5,7,7,8,10][stage]*diff().bullets)),bSpeed=[185,197,190,198,205][stage];
  for(let i=0;i<barrage;i++)hazard(e,aimed+(i-(barrage-1)/2)*.16,bSpeed,'orb',{spin:stage>2?(i%2?1:-1)*.09:0});
  if(stage===0){for(let i=-2;i<=2;i++)hazard(e,aimed+i*.23,175,'yoyo')}
  else if(stage===1){const n=Math.round(12*diff().bullets);for(let i=0;i<n;i++)hazard(e,e.phase+i*Math.PI*2/n,220,'shuriken',{spin:(i%2?1:-1)*.12})}
  else if(stage===2){for(let i=-1;i<=1;i++)hazard(e,Math.PI/2+i*.2,62,'bubble',{fuse:4.8+i*.12,safeX:player.x})}
  else if(stage===3){for(let i=-2;i<=2;i++)hazard(e,aimed+i*.21,215,'tentacle',{spin:(i%2?1:-1)*.17})}
  else{
   for(let i=0;i<18;i++)hazard(e,e.phase*2+i*Math.PI*2/18,205,i%5===0?'shuriken':'orb',{spin:(i%2?1:-1)*.12});
   for(let i=-2;i<=2;i++)hazard(e,aimed+i*.19,205,i%2?'tentacle':'yoyo',{spin:i*.05});
   if(Math.floor(e.phase*2)%3===0)for(let i=-1;i<=1;i++)hazard(e,Math.PI/2+i*.22,58,'bubble',{fuse:5.1,safeX:player.x});
  }
  if(selectedDifficulty==='hell'){const n=16+stage*2,turn=e.phase*(stage%2?1.75:-1.55);for(let i=0;i<n;i++)hazard(e,turn+i*Math.PI*2/n,138+stage*9,i%6===0?'shuriken':'orb',{spin:(i%2?1:-1)*.16});if(stage>=2)for(let i=-2;i<=2;i++)hazard(e,aimed+i*.115,242,'tentacle',{spin:i*.08})}
  return;
 }
 let count=e.type==='boss'?4+stage*2:(e.type==='tough'?1+stage:1),spread=e.type==='boss'?.34:.18,base=aimed,spin=0;
 const speed=(e.type==='boss'?130:100)*(1+stage*.18);
 if(stage===1){base=aimed+Math.sin(e.phase)*.28;spread=.24}
 if(stage===2&&e.type!=='small'){count=e.type==='boss'?14:7;spread=Math.PI*2/count;base=e.phase}
 if(stage===3){spread=.3;spin=(e.phase%2>.9?1:-1)*.65}
 if(stage===4){base=e.type==='boss'?e.phase*2.2:aimed;spread=e.type==='boss'?Math.PI*2/count:.25;spin=e.type==='boss'?.28:0}
 for(let i=0;i<count;i++){const q=base+(stage>=2&&e.type!=='small'?i:(i-(count-1)/2))*spread;enemyShots.push({x:e.x,y:e.y,r:e.type==='boss'?6:4.5,vx:Math.cos(q)*speed*diff().speed,vy:Math.sin(q)*speed*diff().speed,color:STAGES[stage].bullet,shape:stage,spin:spin*(i%2?1:-1),trail:[]})}
 if(selectedDifficulty==='hell'){for(let i=-1;i<=1;i++)hazard(e,aimed+i*.31,128+stage*13,'orb',{spin:(i||1)*.22});if(e.type==='tough'&&stage>=2)for(let i=0;i<6;i++)hazard(e,e.phase+i*Math.PI/3,108+stage*8,'shuriken',{spin:i%2?.22:-.22})}
}
function bombDamage(bossDamage,otherDamage,color='#fff4a8'){
 enemyShots=[];beamFx=[];let defeatedBoss=null;for(const e of enemies){if(bossShielded(e)){burst(e.x,e.y,'#e1c57d',10);continue}e.hp-=e.type==='boss'?bossDamage:otherDamage;burst(e.x,e.y,color,18);if(e.type==='boss'&&e.hp<=0)defeatedBoss=e;else if(e.type==='boss'&&stage===5&&!e.phase2&&e.hp<=e.max/3)transformGhostbeast(e);else if(e.hp<=0){e.dead=true;if(e.type==='midboss')dropMidBossRewards(e);if(e.type==='bossPart')callouts.push({x:e.x,y:e.y,text:'SIDE CORE BREAK',life:1.8,color:'#ffef78'})}}if(defeatedBoss)resolveBossDefeat(defeatedBoss);enemies=enemies.filter(e=>!e.dead);
}
function bomb(){
 if(mode!=='play'||player.bombs<1||bombFx)return;player.bombs--;flash=1;shake=20;sfx('bomb');score+=1000;hud();
 const voices=selectedShip==='clione'?['いっけぇ！','おりゃー！','ハート、全開！']:selectedShip==='ribbon'?['くまちゃん、お願い！','ラブラブ・ゴー！','届け、メルティハート！']:['くらえぇ！','吹き飛べー！','ナパーム、点火！'];callouts.push({x:player.x,y:player.y-52,text:voices[Math.floor(R(0,voices.length))],life:1.5,color:selectedShip==='hammer'?'#ffb14a':selectedShip==='ribbon'?'#ff9bd2':'#fff'});
 if(selectedShip==='clione'){player.inv=2.5;bombDamage(78,110);for(let i=0;i<32;i++)notes.push({x:player.x,y:player.y,a:i/32*Math.PI*2,r:8,kind:'ring'})}
 else if(selectedShip==='ribbon'){player.inv=5;bombFx={type:'bear',time:4.8,tick:0};for(let i=0;i<5;i++)notes.push({x:player.x+R(-35,35),y:player.y+R(-20,20),a:R(0,7),r:R(4,16),kind:'bear'})}
 else{player.inv=2.7;bombFx={type:'napalm',time:2.15,delay:.62,tick:0};notes.push({x:player.x,y:player.y,a:0,r:10,kind:'napalm'})}
}
function updateBombFx(dt){
 if(!bombFx)return;bombFx.time-=dt;bombFx.tick-=dt;
 if(bombFx.type==='bear'&&bombFx.tick<=0){bombFx.tick=.34;bombDamage(13,28,'#ff8fca');for(let i=0;i<3;i++)notes.push({x:R(40,W-40),y:R(120,H-120),a:R(0,7),r:8,kind:'bear'})}
 if(bombFx.type==='napalm'){bombFx.delay-=dt;if(bombFx.delay<=0&&!bombFx.boom){bombFx.boom=true;flash=1;shake=30;bombDamage(180,260,'#ff7a32');noise(.9,.1,520)}if(bombFx.boom&&bombFx.tick<=0){bombFx.tick=.16;enemyShots=[];for(let i=0;i<4;i++)burst(R(30,W-30),R(80,H-80),'#ff9b3d',18)}}
 if(bombFx.time<=0)bombFx=null;
}
function togglePause(){
 if(mode==='play'){mode='paused';pointer=false;activePointer=null;title.innerHTML='PAUSE';msg.innerHTML='2本指でゲームに戻る<br><small>'+diff().label+'・'+ship().name+'</small>';btn.textContent='再開';gameSelect.classList.add('locked');over.classList.remove('hidden')}
 else if(mode==='paused'){mode='play';last=performance.now();over.classList.add('hidden')}
}
function damage(){
 if(player.inv>0||player.power>0)return;player.hp--;player.inv=2;player.drones=[];player.levels.shot=Math.max(1,player.levels.shot-1);player.levels.laser=Math.max(0,player.levels.laser-1);player.levels.missile=Math.max(0,player.levels.missile-1);combo=1;comboClock=0;enemyShots=[];shake=15;burst(player.x,player.y,'#fff',30);tone(95,.5,'sawtooth',.05);hud();if(player.hp<=0)gameOver();
}
function update(dt){
 for(const s of stars){s.y+=s.v*dt;if(s.y>H){s.y=0;s.x=R(0,W)}}
 if(stage===5)for(const d of spaceDebris){d.y+=d.v*dt;d.a+=d.spin*dt;if(d.y>H+30){d.y=-30;d.x=R(0,W)}}
 for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.98;p.vy*=.98;p.l-=dt}particles=particles.filter(p=>p.l>0);
 for(const n of notes){n.r+=460*dt;n.a+=dt}notes=notes.filter(n=>n.r<650);if(notes.length>MAX_NOTES)notes.splice(0,notes.length-MAX_NOTES);
 for(const q of callouts){q.life-=dt;q.y-=16*dt}callouts=callouts.filter(q=>q.life>0);if(callouts.length>MAX_CALLOUTS)callouts.splice(0,callouts.length-MAX_CALLOUTS);
 flash=Math.max(0,flash-dt*2.5);shake=Math.max(0,shake-dt*30);banner=Math.max(0,banner-dt);
 if(mode==='finale'){
  finaleTime+=dt;if(trueEnding){player.x=W/2+Math.sin(finaleTime*1.15)*Math.min(155,finaleTime*24);player.y=H*.76-Math.min(H*.48,finaleTime*38)+Math.cos(finaleTime*1.8)*24}else player.y-=Math.max(0,18-finaleTime*2)*dt;
  if(finaleTime>1&&Math.floor(finaleTime*4)!==Math.floor((finaleTime-dt)*4))burst(finalBoss.x+R(-50,50),finalBoss.y+R(-35,35),finaleTime<3?'#63f7ff':'#fff2b0',12);
  if(finaleTime>3.2&&finaleTime-dt<=3.2){flash=1;shake=18;tone(523,1.4,'triangle',.05)}
  if(finaleTime>(trueEnding?10:7))showEnding();
  return;
 }
 if(mode!=='play')return;
 time+=dt;stageTime+=dt;player.cd-=dt;player.laserCd-=dt;player.missileCd-=dt;player.inv-=dt;player.power=Math.max(0,player.power-dt);updateBombFx(dt);updateBossHazards(dt);updateTraps(dt);updateBossShield(dt);
 let dx=+(key.has('ArrowRight')||key.has('KeyD'))-+(key.has('ArrowLeft')||key.has('KeyA')),dy=+(key.has('ArrowDown')||key.has('KeyS'))-+(key.has('ArrowUp')||key.has('KeyW'));
 if(dx&&dy){dx*=.707;dy*=.707}player.x=clamp(player.x+dx*300*ship().speed*dt,18,W-18);player.y=clamp(player.y+dy*300*ship().speed*dt,28,H-22);
 player.trail.unshift({x:player.x,y:player.y,l:.3});player.trail=player.trail.slice(0,9);for(const q of player.trail)q.l-=dt;
 updateDrones(dt);
 if(player.cd<=0)fireWeapon();
 const midAt=stage===5?7:12,bossAt=stage===5?18:28;
 if(!midBossMade&&stageTime>=midAt)addMidBoss();
 if(!bossMade&&stageTime<bossAt&&(spawnClock-=dt)<=0){addEnemy();spawnClock=stage===5?R(.78,1.08)/diff().enemy:R(.85,1.25)/(1+stage*.22)/diff().enemy}
 if(!bossMade&&stageTime>=bossAt&&(stage!==5||!enemies.some(e=>e.type==='midboss'&&!e.dead)))addBoss();
 for(const b of shots){
  if(b.type==='missile'){let target=null,best=Infinity;for(const e of enemies)if(!e.dead){const d=(e.x-b.x)**2+(e.y-b.y)**2;if(d<best){best=d;target=e}}if(target){const a=Math.atan2(target.y-b.y,target.x-b.x);b.vx+=Math.cos(a)*520*dt;b.vy+=Math.sin(a)*520*dt;const sp=Math.hypot(b.vx,b.vy);if(sp>430){b.vx=b.vx/sp*430;b.vy=b.vy/sp*430}}b.life-=dt}
  b.x+=(b.vx||0)*dt;b.y+=(b.vy||-520)*dt;
  for(const t of traps)if(!b.dead&&!t.dead&&t.breakable&&hit(b,t)){if(b.type==='laser'&&b.pierce>0)b.pierce--;else b.dead=true;t.hp-=b.damage||1;burst(b.x,b.y,'#8dcfaf',4);if(t.hp<=0){t.dead=true;score+=2500;shake=8;burst(t.x,t.y,'#8dcfaf',40);callouts.push({x:t.x,y:t.y-26,text:'MINE BREAK!',life:1.8,color:'#bfe9d4'});tone(980,.2,'triangle',.025)}}
 }
 for(const it of items){it.y+=it.vy*dt;it.phase+=dt*4;if(hit(player,it)){it.dead=true;if(it.kind==='heal'){player.hp=Math.min(5,player.hp+1);burst(it.x,it.y,'#ff668e',30);tone(880,.5,'sine',.05)}else if(it.kind==='bomb'){player.bombs=Math.min(5,player.bombs+1);burst(it.x,it.y,'#fff1a6',30);tone(740,.15,'square',.035);tone(1046,.3,'triangle',.035)}else if(it.kind==='star'){player.power=7;player.inv=Math.max(player.inv,7);burst(it.x,it.y,'#fff36b',55);[784,988,1175,1568].forEach((f,i)=>setTimeout(()=>tone(f,.3,'triangle',.035),i*70))}else{player.levels[it.kind]=Math.min(3,player.levels[it.kind]+1);burst(it.x,it.y,WEAPONS[it.kind].color,24);tone(1046,.35,'triangle',.045)}score+=500;hud()}}
 for(const e of enemies){
  if(e.dead)continue;
  if(e.type==='boss'){const targetY=stage===5?128:105;if(e.y<targetY)e.y+=e.v*dt;else{e.phase+=dt*(stage===5&&e.phase2?1.8:1);const range=stage===5?(e.phase2?145:38):Math.max(48,130-stage*18);e.x=W/2+Math.sin(e.phase*(selectedDifficulty==='hell'?.92:.65))*range;if(!bossShield){e.shieldCd-=dt;if(e.shieldCd<=0){startBossShield(e);e.shieldCd=stage===5&&e.phase2?5:{easy:11,normal:9.5,hard:7.8,hell:6.2}[selectedDifficulty]}}}}
  else if(e.type==='bossPart'){if(!e.parent||e.parent.dead||e.parent.phase2){e.dead=true;continue}e.phase+=dt*(e.side<0?2.1:-2.1);e.x=e.parent.x+e.side*(118+Math.sin(e.phase)*8);e.y=e.parent.y+30+Math.cos(e.phase*1.4)*14}
  else if(e.type==='midboss'){e.phase+=dt*1.7;if(e.y<155)e.y+=e.v*dt;else e.x=W/2+Math.sin(e.phase)*145}
  else{
   e.phase+=dt*(2+stage*.25);
   if(stage===0){e.y+=e.v*dt;e.x+=Math.sin(e.phase)*28*dt}
   else if(stage===1){e.y+=e.v*.86*dt;e.x+=Math.sin(e.phase*1.8)*85*dt}
   else if(stage===2){e.y+=e.v*.72*dt;e.x+=Math.cos(e.phase)*70*dt}
   else if(stage===3){e.y+=e.v*(e.y<170?1:.36)*dt;e.x+=Math.sin(e.phase*.7)*110*dt}
   else if(stage===4){e.y+=e.v*1.12*dt;e.x+=(player.x-e.x)*.2*dt+Math.sin(e.phase)*65*dt}
   else if(e.type==='spaceRay'){e.y+=e.v*.72*dt;e.x+=Math.sin(e.phase*.85)*125*dt}
   else{e.y+=e.v*(e.y<180?.75:.3)*dt;e.x+=(player.x-e.x)*.26*dt+Math.cos(e.phase*1.6)*78*dt}
   if(selectedDifficulty==='hell'){if(e.hellMove===0)e.x+=Math.sin(e.phase*2.7)*96*dt;else if(e.hellMove===1)e.x+=(player.x-e.x)*.34*dt;else{e.x+=Math.cos(e.phase*1.4)*78*dt;e.y+=Math.sin(e.phase*2.1)*24*dt}}
   e.x=clamp(e.x,e.r,W-e.r);
  }
  e.shoot-=dt;if(e.shoot<=0&&e.y>30){enemyFire(e);const lateEase=stage>=2?1.18+stage*.07:1,base=e.type==='boss'?R(.78,1.08):e.type==='bossPart'?R(.68,.9):stage===5?R(1.25,1.65):R(1.8,2.7);e.shoot=base/(1+stage*.13)*lateEase/diff().fire}
  for(const b of shots)if(!b.dead&&!e.dead&&hit(b,e)){if(bossShielded(e)){b.dead=true;burst(b.x,b.y,'#e1c57d',6);if(time-lastShieldSound>.12){tone(165,.05,'square',.01);lastShieldSound=time}continue}if(b.type==='laser'&&b.pierce>0)b.pierce--;else b.dead=true;let damage=b.damage||1;if(stage===5&&e.type==='boss'&&!e.phase2&&enemies.some(p=>p.type==='bossPart'&&!p.dead&&p.parent===e))damage*=.5;e.hp-=damage;if(stage===5&&e.type==='boss'&&!e.phase2&&e.hp>0&&e.hp<=e.max/3)transformGhostbeast(e);addCombo();score+=10*combo;burst(b.x,b.y,WEAPONS[b.type]?.color||STAGES[stage].accent,3);
   sfx('hit');if(e.hp<=0){if(e.type==='boss'){resolveBossDefeat(e);return}else{e.dead=true;if(e.type==='midboss')dropMidBossRewards(e);else if(e.type==='bossPart')callouts.push({x:e.x,y:e.y,text:'SIDE CORE BREAK',life:1.8,color:'#ffef78'});else dropItem(e);score+=e.worth*combo;shake=e.type==='midboss'||e.type==='bossPart'?12:3;burst(e.x,e.y,e.type==='midboss'?'#ff668e':STAGES[stage].accent,e.type==='midboss'||e.type==='bossPart'?48:16);sfx('destroy')}
   }
  }
  if(!e.dead&&hit(player,e))damage();if(e.type!=='bossPart'&&e.y>H+50)e.dead=true;
 }
 // コンボ猶予は通常減少。ただし耐久敵へ弾が当たったフレームは最大値へ戻す。
 if(enemyShots.length>bulletLimit())enemyShots.length=bulletLimit();
 comboClock-=dt;if(comboClock<=0&&combo>1){combo=1;comboClock=0}
 for(const b of enemyShots){const trailLimit=b.noTrail?0:(enemyShots.length>260?2:4);if(trailLimit){b.trail.unshift({x:b.x,y:b.y});if(b.trail.length>trailLimit)b.trail.length=trailLimit}if(b.spin){const a=b.spin*dt,cs=Math.cos(a),sn=Math.sin(a),vx=b.vx*cs-b.vy*sn;b.vy=b.vx*sn+b.vy*cs;b.vx=vx}b.age=(b.age||0)+dt;if(b.kind==='yoyo'&&!b.returned&&(b.age>3.1||b.y>H-75)){b.vx*=-1;b.vy*=-1;b.returned=true}if(b.kind==='bubble'&&b.y>H*.48)b.vy=0;b.x+=b.vx*dt;b.y+=b.vy*dt;b.angle=(b.angle||0)+dt*(b.kind==='shuriken'?10:2);
  if(b.kind==='bubble'&&!b.exploded&&b.age>(b.fuse||4.8)&&b.y<player.y-180){b.exploded=true;b.dead=true;const safe=clamp(b.safeX||player.x,65,W-65),n=Math.max(10,Math.round(14*diff().bullets)),sp=112*diff().speed;burst(b.x,b.y,'#8ff7ff',24);for(let i=0;i<n;i++){const a=i*Math.PI*2/n,vx=Math.cos(a)*sp,vy=Math.sin(a)*sp;if(vy>12){const projected=b.x+vx*((H-b.y)/vy);if(Math.abs(projected-safe)<78)continue}enemyShots.push({x:b.x,y:b.y,r:5,vx,vy,color:'#9ffaff',kind:'bubbleBit',trail:[],slow:true})}}
  else if(b.kind==='bomb'&&!b.exploded&&b.age>(b.fuse||3)){b.exploded=true;b.dead=true;burst(b.x,b.y,'#ffb13b',28);for(let i=0;i<16;i++)enemyShots.push({x:b.x,y:b.y,r:5,vx:Math.cos(i*Math.PI/8)*210,vy:Math.sin(i*Math.PI/8)*210,color:'#63f7ff',kind:'orb',trail:[]})}if(!b.dead){for(const d of player.drones)if(!b.dead&&d.inv<=0&&hit(d,b)){b.dead=true;d.hp--;burst(d.x,d.y,'#c9f8ff',12)}if(!b.dead&&hit(player,b))b.dead=true,damage()}}
 player.drones=player.drones.filter(d=>d.hp>0);if(!player.drones.length&&player.funnelGauge>=999)activateDrones();
 shots=shots.filter(b=>!b.dead&&b.y>-40&&b.x>-40&&b.x<W+40&&(b.life===undefined||b.life>0));items=items.filter(i=>!i.dead&&i.y<H+30);enemies=enemies.filter(e=>!e.dead);enemyShots=enemyShots.filter(b=>!b.dead&&b.x>-30&&b.x<W+30&&b.y>-30&&b.y<H+30);if(enemyShots.length>bulletLimit())enemyShots.length=bulletLimit();hud();
}
function heart(x,y,size,color){
 g.save();g.translate(x,y);g.scale(size/20,size/20);g.fillStyle=color;g.beginPath();g.moveTo(0,7);g.bezierCurveTo(-22,-7,-17,-22,-7,-20);g.bezierCurveTo(0,-19,2,-12,0,-8);g.bezierCurveTo(2,-12,10,-19,17,-15);g.bezierCurveTo(29,-4,12,11,0,22);g.fill();g.restore();
}
function drawPlayer(){
 for(let i=player.trail.length-1;i>=0;i--){const q=player.trail[i];g.globalAlpha=Math.max(0,q.l)*.45;heart(q.x,q.y,7,'#fff4c9')}g.globalAlpha=1;
 if(player.power>0){g.save();g.translate(player.x,player.y);g.globalCompositeOperation='lighter';for(let i=0;i<3;i++){g.strokeStyle=['#fff36b','#6ff8ff','#ff79bd'][i];g.globalAlpha=.45+Math.sin(time*12+i*2)*.2;g.lineWidth=4-i;g.beginPath();g.arc(0,0,34+i*7+Math.sin(time*8+i)*4,0,Math.PI*2);g.stroke()}for(let i=0;i<7;i++){const a=time*(2+i*.13)+i*Math.PI*2/7,r=42+(i%2)*10;g.fillStyle=i%2?'#fff':'#fff36b';g.fillRect(Math.cos(a)*r-2,Math.sin(a)*r-2,4,4)}g.restore()}
 g.save();g.translate(player.x,player.y);g.globalAlpha=player.inv>0&&Math.floor(player.inv*12)%2?.35:1;g.shadowBlur=18;g.shadowColor='#fff';
 g.scale(.76,.76);
 if(selectedShip==='ribbon'){
  const rg=g.createLinearGradient(-35,-20,35,25);rg.addColorStop(0,'#fff0fa');rg.addColorStop(.42,'#ff72bc');rg.addColorStop(1,'#9b3e91');g.strokeStyle=rg;g.lineWidth=9;g.lineCap='round';g.beginPath();g.moveTo(-5,5);g.bezierCurveTo(-42,-20,-38,27,-8,13);g.moveTo(5,5);g.bezierCurveTo(42,-20,38,27,8,13);g.stroke();const rb=g.createRadialGradient(-5,-9,2,0,2,26);rb.addColorStop(0,'#fff');rb.addColorStop(.45,'#ffd6ee');rb.addColorStop(1,'#c45a9f');g.fillStyle=rb;g.beginPath();g.ellipse(0,0,13,24,0,0,7);g.fill();g.strokeStyle='#8a4d91';g.lineWidth=2;g.stroke();heart(0,-5,13,'#ff5fa7');g.fillStyle='#6b376e';g.beginPath();g.arc(-4,-13,2,0,7);g.arc(4,-13,2,0,7);g.fill();g.strokeStyle='#fff9';g.beginPath();g.arc(-3,-3,7,-2.6,-.5);g.stroke();
 }else if(selectedShip==='hammer'){
  const hg=g.createRadialGradient(-8,-10,2,0,2,30);hg.addColorStop(0,'#e8ffb9');hg.addColorStop(.5,'#8de36d');hg.addColorStop(1,'#397848');g.fillStyle=hg;g.strokeStyle='#302e58';g.lineWidth=3;g.beginPath();g.ellipse(0,2,21,25,0,0,7);g.fill();g.stroke();g.fillStyle='#fff';g.beginPath();g.ellipse(-7,-8,6,9,0,0,7);g.ellipse(7,-8,6,9,0,0,7);g.fill();g.fillStyle='#352c59';g.beginPath();g.arc(-6,-8,2,0,7);g.arc(6,-8,2,0,7);g.fill();const metal=g.createLinearGradient(-43,-13,43,19);metal.addColorStop(0,'#f8e58c');metal.addColorStop(.45,'#8a6ba8');metal.addColorStop(.7,'#d9c6ff');metal.addColorStop(1,'#57436f');g.fillStyle=metal;g.fillRect(-43,-13,13,32);g.fillRect(30,-13,13,32);g.fillStyle='#ffc94f';g.fillRect(-35,-3,25,12);g.fillRect(10,-3,25,12);heart(0,12,9,'#ff6f91');
 }else{
 // cream-and-rose heroine craft: ribbon wings, rounded armor, expressive cockpit
 g.fillStyle='#ff789f';g.beginPath();g.moveTo(-8,8);g.quadraticCurveTo(-30,3,-27,-15);g.quadraticCurveTo(-13,-11,-5,1);g.moveTo(8,8);g.quadraticCurveTo(30,3,27,-15);g.quadraticCurveTo(13,-11,5,1);g.fill();
 const cg=g.createLinearGradient(-14,-24,14,24);cg.addColorStop(0,'#fff');cg.addColorStop(.38,'#fff4dd');cg.addColorStop(.72,'#e8bdd2');cg.addColorStop(1,'#86639a');g.fillStyle=cg;g.strokeStyle='#6d5488';g.lineWidth=2;g.beginPath();g.moveTo(0,-26);g.bezierCurveTo(15,-19,16,5,9,20);g.quadraticCurveTo(0,29,-9,20);g.bezierCurveTo(-16,5,-15,-19,0,-26);g.fill();g.stroke();
 g.fillStyle='#80daf0';g.beginPath();g.ellipse(0,-8,9,10,0,0,7);g.fill();g.stroke();g.fillStyle='#352c59';g.beginPath();g.arc(-3,-8,1.8,0,7);g.arc(3,-8,1.8,0,7);g.fill();g.strokeStyle='#ff6f91';g.beginPath();g.arc(0,-5,3,0.2,2.9);g.stroke();
 g.fillStyle='#ffd65c';g.beginPath();g.moveTo(-5,18);g.lineTo(0,29+Math.sin(time*25)*3);g.lineTo(5,18);g.fill();heart(0,10,8,'#ff668e');}
 g.restore();
 g.save();g.shadowBlur=14;g.shadowColor='#fff';g.fillStyle='#fff';g.beginPath();g.arc(player.x,player.y+2,player.r,0,7);g.fill();g.strokeStyle='#ff477e';g.lineWidth=1.5;g.stroke();g.restore();
}
function drawDrones(){
 for(const d of player.drones){g.save();g.translate(d.x,d.y);g.globalAlpha=d.inv>0?.42:1;g.shadowBlur=15;g.shadowColor=selectedShip==='hammer'?'#a9ff72':selectedShip==='ribbon'?'#ff8dce':'#71f5ff';g.fillStyle='#171637';g.strokeStyle='#fff';g.lineWidth=1.5;if(d.inv>0){g.strokeStyle='#aefcff';g.beginPath();g.arc(0,0,13+Math.sin(time*8+d.phase)*2,0,7);g.stroke()}if(selectedShip==='ribbon'){heart(0,0,11,'#ff8dce')}else if(selectedShip==='hammer'){g.rotate(d.phase);g.fillStyle='#a9ff72';g.fillRect(-8,-5,16,10);g.fillStyle='#fff';g.fillRect(-4,-9,8,18)}else{g.beginPath();g.ellipse(0,0,7,11,d.phase,0,7);g.fill();g.stroke();heart(0,1,5,'#71f5ff')}g.fillStyle='#fff';g.beginPath();g.arc(0,0,2.5,0,7);g.fill();g.restore()}
}
function drawBossHazards(){
 for(const b of beamFx){g.save();const active=b.telegraph<=0,pulse=.55+Math.sin(time*34)*.25;g.globalAlpha=active?1:.38;g.strokeStyle=active?'#eaffff':'#63f7ff';g.shadowBlur=active?28:10;g.shadowColor='#63f7ff';g.lineWidth=active?b.width*1.8:3;g.setLineDash(active?[]:[12,10]);g.beginPath();const dx=b.x2-b.x1,dy=b.y2-b.y1,len=Math.hypot(dx,dy),nx=-dy/len,ny=dx/len;for(let i=0;i<=12;i++){const t=i/12,j=active?Math.sin(i*4.7+time*42)*9*pulse:0,x=b.x1+dx*t+nx*j,y=b.y1+dy*t+ny*j;if(i===0)g.moveTo(x,y);else g.lineTo(x,y)}g.stroke();if(active){g.strokeStyle='#78eaff';g.lineWidth=4;g.stroke()}g.restore()}
 if(deathBorder){const active=deathBorder.warning<=0,h=deathBorder.height,pulse=.58+Math.sin(time*24)*.24;g.save();g.globalAlpha=active?.82:.38;for(const y of [0,H-h]){const fire=g.createLinearGradient(0,y,0,y+(y===0?h:-h));fire.addColorStop(0,'#fff36b');fire.addColorStop(.32,'#ff5a2f');fire.addColorStop(1,'#8b104888');g.fillStyle=fire;g.fillRect(0,y,W,h);g.strokeStyle=active?'#fff0a0':'#ff7652';g.lineWidth=active?6:2;g.setLineDash(active?[]:[10,8]);g.beginPath();for(let x=0;x<=W;x+=12){const edge=y===0?h: H-h,fy=edge+(y===0?-1:1)*(active?(8+Math.sin(x*.09+time*18)*10*pulse):0);if(x===0)g.moveTo(x,fy);else g.lineTo(x,fy)}g.stroke()}g.restore()}
}
function drawBossShield(){
 if(!bossShield)return;const e=bossShield.boss;if(!e||e.dead)return;const radius=e.bossId===5&&!e.phase2?184:e.r+36,pulse=.55+Math.sin(time*12)*.08;g.save();g.translate(e.x,e.y+8);g.globalAlpha=.28;g.fillStyle='#28304d';g.beginPath();for(let i=0;i<6;i++){const a=-Math.PI/2+i*Math.PI/3,x=Math.cos(a)*radius,y=Math.sin(a)*radius;if(i===0)g.moveTo(x,y);else g.lineTo(x,y)}g.closePath();g.fill();g.globalAlpha=.82;g.shadowBlur=12;g.shadowColor='#d9bd72';g.strokeStyle='#e1c57d';g.lineWidth=4;g.stroke();g.rotate(time*.25);g.strokeStyle='#86c9cf';g.lineWidth=2;g.setLineDash([24,16]);g.beginPath();g.arc(0,0,radius-10,0,7);g.stroke();g.rotate(-time*.25);g.setLineDash([]);g.globalAlpha=.88;g.fillStyle='#24283ecc';g.fillRect(-75,radius-5,150,22);g.fillStyle='#fff4d2';g.font='800 12px sans-serif';g.textAlign='center';g.fillText('AT FIELD / GUARD',0,radius+10);g.globalAlpha=pulse;g.strokeStyle='#dce8e8';g.lineWidth=1.5;g.beginPath();g.arc(0,0,radius+7,0,7);g.stroke();g.restore();
}
function drawEnemy(e){
 g.save();g.translate(e.x,e.y);g.shadowBlur=15;g.shadowColor=STAGES[stage].accent;
 if(e.type==='boss'){
  const id=e.bossId??stage;g.strokeStyle='#fff';g.lineWidth=3;
  if(id===5){if(!e.phase2){g.shadowBlur=38;g.shadowColor='#63f7ff';const armor=g.createLinearGradient(-120,-80,120,100);armor.addColorStop(0,'#d9f6ff');armor.addColorStop(.22,'#62728d');armor.addColorStop(.55,'#15162d');armor.addColorStop(.78,'#7d315d');armor.addColorStop(1,'#e2764f');g.fillStyle=armor;g.strokeStyle='#bffcff';g.lineWidth=4;for(const side of [-1,1]){g.beginPath();g.moveTo(side*25,-45);g.lineTo(side*145,-92);g.lineTo(side*122,-20);g.lineTo(side*164,42);g.lineTo(side*72,24);g.lineTo(side*48,88);g.lineTo(side*18,35);g.closePath();g.fill();g.stroke()}g.beginPath();g.ellipse(0,8,72,105,0,0,7);g.fill();g.stroke();g.fillStyle='#2a183b';g.beginPath();g.moveTo(0,-94);g.lineTo(-38,-45);g.lineTo(-24,20);g.lineTo(0,52);g.lineTo(24,20);g.lineTo(38,-45);g.closePath();g.fill();g.stroke();g.fillStyle='#ff734f';for(let i=0;i<5;i++){const a=-1.95+i*.19;g.beginPath();g.moveTo(Math.cos(a)*42,Math.sin(a)*48-15);g.lineTo(Math.cos(a)*88,Math.sin(a)*92-15);g.lineTo(Math.cos(a+.1)*48,Math.sin(a+.1)*54-15);g.fill()}g.fillStyle='#fff';g.beginPath();g.ellipse(0,-30,28,17,0,0,7);g.fill();g.fillStyle='#151121';g.beginPath();g.ellipse(0,-30,10,16,0,0,7);g.fill();g.strokeStyle='#ffcf5c';g.lineWidth=6;g.beginPath();g.moveTo(-34,32);g.quadraticCurveTo(0,80,34,32);g.stroke();heart(0,22,26,'#ff456c')}else{g.shadowBlur=42;g.shadowColor='#ff4b36';g.rotate(Math.sin(e.phase*2)*.08);g.fillStyle='#0a0712';g.strokeStyle='#ff7652';g.lineWidth=4;for(let i=0;i<12;i++){const a=i*Math.PI/6+e.phase*.16,r=i%2?48:94;g.beginPath();g.moveTo(Math.cos(a)*35,Math.sin(a)*35);g.lineTo(Math.cos(a+.08)*r,Math.sin(a+.08)*r);g.lineTo(Math.cos(a+.18)*38,Math.sin(a+.18)*38);g.fill();g.stroke()}g.fillStyle='#4b173d';g.beginPath();g.ellipse(0,0,48,63,0,0,7);g.fill();g.stroke();g.fillStyle='#fff09a';g.beginPath();g.moveTo(0,-52);g.lineTo(-24,-5);g.lineTo(0,32);g.lineTo(24,-5);g.closePath();g.fill();g.fillStyle='#ff342f';g.beginPath();g.arc(0,-8,15+Math.sin(time*12)*4,0,7);g.fill()}}
  else if(id===0){g.fillStyle='#6fd5ed';g.beginPath();g.ellipse(0,0,72,42,0,0,7);g.fill();g.stroke();g.fillStyle='#fff';g.beginPath();g.moveTo(-55,20);g.quadraticCurveTo(-78,60,-22,37);g.fill();heart(18,2,22,'#ff7fa2')}
  else if(id===1){g.fillStyle='#ff875e';g.beginPath();for(let i=0;i<12;i++){const a=i*Math.PI/6,r=i%2?44:76;g.lineTo(Math.cos(a)*r,Math.sin(a)*r)}g.closePath();g.fill();g.stroke();g.fillStyle='#fff0d0';g.beginPath();g.arc(0,0,34,0,7);g.fill()}
  else if(id===2){g.fillStyle='#6b456e';g.beginPath();g.ellipse(0,0,75,55,0,0,7);g.fill();g.stroke();g.fillStyle='#ffc64f';for(let i=-1;i<=1;i++){g.beginPath();g.arc(i*30,-15,13,0,7);g.fill()}g.fillStyle='#fff';g.fillRect(-48,18,96,12)}
  else if(id===3){g.fillStyle='#b65ca4';g.beginPath();g.arc(0,0,62,0,7);g.fill();g.stroke();g.lineWidth=13;for(let i=0;i<6;i++){const a=i*Math.PI/3+e.phase;g.beginPath();g.moveTo(Math.cos(a)*42,Math.sin(a)*42);g.bezierCurveTo(Math.cos(a)*85,Math.sin(a)*85,Math.cos(a+.8)*105,Math.sin(a+.8)*105,Math.cos(a+.3)*125,Math.sin(a+.3)*125);g.stroke()}}
  else{g.shadowBlur=35;g.shadowColor='#63f7ff';g.fillStyle='#090718';g.beginPath();g.ellipse(0,0,112,82,0,0,7);g.fill();g.stroke();g.fillStyle='#ff456c';for(let i=0;i<7;i++){const a=i*Math.PI*2/7+e.phase*.2;g.beginPath();g.moveTo(Math.cos(a)*72,Math.sin(a)*52);g.lineTo(Math.cos(a)*145,Math.sin(a)*118);g.lineTo(Math.cos(a+.16)*78,Math.sin(a+.16)*58);g.fill()}g.fillStyle='#fff';g.beginPath();g.ellipse(0,-5,42,20,0,0,7);g.fill();g.fillStyle='#141027';g.beginPath();g.ellipse(0,-5,16,20,0,0,7);g.fill()}
  g.fillStyle='#40375e';g.beginPath();g.arc(-16,-8,5,0,7);g.arc(16,-8,5,0,7);g.fill();
 }else if(e.type==='bossPart'){
  g.rotate(e.side*.18+Math.sin(e.phase)*.08);g.shadowBlur=28;g.shadowColor='#ffcc54';const metal=g.createLinearGradient(-45,-40,45,45);metal.addColorStop(0,'#eefaff');metal.addColorStop(.3,'#64758b');metal.addColorStop(.62,'#231a32');metal.addColorStop(1,'#a44545');g.fillStyle=metal;g.strokeStyle='#fff2a0';g.lineWidth=3;g.beginPath();g.moveTo(e.side*-34,-35);g.lineTo(e.side*36,-22);g.lineTo(e.side*44,18);g.lineTo(e.side*18,42);g.lineTo(e.side*-30,28);g.closePath();g.fill();g.stroke();g.fillStyle='#18152a';g.beginPath();g.arc(0,3,20,0,7);g.fill();g.stroke();g.fillStyle='#ffef63';g.beginPath();g.arc(0,3,8+Math.sin(time*10+e.side)*2,0,7);g.fill();for(let i=-1;i<=1;i++){g.fillStyle='#76f7ff';g.fillRect(e.side*22+i*8,-13,5,26)}
 }else if(e.type==='midboss'){
  if(e.grave){g.rotate(e.phase*.18);g.fillStyle='#283044';g.strokeStyle='#63f7ff';g.lineWidth=4;for(let i=0;i<6;i++){g.rotate(Math.PI/3);g.fillRect(12,-11,44,22);g.strokeRect(12,-11,44,22)}g.beginPath();g.arc(0,0,34,0,7);g.fill();g.stroke();g.fillStyle='#ffef63';g.beginPath();g.arc(0,0,12,0,7);g.fill()}else{g.fillStyle='#fff0dc';g.strokeStyle='#ff668e';g.lineWidth=4;g.beginPath();g.arc(0,0,36,0,7);g.fill();g.stroke();heart(0,3,27,'#ff668e');g.fillStyle='#4d365f';g.beginPath();g.arc(-10,-10,4,0,7);g.arc(10,-10,4,0,7);g.fill();g.strokeStyle='#ffe66d';g.lineWidth=6;g.beginPath();g.moveTo(-25,18);g.lineTo(-45,36);g.moveTo(25,18);g.lineTo(45,36);g.stroke()}
 }else if(e.type==='spaceRay'){
  g.rotate(Math.sin(e.phase)*.12);g.shadowBlur=22;g.shadowColor='#61f7ff';const ray=g.createLinearGradient(-42,-20,42,24);ray.addColorStop(0,'#7ef7ff');ray.addColorStop(.45,'#303b75');ray.addColorStop(1,'#ff65b7');g.fillStyle=ray;g.strokeStyle='#d9ffff';g.lineWidth=2;g.beginPath();g.moveTo(0,-18);g.bezierCurveTo(-18,-28,-42,-18,-54,7);g.quadraticCurveTo(-25,2,-12,25);g.lineTo(0,14);g.lineTo(12,25);g.quadraticCurveTo(25,2,54,7);g.bezierCurveTo(42,-18,18,-28,0,-18);g.fill();g.stroke();g.beginPath();g.moveTo(0,12);g.bezierCurveTo(Math.sin(e.phase)*16,38,-8,52,6,69);g.stroke();g.fillStyle='#fff';g.beginPath();g.arc(0,-8,7,0,7);g.fill();g.fillStyle='#ff4f8d';g.beginPath();g.arc(0,-8,3,0,7);g.fill();
 }else if(e.type==='scrap'){
  g.rotate(Math.sin(e.phase*1.7)*.16);g.fillStyle='#596574';g.strokeStyle='#ffcc57';g.lineWidth=2;g.fillRect(-22,-25,44,49);g.strokeRect(-22,-25,44,49);g.fillStyle='#232738';g.fillRect(-14,-18,28,17);g.fillStyle='#ff5b39';g.fillRect(-8,-13,6,6);g.fillStyle='#76f7ff';g.fillRect(4,-13,6,6);g.fillStyle='#9a4f42';g.fillRect(-34,-15,12,33);g.fillRect(22,-15,12,33);g.strokeStyle='#c8d6df';g.lineWidth=5;g.beginPath();g.moveTo(-12,24);g.lineTo(-18,40);g.moveTo(12,24);g.lineTo(18,40);g.stroke();for(let i=0;i<4;i++){g.fillStyle='#d8e0e6';g.beginPath();g.arc(i%2?16:-16,i<2?-19:18,3,0,7);g.fill()}
 }else{
  const col=e.type==='tough'?'#8d79bc':STAGES[stage].accent;heart(0,0,e.r*1.5,col);
  g.fillStyle='#fff0da';g.beginPath();g.arc(0,-2,e.r*.58,0,7);g.fill();g.fillStyle='#40375e';g.beginPath();g.arc(-4,-4,2,0,7);g.arc(4,-4,2,0,7);g.fill();
  g.strokeStyle='#40375e';g.lineWidth=1.5;g.beginPath();g.arc(0,0,5,.2,2.9);g.stroke();g.strokeStyle=col;g.lineWidth=4;g.beginPath();g.moveTo(-e.r,6);g.lineTo(-e.r-9,14+Math.sin(e.phase)*4);g.moveTo(e.r,6);g.lineTo(e.r+9,14-Math.sin(e.phase)*4);g.stroke();
 }
 g.restore();
 if(e.max>10){const ghost=e.type==='boss'&&e.bossId===5,w=ghost?270:e.type==='boss'?Math.min(210,e.r*2):e.type==='bossPart'?84:70,bx=ghost?(W-w)/2:e.x-w/2,by=ghost?18:e.y-e.r-16;g.fillStyle='#ffffff55';g.fillRect(bx,by,w,6);g.fillStyle=e.type==='bossPart'?'#ffcf55':STAGES[stage].bullet;g.fillRect(bx,by,w*Math.max(0,e.hp/e.max),6);if(ghost){g.fillStyle='#fff';g.textAlign='center';g.font='900 10px sans-serif';g.fillText(e.phase2?'DEATHBEAST':'GHOSTBEAST — MAIN CORE',W/2,by+18)}}
}
function drawFinale(){
 if(mode!=='finale')return;
 const f=finaleTime,x=finalBoss.x,y=finalBoss.y;
 g.save();g.textAlign='center';
 if(trueEnding){
  if(f<3.6){g.globalAlpha=Math.max(0,1-f/3.6);g.fillStyle='#020108';g.shadowBlur=45;g.shadowColor='#ff5438';g.beginPath();g.arc(x,y,82+f*21,0,7);g.fill();g.strokeStyle='#63f7ff';g.lineWidth=4+f*3;g.stroke();for(let i=0;i<10;i++){const a=i*Math.PI/5+f*2.2,r=105+f*28;g.strokeStyle=i%2?'#ff5b5b':'#fff16b';g.beginPath();g.moveTo(x+Math.cos(a)*35,y+Math.sin(a)*35);g.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r);g.stroke()}}
  if(f>2){const bloom=Math.min(1,(f-2)/4),milky=g.createRadialGradient(W/2,H*.38,12,W/2,H*.38,420);milky.addColorStop(0,'#fffbdc');milky.addColorStop(.18,'#8ffaffdd');milky.addColorStop(.42,'#ff83c7aa');milky.addColorStop(1,'#34207100');g.globalAlpha=bloom;g.fillStyle=milky;g.fillRect(0,0,W,H);g.globalCompositeOperation='lighter';for(let i=0;i<95;i++){const a=i*2.399+f*.07,r=12+i*3.45,sx=W/2+Math.cos(a)*r,sy=H*.42+Math.sin(a)*r*.34+(i%5-2)*5,size=1+(i%7)*.42;g.fillStyle=i%4===0?'#fff36b':i%3===0?'#ff9ed5':'#d7ffff';g.globalAlpha=bloom*(.45+(i%5)*.11);g.beginPath();g.arc(sx,sy,size,0,7);g.fill();if(i%11===0){g.fillRect(sx-8,sy,16,1);g.fillRect(sx,sy-8,1,16)}}g.globalCompositeOperation='source-over'}
  if(f>3.2){g.globalAlpha=Math.min(1,(f-3.2)/2);g.strokeStyle='#fff';g.shadowBlur=22;g.shadowColor='#76f7ff';g.lineWidth=7;g.beginPath();for(let i=0;i<45;i++){const t=i/44,px=W/2+Math.sin((f-t*2)*1.15)*Math.min(155,(f-t*2)*24),py=H*.76-Math.min(H*.48,Math.max(0,f-t*2)*38)+Math.cos((f-t*2)*1.8)*24;if(i===0)g.moveTo(px,py);else g.lineTo(px,py)}g.stroke();g.shadowBlur=30;g.shadowColor='#fff36b';g.fillStyle='#fff';g.beginPath();g.arc(player.x,player.y,10,0,7);g.fill();heart(player.x,player.y,18,selectedShip==='ribbon'?'#ff8dce':selectedShip==='hammer'?'#a9ff72':'#76f7ff');g.shadowBlur=0}
  g.globalAlpha=1;g.fillStyle='#fff';g.font='800 17px sans-serif';if(f>1&&f<3.6)g.fillText('GHOSTBEAST「滅びは……終わらない」',W/2,H*.52);else if(f>=3.6&&f<6)g.fillText('奇跡の恒星が、宇宙の墓場に咲き始めた。',W/2,H*.52);else if(f>=6){g.font='900 27px sans-serif';g.fillText('HEARTFUL PARADE',W/2,H*.49);g.font='700 14px sans-serif';g.fillText('満開の天の川を、あなたは光と駆け巡る。',W/2,H*.54)}g.restore();return;
 }
 if(f<3.5){g.globalAlpha=Math.max(0,1-f/3.5);g.fillStyle='#09091d';g.beginPath();g.ellipse(x,y,75+f*14,55+f*9,0,0,7);g.fill();g.strokeStyle='#63f7ff';g.lineWidth=3+f*2;g.stroke()}
 if(f>2.2){const dawn=Math.min(1,(f-2.2)/4);const grd=g.createRadialGradient(W/2,H*.22,5,W/2,H*.22,360);grd.addColorStop(0,'#fff8c8');grd.addColorStop(.3,'#ff9eaa');grd.addColorStop(1,'#5c79bd00');g.globalAlpha=dawn;g.fillStyle=grd;g.fillRect(0,0,W,H)}
 g.globalAlpha=1;g.fillStyle='#fff';g.font='700 17px sans-serif';
 if(f>1&&f<3)g.fillText('ノクス「朝が来たら、ぼくは消えるの？」',W/2,H*.43);
 else if(f>=3&&f<5)g.fillText('ルミ「消えないよ。光の中で会える」',W/2,H*.43);
 else if(f>=5)g.fillText('長い夜は、最初の朝へほどけていった。',W/2,H*.43);
 g.restore();
}
function draw(){
 const s=STAGES[stage],bg=g.createLinearGradient(0,0,0,H);bg.addColorStop(0,s.sky[0]);bg.addColorStop(.48,s.sky[1]);bg.addColorStop(1,s.sky[2]);g.fillStyle=bg;g.fillRect(0,0,W,H);
 g.save();if(shake)g.translate(R(-shake,shake),R(-shake,shake));
 g.globalAlpha=.55;for(const st of stars){g.fillStyle='#fff';g.beginPath();g.arc(st.x,st.y,st.s,0,7);g.fill()}
 g.globalAlpha=.12;for(let y=(time*25*(1+stage*.2))%90;y<H;y+=90){g.fillStyle='#fff';g.beginPath();g.arc(70,y,55,0,7);g.arc(400,y+45,35,0,7);g.fill()}
 g.globalAlpha=.1;g.strokeStyle='#fff';g.lineWidth=2;for(let y=(time*70)%120-120;y<H;y+=120){g.beginPath();g.moveTo(0,y);g.bezierCurveTo(130,y+55,350,y-35,W,y+20);g.stroke()}
 g.globalAlpha=.16;g.strokeStyle='#fff';
 if(stage===1){for(let x=30;x<W;x+=70){g.beginPath();g.moveTo(x,0);g.lineTo(x+Math.sin(time+x)*25,H);g.stroke()}}
 if(stage===2){for(let y=40;y<H;y+=95){g.strokeRect(35+(y%190),y,70,42)}}
 if(stage===3){for(let i=0;i<5;i++){g.beginPath();g.arc(W/2,H/2,70+i*58+(time*18)%58,0,7);g.stroke()}}
 if(stage===4){for(let x=0;x<W;x+=48){g.beginPath();g.moveTo(W/2,H*.18);g.lineTo(x,H);g.stroke()}}
 if(stage===5){g.globalAlpha=1;const hole=g.createRadialGradient(W/2,H*.21,8,W/2,H*.21,190);hole.addColorStop(0,'#000');hole.addColorStop(.22,'#010104');hole.addColorStop(.31,'#ff9a3d');hole.addColorStop(.36,'#8c3cff');hole.addColorStop(.48,'#25115b88');hole.addColorStop(1,'#00000000');g.fillStyle=hole;g.fillRect(0,0,W,H*.55);g.globalAlpha=.38;for(let i=0;i<7;i++){g.strokeStyle=i%2?'#63f7ff':'#ff67c8';g.lineWidth=1.5+i*.45;g.beginPath();g.ellipse(W/2,H*.21,72+i*20,23+i*9,time*.08+i*.13,0,7);g.stroke()}for(const d of spaceDebris){g.save();g.translate(d.x,d.y);g.rotate(d.a);g.globalAlpha=.38+(d.kind%3)*.14;g.fillStyle=d.kind===0?'#788394':d.kind===1?'#413654':d.kind===2?'#995b46':'#586d73';g.strokeStyle='#c8edee55';g.lineWidth=1;if(d.kind===0){g.fillRect(-d.s,-d.s*.35,d.s*2,d.s*.7);g.strokeRect(-d.s,-d.s*.35,d.s*2,d.s*.7)}else if(d.kind===1){g.beginPath();g.moveTo(-d.s,0);g.lineTo(0,-d.s*.7);g.lineTo(d.s,d.s*.45);g.closePath();g.fill();g.stroke()}else if(d.kind===2){g.beginPath();g.arc(0,0,d.s*.65,0,7);g.fill();g.stroke();g.fillStyle='#111';g.fillRect(-d.s*.18,-d.s,d.s*.36,d.s*2)}else{g.fillRect(-d.s*.7,-d.s*.7,d.s*1.4,d.s*1.4);g.strokeRect(-d.s*.7,-d.s*.7,d.s*1.4,d.s*1.4)}g.restore()}}
 // atmospheric depth: distant terrain, reflected light and haze
 g.globalAlpha=.18;const haze=g.createRadialGradient(W*.25,H*.24,5,W*.25,H*.24,W*.72);haze.addColorStop(0,'#fffbd8');haze.addColorStop(.38,STAGES[stage].accent+'88');haze.addColorStop(1,'#00000000');g.fillStyle=haze;g.fillRect(0,0,W,H);
 if(stage!==5){g.globalAlpha=.22;g.fillStyle=stage<2?'#29325b':stage===2?'#4a2d43':'#06091d';g.beginPath();g.moveTo(0,H*.72);for(let x=0;x<=W;x+=32)g.lineTo(x,H*.68+Math.sin(x*.026+time*.08)*24+Math.sin(x*.071)*10);g.lineTo(W,H);g.lineTo(0,H);g.fill()}
 // physical mine barriers live in the scenery layer, clearly distinct from bullets
 g.globalAlpha=1;for(const t of traps){g.save();g.translate(t.x,t.y);g.rotate(t.phase);g.shadowBlur=t.breakable?13:18;if(t.kind==='vortex'){g.shadowColor='#ff4bd8';g.strokeStyle='#ff80e7';g.fillStyle='#321047cc';for(let i=0;i<4;i++){g.lineWidth=5-i;g.beginPath();g.arc(0,0,5+i*6,-i*.8,Math.PI*1.35+i*.55);g.stroke()}g.beginPath();g.arc(0,0,t.r*.68,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(-3,-3,3,0,7);g.fill()}else{const breakable=t.breakable,edge=breakable?'#82c9aa':'#ffcf62',metal=g.createRadialGradient(-5,-6,2,0,0,t.r+7);metal.addColorStop(0,breakable?'#e8fff1':'#f5f4e9');metal.addColorStop(.35,breakable?'#608d78':'#7e8b9c');metal.addColorStop(.72,breakable?'#29463a':'#30384b');metal.addColorStop(1,'#111522');g.shadowColor=breakable?'#72b99b':'#ff4f3e';g.fillStyle=metal;g.strokeStyle=edge;g.lineWidth=breakable?3:2;for(let i=0;i<8;i++){g.rotate(Math.PI/4);g.beginPath();g.moveTo(t.r-2,-4);g.lineTo(t.r+10,0);g.lineTo(t.r-2,4);g.fill();g.stroke()}g.beginPath();g.arc(0,0,t.r,0,7);g.fill();g.stroke();g.fillStyle=breakable?'#82c9aa':'#ff4a3d';g.beginPath();g.arc(0,0,5+Math.sin(time*8+t.phase),0,7);g.fill();g.fillStyle='#fff8';g.beginPath();g.arc(-4,-5,3,0,7);g.fill();if(breakable){g.rotate(-t.phase);const ratio=Math.max(0,t.hp/t.maxHp);g.fillStyle='#1b2730cc';g.fillRect(-20,-29,40,6);g.fillStyle='#8fd2b5';g.fillRect(-19,-28,38*ratio,4);g.fillStyle='#dff7eb';g.font='800 10px sans-serif';g.textAlign='center';g.fillText('BREAK',0,35)}}g.restore()}
 drawBossHazards();
 g.globalAlpha=1;for(const b of shots){
  const shotColor=b.ship==='ribbon'?'#ff70c0':b.ship==='hammer'?'#a8ff69':WEAPONS[b.type].color;g.save();g.translate(b.x,b.y);g.shadowBlur=14;g.shadowColor=shotColor;
  if(b.type==='laser'){const w=b.width||5;if(b.ship==='ribbon'){g.fillStyle='#ff88cf';g.beginPath();g.moveTo(0,-32);g.quadraticCurveTo(w*1.4,-12,0,4);g.quadraticCurveTo(-w*1.4,20,0,34);g.quadraticCurveTo(w*1.4,16,0,0);g.quadraticCurveTo(-w*1.4,-16,0,-32);g.fill();g.fillStyle='#fff';g.fillRect(-2,-34,4,68)}else if(b.ship==='hammer'){g.fillStyle='#92ff5f';g.fillRect(-w,-25,w*2,50);g.fillStyle='#fff7a6';g.fillRect(-w*.48,-31,w*.96,62);g.strokeStyle='#456b36';g.lineWidth=3;g.strokeRect(-w,-25,w*2,50)}else{g.fillStyle='#bffcff';g.fillRect(-w,-24,w*2,48);g.fillStyle='#fff';g.fillRect(-w*.42,-29,w*.84,58)}}
  else if(b.type==='missile'){g.rotate(Math.atan2(b.vy,b.vx)+Math.PI/2);if(b.ship==='ribbon'){heart(0,0,14,'#ff7fc8');g.fillStyle='#fff';g.beginPath();g.moveTo(0,-15);g.lineTo(3,-5);g.lineTo(-3,-5);g.fill()}else if(b.ship==='hammer'){g.fillStyle='#a8ff69';g.fillRect(-9,-13,18,20);g.fillStyle='#fff4a6';g.fillRect(-14,-8,28,10);g.fillStyle='#ff6b32';g.fillRect(-6,7,12,9)}else{g.fillStyle='#fff4dd';g.beginPath();g.moveTo(0,-12);g.lineTo(7,7);g.lineTo(0,4);g.lineTo(-7,7);g.closePath();g.fill();g.fillStyle='#ff648e';g.fillRect(-4,6,8,7)}}
  else if(b.ship==='hammer'){g.rotate(Math.atan2(b.vy,b.vx)+Math.PI/2);g.fillStyle='#b7ff7d';g.fillRect(-8,-9,16,18);g.fillStyle='#fff';g.fillRect(-14,-5,28,10)}
  else heart(0,0,b.ship==='ribbon'?10:9,b.ship==='ribbon'?'#ff9bd2':'#fff8b8');g.restore();
 }g.shadowBlur=0;
 for(const it of items){const color=it.kind==='heal'?'#ff668e':it.kind==='bomb'?'#fff1a6':it.kind==='star'?'#fff36b':WEAPONS[it.kind].color;g.save();g.translate(it.x,it.y);g.rotate(it.kind==='star'?it.phase:Math.sin(it.phase)*.18);g.shadowBlur=18;g.shadowColor=color;g.fillStyle='#fff8e8';g.strokeStyle=color;g.lineWidth=4;g.beginPath();if(it.kind==='star'){for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?6:14;g.lineTo(Math.cos(a)*r,Math.sin(a)*r)}g.closePath()}else g.arc(0,0,14,0,7);g.fill();g.stroke();if(it.kind==='heal')heart(0,0,11,'#ff668e');else if(it.kind!=='star'){g.fillStyle='#51416d';g.font='900 13px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(it.kind==='bomb'?'B':it.kind==='shot'?'S':it.kind==='laser'?'L':'M',0,1)}g.restore()}
 for(const e of enemies)if(!e.dead)drawEnemy(e);drawBossShield();
 for(const b of enemyShots){
  for(let i=0;i<b.trail.length;i++){g.globalAlpha=(1-i/b.trail.length)*.2;g.fillStyle=b.color;g.beginPath();g.arc(b.trail[i].x,b.trail[i].y,b.r*(1-i/b.trail.length),0,7);g.fill()}g.globalAlpha=1;g.save();g.translate(b.x,b.y);g.rotate(b.angle||0);g.shadowBlur=enemyShots.length>260?5:11;g.shadowColor=b.color;g.fillStyle=b.color;g.strokeStyle='#fff';g.lineWidth=b.kind==='mineLine'?1:1.5;g.beginPath();
  if(b.kind==='shuriken'){for(let i=0;i<4;i++){g.rotate(Math.PI/2);g.moveTo(0,0);g.quadraticCurveTo(13,-3,16,-13);g.quadraticCurveTo(4,-9,0,0)}}
  else if(b.kind==='bubble'){g.globalAlpha=.65;g.fillStyle='#b9ffff88';g.arc(0,0,b.r+Math.sin(b.age*5)*2,0,7);g.moveTo(-3,-4);g.arc(-3,-4,3,0,7)}
  else if(b.kind==='bomb'){g.arc(0,0,b.r,0,7);g.moveTo(4,-9);g.quadraticCurveTo(10,-18,14,-10)}
  else if(b.kind==='tentacle'){g.lineWidth=7;g.moveTo(0,0);g.bezierCurveTo(-18,15,18,30,0,58)}
  else if(b.kind==='yoyo'){g.arc(0,0,b.r,0,7);g.moveTo(0,-b.r);g.lineTo(0,-b.r-18)}
  else if(b.kind==='electron'){g.rotate(Math.atan2(b.vy,b.vx));g.fillStyle='#dfffff';g.rect(-b.r*2,-b.r*.55,b.r*4,b.r*1.1);g.moveTo(-b.r*3,0);g.lineTo(b.r*3,0)}
  else if(b.kind==='mineLine'){g.moveTo(0,-b.r*1.25);g.lineTo(b.r*1.25,0);g.lineTo(0,b.r*1.25);g.lineTo(-b.r*1.25,0);g.closePath()}
  else if(b.shape===1)g.rect(-b.r,-b.r,b.r*2,b.r*2);else if(b.shape===2){g.moveTo(0,-b.r*1.4);g.lineTo(b.r,b.r);g.lineTo(-b.r,b.r);g.closePath()}else g.arc(0,0,b.r,0,7);
  g.fill();g.stroke();g.restore();
 }
 for(const p of particles){g.globalAlpha=Math.min(1,p.l*2);g.fillStyle=p.color;g.fillRect(p.x,p.y,p.s,p.s)}g.globalAlpha=1;
 for(const n of notes){g.globalAlpha=Math.max(0,1-n.r/650);if(n.kind==='bear'){g.fillStyle='#ffb1d5';g.beginPath();g.arc(n.x-7,n.y-7,7,0,7);g.arc(n.x+7,n.y-7,7,0,7);g.arc(n.x,n.y,14,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(n.x,n.y+3,7,0,7);g.fill()}else if(n.kind==='napalm'){g.strokeStyle='#ff8a32';g.lineWidth=10;g.beginPath();g.arc(n.x,n.y,n.r,0,7);g.stroke()}else{g.strokeStyle='#fff';g.lineWidth=5;g.beginPath();g.arc(n.x,n.y,n.r,0,7);g.stroke()}}g.globalAlpha=1;
 if(player&&mode!=='title'){drawDrones();drawPlayer()}
 drawFinale();
 if(player&&mode!=='title'){
  g.textAlign='left';g.textBaseline='alphabetic';g.fillStyle='#20193dbb';g.fillRect(12,H-48,250,36);g.font='900 11px sans-serif';
  g.fillStyle=WEAPONS.shot.color;g.fillText('S '+player.levels.shot,20,H-27);g.fillStyle=WEAPONS.laser.color;g.fillText('L '+player.levels.laser,78,H-27);g.fillStyle=WEAPONS.missile.color;g.fillText('M '+player.levels.missile,136,H-27);g.fillStyle='#fff';g.fillText('CUSTOM',190,H-27);
  g.fillStyle='#fff';g.font='900 13px sans-serif';g.fillText('LIFE',270,H-27);for(let i=0;i<player.hp;i++)heart(314+i*16,H-29,9,'#ff7298');
  g.fillText('B',398,H-27);for(let i=0;i<player.bombs;i++){g.fillStyle='#fff1a6';g.beginPath();g.arc(416+i*12,H-32,4.5,0,7);g.fill()}
  if(player.power>0){g.fillStyle='#fff36b';g.font='900 11px sans-serif';g.fillText('STAR '+player.power.toFixed(1),270,H-54)}
  if(skillDodges>0){g.fillStyle='#8ffaff';g.font='900 11px sans-serif';g.fillText('BREAK '+skillDodges,20,H-55)}g.fillStyle=player.drones.length?'#fff36b':'#c9f8ff';g.font='900 10px sans-serif';g.fillText(player.drones.length?'FNL ACTIVE':'FNL '+Math.min(999,Math.floor(player.funnelGauge))+'/999',112,H-55)
 }
 if(combo>1){g.fillStyle='#fff';g.font='900 24px sans-serif';g.textAlign='left';g.fillText(combo+(combo===999?' MAX':'')+' COMBO',20,42);g.fillStyle='#ffffff44';g.fillRect(20,51,150,5);g.fillStyle=STAGES[stage].accent;g.fillRect(20,51,150*(comboClock/3),5)}
 if(banner>0){g.fillStyle='#251c4ddd';g.fillRect(0,H/2-72,W,144);g.fillStyle='#fff';g.textAlign='center';g.font='700 14px sans-serif';g.fillText(bossMade?'BOSS — '+STAGES[stage].boss:'STAGE '+(stage+1),W/2,H/2-29);g.font='900 24px sans-serif';g.fillText(bossMade?'「ここから先は、夜のものだ」':STAGES[stage].name,W/2,H/2+4);g.font='500 12px sans-serif';g.fillText(STAGES[stage].story,W/2,H/2+37)}
 for(const q of callouts){g.globalAlpha=Math.min(1,q.life*2);g.textAlign='center';g.font='900 20px sans-serif';g.lineWidth=5;g.strokeStyle='#251c4d';g.strokeText(q.text,q.x,q.y);g.fillStyle=q.color;g.fillText(q.text,q.x,q.y)}g.globalAlpha=1;
 g.restore();if(flash){g.fillStyle='#fff';g.globalAlpha=flash;g.fillRect(0,0,W,H);g.globalAlpha=1}
}
function loop(now){const dt=Math.min((now-last)/1000||0,.033);last=now;update(dt);draw();requestAnimationFrame(loop)}
addEventListener('keydown',e=>{key.add(e.code);if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyB','KeyP'].includes(e.code))e.preventDefault();if(e.code==='KeyB'&&!e.repeat)bomb();if(e.code==='KeyP'&&!e.repeat&&(mode==='play'||mode==='paused'))togglePause();if(e.code==='Enter'&&mode!=='play'&&mode!=='paused')start()});
addEventListener('keyup',e=>key.delete(e.code));
function move(e){
 if(mode!=='play')return;
 const r=c.getBoundingClientRect();
 if(e.pointerType==='touch'){
  const gain=1.35*ship().speed,dx=(e.clientX-dragX)*W/r.width*gain,dy=(e.clientY-dragY)*H/r.height*gain;
  player.x=clamp(player.x+dx,18,W-18);
  player.y=clamp(player.y+dy,28,H-22);
  dragX=e.clientX;dragY=e.clientY;
 }else{
  player.x=clamp((e.clientX-r.left)*W/r.width,18,W-18);
  player.y=clamp((e.clientY-r.top)*H/r.height,28,H-22);
 }
}
document.addEventListener('pointerdown',e=>{if(e.target===bombBtn||e.target===btn||e.target.closest('.select'))return;if(e.pointerType==='touch'){activeTouches.add(e.pointerId);if(activeTouches.size>=2&&(mode==='play'||mode==='paused')){e.preventDefault();togglePause();lastTapTime=0;return}if(mode!=='play')return;const now=Date.now(),near=Math.hypot(e.clientX-lastTapX,e.clientY-lastTapY)<55;if(now-lastTapTime<310&&near){bomb();lastTapTime=0}else{lastTapTime=now;lastTapX=e.clientX;lastTapY=e.clientY}}if(mode!=='play')return;e.preventDefault();if(activePointer!==null)return;pointer=true;activePointer=e.pointerId;dragX=e.clientX;dragY=e.clientY;if(e.target.setPointerCapture)try{e.target.setPointerCapture(e.pointerId)}catch(_){}if(e.pointerType!=='touch'&&c.contains(e.target))move(e)},{passive:false});
document.addEventListener('pointermove',e=>{if(pointer&&e.pointerId===activePointer){e.preventDefault();move(e)}},{passive:false});
document.addEventListener('pointerup',e=>{activeTouches.delete(e.pointerId);if(e.pointerId===activePointer){pointer=false;activePointer=null}});
document.addEventListener('pointercancel',e=>{activeTouches.delete(e.pointerId);if(e.pointerId===activePointer){pointer=false;activePointer=null}});
c.addEventListener('contextmenu',e=>e.preventDefault());
bombBtn.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();bomb()});
btn.addEventListener('click',()=>mode==='paused'?togglePause():start());
stage6Btn.addEventListener('click',()=>{if(stage6Unlocked)startStage6()});
document.querySelectorAll('[data-difficulty]').forEach(el=>el.addEventListener('click',()=>{if(el.dataset.difficulty==='hell'&&!hellUnlocked)return;selectedDifficulty=el.dataset.difficulty;document.querySelectorAll('[data-difficulty]').forEach(x=>x.classList.toggle('active',x===el));hud()}));
document.querySelectorAll('[data-ship]').forEach(el=>el.addEventListener('click',()=>{selectedShip=el.dataset.ship;document.querySelectorAll('[data-ship]').forEach(x=>x.classList.toggle('active',x===el));hud()}));
document.addEventListener('visibilitychange',()=>{if(document.hidden){pointer=false;activePointer=null;activeTouches.clear();key.clear()}});
hellBtn.hidden=!hellUnlocked;hellBtn.parentElement.classList.toggle('hell-unlocked',hellUnlocked);stage6Btn.hidden=!stage6Unlocked;reset();requestAnimationFrame(loop);
})();
