export type LayerId = "lumen" | "mucus" | "wall" | "junction" | "blood";

export interface Layer {
  id: LayerId;
  index: string;
  name: string;
  alias: string;
  role: string;
  body: string;
  color: string;
  /** world-space anchor for the projected label */
  anchor: [number, number, number];
  facts: { k: string; v: string }[];
}

export const LAYERS: Layer[] = [
  {
    id: "lumen",
    index: "A",
    name: "The lumen",
    alias: "Outside, technically",
    role: "What you swallow never truly enters you.",
    body:
      "The gut cavity is a tube running through the body, not inside it. Everything in it — food, bile, a hundred trillion bacteria — is still on the outer side of a wall one cell thick. Absorption is not a leak; it is a series of deliberate, selective doors.",
    color: "#ff7d5c",
    anchor: [4.9, 4.15, 0],
    facts: [
      { k: "residents", v: "~10¹³ bacteria" },
      { k: "surface", v: "≈ 30 m² of wall" },
      { k: "turnover", v: "lining renewed every 3–5 days" },
    ],
  },
  {
    id: "mucus",
    index: "B",
    name: "The mucus blanket",
    alias: "First soft defence",
    role: "A gel that keeps bacteria at arm's length.",
    body:
      "Goblet cells spin a double layer of mucin gel over the epithelium. The outer layer is a bacterial pasture; the inner layer is meant to stay sterile. Fermentable fibre feeds the microbes that maintain it — strip the fibre out and some species begin grazing on the mucus itself, thinning the blanket until bacteria touch the cells.",
    color: "#9ff0d8",
    anchor: [0, 2.35, 0],
    facts: [
      { k: "built from", v: "MUC2 mucin" },
      { k: "fed by", v: "fermentable fibre" },
      { k: "thins with", v: "low-fibre, high-fat intake" },
    ],
  },
  {
    id: "wall",
    index: "C",
    name: "The epithelium",
    alias: "One cell thick",
    role: "The entire border is a single row of cells.",
    body:
      "Enterocytes stand shoulder to shoulder, microvilli upward, pulling in sugars, amino acids and fats through dedicated transporters. Saturated fat is absorbed into chylomicrons — and lipopolysaccharide, the outer coat of gram-negative bacteria, can hitch a ride with it straight across the cell.",
    color: "#4fd0ae",
    anchor: [3.9, 0.85, 0],
    facts: [
      { k: "thickness", v: "a single cell layer" },
      { k: "selective doors", v: "GLUT2 · SGLT1 · PepT1" },
      { k: "fat route", v: "chylomicrons carry LPS along" },
    ],
  },
  {
    id: "junction",
    index: "D",
    name: "Tight junctions",
    alias: "The stitching",
    role: "Protein seams sewn between every pair of cells.",
    body:
      "Claudins, occludin and ZO-1 lace neighbouring cells together into a selective seal. Saturated fat, fructose and the loss of butyrate loosen that stitching; the seam between cells widens from a controlled pore to an open gap. This is what “intestinal permeability” literally means — a wider seam.",
    color: "#ffe07a",
    anchor: [-2.6, 1.55, 0],
    facts: [
      { k: "proteins", v: "claudin · occludin · ZO-1" },
      { k: "loosened by", v: "saturated fat · fructose · alcohol" },
      { k: "tightened by", v: "butyrate from fibre" },
    ],
  },
  {
    id: "blood",
    index: "E",
    name: "The bloodstream",
    alias: "Where it stops being local",
    role: "LPS in circulation is read as an invasion.",
    body:
      "Once endotoxin crosses, TLR4 receptors on immune cells recognise it and the body answers with cytokines — IL-6, TNF-α, CRP. Not a fever; a hum, two to four times baseline, running for years. That hum is what later mis-phosphorylates the insulin relay in muscle and liver.",
    color: "#ffb03a",
    anchor: [4.6, -2.55, 0],
    facts: [
      { k: "sensor", v: "TLR4 / CD14" },
      { k: "output", v: "IL-6 · TNF-α · CRP" },
      { k: "state", v: "metabolic endotoxaemia" },
    ],
  },
];

export const layerById = (id: LayerId) => LAYERS.find((l) => l.id === id)!;

export interface DietPreset {
  id: string;
  label: string;
  sub: string;
  value: number;
  note: string;
}

export const DIETS: DietPreset[] = [
  {
    id: "fibre",
    label: "Fibre-rich",
    sub: "plants · ferments",
    value: 0.06,
    note:
      "Fermentable fibre becomes butyrate. Butyrate is the preferred fuel of the enterocyte and a direct upregulator of tight-junction proteins. The seam is sewn tight and the mucus blanket stays thick.",
  },
  {
    id: "mixed",
    label: "Mixed",
    sub: "ordinary week",
    value: 0.42,
    note:
      "Some fibre, a fair amount of refined carbohydrate and fat. The seam loosens intermittently — mostly after large, fatty meals — and closes again. Endotoxin appears in the blood in post-meal pulses.",
  },
  {
    id: "processed",
    label: "Ultra-processed",
    sub: "high fat · high sugar · low fibre",
    value: 0.94,
    note:
      "Saturated fat and fructose loosen claudins while the mucus blanket thins for lack of fibre. LPS crosses continuously rather than in pulses, and the cytokine hum stops switching off between meals.",
  },
];

export const CHAIN = [
  {
    index: "01",
    title: "The diet changes the tenants",
    body:
      "Low fibre starves the butyrate producers; high saturated fat and emulsifiers favour gram-negative species. The community shifts, and with it the chemistry at the wall.",
  },
  {
    index: "02",
    title: "The blanket thins, the seam loosens",
    body:
      "Without fermentable fibre the mucus layer is grazed thin, and without butyrate the tight-junction proteins are expressed less. Bacteria now sit against a wall whose stitching has slackened.",
  },
  {
    index: "03",
    title: "LPS crosses into circulation",
    body:
      "Lipopolysaccharide moves through the widened seam — and rides across inside chylomicrons during fatty meals. Blood endotoxin rises two- to threefold: metabolic endotoxaemia.",
  },
  {
    index: "04",
    title: "The immune system answers quietly",
    body:
      "TLR4 recognises LPS and the cytokine tone rises. No fever, no symptom — just IL-6 and TNF-α running permanently above baseline, everywhere the blood goes.",
  },
  {
    index: "05",
    title: "The insulin relay jams",
    body:
      "In muscle, liver and fat, TNF-α-driven kinases phosphorylate IRS-1 on serine instead of tyrosine. The insulin signal stalls, GLUT4 stays docked, and glucose is refused entry. Sensitivity falls.",
  },
];
