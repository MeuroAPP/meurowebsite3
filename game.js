// Meuro Market Run, Version 9: endless-runner rides, a journey map across 13 African
// markets, real market prices, missions, daily rewards, Market Rush and live races.
(function(){
'use strict';
var $=function(s){return document.querySelector(s)};
var $$=function(s){return Array.prototype.slice.call(document.querySelectorAll(s))};
var MD=window.MEURO_DATA, ITEMS=MD.ITEMS, DISHES=MD.DISHES, COUNTRIES=MD.COUNTRIES, LEVELS=MD.LEVELS, EPISODES=MD.EPISODES;
function hex(c){return '#'+('000000'+c.toString(16)).slice(-6);}
function fmtFor(n,cc){return MD.fmtC(n,cc);}
function clamp(v,a,b){return v<a?a:v>b?b:v;}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function track(n,p){try{(window.__mq=window.__mq||[]).push([n,p||{}]);if(window.meuroFlush)window.meuroFlush();}catch(e){}}
function seeded(seed){seed=(Math.abs(seed|0)%2147483646)+1;return function(){seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};}
function shuffle(a,rnd){for(var i=a.length-1;i>0;i--){var j=Math.floor(rnd()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;}

/* ================================================ saved progress (this phone, plus cloud when logged in) */
var STORE_KEY='meuro.v9', PLATE_MS=20*60*1000, MAX_PLATES=5;
var KCOLORS=['#F2C230','#4FA866','#2F7FD6','#E5533D','#9B59D0','#16B5A6','#E84393','#F27B2B','#1E1E1E','#F4F1EA'];
var UPGRADES={magnet:{n:'Magnet',d:'Pulls coins and list items to you',base:8,col:'#E5533D',ico:'U'},haggle:{n:'Haggle',d:'Everything costs half price',base:7,col:'#4FA866',ico:'%'},double:{n:'2× coins',d:'Every coin counts twice',base:9,col:'#F6C445',ico:'2×'}};
var UP_COST=[150,300,600,1200,2400];
function defStore(){return {v:1,coins:0,plates:MAX_PLATES,plateAt:Date.now(),levels:{},up:{magnet:0,haggle:0,double:0},colors:['#F2C230'],color:'#F2C230',missions:null,mult:1,sets:0,reward:{last:null,streak:-1},rush:{best:0,meters:0,orders:0},stats:{rides:0,jumps:0,coins:0,veg:0,orders:0,levels:0},cooked:{},tut:0,sound:true,updated:0};}
function loadStore(){try{var s=JSON.parse(localStorage.getItem(STORE_KEY)||'null');if(s&&s.v===1){var d=defStore();Object.keys(d).forEach(function(k){if(s[k]==null)s[k]=d[k];});['up','stats','reward','rush'].forEach(function(k){s[k]=Object.assign({},d[k],s[k]);});return s;}}catch(e){}return defStore();}
var S=loadStore();
function persist(){S.updated=Date.now();try{localStorage.setItem(STORE_KEY,JSON.stringify(S));}catch(e){}queueCloudSave();}
function stars(i){return (S.levels[i]&&S.levels[i].s)||0;}
function passed(i){return stars(i)>0;}
function unlocked(i){return i===0||passed(i-1);}
function totalStars(){return Object.keys(S.levels).reduce(function(a,k){return a+(S.levels[k].s||0);},0);}
function currentLevel(){for(var i=0;i<LEVELS.length;i++)if(!passed(i))return i;return LEVELS.length-1;}
function tickPlates(){if(S.plates>=MAX_PLATES){S.plateAt=Date.now();return;}var n=Math.floor((Date.now()-S.plateAt)/PLATE_MS);if(n>0){S.plates=Math.min(MAX_PLATES,S.plates+n);S.plateAt+=n*PLATE_MS;if(S.plates>=MAX_PLATES)S.plateAt=Date.now();persist();}}
function plateWait(){if(S.plates>=MAX_PLATES)return '';var ms=PLATE_MS-(Date.now()-S.plateAt);ms=Math.max(0,ms);var m=Math.floor(ms/60000),s=Math.floor(ms/1000)%60;return m+':'+('0'+s).slice(-2);}
function loseplate(){tickPlates();if(S.plates>=MAX_PLATES)S.plateAt=Date.now();S.plates=Math.max(0,S.plates-1);persist();}
function addCoins(n){S.coins=Math.max(0,Math.round(S.coins+n));}
function upDur(k){return UPGRADES[k].base+2*(S.up[k]||0);}

/* ---------------- missions (three at a time, Subway Surfers style) */
function genMissions(){var tier=Math.min(3,S.sets),pool=MD.MISSIONS.slice(),rnd=seeded(Date.now()%100000+S.sets*31);shuffle(pool,rnd);
  S.missions=pool.slice(0,3).map(function(m){return {id:m.id,g:m.g[tier],p:0};});}
if(!S.missions||S.missions.length!==3)genMissions();
var missionNews=[];
function mission(id,amount){var changed=false;S.missions.forEach(function(m){if(m.id===id&&m.p<m.g){m.p=Math.min(m.g,m.p+(amount||1));changed=true;if(m.p>=m.g){missionNews.push(missionText(m));toast('Mission done: '+missionText(m),'bonus');sfx('power');}}});
  if(changed&&S.missions.every(function(m){return m.p>=m.g;})){S.mult=Math.min(10,S.mult+1);addCoins(200);S.sets++;missionNews.push('All 3 missions! Rush multiplier now ×'+S.mult+' and +200 coins');toast('Mission set complete: ×'+S.mult+' multiplier!','bonus');genMissions();}
  if(changed)persist();}
function missionText(m){var d=MD.MISSIONS.filter(function(x){return x.id===m.id;})[0];return d.n.replace('{g}',m.g.toLocaleString('en')).replace('{s}',m.g===1?'':'s');}

/* ================================================ sound: effects and a light market groove */
var actx=null, master=null, musicOn=false, musicTimer=null;
function audio(){if(actx)return actx;try{actx=new (window.AudioContext||window.webkitAudioContext)();master=actx.createGain();master.gain.value=.9;master.connect(actx.destination);}catch(e){actx=null;}return actx;}
function tone(f,dur,type,vol,slide,at){if(!actx||!S.sound)return;try{var t=at||actx.currentTime,o=actx.createOscillator(),g=actx.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(f*slide,t+dur);g.gain.setValueAtTime(vol||.1,t);g.gain.exponentialRampToValueAtTime(.0008,t+dur);o.connect(g);g.connect(master);o.start(t);o.stop(t+dur+.02);}catch(e){}}
var noiseBuf=null;
function noise(dur,vol,hp,at){if(!actx||!S.sound)return;try{if(!noiseBuf){noiseBuf=actx.createBuffer(1,actx.sampleRate*.5,actx.sampleRate);var d=noiseBuf.getChannelData(0);for(var i=0;i<d.length;i++)d[i]=Math.random()*2-1;}
  var t=at||actx.currentTime,s=actx.createBufferSource(),f=actx.createBiquadFilter(),g=actx.createGain();s.buffer=noiseBuf;f.type='highpass';f.frequency.value=hp||4000;g.gain.setValueAtTime(vol||.05,t);g.gain.exponentialRampToValueAtTime(.0008,t+dur);s.connect(f);f.connect(g);g.connect(master);s.start(t);s.stop(t+dur+.02);}catch(e){}}
function sfx(k,n){if(!actx)return;switch(k){
  case 'coin':tone(1320,.08,'square',.035);tone(1980,.1,'square',.03,null,actx.currentTime+.05);break;
  case 'good':tone(660,.09,'triangle',.11);tone(990,.14,'triangle',.1,null,actx.currentTime+.07);break;
  case 'combo':var b=520*Math.pow(1.122,Math.min(12,n||1));tone(b,.1,'triangle',.1);tone(b*1.5,.16,'triangle',.08,null,actx.currentTime+.08);break;
  case 'bad':tone(240,.22,'sawtooth',.06,.6);break;
  case 'jump':tone(380,.18,'sine',.08,2.2);break;
  case 'land':noise(.06,.05,800);break;
  case 'crash':noise(.35,.22,300);tone(110,.35,'square',.08,.5);break;
  case 'power':[0,.07,.14].forEach(function(d,i){tone(700+i*220,.12,'triangle',.09,null,actx.currentTime+d);});break;
  case 'horn':tone(420,.16,'square',.05);tone(420,.2,'square',.05,null,actx.currentTime+.22);break;
  case 'goat':tone(520,.3,'sawtooth',.04,.8);tone(560,.25,'sawtooth',.03,.7,actx.currentTime+.05);break;
  case 'win':[523,659,784,1046].forEach(function(f,i){tone(f,.22,'triangle',.1,null,actx.currentTime+i*.12);});break;
  case 'lose':[392,330,262].forEach(function(f,i){tone(f,.28,'triangle',.08,null,actx.currentTime+i*.16);});break;
  case 'tick':tone(880,.06,'sine',.07);break;}}
/* 104 bpm groove: kick, shaker and an agogo bell. Quiet, and only while riding. */
var BEAT=60/104/2, beatStep=0, beatNext=0;
function musicTick(){if(!actx||!musicOn)return;var now=actx.currentTime;if(beatNext<now)beatNext=now+.05;
  while(beatNext<now+.25){var s=beatStep%16;
    if(s===0||s===6||s===10)tone(62,.28,'sine',.16,.5,beatNext);
    if(s%2===1)noise(.04,.018,7000,beatNext);
    if(s===4||s===12)noise(.12,.05,1800,beatNext);
    if([0,3,6,8,11,14].indexOf(s)>-1)tone(s===8?1180:880,.07,'triangle',.022,null,beatNext);
    beatNext+=BEAT;beatStep++;}}
function music(on){musicOn=on&&S.sound;clearInterval(musicTimer);if(musicOn){audio();beatStep=0;musicTimer=setInterval(musicTick,100);}}
function setSound(on){S.sound=on;persist();$('#soundBtn').textContent='Sound: '+(on?'on':'off');$('#psSound').textContent='Sound: '+(on?'on':'off');if(!on)music(false);}

/* ================================================ renderer */
var canvas=$('#c');
var LITE=(function(){try{return localStorage.getItem('meuro.lite')==='1';}catch(e){return false;}})();
var isSmall=LITE||Math.min(innerWidth,innerHeight)<700||matchMedia('(pointer:coarse)').matches;
var renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:!isSmall||devicePixelRatio<2,powerPreference:'high-performance'});
renderer.setPixelRatio(LITE?1:Math.min(devicePixelRatio,isSmall?1.6:2));
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
renderer.shadowMap.enabled=!isSmall;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
var scene=new THREE.Scene();
var FOG=new THREE.Color(0xE9A46A);
scene.fog=new THREE.Fog(FOG,55,isSmall?150:190);
var FAR=isSmall?160:200, SKYR=FAR-22;
var camera=new THREE.PerspectiveCamera(58,1,0.1,FAR);
(function(){var g=new THREE.SphereGeometry(SKYR,32,16);
  var m=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:{top:{value:new THREE.Color(0x2B3F6B)},mid:{value:new THREE.Color(0xF0A262)},low:{value:new THREE.Color(0xF7C98E)}},
    vertexShader:'varying vec3 v;void main(){v=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform vec3 top,mid,low;varying vec3 v;void main(){float h=v.y;vec3 c=mix(low,mid,smoothstep(-.05,.12,h));c=mix(c,top,smoothstep(.12,.6,h));gl_FragColor=vec4(c,1.);}'});
  var sky=new THREE.Mesh(g,m);scene.add(sky);
  var sun=new THREE.Mesh(new THREE.CircleGeometry(14,40),new THREE.MeshBasicMaterial({color:0xFFE2A8,fog:false}));
  sun.scale.setScalar(SKYR/300);scene.add(sun);scene.userData.sky=sky;scene.userData.sun=sun;})();
var hemi=new THREE.HemisphereLight(0xFFE2C0,0x8A6A4E,1.05);scene.add(hemi);
var sunL=new THREE.DirectionalLight(0xFFC27A,1.55);scene.add(sunL);scene.add(sunL.target);
if(renderer.shadowMap.enabled){sunL.castShadow=true;sunL.shadow.mapSize.set(2048,2048);var sc=sunL.shadow.camera;sc.left=-40;sc.right=40;sc.top=40;sc.bottom=-40;sc.near=1;sc.far=140;sunL.shadow.bias=-0.0006;}
scene.add(new THREE.AmbientLight(0xffffff,0.32));

/* ---------------- canvas textures */
function ctex(w,h,draw,rep){var c=document.createElement('canvas');c.width=w;c.height=h;var x=c.getContext('2d');draw(x,w,h);var t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep[0],rep[1]);}t.userData={canvas:c,ctx:x};return t;}
function speckle(x,w,h,base,vars,n,sz){x.fillStyle=base;x.fillRect(0,0,w,h);for(var i=0;i<n;i++){x.fillStyle=vars[i%vars.length];x.globalAlpha=Math.random()*.5+.1;var s=Math.random()*sz+1;x.fillRect(Math.random()*w,Math.random()*h,s,s);}x.globalAlpha=1;}
var GROUND_L=520, GROUND_REP=91, ROAD_L=460, ROAD_REP=20;
var texLaterite=ctex(256,256,function(x,w,h){speckle(x,w,h,'#A85A35',['#8E4527','#BD6B42','#7A3B22','#C98057'],2600,4);},[60,GROUND_REP]);
var texRoad=ctex(256,512,function(x,w,h){speckle(x,w,h,'#3B3836',['#2E2C2B','#4A4644','#55504B','#2A2725'],5000,3);
  x.fillStyle='rgba(235,225,200,.85)';for(var y=0;y<h;y+=128){x.fillRect(w*0.355-3,y,6,64);x.fillRect(w*0.645-3,y,6,64);}
  x.fillStyle='rgba(240,210,120,.9)';x.fillRect(6,0,5,h);x.fillRect(w-11,0,5,h);
  x.globalAlpha=.25;x.fillStyle='#1d1b1a';for(var i=0;i<6;i++){x.beginPath();x.ellipse(Math.random()*w,Math.random()*h,20+Math.random()*30,10+Math.random()*20,Math.random()*3,0,7);x.fill();}x.globalAlpha=1;},[1,ROAD_REP]);
function stripeTex(a,b){return ctex(128,32,function(x,w,h){for(var i=0;i<8;i++){x.fillStyle=i%2?a:b;x.fillRect(i*w/8,0,w/8,h);}});}
function ankaraTex(seed){var pals=[['#F27B2B','#1E4A2A','#F6C445','#2F6E8F'],['#7A3FB5','#F6C445','#E5533D','#0F6B5C'],['#3B8C50','#F27B2B','#FFF3DC','#1C2A6B'],['#C2185B','#FFC107','#00796B','#212121']];var p=pals[seed%pals.length];
  return ctex(128,128,function(x,w,h){x.fillStyle=p[0];x.fillRect(0,0,w,h);for(var i=0;i<4;i++)for(var j=0;j<4;j++){var cx=i*32+16,cy=j*32+16;x.fillStyle=p[1];x.beginPath();x.arc(cx,cy,12,0,7);x.fill();x.fillStyle=p[2];x.beginPath();x.arc(cx,cy,7,0,7);x.fill();x.fillStyle=p[3];x.beginPath();x.arc(cx,cy,3,0,7);x.fill();}},[1,1]);}
function facadeTex(base){return ctex(256,256,function(x,w,h){speckle(x,w,h,base,['rgba(0,0,0,.08)','rgba(255,255,255,.08)'],900,6);
  for(var r=0;r<3;r++)for(var c=0;c<3;c++){var X=20+c*80,Y=24+r*78;x.fillStyle='#2A2522';x.fillRect(X,Y,52,50);x.fillStyle='rgba(255,200,120,'+(Math.random()<.45?.85:.15)+')';x.fillRect(X+4,Y+4,44,42);x.fillStyle='rgba(60,40,30,.7)';x.fillRect(X+24,Y+4,4,42);x.fillRect(X-4,Y+50,60,5);}},[1,1]);}
var texLoader=new THREE.TextureLoader();
var photo={};
function photoTex(k){if(!k)return null;if(!photo[k]){var t=texLoader.load('img/'+k+'.webp',function(){redrawSigns();});t.encoding=THREE.sRGBEncoding;photo[k]=t;}return photo[k];}
var logoImg=new Image();logoImg.src='img/logo.png';var whiteLogo=null;
function makeWhite(){var c=document.createElement('canvas');c.width=logoImg.naturalWidth;c.height=logoImg.naturalHeight;var x=c.getContext('2d');x.drawImage(logoImg,0,0);x.globalCompositeOperation='source-in';x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);whiteLogo=c;}

/* Market signs change with the country you ride in */
var SIGNSETS={
  ng:[['JOLLOF SPOT','Party rice daily','jollof','#B8321F'],['MAMA T BUKA','Amala · Ewedu','amala','#1E4A2A'],['SUYA CORNER','Hot from 6pm','suya','#5A2A14'],['PEPPER SOUP','Goat · Catfish','peppersoup','#3A1F3D'],['SOUP KITCHEN','Egusi · Okra','egusi','#2F4F6E'],['RICE & STEW','Lunch till 4pm','stew-rice','#7A3B22'],['EFO HOUSE','Efo riro & swallow','efo-riro','#244D2B'],['FRIED RICE','Small chops too','fried-rice','#6E4A12']],
  gh:[['WAAKYE JOINT','Every morning','waakye','#7A2A14'],['CHOP BAR','Fufu & light soup','light-soup','#1E4A2A'],['RED RED','Beans & plantain','red-red','#9A2A1E'],['BANKU SPOT','Tilapia grill','banku','#2F4F6E'],['KONTOMIRE','Stew & rice','kontomire','#244D2B']],
  bj:[['MAQUIS','Amiwo & poisson','amiwo','#7A3B22'],['TELIBO','Sauce gombo','telibo-gombo','#1E4A2A'],['SALADE','Pain & avocat','salade','#2F6E3F'],['ARACHIDE','Sauce du jour','telibo-arachide','#6E4A12']],
  sn:[['THIEB','Midi tous les jours',null,'#1E4A6E'],['DIBITERIE','Grillades',null,'#7A2A14'],['YASSA','Poulet & oignon',null,'#6E4A12']],
  ci:[['GARBA','Attiéké & thon',null,'#B8501F'],['MAQUIS','Poisson braisé',null,'#1E4A2A'],['ALLOCO','Banane frite',null,'#6E4A12']],
  cm:[['NDOLE','Plat du jour',null,'#1E4A2A'],['POULET DG','Le vrai',null,'#7A2A14'],['BEIGNETS','Haricots',null,'#6E4A12']],
  ke:[['NYAMA CHOMA','Grilled daily',null,'#7A2A14'],['HOTEL','Chapati & beans',null,'#1E4A6E'],['MAMA MBOGA','Fresh sukuma',null,'#244D2B']],
  et:[['BUNNA','Coffee ceremony',null,'#4A2A14'],['DORO WAT','Injera fresh',null,'#9A2A1E'],['SHIRO BET','Fasting food',null,'#6E4A12']],
  ug:[['ROLEX','Rolled hot',null,'#9A6A12'],['LUWOMBO','Matoke & sauce',null,'#244D2B'],['MANDAZI','Fresh daily',null,'#7A3B22']],
  tz:[['MAMA NTILIE','Wali & maharage',null,'#1E4A6E'],['MISHKAKI','Grills tonight',null,'#7A2A14'],['CHIPS MAYAI','Fresh',null,'#6E4A12']],
  za:[['KOTA','Bunny chow',null,'#7A2A14'],['SHISA NYAMA','Braai daily',null,'#4A2A14'],['PAP & VLEIS','Lunch',null,'#244D2B']],
  eg:[['KOSHARY','Since 1950',null,'#9A2A1E'],['FUL & TAAMEYA','Breakfast',null,'#6E4A12'],['MOLOKHIA','Plat du jour',null,'#244D2B']],
  ma:[['TAGINE','Plat du jour',null,'#9A4A12'],['HARIRA','Ftour',null,'#7A2A14'],['COUSCOUS','Vendredi',null,'#6E4A12']]
};
var SIGNSET=SIGNSETS.ng, themeCC='ng';
var signTextures=[];
function signTex(idx,arch){
  var t=ctex(1024,320,function(){});t.userData.idx=idx;t.userData.arch=arch;
  t.userData.draw=function(){var x=t.userData.ctx,w=1024,h=320;x.clearRect(0,0,w,h);
    var s=arch?arch:SIGNSET[t.userData.idx%SIGNSET.length];var title=s[0],sub=s[1],pk=s[2],bg=s[3];
    x.fillStyle=bg;x.fillRect(0,0,w,h);var left=40;
    var pt=pk&&photo[pk],im=pt&&pt.image;if(im instanceof HTMLImageElement&&im.complete&&im.naturalWidth){var sc=Math.max(300/im.width,240/im.height);x.save();x.beginPath();if(x.roundRect)x.roundRect(40,40,300,240,24);else x.rect(40,40,300,240);x.clip();x.drawImage(im,40+(300-im.width*sc)/2,40+(240-im.height*sc)/2,im.width*sc,im.height*sc);x.restore();left=380;}
    if(arch&&whiteLogo){var lh=54,lw=whiteLogo.width*lh/whiteLogo.height;x.drawImage(whiteLogo,left,52,lw,lh);}
    x.fillStyle='#fff';x.font='700 '+(title.length>12?84:100)+'px "Bricolage Grotesque", "Avenir Next", sans-serif';x.textBaseline='alphabetic';x.fillText(title,left,arch?205:180);
    x.fillStyle='rgba(255,255,255,.82)';x.font='600 46px Figtree, Arial, sans-serif';x.fillText(sub,left,arch?268:250);
    t.needsUpdate=true;};
  t.userData.draw();signTextures.push(t);return t;}
function redrawSigns(){signTextures.forEach(function(t){t.userData.draw();});}
function setTheme(cc){if(!SIGNSETS[cc])cc='ng';themeCC=cc;SIGNSET=SIGNSETS[cc];SIGNSET.forEach(function(s){photoTex(s[2]);});redrawSigns();}
logoImg.addEventListener('load',function(){makeWhite();redrawSigns();});if(logoImg.complete&&logoImg.naturalWidth)makeWhite();
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(redrawSigns);
SIGNSET.forEach(function(s){photoTex(s[2]);});

/* ---------------- materials */
function std(c,o){return new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.8,metalness:0},o||{}));}
var M={wood:std(0x7A4E2D),woodDark:std(0x4E3220),pole:std(0x55524E,{metalness:.4,roughness:.5}),roof:std(0x7B4B30,{metalness:.3,roughness:.6}),
  skin:std(0x5A3A26,{roughness:.6}),keke:std(0xF2C230,{roughness:.45,metalness:.15}),kekeGreen:std(0x2F7A46,{roughness:.45}),canvas:std(0x1E2A22,{roughness:.9}),
  black:std(0x161616,{roughness:.7}),chrome:std(0xD9DDE0,{metalness:.9,roughness:.25}),glass:new THREE.MeshStandardMaterial({color:0xBFE3FF,transparent:true,opacity:.28,roughness:.05,metalness:.2}),
  danfo:std(0xF2B90F,{roughness:.5,metalness:.1}),dark:std(0x1A1F24,{roughness:.3,metalness:.4}),metal:std(0x8A9399,{metalness:.6,roughness:.4}),white:std(0xF4F1EA),orangeM:std(0xF27B2B),goat:std(0xE9E2D2,{roughness:.95}),goatB:std(0x5A3A26,{roughness:.95}),
  coin:std(0xFFC82E,{metalness:.35,roughness:.3,emissive:0xC98A00,emissiveIntensity:.6})};

/* ---------------- ground and road follow the keke (snapped to the texture tiles so nothing slides) */
var ground=new THREE.Mesh(new THREE.PlaneGeometry(220,GROUND_L),std(0xffffff,{map:texLaterite,roughness:1}));
ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
var road=new THREE.Mesh(new THREE.PlaneGeometry(11,ROAD_L),std(0xffffff,{map:texRoad,roughness:.92}));
road.rotation.x=-Math.PI/2;road.position.y=0.02;road.receiveShadow=true;scene.add(road);
var kerbs=[-5.8,5.8].map(function(x){var k=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.18,ROAD_L),new THREE.MeshStandardMaterial({map:stripeTex('#E8E2D2','#2B2B2B'),roughness:.8}));k.material.map.wrapS=k.material.map.wrapT=THREE.RepeatWrapping;k.material.map.repeat.set(1,ROAD_L/2);k.position.set(x,0.09,0);k.receiveShadow=true;scene.add(k);return k;});
function followGround(z){var gt=GROUND_L/GROUND_REP,rt=ROAD_L/ROAD_REP;ground.position.z=Math.round((z-230)/gt)*gt;var rz=Math.round((z-205)/rt)*rt;road.position.z=rz;kerbs.forEach(function(k){k.position.z=rz;});}

