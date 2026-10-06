import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import {
  LIFESTYLE_DRIVERS,
  LIFESTYLE_TARGETS,
  LIFESTYLE_CAUSAL_EDGES,
  driverById,
  targetById,
  type LifestyleId,
  type TargetId,
  type LifestyleNodeId,
} from "../data/lifestyle";
import { makeBackdrop, makeDust, makeGlow, makeHalo, makeLink, makePlush, makeStage, type PlushKit } from "./materials";

export interface LifestyleStats {
  metabolicLoad: number;
  barrierThreat: number;
  insulinResistance: number;
  circadianDesync: number;
  glut4Suppression: number;
}

export interface LifestyleLabelFrame {
  id: LifestyleNodeId;
  kind: "driver" | "target";
  x: number;
  y: number;
  depth: number;
  visible: boolean;
  name: string;
  alias: string;
  rank?: string;
  color: string;
}

interface EngineOpts {
  onHover: (id: LifestyleNodeId | null) => void;
  onSelect: (id: LifestyleNodeId) => void;
  onLabels: (frames: LifestyleLabelFrame[]) => void;
  onStats: (stats: LifestyleStats) => void;
}

const THREAD = 0xf7e6cd;
const DARK = 0x150f0c;

const HOME_TARGET = new THREE.Vector3(0, 0.45, 0);
const HOME_POS = new THREE.Vector3(0, 0.95, 12.8);

