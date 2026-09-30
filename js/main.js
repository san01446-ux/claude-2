import * as THREE from 'three';
import { sfx, initAudio } from './audio.js';
import { loadAssets, assets, tex } from './assets.js';

// ───────────────────────── utils ─────────────────────────
const V3 = THREE.Vector3;
const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const dampAngle = (a, b, k, dt) => a + angDiff(a, b) * (1 - Math.exp(-k * dt));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const $ = (id) => document.getElementById(id);

// ───────────────────────── renderer / scene ─────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
$('app').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const FOG = 0xd9cfb8;
scene.fog = new THREE.Fog(FOG, 70, 330);
scene.background = new THREE.Color(FOG);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 900);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

await loadAssets((f) => {
  const btn = $('startBtn');
  btn.textContent = `수련장 준비 중… ${Math.round(f * 100)}%`;
});
if (assets.env) scene.environment = assets.env;

// lights (image-based light from the HDRI does part of the fill, so keep these moderate)
const hemi = new THREE.HemisphereLight(0xdde8ff, 0x5a4a30, assets.env ? 0.45 : 1.0);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d8, 2.4);
sun.position.set(30, 55, 20);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -48, right: 48, top: 48, bottom: -48, near: 1, far: 150 });
sun.shadow.bias = -0.0005;
scene.add(sun);

// ───────────────────────── shared resources ─────────────────────────
const G = {};
const sharedGeos = new Set();
function geo(key, make) {
  if (!G[key]) { G[key] = make(); sharedGeos.add(G[key]); }
  return G[key];
}
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
const dotTex = canvasTex(64, 64, (g) => {
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.35, 'rgba(255,255,255,.7)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
});
const petalTex = canvasTex(32, 32, (g) => {
  g.fillStyle = '#ffd6e4';
  g.beginPath(); g.ellipse(16, 16, 13, 7, 0.6, 0, TAU); g.fill();
});

function disposeTree(obj) {
  obj.traverse((o) => {
    if (o.geometry && !sharedGeos.has(o.geometry)) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
  });
}

// ───────────────────────── world ─────────────────────────
const colliders = []; // {x, z, r}
const ARENA_R = 38;
const flags = [];

function buildWorld() {
  // sky dome
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(600, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(0x7fa7c4) }, bottom: { value: new THREE.Color(FOG) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = clamp(normalize(vP).y * 2.2, 0.0, 1.0); gl_FragColor = vec4(mix(bottom, top, h), 1.0); }',
    })
  );
  scene.add(sky);

  // ground with hills beyond the arena
  const gg = new THREE.PlaneGeometry(700, 700, 180, 180);
  gg.rotateX(-Math.PI / 2);
  const p = gg.attributes.position;
  const col = [];
  const c1 = new THREE.Color(0xd6e0b8), c2 = new THREE.Color(0xfff4c8), c3 = new THREE.Color(0x9a8c70);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const r = Math.hypot(x, z);
    const t = THREE.MathUtils.smoothstep(r, 44, 130);
    const n = Math.sin(x * 0.045) * Math.cos(z * 0.06) + Math.sin((x + z) * 0.021) * 0.8 + Math.sin(x * 0.13 + z * 0.11) * 0.25;
    p.setY(i, t * (10 + n * 9));
    const c = c1.clone().lerp(c2, (Math.sin(x * 0.2) * Math.cos(z * 0.23) + 1) * 0.35).lerp(c3, t * 0.6);
    col.push(c.r, c.g, c.b);
  }
  gg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  gg.computeVertexNormals();
  const ground = new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, map: tex('grass', 110) }));
  ground.receiveShadow = true;
  scene.add(ground);

  // stone plaza with taegeuk
  const PLAZA_TILES = 6;
  const plazaTex = canvasTex(1024, 1024, (g) => {
    const cx = 512, cy = 512;
    const img = assets.tex.stone?.image;
    if (img) {
      // tile the stone floor photo PLAZA_TILES times so it lines up with the normal map
      const step = 1024 / PLAZA_TILES;
      for (let x = 0; x < PLAZA_TILES; x++) for (let y = 0; y < PLAZA_TILES; y++) g.drawImage(img, x * step, y * step, step, step);
      g.fillStyle = 'rgba(214,200,170,.18)'; g.fillRect(0, 0, 1024, 1024);
    } else {
      g.fillStyle = '#9d9585'; g.fillRect(0, 0, 1024, 1024);
    }
    g.strokeStyle = 'rgba(40,32,24,.45)'; g.lineWidth = 6;
    for (let r = 118; r < 512; r += 100) { g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.stroke(); }
    const R = 104;
    g.fillStyle = '#e9e1cd'; g.beginPath(); g.arc(cx, cy, R + 10, 0, TAU); g.fill();
    g.fillStyle = '#b3262b'; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.fill();
    g.fillStyle = '#1f3f8f';
    g.beginPath();
    g.arc(cx, cy, R, -Math.PI / 2, Math.PI / 2, false);
    g.arc(cx, cy + R / 2, R / 2, Math.PI / 2, (3 * Math.PI) / 2, false);
    g.arc(cx, cy - R / 2, R / 2, Math.PI / 2, -Math.PI / 2, true);
    g.fill();
  });
  const plaza = new THREE.Mesh(new THREE.CircleGeometry(16, 72), new THREE.MeshStandardMaterial({ map: plazaTex, normalMap: tex('stoneN', PLAZA_TILES), normalScale: new THREE.Vector2(0.8, 0.8), roughness: 0.9 }));
  plaza.rotation.x = -Math.PI / 2; plaza.rotation.z = Math.PI / 2;
  plaza.position.y = 0.02; plaza.receiveShadow = true;
  scene.add(plaza);
  // dirt path ring around the plaza and toward the gate, with soft edges
  const dirtMat = (alpha) => new THREE.MeshStandardMaterial({ map: tex('dirt', 6), alphaMap: alpha, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1 });
  const ringAlpha = canvasTex(256, 256, (g) => {
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0.80, '#000'); gr.addColorStop(0.84, '#fff'); gr.addColorStop(0.9, '#fff'); gr.addColorStop(1, '#000');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  });
  ringAlpha.colorSpace = THREE.NoColorSpace;
  const dirtRing = new THREE.Mesh(new THREE.CircleGeometry(20, 72), dirtMat(ringAlpha));
  dirtRing.rotation.x = -Math.PI / 2; dirtRing.position.y = 0.012; dirtRing.receiveShadow = true;
  scene.add(dirtRing);
  const pathAlpha = canvasTex(64, 4, (g) => {
    const gr = g.createLinearGradient(0, 0, 64, 0);
    gr.addColorStop(0, '#000'); gr.addColorStop(0.25, '#fff'); gr.addColorStop(0.75, '#fff'); gr.addColorStop(1, '#000');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 4);
  });
  pathAlpha.colorSpace = THREE.NoColorSpace;
  const path = new THREE.Mesh(new THREE.PlaneGeometry(6, 16), dirtMat(pathAlpha));
  path.material.map.repeat.set(1, 3);
  path.rotation.x = -Math.PI / 2; path.position.set(0, 0.011, -24); path.receiveShadow = true;
  scene.add(path);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(16, 0.18, 6, 72), new THREE.MeshStandardMaterial({ color: 0x6d665a, roughness: 1 }));
  rim.rotation.x = -Math.PI / 2; rim.receiveShadow = true;
  scene.add(rim);

  // distant ink-wash mountains
  const mountainTex = tex('rock', 5);
  for (let i = 0; i < 34; i++) {
    const a = (i / 34) * TAU + rand(-0.08, 0.08);
    const d = rand(170, 300);
    const h = rand(45, 130);
    const shade = new THREE.Color(0x4f6070).lerp(new THREE.Color(0x8a9aa6), rand(0, 1));
    const mg = new THREE.ConeGeometry(h * rand(0.6, 0.95), h, 7, 3);
    const mp = mg.attributes.position;
    for (let j = 0; j < mp.count; j++) {
      if (mp.getY(j) < h / 2 - 0.01) { mp.setX(j, mp.getX(j) * rand(0.8, 1.2)); mp.setZ(j, mp.getZ(j) * rand(0.8, 1.2)); }
    }
    mg.computeVertexNormals();
    const m = new THREE.Mesh(mg, new THREE.MeshStandardMaterial({ color: shade, map: mountainTex, roughness: 1, flatShading: true }));
    m.position.set(Math.cos(a) * d, h / 2 - 4, Math.sin(a) * d);
    m.rotation.y = rand(0, TAU);
    scene.add(m);
    if (h > 80) {
      const cap = new THREE.Mesh(new THREE.ConeGeometry(h * 0.18, h * 0.22, 7), new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 1, flatShading: true }));
      cap.position.set(0, h * 0.4, 0);
      m.add(cap);
    }
  }

  // lacquered wood (단청 red / green), roof tiles, carved stone
  const red = new THREE.MeshStandardMaterial({ color: 0xe0584c, map: tex('wood', 1), roughness: 0.45 });
  const green = new THREE.MeshStandardMaterial({ color: 0x6fc0a8, map: tex('wood', 1), roughness: 0.5 });
  const tile = new THREE.MeshStandardMaterial({ color: 0x3a444a, map: tex('rock', 3), normalMap: tex('rockN', 3), roughness: 0.7, flatShading: true });
  const stone = new THREE.MeshStandardMaterial({ color: 0xd8d0c0, map: tex('rock', 1), normalMap: tex('rockN', 1), roughness: 0.95 });
  const paving = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, map: tex('stone', 2), normalMap: tex('stoneN', 2), roughness: 0.9 });
  const add = (mesh, parent = scene) => { mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh; };

  // pavilion (정자)
  {
    const g = new THREE.Group();
    g.position.set(24, 0, -12);
    g.rotation.y = -0.5;
    add(new THREE.Mesh(new THREE.BoxGeometry(8, 0.5, 8), paving), g).position.y = 0.25;
    for (const sx of [-3, 3]) for (const sz of [-3, 3]) {
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 3.6, 10), red), g).position.set(sx, 2.3, sz);
    }
    for (const s of [-3, 3]) {
      add(new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.35, 0.35), green), g).position.set(0, 4.1, s);
      add(new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 6.6), green), g).position.set(s, 4.1, 0);
    }
    const roof = add(new THREE.Mesh(new THREE.ConeGeometry(6.4, 2.6, 4), tile), g);
    roof.position.y = 5.5; roof.rotation.y = Math.PI / 4;
    const roofTop = add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.6, roughness: 0.3 })), g);
    roofTop.position.y = 6.85;
    scene.add(g);
    colliders.push({ x: 24, z: -12, r: 5 });
  }

  // gate (일주문) with signboard
  {
    const g = new THREE.Group();
    g.position.set(0, 0, -30);
    for (const sx of [-4.2, 4.2]) {
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 7.5, 12), red), g).position.set(sx, 3.75, 0);
      add(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 1.2), stone), g).position.set(sx, 0.3, 0);
      colliders.push({ x: sx, z: -30, r: 0.8 });
    }
    add(new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.55, 0.7), green), g).position.y = 6.3;
    add(new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.4, 0.6), red), g).position.y = 7.4;
    const signTex = canvasTex(1024, 256, (c, w, h) => {
      c.fillStyle = '#1b1712'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#d4af37'; c.lineWidth = 14; c.strokeRect(10, 10, w - 20, h - 20);
      c.fillStyle = '#d4af37'; c.font = 'bold 150px serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('天下第一武林', w / 2, h / 2 + 6);
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.6 }));
    sign.position.set(0, 5.2, 0.36);
    g.add(sign);
    const sign2 = sign.clone(); sign2.rotation.y = Math.PI; sign2.position.z = -0.36; g.add(sign2);
    const board = add(new THREE.Mesh(new THREE.BoxGeometry(6.2, 1.7, 0.6), red), g); board.position.y = 5.2;
    const roof = add(new THREE.Mesh(new THREE.ConeGeometry(1, 1, 4), tile), g);
    roof.rotation.y = Math.PI / 4; roof.scale.set(9, 1.6, 2.4); roof.position.y = 8.4;
    scene.add(g);

    // banners by the gate
    const flagTex = canvasTex(256, 512, (c, w, h) => {
      c.fillStyle = '#a3231f'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#d4af37'; c.lineWidth = 12; c.strokeRect(8, 8, w - 16, h - 16);
      c.fillStyle = '#f3e7c7'; c.font = 'bold 190px serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('武', w / 2, h / 2);
    });
    for (const sx of [-8, 8]) {
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 8, 6), new THREE.MeshStandardMaterial({ color: 0x6a4a30, map: tex('wood', 1) }))).position.set(sx, 4, -29);
      const fg = new THREE.PlaneGeometry(1.3, 2.6, 12, 1);
      fg.translate(sx < 0 ? -0.65 : 0.65, 0, 0);
      const flag = new THREE.Mesh(fg, new THREE.MeshStandardMaterial({ map: flagTex, side: THREE.DoubleSide, roughness: 0.9 }));
      flag.position.set(sx + Math.sign(sx) * 0.08, 6.4, -29);
      flag.castShadow = true;
      flag.userData.base = Float32Array.from(fg.attributes.position.array);
      scene.add(flag);
      flags.push(flag);
      colliders.push({ x: sx, z: -29, r: 0.4 });
    }
  }

  // stone lanterns (석등) around the plaza
  const glow = new THREE.MeshStandardMaterial({ color: 0xffd78a, emissive: 0xffb347, emissiveIntensity: 1.4 });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + Math.PI / 8;
    const x = Math.cos(a) * 17.5, z = Math.sin(a) * 17.5;
    if (Math.abs(x) < 6 && z < -12) continue;
    const g = new THREE.Group(); g.position.set(x, 0, z);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.4, 8), stone), g).position.y = 0.2;
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 1.1, 8), stone), g).position.y = 0.95;
    add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.55, 0.6), glow), g).position.y = 1.75;
    const cap = add(new THREE.Mesh(new THREE.ConeGeometry(0.62, 0.5, 8), stone), g); cap.position.y = 2.28;
    scene.add(g);
    colliders.push({ x, z, r: 0.7 });
  }

  // bamboo groves (instanced)
  const stalks = [], leaves = [];
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new V3();
  let tries = 0;
  while (stalks.length < 220 && tries++ < 500) {
    const a = rand(0, TAU), d = rand(22, 37);
    const cx = Math.cos(a) * d, cz = Math.sin(a) * d;
    if (colliders.some((c) => Math.hypot(c.x - cx, c.z - cz) < c.r + 2.5)) continue;
    const n = Math.floor(rand(5, 10));
    for (let i = 0; i < n; i++) {
      const x = cx + rand(-1, 1), z = cz + rand(-1, 1), h = rand(6, 11);
      e.set(rand(-0.06, 0.06), 0, rand(-0.06, 0.06)); q.setFromEuler(e);
      m4.compose(new V3(x, h / 2, z), q, s.set(1, h, 1)); stalks.push(m4.clone());
      for (let k = 0; k < 2; k++) {
        e.set(0, rand(0, TAU), 0); q.setFromEuler(e);
        m4.compose(new V3(x + rand(-0.6, 0.6), h - k * 1.6 + rand(-0.3, 0.3), z + rand(-0.6, 0.6)), q, s.set(rand(1.2, 1.9), rand(0.45, 0.7), rand(1.2, 1.9)));
        leaves.push(m4.clone());
      }
    }
    colliders.push({ x: cx, z: cz, r: 1.4 });
  }
  const stalkMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.09, 1, 6), new THREE.MeshStandardMaterial({ color: 0x7c9a3c, roughness: 0.7 }), stalks.length);
  stalks.forEach((m, i) => stalkMesh.setMatrixAt(i, m));
  stalkMesh.castShadow = true;
  scene.add(stalkMesh);
  const leafMesh = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: 0x3f6a2c, roughness: 0.9, flatShading: true }), leaves.length);
  leaves.forEach((m, i) => leafMesh.setMatrixAt(i, m));
  leafMesh.castShadow = true;
  scene.add(leafMesh);

  // cherry blossom trees
  const bark = new THREE.MeshStandardMaterial({ color: 0x7a5a48, map: tex('rock', 1), normalMap: tex('rockN', 1), roughness: 1 });
  const bloom = new THREE.MeshStandardMaterial({ color: 0xf2b6c8, roughness: 0.9, flatShading: true });
  for (const [x, z] of [[-20, -6], [-14, 20], [18, 18]]) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const trunk = add(new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 4, 7), bark), g);
    trunk.position.y = 2; trunk.rotation.z = 0.1;
    for (let i = 0; i < 6; i++) {
      const b = add(new THREE.Mesh(new THREE.IcosahedronGeometry(rand(1.2, 1.9), 0), bloom), g);
      b.position.set(rand(-1.8, 1.8), rand(4, 5.5), rand(-1.8, 1.8));
    }
    scene.add(g);
    colliders.push({ x, z, r: 0.7 });
  }

  // rocks
  for (let i = 0; i < 14; i++) {
    const a = rand(0, TAU), d = rand(19, 36);
    const x = Math.cos(a) * d, z = Math.sin(a) * d, r = rand(0.6, 1.6);
    if (colliders.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + r + 0.5)) continue;
    const rock = add(new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), stone));
    rock.position.set(x, r * 0.45, z);
    rock.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
    colliders.push({ x, z, r: r * 0.9 });
  }
}
buildWorld();
$('startBtn').textContent = '입산하기';
$('startBtn').disabled = false;

