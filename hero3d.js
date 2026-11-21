// Home hero in 3D: a Muno bottle, the Meuro AI phone and floating brand shapes.
// Drag to spin the bottle; the scene leans towards the pointer. Falls back to the
// flat pictures when WebGL is unavailable, and holds still for reduced motion.
(function () {
  'use strict';
  var host = document.querySelector('[data-hero3d]');
  if (!host || !window.THREE) return;
  var THREE = window.THREE;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var canvas = document.createElement('canvas');
  canvas.className = 'hero3d-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  var renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch (e) { return; }
  if (!renderer.getContext()) return;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(canvas);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0.4, 19);

  // lights: warm key, green and orange rims
  scene.add(new THREE.HemisphereLight(0xfff6e8, 0xc9d8cc, 0.55));
  var key = new THREE.DirectionalLight(0xffffff, 0.85);
  key.position.set(-3, 10, 8); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -8; key.shadow.camera.right = 8; key.shadow.camera.top = 8; key.shadow.camera.bottom = -8;
  key.shadow.radius = 6;
  scene.add(key);
  var rimO = new THREE.PointLight(0xF27B2B, 1.4, 30); rimO.position.set(7, -2, 4); scene.add(rimO);
  var rimG = new THREE.PointLight(0x3A8A4F, 0.6, 30); rimG.position.set(-8, 4, 3); scene.add(rimG);

  var loader = new THREE.TextureLoader();
  function tex(url, cb) { var t = loader.load(url, function () { if (cb) cb(t); render(); }); t.encoding = THREE.sRGBEncoding; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t; }

  var world = new THREE.Group(); scene.add(world);

  /* ---------- Muno bottle ---------- */
  var bottle = new THREE.Group();
  var pts = [];
  var prof = [[0, -3.0], [0.92, -3.0], [1.0, -2.85], [1.0, 2.2], [0.98, 2.5], [0.88, 2.85], [0.66, 3.2], [0.5, 3.45], [0.48, 3.75], [0.5, 3.8], [0, 3.8]];
  prof.forEach(function (p) { pts.push(new THREE.Vector2(p[0], p[1])); });
  var bodyGeo = new THREE.LatheGeometry(pts, 64);
  var bodyMat = new THREE.MeshPhysicalMaterial({ color: 0xD9C3A2, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.12, sheen: 0 });
  var body = new THREE.Mesh(bodyGeo, bodyMat); body.castShadow = true; bottle.add(body);
  // label wraps the front of the body
  var labelTex = tex('img/muno-label.webp');
  var labelGeo = new THREE.CylinderGeometry(1.012, 1.012, 5.0, 64, 1, true, -1.6, 3.2);
  var label = new THREE.Mesh(labelGeo, new THREE.MeshBasicMaterial({ map: labelTex, toneMapped: false }));
  label.position.y = -0.3; bottle.add(label);
  // cap
  var cap = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.75, 48), new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.45 }));
  cap.position.y = 4.15; cap.castShadow = true; bottle.add(cap);
  var ridges = new THREE.Mesh(new THREE.CylinderGeometry(0.575, 0.575, 0.6, 48, 1, true), new THREE.MeshStandardMaterial({ color: 0x0d0d0d, roughness: 0.7, wireframe: true }));
  ridges.position.y = 4.15; bottle.add(ridges);
  bottle.scale.setScalar(0.82);
  bottle.position.set(2.0, -0.6, 0.6);
  bottle.rotation.z = 0.08;
  world.add(bottle);

  /* ---------- Meuro AI phone ---------- */
  function rounded(w, h, r) {
    var s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
  }
  var phone = new THREE.Group();
  var pBody = new THREE.Mesh(new THREE.ExtrudeGeometry(rounded(3.0, 6.0, 0.45), { depth: 0.24, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 4, curveSegments: 12 }),
    new THREE.MeshStandardMaterial({ color: 0x15231A, roughness: 0.35, metalness: 0.4 }));
  pBody.position.z = -0.12; pBody.castShadow = true; phone.add(pBody);
  // screen: app image clipped to rounded corners on a canvas
  var sc = document.createElement('canvas'); sc.width = 620; sc.height = 1180;
  var sTex = new THREE.CanvasTexture(sc); sTex.encoding = THREE.sRGBEncoding; sTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  var img = new Image(); img.onload = function () {
    var x = sc.getContext('2d'), r = 70;
    x.fillStyle = '#0E2A1A'; x.fillRect(0, 0, 620, 1180);
    x.save(); x.beginPath(); x.moveTo(r, 0); x.arcTo(620, 0, 620, 1180, r); x.arcTo(620, 1180, 0, 1180, r); x.arcTo(0, 1180, 0, 0, r); x.arcTo(0, 0, 620, 0, r); x.closePath(); x.clip();
    x.drawImage(img, 0, 26, 620, 1128); x.restore(); sTex.needsUpdate = true; render();
  }; img.src = 'img/app-home.webp';
  var screen = new THREE.Mesh(new THREE.PlaneGeometry(2.78, 5.3), new THREE.MeshBasicMaterial({ map: sTex, toneMapped: false }));
  screen.position.z = 0.2; phone.add(screen);
  phone.position.set(-1.9, 0.2, -0.4);
  phone.rotation.set(-0.06, 0.38, -0.07);
  world.add(phone);

  /* ---------- floating brand shapes ---------- */
  var props = [];
  function float(mesh, x, y, z, speed, amp) { mesh.position.set(x, y, z); mesh.userData = { y: y, s: speed, a: amp, p: Math.random() * 6, r: (Math.random() - .5) * .8 }; mesh.castShadow = true; world.add(mesh); props.push(mesh); }
  // starburst
  var st = new THREE.Shape(); for (var i = 0; i < 24; i++) { var a = i / 24 * Math.PI * 2, rr = i % 2 ? 0.42 : 0.75; if (i === 0) st.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else st.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  var extr = { depth: 0.22, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 3 };
  float(new THREE.Mesh(new THREE.ExtrudeGeometry(st, extr), new THREE.MeshStandardMaterial({ color: 0xE5533D, roughness: 0.4 })), 3.7, 3.4, 0.5, 0.9, 0.25);
  // sparkle
  var sp = new THREE.Shape(); sp.moveTo(0, 0.8); sp.quadraticCurveTo(0.1, 0.1, 0.8, 0); sp.quadraticCurveTo(0.1, -0.1, 0, -0.8); sp.quadraticCurveTo(-0.1, -0.1, -0.8, 0); sp.quadraticCurveTo(-0.1, 0.1, 0, 0.8);
  float(new THREE.Mesh(new THREE.ExtrudeGeometry(sp, extr), new THREE.MeshStandardMaterial({ color: 0x8ED49B, roughness: 0.35 })), -3.9, 3.2, 0.8, 1.1, 0.3);
  // torus ring
  float(new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.2, 24, 64), new THREE.MeshStandardMaterial({ color: 0xF27B2B, roughness: 0.3 })), 3.9, -2.5, 1.0, 0.8, 0.3);
  // sun balls
  var sun = new THREE.MeshStandardMaterial({ color: 0xF2C230, roughness: 0.3 });
  float(new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 24), sun), -0.2, -3.7, 1.6, 1.3, 0.22);
  float(new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 16), new THREE.MeshStandardMaterial({ color: 0x3A8A4F, roughness: 0.3 })), -4.0, -1.4, 2.0, 1.6, 0.25);
  // naira coin
  var cc = document.createElement('canvas'); cc.width = cc.height = 256; var cx = cc.getContext('2d');
  cx.fillStyle = '#F2C230'; cx.fillRect(0, 0, 256, 256); cx.fillStyle = '#F27B2B'; cx.beginPath(); cx.arc(128, 128, 92, 0, 7); cx.fill();
  cx.fillStyle = '#fff'; cx.font = '700 120px Montserrat, Arial, sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText('₦', 128, 136);
  var cTex = new THREE.CanvasTexture(cc); cTex.encoding = THREE.sRGBEncoding;
  var coinMats = [new THREE.MeshStandardMaterial({ color: 0xE0AE1F, roughness: 0.3, metalness: 0.3 }), new THREE.MeshStandardMaterial({ map: cTex, roughness: 0.35 }), new THREE.MeshStandardMaterial({ map: cTex, roughness: 0.35 })];
  var coin = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.16, 48), coinMats); coin.rotation.x = Math.PI / 2;
  var coinG = new THREE.Group(); coinG.add(coin); float(coinG, -0.6, -3.3, 1.8, 1.0, 0.24);

  // soft shadow catcher
  var shadow = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.09 }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -3.4; shadow.receiveShadow = true; world.add(shadow);

  /* ---------- size, pointer, drag ---------- */
  function size() {
    var w = host.clientWidth, h = host.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.position.z = w < 420 ? 21.5 : 19;
    camera.updateProjectionMatrix(); render();
  }
  var px = 0, py = 0, tx = 0, ty = 0, spin = 0, spinV = 0.004, dragging = false, lastX = 0;
  window.addEventListener('pointermove', function (e) {
    var r = host.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width - 0.5); ty = ((e.clientY - r.top) / r.height - 0.5);
    if (dragging) { var dx = e.clientX - lastX; lastX = e.clientX; spinV = dx * 0.0025; spin += dx * 0.012; }
  }, { passive: true });
  canvas.addEventListener('pointerdown', function (e) { dragging = true; lastX = e.clientX; canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId); host.classList.add('grabbing'); });
  window.addEventListener('pointerup', function () { dragging = false; host.classList.remove('grabbing'); });
  canvas.style.touchAction = 'pan-y';

  var visible = true, clock = new THREE.Clock(), t = 0;
  function render() { renderer.render(scene, camera); }
  function frame() {
    requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    var dt = Math.min(clock.getDelta(), 0.05); t += dt;
    px += (tx - px) * 0.05; py += (ty - py) * 0.05;
    world.rotation.y = px * 0.35; world.rotation.x = py * 0.18;
    if (!dragging) { spinV += (0.004 - spinV) * 0.02; spin += spinV * 60 * dt; }
    bottle.rotation.y = spin;
    bottle.position.y = -0.6 + Math.sin(t * 0.9) * 0.12;
    phone.position.y = 0.2 + Math.sin(t * 0.8 + 1.5) * 0.14;
    phone.rotation.y = 0.38 + Math.sin(t * 0.5) * 0.05;
    props.forEach(function (m) { var u = m.userData; m.position.y = u.y + Math.sin(t * u.s + u.p) * u.a; m.rotation.y += u.r * dt * 1.4; m.rotation.z += u.r * dt * 0.6; });
    render();
  }
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(host);
  window.addEventListener('resize', size);
  size();
  host.classList.add('is-3d');
  if (reduce) { bottle.rotation.y = 0; render(); setTimeout(render, 600); setTimeout(render, 1600); }
  else frame();
})();
