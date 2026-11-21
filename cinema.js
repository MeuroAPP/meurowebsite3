// Home cinematic scroll story: each [data-scene] is tall; its .stage sticks to the screen and
// gets --p (0 to 1) as you scroll through it. CSS turns --p into the animation. Counters and
// step captions are driven here too. Reduced motion shows every scene in its finished state.
(function(){
  'use strict';
  var scenes=[].slice.call(document.querySelectorAll('[data-scene]')); if(!scenes.length) return;
  var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduce){ document.documentElement.classList.add('cine-static'); scenes.forEach(function(s){ s.style.setProperty('--p',1); s.querySelectorAll('[data-count]').forEach(function(c){c.textContent=c.dataset.count;}); s.querySelectorAll('.sc-step').forEach(function(x){x.classList.add('on');}); }); return; }
  document.documentElement.classList.add('cine-on');
  var clamp=function(v){return v<0?0:v>1?1:v;};
  var ticking=false;
  function update(){
    ticking=false; var vh=window.innerHeight;
    scenes.forEach(function(s){
      var r=s.getBoundingClientRect(), total=r.height-vh; if(total<=0) return;
      if(r.bottom<-vh||r.top>vh*2) return;
      var p=clamp(-r.top/total);
      s.style.setProperty('--p',p.toFixed(4));
      var words=s.querySelectorAll('.o-words b');
      for(var i=0;i<words.length;i++){ var c=.45+i*.1; words[i].style.opacity=clamp(1-Math.abs(p-c)*14); words[i].style.transform='scale('+(.9+(p-c+.07)*1.2)+')'; }
      var sl=s.querySelector('.scanline'); if(sl) sl.style.setProperty('--scan',(8+84*(.5-.5*Math.cos(p*25)))+'%');
      s.querySelectorAll('[data-count]').forEach(function(c){ var t=clamp((p-.36)/.3); c.textContent=Math.round(c.dataset.count*t); });
      s.querySelectorAll('.sc-step').forEach(function(x){ x.classList.toggle('on', p>=+x.dataset.from && p<+x.dataset.to); });
    });
  }
  function onScroll(){ if(!ticking){ ticking=true; requestAnimationFrame(update); } }
  addEventListener('scroll',onScroll,{passive:true}); addEventListener('resize',onScroll); update();
})();
