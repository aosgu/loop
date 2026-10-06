import { Reveal } from "./Reveal";
import {
  LIFESTYLE_DRIVERS,
  type LifestyleId,
  type LifestyleNodeId,
} from "../data/lifestyle";

interface Props {
  onExplore: (id: LifestyleNodeId) => void;
}

const HIERARCHY_DETAILS = [
  {
    id: "diet" as LifestyleId,
    tier: "Tier 1 · Primary & Most Direct Driver",
    title: "Dietary Structure & Chronic Energy Surplus",
    summary:
      "Directly provides the substrate load that floods hepatic/skeletal insulin signaling and physically erodes the mucosal barrier.",
    gutImpact:
      "Absence of fermentable prebiotic fibre starves short-chain fatty acid (SCFA) producing commensals, thinning the protective mucin layer. Concurrently, saturated fats and emulsifiers increase paracellular permeability, facilitating bacterial LPS translocation into portal blood.",
    insulinImpact:
      "Chronic caloric excess promotes ectopic lipid accumulation in liver and skeletal muscle. Diacylglycerols (DAGs) and ceramides activate novel protein kinase C (nPKC) isoforms, directly phosphorylating IRS-1 on serine residues and blunting insulin-mediated GLUT4 translocation.",
    markers: "High DAG / Ceramides · SCFA Depletion · Postprandial Endotoxaemia",
  },
  {
    id: "activity" as LifestyleId,
    tier: "Tier 2 · Secondary Direct Driver",
    title: "Physical Inactivity & Muscular Stagnation",
    summary:
      "Deprives the body of its largest insulin-independent glucose sink (contracting skeletal muscle) while reducing colonic motility.",
    gutImpact:
      "Physical movement accelerates colonic transit time, stimulates anti-inflammatory myokine release, and fosters SCFA-producing taxa. Stagnation slows transit and alters mucosal immune surveillance.",
    insulinImpact:
      "Contracting muscle recruits GLUT4 transporters directly via AMPK/CaMK signaling without requiring insulin. Inactivity eliminates this bypass valve, leaving glucose clearance completely dependent on an overloaded insulin relay.",
    markers: "AMPK Dormancy · GLUT4 Stasis · Reduced Anti-inflammatory Myokines",
  },
  {
    id: "sleep" as LifestyleId,
    tier: "Tier 3 · Underestimated Neuroendocrine Driver",
    title: "Sleep Deprivation & Fragmentation",
    summary:
      "A silent neuroendocrine disruptor: partial sleep restriction acutely reduces peripheral insulin sensitivity by 20–30% within days.",
    gutImpact:
      "Elevated nocturnal glucocorticoids and sympathetic outflow decrease mucosal microvascular perfusion, weaken tight-junction claudin-1 expression, and alter diurnal commensal recovery.",
    insulinImpact:
      "Elevated nocturnal cortisol, growth hormone surges, and persistent sympathetic outflow stimulate adipose lipolysis, flooding circulation with free fatty acids that induce rapid receptor-level insulin resistance.",
    markers: "Nocturnal Cortisol Surges · Free Fatty Acids ↑ · 20–30% Insulin Sensitivity Drop",
  },
  {
    id: "circadian" as LifestyleId,
    tier: "Tier 4 · Underestimated Systemic Driver",
    title: "Circadian Rhythm Misalignment",
    summary:
      "Desynchronises peripheral organ clocks (gut, liver, muscle) from the central hypothalamic clock, abolishing metabolic anticipation.",
    gutImpact:
      "The gut microbiome normally exhibits 24-hour diurnal oscillations in composition and epithelial adhesion. Desynchrony flattens these rhythms, impairing nocturnal mucosal repair.",
    insulinImpact:
      "Beta-cell insulin secretion and peripheral sensitivity naturally decline in the biological evening. Consuming large caloric loads late at night clashes with melatonin-driven insulin suppression, exacerbating glycemic spikes.",
    markers: "Central/Peripheral Clock Clash · Flattened Microbiome Diurnal Cycle · Melatonin-Insulin Conflict",
  },
];

