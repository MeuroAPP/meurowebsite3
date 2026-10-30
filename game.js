// Meuro Market Run game (3D market, rides, live play).
(function(){
'use strict';
var $=function(s){return document.querySelector(s)};
var fmt=function(n){return window.MEURO_DATA.fmtC(n,window.MEURO_DATA.STATE.cc);};

/* ------------------------------------------------ data */
var MD=window.MEURO_DATA, ITEMS=MD.ITEMS, DISHES=MD.DISHES, COUNTRIES=MD.COUNTRIES;
var REGIONS={};Object.keys(COUNTRIES).forEach(function(k){REGIONS[k]=COUNTRIES[k].n;});
function hex(c){return '#'+('000000'+c.toString(16)).slice(-6);}
function setCountry(cc){MD.STATE.cc=COUNTRIES[cc]?cc:'ng';}
function fmtFor(n,cc){return MD.fmtC(n,cc);}
var ART={};
/* Dishes without a photo get an honest title card in the country's colours (no fake food picture). */
function dishImg(k){var d=DISHES[k];if(d.img)return 'img/'+d.img+'.webp';if(ART[k])return ART[k];
  var c=document.createElement('canvas'),W=300,H=360;c.width=W;c.height=H;var x=c.getContext('2d');var f=COUNTRIES[d.r].flag;
  var g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#26332A');g.addColorStop(1,'#0E1611');x.fillStyle=g;x.fillRect(0,0,W,H);
  for(var i=0;i<3;i++){x.fillStyle=f[i];x.fillRect(i*W/3,0,W/3,8);}
  var cx=W/2,cy=H*.42,R=96;x.fillStyle='rgba(0,0,0,.35)';x.beginPath();x.arc(cx+5,cy+8,R+16,0,7);x.fill();
  x.fillStyle='#EDE8DC';x.beginPath();x.arc(cx,cy,R+16,0,7);x.fill();x.fillStyle='#F7F4EC';x.beginPath();x.arc(cx,cy,R,0,7);x.fill();
  var n=d.items.length;d.items.forEach(function(it,ii){var a0=ii/n*Math.PI*2-Math.PI/2,a1=(ii+1)/n*Math.PI*2-Math.PI/2;x.fillStyle=hex(ITEMS[it].c);x.globalAlpha=.88;x.beginPath();x.moveTo(cx,cy);x.arc(cx,cy,R-10,a0+.04,a1-.04);x.closePath();x.fill();});
  x.globalAlpha=1;x.fillStyle='rgba(255,255,255,.18)';x.beginPath();x.ellipse(cx-34,cy-44,30,10,-.6,0,7);x.fill();
  ART[k]=c.toDataURL('image/png');return ART[k];}
var LANES=[-3.2,0,3.2], ROUTE=500;
var STOPS=[
  {z:-120,eye:'Tour stop 1',t:'Meuro AI',d:'Snap any plate for a nutrition estimate and plan meals around your budget.',href:'ai.html',sign:['MEURO AI','Scan any plate']},
  {z:-235,eye:'Tour stop 2',t:'Nutritionist corner',d:'Verified dietitians for PCOS, diabetes, sports and weight goals.',href:'nutritionists.html',sign:['NUTRITIONISTS','Verified experts']},
  {z:-350,eye:'Tour stop 3',t:'Meuro Foods',d:'Nutrient-dense, African-made foods. In development.',href:'foods.html',sign:['MEURO FOODS','Coming soon']},
  {z:-480,eye:'Finish',t:'Meuro Kitchen',d:'Park up. Meuro AI is scanning your plate.',href:'kitchen.html',sign:['MEURO KITCHEN','Finish']}
];

/* ------------------------------------------------ renderer */
var canvas=$('#c');
var LITE=(function(){try{return localStorage.getItem('meuro.lite')==='1';}catch(e){return false;}})();
var isSmall=LITE||Math.min(innerWidth,innerHeight)<700 || matchMedia('(pointer:coarse)').matches;
var renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:!isSmall||devicePixelRatio<2,powerPreference:'high-performance'});
renderer.setPixelRatio(LITE?1:Math.min(devicePixelRatio, isSmall?1.6:2));
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.05;
renderer.shadowMap.enabled=!isSmall; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
var scene=new THREE.Scene();
var FOG=new THREE.Color(0xE9A46A);
scene.fog=new THREE.Fog(FOG, 55, isSmall?155:195);
var FAR=isSmall?165:205, SKYR=FAR-22;
var camera=new THREE.PerspectiveCamera(58,1,0.1,FAR);

/* sky dome */
(function(){
  var g=new THREE.SphereGeometry(SKYR,32,16);
  var m=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:{top:{value:new THREE.Color(0x2B3F6B)},mid:{value:new THREE.Color(0xF0A262)},low:{value:new THREE.Color(0xF7C98E)}},
    vertexShader:'varying vec3 v;void main(){v=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'uniform vec3 top,mid,low;varying vec3 v;void main(){float h=v.y;vec3 c=mix(low,mid,smoothstep(-.05,.12,h));c=mix(c,top,smoothstep(.12,.6,h));gl_FragColor=vec4(c,1.);}'});
  var sky=new THREE.Mesh(g,m); sky.name='sky'; scene.add(sky);
  // sun disc
  var sun=new THREE.Mesh(new THREE.CircleGeometry(14,40),new THREE.MeshBasicMaterial({color:0xFFE2A8,fog:false}));
  sun.scale.setScalar(SKYR/300); sun.position.set(-60,28,-300).normalize().multiplyScalar(SKYR-6); sun.lookAt(0,0,0); scene.add(sun); scene.userData.sky=sky; scene.userData.sun=sun;
})();

var hemi=new THREE.HemisphereLight(0xFFE2C0,0x8A6A4E,1.05); scene.add(hemi);
var sunL=new THREE.DirectionalLight(0xFFC27A,1.55); sunL.position.set(-30,40,-40); scene.add(sunL); scene.add(sunL.target);
if(renderer.shadowMap.enabled){sunL.castShadow=true; sunL.shadow.mapSize.set(2048,2048); var sc=sunL.shadow.camera; sc.left=-40;sc.right=40;sc.top=40;sc.bottom=-40;sc.near=1;sc.far=140; sunL.shadow.bias=-0.0006;}
scene.add(new THREE.AmbientLight(0xffffff,0.32));

/* ------------------------------------------------ canvas textures */
function ctex(w,h,draw,rep){var c=document.createElement('canvas');c.width=w;c.height=h;var x=c.getContext('2d');draw(x,w,h);var t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=renderer.capabilities.getMaxAnisotropy();if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep[0],rep[1]);}t.userData={canvas:c,ctx:x};return t;}
function noise(x,w,h,base,vars,n,sz){x.fillStyle=base;x.fillRect(0,0,w,h);for(var i=0;i<n;i++){x.fillStyle=vars[i%vars.length];x.globalAlpha=Math.random()*.5+.1;var s=Math.random()*sz+1;x.fillRect(Math.random()*w,Math.random()*h,s,s);}x.globalAlpha=1;}
var texLaterite=ctex(256,256,function(x,w,h){noise(x,w,h,'#A85A35',['#8E4527','#BD6B42','#7A3B22','#C98057'],2600,4);},[60,140]);
var texRoad=ctex(256,512,function(x,w,h){noise(x,w,h,'#3B3836',['#2E2C2B','#4A4644','#55504B','#2A2725'],5000,3);
  x.fillStyle='rgba(235,225,200,.85)';for(var y=0;y<h;y+=128){x.fillRect(w*0.355-3,y,6,64);x.fillRect(w*0.645-3,y,6,64);}
  x.fillStyle='rgba(240,210,120,.9)';x.fillRect(6,0,5,h);x.fillRect(w-11,0,5,h);
  x.globalAlpha=.25;x.fillStyle='#1d1b1a';for(var i=0;i<6;i++){x.beginPath();x.ellipse(Math.random()*w,Math.random()*h,20+Math.random()*30,10+Math.random()*20,Math.random()*3,0,7);x.fill();}x.globalAlpha=1;},[1,ROUTE/22]);
function stripeTex(a,b){return ctex(128,32,function(x,w,h){for(var i=0;i<8;i++){x.fillStyle=i%2?a:b;x.fillRect(i*w/8,0,w/8,h);}});}
function ankaraTex(seed){var pals=[['#F27B2B','#1E4A2A','#F6C445','#2F6E8F'],['#7A3FB5','#F6C445','#E5533D','#0F6B5C'],['#3B8C50','#F27B2B','#FFF3DC','#1C2A6B'],['#C2185B','#FFC107','#00796B','#212121']];var p=pals[seed%pals.length];
  return ctex(128,128,function(x,w,h){x.fillStyle=p[0];x.fillRect(0,0,w,h);for(var i=0;i<4;i++)for(var j=0;j<4;j++){var cx=i*32+16,cy=j*32+16;x.fillStyle=p[1];x.beginPath();x.arc(cx,cy,12,0,7);x.fill();x.fillStyle=p[2];x.beginPath();x.arc(cx,cy,7,0,7);x.fill();x.fillStyle=p[3];x.beginPath();x.arc(cx,cy,3,0,7);x.fill();}},[1,1]);}
function facadeTex(base){return ctex(256,256,function(x,w,h){noise(x,w,h,base,['rgba(0,0,0,.08)','rgba(255,255,255,.08)'],900,6);
  for(var r=0;r<3;r++)for(var c=0;c<3;c++){var X=20+c*80,Y=24+r*78;x.fillStyle='#2A2522';x.fillRect(X,Y,52,50);x.fillStyle='rgba(255,200,120,'+(Math.random()<.45?.85:.15)+')';x.fillRect(X+4,Y+4,44,42);x.fillStyle='rgba(60,40,30,.7)';x.fillRect(X+24,Y+4,4,42);x.fillRect(X-4,Y+50,60,5);}},[1,1]);}
var texLoader=new THREE.TextureLoader();
var photo={};['jollof','egusi','okra','efo-riro','suya','amala','peppersoup','fried-rice','stew-rice'].forEach(function(k){var t=texLoader.load('img/'+k+'.webp');t.encoding=THREE.sRGBEncoding;photo[k]=t;});
var logoImg=new Image(); logoImg.src='img/logo.png'; var whiteLogo=null;
function makeWhite(){var c=document.createElement('canvas');c.width=logoImg.naturalWidth;c.height=logoImg.naturalHeight;var x=c.getContext('2d');x.drawImage(logoImg,0,0);x.globalCompositeOperation='source-in';x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);whiteLogo=c;}
var signTextures=[];
function signTex(title,sub,bg,photoKey,withLogo){
  var t=ctex(1024,320,function(){});
  t.userData.draw=function(){var x=t.userData.ctx,w=1024,h=320;x.clearRect(0,0,w,h);
    x.fillStyle=bg;x.fillRect(0,0,w,h);
    var left=40;
    var im=photoKey&&photo[photoKey]&&photo[photoKey].image;if(im instanceof HTMLImageElement && im.complete && im.naturalWidth){var s=Math.max(300/im.width,240/im.height);x.save();x.beginPath();x.roundRect?x.roundRect(40,40,300,240,24):x.rect(40,40,300,240);x.clip();x.drawImage(im,40+(300-im.width*s)/2,40+(240-im.height*s)/2,im.width*s,im.height*s);x.restore();left=380;}
    if(withLogo && whiteLogo){var lh=54,lw=whiteLogo.width*lh/whiteLogo.height;x.drawImage(whiteLogo,left,52,lw,lh);}
    x.fillStyle='#fff';x.font='700 '+(title.length>12?88:104)+'px "Bricolage Grotesque", "Avenir Next", sans-serif';x.textBaseline='alphabetic';x.fillText(title,left,withLogo?205:180);
    x.fillStyle='rgba(255,255,255,.8)';x.font='600 46px Figtree, Arial, sans-serif';x.fillText(sub,left,withLogo?268:250);
    t.needsUpdate=true;};
  t.userData.draw(); signTextures.push(t); return t;
}
function redrawSigns(){signTextures.forEach(function(t){t.userData.draw();});}
logoImg.addEventListener('load',function(){makeWhite();redrawSigns();}); if(logoImg.complete&&logoImg.naturalWidth)makeWhite(); Object.keys(photo).forEach(function(k){var n=0,chk=setInterval(function(){var im=photo[k].image;if((im instanceof HTMLImageElement&&im.complete)||++n>80){clearInterval(chk);redrawSigns();}},150);});
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(redrawSigns);

/* ------------------------------------------------ materials */
function std(c,o){return new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.8,metalness:0},o||{}));}
var M={wood:std(0x7A4E2D),woodDark:std(0x4E3220),metal:std(0x9AA3A8,{metalness:.6,roughness:.4}),pole:std(0x55524E,{metalness:.4,roughness:.5}),roof:std(0x7B4B30,{metalness:.3,roughness:.6}),
  skin:std(0x5A3A26,{roughness:.6}),keke:std(0xF2C230,{roughness:.45,metalness:.15}),kekeGreen:std(0x2F7A46,{roughness:.45}),canvas:std(0x1E2A22,{roughness:.9}),
  black:std(0x161616,{roughness:.7}),chrome:std(0xD9DDE0,{metalness:.9,roughness:.25}),glass:new THREE.MeshStandardMaterial({color:0xBFE3FF,transparent:true,opacity:.28,roughness:.05,metalness:.2})};

/* ------------------------------------------------ world: ground + road */
var ground=new THREE.Mesh(new THREE.PlaneGeometry(220,ROUTE+300),std(0xffffff,{map:texLaterite,roughness:1}));
ground.rotation.x=-Math.PI/2; ground.position.set(0,0,-ROUTE/2+60); ground.receiveShadow=true; scene.add(ground);
var road=new THREE.Mesh(new THREE.PlaneGeometry(11,ROUTE+140),std(0xffffff,{map:texRoad,roughness:.92}));
road.rotation.x=-Math.PI/2; road.position.set(0,0.02,-ROUTE/2+30); road.receiveShadow=true; scene.add(road);
// kerbs
[-5.8,5.8].forEach(function(x){var k=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.18,ROUTE+140),new THREE.MeshStandardMaterial({map:stripeTex('#E8E2D2','#2B2B2B'),roughness:.8}));k.material.map.wrapS=k.material.map.wrapT=THREE.RepeatWrapping;k.material.map.repeat.set(1,1);k.position.set(x,0.09,-ROUTE/2+30);k.receiveShadow=true;scene.add(k);});

/* ------------------------------------------------ instanced produce */
var MAXS=9000,MAXC=3200,MAXB=900,MAXL=900;var CAP={s:MAXS,c:MAXC,b:MAXB,l:MAXL};
var sphG=new THREE.SphereGeometry(1,10,8), cylG=new THREE.CylinderGeometry(1,1,1,10), basG=new THREE.CylinderGeometry(1,.78,1,18,1,true);
var spheres=new THREE.InstancedMesh(sphG,std(0xffffff,{roughness:.45}),MAXS), cyls=new THREE.InstancedMesh(cylG,std(0xffffff,{roughness:.7}),MAXC), basins=new THREE.InstancedMesh(basG,std(0xffffff,{roughness:.35,metalness:.25,side:THREE.DoubleSide}),MAXB);
var bulbs=new THREE.InstancedMesh(new THREE.SphereGeometry(.13,8,6),new THREE.MeshBasicMaterial({color:0xFFD27A}),MAXL);
var cnt={s:0,c:0,b:0,l:0}; var tmpO=new THREE.Object3D(), tmpC=new THREE.Color();
function put(mesh,key,x,y,z,sx,sy,sz,col,rx,ry,rz){if(cnt[key]>=CAP[key])return;var i=cnt[key]++;tmpO.position.set(x,y,z);tmpO.rotation.set(rx||0,ry||0,rz||0);tmpO.scale.set(sx,sy,sz);tmpO.updateMatrix();mesh.setMatrixAt(i,tmpO.matrix);if(col!=null&&mesh.setColorAt){mesh.setColorAt(i,tmpC.set(col));}}
var R=function(a,b){return a+Math.random()*(b-a)};
var PRODUCE={
  tomatoes:function(x,y,z){for(var i=0;i<26;i++){var a=R(0,6.28),r=Math.sqrt(Math.random())*.5,h=(.5-r)*.45;put(spheres,'s',x+Math.cos(a)*r,y+.12+h,z+Math.sin(a)*r,.12,.11,.12,[0xD7261E,0xC81E16,0xE33B22][i%3]);}},
  pepper:function(x,y,z){for(var i=0;i<30;i++){var a=R(0,6.28),r=Math.sqrt(Math.random())*.48,h=(.48-r)*.4;put(spheres,'s',x+Math.cos(a)*r,y+.08+h,z+Math.sin(a)*r,.06,.06,.11,[0xE02A12,0xF0581A,0xB81408][i%3],0,R(0,3),0);}},
  onions:function(x,y,z){for(var i=0;i<18;i++){var a=R(0,6.28),r=Math.sqrt(Math.random())*.45,h=(.45-r)*.4;put(spheres,'s',x+Math.cos(a)*r,y+.12+h,z+Math.sin(a)*r,.12,.13,.12,[0x8E3A63,0xA24A6E,0x7C2F55][i%3]);}},
  oranges:function(x,y,z){for(var i=0;i<20;i++){var a=R(0,6.28),r=Math.sqrt(Math.random())*.48,h=(.48-r)*.42;put(spheres,'s',x+Math.cos(a)*r,y+.13+h,z+Math.sin(a)*r,.13,.13,.13,[0x7FA83A,0x9DB848,0xE6A12A][i%3]);}},
  yam:function(x,y,z){for(var i=0;i<6;i++)put(cyls,'c',x+R(-.5,.5),y+.12+(i>3?.2:0),z+R(-.35,.35),.11,R(.8,1.1),.13,[0x6B4A2E,0x5A3D25][i%2],Math.PI/2,R(0,3),R(-.2,.2));},
  plantain:function(x,y,z){for(var i=0;i<10;i++)put(cyls,'c',x+R(-.5,.5),y+.08+(i>6?.14:0),z+R(-.35,.35),.06,R(.45,.6),.07,[0xD9C23A,0xB5B83A,0xC9A12C][i%3],Math.PI/2+R(-.2,.2),R(0,3),R(-.3,.3));},
  fish:function(x,y,z){for(var i=0;i<6;i++)put(spheres,'s',x+R(-.45,.45),y+.08,z+R(-.3,.3),.38,.07,.1,[0xB9C2C8,0x8F9AA2][i%2],0,R(0,3),0);},
  basin:function(x,y,z,fill){put(basins,'b',x,y+.16,z,.42,.32,.42,[0x2F6E8F,0xE9E4D8,0xC23B2B,0x3B8C50][Math.floor(Math.random()*4)]);put(cyls,'c',x,y+.28,z,.38,.06,.38,fill);for(var i=0;i<8;i++){var a=R(0,6.28),r=R(0,.3);put(spheres,'s',x+Math.cos(a)*r,y+.32,z+Math.sin(a)*r,.06,.04,.06,fill);}},
  greens:function(x,y,z){for(var i=0;i<16;i++)put(spheres,'s',x+R(-.45,.45),y+R(.1,.28),z+R(-.35,.35),R(.12,.2),R(.04,.08),R(.16,.24),[0x2E6B2A,0x3F8A35,0x24561F][i%3],R(-.5,.5),R(0,3),R(-.5,.5));}
};
var PKEYS=Object.keys(PRODUCE), FILLS=[0xF2EEE3,0xE8D7A1,0x8A5A3A,0xF0C27B,0xD9A35A];

