// ConformalDAgger Studio: replays recorded ConformalDAgger runs on the UR5e + 2F-85 (MuJoCo, see
// export_studio.py) in a Poly Haven studio, with the method's quantities drawn on top.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

const $ = (id) => document.getElementById(id);
const A = "assets/", D = "studio/";
const params = new URLSearchParams(location.search);
const TABLE_H = 0.75;
const COL = { robot: 0x3fb950, asked: 0xf5a623, human: 0x4c8dff, alone: 0xdddddd };

// ---------------------------------------------------------------- renderer, camera, world
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1c1d20);
const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.02, 60);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI * 0.495; controls.minDistance = 0.25; controls.maxDistance = 8;
controls.autoRotateSpeed = 0.5;
const world = new THREE.Group(); world.rotation.x = -Math.PI / 2; scene.add(world);   // MuJoCo is z-up
const sim = new THREE.Group(); sim.position.z = TABLE_H; world.add(sim);             // sim origin = robot base on the table
const zup = (x, y, z) => new THREE.Vector3(x, z, -y);                                  // sim coords (room) -> three
const simV = (p) => zup(p[0], p[1], p[2] + TABLE_H);
addEventListener("resize", () => { if (params.has("record")) return; camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

const manager = new THREE.LoadingManager();
manager.onProgress = (u, d, t) => { $("bar").firstElementChild.style.width = `${(100 * d) / t}%`; $("what").textContent = u.split("/").pop(); };
let assetsLoaded = false;
manager.onLoad = () => { assetsLoaded = true; };
const tl = new THREE.TextureLoader(manager);
const gltf = new GLTFLoader(manager);

// ---------------------------------------------------------------- light
const pmrem = new THREE.PMREMGenerator(renderer);
new RGBELoader(manager).load(A + "hdri/brown_photostudio_02_2k.hdr", (tex) => {
  tex.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = pmrem.fromEquirectangular(tex).texture;
  scene.environmentIntensity = 0.8;
  scene.background = tex; scene.backgroundBlurriness = 0.4; scene.backgroundIntensity = 0.5;
});
const key = new THREE.DirectionalLight(0xfff1e0, 2.3);
key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -1.6, right: 1.6, top: 1.6, bottom: -1.6, near: 0.5, far: 10 });
key.shadow.bias = -0.0003; key.shadow.normalBias = 0.015; key.shadow.radius = 4;
key.position.copy(zup(1.6, 1.8, 4.0)); key.target.position.copy(zup(0, 0.35, TABLE_H));
scene.add(key, key.target);
const rim = new THREE.DirectionalLight(0xdfe8ff, 0.7);
rim.position.copy(zup(-2.2, -2.0, 3)); rim.target.position.copy(zup(0, 0.3, TABLE_H));
scene.add(rim, rim.target, new THREE.HemisphereLight(0xfff8f0, 0x4a4036, 0.35));

