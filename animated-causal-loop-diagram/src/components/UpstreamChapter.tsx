import { useEffect, useState } from "react";
import UpstreamStage from "./UpstreamStage";
import Transport from "./Transport";
import {
  PHASE_COPY, UPSTREAM_EDGES, isSource, upstreamNode,
  type PulsePhase, type SourceFocus, type UpstreamId,
} from "../data/upstream";

interface Props {
  selected: UpstreamId | null;
  onSelect: (id: UpstreamId | null) => void;
  playing: boolean;
  onPlaying: (playing: boolean) => void;
  speed: number;
  onSpeed: (speed: number) => void;
  pulseToken: number;
  resetToken: number;
  onPulse: () => void;
  onReset: () => void;
}

function Arrow({ reverse = false }: { reverse?: boolean }) {
  return (
    <svg width="19" height="12" viewBox="0 0 19 12" fill="none" aria-hidden style={{ transform: reverse ? "rotate(180deg)" : undefined }}>
      <path d="M1 6h16m-5-4 5 4-5 4" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function Inspector({ id, onSelect }: { id: UpstreamId; onSelect: Props["onSelect"] }) {
  const node = upstreamNode(id);
  const incoming = UPSTREAM_EDGES.filter((edge) => edge.to === id);
  const outgoing = UPSTREAM_EDGES.filter((edge) => edge.from === id);
  return (
    <aside className="up-inspector card-in" key={id} aria-label={`${node.name} relationships`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="mono up-small" style={{ color: node.color }}>{node.index} / {node.tier}</p>
          <h2 className="display mt-2 text-[27px] font-semibold">{node.name}</h2>
        </div>
        <button className="up-close" onClick={() => onSelect(null)} aria-label="Close node details">
          <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden><path d="m3 3 9 9m0-9-9 9" stroke="currentColor" strokeWidth="1.2" /></svg>
        </button>
      </div>
      <p className="mt-3 text-[12.5px] leading-[1.65] text-bone/75">{node.body}</p>
      <div className="up-relations">
        <p className="mono up-small text-fog/65">Incoming influences</p>
        {incoming.length === 0 ? (
          <p className="mt-2 text-[11px] leading-relaxed text-fog">A shared origin in this simplified map.</p>
        ) : incoming.map((edge) => (
          <button key={edge.id} onClick={() => onSelect(edge.from)} title={edge.explanation}>
            <span style={{ color: upstreamNode(edge.from).color }}>{upstreamNode(edge.from).name}</span>
            <Arrow />
          </button>
        ))}
        <p className="mono up-small mt-4 text-fog/65">Outgoing influences</p>
        {outgoing.map((edge) => (
          <button key={edge.id} onClick={() => onSelect(edge.to)} title={edge.explanation}>
            <Arrow /><span style={{ color: upstreamNode(edge.to).color }}>{upstreamNode(edge.to).name}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}

export default function UpstreamChapter(props: Props) {
  const [hovered, setHovered] = useState<UpstreamId | null>(null);
  const [focus, setFocus] = useState<SourceFocus>("both");
  const [feedback, setFeedback] = useState(true);
  const [phase, setPhase] = useState<PulsePhase>("ready");

  useEffect(() => {
    if (props.selected && isSource(props.selected)) setFocus(props.selected);
    else if (props.selected) setFocus("both");
  }, [props.selected]);

  const chooseFocus = (value: SourceFocus) => {
    setFocus(value);
    setHovered(null);
    props.onSelect(null);
  };

  return (
    <section className="up-hero stage-bg grain" aria-labelledby="upstream-heading">
      <UpstreamStage
        selected={props.selected}
        hovered={hovered}
        onSelect={props.onSelect}
        onHover={setHovered}
        focus={focus}
        feedback={feedback}
        playing={props.playing}
        speed={props.speed}
        pulseToken={props.pulseToken}
        resetToken={props.resetToken}
        onPhase={setPhase}
      />

      <div className="up-sidebar">
        <header className="up-intro card-in">
          <p className="mono up-eyebrow">Chapter IV / The shared upstream</p>
          <h1 id="upstream-heading" className="display up-heading">
            The loop has<br /><em>shared roots.</em>
          </h1>
          <p className="up-deck">
            Lifestyle and genetic susceptibility can influence both the gut and insulin sensitivity.
            Look upstream, not only around the loop.
          </p>
        </header>

        <div className="up-source-control">
          <p className="mono up-small mb-3 text-fog/70" id="source-label">Trace a shared source</p>
          <div className="up-source-buttons" role="group" aria-labelledby="source-label">
            {([ ["both", "Both roots"], ["lifestyle", "Lifestyle"], ["genetics", "Genetics"] ] as const).map(([id, name]) => (
              <button key={id} aria-pressed={focus === id} onClick={() => chooseFocus(id)}>{name}</button>
            ))}
          </div>
          <label className="up-feedback-switch">
            <input type="checkbox" checked={feedback} onChange={(event) => setFeedback(event.target.checked)} />
            <span className="up-switch-track" aria-hidden><span /></span>
            <span>Show the original feedback loop</span>
          </label>
        </div>

        <div className="up-details">
          {props.selected ? (
            <Inspector id={props.selected} onSelect={props.onSelect} />
          ) : (
            <div className="up-trace-guide">
              <div className="up-trace-mark" aria-hidden>
                <svg width="58" height="49" viewBox="0 0 58 49" fill="none">
                  <path d="M29 8v10c0 10-17 7-17 19m17-19c0 10 17 7 17 19" stroke="currentColor" strokeWidth="1.1" />
                  <circle cx="29" cy="7" r="4" fill="currentColor" />
                  <circle cx="12" cy="39" r="3.5" stroke="currentColor" />
                  <circle cx="46" cy="39" r="3.5" stroke="currentColor" />
                </svg>
              </div>
              <p className="mono up-small text-fog/60">Cause / parallel pathways / feedback</p>
              <div role="status" aria-live="polite" aria-atomic="true" className="up-phase-copy">
                <h2 key={phase} className="display card-in mt-3 text-[24px] font-semibold">{PHASE_COPY[phase].title}</h2>
                <p className="mt-2 text-[12.5px] leading-[1.65] text-fog">{PHASE_COPY[phase].body}</p>
              </div>
              <p className="up-model-note">Genetics is susceptibility, not destiny.</p>
            </div>
          )}
        </div>
        <div className="up-sidebar-footer">
          <span className="mono up-trace-status" aria-hidden>
            <span className={phase === "ready" ? "" : "is-tracing"} />
            {phase === "ready" ? "Ready to trace" : PHASE_COPY[phase].title}
          </span>
          <Transport
            playing={props.playing}
            onPlaying={props.onPlaying}
            speed={props.speed}
            onSpeed={props.onSpeed}
            onPulse={props.onPulse}
            pulseLabel="fire pulse"
            onReset={() => { setHovered(null); props.onSelect(null); props.onReset(); }}
          />
          <p className="mono up-small mt-3 text-fog/55">Drag to explore / select any node</p>
        </div>
      </div>
    </section>
  );
}