import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { makeGlow, makeHalo, makePlush, type PlushKit } from "./materials";
import type { LoopNode } from "../data/loop";

export interface CreatureCtx {
  hover: number;
  sel: number;
  pulse: number; // 0..1 while a signal packet crosses this node
}

export interface Creature {
  group: THREE.Group;
  kits: PlushKit[];
  tickables: THREE.ShaderMaterial[];
  hit: THREE.Mesh;
  labelAnchor: THREE.Vector3;
  update: (t: number, dt: number, ctx: CreatureCtx) => void;
}

const THREAD = 0xf7e6cd;
const DARK = 0x150f0c;

/* ------------------------------------------------------------------ */
/* shared plush bits                                                    */
/* ------------------------------------------------------------------ */

function body(geo: THREE.BufferGeometry, kit: PlushKit, outline = true) {
  const mesh = new THREE.Mesh(geo, kit.body);
  if (outline) {
    const shell = new THREE.Mesh(geo, kit.shell);
    shell.renderOrder = -1;
    mesh.add(shell);
  }
  return mesh;
}

function buttonEye(size: number) {
  const g = new THREE.Group();
  const dark = new THREE.MeshBasicMaterial({ color: DARK });
  const thread = new THREE.MeshBasicMaterial({ color: THREAD });
  const glint = new THREE.MeshBasicMaterial({ color: 0xfff8e8 });

  const disc = new THREE.Mesh(new THREE.SphereGeometry(size, 22, 16), dark);
  disc.scale.set(1, 1, 0.5);
  g.add(disc);

  for (let i = 0; i < 2; i++) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(size * 1.15, size * 0.13, size * 0.1),
      thread,
    );
    bar.rotation.z = i === 0 ? Math.PI / 4 : -Math.PI / 4;
    bar.position.z = size * 0.36;
    g.add(bar);
  }
  const gl = new THREE.Mesh(new THREE.SphereGeometry(size * 0.2, 10, 8), glint);
  gl.position.set(-size * 0.3, size * 0.34, size * 0.44);
  g.add(gl);
  return g;
}

function makeEyes(spacing: number, size: number) {
  const g = new THREE.Group();
  const l = buttonEye(size);
  const r = buttonEye(size);
  l.position.x = -spacing;
  r.position.x = spacing;
  g.add(l, r);
  g.userData.left = l;
  g.userData.right = r;
  return g;
}

function stitchRing(radius: number, count: number, threadSize = 0.022) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: THREAD });
  const geo = new THREE.BoxGeometry(threadSize * 2.4, threadSize, threadSize);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const s = new THREE.Mesh(geo, mat);
    s.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);
    s.rotation.z = a + Math.PI / 2;
    g.add(s);
  }
  return g;
}

function fibonacciDirs(n: number) {
  const dirs: THREE.Vector3[] = [];
  const ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const th = ga * i;
    dirs.push(new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r));
  }
  return dirs;
}

/** A still, cream-coloured patch of fabric that carries the face. */
function faceKit(node: LoopNode) {
  return makePlush({
    color: "#f4e8d5",
    color2: node.color2,
    glow: node.glow,
    fur: 0.45,
    wobble: 0,
    breath: 0,
    freq: 3.4,
    rate: 1,
    outline: 0.013,
    outlineColor: "#3a2a1e",
  });
}

function hitSphere(radius: number) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 12, 10),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  m.userData.hit = true;
  return m;
}

function collectTickables(group: THREE.Group) {
  const out: THREE.ShaderMaterial[] = [];
  group.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.material) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      const sm = m as THREE.ShaderMaterial;
      if (sm.isShaderMaterial && sm.uniforms && sm.uniforms.uTime) out.push(sm);
    }
  });
  return out;
}

