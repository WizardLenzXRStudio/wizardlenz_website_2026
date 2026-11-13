import { loadAlbums } from './gallery-data.js';
import { buildScene } from './scenes.js';
import { AV } from './chatbot.js';
import { buildWizard } from './wizard3d.js';
/* Wizardlenz XR Studio: site behaviour (motion, 3D world, planner, gallery, map). */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const hasGL = (() => { try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); } catch (e) { return false; } })();
  const ok3d = hasGL && !!window.THREE;
  const PR = Math.min(window.devicePixelRatio || 1, 1.75);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const ptr = { x: innerWidth / 2, y: innerHeight / 2, nx: 0, ny: 0 };
  addEventListener('pointermove', e => { ptr.x = e.clientX; ptr.y = e.clientY; ptr.nx = e.clientX / innerWidth * 2 - 1; ptr.ny = e.clientY / innerHeight * 2 - 1; }, { passive: true });
  const visible = (el, cb, margin = '120px') => { const io = new IntersectionObserver(es => es.forEach(en => cb(en.isIntersecting)), { rootMargin: margin }); io.observe(el); };
  const ticks = [];
  const esc = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- Pages and portal transitions ---------- */
  const PAGE = document.body.dataset.page || 'home';
  const markers = $$('[data-stage]');
  const PAGE_STAGE = { academy: 1, contact: 3, gallery: 0, studio: 1, originals: 2, about: 3, terms: 0, privacy: 0, refund: 0 };
  let current = PAGE, stageT = 0, stage = 0;
  function computeStage() {
    if (current !== 'home') { stageT = PAGE_STAGE[current] || 0; return; }
    const mid = scrollY + innerHeight * 0.55, w = innerHeight * 0.45;
    let s = 0;
    for (let i = 1; i < markers.length; i++) { const b = markers[i].getBoundingClientRect().top + scrollY; s += clamp((mid - (b - w)) / (2 * w), 0, 1); }
    stageT = s;
  }
  addEventListener('scroll', computeStage, { passive: true });
  addEventListener('resize', computeStage);
  ticks.push(() => { stage = reduce ? stageT : lerp(stage, stageT, 0.05); });
  computeStage(); stage = stageT;
  const portal = $('#portal'), portalTo = $('#portalTo');
  const headerH = () => $('.top').offsetHeight;
  const scrollToId = (id, smooth) => { const t = document.getElementById(id); if (t) scrollTo({ top: t.getBoundingClientRect().top + scrollY - headerH() + 2, behavior: smooth && !reduce ? 'smooth' : 'instant' }); };
  let leaving = null;
  function go(href, label, x, y) {
    const leave = () => { try { sessionStorage.setItem('wlz-portal', label || ''); } catch (e) {} location.href = href; };
    if (reduce || !portal.animate) { leave(); return; }
    portalTo.textContent = label || '';
    portal.hidden = false;
    const R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    leaving = portal.animate([{ clipPath: `circle(0px at ${x}px ${y}px)` }, { clipPath: `circle(${R}px at ${x}px ${y}px)` }], { duration: 560, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' });
    leaving.onfinish = leave;
  }
  // arriving through a portal: the cover shrinks away to reveal the page
  try {
    if (sessionStorage.getItem('wlz-portal') !== null) {
      sessionStorage.removeItem('wlz-portal');
      portal.style.clipPath = '';
      const cx = innerWidth / 2, cy = innerHeight / 2, R2 = Math.hypot(cx, cy);
      if (reduce || !portal.animate) portal.hidden = true;
      else {
        const b = portal.animate([{ clipPath: `circle(${R2}px at ${cx}px ${cy}px)` }, { clipPath: `circle(0px at ${cx}px ${cy}px)` }], { duration: 640, delay: 260, easing: 'cubic-bezier(.7,0,.3,1)', fill: 'forwards' });
        b.onfinish = () => { portal.hidden = true; b.cancel(); };
      }
    } else portal.hidden = true;
  } catch (e) { portal.hidden = true; }
  addEventListener('pageshow', e => { if (e.persisted) { if (leaving) leaving.cancel(); portal.hidden = true; } });
  document.addEventListener('click', e => {
    const el = e.target.closest('a[href]'); if (!el || el.target || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey) return;
    let u; try { u = new URL(el.href, location.href); } catch (err) { return; }
    if (u.origin !== location.origin) return;
    if (u.pathname === location.pathname) { if (u.hash) { e.preventDefault(); history.replaceState(null, '', u.hash); scrollToId(u.hash.slice(1), true); } return; }
    if (el.dataset.portal) { e.preventDefault(); go(u.pathname + u.search + u.hash, el.dataset.portal, e.clientX || innerWidth / 2, e.clientY || innerHeight / 2); }
  });
  const menuBtn = $('#menuBtn'), mainNav = $('#mainNav');
  const closeMenu = () => { mainNav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); menuBtn.textContent = 'Menu'; };
  menuBtn.addEventListener('click', () => { const o = !mainNav.classList.contains('open'); mainNav.classList.toggle('open', o); menuBtn.setAttribute('aria-expanded', String(o)); menuBtn.textContent = o ? 'Close' : 'Menu'; });
  mainNav.addEventListener('click', closeMenu);
  $$('[data-scroll]').forEach(b => b.addEventListener('click', () => scrollToId(b.dataset.scroll, true)));
  if (location.hash) addEventListener('load', () => setTimeout(() => scrollToId(location.hash.slice(1)), 150));

  /* ---------- Background particle world ---------- */
  if (ok3d) {
    const canvas = $('#bg');
    const r = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'low-power' });
    r.setPixelRatio(PR); r.setSize(innerWidth, innerHeight, false);
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500); cam.position.set(0, 0, 30);
    const N = innerWidth < 760 ? 1600 : 3200;
    const P = [0, 1, 2, 3].map(() => new Float32Array(N * 3)), seed = new Float32Array(N);
    const g = Math.ceil(Math.sqrt(N)), rnd = Math.random;
    for (let i = 0; i < N; i++) {
      const k = i * 3; seed[i] = rnd();
      P[0][k] = (rnd() - .5) * 150; P[0][k + 1] = (rnd() - .5) * 90; P[0][k + 2] = -rnd() * 80 + 8;
      const gx = i % g, gz = Math.floor(i / g);
      P[1][k] = (gx / (g - 1) - .5) * 160; P[1][k + 1] = -15; P[1][k + 2] = 12 - (gz / (g - 1)) * 120;
      const a = rnd() * Math.PI * 2, R = 19 + (rnd() - .5) * 4 + (i % 7 === 0 ? 7 : 0);
      P[2][k] = Math.cos(a) * R; P[2][k + 1] = Math.sin(a) * R; P[2][k + 2] = -14 + (rnd() - .5) * 5;
      const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, sr = Math.sqrt(1 - u * u), R3 = 55 + rnd() * 14;
      P[3][k] = sr * Math.cos(th) * R3; P[3][k + 1] = u * R3; P[3][k + 2] = 30 + sr * Math.sin(th) * R3;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(P[0], 3));
    P.forEach((arr, i) => geo.setAttribute('p' + i, new THREE.BufferAttribute(arr, 3)));
    geo.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uS: { value: 0 }, uT: { value: 0 }, uPR: { value: PR }, uMove: { value: reduce ? 0 : 1 } },
      vertexShader: `
        attribute vec3 p0; attribute vec3 p1; attribute vec3 p2; attribute vec3 p3; attribute float seed;
        uniform float uS; uniform float uT; uniform float uPR; uniform float uMove;
        varying float vA; varying float vC;
        void main(){
          float s = clamp(uS, 0.0, 3.0);
          vec3 a = s < 1.0 ? mix(p0, p1, smoothstep(0.0,1.0,s)) : (s < 2.0 ? mix(p1, p2, smoothstep(0.0,1.0,s-1.0)) : mix(p2, p3, smoothstep(0.0,1.0,s-2.0)));
          a += uMove * vec3(sin(uT*.6 + seed*6.28), cos(uT*.5 + seed*12.0), sin(uT*.4 + seed*3.0)) * .6;
          vec4 mv = modelViewMatrix * vec4(a, 1.0);
          gl_PointSize = (1.3 + 1.6*fract(seed*3.7)) * uPR * (34.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
          vA = .35 + .65*fract(seed*7.13);
          vC = clamp(s/3.0 + (seed-.5)*.5, 0.0, 1.0);
        }`,
      fragmentShader: `
        varying float vA; varying float vC;
        void main(){
          float d = length(gl_PointCoord - .5); if (d > .5) discard;
          vec3 col = mix(vec3(.655,.545,.98), vec3(.133,.827,.933), vC);
          gl_FragColor = vec4(col, vA * (1.0 - d*2.0) * .8);
        }`
    });
    const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; scene.add(pts);
    addEventListener('resize', () => { r.setSize(innerWidth, innerHeight, false); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); });
    let cx = 0, cy = 0;
    ticks.push((t) => {
      mat.uniforms.uS.value = stage; mat.uniforms.uT.value = t;
      cx = lerp(cx, ptr.nx * 2.2, .04); cy = lerp(cy, -ptr.ny * 1.6, .04);
      cam.position.x = reduce ? 0 : cx; cam.position.y = reduce ? 0 : cy; cam.lookAt(0, 0, 0);
      pts.rotation.z = reduce ? 0 : (stage > 1.5 && stage < 2.5 ? t * .05 : pts.rotation.z * .98);
      pts.rotation.y = reduce ? 0 : clamp(stage - 2, 0, 1) * t * .03;
      r.render(scene, cam);
    });
  }

  /* ---------- Hero: spell-cast emblem ---------- */
  if ($('#scCanvas')) {
  const sc = $('#reality'), scCv = $('#scCanvas'), scx = scCv.getContext('2d'), scSlot = $('#scSlot'), scImg = $('#scImg');
  let parts = [], sparks = [], dust = [], box = null, SW = 0, SH = 0, scVis = true, showImg = false, settledAt = 0, ready = false, scKey = '';
  const sptr = { x: -9999, y: -9999, at: -1e9 };
  visible(sc, v => scVis = v, '0px');
  const SPARK = ['#22D3EE', '#C4B5FD', '#F5B544', '#67E8F9'];
  sc.addEventListener('pointermove', e => {
    const b = sc.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top;
    if (!reduce && sptr.at > 0 && sptr.x > -999) { for (let i = 0; i < 3; i++) sparks.push({ x, y, vx: (Math.random() - .5) * 2.4 + (x - sptr.x) * .06, vy: (Math.random() - .5) * 2.4 - .8 + (y - sptr.y) * .06, life: 1, c: SPARK[(Math.random() * 4) | 0] }); }
    sptr.x = x; sptr.y = y; sptr.at = performance.now();
  });
  sc.addEventListener('pointerleave', () => { sptr.x = sptr.y = -9999; });
  function fitSc() { SW = sc.clientWidth; SH = sc.clientHeight; const pw = Math.round(SW * PR), ph = Math.round(SH * PR); if (scCv.width !== pw || scCv.height !== ph) { scCv.width = pw; scCv.height = ph; } }
  function scLayout() {
    const hb = sc.getBoundingClientRect(), r = scSlot.getBoundingClientRect();
    box = { x: r.left - hb.left, y: r.top - hb.top, w: r.width, h: r.height };
    const oc = document.createElement('canvas'), step = Math.max(2, Math.round(box.w / 150));
    oc.width = Math.max(1, Math.round(box.w)); oc.height = Math.max(1, Math.round(box.h));
    const o = oc.getContext('2d'); o.drawImage(scImg, 0, 0, oc.width, oc.height);
    const d = o.getImageData(0, 0, oc.width, oc.height).data, next = [];
    for (let yy = 0; yy < oc.height; yy += step) for (let xx = 0; xx < oc.width; xx += step) {
      const i = (yy * oc.width + xx) * 4; if (d[i + 3] < 140) continue;
      next.push({ tx: box.x + xx, ty: box.y + yy, c: `rgb(${d[i]},${d[i + 1]},${d[i + 2]})`, s: step * .92, ang: Math.random() * 6.283, sp: .5 + Math.random() });
    }
    parts = next.map((q, i) => Object.assign(q, parts[i] ? { x: parts[i].x, y: parts[i].y, vx: 0, vy: 0 } : { x: q.tx, y: q.ty, vx: 0, vy: 0 }));
    dust = Array.from({ length: 110 }, () => ({ a: Math.random() * 6.283, r: Math.random(), s: .08 + Math.random() * .25, z: Math.random() }));
  }
  function scCast() {
    if (!box) return; showImg = false; scImg.style.opacity = 0; settledAt = 0;
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2, R = Math.max(SW, SH);
    parts.forEach(q => { const a = Math.random() * 6.283, rr = R * (.25 + Math.random() * .5); q.x = cx + Math.cos(a) * rr; q.y = cy + Math.sin(a) * rr; const sw = 5 + Math.random() * 8; q.vx = -Math.sin(a) * sw; q.vy = Math.cos(a) * sw; });
  }
  $('#scCast').addEventListener('click', scCast);
  function scStart() { fitSc(); scLayout(); ready = true; scKey = ''; if (reduce) { showImg = true; scImg.style.opacity = 1; } else scCast(); }
  if (scImg.complete && scImg.naturalWidth) scStart(); else scImg.addEventListener('load', scStart);
  ticks.push((t) => {
    if (!ready) return;
    const hb = sc.getBoundingClientRect(), p = reduce ? 0 : clamp(-hb.top / Math.max(1, hb.height * .8), 0, 1);
    if (!scVis) return;
    const key = sc.clientWidth + 'x' + sc.clientHeight + ':' + scSlot.offsetWidth + ':' + scSlot.offsetTop;
    if (key !== scKey) { scKey = key; fitSc(); scLayout(); }
    scx.setTransform(PR, 0, 0, PR, 0, 0); scx.clearRect(0, 0, SW, SH);
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    const pulse = .75 + .25 * Math.sin(t * 1.4);
    const g = scx.createRadialGradient(cx, cy, 0, cx, cy, box.w * .9);
    g.addColorStop(0, `rgba(34,211,238,${(.17 * pulse * (1 - p)).toFixed(3)})`); g.addColorStop(.5, `rgba(167,139,250,${(.07 * (1 - p)).toFixed(3)})`); g.addColorStop(1, 'rgba(11,10,31,0)');
    scx.fillStyle = g; scx.fillRect(0, 0, SW, SH);
    dust.forEach(q => { const a = q.a + (reduce ? 0 : t * q.s), rx = box.w * (.5 + q.r * .32), ry = box.h * (.44 + q.r * .3); const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry * .75; scx.globalAlpha = (1 - p) * (.4 + q.z * .6); scx.fillStyle = q.z > .5 ? '#22D3EE' : '#C4B5FD'; scx.fillRect(x, y, 1.4 + q.z, 1.4 + q.z); });
    scx.globalAlpha = 1;
    const near = performance.now() - sptr.at < 1200 && Math.hypot(sptr.x - cx, sptr.y - cy) < box.w * .7;
    if ((near || p > .02) && showImg) { showImg = false; scImg.style.opacity = 0; }
    const R = Math.max(60, box.w * .17); let moving = 0;
    for (const q of parts) {
      const ox = q.tx + (q.tx - cx) * p * 2.4 + Math.cos(q.ang) * p * SW * .3 * q.sp, oy = q.ty + (q.ty - cy) * p * 2.4 - p * SH * .45 * q.sp + Math.sin(q.ang) * p * 90;
      let ax = (ox - q.x) * .03, ay = (oy - q.y) * .03;
      const dx = q.x - sptr.x, dy = q.y - sptr.y, d2 = dx * dx + dy * dy;
      if (d2 < R * R) { const dd = Math.sqrt(d2) || 1, f = (1 - dd / R) * 7; ax += dx / dd * f - dy / dd * f * .6; ay += dy / dd * f + dx / dd * f * .6; }
      q.vx = (q.vx + ax) * .86; q.vy = (q.vy + ay) * .86; q.x += q.vx; q.y += q.vy; moving += Math.abs(q.vx) + Math.abs(q.vy);
    }
    if (!showImg) { scx.globalAlpha = 1 - p * .85; for (const q of parts) { scx.fillStyle = q.c; scx.fillRect(q.x, q.y, q.s, q.s); } scx.globalAlpha = 1; }
    const calm = moving / (parts.length || 1) < .08;
    if (calm && !near && p < .02) { if (!settledAt) settledAt = t; if (!showImg && t - settledAt > .4) { showImg = true; scImg.style.opacity = 1; } } else settledAt = 0;
    for (let i = sparks.length - 1; i >= 0; i--) { const k = sparks[i]; k.x += k.vx; k.y += k.vy; k.vy += .045; k.vx *= .985; k.life -= .02; if (k.life <= 0) { sparks.splice(i, 1); continue; } scx.globalAlpha = k.life; scx.fillStyle = k.c; const z = 1 + k.life * 2.4; scx.fillRect(k.x - z / 2, k.y - z / 2, z, z); }
    scx.globalAlpha = 1;
    if (sparks.length > 500) sparks.splice(0, sparks.length - 500);
  });
  }

  /* ---------- Through the lens (real photo), on every page that shows it ---------- */
  const PHOTO = '/img/woxsen-2026.jpg';
  $$('img[data-photo]').forEach(i => { i.src = PHOTO; });
  $$('.plens').forEach(fig => {
    const layer = $('.xr', fig), ring = $('.lens-ring', fig), L = { x: 0, y: 0, init: false, px: 0, py: 0, at: -1e9, vis: true };
    fig.addEventListener('pointermove', e => { const b = fig.getBoundingClientRect(); L.px = e.clientX - b.left; L.py = e.clientY - b.top; L.at = performance.now(); });
    visible(fig, s => L.vis = s);
    ticks.push((t) => {
      if (!L.vis) return;
      const w = fig.clientWidth, h = fig.clientHeight; if (!w) return;
      const R = clamp(w * .2, 70, 140), over = performance.now() - L.at < 2200;
      const tx = over ? L.px : (reduce ? w * .31 : w * (.4 + .24 * Math.sin(t * .4))), ty = over ? L.py : (reduce ? h * .25 : h * (.34 + .14 * Math.sin(t * .63)));
      if (!L.init) { L.x = tx; L.y = ty; L.init = true; }
      L.x = lerp(L.x, tx, .12); L.y = lerp(L.y, ty, .12);
      layer.style.clipPath = `circle(${R}px at ${L.x}px ${L.y}px)`;
      ring.style.width = ring.style.height = R * 2 + 'px';
      ring.style.transform = `translate(${L.x - R}px, ${L.y - R}px)`;
    });
  });

  /* ---------- Academy page: Plan your program ---------- */
  if ($('#plDept')) {
  const MODS = [
    { id: 'vr', name: 'VR Foundations', level: 'Foundation', min: 8, max: 12, build: 'their first interactive VR scene' },
    { id: 'vrpro', name: 'Advanced VR', level: 'Advanced', min: 15, max: 20, build: 'a multiplayer VR experience with physics' },
    { id: 'ar', name: 'Augmented Reality', level: 'Foundation', min: 8, max: 12, build: 'an AR app that places 3D content in the real world' },
    { id: 'mr', name: 'Mixed Reality', level: 'Advanced', min: 10, max: 15, build: 'a mixed reality app with hand interaction' },
    { id: 'ux', name: 'UI/UX Design for XR', level: 'Intermediate', min: 8, max: 12, build: 'a spatial interface prototype' },
    { id: 'model', name: '3D Modelling for XR', level: 'Intermediate', min: 10, max: 15, build: 'optimised 3D assets for VR and AR' },
    { id: 'meta', name: 'Metaverse Foundations', level: 'Intermediate', min: 6, max: 10, build: 'a shared virtual space' },
    { id: 'metapro', name: 'Metaverse Architect', level: 'Advanced', min: 15, max: 20, build: 'a multi-user interactive 3D world' },
    { id: 'ai', name: 'Artificial Intelligence', level: 'Foundation', min: 10, max: 15, build: 'a smart app using AI services' },
    { id: 'ml', name: 'Machine Learning', level: 'Intermediate', min: 15, max: 20, build: 'a model trained on a real dataset' },
    { id: 'vrd', name: 'VR for Designers', level: 'Design track', min: 10, max: 15, build: 'an explorable VR space designed from their own concept' },
    { id: 'ard', name: 'AR for Designers', level: 'Design track', min: 8, max: 12, build: 'an AR experience such as an interactive poster, product or exhibit' },
    { id: 'portfolio', name: 'Immersive Design Portfolio', level: 'Design track', min: 10, max: 15, build: 'a portfolio of their immersive work, ready to show recruiters' }
  ];
  const DEPTS = [
    { id: 'cse', name: 'CSE / IT', rec: ['vr', 'ar', 'mr'] }, { id: 'aids', name: 'AI & Data Science', rec: ['ai', 'ml', 'ar'] },
    { id: 'ece', name: 'ECE / EEE', rec: ['vr', 'ar'] }, { id: 'mech', name: 'Mechanical', rec: ['vr', 'model'] },
    { id: 'design', name: 'Design / Media', rec: ['vrd', 'ard', 'portfolio'] }, { id: 'other', name: 'Other', rec: ['vr', 'ar'] }
  ];
  const HOURS = [6, 12, 24, 30, 45];
  const FMT = { 6: '1-day workshop', 12: '2-day bootcamp', 24: '4-day bootcamp', 30: '5-day bootcamp or short course', 45: 'Semester course' };
  const PS = { dept: 'cse', hours: 30, picked: ['vr', 'ar', 'mr'] };
  const hrs = n => n + (n === 1 ? ' hour' : ' hours');
  function allocate(total, ids) {
    const sel = MODS.filter(m => ids.includes(m.id)); if (!sel.length) return [];
    const project = total >= 12 ? Math.round(total * .15) : 0, teach = total - project;
    const w = sel.map(m => (m.min + m.max) / 2), sum = w.reduce((a, b) => a + b, 0), raw = w.map(x => teach * x / sum), fl = raw.map(Math.floor);
    const rem = teach - fl.reduce((a, b) => a + b, 0), order = raw.map((r, i) => ({ i, f: r - Math.floor(r) })).sort((a, b) => b.f - a.f);
    for (let k = 0; k < rem; k++) fl[order[k % order.length].i]++;
    const rows = sel.map((m, i) => ({ name: m.name, h: fl[i] }));
    if (project) rows.push({ name: 'Final project and showcase', h: project, v: true });
    return rows;
  }
  const elD = $('#plDept'), elH = $('#plHours'), elT = $('#plTopics');
  elD.innerHTML = DEPTS.map(d => `<button type="button" class="pill" data-d="${d.id}" aria-pressed="false">${d.name}</button>`).join('');
  elH.innerHTML = HOURS.map(h => `<button type="button" class="pill" data-h="${h}" aria-pressed="false">${h} hrs</button>`).join('');
  elT.innerHTML = MODS.map(m => `<button type="button" class="topic${m.level === 'Design track' ? ' dt' : ''}" data-m="${m.id}" aria-pressed="false"><span class="box"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#061018" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7"/></svg></span><span><b>${m.name}</b><small>${m.level} · ${m.min}–${m.max} hrs</small></span></button>`).join('');
  $('#plMods').innerHTML = MODS.map(m => `<article class="mod${m.level === 'Design track' ? ' dt' : ''}"><div class="top"><span class="lvl">${m.level}</span><span class="hrs">${m.min}–${m.max} hrs</span></div><h3>${m.name}</h3><p><b>Students build:</b> ${m.build}</p></article>`).join('');
  const SAMPLES = [
    { dept: 'CSE / IT', d: 'cse', title: 'XR Developer Program', hours: 30, ids: ['vr', 'ar', 'mr'] },
    { dept: 'Design / Media', d: 'design', title: 'Immersive Design Program', hours: 30, ids: ['vrd', 'ard', 'portfolio'] },
    { dept: 'ECE / EEE', d: 'ece', title: 'Immersive Tech Bootcamp', hours: 12, ids: ['vr', 'ar'] },
    { dept: 'AI & Data Science', d: 'aids', title: 'AI meets XR', hours: 30, ids: ['ai', 'ml', 'ar'] }
  ];
  $('#plSamples').innerHTML = SAMPLES.map((x, i) => `<article class="sample"><span class="who">${x.dept} · ${hrs(x.hours)}</span><h3>${x.title}</h3><ul>${allocate(x.hours, x.ids).map(r => `<li><span>${r.name}</span><b>${hrs(r.h)}</b></li>`).join('')}</ul><button type="button" class="linkbtn" data-sample="${i}">Load into the planner ↑</button></article>`).join('');
  function planText() {
    const d = DEPTS.find(x => x.id === PS.dept);
    return `Draft program plan: ${d.name}, ${hrs(PS.hours)} (${FMT[PS.hours]})\n` + allocate(PS.hours, PS.picked).map(r => `- ${r.name}: ${hrs(r.h)}`).join('\n');
  }
  function renderPlan() {
    const d = DEPTS.find(x => x.id === PS.dept), rows = allocate(PS.hours, PS.picked), days = Math.ceil(PS.hours / 6);
    $$('[data-d]', elD).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.d === PS.dept)));
    $$('[data-h]', elH).forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.h === PS.hours)));
    $$('[data-m]', elT).forEach(b => b.setAttribute('aria-pressed', String(PS.picked.includes(b.dataset.m))));
    $('#plNote').textContent = `Recommended topics for ${d.name} are ticked. Add or remove any.`;
    $('#plTitle').textContent = `${d.name} · ${hrs(PS.hours)}`;
    $('#plMeta').textContent = `${FMT[PS.hours]} · ` + (PS.hours >= 45 ? 'about 15 weekly sessions of 3 hours' : `about ${days} ${days === 1 ? 'day' : 'days'} at 6 hours a day`);
    $('#plTotal').textContent = hrs(PS.hours);
    $('#plEmpty').hidden = rows.length > 0;
    const ul = $('#plRows');
    ul.innerHTML = rows.map(r => `<li><div class="row"><span>${r.name}</span><b>${hrs(r.h)}</b></div><div class="bar"><i${r.v ? ' class="v"' : ''} data-w="${Math.max(3, Math.round(r.h / PS.hours * 100))}"></i></div></li>`).join('');
    requestAnimationFrame(() => requestAnimationFrame(() => $$('i[data-w]', ul).forEach(i => { i.style.width = i.dataset.w + '%'; })));
    const sel = PS.picked.length, project = PS.hours >= 12 ? Math.round(PS.hours * .15) : 0, crowded = sel && (PS.hours - project) / sel < 4;
    const warn = $('#plWarn'); warn.hidden = !crowded; if (crowded) warn.textContent = `That's a lot of topics for ${hrs(PS.hours)}. We'd suggest fewer, so students finish a real project.`;
    $('#plSend').disabled = false;
  }
  elD.addEventListener('click', e => { const b = e.target.closest('[data-d]'); if (!b) return; PS.dept = b.dataset.d; PS.picked = DEPTS.find(x => x.id === PS.dept).rec.slice(); renderPlan(); });
  elH.addEventListener('click', e => { const b = e.target.closest('[data-h]'); if (!b) return; PS.hours = +b.dataset.h; renderPlan(); });
  elT.addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (!b) return; const id = b.dataset.m; PS.picked = PS.picked.includes(id) ? PS.picked.filter(x => x !== id) : PS.picked.concat(id); renderPlan(); });
  $('#plSamples').addEventListener('click', e => { const b = e.target.closest('[data-sample]'); if (!b) return; const x = SAMPLES[+b.dataset.sample]; PS.dept = x.d; PS.hours = x.hours; PS.picked = x.ids.slice(); renderPlan(); const t = $('#planner'); scrollTo({ top: t.getBoundingClientRect().top + scrollY - headerH() + 2, behavior: reduce ? 'instant' : 'smooth' }); });
  $('#plSend').addEventListener('click', e => {
    if (!PS.picked.length) { $('#plEmpty').hidden = false; return; }
    try { sessionStorage.setItem('wlz-prefill', JSON.stringify({ who: 'An institution', msg: planText() + '\n\nOur preferred dates: ' })); } catch (err) {}
    go('/contact/', 'Contact', e.clientX || innerWidth / 2, e.clientY || innerHeight / 2);
  });
  $('#plCopy').addEventListener('click', () => {
    const b = $('#plCopy'), txt = planText(), done = m => { b.textContent = m; setTimeout(() => { b.textContent = 'Copy this plan'; }, 2200); };
    try { navigator.clipboard.writeText(txt).then(() => done('Copied'), () => done('Copy blocked here; use Send instead')); } catch (err) { done('Copy blocked here; use Send instead'); }
  });
  renderPlan();
  }

  /* ---------- Gallery page ---------- */
  if ($('#gGrid')) {
  let ALBUMS = [], gInfo = {};
  const TYPES = ['All', 'Workshop', 'Bootcamp', 'Semester course', 'Faculty program', 'In-plant training', 'Event'];
  let gType = 'All';
  const gTypeEl = $('#gType'), gGrid = $('#gGrid'), gQ = $('#gQ');
  gTypeEl.innerHTML = TYPES.map(t => `<button type="button" class="pill" data-t="${t}" aria-pressed="${t === 'All'}">${t}</button>`).join('');
  function renderAlbums() {
    const q = gQ.value.trim().toLowerCase();
    const list = ALBUMS.map((a, i) => ({ a, i })).filter(({ a }) => (gType === 'All' || a.type === gType) && (!q || (a.title + ' ' + a.inst).toLowerCase().includes(q)));
    gGrid.innerHTML = list.map(({ a, i }, k) => `<button type="button" class="alb${k === 0 && gType === 'All' && !q ? ' feat' : ''}" data-a="${i}" style="--h:${a.h}"><span class="cov">${(a.thumbs[0] || a.photos[0]) ? `<img src="${a.thumbs[0] || a.photos[0]}" alt="" loading="lazy" decoding="async">` : '[Cover photo]'}${a.isNew ? '<span class="new">New</span>' : ''}${a.sample ? '<span class="new" style="background:var(--violet)">Sample</span>' : ''}<span class="cnt">${a.photos.length ? a.photos.length + (a.photos.length === 1 ? ' photo' : ' photos') : '12 photos'}</span></span><span class="meta"><b>${esc(a.title)}</b><span class="sub">${esc(a.inst)}</span><span class="sub">${esc(a.type)} · ${esc(a.when)}</span></span></button>`).join('');
    const e = $('#gEmpty'); e.hidden = list.length > 0;
    e.textContent = ALBUMS.length ? 'No albums match that yet. Try another type or search.' : (gInfo.error ? 'We could not load the albums just now. Please refresh in a moment.' : 'The first albums are on their way. Check back soon.');
    $$('[data-t]', gTypeEl).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.t === gType)));
    if (!reduce && gGrid.animate) $$('.alb', gGrid).forEach((c, k) => c.animate([{ opacity: 0, transform: 'translateY(18px) scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: 520, delay: k * 55, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }));
  }
  gTypeEl.addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (!b) return; gType = b.dataset.t; renderAlbums(); });
  gQ.addEventListener('input', renderAlbums);
  // lightbox
  const lb = $('#lb'); document.body.appendChild(lb); let lbA = null, lbI = 0, lbFrom = null;
  function lbRender() {
    const a = ALBUMS[lbA], n = Math.max(1, a.photos.length);
    $('#lbTitle').innerHTML = `${esc(a.title)}<span>${esc(a.inst)} · ${esc(a.type)} · ${esc(a.when)}</span>`;
    $('#lbStage').innerHTML = a.photos.length ? `<img src="${a.photos[lbI]}" alt="Photo ${lbI + 1} of ${a.photos.length} from ${esc(a.title)}">` : '<div class="lb-ph">[Photos from this program]</div>';
    $('#lbCount').textContent = `${lbI + 1} / ${n}`;
    $('#lbPrev').disabled = $('#lbNext').disabled = n < 2;
    const img = $('#lbStage img'); if (img && !reduce && img.animate) img.animate([{ opacity: 0, transform: 'scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: 'ease-out' });
  }
  function lbOpen(i, from) { lbA = i; lbI = 0; lbFrom = from; lb.hidden = false; try { history.replaceState(null, '', '#album-' + encodeURIComponent(ALBUMS[i].id)); } catch (e) {} document.body.style.overflow = 'hidden'; lbRender(); $('#lbClose').focus(); }
  function lbClose() { lb.hidden = true; try { history.replaceState(null, '', location.pathname); } catch (e) {} document.body.style.overflow = ''; if (lbFrom) lbFrom.focus(); }
  const lbStep = d => { const n = ALBUMS[lbA].photos.length; if (n < 2) return; lbI = (lbI + d + n) % n; lbRender(); };
  gGrid.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b) lbOpen(+b.dataset.a, b); });
  $('#lbClose').addEventListener('click', lbClose); $('#lbPrev').addEventListener('click', () => lbStep(-1)); $('#lbNext').addEventListener('click', () => lbStep(1));
  lb.addEventListener('click', e => { if (e.target === lb) lbClose(); });
  document.addEventListener('keydown', e => { if (lb.hidden) return; if (e.key === 'Escape') lbClose(); if (e.key === 'ArrowLeft') lbStep(-1); if (e.key === 'ArrowRight') lbStep(1); if (e.key === 'Tab') { const f = $$('button:not([disabled])', lb); if (!f.length) return; const first = f[0], last = f[f.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } } });
  const openFromHash = () => { const m = /^#album-(.+)$/.exec(location.hash); if (!m || !lb.hidden) return; const i = ALBUMS.findIndex(a => a.id === decodeURIComponent(m[1])); if (i >= 0) lbOpen(i, null); };
  addEventListener('hashchange', openFromHash);
  let firstLoad = true;
  loadAlbums((list, info) => { ALBUMS = list; gInfo = info; renderAlbums(); if (firstLoad) { firstLoad = false; openFromHash(); } });
  }

  /* ---------- Team: a living signature for each member ---------- */
  $$('canvas[data-sig]').forEach(cv => {
    const c = cv.getContext('2d'), kind = cv.dataset.sig, col = cv.dataset.c; let vis = false; visible(cv, v => vis = v);
    const dot = (x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill(); };
    const line = (a, b, d, e) => { c.beginPath(); c.moveTo(a, b); c.lineTo(d, e); c.stroke(); };
    ticks.push((tt) => {
      if (!vis) return; const w = cv.clientWidth, h = cv.clientHeight; if (!w) return;
      if (cv.width !== Math.round(w * PR)) { cv.width = Math.round(w * PR); cv.height = Math.round(h * PR); }
      const t = reduce ? 1.3 : tt, cx = w / 2, cy = h / 2;
      c.setTransform(PR, 0, 0, PR, 0, 0); c.clearRect(0, 0, w, h); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 1.3; c.globalAlpha = .85;
      if (kind === 'orb') {
        [62, 78, 92].forEach((r, i) => { c.setLineDash(i === 1 ? [] : [4, 7]); c.globalAlpha = .75 - i * .18; c.beginPath(); c.ellipse(cx, cy, r, r * (.92 - i * .22), t * (i % 2 ? -.4 : .3), 0, 6.283); c.stroke(); });
        c.setLineDash([]); c.globalAlpha = 1; for (let i = 0; i < 7; i++) { const a = t * (.5 + i * .11) + i * .9, r = 62 + (i % 3) * 15; dot(cx + Math.cos(a) * r, cy + Math.sin(a) * r * .75, 2 + (i % 2)); }
      } else if (kind === 'neural') {
        const L = [3, 4, 4, 3], X = i => cx - 110 + i * 73.3, Y = (n, j) => cy + (j - (n - 1) / 2) * 36;
        c.globalAlpha = .28; for (let i = 0; i < 3; i++) for (let a = 0; a < L[i]; a++) for (let b = 0; b < L[i + 1]; b++) line(X(i), Y(L[i], a), X(i + 1), Y(L[i + 1], b));
        c.globalAlpha = 1; L.forEach((n, i) => { for (let j = 0; j < n; j++) dot(X(i), Y(n, j), 3.2 + 1.6 * Math.sin(t * 2.2 + i * 1.3 + j)); });
        for (let k = 0; k < 5; k++) { const p = (t * .45 + k * .2) % 1, i = Math.min(2, Math.floor(p * 3)), f = p * 3 - i, a = (k * 2) % L[i], b = (k * 3 + 1) % L[i + 1]; c.fillStyle = '#F4F2FF'; dot(lerp(X(i), X(i + 1), f), lerp(Y(L[i], a), Y(L[i + 1], b), f), 2.2); c.fillStyle = col; }
      } else if (kind === 'cube') {
        const V = []; for (let i = 0; i < 8; i++) V.push([(i & 1 ? 1 : -1), (i & 2 ? 1 : -1), (i & 4 ? 1 : -1)]);
        const P = V.map(([x, y, z]) => { const a = t * .6, b = t * .4; let x1 = x * Math.cos(a) - z * Math.sin(a), z1 = x * Math.sin(a) + z * Math.cos(a), y1 = y * Math.cos(b) - z1 * Math.sin(b); z1 = y * Math.sin(b) + z1 * Math.cos(b); const s = 46 / (3.2 + z1) * 3; return [cx + x1 * s, cy + y1 * s]; });
        for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) { const d = i ^ j; if (d === 1 || d === 2 || d === 4) line(P[i][0], P[i][1], P[j][0], P[j][1]); }
        P.forEach(p => dot(p[0], p[1], 2.4)); c.globalAlpha = .3; c.beginPath(); c.ellipse(cx, cy + 78, 90, 12, 0, 0, 6.283); c.stroke();
      } else if (kind === 'mocap') {
        const sw = Math.sin(t * 2.4), J = { head: [0, -64], neck: [0, -44], hip: [0, 8], lh: [-34 - sw * 8, -62 - sw * 10], le: [-26, -34], rh: [40, -6 + sw * 14], re: [26, -26], lk: [-14, 40 + sw * 4], lf: [-20 - sw * 10, 74], rk: [14, 40 - sw * 4], rf: [20 + sw * 10, 74] };
        const q = k => [cx + 112 + J[k][0] * .9, cy + 2 + J[k][1] * .9];
        [['neck', 'hip'], ['neck', 'le'], ['le', 'lh'], ['neck', 're'], ['re', 'rh'], ['hip', 'lk'], ['lk', 'lf'], ['hip', 'rk'], ['rk', 'rf']].forEach(([a, b]) => { const A = q(a), B = q(b); line(A[0], A[1], B[0], B[1]); });
        c.beginPath(); c.arc(q('head')[0], q('head')[1], 12, 0, 6.283); c.stroke();
        c.fillStyle = '#F4F2FF'; Object.keys(J).forEach(k => { if (k !== 'head') dot(q(k)[0], q(k)[1], 3); }); c.fillStyle = col;
        c.globalAlpha = .3; c.setLineDash([3, 5]); for (let i = -3; i <= 3; i++) line(cx + i * 44, cy - 84, cx + i * 44, cy + 86); c.setLineDash([]); c.globalAlpha = .8; const sw2 = Math.sin(t * 2.4 + 1.2); [[-112, -50 + sw2 * 8], [-96, -8], [-124, 20 - sw2 * 6], [-104, 56 + sw2 * 6]].forEach(m => { c.beginPath(); c.arc(cx + m[0], cy + m[1], 5, 0, 6.283); c.stroke(); dot(cx + m[0], cy + m[1], 1.6); });
      } else if (kind === 'flow') {
        const N = 6, pts = []; for (let i = 0; i < N; i++) { const a = i / N * 6.283 + t * .25; pts.push([cx + Math.cos(a) * 96, cy + Math.sin(a) * 62]); }
        c.globalAlpha = .35; pts.forEach((p, i) => { line(cx, cy, p[0], p[1]); const n = pts[(i + 1) % N]; line(p[0], p[1], n[0], n[1]); });
        c.globalAlpha = 1; pts.forEach((p, i) => { c.strokeRect(p[0] - 9, p[1] - 9, 18, 18); const f = (t * .5 + i / N) % 1; dot(lerp(cx, p[0], f), lerp(cy, p[1], f), 2.2); });
      } else {
        const step = Math.floor(t * 1.6), W2 = '#F4F2FF';
        // controller body around the photo
        c.globalAlpha = .45; c.beginPath(); c.moveTo(cx - 150, cy - 46); c.lineTo(cx + 150, cy - 46); c.quadraticCurveTo(cx + 176, cy - 40, cx + 170, cy + 30); c.quadraticCurveTo(cx + 160, cy + 76, cx + 118, cy + 62); c.lineTo(cx - 118, cy + 62); c.quadraticCurveTo(cx - 160, cy + 76, cx - 170, cy + 30); c.quadraticCurveTo(cx - 176, cy - 40, cx - 150, cy - 46); c.stroke();
        // d-pad, one direction lit at a time
        const dx = cx - 112, dy = cy + 6, dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        c.globalAlpha = 1; c.strokeRect(dx - 8, dy - 8, 16, 16);
        dirs.forEach(([a, b], k) => { const on = step % 4 === k; c.fillStyle = on ? W2 : col; c.globalAlpha = on ? 1 : .55; c.fillRect(dx - 7 + a * 17, dy - 7 + b * 17, 14, 14); });
        // four buttons, lit in sequence
        const bx = cx + 112, by = cy + 6;
        dirs.forEach(([a, b], k) => { const on = (step + 2) % 4 === k; c.globalAlpha = 1; c.fillStyle = on ? W2 : col; c.beginPath(); c.arc(bx + a * 19, by + b * 19, on ? 8 : 6.5, 0, 6.283); on ? c.fill() : c.stroke(); });
        // pixel invaders marching across the top
        c.fillStyle = col; const mv = Math.sin(t * 1.1) * 26, px = 3.2, sprite = ['01000010', '00111100', '01011010', '11111111', '10100101'];
        for (let n = -2; n <= 2; n++) { if (n === 0) continue; const ox = cx + n * 62 + mv - 12, oy = cy - 84 + (step % 2 ? 2 : 0); c.globalAlpha = .9; sprite.forEach((row, r) => [...row].forEach((v, q) => { if (v === '1') c.fillRect(ox + q * px, oy + r * px, px - .4, px - .4); })); }
        // scrolling ground
        c.globalAlpha = .5; c.setLineDash([10, 8]); c.lineDashOffset = -t * 30; line(cx - 150, cy + 84, cx + 150, cy + 84); c.setLineDash([]); c.lineDashOffset = 0; c.fillStyle = col;
      }
      c.globalAlpha = 1;
    });
  });

  /* ---------- Trusted by: the magic map (driven by this list) ---------- */
  if ($('#tMap')) {
  const PARTNERS = [
    { name: 'Woxsen University', city: 'Hyderabad', lat: 17.385, lon: 78.487, what: 'Industry Expert – Academic Program' },
    { name: 'Thiagarajar College of Engineering', city: 'Madurai', lat: 9.925, lon: 78.12, what: 'Industry Expert – Academic Program' },
    { name: 'PERI Institute of Technology', city: 'Chennai', lat: 13.083, lon: 80.27, what: 'Training Program Engagement' },
    { name: 'B. S. Abdur Rahman Crescent Institute of Science and Technology', city: 'Chennai', lat: 13.083, lon: 80.27, short: 'B. S. Abdur Rahman Crescent Institute', what: 'Workshop Engagement' },
    { name: 'Sathyabama Institute of Science and Technology', city: 'Chennai', lat: 13.083, lon: 80.27, what: 'Workshop Engagement' },
    { name: 'Touchmark Descience Pvt Ltd', city: 'Chennai', lat: 13.083, lon: 80.27, what: 'XR Technology & Training Partner' },
    { name: 'OriginBI Mindworks', city: 'Chennai', lat: 13.083, lon: 80.27, what: 'XR Technology Support Partner' },
    { name: 'Descience Open Source Club (DOS Club)', city: 'Chennai', lat: 13.083, lon: 80.27, what: 'Industry Training Partner' },
    { name: 'Destinspark', city: 'Chennai', lat: 13.083, lon: 80.27, what: 'VR Event Visualization Partner' }
  ];
  (() => {
    const svg = $('#tMap'), names = $('#tNames'), pills = $('#tPills');
    const X = lon => (lon - 68.1) * 20.887, merc = lat => Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)), Y = lat => (0.698 - merc(lat)) * 1199.5;
    const cities = []; PARTNERS.filter(p => p.lat != null).forEach(p => { let c = cities.find(k => k.city === p.city); if (!c) { c = { city: p.city, x: X(p.lon), y: Y(p.lat), items: [] }; cities.push(c); } c.items.push(p); });
    cities.sort((a, b) => a.y - b.y);
    const initials = n => n.replace(/\(.*?\)/g, '').split(/\s+/).filter(w => /^[A-Za-z]/.test(w) && !/^(of|and|the|Pvt|Ltd)$/i.test(w)).slice(0, 3).map(w => w[0].toUpperCase()).join('');
    $('#trH').textContent = `Trusted by ${PARTNERS.length} institutions and organisations in ${cities.length} ${cities.length === 1 ? 'city' : 'cities'}.`;
    const wide = () => innerWidth > 860;
    let h = $('#indiaPath').textContent.split('|').map(d => `<path class="tmap-land" d="${d}"/>`).join('');
    for (let i = 0; i < cities.length - 1; i++) { const a = cities[i], b = cities[i + 1], mx = (a.x + b.x) / 2 + (b.y - a.y) * .25, my = (a.y + b.y) / 2 - (b.x - a.x) * .25; h += `<path class="ttrail" d="M${a.x.toFixed(1)} ${a.y.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}"/>`; }
    h += '<g class="tbloom" id="tBloom"></g>';
    cities.forEach((c, i) => { h += `<g class="tpin" data-c="${i}" tabindex="0" role="button" aria-label="${esc(c.city)}: ${c.items.map(p => esc(p.name)).join(', ')}"><circle class="halo" cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="9" style="animation-delay:${(i * .5).toFixed(1)}s"/><circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="18" fill="transparent"/><circle class="core" cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="${(5 + Math.min(4, c.items.length)).toFixed(0)}"/><text x="${(c.x - 14).toFixed(1)}" y="${(c.y + 5).toFixed(1)}" text-anchor="end">${esc(c.city)}</text></g>`; });
    svg.innerHTML = h;
    pills.innerHTML = cities.map((c, i) => `<button type="button" class="pill" data-c="${i}" aria-pressed="false">${esc(c.city)} · ${c.items.length}</button>`).join('');
    const bloom = $('#tBloom'); let cur = -1, auto = true;
    const fit = () => svg.setAttribute('viewBox', wide() ? '-10 -10 1210 716' : '-10 -10 632 716');
    const logo = (p, cx, cy) => p.logo ? `<clipPath id="lc${cx | 0}${cy | 0}"><circle cx="${cx}" cy="${cy}" r="17"/></clipPath><circle class="lg" cx="${cx}" cy="${cy}" r="18"/><image href="${p.logo}" x="${cx - 17}" y="${cy - 17}" width="34" height="34" clip-path="url(#lc${cx | 0}${cy | 0})" preserveAspectRatio="xMidYMid meet"/>` : `<circle class="lg" cx="${cx}" cy="${cy}" r="18"/><text class="in" x="${cx}" y="${cy + 4}" text-anchor="middle">${esc(initials(p.name))}</text>`;
    let walkTo = () => {};
    function pick(i) {
      if (i === cur) return; cur = i; const c = cities[i];
      $$('.tpin', svg).forEach(g => g.classList.toggle('on', +g.dataset.c === i));
      $$('[data-c]', pills).forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.c === i)));
      const n = c.items.length, gap = 62, x0 = 700, y0 = clamp(c.y - (n - 1) * gap / 2, 44, 696 - (n - 1) * gap - 44);
      bloom.innerHTML = c.items.map((p, k) => { const y = y0 + k * gap, w = Math.min(500, 78 + Math.max((p.short || p.name).length * 9.6, (p.what || '').length * 6.8)), d = (k * .08).toFixed(2);
        return `<path class="tray" pathLength="1" style="animation-delay:${d}s" d="M${(c.x + 8).toFixed(1)} ${c.y.toFixed(1)} C${(c.x + (x0 - c.x) * .5).toFixed(1)} ${c.y.toFixed(1)}, ${(x0 - (x0 - c.x) * .45).toFixed(1)} ${y}, ${x0} ${y}"/><g class="tchip" style="animation-delay:${(k * .08 + .25).toFixed(2)}s"><rect x="${x0}" y="${y - 25}" width="${w.toFixed(0)}" height="50" rx="25"/>${logo(p, x0 + 26, y)}<text x="${x0 + 54}" y="${p.what ? y - 2 : y + 6}">${esc(p.short || p.name)}</text>${p.what ? `<text class="sub" x="${x0 + 54}" y="${y + 15}">${esc(p.what)}</text>` : ''}</g>`; }).join('');
      names.innerHTML = c.items.map(p => `<div class="tname"><span class="lg">${p.logo ? `<img src="${p.logo}" alt="">` : esc(initials(p.name))}</span><span><b>${esc(p.name)}</b>${p.what ? `<span class="sub">${esc(p.what)}</span>` : ''}</span></div>`).join('');
      walkTo(i);
    }
    const user = e => { const t = e.target.closest('[data-c]'); if (t) { auto = false; pick(+t.dataset.c); } };
    ['pointerover', 'focusin', 'click'].forEach(ev => svg.addEventListener(ev, user)); pills.addEventListener('click', user);
    addEventListener('resize', fit); fit();
    pick(Math.max(0, cities.findIndex(c => c.items.length === Math.max(...cities.map(k => k.items.length)))));
    /* The 3D mascot roams the yellow-marked heartland of the map on its own and does little animations */
    (() => {
      const stage = svg.parentElement; stage.style.position = 'relative';
      const w = document.createElement('div'); w.className = 'walker is3d'; w.setAttribute('aria-hidden', 'true');
      w.innerHTML = '<div class="walker-say" hidden></div><canvas class="walker-cv"></canvas>';
      stage.appendChild(w);
      const say = w.querySelector('.walker-say'), cv = w.querySelector('canvas');
      let gl = null;
      try {
        const T = window.THREE; const renderer = new T.WebGLRenderer({ canvas: cv, alpha: true, antialias: true }); renderer.setClearColor(0, 0);
        const scene = new T.Scene(), cam = new T.PerspectiveCamera(30, 1 / 1.2, .1, 60); cam.position.set(0, 2.1, 11.5); cam.lookAt(0, 1.75, 0);
        scene.add(new T.HemisphereLight(0xcfe0ff, 0x3a2070, 1.05)); const dl = new T.DirectionalLight(0xffffff, .95); dl.position.set(3, 5, 6); scene.add(dl);
        const rim = new T.DirectionalLight(0x8b5cf6, .6); rim.position.set(-4, 3, -4); scene.add(rim);
        const wz = buildWizard(T); wz.orbLight.position.set(0, 1.8, 1.4); wz.root.add(wz.orbLight); scene.add(wz.root);
        gl = { renderer, scene, cam, wz, W: 0, H: 0 };
      } catch (e) { gl = null; }
      if (!gl) { w.classList.remove('is3d'); w.innerHTML = '<div class="walker-say" hidden></div><div class="walker-in">' + AV(true) + '</div>'; }
      const say2 = w.querySelector('.walker-say'), inner = w.querySelector('.walker-in');
      const vb = () => svg.viewBox.baseVal;
      const place = (x, y) => { const v = vb(); w.style.left = ((x - v.x) / v.width * 100).toFixed(2) + '%'; w.style.top = ((y - v.y) / v.height * 100).toFixed(2) + '%'; };
      // the yellow-marked region (map coordinates)
      const POLY = [[144, 57], [179, 50], [207, 72], [211, 132], [241, 192], [279, 232], [309, 254], [374, 254], [409, 277], [419, 332], [419, 372], [379, 407], [329, 437], [279, 444], [229, 445], [129, 427], [89, 410], [67, 362], [67, 317], [79, 262], [99, 217], [129, 172], [129, 102]];
      const inside = (x, y) => { let c = false; for (let i = 0, j = POLY.length - 1; i < POLY.length; j = i++) { const [xi, yi] = POLY[i], [xj, yj] = POLY[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
      const okPt = (x, y) => inside(x, y) && inside(x - 14, y) && inside(x + 14, y) && inside(x, y - 12) && inside(x, y + 12);
      const rnd = (a, b) => a + Math.random() * (b - a);
      const clearLine = (a, b) => { for (let k = 0; k <= 12; k++) { const t = k / 12; if (!okPt(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return false; } return true; };
      const target = from => { for (let i = 0; i < 60; i++) { const p = { x: rnd(60, 425), y: rnd(60, 445) }; if (okPt(p.x, p.y) && Math.hypot(p.x - from.x, p.y - from.y) > 50 && clearLine(from, p)) return p; } return { x: from.x, y: from.y }; };
      const ACTS = [['wave', 2600, ['Hello!', 'Hi there!']], ['jump', 2200, ['Whee!']], ['dance', 3600, ['See the magic!', 'Be the magic!']], ['cheer', 2200, ['Yay!']], ['spell', 3000, ['Abracadabra!']], ['look', 2600, []], ['look', 2400, []]];
      const pos = { x: 250, y: 330 }; let spd = 0, run = 0, dest = target(pos), mode = 'walk', act = 'idle', actStart = 0, until = 0, sayT = 0, last = performance.now(), vx = 0, vy = 1, since = 0;
      place(pos.x, pos.y);
      const startAct = now => {
        const a = ACTS[Math.floor(Math.random() * ACTS.length)];
        mode = 'act'; act = a[0]; actStart = now; until = now + a[1]; w.className = 'walker' + (gl ? ' is3d' : '') + ' act-' + a[0];
        if (a[2].length) { say2.textContent = a[2][Math.floor(Math.random() * a[2].length)]; say2.hidden = false; clearTimeout(sayT); sayT = setTimeout(() => { say2.hidden = true; }, a[1] - 300); }
      };
      const size = () => { const cw = Math.round(cv.clientWidth), ch = Math.round(cv.clientHeight), pr = Math.min(devicePixelRatio || 1, 2); if (gl && (gl.W !== cw || gl.H !== ch) && cw > 0) { gl.W = cw; gl.H = ch; gl.renderer.setPixelRatio(pr); gl.renderer.setSize(cw, ch, false); gl.cam.aspect = cw / ch; gl.cam.updateProjectionMatrix(); } };
      const frame = now => {
        requestAnimationFrame(frame);
        const dt = Math.min(.1, (now - last) / 1000); last = now;
        if (!vis || current !== 'home') return;
        if (reduce) { if (gl) { size(); gl.wz.update(now / 1000, 0, { walking: false, act: 'idle', actT: 0, vx: 0, vy: 1 }); gl.renderer.render(gl.scene, gl.cam); } return; }
        let walking = false;
        spd = mode === 'walk' ? Math.min(1, spd + dt * 2.2) : 0;
        if (mode === 'walk') {
          const dx = dest.x - pos.x, dy = dest.y - pos.y, d = Math.hypot(dx, dy), sp = (wide() ? 70 : 46) * (1 + run * 1.25) * Math.min(1, spd) * dt;
          if (d < sp + 1) startAct(now);
          else if (d < 38 && (spd = Math.min(spd, .35 + d / 60), false)) {}
          else { pos.x += dx / d * sp; pos.y += dy / d * sp; place(pos.x, pos.y); vx = dx / d; vy = dy / d; walking = true; if (!w.classList.contains('walking')) w.className = 'walker' + (gl ? ' is3d' : '') + ' walking'; }
        } else if (now > until) { say2.hidden = true; mode = 'walk'; dest = target(pos); run = Math.random() < .5 ? 1 : 0; w.className = 'walker' + (gl ? ' is3d' : '') + ' walking'; act = 'idle'; }
        if (gl) { size(); gl.wz.update(now / 1000, dt, { walking, run, act: mode === 'act' ? act : 'idle', actT: (now - actStart) / 1000, vx, vy }); gl.renderer.render(gl.scene, gl.cam); }
        else if (inner) inner.style.transform = walking ? 'scaleX(' + (vx >= 0 ? 1 : -1) + ')' : '';
      };
      requestAnimationFrame(frame);
    })();

    let vis = false; visible(svg, v => vis = v);
    if (!reduce) setInterval(() => { if (auto && vis && current === 'home') pick((cur + 1) % cities.length); }, 6500);
  })();
  }

  /* ---------- ImmersiTest readout (illustration) ---------- */
  if ($('#fps')) {
  const fc = $('#fps'), fx = fc.getContext('2d'), fv = $('#fpsVal'); const hist = Array.from({ length: 90 }, () => 72);
  let fVis = true, fLast = 0; visible(fc, s => fVis = s);
  ticks.push((t) => {
    if (!fVis || t - fLast < (reduce ? 9e9 : .08)) { if (fLast) return; }
    fLast = t;
    const dip = Math.random() < .03 ? -9 * Math.random() : 0;
    hist.push(clamp(72 + (Math.random() - .5) * 2.4 + dip, 55, 75)); hist.shift();
    const w = fc.clientWidth, h = fc.clientHeight; if (fc.width !== w * PR) { fc.width = w * PR; fc.height = h * PR; }
    fx.setTransform(PR, 0, 0, PR, 0, 0); fx.clearRect(0, 0, w, h);
    const Y = v => h - ((v - 54) / 22) * h;
    fx.strokeStyle = 'rgba(167,139,250,.5)'; fx.setLineDash([3, 4]); fx.beginPath(); fx.moveTo(0, Y(72)); fx.lineTo(w, Y(72)); fx.stroke(); fx.setLineDash([]);
    fx.strokeStyle = '#22D3EE'; fx.lineWidth = 1.6; fx.beginPath(); hist.forEach((v, i) => { const x = i / (hist.length - 1) * w; i ? fx.lineTo(x, Y(v)) : fx.moveTo(x, Y(v)); }); fx.stroke();
    fv.textContent = hist[hist.length - 1].toFixed(1);
  });
  }

  /* ---------- Gallery ring (same albums as the Gallery page) ---------- */
  if ($('#ringStage')) {
  const rs = $('#ringStage'), ringEl = $('#ring');
  let albums = $$('.album', ringEl), n = albums.length;
  let ringR = 300, angle = 0, extra = 0, gVis = true, rd = null;
  function layoutRing() { const w = albums[0].offsetWidth; ringR = Math.round((w / 2) / Math.tan(Math.PI / n)) + (innerWidth < 600 ? 50 : 140); albums.forEach((c, i) => c.style.transform = `rotateY(${i * 360 / n}deg) translateZ(${ringR}px)`); }
  function buildRing(list) {
    const real = list.slice(0, 8), total = Math.max(6, real.length);
    ringEl.innerHTML = Array.from({ length: total }, (_, i) => {
      const a = real[i];
      if (!a) return `<a class="album" href="/gallery/" data-portal="Gallery" style="--h:${(i * 57) % 360}"><div class="art">[Next album]</div><div class="meta"><b>Coming soon</b><span>Wizardlenz XR Studio</span></div></a>`;
      const src = a.thumbs[0] || a.photos[0];
      return `<a class="album" href="/gallery/#album-${encodeURIComponent(a.id)}" data-portal="Gallery" style="--h:${a.h}"><div class="art">${src ? `<img src="${src}" alt="" loading="lazy" decoding="async">` : '[Album cover photo]'}</div><div class="meta"><b>${esc(a.title)}</b><span>${esc(a.inst)} · ${esc(a.type)}</span></div></a>`;
    }).join('');
    albums = $$('.album', ringEl); n = albums.length; layoutRing();
  }
  loadAlbums(list => { if (list.length) buildRing(list); });
  layoutRing(); addEventListener('resize', layoutRing);
  visible(rs, s => gVis = s);
  rs.addEventListener('pointerdown', e => { if (e.target.closest('a') && e.pointerType !== 'mouse') return; rd = e.clientX; });
  addEventListener('pointermove', e => { if (rd === null) return; extra += (e.clientX - rd) * .35; rd = e.clientX; });
  addEventListener('pointerup', () => rd = null);
  $('#ringPrev').addEventListener('click', () => extra += 360 / n);
  $('#ringNext').addEventListener('click', () => extra -= 360 / n);
  ticks.push(() => {
    if (!gVis) return;
    const b = rs.getBoundingClientRect(), p = clamp((innerHeight - b.top) / (innerHeight + b.height), 0, 1);
    const target = (reduce ? 0 : -p * 200) + extra;
    angle = reduce ? target : lerp(angle, target, .08);
    ringEl.style.transform = `translateZ(${-ringR}px) rotateY(${angle}deg)`;
    albums.forEach((c, i) => { const rel = (angle + i * 360 / n) * Math.PI / 180; c.style.opacity = (.3 + .7 * Math.max(0, Math.cos(rel))).toFixed(3); c.style.zIndex = Math.round(100 * Math.cos(rel)) + 100; });
  });
  }

  /* ---------- Text decode ("spell-casting") ---------- */
  const GLYPHS = 'ΛΞΔΣΠΦΨΩ◇△□⌬✦01<>/';
  function decode(el) {
    if (reduce || el.dataset.done) return; el.dataset.done = '1';
    const txt = el.textContent, len = txt.length, start = performance.now(), dur = Math.min(1300, 26 * len + 500);
    el.setAttribute('aria-label', txt);
    (function step(now) {
      const p = (now - start) / dur; let out = '';
      for (let i = 0; i < len; i++) { const ch = txt[i]; out += (ch === ' ' || p > (i / len) * .75 + .25) ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0]; }
      el.textContent = p < 1 ? out : txt; if (p < 1) requestAnimationFrame(step);
    })(start);
  }
  if ($('#heroH')) decode($('#heroH'));
  const once = (els, fn, margin = '0px 0px 10% 0px') => { const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { fn(en.target); io.unobserve(en.target); } }), { rootMargin: margin }); els.forEach(e => io.observe(e)); };
  once($$('[data-decode]'), decode);

  /* ---------- Count-up ---------- */
  once($$('[data-count]'), el => {
    if (reduce) return; const end = +el.dataset.count, suf = el.dataset.suffix || '', st = performance.now();
    (function f(now) { const k = clamp((now - st) / 1400, 0, 1), e = 1 - Math.pow(1 - k, 4); el.textContent = Math.round(end * e).toLocaleString('en-US') + suf; if (k < 1) requestAnimationFrame(f); })(st);
  });

  /* ---------- Formats: spell-card fan-out ---------- */
  if ($('#formats')) {
  once([$('#formats')], box => {
    if (reduce || !box.animate) return;
    const cards = $$('.fmt', box), f = cards[0].getBoundingClientRect();
    cards.forEach((c, i) => { const r = c.getBoundingClientRect(); c.animate([{ transform: `translate(${f.left - r.left}px, ${f.top - r.top + 24}px) rotate(${(i - 2) * 7}deg)`, opacity: .4 }, { transform: 'none', opacity: 1 }], { duration: 950, delay: 120 + i * 70, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }); });
  });
  }

  /* ---------- Studio icons draw in ---------- */
  once($$('.svc'), card => { if (reduce) return; $$('.draw', card).forEach((p, i) => p.animate([{ strokeDasharray: '1', strokeDashoffset: '1' }, { strokeDasharray: '1', strokeDashoffset: '0' }], { duration: 1100, delay: i * 250, easing: 'ease-out' })); });

  /* ---------- Tilt, spotlight, magnetic, cursor ---------- */
  if (fine && !reduce) {
    $$('.tilt').forEach(el => {
      el.addEventListener('pointermove', e => { const b = el.getBoundingClientRect(), x = (e.clientX - b.left) / b.width, y = (e.clientY - b.top) / b.height; el.style.transform = `perspective(1000px) rotateX(${(.5 - y) * 8}deg) rotateY(${(x - .5) * 10}deg)`; el.style.setProperty('--gx', x * 100 + '%'); el.style.setProperty('--gy', y * 100 + '%'); });
      el.addEventListener('pointerleave', () => el.style.transform = '');
    });
    $$('.mag').forEach(el => {
      el.addEventListener('pointermove', e => { const b = el.getBoundingClientRect(); el.style.transform = `translate(${(e.clientX - b.left - b.width / 2) * .22}px, ${(e.clientY - b.top - b.height / 2) * .3}px)`; });
      el.addEventListener('pointerleave', () => el.style.transform = '');
    });
    const cur = $('#cursor'); cur.hidden = false; let cxp = ptr.x, cyp = ptr.y;
    document.addEventListener('pointerover', e => cur.classList.toggle('big', !!e.target.closest('a,button,.tilt,#ringStage,#headStage,select,input,textarea')));
    ticks.push(() => { cxp = lerp(cxp, ptr.x, .22); cyp = lerp(cyp, ptr.y, .22); cur.style.transform = `translate(${cxp}px, ${cyp}px)`; });
    // CTA letters lean toward the pointer
    const th = $('#talkH'); if (th) {
    const txt = th.textContent; th.setAttribute('aria-label', txt);
    th.innerHTML = [...txt].map(c => c === ' ' ? ' ' : `<span aria-hidden="true">${c}</span>`).join('');
    const letters = $$('span', th), talk = th.closest('.talk');
    talk.addEventListener('pointermove', e => letters.forEach(s => { const b = s.getBoundingClientRect(), dx = e.clientX - (b.left + b.width / 2), dy = e.clientY - (b.top + b.height / 2), d = Math.hypot(dx, dy); const f = Math.max(0, 1 - d / 220); s.style.transform = `translate(${dx * f * .12}px, ${dy * f * .12}px) rotate(${dx * f * .04}deg)`; }));
    talk.addEventListener('pointerleave', () => letters.forEach(s => s.style.transform = ''));
    }
  }
  $$('.spot').forEach(el => el.addEventListener('pointermove', e => { const b = el.getBoundingClientRect(); el.style.setProperty('--mx', e.clientX - b.left + 'px'); el.style.setProperty('--my', e.clientY - b.top + 'px'); }));

  /* ---------- Form ---------- */
  if ($('#enq')) {
    const enq = $('#enq'), note = $('#formNote');
    try { const pf = JSON.parse(sessionStorage.getItem('wlz-prefill') || 'null'); if (pf) { $('#fWho').value = pf.who; $('#fMsg').value = pf.msg; sessionStorage.removeItem('wlz-prefill'); } } catch (err) {}
    const ENDPOINT = document.documentElement.dataset.formEndpoint || '';
    enq.addEventListener('submit', async e => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(enq).entries());
      if (!d.name || !d.email || !d.msg) { note.textContent = 'Please add your name, email and a short message.'; return; }
      if (ENDPOINT) {
        note.textContent = 'Sending...';
        try {
          const r = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(d) });
          if (!r.ok) throw new Error('bad status');
          enq.reset(); note.textContent = 'Thank you. We will reply soon.';
        } catch (err) { note.textContent = 'Could not send. Please email inquiry@wizardlenzxrstudio.com.'; }
        return;
      }
      const body = `Name: ${d.name}\nOrganisation: ${d.org || ''}\nPhone: ${d.phone || ''}\nReaching out as: ${d.who}\n\n${d.msg}`;
      location.href = 'mailto:inquiry@wizardlenzxrstudio.com?subject=' + encodeURIComponent('Enquiry from ' + d.name) + '&body=' + encodeURIComponent(body);
      note.textContent = 'Your email app should open with the message ready. If not, write to inquiry@wizardlenzxrstudio.com.';
    });
  }

  /* ---------- Studio service visuals: 3D scenes (2D drawings below are the fallback) ---------- */
  function init3D(cv, kind) {
    let r; try { r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, powerPreference: 'low-power' }); } catch (e) { return false; }
    r.setPixelRatio(PR);
    const sc = buildScene(THREE, kind, 2.8); let vis = false, w = 0, h = 0, tx = 0, ty = 0, sx = 0, sy = 0;
    visible(cv, v => vis = v);
    const host = cv.parentElement;
    host.addEventListener('pointermove', e => { const b = cv.getBoundingClientRect(); tx = clamp((e.clientX - b.left) / b.width * 2 - 1, -1, 1); ty = clamp((e.clientY - b.top) / b.height * 2 - 1, -1, 1); });
    host.addEventListener('pointerleave', () => { tx = ty = 0; });
    ticks.push(t => {
      if (!vis) return; const cw = cv.clientWidth, ch = cv.clientHeight; if (!cw) return;
      if (cw !== w || ch !== h) { w = cw; h = ch; r.setSize(w, h, false); sc.camera.aspect = w / h; sc.camera.updateProjectionMatrix(); }
      sx = lerp(sx, tx, .08); sy = lerp(sy, ty, .08);
      sc.update(reduce ? 1.6 : t, sx, sy); r.render(sc.scene, sc.camera);
    });
    return true;
  }
  /* ---------- Studio service visuals ---------- */
  $$('canvas[data-svc]').forEach(cv => {
    if (ok3d && init3D(cv, cv.dataset.svc)) return;
    const c = cv.getContext('2d'), kind = cv.dataset.svc; let vis = false; visible(cv, v => vis = v);
    const dot = (x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill(); };
    const line = (a, b, d, e) => { c.beginPath(); c.moveTo(a, b); c.lineTo(d, e); c.stroke(); };
    const CY = '#22D3EE', VI = '#A78BFA', GO = '#F5B544', WH = '#F4F2FF';
    ticks.push(tt => {
      if (!vis) return; const w = cv.clientWidth, h = cv.clientHeight; if (!w) return;
      if (cv.width !== Math.round(w * PR)) { cv.width = Math.round(w * PR); cv.height = Math.round(h * PR); }
      const t = reduce ? 1.4 : tt, cx = w / 2, cy = h / 2;
      c.setTransform(PR, 0, 0, PR, 0, 0); c.clearRect(0, 0, w, h); c.lineWidth = 1.4; c.setLineDash([]); c.globalAlpha = 1;
      if (kind === 'train') { /* a worker runs a safety task: progress ring and checklist ticking */
        c.strokeStyle = 'rgba(167,139,250,.25)'; c.beginPath(); for (let x = 0; x <= w; x += 18) { line(x, h * .62, cx + (x - cx) * 2.4, h); } for (let y = 0; y < 4; y++) line(0, h * (.62 + y * .1), w, h * (.62 + y * .1)); c.stroke();
        const p = (t * .22) % 1;
        c.strokeStyle = CY; c.globalAlpha = .25; c.beginPath(); c.arc(cx - w * .22, cy, 38, 0, 6.283); c.stroke();
        c.globalAlpha = 1; c.lineWidth = 3; c.beginPath(); c.arc(cx - w * .22, cy, 38, -1.5708, -1.5708 + p * 6.283); c.stroke(); c.lineWidth = 1.4;
        c.fillStyle = WH; c.font = '600 15px ui-monospace,monospace'; c.textAlign = 'center'; c.fillText(Math.round(p * 100) + '%', cx - w * .22, cy + 5);
        for (let i = 0; i < 3; i++) { const y = cy - 30 + i * 30, done = p > (i + 1) / 3.4; c.strokeStyle = done ? CY : 'rgba(244,242,255,.35)'; c.strokeRect(cx + 4, y - 7, 14, 14); if (done) { c.beginPath(); c.moveTo(cx + 7, y); c.lineTo(cx + 11, y + 4); c.lineTo(cx + 16, y - 4); c.stroke(); } c.fillStyle = done ? WH : 'rgba(244,242,255,.4)'; c.fillRect(cx + 28, y - 3, 54 + i * 12, 6); }
      } else if (kind === 'show') { /* a product cube turns with scan corners and a swinging view */
        const V = []; for (let i = 0; i < 8; i++) V.push([(i & 1 ? 1 : -1), (i & 2 ? 1 : -1), (i & 4 ? 1 : -1)]);
        const a = t * .7, b = .5, S = 38;
        const P = V.map(([x, y, z]) => { const x1 = x * Math.cos(a) - z * Math.sin(a), z1 = x * Math.sin(a) + z * Math.cos(a), y1 = y * Math.cos(b) - z1 * Math.sin(b); return [cx + x1 * S, cy + y1 * S]; });
        c.strokeStyle = VI; [[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]].forEach(([i, j]) => line(P[i][0], P[i][1], P[j][0], P[j][1]));
        c.fillStyle = CY; P.forEach(p => dot(p[0], p[1], 2.4));
        c.strokeStyle = CY; const m = 62, L = 14; [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([sx, sy]) => { const x = cx + sx * m * 1.35, y = cy + sy * m * .85; c.beginPath(); c.moveTo(x, y - sy * L); c.lineTo(x, y); c.lineTo(x - sx * L, y); c.stroke(); });
        const sy = cy + Math.sin(t * 1.6) * m * .8; c.globalAlpha = .55; c.strokeStyle = CY; line(cx - m * 1.35, sy, cx + m * 1.35, sy); c.globalAlpha = 1;
      } else if (kind === 'event') { /* stage lights over a crowd of headset wearers */
        for (let i = 0; i < 3; i++) { const lx = w * (.2 + i * .3), sw = Math.sin(t * .9 + i * 2) * 28; const g = c.createLinearGradient(lx, 0, lx + sw, h); g.addColorStop(0, [CY, VI, GO][i] + 'aa'); g.addColorStop(1, 'transparent'); c.fillStyle = g; c.beginPath(); c.moveTo(lx - 3, 0); c.lineTo(lx + 3, 0); c.lineTo(lx + sw + 34, h); c.lineTo(lx + sw - 34, h); c.fill(); }
        c.fillStyle = 'rgba(8,7,26,.9)'; c.strokeStyle = WH; for (let i = 0; i < 9; i++) { const x = w * (.08 + i * .105), y = h - 24 - (i % 2) * 14 + Math.sin(t * 3 + i) * 3; c.beginPath(); c.arc(x, y - 12, 7, 0, 6.283); c.fill(); c.stroke(); c.fillRect(x - 8, y - 14, 16, 5); c.beginPath(); c.moveTo(x - 9, y + 12); c.lineTo(x - 7, y - 4); c.lineTo(x + 7, y - 4); c.lineTo(x + 9, y + 12); c.fill(); c.stroke(); }
      } else { /* a game controller feeds an AI network that answers back */
        const px = cx - w * .24, py = cy;
        c.strokeStyle = CY; c.beginPath(); c.roundRect ? c.roundRect(px - 40, py - 20, 80, 42, 16) : c.rect(px - 40, py - 20, 80, 42); c.stroke();
        c.beginPath(); c.moveTo(px - 24, py - 8); c.lineTo(px - 24, py + 8); c.moveTo(px - 32, py); c.lineTo(px - 16, py); c.stroke();
        c.fillStyle = (Math.floor(t * 2) % 2) ? GO : CY; dot(px + 22, py - 4, 4); c.fillStyle = (Math.floor(t * 2) % 2) ? CY : GO; dot(px + 32, py + 5, 4);
        const L = [2, 3, 2], nx = i => cx + w * .02 + i * 58, ny = (n, j) => py + (j - (n - 1) / 2) * 34;
        c.strokeStyle = VI; c.globalAlpha = .4; for (let i = 0; i < 2; i++) for (let a2 = 0; a2 < L[i]; a2++) for (let b2 = 0; b2 < L[i + 1]; b2++) line(nx(i), ny(L[i], a2), nx(i + 1), ny(L[i + 1], b2)); c.globalAlpha = 1;
        L.forEach((n, i) => { for (let j = 0; j < n; j++) { c.fillStyle = j % 2 ? VI : WH; dot(nx(i), ny(n, j), 3.4 + 1.8 * Math.sin(t * 2.4 + i * 1.4 + j)); } });
        c.strokeStyle = GO; c.setLineDash([4, 5]); c.lineDashOffset = -t * 20; line(px + 46, py, nx(0) - 10, py); c.setLineDash([]);
        c.fillStyle = GO; dot(lerp(px + 46, nx(0) - 10, (t * .6) % 1), py, 3.2);
        c.fillStyle = WH; c.font = '600 11px ui-monospace,monospace'; c.textAlign = 'left'; c.fillText('AI', nx(2) + 14, py + 4);
      }
    });
  });


  /* ---------- External links open in a new tab ---------- */
  $$('a[href^="http"]').forEach(a => { try { if (new URL(a.href).origin !== location.origin) { a.target = '_blank'; a.rel = 'noopener noreferrer'; } } catch (e) {} });

  /* ---------- Trailer plays inside the page ---------- */
  $$('.trailer[data-yt]').forEach(box => {
    const btn = $('.play', box); if (!btn) return;
    btn.addEventListener('click', () => {
      const f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + box.dataset.yt + '?autoplay=1&rel=0&modestbranding=1&playsinline=1';
      f.title = 'The Narrator Lies trailer';
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.allowFullscreen = true; f.loading = 'lazy';
      f.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;border-radius:inherit';
      box.style.transform = 'none'; box.replaceChildren(f);
    });
  });

  /* ---------- One loop ---------- */
  let last = performance.now() / 1000;
  function loop(ms) { const t = ms / 1000, dt = Math.min(.05, t - last); last = t; for (const f of ticks) f(t, dt); requestAnimationFrame(loop); }
  requestAnimationFrame(loop);
})();