// ---------------------------------------------------------------- materials (Poly Haven textures)
function pbr(name, color) {
  const t = (m, srgb) => { const x = tl.load(`${A}textures/${name}/${name}_${m}_2k.jpg`); x.wrapS = x.wrapT = THREE.RepeatWrapping; x.anisotropy = 8; if (srgb) x.colorSpace = THREE.SRGBColorSpace; return x; };
  const m = new THREE.MeshStandardMaterial({ map: t("diff", true), normalMap: t("nor_gl"), roughnessMap: t("rough"), roughness: 1 });
  if (color) m.color.set(color);
  return m;
}
function uvBox(sx, sy, sz, tile) {
  const g = new THREE.BoxGeometry(sx, sy, sz), p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    const [a, b] = ax > 0.5 ? [p.getY(i), p.getZ(i)] : ay > 0.5 ? [p.getX(i), p.getZ(i)] : [p.getX(i), p.getY(i)];
    uv.setXY(i, a / tile, b / tile);
  }
  return g;
}
const concrete = pbr("concrete_floor_painted", 0x9b958c); concrete.map = null; concrete.roughness = 0.85;
const plaster = pbr("grey_plaster_02", 0xe6e1d8); plaster.map = null; plaster.roughness = 0.95;
const woodTable = pbr("laminate_floor_02", 0xe0b98f);
const woodCoaster = pbr("laminate_floor_02", 0x9a5f38);
const phys = (o) => new THREE.MeshPhysicalMaterial(o);
const M = {
  linkgray: phys({ color: 0xdcdfe2, metalness: 0.35, roughness: 0.32, clearcoat: 0.4, clearcoatRoughness: 0.3 }),
  urblue: phys({ color: 0x7db4d8, metalness: 0.05, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.25 }),
  jointgray: phys({ color: 0x45474b, metalness: 0.3, roughness: 0.45 }),
  black: phys({ color: 0x151617, metalness: 0.2, roughness: 0.5 }),
  gripper_metal: phys({ color: 0x9a9da1, metalness: 0.85, roughness: 0.3 }),
  gripper_gray: phys({ color: 0x5f6266, metalness: 0.4, roughness: 0.45 }),
  gripper_black: phys({ color: 0x1b1c1e, metalness: 0.25, roughness: 0.5 }),
  gripper_silicone: phys({ color: 0x2a2b2d, metalness: 0, roughness: 0.8 }),
  legMetal: phys({ color: 0x232427, metalness: 0.8, roughness: 0.35 }),
  plate: phys({ color: 0x3b3e44, metalness: 0.6, roughness: 0.4 }),
  ceramic: phys({ color: 0xf4f2ee, roughness: 0.22, clearcoat: 0.8, clearcoatRoughness: 0.15 }),
  coffee: phys({ color: 0x3b2112, roughness: 0.15, clearcoat: 1 }),
};
const ghostMat = new THREE.MeshPhysicalMaterial({ color: 0x78aaff, transparent: true, opacity: 0.38, roughness: 0.3, depthWrite: false });
// drawn on top of everything: the margin sits around the grip point, inside the fingers
const boxMat = new THREE.MeshBasicMaterial({ color: 0x2ec4b6, transparent: true, opacity: 0.28, depthWrite: false, depthTest: false });
const boxEdgeMat = new THREE.LineBasicMaterial({ color: 0x2ec4b6, transparent: true, opacity: 1, depthTest: false });

// ---------------------------------------------------------------- room, table, decoration
function addBox(parent, cx, cy, z0, sx, sy, h, mat, tile, shadow = true) {
  const m = new THREE.Mesh(tile ? uvBox(sx, sy, h, tile) : new THREE.BoxGeometry(sx, sy, h), mat);
  m.position.set(cx, cy, z0 + h / 2); m.receiveShadow = true; m.castShadow = shadow; parent.add(m); return m;
}
addBox(world, 0, 0, -0.02, 10, 10, 0.02, concrete, 3.5, false);
addBox(world, 0, -1.35, 0, 10, 0.1, 3.2, plaster, 4.0);         // wall behind the robot
addBox(world, -2.6, 0.5, 0, 0.1, 6, 3.2, plaster, 4.0);         // side wall
// table (top surface at TABLE_H): robot base near the back edge, work area in front
const TX = 0.0, TY = 0.28, TW = 1.5, TD = 1.1, TT = 0.04;
addBox(world, TX, TY, TABLE_H - TT, TW, TD, TT, woodTable, 0.9);
for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
  addBox(world, TX + sx * (TW / 2 - 0.06), TY + sy * (TD / 2 - 0.06), 0, 0.05, 0.05, TABLE_H - TT, M.legMetal);
const basePlate = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.012, 48).rotateX(Math.PI / 2), M.plate);
basePlate.position.set(0, 0, 0.006 - 0.012); basePlate.receiveShadow = true; sim.add(basePlate);

const Y2Z = new THREE.Matrix4().makeRotationX(Math.PI / 2);
function place(part, x, y, yaw, scale = 1) {
  gltf.load(`${A}parts/${part}.glb`, (g) => {
    g.scene.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    const h = new THREE.Group(); h.add(g.scene); g.scene.applyMatrix4(Y2Z);
    h.position.set(x, y, 0); h.rotation.z = yaw; h.scale.setScalar(scale); world.add(h);
  });
}
place("plant", 1.25, -1.05, 0.6);
place("plant_small", -1.15, -1.1, 0);
place("cabinet", -2.0, -1.0, 0);