function resolveCollisions(pos, radius) {
  for (const c of colliders) {
    const dx = pos.x - c.x, dz = pos.z - c.z;
    const d = Math.hypot(dx, dz), min = c.r + radius;
    if (d < min && d > 1e-4) { pos.x = c.x + (dx / d) * min; pos.z = c.z + (dz / d) * min; }
  }
  const r = Math.hypot(pos.x, pos.z);
  if (r > ARENA_R) { pos.x *= ARENA_R / r; pos.z *= ARENA_R / r; }
}

// falling petals
const PETALS = 380;
const petalGeo = new THREE.BufferGeometry();
const petalPos = new Float32Array(PETALS * 3);
const petalSeed = new Float32Array(PETALS);
for (let i = 0; i < PETALS; i++) {
  petalPos.set([rand(-40, 40), rand(0, 22), rand(-40, 40)], i * 3);
  petalSeed[i] = rand(0, TAU);
}
petalGeo.setAttribute('position', new THREE.BufferAttribute(petalPos, 3));
const petals = new THREE.Points(petalGeo, new THREE.PointsMaterial({ map: petalTex, size: 0.28, transparent: true, depthWrite: false, alphaTest: 0.1 }));
petals.frustumCulled = false;
scene.add(petals);

// ───────────────────────── particles ─────────────────────────
const PMAX = 900;
const pGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(PMAX * 3), pCol = new Float32Array(PMAX * 3);
const pVel = new Float32Array(PMAX * 3), pBase = new Float32Array(PMAX * 3);
const pLife = new Float32Array(PMAX), pMax = new Float32Array(PMAX), pGrav = new Float32Array(PMAX);
for (let i = 0; i < PMAX; i++) pPos[i * 3 + 1] = -999;
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ map: dotTex, size: 0.45, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
particles.frustumCulled = false;
scene.add(particles);
let pNext = 0;
const _c = new THREE.Color();
function burst(pos, count, color, speed = 6, life = 0.5, grav = 0, spread = 1) {
  _c.set(color);
  for (let n = 0; n < count; n++) {
    const i = pNext; pNext = (pNext + 1) % PMAX;
    const v = new V3(rand(-1, 1), rand(-0.4, 1) * spread, rand(-1, 1)).normalize().multiplyScalar(speed * rand(0.3, 1));
    pPos.set([pos.x, pos.y, pos.z], i * 3);
    pVel.set([v.x, v.y, v.z], i * 3);
    pBase.set([_c.r, _c.g, _c.b], i * 3);
    pLife[i] = pMax[i] = life * rand(0.6, 1.2);
    pGrav[i] = grav;
  }
}
function updateParticles(dt) {
  for (let i = 0; i < PMAX; i++) {
    if (pLife[i] <= 0) continue;
    pLife[i] -= dt;
    const k = Math.max(pLife[i] / pMax[i], 0);
    const j = i * 3;
    pVel[j + 1] -= pGrav[i] * dt;
    const drag = Math.exp(-3 * dt);
    pVel[j] *= drag; pVel[j + 1] *= drag; pVel[j + 2] *= drag;
    pPos[j] += pVel[j] * dt; pPos[j + 1] += pVel[j + 1] * dt; pPos[j + 2] += pVel[j + 2] * dt;
    pCol[j] = pBase[j] * k; pCol[j + 1] = pBase[j + 1] * k; pCol[j + 2] = pBase[j + 2] * k;
    if (pLife[i] <= 0) pPos[j + 1] = -999;
  }
  pGeo.attributes.position.needsUpdate = true;
  pGeo.attributes.color.needsUpdate = true;
}