/* ---------------- market chunks: built once, recycled ahead of the keke */
var CHUNK=96, NCH=isSmall?3:4;
var sphG=new THREE.SphereGeometry(1,10,8), cylG=new THREE.CylinderGeometry(1,1,1,10), basG=new THREE.CylinderGeometry(1,.78,1,18,1,true), bulbG=new THREE.SphereGeometry(.13,8,6);
var matS=std(0xffffff,{roughness:.45}), matC=std(0xffffff,{roughness:.7}), matB=std(0xffffff,{roughness:.35,metalness:.25,side:THREE.DoubleSide}), matL=new THREE.MeshBasicMaterial({color:0xFFD27A});
var CUR=null; var tmpO=new THREE.Object3D(), tmpC=new THREE.Color();
function put(key,x,y,z,sx,sy,sz,col,rx,ry,rz){var m=CUR[key];if(m.userData.n>=m.userData.cap)return;var i=m.userData.n++;tmpO.position.set(x,y,z);tmpO.rotation.set(rx||0,ry||0,rz||0);tmpO.scale.set(sx,sy,sz);tmpO.updateMatrix();m.setMatrixAt(i,tmpO.matrix);if(col!=null&&m.setColorAt)m.setColorAt(i,tmpC.set(col));}
var R=function(a,b){return a+Math.random()*(b-a);};
var PRODUCE={
  tomatoes:function(x,y,z){for(var i=0;i<26;i++){var a=R(0,6.28),r=Math.sqrt(Math.random())*.5,h=(.5-r)*.45;put('s',x+Math.cos(a)*r,y+.12+h,z+Math.sin(a)*r,.12,.11,.12,[0xD7261E,0xC81E16,0xE33B22][i%3]);}},
  pepper:function(x,y,z){for(var i=0;i<30;i++){var a=R(0,6.28),r=Math.sqrt(Math.random())*.48,h=(.48-r)*.4;put('s',x+Math.cos(a)*r,y+.08+h,z+Math.sin(a)*r,.06,.06,.11,[0xE02A12,0xF0581A,0xB81408][i%3],0,R(0,3),0);}},
  onions:function(x,y,z){for(var i=0;i<18;i++){var a=R(0,6.28),r=Math.sqrt(Math.random())*.45,h=(.45-r)*.4;put('s',x+Math.cos(a)*r,y+.12+h,z+Math.sin(a)*r,.12,.13,.12,[0x8E3A63,0xA24A6E,0x7C2F55][i%3]);}},
  oranges:function(x,y,z){for(var i=0;i<20;i++){var a=R(0,6.28),r=Math.sqrt(Math.random())*.48,h=(.48-r)*.42;put('s',x+Math.cos(a)*r,y+.13+h,z+Math.sin(a)*r,.13,.13,.13,[0x7FA83A,0x9DB848,0xE6A12A][i%3]);}},
  yam:function(x,y,z){for(var i=0;i<6;i++)put('c',x+R(-.5,.5),y+.12+(i>3?.2:0),z+R(-.35,.35),.11,R(.8,1.1),.13,[0x6B4A2E,0x5A3D25][i%2],Math.PI/2,R(0,3),R(-.2,.2));},
  plantain:function(x,y,z){for(var i=0;i<10;i++)put('c',x+R(-.5,.5),y+.08+(i>6?.14:0),z+R(-.35,.35),.06,R(.45,.6),.07,[0xD9C23A,0xB5B83A,0xC9A12C][i%3],Math.PI/2+R(-.2,.2),R(0,3),R(-.3,.3));},
  fish:function(x,y,z){for(var i=0;i<6;i++)put('s',x+R(-.45,.45),y+.08,z+R(-.3,.3),.38,.07,.1,[0xB9C2C8,0x8F9AA2][i%2],0,R(0,3),0);},
  basin:function(x,y,z,fill){put('b',x,y+.16,z,.42,.32,.42,[0x2F6E8F,0xE9E4D8,0xC23B2B,0x3B8C50][Math.floor(Math.random()*4)]);put('c',x,y+.28,z,.38,.06,.38,fill);for(var i=0;i<8;i++){var a=R(0,6.28),r=R(0,.3);put('s',x+Math.cos(a)*r,y+.32,z+Math.sin(a)*r,.06,.04,.06,fill);}},
  greens:function(x,y,z){for(var i=0;i<16;i++)put('s',x+R(-.45,.45),y+R(.1,.28),z+R(-.35,.35),R(.12,.2),R(.04,.08),R(.16,.24),[0x2E6B2A,0x3F8A35,0x24561F][i%3],R(-.5,.5),R(0,3),R(-.5,.5));}
};
var PKEYS=Object.keys(PRODUCE), FILLS=[0xF2EEE3,0xE8D7A1,0x8A5A3A,0xF0C27B,0xD9A35A];
var UMB=['#D63A2F','#F2B632','#2F7FD6','#3B8C50','#F27B2B','#7A3FB5','#E9E4D8'];
var umbTex=UMB.map(function(c,i){return stripeTex(c,i===6?'#3B8C50':'#F4F1EA');});
var umbMats=umbTex.map(function(t){return new THREE.MeshStandardMaterial({map:t,side:THREE.DoubleSide,roughness:.85});});
var awnMats=umbTex.map(function(t){return new THREE.MeshStandardMaterial({map:t,roughness:.8});});
var ankara=[0,1,2,3].map(ankaraTex), ankMats=ankara.map(function(t){return new THREE.MeshStandardMaterial({map:t,roughness:.8});});
var tableG=new THREE.BoxGeometry(3.2,.12,2), legG=new THREE.BoxGeometry(.1,.9,.1), umbG=new THREE.ConeGeometry(2.3,.9,8,1,true), poleG=new THREE.CylinderGeometry(.05,.05,2.8,6);
var bodyG=new THREE.CylinderGeometry(.28,.42,1.2,10), headG=new THREE.SphereGeometry(.2,12,10), tieG=new THREE.SphereGeometry(.27,10,8,0,6.29,0,1.6);
var traders=[];
function stall(g,x,z,side){
  var t=new THREE.Mesh(tableG,M.wood);t.position.set(x,.9,z);t.castShadow=true;t.receiveShadow=true;g.add(t);
  [[-1.5,-.9],[1.5,-.9],[-1.5,.9],[1.5,.9]].forEach(function(p){var l=new THREE.Mesh(legG,M.woodDark);l.position.set(x+p[0],.45,z+p[1]);g.add(l);});
  var u=new THREE.Mesh(umbG,umbMats[Math.floor(Math.random()*UMB.length)]);u.position.set(x-side*.3,3.35,z);u.castShadow=true;g.add(u);
  var p=new THREE.Mesh(poleG,M.pole);p.position.set(x-side*.3,1.6,z);g.add(p);
  PRODUCE[PKEYS[Math.floor(Math.random()*PKEYS.length)]](x-.8,.96,z,FILLS[Math.floor(Math.random()*FILLS.length)]);
  PRODUCE[PKEYS[Math.floor(Math.random()*PKEYS.length)]](x+.8,.96,z,FILLS[Math.floor(Math.random()*FILLS.length)]);
  if(Math.random()<.72){var tg=new THREE.Group();tg.position.set(x+side*1.6,0,z+R(-.5,.5));
    var bd=new THREE.Mesh(bodyG,ankMats[Math.floor(Math.random()*4)]);bd.position.y=.9;bd.castShadow=true;tg.add(bd);
    var hd=new THREE.Mesh(headG,M.skin);hd.position.y=1.72;tg.add(hd);
    if(Math.random()<.7){var tie=new THREE.Mesh(tieG,ankMats[Math.floor(Math.random()*4)]);tie.position.y=1.78;tie.scale.set(1,1.15,1);tg.add(tie);}
    tg.rotation.y=side>0?-Math.PI/2:Math.PI/2;tg.userData.ph=Math.random()*6;traders.push(tg);g.add(tg);}}
var facadeMats=['#E9D9B8','#D9B48C','#C9D6C2','#E4C3A8','#B8C9D9','#E6E0CF'].map(function(c){var t=facadeTex(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1,2);return new THREE.MeshStandardMaterial({map:t,roughness:.9});});
var signIdx=0;
function building(g,x,z,side,w){
  var h=R(6,12),d=7;
  var b=new THREE.Mesh(new THREE.BoxGeometry(d,h,w),facadeMats[Math.floor(Math.random()*facadeMats.length)]);b.position.set(x+side*d/2,h/2,z);b.castShadow=true;b.receiveShadow=true;g.add(b);
  var rf=new THREE.Mesh(new THREE.BoxGeometry(d+.6,.25,w+.4),M.roof);rf.position.set(x+side*d/2,h+.1,z);g.add(rf);
  var aw=new THREE.Mesh(new THREE.BoxGeometry(1.6,.08,w-.6),awnMats[Math.floor(Math.random()*6)]);aw.position.set(x-side*.6,3.1,z);aw.rotation.z=side*.25;g.add(aw);
  if(Math.random()<.75){var sp=new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w-1,6.4),2),new THREE.MeshBasicMaterial({map:signTex(signIdx++),toneMapped:false}));
    sp.position.set(x-side*.05,4.6,z);sp.rotation.y=side>0?-Math.PI/2:Math.PI/2;g.add(sp);}}
var trunkG=null,leafG=null,trunkM=std(0x6E5640),leafM=std(0x3F7A2E,{side:THREE.DoubleSide});
function palm(g,x,z){if(!leafG){leafG=new THREE.PlaneGeometry(4.2,.9,6,1);var lp=leafG.attributes.position;for(var j=0;j<lp.count;j++){var X=lp.getX(j);lp.setZ(j,-Math.pow((X+2.1)/4.2,2)*1.6);}leafG.computeVertexNormals();leafG.translate(2.1,0,0);}
  var pg=new THREE.Group();pg.position.set(x,0,z);var h=R(7,10);
  for(var i=0;i<6;i++){var s=new THREE.Mesh(new THREE.CylinderGeometry(.2-i*.012,.24-i*.012,h/6,8),trunkM);s.position.set(i*.08,h/12+i*h/6,0);s.rotation.z=-.03*i;pg.add(s);}
  for(var k=0;k<9;k++){var lf=new THREE.Mesh(leafG,leafM);lf.position.set(.5,h,0);lf.rotation.set(-Math.PI/2+R(-.2,.2),k*.7,R(-.5,.1));lf.castShadow=true;pg.add(lf);}
  g.add(pg);}
var wireM=M.black;
function buildChunk(){
  var g=new THREE.Group();
  CUR={s:new THREE.InstancedMesh(sphG,matS,3200),c:new THREE.InstancedMesh(cylG,matC,1100),b:new THREE.InstancedMesh(basG,matB,320),l:new THREE.InstancedMesh(bulbG,matL,240)};
  Object.keys(CUR).forEach(function(k){CUR[k].userData={n:0,cap:CUR[k].count};});
  var step=LITE?12:7.5;
  for(var z=-2;z>-CHUNK;z-=step){[-1,1].forEach(function(side){stall(g,side*8.3,z+R(-.6,.6),side);});}
  [-1,1].forEach(function(side){for(var z=0;z>-CHUNK+4;){var w=Math.min(R(7,11),CHUNK+z);if(w<4)break;building(g,side*12.2,z-w/2,side,w);z-=w+R(.2,1.2);if(!LITE&&Math.random()<.25&&z>-CHUNK+3){palm(g,side*R(11.5,12),z-1.2);z-=2.5;}}});
  for(var z2=-8;z2>-CHUNK;z2-=16){
    [-6.4,6.4].forEach(function(x){var p=new THREE.Mesh(new THREE.CylinderGeometry(.08,.1,11,8),M.pole);p.position.set(x,5.5,z2);g.add(p);});
    for(var i=0;i<=16;i++){var t=i/16,x=-6.4+12.8*t,y=10.9-Math.sin(Math.PI*t)*.8;put('l',x,y,z2,1,1,1,[0xFFD27A,0xFF9F5A,0xFFF1C2,0x9BE07A][i%4]);}
    var wire=new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(-6.4,11,z2),new THREE.Vector3(0,9.4,z2),new THREE.Vector3(6.4,11,z2)),12,.02,4),wireM);g.add(wire);}
  Object.keys(CUR).forEach(function(k){var m=CUR[k];m.count=m.userData.n;m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;m.castShadow=(k!=='l');m.receiveShadow=true;m.frustumCulled=false;g.add(m);});
  scene.add(g);return g;}
var chunks=[];for(var ci=0;ci<NCH;ci++)chunks.push(buildChunk());
function resetChunks(z0){chunks.forEach(function(g,i){g.position.z=z0+14-i*CHUNK;});}
function updateChunks(z){chunks.forEach(function(g){if(g.position.z-CHUNK>z+16)g.position.z-=NCH*CHUNK;});}
resetChunks(6);

/* ---------------- finish arch: Meuro Kitchen */
var arch=(function(){var g=new THREE.Group();var col=M.kekeGreen;
  [-6,6].forEach(function(x){var p=new THREE.Mesh(new THREE.BoxGeometry(.6,7.2,.6),col);p.position.set(x,3.6,0);p.castShadow=true;g.add(p);});
  var beam=new THREE.Mesh(new THREE.BoxGeometry(12.6,.5,.6),col);beam.position.y=7.2;g.add(beam);
  var sg=new THREE.Mesh(new THREE.PlaneGeometry(9,2.8),new THREE.MeshBasicMaterial({map:signTex(0,['MEURO KITCHEN','Deliver here',null,'#F27B2B']),toneMapped:false,side:THREE.DoubleSide}));sg.position.set(0,5.5,.32);g.add(sg);
  for(var k=0;k<14;k++){var f=new THREE.Mesh(new THREE.BoxGeometry(.8,.04,.8),k%2?M.black:M.white);f.position.set(-5.2+k*.8,.05,0);g.add(f);}
  g.visible=false;scene.add(g);return g;})();

/* ---------------- keke */
function makeKeke(){
  var g=new THREE.Group();
  var body=new THREE.Mesh(new THREE.BoxGeometry(1.5,.75,2.3),M.keke);body.position.set(0,.85,.25);g.add(body);
  var nose=new THREE.Mesh(new THREE.CylinderGeometry(.35,.7,1.1,12,1,false,0,Math.PI),M.keke);nose.rotation.set(Math.PI/2,0,Math.PI/2);nose.scale.set(1,1,.9);nose.position.set(0,1.05,-1.05);g.add(nose);
  var front=new THREE.Mesh(new THREE.BoxGeometry(1.2,1.2,.5),M.keke);front.position.set(0,1.0,-1.05);g.add(front);
  var stripe=new THREE.Mesh(new THREE.BoxGeometry(1.53,.16,2.32),M.kekeGreen);stripe.position.set(0,.98,.25);g.add(stripe);
  var stripe2=new THREE.Mesh(new THREE.BoxGeometry(1.22,.14,.52),M.kekeGreen);stripe2.position.set(0,1.18,-1.05);g.add(stripe2);
  var roof=new THREE.Mesh(new THREE.BoxGeometry(1.62,.1,2.9),M.canvas);roof.position.set(0,2.35,-.05);g.add(roof);
  var roofEdge=new THREE.Mesh(new THREE.BoxGeometry(1.64,.22,.08),M.kekeGreen);roofEdge.position.set(0,2.28,-1.48);g.add(roofEdge);
  [[-.76,-1.3],[.76,-1.3],[-.76,1.3],[.76,1.3]].forEach(function(p){var pl=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,1.2,6),M.chrome);pl.position.set(p[0],1.78,p[1]);g.add(pl);});
  var ws=new THREE.Mesh(new THREE.PlaneGeometry(1.2,.85),M.glass);ws.position.set(0,1.95,-1.28);ws.rotation.x=-.12;g.add(ws);
  var bar=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,.9,6),M.chrome);bar.rotation.z=Math.PI/2;bar.position.set(0,1.62,-.95);g.add(bar);
  var seat=new THREE.Mesh(new THREE.BoxGeometry(1.4,.18,.7),M.black);seat.position.set(0,1.3,.75);g.add(seat);
  var back=new THREE.Mesh(new THREE.BoxGeometry(1.5,.95,.1),M.canvas);back.position.set(0,1.75,1.37);g.add(back);
  var logoT=ctex(512,160,function(x,w,h){x.fillStyle='#F4F1EA';x.fillRect(0,0,w,h);});
  var drawLogo=function(){var x=logoT.userData.ctx;x.fillStyle='#F4F1EA';x.fillRect(0,0,512,160);if(logoImg.naturalWidth){var lh=100,lw=logoImg.naturalWidth*lh/logoImg.naturalHeight;x.drawImage(logoImg,(512-lw)/2,30,lw,lh);}logoT.needsUpdate=true;};
  drawLogo();logoImg.addEventListener('load',drawLogo);
  var lp=new THREE.Mesh(new THREE.PlaneGeometry(1.15,.36),new THREE.MeshBasicMaterial({map:logoT,toneMapped:false}));lp.position.set(0,1.78,1.44);g.add(lp);
  var plate=new THREE.Mesh(new THREE.PlaneGeometry(.6,.2),new THREE.MeshBasicMaterial({toneMapped:false,map:ctex(256,86,function(x,w,h){x.fillStyle='#fff';x.fillRect(0,0,w,h);x.fillStyle='#1E4A2A';x.font='700 44px Arial';x.textAlign='center';x.fillText('LAG 233 KE',w/2,58);})}));plate.position.set(0,.62,1.43);g.add(plate);
  var wG=new THREE.CylinderGeometry(.33,.33,.22,18);wG.rotateZ(Math.PI/2);
  var wheels=[];[[0,-1.5],[-.72,1.0],[.72,1.0]].forEach(function(p){var w=new THREE.Mesh(wG,M.black);w.position.set(p[0],.33,p[1]);w.castShadow=true;g.add(w);wheels.push(w);var hub=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,.24,10).rotateZ(Math.PI/2),M.chrome);hub.position.copy(w.position);g.add(hub);});
  var hl=new THREE.Mesh(new THREE.SphereGeometry(.13,12,8),new THREE.MeshBasicMaterial({color:0xFFF4CC}));hl.position.set(0,1.35,-1.36);g.add(hl);
  [-.6,.6].forEach(function(x){var tl=new THREE.Mesh(new THREE.BoxGeometry(.18,.1,.04),new THREE.MeshBasicMaterial({color:0xFF3B2B}));tl.position.set(x,1.0,1.42);g.add(tl);});
  var drv=new THREE.Mesh(new THREE.CylinderGeometry(.24,.3,.75,10),std(0x2F6E8F));drv.position.set(0,1.75,-.55);g.add(drv);
  var dh=new THREE.Mesh(new THREE.SphereGeometry(.19,12,10),M.skin);dh.position.set(0,2.27,-.55);g.add(dh);
  var cap=new THREE.Mesh(new THREE.SphereGeometry(.2,12,8,0,6.29,0,1.3),std(0xF27B2B));cap.position.set(0,2.3,-.55);g.add(cap);
  g.traverse(function(o){if(o.isMesh)o.castShadow=true;});
  g.userData.wheels=wheels;return g;}
var keke=makeKeke();scene.add(keke);
var headLight=new THREE.PointLight(0xFFE2A8,0.9,18,2);headLight.position.set(0,1.6,-3);keke.add(headLight);
var shieldMesh=new THREE.Mesh(new THREE.SphereGeometry(2.1,24,16),new THREE.MeshBasicMaterial({color:0x7CF09A,transparent:true,opacity:.14,depthWrite:false,blending:THREE.AdditiveBlending}));shieldMesh.position.y=1.3;shieldMesh.visible=false;keke.add(shieldMesh);
var magnetRing=new THREE.Mesh(new THREE.TorusGeometry(1.8,.06,8,40),new THREE.MeshBasicMaterial({color:0xE5533D,transparent:true,opacity:.7}));magnetRing.rotation.x=Math.PI/2;magnetRing.position.y=.15;magnetRing.visible=false;keke.add(magnetRing);
function setKekeColor(c){try{M.keke.color.set(c);}catch(e){}}
setKekeColor(S.color);

/* ================================================ things on the road */
var LANES=[-3.2,0,3.2];
var ringG=new THREE.TorusGeometry(1.3,.1,8,48), discG=new THREE.CircleGeometry(1.3,36);
var beamG=new THREE.CylinderGeometry(.06,.42,8,16,1,true);beamG.translate(0,4,0);
var haloG=new THREE.SphereGeometry(1,20,14);
var SPH=new THREE.SphereGeometry(1,16,12), CYL=new THREE.CylinderGeometry(1,1,1,16);
function itemMesh(k){
  var it=ITEMS[k],c=it.c,g=new THREE.Group();
  var add=function(geo,mat,x,y,z,sx,sy,sz,rx,ry,rz){var m=new THREE.Mesh(geo,mat);m.position.set(x||0,y||0,z||0);if(sx)m.scale.set(sx,sy,sz);m.rotation.set(rx||0,ry||0,rz||0);g.add(m);return m;};
  var S2=SPH,C=CYL;
  var shine=function(col,o){return std(col,Object.assign({roughness:.35,emissive:col,emissiveIntensity:.18},o||{}));};
  switch(it.a){
    case 'cluster':var s=it.s||.24;[[0,0,0],[.32,0,.1],[-.3,0,.12],[.05,.26,0],[0,0,-.3],[-.18,.22,.15]].forEach(function(p){add(S2,shine(c),p[0]*(s/.24),p[1]*(s/.24),p[2]*(s/.24),s,s*.95,s);});if(k==='tomatoes')add(C,std(0x2E6B2A),0,.5,0,.05,.1,.05);break;
    case 'chili':for(var i=0;i<6;i++)add(S2,shine([c,0xF0581A,0xC81A0A][i%3],{roughness:.25}),Math.cos(i*1.05)*.26,i===5?.2:0,Math.sin(i*1.05)*.26,.12,.12,.3,0,i,0);break;
    case 'leaves':for(var j=0;j<12;j++)add(S2,shine(j%3?c:new THREE.Color(c).multiplyScalar(.8).getHex(),{side:THREE.DoubleSide,roughness:.6}),Math.sin(j)*.25,-.05+j*.035,Math.cos(j*1.7)*.15,.34,.05,.18,R(-.8,.8),j*.55,R(-.6,.6));add(C,std(0xC9A06A),0,-.25,0,.13,.14,.13);break;
    case 'basin':add(new THREE.CylinderGeometry(.62,.44,.38,22,1,true),std([0x2F6E8F,0xC23B2B,0x3B8C50][k.length%3],{side:THREE.DoubleSide,metalness:.3,roughness:.3}));add(new THREE.TorusGeometry(.62,.04,6,28),M.chrome,0,.19,0,1,1,1,Math.PI/2,0,0);add(C,shine(c),0,.13,0,.58,.05,.58);for(var e=0;e<16;e++)add(S2,shine(c),R(-.36,.36),.18,R(-.36,.36),.08,.04,.07);break;
    case 'sack':add(new THREE.BoxGeometry(.9,1.15,.55),std(c,{roughness:.9}));add(new THREE.BoxGeometry(.92,.3,.57),shine(it.c2||0x3B8C50),0,.05,0);add(S2,std(c,{roughness:.9}),0,.62,0,.38,.12,.22);break;
    case 'bottle':add(C,shine(c,{roughness:.12,transparent:true,opacity:.92}),0,0,0,.3,.95,.3);add(C,shine(c),0,.58,0,.13,.25,.13);add(C,std(0xF6C445),0,.75,0,.14,.1,.14);add(new THREE.BoxGeometry(.6,.3,.02),std(0xF4F1EA),0,0,.3);break;
    case 'chicken':add(S2,shine(c,{roughness:.5}),0,0,0,.55,.38,.42);[-1,1].forEach(function(s2){add(S2,shine(0xB97A40),s2*.4,-.05,.22,.17,.15,.32,0,s2*.4,0);add(C,std(0xF1E8D8),s2*.5,-.05,.48,.045,.2,.045,Math.PI/2,0,0);});break;
    case 'meat':add(new THREE.BoxGeometry(.95,.45,.65),shine(c,{roughness:.55}));add(new THREE.BoxGeometry(.97,.09,.67),std(0xF2E6D6),0,.09,0);add(C,std(0xF1E8D8),.5,0,0,.08,.3,.08,0,0,Math.PI/2);break;
    case 'fish':add(S2,shine(c,{metalness:.4,roughness:.3}),0,0,0,.66,.24,.17);add(new THREE.ConeGeometry(.24,.38,4),shine(c,{metalness:.4,roughness:.3}),.8,0,0,1,1,.4,0,0,Math.PI/2);add(S2,M.black,-.46,.07,.14,.045,.045,.03);break;
    case 'pods':for(var o=0;o<7;o++)add(new THREE.ConeGeometry(.1,.7,6),shine(c),Math.cos(o)*.22,0,Math.sin(o)*.22,1,1,1,R(-.5,.5)+Math.PI/2,o,0);break;
    case 'cones':for(var r2=0;r2<4;r2++){add(new THREE.ConeGeometry(.11,.8,8),shine(c),(r2-1.5)*.2,0,0,1,1,1,Math.PI,0,0);add(S2,std(0x3F8A35),(r2-1.5)*.2,.45,0,.07,.14,.07);}break;
    case 'cabbage':add(S2,shine(c),0,0,0,.5,.45,.5);add(S2,shine(0x7FB04A,{side:THREE.DoubleSide}),0,.05,0,.56,.4,.56);break;
    case 'iru':add(S2,shine(0x3F6E2B,{roughness:.8}),0,0,0,.4,.28,.36);for(var q=0;q<8;q++)add(S2,std(c),R(-.18,.18),.24,R(-.14,.14),.07,.06,.07);break;
    case 'tuber':add(C,shine(c,{roughness:.95}),0,0,0,.24,1.25,.28,0,0,Math.PI/2.3);add(C,shine(c,{roughness:.95}),.15,-.1,.25,.2,.9,.22,0,.5,Math.PI/2.1);break;
    case 'bunch':for(var pl=0;pl<5;pl++)add(C,shine(c,{roughness:.6}),(pl-2)*.13,0,0,.09,.95,.11,.3,0,.3-(pl*.14));break;
    case 'cobs':for(var cb=0;cb<3;cb++){add(C,shine(c,{roughness:.5}),(cb-1)*.28,0,0,.13,.8,.13,0,0,(cb-1)*.15);add(new THREE.ConeGeometry(.16,.5,6),std(0x9DB848,{side:THREE.DoubleSide}),(cb-1)*.28,-.45,0,1,1,1,Math.PI,0,(cb-1)*.15);}break;
    case 'eggs':[[0,0,0],[.28,0,.08],[-.28,0,.08],[0,.2,0],[.14,0,-.25],[-.14,0,-.25]].forEach(function(p){add(S2,shine(c,{roughness:.4}),p[0],p[1],p[2],.17,.22,.17);});break;
    case 'can':add(C,shine(c,{roughness:.1}),0,0,0,.2,.85,.2);add(C,shine(0xD62A2A),0,.05,0,.21,.26,.21);add(C,shine(c),0,.55,0,.09,.26,.09);add(C,M.chrome,0,.72,0,.1,.06,.1);break;
    case 'flat':for(var fl=0;fl<4;fl++)add(C,shine(fl%2?c:new THREE.Color(c).multiplyScalar(.85).getHex(),{roughness:.7}),R(-.04,.04),fl*.07,R(-.04,.04),.5,.05,.5);break;
    case 'box':add(new THREE.BoxGeometry(.7,.45,.45),shine(c));add(new THREE.BoxGeometry(.72,.14,.47),shine(0xD62A2A),0,.06,0);break;
  }
  return g;}
