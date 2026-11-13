// Exact-look 3D wizard: the artwork's own layers (body, arms, legs) are turned into
// real 3D relief meshes (depth-displaced, lit) so the character looks exactly like the illustration.
export function buildWizard(THREE) {
  const U = 146, OX = 380, OY = 640;               // px -> world units
  const root = new THREE.Group(), model = new THREE.Group(); root.add(model); model.scale.setScalar(.86);
  const loader = new THREE.TextureLoader();
  const tex = u => { const t = loader.load(u); t.minFilter = THREE.LinearFilter; t.anisotropy = 4; return t; };
  const mat = (name, depth) => new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: { map: { value: tex('/img/rig/' + name + '.webp') }, dm: { value: tex('/img/rig/d_' + name + '.png') }, k: { value: depth }, px: { value: new THREE.Vector2(1 / 256, 1 / 256) }, glow: { value: 0 } },
    vertexShader: 'uniform sampler2D dm;uniform float k;varying vec2 vUv;varying float vF;void main(){vUv=uv;float d=texture2D(dm,uv).r;vec3 p=position;p.z+=d*k;vF=d;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',
    fragmentShader: 'uniform sampler2D map,dm;uniform vec2 px;uniform float k,glow;varying vec2 vUv;varying float vF;void main(){vec4 c=texture2D(map,vUv);if(c.a<.4)discard;'
      + 'float l=texture2D(dm,vUv-vec2(px.x,0.)).r,r=texture2D(dm,vUv+vec2(px.x,0.)).r,d=texture2D(dm,vUv-vec2(0.,px.y)).r,u=texture2D(dm,vUv+vec2(0.,px.y)).r;'
      + 'vec3 n=normalize(vec3(-(r-l)*k*2.2,-(u-d)*k*2.2,1.));float s=.78+.34*max(dot(n,normalize(vec3(.45,.6,.75))),0.)+.18*pow(1.-n.z,2.)*0.;'
      + 'vec3 col=c.rgb*s;col+=vec3(.15,.8,1.)*glow*.25;if(!gl_FrontFacing)col=col*.45+vec3(.05,.02,.12);gl_FragColor=vec4(col,1.);}'
  });
  const layer = (name, x, y, w, h, depth, z, piv) => {
    const g = new THREE.PlaneGeometry(w / U, h / U, Math.round(w / 6), Math.round(h / 6));
    const m = mat(name, depth); m.uniforms.px.value.set(1 / w, 1 / h);
    const mesh = new THREE.Mesh(g, m);
    const cx = (x + w / 2 - OX) / U, cy = (OY - y - h / 2) / U;
    const grp = new THREE.Group();
    if (piv) { const px = (x + w * piv[0] - OX) / U, py = (OY - y - h * piv[1]) / U; grp.position.set(px, py, z); mesh.position.set(cx - px, cy - py, 0); }
    else mesh.position.set(cx, cy, z);
    grp.add(mesh); model.add(grp); return grp;
  };
  const body = layer('base', 0, 0, 760, 681, 1.0, 0, [.5, .5]);
  const legL = layer('lleg', 166.7, 494.8, 154.7, 136.2, .45, .08, [.766, .042]);
  const legR = layer('rleg', 380.3, 494.8, 173.7, 134.3, .45, .08, [.292, .042]);
  const armL = layer('larm', 0, 240.7, 196.5, 148.2, .4, .42, [.935, .513]);
  const armR = layer('rarm', 525.5, 74.8, 234.5, 517, .35, .42, [.138, .499]);
  body.position.set(0, (OY - 340.5) / U, 0);   // body pivot at its centre; its mesh is offset back by the layer helper
  // body layer was built with pivot at centre -> its mesh already compensates, so only the group moves.
  body.position.set((380 - OX) / U, (OY - 340.5) / U, 0);

  // floating cube above the open hand (as in the artwork)
  const cubeG = new THREE.Group(); model.add(cubeG);
  const cube = new THREE.Mesh(new THREE.BoxGeometry(.5, .5, .5), new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: .55 }));
  const cubeE = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(.5, .5, .5)), new THREE.LineBasicMaterial({ color: 0xe0faff }));
  cubeG.add(cube, cubeE); cubeG.position.set(-2.15, 2.35, .6);
  // sparkle burst (spell)
  const N = 70, sg = new THREE.BufferGeometry(), sp = new Float32Array(N * 3), sv = new Float32Array(N * 3);
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const sparks = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0x8cefff, size: .13, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })); sparks.frustumCulled = false; model.add(sparks);
  // soft contact shadow on the ground
  const sc = document.createElement('canvas'); sc.width = sc.height = 64; const sx = sc.getContext('2d'), gr = sx.createRadialGradient(32, 32, 2, 32, 32, 32);
  gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); sx.fillStyle = gr; sx.fillRect(0, 0, 64, 64);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.set(0, .02, .1); shadow.scale.set(3.4, 1.5, 1); root.add(shadow);
  const st = { phase: 0, yaw: 0, sq: 0, ph: 0 }; let burst = 0;
  const ez = (a, b, k) => a + (b - a) * k;
  function update(time, dt, s) {
    const k = Math.min(1, dt * 10), walking = s.walking, t = s.actT, idle = Math.sin(time * 1.6);
    const run = s.run ? 1 : 0; st.run = ez(st.run || 0, run, Math.min(1, dt * 5));
    if (walking) st.phase += dt * (9 + st.run * 7); const sw = Math.sin(st.phase), sw2 = Math.sin(st.phase * 2);
    let yawT = 0, hop = 0, bob = (idle + 1) * .012, lean = 0, aL = 0, aR = 0, lL = 0, lR = 0, lLy = 0, lRy = 0, glow = 0, pitch = 0;
    if (walking) {
      const r = st.run, ax = Math.abs(s.vx);
      yawT = Math.sign(s.vx || 1) * Math.min(.8, ax * 1.3);            // turn to face the direction of travel
      const dir = Math.sign(s.vx || 1);
      bob = Math.abs(sw) * (.08 + r * .1);                                  // body rises with each step
      lean = -dir * ax * (.05 + r * .2);                                    // lean into the run
      pitch = (.04 + r * .12) * Math.max(0, s.vy) * 0 + ((.02 + r * .08) * sw2);
      const amp = .38 + r * .45;                                            // leg swing
      lL = sw * amp; lR = -sw * amp;
      lLy = Math.max(0, -Math.cos(st.phase)) * (.1 + r * .22); lRy = Math.max(0, Math.cos(st.phase)) * (.1 + r * .22);
      aL = -sw * (.3 + r * .5) * dir; aR = sw * (.3 + r * .5) * dir;       // arms swing against the legs
      if (r > .5) { hop = Math.abs(Math.sin(st.phase)) * .06; }
    }
    else switch (s.act) {
      case 'wave': aL = -.2 - Math.abs(Math.sin(t * 7)) * .55 + .0; aL = Math.sin(t * 8) * .35 - .35; yawT = .12; break;
      case 'jump': hop = Math.abs(Math.sin(t * 6)) * .6; aL = -.5; aR = .35; lL = lR = .1; break;
      case 'cheer': hop = Math.abs(Math.sin(t * 7)) * .35; aL = -.9; aR = .8; break;
      case 'dance': bob = Math.abs(Math.sin(t * 7)) * .12; yawT = Math.sin(t * 3.5) * .6; aL = Math.sin(t * 7) * .4 - .3; aR = Math.sin(t * 7 + 2) * .3; lL = Math.sin(t * 7) * .25; lR = -lL; lLy = Math.max(0, lL) * .6; lRy = Math.max(0, lR) * .6; lean = Math.sin(t * 7) * .06; break;
      case 'spell': aR = .55 + Math.sin(t * 2.5) * .06; glow = 1; if (burst === 0 && t > .5) burst = 1; break;
      case 'look': yawT = Math.sin(t * 2.4) * .5; aL = -.2; break;
    }
    st.yaw = ez(st.yaw, yawT, Math.min(1, dt * 7)); model.rotation.y = st.yaw;
    armL.rotation.z = ez(armL.rotation.z, aL, k); armR.rotation.z = ez(armR.rotation.z, aR, k);
    legL.rotation.z = ez(legL.rotation.z, lL, k); legR.rotation.z = ez(legR.rotation.z, lR, k);
    legL.position.y = ez(legL.position.y, (OY - 494.8 - 136.2 * .042) / U + lLy, k); legR.position.y = ez(legR.position.y, (OY - 494.8 - 134.3 * .042) / U + lRy, k);
    // weight shift, step wobble, squash on landing, shadow
    const sqT = walking ? Math.abs(Math.cos(st.phase)) * (.012 + st.run * .02) : (hop < .02 && st.ph > .08 ? .09 : 0); st.ph = hop;
    st.sq = ez(st.sq, sqT, Math.min(1, dt * 14)); model.scale.set(.86 * (1 + st.sq * .6), .86 * (1 - st.sq), .86);
    model.position.x = walking ? sw * .035 * (1 + st.run) : 0; if (walking) model.rotation.y += sw * (.04 + st.run * .05);
    const sh = 1 - Math.min(.5, (hop + bob) * .9); shadow.scale.set(3.4 * sh, 1.5 * sh, 1); shadow.material.opacity = .55 + .45 * sh;
    model.position.y = hop + bob; model.rotation.z = ez(model.rotation.z, lean, k); model.rotation.x = ez(model.rotation.x, pitch, k);
    cubeG.position.y = 2.35 + Math.sin(time * 2) * .1; cubeG.rotation.y += dt * 1.6; cubeG.rotation.x += dt * .7;
    for (const l of [body, armL, armR, legL, legR]) l.children[0].material.uniforms.glow.value = ez(l.children[0].material.uniforms.glow.value, glow, .1);
    if (burst === 1) { for (let i = 0; i < N; i++) { sp[i * 3] = 2.1; sp[i * 3 + 1] = 3.6; sp[i * 3 + 2] = .8; const a = Math.random() * 6.28, b = Math.random() * 3.14, v = .8 + Math.random() * 1.4; sv[i * 3] = Math.cos(a) * Math.sin(b) * v; sv[i * 3 + 1] = Math.cos(b) * v; sv[i * 3 + 2] = Math.sin(a) * Math.sin(b) * v; } burst = 2; sparks.material.opacity = 1; }
    if (burst === 2) { for (let i = 0; i < N * 3; i++) sp[i] += sv[i] * dt; sparks.material.opacity = Math.max(0, sparks.material.opacity - dt * .9); sg.attributes.position.needsUpdate = true; if (sparks.material.opacity <= 0) burst = s.act === 'spell' ? 3 : 0; }
    if (s.act !== 'spell' && burst === 3) burst = 0;
  }
  return { root, update, orbLight: new THREE.PointLight(0x22d3ee, 0, 1) };
}