// generic timed effects
const effects = [];
function addEffect(obj, dur, fn) {
  scene.add(obj);
  effects.push({ obj, t: 0, dur, fn });
}
function updateEffects(dt) {
  for (let i = effects.length - 1; i >= 0; i--) {
    const e = effects[i];
    e.t += dt;
    const k = Math.min(e.t / e.dur, 1);
    e.fn(e.obj, k, dt);
    if (k >= 1) { scene.remove(e.obj); disposeTree(e.obj); effects.splice(i, 1); }
  }
}
const additive = (color, opacity = 0.8) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });

function shockRing(pos, radius, color, dur = 0.45) {
  const m = new THREE.Mesh(geo('ring', () => new THREE.RingGeometry(0.85, 1, 48).rotateX(-Math.PI / 2)), additive(color, 0.9));
  m.position.copy(pos); m.position.y += 0.08;
  addEffect(m, dur, (o, k) => { o.scale.setScalar(0.3 + easeOut(k) * radius); o.material.opacity = 0.9 * (1 - k); });
}
function lightning(target) {
  const pts = [];
  const top = target.clone().add(new V3(rand(-3, 3), 28, rand(-3, 3)));
  for (let i = 0; i <= 10; i++) {
    const p = top.clone().lerp(target, i / 10);
    if (i > 0 && i < 10) p.add(new V3(rand(-0.9, 0.9), 0, rand(-0.9, 0.9)));
    pts.push(p);
  }
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0);
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 30, 0.07, 4), additive(0xffffff, 1)));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 30, 0.28, 5), additive(0x6fb8ff, 0.5)));
  addEffect(g, 0.35, (o, k) => o.children.forEach((c, i) => (c.material.opacity = (i ? 0.5 : 1) * (1 - k) * (Math.random() > 0.3 ? 1 : 0.3))));
  burst(target, 24, 0x8fd0ff, 9, 0.5, 6);
}

// floating combat text
const fxLayer = $('fx');
const floaters = [];
function floatText(pos, text, cls = '') {
  const el = document.createElement('div');
  el.className = 'dmg ' + cls;
  el.textContent = text;
  fxLayer.appendChild(el);
  floaters.push({ el, pos: pos.clone(), t: 0, dx: rand(-0.4, 0.4) });
}
const _proj = new V3();
function updateFloaters(dt) {
  for (let i = floaters.length - 1; i >= 0; i--) {
    const f = floaters[i];
    f.t += dt;
    f.pos.y += dt * 1.6; f.pos.x += f.dx * dt;
    _proj.copy(f.pos).project(camera);
    const vis = _proj.z < 1;
    f.el.style.display = vis ? '' : 'none';
    f.el.style.left = (_proj.x * 0.5 + 0.5) * innerWidth + 'px';
    f.el.style.top = (-_proj.y * 0.5 + 0.5) * innerHeight + 'px';
    f.el.style.opacity = String(1 - Math.max(0, f.t - 0.5) / 0.4);
    if (f.t > 0.9) { f.el.remove(); floaters.splice(i, 1); }
  }
}

// ───────────────────────── characters ─────────────────────────
function makeHumanoid({ robe, trim, pants = 0x2a2622, skin = 0xefc6a0, hair = 0x141210, blade = 'sword', bladeColor = 0xdfe8f0, bladeGlow = 0x000000, scale = 1 }) {
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });
  const mats = {
    robe: std(robe, { side: THREE.DoubleSide }), trim: std(trim, { roughness: 0.55 }), pants: std(pants),
    skin: std(skin, { roughness: 0.6 }), hair: std(hair, { roughness: 0.5 }),
    metal: std(bladeColor, { metalness: 0.9, roughness: 0.2, emissive: bladeGlow, emissiveIntensity: 0.8 }),
  };
  for (const m of Object.values(mats)) m.userData.base = m.emissive.getHex();
  const mk = (g, mat, parent, x = 0, y = 0, z = 0) => {
    const o = new THREE.Mesh(g, mat); o.castShadow = true; o.position.set(x, y, z); parent.add(o); return o;
  };
  const root = new THREE.Group();
  const body = new THREE.Group(); body.position.y = 1; root.add(body);
  const upper = new THREE.Group(); body.add(upper);

  mk(geo('torso', () => new THREE.CylinderGeometry(0.27, 0.36, 0.8, 12)), mats.robe, upper, 0, 0.42);
  mk(geo('belt', () => new THREE.CylinderGeometry(0.37, 0.37, 0.12, 12)), mats.trim, upper, 0, 0.06);
  mk(geo('collar', () => new THREE.TorusGeometry(0.19, 0.045, 6, 14).rotateX(Math.PI / 2)), mats.trim, upper, 0, 0.82);
  mk(geo('skirt', () => new THREE.CylinderGeometry(0.36, 0.54, 0.72, 12, 1, true)), mats.robe, body, 0, -0.32);

  const head = new THREE.Group(); head.position.y = 1.06; upper.add(head);
  mk(geo('head', () => new THREE.SphereGeometry(0.2, 16, 12)), mats.skin, head);
  const cap = mk(geo('hairCap', () => new THREE.SphereGeometry(0.212, 16, 12, 0, TAU, 0, Math.PI * 0.55)), mats.hair, head);
  cap.rotation.x = -0.4;
  mk(geo('bun', () => new THREE.SphereGeometry(0.09, 10, 8)), mats.hair, head, 0, 0.2, -0.08);
  const band = mk(geo('band', () => new THREE.TorusGeometry(0.206, 0.024, 6, 18)), mats.trim, head, 0, 0.06, -0.01);
  band.rotation.x = Math.PI / 2 - 0.4;
  for (const sx of [-0.07, 0.07]) mk(geo('eye', () => new THREE.SphereGeometry(0.022, 6, 4)), mats.hair, head, sx, 0.02, 0.185);

  const mkArm = (side) => {
    const p = new THREE.Group(); p.position.set(0.38 * side, 0.74, 0); upper.add(p);
    mk(geo('sleeve', () => new THREE.CylinderGeometry(0.085, 0.14, 0.62, 8)), mats.robe, p, 0, -0.31);
    mk(geo('hand', () => new THREE.SphereGeometry(0.075, 8, 6)), mats.skin, p, 0, -0.67);
    return p;
  };
  const armL = mkArm(1), armR = mkArm(-1); // model faces +z, so its right side is -x

  const mkLeg = (side) => {
    const p = new THREE.Group(); p.position.set(0.15 * side, 0, 0); body.add(p);
    mk(geo('leg', () => new THREE.CylinderGeometry(0.1, 0.08, 0.9, 8)), mats.pants, p, 0, -0.45);
    mk(geo('shoe', () => new THREE.BoxGeometry(0.14, 0.1, 0.27)), mats.hair, p, 0, -0.95, 0.04);
    return p;
  };
  const legL = mkLeg(1), legR = mkLeg(-1);

  const weapon = new THREE.Group(); weapon.position.y = -0.68; weapon.rotation.x = Math.PI / 2; armR.add(weapon);
  mk(geo('hilt', () => new THREE.CylinderGeometry(0.026, 0.026, 0.26, 6)), mats.hair, weapon);
  mk(geo('guard', () => new THREE.BoxGeometry(0.2, 0.045, 0.07)), mats.trim, weapon, 0, 0.14);
  if (blade === 'sword') mk(geo('sword', () => new THREE.BoxGeometry(0.05, 1.05, 0.012)), mats.metal, weapon, 0, 0.68);
  else mk(geo('dao', () => new THREE.BoxGeometry(0.12, 0.85, 0.016)), mats.metal, weapon, 0.03, 0.58);

  root.scale.setScalar(scale);
  return { root, body, upper, head, armL, armR, legL, legR, weapon, mats: Object.values(mats) };
}

function flash(h, color, amount = 1) {
  for (const m of h.mats) {
    if (amount <= 0) { m.emissive.setHex(m.userData.base); continue; }
    m.emissive.setHex(color);
    m.emissiveIntensity = amount;
  }
}
function unflash(h) { for (const m of h.mats) { m.emissive.setHex(m.userData.base); m.emissiveIntensity = 0.8; } }

const POSE = {
  armLx: ['armL', 'x'], armLz: ['armL', 'z'], armRx: ['armR', 'x'], armRz: ['armR', 'z'],
  upperY: ['upper', 'y'], upperX: ['upper', 'x'], legLx: ['legL', 'x'], legRx: ['legR', 'x'], bodyX: ['body', 'x'],
};
function applyPose(h, t, k, dt) {
  const a = 1 - Math.exp(-k * dt);
  for (const key in POSE) {
    const [part, ax] = POSE[key];
    const r = h[part].rotation;
    r[ax] += ((t[key] ?? 0) - r[ax]) * a;
  }
}
function walkPose(t, phase, amt) {
  const s = Math.sin(phase);
  t.legLx = s * 0.85 * amt; t.legRx = -s * 0.85 * amt;
  t.armLx = -s * 0.6 * amt; t.armRx = (t.armRx ?? -0.3) + s * 0.35 * amt;
  t.bodyX = 0.12 * amt;
  return t;
}

