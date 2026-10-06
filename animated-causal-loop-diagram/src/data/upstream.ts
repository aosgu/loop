import { NODES, type NodeId } from "./loop";

export type SourceId = "lifestyle" | "genetics";
export type UpstreamId = NodeId | SourceId;
export type SourceFocus = "both" | SourceId;
export type Point3 = [number, number, number];
export type PulsePhase = "ready" | "origins" | "branching" | "arrival" | "feedback";

export interface UpstreamNode {
  id: UpstreamId;
  index: string;
  name: string;
  alias: string;
  color: string;
  tier: "upstream" | "downstream";
  position: Point3;
  label: Point3;
  scale: number;
  role: string;
  body: string;
}

export const SOURCES: UpstreamNode[] = [
  {
    id: "lifestyle",
    index: "05",
    name: "Lifestyle",
    alias: "The Daily Rhythm",
    color: "#ffb38b",
    tier: "upstream",
    position: [-2.65, 2.55, 0.15],
    label: [-2.65, 3.92, 0.15],
    scale: 0.9,
    role: "One daily rhythm. More than one route.",
    body:
      "Diet, physical activity, sleep and stress can influence gut function and insulin sensitivity in parallel. They do not need to act through the gut alone to affect metabolism. These are potentially modifiable influences, shaped by circumstances as well as individual choices.",
  },
  {
    id: "genetics",
    index: "06",
    name: "Genetic susceptibility",
    alias: "The Inherited Thread",
    color: "#ffe07a",
    tier: "upstream",
    position: [2.35, 2.55, -0.15],
    label: [2.35, 3.92, -0.15],
    scale: 0.9,
    role: "An inherited tendency, not a fixed ending.",
    body:
      "Inherited variation can influence insulin action, fat distribution, immune responses and aspects of the intestinal environment. Many variants and environmental factors interact. A predisposition changes susceptibility; it does not make gut dysfunction or insulin resistance inevitable.",
  },
];

const POSITIONS: Record<NodeId, Point3> = {
  coil: [-4.05, -1.0, 0.18],
  smoulder: [-1.3, -1.0, -0.05],
  lock: [1.45, -1.0, 0.05],
  bloom: [4.2, -1.0, 0.22],
};

const BODIES: Record<NodeId, string> = {
  coil:
    "The microbiome and intestinal barrier sit downstream of daily exposures and inherited host traits. Gut changes can then contribute to low-grade inflammation. In this diagram, the gut is both a recipient of upstream influences and a participant in the original feedback loop.",
  smoulder:
    "Signals from a disrupted intestinal barrier can contribute to low-grade inflammation. Inflammatory pathways can interfere with insulin signalling. This is one downstream route, not the only route from lifestyle or inherited susceptibility to insulin resistance.",
  lock:
    "Lifestyle and inherited susceptibility can affect insulin sensitivity through pathways that do not all pass through the gut. Inflammation adds another route. Lower sensitivity corresponds to greater insulin resistance, which can contribute to elevated blood glucose.",
  bloom:
    "Insulin resistance can contribute to high blood glucose when compensation is insufficient. Elevated glucose can, in turn, affect the intestinal environment. The return connection preserves the original reinforcing loop; it does not point back to or alter inherited DNA.",
};

export const UPSTREAM_NODES: UpstreamNode[] = [
  ...NODES.map((n): UpstreamNode => ({
    id: n.id,
    index: n.index,
    name: n.name,
    alias: n.alias,
    color: n.glow,
    tier: "downstream",
    position: POSITIONS[n.id],
    label: [POSITIONS[n.id][0], -2.27, POSITIONS[n.id][2]],
    scale: n.id === "lock" ? 0.88 : 0.74,
    role: n.role,
    body: BODIES[n.id],
  })),
  ...SOURCES,
];

export interface UpstreamEdge {
  id: string;
  from: UpstreamId;
  to: UpstreamId;
  kind: "influence" | "feedback";
  verb: string;
  explanation: string;
  path: [Point3, Point3, Point3, Point3];
}