/* ------------------------------------------------ stalls, traders, buildings */
var UMB=['#D63A2F','#F2B632','#2F7FD6','#3B8C50','#F27B2B','#7A3FB5','#E9E4D8'];
var umbTex=UMB.map(function(c,i){return stripeTex(c, i===6?'#3B8C50':'#F4F1EA');});
var ankara=[0,1,2,3].map(ankaraTex);
var tableG=new THREE.BoxGeometry(3.2,.12,2), legG=new THREE.BoxGeometry(.1,.9,.1), umbG=new THREE.ConeGeometry(2.3,.9,8,1,true), poleG=new THREE.CylinderGeometry(.05,.05,2.8,6);
var bodyG=new THREE.CylinderGeometry(.28,.42,1.2,10), headG=new THREE.SphereGeometry(.2,12,10), tieG=new THREE.SphereGeometry(.27,10,8,0,6.29,0,1.6);
function stall(x,z,side){
  var g=new THREE.Group(); g.position.set(x,0,z); scene.add(g);
  var t=new THREE.Mesh(tableG,M.wood); t.position.y=.9; t.castShadow=true; t.receiveShadow=true; g.add(t);
  [[-1.5,-.9],[1.5,-.9],[-1.5,.9],[1.5,.9]].forEach(function(p){var l=new THREE.Mesh(legG,M.woodDark);l.position.set(p[0],.45,p[1]);g.add(l);});
  var ui=Math.floor(Math.random()*UMB.length);
  var u=new THREE.Mesh(umbG,new THREE.MeshStandardMaterial({map:umbTex[ui],side:THREE.DoubleSide,roughness:.85})); u.position.set(-side*.3,3.35,0); u.castShadow=true; g.add(u);
  var p=new THREE.Mesh(poleG,M.pole); p.position.set(-side*.3,1.6,0); g.add(p);
  // produce
  var a=PKEYS[Math.floor(Math.random()*PKEYS.length)], b=PKEYS[Math.floor(Math.random()*PKEYS.length)];
  PRODUCE[a](x-.8,.96,z, FILLS[Math.floor(Math.random()*FILLS.length)]);
  PRODUCE[b](x+.8,.96,z, FILLS[Math.floor(Math.random()*FILLS.length)]);
  // trader
  if(Math.random()<.72){var tg=new THREE.Group();tg.position.set(x+side*1.6,0,z+R(-.5,.5));
    var bd=new THREE.Mesh(bodyG,new THREE.MeshStandardMaterial({map:ankara[Math.floor(Math.random()*4)],roughness:.8}));bd.position.y=.9;bd.castShadow=true;tg.add(bd);
    var hd=new THREE.Mesh(headG,M.skin);hd.position.y=1.72;tg.add(hd);
    if(Math.random()<.7){var tie=new THREE.Mesh(tieG,new THREE.MeshStandardMaterial({map:ankara[Math.floor(Math.random()*4)],roughness:.8}));tie.position.y=1.78;tie.scale.set(1,1.15,1);tg.add(tie);}
    tg.rotation.y=side>0?-Math.PI/2:Math.PI/2; tg.userData.ph=Math.random()*6; traders.push(tg); scene.add(tg);}
}
var traders=[];
var facades=['#E9D9B8','#D9B48C','#C9D6C2','#E4C3A8','#B8C9D9','#E6E0CF'].map(facadeTex);
var facadeMats=facades.map(function(t){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(1,2);return new THREE.MeshStandardMaterial({map:t,roughness:.9});});
var signs=[['JOLLOF SPOT','Party rice daily','jollof','#B8321F'],['MAMA T BUKA','Amala · Ewedu','amala','#1E4A2A'],['SUYA CORNER','Hot from 6pm','suya','#5A2A14'],['PEPPER SOUP','Goat · Catfish','peppersoup','#3A1F3D'],['SOUP KITCHEN','Egusi · Okra','egusi','#2F4F6E'],['RICE & STEW','Lunch till 4pm','stew-rice','#7A3B22'],['EFO HOUSE','Efo riro & swallow','efo-riro','#244D2B'],['FRIED RICE','Small chops too','fried-rice','#6E4A12']];
var bSignIdx=0;
function building(x,z,side,w){
  var h=R(6,12), d=7;
  var b=new THREE.Mesh(new THREE.BoxGeometry(d,h,w),facadeMats[Math.floor(Math.random()*facadeMats.length)]);
  b.position.set(x+side*d/2,h/2,z); b.castShadow=true; b.receiveShadow=true; scene.add(b);
  var rf=new THREE.Mesh(new THREE.BoxGeometry(d+.6,.25,w+.4),M.roof); rf.position.set(x+side*d/2,h+.1,z); scene.add(rf);
  // awning
  var aw=new THREE.Mesh(new THREE.BoxGeometry(1.6,.08,w-.6),new THREE.MeshStandardMaterial({map:umbTex[Math.floor(Math.random()*6)],roughness:.8})); aw.position.set(x-side*.6,3.1,z); aw.rotation.z=side*.25; scene.add(aw);
  if(Math.random()<.75){var s=signs[bSignIdx++%signs.length];
    var sp=new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w-1,6.4),2),new THREE.MeshBasicMaterial({map:signTex(s[0],s[1],s[3],s[2],false),toneMapped:false}));
    sp.position.set(x-side*.05,4.6,z); sp.rotation.y=side>0?-Math.PI/2:Math.PI/2; scene.add(sp);}
}
function palm(x,z){var g=new THREE.Group();g.position.set(x,0,z);var h=R(7,10);
  for(var i=0;i<6;i++){var s=new THREE.Mesh(new THREE.CylinderGeometry(.2-i*.012,.24-i*.012,h/6,8),std(0x6E5640));s.position.set(i*.08,h/12+i*h/6,0);s.rotation.z=-.03*i;g.add(s);}
  var leafG=new THREE.PlaneGeometry(4.2,.9,6,1); var lp=leafG.attributes.position; for(var j=0;j<lp.count;j++){var X=lp.getX(j);lp.setZ(j,-Math.pow((X+2.1)/4.2,2)*1.6);} leafG.computeVertexNormals(); leafG.translate(2.1,0,0);
  for(var k=0;k<9;k++){var lf=new THREE.Mesh(leafG,std(0x3F7A2E,{side:THREE.DoubleSide}));lf.position.set(.5,h,0);lf.rotation.set(-Math.PI/2+R(-.2,.2),k*.7,R(-.5,.1));lf.castShadow=true;g.add(lf);}
  scene.add(g);}
(function buildMarket(){
  for(var z=10; z>-ROUTE-40; z-=(LITE?12:7.5)){
    var nearStop=STOPS.some(function(s){return Math.abs(z-s.z)<6;});
    [-1,1].forEach(function(side){ if(!nearStop || side>0) stall(side*8.3, z+R(-.6,.6), side); });
  }
  [-1,1].forEach(function(side){for(var z=12; z>-ROUTE-60;){var w=R(7,11);building(side*12.2,z-w/2,side,w);z-=w+R(.2,1.2);if(!LITE&&Math.random()<.25){palm(side*R(11.5,12),z-1.2);z-=2.5;}}});
  // string lights + poles
  for(var z2=-6; z2>-ROUTE-20; z2-=18){
    [-6.4,6.4].forEach(function(x){var p=new THREE.Mesh(new THREE.CylinderGeometry(.08,.1,6,8),M.pole);p.position.set(x,3,z2);scene.add(p);});
    for(var i=0;i<=16;i++){var t=i/16,x=-6.4+12.8*t,y=5.7-Math.sin(Math.PI*t)*1.2;put(bulbs,'l',x,y,z2,1,1,1,[0xFFD27A,0xFF9F5A,0xFFF1C2,0x9BE07A][i%4]);}
    var wire=new THREE.Mesh(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(-6.4,5.8,z2),new THREE.Vector3(0,3.4,z2),new THREE.Vector3(6.4,5.8,z2)),12,.02,4),M.black);scene.add(wire);
  }
  [[spheres,'s'],[cyls,'c'],[basins,'b'],[bulbs,'l']].forEach(function(pair){var m=pair[0];m.count=cnt[pair[1]];m.instanceMatrix.needsUpdate=true;if(m.instanceColor)m.instanceColor.needsUpdate=true;m.castShadow=(m!==bulbs);m.receiveShadow=true;scene.add(m);});
  // tour arches
  STOPS.forEach(function(s,i){var g=new THREE.Group();g.position.z=s.z;scene.add(g);
    var col=i===3?M.kekeGreen:std(0x15231A,{roughness:.5});
    [-6,6].forEach(function(x){var p=new THREE.Mesh(new THREE.BoxGeometry(.6,7.2,.6),col);p.position.set(x,3.6,0);p.castShadow=true;g.add(p);});
    var beam=new THREE.Mesh(new THREE.BoxGeometry(12.6,.5,.6),col);beam.position.y=7.2;g.add(beam);
    var sg=new THREE.Mesh(new THREE.PlaneGeometry(9,2.8),new THREE.MeshBasicMaterial({map:signTex(s.sign[0],s.sign[1],i===3?'#F27B2B':(i%2?'#3B8C50':'#1E4A2A'),null,true),toneMapped:false,side:THREE.DoubleSide}));
    sg.position.set(0,5.5,.32);g.add(sg);
    if(i===3){for(var k=0;k<14;k++){var f=new THREE.Mesh(new THREE.BoxGeometry(.8,.04,.8),k%2?M.black:std(0xffffff));f.position.set(-5.2+k*.8,.05,0);g.add(f);}}
    s.group=g;});
})();

/* ------------------------------------------------ keke */
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
  drawLogo(); logoImg.addEventListener('load',drawLogo);
  var lp=new THREE.Mesh(new THREE.PlaneGeometry(1.15,.36),new THREE.MeshBasicMaterial({map:logoT,toneMapped:false}));lp.position.set(0,1.78,1.44);g.add(lp);
  var plate=new THREE.Mesh(new THREE.PlaneGeometry(.6,.2),new THREE.MeshBasicMaterial({toneMapped:false,map:ctex(256,86,function(x,w,h){x.fillStyle='#fff';x.fillRect(0,0,w,h);x.fillStyle='#1E4A2A';x.font='700 44px Arial';x.textAlign='center';x.fillText('LAG 233 KE',w/2,58);})}));plate.position.set(0,.62,1.43);g.add(plate);
  var wG=new THREE.CylinderGeometry(.33,.33,.22,18);wG.rotateZ(Math.PI/2);
  var wheels=[];[[0,-1.5],[-.72,1.0],[.72,1.0]].forEach(function(p){var w=new THREE.Mesh(wG,M.black);w.position.set(p[0],.33,p[1]);w.castShadow=true;g.add(w);wheels.push(w);var hub=new THREE.Mesh(new THREE.CylinderGeometry(.14,.14,.24,10).rotateZ(Math.PI/2),M.chrome);hub.position.copy(w.position);g.add(hub);});
  var hl=new THREE.Mesh(new THREE.SphereGeometry(.13,12,8),new THREE.MeshBasicMaterial({color:0xFFF4CC}));hl.position.set(0,1.35,-1.36);g.add(hl);
  [-.6,.6].forEach(function(x){var tl=new THREE.Mesh(new THREE.BoxGeometry(.18,.1,.04),new THREE.MeshBasicMaterial({color:0xFF3B2B}));tl.position.set(x,1.0,1.42);g.add(tl);});
  // driver
  var drv=new THREE.Mesh(new THREE.CylinderGeometry(.24,.3,.75,10),std(0x2F6E8F));drv.position.set(0,1.75,-.55);g.add(drv);
  var dh=new THREE.Mesh(new THREE.SphereGeometry(.19,12,10),M.skin);dh.position.set(0,2.27,-.55);g.add(dh);
  var cap=new THREE.Mesh(new THREE.SphereGeometry(.2,12,8,0,6.29,0,1.3),std(0xF27B2B));cap.position.set(0,2.3,-.55);g.add(cap);
  g.traverse(function(o){if(o.isMesh)o.castShadow=true;});
  g.userData.wheels=wheels; return g;
}
var keke=makeKeke(); scene.add(keke);
var headLight=new THREE.PointLight(0xFFE2A8,0.9,18,2); headLight.position.set(0,1.6,-3); keke.add(headLight);