/** Shared idle life: breathing bob, hover lift, blink. */
function makeLife(eyes: THREE.Group | null, group: THREE.Group, seed: number) {
  let blinkAt = 2 + Math.random() * 4;
  let blinking = -1;
  return (t: number, dt: number, ctx: CreatureCtx, baseY: number) => {
    const lift = ctx.hover * 0.16 + ctx.sel * 0.1;
    group.position.x = 0;
    group.position.z = 0;
    group.position.y = baseY + Math.sin(t * 0.8 + seed * 3.1) * 0.075 + lift;
    group.rotation.z = Math.sin(t * 0.45 + seed * 2.2) * 0.035;
    const s = 1 + ctx.hover * 0.055 + ctx.pulse * 0.09;
    group.scale.setScalar(s);
    if (!eyes) return;
    blinkAt -= dt;
    if (blinkAt <= 0 && blinking < 0) {
      blinking = 0;
      blinkAt = 2.6 + Math.random() * 4.5;
    }
    if (blinking >= 0) {
      blinking += dt;
      const k = Math.sin(Math.min(blinking / 0.16, 1) * Math.PI);
      eyes.scale.y = 1 - k * 0.92;
      if (blinking > 0.17) blinking = -1;
    } else {
      eyes.scale.y = 1;
    }
  };
}

/* ------------------------------------------------------------------ */
/* 01 · THE COIL — gut                                                  */
/* ------------------------------------------------------------------ */

export function buildCoil(node: LoopNode): Creature {
  const group = new THREE.Group();
  const kit = makePlush({
    color: node.color,
    color2: node.color2,
    glow: node.glow,
    fur: node.fur,
    wobble: node.wobble,
    breath: 0.018,
    freq: 2.6,
    rate: 1.0,
    outline: 0.03,
  });

  const pts: THREE.Vector3[] = [];
  const turns = 2.35;
  for (let i = 0; i <= 72; i++) {
    const u = i / 72;
    const a = u * Math.PI * 2 * turns - 0.6;
    const r = 0.52 + Math.sin(u * Math.PI) * 0.2;
    pts.push(
      new THREE.Vector3(
        Math.cos(a) * r,
        (u - 0.5) * 1.5,
        Math.sin(a) * r * 0.92 - Math.cos(u * Math.PI * 1.4) * 0.08,
      ),
    );
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const tube = body(new THREE.TubeGeometry(curve, 240, 0.235, 18, false), kit);
  group.add(tube);

  // rounded ends
  const capGeo = new THREE.SphereGeometry(0.245, 26, 20);
  const start = curve.getPointAt(0);
  const end = curve.getPointAt(1);
  const capA = body(capGeo, kit);
  capA.position.copy(start);
  const capB = body(capGeo, kit);
  capB.position.copy(end);
  capB.scale.setScalar(1.12);
  group.add(capA, capB);

  // villi: soft nubs standing off the outer wall
  const villiGeo = new THREE.SphereGeometry(0.062, 12, 10);
  const villi: THREE.Mesh[] = [];
  for (let i = 0; i < 26; i++) {
    const u = 0.06 + (i / 26) * 0.88;
    const p = curve.getPointAt(u);
    const out = new THREE.Vector3(p.x, 0, p.z).normalize();
    const v = body(villiGeo, kit, false);
    v.position.copy(p).addScaledVector(out, 0.26);
    v.scale.set(1, 0.85, 1);
    group.add(v);
    villi.push(v);
  }

  // a thread band tying the middle of the tube
  const beltPos = curve.getPointAt(0.5);
  const beltTan = curve.getTangentAt(0.5);
  const belt = new THREE.Mesh(
    new THREE.TorusGeometry(0.262, 0.024, 8, 34),
    new THREE.MeshBasicMaterial({ color: THREAD }),
  );
  belt.position.copy(beltPos);
  belt.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), beltTan);
  group.add(belt);

  // cream muzzle sewn onto the upper cap, carrying the face
  const fKit = faceKit(node);
  const muzzle = body(new THREE.SphereGeometry(0.2, 26, 20), fKit);
  muzzle.position.copy(end).add(new THREE.Vector3(0, 0.02, 0.14));
  group.add(muzzle);
  const eyes = makeEyes(0.09, 0.042);
  eyes.position.copy(end).add(new THREE.Vector3(0, 0.05, 0.33));
  eyes.rotation.x = -0.18;
  group.add(eyes);

  const halo = makeHalo(node.glow, 0.32);
  const haloMesh = new THREE.Mesh(new THREE.SphereGeometry(1.15, 28, 22), halo);
  group.add(haloMesh);

  group.add(hitSphere(1.05));
  const life = makeLife(eyes, group, 0.2);
  const tickables = collectTickables(group).concat(halo);

  return {
    group,
    kits: [kit],
    tickables,
    hit: group.children[group.children.length - 1] as THREE.Mesh,
    labelAnchor: new THREE.Vector3(0, 1.05, 0),
    update: (t, dt, ctx) => {
      life(t, dt, ctx, 0);
      group.rotation.y = t * 0.16 + Math.sin(t * 0.3) * 0.12;
      villi.forEach((v, i) => {
        const k = Math.sin(t * 2.1 + i * 0.7) * 0.5 + 0.5;
        v.scale.setScalar(0.85 + k * 0.3 + ctx.hover * 0.25);
      });
      halo.uniforms.uHover.value = ctx.hover * 0.8 + ctx.sel * 0.4 + ctx.pulse;
      kit.uniforms.uHover.value = ctx.hover;
      kit.uniforms.uSel.value = ctx.sel;
    },
  };
}

