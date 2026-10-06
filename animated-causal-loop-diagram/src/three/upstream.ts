import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { NODES } from "../data/loop";
import {
  UPSTREAM_EDGES, UPSTREAM_NODES, isSource, upstreamNode,
  type PulsePhase, type SourceFocus, type UpstreamEdge, type UpstreamId,
} from "../data/upstream";
import { BUILDERS, type Creature } from "./creatures";
import { buildUpstreamSource } from "./upstream-creatures";
import { makeBackdrop, makeDust, makeLink, makeStage } from "./materials";

export interface UpstreamLabel {
  id: string;
  x: number;
  y: number;
  opacity: number;
}

interface Options {
  onSelect: (id: UpstreamId) => void;
  onHover: (id: UpstreamId | null) => void;
  onLabels: (labels: UpstreamLabel[]) => void;
  onPhase: (phase: PulsePhase) => void;
  onContextLost: () => void;
}

interface NodeView {
  creature: Creature;
  anchor: THREE.Group;
  ring: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  hover: number;
  energy: number;
  opacity: number;
  colours: { material: THREE.ShaderMaterial; a: THREE.Color; b: THREE.Color }[];
}

interface EdgeView {
  data: UpstreamEdge;
  group: THREE.Group;
  curve: THREE.CubicBezierCurve3;
  material: THREE.ShaderMaterial;
  arrow: THREE.Mesh<THREE.ConeGeometry, THREE.MeshBasicMaterial>;
  beads: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>[];
  weight: number;
}

const HOME_TARGET = new THREE.Vector3(0, 0.45, 0);
const BRANCH_START = 0.45;
const BRANCH_DURATION = 2.15;
const FEEDBACK_START = 3.2;
const FEEDBACK_DURATION = 1.4;

