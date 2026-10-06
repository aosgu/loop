import { useEffect, useRef, useState } from "react";
import {
  LifestyleEngine,
  type LifestyleLabelFrame,
  type LifestyleStats,
} from "../three/lifestyle";
import {
  LIFESTYLE_DRIVERS,
  LIFESTYLE_TARGETS,
  LIFESTYLE_PRESETS,
  driverById,
  targetById,
  type LifestyleId,
  type TargetId,
  type LifestyleNodeId,
  type LifestylePreset,
  type LifestyleDriver,
  type LifestyleTarget,
} from "../data/lifestyle";
import Transport from "./Transport";

interface Props {
  selected: LifestyleNodeId | null;
  hovered: LifestyleNodeId | null;
  onSelect: (id: LifestyleNodeId | null) => void;
  onHover: (id: LifestyleNodeId | null) => void;
  stats: LifestyleStats;
  onStats: (s: LifestyleStats) => void;
  playing: boolean;
  onPlaying: (v: boolean) => void;
  speed: number;
  onSpeed: (v: number) => void;
  pulseToken: number;
  resetToken: number;
  onReset: () => void;
}

function DriverDossier({
  driver,
  onClose,
  onJump,
}: {
  driver: LifestyleDriver;
  onClose: () => void;
  onJump: (id: TargetId) => void;
}) {
  return (
    <aside
      key={driver.id}
      className="card-in pointer-events-auto relative w-full overflow-hidden rounded-[2px] border border-bone/12 bg-void/88 backdrop-blur-md"
      style={{ boxShadow: "var(--stage-shadow)" }}
    >
      <span
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: `linear-gradient(90deg, ${driver.color}, transparent 80%)` }}
      />
      <div className="flex items-start gap-4 p-5 sm:p-6">
        <div className="flex flex-col items-center gap-1">
          <span className="display text-[38px] leading-none font-black sm:text-[46px]" style={{ color: driver.color }}>
            {driver.index}
          </span>
          <span className="mono text-[8px] tracking-[0.24em] text-fog uppercase">DRIVER</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="mono rounded-full border px-2 py-0.5 text-[8px] tracking-[0.2em] uppercase"
              style={{ borderColor: driver.color, color: driver.color }}
            >
              {driver.rank}
            </span>
            <span className="mono text-[8px] tracking-[0.16em] text-fog uppercase">
              Directness {driver.directnessScore}%
            </span>
          </div>
          <h3 className="display mt-1 text-[22px] leading-[1.05] font-bold text-bone sm:text-[25px]">
            {driver.name}
          </h3>
          <p className="display mt-0.5 text-[15px] italic" style={{ color: driver.color }}>
            “{driver.alias}” — {driver.role}
          </p>
        </div>

        <button
          onClick={onClose}
          aria-label="Close"
          className="mono grid h-7 w-7 shrink-0 place-items-center rounded-full border border-bone/20 text-[13px] leading-none text-bone/70 transition-all duration-300 hover:rotate-90 hover:border-smoulder hover:text-smoulder"
        >
          ✕
        </button>
      </div>

      <div className="px-5 pb-5 sm:px-6 sm:pb-6">
        <p className="text-[13px] leading-[1.65] text-bone/80">{driver.body}</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[2px] border border-bone/10 bg-void/50 p-3">
            <p className="mono text-[8.5px] tracking-[0.2em] text-[#ff7d5c] uppercase">Impact on Gut Barrier</p>
            <p className="mt-1 text-[12px] leading-[1.55] text-bone/70">{driver.gutMechanism}</p>
          </div>
          <div className="rounded-[2px] border border-bone/10 bg-void/50 p-3">
            <p className="mono text-[8.5px] tracking-[0.2em] text-[#4fd0ae] uppercase">Impact on Insulin Sensitivity</p>
            <p className="mt-1 text-[12px] leading-[1.55] text-bone/70">{driver.insulinMechanism}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          {driver.keyMarkers.map((marker) => (
            <span
              key={marker}
              className="mono inline-flex items-center gap-1 rounded-full bg-bone/8 px-2.5 py-1 text-[8.5px] tracking-[0.14em] text-bone/75 uppercase"
            >
              {marker}
            </span>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => onJump("gut_target")}
            className="group flex items-center justify-between rounded-[2px] border border-bone/10 px-3 py-2 text-left transition-all duration-300 hover:border-[#ff7d5c]/50 hover:bg-[#ff7d5c]/10"
          >
            <span className="mono text-[8.5px] tracking-[0.18em] text-fog uppercase">Follow to Gut</span>
            <span className="text-[12px] text-[#ff7d5c] transition-transform duration-300 group-hover:translate-x-1">→</span>
          </button>
          <button
            onClick={() => onJump("insulin_target")}
            className="group flex items-center justify-between rounded-[2px] border border-bone/10 px-3 py-2 text-left transition-all duration-300 hover:border-[#4fd0ae]/50 hover:bg-[#4fd0ae]/10"
          >
            <span className="mono text-[8.5px] tracking-[0.18em] text-fog uppercase">Follow to Insulin</span>
            <span className="text-[12px] text-[#4fd0ae] transition-transform duration-300 group-hover:translate-x-1">→</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

function TargetDossier({
  target,
  onClose,
}: {
  target: LifestyleTarget;
  onClose: () => void;
}) {
  return (
    <aside
      key={target.id}
      className="card-in pointer-events-auto relative w-full overflow-hidden rounded-[2px] border border-bone/12 bg-void/88 backdrop-blur-md"
      style={{ boxShadow: "var(--stage-shadow)" }}
    >
      <span
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: `linear-gradient(90deg, ${target.color}, transparent 80%)` }}
      />
      <div className="flex items-start gap-4 p-5 sm:p-6">
        <div className="flex flex-col items-center gap-1">
          <span className="display text-[38px] leading-none font-black sm:text-[46px]" style={{ color: target.color }}>
            {target.index}
          </span>
          <span className="mono text-[8px] tracking-[0.24em] text-fog uppercase">TARGET</span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="mono text-[9px] tracking-[0.26em] text-fog uppercase">{target.alias}</p>
          <h3 className="display mt-1 text-[22px] leading-[1.05] font-bold text-bone sm:text-[25px]">
            {target.name}
          </h3>
          <p className="display mt-0.5 text-[15px] italic" style={{ color: target.color }}>
            {target.role}
          </p>
        </div>

        <button
          onClick={onClose}
          aria-label="Close"
          className="mono grid h-7 w-7 shrink-0 place-items-center rounded-full border border-bone/20 text-[13px] leading-none text-bone/70 transition-all duration-300 hover:rotate-90 hover:border-smoulder hover:text-smoulder"
        >
          ✕
        </button>
      </div>

      <div className="px-5 pb-5 sm:px-6 sm:pb-6">
        <p className="text-[13px] leading-[1.65] text-bone/80">{target.body}</p>
      </div>
    </aside>
  );
}