/* ------------------------------------------------ pickups */
var ringG=new THREE.TorusGeometry(1.3,.1,8,48), discG=new THREE.CircleGeometry(1.3,36);
var MESH_CACHE={};
function itemMesh(k){
  var it=ITEMS[k], c=it.c, g=new THREE.Group();
  var add=function(geo,mat,x,y,z,sx,sy,sz,rx,ry,rz){var m=new THREE.Mesh(geo,mat);m.position.set(x||0,y||0,z||0);if(sx)m.scale.set(sx,sy,sz);m.rotation.set(rx||0,ry||0,rz||0);g.add(m);return m;};
  var S=new THREE.SphereGeometry(1,16,12), C=new THREE.CylinderGeometry(1,1,1,16);
  var shine=function(col,o){return std(col,Object.assign({roughness:.35,emissive:col,emissiveIntensity:.18},o||{}));};
  switch(it.a){
    case 'cluster':var s=it.s||.24;[[0,0,0],[.32,0,.1],[-.3,0,.12],[.05,.26,0],[0,0,-.3],[-.18,.22,.15]].forEach(function(p){add(S,shine(c),p[0]*(s/.24),p[1]*(s/.24),p[2]*(s/.24),s,s*.95,s);});if(k==='tomatoes')add(C,std(0x2E6B2A),0,.5,0,.05,.1,.05);break;
    case 'chili':for(var i=0;i<6;i++)add(S,shine([c,0xF0581A,0xC81A0A][i%3],{roughness:.25}),Math.cos(i*1.05)*.26,i===5?.2:0,Math.sin(i*1.05)*.26,.12,.12,.3,0,i,0);break;
    case 'leaves':for(var j=0;j<12;j++)add(S,shine(j%3?c:new THREE.Color(c).multiplyScalar(.8).getHex(),{side:THREE.DoubleSide,roughness:.6}),Math.sin(j)*.25,-.05+j*.035,Math.cos(j*1.7)*.15,.34,.05,.18,R(-.8,.8),j*.55,R(-.6,.6));add(C,std(0xC9A06A),0,-.25,0,.13,.14,.13);break;
    case 'basin':add(new THREE.CylinderGeometry(.62,.44,.38,22,1,true),std([0x2F6E8F,0xC23B2B,0x3B8C50][k.length%3],{side:THREE.DoubleSide,metalness:.3,roughness:.3}));add(new THREE.TorusGeometry(.62,.04,6,28),M.chrome,0,.19,0,1,1,1,Math.PI/2,0,0);add(C,shine(c),0,.13,0,.58,.05,.58);for(var e=0;e<16;e++)add(S,shine(c),R(-.36,.36),.18,R(-.36,.36),.08,.04,.07);break;
    case 'sack':add(new THREE.BoxGeometry(.9,1.15,.55),std(c,{roughness:.9}));add(new THREE.BoxGeometry(.92,.3,.57),shine(it.c2),0,.05,0);add(S,std(c,{roughness:.9}),0,.62,0,.38,.12,.22);break;
    case 'bottle':add(C,shine(c,{roughness:.12,transparent:true,opacity:.92}),0,0,0,.3,.95,.3);add(C,shine(c),0,.58,0,.13,.25,.13);add(C,std(0xF6C445),0,.75,0,.14,.1,.14);add(new THREE.BoxGeometry(.6,.3,.02),std(0xF4F1EA),0,0,.3);break;
    case 'chicken':add(S,shine(c,{roughness:.5}),0,0,0,.55,.38,.42);[-1,1].forEach(function(s2){add(S,shine(0xB97A40),s2*.4,-.05,.22,.17,.15,.32,0,s2*.4,0);add(C,std(0xF1E8D8),s2*.5,-.05,.48,.045,.2,.045,Math.PI/2,0,0);});break;
    case 'meat':add(new THREE.BoxGeometry(.95,.45,.65),shine(c,{roughness:.55}));add(new THREE.BoxGeometry(.97,.09,.67),std(0xF2E6D6),0,.09,0);add(C,std(0xF1E8D8),.5,0,0,.08,.3,.08,0,0,Math.PI/2);break;
    case 'fish':add(S,shine(c,{metalness:.4,roughness:.3}),0,0,0,.66,.24,.17);add(new THREE.ConeGeometry(.24,.38,4),shine(c,{metalness:.4,roughness:.3}),.8,0,0,1,1,.4,0,0,Math.PI/2);add(S,M.black,-.46,.07,.14,.045,.045,.03);break;
    case 'pods':for(var o=0;o<7;o++)add(new THREE.ConeGeometry(.1,.7,6),shine(c),Math.cos(o)*.22,0,Math.sin(o)*.22,1,1,1,R(-.5,.5)+Math.PI/2,o,0);break;
    case 'cones':for(var r2=0;r2<4;r2++){add(new THREE.ConeGeometry(.11,.8,8),shine(c),(r2-1.5)*.2,0,0,1,1,1,Math.PI,0,0);add(S,std(0x3F8A35),(r2-1.5)*.2,.45,0,.07,.14,.07);}break;
    case 'cabbage':add(S,shine(c),0,0,0,.5,.45,.5);add(S,shine(0x7FB04A,{side:THREE.DoubleSide}),0,.05,0,.56,.4,.56);break;
    case 'iru':add(S,shine(0x3F6E2B,{roughness:.8}),0,0,0,.4,.28,.36);for(var q=0;q<8;q++)add(S,std(c),R(-.18,.18),.24,R(-.14,.14),.07,.06,.07);break;
    case 'shells':for(var sh=0;sh<10;sh++)add(new THREE.ConeGeometry(.09,.24,7),shine(c,{roughness:.4}),R(-.35,.35),R(-.05,.2),R(-.25,.25),1,1,1,R(-1,1),R(0,3),R(-1,1));add(new THREE.CylinderGeometry(.5,.36,.22,18,1,true),std(0xE9E4D8,{side:THREE.DoubleSide}),0,-.15,0);break;
    case 'tuber':add(C,shine(c,{roughness:.95}),0,0,0,.24,1.25,.28,0,0,Math.PI/2.3);add(C,shine(c,{roughness:.95}),.15,-.1,.25,.2,.9,.22,0,.5,Math.PI/2.1);break;
    case 'bunch':for(var pl=0;pl<5;pl++)add(C,shine(c,{roughness:.6}),(pl-2)*.13,0,0,.09,.95,.11,.3,0,.3-(pl*.14));break;
    case 'cobs':for(var cb=0;cb<3;cb++){add(C,shine(c,{roughness:.5}),(cb-1)*.28,0,0,.13,.8,.13,0,0,(cb-1)*.15);add(new THREE.ConeGeometry(.16,.5,6),std(0x9DB848,{side:THREE.DoubleSide}),(cb-1)*.28,-.45,0,1,1,1,Math.PI,0,(cb-1)*.15);}break;
    case 'eggs':[[0,0,0],[.28,0,.08],[-.28,0,.08],[0,.2,0],[.14,0,-.25],[-.14,0,-.25]].forEach(function(p){add(S,shine(c,{roughness:.4}),p[0],p[1],p[2],.17,.22,.17);});break;
    case 'can':add(C,shine(c,{roughness:.1}),0,0,0,.2,.85,.2);add(C,shine(0xD62A2A),0,.05,0,.21,.26,.21);add(C,shine(c),0,.55,0,.09,.26,.09);add(C,M.chrome,0,.72,0,.1,.06,.1);break;
    case 'flat':for(var fl=0;fl<4;fl++)add(C,shine(fl%2?c:new THREE.Color(c).multiplyScalar(.85).getHex(),{roughness:.7}),R(-.04,.04),fl*.07,R(-.04,.04),.5,.05,.5);break;
    case 'box':add(new THREE.BoxGeometry(.7,.45,.45),shine(c));add(new THREE.BoxGeometry(.72,.14,.47),shine(0xD62A2A),0,.06,0);break;
  }
  g.traverse(function(o){if(o.isMesh)o.castShadow=true;});
  return g;
}
function labelSprite(name,price,kind){
  var t=ctex(640,150,function(x,w,h){
    var bg=kind==='need'?'rgba(22,92,48,.94)':kind==='junk'?'rgba(110,30,20,.92)':'rgba(16,24,18,.9)';
    var r=64;x.fillStyle=bg;x.beginPath();x.moveTo(r,10);x.arcTo(w-10,10,w-10,h-10,r);x.arcTo(w-10,h-10,10,h-10,r);x.arcTo(10,h-10,10,10,r);x.arcTo(10,10,w-10,10,r);x.fill();
    x.lineWidth=5;x.strokeStyle=kind==='need'?'#7CF09A':kind==='junk'?'#FF8A73':'#F6C445';x.stroke();
    var left=46;
    if(kind==='need'){x.fillStyle='#7CF09A';x.beginPath();x.arc(66,h/2,22,0,7);x.fill();x.strokeStyle='#0F3A1E';x.lineWidth=7;x.lineCap='round';x.beginPath();x.moveTo(55,h/2+1);x.lineTo(63,h/2+9);x.lineTo(78,h/2-9);x.stroke();left=104;}
    x.fillStyle='#fff';var fs=name.length>14?44:52;x.font='700 '+fs+'px Figtree, Arial, sans-serif';x.textBaseline='middle';x.fillText(name,left,h/2+3);
    x.fillStyle='#F6C445';x.textAlign='right';x.font='700 50px Figtree, Arial, sans-serif';x.fillText(fmt(price),w-44,h/2+3);});
  var s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthWrite:false,depthTest:true,toneMapped:false,fog:kind!=='need',transparent:true}));s.scale.set(3.4,.8,1);s.renderOrder=10;return s;
}
var beamG=new THREE.CylinderGeometry(.06,.42,8,16,1,true);beamG.translate(0,4,0);
var haloG=new THREE.SphereGeometry(1,20,14);
var pickups=[];
function clearPickups(){pickups.forEach(function(p){scene.remove(p.g);});pickups=[];}
function seeded(seed){return function(){seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};}
function placePickups(dishKey,seed){
  clearPickups(); var d=DISHES[dishKey], rnd=seeded(seed||(Date.now()%100000+7));
  var need=d.items.slice(), bonus=Object.keys(ITEMS).filter(function(k){return ITEMS[k].veg&&need.indexOf(k)<0;}), other=Object.keys(ITEMS).filter(function(k){return !ITEMS[k].veg&&need.indexOf(k)<0;});
  var waves=[]; for(var z=-34; z>-462; z-=13.5){ if(STOPS.some(function(s){return Math.abs(z-s.z)<8;}))continue; waves.push(z);}
  var bag=[]; need.forEach(function(k){bag.push(k,k,k);}); for(var i=0;i<7;i++)bag.push(bonus[Math.floor(rnd()*bonus.length)]);
  var slots=waves.length*2; while(bag.length<slots)bag.push(other[Math.floor(rnd()*other.length)]);
  for(var j=bag.length-1;j>0;j--){var r=Math.floor(rnd()*(j+1));var tmp=bag[j];bag[j]=bag[r];bag[r]=tmp;}
  // make sure every needed item shows up in the first third of the route
  need.forEach(function(k,ni){var at=bag.indexOf(k);var target=2+ni*3;if(at>target){var t=bag[target];bag[target]=k;bag[at]=t;}});
  var bi=0;
  waves.forEach(function(z,wi){
    var lanes=[0,1,2]; for(var a=2;a>0;a--){var b=Math.floor(rnd()*(a+1));var t=lanes[a];lanes[a]=lanes[b];lanes[b]=t;}
    var n=wi<2?1:2;
    for(var q=0;q<n && bi<bag.length;q++){var k=bag[bi++];var lane=lanes[q];
      var g=new THREE.Group();g.position.set(LANES[lane],0,z);
      var it=ITEMS[k], kind=need.indexOf(k)>-1?'need':it.junk?'junk':it.veg?'bonus':'other';
      var col=kind==='need'?0x5BE07F:kind==='junk'?0xFF5A3D:kind==='bonus'?0xF6C445:0xF2E6CF;
      var add=new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.95,fog:false});
      var ring=new THREE.Mesh(ringG,add);ring.rotation.x=Math.PI/2;ring.position.y=.08;g.add(ring);
      var disc=new THREE.Mesh(discG,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.28,depthWrite:false,fog:false}));disc.rotation.x=-Math.PI/2;disc.position.y=.06;g.add(disc);
      var beam=new THREE.Mesh(beamG,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:kind==='need'?.3:.12,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending,fog:kind!=='need'}));g.add(beam);
      var halo=new THREE.Mesh(haloG,new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.1,depthWrite:false,blending:THREE.AdditiveBlending,fog:kind!=='need'}));halo.position.y=1.7;halo.scale.setScalar(1.1);g.add(halo);
      var m=itemMesh(k);m.position.y=1.7;m.scale.setScalar(1.55);g.add(m);
      var lb=labelSprite(it.n,it.p,kind);lb.position.y=3.3;g.add(lb);
      scene.add(g); pickups.push({g:g,item:m,halo:halo,beam:beam,label:lb,k:k,kind:kind,lane:lane,z:z,taken:false,ph:rnd()*6});
    }
  });
}

/* ------------------------------------------------ state */
var state={mode:'intro',dish:'jollof',z:6,v:0,throttle:0,lane:1,x:0,spent:0,got:{},extras:[],junk:[],stopsSeen:{},t:0,orbit:0};
var MAXV=17, REVV=-5;

/* ------------------------------------------------ UI */
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
var dishesEl=$('#dishes'), tabsEl=$('#tabs'), selEl=$('#sel'), curRegion='all', autoOn=true;
function stopAuto(){autoOn=false;}
function renderTabs(){var keys=['all'].concat(Object.keys(REGIONS));tabsEl.innerHTML=keys.map(function(r){var n=r==='all'?Object.keys(DISHES).length:Object.keys(DISHES).filter(function(k){return DISHES[k].r===r;}).length;return '<button type="button" data-r="'+r+'" aria-pressed="'+(r===curRegion)+'">'+(r==='all'?'All':REGIONS[r])+' <small>'+n+'</small></button>';}).join('');
  tabsEl.querySelectorAll('button').forEach(function(b){b.addEventListener('click',function(){stopAuto();curRegion=b.dataset.r;renderTabs();renderDishes();var first=visibleKeys()[0];if(visibleKeys().indexOf(state.dish)<0&&first)selectDish(first,false);dishesEl.scrollTo({left:0,behavior:'smooth'});});});}
function visibleKeys(){return Object.keys(DISHES).filter(function(k){return curRegion==='all'||DISHES[k].r===curRegion;});}
function renderDishes(){dishesEl.innerHTML='';visibleKeys().forEach(function(k,i){var d=DISHES[k];var b=document.createElement('button');b.type='button';b.className='dish';b.dataset.k=k;b.style.animationDelay=(i*40)+'ms';b.setAttribute('aria-pressed',k===state.dish?'true':'false');
  b.innerHTML='<img src="'+dishImg(k)+'" alt="" loading="lazy"><span><em>'+REGIONS[d.r]+'</em><b>'+d.n+'</b><small class="tnum">'+fmtFor(MD.budgetOf(k,MD.STATE.portion),d.r)+' · '+d.items.length+' items</small></span>';
  b.addEventListener('click',function(){stopAuto();selectDish(k,true);track('select_dish',{dish:k,region:d.r});});dishesEl.appendChild(b);});}
function srcNote(cc,items){var srcs={};items.forEach(function(it){srcs[MD.priceSrc(it,cc)]=1;});
  if(cc==='ng'&&!srcs.est)return 'Lagos prices: '+(srcs.lagos?MD.SOURCES.lagos:'')+(srcs.lagos&&srcs.nbs?'; ':'')+(srcs.nbs?MD.SOURCES.nbs:'');
  if(cc==='ng')return 'Lagos prices from official sources where available; items marked ~ are estimates.';
  if(srcs.crowd&&!srcs.est)return 'Prices reported by Meuro players in '+COUNTRIES[cc].n+'.';
  return 'Estimated '+COUNTRIES[cc].n+' prices (marked ~). Report what you pay to make them real.';}
function selectDish(k,scroll){state.dish=k;setCountry(DISHES[k].r);dishesEl.querySelectorAll('.dish').forEach(function(o){o.setAttribute('aria-pressed',o.dataset.k===k?'true':'false');});
  var d=DISHES[k];
  selEl.innerHTML='<div class="stop"><div><small>'+REGIONS[d.r]+'</small><b>'+d.n+'</b></div><span class="tnum">'+fmt(d.budget)+' budget</span></div>'+
    '<div class="portions" role="group" aria-label="Who is it for">'+MD.PORTIONS.map(function(p){return '<button type="button" data-p="'+p.v+'" aria-pressed="'+(MD.STATE.portion===p.v)+'">'+p.n+'</button>';}).join('')+'</div>'+
    '<div class="ing">'+d.items.map(function(it,i){var est=MD.priceSrc(it,d.r)==='est';return '<span style="animation-delay:'+(i*60)+'ms"><i style="background:'+hex(ITEMS[it].c)+'"></i>'+ITEMS[it].n+' <em>'+MD.qtyOf(it,MD.STATE.portion)+' · '+(est?'~':'')+fmt(ITEMS[it].p)+'</em></span>';}).join('')+'</div>'+
    '<p class="src">'+srcNote(d.r,d.items)+'</p>';
  selEl.querySelectorAll('.portions button').forEach(function(b){b.addEventListener('click',function(){stopAuto();MD.STATE.portion=+b.dataset.p;try{localStorage.setItem('meuro.portion',b.dataset.p);}catch(e){}renderDishes();selectDish(state.dish,false);track('select_portion',{people:+b.dataset.p});});});
  if(scroll){var card=dishesEl.querySelector('[data-k="'+k+'"]');if(card){var l=card.offsetLeft-(dishesEl.clientWidth-card.offsetWidth)/2;dishesEl.scrollTo({left:Math.max(0,l),behavior:reduce?'auto':'smooth'});}}}
(function(){try{var p=+localStorage.getItem('meuro.portion');if(p===1||p===2||p===4)MD.STATE.portion=p;}catch(e){}})();
['pointerdown','wheel','touchstart','keydown'].forEach(function(ev){dishesEl.addEventListener(ev,stopAuto,{passive:true});});
$('#pPrev').addEventListener('click',function(){stopAuto();dishesEl.scrollBy({left:-dishesEl.clientWidth*.8,behavior:'smooth'});});
$('#pNext').addEventListener('click',function(){stopAuto();dishesEl.scrollBy({left:dishesEl.clientWidth*.8,behavior:'smooth'});});
renderTabs(); renderDishes(); selectDish(state.dish,false);
setInterval(function(){if(!autoOn||state.mode!=='intro'||document.hidden)return;var ks=visibleKeys();var i=ks.indexOf(state.dish);selectDish(ks[(i+1)%ks.length],true);},3200);

function renderList(){var d=DISHES[state.dish];var el=$('#hList');el.innerHTML='<h4>Shopping list'+(MD.STATE.portion>1?' · for '+MD.STATE.portion:'')+'</h4>'+d.items.map(function(k){var est=MD.priceSrc(k,d.r)==='est';return '<div class="li'+(state.got[k]?' got':'')+'"><span class="bx"></span><span class="lin">'+ITEMS[k].n+'<small>'+MD.qtyOf(k,MD.STATE.portion)+'</small></span><span class="pr tnum">'+(est?'~':'')+fmt(ITEMS[k].p)+'</span></div>';}).join('');}
function renderWallet(){var d=DISHES[state.dish],left=d.budget-state.spent;var w=$('#hWallet');w.textContent=(left<0?'−':'')+fmt(Math.abs(left));w.classList.toggle('over',left<0);
  var bar=$('#hBar');bar.style.width=Math.max(0,left/d.budget*100)+'%';bar.style.background=left/d.budget<.2?'var(--red)':'var(--gold)';}
function toast(text,kind){var t=document.createElement('div');t.className='toast glass '+(kind||'');var c=kind==='good'?'var(--green)':kind==='bad'?'var(--red)':kind==='bonus'?'var(--gold)':'#fff';t.innerHTML='<i style="background:'+c+'"></i>'+text;var box=$('#toasts');box.prepend(t);while(box.children.length>3)box.lastChild.remove();setTimeout(function(){t.style.transition='opacity .4s';t.style.opacity='0';setTimeout(function(){t.remove();},400);},2300);}
function buildProgress(){var p=document.querySelector('.progress');p.querySelectorAll('.stop').forEach(function(s){s.remove();});STOPS.forEach(function(s,i){var e=document.createElement('span');e.className='stop';e.id='ps'+i;e.style.left=(-s.z/ROUTE*100)+'%';p.appendChild(e);});}
var stopTimer=null;
function showStop(i){var s=STOPS[i];$('#scEye').textContent=s.eye;$('#scTitle').textContent=s.t;$('#scText').textContent=s.d;$('#scLink').href=s.href;var c=$('#stopcard');c.hidden=false;var e=$('#ps'+i);if(e)e.classList.add('done');clearTimeout(stopTimer);if(i<3)stopTimer=setTimeout(function(){c.hidden=true;},6000);}

