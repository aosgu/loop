export type LifestyleId = "diet" | "activity" | "sleep" | "circadian";
export type TargetId = "gut_target" | "insulin_target";
export type LifestyleNodeId = LifestyleId | TargetId;

export interface LifestyleDriver {
  id: LifestyleId;
  index: string;
  rank: "Primary · Most Direct" | "Secondary · Direct" | "Underestimated Driver" | "Underestimated Driver";
  rankNum: number; // 1 = most direct, 4 = circadian
  name: string;
  alias: string;
  subtitle: string;
  color: string;
  color2: string;
  glow: string;
  directnessScore: number; // 100 for diet, 80 for activity, 65 for sleep, 60 for circadian
  pos: [number, number, number];
  role: string;
  body: string;
  gutMechanism: string;
  insulinMechanism: string;
  keyMarkers: string[];
  takeaway: string;
}

export interface LifestyleTarget {
  id: TargetId;
  index: string;
  name: string;
  alias: string;
  color: string;
  color2: string;
  glow: string;
  pos: [number, number, number];
  role: string;
  body: string;
}

export interface LifestyleCausalEdge {
  id: string;
  from: LifestyleId;
  to: TargetId;
  verb: string;
  polarity: "+" | "−";
  weight: number; // visual thickness and packet speed multiplier
  description: string;
  bow: [number, number, number];
}

