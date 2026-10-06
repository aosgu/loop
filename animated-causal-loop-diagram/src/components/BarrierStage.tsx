import { useEffect, useRef, useState, type CSSProperties } from "react";
import { BarrierEngine, type BarrierLabel, type BarrierStats } from "../three/barrier";
import { LAYERS, type LayerId } from "../data/barrier";

interface Props {
  selected: LayerId | null;
  hovered: LayerId | null;
  onSelect: (id: LayerId) => void;
  onHover: (id: LayerId | null) => void;
  diet: number;
  playing: boolean;
  speed: number;
  pulseToken: number;
  resetToken: number;
  onStats: (s: BarrierStats) => void;
}

export default function BarrierStage({
  selected,
  hovered,
  onSelect,
  onHover,
  diet,
  playing,
  speed,
  pulseToken,
  resetToken,
  onStats,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BarrierEngine | null>(null);
  const labelsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const selRef = useRef<LayerId | null>(selected);
  const cb = useRef({ onSelect, onHover, onStats });
  const [failed, setFailed] = useState(false);
  const lastPulse = useRef(pulseToken);
  const lastReset = useRef(resetToken);

  cb.current = { onSelect, onHover, onStats };
  selRef.current = selected;

  useEffect(() => {
    if (!canvasRef.current) return;
    let engine: BarrierEngine | null = null;
    try {
      engine = new BarrierEngine(canvasRef.current, {
        onHover: (id) => cb.current.onHover(id),
        onSelect: (id) => cb.current.onSelect(id),
        onStats: (s) => cb.current.onStats(s),
        onLabels: (frames) => paint(frames),
      });
      engineRef.current = engine;
      const c = canvasRef.current;
      requestAnimationFrame(() => {
        if (c) c.style.opacity = "1";
      });
    } catch (err) {
      console.error("barrier stage failed", err);
      setFailed(true);
    }
    const built = engine;
    return () => {
      built?.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => engineRef.current?.setDiet(diet), [diet]);
  useEffect(() => engineRef.current?.setPlaying(playing), [playing]);
  useEffect(() => engineRef.current?.setSpeed(speed), [speed]);
  useEffect(() => engineRef.current?.setSelected(selected), [selected]);
  useEffect(() => engineRef.current?.setHoverExternal(hovered), [hovered]);
  useEffect(() => {
    if (pulseToken !== lastPulse.current) engineRef.current?.firePulse();
    lastPulse.current = pulseToken;
  }, [pulseToken]);
  useEffect(() => {
    if (resetToken !== lastReset.current) engineRef.current?.resetView();
    lastReset.current = resetToken;
  }, [resetToken]);

  function paint(frames: BarrierLabel[]) {
    for (const f of frames) {
      const el = labelsRef.current.get(f.key);
      if (!el) continue;
      el.style.transform = `translate3d(${f.x.toFixed(1)}px, ${f.y.toFixed(1)}px, 0) translate(-50%, -50%)`;
      const dimmed = selRef.current && selRef.current !== f.key;
      el.style.opacity = f.visible ? (dimmed ? "0.3" : "1") : "0";
    }
  }

  return (
    <div className="absolute inset-0 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-grab opacity-0 transition-opacity duration-1000 active:cursor-grabbing"
        style={{ opacity: 0 }}
      />

      <div className="pointer-events-none absolute inset-0">
        {LAYERS.map((l) => (
          <div
            key={l.id}
            ref={(el) => {
              if (el) labelsRef.current.set(l.id, el);
            }}
            className="node-label"
            style={{ opacity: 0 }}
          >
            <button
              className="up-node-label"
              onPointerEnter={() => onHover(l.id)}
              onPointerLeave={() => onHover(null)}
              onFocus={() => onHover(l.id)}
              onBlur={() => onHover(null)}
              onClick={() => onSelect(l.id)}
              aria-label={`Inspect ${l.name}`}
              aria-pressed={selected === l.id}
              style={{ "--node-colour": l.color } as CSSProperties}
            >
              <span className="mono up-node-number">{l.index}</span>
              <span className="display up-node-name">{l.name}</span>
              <span className="mono up-node-alias">{l.alias}</span>
            </button>
          </div>
        ))}
      </div>

      {failed && (
        <div className="absolute inset-0 grid place-items-center px-8 text-center">
          <p className="mono max-w-[34ch] text-[11px] leading-[1.9] tracking-[0.2em] text-fog uppercase">
            this cross-section needs webgl
          </p>
        </div>
      )}

      <div className="pointer-events-none absolute inset-[18px]" aria-hidden>
        {(
          [
            "left-0 top-0 border-l border-t",
            "right-0 top-0 border-r border-t",
            "left-0 bottom-0 border-l border-b",
            "right-0 bottom-0 border-r border-b",
          ] as const
        ).map((c) => (
          <span key={c} className={`absolute h-5 w-5 border-fog/25 ${c}`} />
        ))}
      </div>
    </div>
  );
}
