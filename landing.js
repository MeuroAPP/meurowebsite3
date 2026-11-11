// Meuro home page: tells the 3D market to stay in showcase mode, and runs the product carousel.
(function(){
'use strict';
// Old race invite links (meuroapp.com/?race=CODE) still open the game.
if(/[?&]race=/.test(location.search)||/^#race-/.test(location.hash)){location.replace('play.html'+location.search+location.hash);return;}
window.MEURO_LANDING=true;

var SEGS=[
  {eye:'Nutritionists',t:'Book a nutritionist',d:'Verified dietitians for diabetes, PCOS, weight and sports goals.',img:'expert.webp',href:'nutritionists.html',go:'Book a consultation'},
  {eye:'Meuro AI',t:'Scan your plate',d:'Snap any African meal for a nutrition estimate and budget meal plans.',img:'jollof.webp',href:'ai.html',go:'Try Meuro AI'},
  {eye:'Meuro Foods',t:'Muno',d:'Functional soya drink with soya milk, groundnut flakes and dates.',img:'muno-card.webp',href:'foods.html#muno',go:'Meet Muno',isNew:true,product:true},
  {eye:'Meuro Kitchen',t:'Catering for your team',d:'Nigerian meals for organisations, communities and events.',img:'amala-stew.webp',href:'kitchen.html',go:'Plan catering'},
  {eye:'Meuro Foods',t:'African-made foods',d:'Nutrient-dense foods made for everyday African diets.',img:'egusi.webp',href:'foods.html',go:'See Meuro Foods'},
  {eye:'Market Run',t:'Ride the market',d:'Our 3D game: grab every ingredient on budget and race your friends.',img:'market-run.webp',href:'play.html',go:'Play now'},
  {eye:'About Meuro',t:'Food as a healing tool',d:'Our mission, our values and how we build responsibly.',img:'waakye-special.webp',href:'about.html',go:'Our story'}
];
var ARROW='<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function card(s,i,clone){return '<a class="seg'+(s.product?' product':'')+'" href="'+s.href+'"'+(clone?' tabindex="-1" aria-hidden="true"':'')+' data-i="'+i+'">'+
  '<img src="img/'+s.img+'" alt="" loading="'+(i<4&&!clone?'eager':'lazy')+'" draggable="false">'+(s.isNew?'<span class="new">New</span>':'')+
  '<span class="tx"><em>'+esc(s.eye)+'</em><b>'+esc(s.t)+'</b><small>'+esc(s.d)+'</small><span class="go">'+esc(s.go)+' '+ARROW+'</span></span></a>';}

function init(){
  var track=document.getElementById('lpTrack'),dots=document.getElementById('lpDots');if(!track)return;
  // three copies so it can flow forever in either direction
  track.innerHTML=SEGS.map(function(s,i){return card(s,i,true);}).join('')+SEGS.map(function(s,i){return card(s,i,false);}).join('')+SEGS.map(function(s,i){return card(s,i,true);}).join('');
  dots.innerHTML=SEGS.map(function(){return '<i></i>';}).join('');
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var setW=0,pauseUntil=0,hover=false,drag=null,moved=false,last=performance.now(),pos=0;
  function measure(){var a=track.children[0],b=track.children[SEGS.length];setW=b.offsetLeft-a.offsetLeft;if(!pos){pos=setW;track.scrollLeft=pos;}}
  function wrap(){if(!setW)return;if(track.scrollLeft<setW*.5){track.scrollLeft+=setW;}else if(track.scrollLeft>setW*1.5){track.scrollLeft-=setW;}pos=track.scrollLeft;}
  function pause(ms){pauseUntil=performance.now()+(ms||4000);}
  function speed(){return innerWidth<760?34:46;} // px per second
  function frame(now){var dt=Math.min(.05,(now-last)/1000);last=now;
    if(!reduce&&!hover&&!drag&&now>pauseUntil&&!document.hidden){pos+=speed()*dt;track.scrollLeft=pos;wrap();}
    // active dot = card nearest the left edge
    var w=track.children[1]?track.children[1].offsetLeft-track.children[0].offsetLeft:1;var idx=Math.round(((track.scrollLeft-setW)%setW+setW)%setW/w)%SEGS.length;
    for(var i=0;i<dots.children.length;i++)dots.children[i].className=i===idx?'on':'';
    requestAnimationFrame(frame);}
  measure();addEventListener('resize',function(){var r=setW?(track.scrollLeft/setW):1;measure();track.scrollLeft=pos=r*setW;});
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(measure);
  track.addEventListener('scroll',function(){if(drag||performance.now()<pauseUntil){wrap();}},{passive:true});
  track.addEventListener('mouseenter',function(){hover=true;});track.addEventListener('mouseleave',function(){hover=false;pos=track.scrollLeft;});
  track.addEventListener('focusin',function(){hover=true;});track.addEventListener('focusout',function(){hover=false;pos=track.scrollLeft;});
  track.addEventListener('touchstart',function(){pause(5000);},{passive:true});track.addEventListener('touchend',function(){pos=track.scrollLeft;pause(3500);},{passive:true});
  track.addEventListener('wheel',function(){pause(4000);pos=track.scrollLeft;},{passive:true});
  // mouse drag
  track.addEventListener('pointerdown',function(e){if(e.pointerType!=='mouse')return;drag={x:e.clientX,s:track.scrollLeft};moved=false;});
  addEventListener('pointermove',function(e){if(!drag)return;var dx=e.clientX-drag.x;if(Math.abs(dx)>4)moved=true;track.scrollLeft=drag.s-dx;wrap();drag.s=track.scrollLeft+dx;});
  addEventListener('pointerup',function(){if(drag){drag=null;pos=track.scrollLeft;pause(2500);}});
  track.addEventListener('click',function(e){if(moved){e.preventDefault();moved=false;}},true);
  function step(dir){var w=track.children[1].offsetLeft-track.children[0].offsetLeft;pause(4500);track.scrollBy({left:dir*w,behavior:reduce?'auto':'smooth'});setTimeout(function(){wrap();pos=track.scrollLeft;},600);}
  document.getElementById('lpPrev').addEventListener('click',function(){step(-1);});
  document.getElementById('lpNext').addEventListener('click',function(){step(1);});
  requestAnimationFrame(frame);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