export const LIFESTYLE_DRIVERS: LifestyleDriver[] = [
  {
    id: "diet",
    index: "01",
    rank: "Primary · Most Direct",
    rankNum: 1,
    name: "Dietary Structure & Energy Surplus",
    alias: "The Feast & Burden",
    subtitle: "High saturated fat, excess sugar, low fibre & chronic caloric overload",
    color: "#ff6036",
    color2: "#ffb59a",
    glow: "#ff7d5c",
    directnessScore: 100,
    pos: [-4.4, 2.05, 0.2],
    role: "The most immediate substrate entering the digestive canal and hepatic circulation.",
    body:
      "Dietary composition and chronic positive energy balance act as the most direct upstream driver of metabolic dysfunction. Refined carbohydrates and saturated fatty acids flood enterocytes and hepatocytes with substrate, driving de novo lipogenesis, lipid overflow, and endotoxin translocation within hours of ingestion.",
    gutMechanism:
      "Lack of fermentable prebiotic fibre starves short-chain fatty acid (SCFA) producing commensals, thinning the protective mucin layer. Concurrently, saturated fats and emulsifiers increase paracellular permeability, facilitating bacterial LPS translocation into portal blood.",
    insulinMechanism:
      "Chronic caloric excess promotes ectopic lipid accumulation in liver and skeletal muscle. Diacylglycerols (DAGs) and ceramides activate novel protein kinase C (nPKC) isoforms, directly phosphorylating IRS-1 on serine residues and blunting insulin-mediated GLUT4 translocation.",
    keyMarkers: ["High DAG / Ceramides", "SCFA Depletion", "Postprandial LPS ↑", "Ectopic Hepatic Fat ↑"],
    takeaway: "Dietary structure provides the physical substrate for both mucosal breakdown and receptor blockade.",
  },
  {
    id: "activity",
    index: "02",
    rank: "Secondary · Direct",
    rankNum: 2,
    name: "Physical Inactivity & Sedentariness",
    alias: "The Stagnant Musculature",
    subtitle: "Sustained sitting, low step counts & absent muscular contraction",
    color: "#e0621d",
    color2: "#ffc766",
    glow: "#ffb03a",
    directnessScore: 82,
    pos: [-1.45, 2.05, -0.1],
    role: "Loss of the body's largest insulin-independent glucose sink and metabolic engine.",
    body:
      "Skeletal muscle accounts for over 70–80% of postprandial glucose disposal. Prolonged physical inactivity halts muscle contraction-induced AMPK activation, reducing GLUT4 translocation independent of insulin. Over time, sedentary muscle accumulates intramyocellular lipids, worsening baseline insulin resistance while simultaneously reducing gut motility and microbiome diversity.",
    gutMechanism:
      "Physical movement accelerates colonic transit time, stimulates anti-inflammatory myokine release (such as IL-6 during acute contraction which acts anti-inflammatorily), and fosters SCFA-producing taxa (e.g., Faecalibacterium prausnitzii). Stagnation slows transit and alters mucosal immune surveillance.",
    insulinMechanism:
      "Contracting skeletal muscle activates 5'-AMP-activated protein kinase (AMPK) and calcium/calmodulin-dependent protein kinase (CaMK), stimulating GLUT4 vesicle trafficking to the cell membrane entirely independent of the insulin receptor cascade. Inactivity leaves glucose clearance entirely dependent on an already overloaded insulin relay.",
    keyMarkers: ["AMPK Dormancy", "GLUT4 Stasis", "Reduced Myokines", "Slowed Colonic Transit"],
    takeaway: "Contracting muscle is a bypass valve around the jammed insulin relay; inactivity closes that valve.",
  },
  {
    id: "sleep",
    index: "03",
    rank: "Underestimated Driver",
    rankNum: 3,
    name: "Sleep Deprivation & Fragmentation",
    alias: "The Sleepless Stressor",
    subtitle: "Short duration (<6h), fragmented architecture & nighttime hypoxia",
    color: "#e8b93f",
    color2: "#fff2c0",
    glow: "#ffe07a",
    directnessScore: 68,
    pos: [1.45, 2.05, -0.1],
    role: "A silent neuroendocrine disruptor that acutely cuts insulin sensitivity by 20–30%.",
    body:
      "Sleep is a frequently overlooked shared driver of metabolic and gut pathology. Just a few nights of partial sleep restriction (4–5 hours) reduce peripheral insulin sensitivity by 20–30% in healthy adults—a magnitude comparable to severe obesity. Sleep fragmentation activates the sympathetic nervous system and hypothalamic-pituitary-adrenal (HPA) axis, elevating nocturnal cortisol and free fatty acids.",
    gutMechanism:
      "Elevated nocturnal glucocorticoids and sympathetic tone alter intestinal mucosal blood flow, weaken tight-junction claudin-1 expression, and disrupt the diurnal rhythmicity of gut commensals, promoting local dysbiosis and barrier fragility.",
    insulinMechanism:
      "Elevated morning cortisol, elevated nocturnal growth hormone pulses, and sustained sympathetic outflow drive sustained adipose lipolysis. Excess circulating free fatty acids induce systemic insulin resistance in liver and skeletal muscle.",
    keyMarkers: ["Nocturnal Cortisol ↑", "Sympathetic Tone ↑", "Insulin Sensitivity ↓ 25%", "Ghrelin/Leptin Mismatch"],
    takeaway: "Sleep loss acts as an acute neuroendocrine stressor that paralyzes insulin signaling overnight.",
  },
  {
    id: "circadian",
    index: "04",
    rank: "Underestimated Driver",
    rankNum: 4,
    name: "Circadian Rhythm Misalignment",
    alias: "The Desynchronised Clock",
    subtitle: "Late-night eating, irregular schedules, artificial blue light & shift work",
    color: "#1f9c82",
    color2: "#9ff0d8",
    glow: "#4fd0ae",
    directnessScore: 62,
    pos: [4.4, 2.05, 0.2],
    role: "Temporal desynchronisation between central hypothalamic and peripheral metabolic pacemakers.",
    body:
      "Every metabolic organ possesses autonomous peripheral molecular clocks (CLOCK/BMAL1) entrained by nutrient intake, while the central pacemaker in the suprachiasmatic nucleus (SCN) is entrained by light. Eating late at night or rotating sleep-wake cycles desynchronises the liver and gut from the brain, abolishing metabolic anticipation and flattening microbial diurnal oscillations.",
    gutMechanism:
      "The gut microbiome exhibits pronounced 24-hour rhythmic fluctuations in composition, spatial positioning against the mucus blanket, and metabolic output (SCFA synthesis). Circadian disruption flattens these rhythms, eroding barrier restitution which normally occurs during nocturnal rest.",
    insulinMechanism:
      "Human beta-cell glucose-stimulated insulin secretion and peripheral insulin sensitivity naturally peak in the biological morning and decline in the evening. Consuming large caloric loads late in the circadian cycle causes severe postprandial glucose and lipid excursions due to unaligned metabolic machinery.",
    keyMarkers: ["Central/Peripheral Clock Clash", "Flattened Microbial Diurnal Rhythm", "Nocturnal Melatonin-Insulin Clash", "Impaired Evening Glucose Tolerance"],
    takeaway: "Timing is biology: consuming food when metabolic machinery is in nighttime mode accelerates dysfunction.",
  },
];