function rrect(x,X,Y,W,H,r){x.beginPath();x.moveTo(X+r,Y);x.arcTo(X+W,Y,X+W,Y+H,r);x.arcTo(X+W,Y+H,X,Y+H,r);x.arcTo(X,Y+H,X,Y,r);x.arcTo(X,Y,X+W,Y,r);x.closePath();}
function labelSprite(name,sub,price,kind){
  var t=ctex(640,200,function(x,w,h){
    var bg=kind==='need'?'rgba(22,92,48,.95)':kind==='junk'||kind==='other'?'rgba(120,32,22,.93)':'rgba(92,70,10,.94)';
    rrect(x,10,10,w-20,h-20,56);x.fillStyle=bg;x.fill();x.lineWidth=6;x.strokeStyle=kind==='need'?'#7CF09A':kind==='bonus'?'#F6C445':'#FF8A73';x.stroke();
    var left=46;
    if(kind==='need'){x.fillStyle='#7CF09A';x.beginPath();x.arc(72,h/2,26,0,7);x.fill();x.strokeStyle='#0F3A1E';x.lineWidth=8;x.lineCap='round';x.beginPath();x.moveTo(60,h/2+1);x.lineTo(69,h/2+10);x.lineTo(86,h/2-10);x.stroke();left=116;}
    else if(kind==='bonus'){x.fillStyle='#F6C445';x.font='800 50px Figtree, Arial';x.textBaseline='middle';x.fillText('+',56,h/2+2);left=104;}
    else {x.fillStyle='#FF8A73';x.beginPath();x.arc(72,h/2,26,0,7);x.fill();x.strokeStyle='#5A140C';x.lineWidth=8;x.lineCap='round';x.beginPath();x.moveTo(62,h/2-10);x.lineTo(82,h/2+10);x.moveTo(82,h/2-10);x.lineTo(62,h/2+10);x.stroke();left=116;}
    x.textBaseline='middle';x.fillStyle='#fff';var fs=name.length>15?44:52;x.font='800 '+fs+'px Figtree, Arial, sans-serif';x.fillText(name,left,h/2-24,w-left-36);
    x.fillStyle=kind==='need'?'#CFF7DA':kind==='bonus'?'#FFE7A6':'#FFC9BF';x.font='700 38px Figtree, Arial, sans-serif';x.fillText(sub+'  ·  '+price,left,h/2+30,w-left-36);});
  var s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthWrite:false,depthTest:true,toneMapped:false,fog:false,transparent:true}));s.scale.set(3.6,1.12,1);s.renderOrder=10;return s;}

/* obstacles */
var OBG={busBody:new THREE.BoxGeometry(2.4,2.3,5.6),busRoof:new THREE.BoxGeometry(2.25,.18,5.2),stripe:new THREE.BoxGeometry(2.43,.16,5.63),win:new THREE.BoxGeometry(2.44,.72,4.4),rear:new THREE.PlaneGeometry(2.0,.8),slog:new THREE.PlaneGeometry(2.1,.42),wheel:new THREE.CylinderGeometry(.46,.46,.34,16).rotateZ(Math.PI/2),
  tray:new THREE.BoxGeometry(1.5,.5,1.9),handle:new THREE.CylinderGeometry(.04,.04,1.3,6),post:new THREE.BoxGeometry(.14,1.1,.14),plank:new THREE.BoxGeometry(2.6,.24,.08),hole:new THREE.CircleGeometry(1.25,28),water:new THREE.CircleGeometry(1.0,28)};
var SLOGANS=['NO FOOD FOR LAZY MAN','GOD\'S TIME IS THE BEST','MONEY MISS ROAD','NO TELL MAMA','HUSTLE NO DEY FINISH','OYA COME ON BOARD'];
var slogTex=SLOGANS.map(function(s){return ctex(512,104,function(x,w,h){x.fillStyle='#F2B90F';x.fillRect(0,0,w,h);x.fillStyle='#161616';x.font='800 '+(s.length>18?40:46)+'px Figtree, Arial';x.textAlign='center';x.textBaseline='middle';x.fillText(s,w/2,h/2+2,w-20);});});
var stripeM=new THREE.MeshStandardMaterial({map:stripeTex('#F27B2B','#F4F1EA'),roughness:.7});
var holeM=new THREE.MeshStandardMaterial({color:0x2A1A12,roughness:1}), waterM=new THREE.MeshStandardMaterial({color:0x6E8A9A,roughness:.08,metalness:.5,transparent:true,opacity:.85});
function busMesh(){var g=new THREE.Group();
  var b=new THREE.Mesh(OBG.busBody,M.danfo);b.position.y=1.55;g.add(b);
  var rf=new THREE.Mesh(OBG.busRoof,M.danfo);rf.position.y=2.78;g.add(rf);
  [1.0,1.9].forEach(function(y){var s=new THREE.Mesh(OBG.stripe,M.black);s.position.y=y;g.add(s);});
  var w=new THREE.Mesh(OBG.win,M.dark);w.position.set(0,2.22,-.3);g.add(w);
  var rw=new THREE.Mesh(OBG.rear,M.dark);rw.position.set(0,2.15,2.81);g.add(rw);
  var sl=new THREE.Mesh(OBG.slog,new THREE.MeshBasicMaterial({map:slogTex[Math.floor(Math.random()*slogTex.length)],toneMapped:false}));sl.position.set(0,1.45,2.815);g.add(sl);
  [[-1.1,-1.9],[1.1,-1.9],[-1.1,1.9],[1.1,1.9]].forEach(function(p){var wh=new THREE.Mesh(OBG.wheel,M.black);wh.position.set(p[0],.46,p[1]);g.add(wh);});
  [-.8,.8].forEach(function(x){var tl=new THREE.Mesh(new THREE.BoxGeometry(.3,.16,.04),new THREE.MeshBasicMaterial({color:0xFF3B2B}));tl.position.set(x,.9,2.82);g.add(tl);});
  g.traverse(function(o){if(o.isMesh)o.castShadow=true;});return g;}
function cartMesh(){var g=new THREE.Group();
  var t=new THREE.Mesh(OBG.tray,M.metal);t.position.y=.6;g.add(t);
  var wh=new THREE.Mesh(OBG.wheel,M.black);wh.scale.set(.7,.7,.7);wh.position.set(0,.32,-1.1);g.add(wh);
  [-.5,.5].forEach(function(x){var h=new THREE.Mesh(OBG.handle,M.woodDark);h.rotation.x=Math.PI/2.4;h.position.set(x,.75,1.3);g.add(h);});
  var cols=[0xD7261E,0x8E3A63,0xE02A12,0x6B4A2E];var col=cols[Math.floor(Math.random()*cols.length)];
  for(var i=0;i<16;i++){var s=new THREE.Mesh(SPH,std(col,{roughness:.45}));var r=.14+Math.random()*.06;s.scale.setScalar(r);s.position.set(R(-.55,.55),.9+Math.random()*.25,R(-.75,.75));g.add(s);}
  g.traverse(function(o){if(o.isMesh)o.castShadow=true;});return g;}
function barrierMesh(){var g=new THREE.Group();
  [-1.15,1.15].forEach(function(x){var p=new THREE.Mesh(OBG.post,M.white);p.position.set(x,.55,0);g.add(p);});
  [.55,.95].forEach(function(y){var pl=new THREE.Mesh(OBG.plank,stripeM);pl.position.y=y;g.add(pl);});
  g.traverse(function(o){if(o.isMesh)o.castShadow=true;});return g;}
function holeMesh(){var g=new THREE.Group();var h=new THREE.Mesh(OBG.hole,holeM);h.rotation.x=-Math.PI/2;h.position.y=.035;g.add(h);var w=new THREE.Mesh(OBG.water,waterM);w.rotation.x=-Math.PI/2;w.position.set(.1,.045,.05);g.add(w);
  for(var i=0;i<6;i++){var s=new THREE.Mesh(SPH,std(0x6A5040));s.scale.set(.14,.08,.12);var a=i*1.05;s.position.set(Math.cos(a)*1.3,.06,Math.sin(a)*1.3);g.add(s);}return g;}
function goatMesh(){var g=new THREE.Group();var body=M.goat,dark=M.goatB;
  var b=new THREE.Mesh(SPH,body);b.scale.set(.7,.42,.36);b.position.y=.95;g.add(b);
  var h=new THREE.Mesh(SPH,body);h.scale.set(.26,.24,.2);h.position.set(.78,1.25,0);g.add(h);
  var sn=new THREE.Mesh(SPH,dark);sn.scale.set(.14,.12,.12);sn.position.set(1.0,1.18,0);g.add(sn);
  [-.1,.1].forEach(function(z){var hn=new THREE.Mesh(new THREE.ConeGeometry(.05,.3,6),dark);hn.position.set(.7,1.5,z);hn.rotation.z=.5;g.add(hn);});
  [[-.45,-.18],[-.45,.18],[.45,-.18],[.45,.18]].forEach(function(p){var l=new THREE.Mesh(CYL,dark);l.scale.set(.06,.6,.06);l.position.set(p[0],.35,p[1]);l.userData.leg=1;g.add(l);});
  var sp=new THREE.Mesh(SPH,dark);sp.scale.set(.3,.2,.28);sp.position.set(-.2,1.1,0);g.add(sp);
  g.traverse(function(o){if(o.isMesh)o.castShadow=true;});return g;}
var OBS_DEF={bus:{len:5.6,h:9,make:busMesh,line:['The danfo no dey shift for anybody!','Danfo blocked the road!','Na danfo you jam o!']},
  cart:{len:2.0,h:1.15,make:cartMesh,line:['Mind the wheelbarrow!','You scattered the tomatoes!','Oga, mind my goods!']},
  barrier:{len:.6,h:1.1,make:barrierMesh,line:['Road works! Jump next time.','Na construction be that!']},
  pothole:{len:2.2,h:.35,make:holeMesh,line:['Pothole! Lagos roads sha.','Splash! Jump the potholes.']},
  goat:{len:1.2,h:1.1,make:goatMesh,line:['The goat won this round!','Goat don block road!']}};

/* coins: one instanced mesh, spinning */
var COIN_MAX=260, coinGeo=new THREE.CylinderGeometry(.42,.42,.09,20);coinGeo.rotateX(Math.PI/2);
var coinMesh=new THREE.InstancedMesh(coinGeo,M.coin,COIN_MAX);coinMesh.count=0;coinMesh.frustumCulled=false;scene.add(coinMesh);
/* power-up crates */
var PU={magnet:{col:0xE5533D,ico:'U',n:'Magnet'},haggle:{col:0x4FA866,ico:'%',n:'Haggle'},shield:{col:0x2F7FD6,ico:'◎',n:'Spare tyre'},double:{col:0xF6C445,ico:'2×',n:'2× coins'}};
var puTex={};Object.keys(PU).forEach(function(k){puTex[k]=ctex(256,256,function(x,w,h){x.fillStyle=hex(PU[k].col);x.beginPath();x.arc(w/2,h/2,118,0,7);x.fill();x.lineWidth=12;x.strokeStyle='#fff';x.stroke();x.fillStyle='#fff';x.font='800 '+(PU[k].ico.length>1?110:140)+'px Figtree, Arial';x.textAlign='center';x.textBaseline='middle';x.fillText(PU[k].ico,w/2,h/2+8);});});
var crateG=new THREE.BoxGeometry(1.1,1.1,1.1);
function crateMesh(k){var g=new THREE.Group();var m=new THREE.Mesh(crateG,std(PU[k].col,{emissive:PU[k].col,emissiveIntensity:.45,roughness:.4}));m.position.y=1.4;g.add(m);
  var sp=new THREE.Sprite(new THREE.SpriteMaterial({map:puTex[k],depthWrite:false,toneMapped:false,fog:false,transparent:true}));sp.scale.set(1.3,1.3,1);sp.position.y=2.75;g.add(sp);
  var ring=new THREE.Mesh(ringG,new THREE.MeshBasicMaterial({color:PU[k].col,transparent:true,opacity:.9,fog:false}));ring.rotation.x=Math.PI/2;ring.position.y=.08;ring.scale.setScalar(.8);g.add(ring);
  g.userData.box=m;return g;}

/* ================================================ the run */
var state={mode:'intro',dish:'jollof',z:6,x:0,y:0,vy:0,v:0,lane:1,t:0,got:{},orbit:0};
var RUN=null, TR=null;
var SPAWN_AHEAD=isSmall?150:185;
function makeRun(cfg){
  var d=DISHES[cfg.dish];
  var people=cfg.people||4;
  var list=MD.shoppingList(cfg.dish,people), byK={};list.forEach(function(l){byK[l.k]=l;});
  return {mode:cfg.mode,cfg:cfg,level:cfg.i,dish:cfg.dish,cc:d.r,people:people,list:list,byK:byK,need:d.keys.slice(),
    budget:cfg.budget||MD.budgetFor(cfg.dish,people,1.2),spent:0,got:{},extras:[],decoys:[],hearts:cfg.mode==='rush'?1:3,maxHearts:cfg.mode==='rush'?1:3,hits:0,
    coins:0,dist:0,time:0,L:cfg.mode==='rush'?Infinity:(cfg.length||420),v:0,base:cfg.speed||12,inv:0,shield:false,pu:{magnet:0,haggle:0,double:0},
    combo:0,comboT:0,jumps:0,orders:0,ordersDone:[],powerUsed:0,continues:0,seed:cfg.seed||Date.now()%1e6,over:false,started:false,locked:!!cfg.locked};}
function unitCost(k,run){var l=run.byK[k];if(l)return l.cost;return MD.lineCost(k,1,run.cc);}
function unitQty(k,run){var l=run.byK[k];return l?MD.qtyTxt(k,l.units):MD.qtyTxt(k,1);}
function trackReset(){
  if(TR)TR.objs.forEach(function(o){if(o.g)scene.remove(o.g);});
  var rnd=seeded(RUN.seed);
  TR={objs:[],coins:[],nextZ:-26,row:0,lastObs:-9,lastPower:0,rnd:rnd,slots:[]};
  if(RUN.mode!=='rush'){var n=RUN.need.length,copies=3,tot=n*copies,order=[];
    for(var c=0;c<copies;c++){var o=RUN.need.slice();shuffle(o,rnd);order=order.concat(o);}
    var span=RUN.L-110;order.forEach(function(k,i){TR.slots.push({z:-40-(i+.5)/tot*span,k:k});});}
  coinMesh.count=0;}
function rowGap(){return 8.5+Math.max(RUN.v,RUN.base)*.24;}
function addObj(o){o.done=false;TR.objs.push(o);if(o.g){o.g.position.set(o.x,o.y||0,o.z);scene.add(o.g);}return o;}
function addPickup(k,kind,lane,z){
  var it=ITEMS[k],g=new THREE.Group();
  var col=kind==='need'?0x5BE07F:kind==='bonus'?0xF6C445:0xFF5A3D;
  var ring=new THREE.Mesh(ringG,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.95,fog:false}));ring.rotation.x=Math.PI/2;ring.position.y=.08;g.add(ring);
  var disc=new THREE.Mesh(discG,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.26,depthWrite:false,fog:false}));disc.rotation.x=-Math.PI/2;disc.position.y=.06;g.add(disc);
  var beam=null;if(kind==='need'){beam=new THREE.Mesh(beamG,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.28,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending,fog:false}));g.add(beam);}
  var halo=new THREE.Mesh(haloG,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.1,depthWrite:false,blending:THREE.AdditiveBlending,fog:kind!=='need'}));halo.position.y=1.7;halo.scale.setScalar(1.1);g.add(halo);
  var m=itemMesh(k);m.position.y=1.7;m.scale.setScalar(1.5);g.add(m);
  var price=unitCost(k,RUN);var lb=labelSprite(it.n,unitQty(k,RUN),(MD.isEstimate(k,RUN.cc)?'~':'')+fmtFor(price,RUN.cc),kind);lb.position.y=3.5;g.add(lb);
  return addObj({type:'pick',k:k,kind:kind,lane:lane,x:LANES[lane],z:z,g:g,item:m,halo:halo,beam:beam,label:lb,ph:TR.rnd()*6,len:1.6});}
function coinLine(lane,z,n,arc){for(var i=0;i<n;i++){var y=1.0;if(arc){var t=i/(n-1);y=1.0+Math.sin(t*Math.PI)*1.9;}TR.coins.push({x:LANES[lane],y:y,z:z-i*1.8,done:false,fly:0});}}
function addObstacle(type,lane,z){var def=OBS_DEF[type];var g=def.make();var o={type:'obs',kind:type,lane:lane,x:LANES[lane],z:z,g:g,len:def.len,h:def.h};
  if(type==='goat'){o.x=(TR.rnd()<.5?-1:1)*6.2;o.dir=-Math.sign(o.x);o.tx=LANES[lane];o.active=false;g.rotation.y=o.dir>0?0:Math.PI;}
  if(type==='bus'||type==='cart')g.rotation.y=0;
  return addObj(o);}
function addPower(k,lane,z){return addObj({type:'pow',k:k,lane:lane,x:LANES[lane],z:z,g:crateMesh(k),len:1.6,ph:TR.rnd()*6});}
function decoyKey(){var rnd=TR.rnd,need=RUN.need;
  if(rnd()<.36){var veg=Object.keys(ITEMS).filter(function(k){return ITEMS[k].veg&&need.indexOf(k)<0;});return {k:veg[Math.floor(rnd()*veg.length)],kind:'bonus'};}
  var pool=rnd()<.45?Object.keys(ITEMS).filter(function(k){return ITEMS[k].junk;}):Object.keys(ITEMS).filter(function(k){return !ITEMS[k].veg&&!ITEMS[k].junk&&need.indexOf(k)<0;});
  var k=pool[Math.floor(rnd()*pool.length)];return {k:k,kind:k&&ITEMS[k].junk?'junk':'other'};}
function spawnRow(z){
  var rnd=TR.rnd,cfg=RUN.cfg,lanes=shuffle([0,1,2],rnd),used={},rush=RUN.mode==='rush';
  var nearEnd=!rush&&z<-RUN.L+30;
  if(nearEnd){if(z>-RUN.L+4)coinLine(lanes[0],z,5,false);TR.row++;return;}
  // 1. something from the shopping list
  var gap=rowGap(),slot=null;
  if(!rush){for(var i=0;i<TR.slots.length;i++){var s=TR.slots[i];if(!s.used&&s.z>z-gap/2&&s.z<=z+gap/2){slot=s;s.used=true;break;}}}
  else if(TR.row>2&&rnd()<.42){var left=RUN.need.filter(function(k){return !RUN.got[k];});if(left.length)slot={k:left[Math.floor(rnd()*left.length)]};}
  if(slot){if(!RUN.got[slot.k])addPickup(slot.k,'need',lanes[0],z);else coinLine(lanes[0],z,4,false);used[lanes[0]]=1;}
  // 2. obstacles, never in every lane, and never two obstacle rows in a row
  var obsLanes=[];
  var gapOk=TR.row-TR.lastObs>=2||(TR.row-TR.lastObs===1&&TR.lastObsN===1&&rnd()<.5);
  if(z<-34&&gapOk&&rnd()<cfg.obstacles){
    var free=lanes.filter(function(l){return !used[l];});
    var n=Math.min((cfg.doubles&&rnd()<.38&&TR.row-TR.lastObs>=2)?2:1,free.length-(slot?0:1));
    if(cfg.goats&&rnd()<.14&&!slot){addObstacle('goat',free[0],z);TR.lastObs=TR.row;TR.lastObsN=2;used[free[0]]=1;obsLanes.push(free[0]);}
    else{for(var j=0;j<n;j++){var ln=free[j];var r=rnd();var type=r<.42?'bus':r<.64?'cart':r<.82?'pothole':'barrier';addObstacle(type,ln,z);used[ln]=1;obsLanes.push(ln);}
      TR.lastObs=TR.row;TR.lastObsN=n;}}
  var freeNow=lanes.filter(function(l){return !used[l];});
  // 3. a tempting extra (bonus veg is good, anything else wastes money)
  if(freeNow.length&&rnd()<cfg.decoys&&TR.row>1){var dk=decoyKey();if(dk.k){addPickup(dk.k,dk.kind,freeNow[0],z-gap*.4);used[freeNow[0]]=1;freeNow.shift();}}
  // 4. coins: a line in a free lane, or an arc over a low obstacle
  if(obsLanes.length&&rnd()<.35){var lo=TR.objs.filter(function(o){return o.type==='obs'&&o.z===z&&o.kind!=='bus'&&o.kind!=='goat';})[0];if(lo)coinLine(lo.lane,z+4.5,6,true);}
  else if(freeNow.length&&rnd()<.6)coinLine(freeNow[0],z+3,5+Math.floor(rnd()*3),false);
  // 5. power-up crate now and then
  if(freeNow.length&&z<TR.lastPower-80&&rnd()<.09){var ks=Object.keys(PU);addPower(ks[Math.floor(rnd()*ks.length)],freeNow[freeNow.length-1],z-gap*.5);TR.lastPower=z;}
  TR.row++;}
function spawnAhead(){while(TR.nextZ>state.z-SPAWN_AHEAD&&(RUN.mode==='rush'||TR.nextZ>-RUN.L-20)){spawnRow(TR.nextZ);TR.nextZ-=rowGap();}}
function clearBehind(){var keep=[];TR.objs.forEach(function(o){if(o.z>state.z+12||o.gone){if(o.g)scene.remove(o.g);}else keep.push(o);});TR.objs=keep;
  if(TR.coins.length>COIN_MAX-20||TR.coins.some(function(c){return c.z>state.z+10;}))TR.coins=TR.coins.filter(function(c){return c.z<=state.z+10&&!c.gone;});}

