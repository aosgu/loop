import { useEffect, useRef, useState } from "react";
import {
  LifestyleEngine,
  type LifestyleLabelFrame,
  type LifestyleStats,
} from "../three/lifestyle";
import {
  LIFESTYLE_DRIVERS,
  LIFESTYLE_TARGETS,
  type LifestyleId,
  type LifestyleNodeId,
} from "../data/lifestyle";

export interface LifestyleWeights {
  load: number;
  activity: number;
  sleep: number;
  circadian: number;
}

interface Props {
  selected: LifestyleNodeId | null;
  hovered: LifestyleNodeId | null;
  onSelect: (id: LifestyleNodeId | null) => void;
  onHover: (id: LifestyleNodeId | null) => void;
  playing: boolean;
  speed: number;
  /** Bumped by the parent to fire a cascade pulse. */
  pulseToken: number;
  /** Which driver the next pulse should trace. */
  pulseDriver: LifestyleId | "all";
  resetToken: number;
  weights: LifestyleWeights;
  filter: "all" | LifestyleId;
  onStats: (s: LifestyleStats) => void;
}

/**
 * The chapter-V stage on its own: canvas + engine + projected 3D labels.
 * Owns no layout of its own — the parent sizes and positions it.
 */
export default function LifestyleStage(props: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<LifestyleEngine | null>(null);
  const labelsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const callbacksRef = useRef(props);
  const lastPulse = useRef(props.pulseToken);
  const lastReset = useRef(props.resetToken);
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
      const { load, activity, sleep, circadian } = callbacksRef.current.weights;
      engine.setWeights(load, activity, sleep, circadian);
      engine.setFilter(callbacksRef.current.filter);
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
    const { load, activity, sleep, circadian } = props.weights;
    engineRef.current?.setWeights(load, activity, sleep, circadian);
  }, [props.weights]);
  useEffect(() => { engineRef.current?.setFilter(props.filter); }, [props.filter]);

  useEffect(() => {
    if (props.pulseToken !== lastPulse.current) {
      engineRef.current?.firePulse(props.pulseDriver);
    }
    lastPulse.current = props.pulseToken;
  }, [props.pulseToken, props.pulseDriver]);

  useEffect(() => {
    if (props.resetToken !== lastReset.current) engineRef.current?.resetView();
    lastReset.current = props.resetToken;
  }, [props.resetToken]);

  function paintLabels(frames: LifestyleLabelFrame[]) {
    for (const f of frames) {
      const el = labelsRef.current.get(f.id);
      if (!el) continue;
      const s = Math.max(0.68, Math.min(1.04, 1.12 - (f.depth - 7.0) * 0.055));
      el.style.transform = `translate3d(${f.x.toFixed(1)}px, ${f.y.toFixed(1)}px, 0) translate(-50%, -50%) scale(${s.toFixed(3)})`;
      el.style.opacity = f.visible ? "1" : "0";
    }
  }

  return (
    <div className="absolute inset-0 overflow-hidden">
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
    </div>
  );
}