export const LIFESTYLE_TARGETS: LifestyleTarget[] = [
  {
    id: "gut_target",
    index: "G",
    name: "Intestinal Barrier & Microbiota",
    alias: "The Mucosal Gateway",
    color: "#f2643f",
    color2: "#ffb59a",
    glow: "#ff7d5c",
    pos: [-3.0, -1.25, 0.15],
    role: "The physical barrier regulating endotoxin entry, microbial diversity, and incretin tone.",
    body:
      "The gut receives dietary substrates directly from above while also responding to autonomic signals, cortisol, and myokines from activity, sleep, and circadian rhythms. Under combined lifestyle insult, tight junctions widen and LPS leaks continuously into portal circulation.",
  },
  {
    id: "insulin_target",
    index: "I",
    name: "Insulin Sensitivity & Receptor Relay",
    alias: "The Metabolic Relay",
    color: "#1f9c82",
    color2: "#9ff0d8",
    glow: "#4fd0ae",
    pos: [3.0, -1.25, 0.15],
    role: "The cellular signaling relay governing glucose uptake in skeletal muscle, liver, and adipose.",
    body:
      "Insulin receptors stand downstream of dietary lipid overflow, muscular inactivity, sleep-induced cortisol surges, and circadian desynchrony. Simultaneously, LPS and cytokines from the leaky gut add a secondary inflammatory blockade, locking the door against glucose entry.",
  },
];

export const LIFESTYLE_CAUSAL_EDGES: LifestyleCausalEdge[] = [
  // 1. Diet & Energy Surplus (Primary / Most Direct) -> Thickest Conduits
  {
    id: "edge-diet-gut",
    from: "diet",
    to: "gut_target",
    verb: "starves & erodes",
    polarity: "+",
    weight: 1.0,
    description: "Low prebiotic fibre starves butyrate producers; saturated fats & emulsifiers dissolve mucus and open tight junctions.",
    bow: [-0.4, -0.2, 0.6],
  },
  {
    id: "edge-diet-insulin",
    from: "diet",
    to: "insulin_target",
    verb: "floods & blocks",
    polarity: "+",
    weight: 0.95,
    description: "Chronic caloric excess drives ectopic hepatic and intramyocellular lipid accumulation (DAGs/ceramides), directly inhibiting IRS-1.",
    bow: [0.35, 0.45, 0.8],
  },

  // 2. Inactivity (Secondary Direct) -> Strong Muscular & Motility Conduits
  {
    id: "edge-act-gut",
    from: "activity",
    to: "gut_target",
    verb: "slows transit",
    polarity: "+",
    weight: 0.65,
    description: "Sedentariness reduces anti-inflammatory myokine output and slows colonic motility, decreasing beneficial microbial diversity.",
    bow: [-0.3, 0.1, 0.5],
  },
  {
    id: "edge-act-insulin",
    from: "activity",
    to: "insulin_target",
    verb: "closes GLUT4 bypass",
    polarity: "+",
    weight: 0.85,
    description: "Loss of contraction-stimulated AMPK activation stops insulin-independent glucose uptake, leaving muscle unable to clear blood sugar.",
    bow: [0.25, 0.25, 0.7],
  },

  // 3. Sleep Deprivation (Underestimated Driver) -> Neuroendocrine High-Voltage Conduits
  {
    id: "edge-sleep-gut",
    from: "sleep",
    to: "gut_target",
    verb: "stresses mucosa",
    polarity: "+",
    weight: 0.6,
    description: "Elevated cortisol and sympathetic tone decrease mucosal perfusion and disrupt diurnal commensal restitution.",
    bow: [-0.25, 0.35, 0.75],
  },
  {
    id: "edge-sleep-insulin",
    from: "sleep",
    to: "insulin_target",
    verb: "surges cortisol & FFA",
    polarity: "+",
    weight: 0.75,
    description: "Acute sleep debt spikes nocturnal cortisol, sympathetic tone, and free fatty acids, reducing insulin sensitivity by 20–30%.",
    bow: [0.3, 0.1, 0.55],
  },

  // 4. Circadian Rhythm Misalignment (Underestimated Driver) -> Temporal Phase-Shift Conduits
  {
    id: "edge-circ-gut",
    from: "circadian",
    to: "gut_target",
    verb: "flattens microbial clock",
    polarity: "+",
    weight: 0.55,
    description: "Irregular feeding times and nighttime light abolish the 24h rhythmic oscillation of microbiome composition and barrier repair.",
    bow: [-0.35, 0.45, 0.85],
  },
  {
    id: "edge-circ-insulin",
    from: "circadian",
    to: "insulin_target",
    verb: "misaligns beta-cells",
    polarity: "+",
    weight: 0.65,
    description: "Feeding during the biological night clashes with natural melatonin suppression and diminished nighttime glucose tolerance.",
    bow: [0.4, -0.2, 0.6],
  },
];

