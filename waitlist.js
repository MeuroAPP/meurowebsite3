// Find a nutritionist: the waitlist and the professional application open WhatsApp to Meuro
// (0704 426 0422) with the details filled in. Nothing is stored on this website.
(function(){
'use strict';
var WA='2347044260422';
function open(text){var url='https://wa.me/'+WA+'?text='+encodeURIComponent(text);var w=window.open(url,'_blank','noopener');if(!w)location.href=url;}
function err(f,m){var e=f.querySelector('.err');if(e){e.textContent=m;e.hidden=!m;}}
var wl=document.querySelector('form[data-wa="waitlist"]');
if(wl){
  wl.querySelectorAll('[data-cond]').forEach(function(b){b.addEventListener('click',function(){b.setAttribute('aria-pressed',b.getAttribute('aria-pressed')==='true'?'false':'true');});});
  wl.addEventListener('submit',function(e){e.preventDefault();
    var conds=[].map.call(wl.querySelectorAll('[data-cond][aria-pressed="true"]'),function(b){return b.dataset.cond;});
    var name=(document.getElementById('wl-name').value||'').trim(),city=(document.getElementById('wl-city').value||'').trim(),type=document.getElementById('wl-type').value;
    if(!conds.length)return err(wl,'Choose at least one thing you need help with.');
    if(name.length<2)return err(wl,'Please add your name.');
    err(wl,'');
    open(['Hello Meuro, please add me to the nutritionist waitlist.','','*Name:* '+name,'*Help with:* '+conds.join(', '),'*City:* '+(city||'-'),'*Session type:* '+type].join('\n'));
    try{if(window.meuroTrack)window.meuroTrack('nutritionist_waitlist',{n:conds.length});}catch(x){}
  });
}
var pro=document.querySelector('form[data-wa="pro"]');
if(pro){pro.addEventListener('submit',function(e){e.preventDefault();
  var em=(document.getElementById('pro-email').value||'').trim();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em))return err(pro,'Enter a valid professional email.');
  err(pro,'');
  open(['Hello Meuro, I am a nutrition professional and would like to join Meuro.','','*Email:* '+em,'','I can share my qualifications and licence details.'].join('\n'));
});}
})();