// ───────────────────────── player ─────────────────────────
const player = {
  h: makeHumanoid({ robe: 0x2f5f8a, trim: 0xe9e1cd, pants: 0x1f2a36, bladeColor: 0xd8ecff, bladeGlow: 0x3d8fd8 }),
  vel: new V3(), facing: Math.PI, radius: 0.45,
};
player.pos = player.h.root.position;
scene.add(player.h.root);
const qiAura = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 2.4, 20, 1, true), additive(0x6fc0ff, 0));
qiAura.position.y = 1.2;
player.h.root.add(qiAura);

function resetPlayer() {
  Object.assign(player, {
    hp: 100, maxHp: 100, qi: 60, maxQi: 100, onGround: true, jumps: 0, dead: false,
    attackT: 0, attackDur: 0, combo: 0, comboWindow: 0, queued: false, hitDone: false,
    castT: 0, castDur: 0, castType: null, castFired: false,
    dashT: 0, dashDir: new V3(), invuln: 0, flipT: 0, walkPhase: 0, spin: 0,
    mods: { sword: 1, palm: 1, palmSize: 1, qiRegen: 1, lifesteal: 0, dashCost: 15, speed: 1, crit: 0.15, armor: 0, swordWave: 0 },
    manuals: {},
  });
  player.pos.set(0, 0, 6);
  player.vel.set(0, 0, 0);
  player.facing = Math.PI;
  player.h.body.rotation.x = 0;
  unflash(player.h);
}

const facingVec = (a) => new V3(Math.sin(a), 0, Math.cos(a));
function nearestEnemy(maxDist, coneDot = -2, dir = null) {
  let best = null, bd = maxDist;
  for (const e of enemies) {
    if (e.dead) continue;
    const d = new V3(e.pos.x - player.pos.x, 0, e.pos.z - player.pos.z);
    const dist = d.length();
    if (dist > bd) continue;
    if (dir && d.normalize().dot(dir) < coneDot) continue;
    best = e; bd = dist;
  }
  return best;
}
function camForward() { return new V3(-Math.sin(cam.yaw), 0, -Math.cos(cam.yaw)); }
function inputDir() {
  const ix = (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0);
  const iz = (keys.KeyW ? 1 : 0) - (keys.KeyS ? 1 : 0);
  const f = camForward(), r = new V3(Math.cos(cam.yaw), 0, -Math.sin(cam.yaw));
  const v = f.multiplyScalar(iz).addScaledVector(r, ix);
  return v.lengthSq() > 0 ? v.normalize() : v;
}
function autoFace(range, fallback) {
  const move = inputDir();
  const pref = move.lengthSq() > 0 ? move : fallback;
  const t = nearestEnemy(range, 0.1, pref) || nearestEnemy(range * 0.6);
  if (t) player.facing = Math.atan2(t.pos.x - player.pos.x, t.pos.z - player.pos.z);
  else if (pref) player.facing = Math.atan2(pref.x, pref.z);
}

function busy() { return player.attackT > 0 || player.castT > 0; }

function tryAttack() {
  if (state !== 'playing' || player.dead || player.castT > 0) return;
  if (player.attackT > 0) { player.queued = true; return; }
  startAttack(player.comboWindow > 0 ? (player.combo + 1) % 3 : 0);
}
function startAttack(c) {
  const p = player;
  p.combo = c;
  p.attackDur = p.attackT = [0.36, 0.34, 0.52][c];
  p.hitDone = false; p.queued = false; p.comboWindow = 0;
  autoFace(5, camForward());
  p.vel.addScaledVector(facingVec(p.facing), c === 2 ? 7 : 5);
  sfx.slash(c);
}
function slashHit(c) {
  const p = player;
  const range = [2.7, 2.7, 3.5][c], minDot = [0.25, 0.25, -2][c], base = [16, 20, 34][c];
  const f = facingVec(p.facing);
  let hits = 0;
  for (const e of enemies) {
    if (e.dead) continue;
    const d = new V3(e.pos.x - p.pos.x, 0, e.pos.z - p.pos.z);
    const dist = d.length();
    if (dist > range + e.radius || Math.abs(e.pos.y - p.pos.y) > 2.5) continue;
    d.normalize();
    if (dist > 0.6 && d.dot(f) < minDot) continue;
    const crit = Math.random() < p.mods.crit;
    const dmg = Math.round(base * p.mods.sword * rand(0.85, 1.15) * (crit ? 1.8 : 1));
    hitEnemy(e, dmg, dist > 0.01 ? d : f, c === 2 ? 10 : 4.5, crit);
    hits++;
  }
  if (hits) { p.qi = Math.min(p.maxQi, p.qi + 4 * hits); hitstop = 0.055; shake = Math.max(shake, 0.18); }
  slashVfx(c);
  if (c === 2 && p.mods.swordWave) fireSwordWave();
}
function slashVfx(c) {
  const full = c === 2;
  const g = new THREE.Group();
  const tilt = new THREE.Group();
  g.add(tilt);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(1.0, full ? 3.4 : 2.7, 32, 1, full ? 0 : -Math.PI / 2 - 1.2, full ? TAU : 2.4),
    additive(0xcfeaff, 0.85)
  );
  ring.rotation.x = -Math.PI / 2;
  tilt.add(ring);
  tilt.rotation.z = [0.45, -0.35, 0][c];
  g.position.copy(player.pos); g.position.y += full ? 0.9 : 1.25;
  g.rotation.y = player.facing;
  addEffect(g, full ? 0.3 : 0.2, (o, k) => {
    ring.material.opacity = 0.85 * (1 - k);
    o.scale.setScalar(0.85 + k * 0.3);
    if (full) o.rotation.y += 0.25;
  });
}

function tryPalm() {
  const p = player;
  if (state !== 'playing' || p.dead || busy() || p.qi < 25) return;
  p.qi -= 25;
  p.castType = 'palm'; p.castDur = p.castT = 0.42; p.castFired = false;
  autoFace(18, camForward());
}
function launch(g, dir, { speed, life, dmg, knock, radius, color, spin = 0 }) {
  g.position.copy(player.pos).addScaledVector(dir, 1.0); g.position.y += 1.35;
  g.lookAt(g.position.clone().add(dir));
  scene.add(g);
  projectiles.push({ obj: g, vel: dir.clone().multiplyScalar(speed), life, dmg, knock, radius, color, spin, hitSet: new Set() });
}
function firePalm() {
  const f = facingVec(player.facing);
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo('palmCore', () => new THREE.SphereGeometry(0.32, 16, 12)), additive(0xffffff, 1)));
  g.add(new THREE.Mesh(geo('palmGlow', () => new THREE.SphereGeometry(0.75, 16, 12)), additive(0x3d9fff, 0.45)));
  g.add(new THREE.Mesh(geo('palmHalo', () => new THREE.TorusGeometry(0.8, 0.07, 6, 24)), additive(0x9fd6ff, 0.8)));
  const size = player.mods.palmSize;
  g.scale.setScalar(size);
  launch(g, f, { speed: 24, life: 1.3, dmg: [36, 46].map((d) => d * player.mods.palm), knock: 13, radius: 0.9 * size, color: 0x6fc0ff, spin: 10 });
  sfx.palm();
  burst(g.position, 20, 0x6fc0ff, 6, 0.4);
}
function fireSwordWave() {
  const f = facingVec(player.facing);
  const g = new THREE.Group();
  // flat crescent centred on local +z (the travel direction after lookAt)
  const arc = new THREE.Mesh(geo('waveArc', () => new THREE.RingGeometry(1.0, 1.7, 24, 1, -Math.PI / 2 - 0.9, 1.8)), additive(0xcfeaff, 0.9));
  arc.rotation.x = -Math.PI / 2;
  g.add(arc);
  launch(g, f, { speed: 30, life: 0.55, dmg: [22, 28].map((d) => d * player.mods.sword * player.mods.swordWave), knock: 8, radius: 1.5, color: 0xcfeaff });
  sfx.slash(2);
}

function tryUlt() {
  const p = player;
  if (state !== 'playing' || p.dead || busy() || p.qi < p.maxQi) return;
  p.qi = 0;
  p.castType = 'ult'; p.castDur = p.castT = 1.05; p.castFired = false; p.ultJumped = false;
  p.invuln = 1.2;
  sfx.charge();
}
function fireUlt() {
  const p = player;
  shake = 0.7; hitstop = 0.08;
  sfx.ult();
  shockRing(p.pos, 11, 0x8fd0ff, 0.6);
  shockRing(p.pos, 7, 0xffffff, 0.4);
  burst(p.pos.clone().setY(0.5), 80, 0x8fd0ff, 14, 0.8, 4, 0.5);
  for (const e of enemies) {
    if (e.dead) continue;
    const d = new V3(e.pos.x - p.pos.x, 0, e.pos.z - p.pos.z);
    if (d.length() > 13) continue;
    lightning(e.pos.clone().setY(e.pos.y + 1));
    hitEnemy(e, Math.round(rand(70, 90)), d.normalize(), 12, true);
  }
}

function tryJump() {
  const p = player;
  if (state !== 'playing' || p.dead || p.castT > 0) return;
  if (p.onGround) {
    p.vel.y = 11; p.jumps = 1; p.onGround = false;
    sfx.jump();
  } else if (p.jumps < 2 && p.qi >= 10) {
    p.qi -= 10; p.vel.y = 12.5; p.jumps = 2; p.flipT = 0.5;
    const mv = inputDir();
    if (mv.lengthSq()) { p.vel.x += mv.x * 4; p.vel.z += mv.z * 4; }
    shockRing(p.pos, 2.2, 0x9fd6ff, 0.35);
    burst(p.pos, 16, 0xcfeaff, 5, 0.4);
    sfx.jump(true);
  }
}
function tryDash() {
  const p = player;
  if (state !== 'playing' || p.dead || p.castT > 0 || p.dashT > 0 || p.qi < p.mods.dashCost) return;
  p.qi -= p.mods.dashCost;
  const mv = inputDir();
  p.dashDir = mv.lengthSq() ? mv : facingVec(p.facing);
  p.facing = Math.atan2(p.dashDir.x, p.dashDir.z);
  p.dashT = 0.22; p.invuln = Math.max(p.invuln, 0.3);
  p.attackT = 0; p.queued = false;
  sfx.dash();
}

