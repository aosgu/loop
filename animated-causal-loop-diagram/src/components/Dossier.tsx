import { EDGES, NODES, type LoopNode, type NodeId } from "../data/loop";

interface Props {
  node: LoopNode;
  onClose: () => void;
  onJump: (id: NodeId) => void;
}

export default function Dossier({ node, onClose, onJump }: Props) {
  const out = EDGES.find((e) => e.from === node.id)!;
  const target = NODES.find((n) => n.id === out.to)!;
  const accent = node.glow;

  return (
    <aside
      key={node.id}
      className="card-in pointer-events-auto relative w-full overflow-hidden rounded-[2px] border border-bone/12 bg-void/82 backdrop-blur-md"
      style={{ boxShadow: "var(--stage-shadow)" }}
    >
      <span
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: `linear-gradient(90deg, ${accent}, transparent 78%)` }}
      />
      <div className="flex items-start gap-4 p-5 sm:p-6">
        <div className="flex flex-col items-center gap-1">
          <span
            className="display text-[42px] leading-none font-black sm:text-[52px]"
            style={{ color: accent }}
          >
            {node.index}
          </span>
          <span className="mono text-[8px] tracking-[0.24em] text-fog uppercase">node</span>
        </div>

        <div className="min-w-0 flex-1">
          <p className="mono text-[9.5px] tracking-[0.28em] text-fog uppercase">{node.full}</p>
          <h3 className="display mt-1 text-[26px] leading-[0.95] font-bold text-bone sm:text-[30px]">
            {node.name}
          </h3>
          <p
            className="display mt-0.5 text-[17px] italic"
            style={{ color: accent, fontVariationSettings: '"SOFT" 100, "WONK" 1' }}
          >
            “{node.alias}” — {node.role}
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
        <p className="text-[13.5px] leading-[1.62] text-bone/75">{node.body}</p>

        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span
            className="mono rounded-full border px-2.5 py-1 text-[9px] tracking-[0.18em] uppercase"
            style={{ borderColor: accent, color: accent }}
          >
            {node.signal}
          </span>
          {node.markers.map((m) => (
            <span
              key={m.label}
              className="mono inline-flex items-center gap-1 rounded-full bg-bone/8 px-2.5 py-1 text-[9px] tracking-[0.14em] text-bone/70 uppercase"
            >
              {m.label}
              <span style={{ color: m.dir === "up" ? accent : "#4fd0ae" }}>
                {m.dir === "up" ? "▲" : "▼"}
              </span>
            </span>
          ))}
        </div>

        <button
          onClick={() => onJump(target.id)}
          className="group mt-4 flex w-full items-center gap-3 rounded-[2px] border border-bone/10 px-3 py-2.5 text-left transition-all duration-300 hover:border-bone/30 hover:bg-bone/5"
        >
          <span className="mono text-[9px] tracking-[0.24em] text-fog/70 uppercase">
            then → {target.index}
          </span>
          <span className="display flex-1 text-[15px] font-semibold text-bone">{target.name}</span>
          <span
            className="mono text-[9.5px] tracking-[0.2em] uppercase"
            style={{ color: target.glow }}
          >
            {out.verb} {out.polarity}
          </span>
          <span
            className="text-[13px] transition-transform duration-300 group-hover:translate-x-1"
            style={{ color: accent }}
          >
            →
          </span>
        </button>
      </div>
    </aside>
  );
}
