import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { REGIONS, type RegionId } from "../data/neuro";
import { makeBackdrop, makeDust, makeGlow, makeHalo, makeLink, makePlush } from "./materials";

export interface NeuroStats {
  conduction: number;
  emptying: number;
  motility: number;
  transit: number;
}

export interface NeuroLabel {
  key: string;
  x: number;
  y: number;
  visible: boolean;
}

interface Opts {
  onHover: (id: RegionId | null) => void;
  onSelect: (id: RegionId) => void;
  onLabels: (f: NeuroLabel[]) => void;
  onStats: (s: NeuroStats) => void;
}

const THREAD = 0xf7e6cd;
const DARK = 0x150f0c;

const HOME_POS = new THREE.Vector3(-0.2, 0.7, 12.8);
const HOME_TARGET = new THREE.Vector3(-0.1, 0.45, 0);

/* food path through the whole tract; zone boundaries by point index */
const FOOD_PTS: [number, number, number][] = [
  [-3.3, 4.1, 0],
  [-3.05, 2.4, 0],
  [-2.95, 0.95, 0.1],
  [-2.45, 0.1, 0.25],
  [-1.75, -0.35, 0.1],
  [-0.7, -0.95, -0.15],
  [0.5, -1.2, 0.15],
  [1.5, -0.75, 0.3],
  [1.05, 0.05, 0.05],
  [0.0, -0.1, -0.3],
  [0.95, -0.6, -0.42],
  [2.2, -0.95, -0.12],
  [3.35, -1.15, 0],
  [3.5, 0.3, 0],
  [4.3, 0.85, 0],
  [5.1, 0.25, 0],
  [5.2, -1.45, 0],
];
const NP = FOOD_PTS.length - 1;
const Z = {
  esoEnd: 2 / NP,
  stomEnd: 4 / NP,
  intEnd: 12 / NP,
  // colon runs to 1
};

const NERVE_PTS: [number, number, number][] = [
  [-5.0, 3.05, 0],
  [-4.2, 2.45, 0.1],
  [-2.7, 1.8, 0.2],
  [-0.7, 1.5, 0.05],
  [1.2, 1.28, 0.2],
  [3.0, 1.5, 0.1],
  [4.55, 1.62, 0],
];
const SYNAPSE_U = { stomach: 0.34, intestine: 0.64, colon: 0.96 };

const MYELIN_N = 20;

interface Food {
  mesh: THREE.Mesh;
  u: number;
  born: number;
  seed: number;
  alive: boolean;
}