// ---------------------------------------------------------------- mug geometry
const lathe = (pts, seg = 48) => new THREE.LatheGeometry(pts.map(([r, z]) => new THREE.Vector2(Math.max(r, 0), z)), seg).rotateX(Math.PI / 2);
function makeMug(r, h, matBody, matCoffee) {
  const g = new THREE.Group(), w = 0.004;
  const body = new THREE.Mesh(lathe([[0, -h], [r * 0.88, -h], [r, -h + 0.008], [r, h], [r - w, h], [r - w, -h + 0.01], [0, -h + 0.01]]), matBody);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(h * 0.48, 0.0068, 12, 28, Math.PI).rotateZ(-Math.PI / 2).rotateX(Math.PI / 2).translate(r - 0.002, 0, 0.002), matBody);
  g.add(body, handle);
  if (matCoffee) { const c = new THREE.Mesh(new THREE.CircleGeometry(r - w, 40), matCoffee); c.position.z = h * 0.62; g.add(c); }
  g.traverse((m) => { if (m.isMesh) { m.castShadow = !!matCoffee; m.receiveShadow = true; } });
  return g;   // upright, z-up, centred
}

// ---------------------------------------------------------------- robot from scene.json + meshes.bin
const qOf = (q) => new THREE.Quaternion(q[1], q[2], q[3], q[0]);   // MuJoCo w,x,y,z -> three
let SC, bodyGroups = [], gripperMats = [], halo;
async function buildRobot() {
  SC = await (await fetch(D + "scene.json")).json();
  const bin = await (await fetch(D + "meshes.bin")).arrayBuffer();
  const geos = SC.meshes.map((m) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(bin, m.pos[0], m.pos[1] / 4), 3));
    g.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(bin, m.nor[0], m.nor[1] / 4), 3));
    return g;
  });
  bodyGroups = SC.bodies.map((name) => { const b = new THREE.Group(); b.name = name; b.matrixAutoUpdate = true; sim.add(b); return b; });
  const tint = new Map();
  for (const g of SC.geoms) {
    const bname = SC.bodies[g.b];
    if (bname === "mug" || bname === "goal" || bname === "startmark") continue;   // drawn by hand below
    if (g.mesh === null) continue;
    let mat = M[g.mat] || M.gripper_gray;
    if (bname.startsWith("gripper_")) {          // gripper parts get their own copy so we can tint them
      if (!tint.has(mat)) { const c = mat.clone(); c.emissive = new THREE.Color(COL.robot); c.emissiveIntensity = 0.0; tint.set(mat, c); gripperMats.push(c); }
      mat = tint.get(mat);
    }
    const mesh = new THREE.Mesh(geos[g.mesh], mat);
    mesh.position.set(...g.p); mesh.quaternion.copy(qOf(g.q));
    mesh.castShadow = true; mesh.receiveShadow = true;
    bodyGroups[g.b].add(mesh);
  }
  // the held mug, in the mug body's frame (its z axis points out of the gripper, i.e. down)
  const mugBody = bodyGroups[SC.bodies.indexOf("mug")];
  const mug = makeMug(SC.cup_r, SC.cup_half, M.ceramic, M.coffee); mug.rotation.x = Math.PI; mugBody.add(mug);
  // status ring round the gripper (visible from far away)
  halo = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.006, 12, 48), new THREE.MeshBasicMaterial({ color: COL.robot }));
  halo.position.z = 0.03; bodyGroups[SC.bodies.indexOf("gripper_base")].add(halo);
}

// ---------------------------------------------------------------- overlays
const toWorld = (p) => [SC.task_origin[0] + p[0], SC.task_origin[1] + p[1], SC.task_origin[2] + p[2]];
const MUG_DROP = 0.005 + 0.35 * 0.048;     // pinch point -> mug centre (arm_env: mug body below pinch)
const overlay = new THREE.Group(); sim.add(overlay);
const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), boxMat);
const boxEdges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), boxEdgeMat);
const targetDot = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 16, 12), new THREE.MeshBasicMaterial({ color: 0x2ec4b6 }));
let ghost;
const goalCoaster = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.008, 48).rotateX(Math.PI / 2), woodCoaster);
goalCoaster.receiveShadow = true; goalCoaster.castShadow = true;
const ringGeo = new THREE.RingGeometry(0.046, 0.052, 48);
const oldGoals = new THREE.Group();
const startRing = new THREE.Mesh(new THREE.RingGeometry(0.028, 0.032, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
const trailMax = 200;
const trailGeo = new THREE.BufferGeometry();
trailGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(trailMax * 3), 3));
trailGeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(trailMax * 3), 3));
const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ vertexColors: true, linewidth: 2 }));
trail.frustumCulled = false;
const ghostLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
  new THREE.LineDashedMaterial({ color: 0x78aaff, dashSize: 0.006, gapSize: 0.004 }));