/* ---------------- controls */
function laneShift(dir){if(state.mode!=='ride'||RUN.locked)return;var n=clamp(state.lane+dir,0,2);if(n!==state.lane){state.lane=n;tone(660,.05,'triangle',.04);tutDone('lane');}}
function jump(){if(state.mode!=='ride'||RUN.locked)return;if(state.y<=.02){state.vy=7.4;RUN.jumps++;mission('jumps');S.stats.jumps++;sfx('jump');tutDone('jump');}}
$('#bLeft').addEventListener('click',function(){laneShift(-1);});
$('#bRight').addEventListener('click',function(){laneShift(1);});
$('#bJump').addEventListener('click',function(){jump();});
addEventListener('keydown',function(e){
  if(state.mode!=='ride'){if(e.key==='Escape'&&state.mode==='paused')resume();return;}
  var k=e.key;if(e.target&&(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'))return;
  if(k==='ArrowLeft'||k==='a'||k==='A'){laneShift(-1);e.preventDefault();}
  else if(k==='ArrowRight'||k==='d'||k==='D'){laneShift(1);e.preventDefault();}
  else if(k==='ArrowUp'||k==='w'||k==='W'||k===' '){jump();e.preventDefault();}
  else if(k==='Escape'||k==='p'||k==='P'){pause();}
  else if(k==='h'||k==='H'){sfx('horn');}});
var sw=null;
canvas.addEventListener('pointerdown',function(e){sw={x:e.clientX,y:e.clientY,t:performance.now(),fired:false};});
canvas.addEventListener('pointermove',function(e){if(!sw||sw.fired)return;var dx=e.clientX-sw.x,dy=e.clientY-sw.y;if(Math.abs(dx)>30&&Math.abs(dx)>Math.abs(dy)*1.1){laneShift(dx>0?1:-1);sw.fired=true;}else if(dy<-34&&Math.abs(dy)>Math.abs(dx)){jump();sw.fired=true;}});
canvas.addEventListener('pointerup',function(e){if(sw&&!sw.fired&&state.mode==='ride'&&performance.now()-sw.t<250&&Math.abs(e.clientX-sw.x)<10&&Math.abs(e.clientY-sw.y)<10){}sw=null;});
canvas.addEventListener('pointercancel',function(){sw=null;});

/* ---------------- collecting */
var GOOD_WORDS=['Sharp!','Correct!','Na so!','Oya!','Mama go proud!','Chef!','On point!','Na you be this!'];
function combo(text,sub){var c=$('#hCombo');c.innerHTML='<span class="pop">'+esc(text)+(sub?'<small>'+esc(sub)+'</small>':'')+'</span>';}
function collect(o){
  o.done=true;var it=ITEMS[o.k],cost=unitCost(o.k,RUN)*(RUN.pu.haggle>0?.5:1);
  if(o.kind==='need'){
    if(RUN.got[o.k]){o.skip=true;return;}
    RUN.got[o.k]=true;state.got=RUN.got;RUN.spent+=cost;bumpCombo();
    sfx(RUN.combo>1?'combo':'good',RUN.combo);toast('+ '+it.n+' · '+unitQty(o.k,RUN)+' · '+fmtFor(cost,RUN.cc),'good');
    var left=RUN.need.filter(function(k){return !RUN.got[k];}).length;
    if(!left){if(RUN.mode==='rush')orderDone();else{combo('List complete!','Ride to Meuro Kitchen');sfx('horn');}}
    else combo(GOOD_WORDS[Math.floor(Math.random()*GOOD_WORDS.length)],RUN.combo>1?'Combo ×'+RUN.combo:left+' to go');
    renderNeed();}
  else if(o.kind==='bonus'){RUN.extras.push(o.k);RUN.spent+=cost;bumpCombo();mission('veg');S.stats.veg++;sfx('combo',RUN.combo);toast('Bonus veg: '+it.n+' · '+fmtFor(cost,RUN.cc),'bonus');combo('Healthy!',RUN.combo>1?'Combo ×'+RUN.combo:'More fibre for the pot');}
  else{RUN.decoys.push(o.k);RUN.spent+=cost;RUN.combo=0;sfx('bad');toast('Not on your list: '+it.n+' −'+fmtFor(cost,RUN.cc),'bad');if(it.junk)combo('Hmm, '+it.n.toLowerCase()+'?','Not on the list');}
  renderWallet();}
function bumpCombo(){RUN.combo=RUN.comboT>0?RUN.combo+1:1;RUN.comboT=5;if(RUN.combo>1){var bonus=Math.min(10,RUN.combo);RUN.coins+=bonus;renderCoins();}}
function orderDone(){RUN.orders++;RUN.ordersDone.push(RUN.dish);RUN.coins+=15;renderCoins();mission('orders');S.stats.orders++;sfx('win');combo('Order delivered!','+250 points · +15 coins');
  var pool=Object.keys(DISHES).filter(function(k){return k!==RUN.dish&&(passed(LEVELS.filter(function(L){return L.dish===k;})[0].i)||DISHES[k].r==='ng');});
  var next=pool[Math.floor(TR.rnd()*pool.length)]||'jollof';newOrder(next);}
function newOrder(dk){RUN.dish=dk;state.dish=dk;RUN.cc=DISHES[dk].r;var list=MD.shoppingList(dk,2),byK={};list.forEach(function(l){byK[l.k]=l;});RUN.list=list;RUN.byK=byK;RUN.need=DISHES[dk].keys.slice();RUN.got={};state.got=RUN.got;
  TR.objs.forEach(function(o){if(o.type==='pick'&&o.kind==='need'&&o.z<state.z-30){o.gone=true;}});
  $('#hDish').textContent=DISHES[dk].n;$('#hThumb').src=dishImg(dk);renderNeed();toast('New order: '+DISHES[dk].n,'bonus');}
function power(o){o.done=true;var k=o.k;RUN.powerUsed++;mission('power');sfx('power');
  if(k==='shield'){RUN.shield=true;shieldMesh.visible=true;combo('Spare tyre!','One crash forgiven');}
  else{RUN.pu[k]=upDur(k);combo(PU[k].n+'!',k==='haggle'?'Half price for '+upDur(k)+'s':k==='magnet'?'Items come to you':'Coins count twice');}
  renderPups();}
function takeCoin(c){c.done=true;c.fly=.25;var n=RUN.pu.double>0?2:1;RUN.coins+=n;sfx('coin');renderCoins();}
function hit(o){
  if(RUN.inv>0)return;
  if(RUN.shield){RUN.shield=false;shieldMesh.visible=false;RUN.inv=1.2;sfx('power');toast('Spare tyre saved you!','bonus');o.done=true;o.gone=o.kind!=='bus';return;}
  RUN.hits++;RUN.hearts--;RUN.inv=1.6;RUN.v*=.42;RUN.combo=0;shake=.45;sfx('crash');flashRed();
  var def=OBS_DEF[o.kind];toast(def.line[Math.floor(Math.random()*def.line.length)],'bad');renderHearts();
  if(o.kind!=='bus')o.done=true;
  if(RUN.hearts<=0){if(RUN.mode==='rush')offerContinue();else endRun('crash');}}
function flashRed(){var f=$('#flash');f.classList.add('on');setTimeout(function(){f.classList.remove('on');},60);}
var shake=0;

/* ---------------- per-frame update */
var tmpM=new THREE.Matrix4(), tmpQ=new THREE.Quaternion(), tmpV=new THREE.Vector3(), tmpS=new THREE.Vector3(1,1,1), yAxis=new THREE.Vector3(0,1,0);
function updateRun(dt){
  if(RUN.locked){RUN.v=0;}
  else{
    RUN.time+=dt;
    var prog=RUN.mode==='rush'?0:clamp(-state.z/RUN.L,0,1);
    var target=RUN.mode==='rush'?Math.min(30,12+RUN.time*.085):RUN.base*(1+.2*prog);
    var acc=RUN.v<target*.8?7:2.2;RUN.v+=Math.sign(target-RUN.v)*Math.min(Math.abs(target-RUN.v),acc*dt);}
  state.v=RUN.v;
  var dz=RUN.v*dt;state.z-=dz;RUN.dist+=dz;
  state.x+=(LANES[state.lane]-state.x)*Math.min(1,dt*12);
  if(state.y>0||state.vy>0){state.vy-=19*dt;state.y+=state.vy*dt;if(state.y<=0){state.y=0;state.vy=0;sfx('land');}}
  if(RUN.inv>0)RUN.inv-=dt;
  if(RUN.comboT>0){RUN.comboT-=dt;if(RUN.comboT<=0)RUN.combo=0;}
  ['magnet','haggle','double'].forEach(function(k){if(RUN.pu[k]>0){RUN.pu[k]-=dt;if(RUN.pu[k]<=0){RUN.pu[k]=0;renderPups();}}});
  magnetRing.visible=RUN.pu.magnet>0;
  spawnAhead();
  // objects
  var mag=RUN.pu.magnet>0;
  for(var i=0;i<TR.objs.length;i++){var o=TR.objs[i];if(o.done||o.gone)continue;
    var d=o.z-state.z;
    if(o.type==='obs'&&o.kind==='goat'){if(!o.active&&d>-RUN.v*1.7-2&&d<0){o.active=true;o.vx=(o.tx-o.x)/Math.max(.6,(-d)/Math.max(6,RUN.v));sfx('goat');}if(o.active){o.x+=o.vx*dt;o.g.position.x=o.x;o.g.children.forEach(function(c,ci){if(c.userData.leg)c.rotation.z=Math.sin(state.t*18+ci)*.5;});if(Math.abs(o.x)>7)o.gone=true;}}
    if(mag&&o.type==='pick'&&o.kind!=='junk'&&o.kind!=='other'&&d<0&&d>-16){o.x+=(state.x-o.x)*Math.min(1,dt*5);o.z+=(state.z-1-o.z)*Math.min(1,dt*3.5);o.g.position.set(o.x,0,o.z);d=o.z-state.z;}
    var ax=Math.abs(o.x-state.x),az=Math.abs(d);
    if(o.type==='pick'){if(az<1.4&&ax<1.5)collect(o);}
    else if(o.type==='pow'){if(az<1.4&&ax<1.5)power(o);}
    else if(o.type==='obs'){var w=o.kind==='goat'?1.0:1.25;if(az<o.len/2+.9&&ax<w){if(state.y<o.h-.15)hit(o);}}}
  // coins
  var n=0;for(var j=0;j<TR.coins.length&&n<COIN_MAX;j++){var c=TR.coins[j];if(c.gone)continue;var cd=c.z-state.z;
    if(!c.done){if(mag&&cd<0&&cd>-18){c.x+=(state.x-c.x)*Math.min(1,dt*7);c.z+=(state.z-c.z)*Math.min(1,dt*5);c.y+=(1.2+state.y-c.y)*Math.min(1,dt*6);cd=c.z-state.z;}
      if(Math.abs(cd)<1.1&&Math.abs(c.x-state.x)<1.3&&Math.abs(c.y-(state.y+1.0))<1.4)takeCoin(c);}
    if(cd>8){c.gone=true;continue;}
    var sy=1;if(c.done){c.fly-=dt;c.y+=dt*9;sy=Math.max(0,c.fly/.25);if(c.fly<=0){c.gone=true;continue;}}
    if(cd<-SPAWN_AHEAD-10)continue;
    tmpQ.setFromAxisAngle(yAxis,state.t*4+j*.3);tmpV.set(c.x,c.y,c.z);tmpS.set(sy,sy,sy);tmpM.compose(tmpV,tmpQ,tmpS);coinMesh.setMatrixAt(n++,tmpM);}
  coinMesh.count=n;coinMesh.instanceMatrix.needsUpdate=true;
  clearBehind();
  // HUD
  if(RUN.mode==='rush'){$('#hScore').firstChild.nodeValue=String(rushScore());}
  else $('#hProg').style.width=clamp(-state.z/RUN.L*100,0,100)+'%';
  if(RUN.mode!=='rush'&&state.z<=-RUN.L)endRun('finish');
  tickPups();}
function animObjs(dt){
  for(var i=0;i<TR.objs.length;i++){var o=TR.objs[i];if(!o.g)continue;var d=state.z-o.z;
    if(o.done&&(o.type==='pick'||o.type==='pow')){if(o.skip){o.g.visible=false;o.gone=true;continue;}o.g.scale.multiplyScalar(.84);o.g.position.y+=dt*6;if(o.g.scale.x<.05)o.gone=true;continue;}
    if(o.done&&o.type==='obs'&&o.kind!=='bus'){o.g.rotation.x+=dt*6;o.g.position.y+=dt*3;o.g.position.z-=dt*2;if(o.g.position.y>3)o.gone=true;continue;}
    if(d>SPAWN_AHEAD+15){o.g.visible=false;continue;}o.g.visible=true;
    if(o.type==='pick'){var near=d<6;o.label.visible=!near;o.halo.visible=d>3;if(o.beam)o.beam.visible=d>4;o.item.rotation.y+=dt*1.6;o.item.position.y=1.7+Math.sin(state.t*2.4+o.ph)*.16;o.halo.scale.setScalar(1.1+Math.sin(state.t*3+o.ph)*.08);}
    else if(o.type==='pow'){o.g.userData.box.rotation.y+=dt*2;o.g.userData.box.position.y=1.4+Math.sin(state.t*3+o.ph)*.2;}}}
function rushScore(){return Math.round((Math.floor(RUN.dist)+RUN.orders*250)*S.mult);}

/* ================================================ HUD */
var ART={};
/* Dishes without a real photo show what you buy for them, laid out on a market tray.
   It is honest: ingredients, not a made-up picture of the finished dish. */
function dishImg(k){var d=DISHES[k];if(!d)return 'img/logo.png';if(d.img)return 'img/'+d.img+'.webp';if(ART[k])return ART[k];
  var c=document.createElement('canvas'),W=320,H=320;c.width=W;c.height=H;var x=c.getContext('2d');var f=COUNTRIES[d.r].flag;
  var g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#3A2A1C');g.addColorStop(1,'#1C140D');x.fillStyle=g;x.fillRect(0,0,W,H);
  for(var i=0;i<3;i++){x.fillStyle=f[i];x.fillRect(i*W/3,0,W/3,10);}
  var cx=W/2,cy=H*.55,R=128;x.fillStyle='rgba(0,0,0,.4)';x.beginPath();x.ellipse(cx+6,cy+12,R+6,R*.9,0,0,7);x.fill();
  x.fillStyle='#C99A5B';x.beginPath();x.ellipse(cx,cy,R,R*.86,0,0,7);x.fill();
  x.save();x.beginPath();x.ellipse(cx,cy,R-12,R*.86-12,0,0,7);x.clip();x.fillStyle='#B4834A';x.fillRect(0,0,W,H);
  x.strokeStyle='rgba(80,50,20,.35)';x.lineWidth=3;for(var a=-W;a<W*2;a+=14){x.beginPath();x.moveTo(a,0);x.lineTo(a+H,H);x.stroke();x.beginPath();x.moveTo(a+H,0);x.lineTo(a,H);x.stroke();}
  x.restore();x.strokeStyle='#8A5E2C';x.lineWidth=6;x.beginPath();x.ellipse(cx,cy,R-6,R*.86-6,0,0,7);x.stroke();
  var ks=d.keys.slice(0,9),n=ks.length,fs=n>6?50:58;x.textAlign='center';x.textBaseline='middle';
  ks.forEach(function(it,ii){var ang=n===1?0:ii/n*Math.PI*2-Math.PI/2,rr=n===1?0:(n>5?70:58);var px=cx+Math.cos(ang)*rr,py=cy+Math.sin(ang)*rr*.82;
    x.fillStyle='rgba(0,0,0,.25)';x.beginPath();x.ellipse(px+3,py+fs*.42,fs*.42,fs*.13,0,0,7);x.fill();
    x.font=fs+'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';x.fillStyle=hex(ITEMS[it].c);x.fillText(EMO[it]||'•',px,py);});
  x.font='700 17px "Bricolage Grotesque",system-ui,sans-serif';x.fillStyle='rgba(255,246,230,.92)';x.textAlign='left';x.fillText('What you buy',18,34);
  ART[k]=c.toDataURL('image/png');return ART[k];}
function toast(text,kind){var box=$('#toasts');if(!box)return;var t=document.createElement('div');t.className='toast glass';var c=kind==='good'?'var(--green-hi)':kind==='bad'?'var(--red)':kind==='bonus'?'var(--gold)':'#fff';var i=document.createElement('i');i.style.background=c;t.appendChild(i);t.appendChild(document.createTextNode(text));box.prepend(t);while(box.children.length>3)box.lastChild.remove();setTimeout(function(){t.style.transition='opacity .4s';t.style.opacity='0';setTimeout(function(){t.remove();},400);},2200);
  if(state.mode!=='ride'&&state.mode!=='paused'){homeToast(text);}}
var htTimer=null;function homeToast(text){var el=$('#homeToast');if(!el){el=document.createElement('div');el.id='homeToast';el.className='toast glass';el.style.cssText='position:fixed;z-index:60;left:50%;transform:translateX(-50%);bottom:calc(var(--sb) + 14px);max-width:calc(100% - 32px)';document.body.appendChild(el);}el.textContent=text;el.hidden=false;clearTimeout(htTimer);htTimer=setTimeout(function(){el.hidden=true;},2600);}
var EMO={rice:'🍚',beans:'🫘',tomatoes:'🍅',tatashe:'🫑',pepper:'🌶️',onions:'🧅',eggs:'🥚',yam:'🍠',garri:'🥣',palmoil:'🛢️',oil:'🫗',chicken:'🍗',beef:'🥩',goat:'🐐',fish:'🐟',dryfish:'🐟',sardines:'🥫',egusi:'🥣',crayfish:'🦐',iru:'🫘',ugu:'🥬',efo:'🥬',bitterleaf:'🌿',waterleaf:'🌿',ewedu:'🌿',kontomire:'🥬',kale:'🥬',eru:'🌿',molokhia:'🌿',lettuce:'🥬',okra:'🫛',peas:'🫛',carrots:'🥕',cabbage:'🥬',avocado:'🥑',lime:'🍋',potatoes:'🥔',plantain:'🍌',matoke:'🍌',cassava:'🍠',elubo:'🌾',maize:'🌽',maizeflour:'🌽',attieke:'🥣',couscous:'🥣',injera:'🌾',lentils:'🫘',chickpeas:'🫘',favabeans:'🫘',groundnuts:'🥜',coconut:'🥥',spaghetti:'🍝',bread:'🍞',chapati:'🫓',pspice:'🧂',yaji:'🧂',berbere:'🧂',curry:'🧂',softdrink:'🥤',cubes:'🧂',sugar:'🍬',noodles:'🍜'};
function renderNeed(){var el=$('#hNeed');el.innerHTML='';RUN.need.forEach(function(k){var i=document.createElement('i');i.title=ITEMS[k].n;i.textContent=EMO[k]||'•';if(RUN.got[k])i.className='got';else i.style.borderColor=hex(ITEMS[k].c);el.appendChild(i);});}
function renderWallet(){if(RUN.mode==='rush')return;var left=RUN.budget-RUN.spent;var w=$('#hWallet');w.textContent=(left<0?'−':'')+fmtFor(Math.abs(left),RUN.cc);w.classList.toggle('over',left<0);
  var bar=$('#hBar');bar.style.width=Math.max(0,left/RUN.budget*100)+'%';bar.style.background=left/RUN.budget<.15?'var(--red)':'var(--gold)';var b=$('#hWalletBox');b.classList.remove('pulse');void b.offsetWidth;b.classList.add('pulse');}
function renderCoins(){$('#hCoins').textContent=RUN.coins;}
var HEART='<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.2 5.3 3.1 1.7-1.9 3.2-3.1 5.3-3.1 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z" fill="#E5533D" stroke="#fff" stroke-width="1.4"/></svg>';
function renderHearts(){var h=$('#hHearts');h.innerHTML='';for(var i=0;i<RUN.maxHearts;i++){var s=document.createElement('span');s.innerHTML=HEART;if(i>=RUN.hearts)s.className='off';h.appendChild(s);}h.setAttribute('aria-label',RUN.hearts+' lives left');}
var pupT=0;
function renderPups(){var box=$('#hPups');box.innerHTML='';['magnet','haggle','double'].forEach(function(k){if(RUN.pu[k]>0){var d=document.createElement('div');d.className='pup';d.dataset.k=k;d.innerHTML='<i style="background:'+hex(PU[k].col)+'">'+esc(PU[k].ico)+'</i>'+esc(PU[k].n)+'<span class="pb"><span></span></span>';box.appendChild(d);}});
  if(RUN.shield){var d=document.createElement('div');d.className='pup';d.innerHTML='<i style="background:#2F7FD6;color:#fff">◎</i>Spare tyre';box.appendChild(d);}}
function tickPups(){pupT-=1;if(pupT>0)return;pupT=6;$$('#hPups .pup[data-k]').forEach(function(d){var k=d.dataset.k;var sp=d.querySelector('.pb span');if(sp)sp.style.width=clamp(RUN.pu[k]/upDur(k)*100,0,100)+'%';});}

/* ---------------- tutorial (first ride only) */
var TUT={step:0};
function tutShow(){var t=$('#tut');if(S.tut>=2||RUN.mode==='race'){t.hidden=true;return;}
  t.hidden=false;t.innerHTML=S.tut===0?'<span class="hand">👆</span> Swipe left or right to change lane':'Swipe up or tap Jump to hop over carts';}
function tutDone(kind){if(!RUN||S.tut>=2)return;if(S.tut===0&&kind==='lane'){S.tut=1;persist();setTimeout(tutShow,600);}else if(S.tut===1&&kind==='jump'){S.tut=2;persist();$('#tut').hidden=true;}}

/* ================================================ start and finish a ride */
var hud=$('#hud');
function showOnly(id){['home','map','result'].forEach(function(s){var e=$('#'+s);if(e)e.hidden=s!==id;});if(id!=='ride'){hud.classList.remove('on');hud.hidden=true;}}
function startRun(cfg){
  if(cfg.mode==='level'){tickPlates();if(S.plates<=0){openPlates();return false;}}
  audio();if(actx&&actx.state==='suspended')actx.resume();
  closeAllModals();
  RUN=makeRun(cfg);state.mode='ride';state.dish=RUN.dish;state.z=6;state.x=0;state.lane=1;state.y=0;state.vy=0;state.got=RUN.got;state.race=cfg.mode==='race';state.daily=cfg.mode==='daily';
  setTheme(RUN.cc);resetChunks(6);followGround(6);
  arch.visible=RUN.mode!=='rush';arch.position.z=-RUN.L;
  trackReset();spawnAhead();
  shieldMesh.visible=false;
  var d=DISHES[RUN.dish];
  $('#hDish').textContent=RUN.mode==='rush'?d.n:(d.n+' for '+RUN.people);$('#hThumb').src=dishImg(RUN.dish);
  $('#hWalletBox').hidden=RUN.mode==='rush';$('#hProgBox').hidden=RUN.mode==='rush';
  var sc=$('#hScore');sc.hidden=RUN.mode!=='rush';sc.innerHTML='0<small>×'+S.mult+' multiplier</small>';
  $('#pauseBtn').hidden=false;
  $('#toasts').innerHTML='';$('#hCombo').innerHTML='';
  renderNeed();renderWallet();renderCoins();renderHearts();renderPups();
  showOnly('ride');hud.hidden=false;requestAnimationFrame(function(){hud.classList.add('on');});
  $('#raceMini').hidden=RUN.mode!=='race';
  tutShow();
  if(RUN.mode!=='race'){RUN.locked=true;countdown(['Ready','GO!'],520,function(){RUN.locked=false;});sfx('horn');}
  music(true);
  track('ride_start',{mode:RUN.mode,dish:RUN.dish,level:RUN.level});
  if(LIVE&&LIVE.room)lobbyPresence();
  return true;}
function countdown(words,ms,done){var cd=$('#countdown'),i=0;cd.hidden=false;var show=function(){cd.innerHTML='<span>'+esc(words[i])+'</span>';sfx('tick');};show();
  var iv=setInterval(function(){i++;if(i<words.length)show();else{clearInterval(iv);setTimeout(function(){cd.hidden=true;},250);if(done)done();}},ms);
  return iv;}
function clearTrack(){if(TR){TR.objs.forEach(function(o){if(o.g)scene.remove(o.g);});TR.objs=[];TR.coins=[];}coinMesh.count=0;arch.visible=false;shieldMesh.visible=false;magnetRing.visible=false;}
var lastRes=null;
function endRun(reason){
  if(!RUN||state.mode==='result')return;
  state.mode='result';music(false);$('#countdown').hidden=true;$('#tut').hidden=true;
  if(reason==='quit'){clearTrack();RUN=null;goHome();return;}
  missionNews=[];
  if(RUN.mode==='rush')return rushResult(reason);
  var need=RUN.need,gotN=need.filter(function(k){return RUN.got[k];}).length,all=gotN===need.length;
  var delivered=reason==='finish'&&all;
  var over=Math.max(0,RUN.spent-RUN.budget);
  var vegU=RUN.extras.filter(function(k,i,a){return a.indexOf(k)===i;});
  var parts={items:all?50:gotN/need.length*30,budget:over?Math.max(0,20-over/RUN.budget*150):20,veg:Math.min(10,vegU.length*5),clean:Math.max(0,10-RUN.hits*4),list:Math.max(0,10-RUN.decoys.length*4)};
  var score=Math.round(clamp(parts.items+parts.budget+parts.veg+parts.clean+parts.list,0,100));
  var st=MD.starsFor(score,delivered);
  var bonus=0,prevStars=0,unlockedNext=false,lostPlate=false;
  if(RUN.mode==='level'){prevStars=stars(RUN.level);
    if(st>0){var rec=S.levels[RUN.level]||{s:0,b:0};bonus=st*20+Math.max(0,st-rec.s)*40;rec.s=Math.max(rec.s,st);rec.b=Math.max(rec.b||0,score);S.levels[RUN.level]=rec;
      S.cooked[RUN.dish]={p:RUN.people,at:Date.now()};S.stats.levels++;mission('levels');if(st===3&&prevStars<3)mission('stars3');unlockedNext=prevStars===0&&RUN.level+1<LEVELS.length;}
    else{loseplate();lostPlate=true;}}
  else if(RUN.mode==='daily'){mission('daily');bonus=st*20;if(st>0)S.cooked[RUN.dish]=S.cooked[RUN.dish]||{p:RUN.people,at:Date.now()};}
  else if(RUN.mode==='race'){bonus=st*10;}
  if(delivered&&RUN.hits===0)mission('clean');
  addCoins(RUN.coins+bonus);mission('coins',RUN.coins);S.stats.rides++;S.stats.coins+=RUN.coins+bonus;persist();
  var d=DISHES[RUN.dish];
  var res={mode:RUN.mode,level:RUN.level,score:score,stars:st,dish:RUN.dish,dishName:d.n,country:d.r,spent:RUN.spent,budget:RUN.budget,daily:RUN.mode==='daily',allItems:delivered,budgetLeft:(RUN.budget-RUN.spent)/RUN.budget,veg:Math.min(10,vegU.length),junk:Math.min(40,RUN.decoys.length),got:need.map(function(k){return !!RUN.got[k];}),portion:RUN.people,people:RUN.people,hits:RUN.hits,coins:RUN.coins,bonus:bonus,reason:reason,missing:need.filter(function(k){return !RUN.got[k];}),extras:vegU,decoys:RUN.decoys.slice(),parts:parts,prevStars:prevStars,unlockedNext:unlockedNext,lostPlate:lostPlate,cfg:RUN.cfg};
  lastRes=res;
  sfx(st>0?'win':'lose');
  track('ride_finish',{mode:res.mode,dish:res.dish,score:score,stars:st,level:res.level,country:res.country,people:res.people,reason:reason});
  showResult(res);
  afterRide(res);saveRide(res);
  if(LIVE&&LIVE.onFinish)LIVE.onFinish(score,st);}
function rushResult(reason){
  var meters=Math.floor(RUN.dist),score=rushScore(),secs=RUN.time,prev=S.rush.best;
  if(score>S.rush.best){S.rush.best=score;S.rush.meters=meters;S.rush.orders=RUN.orders;}
  mission('rushm',meters);addCoins(RUN.coins);mission('coins',RUN.coins);S.stats.rides++;S.stats.coins+=RUN.coins;
  if(RUN.hits===0&&meters>200)mission('clean');persist();
  var res={mode:'rush',score:score,meters:meters,orders:RUN.orders,seconds:secs,coins:RUN.coins,best:S.rush.best,newBest:score>prev,dish:RUN.dish,dishName:DISHES[RUN.dish].n,country:RUN.cc,ordersDone:RUN.ordersDone.slice()};
  lastRes=res;sfx(res.newBest?'win':'lose');track('rush_finish',{score:score,meters:meters,orders:RUN.orders});
  showResult(res);saveRush(res);}
function offerContinue(){
  state.mode='crashed';music(false);var cost=100*Math.pow(2,RUN.continues);var m=$('#saveMeModal');m.hidden=false;
  $('#smCost').textContent=cost;var can=S.coins>=cost;$('#smYes').disabled=!can;$('#smSub').textContent=can?'Spend coins to fix the keke and carry on. You have '+S.coins+'.':'You need '+cost+' coins to continue. You have '+S.coins+'.';
  var n=5;$('#smCount').textContent=n;clearInterval(m._iv);
  m._iv=setInterval(function(){n--;$('#smCount').textContent=Math.max(0,n);if(n<=0){clearInterval(m._iv);m.hidden=true;state.mode='ride';endRun('crash');}},1000);
  $('#smYes').onclick=function(){if(S.coins<cost)return;clearInterval(m._iv);m.hidden=true;addCoins(-cost);persist();RUN.continues++;RUN.hearts=1;RUN.inv=2.5;renderHearts();
    TR.objs.forEach(function(o){if(o.type==='obs'&&o.z<state.z+4&&o.z>state.z-45)o.gone=true;});state.mode='ride';music(true);toast('Keke fixed. Go go go!','good');};
  $('#smNo').onclick=function(){clearInterval(m._iv);m.hidden=true;state.mode='ride';endRun('crash');};}
function pause(){if(state.mode!=='ride'||!RUN)return;var race=RUN.mode==='race';$('#psRestart').hidden=race;$('#psTitle').textContent=race?'Leave the race?':'Take a breath';$('#psResume').textContent=race?'Keep racing':'Resume';if(race){$('#psSub').textContent='The race keeps going while this is open.';$('#pauseModal').hidden=false;$('#psResume').focus();return;}state.mode='paused';music(false);var d=DISHES[RUN.dish];
  $('#psSub').textContent=RUN.mode==='rush'?('Score '+rushScore()+' · '+Math.floor(RUN.dist)+' m'):(d.n+' · '+RUN.need.filter(function(k){return RUN.got[k];}).length+'/'+RUN.need.length+' items');
  $('#pauseModal').hidden=false;$('#psResume').focus();}
function resume(){if(RUN&&RUN.mode==='race'){$('#pauseModal').hidden=true;return;}if(state.mode!=='paused')return;$('#pauseModal').hidden=true;state.mode='ride';RUN.locked=true;countdown(['3','2','1'],420,function(){if(RUN)RUN.locked=false;});music(true);}
$('#pauseBtn').addEventListener('click',pause);
$('#psResume').addEventListener('click',resume);
$('#psRestart').addEventListener('click',function(){$('#pauseModal').hidden=true;var c=RUN.cfg;state.mode='result';clearTrack();RUN=null;startRun(c);});
$('#psQuit').addEventListener('click',function(){$('#pauseModal').hidden=true;state.mode='ride';endRun('quit');});
$('#psSound').addEventListener('click',function(){setSound(!S.sound);});
document.addEventListener('visibilitychange',function(){if(document.hidden){if(state.mode==='ride'&&RUN&&RUN.mode!=='race')pause();music(false);}});

/* ================================================ result screen */
function starsHtml(n,max){var s='';for(var i=0;i<(max||3);i++)s+=i<n?'★':'<span class="off">★</span>';return s;}
function stat(b,s){return '<div><b class="tnum">'+esc(b)+'</b><span>'+esc(s)+'</span></div>';}
function note(col,html){return '<li><i style="background:'+col+'"></i><span>'+html+'</span></li>';}
function showResult(r){
  hud.classList.remove('on');setTimeout(function(){if(state.mode==='result')hud.hidden=true;},350);
  var box=$('#result');box.hidden=false;box.scrollTop=0;
  var d=DISHES[r.dish];$('#rImg').src=dishImg(r.dish);$('#rImg').alt=d.n;
  var stEl=$('#rStars');stEl.innerHTML='<i></i><i></i><i></i>';
  $('#rArc').style.strokeDashoffset='276.5';$('#rScore').textContent='0';
  var tags=[],notes=[],btnNext=$('#nextBtn'),btnAgain=$('#againBtn'),btnMap=$('#mapBtn');
  $('#raceRes').hidden=r.mode!=='race';$('#reportBtn').hidden=r.mode==='rush';$('#listBtn').hidden=r.mode==='rush';
  if(r.mode==='rush'){
    $('#rEye').textContent=r.newBest?'New best!':'Market Rush';$('#rTitle').textContent=r.meters+' m · '+r.orders+(r.orders===1?' order':' orders');stEl.style.display='none';
    $('#rStats').innerHTML=stat(r.score.toLocaleString('en'),'score (×'+S.mult+')')+stat(r.best.toLocaleString('en'),'your best')+stat('+'+r.coins,'coins')+stat(Math.round(r.seconds)+'s','ride time');
    notes.push(note('var(--gold)','Your score is metres plus 250 for each order, times your multiplier <b>×'+S.mult+'</b>. Finish missions to raise it.'));
    if(r.ordersDone.length)notes.push(note('var(--green-hi)','You delivered '+r.ordersDone.map(function(k){return esc(DISHES[k].n);}).join(', ')+'.'));
    else notes.push(note('var(--orange)','Grab every green item to complete an order and earn 250 points.'));
    tags=['Market Rush',r.meters+' m'];
    btnNext.textContent='Ride again';btnNext.onclick=function(){startRun({mode:'rush',dish:pickRushDish(),seed:Date.now()%1e6});};
    btnAgain.hidden=true;btnMap.textContent='Home';btnMap.onclick=goHome;
    animateScore(Math.min(100,Math.round(r.meters/30)),r.score);}
  else{
    stEl.style.display='';
    var delivered=r.allItems,cust=r.cfg&&r.cfg.customer;
    $('#rEye').textContent=delivered?(r.mode==='level'?'Level '+(r.level+1)+' · order delivered':r.mode==='daily'?'Market of the Day':'Race finished'):(r.reason==='crash'?'Keke broke down':'Order not delivered');
    $('#rTitle').textContent=delivered?(r.stars===3?'Perfect pot!':cust?'Delivered to '+cust:'Delivered!'):r.reason==='crash'?(r.missing.length===1?'So close! Three hits with only '+ITEMS[r.missing[0]].n+' to go':'Three hits, the ride is over'):(r.missing.length===1?'So close! Only '+ITEMS[r.missing[0]].n+' missing':'Missing '+r.missing.length+' items');
    var over=r.spent-r.budget;
    $('#rStats').innerHTML=stat(fmtFor(r.spent,r.country),over>0?fmtFor(over,r.country)+' over budget':'of '+fmtFor(r.budget,r.country))+stat('+'+(r.coins+r.bonus),'coins')+stat(Math.round(d.kcal),'kcal a plate')+stat(d.prot+' g','protein a plate');
    if(r.missing.length)notes.push(note('var(--red)','Missing: <b>'+r.missing.map(function(k){return esc(ITEMS[k].n);}).join(', ')+'</b>. Every list item shows up three times, so switch lanes early.'));
    else notes.push(note('var(--green-hi)','Every item on the list. '+(r.reason==='finish'?'Delivered to Meuro Kitchen.':'')));
    if(over>0)notes.push(note('var(--red)','You went <b>'+fmtFor(over,r.country)+'</b> over budget. Skip the red rings: they are not on your list.'));
    else notes.push(note('var(--green-hi)','Within budget with <b>'+fmtFor(r.budget-r.spent,r.country)+'</b> to spare. That is '+fmtFor(r.spent/r.people,r.country)+' a plate.'));
    if(r.extras.length)notes.push(note('var(--gold)','Bonus '+r.extras.map(function(k){return esc(ITEMS[k].n.toLowerCase());}).join(' and ')+' made the pot healthier.'));
    if(r.hits)notes.push(note('var(--orange)',r.hits+(r.hits>1?' crashes':' crash')+' cost you points. Jump the carts and potholes; switch lanes for danfos.'));
    if(d.tip)notes.push(note('var(--green)','<b>Meuro tip:</b> '+esc(d.tip)));
    tags=[d.n+' for '+r.people,r.got.filter(Boolean).length+'/'+r.got.length+' items'];if(r.extras.length)tags.push('+'+r.extras.length+' bonus veg');
    var nextI=r.mode==='level'?r.level+1:-1;
    btnAgain.hidden=false;btnMap.textContent=r.mode==='level'?'Map':'Home';btnMap.onclick=r.mode==='level'?openMap:goHome;
    if(r.mode==='level'&&delivered&&nextI<LEVELS.length){btnNext.textContent='Next level';btnNext.onclick=function(){openLevel(nextI);};}
    else if(r.mode==='level'&&!delivered){btnNext.textContent=S.plates>0?'Try again':'Out of plates';btnNext.onclick=function(){startRun(r.cfg);};btnAgain.hidden=true;}
    else if(r.mode==='daily'){btnNext.textContent='Play again';btnNext.onclick=function(){startDaily();};btnAgain.hidden=true;}
    else if(r.mode==='race'){btnNext.textContent='Home';btnNext.onclick=goHome;btnAgain.hidden=true;}
    else{btnNext.textContent='Home';btnNext.onclick=goHome;}
    btnAgain.onclick=function(){startRun(r.cfg);};
    animateScore(r.score,r.score);
    setTimeout(function(){var is=stEl.querySelectorAll('i');for(var i=0;i<r.stars;i++)(function(i){setTimeout(function(){is[i].className='on';sfx('combo',i*3);},i*260);})(i);},700);}
  $('#rTags').innerHTML=tags.map(function(t){return '<span>'+esc(t)+'</span>';}).join('');
  $('#rNotes').innerHTML=notes.join('');
  renderProg(r);renderSaveState();
  if(LIVE&&LIVE.race)renderRaceResults();}
function animateScore(arc,num){requestAnimationFrame(function(){$('#rArc').style.strokeDashoffset=String(276.5*(1-clamp(arc,0,100)/100));var s0=performance.now();(function tick(t){var p=Math.min(1,(t-s0)/1100);$('#rScore').textContent=Math.round(num*p).toLocaleString('en');if(p<1)requestAnimationFrame(tick);})(s0);});}
function renderProg(r){var box=$('#rProg');var items=[];
  if(r.unlockedNext){var nl=LEVELS[r.level+1];items.push('<span class="tagpill new">Unlocked: level '+(r.level+2)+(nl.ep!==LEVELS[r.level].ep?' in '+esc(COUNTRIES[nl.cc].market)+', '+esc(COUNTRIES[nl.cc].city)+'!':'')+'</span>');}
  if(r.mode==='level'&&r.allItems)items.push('<span class="tagpill new">Recipe added: '+esc(DISHES[r.dish].n)+'</span>');
  if(r.lostPlate)items.push('<span class="tagpill">You lost a plate · '+S.plates+' left'+(S.plates<MAX_PLATES?' · next in '+plateWait():'')+'</span>');
  missionNews.forEach(function(m){items.push('<span class="tagpill new">'+esc(m)+'</span>');});
  if(r.progress){var p=r.progress;items.push('<span class="tagpill">'+(p.streak||0)+'-day streak</span>');}
  if(r.challengeText)items.push('<span class="tagpill'+(r.challenge?' new':'')+'">'+(r.challenge?'Challenge done: ':'Today\'s challenge: ')+esc(r.challengeText)+'</span>');
  (r.newBadges||[]).forEach(function(b){var B=MD.BADGES[b];if(B)items.push('<span class="tagpill new">New badge: '+esc(B.n)+'</span>');});
  box.hidden=!items.length;box.innerHTML='<div class="row">'+items.join('')+'</div>';}
function renderSaveState(){var box=$('#rSave');var b=backend();
  if(b&&AUTH){box.innerHTML='<span class="ok">✓ Saved to your account</span><span>'+esc(player?player.name:'')+'</span>';}
  else if(b){box.innerHTML='<span class="ok">✓ Saved on this phone</span>';var btn=document.createElement('button');btn.type='button';btn.className='btn btn-orange';btn.textContent='Log in to save it everywhere';btn.onclick=function(){openJoin('signup');};box.appendChild(btn);}
  else box.innerHTML='<span class="ok">✓ Saved on this phone</span><span>Coins, stars and streaks stay here even if you close the page.</span>';}

/* ================================================ home, map and level cards */
function levelOfDish(dk){for(var i=0;i<LEVELS.length;i++)if(LEVELS[i].dish===dk)return i;return 0;}
function closeAllModals(){['levelModal','shopModal','missionModal','rewardModal','recipeModal','howModal','pauseModal','saveMeModal'].forEach(function(id){$('#'+id).hidden=true;});closeBoard();}
function goHome(){state.mode='intro';closeAllModals();clearTrack();RUN=null;state.z=6;state.x=0;state.lane=1;state.y=0;state.v=0;resetChunks(6);followGround(6);
  setTheme(LEVELS[currentLevel()].cc);showOnly('home');renderHome();if(LIVE&&LIVE.race){}lobbyPresenceSafe();}
function lobbyPresenceSafe(){try{if(LIVE&&LIVE.room)lobbyPresence();}catch(e){}}
function renderHome(){tickPlates();
  $('#coinN').textContent=S.coins.toLocaleString('en');$('#plateN').textContent=S.plates;$('#plateT').textContent=plateWait();
  var i=currentLevel(),L=LEVELS[i],cfg=MD.levelCfg(i),d=DISHES[L.dish],c=COUNTRIES[L.cc],allDone=passed(LEVELS.length-1);
  $('#hmEp').textContent='Market '+(L.ep+1)+' of '+EPISODES.length+' · '+c.market+', '+c.city;
  $('#hmImg').src=dishImg(L.dish);$('#hmLvl').textContent='Level '+(i+1)+(passed(i)?' · '+stars(i)+' ★':' · New order');
  $('#hmDish').textContent=d.n+' for '+cfg.people;$('#hmBudget').textContent='Budget '+fmtFor(cfg.budget,L.cc)+' · from '+cfg.customer+' in '+cfg.area;
  $('#hmStars').innerHTML=passed(i)?starsHtml(stars(i)):'';
  $('#playT').textContent=allDone?'Replay for 3 stars':'Play level '+(i+1);
  $('#tMapS').textContent=totalStars()+' / '+LEVELS.length*3+' ★';
  $('#tRushS').textContent=S.rush.best?'Best '+S.rush.best.toLocaleString('en'):'Endless';
  var dm=MD.dailyMarket();$('#tDailyS').textContent=DISHES[dm.dish].n;
  var done=S.missions.filter(function(m){return m.p>=m.g;}).length;$('#tMisN').textContent=done+'/3';$('#tMult').textContent='×'+S.mult;
  $('#tRecN').textContent=Object.keys(S.cooked).length;
  $('#savedNote').textContent=AUTH?'Saved to your account':'Progress saves on this phone';
  $('#tMissions').classList.toggle('dot',false);
  renderDaily();}
$('#playBtn').addEventListener('click',function(){openLevel(currentLevel());});
$('#hmOrder').addEventListener('click',function(){openLevel(currentLevel());});
$('#tMap').addEventListener('click',openMap);
$('#mapBack').addEventListener('click',goHome);
$('#tRush').addEventListener('click',function(){startRush();});
$('#tDaily').addEventListener('click',function(){startDaily();});
$('#coinPill').addEventListener('click',openShop);
$('#platePill').addEventListener('click',function(){openPlates();});
$('#tShop').addEventListener('click',openShop);
$('#tMissions').addEventListener('click',openMissions);
$('#tRecipes').addEventListener('click',openRecipes);
$('#howBtn').addEventListener('click',function(){$('#howModal').hidden=false;});
$('#hwClose').addEventListener('click',function(){$('#howModal').hidden=true;});
$('#hwOk').addEventListener('click',function(){$('#howModal').hidden=true;});
$('#soundBtn').addEventListener('click',function(){audio();setSound(!S.sound);});
(function(){var b=$('#liteBtn');b.textContent='Lite mode: '+(LITE?'on':'off');b.setAttribute('aria-pressed',String(LITE));
  b.addEventListener('click',function(){try{localStorage.setItem('meuro.lite',LITE?'0':'1');}catch(e){}track('lite_mode',{on:!LITE});location.reload();});})();
setSound(S.sound);

function openMap(){state.mode='intro';closeAllModals();clearTrack();showOnly('map');renderMap();}
function renderMap(){tickPlates();var box=$('#mapScroll');box.innerHTML='';$('#mapStars').textContent=totalStars()+' of '+LEVELS.length*3+' stars';$('#mapPlates').textContent=S.plates;$('#mapPlateT').textContent=plateWait();
  var cur=currentLevel(),W=Math.min(560,box.clientWidth-24||340),ROW=118,curEl=null;
  EPISODES.forEach(function(ep,ei){var c=COUNTRIES[ep.cc];var open=unlocked(ep.first);
    var sec=document.createElement('section');sec.className='ep'+(open?'':' locked');
    var got=0;for(var i=ep.first;i<=ep.last;i++)got+=stars(i);
    sec.innerHTML='<div class="ep-head"><span class="ep-flag">'+c.flag.map(function(f){return '<i style="background:'+f+'"></i>';}).join('')+'</span><span class="ep-t"><small>Market '+(ei+1)+' · '+esc(c.n)+'</small><b>'+esc(c.market)+', '+esc(c.city)+'</b></span><span class="ep-s">'+got+'/'+ep.levels.length*3+' ★</span></div>';
    var nodes=document.createElement('div');nodes.className='ep-nodes';var n=ep.levels.length;nodes.style.height=(n*ROW+30)+'px';
    var pts=[],X=[.5,.78,.5,.22];
    ep.levels.forEach(function(dk,li){var i=ep.first+li,x=X[(i)%4]*W,y=li*ROW+56;pts.push([x,y]);
      var b=document.createElement('button');b.type='button';b.className='node '+(X[i%4]<.5?'lft':X[i%4]>.5?'rgt':'lft')+(unlocked(i)?'':' locked')+(i===cur?' current':'');
      b.style.left=x+'px';b.style.top=y+'px';if(unlocked(i))b.style.backgroundImage='url("'+dishImg(dk)+'")';
      b.setAttribute('aria-label','Level '+(i+1)+': '+DISHES[dk].n+(unlocked(i)?', '+stars(i)+' stars':', locked'));
      b.innerHTML='<span class="num">'+(i+1)+'</span>'+(unlocked(i)?'<span class="st">'+starsHtml(stars(i))+'</span>':'')+'<span class="nm">'+esc(DISHES[dk].n)+'</span>';
      b.addEventListener('click',function(){if(!unlocked(i)){homeToast('Finish level '+i+' first to unlock this one.');return;}openLevel(i);});
      nodes.appendChild(b);if(i===cur)curEl=b;});
    var svgns='http://www.w3.org/2000/svg',svg=document.createElementNS(svgns,'svg');svg.setAttribute('class','path');var path=document.createElementNS(svgns,'path');
    var dstr='';pts.forEach(function(p,k){if(!k){dstr+='M'+p[0]+' '+(p[1]-60);}var prev=k?pts[k-1]:[p[0],p[1]-60];var my=(prev[1]+p[1])/2;dstr+=' C'+prev[0]+' '+my+' '+p[0]+' '+my+' '+p[0]+' '+p[1];});
    path.setAttribute('d',dstr);path.setAttribute('fill','none');path.setAttribute('stroke',open?'rgba(246,196,69,.55)':'rgba(255,255,255,.15)');path.setAttribute('stroke-width','8');path.setAttribute('stroke-linecap','round');path.setAttribute('stroke-dasharray','2 16');
    svg.appendChild(path);nodes.insertBefore(svg,nodes.firstChild);
    sec.appendChild(nodes);
    if(!open){var lk=document.createElement('p');lk.className='ep-lock';lk.textContent='Deliver every order in '+COUNTRIES[EPISODES[ei-1].cc].market+' to travel here.';sec.appendChild(lk);}
    box.appendChild(sec);});
  if(curEl)setTimeout(function(){var r=curEl.getBoundingClientRect(),br=box.getBoundingClientRect();box.scrollTop+=r.top-br.top-br.height*.45;},60);}

var lvIndex=0;
function openLevel(i){lvIndex=i;var cfg=MD.levelCfg(i),d=DISHES[cfg.dish],c=COUNTRIES[cfg.cc],list=MD.shoppingList(cfg.dish,cfg.people),cost=MD.potCost(cfg.dish,cfg.people);
  $('#lvImg').src=dishImg(cfg.dish);$('#lvImg').alt=d.n;$('#lvNum').textContent='Level '+(i+1)+' · '+c.n;$('#lvStars').innerHTML=starsHtml(stars(i));
  $('#lvFrom').textContent='Order from '+cfg.customer+' · '+cfg.area+', '+c.city;$('#lvTitle').textContent=d.n+' for '+cfg.people;$('#lvStory').textContent=cfg.story+'. Shop at '+c.market+' and deliver to Meuro Kitchen.';
  $('#lvBudget').textContent=fmtFor(cfg.budget,cfg.cc);$('#lvCost').textContent=fmtFor(cost,cfg.cc);$('#lvPlate').textContent=fmtFor(cost/cfg.people,cfg.cc);
  $('#lvList').innerHTML=list.map(function(l){return '<div class="lv-row"><i style="background:'+hex(ITEMS[l.k].c)+'"></i><span>'+esc(ITEMS[l.k].n)+'<small>'+esc(MD.qtyTxt(l.k,l.units))+'</small></span><b class="tnum">'+(l.est?'~':'')+esc(fmtFor(l.cost,cfg.cc))+'</b></div>';}).join('');
  $('#lvSrc').textContent=srcNote(cfg.cc,list);
  $('#lvGoals').innerHTML='<span><em>★</em> Buy all '+list.length+' items and deliver</span><span><em>★★</em> 70+ points</span><span><em>★★★</em> 88+ points</span>';
  var tip=$('#lvTip');tip.hidden=!passed(i);tip.innerHTML='<b>Recipe card unlocked.</b> '+esc(d.tip);
  var pb=$('#lvPlay');if(!unlocked(i)){pb.disabled=true;pb.textContent='Finish level '+i+' first';}else{pb.disabled=false;pb.textContent=passed(i)?'Play again':'Play';}
  $('#lvNote').textContent='You lose a plate only if you fail. Plates: '+S.plates+'/'+MAX_PLATES+(S.plates<MAX_PLATES?' · next in '+plateWait():'')+'.';
  $('#levelModal').hidden=false;track('level_open',{level:i});}
$('#lvClose').addEventListener('click',function(){$('#levelModal').hidden=true;});
$('#lvPlay').addEventListener('click',function(){var cfg=MD.levelCfg(lvIndex);cfg.mode='level';startRun(cfg);});
$('#lvWa').addEventListener('click',function(){var cfg=MD.levelCfg(lvIndex);track('share',{method:'whatsapp',content_type:'shopping_list'});window.open('https://wa.me/?text='+encodeURIComponent(shoppingText(cfg.dish,cfg.people)),'_blank','noopener');});
function srcNote(cc,list){var srcs={};list.forEach(function(l){srcs[MD.priceSrc(l.k,cc)]=1;});
  if(cc==='ng')return 'Prices: '+Object.keys(srcs).filter(function(s){return s!=='est';}).map(function(s){return MD.SOURCES[s];}).join('; ')+(srcs.est?'. Items marked ~ are Meuro estimates.':'.')+' '+MD.SOURCES.sbm+'.';
  if(srcs.crowd&&!srcs.est)return 'Prices reported by Meuro players in '+COUNTRIES[cc].n+'.';
  return 'Estimated '+COUNTRIES[cc].city+' prices (marked ~), converted from Lagos market prices. Report what you pay to make them real.';}
function shoppingText(dk,people){var d=DISHES[dk],cc=d.r,list=MD.shoppingList(dk,people),total=MD.potCost(dk,people);
  return 'Meuro shopping list: '+d.n+' for '+people+'\n'+list.map(function(l){return '- '+ITEMS[l.k].n+': '+MD.qtyTxt(l.k,l.units)+' ('+(l.est?'about ':'')+MD.fmtC(l.cost,cc)+')';}).join('\n')+
    '\nTotal: about '+MD.fmtC(total,cc)+' ('+MD.fmtC(total/people,cc)+' a plate)\n'+(d.tip?'Tip: '+d.tip+'\n':'')+'Plan yours on Meuro Market Run: '+location.href.split(/[?#]/)[0];}

function startDaily(){var dm=MD.dailyMarket();track('daily_start',{dish:dm.dish});
  return startRun({mode:'daily',dish:dm.dish,seed:dm.seed,people:4,budget:dm.budget,speed:14,length:540,obstacles:.52,decoys:.42,goats:true,doubles:true,customer:'Everyone'});}
function pickRushDish(){var pool=Object.keys(DISHES).filter(function(k){return DISHES[k].r==='ng'||passed(levelOfDish(k));});return pool[Math.floor(Math.random()*pool.length)];}
function startRush(){track('rush_start',{});return startRun({mode:'rush',dish:pickRushDish(),seed:Date.now()%1e6,people:2,speed:12,obstacles:.4,decoys:.34,goats:true,doubles:true});}

/* ---------------- shop */
function openShop(){renderShop();$('#shopModal').hidden=false;}
$('#shClose').addEventListener('click',function(){$('#shopModal').hidden=true;renderHome();});
function ownedColors(){var have=(PROFILE&&PROFILE.badges)||loadGuest().badges||[];var c=S.colors.slice();have.forEach(function(b){var u=MD.BADGES[b]&&MD.BADGES[b].unlock;if(u&&c.indexOf(u)<0)c.push(u);});return c;}
function renderShop(){$('#shCoins').textContent=S.coins.toLocaleString('en');
  var up=$('#shUp');up.innerHTML='';Object.keys(UPGRADES).forEach(function(k){var U=UPGRADES[k],lv=S.up[k]||0,cost=UP_COST[lv];
    var row=document.createElement('div');row.className='shop-row';row.innerHTML='<span class="ico" style="background:'+U.col+'">'+esc(U.ico)+'</span><span><b>'+esc(U.n)+' · '+upDur(k)+'s</b><small>'+esc(U.d)+'</small><span class="lvl-dots">'+[0,1,2,3,4].map(function(j){return '<i'+(j<lv?' class="on"':'')+'></i>';}).join('')+'</span></span>';
    var b=document.createElement('button');b.type='button';b.className='buy';if(lv>=5){b.disabled=true;b.textContent='Max';}else{b.innerHTML='<i class="coin-ic"></i>'+cost;b.disabled=S.coins<cost;b.onclick=function(){if(S.coins<cost)return;addCoins(-cost);S.up[k]=lv+1;persist();sfx('power');track('shop_upgrade',{item:k,level:lv+1});renderShop();};}
    row.appendChild(b);up.appendChild(row);});
  var pl=$('#shPlates');pl.innerHTML='';tickPlates();var row=document.createElement('div');row.className='shop-row';row.innerHTML='<span class="ico" style="background:#F4F1EA"><i class="plate-ic"></i></span><span><b>Refill all plates</b><small>You have '+S.plates+' of '+MAX_PLATES+(S.plates<MAX_PLATES?'. Next free plate in '+plateWait():'')+'</small></span>';
  var pb=document.createElement('button');pb.type='button';pb.className='buy';pb.innerHTML='<i class="coin-ic"></i>300';pb.disabled=S.plates>=MAX_PLATES||S.coins<300;pb.onclick=function(){if(S.coins<300)return;addCoins(-300);S.plates=MAX_PLATES;S.plateAt=Date.now();persist();sfx('power');renderShop();};row.appendChild(pb);pl.appendChild(row);
  var sw=$('#shColors');sw.innerHTML='';var own=ownedColors();KCOLORS.forEach(function(c){var b=document.createElement('button');b.type='button';b.style.background=c;var has=own.indexOf(c)>-1;b.className=has?'':'locked';b.setAttribute('aria-pressed',String(c===S.color));b.setAttribute('aria-label',has?'Ride with this colour':'Buy this colour for 400 coins');
    b.onclick=function(){if(has){S.color=c;setKekeColor(c);persist();lobbyPresenceSafe();renderShop();return;}if(S.coins<400){$('#shColorNote').textContent='You need 400 coins for this colour. Earn badges to unlock some for free.';return;}
      if(!b.dataset.sure){b.dataset.sure='1';$('#shColorNote').textContent='Tap again to buy this colour for 400 coins.';return;}addCoins(-400);S.colors.push(c);S.color=c;setKekeColor(c);persist();sfx('power');renderShop();};sw.appendChild(b);});}

/* ---------------- missions */
function openMissions(){var l=$('#msList');l.innerHTML='';$('#msMult').textContent='×'+S.mult;
  S.missions.forEach(function(m){var done=m.p>=m.g;var d=document.createElement('div');d.className='ms'+(done?' done':'');d.innerHTML='<b>'+esc(missionText(m))+'</b><em class="tnum">'+(done?'Done':m.p.toLocaleString('en')+' / '+m.g.toLocaleString('en'))+'</em><span class="mb"><span style="width:'+clamp(m.p/m.g*100,0,100)+'%"></span></span>';l.appendChild(d);});
  $('#missionModal').hidden=false;}
$('#msClose').addEventListener('click',function(){$('#missionModal').hidden=true;renderHome();});

/* ---------------- daily reward (7-day calendar) */
function rewardIdx(){var t=MD.dayNumber(),r=S.reward;if(r.last===t)return r.streak;if(r.last===t-1)return (r.streak+1)%7;return 0;}
function canClaim(){return S.reward.last!==MD.dayNumber();}
function openReward(){var idx=rewardIdx(),claim=canClaim();var box=$('#rwDays');box.innerHTML='';
  MD.DAILY_REWARDS.forEach(function(n,i){var d=document.createElement('div');d.className='rw-day'+(i<idx||(!claim&&i===idx)?' past':'')+(claim&&i===idx?' today':'')+(i===6?' big':'');d.innerHTML='Day '+(i+1)+'<i class="coin-ic"></i><b class="tnum">'+n+'</b>'+(i===6?'<small>+ plates</small>':'');box.appendChild(d);});
  $('#rwTitle').textContent=claim?'Day '+(idx+1)+' reward':'Come back tomorrow';$('#rwSub').textContent=claim?'Come back every day. Miss a day and you start again from day 1. Day 7 also refills your plates.':'You already claimed today. Tomorrow: '+MD.DAILY_REWARDS[(idx+1)%7]+' coins.';
  var b=$('#rwClaim');b.textContent=claim?'Claim '+MD.DAILY_REWARDS[idx]+' coins':'OK';
  b.onclick=function(){if(canClaim()){var i=rewardIdx();addCoins(MD.DAILY_REWARDS[i]);if(i===6){S.plates=MAX_PLATES;S.plateAt=Date.now();}S.reward={last:MD.dayNumber(),streak:i};persist();sfx('win');track('daily_reward',{day:i+1});}$('#rewardModal').hidden=true;renderHome();};
  $('#rewardModal').hidden=false;}

/* ---------------- recipe book */
function openRecipes(){var g=$('#rbGrid');g.innerHTML='';var keys=Object.keys(S.cooked);
  if(!keys.length){g.innerHTML='<p class="rb-empty">Deliver your first order to add its recipe card here.</p>';}
  keys.forEach(function(k){var d=DISHES[k];if(!d)return;var b=document.createElement('button');b.type='button';b.className='rb-card';b.innerHTML='<img src="'+dishImg(k)+'" alt=""><span><small>'+esc(COUNTRIES[d.r].n)+'</small><b>'+esc(d.n)+'</b></span>';b.onclick=function(){$('#recipeModal').hidden=true;openLevel(levelOfDish(k));};g.appendChild(b);});
  $('#recipeModal').hidden=false;}
$('#rbClose').addEventListener('click',function(){$('#recipeModal').hidden=true;});
function openPlates(){tickPlates();if(S.plates<=0)homeToast('Out of plates. Next one in '+plateWait()+'. Refill in the shop, or play Rush and Today (no plates needed).');openShop();}
$$('.modal').forEach(function(m){m.addEventListener('click',function(e){if(e.target===m&&['pauseModal','saveMeModal','rewardModal'].indexOf(m.id)<0)m.hidden=true;});});
addEventListener('keydown',function(e){if(e.key==='Escape'){['levelModal','shopModal','missionModal','recipeModal','howModal'].forEach(function(id){$('#'+id).hidden=true;});}});
setInterval(function(){var was=S.plates;tickPlates();if(!$('#home').hidden){$('#plateN').textContent=S.plates;$('#plateT').textContent=plateWait();}if(!$('#map').hidden){$('#mapPlates').textContent=S.plates;$('#mapPlateT').textContent=plateWait();}},1000);

/* ================================================ camera and main loop */
function resize(){var w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w<h?72:58;camera.updateProjectionMatrix();}
addEventListener('resize',resize);resize();
var clock=new THREE.Clock(),camPos=new THREE.Vector3(9,4,14),camLook=new THREE.Vector3(0,1.2,0),vTmp=new THREE.Vector3(),lTmp=new THREE.Vector3();
camera.position.copy(camPos);
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
function loop(){
  requestAnimationFrame(loop);
  var dt=Math.min(.05,clock.getDelta());state.t+=dt;
  if(state.mode==='ride'&&RUN){if(RUN.mode==='rush')RUN.cfg.obstacles=Math.min(.74,.4+RUN.time*.004);updateRun(dt);}
  if(TR&&RUN)animObjs(dt);
  if(state.mode==='intro')state.orbit+=dt*(reduce?0:.12);
  keke.position.set(state.x,state.y+(state.v>.5&&state.y===0?Math.sin(state.t*14)*.025:0),state.z);
  var lean=(LANES[state.lane]-state.x)*-.09;keke.rotation.z=lean;keke.rotation.y=(LANES[state.lane]-state.x)*-.06;keke.rotation.x=state.y>0?-state.vy*.02:0;
  keke.userData.wheels.forEach(function(w){w.rotation.x-=state.v*dt/0.33;});
  keke.visible=!(RUN&&RUN.inv>0&&state.mode==='ride'&&Math.floor(state.t*14)%2);
  updateChunks(state.z);followGround(state.z);
  for(var i=0;i<traders.length;i++){var tr=traders[i];var wz=tr.parent.position.z+tr.position.z;if(Math.abs(wz-state.z)<50)tr.rotation.x=Math.sin(state.t*1.5+tr.userData.ph)*.04;}
  if(state.mode==='intro'){var sw2=Math.sin(state.orbit*.5),wide=innerWidth>760;vTmp.set(state.x+(wide?-1.6:1.4)+sw2*1.2,3.3+Math.sin(state.orbit*.35)*.3,state.z+(wide?7.5:9.5));lTmp.set(state.x+(wide?-3.2:0),1.7,state.z-16);}
  else if(state.mode==='result'){vTmp.set(state.x+5,3.4,state.z+6);lTmp.set(state.x,1.2,state.z-2);}
  else{var tall=innerHeight>innerWidth;vTmp.set(state.x*.6,(tall?6.8:5.6)+state.y*.3,state.z+(tall?10.6:9.6));lTmp.set(state.x*.78,.5+state.y*.25,state.z-15);}
  camPos.lerp(vTmp,Math.min(1,dt*(state.mode==='ride'?5:3)));camLook.lerp(lTmp,Math.min(1,dt*5));
  camera.position.copy(camPos);
  if(shake>0){shake-=dt;camera.position.x+=(Math.random()-.5)*shake*.8;camera.position.y+=(Math.random()-.5)*shake*.6;}
  camera.lookAt(camLook);
  sunL.position.set(state.x-30,40,state.z-40);sunL.target.position.set(state.x,0,state.z-10);
  scene.userData.sky.position.set(0,0,state.z);scene.userData.sun.position.set(-60*(SKYR-6)/306.7,28*(SKYR-6)/306.7,state.z-300*(SKYR-6)/306.7);scene.userData.sun.lookAt(0,0,state.z);
  if(LIVE&&LIVE.frame)LIVE.frame(dt);
  renderer.render(scene,camera);}

/* ================================================ accounts, saving, leaderboards */
var LB={uid:null,owner:false,rows:[],rush:[],today:[],signups:[],pending:[],crewRows:[],myCrew:null};
var AUTH=null, PROFILE=null, player=null, pendingAfterJoin=null, jmode='signup';
function backend(){return window.__meuroBackend||null;}
function cleanName(v){return String(v||'').replace(/[\u0000-\u001f<>]/g,'').replace(/\s+/g,' ').trim().slice(0,20);}
var cloudTimer=null, cloudBusy=false;
function compactStore(){var o={};Object.keys(S).forEach(function(k){if(k!=='sound')o[k]=S[k];});return o;}
function queueCloudSave(){var b=backend();if(!b||!AUTH)return;clearTimeout(cloudTimer);cloudTimer=setTimeout(function(){if(cloudBusy){queueCloudSave();return;}cloudBusy=true;b.api.saveProgress(compactStore()).catch(function(){}).then(function(){cloudBusy=false;});},4000);}
/* Merge what is saved in the account with what is on this phone: keep the best of both */
function mergeCloud(r){if(!r||r.v!==1)return false;
  Object.keys(r.levels||{}).forEach(function(k){var a=S.levels[k]||{s:0,b:0},b=r.levels[k]||{};S.levels[k]={s:Math.max(a.s||0,b.s||0),b:Math.max(a.b||0,b.b||0)};});
  S.coins=Math.max(S.coins,r.coins|0);Object.keys(S.up).forEach(function(k){S.up[k]=Math.max(S.up[k]||0,(r.up&&r.up[k])|0);});
  (r.colors||[]).forEach(function(c){if(KCOLORS.indexOf(c)>-1&&S.colors.indexOf(c)<0)S.colors.push(c);});
  S.mult=Math.max(S.mult,Math.min(10,r.mult|0));if((r.sets|0)>S.sets){S.sets=r.sets|0;if(r.missions&&r.missions.length===3)S.missions=r.missions;}
  if(r.rush&&(r.rush.best|0)>S.rush.best)S.rush=r.rush;
  Object.keys(r.cooked||{}).forEach(function(k){if(DISHES[k]&&!S.cooked[k])S.cooked[k]=r.cooked[k];});
  Object.keys(S.stats).forEach(function(k){S.stats[k]=Math.max(S.stats[k]||0,(r.stats&&r.stats[k])|0);});
  if(r.reward&&r.reward.last>(S.reward.last||0))S.reward=r.reward;
  S.tut=Math.max(S.tut,r.tut|0);return true;}

/* ---------------- streaks, badges and the daily challenge (same rules as the database) */
function guestId(){try{var g=localStorage.getItem('meuro.guest');if(!g){g=Math.random().toString(36).slice(2,12);localStorage.setItem('meuro.guest',g);}return g;}catch(e){return 'guest';}}
function todayChallenge(){return MD.personalChallenge(AUTH?AUTH.uid:guestId());}
function loadGuest(){try{return JSON.parse(localStorage.getItem('meuro.progress')||'null')||{streak:0,best_streak:0,badges:[],countries:[],rides:0,challenges_done:0};}catch(e){return {streak:0,best_streak:0,badges:[],countries:[],rides:0,challenges_done:0};}}
function saveGuest(g){try{localStorage.setItem('meuro.progress',JSON.stringify(g));}catch(e){}}
function progress(){return PROFILE||loadGuest();}
function applyGuestProgress(r){var g=loadGuest(),today=MD.dayNumber(),ld=g.last_day_n;g.badges=g.badges||[];g.countries=g.countries||[];
  g.streak=ld===today?g.streak:(ld===today-1?g.streak+1:1);g.best_streak=Math.max(g.best_streak||0,g.streak);g.last_day_n=today;g.rides=(g.rides||0)+1;
  if(g.countries.indexOf(r.country)<0)g.countries.push(r.country);
  var add=function(b,cond){if(cond&&g.badges.indexOf(b)<0)g.badges.push(b);};
  if(r.challenge&&g.challenge_day!==today){g.challenges_done=(g.challenges_done||0)+1;g.challenge_day=today;}
  add('first_ride',true);add('list_master',r.allItems);add('budget_boss',r.allItems&&r.budgetLeft>=.2);add('veg_lover',r.veg>=3);add('streak_3',g.streak>=3);add('streak_7',g.streak>=7);
  add('daily_star',r.daily&&r.stars===3);add('explorer',g.countries.length>=5);add('challenger',g.challenges_done>=5);
  saveGuest(g);return g;}
function afterRide(r){var ch=todayChallenge();r.challenge=r.mode!=='race'&&ch.test(r);r.challengeText=ch.n;
  var before=(progress().badges||[]).slice();
  if(!(backend()&&AUTH)){var g=applyGuestProgress(r);r.progress=g;r.newBadges=(g.badges||[]).filter(function(b){return before.indexOf(b)<0;});}
  r._before=before;renderProg(r);renderDaily();if(r.challenge)track('challenge_done',{challenge:ch.id});
  (r.newBadges||[]).forEach(function(b){toast('Badge unlocked: '+MD.BADGES[b].n,'bonus');});}
function saveRide(r){var b=backend();if(!b||!AUTH)return;
  b.api.recordRide(r).then(function(res){if(!res)return;PROFILE=Object.assign(PROFILE||{},res);r.progress=res;r.newBadges=(res.badges||[]).filter(function(x){return (r._before||[]).indexOf(x)<0;});renderProg(r);renderDaily();
    (r.newBadges||[]).forEach(function(x){toast('Badge unlocked: '+MD.BADGES[x].n,'bonus');});track('score_saved',{score:r.score});loadBoards();}).catch(function(){});}
function saveRush(r){var b=backend();if(!b||!AUTH)return;b.api.recordRush(r).then(function(){loadBoards();}).catch(function(){});}
function renderDaily(){var p=progress(),ch=todayChallenge(),today=MD.dayNumber();
  var alive=PROFILE?(PROFILE.last_day&&(new Date(PROFILE.last_day+'T00:00:00Z').getTime()/86400000>=today-1)):(p.last_day_n>=today-1);
  $('#dlStreak').querySelector('b').textContent=alive?(p.streak||0):0;
  var c=$('#dlChallenge');c.textContent='Challenge: '+ch.n;c.classList.toggle('done',!PROFILE&&p.challenge_day===today);}

/* ---------------- account modal */
var AUTH_MSG={'auth/email-not-confirmed':'Confirm your email first: open the link we sent you (check spam too), then log in.','auth/captcha-needed':'Complete the robot check above first.','auth/captcha':'The robot check failed. Please try it again.','auth/email-already-in-use':'That email already has an account. Log in instead.','auth/invalid-email':'Enter a valid email address, like you@example.com.','auth/weak-password':'Use a password of at least 8 characters, mixing letters and numbers.','auth/invalid-credential':'That email and password do not match. Try again or reset your password.','auth/wrong-password':'That email and password do not match. Try again or reset your password.','auth/user-not-found':'No account uses that email yet. Create one instead.','auth/too-many-requests':'Too many tries. Wait a minute, then try again.','auth/network-request-failed':'No internet connection. Check it and try again.','auth/missing-email':'Enter your email address first.'};
function authMsg(code){return AUTH_MSG[code]||'Something went wrong. Try again.';}
function setJMode(m){jmode=m;var b=backend();$('#jTabs').hidden=m==='newpass';$('#jEmail').closest('label').hidden=m==='newpass';$('#jResend').hidden=true;
  if(b&&b.auth.needCaptcha()&&m!=='newpass')b.auth.renderCaptcha($('#jCaptcha')).catch(function(){});
  $$('#jTabs button').forEach(function(x){x.setAttribute('aria-pressed',String(x.dataset.m===m));});
  $('#jNameRow').hidden=m!=='signup';$('#jConsentRow').hidden=m!=='signup';$('#jForgot').hidden=m!=='login';
  $('#jSave').textContent=m==='signup'?'Create account':m==='newpass'?'Set new password':'Log in';$('#jPass').autocomplete=m==='login'?'current-password':'new-password';
  $('#jTitle').textContent=m==='signup'?'Join the market':m==='newpass'?'Choose a new password':'Welcome back';
  $('#jSub').textContent=m==='signup'?'Create a free account to save your progress on any phone, race friends and join the leaderboards.':m==='newpass'?'Use at least 8 characters with letters and numbers.':'Log in with the email you signed up with. Your stars and coins come with you.';
  $('#jMsg').textContent='';$('#jMsg').className='err';}
$$('#jTabs button').forEach(function(b){b.addEventListener('click',function(){setJMode(b.dataset.m);});});
function needProfile(cb){if(AUTH&&player){cb();return;}pendingAfterJoin=cb;openJoin('signup');}
function openJoin(mode){var m=$('#joinModal');m.hidden=false;var on=!!backend();$('#jOff').hidden=on;$('#jTabs').hidden=!on;$('#joinForm').hidden=!on;
  if(!on){$('#jTitle').textContent='Save your progress';$('#jSub').textContent='Your Meuro account will keep your stars, coins and streak safe on any phone.';track('login_unavailable',{});return;}
  setJMode(typeof mode==='string'?mode:jmode);setTimeout(function(){(jmode==='signup'?$('#jName'):$('#jEmail')).focus();},60);}
function closeJoin(){$('#joinModal').hidden=true;pendingAfterJoin=null;}
$('#jClose').addEventListener('click',closeJoin);
$('#authBtn').addEventListener('click',function(){openJoin('login');});
$('#joinForm').addEventListener('submit',async function(e){e.preventDefault();var b=backend();if(!b)return;
  var email=String($('#jEmail').value||'').trim().toLowerCase(),pw=String($('#jPass').value||''),msg=$('#jMsg');msg.className='err';
  if(jmode==='newpass'){if(pw.length<8||!/[a-zA-Z]/.test(pw)||!/[0-9]/.test(pw)){msg.textContent=authMsg('auth/weak-password');return;}var nr=await b.auth.newPassword(pw);if(nr.ok){msg.className='sb-msg ok';msg.textContent='Password changed. You are logged in.';$('#jPass').value='';setTimeout(function(){$('#joinModal').hidden=true;},1200);}else msg.textContent=authMsg(nr.code);return;}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)){msg.textContent=authMsg('auth/invalid-email');$('#jEmail').focus();return;}
  if(pw.length<8||!/[a-zA-Z]/.test(pw)||!/[0-9]/.test(pw)){msg.textContent=authMsg('auth/weak-password');$('#jPass').focus();return;}
  var btn=$('#jSave');btn.disabled=true;var label=btn.textContent;btn.textContent=jmode==='signup'?'Creating account…':'Logging in…';
  var r;
  if(jmode==='signup'){var n=cleanName($('#jName').value);if(!n||n.length<2){msg.textContent='Add a rider name of at least 2 letters.';btn.disabled=false;btn.textContent=label;$('#jName').focus();return;}
    r=await b.auth.signUp(n,email,pw,$('#jConsent').checked);}
  else r=await b.auth.logIn(email,pw);
  btn.disabled=false;btn.textContent=label;
  if(!r.ok){msg.textContent=authMsg(r.code);$('#jResend').hidden=r.code!=='auth/email-not-confirmed';return;}
  track(jmode==='signup'?'sign_up':'login',{method:'email'});
  $('#jPass').value='';msg.className='sb-msg ok';
  if(jmode==='signup'&&r.confirm){setJMode('login');$('#jEmail').value=email;msg.className='sb-msg ok';msg.textContent='Account created. We sent a confirmation link to '+email+'. Open it on this phone, then you are in.';$('#jResend').hidden=false;return;}
  msg.textContent=jmode==='signup'?'Account created. Welcome to the market!':'Logged in.';});
$('#jResend').addEventListener('click',async function(){var em=String($('#jEmail').value||'').trim().toLowerCase();var m=$('#jMsg');if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)){m.className='err';m.textContent=authMsg('auth/invalid-email');return;}var r=await backend().auth.resendConfirmation(em);m.className=r.ok?'sb-msg ok':'err';m.textContent=r.ok?'Sent again. Check your inbox and spam folder.':authMsg(r.code);});
$('#jForgot').addEventListener('click',async function(){var b=backend();var email=String($('#jEmail').value||'').trim().toLowerCase();var msg=$('#jMsg');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)){msg.className='err';msg.textContent='Enter your email above, then tap Forgot password again.';$('#jEmail').focus();return;}
  var r=await b.auth.reset(email);if(r.ok){msg.className='sb-msg ok';msg.textContent='Check your inbox for a link to reset your password.';}else{msg.className='err';msg.textContent=authMsg(r.code);}});