export default function LifestyleSections({ onExplore }: Props) {
  return (
    <>
      {/* 1. The Directness Hierarchy (Detailed Cards) */}
      <section className="mx-auto w-full max-w-[1240px] px-5 py-20 sm:px-8 sm:py-28">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6 border-b pb-8" style={{ borderColor: "var(--line)" }}>
            <div>
              <p className="mono text-[10px] tracking-[0.36em] text-smoulder uppercase">
                The Causal Hierarchy
              </p>
              <h2 className="display mt-3 text-[clamp(2.2rem,5.4vw,4.2rem)] font-bold">
                Most direct first.{" "}
                <span className="italic" style={{ color: "#4fd0ae", fontVariationSettings: '"SOFT" 100, "WONK" 1' }}>
                  And the underestimated companions.
                </span>
              </h2>
            </div>
            <p className="max-w-[42ch] text-[13.5px] leading-[1.7] opacity-75">
              Lifestyle drivers do not act equally: <strong>dietary structure and energy surplus</strong> are the most
              immediate, followed closely by <strong>physical inactivity</strong>. <strong>Sleep loss</strong> and{" "}
              <strong>circadian desynchrony</strong> act as potent, frequently underestimated catalysts that dysregulate both
              the gut barrier and insulin sensitivity.
            </p>
          </div>
        </Reveal>

        <ol className="relative mt-4">
          {HIERARCHY_DETAILS.map((item, i) => {
            const driver = LIFESTYLE_DRIVERS.find((d) => d.id === item.id)!;
            return (
              <Reveal as="li" key={item.id} delay={i * 80}>
                <article
                  className="group relative grid grid-cols-1 gap-x-8 gap-y-4 border-b py-9 md:grid-cols-[130px_minmax(0,1.2fr)_minmax(0,1fr)] md:py-12"
                  style={{ borderColor: "var(--line)" }}
                >
                  <span
                    className="absolute top-0 left-0 h-full w-[2px] origin-top scale-y-0 transition-transform duration-700 group-hover:scale-y-100"
                    style={{ background: driver.color }}
                  />

                  {/* Index column */}
                  <div className="flex items-start gap-3 md:pl-5">
                    <span
                      className="display text-[52px] leading-[0.8] font-black opacity-30 transition-opacity duration-500 group-hover:opacity-85 md:text-[64px]"
                      style={{ color: driver.color }}
                    >
                      {driver.index}
                    </span>
                    <div className="mono mt-1 text-[9px] tracking-[0.16em] uppercase opacity-60">
                      <span>{driver.rank.split("·")[0]}</span>
                    </div>
                  </div>

                  {/* Main content column */}
                  <div>
                    <span
                      className="mono rounded-full border px-2.5 py-0.5 text-[8.5px] tracking-[0.18em] uppercase"
                      style={{ borderColor: driver.color, color: driver.color }}
                    >
                      {item.tier}
                    </span>
                    <h3 className="display mt-2 text-[clamp(1.7rem,3.2vw,2.5rem)] leading-[1.02] font-bold text-bone">
                      {item.title}
                    </h3>
                    <p className="mt-3 max-w-[52ch] text-[13.5px] leading-[1.7] text-bone/80">
                      {item.summary}
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[2px] border border-bone/8 bg-bone/4 p-3">
                        <span className="mono text-[8px] tracking-[0.2em] text-[#ff7d5c] uppercase">
                          Path into Gut Barrier
                        </span>
                        <p className="mt-1 text-[12px] leading-[1.6] text-bone/70">{item.gutImpact}</p>
                      </div>
                      <div className="rounded-[2px] border border-bone/8 bg-bone/4 p-3">
                        <span className="mono text-[8px] tracking-[0.2em] text-[#4fd0ae] uppercase">
                          Path into Insulin Sensitivity
                        </span>
                        <p className="mt-1 text-[12px] leading-[1.6] text-bone/70">{item.insulinImpact}</p>
                      </div>
                    </div>
                  </div>

                  {/* Side markers column */}
                  <div className="flex flex-col items-start gap-3 md:items-end md:text-right">
                    <span
                      className="mono rounded-full border px-3 py-1 text-[9px] tracking-[0.18em] uppercase"
                      style={{ borderColor: driver.color, color: driver.color }}
                    >
                      Directness: {driver.directnessScore}%
                    </span>
                    <p className="mono text-[9.5px] tracking-[0.18em] text-fog/70 uppercase">
                      Clinical Key Markers:
                    </p>
                    <p className="text-[12px] leading-[1.6] text-bone/75">
                      {item.markers}
                    </p>
                    <button
                      onClick={() => onExplore(driver.id)}
                      className="mono mt-2 inline-flex items-center gap-1.5 text-[9.5px] tracking-[0.2em] uppercase text-smoulder transition-transform duration-300 hover:translate-x-1"
                    >
                      Trace in 3D Vitrine →
                    </button>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </ol>
      </section>

      {/* 2. Dual-Action Cross Matrix */}
      <section
        className="relative overflow-hidden border-y py-20 sm:py-28"
        style={{ borderColor: "var(--line)", background: "var(--chip)" }}
      >
        <div className="mx-auto w-full max-w-[1240px] px-5 sm:px-8">
          <Reveal>
            <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
              <h2 className="display text-[clamp(2.1rem,5.4vw,4.2rem)] leading-[0.92] font-bold">
                The Dual-Action Mechanism.
              </h2>
              <p className="max-w-[46ch] text-[13.5px] leading-[1.7] opacity-75">
                Every one of these four drivers does not act in isolation on a single organ: each delivers a synchronized
                bifurcated hit to both the intestinal mucosa and the peripheral insulin receptor.
              </p>
            </div>
          </Reveal>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {LIFESTYLE_DRIVERS.map((d, i) => (
              <Reveal key={d.id} delay={i * 80}>
                <article
                  className="group relative flex h-full flex-col justify-between rounded-[2px] border p-5 transition-all duration-500 hover:-translate-y-1.5"
                  style={{ borderColor: "var(--line)", background: "var(--page-bg)" }}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="mono text-[9px] tracking-[0.24em] uppercase" style={{ color: d.color }}>
                        {d.rank.split("·")[0]}
                      </span>
                      <span className="mono text-[9px] tracking-[0.16em] text-fog/60">
                        0{i + 1}
                      </span>
                    </div>
                    <h3 className="display mt-2 text-[20px] font-bold leading-tight">{d.alias}</h3>
                    <p className="mt-2 text-[12.5px] leading-[1.6] text-bone/75">{d.subtitle}</p>

                    <div className="mt-4 border-t border-bone/8 pt-3 text-[11.5px] leading-[1.6]">
                      <p className="text-[#ff7d5c]">
                        <strong>Gut:</strong> {d.gutMechanism.split(".")[0]}.
                      </p>
                      <p className="mt-2 text-[#4fd0ae]">
                        <strong>Insulin:</strong> {d.insulinMechanism.split(".")[0]}.
                      </p>
                    </div>
                  </div>

                  <span
                    className="mt-4 block h-[2px] w-full origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100"
                    style={{ background: d.color }}
                  />
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 3. The Clinical & Practical Takeaway */}
      <section className="mx-auto w-full max-w-[1240px] px-5 py-20 sm:px-8 sm:py-28">
        <div className="grid gap-12 md:grid-cols-[1.15fr_1fr] md:gap-20">
          <Reveal>
            <p className="mono text-[10px] tracking-[0.36em] text-smoulder uppercase">
              The Integrative Insight
            </p>
            <h2 className="display mt-3 text-[clamp(2.1rem,5vw,3.8rem)] leading-[0.94] font-bold">
              Compounding levers,<br />
              <em className="italic" style={{ color: "#4fd0ae", fontVariationSettings: '"SOFT" 100, "WONK" 1' }}>
                not isolated switches.
              </em>
            </h2>
            <p className="mt-6 text-[14.5px] leading-[1.75] opacity-80">
              When metabolic dysfunction is viewed only through the lens of calories or medication, the powerful synergy of
              lifestyle timing and autonomic restitution is lost. <strong>Diet and energy balance</strong> set the primary
              substrate burden, but <strong>physical activity</strong> opens the muscular GLUT4 bypass valve, while{" "}
              <strong>sleep and circadian alignment</strong> govern whether nocturnal cortisol and melatonin allow receptor
              sensitivity to reset.
            </p>
            <p className="mt-4 text-[14.5px] leading-[1.75] opacity-80">
              Addressing any one driver eases the load on the others: a post-dinner walk accelerates glucose clearance and
              improves sleep latency; consistent morning daylight anchors circadian rhythm and suppresses nighttime ghrelin
              cravings; prebiotic fibre restores the mucosal barrier so that fewer endotoxins challenge insulin receptors.
            </p>
            <p className="mt-5 max-w-[62ch] text-[12px] leading-[1.75] text-fog/65">
              This interactive model serves as a mechanistic educational visualization based on metabolic physiology and
              clinical literature. It is not individualized medical advice.
            </p>
          </Reveal>

          <Reveal delay={120}>
            <ol className="relative flex flex-col gap-0">
              {[
                { k: "1. Diet & Surplus", v: "Primary Substrate & Barrier Breach", c: "#ff6036" },
                { k: "2. Muscular Activity", v: "Opens GLUT4 Bypass & Enhances Transit", c: "#e0621d" },
                { k: "3. Sleep Architecture", v: "Prevents Nocturnal Cortisol/FFA Surges", c: "#e8b93f" },
                { k: "4. Circadian Phase", v: "Aligns Central & Peripheral Rhythms", c: "#1f9c82" },
                { k: "Unified Result", v: "Dual Protection of Gut & Insulin Relay", c: "#4fd0ae" },
              ].map((s, i, arr) => (
                <li key={s.k} className="group relative flex items-center gap-4 py-3.5">
                  <span
                    className="relative z-10 h-3 w-3 shrink-0 rounded-full transition-transform duration-500 group-hover:scale-150"
                    style={{ background: s.c, boxShadow: `0 0 14px ${s.c}` }}
                  />
                  {i < arr.length - 1 && (
                    <span
                      className="absolute top-[26px] left-[5px] h-full w-px"
                      style={{
                        background: `linear-gradient(to bottom, ${s.c}, ${arr[i + 1].c})`,
                        opacity: 0.4,
                      }}
                    />
                  )}
                  <span className="mono w-[9.5rem] shrink-0 text-[9.5px] tracking-[0.2em] uppercase opacity-60">
                    {s.k}
                  </span>
                  <span className="display text-[17px] font-semibold" style={{ color: s.c }}>
                    {s.v}
                  </span>
                </li>
              ))}
            </ol>
          </Reveal>
        </div>
      </section>
    </>
  );
}