function buildOverlay() {
  ghost = makeMug(SC.cup_r, SC.cup_half, ghostMat, null);
  overlay.add(box, boxEdges, targetDot, ghost, goalCoaster, oldGoals, startRing, trail, ghostLine);
  box.renderOrder = boxEdges.renderOrder = targetDot.renderOrder = 10;
  targetDot.material.depthTest = false;
}

// ---------------------------------------------------------------- data + timeline
let RUN = null, timeline = [], pos = 0, playing = !params.has("paused"), speed = 1;
const opts = { alone: true, ghost: true, box: true };
async function loadRun(setting) {
  RUN = await (await fetch(`${D}run_${setting}.json`)).json();
  buildTimeline();
  const goals = [...new Set(RUN.segments.map((s) => s.goal.join(",")))];
  oldGoals.clear();
  for (const g of goals) {
    const w = toWorld(g.split(",").map(Number));
    const r = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
    r.position.set(w[0], w[1], 0.0015); oldGoals.add(r);
  }
  const eps = [...new Set(RUN.segments.map((s) => s.episode))];
  $("jump").innerHTML = eps.map((e) => `<option value="${e}">Episode ${e}</option>`).join("");
  drawChart(1);
  pos = 0;
}
function buildTimeline() {
  timeline = [];
  const HOLD = 8;                  // extra ticks at the end of each run (pause on the result)
  RUN.segments.forEach((s, si) => {
    if (s.kind === "alone" && !opts.alone) return;
    for (let k = 0; k < s.frames.length; k++) timeline.push({ si, k });
    for (let h = 0; h < HOLD; h++) timeline.push({ si, k: s.frames.length - 1, hold: true });
  });
  $("seek").max = timeline.length - 1;
}