/* audio */
var actx=null;
function beep(f,dur,type,vol){if(!actx)return;try{var o=actx.createOscillator(),g=actx.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,actx.currentTime);o.frequency.exponentialRampToValueAtTime(f*1.6,actx.currentTime+dur);g.gain.setValueAtTime(vol||.12,actx.currentTime);g.gain.exponentialRampToValueAtTime(.001,actx.currentTime+dur);o.connect(g);g.connect(actx.destination);o.start();o.stop(actx.currentTime+dur);}catch(e){}}
var horn=function(){beep(420,.18,'square',.06);setTimeout(function(){beep(420,.22,'square',.06);},220);};

function setThrottle(t){if(state.mode==='ride'&&state.v>1&&t!==1)state.touched=true;state.throttle=t;$('#bGo').setAttribute('aria-pressed',t===1?'true':'false');$('#bStop').setAttribute('aria-pressed',t===0?'true':'false');$('#bRev').setAttribute('aria-pressed',t===-1?'true':'false');}
function laneShift(dir){if(state.mode!=='ride')return;state.touched=true;var n=Math.max(0,Math.min(2,state.lane+dir));if(n!==state.lane){state.lane=n;beep(660,.06,'triangle',.05);}}

function track(n,p){try{(window.__mq=window.__mq||[]).push([n,p||{}]);if(window.meuroFlush)window.meuroFlush();}catch(e){}}
function startRide(opts){
  track('ride_start',{dish:state.dish,race:!!(opts&&opts.race)});
  opts=(opts&&(opts.seed||opts.daily))?opts:{};
  if(!actx){try{actx=new (window.AudioContext||window.webkitAudioContext)();}catch(e){}}
  var d=DISHES[state.dish];
  setCountry(d.r);
  state.mode='ride';state.z=6;state.v=0;state.lane=1;state.x=0;state.spent=0;state.got={};state.extras=[];state.junk=[];state.stopsSeen={};state.race=!!opts.race;state.daily=!!opts.daily;state.locked=false;state.touched=false;
  setThrottle(0); placePickups(state.dish,opts.seed); buildProgress(); renderList(); renderWallet();
  $('#hDish').textContent=d.n; $('#hThumb').src=dishImg(state.dish); $('#stopcard').hidden=true; $('#toasts').innerHTML='';
  $('#intro').classList.add('gone'); setTimeout(function(){$('#intro').hidden=true;},600);
  $('#result').hidden=true; var h=$('#hud');h.hidden=false;requestAnimationFrame(function(){h.classList.add('on');});
  if(!opts.race){toast(state.daily?'Market of the Day: same dish and road for everyone.':'Swipe or tap the arrows to switch lanes.','');horn();if(LIVE&&LIVE.race)leaveRace(true);
    setTimeout(function(){if(state.mode==='ride'&&!state.touched&&state.throttle===0)setThrottle(1);},1300);}
  if(LIVE&&LIVE.room)lobbyPresence();
  setTimeout(function(){$('#bGo').focus({preventScroll:true});},300);
}
$('#startBtn').addEventListener('click',function(){startRide();});
$('#againBtn').addEventListener('click',function(){if(LIVE&&LIVE.race){$('#raceAgain').click();}else startRide();});
$('#pickBtn').addEventListener('click',function(){if(LIVE&&LIVE.race)leaveRace(true);setTimeout(lobbyPresence,50);$('#result').hidden=true;$('#hud').classList.remove('on');$('#hud').hidden=true;var i=$('#intro');i.hidden=false;requestAnimationFrame(function(){i.classList.remove('gone');});state.mode='intro';state.z=6;state.v=0;clearPickups();});
$('#exitBtn').addEventListener('click',function(){if(state.mode==='ride')finish();});
$('#bGo').addEventListener('click',function(){setThrottle(1);});
$('#bStop').addEventListener('click',function(){setThrottle(0);});
$('#bRev').addEventListener('click',function(){setThrottle(-1);});
$('#bLeft').addEventListener('click',function(){laneShift(-1);});
$('#bRight').addEventListener('click',function(){laneShift(1);});
addEventListener('keydown',function(e){
  if(state.mode==='intro'&&e.key==='Enter'&&document.activeElement===document.body){startRide();return;}
  if(state.mode!=='ride')return;
  var k=e.key;
  if(k==='ArrowUp'||k==='w'||k==='W'){setThrottle(1);e.preventDefault();}
  else if(k===' '||k==='s'||k==='S'){setThrottle(0);e.preventDefault();}
  else if(k==='ArrowDown'||k==='r'||k==='R'){setThrottle(-1);e.preventDefault();}
  else if(k==='ArrowLeft'||k==='a'||k==='A'){laneShift(-1);e.preventDefault();}
  else if(k==='ArrowRight'||k==='d'||k==='D'){laneShift(1);e.preventDefault();}
  else if(k==='h'||k==='H'){horn();}
});
var sx=null,sy=null;
canvas.addEventListener('pointerdown',function(e){sx=e.clientX;sy=e.clientY;});
canvas.addEventListener('pointerup',function(e){if(sx==null)return;var dx=e.clientX-sx,dy=e.clientY-sy;if(Math.abs(dx)>36&&Math.abs(dx)>Math.abs(dy))laneShift(dx>0?1:-1);else if(dy<-50)setThrottle(1);else if(dy>50)setThrottle(0);sx=null;});

function collect(p){
  p.taken=true; var it=ITEMS[p.k], d=DISHES[state.dish];
  if(d.items.indexOf(p.k)>-1){
    if(state.got[p.k]){toast(it.n+' already in your basket','');p.taken=true;p.skip=true;return;}
    state.got[p.k]=true;state.spent+=it.p;toast('+ '+it.n+' · '+fmt(it.p),'good');beep(880,.12,'sine',.12);renderList();
    if(d.items.every(function(k){return state.got[k];}))setTimeout(function(){toast('List complete. Ride to Meuro Kitchen.','bonus');horn();},500);
  } else if(it.veg){state.extras.push(p.k);state.spent+=it.p;toast('Bonus veg: '+it.n+' · '+fmt(it.p),'bonus');beep(990,.14,'sine',.1);}
  else {state.junk.push(p.k);state.spent+=it.p;toast(it.n+' is not on your list · −'+fmt(it.p),'bad');beep(220,.18,'sawtooth',.06);}
  renderWallet();
}

function finish(){
  state.mode='result'; setThrottle(0);
  var d=DISHES[state.dish], need=d.items, gotN=need.filter(function(k){return state.got[k];}).length;
  var comp=gotN/need.length*60, over=Math.max(0,state.spent-d.budget);
  var budgetPts=over?Math.max(0,25-over/d.budget*100):25;
  var extrasU=state.extras.filter(function(k,i,a){return a.indexOf(k)===i;});
  var bonus=Math.min(15,extrasU.length*5), waste=state.junk.length*4;
  var score=Math.max(0,Math.min(100,Math.round(comp+budgetPts+bonus-waste)));
  var stars=score>=85?3:score>=65?2:score>=40?1:0;
  $('#rImg').src=dishImg(state.dish); $('#rImg').alt=d.n;
  $('#rTitle').textContent=gotN===need.length?(score>=85?'Balanced '+d.n.toLowerCase():'Your '+d.n.toLowerCase()+' is ready'):'Missing '+(need.length-gotN)+' ingredient'+(need.length-gotN>1?'s':'');
  $('#rStars').textContent='★★★'.slice(0,stars)+'☆☆☆'.slice(0,3-stars); $('#rStars').setAttribute('aria-label',stars+' of 3 stars');
  var vegBoost=extrasU.length*35, protBoost=0;
  $('#rKcal').textContent=Math.round(d.kcal*(gotN/need.length*.4+.6)+vegBoost); $('#rProt').textContent=Math.round(d.prot*(gotN/need.length*.5+.5))+' g';
  $('#rSpent').textContent=fmt(state.spent); $('#rSpentL').textContent=over?'spent · '+fmt(over)+' over':'spent of '+fmt(d.budget);
  var tags=[d.n, gotN+'/'+need.length+' ingredients']; if(extrasU.length)tags.push('+'+extrasU.length+' bonus veg');
  $('#rTags').innerHTML=tags.map(function(t){return '<span>'+t+'</span>';}).join('');
  var notes=[];
  var missing=need.filter(function(k){return !state.got[k];}).map(function(k){return ITEMS[k].n;});
  if(missing.length)notes.push(['var(--red)','You missed '+missing.join(', ')+'. Slow down near the stalls and switch lanes early.']);
  else notes.push(['var(--green)','Every ingredient collected. Nice shopping.']);
  if(over)notes.push(['var(--red)','You went '+fmt(over)+' over budget. Skip items that are not on your list.']);
  else notes.push(['var(--green)','You stayed within budget with '+fmt(d.budget-state.spent)+' to spare.']);
  if(extrasU.length)notes.push(['var(--gold)','Extra '+extrasU.map(function(k){return ITEMS[k].n.toLowerCase();}).join(' and ')+' adds fibre and vitamins to the pot.']);
  else notes.push(['var(--gold)','Smart swap: add a handful of ugu or carrots for more fibre at little cost.']);
  if(state.junk.length)notes.push(['var(--orange)',state.junk.length+' item'+(state.junk.length>1?'s':'')+' you did not need went into the basket.']);
  $('#rNotes').innerHTML=notes.map(function(n){return '<li><i style="background:'+n[0]+'"></i><span>'+n[1]+'</span></li>';}).join('');
  $('#rScore').textContent='0'; $('#rArc').style.strokeDashoffset='276.5';
  $('#hud').classList.remove('on'); setTimeout(function(){$('#hud').hidden=true;},400);
  var r=$('#result'); r.hidden=false;
  requestAnimationFrame(function(){$('#rArc').style.strokeDashoffset=String(276.5*(1-score/100));var s0=performance.now();(function tick(t){var p=Math.min(1,(t-s0)/1200);$('#rScore').textContent=Math.round(score*p);if(p<1)requestAnimationFrame(tick);})(s0);});
  beep(523,.15,'sine',.1);setTimeout(function(){beep(659,.15,'sine',.1);},160);setTimeout(function(){beep(784,.25,'sine',.1);},320);
  track('ride_finish',{dish:state.dish,score:score,stars:stars,race:!!state.race,daily:!!state.daily,items:gotN,country:d.r,people:MD.STATE.portion});
  var RES={score:score,stars:stars,dish:state.dish,dishName:d.n,country:d.r,spent:state.spent,daily:!!state.daily,allItems:gotN===need.length,budgetLeft:(d.budget-state.spent)/d.budget,veg:extrasU.length,junk:state.junk.length,got:need.map(function(k){return !!state.got[k];}),portion:MD.STATE.portion};
  afterRide(RES);
  prepareSave(RES);
  if(LIVE&&LIVE.onFinish)LIVE.onFinish(score,stars);
}

/* ------------------------------------------------ loop */
function resize(){var w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w<h?72:58;camera.updateProjectionMatrix();}
addEventListener('resize',resize); resize();
var clock=new THREE.Clock(), camPos=new THREE.Vector3(9,4,14), camLook=new THREE.Vector3(0,1.2,0), vTmp=new THREE.Vector3(), lTmp=new THREE.Vector3();
camera.position.copy(camPos);
function loop(){
  requestAnimationFrame(loop);
  var dt=Math.min(.05,clock.getDelta()); state.t+=dt;
  if(state.mode==='ride'){
    var target=state.locked?0:(state.throttle===1?MAXV:state.throttle===-1?REVV:0);
    var acc=state.throttle===0?14:(Math.sign(target-state.v)===Math.sign(state.v)||state.v===0?6:12);
    var diff=target-state.v; state.v+=Math.sign(diff)*Math.min(Math.abs(diff),acc*dt);
    state.z-=state.v*dt; if(state.z>8){state.z=8;state.v=0;}
    state.x+=(LANES[state.lane]-state.x)*Math.min(1,dt*7);
    // pickups
    pickups.forEach(function(p){ if(p.taken)return; if(Math.abs(p.z-state.z)<1.3 && Math.abs(LANES[p.lane]-state.x)<1.4) collect(p); });
    // stops
    STOPS.forEach(function(s,i){if(!state.stopsSeen[i]&&state.z<s.z+2){state.stopsSeen[i]=true;showStop(i);if(i<3)beep(740,.12,'triangle',.07);}});
    if(state.z<STOPS[3].z-4){finish();}
    $('#hProg').style.width=Math.max(0,Math.min(100,-state.z/ROUTE*100))+'%';
    $('#hSpeed').textContent=Math.round(Math.abs(state.v)*3.6);
  } else if(state.mode==='intro'){ state.orbit+=dt*(reduce?0:.12); }
  // keke
  keke.position.set(state.x,0,state.z);
  var lean=(LANES[state.lane]-state.x)*-.09; keke.rotation.z=lean; keke.rotation.y=(LANES[state.lane]-state.x)*-.06;
  keke.position.y=Math.abs(state.v)>.5?Math.sin(state.t*14)*.025:0;
  keke.userData.wheels.forEach(function(w){w.rotation.x-=state.v*dt/0.33;});
  // pickups animate
  pickups.forEach(function(p){ if(p.taken){ if(!p.gone){p.g.scale.multiplyScalar(p.skip?1:0.86);p.g.position.y+=dt*(p.skip?0:6);if(p.g.scale.x<.05||p.skip){scene.remove(p.g);p.gone=true;}} return;}
    var dz=state.z-p.z; if(dz<-3||dz>(isSmall?150:185)){p.g.visible=false;return;} p.g.visible=true;
    var near=dz<7; p.label.visible=!near; p.halo.visible=dz>3; p.beam.visible=dz>3;
    p.item.rotation.y+=dt*1.4; p.item.position.y=1.7+Math.sin(state.t*2+p.ph)*.14; p.halo.scale.setScalar(1.1+Math.sin(state.t*3+p.ph)*.08); p.beam.material.opacity=(p.kind==='need'?.26:.1)+Math.sin(state.t*4+p.ph)*.04; });
  // traders sway (only near)
  for(var i=0;i<traders.length;i++){var tr=traders[i];if(Math.abs(tr.position.z-state.z)<60)tr.rotation.x=Math.sin(state.t*1.5+tr.userData.ph)*.04;}
  // camera
  if(state.mode==='intro'){
    var sw=Math.sin(state.orbit*.5), wide=innerWidth>760; vTmp.set(state.x+(wide?-1.6:1.4)+sw*1.2,3.3+Math.sin(state.orbit*.35)*.3,state.z+(wide?7.5:9.5)); lTmp.set(state.x+(wide?-3.2:0),1.7,state.z-16);
  } else {
    var tall=innerHeight>innerWidth; var back=state.v<-.5?-7.5:(tall?9.5:8.5); vTmp.set(state.x*.7,tall?4.8:4.0,state.z+back); lTmp.set(state.x*.85,1.4,state.z-(state.v<-.5?-6:7));
    if(state.mode==='result'){vTmp.set(state.x+5,3.4,state.z+6);lTmp.set(state.x,1.2,state.z-2);}
  }
  camPos.lerp(vTmp,Math.min(1,dt*3)); camLook.lerp(lTmp,Math.min(1,dt*4));
  camera.position.copy(camPos); camera.lookAt(camLook);
  // lights + sky follow
  sunL.position.set(state.x-30,40,state.z-40); sunL.target.position.set(state.x,0,state.z-10);
  scene.userData.sky.position.set(0,0,state.z); scene.userData.sun.position.set(-60*(SKYR-6)/306.7,28*(SKYR-6)/306.7,state.z-300*(SKYR-6)/306.7);
  if(LIVE&&LIVE.frame)LIVE.frame(dt);
  renderer.render(scene,camera);
}
loop();
document.addEventListener('visibilitychange',function(){if(document.hidden&&state.mode==='ride')setThrottle(0);});

/* ------------------------------------------------ sign-up, saved scores, leaderboard */
var LB={db:null,uid:null,owner:false,rows:[],signups:[],last:null,writable:true};
var player=null; // {name,via,contact,consent}
function loadLocal(){try{var v=JSON.parse(localStorage.getItem('meuro.player')||'null');if(v&&v.name)player=v;}catch(e){}}
function saveLocal(){try{localStorage.setItem('meuro.player',JSON.stringify(player));}catch(e){}}
function localBest(){try{return JSON.parse(localStorage.getItem('meuro.best')||'[]');}catch(e){return [];}}
function pushLocalBest(r){try{var a=localBest();a.push(r);a.sort(function(x,y){return y.best-x.best;});localStorage.setItem('meuro.best',JSON.stringify(a.slice(0,10)));}catch(e){}}
loadLocal();player=null;
var via='whatsapp';
function setVia(v){via=v;$('#sbVia').querySelectorAll('button').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.v===v));});
  var c=$('#sbContact');$('#sbContactL').textContent=v==='email'?'Email address':'WhatsApp number';c.type=v==='email'?'email':'tel';c.inputMode=v==='email'?'email':'tel';c.autocomplete=v==='email'?'email':'tel';c.placeholder=v==='email'?'you@example.com':'0803 000 0000';c.removeAttribute('aria-invalid');}