export interface LifestylePreset {
  id: string;
  name: string;
  tag: string;
  badge: string;
  load: number;     // 0..1 Diet load
  activity: number; // 0..1 Inactivity level (1 = completely sedentary)
  sleep: number;    // 0..1 Sleep debt (1 = severe debt)
  circadian: number;// 0..1 Circadian misalignment (1 = fully desynced)
  headline: string;
  description: string;
}

export const LIFESTYLE_PRESETS: LifestylePreset[] = [
  {
    id: "energy_surplus",
    name: "Diet Surplus & Sedentary",
    tag: "Primary + Secondary",
    badge: "Direct Drivers Dominate",
    load: 0.95,
    activity: 0.88,
    sleep: 0.25,
    circadian: 0.2,
    headline: "The Direct Double Strike on Gut & Muscle",
    description:
      "High ultra-processed caloric surplus coupled with 10+ hours of daily sitting. High saturated fat immediately breaches the gut barrier while idle muscle closes the GLUT4 bypass valve.",
  },
  {
    id: "shift_worker",
    name: "Shift Worker / Circadian Desync",
    tag: "Underestimated Drivers",
    badge: "Silent Neuroendocrine Strain",
    load: 0.65,
    activity: 0.45,
    sleep: 0.9,
    circadian: 0.95,
    headline: "Nighttime Eating & Flattened Microbiome Rhythms",
    description:
      "Irregular night shifts and short fragmented sleep. Even with moderate calorie intake, nighttime cortisol elevation and melatonin-insulin clash drive severe insulin resistance.",
  },
  {
    id: "sleep_deprived",
    name: "Chronic Sleep Debt (5h Sleep)",
    tag: "Underestimated Driver",
    badge: "25% Sensitivity Drop",
    load: 0.55,
    activity: 0.35,
    sleep: 0.92,
    circadian: 0.45,
    headline: "Acute Neuroendocrine Resistance in Healthy Bodies",
    description:
      "Consistent 5-hour sleep windows. Elevated nocturnal sympathetic outflow elevates circulating free fatty acids, cutting peripheral insulin sensitivity by nearly a third.",
  },
  {
    id: "optimal_aligned",
    name: "Synchronised & Active",
    tag: "Metabolic Harmony",
    badge: "Aligned & Protective",
    load: 0.08,
    activity: 0.1,
    sleep: 0.08,
    circadian: 0.06,
    headline: "High Fibre, 10k Steps, 8h Sleep & Time-Restricted Eating",
    description:
      "Prebiotic fibre fuels butyrate production; daily post-meal walks activate GLUT4; 8 hours of sleep suppresses nocturnal cortisol; aligned daytime eating respects biological clocks.",
  },
];

export const driverById = (id: LifestyleId) => LIFESTYLE_DRIVERS.find((d) => d.id === id)!;
export const targetById = (id: TargetId) => LIFESTYLE_TARGETS.find((t) => t.id === id)!;
export const LIFESTYLE = LIFESTYLE_DRIVERS;
