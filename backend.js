// Meuro Market Run live backend on Supabase.
//  * Accounts: Supabase Auth (email + password, email confirmation).
//  * Data: Postgres tables protected by row level security; every write goes
//    through checked database functions (see supabase/schema.sql).
//  * Live play: private Realtime channels (signed-in players only), sharded so
//    a busy market splits into rooms of up to 40 riders.
import { SUPABASE_URL, SUPABASE_ANON_KEY, TURNSTILE_SITE_KEY } from './meuro-config.js';

// A recent client understands Supabase's new "sb_publishable_" keys; the older build is a fallback.
const SDK = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.110.1/+esm';
const SDK_FALLBACK = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
const TAB = Math.random().toString(36).slice(2, 8);
const SHARD_SIZE = 40, MAX_SHARDS = 50;

function configured() {
  return /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(String(SUPABASE_URL || '').replace(/\/+$/, '')) &&
    typeof SUPABASE_ANON_KEY === 'string' && SUPABASE_ANON_KEY.length > 30;
}

const ERR = {
  'User already registered': 'auth/email-already-in-use',
  'Invalid login credentials': 'auth/invalid-credential',
  'Email not confirmed': 'auth/email-not-confirmed',
  'Password should be at least 6 characters': 'auth/weak-password',
  'Unable to validate email address: invalid format': 'auth/invalid-email',
  'captcha protection: request disallowed': 'auth/captcha'
};
function authCode(e) {
  const m = (e && e.message) || '';
  if (ERR[m]) return ERR[m];
  if (/rate limit|too many/i.test(m) || (e && e.status === 429)) return 'auth/too-many-requests';
  if (/password/i.test(m)) return 'auth/weak-password';
  if (/captcha/i.test(m)) return 'auth/captcha';
  if (/fetch|network/i.test(m)) return 'auth/network-request-failed';
  return 'unknown';
}
const rpcErr = e => {
  const m = String((e && e.message) || e || '');
  const known = ['too_fast', 'bad_name', 'bad_colour', 'already_has_crew', 'name_taken', 'no_such_crew', 'too_many_reports', 'not_signed_in', 'not_admin'];
  return known.find(k => m.indexOf(k) > -1) || 'unavailable';
};

