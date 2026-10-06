export type NodeId = "coil" | "smoulder" | "lock" | "bloom";

export interface Marker {
  label: string;
  dir: "up" | "down";
}

export interface LoopNode {
  id: NodeId;
  index: string;
  name: string;
  alias: string;
  full: string;
  signal: string;
  role: string;
  body: string;
  markers: Marker[];
  /** 3D stage position */
  pos: [number, number, number];
  /** plush fur colour */
  color: string;
  /** plush belly / rim colour */
  color2: string;
  /** hot core (ember, crystal) */
  glow: string;
  /** risograph ink */
  ink: string;
  fur: number;
  wobble: number;
}

export interface LoopEdge {
  from: NodeId;
  to: NodeId;
  verb: string;
  polarity: "+" | "−";
  note: string;
  /** perpendicular bow of the connector on the 3D stage */
  bow: [number, number, number];
}

export const NODES: LoopNode[] = [
  {
    id: "coil",
    index: "01",
    name: "Gut",
    alias: "The Coil",
    full: "Microbiome & barrier integrity",
    signal: "LPS · endotoxin",
    role: "A door left ajar.",
    body:
      "Trillions of tenants keep the lining calm and the mucus layer thick. When fibre falls away and ultra-processed food takes its place, diversity thins, tight junctions let go, and bacterial fragments — lipopolysaccharide — slip through into the bloodstream.",
    markers: [
      { label: "diversity", dir: "down" },
      { label: "permeability", dir: "up" },
      { label: "SCFA", dir: "down" },
    ],
    pos: [-3.55, 0.95, 0.35],
    color: "#f2643f",
    color2: "#ffb59a",
    glow: "#ff8a5c",
    ink: "#ef4a24",
    fur: 1.0,
    wobble: 0.035,
  },
  {
    id: "smoulder",
    index: "02",
    name: "Low-grade inflammation",
    alias: "The Smoulder",
    full: "Metaflammation",
    signal: "IL-6 · TNF-α · CRP",
    role: "Not a fire. A hum.",
    body:
      "Immune sentinels answer the leak — but quietly. Cytokines drift two to four times above baseline: far below the fever threshold, far above what tissue enjoys. A smouldering state that can run for years without producing a single symptom you could name.",
    markers: [
      { label: "CRP", dir: "up" },
      { label: "TNF-α", dir: "up" },
      { label: "resolution", dir: "down" },
    ],
    pos: [-1.2, -1.15, -1.35],
    color: "#e0621d",
    color2: "#ffc766",
    glow: "#ff9c2e",
    ink: "#f2b307",
    fur: 0.85,
    wobble: 0.11,
  },
  {
    id: "lock",
    index: "03",
    name: "Insulin resistance",
    alias: "The Locked Door",
    full: "The receptor relay, jammed",
    signal: "IRS-1 serine blockade",
    role: "Insulin knocks. Nobody answers.",
    body:
      "TNF-α and its kin phosphorylate the insulin relay on the wrong residues. The signal stalls; GLUT4 vesicles stay docked inside the cell instead of opening the membrane. Muscle and liver refuse the sugar, so the pancreas pumps ever more insulin just to hold the line.",
    markers: [
      { label: "IRS-1", dir: "down" },
      { label: "GLUT4", dir: "down" },
      { label: "fasting insulin", dir: "up" },
    ],
    pos: [1.55, 1.05, -0.55],
    color: "#1f9c82",
    color2: "#9ff0d8",
    glow: "#4fd0ae",
    ink: "#0d7466",
    fur: 0.75,
    wobble: 0.05,
  },
  {
    id: "bloom",
    index: "04",
    name: "Hyperglycaemia",
    alias: "The Sugar Bloom",
    full: "Glucose load & glycation",
    signal: "glucose · AGEs",
    role: "The sweetness that feeds the loop.",
    body:
      "Glucose pools in the blood and crystallises into tissue, glycating proteins into advanced glycation end-products. The surplus reaches the gut as well: it feeds the wrong microbes, stiffens the lining, blunts the incretin response — and re-opens the circuit where it started.",
    markers: [
      { label: "HbA1c", dir: "up" },
      { label: "AGEs", dir: "up" },
      { label: "incretin", dir: "down" },
    ],
    pos: [3.75, -0.85, 1.15],
    color: "#e8b93f",
    color2: "#fff2c0",
    glow: "#ffe07a",
    ink: "#e89b12",
    fur: 0.55,
    wobble: 0.02,
  },
];

export const EDGES: LoopEdge[] = [
  {
    from: "coil",
    to: "smoulder",
    verb: "leaks",
    polarity: "+",
    note: "Endotoxin crossing the barrier recruits immune cells. Cytokine tone climbs.",
    bow: [-0.5, -0.5, 0.9],
  },
  {
    from: "smoulder",
    to: "lock",
    verb: "jams",
    polarity: "+",
    note: "Cytokines mis-phosphorylate the insulin relay inside muscle and liver.",
    bow: [0.35, 0.55, 1.15],
  },
  {
    from: "lock",
    to: "bloom",
    verb: "spills",
    polarity: "+",
    note: "Refused entry, glucose stays in the bloodstream and accumulates.",
    bow: [0.55, -0.35, 0.95],
  },
  {
    from: "bloom",
    to: "coil",
    verb: "reseeds",
    polarity: "+",
    note: "The sugar load reshapes the microbiome and weakens the barrier — the loop closes.",
    bow: [0.0, 2.75, -3.6],
  },
];

export const GLOSSARY = [
  "dysbiosis",
  "tight junctions",
  "LPS",
  "metaflammation",
  "TNF-α",
  "IRS-1",
  "GLUT4",
  "AGEs",
  "incretin",
  "HbA1c",
  "short-chain fatty acids",
  "R1 · reinforcing loop",
];

export const LEVERS = [
  {
    tag: "break at 01",
    title: "Feed the tenants",
    body:
      "Fibre diversity — thirty plants a week — and fermented foods rebuild the mucus layer and restore short-chain fatty acid output. The door closes before the hum begins.",
  },
  {
    tag: "break at 02",
    title: "Cool the smoulder",
    body:
      "Sleep before midnight, and enough of it. Visceral fat and circadian drift are the two loudest inputs to baseline cytokine tone.",
  },
  {
    tag: "break at 03",
    title: "Open the door by force",
    body:
      "Contracting muscle recruits GLUT4 without insulin. A ten-minute walk after eating bypasses the jammed relay entirely.",
  },
  {
    tag: "break at 04",
    title: "Flatten the spike",
    body:
      "Order matters: fibre and protein before starch blunts the post-meal glucose curve, which in turn starves the reseeding edge.",
  },
];

export const nodeById = (id: NodeId) => NODES.find((n) => n.id === id)!;
