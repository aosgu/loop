import { Reveal } from "./Reveal";
import { CHAIN, LAYERS } from "../data/barrier";

export function BarrierChain() {
  return (
    <section className="mx-auto w-full max-w-[1240px] px-5 py-20 sm:px-8 sm:py-28">
      <Reveal>
        <p className="mono text-[10px] tracking-[0.36em] uppercase" style={{ color: "var(--accent)" }}>
          The question
        </p>
        <h2 className="display mt-3 max-w-[20ch] text-[clamp(2.3rem,5.8vw,4.4rem)] font-bold">
          How does a gut problem reach your{" "}
          <em className="italic" style={{ color: "#4fd0ae", fontVariationSettings: '"SOFT" 100, "WONK" 1' }}>
            insulin sensitivity?
          </em>
        </h2>
        <p className="mt-6 max-w-[62ch] text-[15px] leading-[1.75] opacity-78">
          The job of the intestinal barrier is a contradiction: let nutrients through, keep bacterial
          components out. It manages this with a single layer of cells, stitched together by protein
          seams and covered in a blanket of mucus. A diet high in saturated fat and sugar and low in
          fibre changes the epithelial structure and widens those seams. Bacterial lipopolysaccharide —
          LPS — slips into circulation, and the immune system answers with a permanent, low-grade hum.
        </p>
      </Reveal>

      <ol className="mt-16 grid gap-x-6 border-t border-bone/15 md:grid-cols-5">
        {CHAIN.map((c, i) => (
          <Reveal as="li" key={c.index} delay={i * 80} className="border-b border-bone/15 md:border-b-0">
            <article
              className="group relative flex h-full flex-col gap-3 px-2 py-7"
            >
              <span
                className="display text-[34px] leading-none font-black opacity-25 transition-opacity duration-500 group-hover:opacity-80"
                style={{ color: LAYERS[i]?.color ?? "#4fd0ae" }}
              >
                {c.index}
              </span>
              <h3 className="display text-[19px] leading-[1.08] font-bold">{c.title}</h3>
              <p className="text-[12.5px] leading-[1.65] opacity-70">{c.body}</p>
              <span
                className="absolute inset-x-0 bottom-0 h-[2px] origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100"
                style={{ background: LAYERS[i]?.color ?? "#4fd0ae" }}
              />
              {i < CHAIN.length - 1 && (
                <span className="mono absolute top-6 right-4 text-[13px] opacity-25 transition-transform duration-500 group-hover:translate-x-1">
                  →
                </span>
              )}
            </article>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}

/* ------------------------------------------------------------------ */

const DIET_ROWS = [
  {
    input: "Saturated fat",
    effect: "Loosens the seam, and smuggles",
    detail:
      "Long-chain saturated fat is packed into chylomicrons — and LPS rides across inside them. Fat also directly downregulates occludin and ZO-1 expression.",
    color: "#ff7d5c",
  },
  {
    input: "Added sugar & fructose",
    effect: "Degrades the stitching",
    detail:
      "Fructose is metabolised in the enterocyte itself; in excess it reduces tight-junction protein levels and raises portal endotoxin within hours.",
    color: "#ffe07a",
  },
  {
    input: "Low fibre",
    effect: "Starves the repair crew",
    detail:
      "No fermentable fibre means no butyrate. Without butyrate the enterocyte loses its preferred fuel, mucus production drops, and some bacteria begin grazing the blanket itself.",
    color: "#4fd0ae",
  },
  {
    input: "Emulsifiers & alcohol",
    effect: "Thins the blanket",
    detail:
      "Common detergent-like additives and ethanol both reduce mucus thickness and let bacteria make direct contact with the epithelium.",
    color: "#ffb03a",
  },
];

export function DietTable() {
  return (
    <section
      className="relative overflow-hidden border-y py-20 sm:py-28"
      style={{ borderColor: "var(--line)", background: "var(--chip)" }}
    >
      <div className="mx-auto w-full max-w-[1240px] px-5 sm:px-8">
        <Reveal>
          <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
            <h2 className="display text-[clamp(2.1rem,5.4vw,4.2rem)] leading-[0.92] font-bold">
              What loosens the seam.
            </h2>
            <p className="max-w-[40ch] text-[13.5px] leading-[1.7] opacity-70">
              Permeability is not a single switch. Four common dietary inputs each push on a
              different part of the barrier — and they compound.
            </p>
          </div>
        </Reveal>

        <div className="mt-14">
          {DIET_ROWS.map((r, i) => (
            <Reveal key={r.input} delay={i * 70}>
              <div
                className="group grid grid-cols-1 gap-x-8 gap-y-2 border-b py-7 md:grid-cols-[minmax(0,.9fr)_minmax(0,1fr)_minmax(0,1.5fr)]"
                style={{ borderColor: "var(--line)" }}
              >
                <h3 className="display text-[22px] leading-none font-bold" style={{ color: r.color }}>
                  {r.input}
                </h3>
                <p className="mono text-[10px] tracking-[0.2em] uppercase opacity-60">{r.effect}</p>
                <p className="text-[13.5px] leading-[1.68] opacity-75">{r.detail}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

export function Endotoxaemia() {
  return (
    <section className="mx-auto w-full max-w-[1240px] px-5 py-20 sm:px-8 sm:py-28">
      <div className="grid gap-12 md:grid-cols-[1.1fr_1fr] md:gap-20">
        <Reveal>
          <p className="mono text-[10px] tracking-[0.36em] uppercase" style={{ color: "var(--accent)" }}>
            The handover
          </p>
          <h2 className="display mt-3 text-[clamp(2.1rem,5vw,3.8rem)] leading-[0.94] font-bold">
            Metabolic endotoxaemia.
          </h2>
          <p className="mt-6 text-[14.5px] leading-[1.75] opacity-78">
            Endotoxin in the blood at two to three times baseline is not an infection — it is a
            signal that never switches off. TLR4 receptors on macrophages and adipose tissue read it
            as a permanent low-level threat and keep IL-6 and TNF-α elevated.
          </p>
          <p className="mt-4 text-[14.5px] leading-[1.75] opacity-78">
            Those cytokines activate kinases — IKKβ, JNK — that phosphorylate IRS-1 on serine
            residues instead of tyrosine. The insulin signal reaches the receptor, but the relay
            downstream of it no longer forwards the message. GLUT4 transporters stay docked inside
            the cell, glucose stays in the blood, and the pancreas compensates with more insulin.
          </p>
          <p className="mt-4 text-[14.5px] leading-[1.75] opacity-78">
            That is the whole route, in one sentence: a thinner blanket and a looser seam become a
            quieter immune alarm that eventually jams the lock on every cell that should have been
            taking sugar in.
          </p>
        </Reveal>

        <Reveal delay={120}>
          <ol className="relative flex flex-col gap-0">
            {[
              { k: "Barrier", v: "permeability ↑", c: "#4fd0ae" },
              { k: "Circulation", v: "LPS ↑ 2–3×", c: "#ffe07a" },
              { k: "Immune", v: "TLR4 engaged", c: "#ffb03a" },
              { k: "Cytokines", v: "IL-6 · TNF-α ↑", c: "#ff7d5c" },
              { k: "Relay", v: "IRS-1 serine-blocked", c: "#ff7d5c" },
              { k: "Outcome", v: "insulin sensitivity ↓", c: "#ffe07a" },
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
                <span className="mono w-[7rem] shrink-0 text-[9.5px] tracking-[0.24em] uppercase opacity-55">
                  {s.k}
                </span>
                <span className="display text-[18px] font-semibold" style={{ color: s.c }}>
                  {s.v}
                </span>
              </li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  );
}