async function boot() {
  if (!configured()) throw new Error('not-configured');
  let mod;
  try { mod = await import(SDK); } catch (e) { mod = await import(SDK_FALLBACK); }
  const { createClient } = mod;
  const sb = createClient(SUPABASE_URL.replace(/\/+$/, ''), SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' },
    realtime: { params: { eventsPerSecond: 8 } }
  });

  let current = null;
  const rooms = {};

  async function refreshUser(session) {
    const u = session && session.user;
    if (!u) { current = null; return; }
    let isAdmin = false;
    try { const r = await sb.rpc('is_admin'); isAdmin = r.data === true; } catch (e) {}
    current = { uid: u.id, email: u.email, name: (u.user_metadata && u.user_metadata.name) || '', verified: !!u.email_confirmed_at, isAdmin };
    try { await sb.realtime.setAuth(session.access_token); } catch (e) {}
  }
  function publish() {
    window.dispatchEvent(new CustomEvent('meuro-auth', { detail: current ? Object.assign({}, current) : { uid: null } }));
  }

  /* ------------------------------------------------ live rooms */
  function makeRoom(topicBase, opts) {
    opts = opts || {};
    let ch = null, topic = null, pres = {}, snap = Object.freeze([]), prev = {}, left = false, shard = 0;
    const peerHandlers = [], topicHandlers = {};
    let lastTrack = 0, trackTimer = null;
    const myKey = () => (current ? current.uid + '_' + TAB : null);

    function build() {
      const st = ch ? ch.presenceState() : {};
      const cur = {}, list = [];
      Object.keys(st).forEach(k => {
        const metas = st[k] || []; const m = metas[metas.length - 1] || {};
        const by = k.split('_')[0];
        const peer = { peer: k, by, isMe: !!current && by === current.uid, sameTab: k === myKey(), kind: 'viewer', guest: false,
          presence: Object.freeze(Object.assign({}, m.p || {})), updatedAt: Date.now() };
        cur[k] = peer; list.push(peer);
      });
      if (!ch || !myKey()) {
        const me = { peer: 'local_' + TAB, by: null, isMe: true, sameTab: true, kind: 'viewer', guest: false, presence: Object.freeze(Object.assign({}, pres)), updatedAt: Date.now() };
        if (!cur[me.peer]) { cur[me.peer] = me; list.push(me); }
      }
      const joined = [], gone = [], updated = [];
      Object.keys(cur).forEach(k => { if (!prev[k]) joined.push(cur[k]); else if (JSON.stringify(prev[k].presence) !== JSON.stringify(cur[k].presence)) updated.push(cur[k]); });
      Object.keys(prev).forEach(k => { if (!cur[k]) gone.push(prev[k]); });
      prev = cur; snap = Object.freeze(list);
      const change = { peers: snap, joined, left: gone, updated };
      peerHandlers.forEach(h => { try { h(change); } catch (e) { console.error(e); } });
      return list.length;
    }
    function track() {
      if (!ch || !myKey()) return;
      const now = Date.now(), wait = 300 - (now - lastTrack);
      if (wait > 0) { clearTimeout(trackTimer); trackTimer = setTimeout(track, wait); return; }
      lastTrack = now;
      ch.track({ p: pres }).catch(() => {});
    }
    async function connect() {
      if (left || !current) return;
      if (ch) { try { await sb.removeChannel(ch); } catch (e) {} ch = null; }
      topic = opts.sharded ? topicBase + ':' + shard : topicBase;
      const c = sb.channel(topic, { config: { private: true, presence: { key: myKey() }, broadcast: { self: true, ack: false } } });
      ch = c;
      c.on('presence', { event: 'sync' }, () => {
        if (c !== ch) return;
        const n = build();
        if (opts.sharded && !c._meuroChecked) {
          c._meuroChecked = true;
          if (n > SHARD_SIZE && shard < MAX_SHARDS - 1) { shard++; connect(); }
        }
      });
      c.on('broadcast', { event: 'ev' }, msg => {
        if (c !== ch) return;
        const p = msg && msg.payload; if (!p || typeof p.t !== 'string') return;
        const hs = topicHandlers[p.t]; if (!hs) return;
        const k = String(p.k || ''), by = k.split('_')[0];
        const m = { topic: p.t, data: p.d, peer: k, by, isMe: !!current && by === current.uid, sameTab: k === myKey(), kind: 'viewer', guest: false };
        hs.forEach(h => { try { h(m); } catch (e) { console.error(e); } });
      });
      c.subscribe(status => {
        if (status === 'SUBSCRIBED') { lastTrack = 0; track(); setTimeout(() => { if (c === ch && !c._meuroChecked) { c._meuroChecked = true; build(); } }, 2500); }
        if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && opts.onError) opts.onError(status);
      });
    }
    const room = {
      name: topicBase,
      presence(patch) {
        Object.keys(patch || {}).forEach(k => { if (patch[k] === null) delete pres[k]; else pres[k] = patch[k]; });
        if (!ch) { build(); return Promise.resolve(); }
        track(); return Promise.resolve();
      },
      emit(t, data) {
        if (!ch || !myKey()) return Promise.reject({ code: 'not_permitted', message: 'Log in to take part.' });
        return ch.send({ type: 'broadcast', event: 'ev', payload: { t, d: data === undefined ? null : data, k: myKey() } }).then(() => {});
      },
      on(t, h) { (topicHandlers[t] = topicHandlers[t] || []).push(h); return () => { const a = topicHandlers[t]; a.splice(a.indexOf(h), 1); }; },
      onPeers(h, onErr) { peerHandlers.push(h); if (onErr) opts.onError = onErr; setTimeout(() => h({ peers: snap, joined: snap.slice(), left: [], updated: [] }), 0); return () => peerHandlers.splice(peerHandlers.indexOf(h), 1); },
      peers: () => snap,
      connected: () => !!ch,
      onConnection(h) { setTimeout(() => h(!!ch), 0); return () => {}; },
      async join(name) {
        if (!/^[a-z0-9][a-z0-9-]{2,30}$/.test(name)) throw { code: 'invalid_argument', message: 'Bad race code' };
        if (!current) throw { code: 'not_permitted', message: 'Log in first' };
        const key = 'race:' + name;
        if (!rooms[key]) { rooms[key] = makeRoom(key, {}); await rooms[key]._connect(); }
        return rooms[key];
      },
      async leave() { left = true; delete rooms[topicBase]; if (ch) { try { await ch.untrack(); } catch (e) {} try { await sb.removeChannel(ch); } catch (e) {} ch = null; } },
      _connect: connect,
      _reset: async () => { if (ch) { try { await sb.removeChannel(ch); } catch (e) {} ch = null; } prev = {}; build(); }
    };
    return room;
  }
  const lobby = makeRoom('market', { sharded: true });
  rooms.market = lobby;

  async function onAuthChanged(session) {
    const before = current && current.uid;
    await refreshUser(session);
    const after = current && current.uid;
    if (before !== after) {
      for (const k of Object.keys(rooms)) {
        if (k === 'market') { await lobby._reset(); if (after) await lobby._connect(); }
        else { try { await rooms[k].leave(); } catch (e) {} }
      }
    }
    publish();
  }
  const { data: s0 } = await sb.auth.getSession();
  await refreshUser(s0 && s0.session);
  if (current) lobby._connect();
  sb.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') window.dispatchEvent(new CustomEvent('meuro-recovery'));
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') setTimeout(() => onAuthChanged(session), 0);
    if (event === 'TOKEN_REFRESHED' && session) { try { sb.realtime.setAuth(session.access_token); } catch (e) {} }
  });
  setTimeout(publish, 0);

  /* ------------------------------------------------ captcha (optional) */
  let captchaToken = null;
  function needCaptcha() { return typeof TURNSTILE_SITE_KEY === 'string' && TURNSTILE_SITE_KEY.length > 10; }
  async function renderCaptcha(el) {
    if (!needCaptcha() || !el) return;
    if (!window.turnstile) {
      await new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; s.async = true; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
    }
    if (el.dataset.ready) return;
    el.dataset.ready = '1';
    window.turnstile.render(el, { sitekey: TURNSTILE_SITE_KEY, theme: 'dark', callback: t => { captchaToken = t; }, 'expired-callback': () => { captchaToken = null; } });
  }
  function resetCaptcha() { captchaToken = null; try { if (window.turnstile) window.turnstile.reset(); } catch (e) {} }

  const here = () => location.href.split('#')[0];

  const auth = {
    current: () => (current ? Object.assign({}, current) : null),
    needCaptcha, renderCaptcha,
    async signUp(name, email, password, consent) {
      if (needCaptcha() && !captchaToken) return { ok: false, code: 'auth/captcha-needed' };
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { name, consent: !!consent }, emailRedirectTo: here(), captchaToken: captchaToken || undefined } });
      resetCaptcha();
      if (error) return { ok: false, code: authCode(error), message: error.message || '' };
      if (data && data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) return { ok: false, code: 'auth/email-already-in-use' };
      return { ok: true, confirm: !(data && data.session) };
    },
    async logIn(email, password) {
      if (needCaptcha() && !captchaToken) return { ok: false, code: 'auth/captcha-needed' };
      const { error } = await sb.auth.signInWithPassword({ email, password, options: { captchaToken: captchaToken || undefined } });
      resetCaptcha();
      return error ? { ok: false, code: authCode(error) } : { ok: true };
    },
    async reset(email) {
      if (needCaptcha() && !captchaToken) return { ok: false, code: 'auth/captcha-needed' };
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: here(), captchaToken: captchaToken || undefined });
      resetCaptcha();
      return error ? { ok: false, code: authCode(error) } : { ok: true };
    },
    async newPassword(password) {
      const { error } = await sb.auth.updateUser({ password });
      return error ? { ok: false, code: authCode(error) } : { ok: true };
    },
    async resendConfirmation(email) {
      const { error } = await sb.auth.resend({ type: 'signup', email, options: { emailRedirectTo: here() } });
      return error ? { ok: false, code: authCode(error) } : { ok: true };
    },
    async logOut() { try { await sb.auth.signOut(); } catch (e) {} return { ok: true }; }
  };

  /* ------------------------------------------------ data API */
  const ok = r => { if (r.error) throw { code: rpcErr(r.error), message: r.error.message }; return r.data; };
  const api = {
    async leaderboard(n) { return ok(await sb.from('scores').select('user_id,name,best,stars,dish,country,crew_id').gt('best', 0).order('best', { ascending: false }).order('updated_at', { ascending: true }).limit(n || 50)); },
    async today(day, n) { return ok(await sb.from('daily_scores').select('user_id,name,score,stars,dish').eq('day', day).order('score', { ascending: false }).order('updated_at', { ascending: true }).limit(n || 50)); },
    async crews() { return ok(await sb.rpc('crew_board')); },
    async myScore() { if (!current) return null; const r = ok(await sb.from('scores').select('best,crew_id').eq('user_id', current.uid).maybeSingle()); return r; },
    async myProfile() { if (!current) return null; return ok(await sb.from('profiles').select('name,consent,keke_color,rides,streak,best_streak,last_day,badges,countries,challenges_done').eq('id', current.uid).maybeSingle()); },
    async updateProfile(name, consent, keke) { return ok(await sb.rpc('update_profile', { p_name: name, p_consent: consent, p_keke: keke || null })); },
    async recordRide(r) { return ok(await sb.rpc('record_ride', { p_dish: r.dish, p_country: r.country, p_score: r.score, p_stars: r.stars, p_daily: !!r.daily, p_all_items: !!r.allItems, p_budget_left: Math.max(-10, Math.min(1, Math.round(r.budgetLeft * 1000) / 1000)), p_veg: r.veg, p_junk: r.junk, p_challenge: !!r.challenge })); },
    async createCrew(name) { return ok(await sb.rpc('create_crew', { p_name: name })); },
    async setCrew(id) { return ok(await sb.rpc('set_crew', { p_crew: id })); },
    async reportPrice(cc, item, amount, currency, place) { return ok(await sb.rpc('report_price', { p_country: cc, p_item: item, p_amount: amount, p_currency: currency, p_place: place || null })); },
    async approvedPrices() { return ok(await sb.rpc('approved_prices')); },
    async deleteAccount() { ok(await sb.rpc('delete_my_account')); await sb.auth.signOut(); },
    admin: {
      async signups(n) { return ok(await sb.rpc('admin_signups', { p_limit: n || 1000 })); },
      async hideScore(uid) { return ok(await sb.rpc('admin_hide_score', { p_user: uid })); },
      async pendingPrices() { return ok(await sb.rpc('admin_pending_prices')); },
      async moderate(id, approve) { return ok(await sb.rpc('admin_moderate_price', { p_id: id, p_approve: !!approve })); }
    }
  };

  return {
    use: async name => (name === 'room' ? lobby : null),
    auth, api
  };
}

boot().then(api => { window.__meuroBackend = api; window.__meuroResolve(api); },
  e => { if (!(e && e.message === 'not-configured')) console.warn('Meuro live features are off:', e && e.message); window.__meuroResolve(null); });