/* ------------------------------------------------------------------ */
/* 02 · THE SMOULDER — low-grade inflammation                           */
/* ------------------------------------------------------------------ */

export function buildSmoulder(node: LoopNode): Creature {
  const group = new THREE.Group();
  const kit = makePlush({
    color: node.color,
    color2: node.color2,
    glow: node.glow,
    fur: node.fur,
    wobble: node.wobble,
    breath: 0.03,
    freq: 1.7,
    rate: 1.6,
    outline: 0.032,
    ember: 0.85,
  });
  const spikeKit = makePlush({
    color: node.color,
    color2: node.color2,
    glow: node.glow,
    fur: 0.9,
    wobble: 0.02,
    breath: 0.01,
    freq: 3.4,
    rate: 2.0,
    outline: 0.024,
    ember: 0.5,
  });

  const core = body(new THREE.IcosahedronGeometry(0.82, 10), kit);
  group.add(core);

  const spikeGeo = new THREE.ConeGeometry(0.115, 0.44, 12, 2);
  spikeGeo.translate(0, 0.2, 0);
  const spikes: THREE.Mesh[] = [];
  fibonacciDirs(20).forEach((dir, i) => {
    if (Math.abs(dir.y) > 0.96) return;
    const s = body(spikeGeo, spikeKit);
    s.position.copy(dir).multiplyScalar(0.6);
    s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    s.userData.phase = i * 0.55;
    group.add(s);
    spikes.push(s);
  });

  // pale face patch + sullen brows
  const fKit = faceKit(node);
  const face = body(new THREE.SphereGeometry(0.3, 28, 22), fKit);
  face.position.set(0, -0.02, 0.66);
  face.scale.set(1.05, 0.95, 1);
  group.add(face);

  const eyes = makeEyes(0.13, 0.055);
  eyes.position.set(0, 0.05, 0.925);
  group.add(eyes);
  const brow = new THREE.MeshBasicMaterial({ color: DARK });
  for (const side of [-1, 1]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.032, 0.028), brow);
    b.position.set(side * 0.135, 0.155, 0.895);
    b.rotation.z = side * -0.42;
    group.add(b);
  }

  const halo = makeHalo(node.glow, 1.0);
  group.add(new THREE.Mesh(new THREE.SphereGeometry(1.32, 32, 24), halo));

  group.add(hitSphere(1.2));
  const life = makeLife(eyes, group, 0.7);
  const tickables = collectTickables(group).concat(halo);

  return {
    group,
    kits: [kit, spikeKit],
    tickables,
    hit: group.children[group.children.length - 1] as THREE.Mesh,
    labelAnchor: new THREE.Vector3(0, 1.35, 0),
    update: (t, dt, ctx) => {
      life(t, dt, ctx, 0);
      group.rotation.y = t * 0.22;
      const heat = 1 + ctx.hover * 0.5 + ctx.pulse * 0.8;
      spikes.forEach((s) => {
        const k = Math.sin(t * 2.6 + s.userData.phase) * 0.5 + 0.5;
        s.scale.y = 0.8 + k * 0.5 * heat;
        s.scale.x = s.scale.z = 1 - k * 0.12;
      });
      kit.uniforms.uHover.value = ctx.hover;
      kit.uniforms.uSel.value = ctx.sel;
      spikeKit.uniforms.uHover.value = ctx.hover;
      spikeKit.uniforms.uSel.value = ctx.sel;
      halo.uniforms.uHover.value = ctx.hover * 0.7 + ctx.pulse * 1.2;
      halo.uniforms.uPower.value = 0.75 + Math.sin(t * 2.2) * 0.18 + ctx.sel * 0.4;
    },
  };
}

