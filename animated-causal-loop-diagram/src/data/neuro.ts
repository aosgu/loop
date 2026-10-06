export type RegionId = "nerve" | "stomach" | "intestine" | "colon";

export interface Region {
  id: RegionId;
  index: string;
  name: string;
  alias: string;
  role: string;
  body: string;
  color: string;
  anchor: [number, number, number];
  facts: { k: string; v: string }[];
}

export const REGIONS: Region[] = [
  {
    id: "nerve",
    index: "A",
    name: "The vagus line",
    alias: "Autonomic command",
    role: "Digestion runs on wiring you never feel.",
    body:
      "The stomach and gut do almost nothing on their own initiative. Gastric emptying, the sweep of peristalsis, the timed mass-movements of the colon — all of it is paced by autonomic fibres: the vagus nerve and the enteric plexus it conducts. These axons are among the longest in the body, wrapped in fatty myelin and fed by the smallest blood vessels — which is exactly why chronic glucose and lipid excess finds them first.",
    color: "#ffe07a",
    anchor: [-4.7, 3.55, 0],
    facts: [
      { k: "wiring", v: "vagus · enteric plexus" },
      { k: "insulation", v: "myelin — a lipid sheath" },
      { k: "weak point", v: "longest axons fail first" },
    ],
  },
  {
    id: "stomach",
    index: "B",
    name: "The stomach",
    alias: "Gastric emptying",
    role: "A paced pump that forgets its rhythm.",
    body:
      "Three times a minute, a vagally-paced electrical wave sweeps the stomach and squeezes chyme through the pylorus. When the pacing fibres degrade, the wave weakens, becomes irregular, or decouples from meals entirely. Food sits for hours — gastroparesis — producing early fullness, bloating, nausea, and a meal that arrives in the intestine long after any insulin given for it has peaked.",
    color: "#ff7d5c",
    anchor: [-3.15, -1.0, 0],
    facts: [
      { k: "healthy pace", v: "~3 waves / minute" },
      { k: "failure mode", v: "gastroparesis — delayed emptying" },
      { k: "felt as", v: "early fullness · bloating · nausea" },
    ],
  },
  {
    id: "intestine",
    index: "C",
    name: "The small intestine",
    alias: "Peristaltic transit",
    role: "A conveyor that loses its conductor.",
    body:
      "Segmenting and propulsive waves knead chyme forward along six metres of tube. Autonomic damage makes the waves erratic — too slow in places, uncoordinated in others. Transit becomes unpredictable: nutrients are absorbed at shifting, unreliable times, bacteria overgrow in stagnant segments, and glucose from a meal appears in the blood on a schedule no dose of medication can anticipate.",
    color: "#4fd0ae",
    anchor: [0.45, -1.85, 0],
    facts: [
      { k: "motion", v: "segmentation + propulsion" },
      { k: "failure mode", v: "erratic, uncoordinated transit" },
      { k: "consequence", v: "unpredictable absorption · overgrowth" },
    ],
  },
  {
    id: "colon",
    index: "D",
    name: "The colon",
    alias: "The last mile",
    role: "Mass movements, missed.",
    body:
      "The colon moves in a few large, coordinated pushes per day — mass movements, triggered reflexively after meals through autonomic arcs. Being served by the longest fibres, it is often the first casualty: the reflex blunts, stool lingers and dries, and constipation sets in — sometimes alternating with diarrhoea when stagnation and bacterial fermentation finally overwhelm the segment downstream.",
    color: "#ffb03a",
    anchor: [4.55, 1.6, 0],
    facts: [
      { k: "motion", v: "2–3 mass movements / day" },
      { k: "trigger", v: "gastro-colic reflex after meals" },
      { k: "failure mode", v: "constipation ⇄ diarrhoea" },
    ],
  },
];

export const regionById = (id: RegionId) => REGIONS.find((r) => r.id === id)!;

export interface ExposurePreset {
  id: string;
  label: string;
  sub: string;
  value: number;
  note: string;
}

export const EXPOSURES: ExposurePreset[] = [
  {
    id: "controlled",
    label: "Controlled",
    sub: "HbA1c ~5.5%",
    value: 0.06,
    note:
      "Glucose and lipids within range. The myelin sheath is maintained, the vasa nervorum — the capillaries feeding each nerve — stay open, and every command arrives on time. Three gastric waves a minute, like a metronome.",
  },
  {
    id: "elevated",
    label: "Elevated",
    sub: "HbA1c ~7.5%",
    value: 0.48,
    note:
      "Years of moderate excess. Sorbitol accumulates in axons, AGEs stiffen the capillary walls, and the longest fibres begin to lag. The distal colon feels it first; gastric pacing survives but turns irregular after large meals.",
  },
  {
    id: "sustained",
    label: "Sustained high",
    sub: "HbA1c 9%+ · dyslipidaemia",
    value: 0.94,
    note:
      "Chronic hyperglycaemia with high triglycerides. Oxidative stress strips myelin segment by segment, from the far end inward. Commands die before reaching the colon, gastric waves decouple from meals, and transit becomes a matter of chance.",
  },
];

export const CHAIN = [
  {
    index: "01",
    title: "Sugar and fat soak the axon",
    body:
      "Nerves cannot refuse glucose — uptake is insulin-independent. Chronic excess floods the polyol pathway: sorbitol accumulates, osmotic stress builds, and the axon's own antioxidant reserves drain away.",
  },
  {
    index: "02",
    title: "The nerve's blood supply narrows",
    body:
      "Each fibre is fed by vasa nervorum — capillaries a few microns wide. Glycated proteins and oxidised lipids thicken their walls. The longest axons, with the most wire to maintain, run out of fuel first.",
  },
  {
    index: "03",
    title: "Myelin frays, distal end inward",
    body:
      "Oxidative stress and ischaemia strip the insulating sheath segment by segment — a length-dependent pattern. Conduction slows, then blocks. The colon, at the end of the line, goes quiet before the stomach does.",
  },
  {
    index: "04",
    title: "The gut loses its conductor",
    body:
      "Gastric waves weaken and decouple from meals: gastroparesis. Intestinal peristalsis turns erratic. Colonic mass movements blunt into constipation, alternating with overflow diarrhoea.",
  },
  {
    index: "05",
    title: "And glucose control gets harder",
    body:
      "A stomach that empties unpredictably delivers meals to the blood on no schedule at all. Insulin and food stop lining up — glucose swings widen, and the very exposure that caused the damage becomes harder to prevent.",
  },
];

export const SYMPTOMS = [
  {
    organ: "Stomach",
    sign: "Gastroparesis",
    detail:
      "Early satiety, bloating, nausea, and post-meal glucose that rises hours late — after any mealtime insulin has already peaked and gone.",
    color: "#ff7d5c",
  },
  {
    organ: "Small intestine",
    sign: "Erratic transit",
    detail:
      "Alternating rush and stall. Stagnant loops invite bacterial overgrowth; absorption of nutrients and oral medication becomes unreliable.",
    color: "#4fd0ae",
  },
  {
    organ: "Colon",
    sign: "Constipation ⇄ diarrhoea",
    detail:
      "Blunted mass movements let stool linger and dry; intermittent fermentation and overflow swing the picture the other way without warning.",
    color: "#ffb03a",
  },
  {
    organ: "Whole axis",
    sign: "Silent progression",
    detail:
      "Autonomic damage is painless by definition — the fibres that would report it are the ones failing. Symptoms are often attributed to diet for years.",
    color: "#ffe07a",
  },
];
