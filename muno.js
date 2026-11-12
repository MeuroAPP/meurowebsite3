// Muno order form: builds the order and opens WhatsApp to Meuro (0704 426 0422). Nothing is stored on the site.
(function(){
'use strict';
var WA='2347044260422';
var f=document.getElementById('munoForm');if(!f)return;
var qty=6,out=document.getElementById('mo-qty');
function setQ(n){qty=Math.max(1,Math.min(200,n));out.textContent=qty;f.querySelectorAll('[data-set]').forEach(function(b){b.setAttribute('aria-pressed',String(+b.dataset.set===qty));});}
f.querySelectorAll('[data-q]').forEach(function(b){b.addEventListener('click',function(){setQ(qty+ +b.dataset.q);});});
f.querySelectorAll('[data-set]').forEach(function(b){b.addEventListener('click',function(){setQ(+b.dataset.set);});});
setQ(6);
var direct=document.getElementById('waDirect');if(direct)direct.href='https://wa.me/'+WA+'?text='+encodeURIComponent('Hello Meuro, I would like to order Muno.');
function v(id){return (document.getElementById(id).value||'').trim();}
f.addEventListener('submit',function(e){e.preventDefault();
  var err=document.getElementById('mo-err');err.textContent='';
  var name=v('mo-name'),phone=v('mo-phone'),city=v('mo-city'),addr=v('mo-addr');
  if(name.length<2)return err.textContent='Please add your name.';
  if(phone.replace(/\D/g,'').length<10)return err.textContent='Please add a phone number we can reach you on.';
  if(city.length<2)return err.textContent='Please add your city or area.';
  if(addr.length<5)return err.textContent='Please add your delivery address.';
  var lines=['Hello Meuro, I would like to order Muno.','','*Order*','Muno functional soya drink (35cl) x '+qty,'',
    '*Name:* '+name,'*Phone:* '+phone];
  if(v('mo-age'))lines.push("*Child's age:* "+v('mo-age'));
  lines.push('*City/area:* '+city,'*Delivery address:* '+addr);
  if(v('mo-note'))lines.push('*Note:* '+v('mo-note'));
  lines.push('','Please confirm the price and delivery. Thank you.');
  var url='https://wa.me/'+WA+'?text='+encodeURIComponent(lines.join('\n'));
  try{if(window.meuroTrack)window.meuroTrack('muno_order',{qty:qty});}catch(x){}
  var w=window.open(url,'_blank','noopener');if(!w)location.href=url;
});
})();