$('#sbVia').querySelectorAll('button').forEach(function(b){b.addEventListener('click',function(){setVia(b.dataset.v);$('#sbContact').value='';$('#sbContact').focus();});});
function showFields(on){$('#sbFields').hidden=true;$('#sbMe').hidden=!player;if(player)$('#sbMeName').textContent=player.name;}
$('#sbEdit').addEventListener('click',function(){showFields(true);if(player){$('#sbName').value=player.name;setVia(player.via||'whatsapp');$('#sbContact').value=player.contact||'';$('#sbConsent').checked=!!player.consent;}$('#sbName').focus();});
function msg(t,kind){var m=$('#sbMsg');m.textContent=t;m.className='sb-msg'+(kind?' '+kind:'');}
function prepareSave(r){LB.last=r;LB.savedThis=false;msg('');$('#sbRank').hidden=true;$('#sbSave').disabled=false;$('#sbSave').textContent='Save my score';
  $('#sbTitle').textContent=player?'Save this score':'Save your score';
  $('#sbSub').textContent=player?'Add it to the leaderboard and see where you rank.':'Join the Meuro leaderboard and get free weekly meal plans from Meuro AI.';
  showFields(!player);$('#sbSave').textContent=player?'Save my score':(backend()?'Log in to save':'Save my score');if(!player&&backend())$('#sbSub').textContent='Create a free account or log in to save your score, keep your streak and get free weekly meal plans by email.';
  if(backend()&&AUTH&&player&&!state.race){setTimeout(doSave,400);}else if(backend()&&AUTH&&player&&state.race){setTimeout(doSave,400);}}
function cleanName(v){return String(v||'').replace(/[\u0000-\u001f<>]/g,'').replace(/\s+/g,' ').trim().slice(0,20);}
function cleanContact(v,kind){v=String(v||'').trim();if(kind==='email'){return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)?v.toLowerCase():null;}
  var d=v.replace(/[^\d+]/g,'');var digits=d.replace(/\D/g,'');if(digits.length<10||digits.length>15)return null;if(/^0\d{10}$/.test(digits))return '+234'+digits.slice(1);return (d[0]==='+'?'+':'+')+digits;}
$('#saveBox').addEventListener('submit',function(e){e.preventDefault();if(!LB.last||LB.savedThis)return;if(!backend()){player=player||{name:'You',via:'email',contact:'',consent:false};doSave();return;}needProfile(function(){doSave();});});
async function doSave(){var r=LB.last,btn=$('#sbSave');if(!r||LB.saving||LB.savedThis)return;LB.saving=true;btn.disabled=true;btn.textContent='Saving…';msg('');
  var now=new Date().toISOString();var b=backend();
  if(b&&AUTH){
    try{var res=await b.api.recordRide(r);LB.savedThis=true;applyServerProgress(res,r);btn.textContent='Saved';showFields(false);
      track('score_saved',{score:r.score,shared:true});msg('Saved to your profile and the leaderboard.','ok');loadBoards().then(function(){showRank();});}
    catch(err){btn.disabled=false;btn.textContent='Save my score';msg(err&&err.code==='too_fast'?'That was quick. Wait a few seconds, then tap Save again.':'Could not save right now. Check your connection and tap Save again.','err');}
    LB.saving=false;return;}
  if(!player)player={name:'You',via:'email',contact:'',consent:false};
  pushLocalBest({name:player.name,best:r.score,dish:r.dishName,stars:r.stars,at:now});
  LB.savedThis=true;LB.saving=false;btn.textContent='Saved on this device';showFields(false);
  track('score_saved',{score:r.score,shared:false});
  msg(b?'Saved on this device. Log in to keep your streak and join the leaderboard.':'Saved on this device. Your best plates show in the leaderboard.','ok');renderBoard();
}

function showRank(){if(!LB.uid)return;var i=-1;for(var k=0;k<LB.rows.length;k++)if(LB.rows[k].id===LB.uid){i=k;break;}
  var box=$('#sbRank');if(i<0){box.hidden=true;return;}box.hidden=false;$('#sbRankN').textContent='#'+(i+1);
  var best=LB.rows[i].best;$('#sbRankT').textContent=i===0?'Top of the leaderboard with '+best+' points. Nice cooking.':'Your best is '+best+' points. '+(LB.rows[i-1].best-best+1)+' more to climb a spot.';}
function starStr(n){n=Math.max(0,Math.min(3,n||0));return '★★★'.slice(0,n)+'☆☆☆'.slice(0,3-n);}
function renderBoard(){var list=$('#bdList');list.innerHTML='';var rows=LB.rows,local=false;
  if(!backend()){rows=localBest().map(function(x,i){return {id:'l'+i,name:x.name,best:x.best,dish:x.dish,stars:x.stars};});local=true;}
  $('#bdEmpty').hidden=rows.length>0;$('#bdSub').textContent=local?'Your best plates on this device':'Top Market Run plates';
  rows.forEach(function(r,i){var row=document.createElement('div');row.className='bd-row'+(r.id===LB.uid?' me':'');
    var pos=document.createElement('span');pos.className='pos tnum';pos.textContent=i+1;
    var mid=document.createElement('div');var nm=document.createElement('div');nm.className='nm';nm.textContent=(r.name||'Player')+(r.id===LB.uid?' (you)':'');var ds=document.createElement('div');ds.className='ds';ds.textContent=r.dish||'';mid.appendChild(nm);mid.appendChild(ds);
    var sc=document.createElement('div');sc.className='sc tnum';sc.textContent=r.best;var st=document.createElement('small');st.textContent=starStr(r.stars);sc.appendChild(st);
    row.appendChild(pos);row.appendChild(mid);row.appendChild(sc);
    if(LB.owner&&!local&&r.id!==LB.uid){var rm=document.createElement('button');rm.type='button';rm.className='rm';rm.textContent='Remove from board';rm.addEventListener('click',function(){if(rm.dataset.sure){backend().api.admin.hideScore(r.id).then(loadBoards).catch(function(){toast('Could not remove that score.','bad');});}else{rm.dataset.sure='1';rm.textContent='Tap again to remove';}});row.appendChild(rm);}
    list.appendChild(row);});
  if(LB.savedThis)showRank();}
function renderToday(){var l=$('#bdToday');if(!l)return;l.innerHTML='';var dm=MD.dailyMarket(),d=DISHES[dm.dish];
  $('#todayHead').textContent='Market of the Day: '+d.n+' ('+COUNTRIES[d.r].n+'). Same dish and road for everyone, resets at midnight UTC.';
  var rows=LB.today||[];if(!rows.length){var p=document.createElement('p');p.className='bd-empty';p.textContent=backend()?'No plates yet today. Be the first.':'Log in to see today\'s board.';l.appendChild(p);return;}
  rows.forEach(function(r,i){var row=document.createElement('div');row.className='bd-row'+(r.id===LB.uid?' me':'');var pos=document.createElement('span');pos.className='pos tnum';pos.textContent=i+1;
    var mid=document.createElement('div');var nm=document.createElement('div');nm.className='nm';nm.textContent=(r.name||'Player')+(r.id===LB.uid?' (you)':'');mid.appendChild(nm);
    var sc=document.createElement('div');sc.className='sc tnum';sc.textContent=r.best;var st=document.createElement('small');st.textContent=starStr(r.stars);sc.appendChild(st);
    row.appendChild(pos);row.appendChild(mid);row.appendChild(sc);l.appendChild(row);});}
function csvCell(v){v=String(v==null?'':v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}
function renderOwner(){var box=$('#bdOwner');box.hidden=false;var l=$('#suList');l.innerHTML='';
  if(!LB.signups.length){var p=document.createElement('p');p.className='bd-note';p.textContent='No sign-ups yet.';l.appendChild(p);}
  LB.signups.slice(0,200).forEach(function(s){var d=document.createElement('div');d.className='su';var a=document.createElement('b');a.textContent=s.name||'';var em=document.createElement('em');em.textContent=s.consent?'Opted in':'No marketing';if(!s.consent)em.className='no';var c=document.createElement('span');c.textContent=s.contact||'';var t=document.createElement('span');t.textContent=(s.createdAt||'').slice(0,10)+' · '+(s.rides||0)+' rides';d.appendChild(a);d.appendChild(em);d.appendChild(c);d.appendChild(t);l.appendChild(d);});
  $('#suCopy').textContent='Copy '+LB.signups.length+' sign-ups as CSV';
  var pl=$('#prList');pl.innerHTML='';var pend=LB.pending||[];
  if(!pend.length){var q=document.createElement('p');q.className='bd-note';q.textContent='No price reports waiting.';pl.appendChild(q);}
  pend.forEach(function(r){var row=document.createElement('div');row.className='pr-row';var t=document.createElement('span');var c=COUNTRIES[r.country],it=ITEMS[r.item];
    t.textContent=(it?it.n:r.item)+' · '+(c?c.n:r.country)+': '+MD.fmtC(+r.amount,r.country)+' per person'+(r.place?' · '+r.place:'');
    var ok=document.createElement('button');ok.type='button';ok.textContent='Approve';var no=document.createElement('button');no.type='button';no.textContent='Reject';
    var act=function(yes){backend().api.admin.moderate(r.id,yes).then(loadAdmin).catch(function(){toast('Could not update that report.','bad');});};
    ok.addEventListener('click',function(){act(true);});no.addEventListener('click',function(){act(false);});
    row.appendChild(t);row.appendChild(ok);row.appendChild(no);pl.appendChild(row);});}
async function loadAdmin(){var b=backend();if(!b||!LB.owner)return;
  try{var rows=await b.api.admin.signups(2000);LB.signups=rows.map(function(r){return {name:r.name,via:'email',contact:r.email,consent:r.consent,createdAt:r.created_at,updatedAt:r.created_at,rides:r.rides};});}catch(e){}
  try{LB.pending=await b.api.admin.pendingPrices();}catch(e){LB.pending=[];}
  renderOwner();}
$('#suCopy').addEventListener('click',function(){var rows=[['name','via','contact','marketing_consent','created','updated']].concat(LB.signups.map(function(s){return [s.name,s.via,s.contact,s.consent?'yes':'no',s.createdAt,s.updatedAt];}));
  var csv=rows.map(function(r){return r.map(csvCell).join(',');}).join('\n');var ta=$('#suCsv');ta.value=csv;
  var done=function(){$('#suCopy').textContent='Copied';setTimeout(function(){$('#suCopy').textContent='Copy '+LB.signups.length+' sign-ups as CSV';},1800);};
  try{navigator.clipboard.writeText(csv).then(done,function(){ta.hidden=false;ta.select();});}catch(e){ta.hidden=false;ta.select();}});
var board=$('#board');
function openBoard(){renderBoard();renderToday();board.hidden=false;$('#bdClose').focus();loadBoards();if(LB.owner)loadAdmin();boardPolling(true);}
function closeBoard(){board.hidden=true;boardPolling(false);}
document.querySelectorAll('[data-board]').forEach(function(b){b.addEventListener('click',openBoard);});
$('#bdClose').addEventListener('click',closeBoard);
addEventListener('keydown',function(e){if(e.key==='Escape'&&!board.hidden)closeBoard();});
function isoDay(day){return new Date(day*86400000).toISOString().slice(0,10);}
var boardTimer=null;
async function loadBoards(){var b=backend();if(!b){renderBoard();return;}
  try{var rows=await b.api.leaderboard(50);LB.rows=rows.map(function(r){return {id:r.user_id,name:r.name,best:r.best,stars:r.stars,dish:(DISHES[r.dish]&&DISHES[r.dish].n)||r.dish,country:r.country,crew:r.crew_id};});}catch(e){}
  try{LB.crewRows=await b.api.crews();}catch(e){}
  try{var dm=MD.dailyMarket();var t=await b.api.today(isoDay(dm.day),50);LB.today=t.map(function(r){return {id:r.user_id,name:r.name,best:r.score,stars:r.stars,dish:(DISHES[r.dish]&&DISHES[r.dish].n)||r.dish};});}catch(e){}
  if(AUTH){try{var ms=await b.api.myScore();LB.myCrew=ms?ms.crew_id:null;}catch(e){}}
  if(!board.hidden){renderBoard();renderToday();if(!$('#tabCrews').hidden)renderCrews();}
  renderMe();}
function boardPolling(on){clearInterval(boardTimer);if(on)boardTimer=setInterval(function(){if(!document.hidden)loadBoards();},60000);}
async function loadCrowdPrices(){var b=backend();if(!b)return;try{var rows=await b.api.approvedPrices();var c={};(rows||[]).forEach(function(r){if(!COUNTRIES[r.country]||!ITEMS[r.item])return;(c[r.country]=c[r.country]||{})[r.item]=+r.price;});MD.STATE.crowd=c;renderDishes();selectDish(state.dish,false);}catch(e){}}
window.__meuroReady.then(function(b){if(b){loadBoards();loadCrowdPrices();}else renderBoard();});

/* ================================================ LIVE: shared market, races, shouts, crews */
var LIVE={room:null,race:null,code:null,host:false,lobby:[],racers:[],ghosts:{},pos:{},lastSend:0,crews:[],ready:false,raceStart:0};
var KCOLORS=['#F2C230','#4FA866','#2F7FD6','#E5533D','#9B59D0','#16B5A6','#E84393','#F27B2B','#1E1E1E','#F4F1EA'];
var myColor=(function(){try{var c=localStorage.getItem('meuro.color');if(c&&KCOLORS.indexOf(c)>-1)return c;}catch(e){}return '#F2C230';})();
function setMyColor(c){c=String(c||'').toUpperCase();if(KCOLORS.indexOf(c)<0)return;myColor=c;try{localStorage.setItem('meuro.color',c);}catch(e){}try{M.keke.color.set(c);}catch(e){}if(LIVE&&LIVE.room)lobbyPresence();if(LIVE&&LIVE.race)LIVE.race.presence({color:c}).catch(function(){});renderMe();}
try{M.keke.color.set(myColor);}catch(e){}
var SHOUTS=['Oya, follow me!','Market dey hot!','I don pass you!','Who get pepper?','Jollof na life','Gbam!','Wait for me o','Na me go win'];
function nick(){return (player&&player.name)||'Rider';}
function safeName(v){return String(v==null?'':v).replace(/[\u0000-\u001f<>]/g,'').slice(0,20)||'Rider';}
function safeColor(c){return KCOLORS.indexOf(c)>-1?c:'#F4F6EF';}

/* -------- accounts: create account / log in / log out (email only) */
var AUTH=null, pendingAfterJoin=null, jmode='signup';
function backend(){return window.__meuroBackend||null;}
var PROFILE=null;
var AUTH_MSG={'auth/email-not-confirmed':'Confirm your email first: open the link we sent you (check spam too), then log in.','auth/captcha-needed':'Complete the robot check above first.','auth/captcha':'The robot check failed. Please try it again.','auth/email-already-in-use':'That email already has an account. Log in instead.','auth/invalid-email':'Enter a valid email address, like you@example.com.','auth/weak-password':'Use a password of at least 8 characters, mixing letters and numbers.','auth/invalid-credential':'That email and password do not match. Try again or reset your password.','auth/wrong-password':'That email and password do not match. Try again or reset your password.','auth/user-not-found':'No account uses that email yet. Create one instead.','auth/too-many-requests':'Too many tries. Wait a minute, then try again.','auth/network-request-failed':'No internet connection. Check it and try again.','auth/missing-email':'Enter your email address first.'};
function authMsg(code){return AUTH_MSG[code]||'Something went wrong. Try again.';}
/* Supabase may ask for stronger passwords than the site's basic check; say exactly what it wants. */
function pwRule(m){m=String(m||'');var n=(m.match(/at least (\d+) characters/)||[])[1]||'8';var need=[];if(/ABCDEFGHIJ/.test(m))need.push('a capital letter');if(/abcdefghij/.test(m))need.push('a small letter');if(/0123456789/.test(m))need.push('a number');if(/!@#/.test(m))need.push('a symbol like ! or @');if(/weak and easy to guess|pwned|leaked/i.test(m))return 'That password is too common. Please choose a different one.';return 'Use a password of at least '+n+' characters'+(need.length?' with '+need.join(', ').replace(/, ([^,]*)$/,' and $1'):'')+'.';}
function setJMode(m){jmode=m;$('#jTabs').hidden=m==='newpass';$('#jEmail').closest('label').hidden=m==='newpass';$('#jResend').hidden=true;if(backend()&&backend().auth.needCaptcha()&&m!=='newpass')backend().auth.renderCaptcha($('#jCaptcha')).catch(function(){});$('#jTabs').querySelectorAll('button').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.m===m));});
  $('#jNameRow').hidden=m!=='signup';$('#jConsentRow').hidden=m!=='signup';$('#jForgot').hidden=m!=='login';
  $('#jSave').textContent=m==='signup'?'Create account':m==='newpass'?'Set new password':'Log in';$('#jPass').autocomplete=m==='login'?'current-password':'new-password';
  $('#jTitle').textContent=m==='signup'?'Join the market':m==='newpass'?'Choose a new password':'Welcome back';$('#jSub').textContent=m==='signup'?'Create a free account to race friends, join crews, keep your streak and save your scores.':m==='newpass'?'Use at least 8 characters with letters and numbers.':'Log in with the email you signed up with.';
  $('#jMsg').textContent='';$('#jMsg').className='err';}