function Meter({
  label,
  value,
  unit,
  pct,
  color,
}: {
  label: string;
  value: string;
  unit?: string;
  pct: number;
  color: string;
}) {
  return (
    <div className="w-[8.2rem]">
      <div className="flex items-baseline justify-between gap-1.5">
        <span className="mono text-[8px] tracking-[0.18em] text-fog/70 uppercase">{label}</span>
        <span className="mono tnum text-[11.5px] leading-none" style={{ color }}>
          {value}
          {unit && <span className="text-[7.5px] opacity-60"> {unit}</span>}
        </span>
      </div>
      <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full bg-bone/10">
        <span
          className="block h-full rounded-full transition-[width] duration-300 ease-out"
          style={{
            width: `${Math.max(3, Math.min(100, pct))}%`,
            background: color,
            boxShadow: `0 0 10px ${color}`,
          }}
        />
      </div>
    </div>
  );
}

export default function LifestyleChapter(props: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<LifestyleEngine | null>(null);
  const labelsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const callbacksRef = useRef(props);
  const lastPulse = useRef(props.pulseToken);
  const lastReset = useRef(props.resetToken);

  const [activePreset, setActivePreset] = useState<string>("energy_surplus");
  const [load, setLoad] = useState<number>(0.95);
  const [activity, setActivity] = useState<number>(0.88);
  const [sleep, setSleep] = useState<number>(0.25);
  const [circadian, setCircadian] = useState<number>(0.2);
  const [filter, setFilter] = useState<"all" | LifestyleId>("all");
  const [failed, setFailed] = useState(false);

  callbacksRef.current = props;

  useEffect(() => {
    if (!canvasRef.current) return;
    let engine: LifestyleEngine | null = null;
    try {
      engine = new LifestyleEngine(canvasRef.current, {
        onHover: (id) => callbacksRef.current.onHover(id),
        onSelect: (id) => callbacksRef.current.onSelect(id),
        onLabels: (frames) => paintLabels(frames),
        onStats: (s) => callbacksRef.current.onStats(s),
      });
      engineRef.current = engine;
      engine.setWeights(load, activity, sleep, circadian);
      engine.setFilter(filter);
      const c = canvasRef.current;
      requestAnimationFrame(() => {
        if (c) c.style.opacity = "1";
      });
    } catch (err) {
      console.error("Lifestyle engine failed to start", err);
      setFailed(true);
    }
    return () => {
      engine?.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { engineRef.current?.setPlaying(props.playing); }, [props.playing]);
  useEffect(() => { engineRef.current?.setSpeed(props.speed); }, [props.speed]);
  useEffect(() => {
    if (props.selected) engineRef.current?.select(props.selected);
    else engineRef.current?.release();
  }, [props.selected]);
  useEffect(() => { engineRef.current?.setHoverExternal(props.hovered); }, [props.hovered]);
  useEffect(() => {
    engineRef.current?.setWeights(load, activity, sleep, circadian);
  }, [load, activity, sleep, circadian]);
  useEffect(() => { engineRef.current?.setFilter(filter); }, [filter]);

  useEffect(() => {
    if (props.pulseToken !== lastPulse.current) {
      engineRef.current?.firePulse(
        props.selected && props.selected in driverById ? (props.selected as LifestyleId) : "all",
      );
    }
    lastPulse.current = props.pulseToken;
  }, [props.pulseToken, props.selected]);

  useEffect(() => {
    if (props.resetToken !== lastReset.current) {
      engineRef.current?.resetView();
    }
    lastReset.current = props.resetToken;
  }, [props.resetToken]);

  const applyPreset = (preset: LifestylePreset) => {
    setActivePreset(preset.id);
    setLoad(preset.load);
    setActivity(preset.activity);
    setSleep(preset.sleep);
    setCircadian(preset.circadian);
    engineRef.current?.setWeights(preset.load, preset.activity, preset.sleep, preset.circadian);
  };

  function paintLabels(frames: LifestyleLabelFrame[]) {
    for (const f of frames) {
      const el = labelsRef.current.get(f.id);
      if (!el) continue;
      const s = Math.max(0.68, Math.min(1.04, 1.12 - (f.depth - 7.0) * 0.055));
      el.style.transform = `translate3d(${f.x.toFixed(1)}px, ${f.y.toFixed(1)}px, 0) translate(-50%, -50%) scale(${s.toFixed(3)})`;
      el.style.opacity = f.visible ? "1" : "0";
    }
  }

  const selectedDriver = props.selected && LIFESTYLE_DRIVERS.some((d) => d.id === props.selected)
    ? driverById(props.selected as LifestyleId)
    : null;

  const selectedTarget = props.selected && LIFESTYLE_TARGETS.some((t) => t.id === props.selected)
    ? targetById(props.selected as TargetId)
    : null;

  return (
    <section className="stage-bg grain relative h-[calc(100svh-3.5rem)] min-h-[640px] w-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-grab opacity-0 transition-opacity duration-1000 active:cursor-grabbing"
        style={{ opacity: 0 }}
      />

      {/* Projected 3D Labels */}
      <div className="pointer-events-none absolute inset-0">
        {LIFESTYLE_DRIVERS.map((d) => (
          <div
            key={d.id}
            ref={(el) => {
              if (el) labelsRef.current.set(d.id, el);
            }}
            className="node-label"
            style={{ opacity: 0 }}
          >
            <button
              onClick={() => props.onSelect(d.id)}
              onPointerEnter={() => props.onHover(d.id)}
              onPointerLeave={() => props.onHover(null)}
              className="pointer-events-auto flex -translate-y-12 cursor-pointer flex-col items-center gap-[2px] whitespace-nowrap text-center transition-transform duration-300 hover:scale-105"
            >
              <span
                className="mono rounded-full border px-2 py-0.5 text-[7.5px] tracking-[0.2em] uppercase"
                style={{ borderColor: d.color, color: d.color2, background: "rgba(6,15,13,0.7)" }}
              >
                {d.rank}
              </span>
              <span className="display text-[16px] leading-tight font-bold text-bone sm:text-[18px]">
                {d.alias}
              </span>
              <span className="mono text-[8px] tracking-[0.16em] text-fog/70 uppercase">
                {d.name.split("&")[0]}
              </span>
              <span
                className="mt-1 h-[22px] w-px"
                style={{ background: `linear-gradient(to bottom, ${d.glow}, transparent)` }}
              />
            </button>
          </div>
        ))}

        {LIFESTYLE_TARGETS.map((t) => (
          <div
            key={t.id}
            ref={(el) => {
              if (el) labelsRef.current.set(t.id, el);
            }}
            className="node-label"
            style={{ opacity: 0 }}
          >
            <button
              onClick={() => props.onSelect(t.id)}
              onPointerEnter={() => props.onHover(t.id)}
              onPointerLeave={() => props.onHover(null)}
              className="pointer-events-auto flex translate-y-10 cursor-pointer flex-col items-center gap-[2px] whitespace-nowrap text-center transition-transform duration-300 hover:scale-105"
            >
              <span
                className="mt-1 h-[20px] w-px"
                style={{ background: `linear-gradient(to top, ${t.glow}, transparent)` }}
              />
              <span className="mono text-[8px] tracking-[0.22em] uppercase" style={{ color: t.color2 }}>
                SHARED RECEPTOR GATEWAY
              </span>
              <span className="display text-[16px] leading-tight font-bold text-bone sm:text-[18px]">
                {t.name}
              </span>
            </button>
          </div>
        ))}
      </div>

      {failed && (
        <div className="absolute inset-0 grid place-items-center px-8 text-center">
          <p className="mono max-w-[34ch] text-[11px] leading-[1.9] tracking-[0.2em] text-fog uppercase">
            this lifestyle cascade vitrine needs webgl
          </p>
        </div>
      )}

      {/* Top & Bottom Stage Overlay UI */}
      <div className="pointer-events-none absolute inset-0 flex flex-col p-4 sm:p-7">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[48vh] opacity-85"
          style={{ background: "linear-gradient(180deg, rgba(6,15,13,.92), transparent)" }}
          aria-hidden
        />

        {/* Top Header Row */}
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-[34rem]">
            <p className="card-in mono text-[9.5px] tracking-[0.34em] text-smoulder uppercase">
              Chapter V · The Lifestyle Hierarchy
            </p>
            <h1 className="display mt-2 text-[clamp(2.0rem,5.2vw,3.8rem)] font-black leading-[0.96]">
              Diet is loudest, but all four
              <br />
              strike the{" "}
              <em
                className="italic"
                style={{ color: "#4fd0ae", fontVariationSettings: '"SOFT" 100, "WONK" 1' }}
              >
                same system.
              </em>
            </h1>
            <p className="mt-2.5 max-w-[42ch] text-[12.5px] leading-[1.62] text-fog sm:text-[13px]">
              <strong>Dietary structure and chronic energy surplus</strong> act as the most direct upstream driver.
              <strong> Physical inactivity</strong> closes the insulin-independent GLUT4 bypass valve, while
              <strong> sleep deprivation</strong> and <strong>circadian misalignment</strong> act as potent, frequently
              underestimated neuroendocrine drivers that dysregulate both the gut barrier and insulin sensitivity.
            </p>
          </div>

          {/* Archetype Preset Selector */}
          <div className="pointer-events-auto flex flex-col items-start gap-2 lg:items-end">
            <span className="mono text-[8.5px] tracking-[0.2em] text-fog/70 uppercase">
              Clinical Archetypes
            </span>
            <div className="flex flex-wrap gap-1.5 lg:justify-end">
              {LIFESTYLE_PRESETS.map((p) => {
                const on = activePreset === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => applyPreset(p)}
                    className={`mono rounded-[2px] border px-2.5 py-1.5 text-[8.5px] tracking-[0.14em] uppercase transition-all duration-300 ${
                      on
                        ? "border-smoulder bg-smoulder/18 text-smoulder font-medium shadow-[0_0_12px_rgba(255,176,58,0.25)]"
                        : "border-bone/12 bg-void/60 text-fog/75 hover:border-bone/35 hover:text-bone"
                    }`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Controls Row */}
        <div className="mt-auto flex flex-col gap-5 pt-6 lg:flex-row lg:items-end lg:justify-between">
          {/* Left Column: Dossier or Driver Selector */}
          <div className="flex w-full max-w-[28rem] shrink-0 flex-col gap-3">
            {selectedDriver ? (
              <DriverDossier
                driver={selectedDriver}
                onClose={() => props.onSelect(null)}
                onJump={(targetId) => props.onSelect(targetId)}
              />
            ) : selectedTarget ? (
              <TargetDossier
                target={selectedTarget}
                onClose={() => props.onSelect(null)}
              />
            ) : (
              <>
                {/* 4 Lifestyle Drivers Ranked List */}
                <div className="pointer-events-auto rounded-[2px] border border-bone/10 bg-void/65 p-3.5 backdrop-blur-md">
                  <div className="flex items-baseline justify-between border-b border-bone/10 pb-2">
                    <span className="mono text-[8.5px] tracking-[0.24em] text-fog uppercase">
                      Causal Hierarchy (Directness)
                    </span>
                    <span className="mono text-[8px] tracking-[0.14em] text-smoulder uppercase">
                      Click to Inspect
                    </span>
                  </div>

                  <ul className="mt-2 flex flex-col gap-1.5">
                    {LIFESTYLE_DRIVERS.map((d) => {
                      const hot = props.hovered === d.id;
                      return (
                        <li key={d.id}>
                          <button
                            onPointerEnter={() => props.onHover(d.id)}
                            onPointerLeave={() => props.onHover(null)}
                            onClick={() => props.onSelect(d.id)}
                            className="group flex w-full items-center justify-between rounded-[2px] border px-2.5 py-1.5 text-left transition-all duration-300 hover:translate-x-[2px]"
                            style={{
                              borderColor: hot ? d.color : "rgba(242,239,228,0.08)",
                              background: hot ? "rgba(242,239,228,0.06)" : "transparent",
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2 w-2 shrink-0 rounded-full transition-transform duration-300 group-hover:scale-125"
                                style={{ background: d.color }}
                              />
                              <span className="mono text-[8.5px] tracking-[0.15em] text-fog/60 uppercase">
                                {d.index}
                              </span>
                              <span
                                className="display text-[13.5px] font-semibold whitespace-nowrap transition-colors duration-300"
                                style={{ color: hot ? d.color2 : "var(--page-fg)" }}
                              >
                                {d.alias}
                              </span>
                            </div>

                            <span
                              className="mono rounded-full border px-2 py-0.2 text-[7.5px] tracking-[0.12em] uppercase"
                              style={{ borderColor: d.color, color: d.color }}
                            >
                              {d.rank.split("·")[0].trim()}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>

                  {/* Filter tabs */}
                  <div className="mt-3 flex items-center justify-between border-t border-bone/8 pt-2.5">
                    <span className="mono text-[8px] tracking-[0.2em] text-fog/60 uppercase">
                      Focus Conduit:
                    </span>
                    <div className="flex gap-1">
                      {(["all", "diet", "activity", "sleep", "circadian"] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setFilter(mode)}
                          className={`mono rounded px-1.5 py-0.5 text-[7.5px] tracking-[0.1em] uppercase ${
                            filter === mode ? "bg-smoulder text-void font-bold" : "text-fog/70 hover:text-bone"
                          }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <p className="mono text-[9px] tracking-[0.24em] text-fog/60 uppercase">
                  drag to orbit · select driver to inspect · fire pulse to trace cascade
                </p>
              </>
            )}
          </div>

          {/* Right Column: Live Readouts + Interactive Dials + Transport */}
          <div className="flex flex-col items-start gap-3 lg:items-end">
            {/* Live Metabolic Readouts */}
            <div className="pointer-events-none flex flex-wrap items-start gap-x-4 gap-y-2.5 rounded-[2px] border border-bone/10 bg-void/60 px-4 py-3 backdrop-blur-md">
              <Meter
                label="Direct Diet Load"
                value={`${Math.round(load * 100)}%`}
                pct={load * 100}
                color="#ff7d5c"
              />
              <Meter
                label="Barrier Threat Index"
                value={`${props.stats.barrierThreat}%`}
                pct={props.stats.barrierThreat}
                color="#ffb03a"
              />
              <Meter
                label="Insulin Resistance"
                value={`${props.stats.insulinResistance}%`}
                pct={props.stats.insulinResistance}
                color="#4fd0ae"
              />
              <Meter
                label="Circadian Desync"
                value={`${props.stats.circadianDesync}%`}
                pct={props.stats.circadianDesync}
                color="#ffe07a"
              />
            </div>

            {/* Interactive Lifestyle Weight Sliders Panel */}
            <div className="pointer-events-auto flex w-full max-w-[28rem] flex-col gap-2 rounded-[2px] border border-bone/10 bg-void/75 p-3.5 backdrop-blur-md">
              <div className="flex items-baseline justify-between border-b border-bone/8 pb-1.5">
                <span className="mono text-[8.5px] tracking-[0.24em] text-fog uppercase">
                  Interactive Lifestyle Drivers
                </span>
                <span className="mono text-[8px] tracking-[0.14em] text-smoulder uppercase">
                  Tune Live Exposure
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                {/* 1. Diet Load */}
                <div>
                  <div className="flex justify-between mono text-[8px] tracking-[0.15em] text-[#ff7d5c] uppercase">
                    <span>1. Diet Surplus</span>
                    <span className="tabular-nums">{Math.round(load * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(load * 100)}
                    onChange={(e) => {
                      const v = Number(e.target.value) / 100;
                      setLoad(v);
                      setActivePreset("custom");
                    }}
                    className="w-full accent-[#ff7d5c] h-1.5 bg-bone/10 rounded-full cursor-pointer"
                  />
                </div>

                {/* 2. Inactivity */}
                <div>
                  <div className="flex justify-between mono text-[8px] tracking-[0.15em] text-[#ffb03a] uppercase">
                    <span>2. Inactivity</span>
                    <span className="tabular-nums">{Math.round(activity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(activity * 100)}
                    onChange={(e) => {
                      const v = Number(e.target.value) / 100;
                      setActivity(v);
                      setActivePreset("custom");
                    }}
                    className="w-full accent-[#ffb03a] h-1.5 bg-bone/10 rounded-full cursor-pointer"
                  />
                </div>

                {/* 3. Sleep Debt */}
                <div>
                  <div className="flex justify-between mono text-[8px] tracking-[0.15em] text-[#ffe07a] uppercase">
                    <span>3. Sleep Debt</span>
                    <span className="tabular-nums">{Math.round(sleep * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(sleep * 100)}
                    onChange={(e) => {
                      const v = Number(e.target.value) / 100;
                      setSleep(v);
                      setActivePreset("custom");
                    }}
                    className="w-full accent-[#ffe07a] h-1.5 bg-bone/10 rounded-full cursor-pointer"
                  />
                </div>

                {/* 4. Circadian Desync */}
                <div>
                  <div className="flex justify-between mono text-[8px] tracking-[0.15em] text-[#4fd0ae] uppercase">
                    <span>4. Circadian Desync</span>
                    <span className="tabular-nums">{Math.round(circadian * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={Math.round(circadian * 100)}
                    onChange={(e) => {
                      const v = Number(e.target.value) / 100;
                      setCircadian(v);
                      setActivePreset("custom");
                    }}
                    className="w-full accent-[#4fd0ae] h-1.5 bg-bone/10 rounded-full cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Transport Bar */}
            <Transport
              playing={props.playing}
              onPlaying={props.onPlaying}
              speed={props.speed}
              onSpeed={props.onSpeed}
              onPulse={() => {
                engineRef.current?.firePulse(
                  props.selected && props.selected in driverById ? (props.selected as LifestyleId) : "all",
                );
              }}
              pulseLabel="fire pulse: cascade"
              onReset={() => {
                props.onSelect(null);
                engineRef.current?.resetView();
                props.onReset();
              }}
            />
          </div>
        </div>
      </div>

      {/* Center Bottom Scroll Cue */}
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
  );
}