// ---------------------------------------------------------------- per-frame update
const tmpQa = new THREE.Quaternion(), tmpQb = new THREE.Quaternion();
let lastSi = -1, lastK = -1, shownGoal = null;
function applyFrame() {
  if (!RUN || !timeline.length) return;
  const i = Math.min(Math.floor(pos), timeline.length - 1), f = pos - i;
  const a = timeline[i], b = timeline[Math.min(i + 1, timeline.length - 1)];
  const seg = RUN.segments[a.si];
  const fa = seg.frames[a.k], fb = (b.si === a.si && !a.hold) ? seg.frames[b.k] : fa;
  RUN.bodies.forEach((bid, j) => {
    const g = bodyGroups[bid], pa = fa[j], pb = fb[j];
    g.position.set(pa[0] + (pb[0] - pa[0]) * f, pa[1] + (pb[1] - pa[1]) * f, pa[2] + (pb[2] - pa[2]) * f);
    tmpQa.set(pa[4], pa[5], pa[6], pa[3]); tmpQb.set(pb[4], pb[5], pb[6], pb[3]);
    g.quaternion.copy(tmpQa.slerp(tmpQb, f));
  });

  const step = seg.steps.length ? seg.steps[Math.min(a.k, seg.steps.length - 1)] : null;
  const atEnd = a.k >= seg.frames.length - 1;
  const who = seg.kind === "alone" ? "alone" : (step ? step.who : "robot");
  const showStep = step && !atEnd;

  // margin box around the robot's next target
  box.visible = boxEdges.visible = targetDot.visible = opts.box && showStep;
  if (showStep) {
    const lo = toWorld(step.lo), hi = toWorld(step.hi);
    const c = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
    const s = [Math.max(hi[0] - lo[0], 0.003), Math.max(hi[1] - lo[1], 0.003), Math.max(hi[2] - lo[2], 0.003)];
    box.position.set(...c); box.scale.set(...s); boxEdges.position.copy(box.position); boxEdges.scale.copy(box.scale);
    const wide = step.u > RUN.tau;
    boxMat.color.set(wide ? 0xf5a623 : 0x2ec4b6); boxEdgeMat.color.copy(boxMat.color);
    targetDot.material.color.copy(boxMat.color);
    targetDot.position.set(...toWorld(step.ar));
  }
  // ghost: the teacher's move (the robot does not see it)
  ghost.visible = ghostLine.visible = opts.ghost && showStep && seg.kind === "deploy";
  if (ghost.visible) {
    const w = toWorld(step.ah);
    ghost.position.set(w[0], w[1], w[2] - MUG_DROP);
    const pts = ghostLine.geometry.attributes.position;
    const r = toWorld(step.ar);
    pts.setXYZ(0, r[0], r[1], r[2]); pts.setXYZ(1, w[0], w[1], w[2]); pts.needsUpdate = true;
    ghostLine.computeLineDistances();
  }
  // goal coaster, start ring
  const gw = toWorld(seg.goal), sw = toWorld(seg.start);
  goalCoaster.position.set(gw[0], gw[1], 0.004);
  startRing.position.set(sw[0], sw[1], 0.0015);

  // gripper colour
  const col = COL[who];
  for (const m of gripperMats) { m.emissive.set(col); m.emissiveIntensity = who === "robot" || who === "alone" ? 0.0 : 0.55; }
  halo.material.color.set(col);

  // trail of the cup in this run, coloured by who acted
  if (a.si !== lastSi || a.k !== lastK) {
    const P = trailGeo.attributes.position, C = trailGeo.attributes.color;
    const pinchIdx = RUN.bodies.indexOf(SC.bodies.indexOf("mug"));
    const n = Math.min(a.k + 1, trailMax);
    const tmpC = new THREE.Color();
    for (let k = 0; k < n; k++) {
      const p = seg.frames[k][pinchIdx];
      P.setXYZ(k, p[0], p[1], p[2] - SC.cup_half - 0.002);
      const w2 = seg.kind === "alone" ? "alone" : (seg.steps[Math.max(k - 1, 0)] || {}).who || "robot";
      tmpC.set(COL[w2]); C.setXYZ(k, tmpC.r, tmpC.g, tmpC.b);
    }
    trailGeo.setDrawRange(0, n); P.needsUpdate = true; C.needsUpdate = true;
    updateHud(seg, a, step, who, atEnd);
    lastSi = a.si; lastK = a.k;
  }
  if (!seeking) $("seek").value = i;
}