$('#jTabs').querySelectorAll('button').forEach(function(b){b.addEventListener('click',function(){setJMode(b.dataset.m);});});
function platformMode(){return !backend()&&!!LB.uid;}
function needProfile(cb){if(AUTH&&AUTH.uid&&player){cb();return;}if(platformMode()){pendingAfterJoin=cb;openJoin('profile');return;}if(!backend()){toast('Live play is not switched on for this copy of the site yet.','bad');return;}pendingAfterJoin=cb;openJoin();}
function openJoin(mode){if(platformMode()||mode==='profile'){if(!platformMode())return;$('#joinModal').hidden=false;jmode='profile';$('#jTabs').hidden=true;$('#jNameRow').hidden=false;$('#jConsentRow').hidden=false;$('#jForgot').hidden=true;$('#jPass').closest('label').hidden=true;$('#jTitle').textContent='Create your rider';$('#jSub').textContent='Pick the name your friends will see and the email for your free weekly meal plans.';$('#jSave').textContent='Join the market';$('#jMsg').textContent='';if(player){$('#jName').value=player.name;$('#jEmail').value=player.contact||'';}setTimeout(function(){$('#jName').focus();},60);return;}
  if(!backend()){toast('Live play is not switched on for this copy of the site yet.','bad');return;}$('#joinModal').hidden=false;setJMode(typeof mode==='string'?mode:jmode);setTimeout(function(){(jmode==='signup'?$('#jName'):$('#jEmail')).focus();},60);}
function closeJoin(){$('#joinModal').hidden=true;pendingAfterJoin=null;}
$('#jClose').addEventListener('click',closeJoin);
$('#joinForm').addEventListener('submit',async function(e){e.preventDefault();var b=backend();
  if(!b&&jmode==='profile'&&platformMode()){var msg=$('#jMsg');msg.className='err';var n=cleanName($('#jName').value),em=String($('#jEmail').value||'').trim().toLowerCase();
    if(!n||n.length<2){msg.textContent='Add a rider name of at least 2 letters.';$('#jName').focus();return;}
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)){msg.textContent=authMsg('auth/invalid-email');$('#jEmail').focus();return;}
    player={name:n,via:'email',contact:em,consent:$('#jConsent').checked};saveLocal();
    if(LB.db){try{var su=LB.db.doc('signups/'+LB.uid);var prev=await su.get();var t=new Date().toISOString();await su.set({name:n,via:'email',contact:em,consent:!!player.consent,createdAt:(prev.exists&&prev.data().createdAt)||t,updatedAt:t});LB.profileSaved=true;LB.profileDirty=false;}catch(x){}}
    AUTH={uid:LB.uid};renderMe();if(LIVE&&LIVE.room)lobbyPresence();if(LIVE.race)LIVE.race.presence({nick:nick(),color:myColor}).catch(function(){});
    var c=pendingAfterJoin;pendingAfterJoin=null;$('#joinModal').hidden=true;if(state.mode==='result'&&LB.last&&!LB.savedThis)prepareSave(LB.last);if(c)c();return;}
  if(!b)return;
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
  if(!r.ok){msg.textContent=r.code==='auth/weak-password'?pwRule(r.message):authMsg(r.code);$('#jResend').hidden=r.code!=='auth/email-not-confirmed';return;}
  track(jmode==='signup'?'sign_up':'login',{method:'email'});
  $('#jPass').value='';msg.className='sb-msg ok';
  if(jmode==='signup'&&r.confirm){setJMode('login');$('#jEmail').value=email;msg.className='sb-msg ok';msg.textContent='Account created. We sent a confirmation link to '+email+'. Open it on this phone, then you are in.';$('#jResend').hidden=false;return;}
  msg.textContent=jmode==='signup'?'Account created. Welcome to the market!':'Logged in.';});
$('#jResend').addEventListener('click',async function(){var em=String($('#jEmail').value||'').trim().toLowerCase();var m=$('#jMsg');if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)){m.className='err';m.textContent=authMsg('auth/invalid-email');return;}var r=await backend().auth.resendConfirmation(em);m.className=r.ok?'sb-msg ok':'err';m.textContent=r.ok?'Sent again. Check your inbox and spam folder.':authMsg(r.code);});
$('#jForgot').addEventListener('click',async function(){var b=backend();var email=String($('#jEmail').value||'').trim().toLowerCase();var msg=$('#jMsg');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)){msg.className='err';msg.textContent='Enter your email above, then tap Forgot password again.';$('#jEmail').focus();return;}
  var r=await b.auth.reset(email);if(r.ok){msg.className='sb-msg ok';msg.textContent='Check your inbox for a link to reset your password.';}else{msg.className='err';msg.textContent=authMsg(r.code);}});
var signupsSub=false;
function subscribeSignups(){if(signupsSub||!LB.db)return;signupsSub=true;LB.db.collection('signups').orderBy('updatedAt','desc').limit(500).onSnapshot(function(s){LB.signups=s.docs.map(function(d){return d.data()||{};});renderOwner();},function(){signupsSub=false;});}
window.addEventListener('meuro-recovery',function(){$('#joinModal').hidden=false;setJMode('newpass');setTimeout(function(){$('#jPass').focus();},60);});
window.addEventListener('meuro-auth',async function(e){var d=e.detail||{};await window.__meuroReady;
  AUTH=d.uid?d:null;LB.uid=d.uid||null;LB.owner=!!d.isAdmin;LB.writable=!!d.uid;
  if(d.uid){var p=null;try{p=await backend().api.myProfile();}catch(x){}
    PROFILE=p||null;
    player={name:cleanName((p&&p.name)||d.name||String(d.email||'').split('@')[0])||'Rider',via:'email',contact:d.email||'',consent:!!(p&&p.consent)};saveLocal();LB.profileSaved=true;LB.profileDirty=false;
    if(p&&p.keke_color)setMyColor(p.keke_color);
    if(LB.owner)loadAdmin();loadBoards();renderDaily();}
  else{player=null;PROFILE=null;try{localStorage.removeItem('meuro.player');}catch(x){}if(LIVE&&LIVE.race)leaveRace(true);$('#bdOwner').hidden=true;renderDaily();}
  renderMe();if(LIVE&&LIVE.room)lobbyPresence();if(state.mode==='result'&&LB.last&&!LB.savedThis)prepareSave(LB.last);if(!board.hidden)renderBoard();
  if(AUTH&&pendingAfterJoin){var c=pendingAfterJoin;pendingAfterJoin=null;setTimeout(function(){$('#joinModal').hidden=true;c();},500);}
  else if(AUTH&&!$('#joinModal').hidden){setTimeout(function(){$('#joinModal').hidden=true;},700);}});
function renderMe(){var b=$('#meChip');$('#meEdit').textContent=platformMode()?'Edit':'Log out';$('#authBtn').hidden=!!AUTH||!backend();if(!b)return;if(AUTH&&player){b.hidden=false;$('#meName').textContent=player.name;$('#meName').onclick=openProfile;$('#meDot').style.background=myColor;var cr=myCrew();$('#meCrew').textContent=cr?(' · '+cr.name):'';}else b.hidden=true;}
$('#authBtn').addEventListener('click',function(){openJoin('login');});

/* -------- ghosts (other riders' kekes) */
function labelFor(name,color){return ctex(512,128,function(x,w,h){x.fillStyle='rgba(10,16,12,.86)';var r=50;x.beginPath();x.moveTo(r,10);x.arcTo(w-10,10,w-10,h-10,r);x.arcTo(w-10,h-10,10,h-10,r);x.arcTo(10,h-10,10,10,r);x.arcTo(10,10,w-10,10,r);x.fill();
  x.fillStyle=color;x.beginPath();x.arc(58,h/2,20,0,7);x.fill();x.fillStyle='#fff';x.font='700 50px Figtree, Arial, sans-serif';x.textBaseline='middle';x.fillText(name,96,h/2+3);});}
function makeGhost(name,color){
  var keep=keke.userData;keke.userData={};var g=keke.clone(true);keke.userData=keep;
  var rm=[];g.traverse(function(o){if(o.isLight)rm.push(o);});rm.forEach(function(o){o.parent.remove(o);});
  var mat=M.keke.clone();mat.color.set(color);
  var wheels=[];g.traverse(function(o){if(o.isMesh){if(o.material===M.keke)o.material=mat;o.castShadow=false;if(o.geometry.type==='CylinderGeometry'&&o.material===M.black&&Math.abs(o.position.y-.33)<.01)wheels.push(o);}});
  var lb=new THREE.Sprite(new THREE.SpriteMaterial({map:labelFor(name,color),depthTest:false,depthWrite:false,fog:false,toneMapped:false,transparent:true}));lb.scale.set(3.4,.85,1);lb.position.y=3.25;lb.renderOrder=11;g.add(lb);
  g.userData={wheels:wheels,label:lb,name:name,color:color,tz:6,tx:0,v:0,bubble:null,bubbleT:0};scene.add(g);return g;}
function bubble(obj,text){if(obj.userData.bubble){obj.remove(obj.userData.bubble);}
  var t=ctex(640,150,function(x,w,h){x.fillStyle='#FFFFFF';var r=60;x.beginPath();x.moveTo(r,10);x.arcTo(w-10,10,w-10,h-30,r);x.arcTo(w-10,h-30,10,h-30,r);x.arcTo(10,h-30,10,10,r);x.arcTo(10,10,w-10,10,r);x.fill();x.beginPath();x.moveTo(w/2-18,h-32);x.lineTo(w/2,h-4);x.lineTo(w/2+18,h-32);x.fill();
    x.fillStyle='#15231A';x.font='700 50px Figtree, Arial, sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText(text,w/2,(h-30)/2+3);});
  var s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthTest:false,depthWrite:false,fog:false,toneMapped:false,transparent:true}));s.scale.set(4,.94,1);s.position.y=4.5;s.renderOrder=12;obj.add(s);obj.userData.bubble=s;obj.userData.bubbleT=2.8;}
function ridersToShow(){
  var list=[];
  if(LIVE.race){LIVE.racers.forEach(function(p){if(!p.sameTab&&p.presence&&p.presence.mode==='ride')list.push(p);});}
  else{LIVE.lobby.forEach(function(p){if(!p.sameTab&&p.presence&&p.presence.mode==='ride'&&!p.presence.racing)list.push(p);});}
  return list.slice(0,16);}
function clampNum(v,lo,hi,d){v=+v;return isFinite(v)?Math.max(lo,Math.min(hi,v)):d;}
function onPos(m){if(m.sameTab)return;var d=m.data||{};LIVE.pos[m.peer]={z:clampNum(d.z,-600,10,6),x:clampNum(d.x,-4,4,0),v:clampNum(d.v,-6,20,0),got:clampNum(d.g,0,10,0),need:clampNum(d.n,1,10,5),t:Date.now()};}
function syncGhosts(){var want={};
  ridersToShow().forEach(function(p){var pr=p.presence;want[p.peer]=1;var gh=LIVE.ghosts[p.peer];var nm=safeName(pr.nick),col=safeColor(pr.color);
    if(!gh||gh.userData.name!==nm||gh.userData.color!==col){if(gh)scene.remove(gh);gh=makeGhost(nm,col);LIVE.ghosts[p.peer]=gh;gh.position.set(+pr.x||0,0,+pr.z||6);}
    var pp=LIVE.pos[p.peer];if(pp){gh.userData.tz=pp.z;gh.userData.tx=pp.x;gh.userData.v=pp.v;}});
  Object.keys(LIVE.ghosts).forEach(function(k){if(!want[k]){scene.remove(LIVE.ghosts[k]);delete LIVE.ghosts[k];}});
  $('#hRiders').textContent=Object.keys(LIVE.ghosts).length?('+'+Object.keys(LIVE.ghosts).length+' riding with you'):'';}
function clearGhosts(){Object.keys(LIVE.ghosts).forEach(function(k){scene.remove(LIVE.ghosts[k]);});LIVE.ghosts={};}
setInterval(function(){if(LIVE.room)syncGhosts();var cut=Date.now()-15000;Object.keys(LIVE.pos).forEach(function(k){if(LIVE.pos[k].t<cut)delete LIVE.pos[k];});if(LIVE.race)renderRaceMini();},1000);
LIVE.frame=function(dt){
  Object.keys(LIVE.ghosts).forEach(function(k){var g=LIVE.ghosts[k],u=g.userData;var dz=u.tz-g.position.z;
    g.position.z+= Math.abs(dz)>25?dz:dz*Math.min(1,dt*6);g.position.x+=(u.tx-g.position.x)*Math.min(1,dt*6);
    g.position.y=Math.abs(u.v)>.5?Math.sin(state.t*14+k.length)*.025:0;u.wheels.forEach(function(w){w.rotation.x-=u.v*dt/0.33;});
    g.visible=Math.abs(g.position.z-state.z)<160;
    if(u.bubble){u.bubbleT-=dt;if(u.bubbleT<=0){g.remove(u.bubble);u.bubble=null;}}});
  var ku=keke.userData;if(ku.bubble){ku.bubbleT-=dt;if(ku.bubbleT<=0){keke.remove(ku.bubble);ku.bubble=null;}}
  if(state.mode==='ride'&&LIVE.room&&AUTH){var now=performance.now();if(now-LIVE.lastSend>(LITE?450:320)){LIVE.lastSend=now;
    var got=Object.keys(state.got).length;var target=LIVE.race||LIVE.room;
    target.emit('pos',{z:Math.round(state.z*10)/10,x:Math.round(state.x*100)/100,v:Math.round(state.v*10)/10,g:got,n:DISHES[state.dish].items.length}).catch(function(){});}}
  Object.keys(LIVE.ghosts).forEach(function(k){var p=LIVE.pos[k];if(p){var u=LIVE.ghosts[k].userData;u.tz=p.z;u.tx=p.x;u.v=p.v;}});
};

/* -------- lobby presence + online list */
function lobbyPresence(){if(!LIVE.room)return;var cr=myCrew();
  LIVE.room.presence({nick:nick(),color:myColor,mode:state.mode,racing:!!LIVE.race,dish:state.dish,crew:cr?cr.name.slice(0,24):null}).catch(function(){});}
function modeText(pr){if(pr.racing)return 'Racing with friends';if(pr.mode==='ride')return 'Riding · '+((DISHES[pr.dish]&&DISHES[pr.dish].n)||'');if(pr.mode==='result')return 'Checking their plate';return 'Picking a dish';}
function renderOnline(){var others=LIVE.lobby.filter(function(p){return !p.isMe;});var n=LIVE.lobby.length;
  $('#onlineN').textContent=!AUTH?'Log in to ride with others':n<=1?'Only you in this market':n+' riders in your market';
  var av=$('#onlineAv');av.innerHTML='';LIVE.lobby.slice(0,5).forEach(function(p){var s=document.createElement('span');s.style.background=safeColor(p.presence&&p.presence.color);s.textContent=safeName(p.presence&&p.presence.nick).charAt(0).toUpperCase();av.appendChild(s);});
  var list=$('#bdOnline');list.innerHTML='';
  LIVE.lobby.forEach(function(p){var pr=p.presence||{};var row=document.createElement('div');row.className='bd-row'+(p.isMe?' me':'');
    var dot=document.createElement('span');dot.className='pos';var d=document.createElement('i');d.className='odot';d.style.background=safeColor(pr.color);dot.appendChild(d);
    var mid=document.createElement('div');var nm=document.createElement('div');nm.className='nm';nm.textContent=safeName(pr.nick)+(p.isMe?' (you)':'');var ds=document.createElement('div');ds.className='ds';ds.textContent=modeText(pr)+(pr.crew?' · '+String(pr.crew).slice(0,24):'');mid.appendChild(nm);mid.appendChild(ds);
    row.appendChild(dot);row.appendChild(mid);row.appendChild(document.createElement('span'));list.appendChild(row);});
  if(!LIVE.lobby.length){list.innerHTML='<p class="bd-empty">Nobody else is online right now. Share Market Run with friends to ride together.</p>';}}

/* -------- shouts */
function shout(text){if(!LIVE.room)return;needProfile(function(){track('shout',{in_race:!!LIVE.race});var target=LIVE.race||LIVE.room;target.emit('shout',{t:SHOUTS.indexOf(text),n:nick(),c:myColor}).catch(function(){});$('#shoutBar').hidden=true;});}
function onShout(m){var d=m.data||{};var text=SHOUTS[d.t];if(!text)return;var name=safeName(d.n);
  if(m.isMe&&m.sameTab){bubble(keke,text);toast('You: '+text,'');return;}
  var g=LIVE.ghosts[m.peer];if(g)bubble(g,text);toast(name+': '+text,'bonus');beep(560,.08,'triangle',.05);}
(function(){var bar=$('#shoutBar');SHOUTS.forEach(function(s){var b=document.createElement('button');b.type='button';b.className='glass';b.textContent=s;b.addEventListener('click',function(){shout(s);});bar.appendChild(b);});
  $('#bShout').addEventListener('click',function(){bar.hidden=!bar.hidden;});})();