window.addEventListener('meuro-recovery',function(){$('#joinModal').hidden=false;$('#jOff').hidden=true;$('#jTabs').hidden=false;$('#joinForm').hidden=false;setJMode('newpass');setTimeout(function(){$('#jPass').focus();},60);});
window.addEventListener('meuro-auth',async function(e){var d=e.detail||{};await window.__meuroReady;
  AUTH=d.uid?d:null;LB.uid=d.uid||null;LB.owner=!!d.isAdmin;
  if(d.uid){var p=null;try{p=await backend().api.myProfile();}catch(x){}
    PROFILE=p||null;player={name:cleanName((p&&p.name)||d.name||String(d.email||'').split('@')[0])||'Rider',contact:d.email||'',consent:!!(p&&p.consent)};
    if(p&&p.progress&&mergeCloud(p.progress)){persist();setKekeColor(S.color);}else queueCloudSave();
    if(LB.owner)loadAdmin();loadBoards();}
  else{player=null;PROFILE=null;if(LIVE&&LIVE.race)leaveRace(true);$('#bdOwner').hidden=true;}
  renderMe();renderDaily();if(state.mode==='intro'&&!$('#home').hidden)renderHome();if(state.mode==='result')renderSaveState();lobbyPresenceSafe();if(!board.hidden)renderBoard();
  if(AUTH&&pendingAfterJoin){var c=pendingAfterJoin;pendingAfterJoin=null;setTimeout(function(){$('#joinModal').hidden=true;c();},500);}
  else if(AUTH&&!$('#joinModal').hidden){setTimeout(function(){$('#joinModal').hidden=true;},700);}});