function damagePlayer(dmg, from) {
  const p = player;
  if (p.dead || p.invuln > 0 || p.dashT > 0) return false;
  dmg = Math.max(1, Math.round(dmg * (1 - p.mods.armor)));
  p.hp -= dmg; p.invuln = 0.55;
  floatText(p.pos.clone().setY(p.pos.y + 2.3), '-' + dmg, 'player');
  flash(p.h, 0xff2020, 1.2);
  setTimeout(() => !p.dead && unflash(p.h), 110);
  if (from) { const d = new V3(p.pos.x - from.x, 0, p.pos.z - from.z).normalize(); p.vel.addScaledVector(d, 7); }
  shake = Math.max(shake, 0.3);
  $('hurt').style.opacity = '1';
  setTimeout(() => ($('hurt').style.opacity = '0'), 160);
  sfx.hurt();
  burst(p.pos.clone().setY(p.pos.y + 1.2), 14, 0xff3030, 5, 0.4, 8);
  if (p.hp <= 0) { p.hp = 0; p.dead = true; setTimeout(gameOver, 1400); }
  return true;
}

function updatePlayer(dt) {
  const p = player, h = p.h;
  p.invuln = Math.max(0, p.invuln - dt);
  p.comboWindow = Math.max(0, p.comboWindow - dt);
  p.qi = Math.min(p.maxQi, p.qi + (p.castType === 'ult' ? 0 : 7 * p.mods.qiRegen) * dt);

  const move = p.dead ? new V3() : inputDir();
  if (p.dashT > 0) {
    p.dashT -= dt;
    p.vel.x = p.dashDir.x * 24; p.vel.z = p.dashDir.z * 24;
    if (Math.random() < 0.8) burst(p.pos.clone().setY(p.pos.y + 1), 2, 0x6fc0ff, 1.5, 0.35);
  } else {
    const mult = busy() ? 0.15 : 1;
    const k = p.onGround ? 14 : 4;
    const run = 7.5 * p.mods.speed * mult;
    p.vel.x = damp(p.vel.x, move.x * run, k, dt);
    p.vel.z = damp(p.vel.z, move.z * run, k, dt);
    if (!busy() && move.lengthSq() && !p.dead) p.facing = dampAngle(p.facing, Math.atan2(move.x, move.z), 14, dt);
  }
  p.vel.y -= (p.castType === 'ult' ? 22 : 32) * dt;
  p.pos.addScaledVector(p.vel, dt);
  if (p.pos.y <= 0) {
    if (!p.onGround && p.vel.y < -14) burst(p.pos, 10, 0xe8dcc4, 3, 0.4);
    p.pos.y = 0; p.vel.y = 0; p.onGround = true; p.jumps = 0;
  } else p.onGround = false;
  resolveCollisions(p.pos, p.radius);

  // attack timeline
  if (p.attackT > 0) {
    p.attackT -= dt;
    const prog = 1 - p.attackT / p.attackDur;
    if (!p.hitDone && prog >= 0.38) { p.hitDone = true; slashHit(p.combo); }
    if (p.attackT <= 0) {
      p.attackT = 0;
      if (p.queued) startAttack((p.combo + 1) % 3);
      else p.comboWindow = 0.45;
    }
  }
  // skill casting
  if (p.castT > 0) {
    p.castT -= dt;
    const prog = 1 - p.castT / p.castDur;
    if (p.castType === 'palm' && !p.castFired && prog >= 0.35) { p.castFired = true; firePalm(); }
    if (p.castType === 'ult') {
      if (!p.ultJumped && prog > 0.15) { p.ultJumped = true; p.vel.y = 9; }
      if (prog < 0.6 && Math.random() < 0.9) burst(p.pos.clone().add(new V3(rand(-1, 1), rand(0, 2.5), rand(-1, 1))), 2, 0x8fd0ff, 2, 0.4, -4);
      if (!p.castFired && prog >= 0.6) { p.castFired = true; p.vel.y = -30; }
      if (p.castFired && p.onGround && !p.ultLanded) { p.ultLanded = true; fireUlt(); }
    }
    if (p.castT <= 0) { p.castT = 0; p.castType = null; p.ultLanded = false; }
  }

  // ── pose ──
  const speed = Math.hypot(p.vel.x, p.vel.z);
  p.walkPhase += dt * speed * 1.5;
  const breathe = Math.sin(performance.now() * 0.002) * 0.03;
  let t = { armLz: 0.12, armRz: -0.12, armRx: -0.35, upperX: breathe };
  let k = 14;
  p.spin = 0;
  if (p.dead) {
    t = { bodyX: -1.4, armLz: 1.2, armRz: -1.2 };
    k = 5;
  } else if (p.attackT > 0) {
    const pr = easeOut(1 - p.attackT / p.attackDur);
    k = 32;
    if (p.combo === 0) t = { armRx: -2.9 + pr * 2.6, armRz: -0.25, upperY: 0.45 - pr * 0.8, bodyX: 0.15, legLx: 0.4, legRx: -0.3, armLz: 0.5 };
    else if (p.combo === 1) t = { armRx: -1.5, armRz: -0.3, upperY: -1.3 + pr * 2.5, bodyX: 0.1, legLx: -0.3, legRx: 0.4, armLx: 0.3 };
    else { t = { armRx: -0.2, armRz: -1.5, armLz: 1.2, bodyX: 0.15, legLx: 0.5, legRx: -0.5 }; p.spin = pr * TAU; }
  } else if (p.castType === 'palm') {
    const pr = 1 - p.castT / p.castDur;
    k = 26;
    t = pr < 0.35 ? { armLx: 0.6, armRx: 0.6, upperY: -0.5, legLx: 0.5, legRx: -0.4 } : { armLx: -1.55, armRx: -1.55, armLz: -0.15, armRz: 0.15, upperX: 0.15, upperY: 0.1, legLx: 0.55, legRx: -0.45 };
  } else if (p.castType === 'ult') {
    k = 20;
    t = p.castFired ? { armRx: -0.6, armLx: 0.8, bodyX: 0.5, legLx: 1.0, legRx: -0.6 } : { armRx: -3.1, armLx: -3.0, armLz: -0.2, legLx: 0.8, legRx: 0.3 };
  } else if (p.dashT > 0) {
    t = { bodyX: 0.5, armLx: 1.0, armRx: 1.0, legLx: -0.6, legRx: 0.5 };
    k = 25;
  } else if (!p.onGround) {
    t = { armLz: 0.8, armRz: -0.8, armRx: -0.5, legLx: 0.9, legRx: -0.2, bodyX: 0.1 };
  } else if (speed > 0.5) {
    walkPose(t, p.walkPhase, Math.min(speed / 7.5, 1));
  }
  applyPose(h, t, k, dt);
  if (p.flipT > 0) {
    p.flipT -= dt;
    h.body.rotation.x = (1 - Math.max(p.flipT, 0) / 0.5) * TAU;
    if (p.flipT <= 0) h.body.rotation.x = 0;
  }
  h.root.rotation.y = p.facing + p.spin;
  h.root.visible = !(p.invuln > 0 && p.dashT <= 0 && !p.castType && Math.floor(p.invuln * 20) % 2 === 0);

  // qi aura when ultimate is ready
  const ready = p.qi >= p.maxQi && !p.dead;
  qiAura.material.opacity = damp(qiAura.material.opacity, ready ? 0.18 + Math.sin(performance.now() * 0.008) * 0.06 : 0, 6, dt);
  qiAura.rotation.y += dt * 2;
  if (ready && Math.random() < 0.3) burst(p.pos.clone().add(new V3(rand(-0.6, 0.6), rand(0, 1), rand(-0.6, 0.6))), 1, 0x6fc0ff, 1, 0.8, -3);
}

// ───────────────────────── enemies ─────────────────────────
const enemies = [];
const projectiles = [];
const orbs = [];
const TYPES = {
  bandit: { name: '산적', robe: 0x7a4a2a, trim: 0x3a2a1a, pants: 0x3b3026, hp: 55, speed: 3.6, dmg: 8, range: 1.7, windup: 0.6, blade: 'dao', score: 100, radius: 0.5 },
  blade: { name: '흑도 무사', robe: 0x1d1d24, trim: 0xa01818, pants: 0x121216, hp: 85, speed: 4.6, dmg: 12, range: 1.9, windup: 0.45, blade: 'dao', score: 180, radius: 0.5 },
  boss: { name: '마교 교주', robe: 0x4a0d18, trim: 0xd4af37, pants: 0x1a0a0e, hair: 0xe8e8e8, hp: 520, speed: 3.3, dmg: 22, range: 2.9, windup: 0.7, blade: 'sword', bladeColor: 0xff6a6a, bladeGlow: 0xa01818, scale: 1.6, score: 1500, radius: 0.85 },
};

