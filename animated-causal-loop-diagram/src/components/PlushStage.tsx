import { useEffect, useRef, useState, type CSSProperties } from "react";
import { LoopEngine, type LabelFrame } from "../three/engine";
import { EDGES, NODES, type NodeId } from "../data/loop";

interface Props {
  selected: NodeId | null;
  hovered: NodeId | null;
  onSelect: (id: NodeId) => void;
  onHover: (id: NodeId | null) => void;
  playing: boolean;
  speed: number;
  pulseToken: number;
  resetToken: number;
  dimLabels: boolean;
}

export default function PlushStage({
  selected,
  hovered,
  onSelect,
  onHover,
  playing,
  speed,
  pulseToken,
  resetToken,
  dimLabels,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<LoopEngine | null>(null);
  const labelsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const selectedRef = useRef<NodeId | null>(selected);
  const cbRef = useRef({ onSelect, onHover });
  const [failed, setFailed] = useState(false);
  const lastPulse = useRef(pulseToken);
  const lastReset = useRef(resetToken);

  cbRef.current = { onSelect, onHover };
  selectedRef.current = selected;

  useEffect(() => {
    if (!canvasRef.current || !wrapRef.current) return;
    let engine: LoopEngine | null = null;
    try {
      engine = new LoopEngine(canvasRef.current, {
        onHover: (id) => cbRef.current.onHover(id),
        onSelect: (id) => cbRef.current.onSelect(id),
        onLabels: (frames) => paintLabels(frames),
        onReady: () => {
          const c = canvasRef.current;
          if (c) c.style.opacity = "1";
        },
      });
      engineRef.current = engine;
    } catch (err) {
      console.error("stage failed to start", err);
      setFailed(true);
    }
    const built = engine;
    return () => {
      built?.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engineRef.current?.setPlaying(playing);
  }, [playing]);
  useEffect(() => {
    engineRef.current?.setSpeed(speed);
  }, [speed]);
  useEffect(() => {
    if (pulseToken !== lastPulse.current) {
      engineRef.current?.firePulse(selected ? NODES.findIndex((n) => n.id === selected) : 0);
    }
    lastPulse.current = pulseToken;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pulseToken]);
  useEffect(() => {
    if (selected) engineRef.current?.select(selected);
    else engineRef.current?.release();
  }, [selected]);
  useEffect(() => {
    engineRef.current?.setHoverExternal(hovered);
  }, [hovered]);
  useEffect(() => {
    if (resetToken !== lastReset.current) engineRef.current?.resetView();
    lastReset.current = resetToken;
  }, [resetToken]);

  function paintLabels(frames: LabelFrame[]) {
    for (const f of frames) {
      const el = labelsRef.current.get(f.key);
      if (!el) continue;
      const s = Math.max(0.66, Math.min(1.06, 1.14 - (f.depth - 6.5) * 0.055));
      el.style.transform = `translate3d(${f.x.toFixed(1)}px, ${f.y.toFixed(1)}px, 0) translate(-50%, -50%) scale(${s.toFixed(3)})`;
      const isSel = f.kind === "node" && selectedRef.current === f.key;
      const alpha = f.visible ? (dimLabels && !isSel && f.kind === "edge" ? 0.25 : 1) : 0;
      el.style.opacity = String(alpha);
      el.classList.toggle("is-sel", isSel);
    }
  }

  return (
    <div ref={wrapRef} className="absolute inset-0 overflow-hidden">
      <canvas
        ref={canvasRef}
        className="h-full w-full cursor-grab opacity-0 transition-opacity duration-1000 active:cursor-grabbing"
        style={{ opacity: 0 }}
      />

      {/* projected label layer */}
      <div className="pointer-events-none absolute inset-0">
        {NODES.map((n) => (
          <div
            key={n.id}
            ref={(el) => {
              if (el) labelsRef.current.set(n.id, el);
            }}
            className="node-label"
            style={{ opacity: 0 }}
          >
            <button
              className="up-node-label"
              onPointerEnter={() => onHover(n.id)}
              onPointerLeave={() => onHover(null)}
              onFocus={() => onHover(n.id)}
              onBlur={() => onHover(null)}
              onClick={() => onSelect(n.id)}
              aria-label={`Inspect ${n.name}`}
              aria-pressed={selected === n.id}
              style={{ "--node-colour": n.color2 } as CSSProperties}
            >
              <span className="mono up-node-number">{n.index}</span>
              <span className="display up-node-name">{n.name}</span>
              <span className="mono up-node-alias">{n.alias}</span>
            </button>
          </div>
        ))}
        {EDGES.map((e, i) => (
          <div
            key={`e-${i}`}
            ref={(el) => {
              if (el) labelsRef.current.set(`e-${i}`, el);
            }}
            className="node-label"
            style={{ opacity: 0 }}
          >
            <span className="mono up-edge-caption" style={{ color: nodeGlow(e.to) }}>
              {e.verb} {e.polarity}
            </span>
          </div>
        ))}
      </div>

      {failed && (
        <div className="absolute inset-0 grid place-items-center px-8 text-center">
          <p className="mono max-w-[34ch] text-[11px] leading-[1.9] tracking-[0.2em] text-fog uppercase">
            this vitrine needs webgl — select a body on the left to explore the loop
          </p>
        </div>
      )}

      {/* instrument corner marks */}
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

function nodeGlow(id: NodeId) {
  return NODES.find((n) => n.id === id)!.glow;
}