function renderMe(){$('#authBtn').hidden=!!AUTH;var mb=$('#meBtn');mb.hidden=!AUTH;if(AUTH&&player){$('#meName').textContent=player.name;$('#meDot').style.background=S.color;}}
$('#meBtn').addEventListener('click',function(){openProfile();});

/* ---------------- profile */
function openProfile(){if(!AUTH)return openJoin('login');var p=PROFILE||{};$('#profile').hidden=false;$('#pfSub').textContent=AUTH.email||'';
  var st=[[p.streak||0,'day streak'],[p.best_streak||0,'best streak'],[totalStars(),'stars'],[(p.countries||[]).length,'countries']];
  $('#pfStats').innerHTML=st.map(function(s){return '<div><b class="tnum">'+esc(s[0])+'</b><span>'+esc(s[1])+'</span></div>';}).join('');
  var have=p.badges||[];$('#pfBadges').innerHTML=Object.keys(MD.BADGES).map(function(k){var B=MD.BADGES[k];return '<div class="badge'+(have.indexOf(k)>-1?' on':'')+'"><b>'+esc(B.n)+'</b><span>'+esc(B.d)+'</span></div>';}).join('');
  $('#pfName').value=player?player.name:'';$('#pfConsent').checked=!!p.consent;$('#pfMsg').textContent='';$('#pfDelete').textContent='Delete my account';delete $('#pfDelete').dataset.sure;setTimeout(function(){$('#pfClose').focus();},50);}