export class LifestyleEngine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private world = new THREE.Group();
  private clock = new THREE.Clock();
  private raf = 0;
  private ro: ResizeObserver | null = null;
  private disposed = false;
  private reduce = false;

  private tickables: THREE.ShaderMaterial[] = [];
  private hits: THREE.Mesh[] = [];
  private hitMap = new Map<THREE.Mesh, LifestyleNodeId>();
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2(-2, -2);
  private down: { x: number; y: number; t: number } | null = null;

  // Driver creature groups & kits
  private driverMeshes = new Map<LifestyleId, {
    group: THREE.Group;
    kit: PlushKit;
    subKits?: PlushKit[];
    halo: THREE.ShaderMaterial;
    orbitals?: THREE.Group;
    face?: THREE.Group;
    update: (t: number, dt: number, energy: number, hover: number, sel: number) => void;
  }>();

  // Target organ groups & kits
  private targetMeshes = new Map<TargetId, {
    group: THREE.Group;
    kit: PlushKit;
    subKit?: PlushKit;
    halo: THREE.ShaderMaterial;
    keyObj?: THREE.Group;
    update: (t: number, dt: number, stress: number, hover: number, sel: number) => void;
  }>();

  // 8 Causal conduits
  private conduits: {
    edge: (typeof LIFESTYLE_CAUSAL_EDGES)[number];
    curve: THREE.CatmullRomCurve3;
    mat: THREE.ShaderMaterial;
    tube: THREE.Mesh;
    packets: { mesh: THREE.Mesh; phase: number; scale: number }[];
  }[] = [];

  // Intermediate bridge from Gut to Insulin
  private gutToInsulinBridge!: {
    curve: THREE.CatmullRomCurve3;
    mat: THREE.ShaderMaterial;
    packets: THREE.Mesh[];
  };

  // State
  private hover: LifestyleNodeId | null = null;
  private selected: LifestyleNodeId | null = null;
  private playing = true;
  private speed = 1;
  private time = 0;
  private idle = 0;

  // Active lifestyle input weights (0..1)
  private load = 0.95;       // Diet & energy surplus
  private activity = 0.88;   // Inactivity
  private sleep = 0.25;      // Sleep debt
  private circadian = 0.2;   // Circadian misalignment

  // Filter mode
  private filter: "all" | LifestyleId = "all";

  // Pulse sequence
  private burstStart = -99;
  private burstDriver: LifestyleId | "all" = "all";

  // Interpolated smoothed values
  private smoothed = {
    load: 0.95,
    activity: 0.88,
    sleep: 0.25,
    circadian: 0.2,
  };

  private statAcc = 0;

  constructor(private canvas: HTMLCanvasElement, private opts: EngineOpts) {
    this.reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.9));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.renderer.setClearColor(0x060f0d, 1);

    this.camera = new THREE.PerspectiveCamera(44, 1, 0.1, 200);
    this.camera.position.copy(HOME_POS);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.copy(HOME_TARGET);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.enablePan = false;
    this.controls.minDistance = 7;
    this.controls.maxDistance = 18;
    this.controls.minPolarAngle = 0.75;
    this.controls.maxPolarAngle = 2.05;
    this.controls.minAzimuthAngle = -0.7;
    this.controls.maxAzimuthAngle = 0.7;
    this.controls.rotateSpeed = 0.55;
    this.controls.zoomSpeed = 0.55;

    this.scene.add(this.world);
    this.buildBackdrop();
    this.buildDrivers();
    this.buildTargets();
    this.buildConduits();
    this.buildGutToInsulinBridge();

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.62, 0.78, 0.66);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.resize();
    this.attach();
    this.ro = new ResizeObserver(() => this.resize());
    if (canvas.parentElement) this.ro.observe(canvas.parentElement);
    this.loop();
  }

  /* ------------------------------------------------------------ */
  /* BUILD SCENE ASSETS                                           */
  /* ------------------------------------------------------------ */

  private buildBackdrop() {
    const backdrop = new THREE.Mesh(new THREE.SphereGeometry(70, 36, 26), makeBackdrop());
    backdrop.renderOrder = -10;
    backdrop.frustumCulled = false;
    this.scene.add(backdrop);
    this.tickables.push(backdrop.material as THREE.ShaderMaterial);

    const stage = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), makeStage());
    stage.rotation.x = -Math.PI / 2;
    stage.position.y = -3.2;
    this.world.add(stage);
    this.tickables.push(stage.material as THREE.ShaderMaterial);

    const dustGeo = new THREE.BufferGeometry();
    const n = 360;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 14;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 12;
      seed[i] = Math.random();
    }
    dustGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    dustGeo.setAttribute("aSeed", new THREE.BufferAttribute(seed, 1));
    const dust = makeDust();
    dust.uniforms.uPR.value = Math.min(window.devicePixelRatio || 1, 1.9);
    const points = new THREE.Points(dustGeo, dust);
    points.frustumCulled = false;
    this.world.add(points);
    this.tickables.push(dust);
  }

  private buttonEyes(gap = 0.14, size = 0.055) {
    const g = new THREE.Group();
    const dark = new THREE.MeshBasicMaterial({ color: DARK });
    const thread = new THREE.MeshBasicMaterial({ color: THREAD });
    for (const s of [-1, 1]) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(size, 16, 12), dark);
      b.position.x = s * gap;
      b.scale.z = 0.5;
      g.add(b);
      for (const rot of [-1, 1]) {
        const stitch = new THREE.Mesh(new THREE.BoxGeometry(size * 1.1, size * 0.15, size * 0.12), thread);
        stitch.position.set(s * gap, 0, size * 0.4);
        stitch.rotation.z = rot * (Math.PI / 4);
        g.add(stitch);
      }
    }
    return g;
  }

  private hitSphere(radius: number) {
    return new THREE.Mesh(
      new THREE.SphereGeometry(radius, 12, 10),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
  }

  private buildDrivers() {
    LIFESTYLE_DRIVERS.forEach((driver) => {
      const anchor = new THREE.Group();
      anchor.position.set(...driver.pos);
      this.world.add(anchor);

      const hit = this.hitSphere(1.15);
      anchor.add(hit);
      this.hits.push(hit);
      this.hitMap.set(hit, driver.id);

      if (driver.id === "diet") {
        // TIER 1: DIET & ENERGY SURPLUS (The Feast Crown / Torus Cornucopia)
        const kit = makePlush({
          color: driver.color,
          color2: driver.color2,
          glow: driver.glow,
          fur: 1.0,
          wobble: 0.04,
          breath: 0.022,
          freq: 3.0,
          rate: 1.4,
          ember: 0.8,
        });
        const creamKit = makePlush({
          color: "#fdf1d9",
          color2: "#ffdfbe",
          glow: "#ff9c7a",
          fur: 0.6,
          wobble: 0.01,
          breath: 0.01,
        });

        const crown = new THREE.Group();
        const torusGeo = new THREE.TorusGeometry(0.68, 0.28, 20, 48);
        const torusMesh = new THREE.Mesh(torusGeo, kit.body);
        const torusShell = new THREE.Mesh(torusGeo, kit.shell);
        torusShell.renderOrder = -1;
        torusMesh.add(torusShell);
        crown.add(torusMesh);

        // Cream belly glaze center
        const center = new THREE.Mesh(new THREE.SphereGeometry(0.48, 26, 20), creamKit.body);
        center.scale.z = 0.6;
        center.position.z = 0.15;
        crown.add(center);

        // Embers / calories orbiting
        const orbitals = new THREE.Group();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          const ember = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), makeGlow("#ff8a5c"));
          ember.position.set(Math.cos(a) * 1.15, Math.sin(a) * 0.95, (Math.random() - 0.5) * 0.4);
          orbitals.add(ember);
          this.tickables.push(ember.material as THREE.ShaderMaterial);
        }
        crown.add(orbitals);

        const eyes = this.buttonEyes(0.14, 0.055);
        eyes.position.set(0, 0.06, 0.48);
        crown.add(eyes);

        const halo = makeHalo(driver.glow, 0.6);
        crown.add(new THREE.Mesh(new THREE.SphereGeometry(1.25, 26, 20), halo));

        anchor.add(crown);
        this.tickables.push(kit.body, kit.shell, creamKit.body, creamKit.shell, halo);

        this.driverMeshes.set("diet", {
          group: crown,
          kit,
          subKits: [creamKit],
          halo,
          orbitals,
          face: eyes,
          update: (t, dt, energy, hover, sel) => {
            crown.position.y = Math.sin(t * 1.2) * 0.06 + hover * 0.12;
            crown.rotation.y = Math.sin(t * 0.4) * 0.18;
            crown.scale.setScalar(1 + hover * 0.06 + energy * 0.14);
            orbitals.rotation.z += dt * (0.8 + energy * 1.6);
            halo.uniforms.uHover.value = hover * 0.8 + energy * 1.2 + sel * 0.4;
            kit.uniforms.uHover.value = hover + energy * 0.6;
            kit.uniforms.uSel.value = sel;
          },
        });
      } else if (driver.id === "activity") {
        // TIER 2: INACTIVITY (The Stagnant Coil / Muscle Bobbin)
        const kit = makePlush({
          color: driver.color,
          color2: driver.color2,
          glow: driver.glow,
          fur: 0.85,
          wobble: 0.03,
          breath: 0.015,
          freq: 2.6,
          rate: 1.0,
        });
        const coilGroup = new THREE.Group();

        // Layered spring torus knot
        const knotGeo = new THREE.TorusKnotGeometry(0.52, 0.19, 90, 16, 2, 3);
        const knotMesh = new THREE.Mesh(knotGeo, kit.body);
        const knotShell = new THREE.Mesh(knotGeo, kit.shell);
        knotShell.renderOrder = -1;
        knotMesh.add(knotShell);
        coilGroup.add(knotMesh);

        // Bobbin gear rings
        const orbitals = new THREE.Group();
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2;
          const bobbin = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.18, 10), makeGlow("#ffb03a"));
          bobbin.position.set(Math.cos(a) * 1.05, Math.sin(a) * 0.85, 0);
          orbitals.add(bobbin);
          this.tickables.push(bobbin.material as THREE.ShaderMaterial);
        }
        coilGroup.add(orbitals);

        const eyes = this.buttonEyes(0.13, 0.052);
        eyes.position.set(0, 0.02, 0.68);
        coilGroup.add(eyes);

        const halo = makeHalo(driver.glow, 0.45);
        coilGroup.add(new THREE.Mesh(new THREE.SphereGeometry(1.2, 24, 18), halo));

        anchor.add(coilGroup);
        this.tickables.push(kit.body, kit.shell, halo);

        this.driverMeshes.set("activity", {
          group: coilGroup,
          kit,
          halo,
          orbitals,
          face: eyes,
          update: (t, dt, energy, hover, sel) => {
            coilGroup.position.y = Math.sin(t * 0.95 + 1.2) * 0.05 + hover * 0.1;
            coilGroup.rotation.y = t * 0.22 + Math.sin(t * 0.5) * 0.12;
            coilGroup.scale.setScalar(1 + hover * 0.05 + energy * 0.12);
            orbitals.rotation.z -= dt * (0.5 + energy * 1.4);
            halo.uniforms.uHover.value = hover * 0.7 + energy * 1.1 + sel * 0.4;
            kit.uniforms.uHover.value = hover + energy * 0.5;
            kit.uniforms.uSel.value = sel;
          },
        });
      } else if (driver.id === "sleep") {
        // TIER 3: SLEEP DEBT (The Quilted Crescent Pillow)
        const kit = makePlush({
          color: driver.color,
          color2: driver.color2,
          glow: driver.glow,
          fur: 0.75,
          wobble: 0.02,
          breath: 0.018,
          freq: 2.2,
          rate: 0.8,
          sparkle: 0.4,
        });

        const moonGroup = new THREE.Group();
        const moonGeo = new THREE.TorusGeometry(0.62, 0.24, 18, 40, Math.PI * 1.35);
        const moonMesh = new THREE.Mesh(moonGeo, kit.body);
        const moonShell = new THREE.Mesh(moonGeo, kit.shell);
        moonShell.renderOrder = -1;
        moonMesh.add(moonShell);
        moonMesh.rotation.z = -0.55;
        moonGroup.add(moonMesh);

        // Sleepy eyes with drooping lids
        const eyes = this.buttonEyes(0.12, 0.05);
        eyes.position.set(-0.1, 0.05, 0.45);
        eyes.scale.y = 0.55; // drooping eyelids
        moonGroup.add(eyes);

        // Star sparkles / sleep wisps
        const orbitals = new THREE.Group();
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2;
          const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.08, 0), makeGlow("#ffe07a"));
          star.position.set(Math.cos(a) * 0.95, Math.sin(a) * 0.85, (Math.random() - 0.5) * 0.3);
          orbitals.add(star);
          this.tickables.push(star.material as THREE.ShaderMaterial);
        }
        moonGroup.add(orbitals);

        const halo = makeHalo(driver.glow, 0.5);
        moonGroup.add(new THREE.Mesh(new THREE.SphereGeometry(1.15, 24, 18), halo));

        anchor.add(moonGroup);
        this.tickables.push(kit.body, kit.shell, halo);

        this.driverMeshes.set("sleep", {
          group: moonGroup,
          kit,
          halo,
          orbitals,
          face: eyes,
          update: (t, dt, energy, hover, sel) => {
            moonGroup.position.y = Math.sin(t * 0.8 + 2.1) * 0.06 + hover * 0.1;
            moonGroup.rotation.z = Math.sin(t * 0.3) * 0.08;
            moonGroup.scale.setScalar(1 + hover * 0.05 + energy * 0.12);
            orbitals.rotation.z += dt * (0.35 + energy * 1.2);
            halo.uniforms.uHover.value = hover * 0.7 + energy * 1.1 + sel * 0.4;
            kit.uniforms.uHover.value = hover + energy * 0.5;
            kit.uniforms.uSel.value = sel;
          },
        });
      } else if (driver.id === "circadian") {
        // TIER 4: CIRCADIAN MISALIGNMENT (The Desynchronised Celestial Compass)
        const kit = makePlush({
          color: driver.color,
          color2: driver.color2,
          glow: driver.glow,
          fur: 0.8,
          wobble: 0.025,
          breath: 0.014,
          freq: 3.2,
          rate: 1.1,
        });

        const compassGroup = new THREE.Group();
        const coreGeo = new THREE.IcosahedronGeometry(0.55, 6);
        const coreMesh = new THREE.Mesh(coreGeo, kit.body);
        const coreShell = new THREE.Mesh(coreGeo, kit.shell);
        coreShell.renderOrder = -1;
        coreMesh.add(coreShell);
        compassGroup.add(coreMesh);

        // Counter-rotating central vs peripheral clock dials
        const orbitals = new THREE.Group();
        const ringMatA = new THREE.MeshBasicMaterial({ color: 0x9ff0d8, wireframe: true });
        const ringA = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.02, 6, 36), ringMatA);
        const ringMatB = new THREE.MeshBasicMaterial({ color: 0xffe07a, wireframe: true });
        const ringB = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.02, 6, 36), ringMatB);
        ringB.rotation.x = Math.PI / 3;
        orbitals.add(ringA, ringB);
        compassGroup.add(orbitals);

        const eyes = this.buttonEyes(0.14, 0.052);
        eyes.position.set(0, 0.08, 0.54);
        compassGroup.add(eyes);

        const halo = makeHalo(driver.glow, 0.55);
        compassGroup.add(new THREE.Mesh(new THREE.SphereGeometry(1.2, 24, 18), halo));

        anchor.add(compassGroup);
        this.tickables.push(kit.body, kit.shell, halo);

        this.driverMeshes.set("circadian", {
          group: compassGroup,
          kit,
          halo,
          orbitals,
          face: eyes,
          update: (t, dt, energy, hover, sel) => {
            compassGroup.position.y = Math.sin(t * 1.0 + 3.4) * 0.05 + hover * 0.1;
            ringA.rotation.z += dt * (0.6 + energy * 1.5);
            ringB.rotation.y -= dt * (0.8 + energy * 1.8);
            compassGroup.scale.setScalar(1 + hover * 0.05 + energy * 0.12);
            halo.uniforms.uHover.value = hover * 0.7 + energy * 1.2 + sel * 0.4;
            kit.uniforms.uHover.value = hover + energy * 0.5;
            kit.uniforms.uSel.value = sel;
          },
        });
      }
    });
  }

  private buildTargets() {
    LIFESTYLE_TARGETS.forEach((target) => {
      const anchor = new THREE.Group();
      anchor.position.set(...target.pos);
      this.world.add(anchor);

      const hit = this.hitSphere(1.25);
      anchor.add(hit);
      this.hits.push(hit);
      this.hitMap.set(hit, target.id);

      if (target.id === "gut_target") {
        // DOWNSTREAM TARGET 1: THE GUT COIL GATEWAY
        const kit = makePlush({
          color: target.color,
          color2: target.color2,
          glow: target.glow,
          fur: 1.0,
          wobble: 0.035,
          breath: 0.018,
          freq: 2.6,
          rate: 1.0,
        });

        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= 60; i++) {
          const u = i / 60;
          const a = u * Math.PI * 2 * 2.2 - 0.5;
          const r = 0.48 + Math.sin(u * Math.PI) * 0.18;
          pts.push(new THREE.Vector3(Math.cos(a) * r, (u - 0.5) * 1.35, Math.sin(a) * r * 0.9));
        }
        const curve = new THREE.CatmullRomCurve3(pts);
        const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 180, 0.22, 16, false), kit.body);
        const shell = new THREE.Mesh(new THREE.TubeGeometry(curve, 180, 0.22, 16, false), kit.shell);
        shell.renderOrder = -1;
        tube.add(shell);

        const gutGroup = new THREE.Group();
        gutGroup.add(tube);

        // Villi nubs
        const villiGeo = new THREE.SphereGeometry(0.06, 10, 8);
        for (let i = 0; i < 18; i++) {
          const u = 0.1 + (i / 18) * 0.8;
          const p = curve.getPointAt(u);
          const v = new THREE.Mesh(villiGeo, kit.body);
          v.position.copy(p).add(new THREE.Vector3(p.x, 0, p.z).normalize().multiplyScalar(0.24));
          gutGroup.add(v);
        }

        const eyes = this.buttonEyes(0.09, 0.042);
        const endP = curve.getPointAt(1);
        eyes.position.copy(endP).add(new THREE.Vector3(0, 0.04, 0.28));
        gutGroup.add(eyes);

        const halo = makeHalo(target.glow, 0.5);
        gutGroup.add(new THREE.Mesh(new THREE.SphereGeometry(1.2, 26, 20), halo));

        anchor.add(gutGroup);
        this.tickables.push(kit.body, kit.shell, halo);

        this.targetMeshes.set("gut_target", {
          group: gutGroup,
          kit,
          halo,
          update: (t, _dt, stress, hover, sel) => {
            gutGroup.position.y = Math.sin(t * 0.9) * 0.05 + hover * 0.1;
            gutGroup.rotation.y = t * 0.15;
            gutGroup.scale.setScalar(1 + hover * 0.06 + stress * 0.15);
            halo.uniforms.uHover.value = hover * 0.8 + stress * 1.3 + sel * 0.4;
            kit.uniforms.uHover.value = hover + stress * 0.6;
            kit.uniforms.uSel.value = sel;
          },
        });
      } else if (target.id === "insulin_target") {
        // DOWNSTREAM TARGET 2: THE INSULIN LOCK & KEY
        const kit = makePlush({
          color: target.color,
          color2: target.color2,
          glow: target.glow,
          fur: 0.75,
          wobble: 0.04,
          breath: 0.014,
          freq: 3.0,
          rate: 0.8,
        });
        const keyKit = makePlush({
          color: "#dff7ec",
          color2: target.color2,
          glow: target.glow,
          fur: 0.6,
          wobble: 0.01,
          breath: 0.006,
        });

        const lockGroup = new THREE.Group();
        const caseGeo = new RoundedBoxGeometry(1.1, 0.95, 0.58, 4, 0.22);
        const caseMesh = new THREE.Mesh(caseGeo, kit.body);
        const caseShell = new THREE.Mesh(caseGeo, kit.shell);
        caseShell.renderOrder = -1;
        caseMesh.add(caseShell);
        lockGroup.add(caseMesh);

        const shackleGeo = new THREE.TorusGeometry(0.28, 0.09, 12, 36, Math.PI);
        const shackle = new THREE.Mesh(shackleGeo, kit.body);
        shackle.position.y = 0.42;
        lockGroup.add(shackle);

        const eyes = this.buttonEyes(0.12, 0.05);
        eyes.position.set(-0.12, 0.14, 0.36);
        eyes.scale.y = 0.6;
        lockGroup.add(eyes);

        // Hovering rejected key
        const key = new THREE.Group();
        const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.08, 0.08), keyKit.body);
        const bow = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.03, 10, 24), keyKit.body);
        bow.position.x = -0.28;
        key.add(shaft, bow);
        key.scale.setScalar(0.85);
        key.position.set(0.18, 0.0, 1.35);
        lockGroup.add(key);

        const halo = makeHalo(target.glow, 0.5);
        lockGroup.add(new THREE.Mesh(new THREE.SphereGeometry(1.25, 26, 20), halo));

        anchor.add(lockGroup);
        this.tickables.push(kit.body, kit.shell, keyKit.body, keyKit.shell, halo);

        this.targetMeshes.set("insulin_target", {
          group: lockGroup,
          kit,
          subKit: keyKit,
          halo,
          keyObj: key,
          update: (t, _dt, stress, hover, sel) => {
            lockGroup.position.y = Math.sin(t * 0.9 + 1.8) * 0.05 + hover * 0.1;
            lockGroup.rotation.y = Math.sin(t * 0.35) * 0.28;
            lockGroup.scale.setScalar(1 + hover * 0.06 + stress * 0.15);

            // Key bumping and recoil
            const keyDist = 1.45 - Math.sin(t * 2.2) * 0.35 + stress * 0.4;
            key.position.z = keyDist;
            key.rotation.y = Math.sin(t * 1.5) * 0.25 + stress * 0.4;

            halo.uniforms.uHover.value = hover * 0.8 + stress * 1.3 + sel * 0.4;
            kit.uniforms.uHover.value = hover + stress * 0.6;
            kit.uniforms.uSel.value = sel;
          },
        });
      }
    });
  }

  private buildConduits() {
    LIFESTYLE_CAUSAL_EDGES.forEach((edge) => {
      const fromPos = new THREE.Vector3(...driverById(edge.from).pos);
      const toPos = new THREE.Vector3(...targetById(edge.to).pos);

      const mid = fromPos.clone().add(toPos).multiplyScalar(0.5).add(new THREE.Vector3(...edge.bow));
      const curve = new THREE.CatmullRomCurve3(
        [fromPos, fromPos.clone().lerp(mid, 0.4), mid, mid.clone().lerp(toPos, 0.6), toPos],
        false,
        "catmullrom",
        0.5,
      );

      const radius = 0.038 * edge.weight;
      const geo = new THREE.TubeGeometry(curve, 140, radius, 8, false);
      const mat = makeLink(driverById(edge.from).glow, targetById(edge.to).glow);
      mat.uniforms.uRepeat.value = 8 + edge.weight * 4;

      const tube = new THREE.Mesh(geo, mat);
      tube.frustumCulled = false;
      this.world.add(tube);
      this.tickables.push(mat);

      // Traveling packets
      const packets: { mesh: THREE.Mesh; phase: number; scale: number }[] = [];
      const packetCount = Math.round(2 + edge.weight * 2);
      const pColor = new THREE.Color(driverById(edge.from).glow).lerp(new THREE.Color("#ffffff"), 0.5);

      for (let k = 0; k < packetCount; k++) {
        const pMat = new THREE.MeshBasicMaterial({
          color: pColor,
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const pMesh = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 10), pMat);
        pMesh.frustumCulled = false;
        this.world.add(pMesh);
        packets.push({ mesh: pMesh, phase: k / packetCount, scale: 0.6 + k * 0.25 });
      }

      this.conduits.push({ edge, curve, mat, tube, packets });
    });
  }

  private buildGutToInsulinBridge() {
    const gutPos = new THREE.Vector3(...targetById("gut_target").pos);
    const insPos = new THREE.Vector3(...targetById("insulin_target").pos);
    const mid = gutPos.clone().add(insPos).multiplyScalar(0.5).add(new THREE.Vector3(0, -1.2, 0.4));

    const curve = new THREE.CatmullRomCurve3([gutPos, mid, insPos], false, "catmullrom", 0.5);
    const geo = new THREE.TubeGeometry(curve, 100, 0.03, 8, false);
    const mat = makeLink("#ff7d5c", "#4fd0ae");
    mat.uniforms.uRepeat.value = 6;
    mat.uniforms.uSpeed.value = 0.18;

    const tube = new THREE.Mesh(geo, mat);
    tube.frustumCulled = false;
    this.world.add(tube);
    this.tickables.push(mat);

    const packets: THREE.Mesh[] = [];
    for (let k = 0; k < 2; k++) {
      const pMat = new THREE.MeshBasicMaterial({
        color: 0xffb59a,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const pMesh = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), pMat);
      pMesh.frustumCulled = false;
      this.world.add(pMesh);
      packets.push(pMesh);
    }

    this.gutToInsulinBridge = { curve, mat, packets };
  }

  /* ------------------------------------------------------------ */
  /* INTERACTION & API                                            */
  /* ------------------------------------------------------------ */

  private attach() {
    const c = this.canvas;
    c.addEventListener("pointermove", this.onMove);
    c.addEventListener("pointerdown", this.onDown);
    c.addEventListener("pointerup", this.onUp);
    c.addEventListener("pointerleave", this.onLeave);
    document.addEventListener("visibilitychange", this.onVisibility);
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
    this.idle = 0;
  };
  private onUp = (e: PointerEvent) => {
    const d = this.down;
    this.down = null;
    this.idle = 0;
    if (!d) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6 || performance.now() - d.t > 520) return;
    if (this.hover) this.opts.onSelect(this.hover);
  };
  private onVisibility = () => {
    if (!document.hidden && !this.disposed) this.clock.getDelta();
  };

  private setHover(id: LifestyleNodeId | null) {
    if (id === this.hover) return;
    this.hover = id;
    this.canvas.style.cursor = id ? "pointer" : "grab";
    this.opts.onHover(id);
  }

  setHoverExternal(id: LifestyleNodeId | null) {
    this.pointer.set(-2, -2);
    this.setHover(id);
  }

  select(id: LifestyleNodeId) {
    this.selected = id;
    this.firePulse(id in this.driverMeshes ? (id as LifestyleId) : "all");
  }

  release() {
    this.selected = null;
  }

  setWeights(load: number, activity: number, sleep: number, circadian: number) {
    this.load = load;
    this.activity = activity;
    this.sleep = sleep;
    this.circadian = circadian;
  }

  setFilter(filter: "all" | LifestyleId) {
    this.filter = filter;
  }

  firePulse(driver: LifestyleId | "all" = "all") {
    this.playing = true;
    this.burstStart = this.time;
    this.burstDriver = driver;
  }

  resetView() {
    this.camera.position.copy(HOME_POS);
    this.controls.target.copy(HOME_TARGET);
    this.controls.update();
    this.selected = null;
  }

  setSpeed(v: number) { this.speed = v; }
  setPlaying(v: boolean) {
    this.playing = v;
    if (v) this.clock.getDelta();
  }

  private resize() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const w = Math.max(1, parent.clientWidth);
    const h = Math.max(1, parent.clientHeight);
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.bloom.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 1.05 ? 62 : w / h < 1.5 ? 52 : 44;
    this.camera.updateProjectionMatrix();
  }

  /* ------------------------------------------------------------ */
  /* ANIMATION LOOP                                               */
  /* ------------------------------------------------------------ */

  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const raw = Math.min(this.clock.getDelta(), 0.05);
    const dt = this.playing ? raw * this.speed * (this.reduce ? 0.4 : 1) : 0;
    this.time += dt;
    this.idle += raw;

    // Smooth inputs toward targets
    this.smoothed.load = THREE.MathUtils.lerp(this.smoothed.load, this.load, 1 - Math.pow(0.003, raw));
    this.smoothed.activity = THREE.MathUtils.lerp(this.smoothed.activity, this.activity, 1 - Math.pow(0.003, raw));
    this.smoothed.sleep = THREE.MathUtils.lerp(this.smoothed.sleep, this.sleep, 1 - Math.pow(0.003, raw));
    this.smoothed.circadian = THREE.MathUtils.lerp(this.smoothed.circadian, this.circadian, 1 - Math.pow(0.003, raw));

    this.controls.update();

    // Raycast picking
    if (this.pointer.x > -1.5) {
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hit = this.raycaster.intersectObjects(this.hits, false)[0];
      if (hit) {
        this.setHover(this.hitMap.get(hit.object as THREE.Mesh) ?? null);
      } else {
        this.setHover(null);
      }
    }

    // Pulse wave calculation
    const burstAge = this.time - this.burstStart;
    const isBursting = burstAge >= 0 && burstAge < 3.8;

    // Update Drivers
    LIFESTYLE_DRIVERS.forEach((d) => {
      const meshData = this.driverMeshes.get(d.id)!;
      let energy = 0;
      if (d.id === "diet") energy = this.smoothed.load;
      if (d.id === "activity") energy = this.smoothed.activity;
      if (d.id === "sleep") energy = this.smoothed.sleep;
      if (d.id === "circadian") energy = this.smoothed.circadian;

      if (isBursting && (this.burstDriver === "all" || this.burstDriver === d.id)) {
        energy += Math.max(0, 1 - burstAge * 1.5) * 1.2;
      }

      const hoverAmt = this.hover === d.id ? 1 : 0;
      const selAmt = this.selected === d.id ? 1 : 0;
      meshData.update(this.time, dt, energy, hoverAmt, selAmt);
    });

    // Compute aggregate downstream stresses
    // Diet & energy surplus contributes most directly (weight 1.0)
    const gutStress =
      this.smoothed.load * 0.45 +
      this.smoothed.activity * 0.2 +
      this.smoothed.sleep * 0.2 +
      this.smoothed.circadian * 0.15 +
      (isBursting ? Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, burstAge - 0.5) / 1.5))) * 0.8 : 0);

    const insulinStress =
      this.smoothed.load * 0.4 +
      this.smoothed.activity * 0.3 +
      this.smoothed.sleep * 0.2 +
      this.smoothed.circadian * 0.1 +
      (isBursting ? Math.max(0, Math.sin(Math.PI * Math.min(1, Math.max(0, burstAge - 0.7) / 1.5))) * 0.8 : 0);

    // Update Targets
    const gutTarget = this.targetMeshes.get("gut_target")!;
    gutTarget.update(this.time, dt, gutStress, this.hover === "gut_target" ? 1 : 0, this.selected === "gut_target" ? 1 : 0);

    const insulinTarget = this.targetMeshes.get("insulin_target")!;
    insulinTarget.update(this.time, dt, insulinStress, this.hover === "insulin_target" ? 1 : 0, this.selected === "insulin_target" ? 1 : 0);

    // Update Conduits
    this.conduits.forEach((c) => {
      let driverWeight = 1.0;
      if (c.edge.from === "diet") driverWeight = this.smoothed.load;
      if (c.edge.from === "activity") driverWeight = this.smoothed.activity;
      if (c.edge.from === "sleep") driverWeight = this.smoothed.sleep;
      if (c.edge.from === "circadian") driverWeight = this.smoothed.circadian;

      const matchesFilter = this.filter === "all" || this.filter === c.edge.from;
      const dimmed = !matchesFilter || (this.selected && this.selected !== c.edge.from && this.selected !== c.edge.to);

      let pulseT = -1;
      if (isBursting && (this.burstDriver === "all" || this.burstDriver === c.edge.from)) {
        pulseT = Math.min(1, Math.max(0, (burstAge - 0.2) / 1.6));
      }

      c.mat.uniforms.uPulse.value = pulseT;
      c.mat.uniforms.uSpeed.value = 0.22 * (0.4 + driverWeight * 1.2) * this.speed * (this.playing ? 1 : 0);
      c.mat.uniforms.uDim.value = THREE.MathUtils.lerp(
        c.mat.uniforms.uDim.value,
        dimmed ? 0.22 : 0.85 + driverWeight * 0.35,
        1 - Math.pow(0.002, raw),
      );

      // Packet animation
      c.packets.forEach((p, k) => {
        const t = (this.time * 0.12 * (0.6 + driverWeight * 0.8) * this.speed + p.phase) % 1;
        p.mesh.position.copy(c.curve.getPointAt(t));
        p.mesh.scale.setScalar(p.scale * (1 + Math.sin(this.time * 5 + k) * 0.15));
        (p.mesh.material as THREE.MeshBasicMaterial).opacity =
          (dimmed ? 0.15 : 0.45 + 0.55 * Math.sin(Math.PI * t)) * (0.5 + driverWeight * 0.5);
      });
    });

    // Gut-to-Insulin inflammatory bridge
    this.gutToInsulinBridge.mat.uniforms.uSpeed.value = 0.16 * (0.3 + gutStress * 0.9) * this.speed;
    this.gutToInsulinBridge.mat.uniforms.uDim.value = 0.4 + gutStress * 0.6;
    this.gutToInsulinBridge.packets.forEach((p, k) => {
      const t = (this.time * 0.08 * (0.5 + gutStress * 0.8) + (k / 2)) % 1;
      p.position.copy(this.gutToInsulinBridge.curve.getPointAt(t));
      (p.material as THREE.MeshBasicMaterial).opacity = 0.3 + 0.6 * Math.sin(Math.PI * t) * gutStress;
    });

    // Global time update
    for (const m of this.tickables) {
      if (m.uniforms?.uTime) m.uniforms.uTime.value = this.time;
    }

    // World sway
    this.world.rotation.y = Math.sin(this.time * 0.08) * 0.04;
    this.world.rotation.x = Math.sin(this.time * 0.06 + 1.2) * 0.02;

    // Emit live stats (EMA calculation)
    this.statAcc += raw;
    if (this.statAcc > 0.12) {
      this.statAcc = 0;
      this.opts.onStats({
        metabolicLoad: Math.round(this.smoothed.load * 100),
        barrierThreat: Math.round(gutStress * 100),
        insulinResistance: Math.round(insulinStress * 100),
        circadianDesync: Math.round(this.smoothed.circadian * 100),
        glut4Suppression: Math.round(this.smoothed.activity * 100),
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
    const frames: LifestyleLabelFrame[] = [];

    LIFESTYLE_DRIVERS.forEach((d) => {
      this.tmp.set(...d.pos).add(new THREE.Vector3(0, 1.3, 0));
      const depth = this.camera.position.distanceTo(this.tmp);
      this.tmp.project(this.camera);
      frames.push({
        id: d.id,
        kind: "driver",
        x: (this.tmp.x * 0.5 + 0.5) * w,
        y: (-this.tmp.y * 0.5 + 0.5) * h,
        depth,
        visible: this.tmp.z < 1,
        name: d.name,
        alias: d.alias,
        rank: d.rank,
        color: d.color2,
      });
    });

    LIFESTYLE_TARGETS.forEach((t) => {
      this.tmp.set(...t.pos).add(new THREE.Vector3(0, -1.25, 0));
      const depth = this.camera.position.distanceTo(this.tmp);
      this.tmp.project(this.camera);
      frames.push({
        id: t.id,
        kind: "target",
        x: (this.tmp.x * 0.5 + 0.5) * w,
        y: (-this.tmp.y * 0.5 + 0.5) * h,
        depth,
        visible: this.tmp.z < 1,
        name: t.name,
        alias: t.alias,
        color: t.color2,
      });
    });

    this.opts.onLabels(frames);
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
    document.removeEventListener("visibilitychange", this.onVisibility);
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
