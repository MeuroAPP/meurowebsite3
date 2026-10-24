// Meuro visitor analytics (Google Analytics for Firebase).
// Runs only when firebase-config.js has a measurementId AND the visitor tapped "OK"
// on the notice. Pages call window.meuroTrack(name, params) to record game events.
import { firebaseConfig } from './firebase-config.js';

const V = '10.12.2';
const CDN = 'https://www.gstatic.com/firebasejs/' + V + '/';
const KEY = 'meuro.analytics';

window.__mq = window.__mq || [];
let send = null;

function flush() {
  if (!send) return;
  const q = window.__mq.splice(0);
  q.forEach(([n, p]) => { try { send(n, p || {}); } catch (e) {} });
}
window.meuroFlush = flush;
window.meuroTrack = (n, p) => { window.__mq.push([n, p]); flush(); };

function choice() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
function remember(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

async function start() {
  try {
    const [appMod, an] = await Promise.all([import(CDN + 'firebase-app.js'), import(CDN + 'firebase-analytics.js')]);
    if (!(await an.isSupported())) return;
    const app = appMod.initializeApp(firebaseConfig, 'meuro-analytics');
    const analytics = an.getAnalytics(app);
    send = (n, p) => an.logEvent(analytics, n, p);
    flush();
  } catch (e) { console.warn('Analytics did not start:', e && e.message); }
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

const ready = firebaseConfig && firebaseConfig.measurementId && firebaseConfig.apiKey && firebaseConfig.appId;
if (ready) {
  const c = choice();
  if (c === 'yes') start();
  else if (c !== 'no') {
    if (document.body) banner(); else document.addEventListener('DOMContentLoaded', banner);
  }
}