$('#pfClose').addEventListener('click',function(){$('#profile').hidden=true;});
$('#pfLogout').addEventListener('click',function(){$('#profile').hidden=true;var b=backend();if(b)b.auth.logOut();homeToast('You logged out. Your progress stays on this phone.');});
$('#pfForm').addEventListener('submit',async function(e){e.preventDefault();var n=cleanName($('#pfName').value),m=$('#pfMsg');m.className='err';
  if(!n||n.length<2){m.textContent='Use 2 to 20 letters or numbers for your rider name.';return;}
  try{await backend().api.updateProfile(n,$('#pfConsent').checked,S.color);PROFILE=Object.assign(PROFILE||{},{name:n,consent:$('#pfConsent').checked});player.name=n;player.consent=$('#pfConsent').checked;renderMe();lobbyPresenceSafe();m.className='sb-msg ok';m.textContent='Saved.';loadBoards();}
  catch(err){m.textContent=err&&err.code==='bad_name'?'Use 2 to 20 letters or numbers for your rider name.':'Could not save. Check your connection and try again.';}});
$('#pfDelete').addEventListener('click',async function(){var b=$('#pfDelete');if(!b.dataset.sure){b.dataset.sure='1';b.textContent='Tap again to delete everything for good';return;}
  try{await backend().api.deleteAccount();$('#profile').hidden=true;homeToast('Your account and data were deleted.');}catch(err){b.textContent='Could not delete. Try again.';delete b.dataset.sure;}});

/* ---------------- leaderboards */
var board=$('#board'),boardTimer=null,boardView='rush';
function starStr(n){n=clamp(n||0,0,3);return '★★★'.slice(0,n)+'☆☆☆'.slice(0,3-n);}
function row(i,name,sub,score,small,me){var r=document.createElement('div');r.className='bd-row'+(me?' me':'');var pos=document.createElement('span');pos.className='pos tnum';pos.textContent=i+1;
  var mid=document.createElement('div');var nm=document.createElement('div');nm.className='nm';nm.textContent=name+(me?' (you)':'');mid.appendChild(nm);if(sub){var ds=document.createElement('div');ds.className='ds';ds.textContent=sub;mid.appendChild(ds);}
  var sc=document.createElement('div');sc.className='sc tnum';sc.textContent=score;if(small){var st=document.createElement('small');st.textContent=small;sc.appendChild(st);}r.appendChild(pos);r.appendChild(mid);r.appendChild(sc);return r;}
function renderRush(){var l=$('#bdRush');l.innerHTML='';var rows=LB.rush||[];
  if(!backend()){rows=S.rush.best?[{id:'me',name:'You',best:S.rush.best,meters:S.rush.meters,orders:S.rush.orders}]:[];}
  if(!rows.length){l.innerHTML='<p class="bd-empty">No Rush scores yet. Ride Market Rush and set the first one.</p>';return;}
  rows.forEach(function(r,i){l.appendChild(row(i,r.name||'Rider',(r.meters||0)+' m · '+(r.orders||0)+' orders',(r.best||0).toLocaleString('en'),null,r.id===LB.uid||r.id==='me'));});
  if(!backend()){var p=document.createElement('p');p.className='bd-note';p.textContent='Showing your best on this phone. The world leaderboard appears when Meuro accounts switch on.';l.appendChild(p);}}
function renderBoard(){var list=$('#bdList');list.innerHTML='';var rows=LB.rows;
  if(!backend()){rows=Object.keys(S.levels).map(function(k){var L=LEVELS[k];return L?{id:'me'+k,name:'Level '+(+k+1),best:S.levels[k].b||0,dish:DISHES[L.dish].n,stars:S.levels[k].s}:null;}).filter(Boolean).sort(function(a,b){return b.best-a.best;}).slice(0,20);}
  $('#bdEmpty').hidden=rows.length>0;
  rows.forEach(function(r,i){var el=row(i,r.name||'Player',r.dish||'',r.best,starStr(r.stars),r.id===LB.uid);
    if(LB.owner&&backend()&&r.id!==LB.uid){var rm=document.createElement('button');rm.type='button';rm.className='rm';rm.textContent='Remove from board';rm.addEventListener('click',function(){if(rm.dataset.sure){backend().api.admin.hideScore(r.id).then(loadBoards).catch(function(){homeToast('Could not remove that score.');});}else{rm.dataset.sure='1';rm.textContent='Tap again to remove';}});el.appendChild(rm);}
    list.appendChild(el);});}
function renderToday(){var l=$('#bdToday');l.innerHTML='';var dm=MD.dailyMarket(),d=DISHES[dm.dish];
  $('#todayHead').textContent='Market of the Day: '+d.n+' ('+COUNTRIES[d.r].n+'). Same dish and road for everyone. Resets at midnight UTC.';
  var rows=LB.today||[];if(!rows.length){l.innerHTML='<p class="bd-empty">'+(backend()?'No plates yet today. Be the first.':'Today\'s board appears when Meuro accounts switch on.')+'</p>';return;}
  rows.forEach(function(r,i){l.appendChild(row(i,r.name||'Player','',r.best,starStr(r.stars),r.id===LB.uid));});}
function csvCell(v){v=String(v==null?'':v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}
function renderOwner(){var box=$('#bdOwner');box.hidden=false;var l=$('#suList');l.innerHTML='';
  if(!LB.signups.length)l.innerHTML='<p class="bd-note">No sign-ups yet.</p>';
  LB.signups.slice(0,200).forEach(function(s){var d=document.createElement('div');d.className='su';var a=document.createElement('b');a.textContent=s.name||'';var em=document.createElement('em');em.textContent=s.consent?'Opted in':'No marketing';if(!s.consent)em.className='no';var c=document.createElement('span');c.textContent=s.contact||'';var t=document.createElement('span');t.textContent=(s.createdAt||'').slice(0,10)+' · '+(s.rides||0)+' rides';d.appendChild(a);d.appendChild(em);d.appendChild(c);d.appendChild(t);l.appendChild(d);});
  $('#suCopy').textContent='Copy '+LB.signups.length+' sign-ups as CSV';
  var pl=$('#prList');pl.innerHTML='';var pend=LB.pending||[];if(!pend.length)pl.innerHTML='<p class="bd-note">No price reports waiting.</p>';
  pend.forEach(function(r){var rw=document.createElement('div');rw.className='pr-row';var t=document.createElement('span');var c=COUNTRIES[r.country],it=ITEMS[r.item];
    t.textContent=(it?it.n:r.item)+' · '+(c?c.n:r.country)+': '+MD.fmtC(+r.amount,r.country)+(it?' per '+it.u:'')+(r.place?' · '+r.place:'');
    var ok=document.createElement('button');ok.type='button';ok.textContent='Approve';var no=document.createElement('button');no.type='button';no.textContent='Reject';
    var act=function(yes){backend().api.admin.moderate(r.id,yes).then(loadAdmin).catch(function(){homeToast('Could not update that report.');});};
    ok.addEventListener('click',function(){act(true);});no.addEventListener('click',function(){act(false);});rw.appendChild(t);rw.appendChild(ok);rw.appendChild(no);pl.appendChild(rw);});}
async function loadAdmin(){var b=backend();if(!b||!LB.owner)return;
  try{var rows=await b.api.admin.signups(2000);LB.signups=rows.map(function(r){return {name:r.name,contact:r.email,consent:r.consent,createdAt:r.created_at,rides:r.rides};});}catch(e){}
  try{LB.pending=await b.api.admin.pendingPrices();}catch(e){LB.pending=[];}renderOwner();}
$('#suCopy').addEventListener('click',function(){var rows=[['name','email','marketing_consent','created']].concat(LB.signups.map(function(s){return [s.name,s.contact,s.consent?'yes':'no',s.createdAt];}));
  var csv=rows.map(function(r){return r.map(csvCell).join(',');}).join('\n');var ta=$('#suCsv');ta.value=csv;
  var done=function(){$('#suCopy').textContent='Copied';setTimeout(function(){$('#suCopy').textContent='Copy '+LB.signups.length+' sign-ups as CSV';},1800);};
  try{navigator.clipboard.writeText(csv).then(done,function(){ta.hidden=false;ta.select();});}catch(e){ta.hidden=false;ta.select();}});
function openBoard(){board.hidden=false;boardTab(boardView);$('#bdClose').focus();loadBoards();if(LB.owner)loadAdmin();clearInterval(boardTimer);boardTimer=setInterval(function(){if(!document.hidden)loadBoards();},60000);}
function closeBoard(){board.hidden=true;clearInterval(boardTimer);}
$$('[data-board]').forEach(function(b){b.addEventListener('click',openBoard);});
$('#bdClose').addEventListener('click',closeBoard);
addEventListener('keydown',function(e){if(e.key==='Escape'&&!board.hidden)closeBoard();});
function boardTab(t){boardView=t;$$('#bdTabs button').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.t===t));});
  ['rush','players','today','crews','online'].forEach(function(k){$('#tab'+k.charAt(0).toUpperCase()+k.slice(1)).hidden=k!==t;});
  $('#bdSub').textContent={rush:'Market Rush high scores',players:backend()?'Best plates':'Your best plates on this phone',today:'Market of the Day',crews:'Crews',online:'Riders online now'}[t];
  if(t==='rush')renderRush();if(t==='players')renderBoard();if(t==='today')renderToday();if(t==='crews')renderCrews();if(t==='online')renderOnline();}
$$('#bdTabs button').forEach(function(b){b.addEventListener('click',function(){boardTab(b.dataset.t);});});
function isoDay(day){return new Date(day*86400000).toISOString().slice(0,10);}
async function loadBoards(){var b=backend();if(!b){if(!board.hidden)boardTab(boardView);return;}
  try{var rows=await b.api.leaderboard(50);LB.rows=rows.map(function(r){return {id:r.user_id,name:r.name,best:r.best,stars:r.stars,dish:(DISHES[r.dish]&&DISHES[r.dish].n)||r.dish,crew:r.crew_id};});}catch(e){}
  try{var rr=await b.api.rushBoard(50);LB.rush=rr.map(function(r){return {id:r.user_id,name:r.name,best:r.best,meters:r.meters,orders:r.orders};});}catch(e){}
  try{LB.crewRows=await b.api.crews();}catch(e){}
  try{var dm=MD.dailyMarket();var t=await b.api.today(isoDay(dm.day),50);LB.today=t.map(function(r){return {id:r.user_id,name:r.name,best:r.score,stars:r.stars};});}catch(e){}
  if(AUTH){try{var ms=await b.api.myScore();LB.myCrew=ms?ms.crew_id:null;}catch(e){}}
  if(!board.hidden)boardTab(boardView);renderMe();}
async function loadCrowdPrices(){var b=backend();if(!b)return;try{var rows=await b.api.approvedPrices();var c={};(rows||[]).forEach(function(r){if(!COUNTRIES[r.country]||!ITEMS[r.item])return;(c[r.country]=c[r.country]||{})[r.item]=+r.price;});MD.STATE.crowd=c;if(state.mode==='intro')renderHome();}catch(e){}}

/* ---------------- share, shopping list, price reports */
$('#listBtn').addEventListener('click',function(){var r=lastRes;if(!r||r.mode==='rush')return;track('share',{method:'whatsapp',content_type:'shopping_list'});window.open('https://wa.me/?text='+encodeURIComponent(shoppingText(r.dish,r.people)),'_blank','noopener');});
function wrapText(x,t,maxW){var words=t.split(' '),lines=[],line='';words.forEach(function(w){var tt=line?line+' '+w:w;if(x.measureText(tt).width>maxW&&line){lines.push(line);line=w;}else line=tt;});if(line)lines.push(line);return lines;}
function shareImage(r){return new Promise(function(resolve){var W=1080,H=1920,c=document.createElement('canvas');c.width=W;c.height=H;var x=c.getContext('2d'),d=DISHES[r.dish],p=progress();
  var g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#2B1A10');g.addColorStop(.45,'#111B14');g.addColorStop(1,'#0B120D');x.fillStyle=g;x.fillRect(0,0,W,H);
  var f=COUNTRIES[d.r].flag;for(var i=0;i<3;i++){x.fillStyle=f[i];x.fillRect(i*W/3,0,W/3,18);}
  var done=function(){x.fillStyle='#F6C445';x.font='700 44px Figtree, Arial, sans-serif';x.fillText(r.mode==='rush'?'MARKET RUSH':r.daily?'MARKET OF THE DAY':r.mode==='level'?'LEVEL '+(r.level+1)+' · '+COUNTRIES[d.r].market.toUpperCase():'MEURO MARKET RUN',90,300);
    x.fillStyle='#F4F6EF';x.font='700 96px "Bricolage Grotesque", Figtree, Arial, sans-serif';var ly=410;wrapText(x,r.mode==='rush'?(r.meters+' m · '+r.orders+' orders'):d.n,W-180).slice(0,2).forEach(function(l){x.fillText(l,90,ly);ly+=104;});
    x.fillStyle='rgba(244,246,239,.7)';x.font='600 42px Figtree, Arial, sans-serif';x.fillText(r.mode==='rush'?'Rode through '+COUNTRIES[d.r].city:COUNTRIES[d.r].n+' · for '+r.people+' · '+MD.fmtC(r.spent,d.r),90,ly+10);
    var cx=W/2,cy=1010,R2=210;x.lineWidth=40;x.strokeStyle='rgba(255,255,255,.12)';x.beginPath();x.arc(cx,cy,R2,0,7);x.stroke();
    var frac=r.mode==='rush'?1:r.score/100;x.strokeStyle='#F27B2B';x.lineCap='round';x.beginPath();x.arc(cx,cy,R2,-Math.PI/2,-Math.PI/2+Math.PI*2*frac);x.stroke();
    x.fillStyle='#F4F6EF';x.textAlign='center';var num=r.score.toLocaleString('en');x.font='700 '+(num.length>5?110:170)+'px "Bricolage Grotesque", Figtree, Arial, sans-serif';x.fillText(num,cx,cy+50);
    if(r.mode!=='rush'){x.fillStyle='#F6C445';x.font='700 90px Arial, sans-serif';x.fillText('★★★'.slice(0,r.stars)+'☆☆☆'.slice(0,3-r.stars),cx,cy+R2+150);}
    x.fillStyle='rgba(244,246,239,.85)';x.font='600 42px Figtree, Arial, sans-serif';x.fillText((p.streak||1)+'-day streak · can you beat me?',cx,1640);
    x.fillStyle='#F6C445';x.font='700 40px Figtree, Arial, sans-serif';x.fillText(location.host+location.pathname.replace(/index\.html$/,''),cx,1780);
    x.textAlign='left';c.toBlob(function(b){resolve(b);},'image/png');};
  var logo=new Image();logo.onload=function(){var lw=360,lh=logo.naturalHeight*lw/logo.naturalWidth;var t=document.createElement('canvas');t.width=logo.naturalWidth;t.height=logo.naturalHeight;var tx=t.getContext('2d');tx.drawImage(logo,0,0);tx.globalCompositeOperation='source-in';tx.fillStyle='#fff';tx.fillRect(0,0,t.width,t.height);x.drawImage(t,90,110,lw,lh);done();};logo.onerror=done;logo.src='img/logo.png';});}
$('#shareBtn').addEventListener('click',async function(){var r=lastRes;if(!r)return;var btn=$('#shareBtn');btn.disabled=true;
  var text=r.mode==='rush'?('I rode '+r.meters+' m and scored '+r.score.toLocaleString('en')+' in Meuro Market Rush. Beat me: '):((r.daily?'Market of the Day: ':'')+DISHES[r.dish].n+' for '+r.people+', '+r.stars+' stars on Meuro Market Run. Can you beat me? ');text+=location.href.split(/[?#]/)[0];
  try{var blob=await shareImage(r);var file=new File([blob],'meuro-market-run.png',{type:'image/png'});
    if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],text:text});track('share',{method:'native_image',content_type:'result'});}
    else{var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='meuro-market-run.png';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href);},4000);
      homeToast('Image saved. Post it to your WhatsApp status.');window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank','noopener');track('share',{method:'download_image',content_type:'result'});}}
  catch(e){if(!(e&&e.name==='AbortError'))window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank','noopener');}
  btn.disabled=false;});
$('#reportBtn').addEventListener('click',function(){if(!backend()){homeToast('Price reports open when Meuro accounts switch on. Thank you for wanting to help!');return;}needProfile(function(){var r=lastRes;var dk=r?r.dish:state.dish,d=DISHES[dk];
  var sel=$('#rpItem');sel.innerHTML='';d.keys.forEach(function(k){var o=document.createElement('option');o.value=k;o.textContent=ITEMS[k].n+' (per '+ITEMS[k].u+')';sel.appendChild(o);});
  var upd=function(){var k=sel.value;$('#rpAmountL').textContent='What you paid for 1 '+ITEMS[k].u+', in '+COUNTRIES[d.r].cur;$('#rpAmount').placeholder='Our price: '+MD.fmtC(MD.unitPrice(k,d.r),d.r);};
  sel.onchange=upd;upd();$('#reportModal').dataset.cc=d.r;$('#rpMsg').textContent='';$('#rpAmount').value='';$('#reportModal').hidden=false;setTimeout(function(){$('#rpAmount').focus();},50);});});
$('#rpClose').addEventListener('click',function(){$('#reportModal').hidden=true;});
$('#reportForm').addEventListener('submit',async function(e){e.preventDefault();var m=$('#rpMsg');m.className='err';var cc=$('#reportModal').dataset.cc,k=$('#rpItem').value;
  var amt=parseFloat(String($('#rpAmount').value||'').replace(/[^\d.]/g,''));if(!(amt>0)||amt>1e8){m.textContent='Enter the amount you paid, numbers only.';return;}
  var est=MD.unitPrice(k,cc);if(amt>est*20||amt<est/20){m.textContent='That looks very different from usual prices. Check the amount and the unit shown.';return;}
  try{await backend().api.reportPrice(cc,k,Math.round(amt*100)/100,COUNTRIES[cc].cur,$('#rpPlace').value);m.className='sb-msg ok';m.textContent='Thank you. We will check it and update the price for everyone.';track('price_report',{country:cc,item:k});setTimeout(function(){$('#reportModal').hidden=true;},1600);}
  catch(err){m.textContent=err&&err.code==='too_many_reports'?'You have sent 10 reports today. Thank you! Try again tomorrow.':'Could not send. Check your connection and try again.';}});

