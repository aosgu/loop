import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { LAYERS, type LayerId } from "../data/barrier";
import { makeBackdrop, makeDust, makeGlow, makeHalo, makePlush } from "./materials";
import { NOISE } from "./glsl";

export interface BarrierStats {
  integrity: number;
  flux: number;
  cytokine: number;
  crossed: number;
}

export interface BarrierLabel {
  key: string;
  x: number;
  y: number;
  visible: boolean;
}

interface Opts {
  onHover: (id: LayerId | null) => void;
  onSelect: (id: LayerId) => void;
  onLabels: (f: BarrierLabel[]) => void;
  onStats: (s: BarrierStats) => void;
}

const THREAD = 0xf7e6cd;
const CELL_COUNT = 9;
const CELL_W = 1.18;
const PITCH = 1.42;
const WALL_TOP = 1.5;
const WALL_BOT = -0.5;
const BLOOD_Y = -2.4;
const LUMEN_Y = 3.1;

const HOME_POS = new THREE.Vector3(-0.4, 0.55, 12.6);
const HOME_TARGET = new THREE.Vector3(-0.3, 0.25, 0);

type Phase = "lumen" | "probe" | "cross" | "blood" | "dead";

interface Particle {
  mesh: THREE.Mesh;
  phase: Phase;
  gap: number;
  vx: number;
  vy: number;
  t: number;
  life: number;
  seed: number;
}

export class BarrierEngine {
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
  private cells: THREE.Group[] = [];
  private seams: THREE.Group[] = [];
  private seamThreads: THREE.Mesh[][] = [];
  private microvilli: THREE.Mesh[] = [];
  private bacteria: { g: THREE.Group; seed: number; shedAt: number }[] = [];
  private immune: { g: THREE.Group; kit: ReturnType<typeof makePlush>; heat: number; seed: number }[] = [];
  private particles: Particle[] = [];
  private pool: THREE.Mesh[] = [];
  private mucus!: THREE.Mesh;
  private mucusMat!: THREE.ShaderMaterial;
  private bloodMat!: THREE.ShaderMaterial;
  private glowRow: THREE.Mesh[] = [];

  private hits: THREE.Mesh[] = [];
  private hitMap = new Map<THREE.Mesh, LayerId>();
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2(-2, -2);
  private hover: LayerId | null = null;
  private selected: LayerId | null = null;
  private down: { x: number; y: number; t: number } | null = null;

  private time = 0;
  private playing = true;
  private speed = 1;
  private diet = 0.06;
  private dietShown = 0.06;
  private idle = 0;
  private crossed = 0;
  private fluxEMA = 0;
  private cytokine = 0;
  private emitAcc = 0;
  private statAcc = 0;

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
    this.controls.minDistance = 7;
    this.controls.maxDistance = 19;
    this.controls.minPolarAngle = 0.85;
    this.controls.maxPolarAngle = 2.1;
    this.controls.minAzimuthAngle = -0.75;
    this.controls.maxAzimuthAngle = 0.75;
    this.controls.rotateSpeed = 0.5;
    this.controls.zoomSpeed = 0.55;
    this.controls.autoRotateSpeed = 0.2;
    this.controls.addEventListener("start", () => (this.idle = 0));

    this.scene.add(this.world);
    this.buildBackdrop();
    this.buildWall();
    this.buildMucus();
    this.buildLumen();
    this.buildBlood();
    this.buildParticles();
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

  /* -------------------------------------------------- build */

