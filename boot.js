// Starts before the live backend loads; the game waits on this promise.
window.__meuroReady = new Promise(function (r) { window.__meuroResolve = r; setTimeout(function () { r(null); }, 15000); });
window.claude = { use: function (n) { return window.__meuroReady.then(function (b) { return b ? b.use(n) : null; }); } };
