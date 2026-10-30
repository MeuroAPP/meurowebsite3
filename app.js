(function(){
  /* Old race invite links (meuroapp.com/?race=code) now open the game at play.html */
  if(/[?&]race=/.test(location.search)&&!/play\.html$/.test(location.pathname)){location.replace('play.html'+location.search+location.hash);return;}
  var d=document, root=d.documentElement;
  root.classList.add('js');

  /* header state over the home hero */
  var body=d.body, pg=d.querySelector('.over-hero');
  function onScroll(){ if(pg) pg.classList.toggle('scrolled', window.scrollY>40); }
  window.addEventListener('scroll', onScroll, {passive:true}); onScroll();

  /* dropdowns: click/keyboard support */
  d.querySelectorAll('.dd>button').forEach(function(b){
    b.addEventListener('click', function(e){
      e.stopPropagation();
      var dd=b.parentElement, open=!dd.classList.contains('open');
      d.querySelectorAll('.dd.open').forEach(function(x){x.classList.remove('open'); x.firstElementChild.setAttribute('aria-expanded','false');});
      dd.classList.toggle('open', open); b.setAttribute('aria-expanded', String(open));
    });
  });
  d.addEventListener('click', function(){ d.querySelectorAll('.dd.open').forEach(function(x){x.classList.remove('open');}); });

  /* mobile drawer */
  var drawer=d.getElementById('drawer');
  d.querySelectorAll('[data-open-menu]').forEach(function(b){ b.addEventListener('click', function(){ drawer.hidden=false; body.style.overflow='hidden'; }); });
  d.querySelectorAll('[data-close-menu]').forEach(function(b){ b.addEventListener('click', function(){ drawer.hidden=true; body.style.overflow=''; }); });

  /* reveal on scroll (content is visible at rest; only below-the-fold items animate) */
  if('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches){
    var io=new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.remove('pre'); io.unobserve(e.target);} }); },{rootMargin:'0px 0px -8% 0px'});
    d.querySelectorAll('.reveal').forEach(function(el){
      if(el.getBoundingClientRect().top > innerHeight){ el.classList.add('pre'); io.observe(el); }
    });
  }

  /* plate rail controls */
  d.querySelectorAll('[data-rail]').forEach(function(ctrl){
    var rail=d.getElementById(ctrl.getAttribute('data-rail'));
    ctrl.querySelectorAll('button').forEach(function(b){
      b.addEventListener('click', function(){ rail.scrollBy({left:(b.dataset.dir==='prev'?-1:1)*rail.clientWidth*0.8, behavior:'smooth'}); });
    });
  });

  /* ---------- Meuro AI: plate scanner demo ---------- */
  var DISHES={
    'jollof':{n:'Jollof rice & grilled chicken',p:'1 medium plate',k:680,pr:36,c:82,f:22,tip:['Swap','Add a side of sliced cucumber and tomato and go skin-off on the chicken','−90 kcal']},
    'fried-rice':{n:'Fried rice & chicken',p:'1 medium plate',k:720,pr:34,c:88,f:26,tip:['Swap','Ask for half rice, half coleslaw (light dressing)','−160 kcal']},
    'efo-riro':{n:'Efo riro & fufu',p:'1 wrap + 1 bowl',k:640,pr:30,c:70,f:26,tip:['Keep','Leafy greens bring iron and fibre. A smaller wrap of fufu balances the plate','−120 kcal']},
    'egusi':{n:'Egusi soup with assorted meat',p:'1 bowl, no swallow',k:560,pr:32,c:12,f:42,tip:['Swap','Pair with a small wrap of wheat or oat swallow instead of eba','more fibre']},
    'amala':{n:'Amala, ewedu & gbegiri',p:'1 wrap + soups + meat',k:610,pr:34,c:72,f:20,tip:['Keep','Gbegiri adds plant protein. Choose lean beef over cow skin and offal','−70 kcal']},
    'okra':{n:'Okra soup with chicken',p:'1 bowl',k:420,pr:38,c:14,f:24,tip:['Keep','High protein, low carb. Watch the palm oil if you are cutting calories','balanced']},
    'peppersoup':{n:'Goat meat pepper soup',p:'1 bowl',k:380,pr:42,c:6,f:20,tip:['Keep','Light, warm and protein-rich. Add yam for a full meal on training days','+ energy']},
    'stew-rice':{n:'White rice & beef stew',p:'1 medium plate',k:650,pr:32,c:84,f:20,tip:['Swap','Use ofada or brown rice and add a side of vegetables','+ fibre']},
    'suya':{n:'Chicken suya platter with fries',p:'1 board',k:780,pr:44,c:64,f:36,tip:['Swap','Roasted plantain (boli) instead of fries','−140 kcal']}
  };
  var scan=d.getElementById('scanner');
  if(scan){
    var view=d.getElementById('scanView'), img=view.querySelector('img');
    function show(key){
      var x=DISHES[key]; if(!x) return;
      img.src='img/'+key+'.webp'; img.alt=x.n;
      view.classList.remove('scanning'); void view.offsetWidth; view.classList.add('scanning');
      d.getElementById('rName').textContent=x.n;
      d.getElementById('rPortion').textContent=x.p;
      d.getElementById('rKcal').textContent=x.k;
      [['Pr',x.pr,60],['C',x.c,110],['F',x.f,60]].forEach(function(m){
        d.getElementById('v'+m[0]).textContent=m[1]+' g';
        d.getElementById('b'+m[0]).style.width=Math.min(100,m[1]/m[2]*100)+'%';
      });
      d.getElementById('rTipLab').textContent=x.tip[0]==='Swap'?'Smart swap':'Good choice';
      d.getElementById('rTip').textContent=x.tip[1];
      d.getElementById('rTipVal').textContent=x.tip[2];
      var badge=d.getElementById('rBadge');
      var bal = x.k<=650 && x.pr>=30;
      badge.textContent = bal?'Balanced':'Heavier plate'; badge.className='status '+(bal?'st-live':'st-dev');
    }
    scan.querySelectorAll('.picker button').forEach(function(b){
      b.addEventListener('click', function(){
        scan.querySelectorAll('.picker button').forEach(function(o){o.setAttribute('aria-pressed','false');});
        b.setAttribute('aria-pressed','true'); show(b.dataset.dish);
      });
    });
    show('jollof');
  }

  /* ---------- Meuro AI: meal planner demo ---------- */
  var planForm=d.getElementById('planForm');
  if(planForm){
    var state={goal:'Healthy eating', days:3};
    planForm.querySelectorAll('.seg').forEach(function(seg){
      seg.querySelectorAll('button').forEach(function(b){
        b.addEventListener('click', function(){
          seg.querySelectorAll('button').forEach(function(o){o.setAttribute('aria-pressed','false');});
          b.setAttribute('aria-pressed','true'); state[seg.dataset.key]= seg.dataset.key==='days'? +b.dataset.v : b.dataset.v;
        });
      });
    });
    var POOL={
      breakfast:[['Akara with boiled egg & pap',650,'beans|egg'],['Moi moi with oats',600,'beans'],['Boiled yam & egg sauce',700,'yam|egg'],['Plantain & egg frittata',620,'plantain|egg'],['Oat pap with groundnuts',450,'oats']],
      lunch:[['Jollof rice, grilled fish & greens',1400,'rice|fish'],['Beans & roasted plantain (ewa & dodo)',900,'beans|plantain'],['Ofada rice & vegetable sauce',1200,'rice'],['Yam porridge with spinach',950,'yam'],['Rice & beans with tomato stew',850,'rice|beans']],
      dinner:[['Okra soup with chicken & small eba',1300,'chicken'],['Pepper soup with yam',1250,''],['Moi moi with sautéed vegetables',700,'beans'],['Efo riro with a small wrap of wheat',1100,''],['Egg & vegetable stir-fry with rice',800,'rice|egg']],
      snack:[['Groundnuts & an orange',250,''],['Banana & tiger nuts',300,''],['Boiled corn & pear (ube)',350,''],['Garden egg & groundnut',200,'']]
    };
    function pick(list, have, i){
      var scored=list.map(function(it,idx){ var s=0; it[2].split('|').forEach(function(t){ if(t && have.indexOf(t)>-1) s+=2; }); return {it:it,s:s+((idx+i)%list.length===0?1:0)}; });
      scored.sort(function(a,b){return b.s-a.s;});
      return scored[i % Math.min(3,scored.length)].it;
    }
    planForm.addEventListener('submit', function(e){
      e.preventDefault();
      var budget=Math.max(1000, parseInt((d.getElementById('budget').value||'5000').replace(/\D/g,''),10)||5000);
      var have=(d.getElementById('foods').value||'').toLowerCase();
      var out=d.getElementById('planOut'), html='', total=0;
      var scale = budget/(state.days*2400);
      for(var i=0;i<state.days;i++){
        var b=pick(POOL.breakfast,have,i), l=pick(POOL.lunch,have,i+1), dn=pick(POOL.dinner,have,i+2), s=POOL.snack[i%POOL.snack.length];
        var cost=Math.round((b[1]+l[1]+dn[1]+s[1])*Math.min(1,scale)/50)*50; total+=cost;
        html+='<div class="plan-day"><h4><span>Day '+(i+1)+'</span><span class="muted small tnum">≈ ₦'+cost.toLocaleString()+'</span></h4><dl>'+
          '<dt>Breakfast</dt><dd>'+b[0]+'</dd><dt>Lunch</dt><dd>'+l[0]+'</dd><dt>Dinner</dt><dd>'+dn[0]+'</dd><dt>Snack</dt><dd>'+s[0]+'</dd></dl></div>';
      }
      var prot = state.goal==='Fitness'?'95–115 g':state.goal==='Weight management'?'80–95 g':'75–90 g';
      d.getElementById('planSum').innerHTML='<div><b class="tnum">'+state.days+' days</b><span>'+state.goal+'</span></div><div><b class="tnum">₦'+total.toLocaleString()+'</b><span>of ₦'+budget.toLocaleString()+' budget</span></div><div><b class="tnum">'+prot+'</b><span>protein / day</span></div>';
      out.innerHTML=html;
      d.getElementById('planTitle').textContent='Your '+state.days+'-day plan';
    });
    planForm.dispatchEvent(new Event('submit'));
  }

  /* ---------- Nutritionist filter ---------- */
  var fl=d.getElementById('filters');
  if(fl){
    fl.querySelectorAll('button').forEach(function(b){
      b.addEventListener('click', function(){
        fl.querySelectorAll('button').forEach(function(o){o.setAttribute('aria-pressed','false');});
        b.setAttribute('aria-pressed','true');
        var f=b.dataset.f, n=0;
        d.querySelectorAll('.pro[data-tags]').forEach(function(p){ var ok= f==='all' || p.dataset.tags.indexOf(f)>-1; p.hidden=!ok; if(ok) n++; });
        d.getElementById('proEmpty').hidden = n>0;
        d.getElementById('proCount').textContent = n+(n===1?' nutritionist':' nutritionists');
      });
    });
  }

  /* ---------- Concept forms (not yet connected) ---------- */
  d.querySelectorAll('form[data-concept]').forEach(function(f){
    f.addEventListener('submit', function(e){
      e.preventDefault();
      var msg=f.querySelector('.notice'); if(msg){ msg.hidden=false; msg.focus && msg.focus(); }
    });
  });

  /* footer year */
  d.querySelectorAll('[data-year]').forEach(function(y){ y.textContent=new Date().getFullYear(); });
})();