function spawnEnemy(typeKey, wave) {
  const T = TYPES[typeKey];
  const h = makeHumanoid({ ...T });
  let x, z, tries = 0;
  do {
    const a = rand(0, TAU), d = rand(26, 36);
    x = Math.cos(a) * d; z = Math.sin(a) * d;
  } while (tries++ < 20 && (colliders.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + 1.5) || Math.hypot(x - player.pos.x, z - player.pos.z) < 14));
  h.root.position.set(x, 0, z);
  scene.add(h.root);
  const hpScale = 1 + (wave - 1) * 0.12;
  const e = {
    type: typeKey, T, h, pos: h.root.position,
    hp: Math.round(T.hp * hpScale + (typeKey === 'boss' ? wave * 40 : 0)),
    radius: T.radius, facing: Math.atan2(-x, -z),
    state: 'chase', t: 0, cd: rand(0.5, 1.5), knock: new V3(), vy: 0,
    dead: false, deadT: 0, walkPhase: rand(0, TAU), slamCd: 4, strafe: Math.random() < 0.5 ? 1 : -1,
    speedMul: rand(0.9, 1.1), boss: typeKey === 'boss',
  };
  e.maxHp = e.hp;
  if (!e.boss) {
    const bar = new THREE.Group();
    const bg = new THREE.Mesh(geo('hpbar', () => new THREE.PlaneGeometry(1, 0.1)), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.6, depthWrite: false }));
    const fg = new THREE.Mesh(geo('hpbar', () => new THREE.PlaneGeometry(1, 0.1)), new THREE.MeshBasicMaterial({ color: 0xd8343a, depthWrite: false }));
    fg.position.z = 0.001;
    bar.add(bg, fg);
    bar.visible = false;
    scene.add(bar);
    e.bar = bar; e.barFill = fg;
  } else {
    $('bossbar').classList.remove('hidden');
    sfx.gong();
  }
  burst(new V3(x, 1, z), 20, 0x551122, 4, 0.8, -2);
  enemies.push(e);
  return e;
}

function hitEnemy(e, dmg, dir, knock, crit = false) {
  if (e.dead) return;
  e.hp -= dmg;
  floatText(e.pos.clone().setY(e.pos.y + 2.3 * e.h.root.scale.y), crit ? dmg + '!' : String(dmg), crit ? 'crit' : '');
  flash(e.h, 0xffffff, 1.4);
  e.flashT = 0.08;
  e.knock.addScaledVector(dir, e.boss ? knock * 0.25 : knock);
  if (!e.boss || dmg >= 60 || Math.random() < 0.15) {
    if (e.state !== 'leap') { e.state = 'stagger'; e.t = e.boss ? 0.2 : 0.38; }
  }
  sfx.hit(crit);
  burst(e.pos.clone().setY(e.pos.y + 1.3 * e.h.root.scale.y), crit ? 22 : 12, crit ? 0xffd34d : 0xfff0c0, 7, 0.35, 10);
  burst(e.pos.clone().setY(e.pos.y + 1.2), 6, 0xaa1010, 4, 0.5, 14);
  if (e.bar) e.barT = 3;
  if (e.hp <= 0) killEnemy(e, dir);
}

function killEnemy(e, dir) {
  e.dead = true; e.hp = 0; e.deadT = 0;
  e.knock.addScaledVector(dir, 4);
  unflash(e.h);
  stats.kills++;
  stats.score += e.T.score * (1 + Math.floor(waves.n / 3));
  player.qi = Math.min(player.maxQi, player.qi + (e.boss ? 100 : 12));
  if (player.mods.lifesteal && !player.dead) {
    player.hp = Math.min(player.maxHp, player.hp + player.mods.lifesteal);
    floatText(player.pos.clone().setY(player.pos.y + 2.2), '+' + player.mods.lifesteal, 'heal');
  }
  sfx.kill();
  if (e.bar) { scene.remove(e.bar); disposeTree(e.bar); e.bar = null; }
  if (e.boss) {
    $('bossbar').classList.add('hidden');
    shake = 0.6; hitstop = 0.25;
    for (let i = 0; i < 4; i++) dropOrb(e.pos.clone().add(new V3(rand(-2, 2), 0, rand(-2, 2))));
  } else if (Math.random() < 0.3) dropOrb(e.pos.clone());
}

function dropOrb(pos) {
  const m = new THREE.Mesh(geo('orb', () => new THREE.IcosahedronGeometry(0.25, 1)), new THREE.MeshStandardMaterial({ color: 0x7dff9a, emissive: 0x2aff6a, emissiveIntensity: 1.2 }));
  m.position.copy(pos).setY(0.6);
  scene.add(m);
  orbs.push({ mesh: m, t: 0 });
}

function updateEnemies(dt) {
  const p = player;
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i], h = e.h, T = e.T;
    const sc = h.root.scale.y;
    e.pos.addScaledVector(e.knock, dt);
    e.knock.multiplyScalar(Math.exp(-7 * dt));
    if (e.flashT > 0) { e.flashT -= dt; if (e.flashT <= 0) unflash(h); }

    if (e.dead) {
      e.deadT += dt;
      h.root.rotation.x = damp(h.root.rotation.x, -Math.PI / 2, 8, dt);
      if (e.deadT > 1.3) e.pos.y -= dt * 0.8;
      if (e.deadT > 2.6) { scene.remove(h.root); disposeTree(h.root); enemies.splice(i, 1); }
      continue;
    }

    const to = new V3(p.pos.x - e.pos.x, 0, p.pos.z - e.pos.z);
    const dist = to.length();
    const dir = dist > 1e-3 ? to.clone().divideScalar(dist) : new V3(0, 0, 1);
    const reach = T.range * (e.boss ? 1 : 1) + p.radius;
    let t = { armLz: 0.15, armRz: -0.15, armRx: -0.4 };
    let k = 12;
    e.cd -= dt;
    e.slamCd -= dt;
    const moving = new V3();

    switch (e.state) {
      case 'chase': {
        e.facing = dampAngle(e.facing, Math.atan2(dir.x, dir.z), 8, dt);
        if (p.dead) break;
        if (e.boss && e.slamCd <= 0 && dist > 4 && dist < 16) {
          e.state = 'leap'; e.t = 0; e.from = e.pos.clone(); e.to = p.pos.clone().setY(0);
          e.telegraph = new THREE.Mesh(geo('ring', () => new THREE.RingGeometry(0.85, 1, 48).rotateX(-Math.PI / 2)), additive(0xff2a2a, 0.7));
          e.telegraph.position.copy(e.to).setY(0.06);
          e.telegraph.scale.setScalar(4.5);
          scene.add(e.telegraph);
          sfx.charge();
          break;
        }
        if (dist > reach) {
          moving.copy(dir);
          if (dist < 6) moving.addScaledVector(new V3(-dir.z, 0, dir.x), 0.35 * e.strafe).normalize();
          e.pos.addScaledVector(moving, T.speed * e.speedMul * dt);
        } else if (e.cd <= 0) {
          e.state = 'windup'; e.t = T.windup;
        }
        break;
      }
      case 'windup': {
        e.facing = dampAngle(e.facing, Math.atan2(dir.x, dir.z), 5, dt);
        e.t -= dt;
        const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.03);
        flash(h, 0xff3a1a, 0.25 + pulse * 0.5);
        t = { armRx: -2.7, armRz: -0.3, upperY: 0.5, bodyX: -0.1, legLx: 0.3, legRx: -0.3 };
        k = 10;
        if (e.t <= 0) { unflash(h); e.state = 'strike'; e.t = 0.28; e.struck = false; e.pos.addScaledVector(dir, Math.min(0.8, Math.max(0, dist - reach + 0.8))); }
        break;
      }
      case 'strike': {
        e.t -= dt;
        t = { armRx: -0.25, armRz: -0.2, upperY: -0.5, bodyX: 0.25, legLx: 0.4, legRx: -0.4 };
        k = 30;
        if (!e.struck) {
          e.struck = true;
          sfx.enemySwing();
          const fv = facingVec(e.facing);
          if (dist < reach + 0.7 && dir.dot(fv) > 0.3 && Math.abs(p.pos.y - e.pos.y) < 1.6 * sc) damagePlayer(Math.round(T.dmg * (1 + (waves.n - 1) * 0.06)), e.pos);
        }
        if (e.t <= 0) { e.state = 'chase'; e.cd = rand(0.9, 1.9) * (e.boss ? 0.7 : 1); }
        break;
      }
      case 'stagger': {
        e.t -= dt;
        t = { bodyX: -0.45, armLz: 0.9, armRz: -0.9, armRx: 0.3 };
        k = 20;
        if (e.t <= 0) { e.state = 'chase'; e.cd = Math.max(e.cd, 0.35); }
        break;
      }
      case 'leap': {
        e.t += dt / 0.95;
        const tt = Math.min(e.t, 1);
        e.pos.x = THREE.MathUtils.lerp(e.from.x, e.to.x, tt);
        e.pos.z = THREE.MathUtils.lerp(e.from.z, e.to.z, tt);
        e.pos.y = Math.sin(tt * Math.PI) * 7;
        e.facing = Math.atan2(e.to.x - e.from.x, e.to.z - e.from.z);
        t = tt < 0.7 ? { armRx: -3.0, armLx: -3.0, legLx: 0.9, legRx: 0.2 } : { armRx: -0.2, armLx: 0.6, bodyX: 0.5, legLx: 0.8, legRx: -0.5 };
        k = 14;
        if (e.telegraph) e.telegraph.material.opacity = 0.4 + 0.4 * Math.sin(performance.now() * 0.03);
        if (e.t >= 1) {
          e.pos.y = 0;
          scene.remove(e.telegraph); e.telegraph.material.dispose(); e.telegraph = null;
          shake = 0.55;
          sfx.slam();
          shockRing(e.pos, 5, 0xff4a2a, 0.5);
          burst(e.pos.clone().setY(0.3), 50, 0xffa060, 10, 0.6, 6, 0.4);
          const d = Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
          if (d < 4.8 && p.pos.y < 1.2) damagePlayer(Math.round(T.dmg * 1.3), e.pos);
          e.state = 'chase'; e.cd = 0.8; e.slamCd = rand(5, 8);
        }
        break;
      }
    }

    // separation
    for (const o of enemies) {
      if (o === e || o.dead) continue;
      const dx = e.pos.x - o.pos.x, dz = e.pos.z - o.pos.z;
      const d = Math.hypot(dx, dz), min = e.radius + o.radius;
      if (d < min && d > 1e-4) { const push = (min - d) * 0.5; e.pos.x += (dx / d) * push; e.pos.z += (dz / d) * push; }
    }
    if (e.state !== 'leap') {
      const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, d = Math.hypot(dx, dz), min = e.radius + p.radius;
      if (d < min && d > 1e-4 && Math.abs(p.pos.y - e.pos.y) < 1.5) { e.pos.x = p.pos.x + (dx / d) * min; e.pos.z = p.pos.z + (dz / d) * min; }
      resolveCollisions(e.pos, e.radius);
    }

    if (moving.lengthSq() > 0) { e.walkPhase += dt * T.speed * 1.6; walkPose(t, e.walkPhase, 1); }
    applyPose(h, t, k, dt);
    h.root.rotation.y = e.facing;

    if (e.bar) {
      e.barT = Math.max(0, (e.barT || 0) - dt);
      e.bar.visible = e.barT > 0 || e.hp < e.maxHp;
      e.bar.position.set(e.pos.x, e.pos.y + 2.55 * sc, e.pos.z);
      e.bar.quaternion.copy(camera.quaternion);
      const r = Math.max(e.hp / e.maxHp, 0);
      e.barFill.scale.x = r; e.barFill.position.x = -(1 - r) / 2;
    }
    if (e.boss) $('bossFill').style.width = (e.hp / e.maxHp) * 100 + '%';
  }
}