export class UpstreamEngine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(42, 1, 0.1, 140);
  private controls: OrbitControls;
  private composer: EffectComposer;
  private world = new THREE.Group();
  private clock = new THREE.Clock();
  private nodes = new Map<UpstreamId, NodeView>();
  private edges: EdgeView[] = [];
  private tickables = new Set<THREE.ShaderMaterial>();
  private hits: THREE.Mesh[] = [];
  private hitMap = new Map<THREE.Object3D, UpstreamId>();
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2(-2, -2);
  private projected = new THREE.Vector3();
  private point = new THREE.Vector3();
  private ro: ResizeObserver;
  private motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  private reduce = this.motionQuery.matches;
  private raf = 0;
  private disposed = false;
  private visible = true;
  private observer: IntersectionObserver;
  private width = 1;
  private height = 1;
  private homeDistance = 14;
  private entry = 0;
  private time = 0;
  private playing = true;
  private speed = 1;
  private selection: UpstreamId | null = null;
  private hover: UpstreamId | null = null;
  private externalHover: UpstreamId | null = null;
  private focus: SourceFocus = "both";
  private feedback = true;
  private burstStart: number | null = null;
  private burstFocus: SourceFocus = "both";
  private phase: PulsePhase = "ready";
  private demoPending = true;
  private down: { x: number; y: number } | null = null;

  constructor(private canvas: HTMLCanvasElement, private opts: Options) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.setClearColor(0x060f0d, 1);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.camera.position.set(0, 0.85, this.homeDistance);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.copy(HOME_TARGET);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.enablePan = false;
    // A limited orbit preserves the vertical meaning of upstream and downstream.
    this.controls.minAzimuthAngle = -0.34;
    this.controls.maxAzimuthAngle = 0.34;
    this.controls.minPolarAngle = 1.24;
    this.controls.maxPolarAngle = 1.85;
    this.controls.rotateSpeed = 0.48;
    this.controls.zoomSpeed = 0.55;
    this.scene.add(this.world);
    this.buildEnvironment();
    this.buildNodes();
    this.buildEdges();

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.52, 0.72, 0.72));
    this.composer.addPass(new OutputPass());
    this.resize();
    this.ro = new ResizeObserver(this.resize);
    this.ro.observe(canvas.parentElement!);
    this.observer = new IntersectionObserver(([entry]) => { this.visible = entry.isIntersecting; });
    this.observer.observe(canvas);
    canvas.addEventListener("pointermove", this.onMove);
    canvas.addEventListener("pointerdown", this.onDown);
    canvas.addEventListener("pointerup", this.onUp);
    canvas.addEventListener("pointerleave", this.onLeave);
    canvas.addEventListener("webglcontextlost", this.onContextLost);
    this.motionQuery.addEventListener("change", this.onMotionChange);
    this.frame();
  }

  private buildEnvironment() {
    const sky = new THREE.Mesh(new THREE.SphereGeometry(65, 30, 22), makeBackdrop());
    sky.renderOrder = -10;
    sky.frustumCulled = false;
    this.scene.add(sky);
    this.tickables.add(sky.material);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(22, 22), makeStage());
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -4.1;
    this.world.add(floor);
    this.tickables.add(floor.material);

    const count = 150;
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions.set([(Math.random() - 0.5) * 18, (Math.random() - 0.5) * 13, -2 - Math.random() * 6], i * 3);
      seeds[i] = Math.random();
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    const material = makeDust();
    material.uniforms.uSize.value = 6.5;
    material.uniforms.uPR.value = this.renderer.getPixelRatio();
    this.world.add(new THREE.Points(geometry, material));
    this.tickables.add(material);

    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-5.2, 0.51, -1.8), new THREE.Vector3(5.35, 0.51, -1.8)]),
      new THREE.LineDashedMaterial({ color: 0x719b89, transparent: true, opacity: 0.14, dashSize: 0.04, gapSize: 0.11 }),
    );
    line.computeLineDistances();
    this.world.add(line);
  }

  private buildNodes() {
    for (const n of UPSTREAM_NODES) {
      const creature = isSource(n.id)
        ? buildUpstreamSource(n.id)
        : BUILDERS[n.id](NODES.find((item) => item.id === n.id)!);
      const anchor = new THREE.Group();
      anchor.position.set(...n.position);
      anchor.add(creature.group);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.23, 0.012, 6, 72),
        new THREE.MeshBasicMaterial({ color: n.color, transparent: true, opacity: 0, depthWrite: false }),
      );
      ring.position.z = -0.16;
      anchor.add(ring);
      this.world.add(anchor);
      for (const mat of creature.tickables) this.tickables.add(mat);
      const colours: NodeView["colours"] = [];
      const visited = new Set<THREE.ShaderMaterial>();
      creature.group.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh)) return;
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const mat of mats) {
          if (!(mat instanceof THREE.ShaderMaterial) || visited.has(mat) || !mat.uniforms.uColor2) continue;
          visited.add(mat);
          colours.push({ material: mat, a: mat.uniforms.uColor.value.clone(), b: mat.uniforms.uColor2.value.clone() });
        }
      });
      this.nodes.set(n.id, { creature, anchor, ring, hover: 0, energy: 0, opacity: 1, colours });
      this.hits.push(creature.hit);
      this.hitMap.set(creature.hit, n.id);
    }
  }

  private buildEdges() {
    for (const data of UPSTREAM_EDGES) {
      const [a, b, c, d] = data.path.map((p) => new THREE.Vector3(...p));
      const curve = new THREE.CubicBezierCurve3(a, b, c, d);
      const from = upstreamNode(data.from);
      const to = upstreamNode(data.to);
      const material = makeLink(from.color, data.kind === "influence" ? from.color : to.color);
      material.uniforms.uRepeat.value = data.kind === "influence" ? 11 : data.id === "glucose-gut" ? 18 : 4;
      material.uniforms.uSpeed.value = 0.34;
      material.uniforms.uDim.value = data.kind === "influence" ? 0.9 : 0.5;
      const group = new THREE.Group();
      group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 120, data.kind === "influence" ? 0.03 : 0.024, 7, false), material));
      const arrow = new THREE.Mesh(
        new THREE.ConeGeometry(0.077, 0.2, 12),
        new THREE.MeshBasicMaterial({ color: from.color, transparent: true, opacity: 0.8 }),
      );
      arrow.position.copy(curve.getPointAt(data.kind === "influence" ? 0.8 : 0.7));
      arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), curve.getTangentAt(data.kind === "influence" ? 0.8 : 0.7));
      group.add(arrow);
      const beads: EdgeView["beads"] = [];
      for (let i = 0; i < 2; i++) {
        const bead = new THREE.Mesh(
          new THREE.SphereGeometry(i ? 0.032 : 0.065, 12, 8),
          new THREE.MeshBasicMaterial({
            color: new THREE.Color(from.color).lerp(new THREE.Color("#ffffff"), 0.35),
            transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false,
          }),
        );
        group.add(bead);
        beads.push(bead);
      }
      this.world.add(group);
      this.tickables.add(material);
      this.edges.push({ data, group, curve, material, arrow, beads, weight: 1 });
    }
  }

  setPlaying(playing: boolean) { this.playing = playing; }
  setSpeed(speed: number) { this.speed = speed; }
  setSelection(id: UpstreamId | null) { this.selection = id; }
  setHover(id: UpstreamId | null) { this.externalHover = id; }

  setFocus(focus: SourceFocus) {
    if (this.focus === focus) return;
    this.focus = focus;
    this.burstStart = null;
    this.setPhase("ready");
    this.demoPending = false;
  }

  setFeedback(visible: boolean) { this.feedback = visible; }

  firePulse() {
    this.playing = true;
    this.demoPending = false;
    this.burstStart = this.time;
    this.burstFocus = this.focus;
    this.setPhase("origins");
  }

  resetView() {
    this.controls.target.copy(HOME_TARGET);
    this.camera.position.set(0, 0.85, this.homeDistance);
    this.controls.update();
  }

  private setPhase(phase: PulsePhase) {
    if (phase === this.phase) return;
    this.phase = phase;
    this.opts.onPhase(phase);
  }

  private onMotionChange = (e: MediaQueryListEvent) => { this.reduce = e.matches; };
  private onContextLost = (e: Event) => {
    e.preventDefault();
    cancelAnimationFrame(this.raf);
    this.opts.onContextLost();
  };
  private onMove = (e: PointerEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
  };
  private onDown = (e: PointerEvent) => {
    this.onMove(e);
    this.down = { x: e.clientX, y: e.clientY };
  };
  private onUp = (e: PointerEvent) => {
    if (this.down && Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) < 7) {
      this.onMove(e);
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hit = this.raycaster.intersectObjects(this.hits, false)[0];
      const id = hit ? this.hitMap.get(hit.object) : null;
      if (id) this.opts.onSelect(id);
    }
    this.down = null;
  };
  private onLeave = () => {
    this.pointer.set(-2, -2);
    this.hover = null;
    this.opts.onHover(null);
  };

  private resize = () => {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    const width = Math.max(1, parent.clientWidth);
    const height = Math.max(1, parent.clientHeight);
    const desktop = window.innerWidth >= 960;
    const left = desktop ? (width >= 1200 ? 360 : 300) : 0;
    const pixels = Math.max(20, Math.min((width - left - (desktop ? 70 : 20)) / 11.4, (height - (desktop ? 138 : 56)) / 8.9));
    const previous = this.homeDistance;
    this.homeDistance = height / (2 * Math.tan(THREE.MathUtils.degToRad(21)) * pixels);
    const offset = this.camera.position.clone().sub(this.controls.target);
    this.camera.position.copy(this.controls.target).add(offset.multiplyScalar(this.homeDistance / previous));
    this.controls.minDistance = this.homeDistance * 0.65;
    this.controls.maxDistance = this.homeDistance * 1.35;
    this.camera.aspect = width / height;
    this.camera.setViewOffset(width, height, -left / 2, 0, width, height);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.composer.setSize(width, height);
    this.width = width;
    this.height = height;
  };

  private attention(edge: UpstreamEdge, tracing: boolean) {
    if (edge.kind === "feedback" && !this.feedback) return 0;
    const focus = tracing ? this.burstFocus : this.focus;
    if (edge.kind === "influence" && focus !== "both" && edge.from !== focus) return 0.08;
    const active = this.externalHover ?? this.hover ?? this.selection;
    if (!tracing && active && edge.from !== active && edge.to !== active) return 0.13;
    return edge.kind === "influence" ? 0.95 : tracing ? 0.7 : 0.48;
  }

  private frame = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.frame);
    const raw = Math.min(this.clock.getDelta(), 0.05);
    if (document.hidden || !this.visible) return;
    const dt = this.playing ? raw * this.speed : 0;
    this.time += dt;
    this.entry += raw;
    this.controls.update();
    this.camera.updateMatrixWorld();

    if (this.demoPending && this.time > 1.9 && !this.reduce) this.firePulse();
    const age = this.burstStart === null ? -1 : this.time - this.burstStart;
    const total = this.feedback ? 6.65 : 3.25;
    const tracing = age >= 0 && age < total;
    if (tracing) {
      this.setPhase(age < BRANCH_START ? "origins" : age < 2.6 ? "branching" : age < FEEDBACK_START ? "arrival" : "feedback");
    } else if (this.burstStart !== null) {
      this.burstStart = null;
      this.setPhase("ready");
    }

    const energy = new Map<UpstreamId, number>();
    const addEnergy = (id: UpstreamId, value: number) => energy.set(id, Math.max(energy.get(id) ?? 0, value));
    if (tracing && age < 1.05) {
      for (const id of ["lifestyle", "genetics"] as const) {
        if (this.burstFocus === "both" || this.burstFocus === id) addEnergy(id, Math.sin(Math.min(1, age / 1.05) * Math.PI));
      }
    }

    for (let i = 0; i < this.edges.length; i++) {
      const edge = this.edges[i];
      let progress = -1;
      let start = BRANCH_START;
      let duration = BRANCH_DURATION;
      const eligible = edge.data.kind === "feedback"
        ? this.feedback
        : this.burstFocus === "both" || this.burstFocus === edge.data.from;
      if (edge.data.kind === "feedback") {
        start = FEEDBACK_START + ((i - 4) % 2) * FEEDBACK_DURATION;
        duration = FEEDBACK_DURATION;
      }
      if (tracing && eligible) {
        const local = (age - start) / duration;
        if (local >= 0 && local <= 1) progress = local;
        const arrival = start + duration;
        if (age > arrival - 0.4 && age < arrival + 0.65) {
          addEnergy(edge.data.to, Math.exp(-Math.pow((age - arrival) / 0.3, 2)));
        }
      }
      edge.weight = THREE.MathUtils.lerp(edge.weight, this.attention(edge.data, tracing), 1 - Math.exp(-raw * 8));
      edge.group.visible = edge.data.kind === "influence" || this.feedback;
      edge.material.uniforms.uDim.value = progress >= 0 ? Math.max(edge.weight, 0.9) : edge.weight;
      edge.material.uniforms.uPulse.value = progress;
      edge.arrow.material.opacity = edge.weight;
      edge.beads.forEach((bead, k) => {
        const u = k === 0 && progress >= 0 ? progress : (this.time * 0.11 + i * 0.14 + k * 0.48) % 1;
        edge.curve.getPointAt(u, this.point);
        bead.position.copy(this.point);
        bead.visible = !this.reduce || progress >= 0;
        bead.material.opacity = k === 0 && progress >= 0 ? 1 : edge.weight * 0.45;
        bead.scale.setScalar(k === 0 && progress >= 0 ? 1.8 : 0.7);
      });
    }

    const active = this.externalHover ?? this.hover ?? this.selection;
    const relevant = new Set<UpstreamId>();
    if (active) {
      relevant.add(active);
      for (const edge of UPSTREAM_EDGES) {
        if (edge.from === active || edge.to === active) { relevant.add(edge.from); relevant.add(edge.to); }
      }
    }
    UPSTREAM_NODES.forEach((n, i) => {
      const view = this.nodes.get(n.id)!;
      const targetOpacity = !tracing && active && !relevant.has(n.id) ? 0.42
        : isSource(n.id) && this.focus !== "both" && this.focus !== n.id ? 0.48 : 1;
      view.hover = THREE.MathUtils.lerp(view.hover, (this.hover === n.id || this.externalHover === n.id) ? 1 : 0, 1 - Math.exp(-raw * 9));
      view.energy = THREE.MathUtils.lerp(view.energy, energy.get(n.id) ?? 0, 1 - Math.exp(-raw * 13));
      view.opacity = THREE.MathUtils.lerp(view.opacity, targetOpacity, 1 - Math.exp(-raw * 8));
      view.creature.update(this.reduce ? 0 : this.time, this.reduce ? 0 : dt, {
        hover: view.hover, sel: this.selection === n.id ? 1 : 0, pulse: view.energy,
      });
      const entrance = this.reduce ? 1 : 1 - Math.pow(1 - THREE.MathUtils.clamp((this.entry - i * 0.045) / 1.05, 0, 1), 3);
      view.anchor.scale.setScalar(n.scale * Math.max(0.001, entrance));
      view.ring.material.opacity = view.hover * 0.3 + (this.selection === n.id ? 0.45 : 0) + view.energy * 0.25;
      for (const colour of view.colours) {
        colour.material.uniforms.uColor.value.copy(colour.a).multiplyScalar(view.opacity);
        colour.material.uniforms.uColor2.value.copy(colour.b).multiplyScalar(view.opacity);
      }
    });

    for (const mat of this.tickables) if (mat.uniforms.uTime) mat.uniforms.uTime.value = this.reduce ? 0 : this.time;
    this.world.rotation.y = this.reduce ? 0 : Math.sin(this.time * 0.13) * 0.025;
    this.scene.updateMatrixWorld(true);
    if (this.pointer.x > -1.5 && !this.down) {
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hit = this.raycaster.intersectObjects(this.hits, false)[0];
      const next = hit ? this.hitMap.get(hit.object) ?? null : null;
      if (next !== this.hover) {
        this.hover = next;
        this.opts.onHover(next);
      }
      this.canvas.style.cursor = next ? "pointer" : "grab";
    }
    this.paintLabels();
    this.composer.render();
  };

  private paintLabels() {
    const labels: UpstreamLabel[] = [];
    const push = (id: string, p: [number, number, number], opacity: number) => {
      this.projected.set(...p).applyMatrix4(this.world.matrixWorld).project(this.camera);
      labels.push({
        id,
        x: (this.projected.x * 0.5 + 0.5) * this.width,
        y: (-this.projected.y * 0.5 + 0.5) * this.height,
        opacity: this.projected.z < 1 ? opacity : 0,
      });
    };
    for (const n of UPSTREAM_NODES) push(n.id, n.label, this.nodes.get(n.id)!.opacity);
    for (const edge of this.edges) {
      if (edge.data.kind !== "feedback" || edge.data.id === "glucose-gut") continue;
      const midpoint = edge.curve.getPointAt(0.5, this.point);
      push(edge.data.id, [midpoint.x, midpoint.y - 0.36, midpoint.z], this.feedback ? edge.weight * 0.9 : 0);
    }
    push("tier-up", [0, 4.72, 0], 0.65);
    push("tier-down", [0.1, 0.05, 0], 0.45);
    push("return", [0.1, -3.02, 0.65], this.feedback ? 0.65 : 0);
    this.opts.onLabels(labels);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.observer.disconnect();
    this.motionQuery.removeEventListener("change", this.onMotionChange);
    this.canvas.removeEventListener("pointermove", this.onMove);
    this.canvas.removeEventListener("pointerdown", this.onDown);
    this.canvas.removeEventListener("pointerup", this.onUp);
    this.canvas.removeEventListener("pointerleave", this.onLeave);
    this.canvas.removeEventListener("webglcontextlost", this.onContextLost);
    this.controls.dispose();
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    this.scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Points)) return;
      geometries.add(obj.geometry);
      for (const mat of Array.isArray(obj.material) ? obj.material : [obj.material]) materials.add(mat);
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    this.composer.passes.forEach((pass) => pass.dispose());
    this.composer.dispose();
    this.renderer.dispose();
  }
}