// Crossing branches occupy different depths; a crossing is not a junction.
export const UPSTREAM_EDGES: UpstreamEdge[] = [
  {
    id: "lifestyle-gut",
    from: "lifestyle",
    to: "coil",
    kind: "influence",
    verb: "shapes the gut",
    explanation: "Diet, movement, sleep and stress can alter the intestinal environment, microbial activity and barrier function.",
    path: [[-2.92, 1.81, 0.15], [-3.9, 1.45, 0.45], [-4.2, 0.5, 0.35], [-4.05, -0.21, 0.18]],
  },
  {
    id: "lifestyle-insulin",
    from: "lifestyle",
    to: "lock",
    kind: "influence",
    verb: "modulates sensitivity",
    explanation: "Activity, sleep, diet and stress can affect insulin action through muscle, liver, adipose tissue and hormonal pathways.",
    path: [[-1.96, 2.05, 0.3], [-0.45, 1.65, 1.1], [0.95, 0.6, 0.95], [1.22, -0.19, 0.12]],
  },
  {
    id: "genetics-gut",
    from: "genetics",
    to: "coil",
    kind: "influence",
    verb: "shapes susceptibility",
    explanation: "Inherited host traits can affect intestinal immunity, barrier characteristics and aspects of microbial ecology, alongside environmental influences.",
    path: [[1.88, 1.81, -0.2], [0.35, 1.22, -1.05], [-2.65, 0.72, -0.8], [-3.57, -0.4, 0.12]],
  },
  {
    id: "genetics-insulin",
    from: "genetics",
    to: "lock",
    kind: "influence",
    verb: "shapes susceptibility",
    explanation: "Inherited variation can influence insulin action and fat distribution, modifying susceptibility rather than determining a single outcome.",
    path: [[2.34, 1.65, -0.15], [2.34, 1.1, -0.2], [1.98, 0.62, -0.15], [1.7, -0.2, 0.05]],
  },
  {
    id: "gut-inflammation",
    from: "coil",
    to: "smoulder",
    kind: "feedback",
    verb: "leaks +",
    explanation: "Gut barrier disruption can increase inflammatory signalling.",
    path: [[-3.22, -1.02, 0.18], [-2.95, -0.86, 0.36], [-2.44, -0.86, 0.32], [-2.14, -1.02, 0]],
  },
  {
    id: "inflammation-insulin",
    from: "smoulder",
    to: "lock",
    kind: "feedback",
    verb: "jams +",
    explanation: "Inflammatory pathways can interfere with insulin signalling.",
    path: [[-0.47, -1.02, 0], [-0.2, -0.82, 0.3], [0.39, -0.82, 0.3], [0.71, -1.02, 0.05]],
  },
  {
    id: "insulin-glucose",
    from: "lock",
    to: "bloom",
    kind: "feedback",
    verb: "spills +",
    explanation: "Greater insulin resistance can contribute to higher blood glucose.",
    path: [[2.15, -1.02, 0.05], [2.49, -0.83, 0.3], [3.01, -0.83, 0.3], [3.37, -1.02, 0.22]],
  },
  {
    id: "glucose-gut",
    from: "bloom",
    to: "coil",
    kind: "feedback",
    verb: "reseeds +",
    explanation: "Elevated glucose can alter the intestinal environment, closing the original reinforcing loop.",
    path: [[4.35, -1.85, 0.22], [4.4, -4.25, 0.65], [-4.4, -4.25, 0.65], [-4.12, -1.86, 0.18]],
  },
];

export function upstreamNode(id: UpstreamId) {
  return UPSTREAM_NODES.find((n) => n.id === id)!;
}

export function isSource(id: UpstreamId): id is SourceId {
  return id === "lifestyle" || id === "genetics";
}

export const PHASE_COPY: Record<PulsePhase, { title: string; body: string }> = {
  ready: { title: "Follow the influence", body: "Choose a root, then fire a pulse. Each source has two entry points into the same loop." },
  origins: { title: "Start upstream", body: "The trace begins at the selected shared influence, above the original circuit." },
  branching: { title: "One source, two routes", body: "The signal branches toward the gut and insulin resistance in parallel." },
  arrival: { title: "Both systems receive it", body: "The gut is not the only route. Insulin sensitivity also has its own upstream inputs." },
  feedback: { title: "Then the loop carries it onward", body: "The four original nodes remain connected. Shared causes and feedback can coexist." },
};

export const SOURCE_EXPLANATIONS: Record<SourceId, { gut: string; insulin: string; takeaway: string }> = {
  lifestyle: {
    gut: "Food provides substrates for microbes. Activity, sleep and stress can also affect motility, immune signalling and the intestinal environment.",
    insulin: "Activity changes muscle glucose use; sleep, diet and stress can influence hormonal signalling, adipose tissue and insulin action.",
    takeaway: "The same daily conditions can reach two systems by different routes.",
  },
  genetics: {
    gut: "Inherited host traits can shape intestinal immunity, barrier characteristics and some microbial associations. Environment remains a major influence.",
    insulin: "Many inherited variants influence metabolic traits, including insulin action and fat distribution. Their effects vary with context.",
    takeaway: "Susceptibility is a starting condition, not a predetermined destination.",
  },
};