/* -------- races with friends */
var WORDS=['jollof','egusi','suya','amala','waakye','banku','amiwo','okra','dodo','kenkey','efo','moimoi'];
function newCode(){return WORDS[Math.floor(Math.random()*WORDS.length)]+'-'+(100+Math.floor(Math.random()*900));}
function normCode(v){v=String(v||'').toLowerCase().replace(/[^a-z0-9-]/g,'').replace(/^-+|-+$/g,'');return /^[a-z0-9][a-z0-9-]{2,30}$/.test(v)?v:null;}
function showRace(view){var p=$('#race');p.hidden=false;$('#rcStart').hidden=view!=='start';$('#rcLobby').hidden=view!=='lobby';}
function hideRace(){$('#race').hidden=true;}
$('#bRace').addEventListener('click',function(){if(LIVE.race)showRace('lobby');else showRace('start');});
$('#rcClose').addEventListener('click',hideRace);
$('#rcCreate').addEventListener('click',function(){needProfile(function(){joinRace(newCode(),true);});});
$('#rcJoinForm').addEventListener('submit',function(e){e.preventDefault();var c=normCode($('#rcCode').value);if(!c){$('#rcErr').textContent='Enter the code your friend shared, like jollof-482.';return;}needProfile(function(){joinRace(c,false);});});
async function joinRace(code,host){
  if(!LIVE.room){$('#rcErr').textContent='Live races are not available on this connection.';return;}
  $('#rcErr').textContent='';$('#rcCreate').disabled=true;
  try{var r=await LIVE.room.join('race-'+code);}catch(err){$('#rcCreate').disabled=false;$('#rcErr').textContent=err&&err.code==='limit_reached'?'Too many races open on this device. Leave one and try again.':'Could not open that race. Check the code and try again.';return;}
  $('#rcCreate').disabled=false;
  track(host?'race_create':'race_join',{});
  LIVE.race=r;LIVE.code=code;LIVE.host=!!host;LIVE.racers=r.peers();
  r.presence({nick:nick(),color:myColor,host:!!host,mode:'lobby',dish:state.dish,done:false,score:null}).catch(function(){});
  r.onPeers(function(ch){LIVE.racers=ch.peers;renderRaceLobby();renderRaceMini();renderRaceResults();syncGhosts();
    ch.joined.forEach(function(p){if(!p.isMe&&LIVE.ready)toast(safeName(p.presence&&p.presence.nick)+' joined the race','good');});},function(){toast('The race connection ended.','bad');leaveRace(true);});
  r.on('start',function(m){var d=m.data||{};if(!DISHES[d.dish]||!isFinite(+d.seed))return;beginRace(d.dish,+d.seed,safeName(d.n));});
  r.on('shout',onShout);r.on('pos',onPos);
  LIVE.ready=true;$('#rcCodeBig').textContent=code.toUpperCase();updateInvite();showRace('lobby');renderRaceLobby();lobbyPresence();
  $('#bRace').classList.add('on');$('#bRaceT').textContent='Race '+code.toUpperCase();}
async function leaveRace(silent){var r=LIVE.race;LIVE.race=null;LIVE.code=null;LIVE.host=false;LIVE.racers=[];LIVE.ready=false;if(r)try{await r.leave();}catch(e){}
  clearGhosts();syncGhosts();hideRace();$('#raceMini').hidden=true;$('#raceRes').hidden=true;$('#bRace').classList.remove('on');$('#bRaceT').textContent='Race friends';lobbyPresence();if(!silent)toast('You left the race.','');}
