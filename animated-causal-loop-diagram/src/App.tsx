import { useCallback, useEffect, useState } from "react";
import PlushStage from "./components/PlushStage";
import BarrierStage from "./components/BarrierStage";
import NeuroStage from "./components/NeuroStage";
import UpstreamChapter from "./components/UpstreamChapter";
import UpstreamSections from "./components/UpstreamSections";
import LifestyleChapter from "./components/LifestyleChapter";
import LifestyleSections from "./components/LifestyleSections";
import Transport from "./components/Transport";
import Dossier from "./components/Dossier";
import { DietDial, LayerCard, LayerIndex, Readout } from "./components/BarrierUI";
import { ExposureDial, NeuroReadout, RegionCard, RegionIndex } from "./components/NeuroUI";
import { BarrierChain, DietTable, Endotoxaemia } from "./components/BarrierSections";
import { NeuroChain, SymptomTable, TimingLoop } from "./components/NeuroSections";
import { Chain, Footer, Levers, Marquee, type PageId } from "./components/Sections";
import { NODES, type NodeId } from "./data/loop";
import { LAYERS, type LayerId } from "./data/barrier";
import { REGIONS, type RegionId } from "./data/neuro";
import { UPSTREAM_NODES, type UpstreamId } from "./data/upstream";
import { LIFESTYLE, type LifestyleNodeId } from "./data/lifestyle";
import type { BarrierStats } from "./three/barrier";
import type { NeuroStats } from "./three/neuro";
import type { LifestyleStats } from "./three/lifestyle";

type Page = PageId;

const PAGES: { id: Page; label: string; short: string; tag: string }[] = [
  { id: "loop", label: "The Loop", short: "Loop", tag: "I" },
  { id: "barrier", label: "The Barrier", short: "Wall", tag: "II" },
  { id: "neuro", label: "The Wiring", short: "Wire", tag: "III" },
  { id: "upstream", label: "Upstream", short: "Roots", tag: "IV" },
  { id: "lifestyle", label: "Lifestyle", short: "Days", tag: "V" },
];

/* ------------------------------------------------------------------ */

function Mark() {
  return (
    <svg viewBox="0 0 34 34" className="h-[30px] w-[30px]" aria-hidden>
      <circle
        cx="17"
        cy="17"
        r="13"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeDasharray="3 5"
        opacity="0.5"
        className="origin-center animate-spin-slow"
      />
      {NODES.map((n, i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI;
        return (
          <circle
            key={n.id}
            cx={17 + Math.cos(a) * 9.5}
            cy={17 + Math.sin(a) * 9.5}
            r="3.4"
            fill={n.glow}
          />
        );
      })}
      <circle cx="17" cy="17" r="1.8" fill="currentColor" opacity="0.8" />
    </svg>
  );
}