// ---------------------------------------------------------------- HUD
const GOALNAME = (g) => {
  for (const [k, v] of Object.entries(SC.points)) if (Math.hypot(v[0] - g[0], v[1] - g[1], v[2] - g[2]) < 1e-6) return k;
  return "?";
};
const GOALTXT = { g0: "coaster A (as in the demos)", g1: "coaster B (new place)", g1a: "a coaster drifting A → B", g1b: "a coaster drifting A → B" };
let bannerTimer = 0, lastGoal = null, lastEp = 0, vtime = 0;
const REC = params.get("record");
const now = () => (REC ? vtime : performance.now());
function updateHud(seg, a, step, who, atEnd) {
  const runIdx = RUN.segments.filter((s, j) => j <= a.si && s.episode === seg.episode && s.kind === "deploy").length;
  $("ep").innerHTML = `Episode ${seg.episode} <small>${seg.kind === "alone" ? "robot alone, after retraining" : `run ${runIdx} of 2`}</small>`;
  const gname = GOALNAME(seg.goal);
  $("goaltxt").textContent = RUN.setting === "env" && seg.episode >= 1 ? "Teacher wants coaster A · the start has moved"
                                                                       : `Teacher wants the mug on ${GOALTXT[gname] || gname}`;
  const label = { robot: "Robot acts alone", asked: "Robot asked for help", human: "Teacher stepped in", alone: "Robot alone (check run, no help)" }[who];
  $("who").className = who; $("who").querySelector("span").textContent = label;
  if (step) {
    const umax = 0.12;
    $("uval").textContent = step.u.toFixed(3);
    $("ufill").style.width = `${Math.min(100, (100 * step.u) / umax)}%`;
    $("ufill").style.background = step.u > RUN.tau ? "var(--wide)" : "var(--margin)";
    $("utau").style.left = `${(100 * RUN.tau) / umax}%`;
    $("pval").textContent = `${Math.round(step.pask * 100)}%`;
    $("pfill").style.width = `${step.pask * 100}%`;
  }
  // caption
  let cap;
  if (seg.kind === "alone") cap = atEnd ? `After episode ${seg.episode}'s retraining the robot, alone, ended ${(RUN.closest[seg.episode] * 100).toFixed(1)} cm from the teacher's goal.`
                                        : "Check run: the robot drives alone with no help, to see what it has learned.";
  else if (!step || atEnd) cap = "Run finished. The robot now retrains on everything the teacher showed it.";
  else if (who === "asked") cap = step.u > RUN.tau
    ? `The margin is wide (u = ${step.u.toFixed(3)} > τ = ${RUN.tau}), so the robot asks. The teacher shows the right move, and the robot learns from it.`
    : `The robot asks (at this margin size its chance of asking is ${Math.round(step.pask * 100)}%). The teacher shows the right move, and the robot learns from it.`;
  else if (who === "human") cap = "The teacher steps in on their own (20% of steps, as in the paper). The robot learns from this too.";
  else cap = step.u > RUN.tau ? "The margin is wide but the robot did not ask this time (asking is random, with the chance shown)."
                              : "The margin is narrow: the robot is confident and acts alone.";
  $("caption").textContent = cap;
  // banner when the teacher's goal changes
  const gkey = seg.goal.join(",");
  if (lastGoal && gkey !== lastGoal && seg.kind === "deploy") {
    $("banner").textContent = RUN.setting === "drift" ? "The teacher's goal has drifted further toward B" : "The teacher changed their mind: the mug now goes to coaster B";
    $("banner").classList.add("show"); bannerTimer = now() + 4000;
  }
  if (seg.kind === "deploy") lastGoal = gkey;
  if (seg.episode !== lastEp) { drawChart(seg.episode); lastEp = seg.episode; $("jump").value = seg.episode; }
}

function drawChart(cur) {
  const cv = $("chart"), g = cv.getContext("2d"), W = cv.width, H = cv.height;
  g.clearRect(0, 0, W, H);
  const L = 60, R = 16, T = 18, B = 44, n = RUN.summary.length, bw = (W - L - R) / n, ymax = 0.7;
  g.font = "20px system-ui"; g.fillStyle = "#9aa6b4"; g.strokeStyle = "rgba(255,255,255,0.12)"; g.lineWidth = 1;
  for (const v of [0, 0.2, 0.4, 0.6]) {
    const y = T + (H - T - B) * (1 - v / ymax);
    g.beginPath(); g.moveTo(L, y); g.lineTo(W - R, y); g.stroke(); g.fillText(`${v * 100}%`, 6, y + 7);
  }
  if (RUN.setting === "shift" || RUN.setting === "drift") {
    const x = L + 4 * bw; g.strokeStyle = "rgba(245,166,35,0.8)"; g.setLineDash([6, 5]); g.beginPath(); g.moveTo(x, T - 6); g.lineTo(x, H - B); g.stroke(); g.setLineDash([]);
    g.fillStyle = "#f5a623"; g.fillText(RUN.setting === "shift" ? "goal changes" : "goal starts moving", x + 6, T + 4);
  }
  RUN.summary.forEach((s, j) => {
    const x = L + j * bw, yb = (v) => T + (H - T - B) * (1 - Math.min(v, ymax) / ymax);
    if (s.episode === cur) { g.fillStyle = "rgba(255,255,255,0.08)"; g.fillRect(x, T - 8, bw, H - T - B + 8); }
    g.strokeStyle = "#4c8dff"; g.lineWidth = 2; g.strokeRect(x + bw * 0.15, yb(s.feedback), bw * 0.7, H - B - yb(s.feedback));
    g.fillStyle = "#f5a623"; g.fillRect(x + bw * 0.15, yb(s.asked), bw * 0.7, H - B - yb(s.asked));
    g.fillStyle = s.episode === cur ? "#fff" : "#9aa6b4"; g.fillText(String(s.episode), x + bw / 2 - (s.episode > 9 ? 11 : 6), H - B + 24);
  });
  g.fillStyle = "#f5a623"; g.fillRect(L, H - 14, 14, 10); g.fillStyle = "#c6cfd9"; g.fillText("robot asked", L + 20, H - 3);
  g.strokeStyle = "#4c8dff"; g.lineWidth = 2; g.strokeRect(L + 170, H - 14, 14, 10); g.fillText("all help (asked + teacher)", L + 190, H - 3);
}