$('#rcLeave').addEventListener('click',function(){leaveRace(false);});
var ARTIFACT_URL='';
function raceLink(){if(platformMode()&&ARTIFACT_URL)return ARTIFACT_URL+'#race-'+LIVE.code;return location.href.split(/[?#]/)[0]+'?race='+LIVE.code;}
function inviteText(){return 'Race me on Meuro Market Run! Tap to join my race (code '+LIVE.code.toUpperCase()+'): '+raceLink();}
function updateInvite(){var a=$('#rcWa');a.href='https://wa.me/?text='+encodeURIComponent(inviteText());}
$('#rcWa').addEventListener('click',function(e){track('share',{method:'whatsapp',content_type:'race_invite'});if(navigator.share){e.preventDefault();navigator.share({title:'Meuro Market Run',text:'Race me on Meuro Market Run! Code '+LIVE.code.toUpperCase(),url:raceLink()}).catch(function(){window.open($('#rcWa').href,'_blank','noopener');});}});
$('#rcCopy').addEventListener('click',function(){track('share',{method:'copy_link',content_type:'race_invite'});var t=raceLink();var b=$('#rcCopy');
  var ok=function(){b.textContent='Link copied';setTimeout(function(){b.textContent='Copy link';},1800);};var fb=function(){$('#rcInvite').hidden=false;$('#rcInvite').value=inviteText();$('#rcInvite').select();};
  try{navigator.clipboard.writeText(t).then(ok,fb);}catch(e){fb();}});
function hostPeer(){var h=LIVE.racers.filter(function(p){return p.presence&&p.presence.host;});return h[0]||null;}
function renderRaceLobby(){if(!LIVE.race)return;var list=$('#rcRiders');list.innerHTML='';var hp=hostPeer();
  LIVE.racers.forEach(function(p){var pr=p.presence||{};var li=document.createElement('div');li.className='rc-rider';var dot=document.createElement('i');dot.style.background=safeColor(pr.color);var nm=document.createElement('b');nm.textContent=safeName(pr.nick)+(p.isMe?' (you)':'');li.appendChild(dot);li.appendChild(nm);
    var tag=document.createElement('span');tag.textContent=pr.host?'Host':(pr.mode==='ride'?'Riding':pr.mode==='done'?'Finished':'Ready');li.appendChild(tag);list.appendChild(li);});
  var dk=(hp&&hp.presence&&DISHES[hp.presence.dish])?hp.presence.dish:state.dish;var d=DISHES[dk];
  $('#rcDishImg').src=dishImg(dk);$('#rcDishName').textContent=d.n;$('#rcDishInfo').textContent=fmtFor(MD.budgetOf(dk,MD.STATE.portion),d.r)+' budget · '+d.items.length+' ingredients · '+COUNTRIES[d.r].n;
  var amHost=LIVE.host||!hp;if(amHost&&$('#rcPick').value!==dk)$('#rcPick').value=dk;$('#rcStartBtn').hidden=!amHost;$('#rcPick').hidden=!amHost;$('#rcWait').hidden=amHost;
  $('#rcCount').textContent=LIVE.racers.length+(LIVE.racers.length===1?' rider':' riders');}
(function(){var sel=$('#rcPick');Object.keys(COUNTRIES).forEach(function(cc){var g=document.createElement('optgroup');g.label=COUNTRIES[cc].n;Object.keys(DISHES).filter(function(k){return DISHES[k].r===cc;}).forEach(function(k){var o=document.createElement('option');o.value=k;o.textContent=DISHES[k].n;g.appendChild(o);});if(g.children.length)sel.appendChild(g);});
  sel.addEventListener('change',function(){state.dish=sel.value;if(LIVE.race)LIVE.race.presence({dish:sel.value}).catch(function(){});renderRaceLobby();});})();
$('#rcStartBtn').addEventListener('click',function(){if(!LIVE.race)return;var dk=$('#rcPick').value||state.dish;var seed=1+Math.floor(Math.random()*2000000000);
  LIVE.race.emit('start',{dish:dk,seed:seed,n:nick()}).catch(function(err){toast(err&&err.code==='not_permitted'?'You cannot start races in this space.':'Could not start the race. Try again.','bad');});});
function beginRace(dish,seed,by){hideRace();closeBoard();$('#result').hidden=true;$('#shoutBar').hidden=true;LIVE.pos={};
  state.dish=dish;selectDish(dish,false);startRide({seed:seed,race:true});state.locked=true;
  LIVE.race.presence({mode:'ride',done:false,score:null,dish:dish}).catch(function(){});lobbyPresence();
  $('#raceMini').hidden=false;renderRaceMini();
  var cd=$('#countdown'),n=3;cd.hidden=false;cd.textContent=n;beep(440,.15,'sine',.12);
  var iv=setInterval(function(){n--;if(n>0){cd.textContent=n;beep(440,.15,'sine',.12);}else{clearInterval(iv);cd.textContent='GO!';beep(880,.3,'sine',.14);horn();state.locked=false;setThrottle(1);setTimeout(function(){cd.hidden=true;},700);}},900);
  toast((by||'The host')+' started the race: '+DISHES[dish].n,'bonus');}
function raceRank(){return LIVE.racers.map(function(p){var pr=p.presence||{},pp=p.sameTab?{z:state.z,got:Object.keys(state.got).length,need:DISHES[state.dish].items.length}:(LIVE.pos[p.peer]||{});return {p:p,pr:pr,done:pr.mode==='done',score:clampNum(pr.score,0,100,0),prog:-(pp.z||6),got:pp.got||0,need:pp.need||5};})
  .sort(function(a,b){if(a.done!==b.done)return a.done?-1:1;if(a.done)return b.score-a.score;return b.prog-a.prog;});}
function renderRaceMini(){if(!LIVE.race){$('#raceMini').hidden=true;return;}var l=$('#raceMiniList');l.innerHTML='';
  raceRank().slice(0,5).forEach(function(r,i){var d=document.createElement('div');d.className='rm-row'+(r.p.isMe?' me':'');var a=document.createElement('span');a.textContent=(i+1)+'.';var dot=document.createElement('i');dot.style.background=safeColor(r.pr.color);var b=document.createElement('b');b.textContent=safeName(r.pr.nick);var c=document.createElement('em');c.textContent=r.done?(r.score+' pts'):(r.got+'/'+r.need);d.appendChild(a);d.appendChild(dot);d.appendChild(b);d.appendChild(c);l.appendChild(d);});}
function renderRaceResults(){var box=$('#raceRes');if(!LIVE.race||state.mode!=='result'){box.hidden=true;return;}box.hidden=false;var l=$('#raceResList');l.innerHTML='';var rank=raceRank();
  rank.forEach(function(r,i){var d=document.createElement('div');d.className='bd-row'+(r.p.isMe?' me':'');var pos=document.createElement('span');pos.className='pos tnum';pos.textContent=r.done?(i+1):'·';
    var mid=document.createElement('div');var nm=document.createElement('div');nm.className='nm';nm.textContent=safeName(r.pr.nick)+(r.p.isMe?' (you)':'')+(r.done&&i===0?' · Winner':'');var ds=document.createElement('div');ds.className='ds';ds.textContent=r.done?starStr(r.pr.stars):'Still riding · '+r.got+'/'+r.need+' items';mid.appendChild(nm);mid.appendChild(ds);
    var sc=document.createElement('div');sc.className='sc tnum';sc.textContent=r.done?r.score:'…';d.appendChild(pos);d.appendChild(mid);d.appendChild(sc);l.appendChild(d);});
  var amHost=LIVE.host||!hostPeer();$('#raceAgain').textContent=amHost?'Start a rematch':'Back to race lobby';}
$('#raceAgain').addEventListener('click',function(){$('#result').hidden=true;var i=$('#intro');i.hidden=false;i.classList.remove('gone');state.mode='intro';clearPickups();state.z=6;state.v=0;
  if(LIVE.race)LIVE.race.presence({mode:'lobby',done:false,score:null}).catch(function(){});lobbyPresence();showRace('lobby');renderRaceLobby();});
LIVE.onFinish=function(score,stars){lobbyPresence();if(LIVE.race){LIVE.race.presence({mode:'done',done:true,score:score,stars:stars,z:state.z}).catch(function(){});$('#raceMini').hidden=true;renderRaceResults();}};

/* -------- crews */
function myCrewId(){return LB.myCrew||null;}
function myCrew(){var id=myCrewId();if(!id)return null;var r=(LB.crewRows||[]).filter(function(c){return c.crew_id===id;})[0];return r?{id:r.crew_id,name:cleanName(r.name)}:null;}
function crewStats(){return (LB.crewRows||[]).map(function(r){return {c:{id:r.crew_id,name:cleanName(r.name)||'Crew'},members:r.members,pts:r.points};});}
function renderCrews(){var l=$('#bdCrews');l.innerHTML='';var mine=myCrewId();
  var head=$('#crewMine');if(mine&&myCrew()){head.innerHTML='';var t=document.createElement('span');t.textContent='Your crew: ';var b=document.createElement('b');b.textContent=myCrew().name;var lv=document.createElement('button');lv.type='button';lv.className='linkbtn';lv.textContent='Leave';lv.addEventListener('click',function(){setCrew(null);});head.appendChild(t);head.appendChild(b);head.appendChild(document.createTextNode(' '));head.appendChild(lv);}else{head.textContent='Join a crew or start one with your friends. A crew\'s score is its top 5 riders\' best plates.';}
  var st=crewStats();if(!st.length){l.innerHTML='<p class="bd-empty">No crews yet. Start the first one.</p>';}
  st.forEach(function(s,i){var row=document.createElement('div');row.className='bd-row'+(s.c.id===mine?' me':'');var pos=document.createElement('span');pos.className='pos tnum';pos.textContent=i+1;
    var mid=document.createElement('div');var nm=document.createElement('div');nm.className='nm';nm.textContent=s.c.name;var ds=document.createElement('div');ds.className='ds';ds.textContent=s.members+(s.members===1?' rider':' riders');mid.appendChild(nm);mid.appendChild(ds);
    var right=document.createElement('div');right.className='sc tnum';right.textContent=s.pts;
    if(s.c.id!==mine){var jb=document.createElement('button');jb.type='button';jb.className='rm';jb.style.color='var(--gold)';jb.textContent='Join this crew';jb.addEventListener('click',function(){setCrew(s.c.id);});row.appendChild(pos);row.appendChild(mid);row.appendChild(right);row.appendChild(jb);}
    else{row.appendChild(pos);row.appendChild(mid);row.appendChild(right);}
    l.appendChild(row);});
  renderMe();}
var CREW_MSG={already_has_crew:'You already started a crew. You can lead one crew at a time.',name_taken:'That crew name is taken. Try another.',bad_name:'Use 3 to 24 letters or numbers for the crew name.',no_such_crew:'That crew no longer exists.'};
async function setCrew(id){needProfile(async function(){var b=backend();if(!b){toast('Crews need a Meuro account.','bad');return;}
  try{await b.api.setCrew(id);LB.myCrew=id;track(id?'crew_join':'crew_leave',{});await loadBoards();var c=myCrew();toast(id?'You joined '+(c?c.name:'the crew'):'You left your crew.','good');lobbyPresence();renderCrews();}
  catch(err){toast(CREW_MSG[err&&err.code]||'Could not update your crew. Try again.','bad');}});}
$('#crewForm').addEventListener('submit',function(e){e.preventDefault();var n=cleanName($('#crewName').value).slice(0,24);if(!n||n.length<3){$('#crewErr').textContent=CREW_MSG.bad_name;return;}$('#crewErr').textContent='';
  needProfile(async function(){var b=backend();if(!b){$('#crewErr').textContent='Crews need a Meuro account.';return;}
    try{track('crew_create',{});var id=await b.api.createCrew(n);$('#crewName').value='';LB.myCrew=id;await loadBoards();renderCrews();toast('Crew created: '+n,'good');lobbyPresence();}catch(err){$('#crewErr').textContent=CREW_MSG[err&&err.code]||'Could not create the crew. Try again.';}});});
$('#bCrew').addEventListener('click',function(){openBoard();boardTab('crews');});

/* -------- board tabs */
function boardTab(t){document.querySelectorAll('#bdTabs button').forEach(function(b){b.setAttribute('aria-pressed',String(b.dataset.t===t));});
  $('#tabPlayers').hidden=t!=='players';$('#tabToday').hidden=t!=='today';$('#tabCrews').hidden=t!=='crews';$('#tabOnline').hidden=t!=='online';
  if(t==='crews')renderCrews();if(t==='online')renderOnline();if(t==='today')renderToday();}
document.querySelectorAll('#bdTabs button').forEach(function(b){b.addEventListener('click',function(){boardTab(b.dataset.t);});});
$('#onlinePill').addEventListener('click',function(){openBoard();boardTab('online');});

/* -------- connect */
(async function initLive(){
  renderMe();
  if(!window.claude||typeof window.claude.use!=='function'){document.body.classList.add('live-off');return;}
  var room=null;try{room=await window.claude.use('room');}catch(e){}
  if(!room){document.body.classList.add('live-off');return;}
  LIVE.room=room;document.body.classList.add('live-on');
  room.onPeers(function(ch){LIVE.lobby=ch.peers.filter(function(p){return p.kind==='viewer';});renderOnline();syncGhosts();
    ch.joined.forEach(function(p){if(!p.isMe&&LIVE.lobbyReady)toast(safeName(p.presence&&p.presence.nick)+' entered the market','');});},function(){document.body.classList.add('live-off');});
  room.on('shout',onShout);room.on('pos',onPos);
  lobbyPresence();setTimeout(function(){LIVE.lobbyReady=true;},2500);
  var q='';try{q=new URLSearchParams(location.search).get('race')||'';}catch(x){}var h=(location.hash||'').replace('#','');if(!q&&/^race-/.test(h))q=h.slice(5);var c=normCode(q);if(c){showRace('start');$('#rcCode').value=c.toUpperCase();needProfile(function(){joinRace(c,false);});}
})();

/* ================================================ v8: daily market, streaks, badges, sharing, prices */
function guestId(){try{var g=localStorage.getItem('meuro.guest');if(!g){g=Math.random().toString(36).slice(2,12);localStorage.setItem('meuro.guest',g);}return g;}catch(e){return 'guest';}}
function homeCountry(){var p=PROFILE&&PROFILE.countries&&PROFILE.countries[0];if(p)return p;try{return localStorage.getItem('meuro.home')||'ng';}catch(e){return 'ng';}}
function todayChallenge(){return MD.personalChallenge(AUTH?AUTH.uid:guestId());}
function loadGuest(){try{return JSON.parse(localStorage.getItem('meuro.progress')||'null')||{streak:0,best_streak:0,last_day:null,badges:[],countries:[],rides:0,challenges_done:0,challenge_day:null};}catch(e){return {streak:0,best_streak:0,badges:[],countries:[],rides:0,challenges_done:0};}}
function saveGuest(g){try{localStorage.setItem('meuro.progress',JSON.stringify(g));}catch(e){}}
function progress(){return PROFILE||loadGuest();}
/* Same badge rules as the database's record_ride, for players who are not logged in */
function applyGuestProgress(r){var g=loadGuest(),today=MD.dayNumber(),ld=g.last_day_n;
  g.streak=ld===today?g.streak:(ld===today-1?g.streak+1:1);g.best_streak=Math.max(g.best_streak||0,g.streak);g.last_day_n=today;g.rides=(g.rides||0)+1;
  if(g.countries.indexOf(r.country)<0)g.countries.push(r.country);
  var add=function(b,cond){if(cond&&g.badges.indexOf(b)<0)g.badges.push(b);};
  if(r.challenge&&g.challenge_day!==today){g.challenges_done=(g.challenges_done||0)+1;g.challenge_day=today;}
  add('first_ride',true);add('list_master',r.allItems);add('budget_boss',r.allItems&&r.budgetLeft>=.2);add('veg_lover',r.veg>=3);add('streak_3',g.streak>=3);add('streak_7',g.streak>=7);
  add('daily_star',r.daily&&r.stars===3);add('explorer',g.countries.length>=5);add('challenger',g.challenges_done>=5);
  saveGuest(g);return g;}
var lastBadges=null;
function applyServerProgress(res,r){if(!res)return;PROFILE=Object.assign(PROFILE||{},res);showProgress(r,res);renderDaily();}
function afterRide(r){var ch=todayChallenge();r.home=homeCountry();r.challenge=!state.race&&ch.test(r);
  lastBadges=(progress().badges||[]).slice();
  try{if(!localStorage.getItem('meuro.home'))localStorage.setItem('meuro.home',r.country);}catch(e){}
  LB.lastResult=r;
  if(!(backend()&&AUTH)){var g=applyGuestProgress(r);showProgress(r,g);renderDaily();}
  else{$('#rProg').hidden=true;}
  if(r.challenge)track('challenge_done',{challenge:ch.id});}
function showProgress(r,p){var box=$('#rProg');box.hidden=false;box.innerHTML='';var ch=todayChallenge();
  var top=document.createElement('div');top.className='row';
  var st=document.createElement('span');st.className='pill';st.textContent=(p.streak||0)+'-day streak';top.appendChild(st);
  var cp=document.createElement('span');cp.className='pill'+(r.challenge?' new':'');cp.textContent=(r.challenge?'Challenge done: ':'Today\'s challenge: ')+ch.n;top.appendChild(cp);
  box.appendChild(top);
  var fresh=(p.badges||[]).filter(function(b){return (lastBadges||[]).indexOf(b)<0;});
  if(fresh.length){var nb=document.createElement('div');nb.className='row';fresh.forEach(function(b){var B=MD.BADGES[b];if(!B)return;var e=document.createElement('span');e.className='pill new';e.textContent='New badge: '+B.n;nb.appendChild(e);toast('Badge unlocked: '+B.n,'bonus');});box.appendChild(nb);}
  if(!(backend()&&AUTH)&&backend()){var n=document.createElement('p');n.className='bd-note';n.style.margin='0';n.textContent='Progress saved on this phone. Log in to keep it safe and appear on the leaderboard.';box.appendChild(n);}}
function renderDaily(){var dm=MD.dailyMarket(),d=DISHES[dm.dish],p=progress(),ch=todayChallenge();
  $('#dlDish').textContent=d.n;$('#dlInfo').textContent=COUNTRIES[d.r].n+' · '+fmtFor(MD.budgetOf(dm.dish,1),d.r)+' budget · same road for everyone today';
  var today=MD.dayNumber();var alive=PROFILE?(PROFILE.last_day&&(new Date(PROFILE.last_day+'T00:00:00Z').getTime()/86400000>=today-1)):(p.last_day_n>=today-1);
  $('#dlStreak').querySelector('b').textContent=alive?(p.streak||0):0;
  var done=(PROFILE?false:(p.challenge_day===today));var c=$('#dlChallenge');c.textContent='Your challenge: '+ch.n;c.classList.toggle('done',done);}
$('#dlPlay').addEventListener('click',function(){var dm=MD.dailyMarket();stopAuto();MD.STATE.portion=1;state.dish=dm.dish;selectDish(dm.dish,true);track('daily_start',{dish:dm.dish});startRide({seed:dm.seed,daily:true});});
renderDaily();

/* ---- Lite mode */
(function(){var b=$('#liteBtn');b.textContent='Lite mode: '+(LITE?'on':'off');b.setAttribute('aria-pressed',String(LITE));
  b.addEventListener('click',function(){try{localStorage.setItem('meuro.lite',LITE?'0':'1');}catch(e){}track('lite_mode',{on:!LITE});location.reload();});})();

/* ---- Profile */
function openProfile(){if(!AUTH)return openJoin('login');var p=PROFILE||{};var m=$('#profile');m.hidden=false;
  $('#pfSub').textContent=AUTH.email||'';
  var stats=[[p.streak||0,'day streak'],[p.best_streak||0,'best streak'],[p.rides||0,'rides'],[(p.countries||[]).length,'countries']];
  $('#pfStats').innerHTML='';stats.forEach(function(s){var d=document.createElement('div');var b=document.createElement('b');b.className='tnum';b.textContent=s[0];var t=document.createElement('span');t.textContent=s[1];d.appendChild(b);d.appendChild(t);$('#pfStats').appendChild(d);});
  var have=p.badges||[];var unlocked=MD.KEKE_BASE.concat(have.map(function(b){return MD.BADGES[b]&&MD.BADGES[b].unlock;}).filter(Boolean));
  var sw=$('#pfColors');sw.innerHTML='';var chosen=(p.keke_color||myColor).toUpperCase();
  KCOLORS.forEach(function(c){var b=document.createElement('button');b.type='button';b.style.background=c;var on=unlocked.indexOf(c)>-1;b.disabled=!on;b.setAttribute('aria-pressed',String(c===chosen));b.setAttribute('aria-label',on?'Keke colour '+c:'Locked colour');b.dataset.c=c;
    b.addEventListener('click',function(){sw.querySelectorAll('button').forEach(function(o){o.setAttribute('aria-pressed','false');});b.setAttribute('aria-pressed','true');sw.dataset.pick=c;});sw.appendChild(b);});
  sw.dataset.pick=chosen;$('#pfColorNote').textContent='Earn badges to unlock more colours.';
  var bg=$('#pfBadges');bg.innerHTML='';Object.keys(MD.BADGES).forEach(function(k){var B=MD.BADGES[k];var d=document.createElement('div');d.className='badge'+(have.indexOf(k)>-1?' on':'');var b=document.createElement('b');b.textContent=B.n;var t=document.createElement('span');t.textContent=B.d;d.appendChild(b);d.appendChild(t);bg.appendChild(d);});
  $('#pfName').value=player?player.name:'';$('#pfConsent').checked=!!(p.consent);$('#pfMsg').textContent='';$('#pfDelete').textContent='Delete my account';delete $('#pfDelete').dataset.sure;
  setTimeout(function(){$('#pfClose').focus();},50);}
$('#pfClose').addEventListener('click',function(){$('#profile').hidden=true;});
$('#pfLogout').addEventListener('click',function(){$('#profile').hidden=true;var b=backend();if(b)b.auth.logOut();toast('You logged out.','');});
$('#pfForm').addEventListener('submit',async function(e){e.preventDefault();var n=cleanName($('#pfName').value),m=$('#pfMsg');m.className='err';
  if(!n||n.length<2){m.textContent='Use 2 to 20 letters or numbers for your rider name.';return;}
  var col=$('#pfColors').dataset.pick||myColor;
  try{await backend().api.updateProfile(n,$('#pfConsent').checked,col);PROFILE=Object.assign(PROFILE||{},{name:n,consent:$('#pfConsent').checked,keke_color:col});player.name=n;player.consent=$('#pfConsent').checked;setMyColor(col);lobbyPresence();m.className='sb-msg ok';m.textContent='Saved.';loadBoards();}
  catch(err){m.textContent=err&&err.code==='bad_name'?'Use 2 to 20 letters or numbers for your rider name.':err&&err.code==='bad_colour'?'That colour is still locked.':'Could not save. Check your connection and try again.';}});
$('#pfDelete').addEventListener('click',async function(){var b=$('#pfDelete');if(!b.dataset.sure){b.dataset.sure='1';b.textContent='Tap again to delete everything for good';return;}
  try{await backend().api.deleteAccount();$('#profile').hidden=true;toast('Your account and data were deleted.','');}catch(err){b.textContent='Could not delete. Try again.';delete b.dataset.sure;}});

/* ---- Shopping list to WhatsApp */
function shoppingText(r){var d=DISHES[r.dish],cc=d.r,pt=r.portion||1;var lines=d.items.map(function(k){return '- '+ITEMS[k].n+': '+MD.qtyOf(k,pt)+' ('+(MD.priceSrc(k,cc)==='est'?'about ':'')+MD.fmtC(MD.priceOf(k,cc,pt),cc)+')';});
  var total=d.items.reduce(function(a,k){return a+MD.priceOf(k,cc,pt);},0);
  return 'Meuro shopping list: '+d.n+' for '+(pt===1?'1 person':pt+' people')+'\n'+lines.join('\n')+'\nTotal: about '+MD.fmtC(total,cc)+'\n'+(cc==='ng'?'Prices: Lagos State Ministry of Agriculture (Oct 2026) and NBS (Apr 2026); some are estimates.':'Prices are estimates for '+COUNTRIES[cc].n+'.')+'\nPlan yours on Meuro Market Run: '+location.href.split(/[?#]/)[0];}
$('#listBtn').addEventListener('click',function(){var r=LB.lastResult;if(!r)return;track('share',{method:'whatsapp',content_type:'shopping_list'});window.open('https://wa.me/?text='+encodeURIComponent(shoppingText(r)),'_blank','noopener');});

/* ---- Share result as an image for WhatsApp status */
function wrapText(x,t,maxW){var words=t.split(' '),lines=[],line='';words.forEach(function(w){var tt=line?line+' '+w:w;if(x.measureText(tt).width>maxW&&line){lines.push(line);line=w;}else line=tt;});if(line)lines.push(line);return lines;}
function shareImage(r){return new Promise(function(resolve){var W=1080,H=1920,c=document.createElement('canvas');c.width=W;c.height=H;var x=c.getContext('2d'),d=DISHES[r.dish],p=progress();
  var g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'#2B1A10');g.addColorStop(.45,'#111B14');g.addColorStop(1,'#0B120D');x.fillStyle=g;x.fillRect(0,0,W,H);
  var f=COUNTRIES[d.r].flag;for(var i=0;i<3;i++){x.fillStyle=f[i];x.fillRect(i*W/3,0,W/3,18);}
  var done=function(){x.fillStyle='#F6C445';x.font='700 44px Figtree, Arial, sans-serif';x.fillText(r.daily?'MARKET OF THE DAY':'MEURO MARKET RUN',90,300);
    x.fillStyle='#F4F6EF';x.font='700 96px "Bricolage Grotesque", Figtree, Arial, sans-serif';var ly=410;wrapText(x,d.n,W-180).slice(0,2).forEach(function(l){x.fillText(l,90,ly);ly+=104;});
    x.fillStyle='rgba(244,246,239,.7)';x.font='600 42px Figtree, Arial, sans-serif';x.fillText(COUNTRIES[d.r].n+' · for '+(r.portion===1?'1':r.portion),90,ly+10);
    var cx=W/2,cy=1010,R=210;x.lineWidth=40;x.strokeStyle='rgba(255,255,255,.12)';x.beginPath();x.arc(cx,cy,R,0,7);x.stroke();
    x.strokeStyle='#F27B2B';x.lineCap='round';x.beginPath();x.arc(cx,cy,R,-Math.PI/2,-Math.PI/2+Math.PI*2*r.score/100);x.stroke();
    x.fillStyle='#F4F6EF';x.textAlign='center';x.font='700 170px "Bricolage Grotesque", Figtree, Arial, sans-serif';x.fillText(String(r.score),cx,cy+60);
    x.fillStyle='#F6C445';x.font='700 90px Arial, sans-serif';x.fillText('★★★'.slice(0,r.stars)+'☆☆☆'.slice(0,3-r.stars),cx,cy+R+150);
    var sz=96,gap=22,n=r.got.length+Math.min(3,r.veg)+Math.min(3,r.junk),sx=cx-(n*sz+(n-1)*gap)/2,yy=1440;
    r.got.forEach(function(ok,i){x.fillStyle=ok?'#4FA866':'#3A433D';x.fillRect(sx+i*(sz+gap),yy,sz,sz);});
    for(var v=0;v<Math.min(3,r.veg);v++){x.fillStyle='#F6C445';x.fillRect(sx+(r.got.length+v)*(sz+gap),yy,sz,sz);}
    for(var j=0;j<Math.min(3,r.junk);j++){x.fillStyle='#E5533D';x.fillRect(sx+(r.got.length+Math.min(3,r.veg)+j)*(sz+gap),yy,sz,sz);}
    x.fillStyle='rgba(244,246,239,.8)';x.font='600 40px Figtree, Arial, sans-serif';x.fillText((p.streak||1)+'-day streak · can you beat me?',cx,1660);
    x.fillStyle='#F6C445';x.font='700 40px Figtree, Arial, sans-serif';x.fillText(location.host+location.pathname.replace(/index\.html$/,''),cx,1780);
    x.textAlign='left';c.toBlob(function(b){resolve(b);},'image/png');};
  var logo=new Image();logo.onload=function(){var lw=360,lh=logo.naturalHeight*lw/logo.naturalWidth;var t=document.createElement('canvas');t.width=logo.naturalWidth;t.height=logo.naturalHeight;var tx=t.getContext('2d');tx.drawImage(logo,0,0);tx.globalCompositeOperation='source-in';tx.fillStyle='#fff';tx.fillRect(0,0,t.width,t.height);x.drawImage(t,90,110,lw,lh);done();};logo.onerror=done;logo.src='img/logo.png';});}
$('#shareBtn').addEventListener('click',async function(){var r=LB.lastResult;if(!r)return;var btn=$('#shareBtn');btn.disabled=true;
  var text=(r.daily?'Market of the Day: ':'')+DISHES[r.dish].n+', I scored '+r.score+' on Meuro Market Run. Can you beat me? '+location.href.split(/[?#]/)[0];
  try{var blob=await shareImage(r);var file=new File([blob],'meuro-market-run.png',{type:'image/png'});
    if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],text:text});track('share',{method:'native_image',content_type:'result'});}
    else{var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='meuro-market-run.png';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href);},4000);
      toast('Image saved. Post it to your WhatsApp status.','good');window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank','noopener');track('share',{method:'download_image',content_type:'result'});}}
  catch(e){if(!(e&&e.name==='AbortError'))window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank','noopener');}
  btn.disabled=false;});

/* ---- Report a real price */
$('#reportBtn').addEventListener('click',function(){needProfile(function(){var r=LB.lastResult;var dk=r?r.dish:state.dish,d=DISHES[dk],pt=(r&&r.portion)||MD.STATE.portion;
  var sel=$('#rpItem');sel.innerHTML='';d.items.forEach(function(k){var o=document.createElement('option');o.value=k;o.textContent=ITEMS[k].n+' ('+MD.qtyOf(k,pt)+')';sel.appendChild(o);});
  var upd=function(){var k=sel.value;$('#rpAmountL').textContent='What you paid for '+MD.qtyOf(k,pt)+', in '+COUNTRIES[d.r].cur;$('#rpAmount').placeholder='Our estimate: '+MD.fmtC(MD.priceOf(k,d.r,pt),d.r);};
  sel.onchange=upd;upd();$('#reportModal').dataset.cc=d.r;$('#reportModal').dataset.pt=pt;$('#rpMsg').textContent='';$('#rpAmount').value='';$('#reportModal').hidden=false;setTimeout(function(){$('#rpAmount').focus();},50);});});
$('#rpClose').addEventListener('click',function(){$('#reportModal').hidden=true;});
$('#reportForm').addEventListener('submit',async function(e){e.preventDefault();var m=$('#rpMsg');m.className='err';var cc=$('#reportModal').dataset.cc,pt=+$('#reportModal').dataset.pt||1,k=$('#rpItem').value;
  var amt=parseFloat(String($('#rpAmount').value||'').replace(/[^\d.]/g,''));if(!(amt>0)||amt>1e8){m.textContent='Enter the amount you paid, numbers only.';return;}
  var est=MD.priceOf(k,cc,pt);if(amt>est*20||amt<est/20){m.textContent='That looks very different from usual prices. Check the amount and the quantity shown.';return;}
  try{await backend().api.reportPrice(cc,k,Math.round(amt/pt*100)/100,COUNTRIES[cc].cur,$('#rpPlace').value);m.className='sb-msg ok';m.textContent='Thank you. We will check it and update the price for everyone.';track('price_report',{country:cc,item:k});setTimeout(function(){$('#reportModal').hidden=true;},1600);}
  catch(err){m.textContent=err&&err.code==='too_many_reports'?'You have sent 10 reports today. Thank you! Try again tomorrow.':'Could not send. Check your connection and try again.';}});

$('#meEdit').addEventListener('click',function(){if(platformMode()){openJoin('profile');return;}var b=backend();if(b)b.auth.logOut();toast('You logged out.','');});
setVia('whatsapp');
})();