function PageSwitch({ page, setPage }: { page: Page; setPage: (p: Page) => void }) {
  const idx = PAGES.findIndex((p) => p.id === page);
  return (
    <div
      className="chapter-switch relative grid shrink-0 grid-cols-5 items-center rounded-full border p-1"
      style={{ borderColor: "var(--line)" }}
      role="tablist"
      aria-label="Chapter"
      onKeyDown={(event) => {
        const direction = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
        if (!direction && event.key !== "Home" && event.key !== "End") return;
        event.preventDefault();
        const next = event.key === "Home" ? 0 : event.key === "End" ? PAGES.length - 1 : (idx + direction + PAGES.length) % PAGES.length;
        setPage(PAGES[next].id);
        event.currentTarget.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
      }}
    >
      <span
        className="absolute top-1 bottom-1 left-1 rounded-full bg-bone transition-transform duration-500 ease-[cubic-bezier(.16,1,.3,1)]"
        style={{ width: `calc((100% - 8px) / ${PAGES.length})`, transform: `translateX(${idx * 100}%)` }}
      />
      {PAGES.map((p) => {
        const on = page === p.id;
        return (
          <button
            key={p.id}
            role="tab"
            aria-selected={on}
            aria-label={`Chapter ${p.tag}: ${p.label}`}
            tabIndex={on ? 0 : -1}
            onClick={() => setPage(p.id)}
            className="mono relative z-10 flex items-center justify-center gap-1 rounded-full px-2 py-2 text-[9px] tracking-[0.08em] whitespace-nowrap uppercase transition-colors duration-300 sm:gap-1.5 sm:px-2.5 sm:text-[9.5px] sm:tracking-[0.18em]"
            style={{ color: on ? "#060f0d" : "var(--page-fg)", opacity: on ? 1 : 0.6 }}
          >
            <span className="opacity-60">{p.tag}</span>
            <span className="hidden md:inline">{p.label}</span>
            <span className="md:hidden">{p.short}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export default function App() {
  const [page, setPage] = useState<Page>("loop");

  // loop page
  const [selected, setSelected] = useState<NodeId | null>(null);
  const [hovered, setHovered] = useState<NodeId | null>(null);

  // barrier page
  const [layer, setLayer] = useState<LayerId | null>(null);
  const [layerHover, setLayerHover] = useState<LayerId | null>(null);
  const [diet, setDiet] = useState(0.06);
  const [stats, setStats] = useState<BarrierStats>({
    integrity: 96,
    flux: 0,
    cytokine: 0,
    crossed: 0,
  });

  // neuro page
  const [region, setRegion] = useState<RegionId | null>(null);
  const [regionHover, setRegionHover] = useState<RegionId | null>(null);
  const [exposure, setExposure] = useState(0.06);
  const [neuroStats, setNeuroStats] = useState<NeuroStats>({
    conduction: 100,
    emptying: 2.9,
    motility: 100,
    transit: 0,
  });

  // upstream page
  const [upstreamSelected, setUpstreamSelected] = useState<UpstreamId | null>(null);

  // lifestyle page
  const [habit, setHabit] = useState<LifestyleNodeId | null>(null);
  const [habitHover, setHabitHover] = useState<LifestyleNodeId | null>(null);
  const [lifestyleStats, setLifestyleStats] = useState<LifestyleStats>({
    metabolicLoad: 95,
    barrierThreat: 88,
    insulinResistance: 85,
    circadianDesync: 20,
    glut4Suppression: 88,
  });
  const [lifestylePulse, setLifestylePulse] = useState(0);

  // shared transport
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [pulse, setPulse] = useState(0);
  const [resetToken, setResetToken] = useState(0);

  const isLoop = page === "loop";
  const isBarrier = page === "barrier";
  const isNeuro = page === "neuro";
  const isUpstream = page === "upstream";
  const isLifestyle = page === "lifestyle";
  const node = selected ? NODES.find((n) => n.id === selected)! : null;
  const activeLayer = layer ? LAYERS.find((l) => l.id === layer)! : null;
  const activeRegion = region ? REGIONS.find((r) => r.id === region)! : null;
  const firePulse = useCallback(() => {
    setPlaying(true);
    setPulse((p) => p + 1);
    setLifestylePulse((p) => p + 1);
  }, []);

  const navigate = useCallback((next: Page) => {
    setPage(next);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  useEffect(() => {
    document.title = `${PAGES.find((item) => item.id === page)?.label} | Gut to Glucose`;
  }, [page]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const n = Number(e.key);
      if (n >= 1 && n <= 6) {
        if (isLoop && n <= 4) setSelected(NODES[n - 1].id);
        if (isBarrier && n <= 5) setLayer(LAYERS[n - 1].id);
        if (isNeuro && n <= 4) setRegion(REGIONS[n - 1].id);
        if (isUpstream) setUpstreamSelected(UPSTREAM_NODES[n - 1].id);
        if (isLifestyle && n <= 4) setHabit(LIFESTYLE[n - 1].id);
      } else if (e.key === "Escape") {
        setSelected(null);
        setLayer(null);
        setRegion(null);
        setUpstreamSelected(null);
        setHabit(null);
      } else if (e.code === "Space") {
        if ((e.target as HTMLElement)?.closest("button, a, [role='tab']")) return;
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key.toLowerCase() === "p") firePulse();
      else if (e.key.toLowerCase() === "v")
        navigate(PAGES[(PAGES.findIndex((item) => item.id === page) + 1) % PAGES.length].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [firePulse, isLoop, isBarrier, isNeuro, isUpstream, isLifestyle, navigate, page]);

  return (
    <div
      className="theme-plush relative min-h-screen"
      style={{ background: "var(--page-bg)", color: "var(--page-fg)" }}
    >
      {/* ---------------- top bar ---------------- */}
      <header
        className="sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-b px-3 backdrop-blur-md sm:gap-4 sm:px-6"
        style={{ borderColor: "var(--line)", background: "rgba(6,15,13,.74)" }}
      >
        <div className="flex items-center gap-3">
          <span style={{ color: "var(--accent)" }}>
            <Mark />
          </span>
          <span className="hidden leading-none sm:block">
            <span className="display block text-[15px] font-bold tracking-tight">
              Gut ⟶ Glucose
            </span>
            <span className="mono block text-[8.5px] tracking-[0.28em] uppercase opacity-55">
              {isLoop
                ? "causal loop · R1"
                : isBarrier
                  ? "cross-section · barrier"
                  : isNeuro
                    ? "wiring diagram · autonomic"
                    : isUpstream
                      ? "shared causes / upstream"
                      : "lifestyle drivers / shared"}
            </span>
          </span>
        </div>

        <PageSwitch page={page} setPage={navigate} />

        <div className="mono hidden items-center gap-3 text-[9px] tracking-[0.2em] uppercase opacity-45 xl:flex">
          <span>1-4 select</span>
          <span className="opacity-40">/</span>
          <span>space pause</span>
          <span className="opacity-40">/</span>
          <span>p pulse</span>
          <span className="opacity-40">/</span>
          <span>v chapter</span>
        </div>
      </header>

      {/* ---------------- stage ---------------- */}
      {isUpstream ? (
        <UpstreamChapter
          selected={upstreamSelected}
          onSelect={setUpstreamSelected}
          playing={playing}
          onPlaying={setPlaying}
          speed={speed}
          onSpeed={setSpeed}
          pulseToken={pulse}
          resetToken={resetToken}
          onPulse={firePulse}
          onReset={() => { setUpstreamSelected(null); setResetToken((t) => t + 1); }}
        />
      ) : isLifestyle ? (
        <LifestyleChapter
          selected={habit}
          hovered={habitHover}
          onSelect={setHabit}
          onHover={setHabitHover}
          stats={lifestyleStats}
          onStats={setLifestyleStats}
          playing={playing}
          onPlaying={setPlaying}
          speed={speed}
          onSpeed={setSpeed}
          pulseToken={lifestylePulse}
          resetToken={resetToken}
          onReset={() => { setHabit(null); setResetToken((t) => t + 1); }}
        />
      ) : (
      <section className="stage-bg grain relative h-[calc(100svh-3.5rem)] min-h-[600px] w-full overflow-hidden">
        {isLoop ? (
          <PlushStage
            key="loop"
            selected={selected}
            hovered={hovered}
            onSelect={setSelected}
            onHover={setHovered}
            playing={playing}
            speed={speed}
            pulseToken={pulse}
            resetToken={resetToken}
            dimLabels={!!selected}
          />
        ) : isBarrier ? (
          <BarrierStage
            key="barrier"
            selected={layer}
            hovered={layerHover}
            onSelect={setLayer}
            onHover={setLayerHover}
            diet={diet}
            playing={playing}
            speed={speed}
            pulseToken={pulse}
            resetToken={resetToken}
            onStats={setStats}
          />
        ) : (
          <NeuroStage
            key="neuro"
            selected={region}
            hovered={regionHover}
            onSelect={setRegion}
            onHover={setRegionHover}
            exposure={exposure}
            playing={playing}
            speed={speed}
            pulseToken={pulse}
            resetToken={resetToken}
            onStats={setNeuroStats}
          />
        )}

        {/* overlay */}
        <div className="pointer-events-none absolute inset-0 flex flex-col p-4 sm:p-7">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-[44vh] opacity-80"
            style={{ background: "linear-gradient(180deg, rgba(6,15,13,.88), transparent)" }}
            aria-hidden
          />

          <div className="relative flex items-start justify-between gap-6">
            <div className="max-w-[32rem]">
              <p
                key={page}
                className="card-in mono text-[9.5px] tracking-[0.34em] uppercase"
                style={{ color: isLoop ? "#ffb03a" : isBarrier ? "#4fd0ae" : "#ffe07a" }}
              >
                {isLoop
                  ? "Chapter I · the reinforcing circuit"
                  : isBarrier
                    ? "Chapter II · one cell thick"
                    : "Chapter III · the command line"}
              </p>
              {isLoop ? (
                <>
                  <h1 className="display mt-2.5 text-[clamp(2.1rem,5.6vw,4.3rem)] font-black">
                    The loop that
                    <br />
                    keeps itself{" "}
                    <em
                      className="italic"
                      style={{ color: "#ff7d5c", fontVariationSettings: '"SOFT" 100, "WONK" 1' }}
                    >
                      warm.
                    </em>
                  </h1>
                  <p className="mt-3 max-w-[38ch] text-[12.5px] leading-[1.65] text-fog sm:text-[13.5px]">
                    Gut dysbiosis feeds a low-grade smoulder, which jams the insulin relay, which
                    leaves sugar in the blood — and the sugar goes back and re-seeds the gut. Four
                    nodes, four plush bodies, one reinforcing circuit.
                  </p>
                </>
              ) : isBarrier ? (
                <>
                  <h1 className="display mt-2.5 text-[clamp(2.1rem,5.6vw,4.3rem)] font-black">
                    How a gut problem
                    <br />
                    reaches your{" "}
                    <em
                      className="italic"
                      style={{ color: "#4fd0ae", fontVariationSettings: '"SOFT" 100, "WONK" 1' }}
                    >
                      insulin.
                    </em>
                  </h1>
                  <p className="mt-3 max-w-[40ch] text-[12.5px] leading-[1.65] text-fog sm:text-[13.5px]">
                    A cut-away of the intestinal wall. Feed it fat and sugar instead of fibre: the
                    mucus blanket thins, the stitching between cells gives way, and bacterial LPS
                    drops into the bloodstream — where the immune system starts to hum.
                  </p>
                </>
              ) : (
                <>
                  <h1 className="display mt-2.5 text-[clamp(2.1rem,5.6vw,4.3rem)] font-black">
                    The gut runs on
                    <br />
                    wires that{" "}
                    <em
                      className="italic"
                      style={{ color: "#ffe07a", fontVariationSettings: '"SOFT" 100, "WONK" 1' }}
                    >
                      sugar frays.
                    </em>
                  </h1>
                  <p className="mt-3 max-w-[41ch] text-[12.5px] leading-[1.65] text-fog sm:text-[13.5px]">
                    One vagal command line paces the stomach, the intestine and the colon. Raise
                    the years of glucose and lipid exposure and watch its myelin fray from the far
                    end inward — emptying slows, waves falter, the last mile goes quiet.
                  </p>
                </>
              )}
            </div>

            <div className="mono hidden items-center gap-2 text-[9px] tracking-[0.26em] text-fog/70 uppercase sm:flex">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--accent)", animation: "swell 1.8s ease-in-out infinite" }}
              />
              live render
            </div>
          </div>

          {/* bottom row */}
          <div className="mt-auto flex flex-col gap-5 pt-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex w-full max-w-[27rem] shrink-0 flex-col gap-3">
              {isLoop ? (
                node ? (
                  <Dossier
                    node={node}
                    onClose={() => setSelected(null)}
                    onJump={(id) => setSelected(id)}
                  />
                ) : (
                  <>
                    <ul className="flex flex-col items-start gap-1">
                      {NODES.map((n) => {
                        const hot = hovered === n.id;
                        return (
                          <li key={n.id}>
                            <button
                              onPointerEnter={() => setHovered(n.id)}
                              onPointerLeave={() => setHovered(null)}
                              onClick={() => setSelected(n.id)}
                              className="pointer-events-auto group flex items-center gap-2.5 rounded-full border bg-void/55 py-1.5 pr-4 pl-3 backdrop-blur-[6px] transition-all duration-300 hover:translate-x-[3px]"
                              style={{ borderColor: hot ? n.glow : "var(--line)" }}
                            >
                              <span
                                className="h-2 w-2 shrink-0 rounded-full transition-transform duration-300 group-hover:scale-125"
                                style={{ background: n.glow }}
                              />
                              <span className="mono text-[9px] tracking-[0.2em] uppercase opacity-50">
                                {n.index}
                              </span>
                              <span
                                className="display text-[14px] font-semibold whitespace-nowrap transition-colors duration-300"
                                style={{ color: hot ? n.color2 : "var(--page-fg)" }}
                              >
                                {n.alias}
                              </span>
                              <span className="mono hidden text-[9px] tracking-[0.16em] uppercase opacity-40 sm:inline">
                                {n.name}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    <p className="mono text-[9.5px] tracking-[0.24em] text-fog/60 uppercase">
                      drag to orbit · scroll to zoom · click a body
                    </p>
                  </>
                )
              ) : isBarrier ? (
                activeLayer ? (
                  <LayerCard layer={activeLayer} onClose={() => setLayer(null)} />
                ) : (
                  <>
                    <LayerIndex
                      hovered={layerHover}
                      onHover={setLayerHover}
                      onSelect={setLayer}
                    />
                    <p className="mono text-[9.5px] tracking-[0.24em] text-fog/60 uppercase">
                      drag the diet slider · fire pulse = a fatty meal
                    </p>
                  </>
                )
              ) : activeRegion ? (
                <RegionCard region={activeRegion} onClose={() => setRegion(null)} />
              ) : (
                <>
                  <RegionIndex
                    hovered={regionHover}
                    onHover={setRegionHover}
                    onSelect={setRegion}
                  />
                  <p className="mono text-[9.5px] tracking-[0.24em] text-fog/60 uppercase">
                    drag the exposure slider · fire pulse = a vagal command
                  </p>
                </>
              )}
            </div>

            <div className="flex flex-col items-start gap-3 lg:items-end">
              {isBarrier && (
                <>
                  <Readout stats={stats} />
                  <DietDial diet={diet} setDiet={setDiet} />
                </>
              )}
              {isNeuro && (
                <>
                  <NeuroReadout stats={neuroStats} />
                  <ExposureDial exposure={exposure} setExposure={setExposure} />
                </>
              )}
              <Transport
                playing={playing}
                onPlaying={setPlaying}
                speed={speed}
                onSpeed={setSpeed}
                onPulse={firePulse}
                pulseLabel={isLoop ? "fire pulse" : isBarrier ? "fatty meal" : "vagal burst"}
                onReset={() => {
                  setSelected(null);
                  setLayer(null);
                  setRegion(null);
                  setResetToken((t) => t + 1);
                }}
              />
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-2.5 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1.5 lg:flex">
          <span className="mono text-[8.5px] tracking-[0.32em] uppercase opacity-40">scroll</span>
          <span
            className="h-7 w-px"
            style={{
              background: "linear-gradient(to bottom, var(--accent), transparent)",
              animation: "swell 2.6s ease-in-out infinite",
            }}
          />
        </div>
      </section>
      )}

      {/* ---------------- prose ---------------- */}
      <main key={page} className="card-in">
        <Marquee />
        {isLoop ? (
          <>
            <Chain />
            <Levers />
          </>
        ) : isBarrier ? (
          <>
            <BarrierChain />
            <DietTable />
            <Endotoxaemia />
          </>
        ) : isNeuro ? (
          <>
            <NeuroChain />
            <SymptomTable />
            <TimingLoop />
          </>
        ) : isUpstream ? (
          <UpstreamSections
            onExplore={(id) => {
              setUpstreamSelected(id);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        ) : (
          <LifestyleSections
            onExplore={(id: LifestyleNodeId) => {
              setHabit(id);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        )}
        <Footer page={page} onPage={navigate} />
      </main>
    </div>
  );
}