export class NeuroEngine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private composer: EffectComposer;
  private clock = new THREE.Clock();
  private world = new THREE.Group();
  private raf = 0;
  private ro: ResizeObserver | null = null;
  private disposed = false;
  private reduce = false;

  private tickables: THREE.ShaderMaterial[] = [];
  private foodCurve = new THREE.CatmullRomCurve3(FOOD_PTS.map((p) => new THREE.Vector3(...p)));
  private nerveCurve = new THREE.CatmullRomCurve3(NERVE_PTS.map((p) => new THREE.Vector3(...p)));

  private nerveMat!: THREE.ShaderMaterial;
  private myelin: { mesh: THREE.Mesh; wound: THREE.Mesh; u: number; seed: number }[] = [];
  private packets: { mesh: THREE.Mesh; u: number; speedJit: number }[] = [];
  private synapses: { id: "stomach" | "intestine" | "colon"; mesh: THREE.Mesh }[] = [];

  private stomach!: THREE.Group;
  private stomachKit!: ReturnType<typeof makePlush>;
  private eyeLids: THREE.Mesh[] = [];
  private intestKit!: ReturnType<typeof makePlush>;
  private colonKit!: ReturnType<typeof makePlush>;
  private haustra: { mesh: THREE.Mesh; u: number; base: THREE.Vector3 }[] = [];
  private waves: { mesh: THREE.Mesh; u: number }[] = [];
  private toxins: { mesh: THREE.Mesh; u: number; off: THREE.Vector3; seed: number; kind: number }[] = [];

  private foods: Food[] = [];
  private foodPool: THREE.Mesh[] = [];

  private hits: THREE.Mesh[] = [];
  private hitMap = new Map<THREE.Mesh, RegionId>();
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2(-2, -2);
  private hover: RegionId | null = null;
  private selected: RegionId | null = null;
  private down: { x: number; y: number; t: number } | null = null;

  private time = 0;
  private playing = true;
  private speed = 1;
  private exposure = 0.06;
  private shown = 0.06;
  private burstU = -1;
  private organBoost = { stomach: 0, intestine: 0, colon: 0 };
  private spawnAcc = 0;
  private lastTransit = 0;
  private statAcc = 0;
  private blink = 3;
  private blinkT = -1;

  constructor(private canvas: HTMLCanvasElement, private opts: Opts) {
    this.reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.9));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.setClearColor(0x060f0d, 1);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    this.camera.position.copy(HOME_POS);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.copy(HOME_TARGET);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.enablePan = false;
    this.controls.minDistance = 7.5;
    this.controls.maxDistance = 19;
    this.controls.minPolarAngle = 0.85;
    this.controls.maxPolarAngle = 2.15;
    this.controls.minAzimuthAngle = -0.8;
    this.controls.maxAzimuthAngle = 0.8;
    this.controls.rotateSpeed = 0.5;
    this.controls.zoomSpeed = 0.55;

    this.scene.add(this.world);
    this.buildBackdrop();
    this.buildNerve();
    this.buildStomach();
    this.buildIntestine();
    this.buildColon();
    this.buildToxins();
    this.buildFood();
    this.buildHotspots();

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.58, 0.8, 0.7));
    this.composer.addPass(new OutputPass());

    this.resize();
    this.attach();
    this.ro = new ResizeObserver(() => this.resize());
    if (canvas.parentElement) this.ro.observe(canvas.parentElement);
    this.loop();
  }

  /* -------------------------------------------------- health model */

  /** length-dependent: distal (high u) fibres fail first */
  private healthAt(u: number) {
    const thr = 0.88 - 0.62 * u;
    return 1 - THREE.MathUtils.clamp((this.shown - thr) * 2.6, 0, 1) * 0.9;
  }
  private get stomachH() {
    return this.healthAt(SYNAPSE_U.stomach);
  }
  private get intestH() {
    return this.healthAt(SYNAPSE_U.intestine);
  }
  private get colonH() {
    return this.healthAt(SYNAPSE_U.colon);
  }

  /* -------------------------------------------------- build */

  private buildBackdrop() {
    const sky = new THREE.Mesh(new THREE.SphereGeometry(70, 36, 26), makeBackdrop());
    sky.frustumCulled = false;
    sky.renderOrder = -10;
    this.scene.add(sky);
    this.tickables.push(sky.material as THREE.ShaderMaterial);

    const geo = new THREE.BufferGeometry();
    const n = 300;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 13;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
      seed[i] = Math.random();
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    const m = makeDust();
    m.uniforms.uPR.value = Math.min(window.devicePixelRatio || 1, 1.9);
    const pts = new THREE.Points(geo, m);
    pts.frustumCulled = false;
    this.world.add(pts);
    this.tickables.push(m);
  }

  private plushMesh(geo: THREE.BufferGeometry, kit: ReturnType<typeof makePlush>) {
    const m = new THREE.Mesh(geo, kit.body);
    const sh = new THREE.Mesh(geo, kit.shell);
    sh.renderOrder = -1;
    m.add(sh);
    return m;
  }

  private buttonEye(size: number) {
    const g = new THREE.Group();
    const disc = new THREE.Mesh(
      new THREE.SphereGeometry(size, 18, 14),
      new THREE.MeshBasicMaterial({ color: DARK }),
    );
    disc.scale.set(1, 1, 0.5);
    g.add(disc);
    const glint = new THREE.Mesh(
      new THREE.SphereGeometry(size * 0.22, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xfff8e8 }),
    );
    glint.position.set(-size * 0.3, size * 0.32, size * 0.42);
    g.add(glint);
    return g;
  }

  private buildNerve() {
    // ganglion (autonomic outflow) at the start of the line
    const gKit = makePlush({
      color: "#e8b93f",
      color2: "#fff2c0",
      glow: "#ffe07a",
      fur: 0.8,
      wobble: 0.05,
      breath: 0.02,
      freq: 2.4,
      rate: 1.4,
      outline: 0.028,
      ember: 0.25,
    });
    const gang = new THREE.Group();
    const core = this.plushMesh(new THREE.IcosahedronGeometry(0.46, 7), gKit);
    gang.add(core);
    const spikeGeo = new THREE.ConeGeometry(0.07, 0.26, 8);
    spikeGeo.translate(0, 0.13, 0);
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2;
      const dir = new THREE.Vector3(Math.cos(a), Math.sin(a), 0.25).normalize();
      const s = new THREE.Mesh(spikeGeo, gKit.body);
      s.position.copy(dir).multiplyScalar(0.38);
      s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      gang.add(s);
    }
    const halo = makeHalo("#ffe07a", 0.7);
    gang.add(new THREE.Mesh(new THREE.SphereGeometry(0.85, 22, 18), halo));
    gang.position.set(...NERVE_PTS[0]);
    this.world.add(gang);
    this.tickables.push(gKit.body, gKit.shell, halo);
    gang.userData.isGanglion = true;

    // the axon itself: a flowing conduit
    this.nerveMat = makeLink("#ffe07a", "#ffb03a");
    this.nerveMat.uniforms.uRepeat.value = 16;
    const tube = new THREE.Mesh(new THREE.TubeGeometry(this.nerveCurve, 200, 0.055, 10, false), this.nerveMat);
    tube.frustumCulled = false;
    this.world.add(tube);
    this.tickables.push(this.nerveMat);

    // myelin sleeves — cream thread wrapping, fraying distally
    const sleeveGeo = new THREE.CapsuleGeometry(0.1, 0.17, 4, 10);
    for (let k = 0; k < MYELIN_N; k++) {
      const u = 0.045 + (k / (MYELIN_N - 1)) * 0.91;
      const p = this.nerveCurve.getPointAt(u);
      const tan = this.nerveCurve.getTangentAt(u);
      const mesh = new THREE.Mesh(
        sleeveGeo,
        new THREE.MeshBasicMaterial({ color: THREAD, transparent: true, opacity: 0.92 }),
      );
      mesh.position.copy(p);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan);
      this.world.add(mesh);
      const wound = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 12), makeGlow("#ff7d5c"));
      (wound.material as THREE.ShaderMaterial).uniforms.uPower.value = 0;
      wound.position.copy(p);
      this.world.add(wound);
      this.myelin.push({ mesh, wound, u, seed: Math.random() * 10 });
    }

    // travelling command packets
    for (let k = 0; k < 4; k++) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.075, 12, 10),
        new THREE.MeshBasicMaterial({
          color: 0xfff2c0,
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      m.frustumCulled = false;
      this.world.add(m);
      this.packets.push({ mesh: m, u: k / 4, speedJit: 0.85 + Math.random() * 0.3 });
    }

    // synapse bulbs above each organ
    (Object.keys(SYNAPSE_U) as (keyof typeof SYNAPSE_U)[]).forEach((id) => {
      const u = SYNAPSE_U[id];
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), makeGlow("#ffe07a"));
      m.position.copy(this.nerveCurve.getPointAt(u));
      this.world.add(m);
      this.synapses.push({ id, mesh: m });
      this.tickables.push(m.material as THREE.ShaderMaterial);
      // dropline thread to the organ below
      const drop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 1, 6),
        new THREE.MeshBasicMaterial({ color: 0x3d6b5d, transparent: true, opacity: 0.6 }),
      );
      const top = this.nerveCurve.getPointAt(u);
      const len = id === "stomach" ? 1.0 : id === "intestine" ? 1.5 : 0.75;
      drop.scale.y = len;
      drop.position.set(top.x, top.y - len / 2 - 0.1, top.z);
      this.world.add(drop);
    });
  }

  private buildStomach() {
    this.stomachKit = makePlush({
      color: "#f2643f",
      color2: "#ffb59a",
      glow: "#ff8a5c",
      fur: 1.0,
      wobble: 0.04,
      breath: 0.02,
      freq: 2.4,
      rate: 1.1,
      outline: 0.03,
    });
    const g = new THREE.Group();

    const bag = this.plushMesh(new THREE.SphereGeometry(0.82, 36, 28), this.stomachKit);
    bag.scale.set(1.0, 0.86, 0.78);
    bag.rotation.z = -0.35;
    g.add(bag);
    const fundus = this.plushMesh(new THREE.SphereGeometry(0.48, 26, 20), this.stomachKit);
    fundus.position.set(-0.42, 0.55, 0);
    g.add(fundus);
    const pylorus = this.plushMesh(new THREE.SphereGeometry(0.26, 20, 16), this.stomachKit);
    pylorus.position.set(0.78, -0.42, 0.1);
    g.add(pylorus);

    // seam stitching across the greater curvature
    const stitchMat = new THREE.MeshBasicMaterial({ color: THREAD });
    const stitchGeo = new THREE.BoxGeometry(0.11, 0.025, 0.025);
    for (let k = 0; k < 9; k++) {
      const a = -0.9 + k * 0.26;
      const s = new THREE.Mesh(stitchGeo, stitchMat);
      s.position.set(Math.cos(a) * 0.74 - 0.08, Math.sin(a) * 0.68 - 0.18, 0.62);
      s.rotation.z = a + Math.PI / 2 + (k % 2 ? 0.25 : -0.25);
      g.add(s);
    }

    // cream face patch + button eyes with lids (strain shows as droop)
    const fKit = makePlush({
      color: "#f4e8d5",
      color2: "#ffb59a",
      glow: "#ff8a5c",
      fur: 0.45,
      wobble: 0,
      breath: 0,
      freq: 3.4,
      rate: 1,
      outline: 0.013,
      outlineColor: "#3a2a1e",
    });
    const face = this.plushMesh(new THREE.SphereGeometry(0.3, 24, 18), fKit);
    face.position.set(-0.05, 0.1, 0.64);
    face.scale.set(1.1, 0.9, 0.8);
    g.add(face);
    for (const side of [-1, 1]) {
      const eye = this.buttonEye(0.055);
      eye.position.set(-0.05 + side * 0.13, 0.14, 0.86);
      g.add(eye);
      this.eyeLids.push(eye.children[0] as THREE.Mesh);
      eye.userData.isEye = true;
    }

    g.position.set(-2.5, 0.12, 0);
    this.world.add(g);
    this.stomach = g;
    this.tickables.push(this.stomachKit.body, this.stomachKit.shell, fKit.body, fKit.shell);
  }

  private buildIntestine() {
    this.intestKit = makePlush({
      color: "#1f9c82",
      color2: "#9ff0d8",
      glow: "#4fd0ae",
      fur: 0.75,
      wobble: 0.03,
      breath: 0.012,
      freq: 2.8,
      rate: 0.9,
      outline: 0.026,
    });
    const pts: THREE.Vector3[] = [];
    for (let i = 4; i <= 12; i++) pts.push(new THREE.Vector3(...FOOD_PTS[i]));
    const curve = new THREE.CatmullRomCurve3(pts);
    const tube = this.plushMesh(new THREE.TubeGeometry(curve, 220, 0.3, 14, false), this.intestKit);
    this.world.add(tube);
    this.tickables.push(this.intestKit.body, this.intestKit.shell);

    // oesophagus: slim plush tube into the stomach
    const ePts = [0, 1, 2].map((i) => new THREE.Vector3(...FOOD_PTS[i]));
    const eCurve = new THREE.CatmullRomCurve3(ePts);
    const eso = this.plushMesh(new THREE.TubeGeometry(eCurve, 40, 0.14, 10, false), this.stomachKit);
    this.world.add(eso);

    // travelling peristaltic wave rings
    for (let k = 0; k < 2; k++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.035, 10, 32), makeGlow("#9ff0d8"));
      ring.frustumCulled = false;
      this.world.add(ring);
      this.waves.push({ mesh: ring, u: Z.stomEnd + (k / 2) * (Z.intEnd - Z.stomEnd) });
      this.tickables.push(ring.material as THREE.ShaderMaterial);
    }
  }

  private buildColon() {
    this.colonKit = makePlush({
      color: "#e0621d",
      color2: "#ffc766",
      glow: "#ffb03a",
      fur: 0.8,
      wobble: 0.035,
      breath: 0.016,
      freq: 2.4,
      rate: 0.8,
      outline: 0.028,
    });
    // haustra: a chain of plush pouches along the colon arc
    const n = 7;
    for (let k = 0; k < n; k++) {
      const u = Z.intEnd + ((k + 0.5) / n) * (1 - Z.intEnd) * 0.94;
      const p = this.foodCurve.getPointAt(u);
      const mesh = this.plushMesh(new THREE.SphereGeometry(0.34, 22, 18), this.colonKit);
      mesh.position.copy(p);
      mesh.scale.set(1.05, 0.9, 0.9);
      this.world.add(mesh);
      this.haustra.push({ mesh, u, base: p.clone() });
      // thread tie between pouches
      if (k > 0) {
        const prev = this.haustra[k - 1].base;
        const tie = new THREE.Mesh(
          new THREE.CylinderGeometry(0.02, 0.02, prev.distanceTo(p) * 0.4, 6),
          new THREE.MeshBasicMaterial({ color: THREAD }),
        );
        tie.position.copy(prev).lerp(p, 0.5);
        tie.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          p.clone().sub(prev).normalize(),
        );
        this.world.add(tie);
      }
    }
    this.tickables.push(this.colonKit.body, this.colonKit.shell);
  }

  private buildToxins() {
    // sugar shards + lipid droplets that crowd the nerve as exposure rises
    const sugarGeo = new THREE.OctahedronGeometry(0.09, 0);
    const lipidGeo = new THREE.SphereGeometry(0.08, 12, 10);
    for (let i = 0; i < 30; i++) {
      const kind = i % 3 === 0 ? 1 : 0; // 1 = lipid
      const m = new THREE.Mesh(
        kind ? lipidGeo : sugarGeo,
        new THREE.MeshBasicMaterial({
          color: kind ? 0xf4e8d5 : 0xffe07a,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      m.frustumCulled = false;
      this.world.add(m);
      this.toxins.push({
        mesh: m,
        u: 0.08 + Math.random() * 0.88,
        off: new THREE.Vector3(
          (Math.random() - 0.5) * 1.6,
          (Math.random() - 0.5) * 1.4,
          (Math.random() - 0.5) * 0.8,
        ),
        seed: Math.random() * 10,
        kind,
      });
    }
  }

  private buildFood() {
    const geo = new THREE.SphereGeometry(0.1, 12, 10);
    for (let i = 0; i < 22; i++) {
      const m = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({
          color: 0xffc08f,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      m.visible = false;
      m.frustumCulled = false;
      this.world.add(m);
      this.foodPool.push(m);
    }
  }

  private buildHotspots() {
    const defs: { id: RegionId; pos: [number, number, number]; r: number }[] = [
      { id: "nerve", pos: [-1.0, 1.6, 0], r: 1.15 },
      { id: "stomach", pos: [-2.5, 0.1, 0], r: 1.35 },
      { id: "intestine", pos: [0.5, -0.5, 0], r: 1.7 },
      { id: "colon", pos: [4.25, -0.2, 0], r: 1.55 },
    ];
    for (const d of defs) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(d.r, 10, 8),
        new THREE.MeshBasicMaterial({ visible: false }),
      );
      m.position.set(...d.pos);
      this.world.add(m);
      this.hits.push(m);
      this.hitMap.set(m, d.id);
    }
    // the ganglion also counts as "nerve"
    const g = new THREE.Mesh(
      new THREE.SphereGeometry(1.0, 10, 8),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    g.position.set(...NERVE_PTS[0]);
    this.world.add(g);
    this.hits.push(g);
    this.hitMap.set(g, "nerve");
  }

  /* -------------------------------------------------- input */

  private attach() {
    const c = this.canvas;
    c.addEventListener("pointermove", this.onMove);
    c.addEventListener("pointerdown", this.onDown);
    c.addEventListener("pointerup", this.onUp);
    c.addEventListener("pointerleave", this.onLeave);
  }
  private onMove = (e: PointerEvent) => {
    const r = this.canvas.getBoundingClientRect();
    this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  };
  private onLeave = () => {
    this.pointer.set(-2, -2);
    this.setHover(null);
  };
  private onDown = (e: PointerEvent) => {
    this.down = { x: e.clientX, y: e.clientY, t: performance.now() };
  };
  private onUp = (e: PointerEvent) => {
    const d = this.down;
    this.down = null;
    if (!d) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) return;
    if (this.hover) this.opts.onSelect(this.hover);
  };
  private setHover(id: RegionId | null) {
    if (id === this.hover) return;
    this.hover = id;
    this.canvas.style.cursor = id ? "pointer" : "grab";
    this.opts.onHover(id);
  }

  /* -------------------------------------------------- api */

  setExposure(v: number) {
    this.exposure = THREE.MathUtils.clamp(v, 0, 1);
  }
  setPlaying(v: boolean) {
    this.playing = v;
    if (v) this.clock.getDelta();
  }
  setSpeed(v: number) {
    this.speed = v;
  }
  setSelected(id: RegionId | null) {
    this.selected = id;
  }
  setHoverExternal(id: RegionId | null) {
    this.pointer.set(-2, -2);
    this.setHover(id);
  }
  /** vagal burst: one strong command fired down the line */
  firePulse() {
    this.playing = true;
    this.burstU = 0;
  }
  resetView() {
    this.camera.position.copy(HOME_POS);
    this.controls.target.copy(HOME_TARGET);
    this.controls.update();
  }

  /* -------------------------------------------------- food */

  private spawnFood() {
    const m = this.foodPool.find((p) => !p.visible);
    if (!m) return;
    m.visible = true;
    (m.material as THREE.MeshBasicMaterial).opacity = 0.85;
    this.foods.push({ mesh: m, u: 0.004, born: this.time, seed: Math.random() * 10, alive: true });
  }

  private zoneSpeed(u: number) {
    if (u < Z.esoEnd) return 0.055;
    if (u < Z.stomEnd)
      return 0.016 * (0.08 + this.stomachH * 0.92 + this.organBoost.stomach * 0.8);
    if (u < Z.intEnd)
      return 0.044 * (0.1 + this.intestH * 0.9 + this.organBoost.intestine * 0.7);
    return 0.03 * (0.05 + this.colonH * 0.95 + this.organBoost.colon * 0.9);
  }

  private stepFood(dt: number) {
    for (const f of this.foods) {
      if (!f.alive) continue;
      let v = this.zoneSpeed(f.u);
      // a passing peristaltic wave shoves the bolus forward
      for (const w of this.waves) {
        if (Math.abs(f.u - w.u) < 0.02 && f.u >= Z.stomEnd && f.u < Z.intEnd) v += 0.05;
      }
      f.u += v * dt;
      const p = this.foodCurve.getPointAt(Math.min(f.u, 0.999));
      // churn loiter inside the stomach
      if (f.u > Z.esoEnd && f.u < Z.stomEnd) {
        const churn = 0.16 * (0.3 + this.stomachH);
        p.x += Math.sin(this.time * 2.1 + f.seed * 7) * churn;
        p.y += Math.cos(this.time * 1.7 + f.seed * 5) * churn * 0.7;
      } else {
        p.x += Math.sin(this.time * 1.4 + f.seed * 9) * 0.03;
        p.y += Math.cos(this.time * 1.2 + f.seed * 6) * 0.03;
      }
      f.mesh.position.copy(p);
      const mat = f.mesh.material as THREE.MeshBasicMaterial;
      if (f.u >= 0.975) {
        mat.opacity = Math.max(0, mat.opacity - dt * 1.6);
        if (mat.opacity <= 0.03) {
          f.alive = false;
          f.mesh.visible = false;
          this.lastTransit = this.time - f.born;
        }
      }
    }
    this.foods = this.foods.filter((f) => f.alive);
  }

  /* -------------------------------------------------- frame */

  private resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const w = Math.max(1, parent.clientWidth);
    const h = Math.max(1, parent.clientHeight);
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 1.0 ? 66 : w / h < 1.5 ? 52 : 42;
    this.camera.updateProjectionMatrix();
  }

  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const raw = Math.min(this.clock.getDelta(), 0.05);
    const dt = this.playing ? raw * this.speed * (this.reduce ? 0.4 : 1) : 0;
    this.time += dt;

    this.shown = THREE.MathUtils.lerp(this.shown, this.exposure, 1 - Math.pow(0.0025, raw));
    this.controls.update();

    // picking
    if (this.pointer.x > -1.5) {
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hit = this.raycaster.intersectObjects(this.hits, false)[0];
      this.setHover(hit ? this.hitMap.get(hit.object as THREE.Mesh) ?? null : null);
    }

    const sH = this.stomachH;
    const iH = this.intestH;
    const cH = this.colonH;
    const conduction = (sH + iH + cH) / 3;

    // ---- nerve
    this.nerveMat.uniforms.uSpeed.value = (0.1 + conduction * 0.5) * this.speed * (this.playing ? 1 : 0);
    this.nerveMat.uniforms.uDim.value = 0.55 + conduction * 0.45 + (this.hover === "nerve" ? 0.3 : 0);

    this.myelin.forEach((my) => {
      const h = this.healthAt(my.u);
      const fray = 1 - h;
      const m = my.mesh.material as THREE.MeshBasicMaterial;
      m.opacity = 0.15 + h * 0.8;
      my.mesh.scale.setScalar(0.55 + h * 0.45);
      my.mesh.rotation.z = fray * Math.sin(this.time * 3 + my.seed) * 0.4;
      (my.wound.material as THREE.ShaderMaterial).uniforms.uPower.value =
        fray > 0.4 ? (fray - 0.4) * (1.1 + Math.sin(this.time * 4 + my.seed) * 0.4) : 0;
    });

    this.packets.forEach((pk) => {
      const h = this.healthAt(pk.u);
      pk.u += dt * 0.13 * pk.speedJit * (0.3 + 0.7 * h);
      const mat = pk.mesh.material as THREE.MeshBasicMaterial;
      if (pk.u >= 1 || (h < 0.18 && Math.random() < 0.05)) {
        // delivered — or conduction block
        pk.u = 0;
      }
      pk.mesh.position.copy(this.nerveCurve.getPointAt(Math.min(pk.u, 0.999)));
      mat.opacity = (0.25 + 0.75 * h) * (0.6 + 0.4 * Math.sin(this.time * 6 + pk.speedJit * 9));
      pk.mesh.scale.setScalar(0.8 + h * 0.5);
    });

    // vagal burst travelling down the line
    if (this.burstU >= 0) {
      const hHere = this.healthAt(this.burstU);
      this.burstU += dt * 0.5 * (0.35 + 0.65 * hHere);
      this.nerveMat.uniforms.uPulse.value = this.burstU;
      for (const [id, u] of Object.entries(SYNAPSE_U) as ["stomach" | "intestine" | "colon", number][]) {
        if (this.burstU >= u && this.burstU - dt * 0.6 < u) {
          this.organBoost[id] = Math.max(this.organBoost[id], this.healthAt(u) * 1.4);
        }
      }
      if (this.burstU > 1.08 || hHere < 0.1) {
        // delivered — or died of conduction block: flash the nearest frayed sleeve
        if (hHere < 0.1) {
          let best = this.myelin[0];
          let bd = Infinity;
          for (const my of this.myelin) {
            const d = Math.abs(my.u - this.burstU);
            if (d < bd) {
              bd = d;
              best = my;
            }
          }
          (best.wound.material as THREE.ShaderMaterial).uniforms.uPower.value = 2.4;
        }
        this.burstU = -1;
        this.nerveMat.uniforms.uPulse.value = -1;
      }
    }
    (Object.keys(this.organBoost) as ("stomach" | "intestine" | "colon")[]).forEach((k) => {
      this.organBoost[k] = Math.max(0, this.organBoost[k] - dt * 0.55);
    });

    this.synapses.forEach((sy) => {
      const h = this.healthAt(SYNAPSE_U[sy.id]);
      (sy.mesh.material as THREE.ShaderMaterial).uniforms.uPower.value =
        (0.35 + h * 0.75) * (0.75 + 0.25 * Math.sin(this.time * (1.5 + h * 2.5))) +
        this.organBoost[sy.id];
    });

    // ---- stomach churn: three-per-minute in health, sluggish when denervated
    const churnRate = 1.9 * (0.18 + sH * 0.82);
    const churn = Math.sin(this.time * churnRate) * (0.045 * (0.15 + sH) + this.organBoost.stomach * 0.05);
    this.stomach.scale.set(1 + churn, 1 - churn * 1.15, 1 + churn * 0.4);
    this.stomach.rotation.z = Math.sin(this.time * churnRate * 0.5) * 0.045 * (0.3 + sH);
    this.stomach.position.y = 0.12 + Math.sin(this.time * 0.7) * 0.05;
    this.stomachKit.uniforms.uHover.value = THREE.MathUtils.lerp(
      this.stomachKit.uniforms.uHover.value,
      this.hover === "stomach" ? 0.8 : 0,
      1 - Math.pow(0.004, raw),
    );
    this.stomachKit.uniforms.uSel.value = this.selected === "stomach" ? 0.5 : 0;

    // blink
    this.blink -= raw;
    if (this.blink <= 0 && this.blinkT < 0) {
      this.blinkT = 0;
      this.blink = 3 + Math.random() * 4;
    }
    if (this.blinkT >= 0) {
      this.blinkT += raw;
      const k = Math.sin(Math.min(this.blinkT / 0.16, 1) * Math.PI);
      this.eyeLids.forEach((e) => (e.scale.y = 1 - k * 0.9));
      if (this.blinkT > 0.17) this.blinkT = -1;
    }

    // ---- intestine waves
    this.waves.forEach((w, i) => {
      w.u += dt * 0.045 * (0.12 + iH * 0.88 + this.organBoost.intestine * 0.5);
      if (w.u >= Z.intEnd) w.u = Z.stomEnd + 0.01;
      const p = this.foodCurve.getPointAt(w.u);
      const tan = this.foodCurve.getTangentAt(w.u);
      w.mesh.position.copy(p);
      w.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan);
      (w.mesh.material as THREE.ShaderMaterial).uniforms.uPower.value =
        (0.3 + iH * 0.7) * (0.8 + 0.2 * Math.sin(this.time * 5 + i * 2)) +
        this.organBoost.intestine * 0.6;
      const squeeze = 1 + Math.sin(this.time * 4 + i) * 0.06;
      w.mesh.scale.setScalar(squeeze * (0.72 + iH * 0.28));
    });
    this.intestKit.uniforms.uHover.value = THREE.MathUtils.lerp(
      this.intestKit.uniforms.uHover.value,
      this.hover === "intestine" ? 0.7 : 0,
      1 - Math.pow(0.004, raw),
    );
    this.intestKit.uniforms.uSel.value = this.selected === "intestine" ? 0.5 : 0;

    // ---- colon: sequential haustral squeeze — a mass movement crawling along
    const massU = (this.time * 0.05 * (0.1 + cH * 0.9 + this.organBoost.colon * 0.6)) % 1.3;
    this.haustra.forEach((h, k) => {
      const ph = k / this.haustra.length;
      const near = Math.exp(-Math.pow((massU - ph) * 5.5, 2));
      const squeeze = near * (0.16 * (0.2 + cH) + this.organBoost.colon * 0.1);
      h.mesh.scale.set(1.05 - squeeze, 0.9 + squeeze * 0.9, 0.9 - squeeze * 0.4);
      h.mesh.position.copy(h.base);
      h.mesh.position.y += Math.sin(this.time * 0.9 + k) * 0.03;
      // sluggish colon sags
      h.mesh.position.y -= (1 - cH) * 0.1 * Math.sin(k / this.haustra.length * Math.PI);
    });
    this.colonKit.uniforms.uHover.value = THREE.MathUtils.lerp(
      this.colonKit.uniforms.uHover.value,
      this.hover === "colon" ? 0.7 : 0,
      1 - Math.pow(0.004, raw),
    );
    this.colonKit.uniforms.uSel.value = this.selected === "colon" ? 0.5 : 0;

    // ---- toxins crowd in with exposure
    this.toxins.forEach((t) => {
      const vis = this.shown * (t.kind ? 0.75 : 1);
      const m = t.mesh.material as THREE.MeshBasicMaterial;
      m.opacity = Math.max(0, vis - 0.06) * (0.5 + 0.5 * Math.sin(this.time * 2.4 + t.seed * 8));
      const p = this.nerveCurve.getPointAt(t.u);
      const pull = 1 - this.shown * 0.55;
      t.mesh.position.set(
        p.x + t.off.x * pull + Math.sin(this.time * 0.8 + t.seed) * 0.08,
        p.y + t.off.y * pull + Math.cos(this.time * 0.6 + t.seed * 2) * 0.08,
        p.z + t.off.z * pull,
      );
      t.mesh.rotation.x += dt * (0.8 + t.seed * 0.1);
      t.mesh.rotation.y += dt * 0.6;
    });

    // ---- food
    this.spawnAcc += dt;
    if (this.spawnAcc > 2.6) {
      this.spawnAcc = 0;
      this.spawnFood();
    }
    this.stepFood(dt);

    for (const m of this.tickables) if (m.uniforms.uTime) m.uniforms.uTime.value = this.time;
    this.world.rotation.y = Math.sin(this.time * 0.08) * 0.03;

    // ---- stats
    this.statAcc += raw;
    if (this.statAcc > 0.12) {
      this.statAcc = 0;
      const wpm = 2.9 * (0.18 + sH * 0.82);
      this.opts.onStats({
        conduction: Math.round(conduction * 100),
        emptying: Math.round(wpm * 10) / 10,
        motility: Math.round((0.1 + iH * 0.9) * 100),
        transit: Math.round(this.lastTransit),
      });
    }

    this.emitLabels();
    this.composer.render();
  };

  private tmp = new THREE.Vector3();
  private emitLabels() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    const out: NeuroLabel[] = REGIONS.map((r) => {
      this.tmp.set(...r.anchor);
      this.tmp.applyMatrix4(this.world.matrixWorld);
      this.tmp.project(this.camera);
      return {
        key: r.id,
        x: (this.tmp.x * 0.5 + 0.5) * w,
        y: (-this.tmp.y * 0.5 + 0.5) * h,
        visible: this.tmp.z < 1,
      };
    });
    this.opts.onLabels(out);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro?.disconnect();
    const c = this.canvas;
    c.removeEventListener("pointermove", this.onMove);
    c.removeEventListener("pointerdown", this.onDown);
    c.removeEventListener("pointerup", this.onUp);
    c.removeEventListener("pointerleave", this.onLeave);
    this.controls.dispose();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose();
    });
    this.composer.dispose();
    this.renderer.dispose();
  }
}