function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const pr = projectiles[i];
    pr.life -= dt;
    pr.obj.position.addScaledVector(pr.vel, dt);
    if (pr.spin) {
      pr.obj.children[2].rotation.z += dt * pr.spin;
      pr.obj.children[1].scale.setScalar(1 + Math.sin(performance.now() * 0.03) * 0.12);
    }
    burst(pr.obj.position, 2, pr.color, 1.5, 0.35);
    for (const e of enemies) {
      if (e.dead || pr.hitSet.has(e)) continue;
      const sc = e.h.root.scale.y;
      const d = Math.hypot(e.pos.x - pr.obj.position.x, e.pos.z - pr.obj.position.z);
      if (d < pr.radius + e.radius && Math.abs(e.pos.y + 1.2 * sc - pr.obj.position.y) < 1.4 * sc) {
        pr.hitSet.add(e);
        const crit = Math.random() < player.mods.crit + 0.05;
        hitEnemy(e, Math.round(rand(pr.dmg[0], pr.dmg[1]) * (crit ? 1.8 : 1)), pr.vel.clone().normalize(), pr.knock, crit);
        hitstop = 0.04; shake = Math.max(shake, 0.2);
        shockRing(pr.obj.position.clone().setY(e.pos.y), 2.5, pr.color, 0.3);
      }
    }
    const hitWall = colliders.some((c) => Math.hypot(c.x - pr.obj.position.x, c.z - pr.obj.position.z) < c.r);
    if (pr.life <= 0 || hitWall) {
      burst(pr.obj.position, 24, pr.color, 6, 0.45);
      scene.remove(pr.obj); disposeTree(pr.obj);
      projectiles.splice(i, 1);
    }
  }
}

function updateOrbs(dt) {
  for (let i = orbs.length - 1; i >= 0; i--) {
    const o = orbs[i];
    o.t += dt;
    o.mesh.position.y = 0.6 + Math.sin(o.t * 4) * 0.15;
    o.mesh.rotation.y += dt * 2;
    const d = Math.hypot(player.pos.x - o.mesh.position.x, player.pos.z - o.mesh.position.z);
    if (d < 3.5 && !player.dead) o.mesh.position.lerp(new V3(player.pos.x, o.mesh.position.y, player.pos.z), 1 - Math.exp(-6 * dt));
    if ((d < 1.1 && !player.dead) || o.t > 15) {
      if (o.t <= 15) {
        const heal = 15;
        player.hp = Math.min(player.maxHp, player.hp + heal);
        floatText(player.pos.clone().setY(player.pos.y + 2.2), '+' + heal, 'heal');
        burst(o.mesh.position, 16, 0x7dff9a, 4, 0.5, -3);
        sfx.heal();
      }
      scene.remove(o.mesh); o.mesh.material.dispose();
      orbs.splice(i, 1);
    }
  }
}

// ───────────────────────── waves ─────────────────────────
const waves = { n: 0, toSpawn: [], spawnT: 0, betweenT: 0, active: false };
const stats = { kills: 0, score: 0 };

function startWave(n) {
  waves.n = n; waves.active = true; waves.spawnT = 0.5;
  const boss = n % 5 === 0;
  const count = boss ? 2 + n : Math.min(3 + n * 2, 22);
  const blackChance = clamp((n - 2) * 0.15, 0, 0.6);
  waves.toSpawn = [];
  if (boss) waves.toSpawn.push('boss');
  for (let i = 0; i < count; i++) waves.toSpawn.push(Math.random() < blackChance ? 'blade' : 'bandit');
  showBanner(`제 ${n} 파`, boss ? '마교 교주가 나타났다!' : `적 ${count}명 접근`);
  sfx.gong();
}
function updateWaves(dt) {
  if (!waves.active) {
    if (waves.upgradeT > 0) {
      waves.upgradeT -= dt;
      if (waves.upgradeT <= 0) openUpgrade();
      return;
    }
    waves.betweenT -= dt;
    if (waves.betweenT <= 0) startWave(waves.n + 1);
    return;
  }
  const alive = enemies.filter((e) => !e.dead).length;
  if (waves.toSpawn.length) {
    waves.spawnT -= dt;
    if (waves.spawnT <= 0 && alive < 10) { spawnEnemy(waves.toSpawn.shift(), waves.n); waves.spawnT = rand(0.6, 1.3); }
  } else if (alive === 0) {
    waves.active = false; waves.betweenT = 3; waves.upgradeT = 1.6;
    const heal = 25;
    player.hp = Math.min(player.maxHp, player.hp + heal);
    floatText(player.pos.clone().setY(2.2), '+' + heal, 'heal');
    showBanner('격퇴 성공', `내상 회복 +${heal}`);
  }
}

// ───────────────────────── 무공 비급 (upgrades between waves) ─────────────────────────
const MANUALS = [
  { id: 'sword', name: '검기 강화', hanja: '劍氣', desc: '검법 피해 +20%', max: 5, apply: (p) => (p.mods.sword += 0.2) },
  { id: 'body', name: '금강불괴', hanja: '金剛不壞', desc: '최대 체력 +25, 체력 25 회복', max: 4, apply: (p) => { p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 25); } },
  { id: 'qi', name: '소주천 심법', hanja: '小周天', desc: '내공 회복 속도 +40%', max: 4, apply: (p) => (p.mods.qiRegen += 0.4) },
  { id: 'leech', name: '흡성대법', hanja: '吸星大法', desc: '적을 처치할 때마다 체력 +3', max: 4, apply: (p) => (p.mods.lifesteal += 3) },
  { id: 'step', name: '이형환위', hanja: '移形換位', desc: '이동 속도 +10%, 보법 내공 소모 -4', max: 3, apply: (p) => { p.mods.speed += 0.1; p.mods.dashCost -= 4; } },
  { id: 'palm', name: '항룡장', hanja: '降龍掌', desc: '장풍 피해 +30%, 크기 +20%', max: 4, apply: (p) => { p.mods.palm += 0.3; p.mods.palmSize += 0.2; } },
  { id: 'crit', name: '벽력검', hanja: '霹靂劍', desc: '치명타 확률 +8%', max: 4, apply: (p) => (p.mods.crit += 0.08) },
  { id: 'guard', name: '호신강기', hanja: '護身罡氣', desc: '받는 피해 -12%', max: 3, apply: (p) => (p.mods.armor += 0.12) },
  { id: 'wave', name: '검강', hanja: '劍罡', desc: '3타 회전베기가 관통하는 검기 파동을 날린다 (단계마다 피해 증가)', max: 3, apply: (p) => (p.mods.swordWave += 1) },
];
let offered = [];
function openUpgrade() {
  const pool = MANUALS.filter((m) => (player.manuals[m.id] || 0) < m.max);
  offered = pool.sort(() => Math.random() - 0.5).slice(0, 3);
  if (!offered.length) return;
  state = 'upgrade';
  for (const k in keys) keys[k] = false;
  const box = $('cards');
  box.innerHTML = '';
  offered.forEach((m, i) => {
    const lv = (player.manuals[m.id] || 0) + 1;
    const el = document.createElement('button');
    el.className = 'card';
    el.innerHTML = `<kbd>${i + 1}</kbd><div class="hanja">${m.hanja}</div><b>${m.name}</b><small>${lv}성${lv === m.max ? ' (극성)' : ''}</small><p>${m.desc}</p>`;
    el.addEventListener('click', () => chooseUpgrade(i));
    box.appendChild(el);
  });
  $('upgrade').classList.remove('hidden');
  sfx.gong();
  if (document.pointerLockElement) document.exitPointerLock();
}
function chooseUpgrade(i) {
  const m = offered[i];
  if (state !== 'upgrade' || !m) return;
  player.manuals[m.id] = (player.manuals[m.id] || 0) + 1;
  m.apply(player);
  offered = [];
  $('upgrade').classList.add('hidden');
  renderManuals();
  showBanner(`${m.name} 습득`, m.desc);
  burst(player.pos.clone().setY(1.2), 40, 0xffd34d, 6, 0.8, -2);
  sfx.heal();
  state = 'playing';
  canvas.requestPointerLock?.();
}
function renderManuals() {
  $('manuals').innerHTML = MANUALS.filter((m) => player.manuals[m.id])
    .map((m) => `<span title="${m.name}: ${m.desc}">${m.hanja} <b>${player.manuals[m.id]}</b></span>`).join('');
}

// best score (per browser)
const BEST_KEY = 'murim.best';
function loadBest() { try { return JSON.parse(localStorage.getItem(BEST_KEY)) || null; } catch { return null; } }
function saveBest(b) { try { localStorage.setItem(BEST_KEY, JSON.stringify(b)); } catch { /* storage unavailable */ } }
function showBest() {
  const b = loadBest();
  $('best').textContent = b ? `최고 기록 — 제 ${b.wave} 파 · 명성 ${b.score.toLocaleString()}` : '';
}
showBest();
let bannerTimer = 0;
function showBanner(big, small) {
  const b = $('banner');
  b.querySelector('.big').textContent = big;
  b.querySelector('.small').textContent = small;
  b.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => b.classList.remove('show'), 2400);
}

