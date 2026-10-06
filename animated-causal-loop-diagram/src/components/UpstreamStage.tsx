import { useEffect, useRef, useState, type CSSProperties } from "react";
import { UpstreamEngine, type UpstreamLabel } from "../three/upstream";
import { UPSTREAM_EDGES, UPSTREAM_NODES, type PulsePhase, type SourceFocus, type UpstreamId } from "../data/upstream";

interface Props {
  selected: UpstreamId | null;
  hovered: UpstreamId | null;
  focus: SourceFocus;
  feedback: boolean;
  playing: boolean;
  speed: number;
  pulseToken: number;
  resetToken: number;
  onSelect: (id: UpstreamId) => void;
  onHover: (id: UpstreamId | null) => void;
  onPhase: (phase: PulsePhase) => void;
}

export default function UpstreamStage(props: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<UpstreamEngine | null>(null);
  const labels = useRef(new Map<string, HTMLElement>());
  const callbacks = useRef(props);
  const lastPulse = useRef(props.pulseToken);
  const lastReset = useRef(props.resetToken);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  callbacks.current = props;

  useEffect(() => {
    if (!canvas.current) return;
    let instance: UpstreamEngine | null = null;
    setFailed(false);
    const paint = (frames: UpstreamLabel[]) => {
      for (const frame of frames) {
        const label = labels.current.get(frame.id);
        if (!label) continue;
        label.style.transform = `translate3d(${frame.x.toFixed(1)}px, ${frame.y.toFixed(1)}px, 0) translate(-50%, -50%)`;
        label.style.opacity = String(frame.opacity);
        label.style.visibility = frame.opacity <= 0.01 ? "hidden" : "visible";
      }
    };
    try {
      instance = new UpstreamEngine(canvas.current, {
        onSelect: (id) => callbacks.current.onSelect(id),
        onHover: (id) => callbacks.current.onHover(id),
        onPhase: (phase) => callbacks.current.onPhase(phase),
        onLabels: paint,
        onContextLost: () => setFailed(true),
      });
      engine.current = instance;
      const current = callbacks.current;
      instance.setPlaying(current.playing);
      instance.setSpeed(current.speed);
      instance.setFocus(current.focus);
      instance.setSelection(current.selected);
      instance.setFeedback(current.feedback);
      canvas.current.style.opacity = "1";
    } catch (error) {
      console.error("Unable to start the upstream scene", error);
      setFailed(true);
    }
    return () => {
      instance?.dispose();
      engine.current = null;
    };
  }, [retry]);

  useEffect(() => { engine.current?.setPlaying(props.playing); }, [props.playing]);
  useEffect(() => { engine.current?.setSpeed(props.speed); }, [props.speed]);
  useEffect(() => { engine.current?.setSelection(props.selected); }, [props.selected]);
  useEffect(() => { engine.current?.setHover(props.hovered); }, [props.hovered]);
  useEffect(() => { engine.current?.setFocus(props.focus); }, [props.focus]);
  useEffect(() => { engine.current?.setFeedback(props.feedback); }, [props.feedback]);
  useEffect(() => {
    if (props.pulseToken !== lastPulse.current) engine.current?.firePulse();
    lastPulse.current = props.pulseToken;
  }, [props.pulseToken]);
  useEffect(() => {
    if (props.resetToken !== lastReset.current) engine.current?.resetView();
    lastReset.current = props.resetToken;
  }, [props.resetToken]);

  const labelRef = (id: string) => (element: HTMLElement | null) => {
    if (element) labels.current.set(id, element);
    else labels.current.delete(id);
  };

  return (
    <div className="up-scene" aria-label="Six-node 3D causal diagram with shared upstream influences">
      <canvas
        ref={canvas}
        key={retry}
        className="up-canvas"
        aria-label="Drag to explore the 3D diagram. Use the labelled node buttons to inspect relationships."
      />
      <div className="up-labels" style={{ visibility: failed ? "hidden" : "visible" }}>
        {UPSTREAM_NODES.map((node) => (
          <div key={node.id} ref={labelRef(node.id)} className="up-projected" style={{ opacity: 0 }}>
            <button
              className={`up-node-label ${node.tier === "upstream" ? "up-node-label--source" : ""}`}
              onClick={() => props.onSelect(node.id)}
              onPointerEnter={() => props.onHover(node.id)}
              onPointerLeave={() => props.onHover(null)}
              onFocus={() => props.onHover(node.id)}
              onBlur={() => props.onHover(null)}
              aria-pressed={props.selected === node.id}
              aria-label={`Inspect ${node.name}, ${node.tier} node ${node.index}`}
              style={{ "--node-colour": node.color } as CSSProperties}
            >
              <span className="mono up-node-number">{node.index}</span>
              <span className="display up-node-name">{node.name}</span>
              <span className="mono up-node-alias">{node.alias}</span>
            </button>
          </div>
        ))}
        <span ref={labelRef("tier-up")} className="up-projected up-tier mono" style={{ opacity: 0 }}>
          Shared upstream influences
        </span>
        <span ref={labelRef("tier-down")} className="up-projected up-tier up-tier--small mono" style={{ opacity: 0 }}>
          Downstream / the original four-node loop
        </span>
        {UPSTREAM_EDGES.filter((edge) => edge.kind === "feedback" && edge.id !== "glucose-gut").map((edge) => (
          <span key={edge.id} ref={labelRef(edge.id)} className="up-projected up-edge-caption mono" style={{ opacity: 0 }}>
            {edge.verb}
          </span>
        ))}
        <span ref={labelRef("return")} className="up-projected up-return mono" style={{ opacity: 0 }}>
          <span className="display">R1</span> The original reinforcing loop
        </span>
      </div>
      {failed && (
        <div className="up-fallback">
          <p className="display text-2xl">The 3D scene needs WebGL.</p>
          <p className="text-sm text-fog">You can still explore every relationship below.</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            {UPSTREAM_NODES.map((node) => (
              <button key={node.id} onClick={() => props.onSelect(node.id)} className="border border-bone/20 p-2 text-sm hover:border-smoulder">
                {node.index} / {node.name}
              </button>
            ))}
          </div>
          <button className="mono mt-5 text-xs text-smoulder underline underline-offset-4" onClick={() => setRetry((value) => value + 1)}>
            Retry 3D
          </button>
        </div>
      )}
    </div>
  );
}