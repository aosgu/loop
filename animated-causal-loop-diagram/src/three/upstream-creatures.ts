import * as THREE from "three";
import type { Creature, CreatureCtx } from "./creatures";
import { makeGlow, makeHalo, makePlush, type PlushKit } from "./materials";
import type { SourceId } from "../data/upstream";

function plush(geometry: THREE.BufferGeometry, kit: PlushKit) {
  const mesh = new THREE.Mesh(geometry, kit.body);
  const shell = new THREE.Mesh(geometry, kit.shell);
  shell.renderOrder = -1;
  mesh.add(shell);
  return mesh;
}

function eyes() {
  const group = new THREE.Group();
  const dark = new THREE.MeshBasicMaterial({ color: "#171a13" });
  const thread = new THREE.MeshBasicMaterial({ color: "#fff2d9" });
  for (const side of [-1, 1]) {
    const button = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 12), dark);
    button.position.x = side * 0.15;
    button.scale.z = 0.5;
    group.add(button);
    for (const slant of [-1, 1]) {
      const stitch = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.011, 0.012), thread);
      stitch.position.set(side * 0.15, 0, 0.034);
      stitch.rotation.z = slant * Math.PI / 4;
      group.add(stitch);
    }
  }
  return group;
}

function finish(
  group: THREE.Group,
  kits: PlushKit[],
  face: THREE.Group,
  animate: (t: number, dt: number, ctx: CreatureCtx) => void,
): Creature {
  const hit = new THREE.Mesh(
    new THREE.SphereGeometry(1.14, 12, 10),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  group.add(hit);
  const tickables = new Set<THREE.ShaderMaterial>();
  group.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of materials) {
      if (mat instanceof THREE.ShaderMaterial && mat.uniforms.uTime) tickables.add(mat);
    }
  });
  return {
    group,
    kits,
    hit,
    tickables: [...tickables],
    labelAnchor: new THREE.Vector3(0, 1.2, 0),
    update: (t, dt, ctx) => {
      group.position.y = Math.sin(t * 0.8) * 0.055 + ctx.hover * 0.07;
      group.scale.setScalar(1 + ctx.pulse * 0.12 + ctx.hover * 0.035);
      const blink = t % 6.2;
      face.scale.y = blink > 5.8 && blink < 6.02 ? 0.12 : 1;
      for (const kit of kits) {
        kit.uniforms.uHover.value = ctx.hover + ctx.pulse * 0.6;
        kit.uniforms.uSel.value = ctx.sel;
      }
      animate(t, dt, ctx);
    },
  };
}

function buildLifestyle(): Creature {
  const group = new THREE.Group();
  const shell = makePlush({
    color: "#e58151", color2: "#ffd1a1", glow: "#ffb38b",
    fur: 1, wobble: 0.025, breath: 0.014, freq: 3.2, outline: 0.028,
  });
  const cream = makePlush({
    color: "#f0cc87", color2: "#fff0c8", glow: "#ffe07a",
    fur: 0.7, wobble: 0.005, breath: 0.006, outline: 0.018,
  });
  const petals = new THREE.Group();
  const geo = new THREE.SphereGeometry(0.32, 24, 18);
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * Math.PI * 2;
    const petal = plush(geo, shell);
    petal.position.set(Math.cos(a) * 0.64, Math.sin(a) * 0.64, 0);
    petal.scale.set(1, 1, 0.8);
    petals.add(petal);
  }
  group.add(petals);
  const centre = plush(new THREE.SphereGeometry(0.59, 32, 24), cream);
  centre.scale.z = 0.57;
  centre.position.z = 0.1;
  group.add(centre);

  const seams = new THREE.Group();
  const thread = new THREE.MeshBasicMaterial({ color: "#fff2d9" });
  const threadGeo = new THREE.BoxGeometry(0.066, 0.016, 0.015);
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * Math.PI * 2;
    const stitch = new THREE.Mesh(threadGeo, thread);
    stitch.position.set(Math.cos(a) * 0.49, Math.sin(a) * 0.49, 0.32);
    stitch.rotation.z = a + Math.PI / 2;
    seams.add(stitch);
  }
  group.add(seams);
  const face = eyes();
  face.position.set(0, 0.06, 0.46);
  group.add(face);
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.012, 6, 20, Math.PI), thread);
  smile.rotation.z = Math.PI;
  smile.position.set(0, -0.13, 0.46);
  group.add(smile);

  const orbit = new THREE.Group();
  const bead = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), makeGlow("#ffb38b"));
  bead.position.set(1.05, 0, 0.05);
  orbit.add(bead);
  group.add(orbit);
  const halo = makeHalo("#ffb38b", 0.18);
  group.add(new THREE.Mesh(new THREE.SphereGeometry(1.15, 28, 20), halo));
  return finish(group, [shell, cream], face, (t, _dt, ctx) => {
    petals.rotation.z = Math.sin(t * 0.3) * 0.055;
    petals.scale.setScalar(1 + Math.sin(t * 1.2) * 0.023);
    group.rotation.y = Math.sin(t * 0.34) * 0.16;
    orbit.rotation.z = t * 0.34;
    halo.uniforms.uHover.value = ctx.pulse + ctx.hover * 0.4;
  });
}

