// Meuro visitor analytics (Google Analytics 4).
// Runs only when meuro-config.js has a measurement ID AND the visitor tapped "OK"
// on the notice. Pages call window.meuroTrack(name, params) to record game events.
// Names and emails are never sent.
import { GA_MEASUREMENT_ID } from './meuro-config.js';

const KEY = 'meuro.analytics';
window.__mq = window.__mq || [];
let send = null;

function flush() {
  if (!send) return;
  window.__mq.splice(0).forEach(([n, p]) => { try { send(n, p || {}); } catch (e) {} });
}
window.meuroFlush = flush;
window.meuroTrack = (n, p) => { window.__mq.push([n, p]); flush(); };

const choice = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };
const remember = v => { try { localStorage.setItem(KEY, v); } catch (e) {} };
const validId = id => typeof id === 'string' && /^G-[A-Z0-9]{4,16}$/.test(id);

function start() {
  if (!validId(GA_MEASUREMENT_ID) || send) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, { allow_google_signals: false, allow_ad_personalization_signals: false });
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_MEASUREMENT_ID);
  document.head.appendChild(s);
  send = (n, p) => window.gtag('event', n, p);
  flush();
}

function banner() {
  const box = document.createElement('div');
  box.setAttribute('role', 'region');
  box.setAttribute('aria-label', 'Analytics notice');
  box.style.cssText = 'position:fixed;z-index:200;left:max(12px,env(safe-area-inset-left,0px));right:max(12px,env(safe-area-inset-right,0px));bottom:calc(max(12px,env(safe-area-inset-bottom,0px)));max-width:560px;margin:0 auto;background:rgba(14,22,17,.96);color:#F4F6EF;border:1px solid rgba(255,255,255,.16);border-radius:18px;padding:14px 16px;display:flex;flex-wrap:wrap;gap:10px 14px;align-items:center;font:500 14.5px/1.45 Figtree,Helvetica,Arial,sans-serif;box-shadow:0 18px 40px -16px rgba(0,0,0,.6)';
  const t = document.createElement('p');
  t.style.cssText = 'margin:0;flex:1 1 240px;min-width:0';
  t.textContent = 'Meuro counts visits and game activity to improve the site. No names or emails are shared. ';
  const a = document.createElement('a');
  a.href = 'faq.html#privacy'; a.textContent = 'Learn more'; a.style.color = '#F6C445';
  t.appendChild(a);
  const btns = document.createElement('div');
  btns.style.cssText = 'display:flex;gap:8px';
  const mk = (label, primary) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label;
    b.style.cssText = 'height:40px;padding:0 16px;border-radius:999px;font:600 14.5px Figtree,Helvetica,Arial,sans-serif;cursor:pointer;' + (primary ? 'background:#F27B2B;color:#fff;border:0' : 'background:transparent;color:#F4F6EF;border:1px solid rgba(255,255,255,.3)'); return b; };
  const ok = mk('OK', true), no = mk('No thanks', false);
  ok.addEventListener('click', () => { remember('yes'); box.remove(); start(); });
  no.addEventListener('click', () => { remember('no'); window.__mq.length = 0; box.remove(); });
  btns.appendChild(no); btns.appendChild(ok);
  box.appendChild(t); box.appendChild(btns);
  document.body.appendChild(box);
}

if (validId(GA_MEASUREMENT_ID)) {
  const c = choice();
  if (c === 'yes') start();
  else if (c !== 'no') { if (document.body) banner(); else document.addEventListener('DOMContentLoaded', banner); }
}