/* ------------------------------------------------------------------ */
/* 03 · THE LOCKED DOOR — insulin resistance                            */
/* ------------------------------------------------------------------ */

export function buildLock(node: LoopNode): Creature {
  const group = new THREE.Group();
  const kit = makePlush({
    color: node.color,
    color2: node.color2,
    glow: node.glow,
    fur: node.fur,
    wobble: node.wobble,
    breath: 0.014,
    freq: 3.0,
    rate: 0.8,
    outline: 0.03,
  });
  const keyKit = makePlush({
    color: "#dff7ec",
    color2: node.color2,
    glow: node.glow,
    fur: 0.6,
    wobble: 0.012,
    breath: 0.006,
    freq: 4.0,
    rate: 1.4,
    outline: 0.02,
  });

  const case_ = body(new RoundedBoxGeometry(1.16, 1.0, 0.62, 5, 0.24), kit);
  group.add(case_);

  const shackle = body(new THREE.TorusGeometry(0.31, 0.1, 14, 44, Math.PI), kit);
  shackle.position.y = 0.44;
  group.add(shackle);

  // fabric patch, stitched down
  const patchKit = makePlush({
    color: "#0e4a3d",
    color2: "#8ce9cd",
    glow: node.glow,
    fur: 0.5,
    wobble: 0.01,
    breath: 0.008,
    freq: 3.6,
    rate: 0.9,
    outline: 0.014,
  });
  const patch = body(new RoundedBoxGeometry(0.34, 0.3, 0.08, 3, 0.07), patchKit);
  patch.position.set(-0.33, -0.27, 0.27);
  patch.rotation.z = 0.18;
  group.add(patch);
  const patchStitch = stitchRing(0.15, 14, 0.016);
  patchStitch.scale.set(1.1, 0.95, 1);
  patchStitch.position.set(-0.33, -0.27, 0.33);
  patchStitch.rotation.z = 0.18;
  group.add(patchStitch);

  // keyhole with light leaking from inside
  const hole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.085, 0.085, 0.1, 20),
    new THREE.MeshBasicMaterial({ color: 0x07100e }),
  );
  hole.rotation.x = Math.PI / 2;
  hole.position.set(0.22, 0.06, 0.29);
  const slot = new THREE.Mesh(
    new THREE.BoxGeometry(0.055, 0.19, 0.1),
    new THREE.MeshBasicMaterial({ color: 0x07100e }),
  );
  slot.position.set(0.22, -0.09, 0.29);
  const leak = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 14), makeGlow(node.glow));
  leak.position.set(0.22, -0.01, 0.26);
  group.add(hole, slot, leak);

  // pale face patch, squinting eyes: stubborn
  const fKit = faceKit(node);
  const face = body(new RoundedBoxGeometry(0.4, 0.26, 0.1, 3, 0.05), fKit);
  face.position.set(-0.14, 0.13, 0.33);
  group.add(face);
  const eyes = makeEyes(0.1, 0.048);
  eyes.position.set(-0.14, 0.15, 0.4);
  eyes.scale.y = 0.6;
  group.add(eyes);

  // the insulin key that keeps getting refused
  const key = new THREE.Group();
  const shaft = body(new THREE.BoxGeometry(0.5, 0.085, 0.085), keyKit);
  const bow = body(new THREE.TorusGeometry(0.1, 0.035, 12, 26), keyKit);
  bow.position.x = -0.3;
  const toothA = body(new THREE.BoxGeometry(0.06, 0.13, 0.08), keyKit, false);
  toothA.position.set(0.16, -0.09, 0);
  const toothB = body(new THREE.BoxGeometry(0.06, 0.1, 0.08), keyKit, false);
  toothB.position.set(0.25, -0.075, 0);
  key.add(shaft, bow, toothA, toothB);
  key.scale.setScalar(0.82);
  group.add(key);

  const rippleMat = makeGlow(node.glow);
  rippleMat.uniforms.uPower.value = 0;
  const ripple = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.02, 10, 40), rippleMat);
  ripple.position.set(0.22, -0.01, 0.36);
  group.add(ripple);

  const halo = makeHalo(node.glow, 0.3);
  group.add(new THREE.Mesh(new THREE.SphereGeometry(1.25, 28, 22), halo));

  group.add(hitSphere(1.1));
  const life = makeLife(eyes, group, 1.4);
  const tickables = collectTickables(group).concat(halo, rippleMat, leak.material as THREE.ShaderMaterial);

  let rippleT = -1;
  return {
    group,
    kits: [kit, keyKit, patchKit],
    tickables,
    hit: group.children[group.children.length - 1] as THREE.Mesh,
    labelAnchor: new THREE.Vector3(0, 1.15, 0),
    update: (t, dt, ctx) => {
      life(t, dt, ctx, 0);
      group.rotation.y = Math.sin(t * 0.32) * 0.42;

      // knock — approach, refusal, recoil
      const cyc = 3.9;
      const p = ((t + 1.2) % cyc) / cyc;
      const approach = p < 0.42 ? p / 0.42 : 1;
      const rejected = p >= 0.42 && p < 0.5;
      const recede = p >= 0.5 ? Math.min((p - 0.5) / 0.24, 1) : 0;
      const ease = 1 - Math.pow(1 - approach, 3);
      const z = 1.55 - ease * 0.86 + recede * 1.0;
      key.position.set(0.22 + Math.sin(t * 1.6) * 0.02, -0.01 + Math.sin(t * 2.0) * 0.05, z);
      key.rotation.set(
        Math.sin(t * 1.3) * 0.12,
        -0.25 + recede * 0.7,
        recede * -0.5 + Math.sin(t * 1.7) * 0.06,
      );
      if (rejected && rippleT < 0) rippleT = 0;
      if (rippleT >= 0) {
        rippleT += dt * 1.9;
        const k = Math.min(rippleT, 1);
        ripple.scale.setScalar(1 + k * 3.4);
        rippleMat.uniforms.uPower.value = (1 - k) * 1.6;
        if (k >= 1) rippleT = -1;
      }
      (leak.material as THREE.ShaderMaterial).uniforms.uPower.value =
        0.55 + Math.sin(t * 3.4) * 0.2 + ctx.hover * 0.6 + (rippleT >= 0 ? 0.8 : 0);

      kit.uniforms.uHover.value = ctx.hover;
      kit.uniforms.uSel.value = ctx.sel;
      keyKit.uniforms.uHover.value = ctx.hover;
      halo.uniforms.uHover.value = ctx.hover * 0.7 + ctx.pulse;
      // shake the case when the key is turned away
      if (recede > 0 && recede < 0.35) {
        group.position.x += Math.sin(t * 60) * 0.012 * (1 - recede / 0.35);
      }
    },
  };
}