// ---------------------------------------------------------------- cameras
const CAMS = {
  wide: { p: [1.45, 1.05, 1.42], t: [-0.02, 0.32, 0.92] },
  side: { p: [1.55, 0.35, 1.0], t: [0.0, 0.4, 0.86] },
  close: { p: [0.5, 0.95, 1.02], t: [0.0, 0.47, 0.83] },
  top: { p: [0.0, 0.55, 2.55], t: [0.0, 0.5, 0.75] },
};
CAMS.orbit = CAMS.wide;
function setCam(name) {
  const c = CAMS[name]; camera.position.copy(zup(...c.p)); controls.target.copy(zup(...c.t));
  controls.autoRotate = name === "orbit"; $("cam").value = name;
}

// ---------------------------------------------------------------- controls
let seeking = false;
$("setting").onchange = async (e) => { await loadRun(e.target.value); lastGoal = null; lastSi = -1; };
$("play").onclick = () => { playing = !playing; $("play").textContent = playing ? "Pause" : "Play"; };
$("speed").onchange = (e) => { speed = +e.target.value; };
$("seek").oninput = (e) => { seeking = true; pos = +e.target.value; lastGoal = null; };
$("seek").onchange = () => { seeking = false; };
$("jump").onchange = (e) => {
  const ep = +e.target.value, idx = timeline.findIndex((t) => RUN.segments[t.si].episode === ep);
  if (idx >= 0) { pos = idx; lastGoal = null; }
};
const tog = (id, k, after) => { $(id).onclick = () => { opts[k] = !opts[k]; $(id).classList.toggle("on", opts[k]); after && after(); }; };
tog("tAlone", "alone", () => { const cur = timeline[Math.floor(pos)]; buildTimeline(); pos = Math.max(0, timeline.findIndex((t) => t.si >= (cur ? cur.si : 0))); });
tog("tGhost", "ghost"); tog("tBox", "box");
$("cam").onchange = (e) => setCam(e.target.value);
$("clean").onclick = () => document.body.classList.toggle("clean");
addEventListener("keydown", (e) => {
  if (e.target.tagName === "SELECT" || e.target.tagName === "INPUT") return;
  if (e.code === "Space") { e.preventDefault(); $("play").click(); }
  else if (e.key === "ArrowRight") pos = Math.min(timeline.length - 1, Math.floor(pos) + 1);
  else if (e.key === "ArrowLeft") pos = Math.max(0, Math.floor(pos) - 1);
  else if (e.key === "n" || e.key === "N") {
    const ep = RUN.segments[timeline[Math.floor(pos)].si].episode + 1;
    const idx = timeline.findIndex((t) => RUN.segments[t.si].episode === ep); if (idx >= 0) pos = idx;
  } else if (e.key === "h" || e.key === "H") $("clean").click();
  else if (e.key === "c" || e.key === "C") document.body.classList.toggle("nocaption");
  else if ("1234".includes(e.key)) setCam(["wide", "side", "close", "top"][+e.key - 1]);
});