function buildGenetics(): Creature {
  const group = new THREE.Group();
  const braid = new THREE.Group();
  const gold = makePlush({
    color: "#cba647", color2: "#fff0b9", glow: "#ffe07a",
    fur: 0.95, wobble: 0.012, breath: 0.008, outline: 0.022,
  });
  const mint = makePlush({
    color: "#55ad91", color2: "#c3f1d4", glow: "#9ff0d8",
    fur: 0.95, wobble: 0.012, breath: 0.008, outline: 0.022,
  });
  const thread = new THREE.MeshBasicMaterial({ color: "#f7e6cd" });
  const point = (u: number, side: number) => {
    const a = u * Math.PI * 2.1 + side * Math.PI;
    return new THREE.Vector3(Math.cos(a) * 0.4, (u - 0.5) * 1.76, Math.sin(a) * 0.28);
  };
  for (const side of [0, 1]) {
    const kit = side ? mint : gold;
    const points = Array.from({ length: 61 }, (_, i) => point(i / 60, side));
    const curve = new THREE.CatmullRomCurve3(points);
    braid.add(plush(new THREE.TubeGeometry(curve, 140, 0.17, 12, false), kit));
    for (const end of [0, 1]) {
      const cap = plush(new THREE.SphereGeometry(0.17, 18, 12), kit);
      cap.position.copy(point(end, side));
      braid.add(cap);
    }
  }
  for (let i = 0; i < 9; i++) {
    const a = point(0.07 + i * 0.105, 0);
    const b = point(0.07 + i * 0.105, 1);
    const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, a.distanceTo(b), 8), thread);
    rung.position.copy(a).lerp(b, 0.5);
    rung.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    braid.add(rung);
  }
  group.add(braid);
  const patch = plush(new THREE.SphereGeometry(0.25, 24, 18), gold);
  patch.position.set(0, -0.09, 0.18);
  patch.scale.set(1.2, 0.8, 0.7);
  group.add(patch);
  const face = eyes();
  face.scale.x = 0.8;
  face.position.set(0, -0.05, 0.36);
  group.add(face);
  const halo = makeHalo("#ffe07a", 0.16);
  const glow = new THREE.Mesh(new THREE.SphereGeometry(1.12, 28, 20), halo);
  glow.scale.x = 0.72;
  group.add(glow);
  return finish(group, [gold, mint], face, (t, _dt, ctx) => {
    braid.rotation.y = Math.sin(t * 0.34) * 0.55;
    group.rotation.z = Math.sin(t * 0.27 + 1) * 0.06;
    halo.uniforms.uHover.value = ctx.pulse + ctx.hover * 0.4;
  });
}

export function buildUpstreamSource(id: SourceId): Creature {
  return id === "lifestyle" ? buildLifestyle() : buildGenetics();
}