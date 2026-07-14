(() => {
'use strict';
const c=document.querySelector('#game'),g=c.getContext('2d'),W=480,H=720,RENDER_SCALE=Math.min(2,Math.max(1,window.devicePixelRatio||1));c.width=W*RENDER_SCALE;c.height=H*RENDER_SCALE;g.setTransform(RENDER_SCALE,0,0,RENDER_SCALE,0,0);
const $=s=>document.querySelector(s),scoreEl=$('#score'),comboEl=$('#combo'),stageEl=$('#stage-label'),statusEl=$('#status-label'),over=$('#overlay'),title=$('#overlay-title'),msg=$('#overlay-message'),btn=$('#start-button'),bombBtn=$('#bomb-button'),gameSelect=$('#game-select');
const key=new Set(),R=(a,b)=>Math.random()*(b-a)+a,clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),hit=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)<(a.r+b.r),pad=n=>String(Math.floor(n)).padStart(6,'0');
const STAGES=[
 {name:'さよなら色の丘',sky:['#ffd0dc','#8dbbe9','#4b4779'],accent:'#ff5f89',bullet:'#ffef54',boss:'泣き虫くじら',story:'なくした手紙が、風のなかで呼んでいる。'},
 {name:'雨粒キャンディ通り',sky:['#baf1d8','#5d9dc7','#174b67'],accent:'#24bca4',bullet:'#ff5a36',boss:'忘れもの王子',story:'思い出は甘く、雨あがりだけ少し苦い。'},
 {name:'琥珀時計の砂漠',sky:['#ffd36d','#b55b55','#512d55'],accent:'#ffcb45',bullet:'#36e7ff',boss:'逆さま時計鳥',story:'止まった時間を、ふたりで追い越していく。'},
 {name:'月影サーカス',sky:['#173d59','#17213e','#080d27'],accent:'#f77ac8',bullet:'#ffe45c',boss:'ひとりぼっち団長',story:'拍手の消えたテントで、最後の幕が上がる。'},
 {name:'夜明けを閉じた城',sky:['#3a102d','#120f2c','#050713'],accent:'#ff456c',bullet:'#63f7ff',boss:'永遠夜のノクス',story:'別れを拒む夜へ。朝を連れ戻すために。'}
];
let mode='title',last=0,time=0,stage=0,stageTime=0,score=0,combo=1,comboClock=0,spawnClock=0,bossMade=false,midBossMade=false,banner=0,flash=0,shake=0,pointer=false,activePointer=null,dragX=0,dragY=0,finaleTime=0,finalBoss=null,bombDrops=0,lastHitSound=0,lastTapTime=0,lastTapX=0,lastTapY=0;
const activeTouches=new Set();
let player,shots=[],enemies=[],enemyShots=[],particles=[],notes=[],items=[],callouts=[],bombFx=null,selectedDifficulty='normal',selectedShip='clione';
const DIFFICULTIES={easy:{label:'EASY',enemy:.78,bullets:.72,speed:.78,hp:.82,fire:.78},normal:{label:'NORMAL',enemy:1,bullets:1.3,speed:1,hp:1.3,fire:1},hard:{label:'HARD',enemy:1.28,bullets:1.55,speed:1.18,hp:1.55,fire:1.22}};
const SHIPS={clione:{name:'ルミ',speed:1,damage:1,rate:1,bomb:'クイック・ハート'},ribbon:{name:'メルティ',speed:1.52,damage:.82,rate:.76,bomb:'くまちゃんパレード'},hammer:{name:'ガンガ',speed:.56,damage:1.42,rate:1.18,bomb:'コズミック・ナパーム'}};
const diff=()=>DIFFICULTIES[selectedDifficulty],ship=()=>SHIPS[selectedShip];
const WEAPONS={shot:{name:'TWIN SHOT',color:'#fff3a6'},laser:{name:'HEART LASER',color:'#6ff8ff'},missile:{name:'CHASE MISSILE',color:'#ff8bab'}};
const stars=Array.from({length:55},()=>({x:R(0,W),y:R(0,H),s:R(1,3),v:R(15,55),a:R(.2,.75)}));
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
 const bossMelodies=[[220,262,277,330,220,349,330,277],[196,247,294,262,185,233,277,330],[175,208,247,294,165,196,233,277],[147,175,208,247,139,165,196,233],[110,131,156,185,104,123,147,175]];
 musicTimer=setInterval(()=>{if(mode!=='play')return;
  if(bossMade){const seq=bossMelodies[stage],f=seq[beat++%seq.length];tone(f,.14,beat%2?'sawtooth':'square',.029);tone(f/2,.22,'square',.021);if(beat%2===0)tone(stage>2?58:70,.07,'sawtooth',.038);if(beat%4===3)noise(.035,.008,300)}
  else{const f=melody[beat++%melody.length];tone(f,.22,'triangle',.026);if(beat%4===1)tone(f/2,.3,'sine',.018)}
 },190);
}
function reset(){
 time=stageTime=score=0;stage=0;combo=1;comboClock=0;spawnClock=.7;bossMade=false;midBossMade=false;bombDrops=0;finaleTime=0;finalBoss=null;bombFx=null;shots=[];enemies=[];enemyShots=[];particles=[];notes=[];items=[];callouts=[];
 player={x:W/2,y:H-90,r:3.5,hp:5,bombs:3,cd:0,laserCd:0,missileCd:0,inv:1,power:0,trail:[],drones:[],droneCd:0,droneUnlocked:false,levels:{shot:1,laser:0,missile:0}};
 hud();banner=2.3;
}
function start(){reset();mode='play';gameSelect.classList.add('locked');over.classList.add('hidden');musicStart()}
function hud(){scoreEl.textContent=pad(score);comboEl.textContent='× '+String(combo).padStart(3,'0');stageEl.textContent=diff().label+'・'+ship().name+'　STAGE '+(stage+1)+'　'+STAGES[stage].name;statusEl.textContent='♥'.repeat(player.hp)+'♡'.repeat(5-player.hp)+'　BOMB '+'●'.repeat(player.bombs)+'○'.repeat(5-player.bombs)}
function gameOver(clear=false){
 mode='over';clearInterval(musicTimer);title.innerHTML=clear?'THE END<br>また会う日まで':'DREAM<br>OVER';msg.textContent=clear?'小さな星は、朝を見つけました。':'スコア '+pad(score);btn.textContent=clear?'もう一度':'リトライ';gameSelect.classList.remove('locked');over.classList.remove('hidden');
}
function beginFinale(e){
 mode='finale';finaleTime=0;finalBoss={x:e.x,y:e.y};enemyShots=[];shots=[];items=[];clearInterval(musicTimer);shake=24;flash=1;
 for(let i=0;i<90;i++)burst(e.x+R(-55,55),e.y+R(-35,35),i%2?'#63f7ff':'#ff456c',2);
 tone(110,1.8,'sawtooth',.055);
}
function showEnding(){
 mode='ending';title.innerHTML='MORNING<br>FOUND';msg.innerHTML='夜は消えず、朝の居場所になった。<br>ノクスは最後に笑い、小さな星へ姿を変えた。<br><br>「さよならは、また会うための光。」<br><br>SCORE '+pad(score);btn.textContent='物語をもう一度';over.classList.remove('hidden');
}
function resolveBossDefeat(e){
 if(!e||e.resolved)return;e.resolved=true;e.dead=true;dropItem(e);score+=e.worth*combo;shake=24;burst(e.x,e.y,STAGES[stage].accent,90);tone(150,.8,'triangle',.04);
 if(stage<STAGES.length-1){stage++;stageTime=0;bossMade=false;midBossMade=false;bombDrops=0;beat=0;spawnClock=2;player.bombs=Math.min(5,player.bombs+1);enemyShots=[];shots=[];banner=3;hud()}
 else{hud();beginFinale(e)}
}
function burst(x,y,color,n=12){while(n--){const a=R(0,7),v=R(40,220);particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,l:R(.3,.9),s:R(2,6),color})}}
function dropItem(e){
 if(Math.random()<.035)items.push({x:e.x+R(-12,12),y:e.y-10,r:14,kind:'star',phase:0,vy:62});
 if(e.type==='boss'||Math.random()<(e.type==='tough'?.6:.16)){const types=['shot','laser','missile'],kind=types[Math.floor(R(0,types.length))];items.push({x:e.x,y:e.y,r:13,kind,phase:0,vy:75})}
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
function activateDrones(){
 if(player.droneUnlocked)return;player.droneUnlocked=true;for(let i=0;i<3;i++)player.drones.push({x:player.x,y:player.y,r:7,hp:3,inv:8,phase:i*Math.PI*2/3});callouts.push({x:W/2,y:105,text:'999 COMBO — SHADOW PARADE!',life:2.4,color:'#fff36b'});tone(1318,.3,'triangle',.045);tone(1760,.5,'triangle',.035);
}
function updateDrones(dt){
 player.droneCd-=dt;for(const d of player.drones){d.inv=Math.max(0,d.inv-dt);d.phase+=dt*(1.35+Math.sin(d.phase)*.18);let tx=player.x+Math.cos(d.phase)*58,ty=player.y-18+Math.sin(d.phase)*34,ax=0,ay=0;for(const b of enemyShots){const dx=d.x-b.x,dy=d.y-b.y,dist=Math.hypot(dx,dy);if(dist<105&&dist>1){const risk=(105-dist)/105;ax+=dx/dist*risk;ay+=dy/dist*risk}}const avoid=Math.hypot(ax,ay);if(avoid){tx+=ax/avoid*42;ty+=ay/avoid*34}d.x=clamp(d.x+(tx-d.x)*6.5*dt,16,W-16);d.y=clamp(d.y+(ty-d.y)*6.5*dt,32,H-30)}
 if(player.drones.length&&player.droneCd<=0){const targets=enemies.filter(e=>!e.dead);for(const d of player.drones){const t=targets.reduce((best,e)=>!best||Math.hypot(e.x-d.x,e.y-d.y)<Math.hypot(best.x-d.x,best.y-d.y)?e:best,null);if(t){const a=Math.atan2(t.y-d.y,t.x-d.x);shots.push({x:d.x,y:d.y,r:4,vx:Math.cos(a)*520,vy:Math.sin(a)*520,type:'shot',ship:selectedShip,drone:true,damage:.7*ship().damage})}}player.droneCd=.28}
}
function addEnemy(type=Math.random()<(0.2+stage*.08)?'tough':'small'){
 const tough=type==='tough',scale=stage<2?stage:1.4+(stage-2)*.3,hp=tough?10+scale*7:2+scale*2;
 const max=hp*diff().hp;enemies.push({x:R(45,W-45),y:-35,r:tough?24:15,hp:max,max,v:(tough?55:85)*(.82+stage*.18),phase:R(0,7),shoot:R(1.1,2)/(1+stage*.15),type,worth:tough?800:180});
}
function addMidBoss(){
 const hp=(90+stage*55)*diff().hp;
 midBossMade=true;
 enemies.push({x:W/2,y:-50,r:38,hp,max:hp,v:58,phase:0,shoot:.8,type:'midboss',worth:2500+stage*700});
 banner=1.8;
 tone(196,.35,'sawtooth',.03);
}
function addBoss(){
 const hp=[520,760,900,1100,1750][stage]*diff().hp,r=[66,72,78,86,112][stage];bossMade=true;beat=0;enemyShots=[];enemies.push({x:W/2,y:-r-20,r,hp,max:hp,v:45,phase:0,shoot:1,type:'boss',bossId:stage,worth:8000+stage*5000});banner=3;tone(130,.8,'sawtooth',.04);
}
function hazard(e,q,speed,kind='orb',extra={}){
 speed*=diff().speed;enemyShots.push({x:e.x,y:e.y,r:kind==='bomb'||kind==='bubble'?11:kind==='tentacle'?8:kind==='yoyo'?9:6,vx:Math.cos(q)*speed,vy:Math.sin(q)*speed,color:STAGES[stage].bullet,shape:stage,kind,spin:extra.spin||0,trail:[],...extra});
}
function enemyFire(e){
 const target=player.drones.length&&Math.random()<.62?player.drones[Math.floor(R(0,player.drones.length))]:player,aimed=Math.atan2(target.y-e.y,target.x-e.x);
 if(e.type==='midboss'){
  const count=Math.max(3,Math.round((5+stage)*diff().bullets));
  for(let i=0;i<count;i++)hazard(e,aimed+(i-(count-1)/2)*.2,145+stage*12,stage%2?'shuriken':'orb',{spin:(i%2?1:-1)*.08});
  return;
 }
 if(e.type==='boss'){
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
  return;
 }
 let count=e.type==='boss'?4+stage*2:(e.type==='tough'?1+stage:1),spread=e.type==='boss'?.34:.18,base=aimed,spin=0;
 const speed=(e.type==='boss'?130:100)*(1+stage*.18);
 if(stage===1){base=aimed+Math.sin(e.phase)*.28;spread=.24}
 if(stage===2&&e.type!=='small'){count=e.type==='boss'?14:7;spread=Math.PI*2/count;base=e.phase}
 if(stage===3){spread=.3;spin=(e.phase%2>.9?1:-1)*.65}
 if(stage===4){base=e.type==='boss'?e.phase*2.2:aimed;spread=e.type==='boss'?Math.PI*2/count:.25;spin=e.type==='boss'?.28:0}
 for(let i=0;i<count;i++){const q=base+(stage>=2&&e.type!=='small'?i:(i-(count-1)/2))*spread;enemyShots.push({x:e.x,y:e.y,r:e.type==='boss'?6:4.5,vx:Math.cos(q)*speed,vy:Math.sin(q)*speed,color:STAGES[stage].bullet,shape:stage,spin:spin*(i%2?1:-1),trail:[]})}
}
function bombDamage(bossDamage,otherDamage,color='#fff4a8'){
 enemyShots=[];let defeatedBoss=null;for(const e of enemies){e.hp-=e.type==='boss'?bossDamage:otherDamage;burst(e.x,e.y,color,18);if(e.type==='boss'&&e.hp<=0)defeatedBoss=e;else if(e.hp<=0){e.dead=true;if(e.type==='midboss')dropMidBossRewards(e)}}if(defeatedBoss)resolveBossDefeat(defeatedBoss);enemies=enemies.filter(e=>!e.dead);
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
 if(player.inv>0||player.power>0)return;player.hp--;player.inv=2;player.drones=[];player.droneUnlocked=false;player.levels.shot=Math.max(1,player.levels.shot-1);player.levels.laser=Math.max(0,player.levels.laser-1);player.levels.missile=Math.max(0,player.levels.missile-1);combo=1;comboClock=0;enemyShots=[];shake=15;burst(player.x,player.y,'#fff',30);tone(95,.5,'sawtooth',.05);hud();if(player.hp<=0)gameOver();
}
function update(dt){
 for(const s of stars){s.y+=s.v*dt;if(s.y>H){s.y=0;s.x=R(0,W)}}
 for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.98;p.vy*=.98;p.l-=dt}particles=particles.filter(p=>p.l>0);
 for(const n of notes){n.r+=460*dt;n.a+=dt}notes=notes.filter(n=>n.r<650);
 for(const q of callouts){q.life-=dt;q.y-=16*dt}callouts=callouts.filter(q=>q.life>0);
 flash=Math.max(0,flash-dt*2.5);shake=Math.max(0,shake-dt*30);banner=Math.max(0,banner-dt);
 if(mode==='finale'){
  finaleTime+=dt;player.y-=Math.max(0,18-finaleTime*2)*dt;
  if(finaleTime>1&&Math.floor(finaleTime*4)!==Math.floor((finaleTime-dt)*4))burst(finalBoss.x+R(-50,50),finalBoss.y+R(-35,35),finaleTime<3?'#63f7ff':'#fff2b0',12);
  if(finaleTime>3.2&&finaleTime-dt<=3.2){flash=1;shake=18;tone(523,1.4,'triangle',.05)}
  if(finaleTime>7)showEnding();
  return;
 }
 if(mode!=='play')return;
 time+=dt;stageTime+=dt;player.cd-=dt;player.laserCd-=dt;player.missileCd-=dt;player.inv-=dt;player.power=Math.max(0,player.power-dt);updateBombFx(dt);
 let dx=+(key.has('ArrowRight')||key.has('KeyD'))-+(key.has('ArrowLeft')||key.has('KeyA')),dy=+(key.has('ArrowDown')||key.has('KeyS'))-+(key.has('ArrowUp')||key.has('KeyW'));
 if(dx&&dy){dx*=.707;dy*=.707}player.x=clamp(player.x+dx*300*ship().speed*dt,18,W-18);player.y=clamp(player.y+dy*300*ship().speed*dt,28,H-22);
 player.trail.unshift({x:player.x,y:player.y,l:.3});player.trail=player.trail.slice(0,9);for(const q of player.trail)q.l-=dt;
 updateDrones(dt);
 if(player.cd<=0)fireWeapon();
 if(!midBossMade&&stageTime>=12)addMidBoss();
 if(!bossMade&&stageTime<28&&(spawnClock-=dt)<=0){addEnemy();spawnClock=R(.85,1.25)/(1+stage*.22)/diff().enemy}
 if(!bossMade&&stageTime>=28)addBoss();
 for(const b of shots){
  if(b.type==='missile'){const target=enemies.filter(e=>!e.dead).sort((a,z)=>Math.hypot(a.x-b.x,a.y-b.y)-Math.hypot(z.x-b.x,z.y-b.y))[0];if(target){const a=Math.atan2(target.y-b.y,target.x-b.x);b.vx+=Math.cos(a)*520*dt;b.vy+=Math.sin(a)*520*dt;const sp=Math.hypot(b.vx,b.vy);if(sp>430){b.vx=b.vx/sp*430;b.vy=b.vy/sp*430}}b.life-=dt}
  b.x+=(b.vx||0)*dt;b.y+=(b.vy||-520)*dt;
 }
 for(const it of items){it.y+=it.vy*dt;it.phase+=dt*4;if(hit(player,it)){it.dead=true;if(it.kind==='heal'){player.hp=Math.min(5,player.hp+1);burst(it.x,it.y,'#ff668e',30);tone(880,.5,'sine',.05)}else if(it.kind==='bomb'){player.bombs=Math.min(5,player.bombs+1);burst(it.x,it.y,'#fff1a6',30);tone(740,.15,'square',.035);tone(1046,.3,'triangle',.035)}else if(it.kind==='star'){player.power=7;player.inv=Math.max(player.inv,7);burst(it.x,it.y,'#fff36b',55);[784,988,1175,1568].forEach((f,i)=>setTimeout(()=>tone(f,.3,'triangle',.035),i*70))}else{player.levels[it.kind]=Math.min(3,player.levels[it.kind]+1);burst(it.x,it.y,WEAPONS[it.kind].color,24);tone(1046,.35,'triangle',.045)}score+=500;hud()}}
 for(const e of enemies){
  if(e.type==='boss'){if(e.y<105)e.y+=e.v*dt;else{e.phase+=dt;const range=Math.max(48,130-stage*18);e.x=W/2+Math.sin(e.phase*.65)*range}}
  else if(e.type==='midboss'){e.phase+=dt*1.7;if(e.y<155)e.y+=e.v*dt;else e.x=W/2+Math.sin(e.phase)*145}
  else{
   e.phase+=dt*(2+stage*.25);
   if(stage===0){e.y+=e.v*dt;e.x+=Math.sin(e.phase)*28*dt}
   else if(stage===1){e.y+=e.v*.86*dt;e.x+=Math.sin(e.phase*1.8)*85*dt}
   else if(stage===2){e.y+=e.v*.72*dt;e.x+=Math.cos(e.phase)*70*dt}
   else if(stage===3){e.y+=e.v*(e.y<170?1:.36)*dt;e.x+=Math.sin(e.phase*.7)*110*dt}
   else{e.y+=e.v*1.12*dt;e.x+=(player.x-e.x)*.2*dt+Math.sin(e.phase)*65*dt}
   e.x=clamp(e.x,e.r,W-e.r);
  }
  e.shoot-=dt;if(e.shoot<=0&&e.y>30){enemyFire(e);const lateEase=stage>=2?1.18+stage*.07:1;e.shoot=(e.type==='boss'?R(.78,1.08):R(1.8,2.7))/(1+stage*.13)*lateEase/diff().fire}
  for(const b of shots)if(!b.dead&&!e.dead&&hit(b,e)){if(b.type==='laser'&&b.pierce>0)b.pierce--;else b.dead=true;e.hp-=b.damage||1;combo=Math.min(999,combo+1);if(combo===999)activateDrones();comboClock=3;score+=10*combo;burst(b.x,b.y,WEAPONS[b.type]?.color||STAGES[stage].accent,3);
   sfx('hit');if(e.hp<=0){if(e.type==='boss'){resolveBossDefeat(e);return}else{e.dead=true;if(e.type==='midboss')dropMidBossRewards(e);else dropItem(e);score+=e.worth*combo;shake=e.type==='midboss'?9:3;burst(e.x,e.y,e.type==='midboss'?'#ff668e':STAGES[stage].accent,e.type==='midboss'?42:16);sfx('destroy')}
   }
  }
  if(!e.dead&&hit(player,e))damage();if(e.y>H+50)e.dead=true;
 }
 // コンボ猶予は通常減少。ただし耐久敵へ弾が当たったフレームは最大値へ戻す。
 comboClock-=dt;if(comboClock<=0&&combo>1){combo=1;comboClock=0}
 for(const b of enemyShots){b.trail.unshift({x:b.x,y:b.y});b.trail=b.trail.slice(0,8);if(b.spin){const a=b.spin*dt,cs=Math.cos(a),sn=Math.sin(a),vx=b.vx*cs-b.vy*sn;b.vy=b.vx*sn+b.vy*cs;b.vx=vx}b.age=(b.age||0)+dt;if(b.kind==='yoyo'&&!b.returned&&(b.age>3.1||b.y>H-75)){b.vx*=-1;b.vy*=-1;b.returned=true}if(b.kind==='bubble'&&b.y>H*.48)b.vy=0;b.x+=b.vx*dt;b.y+=b.vy*dt;b.angle=(b.angle||0)+dt*(b.kind==='shuriken'?10:2);
  if(b.kind==='bubble'&&!b.exploded&&b.age>(b.fuse||4.8)&&b.y<player.y-180){b.exploded=true;b.dead=true;const safe=clamp(b.safeX||player.x,65,W-65),n=Math.max(10,Math.round(14*diff().bullets)),sp=112*diff().speed;burst(b.x,b.y,'#8ff7ff',24);for(let i=0;i<n;i++){const a=i*Math.PI*2/n,vx=Math.cos(a)*sp,vy=Math.sin(a)*sp;if(vy>12){const projected=b.x+vx*((H-b.y)/vy);if(Math.abs(projected-safe)<78)continue}enemyShots.push({x:b.x,y:b.y,r:5,vx,vy,color:'#9ffaff',kind:'bubbleBit',trail:[],slow:true})}}
  else if(b.kind==='bomb'&&!b.exploded&&b.age>(b.fuse||3)){b.exploded=true;b.dead=true;burst(b.x,b.y,'#ffb13b',28);for(let i=0;i<16;i++)enemyShots.push({x:b.x,y:b.y,r:5,vx:Math.cos(i*Math.PI/8)*210,vy:Math.sin(i*Math.PI/8)*210,color:'#63f7ff',kind:'orb',trail:[]})}if(!b.dead){for(const d of player.drones)if(!b.dead&&d.inv<=0&&hit(d,b)){b.dead=true;d.hp--;burst(d.x,d.y,'#c9f8ff',12)}if(!b.dead&&hit(player,b))b.dead=true,damage()}}
 player.drones=player.drones.filter(d=>d.hp>0);
 shots=shots.filter(b=>!b.dead&&b.y>-40&&b.x>-40&&b.x<W+40&&(b.life===undefined||b.life>0));items=items.filter(i=>!i.dead&&i.y<H+30);enemies=enemies.filter(e=>!e.dead);enemyShots=enemyShots.filter(b=>!b.dead&&b.x>-30&&b.x<W+30&&b.y>-30&&b.y<H+30);hud();
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
function drawEnemy(e){
 g.save();g.translate(e.x,e.y);g.shadowBlur=15;g.shadowColor=STAGES[stage].accent;
 if(e.type==='boss'){
  const id=e.bossId??stage;g.strokeStyle='#fff';g.lineWidth=3;
  if(id===0){g.fillStyle='#6fd5ed';g.beginPath();g.ellipse(0,0,72,42,0,0,7);g.fill();g.stroke();g.fillStyle='#fff';g.beginPath();g.moveTo(-55,20);g.quadraticCurveTo(-78,60,-22,37);g.fill();heart(18,2,22,'#ff7fa2')}
  else if(id===1){g.fillStyle='#ff875e';g.beginPath();for(let i=0;i<12;i++){const a=i*Math.PI/6,r=i%2?44:76;g.lineTo(Math.cos(a)*r,Math.sin(a)*r)}g.closePath();g.fill();g.stroke();g.fillStyle='#fff0d0';g.beginPath();g.arc(0,0,34,0,7);g.fill()}
  else if(id===2){g.fillStyle='#6b456e';g.beginPath();g.ellipse(0,0,75,55,0,0,7);g.fill();g.stroke();g.fillStyle='#ffc64f';for(let i=-1;i<=1;i++){g.beginPath();g.arc(i*30,-15,13,0,7);g.fill()}g.fillStyle='#fff';g.fillRect(-48,18,96,12)}
  else if(id===3){g.fillStyle='#b65ca4';g.beginPath();g.arc(0,0,62,0,7);g.fill();g.stroke();g.lineWidth=13;for(let i=0;i<6;i++){const a=i*Math.PI/3+e.phase;g.beginPath();g.moveTo(Math.cos(a)*42,Math.sin(a)*42);g.bezierCurveTo(Math.cos(a)*85,Math.sin(a)*85,Math.cos(a+.8)*105,Math.sin(a+.8)*105,Math.cos(a+.3)*125,Math.sin(a+.3)*125);g.stroke()}}
  else{g.shadowBlur=35;g.shadowColor='#63f7ff';g.fillStyle='#090718';g.beginPath();g.ellipse(0,0,112,82,0,0,7);g.fill();g.stroke();g.fillStyle='#ff456c';for(let i=0;i<7;i++){const a=i*Math.PI*2/7+e.phase*.2;g.beginPath();g.moveTo(Math.cos(a)*72,Math.sin(a)*52);g.lineTo(Math.cos(a)*145,Math.sin(a)*118);g.lineTo(Math.cos(a+.16)*78,Math.sin(a+.16)*58);g.fill()}g.fillStyle='#fff';g.beginPath();g.ellipse(0,-5,42,20,0,0,7);g.fill();g.fillStyle='#141027';g.beginPath();g.ellipse(0,-5,16,20,0,0,7);g.fill()}
  g.fillStyle='#40375e';g.beginPath();g.arc(-16,-8,5,0,7);g.arc(16,-8,5,0,7);g.fill();
 }else if(e.type==='midboss'){
  g.fillStyle='#fff0dc';g.strokeStyle='#ff668e';g.lineWidth=4;g.beginPath();g.arc(0,0,36,0,7);g.fill();g.stroke();
  heart(0,3,27,'#ff668e');g.fillStyle='#4d365f';g.beginPath();g.arc(-10,-10,4,0,7);g.arc(10,-10,4,0,7);g.fill();
  g.strokeStyle='#ffe66d';g.lineWidth=6;g.beginPath();g.moveTo(-25,18);g.lineTo(-45,36);g.moveTo(25,18);g.lineTo(45,36);g.stroke();
 }else{
  const col=e.type==='tough'?'#8d79bc':STAGES[stage].accent;heart(0,0,e.r*1.5,col);
  g.fillStyle='#fff0da';g.beginPath();g.arc(0,-2,e.r*.58,0,7);g.fill();g.fillStyle='#40375e';g.beginPath();g.arc(-4,-4,2,0,7);g.arc(4,-4,2,0,7);g.fill();
  g.strokeStyle='#40375e';g.lineWidth=1.5;g.beginPath();g.arc(0,0,5,.2,2.9);g.stroke();g.strokeStyle=col;g.lineWidth=4;g.beginPath();g.moveTo(-e.r,6);g.lineTo(-e.r-9,14+Math.sin(e.phase)*4);g.moveTo(e.r,6);g.lineTo(e.r+9,14-Math.sin(e.phase)*4);g.stroke();
 }
 g.restore();
 if(e.max>10){const w=e.type==='boss'?Math.min(210,e.r*2):70;g.fillStyle='#ffffff55';g.fillRect(e.x-w/2,e.y-e.r-16,w,6);g.fillStyle=STAGES[stage].bullet;g.fillRect(e.x-w/2,e.y-e.r-16,w*Math.max(0,e.hp/e.max),6)}
}
function drawFinale(){
 if(mode!=='finale')return;
 const f=finaleTime,x=finalBoss.x,y=finalBoss.y;
 g.save();g.textAlign='center';
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
 g.globalAlpha=1;for(const b of shots){
  const shotColor=b.ship==='ribbon'?'#ff70c0':b.ship==='hammer'?'#a8ff69':WEAPONS[b.type].color;g.save();g.translate(b.x,b.y);g.shadowBlur=14;g.shadowColor=shotColor;
  if(b.type==='laser'){const w=b.width||5;if(b.ship==='ribbon'){g.fillStyle='#ff88cf';g.beginPath();g.moveTo(0,-32);g.quadraticCurveTo(w*1.4,-12,0,4);g.quadraticCurveTo(-w*1.4,20,0,34);g.quadraticCurveTo(w*1.4,16,0,0);g.quadraticCurveTo(-w*1.4,-16,0,-32);g.fill();g.fillStyle='#fff';g.fillRect(-2,-34,4,68)}else if(b.ship==='hammer'){g.fillStyle='#92ff5f';g.fillRect(-w,-25,w*2,50);g.fillStyle='#fff7a6';g.fillRect(-w*.48,-31,w*.96,62);g.strokeStyle='#456b36';g.lineWidth=3;g.strokeRect(-w,-25,w*2,50)}else{g.fillStyle='#bffcff';g.fillRect(-w,-24,w*2,48);g.fillStyle='#fff';g.fillRect(-w*.42,-29,w*.84,58)}}
  else if(b.type==='missile'){g.rotate(Math.atan2(b.vy,b.vx)+Math.PI/2);if(b.ship==='ribbon'){heart(0,0,14,'#ff7fc8');g.fillStyle='#fff';g.beginPath();g.moveTo(0,-15);g.lineTo(3,-5);g.lineTo(-3,-5);g.fill()}else if(b.ship==='hammer'){g.fillStyle='#a8ff69';g.fillRect(-9,-13,18,20);g.fillStyle='#fff4a6';g.fillRect(-14,-8,28,10);g.fillStyle='#ff6b32';g.fillRect(-6,7,12,9)}else{g.fillStyle='#fff4dd';g.beginPath();g.moveTo(0,-12);g.lineTo(7,7);g.lineTo(0,4);g.lineTo(-7,7);g.closePath();g.fill();g.fillStyle='#ff648e';g.fillRect(-4,6,8,7)}}
  else if(b.ship==='hammer'){g.rotate(Math.atan2(b.vy,b.vx)+Math.PI/2);g.fillStyle='#b7ff7d';g.fillRect(-8,-9,16,18);g.fillStyle='#fff';g.fillRect(-14,-5,28,10)}
  else heart(0,0,b.ship==='ribbon'?10:9,b.ship==='ribbon'?'#ff9bd2':'#fff8b8');g.restore();
 }g.shadowBlur=0;
 for(const it of items){const color=it.kind==='heal'?'#ff668e':it.kind==='bomb'?'#fff1a6':it.kind==='star'?'#fff36b':WEAPONS[it.kind].color;g.save();g.translate(it.x,it.y);g.rotate(it.kind==='star'?it.phase:Math.sin(it.phase)*.18);g.shadowBlur=18;g.shadowColor=color;g.fillStyle='#fff8e8';g.strokeStyle=color;g.lineWidth=4;g.beginPath();if(it.kind==='star'){for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?6:14;g.lineTo(Math.cos(a)*r,Math.sin(a)*r)}g.closePath()}else g.arc(0,0,14,0,7);g.fill();g.stroke();if(it.kind==='heal')heart(0,0,11,'#ff668e');else if(it.kind!=='star'){g.fillStyle='#51416d';g.font='900 13px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(it.kind==='bomb'?'B':it.kind==='shot'?'S':it.kind==='laser'?'L':'M',0,1)}g.restore()}
 for(const e of enemies)if(!e.dead)drawEnemy(e);
 for(const b of enemyShots){
  for(let i=0;i<b.trail.length;i++){g.globalAlpha=(1-i/b.trail.length)*.2;g.fillStyle=b.color;g.beginPath();g.arc(b.trail[i].x,b.trail[i].y,b.r*(1-i/b.trail.length),0,7);g.fill()}g.globalAlpha=1;g.save();g.translate(b.x,b.y);g.rotate(b.angle||0);g.shadowBlur=14;g.shadowColor=b.color;g.fillStyle=b.color;g.strokeStyle='#fff';g.lineWidth=1.5;g.beginPath();
  if(b.kind==='shuriken'){for(let i=0;i<4;i++){g.rotate(Math.PI/2);g.moveTo(0,0);g.quadraticCurveTo(13,-3,16,-13);g.quadraticCurveTo(4,-9,0,0)}}
  else if(b.kind==='bubble'){g.globalAlpha=.65;g.fillStyle='#b9ffff88';g.arc(0,0,b.r+Math.sin(b.age*5)*2,0,7);g.moveTo(-3,-4);g.arc(-3,-4,3,0,7)}
  else if(b.kind==='bomb'){g.arc(0,0,b.r,0,7);g.moveTo(4,-9);g.quadraticCurveTo(10,-18,14,-10)}
  else if(b.kind==='tentacle'){g.lineWidth=7;g.moveTo(0,0);g.bezierCurveTo(-18,15,18,30,0,58)}
  else if(b.kind==='yoyo'){g.arc(0,0,b.r,0,7);g.moveTo(0,-b.r);g.lineTo(0,-b.r-18)}
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
 }
 if(combo>1){g.fillStyle='#fff';g.font='900 24px sans-serif';g.textAlign='left';g.fillText(combo+' COMBO',20,42);g.fillStyle='#ffffff44';g.fillRect(20,51,150,5);g.fillStyle=STAGES[stage].accent;g.fillRect(20,51,150*(comboClock/3),5)}
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
document.querySelectorAll('[data-difficulty]').forEach(el=>el.addEventListener('click',()=>{selectedDifficulty=el.dataset.difficulty;document.querySelectorAll('[data-difficulty]').forEach(x=>x.classList.toggle('active',x===el));hud()}));
document.querySelectorAll('[data-ship]').forEach(el=>el.addEventListener('click',()=>{selectedShip=el.dataset.ship;document.querySelectorAll('[data-ship]').forEach(x=>x.classList.toggle('active',x===el));hud()}));
document.addEventListener('visibilitychange',()=>{if(document.hidden){pointer=false;activePointer=null;activeTouches.clear();key.clear()}});
reset();requestAnimationFrame(loop);
})();