// ───────────────────────── camera / input ─────────────────────────
const cam = { yaw: 0, pitch: 0.38, dist: 7.5, target: new V3(0, 1.6, 6) };
let shake = 0, hitstop = 0;
function updateCamera(dt) {
  const tgt = player.pos.clone().add(new V3(0, 1.6, 0));
  cam.target.x = damp(cam.target.x, tgt.x, 12, dt);
  cam.target.z = damp(cam.target.z, tgt.z, 12, dt);
  cam.target.y = damp(cam.target.y, tgt.y, 6, dt);
  const dir = new V3(Math.sin(cam.yaw) * Math.cos(cam.pitch), Math.sin(cam.pitch), Math.cos(cam.yaw) * Math.cos(cam.pitch));
  // pull the camera in when trees / pillars / the arena edge would block the view
  let dist = cam.dist;
  for (let d = 1; d <= cam.dist; d += 0.5) {
    const x = cam.target.x + dir.x * d, y = cam.target.y + dir.y * d, z = cam.target.z + dir.z * d;
    if (y < 7 && (Math.hypot(x, z) > ARENA_R + 3 || colliders.some((c) => Math.hypot(c.x - x, c.z - z) < c.r + 0.9))) { dist = Math.max(d - 0.5, 1.5); break; }
  }
  cam.curDist = damp(cam.curDist ?? dist, dist, dist < (cam.curDist ?? dist) ? 20 : 4, dt);
  camera.position.copy(cam.target).addScaledVector(dir, cam.curDist);
  if (camera.position.y < 0.4) camera.position.y = 0.4;
  camera.lookAt(cam.target);
  if (shake > 0) {
    const s = shake * shake * 0.6;
    camera.position.add(new V3(rand(-s, s), rand(-s, s), rand(-s, s)));
    shake = Math.max(0, shake - dt * 1.8);
  }
}

const keys = {};
let state = 'title';
addEventListener('keydown', (e) => {
  if (e.repeat) return;
  keys[e.code] = true;
  if (e.code === 'Space') { e.preventDefault(); tryJump(); }
  if (e.code === 'KeyJ') tryAttack();
  if (e.code === 'KeyK') tryPalm();
  if (e.code === 'KeyQ') tryUlt();
  if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') tryDash();
  if (e.code === 'KeyP' && state === 'playing') pause();
  if (state === 'upgrade' && /^Digit[123]$/.test(e.code)) chooseUpgrade(Number(e.code.slice(5)) - 1);
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
addEventListener('contextmenu', (e) => e.preventDefault());

const canvas = renderer.domElement;
canvas.addEventListener('mousedown', (e) => {
  if (state !== 'playing') return;
  if (document.pointerLockElement !== canvas) { canvas.requestPointerLock?.(); return; }
  if (e.button === 0) tryAttack();
  if (e.button === 2) tryPalm();
});
addEventListener('mousemove', (e) => {
  if (state !== 'playing' || document.pointerLockElement !== canvas) return;
  cam.yaw -= e.movementX * 0.0026;
  cam.pitch = clamp(cam.pitch + e.movementY * 0.002, 0.02, 1.15);
});
addEventListener('wheel', (e) => { cam.dist = clamp(cam.dist + Math.sign(e.deltaY) * 0.6, 4, 13); });
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement !== canvas && state === 'playing') pause();
});

function pause() {
  state = 'paused';
  $('pause').classList.remove('hidden');
  if (document.pointerLockElement) document.exitPointerLock();
}
$('pause').addEventListener('click', () => {
  $('pause').classList.add('hidden');
  state = 'playing';
  canvas.requestPointerLock?.();
});

function clearWorld() {
  for (const e of enemies) { scene.remove(e.h.root); disposeTree(e.h.root); if (e.bar) { scene.remove(e.bar); disposeTree(e.bar); } if (e.telegraph) scene.remove(e.telegraph); }
  enemies.length = 0;
  for (const p of projectiles) { scene.remove(p.obj); disposeTree(p.obj); }
  projectiles.length = 0;
  for (const o of orbs) { scene.remove(o.mesh); o.mesh.material.dispose(); }
  orbs.length = 0;
  for (const f of floaters) f.el.remove();
  floaters.length = 0;
  $('bossbar').classList.add('hidden');
}
function startGame() {
  initAudio();
  clearWorld();
  resetPlayer();
  stats.kills = 0; stats.score = 0;
  waves.n = 0; waves.active = false; waves.betweenT = 1.2; waves.upgradeT = 0;
  renderManuals();
  cam.yaw = 0; cam.pitch = 0.38;
  $('title').classList.add('hidden');
  $('over').classList.add('hidden');
  $('hud').classList.remove('hidden');
  state = 'playing';
  canvas.requestPointerLock?.();
}
function gameOver() {
  state = 'over';
  if (document.pointerLockElement) document.exitPointerLock();
  const best = loadBest();
  const record = !best || stats.score > best.score;
  if (record) saveBest({ wave: waves.n, score: stats.score, kills: stats.kills });
  $('overStats').innerHTML = `제 ${waves.n} 파까지 버팀<br/>처치 ${stats.kills} · 명성 ${stats.score.toLocaleString()}` + (record && stats.score > 0 ? '<br/><b class="record">신기록!</b>' : '');
  showBest();
  $('over').classList.remove('hidden');
}
$('startBtn').addEventListener('click', startGame);
$('restartBtn').addEventListener('click', startGame);

// ───────────────────────── HUD ─────────────────────────
const skillEls = Object.fromEntries([...document.querySelectorAll('.skill')].map((el) => [el.dataset.skill, el]));
function updateHud() {
  const p = player;
  $('hpFill').style.width = (p.hp / p.maxHp) * 100 + '%';
  $('hpText').textContent = `체력 ${Math.ceil(p.hp)} / ${p.maxHp}`;
  $('qiFill').style.width = (p.qi / p.maxQi) * 100 + '%';
  $('qiText').textContent = `내공 ${Math.floor(p.qi)} / ${p.maxQi}`;
  $('qiFill').parentElement.classList.toggle('full', p.qi >= p.maxQi);
  $('waveNum').textContent = Math.max(waves.n, 1);
  $('kills').textContent = stats.kills;
  $('points').textContent = stats.score.toLocaleString();
  skillEls.palm.classList.toggle('off', p.qi < 25);
  skillEls.jump.classList.toggle('off', p.qi < 10);
  skillEls.dash.classList.toggle('off', p.qi < p.mods.dashCost);
  skillEls.dash.querySelector('small').textContent = `내공 ${p.mods.dashCost}`;
  skillEls.ult.classList.toggle('off', p.qi < p.maxQi);
  skillEls.ult.classList.toggle('ready', p.qi >= p.maxQi);
}

// ───────────────────────── ambient ─────────────────────────
function updateAmbient(dt, time) {
  const arr = petalGeo.attributes.position.array;
  const cx = player.pos.x, cz = player.pos.z;
  for (let i = 0; i < PETALS; i++) {
    const j = i * 3, s = petalSeed[i];
    arr[j] += (Math.sin(time * 0.9 + s) * 0.6 + 0.8) * dt;
    arr[j + 1] -= (0.7 + (s % 1) * 0.5) * dt;
    arr[j + 2] += Math.cos(time * 0.7 + s * 1.3) * 0.5 * dt;
    if (arr[j + 1] < 0 || Math.abs(arr[j] - cx) > 40 || Math.abs(arr[j + 2] - cz) > 40) {
      arr[j] = cx + rand(-40, 40); arr[j + 1] = rand(14, 22); arr[j + 2] = cz + rand(-40, 40);
    }
  }
  petalGeo.attributes.position.needsUpdate = true;
  for (const f of flags) {
    const pos = f.geometry.attributes.position, base = f.userData.base;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      pos.setZ(i, Math.sin(Math.abs(x) * 2.2 - time * 4 + f.position.x) * 0.22 * Math.abs(x));
    }
    pos.needsUpdate = true;
  }
}

// ───────────────────────── loop ─────────────────────────
resetPlayer();
const clock = new THREE.Clock();
let titleT = 0;
function frame() {
  requestAnimationFrame(frame);
  const raw = Math.min(clock.getDelta(), 0.05);
  const time = clock.elapsedTime;
  if (state === 'playing') {
    let dt = raw;
    if (hitstop > 0) { hitstop -= raw; dt = raw * 0.08; }
    updatePlayer(dt);
    updateEnemies(dt);
    updateProjectiles(dt);
    updateOrbs(dt);
    updateWaves(dt);
    updateCamera(raw);
    updateHud();
  } else if (state === 'title') {
    titleT += raw;
    cam.yaw = titleT * 0.08; cam.pitch = 0.25; cam.dist = 9;
    player.h.root.rotation.y = cam.yaw + 0.6;
    applyPose(player.h, { armRx: -0.35, armLz: 0.12, armRz: -0.12, upperX: Math.sin(time * 2) * 0.03 }, 10, raw);
    updateCamera(raw);
  } else if (state === 'over') {
    updatePlayer(raw * 0.5);
    updateEnemies(raw * 0.5);
    updateCamera(raw);
  }
  if (state !== 'paused') {
    updateParticles(raw);
    updateEffects(raw);
    updateFloaters(raw);
    updateAmbient(raw, time);
  }
  renderer.render(scene, camera);
}
frame();

// debug hook for automated checks
function simulate(seconds, dt = 1 / 60) {
  for (let t = 0; t < seconds && state === 'playing'; t += dt) {
    updatePlayer(dt); updateEnemies(dt); updateProjectiles(dt); updateOrbs(dt); updateWaves(dt);
    updateParticles(dt); updateEffects(dt); updateFloaters(dt); updateCamera(dt);
  }
  updateHud();
}
window.__murim = { player, enemies, waves, stats, keys, cam, chooseUpgrade, MANUALS, startGame, simulate, tryAttack, tryPalm, tryUlt, tryJump, tryDash, get state() { return state; } };
