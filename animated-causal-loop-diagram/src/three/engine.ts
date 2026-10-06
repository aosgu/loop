import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { EDGES, NODES, nodeById, type NodeId } from "../data/loop";
import { BUILDERS, type Creature } from "./creatures";
import { makeBackdrop, makeDust, makeLink, makeStage } from "./materials";

export interface LabelFrame {
  key: string;
  kind: "node" | "edge";
  x: number;
  y: number;
  depth: number;
  visible: boolean;
  text: string;
  sub: string;
  color: string;
}

interface EngineOpts {
  onHover: (id: NodeId | null) => void;
  onSelect: (id: NodeId) => void;
  onLabels: (frames: LabelFrame[]) => void;
  onReady?: () => void;
}

const EDGE_STEP = 0.62;
const BURST_TOTAL = EDGE_STEP * 4 + 0.5;

/** Framing: the loop sits right-of-centre so the title column can breathe. */
const HOME_TARGET = new THREE.Vector3(-1.15, 0.32, 0);
const HOME_POS = new THREE.Vector3(-0.5, 1.25, 10.4);
const HOME_DIST = 10.45;

export class LoopEngine {
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

  private creatures = new Map<NodeId, Creature>();
  private links: {
    mat: THREE.ShaderMaterial;
    curve: THREE.CatmullRomCurve3;
    packets: THREE.Mesh[];
    from: NodeId;
    to: NodeId;
  }[] = [];
  private tickables: THREE.ShaderMaterial[] = [];
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2(-2, -2);
  private hits: THREE.Mesh[] = [];
  private hover: NodeId | null = null;
  private hoverAmt = new Map<NodeId, number>();
  private selAmt = new Map<NodeId, number>();
  private pulseAmt = new Map<NodeId, number>();

  private selected: NodeId | null = null;
  private playing = true;
  private speed = 1;
  private time = 0;
  private burstAt = -99;
  private burstFrom = 0;
  private autoBurstAt = 6;
  private idle = 0;
  private down: { x: number; y: number; t: number } | null = null;
  private targetGoal = HOME_TARGET.clone();
  private distGoal = HOME_DIST;
  private focusActive = false;
  private disposed = false;
  private reduce = false;