// ---------------------------------------------------------------- go
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (playing && RUN && !seeking) { pos += (dt * speed) / SC.ctrl_dt; if (pos >= timeline.length - 1) pos = 0; }
  applyFrame();
  if (bannerTimer && now > bannerTimer) { $("banner").classList.remove("show"); bannerTimer = 0; }
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
// ---------------------------------------------------------------- record mode (videos)
// studio.html?record=NAME&setting=shift&from=4&to=7&speed=2&cam=wide&alone=1&fps=30
// Renders frame by frame at 1280x720 (no requestAnimationFrame, so a hidden tab works too) and
// POSTs each frame + what the HUD would say to record_server.py; make_clips.py adds the text.
async function record() {
  const fps = +(params.get("fps") || 30), spd = +(params.get("speed") || 1);
  const from = +(params.get("from") || 1), to = +(params.get("to") || 15);
  const W = +(params.get("w") || 1280), Hh = +(params.get("h") || 720);
  renderer.setPixelRatio(1); renderer.setSize(W, Hh, false);
  camera.aspect = W / Hh; camera.updateProjectionMatrix();
  controls.autoRotateSpeed = 0.25;
  document.body.classList.add("clean", "nocaption");
  if (params.get("alone") === "0") { opts.alone = false; buildTimeline(); }
  const epOf = (t) => RUN.segments[t.si].episode;
  let start = timeline.findIndex((t) => epOf(t) >= from);
  let end = timeline.length - 1;
  for (let j = timeline.length - 1; j >= 0; j--) if (epOf(timeline[j]) <= to) { end = j; break; }
  pos = start; lastGoal = null; lastSi = -1;
  const step = spd / (fps * SC.ctrl_dt);
  const frames = Math.floor((end - start) / step);
  const cv = renderer.domElement;
  const sess = Math.random().toString(36).slice(2, 10);   // server ignores frames from older tabs
  for (let i = 0; i <= frames; i++) {
    vtime = (i * 1000) / fps * spd;
    applyFrame();
    if (bannerTimer && now() > bannerTimer) { $("banner").classList.remove("show"); bannerTimer = 0; }
    controls.update();
    renderer.render(scene, camera);
    // toDataURL is synchronous (toBlob's callback sometimes never fired in headless Edge)
    const b64 = cv.toDataURL("image/jpeg", 0.93).split(",")[1], bin = atob(b64);
    const bytes = new Uint8Array(bin.length); for (let q = 0; q < bin.length; q++) bytes[q] = bin.charCodeAt(q);
    const blob = new Blob([bytes], { type: "image/jpeg" });
    const seg = RUN.segments[timeline[Math.min(Math.floor(pos), timeline.length - 1)].si];
    const meta = {
      ep: $("ep").textContent, goal: $("goaltxt").textContent, who: $("who").className, whoText: $("who").textContent,
      caption: $("caption").textContent, banner: $("banner").classList.contains("show") ? $("banner").textContent : "",
      u: +$("uval").textContent, pask: parseFloat($("pval").textContent) / 100, episode: seg.episode,
    };
    for (let tries = 0; tries < 5; tries++) {          // retry if a request hangs
      const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 8000);
      try {
        await fetch(`/frame?clip=${encodeURIComponent(REC)}&i=${i}&sess=${sess}`, { method: "POST", body: blob, signal: ctl.signal,
          headers: { "X-Meta": encodeURIComponent(JSON.stringify(meta)) } });
        clearTimeout(timer); break;
      } catch (e) { clearTimeout(timer); }
    }
    pos = Math.min(end, pos + step);
    document.title = `rec ${i}/${frames}`;
  }
  await fetch(`/done?clip=${encodeURIComponent(REC)}&sess=${sess}`, { method: "POST", body: JSON.stringify({
    setting: RUN.setting, from, to, speed: spd, fps, tau: RUN.tau, summary: RUN.summary, w: W, h: Hh }) });
  document.title = "rec done";
}

(async () => {
  await buildRobot();
  buildOverlay();
  const s = params.get("setting") || "shift"; $("setting").value = s;
  await loadRun(s);
  if (params.has("ep")) { const idx = timeline.findIndex((t) => RUN.segments[t.si].episode === +params.get("ep")); if (idx >= 0) pos = idx; }
  setCam(params.get("cam") || "wide");
  if (params.has("clean")) document.body.classList.add("clean");
  $("play").textContent = playing ? "Pause" : "Play";
  if (REC) {
    // wait for every texture / model, then record
    for (let k = 0; k < 300 && !assetsLoaded; k++) await new Promise((ok) => setTimeout(ok, 100));
    $("loading").style.display = "none";
    await new Promise((ok) => setTimeout(ok, 500));
    playing = false;
    await record();
    return;
  }
  (async () => { for (let k = 0; k < 60 && !assetsLoaded; k++) await new Promise((ok) => setTimeout(ok, 100)); $("loading").style.display = "none"; })();
  requestAnimationFrame(loop);
})();
