import { Reveal } from "./Reveal";
import { EDGES, GLOSSARY, LEVERS, NODES } from "../data/loop";
import { LAYERS } from "../data/barrier";
import { REGIONS } from "../data/neuro";
import { UPSTREAM_NODES } from "../data/upstream";
import { LIFESTYLE } from "../data/lifestyle";

export type PageId = "loop" | "barrier" | "neuro" | "upstream" | "lifestyle";

/* ------------------------------------------------------------------ */

export function Marquee() {
  const items = [...GLOSSARY, ...GLOSSARY];
  return (
    <div className="relative overflow-hidden border-y border-bone/12 bg-moss/40 py-3">
      <div className="animate-marquee flex w-max items-center gap-10 whitespace-nowrap will-change-transform">
        {items.map((g, i) => (
          <span
            key={i}
            className="mono flex items-center gap-10 text-[10.5px] tracking-[0.34em] text-bone/80 uppercase"
          >
            {g}
            <span className="text-smoulder/60">✳</span>
          </span>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-void to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-void to-transparent" />
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function Chain() {
  return (
    <section className="relative mx-auto w-full max-w-[1240px] px-5 py-20 sm:px-8 sm:py-28">
      <Reveal>
        <div
          className="flex flex-wrap items-end justify-between gap-6 border-b pb-8"
          style={{ borderColor: "var(--line)" }}
        >
          <div>
            <p
              className="mono text-[10px] tracking-[0.36em] uppercase"
              style={{ color: "var(--accent)" }}
            >
              Reading the diagram
            </p>
            <h2 className="display mt-3 text-[clamp(2.2rem,5.4vw,4.2rem)] font-bold">
              Four pushes that
              <span className="italic" style={{ fontVariationSettings: '"SOFT" 100, "WONK" 1' }}>
                {" "}
                never stop.
              </span>
            </h2>
          </div>
          <p className="max-w-[38ch] text-[13.5px] leading-[1.7] opacity-70">
            Every arrow here is a <em>same-direction</em> link: when the node at the tail rises, the
            node at the head rises with it. Follow them all the way round and you return to where
            you started — with more of everything. That is a reinforcing loop, and it is why the
            condition feels so stubbornly stable.
          </p>
        </div>
      </Reveal>

      <ol className="relative mt-2">
        {EDGES.map((e, i) => {
          const a = NODES[i];
          const b = NODES[(i + 1) % 4];
          return (
            <Reveal as="li" key={i} delay={i * 70}>
              <article
                className="group relative grid grid-cols-1 gap-x-8 gap-y-4 border-b py-9 md:grid-cols-[132px_minmax(0,1fr)_minmax(0,0.82fr)] md:py-12"
                style={{ borderColor: "var(--line)" }}
              >
                <span
                  className="absolute top-0 left-0 h-full w-[2px] origin-top scale-y-0 transition-transform duration-700 group-hover:scale-y-100"
                  style={{ background: b.glow }}
                />
                <div className="flex items-start gap-3 md:pl-6">
                  <span
                    className="display text-[54px] leading-[0.8] font-black opacity-25 transition-opacity duration-500 group-hover:opacity-70 md:text-[68px]"
                    style={{ color: a.glow }}
                  >
                    {a.index}
                  </span>
                  <span className="mono mt-1 flex flex-col items-center gap-1 text-[11px] opacity-50">
                    <span className="transition-transform duration-500 group-hover:translate-y-1">
                      ↓
                    </span>
                    <span
                      className="display text-[26px] leading-none font-black"
                      style={{ color: b.glow }}
                    >
                      {b.index}
                    </span>
                  </span>
                </div>

                <div>
                  <h3 className="display text-[clamp(1.7rem,3.4vw,2.7rem)] leading-[0.98] font-bold">
                    {a.name}{" "}
                    <em
                      className="italic transition-colors duration-500"
                      style={{ color: b.glow, fontVariationSettings: '"SOFT" 100, "WONK" 1' }}
                    >
                      {e.verb}
                    </em>{" "}
                    {b.name}
                  </h3>
                  <p className="mt-3 max-w-[54ch] text-[14px] leading-[1.7] opacity-72">{e.note}</p>
                </div>

                <div className="flex flex-col items-start gap-3 md:items-end md:text-right">
                  <span
                    className="mono inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[9.5px] tracking-[0.2em] uppercase"
                    style={{ borderColor: a.glow, color: a.glow }}
                  >
                    polarity {e.polarity}
                  </span>
                  <span className="mono text-[10px] tracking-[0.2em] uppercase opacity-55">
                    carrier · {a.signal}
                  </span>
                  <span className="mono text-[10px] tracking-[0.2em] uppercase opacity-55">
                    lands on · {b.signal}
                  </span>
                </div>
              </article>
            </Reveal>
          );
        })}
      </ol>
    </section>
  );
}

/* ------------------------------------------------------------------ */

export function Levers() {
  return (
    <section
      className="relative overflow-hidden border-y py-20 sm:py-28"
      style={{ borderColor: "var(--line)", background: "var(--chip)" }}
    >
      <div className="mx-auto w-full max-w-[1240px] px-5 sm:px-8">
        <Reveal>
          <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
            <h2 className="display text-[clamp(2.2rem,5.6vw,4.4rem)] leading-[0.9] font-bold">
              Where you can cut it.
            </h2>
            <p className="max-w-[42ch] text-[13.5px] leading-[1.7] opacity-70">
              A reinforcing loop has no beginning, so it has no natural end — but it has four places
              where an intervention can be inserted. Cut any one edge hard enough and the whole
              circuit loosens.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-x-10 border-t border-bone/15 sm:grid-cols-2">
          {LEVERS.map((l, i) => (
            <Reveal key={l.title} delay={i * 90}>
              <article
                className="group relative h-full overflow-hidden border-b border-bone/15 py-7 transition-colors duration-500"
              >
                <span
                  className="mono text-[9px] tracking-[0.3em] uppercase"
                  style={{ color: NODES[i].glow }}
                >
                  {l.tag}
                </span>
                <h3 className="display mt-2 text-[27px] leading-[1] font-bold sm:text-[32px]">
                  {l.title}
                </h3>
                <p className="mt-3 text-[13.5px] leading-[1.68] opacity-72">{l.body}</p>
                <span
                  className="absolute inset-x-0 bottom-0 h-[2px] origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100"
                  style={{ background: NODES[i].glow }}
                />
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

const NEXT_PAGE: Record<PageId, PageId> = { loop: "barrier", barrier: "neuro", neuro: "upstream", upstream: "lifestyle", lifestyle: "loop" };

const NEXT_COPY: Record<PageId, { tag: string; title: string; body: string }> = {
  loop: {
    tag: "Chapter II",
    title: "Go inside the wall.",
    body:
      "Zoom into node 01 and watch the barrier itself: mucus, epithelium, tight junctions — and the LPS that slips between them when the diet changes.",
  },
  barrier: {
    tag: "Chapter III",
    title: "Follow the wiring.",
    body:
      "Years of the sugar this loop produces come back for the nerves that run digestion: gastric pacing, peristalsis, mass movements — a command line fraying from the far end inward.",
  },
  neuro: {
    tag: "Chapter IV",
    title: "Find the shared roots.",
    body:
      "Expand the original loop. Lifestyle and genetic susceptibility sit upstream of both the gut and insulin sensitivity, with more than one route into the circuit.",
  },
  upstream: {
    tag: "Chapter V",
    title: "Look at the daily rhythm.",
    body:
      "Diet structure, long-term energy surplus, activity, sleep and circadian rhythm sit one tier above the loop — drive a slider, fire a pulse and watch them reach the gut and insulin at once.",
  },
  lifestyle: {
    tag: "Chapter I",
    title: "Step back out to the loop.",
    body:
      "Return to the four original bodies: the gut, the smoulder, the locked door and the sugar bloom. Shared upstream influences and downstream feedback are parts of the same story.",
  },
};

const BIG_WORD: Record<PageId, string> = { loop: "R1", barrier: "LPS", neuro: "ANS", upstream: "ROOTS", lifestyle: "DAYS" };

export function Footer({ page, onPage }: { page: PageId; onPage: (p: PageId) => void }) {
  const next = NEXT_PAGE[page];
  const nextCopy = NEXT_COPY[page];
  const cast = (page === "loop"
    ? NODES
    : page === "barrier"
      ? LAYERS
      : page === "neuro"
        ? REGIONS
        : page === "upstream"
          ? UPSTREAM_NODES
          : LIFESTYLE
  ) as readonly { id: string; index: string; alias: string; color: string; glow?: string }[];

  return (
    <footer className="relative overflow-hidden px-5 pt-20 pb-10 sm:px-8">
      <span
        className="display pointer-events-none absolute -bottom-[8vw] left-1/2 -translate-x-1/2 text-[34vw] leading-none font-black select-none"
        style={{ color: "var(--line)" }}
        aria-hidden
      >
        {BIG_WORD[page]}
      </span>

      <div className="relative mx-auto w-full max-w-[1240px]">
        <Reveal>
          <button
            onClick={() => {
              onPage(next);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="group block w-full rounded-[3px] border p-7 text-left transition-all duration-500 hover:-translate-y-1 sm:p-10"
            style={{ borderColor: "var(--line)", background: "var(--chip)" }}
          >
            <p
              className="mono text-[9.5px] tracking-[0.32em] uppercase"
              style={{ color: "var(--accent)" }}
            >
              next · {nextCopy.tag}
            </p>
            <h2 className="display mt-3 flex items-center gap-4 text-[clamp(1.9rem,4.6vw,3.4rem)] leading-none font-bold">
              {nextCopy.title}
              <span className="inline-block transition-transform duration-500 group-hover:translate-x-3">
                →
              </span>
            </h2>
            <p className="mt-4 max-w-[58ch] text-[13.5px] leading-[1.7] opacity-70">
              {nextCopy.body}
            </p>
          </button>
        </Reveal>

        <div className="mt-16 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p
              className="mono text-[10px] tracking-[0.36em] uppercase"
              style={{ color: "var(--accent)" }}
            >
              Colophon
            </p>
            <p className="display mt-3 max-w-[30ch] text-[clamp(1.5rem,2.6vw,2.1rem)] leading-[1.02] font-bold">
              A diagram that would rather be a toy.
            </p>
            <p className="mt-4 max-w-[52ch] text-[13px] leading-[1.7] opacity-65">
              Five real-time WebGL chapters sharing one wardrobe: a custom velvet-and-fibre
              shader, inverted-hull stitched outlines, additive signal conduits and a bloom pass.
              No images, no sprites — every creature is geometry and GLSL.
            </p>
          </div>
          <div>
            <p className="mono text-[10px] tracking-[0.3em] uppercase opacity-55">The cast</p>
            <ul className="mt-4 space-y-2.5">
              {cast.map((n) => (
                <li key={n.id} className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ background: "glow" in n ? n.glow : n.color }}
                  />
                  <span className="mono text-[10px] tracking-[0.16em] uppercase opacity-70">
                    {n.index}
                  </span>
                  <span className="display text-[16px] font-semibold">{n.alias}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mono text-[10px] tracking-[0.3em] uppercase opacity-55">Fine print</p>
            <p className="mt-4 text-[12.5px] leading-[1.7] opacity-65">
              A teaching model, deliberately simplified — real metabolic feedback runs through dozens
              more nodes, several balancing loops and a great deal of individual variation. Not
              medical advice.
            </p>
            <p className="mono mt-5 text-[10px] tracking-[0.22em] uppercase opacity-45">
              gut · smoulder · lock · bloom — 2026
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