  private buildBackdrop() {
    const sky = new THREE.Mesh(new THREE.SphereGeometry(70, 36, 26), makeBackdrop());
    sky.frustumCulled = false;
    sky.renderOrder = -10;
    this.scene.add(sky);
    this.tickables.push(sky.material as THREE.ShaderMaterial);

    const geo = new THREE.BufferGeometry();
    const n = 340;
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

  private cellX(i: number) {
    return (i - (CELL_COUNT - 1) / 2) * PITCH;
  }

  private buildWall() {
    const cellGeo = new RoundedBoxGeometry(CELL_W, WALL_TOP - WALL_BOT, 1.5, 4, 0.26);
    const nucleusGeo = new THREE.SphereGeometry(0.2, 18, 14);

    for (let i = 0; i < CELL_COUNT; i++) {
      const kit = makePlush({
        color: "#1b8f78",
        color2: "#a6f3dc",
        glow: "#4fd0ae",
        fur: 0.7,
        wobble: 0.022,
        breath: 0.012,
        freq: 3.0,
        rate: 0.7 + (i % 3) * 0.12,
        outline: 0.026,
      });
      const g = new THREE.Group();
      g.position.set(this.cellX(i), (WALL_TOP + WALL_BOT) / 2, 0);

      const mesh = new THREE.Mesh(cellGeo, kit.body);
      const shell = new THREE.Mesh(cellGeo, kit.shell);
      shell.renderOrder = -1;
      mesh.add(shell);
      g.add(mesh);

      const nuc = new THREE.Mesh(nucleusGeo, makeGlow("#7df0d0"));
      nuc.position.set(0, -0.26, 0.56);
      nuc.scale.set(1, 0.82, 0.6);
      g.add(nuc);
      this.tickables.push(nuc.material as THREE.ShaderMaterial);

      // microvilli brush on top
      const mvGeo = new THREE.CapsuleGeometry(0.042, 0.26, 4, 8);
      for (let k = 0; k < 7; k++) {
        const mv = new THREE.Mesh(mvGeo, kit.body);
        mv.position.set(-0.42 + k * 0.14, (WALL_TOP - WALL_BOT) / 2 + 0.16, 0.2);
        mv.userData.phase = i * 1.3 + k * 0.5;
        mv.userData.baseY = mv.position.y;
        g.add(mv);
        this.microvilli.push(mv);
      }

      this.world.add(g);
      this.cells.push(g);
      this.tickables.push(kit.body, kit.shell);
      g.userData.kit = kit;
    }

    // tight-junction stitching between neighbouring cells
    const threadMat = new THREE.MeshBasicMaterial({ color: THREAD });
    const threadGeo = new THREE.BoxGeometry(0.055, 0.03, 0.4);
    for (let i = 0; i < CELL_COUNT - 1; i++) {
      const seam = new THREE.Group();
      seam.position.set(this.cellX(i) + PITCH / 2, 0, 0);
      const threads: THREE.Mesh[] = [];
      for (let k = 0; k < 7; k++) {
        const t = new THREE.Mesh(threadGeo, threadMat.clone());
        t.position.set(0, WALL_TOP - 0.22 - k * 0.2, 0.45);
        t.rotation.z = k % 2 ? 0.5 : -0.5;
        t.userData.k = k;
        seam.add(t);
        threads.push(t);
      }
      // a glowing wound in the seam when it opens
      const wound = new THREE.Mesh(
        new THREE.PlaneGeometry(0.34, WALL_TOP - WALL_BOT - 0.2),
        makeGlow("#ffd27a"),
      );
      wound.position.set(0, (WALL_TOP + WALL_BOT) / 2, 0.62);
      (wound.material as THREE.ShaderMaterial).uniforms.uPower.value = 0;
      seam.add(wound);
      seam.userData.wound = wound;
      this.world.add(seam);
      this.seams.push(seam);
      this.seamThreads.push(threads);
      this.glowRow.push(wound);
    }
  }

  private buildMucus() {
    this.mucusMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uDiet: { value: this.diet },
        uColor: { value: new THREE.Color("#9ff0d8") },
      },
      vertexShader: /* glsl */ `
        ${NOISE}
        uniform float uTime; uniform float uDiet;
        varying vec2 vUv; varying float vH;
        void main(){
          vUv = uv;
          vec3 p = position;
          float thick = mix(1.0, 0.18, uDiet);
          float wave = snoise(vec3(p.x * 0.5, uTime * 0.22, p.z * 0.4)) * 0.22;
          p.y = p.y * thick + wave * (0.4 + thick);
          vH = thick;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        ${NOISE}
        uniform float uTime; uniform float uDiet; uniform vec3 uColor;
        varying vec2 vUv; varying float vH;
        void main(){
          float band = smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.55, vUv.y);
          float cells = snoise(vec3(vUv * vec2(16.0, 6.0), uTime * 0.16)) * 0.5 + 0.5;
          float holes = smoothstep(0.42, 0.92, cells) * uDiet;
          float a = (0.30 + band * 0.42) * vH * (1.0 - holes);
          vec3 c = mix(uColor, vec3(0.95, 0.72, 0.42), uDiet * 0.6);
          gl_FragColor = vec4(c * (0.7 + cells * 0.7), clamp(a, 0.0, 1.0));
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const geo = new THREE.PlaneGeometry(PITCH * CELL_COUNT + 1.2, 1.5, 120, 10);
    geo.translate(0, 0.75, 0);
    this.mucus = new THREE.Mesh(geo, this.mucusMat);
    this.mucus.position.set(0, WALL_TOP + 0.18, 0.5);
    this.world.add(this.mucus);
    this.tickables.push(this.mucusMat);
  }

  private buildLumen() {
    // plush bacteria floating above the wall
    for (let i = 0; i < 9; i++) {
      const warm = i % 3 === 0;
      const kit = makePlush({
        color: warm ? "#e8632c" : "#2f9c86",
        color2: warm ? "#ffc08f" : "#b2f2e0",
        glow: warm ? "#ff9c5c" : "#6fe0c2",
        fur: 0.95,
        wobble: 0.05,
        breath: 0.02,
        freq: 2.6,
        rate: 1.3,
        outline: 0.026,
        ember: warm ? 0.3 : 0,
      });
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 6), kit.body);
      const sh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3, 6), kit.shell);
      sh.renderOrder = -1;
      b.add(sh);
      b.scale.set(1.35, 0.9, 0.9);
      g.add(b);
      // flagellum
      const tail = new THREE.Mesh(
        new THREE.TorusGeometry(0.16, 0.022, 6, 24, Math.PI * 1.4),
        new THREE.MeshBasicMaterial({ color: warm ? 0xffb183 : 0x8bead2 }),
      );
      tail.position.x = -0.5;
      tail.rotation.y = Math.PI / 2;
      g.add(tail);
      g.position.set(
        (Math.random() - 0.5) * PITCH * CELL_COUNT,
        LUMEN_Y + Math.random() * 1.5 - 0.3,
        (Math.random() - 0.5) * 1.6,
      );
      this.world.add(g);
      this.bacteria.push({ g, seed: Math.random() * 10, shedAt: Math.random() * 4 });
      this.tickables.push(kit.body, kit.shell);
    }
  }

  private buildBlood() {
    this.bloodMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uHeat: { value: 0 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        ${NOISE}
        uniform float uTime; uniform float uHeat;
        varying vec2 vUv;
        void main(){
          float streams = snoise(vec3(vUv.x * 5.0 - uTime * 0.5, vUv.y * 9.0, uTime * 0.1)) * 0.5 + 0.5;
          float band = smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.6, vUv.y);
          vec3 cool = vec3(0.05, 0.22, 0.2);
          vec3 hot  = vec3(0.55, 0.19, 0.06);
          vec3 c = mix(cool, hot, clamp(uHeat, 0.0, 1.0));
          float a = (0.14 + streams * 0.3) * (0.35 + band);
          gl_FragColor = vec4(c * (0.8 + streams * 1.5), a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(PITCH * CELL_COUNT + 4, 2.6, 1, 1),
      this.bloodMat,
    );
    plane.position.set(0, BLOOD_Y, -0.3);
    this.world.add(plane);
    this.tickables.push(this.bloodMat);

    // a cut-away rule marking the vessel edge
    const rule = new THREE.Mesh(
      new THREE.BoxGeometry(PITCH * CELL_COUNT + 4, 0.016, 0.02),
      new THREE.MeshBasicMaterial({ color: 0x2f6a5c, transparent: true, opacity: 0.6 }),
    );
    rule.position.set(0, BLOOD_Y + 1.3, 0);
    this.world.add(rule);

    // immune sentinels patrolling the vessel
    for (let i = 0; i < 4; i++) {
      const kit = makePlush({
        color: "#e0621d",
        color2: "#ffc766",
        glow: "#ff9c2e",
        fur: 0.85,
        wobble: 0.1,
        breath: 0.026,
        freq: 1.8,
        rate: 1.6,
        outline: 0.03,
        ember: 0.7,
      });
      const g = new THREE.Group();
      const geo = new THREE.IcosahedronGeometry(0.38, 7);
      const b = new THREE.Mesh(geo, kit.body);
      const sh = new THREE.Mesh(geo, kit.shell);
      sh.renderOrder = -1;
      b.add(sh);
      g.add(b);
      const spikeGeo = new THREE.ConeGeometry(0.06, 0.2, 8);
      spikeGeo.translate(0, 0.1, 0);
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        const dir = new THREE.Vector3(Math.cos(a), Math.sin(a), 0.2).normalize();
        const s = new THREE.Mesh(spikeGeo, kit.body);
        s.position.copy(dir).multiplyScalar(0.3);
        s.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        g.add(s);
      }
      const halo = makeHalo("#ff9c2e", 0.8);
      g.add(new THREE.Mesh(new THREE.SphereGeometry(0.72, 20, 16), halo));
      g.position.set(-5 + i * 3.2, BLOOD_Y + (i % 2 ? 0.28 : -0.3), 0.2);
      this.world.add(g);
      this.immune.push({ g, kit, heat: 0, seed: i * 2.3 });
      this.tickables.push(kit.body, kit.shell, halo);
    }
  }

  private buildParticles() {
    const geo = new THREE.OctahedronGeometry(0.12, 0);
    for (let i = 0; i < 58; i++) {
      const m = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({
          color: new THREE.Color("#ffd27a"),
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      m.visible = false;
      m.frustumCulled = false;
      this.world.add(m);
      this.pool.push(m);
    }
  }

  private buildHotspots() {
    const defs: { id: LayerId; pos: [number, number, number]; r: number }[] = [
      { id: "lumen", pos: [4.7, 3.9, 0], r: 1.5 },
      { id: "mucus", pos: [0, WALL_TOP + 0.75, 0.5], r: 1.1 },
      { id: "wall", pos: [3.2, 0.5, 0.4], r: 1.2 },
      { id: "junction", pos: [-2.13, 0.9, 0.6], r: 0.85 },
      { id: "blood", pos: [4.4, BLOOD_Y, 0], r: 1.4 },
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
    this.idle = 0;
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
    this.idle = 0;
    if (!d) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) return;
    if (this.hover) this.opts.onSelect(this.hover);
  };
  private setHover(id: LayerId | null) {
    if (id === this.hover) return;
    this.hover = id;
    this.canvas.style.cursor = id ? "pointer" : "grab";
    this.opts.onHover(id);
  }

  /* -------------------------------------------------- api */

  setDiet(v: number) {
    this.diet = THREE.MathUtils.clamp(v, 0, 1);
  }
  setPlaying(v: boolean) {
    this.playing = v;
    if (v) this.clock.getDelta();
  }
  setSpeed(v: number) {
    this.speed = v;
  }
  setSelected(id: LayerId | null) {
    this.selected = id;
  }
  setHoverExternal(id: LayerId | null) {
    this.pointer.set(-2, -2);
    this.setHover(id);
  }
  /** a fatty meal: a burst of endotoxin released at once */
  firePulse() {
    this.playing = true;
    for (let i = 0; i < 14; i++) this.spawn(true);
    for (const b of this.bacteria) b.shedAt = Math.min(b.shedAt, 0.3);
  }
  resetView() {
    this.camera.position.copy(HOME_POS);
    this.controls.target.copy(HOME_TARGET);
    this.controls.update();
    this.crossed = 0;
  }

  /* -------------------------------------------------- particles */

  private spawn(burst = false) {
    const m = this.pool.find((p) => !p.visible);
    if (!m) return;
    const gap = Math.floor(Math.random() * (CELL_COUNT - 1));
    m.visible = true;
    m.position.set(
      burst
        ? this.cellX(gap) + PITCH / 2 + (Math.random() - 0.5) * 0.8
        : (Math.random() - 0.5) * PITCH * CELL_COUNT,
      LUMEN_Y + Math.random() * 1.2,
      (Math.random() - 0.5) * 0.9,
    );
    (m.material as THREE.MeshBasicMaterial).opacity = 0.9;
    this.particles.push({
      mesh: m,
      phase: "lumen",
      gap,
      vx: 0,
      vy: -0.5 - Math.random() * 0.5,
      t: 0,
      life: 0,
      seed: Math.random() * 10,
    });
  }

  private retire(p: Particle) {
    p.mesh.visible = false;
    (p.mesh.material as THREE.MeshBasicMaterial).opacity = 0;
    p.phase = "dead";
  }

  private gapWidth() {
    return 0.05 + Math.pow(this.dietShown, 1.25) * 0.62;
  }

  private stepParticles(dt: number) {
    const gapW = this.gapWidth();
    const seamTopY = WALL_TOP;

    for (const p of this.particles) {
      if (p.phase === "dead") continue;
      p.life += dt;
      const m = p.mesh;
      m.rotation.x += dt * (1.2 + p.seed * 0.2);
      m.rotation.y += dt * (0.9 + p.seed * 0.15);

      if (p.phase === "lumen") {
        const targetX = this.cellX(p.gap) + PITCH / 2;
        m.position.x += (targetX - m.position.x) * Math.min(1, dt * 1.1);
        m.position.y += p.vy * dt;
        m.position.z += Math.sin(this.time * 1.3 + p.seed) * dt * 0.3;
        // after a refusal the particle drifts back up, hesitates, then dives again
        p.t -= dt;
        if (p.t <= 0 && p.vy > 0) {
          p.vy = -0.4 - Math.random() * 0.55;
        }
        if (p.vy < 0 && m.position.y <= seamTopY + 0.32) p.phase = "probe";
        if (m.position.y > LUMEN_Y + 2.2) p.vy = -Math.abs(p.vy);
      } else if (p.phase === "probe") {
        // does the seam admit it?
        const admits = gapW > 0.22 && Math.random() < 0.35 + this.dietShown * 0.6;
        if (admits) {
          p.phase = "cross";
          p.vy = -0.78 - Math.random() * 0.4;
        } else {
          // refused by the stitching: pushed back into the lumen
          p.phase = "lumen";
          p.vy = 0.6 + Math.random() * 0.5;
          p.t = 0.7 + Math.random() * 0.8;
          p.gap = Math.floor(Math.random() * (CELL_COUNT - 1));
        }
      } else if (p.phase === "cross") {
        const targetX = this.cellX(p.gap) + PITCH / 2;
        m.position.x += (targetX - m.position.x) * Math.min(1, dt * 7);
        m.position.y += p.vy * dt;
        m.position.z += (0.55 - m.position.z) * Math.min(1, dt * 3);
        if (m.position.y < WALL_BOT - 0.15) {
          p.phase = "blood";
          this.crossed++;
          p.vx = (Math.random() > 0.5 ? 1 : -1) * (1.1 + Math.random() * 0.7);
          p.vy = -0.3;
          // wake the nearest sentinel
          let best = this.immune[0];
          let bd = Infinity;
          for (const im of this.immune) {
            const d = Math.abs(im.g.position.x - m.position.x);
            if (d < bd) {
              bd = d;
              best = im;
            }
          }
          best.heat = Math.min(1.6, best.heat + 0.85);
          this.cytokine = Math.min(1, this.cytokine + 0.12);
        }
      } else if (p.phase === "blood") {
        m.position.x += p.vx * dt;
        m.position.y += p.vy * dt * 0.4;
        m.position.y += Math.sin(this.time * 2 + p.seed) * dt * 0.3;
        if (m.position.y < BLOOD_Y - 0.4) p.vy = 0.3;
        if (m.position.y > BLOOD_Y + 0.5) p.vy = -0.3;
        const mat = m.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, mat.opacity - dt * 0.26);
        if (mat.opacity <= 0.02 || Math.abs(m.position.x) > 9) this.retire(p);
      }

      if (p.life > 16) this.retire(p);
    }
    this.particles = this.particles.filter((p) => p.phase !== "dead");
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
    this.idle += raw;

    this.dietShown = THREE.MathUtils.lerp(this.dietShown, this.diet, 1 - Math.pow(0.0025, raw));
    const d = this.dietShown;
    const gapW = this.gapWidth();

    this.controls.autoRotate = false;
    this.controls.update();

    // picking
    if (this.pointer.x > -1.5) {
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hit = this.raycaster.intersectObjects(this.hits, false)[0];
      this.setHover(hit ? this.hitMap.get(hit.object as THREE.Mesh) ?? null : null);
    }

    // ---- wall reacts to diet
    const half = gapW / 2;
    this.cells.forEach((g, i) => {
      const dir = i - (CELL_COUNT - 1) / 2;
      g.position.x = this.cellX(i) + dir * (gapW - 0.05) * 0.92;
      g.position.y =
        (WALL_TOP + WALL_BOT) / 2 + Math.sin(this.time * 0.9 + i * 0.7) * 0.035 * (1 + d);
      g.rotation.z = Math.sin(this.time * 0.6 + i) * 0.012 + dir * d * 0.012;
      const kit = g.userData.kit as ReturnType<typeof makePlush>;
      const lit = this.hover === "wall" ? 0.8 : 0;
      kit.uniforms.uHover.value = THREE.MathUtils.lerp(kit.uniforms.uHover.value, lit, 1 - Math.pow(0.004, raw));
      kit.uniforms.uSel.value = this.selected === "wall" ? 0.5 : 0;
    });

    this.microvilli.forEach((mv, i) => {
      mv.position.y = mv.userData.baseY + Math.sin(this.time * 2.2 + mv.userData.phase) * 0.03;
      mv.rotation.z = Math.sin(this.time * 1.7 + mv.userData.phase) * (0.12 + d * 0.3);
      mv.scale.y = 1 - d * 0.35 + Math.sin(this.time * 2 + i) * 0.04;
    });

    this.seams.forEach((seam, i) => {
      seam.position.x = this.cellX(i) + PITCH / 2 + (i - (CELL_COUNT - 2) / 2) * (gapW - 0.05) * 0.92;
      const threads = this.seamThreads[i];
      threads.forEach((t, k) => {
        // upper stitches hold longest; lower ones snap first
        const snapAt = 0.26 + k * 0.1;
        const broken = THREE.MathUtils.clamp((d - snapAt) * 5, 0, 1);
        const m = t.material as THREE.MeshBasicMaterial;
        m.transparent = true;
        m.opacity = 1 - broken;
        t.scale.x = Math.max(0.12, 1 + gapW * 2.4) * (1 - broken * 0.4);
        t.rotation.z = (k % 2 ? 0.5 : -0.5) * (1 - broken) + broken * 1.1;
        t.position.x = broken * (k % 2 ? 0.1 : -0.1);
      });
      const wound = seam.userData.wound as THREE.Mesh;
      wound.scale.x = Math.max(0.001, (gapW - 0.08) * 2.6);
      (wound.material as THREE.ShaderMaterial).uniforms.uPower.value =
        Math.max(0, d - 0.22) * (0.8 + Math.sin(this.time * 3 + i) * 0.18) +
        (this.hover === "junction" ? 0.35 : 0);
      void half;
    });

    this.mucusMat.uniforms.uDiet.value = d;

    // ---- lumen life
    this.bacteria.forEach((b, i) => {
      b.g.position.x += Math.sin(this.time * 0.4 + b.seed) * dt * 0.5;
      b.g.position.y = LUMEN_Y + 0.5 + Math.sin(this.time * 0.8 + b.seed * 2) * 0.35 - i * 0.03;
      b.g.rotation.z = Math.sin(this.time * 1.1 + b.seed) * 0.25;
      b.g.rotation.y = Math.sin(this.time * 0.5 + b.seed) * 0.5;
      if (Math.abs(b.g.position.x) > 6.4) b.g.position.x *= -0.96;
      b.shedAt -= dt;
      if (b.shedAt <= 0) {
        b.shedAt = 3.4 + Math.random() * 5;
        this.spawn();
      }
    });

    // steady background shedding scales with the diet
    this.emitAcc += dt * (0.5 + d * 2.6);
    while (this.emitAcc > 1) {
      this.emitAcc -= 1;
      this.spawn();
    }

    this.stepParticles(dt);

    // ---- blood & sentinels
    this.cytokine = THREE.MathUtils.clamp(this.cytokine - dt * 0.085, 0, 1);
    this.bloodMat.uniforms.uHeat.value = THREE.MathUtils.lerp(
      this.bloodMat.uniforms.uHeat.value,
      this.cytokine,
      1 - Math.pow(0.01, raw),
    );
    this.immune.forEach((im) => {
      im.heat = Math.max(0, im.heat - dt * 0.42);
      im.g.position.x += Math.sin(this.time * 0.3 + im.seed) * dt * 0.7;
      im.g.position.y =
        BLOOD_Y + Math.sin(this.time * 0.9 + im.seed) * 0.22 + im.heat * 0.1;
      im.g.rotation.z += dt * (0.25 + im.heat * 1.4);
      const s = 1 + Math.min(im.heat, 1) * 0.3;
      im.g.scale.setScalar(s);
      im.kit.uniforms.uHover.value = Math.min(1, im.heat) * 0.9 + (this.hover === "blood" ? 0.4 : 0);
    });

    for (const m of this.tickables) if (m.uniforms.uTime) m.uniforms.uTime.value = this.time;

    this.world.rotation.y = Math.sin(this.time * 0.08) * 0.03;

    // ---- stats
    const inBlood = this.particles.filter((p) => p.phase === "blood").length;
    this.fluxEMA = THREE.MathUtils.lerp(this.fluxEMA, inBlood, 1 - Math.pow(0.05, raw));
    this.statAcc += raw;
    if (this.statAcc > 0.12) {
      this.statAcc = 0;
      this.opts.onStats({
        integrity: Math.round((1 - Math.pow(d, 1.15) * 0.82) * 100),
        flux: Math.round(this.fluxEMA * 10) / 10,
        cytokine: Math.round(this.cytokine * 100),
        crossed: this.crossed,
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
    const out: BarrierLabel[] = LAYERS.map((l) => {
      this.tmp.set(...l.anchor);
      this.tmp.applyMatrix4(this.world.matrixWorld);
      this.tmp.project(this.camera);
      return {
        key: l.id,
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