/* ------------------------------------------------------------------ */
/* 04 · THE SUGAR BLOOM — hyperglycaemia                                */
/* ------------------------------------------------------------------ */

export function buildBloom(node: LoopNode): Creature {
  const group = new THREE.Group();
  const kit = makePlush({
    color: node.color,
    color2: node.color2,
    glow: node.glow,
    fur: node.fur,
    wobble: node.wobble,
    breath: 0.01,
    freq: 2.2,
    rate: 0.7,
    outline: 0.026,
    sparkle: 1.0,
    ember: 0.22,
  });

  const inner = new THREE.Group();
  group.add(inner);

  const heart = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 20), makeGlow(node.glow));
  inner.add(heart);

  const shards: { mesh: THREE.Mesh; phase: number; spin: number }[] = [];
  const specs = [
    [0, 0.55, 0, 0.3, 0.86, 0.3],
    [0.42, 0.18, 0.18, 0.24, 0.62, 0.24],
    [-0.4, 0.1, -0.1, 0.22, 0.58, 0.22],
    [0.16, -0.42, 0.28, 0.2, 0.5, 0.2],
    [-0.22, -0.4, -0.26, 0.19, 0.46, 0.19],
    [0.34, 0.5, -0.36, 0.16, 0.4, 0.16],
    [-0.46, 0.46, 0.3, 0.14, 0.34, 0.14],
    [0.02, -0.06, -0.48, 0.17, 0.42, 0.17],
  ];
  specs.forEach(([x, y, z, sx, sy, sz], i) => {
    const geo = new THREE.OctahedronGeometry(1, 0);
    const m = body(geo, kit);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.lookAt(new THREE.Vector3(x * 3.2, y * 3.2 + 0.4, z * 3.2));
    m.rotateX(Math.PI / 2);
    m.userData.base = m.position.clone();
    m.userData.baseScale = m.scale.clone();
    inner.add(m);
    shards.push({ mesh: m, phase: i * 0.83, spin: 0.1 + (i % 3) * 0.06 });
  });

  // pale face bead among the crystals
  const fKit = faceKit(node);
  const face = body(new THREE.SphereGeometry(0.26, 26, 20), fKit);
  face.position.set(0, -0.02, 0.26);
  group.add(face);
  const eyes = makeEyes(0.105, 0.045);
  eyes.position.set(0, 0.02, 0.515);
  group.add(eyes);

  const halo = makeHalo(node.glow, 0.55);
  group.add(new THREE.Mesh(new THREE.SphereGeometry(1.2, 30, 24), halo));

  // sugar dust
  const dustGeo = new THREE.BufferGeometry();
  const n = 90;
  const pos = new Float32Array(n * 3);
  const seed = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const r = 0.8 + Math.random() * 0.9;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.cos(ph) * 0.8;
    pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    seed[i] = Math.random();
  }
  dustGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  dustGeo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
  const dustMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(node.color2) },
      uPR: { value: 1 },
    },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uTime, uPR;
      varying float vA;
      void main(){
        vec3 p = position;
        float a = uTime * (0.15 + aSeed * 0.3);
        p.xz = mat2(cos(a), -sin(a), sin(a), cos(a)) * p.xz;
        p.y += sin(uTime * 0.7 + aSeed * 9.0) * 0.18;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (14.0 + aSeed * 26.0) * uPR * (7.0 / max(-mv.z, 0.1));
        vA = 0.3 + 0.7 * pow(abs(sin(uTime * 2.0 + aSeed * 40.0)), 3.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vA;
      void main(){
        vec2 q = gl_PointCoord - 0.5;
        float d = length(q);
        float star = smoothstep(0.5, 0.0, d) + smoothstep(0.06, 0.0, abs(q.x)) * smoothstep(0.42, 0.0, abs(q.y)) * 0.6
                   + smoothstep(0.06, 0.0, abs(q.y)) * smoothstep(0.42, 0.0, abs(q.x)) * 0.6;
        gl_FragColor = vec4(uColor * 1.6, star * vA * 0.8);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  group.add(dust);

  group.add(hitSphere(1.25));
  const life = makeLife(eyes, group, 2.1);
  const tickables = collectTickables(group).concat(halo, heart.material as THREE.ShaderMaterial, dustMat);

  return {
    group,
    kits: [kit],
    tickables,
    hit: group.children[group.children.length - 1] as THREE.Mesh,
    labelAnchor: new THREE.Vector3(0, 1.3, 0),
    update: (t, dt, ctx) => {
      life(t, dt, ctx, 0);
      inner.rotation.y = t * 0.24;
      inner.rotation.x = Math.sin(t * 0.35) * 0.16;
      shards.forEach((s) => {
        const k = Math.sin(t * 1.15 + s.phase) * 0.5 + 0.5;
        s.mesh.rotation.z += dt * s.spin;
        // gentle radial breathing of the whole cluster
        const base = s.mesh.userData.base as THREE.Vector3;
        s.mesh.position.copy(base).multiplyScalar(1 + (k * 0.05 + ctx.hover * 0.07) * 0.9);
        const g = 1 + k * 0.06 + ctx.hover * 0.09 + ctx.pulse * 0.12;
        const bs = s.mesh.userData.baseScale as THREE.Vector3;
        s.mesh.scale.copy(bs).multiplyScalar(g);
      });
      (heart.material as THREE.ShaderMaterial).uniforms.uPower.value =
        0.75 + Math.sin(t * 1.9) * 0.18 + ctx.hover * 0.5 + ctx.pulse;
      halo.uniforms.uHover.value = ctx.hover * 0.8 + ctx.pulse * 1.1;
      kit.uniforms.uHover.value = ctx.hover;
      kit.uniforms.uSel.value = ctx.sel;
      dustMat.uniforms.uPR.value = 1;
    },
  };
}

export const BUILDERS: Record<string, (n: LoopNode) => Creature> = {
  coil: buildCoil,
  smoulder: buildSmoulder,
  lock: buildLock,
  bloom: buildBloom,
};