/* ================================================ LIVE: shared market, races, shouts, crews */
var LIVE={room:null,race:null,code:null,host:false,lobby:[],racers:[],ghosts:{},pos:{},lastSend:0,ready:false};
var SHOUTS=['Oya, follow me!','Market dey hot!','I don pass you!','Who get pepper?','Jollof na life','Gbam!','Wait for me o','Na me go win'];
function nick(){return (player&&player.name)||'Rider';}
function safeName(v){return String(v==null?'':v).replace(/[\u0000-\u001f<>]/g,'').slice(0,20)||'Rider';}
function safeColor(c){return KCOLORS.indexOf(c)>-1?c:'#F4F6EF';}
function labelFor(name,color){return ctex(512,128,function(x,w,h){x.fillStyle='rgba(10,16,12,.86)';rrect(x,10,10,w-20,h-20,50);x.fill();
  x.fillStyle=color;x.beginPath();x.arc(58,h/2,20,0,7);x.fill();x.fillStyle='#fff';x.font='700 50px Figtree, Arial, sans-serif';x.textBaseline='middle';x.fillText(name,96,h/2+3);});}
function makeGhost(name,color){
  var keep=keke.userData;keke.userData={};var g=keke.clone(true);keke.userData=keep;
  var rm=[];g.traverse(function(o){if(o.isLight||o===shieldMesh||o===magnetRing||(o.material&&(o.material===shieldMesh.material||o.material===magnetRing.material)))rm.push(o);});rm.forEach(function(o){if(o.parent)o.parent.remove(o);});
  var mat=M.keke.clone();mat.color.set(color);mat.transparent=true;mat.opacity=.85;
  var wheels=[];g.traverse(function(o){if(o.isMesh){if(o.material===M.keke)o.material=mat;o.castShadow=false;if(o.geometry.type==='CylinderGeometry'&&o.material===M.black&&Math.abs(o.position.y-.33)<.01)wheels.push(o);}});
  var lb=new THREE.Sprite(new THREE.SpriteMaterial({map:labelFor(name,color),depthTest:false,depthWrite:false,fog:false,toneMapped:false,transparent:true}));lb.scale.set(3.4,.85,1);lb.position.y=3.25;lb.renderOrder=11;g.add(lb);
  g.userData={wheels:wheels,label:lb,name:name,color:color,tz:6,tx:0,v:0,bubble:null,bubbleT:0};scene.add(g);return g;}
function bubble(obj,text){if(obj.userData.bubble)obj.remove(obj.userData.bubble);
  var t=ctex(640,150,function(x,w,h){x.fillStyle='#FFFFFF';rrect(x,10,10,w-20,h-40,60);x.fill();x.beginPath();x.moveTo(w/2-18,h-32);x.lineTo(w/2,h-4);x.lineTo(w/2+18,h-32);x.fill();
    x.fillStyle='#15231A';x.font='700 50px Figtree, Arial, sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(text,w/2,(h-30)/2+3);});
  var s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthTest:false,depthWrite:false,fog:false,toneMapped:false,transparent:true}));s.scale.set(4,.94,1);s.position.y=4.5;s.renderOrder=12;obj.add(s);obj.userData.bubble=s;obj.userData.bubbleT=2.8;}
function ridersToShow(){var list=[];
  if(LIVE.race){LIVE.racers.forEach(function(p){if(!p.sameTab&&p.presence&&p.presence.mode==='ride')list.push(p);});}
  else if(state.mode==='ride'&&RUN&&RUN.mode!=='race'){LIVE.lobby.forEach(function(p){if(!p.sameTab&&p.presence&&p.presence.mode==='ride'&&!p.presence.racing)list.push(p);});}
  return list.slice(0,12);}
function onPos(m){if(m.sameTab)return;var d=m.data||{};LIVE.pos[m.peer]={z:clamp(+d.z||0,-1200,10),x:clamp(+d.x||0,-4,4),v:clamp(+d.v||0,0,32),got:clamp(+d.g||0,0,12),need:clamp(+d.n||5,1,12),t:Date.now()};}
function syncGhosts(){var want={};
  ridersToShow().forEach(function(p){var pr=p.presence;want[p.peer]=1;var gh=LIVE.ghosts[p.peer];var nm=safeName(pr.nick),col=safeColor(pr.color);
    if(!gh||gh.userData.name!==nm||gh.userData.color!==col){if(gh)scene.remove(gh);gh=makeGhost(nm,col);LIVE.ghosts[p.peer]=gh;gh.position.set(0,0,6);}
    var pp=LIVE.pos[p.peer];if(pp){gh.userData.tz=pp.z;gh.userData.tx=pp.x;gh.userData.v=pp.v;}});
  Object.keys(LIVE.ghosts).forEach(function(k){if(!want[k]){scene.remove(LIVE.ghosts[k]);delete LIVE.ghosts[k];}});
  var n=Object.keys(LIVE.ghosts).length;$('#hRiders').textContent=n?('+'+n+' riding with you'):'';}
function clearGhosts(){Object.keys(LIVE.ghosts).forEach(function(k){scene.remove(LIVE.ghosts[k]);});LIVE.ghosts={};}
setInterval(function(){if(LIVE.room)syncGhosts();var cut=Date.now()-15000;Object.keys(LIVE.pos).forEach(function(k){if(LIVE.pos[k].t<cut)delete LIVE.pos[k];});if(LIVE.race)renderRaceMini();},1000);
LIVE.frame=function(dt){
  Object.keys(LIVE.ghosts).forEach(function(k){var g=LIVE.ghosts[k],u=g.userData;var p=LIVE.pos[k];if(p){u.tz=p.z;u.tx=p.x;u.v=p.v;}var dz=u.tz-g.position.z;
    g.position.z+=Math.abs(dz)>25?dz:dz*Math.min(1,dt*6);g.position.x+=(u.tx-g.position.x)*Math.min(1,dt*6);
    u.wheels.forEach(function(w){w.rotation.x-=u.v*dt/0.33;});g.visible=Math.abs(g.position.z-state.z)<150;
    if(u.bubble){u.bubbleT-=dt;if(u.bubbleT<=0){g.remove(u.bubble);u.bubble=null;}}});
  var ku=keke.userData;if(ku.bubble){ku.bubbleT-=dt;if(ku.bubbleT<=0){keke.remove(ku.bubble);ku.bubble=null;}}
  if(state.mode==='ride'&&RUN&&LIVE.room&&AUTH){var now=performance.now();if(now-LIVE.lastSend>(LITE?450:320)){LIVE.lastSend=now;
    var target=LIVE.race||LIVE.room;target.emit('pos',{z:Math.round(state.z*10)/10,x:Math.round(state.x*100)/100,v:Math.round(state.v*10)/10,g:Object.keys(RUN.got).length,n:RUN.need.length}).catch(function(){});}}};
function lobbyPresence(){if(!LIVE.room)return;var cr=myCrew();
  LIVE.room.presence({nick:nick(),color:S.color,mode:state.mode==='paused'?'ride':state.mode,racing:!!LIVE.race,dish:state.dish,crew:cr?cr.name.slice(0,24):null}).catch(function(){});}
function modeText(pr){if(pr.racing)return 'Racing with friends';if(pr.mode==='ride')return 'Riding · '+((DISHES[pr.dish]&&DISHES[pr.dish].n)||'');if(pr.mode==='result')return 'Checking their plate';return 'In the market';}
function renderOnline(){var n=LIVE.lobby.length;
  $('#onlineN').textContent=!AUTH?'Log in to ride with others':n<=1?'Only you here':n+' riders online';
  var av=$('#onlineAv');av.innerHTML='';LIVE.lobby.slice(0,5).forEach(function(p){var s=document.createElement('span');s.style.background=safeColor(p.presence&&p.presence.color);s.textContent=safeName(p.presence&&p.presence.nick).charAt(0).toUpperCase();av.appendChild(s);});
  var list=$('#bdOnline');list.innerHTML='';
  LIVE.lobby.forEach(function(p,i){var pr=p.presence||{};list.appendChild(row(i,safeName(pr.nick),modeText(pr)+(pr.crew?' · '+String(pr.crew).slice(0,24):''),'',null,p.isMe));});
  if(!LIVE.lobby.length)list.innerHTML='<p class="bd-empty">Nobody else is online right now. Share Market Run with friends to ride together.</p>';}
function shout(text){if(!LIVE.room)return;needProfile(function(){track('shout',{in_race:!!LIVE.race});var target=LIVE.race||LIVE.room;target.emit('shout',{t:SHOUTS.indexOf(text),n:nick(),c:S.color}).catch(function(){});$('#shoutBar').hidden=true;});}
function onShout(m){var d=m.data||{};var text=SHOUTS[d.t];if(!text)return;var name=safeName(d.n);
  if(m.isMe&&m.sameTab){bubble(keke,text);toast('You: '+text,'');return;}
  var g=LIVE.ghosts[m.peer];if(g)bubble(g,text);toast(name+': '+text,'bonus');tone(560,.08,'triangle',.05);}
(function(){var bar=$('#shoutBar');SHOUTS.forEach(function(s){var b=document.createElement('button');b.type='button';b.className='glass';b.textContent=s;b.addEventListener('click',function(){shout(s);});bar.appendChild(b);});
  $('#bShout').addEventListener('click',function(){bar.hidden=!bar.hidden;});})();

/* ---------------- races with friends */
var WORDS=['jollof','egusi','suya','amala','waakye','banku','amiwo','okra','dodo','kenkey','efo','moimoi','ugali','rolex','koshari','thieb'];
function newCode(){return WORDS[Math.floor(Math.random()*WORDS.length)]+'-'+(100+Math.floor(Math.random()*900));}
function normCode(v){v=String(v||'').toLowerCase().replace(/[^a-z0-9-]/g,'').replace(/^-+|-+$/g,'');return /^[a-z0-9][a-z0-9-]{2,30}$/.test(v)?v:null;}
function showRace(view){$('#race').hidden=false;$('#rcStart').hidden=view!=='start';$('#rcLobby').hidden=view!=='lobby';}
function hideRace(){$('#race').hidden=true;}
$('#bRace').addEventListener('click',function(){if(LIVE.race)showRace('lobby');else showRace('start');});
$('#rcClose').addEventListener('click',hideRace);
$('#rcCreate').addEventListener('click',function(){needProfile(function(){joinRace(newCode(),true);});});
$('#rcJoinForm').addEventListener('submit',function(e){e.preventDefault();var c=normCode($('#rcCode').value);if(!c){$('#rcErr').textContent='Enter the code your friend shared, like jollof-482.';return;}needProfile(function(){joinRace(c,false);});});
async function joinRace(code,host){
  if(!LIVE.room){$('#rcErr').textContent='Live races are not available on this connection.';return;}
  $('#rcErr').textContent='';$('#rcCreate').disabled=true;
  try{var r=await LIVE.room.join('race-'+code);}catch(err){$('#rcCreate').disabled=false;$('#rcErr').textContent=err&&err.code==='limit_reached'?'Too many races open on this device. Leave one and try again.':'Could not open that race. Check the code and try again.';return;}
  $('#rcCreate').disabled=false;track(host?'race_create':'race_join',{});
  LIVE.race=r;LIVE.code=code;LIVE.host=!!host;LIVE.racers=r.peers();
  if(!$('#rcPick').value)$('#rcPick').value=LEVELS[currentLevel()].dish;
  r.presence({nick:nick(),color:S.color,host:!!host,mode:'lobby',dish:$('#rcPick').value,done:false,score:null}).catch(function(){});
  r.onPeers(function(ch){LIVE.racers=ch.peers;renderRaceLobby();renderRaceMini();renderRaceResults();syncGhosts();
    ch.joined.forEach(function(p){if(!p.isMe&&LIVE.ready)toast(safeName(p.presence&&p.presence.nick)+' joined the race','good');});},function(){toast('The race connection ended.','bad');leaveRace(true);});
  r.on('start',function(m){var d=m.data||{};if(!DISHES[d.dish]||!isFinite(+d.seed))return;beginRace(d.dish,+d.seed,safeName(d.n));});
  r.on('shout',onShout);r.on('pos',onPos);
  LIVE.ready=true;$('#rcCodeBig').textContent=code.toUpperCase();updateInvite();showRace('lobby');renderRaceLobby();lobbyPresence();
  $('#bRace').classList.add('on');$('#bRaceT').textContent=code.toUpperCase();}
async function leaveRace(silent){var r=LIVE.race;LIVE.race=null;LIVE.code=null;LIVE.host=false;LIVE.racers=[];LIVE.ready=false;if(r)try{await r.leave();}catch(e){}
  clearGhosts();syncGhosts();hideRace();$('#raceMini').hidden=true;$('#raceRes').hidden=true;$('#bRace').classList.remove('on');$('#bRaceT').textContent='Race';lobbyPresenceSafe();if(!silent)homeToast('You left the race.');}
$('#rcLeave').addEventListener('click',function(){leaveRace(false);});
function raceLink(){return location.href.split(/[?#]/)[0]+'?race='+LIVE.code;}
function inviteText(){return 'Race me on Meuro Market Run! Tap to join my race (code '+LIVE.code.toUpperCase()+'): '+raceLink();}
function updateInvite(){$('#rcWa').href='https://wa.me/?text='+encodeURIComponent(inviteText());}
$('#rcWa').addEventListener('click',function(e){track('share',{method:'whatsapp',content_type:'race_invite'});if(navigator.share){e.preventDefault();navigator.share({title:'Meuro Market Run',text:'Race me on Meuro Market Run! Code '+LIVE.code.toUpperCase(),url:raceLink()}).catch(function(){window.open($('#rcWa').href,'_blank','noopener');});}});
$('#rcCopy').addEventListener('click',function(){track('share',{method:'copy_link',content_type:'race_invite'});var t=raceLink();var b=$('#rcCopy');
  var ok=function(){b.textContent='Link copied';setTimeout(function(){b.textContent='Copy link';},1800);};var fb=function(){$('#rcInvite').hidden=false;$('#rcInvite').value=inviteText();$('#rcInvite').select();};
  try{navigator.clipboard.writeText(t).then(ok,fb);}catch(e){fb();}});
function hostPeer(){var h=LIVE.racers.filter(function(p){return p.presence&&p.presence.host;});return h[0]||null;}
function raceBudget(dk){return MD.budgetFor(dk,4,1.2);}
function renderRaceLobby(){if(!LIVE.race)return;var list=$('#rcRiders');list.innerHTML='';var hp=hostPeer();
  LIVE.racers.forEach(function(p){var pr=p.presence||{};var li=document.createElement('div');li.className='rc-rider';var dot=document.createElement('i');dot.style.background=safeColor(pr.color);var nm=document.createElement('b');nm.textContent=safeName(pr.nick)+(p.isMe?' (you)':'');li.appendChild(dot);li.appendChild(nm);
    var tag=document.createElement('span');tag.textContent=pr.host?'Host':(pr.mode==='ride'?'Riding':pr.mode==='done'?'Finished':'Ready');li.appendChild(tag);list.appendChild(li);});
  var dk=(hp&&hp.presence&&DISHES[hp.presence.dish])?hp.presence.dish:($('#rcPick').value||'jollof');var d=DISHES[dk];
  $('#rcDishImg').src=dishImg(dk);$('#rcDishName').textContent=d.n+' for 4';$('#rcDishInfo').textContent=fmtFor(raceBudget(dk),d.r)+' budget · '+d.keys.length+' items · '+COUNTRIES[d.r].n;
  var amHost=LIVE.host||!hp;if(amHost&&$('#rcPick').value!==dk)$('#rcPick').value=dk;$('#rcStartBtn').hidden=!amHost;$('#rcPick').hidden=!amHost;$('#rcWait').hidden=amHost;
  $('#rcCount').textContent=LIVE.racers.length+(LIVE.racers.length===1?' rider':' riders');}
(function(){var sel=$('#rcPick');Object.keys(COUNTRIES).forEach(function(cc){var g=document.createElement('optgroup');g.label=COUNTRIES[cc].n;Object.keys(DISHES).filter(function(k){return DISHES[k].r===cc;}).forEach(function(k){var o=document.createElement('option');o.value=k;o.textContent=DISHES[k].n;g.appendChild(o);});if(g.children.length)sel.appendChild(g);});
  sel.value='jollof';sel.addEventListener('change',function(){if(LIVE.race)LIVE.race.presence({dish:sel.value}).catch(function(){});renderRaceLobby();});})();
$('#rcStartBtn').addEventListener('click',function(){if(!LIVE.race)return;var dk=$('#rcPick').value||'jollof';var seed=1+Math.floor(Math.random()*2000000000);
  LIVE.race.emit('start',{dish:dk,seed:seed,n:nick()}).catch(function(err){toast(err&&err.code==='not_permitted'?'You cannot start races in this space.':'Could not start the race. Try again.','bad');});});
function beginRace(dish,seed,by){hideRace();closeBoard();closeAllModals();$('#result').hidden=true;$('#shoutBar').hidden=true;LIVE.pos={};
  if(state.mode==='ride'&&RUN){clearTrack();RUN=null;state.mode='intro';}
  startRun({mode:'race',dish:dish,seed:seed,people:4,budget:raceBudget(dish),speed:14,length:480,obstacles:.45,decoys:.38,goats:true,doubles:true,locked:true});
  LIVE.race.presence({mode:'ride',done:false,score:null,dish:dish}).catch(function(){});lobbyPresence();
  $('#raceMini').hidden=false;renderRaceMini();
  countdown(['3','2','1','GO!'],850,function(){if(RUN){RUN.locked=false;sfx('horn');}});
  toast((by||'The host')+' started the race: '+DISHES[dish].n,'bonus');}
function raceRank(){return LIVE.racers.map(function(p){var pr=p.presence||{},pp=p.sameTab?{z:state.z,got:RUN?Object.keys(RUN.got).length:0,need:RUN?RUN.need.length:5}:(LIVE.pos[p.peer]||{});return {p:p,pr:pr,done:pr.mode==='done',score:clamp(+pr.score||0,0,100),prog:-(pp.z||6),got:pp.got||0,need:pp.need||5};})
  .sort(function(a,b){if(a.done!==b.done)return a.done?-1:1;if(a.done)return b.score-a.score;return b.prog-a.prog;});}
function renderRaceMini(){if(!LIVE.race){$('#raceMini').hidden=true;return;}var l=$('#raceMiniList');l.innerHTML='';
  raceRank().slice(0,5).forEach(function(r,i){var d=document.createElement('div');d.className='rm-row'+(r.p.isMe?' me':'');var a=document.createElement('span');a.textContent=(i+1)+'.';var dot=document.createElement('i');dot.style.background=safeColor(r.pr.color);var b=document.createElement('b');b.textContent=safeName(r.pr.nick);var c=document.createElement('em');c.textContent=r.done?(r.score+' pts'):(r.got+'/'+r.need);d.appendChild(a);d.appendChild(dot);d.appendChild(b);d.appendChild(c);l.appendChild(d);});}
function renderRaceResults(){var box=$('#raceRes');if(!LIVE.race||state.mode!=='result'){box.hidden=true;return;}box.hidden=false;var l=$('#raceResList');l.innerHTML='';
  raceRank().forEach(function(r,i){var el=row(i,safeName(r.pr.nick)+(r.done&&i===0?' · Winner':''),r.done?starStr(r.pr.stars):'Still riding · '+r.got+'/'+r.need+' items',r.done?r.score:'…',null,r.p.isMe);if(!r.done)el.querySelector('.pos').textContent='·';l.appendChild(el);});
  var amHost=LIVE.host||!hostPeer();$('#raceAgain').textContent=amHost?'Start a rematch':'Back to race lobby';}
$('#raceAgain').addEventListener('click',function(){goHome();if(LIVE.race){LIVE.race.presence({mode:'lobby',done:false,score:null}).catch(function(){});showRace('lobby');renderRaceLobby();}});
LIVE.onFinish=function(score,st){lobbyPresenceSafe();if(LIVE.race){LIVE.race.presence({mode:'done',done:true,score:score,stars:st,z:state.z}).catch(function(){});$('#raceMini').hidden=true;renderRaceResults();}};

/* ---------------- crews */
function myCrew(){var id=LB.myCrew;if(!id)return null;var r=(LB.crewRows||[]).filter(function(c){return c.crew_id===id;})[0];return r?{id:r.crew_id,name:cleanName(r.name)}:null;}
function renderCrews(){var l=$('#bdCrews');l.innerHTML='';var mine=LB.myCrew;var head=$('#crewMine');
  if(!backend()){head.textContent='Crews switch on with Meuro accounts.';$('#crewForm').hidden=true;return;}$('#crewForm').hidden=false;
  if(mine&&myCrew()){head.innerHTML='';var t=document.createElement('span');t.textContent='Your crew: ';var b=document.createElement('b');b.textContent=myCrew().name;var lv=document.createElement('button');lv.type='button';lv.className='linkbtn';lv.textContent=' Leave';lv.addEventListener('click',function(){setCrew(null);});head.appendChild(t);head.appendChild(b);head.appendChild(lv);}
  else head.textContent='Join a crew or start one with your friends. A crew\'s score is its top 5 riders\' best plates.';
  var st=(LB.crewRows||[]);if(!st.length)l.innerHTML='<p class="bd-empty">No crews yet. Start the first one.</p>';
  st.forEach(function(s,i){var el=row(i,cleanName(s.name)||'Crew',s.members+(s.members===1?' rider':' riders'),s.points,null,s.crew_id===mine);
    if(s.crew_id!==mine){var jb=document.createElement('button');jb.type='button';jb.className='rm';jb.style.color='var(--gold)';jb.textContent='Join this crew';jb.addEventListener('click',function(){setCrew(s.crew_id);});el.appendChild(jb);}l.appendChild(el);});}
var CREW_MSG={already_has_crew:'You already started a crew. You can lead one crew at a time.',name_taken:'That crew name is taken. Try another.',bad_name:'Use 3 to 24 letters or numbers for the crew name.',no_such_crew:'That crew no longer exists.'};
function setCrew(id){needProfile(async function(){var b=backend();if(!b)return;
  try{await b.api.setCrew(id);LB.myCrew=id;track(id?'crew_join':'crew_leave',{});await loadBoards();var c=myCrew();homeToast(id?'You joined '+(c?c.name:'the crew'):'You left your crew.');lobbyPresence();renderCrews();}
  catch(err){homeToast(CREW_MSG[err&&err.code]||'Could not update your crew. Try again.');}});}
$('#crewForm').addEventListener('submit',function(e){e.preventDefault();var n=cleanName($('#crewName').value).slice(0,24);if(!n||n.length<3){$('#crewErr').textContent=CREW_MSG.bad_name;return;}$('#crewErr').textContent='';
  needProfile(async function(){var b=backend();if(!b)return;
    try{track('crew_create',{});var id=await b.api.createCrew(n);$('#crewName').value='';LB.myCrew=id;await loadBoards();renderCrews();homeToast('Crew created: '+n);lobbyPresence();}catch(err){$('#crewErr').textContent=CREW_MSG[err&&err.code]||'Could not create the crew. Try again.';}});});
$('#bCrew').addEventListener('click',function(){openBoard();boardTab('crews');});
$('#onlinePill').addEventListener('click',function(){openBoard();boardTab('online');});

/* ================================================ start up */
(async function initLive(){
  renderMe();
  if(!window.claude||typeof window.claude.use!=='function')return;
  var room=null;try{room=await window.claude.use('room');}catch(e){}
  if(!room)return;
  LIVE.room=room;document.body.classList.remove('live-off');document.body.classList.add('live-on');
  room.onPeers(function(ch){LIVE.lobby=ch.peers.filter(function(p){return p.kind==='viewer';});renderOnline();syncGhosts();},function(){document.body.classList.add('live-off');});
  room.on('shout',onShout);room.on('pos',onPos);
  lobbyPresence();
  var q='';try{q=new URLSearchParams(location.search).get('race')||'';}catch(x){}var h=(location.hash||'').replace('#','');if(!q&&/^race-/.test(h))q=h.slice(5);var c=normCode(q);
  if(c){showRace('start');$('#rcCode').value=c.toUpperCase();needProfile(function(){joinRace(c,false);});}})();
window.__meuroReady.then(function(b){if(b){loadBoards();loadCrowdPrices();}});
goHome();
loop();
setTimeout(function(){if(canClaim())openReward();else if(!S.stats.rides&&!S.tut)$('#howModal').hidden=false;},900);
window.__mr={S:S,state:state,camera:camera,keke:keke,get RUN(){return RUN;},get TR(){return TR;},startRun:startRun,levelCfg:MD.levelCfg,goHome:goHome,openLevel:openLevel,startRush:startRush,startDaily:startDaily,endRun:endRun};
})();