  constructor(private canvas: HTMLCanvasElement, private opts: EngineOpts) {
    this.reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

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
    this.controls.minDistance = 6;
    this.controls.maxDistance = 17;
    this.controls.minPolarAngle = 0.62;
    this.controls.maxPolarAngle = 2.42;
    this.controls.rotateSpeed = 0.62;
    this.controls.zoomSpeed = 0.6;
    this.controls.autoRotateSpeed = 0.28;
    this.controls.addEventListener("start", () => {
      this.focusActive = false;
      this.idle = 0;
    });

    this.scene.add(this.world);
    this.buildStage();
    this.buildCreatures();
    this.buildLinks();

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.62, 0.78, 0.66);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.resize();
    this.attach();
    this.ro = new ResizeObserver(() => this.resize());
    if (canvas.parentElement) this.ro.observe(canvas.parentElement);
    this.opts.onReady?.();
    this.loop();
  }

  /* ------------------------------------------------------------ */

  private buildStage() {
    const backdrop = new THREE.Mesh(new THREE.SphereGeometry(70, 40, 28), makeBackdrop());
    backdrop.renderOrder = -10;
    backdrop.frustumCulled = false;
    this.scene.add(backdrop);
    this.tickables.push(backdrop.material as THREE.ShaderMaterial);

    const stage = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), makeStage());
    stage.rotation.x = -Math.PI / 2;
    stage.position.y = -3.1;
    this.world.add(stage);
    this.tickables.push(stage.material as THREE.ShaderMaterial);

    // petri rim
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(6.4, 0.012, 6, 180),
      new THREE.MeshBasicMaterial({ color: 0x2f6a5c, transparent: true, opacity: 0.5 }),
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -3.05;
    this.world.add(rim);

    const dustGeo = new THREE.BufferGeometry();
    const n = 520;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 19;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 13;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 15;
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

  private buildCreatures() {
    NODES.forEach((node) => {
      const c = BUILDERS[node.id](node);
      const anchor = new THREE.Group();
      anchor.position.set(...node.pos);
      anchor.add(c.group);
      this.world.add(anchor);
      this.creatures.set(node.id, c);
      this.hits.push(c.hit);
      this.tickables.push(...c.tickables);
      this.hoverAmt.set(node.id, 0);
      this.selAmt.set(node.id, 0);
      this.pulseAmt.set(node.id, 0);
    });
  }

  private buildLinks() {
    EDGES.forEach((edge, i) => {
      const a = new THREE.Vector3(...nodeById(edge.from).pos);
      const b = new THREE.Vector3(...nodeById(edge.to).pos);
      const dir = b.clone().sub(a).normalize();
      const p0 = a.clone().addScaledVector(dir, 1.05);
      const p4 = b.clone().addScaledVector(dir, 1.05);
      const mid = a.clone().add(b).multiplyScalar(0.5).add(new THREE.Vector3(...edge.bow));
      const curve = new THREE.CatmullRomCurve3(
        [p0, p0.clone().lerp(mid, 0.42), mid, mid.clone().lerp(p4, 0.58), p4],
        false,
        "catmullrom",
        0.55,
      );
      const geo = new THREE.TubeGeometry(curve, 260, 0.05, 10, false);
      const mat = makeLink(nodeById(edge.from).glow, nodeById(edge.to).glow);
      mat.uniforms.uRepeat.value = 7 + i;
      const tube = new THREE.Mesh(geo, mat);
      tube.frustumCulled = false;
      this.world.add(tube);
      this.tickables.push(mat);

      // arrowhead
      const t = 0.6;
      const headPos = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t);
      const headColor = new THREE.Color(nodeById(edge.from).glow).lerp(
        new THREE.Color(nodeById(edge.to).glow),
        0.5,
      );
      const head = new THREE.Mesh(
        new THREE.ConeGeometry(0.105, 0.3, 16, 1),
        new THREE.MeshBasicMaterial({ color: headColor }),
      );
      head.position.copy(headPos);
      head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
      this.world.add(head);

      // travelling signal packets
      const packets: THREE.Mesh[] = [];
      const packetGeo = new THREE.SphereGeometry(0.075, 14, 12);
      for (let k = 0; k < 3; k++) {
        const m = new THREE.MeshBasicMaterial({
          color: headColor.clone().lerp(new THREE.Color("#ffffff"), 0.5),
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const p = new THREE.Mesh(packetGeo, m);
        p.userData.phase = k / 3;
        p.userData.scale = 0.62 + k * 0.2;
        p.frustumCulled = false;
        this.world.add(p);
        packets.push(p);
      }

      this.links.push({ mat, curve, packets, from: edge.from, to: edge.to });
    });
  }

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
    this.pointer.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      -((e.clientY - r.top) / r.height) * 2 + 1,
    );
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
    const moved = Math.hypot(e.clientX - d.x, e.clientY - d.y);
    if (moved > 6 || performance.now() - d.t > 520) return;
    // React owns selection state; it calls back into select()
    if (this.hover) this.opts.onSelect(this.hover);
  };
  private onVisibility = () => {
    if (!document.hidden && !this.disposed) this.clock.getDelta();
  };

  /** highlight driven by UI outside the canvas (node index, dossier) */
  setHoverExternal(id: NodeId | null) {
    this.pointer.set(-2, -2);
    this.setHover(id);
  }

  private setHover(id: NodeId | null) {
    if (id === this.hover) return;
    this.hover = id;
    this.canvas.style.cursor = id ? "pointer" : "grab";
    this.opts.onHover(id);
  }

  /* ------------------------------------------------------------ */

  select(id: NodeId) {
    this.selected = id;
    const idx = NODES.findIndex((n) => n.id === id);
    this.firePulse(idx);
    const node = nodeById(id);
    this.targetGoal.set(...node.pos).multiplyScalar(0.45);
    this.distGoal = 8.2;
    this.focusActive = true;
    this.opts.onSelect(id);
  }

  release() {
    this.selected = null;
    this.targetGoal.copy(HOME_TARGET);
    this.distGoal = HOME_DIST;
    this.focusActive = true;
  }

  resetView() {
    this.release();
    this.setHover(null);
    this.focusActive = true;
    this.idle = 0;
  }

  firePulse(fromIndex = 0) {
    this.burstAt = this.time;
    this.burstFrom = ((fromIndex % 4) + 4) % 4;
    this.autoBurstAt = this.time + 13;
  }

  setSpeed(v: number) {
    this.speed = v;
  }
  setPlaying(v: boolean) {
    this.playing = v;
    if (v) this.clock.getDelta();
  }
  setBloom(v: number) {
    this.bloom.strength = v;
  }
  setAutoRotate(v: boolean) {
    this.controls.autoRotate = v && !this.reduce;
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
    // widen on narrow screens so the whole loop stays in frame
    this.camera.fov = w / h < 1.05 ? 62 : w / h < 1.5 ? 52 : 44;
    this.camera.updateProjectionMatrix();
  }

  /* ------------------------------------------------------------ */

  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const raw = Math.min(this.clock.getDelta(), 0.05);
    const dt = this.playing ? raw * this.speed * (this.reduce ? 0.35 : 1) : 0;
    this.time += dt;
    this.idle += raw;

    // turntable when nobody is touching it
    this.controls.autoRotate = this.idle > 5 && !this.reduce && this.playing;
    this.controls.target.lerp(this.targetGoal, 1 - Math.pow(0.0015, raw));
    // only drive the zoom while a focus tween is running — never fight the user
    if (this.focusActive) {
      const dist = this.camera.position.distanceTo(this.controls.target);
      const dirV = this.camera.position.clone().sub(this.controls.target).normalize();
      const next = THREE.MathUtils.lerp(dist, this.distGoal, 1 - Math.pow(0.004, raw));
      this.camera.position.copy(this.controls.target).addScaledVector(dirV, next);
      if (Math.abs(next - this.distGoal) < 0.03) this.focusActive = false;
    }
    this.controls.update();

    // pointer picking
    if (this.pointer.x > -1.5) {
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hit = this.raycaster.intersectObjects(this.hits, false)[0];
      if (hit) {
        const owner = NODES.find((n) =>
          this.creatures.get(n.id)?.hit === hit.object,
        );
        this.setHover(owner ? owner.id : null);
      } else {
        this.setHover(null);
      }
    }

    // burst timeline
    let burstEdge = -1;
    let burstT = -1;
    const since = this.time - this.burstAt;
    if (since >= 0 && since < BURST_TOTAL) {
      const k = Math.floor(since / EDGE_STEP);
      burstEdge = (this.burstFrom + k) % 4;
      burstT = (since % EDGE_STEP) / EDGE_STEP;
    }
    if (this.playing && this.time > this.autoBurstAt && !this.reduce) {
      this.firePulse(0);
    }

    // creatures
    NODES.forEach((node) => {
      const c = this.creatures.get(node.id)!;
      const hoverTarget = this.hover === node.id ? 1 : 0;
      const selTarget = this.selected === node.id ? 1 : 0;
      const prev = this.hoverAmt.get(node.id)!;
      const next = THREE.MathUtils.lerp(prev, hoverTarget, 1 - Math.pow(0.0008, raw));
      this.hoverAmt.set(node.id, next);
      this.selAmt.set(node.id, THREE.MathUtils.lerp(this.selAmt.get(node.id)!, selTarget, 1 - Math.pow(0.0008, raw)));
      let pulseTarget = 0;
      if (burstEdge >= 0) {
        const e = EDGES[burstEdge];
        if (e.from === node.id) pulseTarget = Math.max(0, 1 - burstT * 3);
        if (e.to === node.id) pulseTarget = Math.max(pulseTarget, Math.max(0, burstT * 3 - 2));
      }
      const pAmt = THREE.MathUtils.lerp(this.pulseAmt.get(node.id)!, pulseTarget, 1 - Math.pow(0.004, raw));
      this.pulseAmt.set(node.id, pAmt);

      c.update(this.time, dt, { hover: next, sel: this.selAmt.get(node.id)!, pulse: pAmt });
    });

    // links + packets
    this.links.forEach((l, i) => {
      const active = burstEdge === i ? burstT : -1;
      l.mat.uniforms.uPulse.value = active;
      l.mat.uniforms.uSpeed.value = 0.2 * this.speed * (this.playing ? 1 : 0);
      const dim =
        this.selected && EDGES[i].from !== this.selected && EDGES[i].to !== this.selected
          ? 0.42
          : 1;
      l.mat.uniforms.uDim.value = THREE.MathUtils.lerp(
        l.mat.uniforms.uDim.value,
        dim,
        1 - Math.pow(0.002, raw),
      );
      l.packets.forEach((p, k) => {
        const t = (this.time * 0.085 * this.speed + p.userData.phase) % 1;
        p.position.copy(l.curve.getPointAt(t));
        p.scale.setScalar(
          p.userData.scale * (1 + Math.sin(this.time * 5.5 + k * 2.1) * 0.14),
        );
        (p.material as THREE.MeshBasicMaterial).opacity =
          (0.35 + 0.6 * Math.sin(Math.PI * t)) * dim;
      });
    });

    // global time uniform
    for (const m of this.tickables) {
      if (m.uniforms.uTime) m.uniforms.uTime.value = this.time;
    }

    // world sway
    this.world.rotation.y = Math.sin(this.time * 0.09) * 0.05;
    this.world.rotation.x = Math.sin(this.time * 0.07 + 1.2) * 0.022;

    this.emitLabels();
    this.composer.render();
  };

  private tmp = new THREE.Vector3();
  private emitLabels() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    const frames: LabelFrame[] = [];

    NODES.forEach((node) => {
      const c = this.creatures.get(node.id)!;
      this.tmp.set(...node.pos).add(c.labelAnchor);
      const depth = this.camera.position.distanceTo(this.tmp);
      this.tmp.project(this.camera);
      frames.push({
        key: node.id,
        kind: "node",
        x: (this.tmp.x * 0.5 + 0.5) * w,
        y: (-this.tmp.y * 0.5 + 0.5) * h,
        depth,
        visible: this.tmp.z < 1,
        text: node.name,
        sub: node.alias,
        color: node.color2,
      });
    });

    EDGES.forEach((edge, i) => {
      const p = this.links[i].curve.getPointAt(0.42);
      this.tmp.copy(p);
      const depth = this.camera.position.distanceTo(this.tmp);
      this.tmp.project(this.camera);
      frames.push({
        key: `e-${i}`,
        kind: "edge",
        x: (this.tmp.x * 0.5 + 0.5) * w,
        y: (-this.tmp.y * 0.5 + 0.5) * h,
        depth,
        visible: this.tmp.z < 1,
        text: edge.verb,
        sub: edge.polarity,
        color: "#cfe4da",
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
