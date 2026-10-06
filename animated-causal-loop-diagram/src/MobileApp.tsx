import { useCallback, useMemo, useState } from "react";
import PlushStage from "./components/PlushStage";
import BarrierStage from "./components/BarrierStage";
import NeuroStage from "./components/NeuroStage";
import UpstreamStage from "./components/UpstreamStage";
import LifestyleStage from "./components/LifestyleStage";
import { DIETS, type LayerId } from "./data/barrier";
import { EXPOSURES, type RegionId } from "./data/neuro";
import type { NodeId } from "./data/loop";
import type { PulsePhase, SourceFocus, UpstreamId } from "./data/upstream";
import {
  LIFESTYLE_PRESETS,
  driverById,
  type LifestyleId,
  type LifestyleNodeId,
} from "./data/lifestyle";
import type { LifestyleWeights } from "./components/LifestyleStage";

export type ChapterId = "loop" | "barrier" | "neuro" | "upstream" | "lifestyle";

const CHAPTERS: { id: ChapterId; label: string; accent: string }[] = [
  { id: "loop", label: "Loop", accent: "#ffb03a" },
  { id: "barrier", label: "Wall", accent: "#4fd0ae" },
  { id: "neuro", label: "Wire", accent: "#ffe07a" },
  { id: "upstream", label: "Roots", accent: "#9ff0d8" },
  { id: "lifestyle", label: "Days", accent: "#ff7d5c" },
];

const FOCI: { id: SourceFocus; label: string }[] = [
  { id: "both", label: "Both" },
  { id: "lifestyle", label: "Life" },
  { id: "genetics", label: "Genes" },
];

/** Short handles for the chapter-V archetypes, so the dock stays on one row. */
const PRESET_SHORT: Record<string, string> = {
  energy_surplus: "Surplus",
  shift_worker: "Shift",
  sleep_deprived: "5h sleep",
  optimal_aligned: "Aligned",
};

const noop = () => {};

const weightsOf = (id: string): LifestyleWeights => {
  const p = LIFESTYLE_PRESETS.find((x) => x.id === id) ?? LIFESTYLE_PRESETS[0];
  return { load: p.load, activity: p.activity, sleep: p.sleep, circadian: p.circadian };
};

function Icon({ name }: { name: "play" | "pause" | "bolt" | "orbit" }) {
  const c = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg viewBox="0 0 20 20" className="h-[11px] w-[11px]" aria-hidden>
      {name === "play" && <path d="M6.5 4.2 L15 10 L6.5 15.8 Z" {...c} />}
      {name === "pause" && <path d="M7 4.6 V15.4 M13 4.6 V15.4" {...c} />}
      {name === "bolt" && <path d="M11 2.6 L4.6 11 h4.2 L8.4 17.4 L15.4 8.6 h-4.3 Z" {...c} />}
      {name === "orbit" && (
        <>
          <circle cx="10" cy="10" r="3.1" {...c} />
          <ellipse cx="10" cy="10" rx="8" ry="3.6" {...c} transform="rotate(-24 10 10)" />
        </>
      )}
    </svg>
  );
}

/**
 * Mobile-only viewer: the five chapter stages, nothing else.
 *
 * No titles, decks, readouts or legends — the only text over the stage is the
 * label layer each engine projects onto its own 3D geometry. Everything the
 * user can operate lives in the three-row dock at the bottom.
 */
