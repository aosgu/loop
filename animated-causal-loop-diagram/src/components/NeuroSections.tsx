import { Reveal } from "./Reveal";
import { CHAIN, REGIONS, SYMPTOMS } from "../data/neuro";

export function NeuroChain() {
  return (
    <section className="mx-auto w-full max-w-[1240px] px-5 py-20 sm:px-8 sm:py-28">
      <Reveal>
        <p
          className="mono text-[10px] tracking-[0.36em] uppercase"
          style={{ color: "var(--accent)" }}
        >
          The question
        </p>
        <h2 className="display mt-3 max-w-[22ch] text-[clamp(2.3rem,5.8vw,4.4rem)] font-bold">
          Why does long-term high glucose slow the{" "}
          <em
            className="italic"
            style={{ color: "#ffe07a", fontVariationSettings: '"SOFT" 100, "WONK" 1' }}
          >
            whole gut down?
          </em>
        </h2>
        <p className="mt-6 max-w-[64ch] text-[15px] leading-[1.75] opacity-78">
          Digestion is not automatic — it is conducted. Autonomic nerves pace the stomach, sweep
          the intestine and time the colon, and those nerves are uniquely exposed: they take up
          glucose without asking insulin's permission, they are wrapped in lipid-built myelin, and
          they are fed by the body's narrowest capillaries. Years of hyperglycaemia and
          dyslipidaemia injure this wiring from the far end inward — and gastric emptying,
          peristalsis and defecation each lose their conductor in turn.
        </p>
      </Reveal>

      <ol
        className="mt-16 grid gap-x-6 border-t border-bone/15 md:grid-cols-5"
      >
        {CHAIN.map((c, i) => (
          <Reveal as="li" key={c.index} delay={i * 80} className="border-b border-bone/15 md:border-b-0">
            <article
              className="group relative flex h-full flex-col gap-3 px-2 py-7"
            >
              <span
                className="display text-[34px] leading-none font-black opacity-25 transition-opacity duration-500 group-hover:opacity-80"
                style={{ color: REGIONS[Math.min(i, 3)].color }}
              >
                {c.index}
              </span>
              <h3 className="display text-[19px] leading-[1.08] font-bold">{c.title}</h3>
              <p className="text-[12.5px] leading-[1.65] opacity-70">{c.body}</p>
              <span
                className="absolute inset-x-0 bottom-0 h-[2px] origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100"
                style={{ background: REGIONS[Math.min(i, 3)].color }}
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

export function SymptomTable() {
  return (
    <section
      className="relative overflow-hidden border-y py-20 sm:py-28"
      style={{ borderColor: "var(--line)", background: "var(--chip)" }}
    >
      <div className="mx-auto w-full max-w-[1240px] px-5 sm:px-8">
        <Reveal>
          <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
            <h2 className="display text-[clamp(2.1rem,5.4vw,4.2rem)] leading-[0.92] font-bold">
              What a silent nerve sounds like.
            </h2>
            <p className="max-w-[40ch] text-[13.5px] leading-[1.7] opacity-70">
              Autonomic damage never announces itself — it speaks only through the organs it has
              stopped conducting. Four translations.
            </p>
          </div>
        </Reveal>

        <div className="mt-14">
          {SYMPTOMS.map((r, i) => (
            <Reveal key={r.organ} delay={i * 70}>
              <div
                className="group grid grid-cols-1 gap-x-8 gap-y-2 border-b py-7 md:grid-cols-[minmax(0,.9fr)_minmax(0,1fr)_minmax(0,1.5fr)]"
                style={{ borderColor: "var(--line)" }}
              >
                <h3
                  className="display text-[22px] leading-none font-bold"
                  style={{ color: r.color }}
                >
                  {r.organ}
                </h3>
                <p className="mono text-[10px] tracking-[0.2em] uppercase opacity-60">{r.sign}</p>
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

export function TimingLoop() {
  return (
    <section className="mx-auto w-full max-w-[1240px] px-5 py-20 sm:px-8 sm:py-28">
      <div className="grid gap-12 md:grid-cols-[1.1fr_1fr] md:gap-20">
        <Reveal>
          <p
            className="mono text-[10px] tracking-[0.36em] uppercase"
            style={{ color: "var(--accent)" }}
          >
            The cruel twist
          </p>
          <h2 className="display mt-3 text-[clamp(2.1rem,5vw,3.8rem)] leading-[0.94] font-bold">
            The damage sabotages the cure.
          </h2>
          <p className="mt-6 text-[14.5px] leading-[1.75] opacity-78">
            Glucose management is a timing problem: food and insulin must arrive in the blood
            together. A healthy stomach makes that possible by emptying on a predictable schedule —
            which is precisely what autonomic damage removes.
          </p>
          <p className="mt-4 text-[14.5px] leading-[1.75] opacity-78">
            With gastroparesis, a meal may sit for hours and then arrive all at once. Insulin dosed
            at the table peaks into an empty bloodstream — hypoglycaemia — and has faded by the time
            the meal finally lands: hyperglycaemia. The swings widen, average exposure climbs, and
            the climb feeds the very neuropathy that started it. Another reinforcing loop, hiding
            inside the first one.
          </p>
          <p className="mt-4 text-[14.5px] leading-[1.75] opacity-78">
            The practical response is the same as everywhere in this story: steady glycaemic
            control, lipids managed, meals smaller and lower in fat and fibre when symptoms demand
            it — and movement after eating, which recruits what pacing remains.
          </p>
        </Reveal>

        <Reveal delay={120}>
          <ol className="relative flex flex-col gap-0">
            {[
              { k: "Exposure", v: "glucose · lipids ↑ for years", c: "#ffe07a" },
              { k: "Wiring", v: "vagal fibres degrade", c: "#ffb03a" },
              { k: "Stomach", v: "emptying unpredictable", c: "#ff7d5c" },
              { k: "Timing", v: "insulin ↮ meal mismatch", c: "#ff7d5c" },
              { k: "Swings", v: "hypo ⇄ hyper widen", c: "#ffb03a" },
              { k: "Back to top", v: "exposure climbs again", c: "#ffe07a" },
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
