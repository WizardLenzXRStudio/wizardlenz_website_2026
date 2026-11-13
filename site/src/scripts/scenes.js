/* 3D scenes for the four Studio services. Built with three.js (global THREE, r128).
   Each scene returns { scene, camera, update(t, px, py) } where px,py are pointer offsets in -1..1. */
const CY = 0x22d3ee, VI = 0xa78bfa, GO = 0xf5b544, PK = 0xf0abfc, WH = 0xf4f2ff, INK = 0x15132e;

export function buildScene(THREE, kind, aspect) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, aspect, 0.1, 100);
  camera.position.set(0, 1.4, 8.2); camera.lookAt(0, 0, 0);
  scene.add(new THREE.AmbientLight(0x9a8cff, 0.75));
  const key = new THREE.DirectionalLight(0xffffff, 0.95); key.position.set(3, 5, 4); scene.add(key);
  const pc = new THREE.PointLight(CY, 1.4, 14); pc.position.set(-3, 1.5, 3); scene.add(pc);
  const pv = new THREE.PointLight(VI, 1.2, 14); pv.position.set(3, 2, -1); scene.add(pv);

  const std = (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, metalness: 0.35, roughness: 0.38 }, o));
  const glow = (color, o = {}) => new THREE.MeshBasicMaterial(Object.assign({ color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }, o));
  const edges = (geo, color, op = 0.9) => new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color, transparent: true, opacity: op }));
  const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.35, 'rgba(255,255,255,.45)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
  const sprite = (color, s) => { const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); m.scale.set(s, s, 1); return m; };
  const points = (n, fn, color, size) => {
    const pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { const p = fn(i); pos.set(p, i * 3); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return new THREE.Points(g, new THREE.PointsMaterial({ color, size, map: dotTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true }));
  };
  const panelTex = (rows, accent) => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 170; const g = c.getContext('2d');
    g.fillStyle = 'rgba(21,19,46,.92)'; g.fillRect(0, 0, 256, 170); g.strokeStyle = accent; g.lineWidth = 4; g.strokeRect(2, 2, 252, 166);
    rows.forEach((r, i) => { const y = 34 + i * 42; g.strokeStyle = accent; g.lineWidth = 3; g.strokeRect(20, y - 12, 24, 24); if (r.done) { g.beginPath(); g.moveTo(25, y); g.lineTo(31, y + 7); g.lineTo(40, y - 7); g.stroke(); } g.fillStyle = r.done ? '#F4F2FF' : 'rgba(244,242,255,.4)'; g.fillRect(62, y - 5, r.w, 10); });
    return new THREE.CanvasTexture(c);
  };
  const ringFlat = (r0, r1, color, op) => { const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 64), glow(color, { opacity: op, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; return m; };

  /* ---------- 1. Training simulations: a VR headset over a holographic floor, with task panels ---------- */
  if (kind === 'train') {
    camera.position.set(0, 1.6, 6.9); camera.lookAt(0, -.15, 0);
    const grid = new THREE.GridHelper(14, 28, VI, 0x3b3680); grid.position.y = -1.25; grid.material.transparent = true; grid.material.opacity = 0.5; scene.add(grid);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.7, .14, 56), std(0x1f1b4a, { metalness: .6, roughness: .3 })); base.position.y = -1.15; scene.add(base);
    const baseRing = ringFlat(1.35, 1.5, CY, .85); baseRing.position.y = -1.07; scene.add(baseRing);
    const pulse = ringFlat(1.4, 1.46, CY, .6); pulse.position.y = -1.06; scene.add(pulse);
    const hs = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, .82, .95), std(0x2a2560, { metalness: .5, roughness: .28 })); hs.add(body);
    hs.add(edges(new THREE.BoxGeometry(1.7, .82, .95), CY, .55));
    const visor = new THREE.Mesh(new THREE.BoxGeometry(1.52, .6, .06), std(0x0b0a1f, { metalness: .9, roughness: .15 })); visor.position.z = .5; hs.add(visor);
    [-.4, .4].forEach(x => { const l = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .08, 28), glow(CY, { opacity: .95 })); l.rotation.x = Math.PI / 2; l.position.set(x, 0, .55); hs.add(l); const h = sprite(CY, .9); h.position.set(x, 0, .62); hs.add(h); });
    const strap = new THREE.Mesh(new THREE.TorusGeometry(.78, .07, 12, 48, Math.PI), std(0x3b3680)); strap.rotation.set(0, Math.PI / 2, 0); strap.position.set(0, 0, -.25); strap.scale.set(1, 1, 1.0); hs.add(strap);
    hs.position.y = .15; hs.scale.setScalar(1.25); scene.add(hs);
    const panels = [0, 1, 2].map(i => { const rows = [{ done: true, w: 120 }, { done: i > 0, w: 90 }, { done: i > 1, w: 140 }]; const m = new THREE.Mesh(new THREE.PlaneGeometry(1.15, .76), new THREE.MeshBasicMaterial({ map: panelTex(rows, ['#22D3EE', '#A78BFA', '#F5B544'][i]), transparent: true })); scene.add(m); return m; });
    const dust = points(160, i => { const a = Math.random() * 6.283, r = 1.8 + Math.random() * 1.8; return [Math.cos(a) * r, (Math.random() - .3) * 2.4, Math.sin(a) * r * .5]; }, CY, .08); scene.add(dust);
    return { scene, camera, update(t, px, py) {
      hs.rotation.y = Math.sin(t * .6) * .7 + px * .5; hs.rotation.x = py * .2; hs.position.y = .05 + Math.sin(t * 1.4) * .1;
      panels.forEach((m, i) => { const a = t * .45 + i * 2.094; m.position.set(Math.cos(a) * 2.6, .2 + Math.sin(t * .9 + i) * .25 + (i - 1) * .35, Math.sin(a) * 1.1); m.lookAt(camera.position); });
      pulse.scale.setScalar(1 + ((t * .5) % 1) * .9); pulse.material.opacity = .6 * (1 - ((t * .5) % 1));
      dust.rotation.y = t * .08; camera.position.x = px * .6; camera.lookAt(0, -.15, 0);
    } };
  }

  /* ---------- 2. Virtual showrooms and AR product views ---------- */
  if (kind === 'show') {
    camera.position.set(0, 1.3, 6.8); camera.lookAt(0, .05, 0);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.4, .22, 56), std(0x1f1b4a, { metalness: .6, roughness: .3 })); ped.position.y = -1.2; scene.add(ped);
    const pr = ringFlat(1.1, 1.25, VI, .9); pr.position.y = -1.08; scene.add(pr);
    const pulse = ringFlat(1.2, 1.26, CY, .6); pulse.position.y = -1.07; scene.add(pulse);
    const prod = new THREE.Group();
    const knotG = new THREE.TorusKnotGeometry(.62, .21, 160, 18);
    prod.add(new THREE.Mesh(knotG, std(0x7c5cff, { metalness: .75, roughness: .22 })));
    const wf = new THREE.Mesh(knotG, new THREE.MeshBasicMaterial({ color: CY, wireframe: true, transparent: true, opacity: .22 })); wf.scale.setScalar(1.06); prod.add(wf);
    prod.position.y = .1; scene.add(prod);
    // AR corner brackets + dimension line, facing the camera
    const brk = new THREE.Group(); const L = .38, X = 1.75, Y = 1.25, bm = new THREE.LineBasicMaterial({ color: CY });
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => { const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(sx * X, sy * Y - sy * L, 0), new THREE.Vector3(sx * X, sy * Y, 0), new THREE.Vector3(sx * X - sx * L, sy * Y, 0)]); brk.add(new THREE.Line(g, bm)); });
    const dim = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-X, -Y - .2, 0), new THREE.Vector3(X, -Y - .2, 0), new THREE.Vector3(-X, -Y - .32, 0), new THREE.Vector3(-X, -Y - .08, 0), new THREE.Vector3(X, -Y - .32, 0), new THREE.Vector3(X, -Y - .08, 0)]);
    brk.add(new THREE.LineSegments(dim, new THREE.LineBasicMaterial({ color: GO, transparent: true, opacity: .8 }))); scene.add(brk);
    const scan = new THREE.Mesh(new THREE.PlaneGeometry(3.4, .06), glow(CY, { opacity: .9, side: THREE.DoubleSide })); scene.add(scan);
    const scanGlow = new THREE.Mesh(new THREE.PlaneGeometry(3.4, .5), glow(CY, { opacity: .12, side: THREE.DoubleSide })); scene.add(scanGlow);
    const motes = points(90, i => [(Math.random() - .5) * 4, (Math.random() - .5) * 2.6, (Math.random() - .5) * 2], VI, .07); scene.add(motes);
    return { scene, camera, update(t, px, py) {
      prod.rotation.y = t * .7 + px * .6; prod.rotation.x = Math.sin(t * .5) * .25 + py * .3; prod.position.y = .1 + Math.sin(t * 1.3) * .08;
      const s = (Math.sin(t * 1.1) * .5 + .5) * 2 * Y - Y; scan.position.y = s; scanGlow.position.y = s; scan.position.z = scanGlow.position.z = .2;
      brk.position.z = .2; const k = (t * .5) % 1; pulse.scale.setScalar(1 + k * .8); pulse.material.opacity = .6 * (1 - k);
      motes.rotation.y = t * .05; camera.position.x = px * .7; camera.lookAt(0, .05, 0);
    } };
  }

  /* ---------- 3. Immersive events: stage, light beams and a crowd in headsets ---------- */
  if (kind === 'event') {
    camera.position.set(0, 1.5, 7.3); camera.lookAt(0, -.1, 0);
    const stage = new THREE.Mesh(new THREE.BoxGeometry(5.4, .2, 1.8), std(0x1f1b4a, { metalness: .6, roughness: .3 })); stage.position.set(0, -.75, -.6); scene.add(stage);
    const sEdge = edges(new THREE.BoxGeometry(5.4, .2, 1.8), CY, .6); sEdge.position.copy(stage.position); scene.add(sEdge);
    const truss = new THREE.Mesh(new THREE.TorusGeometry(2.75, .05, 8, 72, Math.PI), std(CY, { emissive: CY, emissiveIntensity: .5 })); truss.position.set(0, -.65, -1.3); scene.add(truss);
    // LED wall with moving stripes
    const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 0, 256, 0); gr.addColorStop(0, '#22D3EE'); gr.addColorStop(.5, '#7C5CFF'); gr.addColorStop(1, '#F0ABFC'); g.fillStyle = gr; g.fillRect(0, 0, 256, 64); g.fillStyle = 'rgba(8,7,26,.55)'; for (let x = 0; x < 256; x += 16) g.fillRect(x, 0, 6, 64);
    const wall = new THREE.CanvasTexture(c); wall.wrapS = THREE.RepeatWrapping; wall.repeat.set(2, 1);
    const led = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.2), new THREE.MeshBasicMaterial({ map: wall })); led.position.set(0, .35, -1.45); scene.add(led);
    const ledEdge = edges(new THREE.BoxGeometry(3.6, 1.2, .02), WH, .5); ledEdge.position.copy(led.position); scene.add(ledEdge);
    const beams = [CY, VI, GO].map((col, i) => { const grp = new THREE.Group(); const cone = new THREE.Mesh(new THREE.ConeGeometry(.55, 3.4, 28, 1, true), glow(col, { opacity: .2, side: THREE.DoubleSide })); cone.position.y = -1.7; grp.add(cone); grp.position.set(-1.9 + i * 1.9, 2.0, -.5); scene.add(grp); return grp; });
    const crowd = []; const hsMat = glow(CY, { opacity: .95 });
    for (let r = 0; r < 2; r++) for (let i = 0; i < 9; i++) {
      const f = new THREE.Group(); const hue = [VI, PK, WH][(i + r) % 3];
      const bodyM = new THREE.Mesh(new THREE.CylinderGeometry(.13, .17, .5, 14), std(0x2a2560)); bodyM.position.y = -.15; f.add(bodyM);
      const head = new THREE.Mesh(new THREE.SphereGeometry(.14, 16, 12), std(hue, { emissive: hue, emissiveIntensity: .18 })); head.position.y = .2; f.add(head);
      const vis = new THREE.Mesh(new THREE.BoxGeometry(.27, .09, .1), hsMat); vis.position.set(0, .22, .1); f.add(vis);
      f.position.set((i - 4) * .58 + (r ? .29 : 0), -.6 + (r ? .08 : 0), 1.1 + r * .75); f.userData = { ph: i * .9 + r * 1.7, y0: f.position.y }; scene.add(f); crowd.push(f);
    }
    const conf = points(140, i => [(Math.random() - .5) * 6, Math.random() * 3 - .5, (Math.random() - .5) * 3], GO, .07); scene.add(conf);
    return { scene, camera, update(t, px, py) {
      wall.offset.x = t * .12;
      beams.forEach((b, i) => { b.rotation.z = Math.sin(t * .9 + i * 2.1) * .5; b.rotation.x = Math.cos(t * .7 + i) * .25; });
      crowd.forEach(f => { f.position.y = f.userData.y0 + Math.max(0, Math.sin(t * 4 + f.userData.ph)) * .12; });
      const a = conf.geometry.attributes.position; for (let i = 0; i < a.count; i++) { let y = a.getY(i) - .004; if (y < -.9) y = 2.6; a.setY(i, y); } a.needsUpdate = true;
      camera.position.x = px * .8; camera.position.y = 1.6 + py * .3; camera.lookAt(0, -.1, 0);
    } };
  }

  /* ---------- 4. XR games and AI: a game controller feeding a neural network ---------- */
  camera.position.set(0, .9, 7.4); camera.lookAt(.3, 0, 0);
  const pad = new THREE.Group();
  const padM = std(0x6d4cf0, { metalness: .5, roughness: .3 });
  const mid = new THREE.Mesh(new THREE.BoxGeometry(1.5, .5, .78), padM); pad.add(mid);
  [-1, 1].forEach(s => { const cap = new THREE.Mesh(new THREE.SphereGeometry(.4, 24, 16), padM); cap.scale.set(1, 1.1, 1.05); cap.position.set(s * .78, 0, 0); pad.add(cap); const grip = new THREE.Mesh(new THREE.SphereGeometry(.42, 24, 16), padM); grip.scale.set(.9, 1.7, 1); grip.position.set(s * 1.0, -.55, 0); grip.rotation.z = s * -.28; pad.add(grip); });
  const face = new THREE.Mesh(new THREE.BoxGeometry(1.5, .02, .6), std(0x2a2560)); face.position.y = .27; pad.add(face);
  const dA = new THREE.Mesh(new THREE.BoxGeometry(.34, .06, .1), glow(CY, { opacity: 1 })), dB = dA.clone(); dB.rotation.y = Math.PI / 2; [dA, dB].forEach(d => { d.position.set(-.62, .3, .06); pad.add(d); });
  [[GO, .1, -.14], [CY, .26, .02], [PK, .1, .18], [WH, -.06, .02]].forEach(([col, x, z]) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .05, 20), glow(col, { opacity: 1 })); b.position.set(.62 + x, .3, z); pad.add(b); });
  [-.05, .55].forEach((x, i) => { const st = new THREE.Mesh(new THREE.CylinderGeometry(.1, .12, .06, 20), std(0x15132e)); st.position.set(x - .1 + (i ? 0 : -.0), .3, .2 - i * .02); pad.add(st); });
  pad.add(edges(new THREE.BoxGeometry(1.5, .5, .78), CY, .35));
  pad.scale.setScalar(1.3); pad.position.set(-2.55, 0, 0); pad.rotation.set(.35, 0, 0); scene.add(pad);
  const padGlow = sprite(VI, 3.4); padGlow.position.copy(pad.position); scene.add(padGlow);
  // network
  const layers = [3, 5, 5, 3], nodes = [], X0 = -.6, DX = 1.35;
  layers.forEach((n, li) => { const col = []; for (let j = 0; j < n; j++) { const y = (j - (n - 1) / 2) * .62, z = ((j * 37 + li * 11) % 7 - 3) * .1; const m = new THREE.Mesh(new THREE.SphereGeometry(.1, 16, 12), std(li === 3 ? GO : li === 0 ? CY : VI, { emissive: li === 3 ? GO : li === 0 ? CY : VI, emissiveIntensity: .55 })); m.position.set(X0 + li * DX, y, z); scene.add(m); const h = sprite(li === 3 ? GO : li === 0 ? CY : VI, .7); h.position.copy(m.position); scene.add(h); col.push({ m, h }); } nodes.push(col); });
  const lp = []; const edgesList = [];
  for (let i = 0; i < 3; i++) nodes[i].forEach(a => nodes[i + 1].forEach(b => { lp.push(a.m.position.clone(), b.m.position.clone()); edgesList.push([a.m.position, b.m.position]); }));
  scene.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lp), new THREE.LineBasicMaterial({ color: VI, transparent: true, opacity: .28 })));
  const pulses = Array.from({ length: 16 }, (_, i) => { const s = sprite(WH, .34); s.userData = { e: (i * 7) % edgesList.length, k: Math.random() }; scene.add(s); return s; });
  const feed = points(36, i => [0, 0, 0], GO, .1); scene.add(feed);
  return { scene, camera, update(t, px, py) {
    pad.rotation.y = Math.sin(t * .7) * .5 + px * .5; pad.rotation.x = .35 + py * .2; pad.position.y = Math.sin(t * 1.2) * .1;
    nodes.forEach((col, li) => col.forEach(({ m, h }, j) => { const s = 1 + .25 * Math.sin(t * 2.2 + li * 1.3 + j); m.scale.setScalar(s); h.material.opacity = .55 + .35 * Math.sin(t * 2.2 + li + j); }));
    pulses.forEach(p => { const d = p.userData; d.k += .012 + (d.e % 3) * .004; if (d.k >= 1) { d.k = 0; d.e = (Math.random() * edgesList.length) | 0; } const [a, b] = edgesList[d.e]; p.position.lerpVectors(a, b, d.k); });
    const fa = feed.geometry.attributes.position, sx = pad.position.x + .9, ex = X0 - .25; for (let i = 0; i < fa.count; i++) { const k = ((t * .5 + i / fa.count) % 1); fa.setXYZ(i, sx + (ex - sx) * k, Math.sin(k * 6.283 + i) * .08 * (1 - k), 0); } fa.needsUpdate = true;
    camera.position.x = px * .6; camera.lookAt(.3, 0, 0);
  } };
}