export default function MobileApp({ initialChapter = "loop" }: { initialChapter?: ChapterId } = {}) {
  const [chapter, setChapter] = useState<ChapterId>(initialChapter);

  /* shared transport */
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [pulse, setPulse] = useState(0);
  const [resetToken, setResetToken] = useState(0);

  /* I — the loop */
  const [nodeSel, setNodeSel] = useState<NodeId | null>(null);
  const [nodeHover, setNodeHover] = useState<NodeId | null>(null);

  /* II — the barrier */
  const [layerSel, setLayerSel] = useState<LayerId | null>(null);
  const [layerHover, setLayerHover] = useState<LayerId | null>(null);
  const [diet, setDiet] = useState(DIETS[0].value);

  /* III — the wiring */
  const [regionSel, setRegionSel] = useState<RegionId | null>(null);
  const [regionHover, setRegionHover] = useState<RegionId | null>(null);
  const [exposure, setExposure] = useState(EXPOSURES[0].value);

  /* IV — upstream */
  const [upSel, setUpSel] = useState<UpstreamId | null>(null);
  const [upHover, setUpHover] = useState<UpstreamId | null>(null);
  const [focus, setFocus] = useState<SourceFocus>("both");
  const [feedback, setFeedback] = useState(true);

  /* V — lifestyle */
  const [habit, setHabit] = useState<LifestyleNodeId | null>(null);
  const [habitHover, setHabitHover] = useState<LifestyleNodeId | null>(null);
  const [presetId, setPresetId] = useState(LIFESTYLE_PRESETS[0].id);
  const [weights, setWeights] = useState<LifestyleWeights>(() => weightsOf(LIFESTYLE_PRESETS[0].id));
  const [filter] = useState<"all" | LifestyleId>("all");

  const accent = CHAPTERS.find((c) => c.id === chapter)!.accent;

  const firePulse = useCallback(() => {
    setPlaying(true);
    setPulse((p) => p + 1);
  }, []);

  const goChapter = useCallback((next: ChapterId) => {
    setChapter(next);
    setNodeSel(null);
    setLayerSel(null);
    setRegionSel(null);
    setUpSel(null);
    setHabit(null);
    setResetToken((t) => t + 1);
  }, []);

  const reset = useCallback(() => {
    setNodeSel(null);
    setLayerSel(null);
    setRegionSel(null);
    setUpSel(null);
    setHabit(null);
    setResetToken((t) => t + 1);
  }, []);

  const stage = useMemo(() => {
    switch (chapter) {
      case "loop":
        return (
          <PlushStage
            selected={nodeSel}
            hovered={nodeHover}
            onSelect={setNodeSel}
            onHover={setNodeHover}
            playing={playing}
            speed={speed}
            pulseToken={pulse}
            resetToken={resetToken}
            dimLabels={!!nodeSel}
          />
        );
      case "barrier":
        return (
          <BarrierStage
            selected={layerSel}
            hovered={layerHover}
            onSelect={setLayerSel}
            onHover={setLayerHover}
            diet={diet}
            playing={playing}
            speed={speed}
            pulseToken={pulse}
            resetToken={resetToken}
            onStats={noop}
          />
        );
      case "neuro":
        return (
          <NeuroStage
            selected={regionSel}
            hovered={regionHover}
            onSelect={setRegionSel}
            onHover={setRegionHover}
            exposure={exposure}
            playing={playing}
            speed={speed}
            pulseToken={pulse}
            resetToken={resetToken}
            onStats={noop}
          />
        );
      case "upstream":
        return (
          <UpstreamStage
            selected={upSel}
            hovered={upHover}
            focus={focus}
            feedback={feedback}
            playing={playing}
            speed={speed}
            pulseToken={pulse}
            resetToken={resetToken}
            onSelect={setUpSel}
            onHover={setUpHover}
            onPhase={noop as (p: PulsePhase) => void}
          />
        );
      case "lifestyle":
        return (
          <LifestyleStage
            selected={habit}
            hovered={habitHover}
            onSelect={setHabit}
            onHover={setHabitHover}
            playing={playing}
            speed={speed}
            pulseToken={pulse}
            pulseDriver={
              habit && habit in driverById ? (habit as LifestyleId) : "all"
            }
            resetToken={resetToken}
            weights={weights}
            filter={filter}
            onStats={noop}
          />
        );
    }
  }, [
    chapter, nodeSel, nodeHover, layerSel, layerHover, diet, regionSel, regionHover,
    exposure, upSel, upHover, focus, feedback, habit, habitHover, weights, filter,
    playing, speed, pulse, resetToken,
  ]);

  /* ---- row 2: the controls this chapter actually has ---- */
  const chapterControls = (() => {
    if (chapter === "barrier") {
      return (
        <DialRow
          label="diet"
          value={diet}
          onChange={setDiet}
          options={DIETS.map((d) => ({ id: d.id, label: d.label, value: d.value }))}
        />
      );
    }
    if (chapter === "neuro") {
      return (
        <DialRow
          label="exposure"
          value={exposure}
          onChange={setExposure}
          options={EXPOSURES.map((d) => ({ id: d.id, label: d.label, value: d.value }))}
        />
      );
    }
    if (chapter === "upstream") {
      return (
        <div className="flex items-center gap-1.5" style={{ ["--m-accent" as string]: "#9ff0d8" }}>
          <div className="m-seg flex-1" role="group" aria-label="Trace a shared source">
            {FOCI.map((f) => (
              <button
                key={f.id}
                className="flex-1"
                aria-pressed={focus === f.id}
                onClick={() => {
                  setFocus(f.id);
                  setUpSel(null);
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            className="m-chip"
            aria-pressed={feedback}
            onClick={() => setFeedback((v) => !v)}
            title="Show the original feedback loop"
          >
            R1
          </button>
        </div>
      );
    }
    if (chapter === "lifestyle") {
      return (
        <div
          className="grid grid-cols-4 gap-1"
          role="group"
          aria-label="Clinical archetype"
          style={{ ["--m-accent" as string]: "#ff7d5c" }}
        >
          {LIFESTYLE_PRESETS.map((p) => (
            <button
              key={p.id}
              className="m-chip"
              aria-pressed={presetId === p.id}
              title={p.name}
              onClick={() => {
                setPresetId(p.id);
                setWeights(weightsOf(p.id));
              }}
            >
              {PRESET_SHORT[p.id] ?? p.name}
            </button>
          ))}
        </div>
      );
    }
    return null; // chapter I has no chapter-specific control
  })();

  return (
    <div className="mobile-app flex h-[100dvh] w-full flex-col overflow-hidden bg-void text-bone">
      {/* ---------------- stage ---------------- */}
      <div className="stage-bg grain relative min-h-0 flex-1 overflow-hidden">
        <div key={chapter} className="absolute inset-0">
          {stage}
        </div>
      </div>

      {/* ---------------- dock ---------------- */}
      <div className="m-dock flex shrink-0 flex-col gap-2 px-2.5 pt-2.5">
        {/* row 1 — chapters */}
        <div
          className="grid grid-cols-5 gap-1"
          role="tablist"
          aria-label="Chapter"
          style={{ ["--m-accent" as string]: accent }}
        >
          {CHAPTERS.map((c) => (
            <button
              key={c.id}
              role="tab"
              aria-selected={chapter === c.id}
              aria-label={`Chapter ${c.label}`}
              className="m-chip"
              style={{ ["--m-accent" as string]: c.accent }}
              onClick={() => goChapter(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* row 2 — this chapter's own controls, if it has any */}
        {chapterControls}

        {/* row 3 — transport */}
        <div className="flex items-center gap-1.5">
          <button
            className="m-btn m-btn--primary"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Pause animation" : "Play animation"}
          >
            <Icon name={playing ? "pause" : "play"} />
            {playing ? "running" : "paused"}
          </button>

          <div className="m-seg" role="group" aria-label="Play speed">
            {[0.5, 1, 2].map((s) => (
              <button key={s} aria-pressed={speed === s} onClick={() => setSpeed(s)}>
                {s}×
              </button>
            ))}
          </div>

          <button className="m-btn ml-auto" onClick={firePulse} aria-label="Fire pulse">
            <Icon name="bolt" />
            fire pulse
          </button>

          <button className="m-btn" onClick={reset} aria-label="Reset view">
            <Icon name="orbit" />
            reset
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function DialRow({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  options: { id: string; label: string; value: number }[];
}) {
  const active = options.reduce((best, o) =>
    Math.abs(o.value - value) < Math.abs(best.value - value) ? o : best,
  );
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="mono shrink-0 text-[8px] tracking-[0.2em] text-fog/70 uppercase">
          {label}
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(value * 100)}
          onChange={(e) => onChange(Number(e.target.value) / 100)}
          aria-label={label}
          className="m-range min-w-0 flex-1"
          style={{ ["--p" as string]: `${value * 100}%` }}
        />
        <span className="mono tnum shrink-0 text-[8.5px] tracking-[0.14em] text-smoulder uppercase">
          {Math.round(value * 100)}%
        </span>
      </div>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}>
        {options.map((o) => (
          <button
            key={o.id}
            className="m-chip"
            aria-pressed={active.id === o.id}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
