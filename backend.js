// Meuro Market Run live backend: Firebase Authentication (email + password)
// and Firebase Realtime Database for scores, crews, sign-ups, live riders,
// races and shouts. It exposes the small `use()` interface the game expects.
import { firebaseConfig, ADMIN_EMAILS } from './firebase-config.js';

const V = '10.12.2';
const CDN = 'https://www.gstatic.com/firebasejs/' + V + '/';
const TAB = Math.random().toString(36).slice(2, 8);

function configured() {
  return firebaseConfig && typeof firebaseConfig.apiKey === 'string' && firebaseConfig.apiKey.length > 20 &&
    typeof firebaseConfig.databaseURL === 'string' && firebaseConfig.databaseURL.indexOf('https://') === 0;
}

async function boot() {
  if (!configured()) throw new Error('not-configured');
  const [appMod, A, D] = await Promise.all([
    import(CDN + 'firebase-app.js'), import(CDN + 'firebase-auth.js'), import(CDN + 'firebase-database.js')
  ]);
  const app = appMod.initializeApp(firebaseConfig);
  const auth = A.getAuth(app);
  const db = D.getDatabase(app);
  const admins = (ADMIN_EMAILS || []).map(e => String(e).toLowerCase());

  let current = null;          // {uid,email,name,verified,isAdmin}
  let offset = 0;              // server clock offset
  D.onValue(D.ref(db, '.info/serverTimeOffset'), s => { offset = s.val() || 0; });
  const now = () => Date.now() + offset;

  const clean = v => JSON.parse(JSON.stringify(v, (k, x) => (x === undefined ? null : x)));
  const err = e => ({ code: (e && e.code) || 'unavailable', message: String((e && e.message) || e) });

  /* ---------------- documents (scores/<id>, crews/<id>, signups/<id>) */
  const snapDoc = (id, val) => ({ id, exists: val !== null && val !== undefined, data: () => (val == null ? undefined : val), metadata: {} });
  function docRef(path) {
    const r = D.ref(db, path);
    return {
      id: path.split('/').pop(), path,
      get: async () => { try { const s = await D.get(r); return snapDoc(s.key, s.val()); } catch (e) { throw err(e); } },
      set: async v => { try { await D.set(r, clean(v)); } catch (e) { throw err(e); } },
      update: async v => { try { await D.update(r, clean(v)); } catch (e) { throw err(e); } },
      delete: async () => { try { await D.remove(r); } catch (e) { throw err(e); } },
      onSnapshot: (cb, onErr) => D.onValue(r, s => cb(snapDoc(s.key, s.val())), e => onErr && onErr(err(e)))
    };
  }
  function collection(path, o) {
    o = o || {};
    const build = () => {
      const c = [];
      if (o.f) { c.push(D.orderByChild(o.f)); if (o.n) c.push(o.dir === 'desc' ? D.limitToLast(o.n) : D.limitToFirst(o.n)); }
      else if (o.n) c.push(D.limitToFirst(o.n));
      return c.length ? D.query(D.ref(db, path), ...c) : D.ref(db, path);
    };
    const toSnap = s => {
      const docs = []; s.forEach(ch => { docs.push(snapDoc(ch.key, ch.val())); });
      if (o.f && o.dir === 'desc') docs.reverse();
      return { docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: {} };
    };
    return {
      path,
      doc: id => docRef(path + '/' + id),
      orderBy: (f, dir) => collection(path, Object.assign({}, o, { f, dir })),
      limit: n => collection(path, Object.assign({}, o, { n })),
      where: () => collection(path, o),
      get: async () => { try { return toSnap(await D.get(build())); } catch (e) { throw err(e); } },
      onSnapshot: (cb, onErr) => D.onValue(build(), s => cb(toSnap(s)), e => onErr && onErr(err(e)))
    };
  }
  const dbApi = { doc: docRef, collection };

  /* ---------------- rooms: the market (lobby) and named race rooms */
  const rooms = {};
  function makeRoom(name) {
    if (rooms[name]) return rooms[name];
    const base = name === 'lobby' ? 'market' : 'rooms/' + name;
    let key = null, pres = {}, snap = Object.freeze([]), prev = {}, left = false;
    const peerHandlers = [], topicHandlers = {}, unsubs = [];
    const myKey = () => (current ? current.uid + '_' + TAB : null);

    function rekey() {
      const k = myKey();
      if (k === key) return;
      if (key) D.remove(D.ref(db, base + '/peers/' + key)).catch(() => {});
      key = k;
      if (key && !left) {
        const r = D.ref(db, base + '/peers/' + key);
        D.onDisconnect(r).remove().catch(() => {});
        D.set(r, { p: clean(pres), t: D.serverTimestamp() }).catch(() => {});
      }
      rebuild(lastVal);
    }
    let lastVal = null;
    function rebuild(val) {
      lastVal = val;
      const cur = {}, list = [];
      Object.keys(val || {}).forEach(k => {
        const v = val[k] || {}; const by = k.split('_')[0];
        const peer = { peer: k, by, isMe: !!current && by === current.uid, sameTab: k === key, kind: 'viewer', guest: false, presence: Object.freeze(Object.assign({}, v.p || {})), updatedAt: Date.now() };
        cur[k] = peer; list.push(peer);
      });
      if (!key) { // signed-out viewer: still show yourself so counts read naturally
        const me = { peer: 'local_' + TAB, by: null, isMe: true, sameTab: true, kind: 'viewer', guest: false, presence: Object.freeze(Object.assign({}, pres)), updatedAt: Date.now() };
        cur[me.peer] = me; list.push(me);
      }
      const joined = [], gone = [], updated = [];
      Object.keys(cur).forEach(k => { if (!prev[k]) joined.push(cur[k]); else if (JSON.stringify(prev[k].presence) !== JSON.stringify(cur[k].presence)) updated.push(cur[k]); });
      Object.keys(prev).forEach(k => { if (!cur[k]) gone.push(prev[k]); });
      prev = cur; snap = Object.freeze(list);
      const ch = { peers: snap, joined, left: gone, updated };
      peerHandlers.forEach(h => { try { h(ch); } catch (e) { console.error(e); } });
    }
    unsubs.push(D.onValue(D.ref(db, base + '/peers'), s => rebuild(s.val()), () => {}));
    const since = now() - 1500;
    unsubs.push(D.onChildAdded(D.query(D.ref(db, base + '/events'), D.orderByChild('t'), D.startAt(since)), s => {
      const v = s.val() || {}; const hs = topicHandlers[v.topic]; if (!hs) return;
      const msg = { topic: v.topic, data: v.d, peer: v.k, by: v.by, isMe: !!current && v.by === current.uid, sameTab: v.k === key, kind: 'viewer', guest: false };
      hs.forEach(h => { try { h(msg); } catch (e) { console.error(e); } });
    }, () => {}));

    const room = {
      name,
      presence: patch => {
        Object.keys(patch || {}).forEach(k => { if (patch[k] === null) delete pres[k]; else pres[k] = patch[k]; });
        if (!key || left) { rebuild(lastVal); return Promise.resolve(); }
        return D.set(D.ref(db, base + '/peers/' + key), { p: clean(pres), t: D.serverTimestamp() }).catch(() => {});
      },
      emit: (topic, data) => {
        if (!key || left) return Promise.reject({ code: 'not_permitted', message: 'Log in to take part.' });
        return D.push(D.ref(db, base + '/events'), { topic, d: clean(data === undefined ? null : data), k: key, by: current.uid, t: D.serverTimestamp() }).then(() => {}, e => { throw err(e); });
      },
      on: (topic, h) => { (topicHandlers[topic] = topicHandlers[topic] || []).push(h); return () => { const a = topicHandlers[topic]; a.splice(a.indexOf(h), 1); }; },
      onPeers: (h) => { peerHandlers.push(h); setTimeout(() => h({ peers: snap, joined: snap.slice(), left: [], updated: [] }), 0); return () => peerHandlers.splice(peerHandlers.indexOf(h), 1); },
      peers: () => snap,
      connected: () => true,
      onConnection: h => { setTimeout(() => h(true), 0); return () => {}; },
      join: async n => { if (!/^[a-z0-9][a-z0-9_.-]{0,47}$/.test(n)) throw { code: 'invalid_argument', message: 'Bad room name' }; if (!current) throw { code: 'not_permitted', message: 'Log in first' }; return makeRoom(n); },
      leave: async () => { left = true; if (key) await D.remove(D.ref(db, base + '/peers/' + key)).catch(() => {}); unsubs.forEach(u => u()); delete rooms[name]; },
      _rekey: rekey
    };
    rooms[name] = room;
    if (current) rekey();
    return room;
  }

  /* ---------------- auth */
  function publish() {
    window.dispatchEvent(new CustomEvent('meuro-auth', { detail: current ? Object.assign({}, current) : { uid: null } }));
  }
  await new Promise(res => {
    let first = true;
    A.onAuthStateChanged(auth, async u => {
      if (u && !u.emailVerified && typeof A.reload === 'function') {
        try { await A.reload(u); if (u.emailVerified) await u.getIdToken(true); } catch (e) {}
      }
      current = u ? { uid: u.uid, email: u.email, name: u.displayName || '', verified: !!u.emailVerified, isAdmin: admins.indexOf(String(u.email || '').toLowerCase()) > -1 && !!u.emailVerified } : null;
      Object.keys(rooms).forEach(n => rooms[n]._rekey());
      publish();
      if (first) { first = false; res(); }
    });
  });

  const userApi = {
    id: async () => (current ? current.uid : null),
    isOwner: async () => !!(current && current.isAdmin),
    canEdit: async () => !!(current && current.isAdmin),
    can: async () => (current ? true : false),
    me: async () => ({ id: current ? current.uid : null, name: current ? current.name : '', email: current ? current.email : null, isOwner: !!(current && current.isAdmin), canEdit: false, avatarUrl: '', color: '#888' })
  };

  const authApi = {
    current: () => (current ? Object.assign({}, current) : null),
    async signUp(name, email, password, consent) {
      try {
        const cred = await A.createUserWithEmailAndPassword(auth, email, password);
        await A.updateProfile(cred.user, { displayName: name });
        const t = new Date().toISOString();
        await D.set(D.ref(db, 'signups/' + cred.user.uid), { name, via: 'email', contact: email, consent: !!consent, createdAt: t, updatedAt: t });
        try { await A.sendEmailVerification(cred.user); } catch (e) {}
        current = Object.assign({}, current || {}, { uid: cred.user.uid, email, name });
        publish();
        return { ok: true };
      } catch (e) { return { ok: false, code: e.code || 'unknown' }; }
    },
    async logIn(email, password) {
      try { await A.signInWithEmailAndPassword(auth, email, password); return { ok: true }; }
      catch (e) { return { ok: false, code: e.code || 'unknown' }; }
    },
    async reset(email) {
      try { await A.sendPasswordResetEmail(auth, email); return { ok: true }; }
      catch (e) { return { ok: false, code: e.code || 'unknown' }; }
    },
    async logOut() {
      Object.keys(rooms).forEach(n => { if (n !== 'lobby') rooms[n].leave(); });
      try { await A.signOut(auth); } catch (e) {}
      return { ok: true };
    },
    async resendVerification() { try { if (auth.currentUser) await A.sendEmailVerification(auth.currentUser); return { ok: true }; } catch (e) { return { ok: false, code: e.code }; } }
  };

  return {
    use: async name => (name === 'db' ? dbApi : name === 'user' ? userApi : name === 'room' ? makeRoom('lobby') : null),
    auth: authApi
  };
}

boot().then(api => { window.__meuroBackend = api; window.__meuroResolve(api); },
  e => { console.warn('Meuro live features are off:', e && e.message); window.__meuroResolve(null); });
