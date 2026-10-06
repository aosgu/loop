interface Props {
  playing: boolean;
  onPlaying: (v: boolean) => void;
  speed: number;
  onSpeed: (v: number) => void;
  onPulse: () => void;
  onReset?: () => void;
  pulseLabel?: string;
}

function Icon({ name }: { name: "play" | "pause" | "bolt" | "orbit" }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg viewBox="0 0 20 20" className="h-[15px] w-[15px]" aria-hidden>
      {name === "play" && <path d="M6.5 4.2 L15 10 L6.5 15.8 Z" {...common} />}
      {name === "pause" && <path d="M7 4.6 V15.4 M13 4.6 V15.4" {...common} />}
      {name === "bolt" && (
        <path d="M11 2.6 L4.6 11 h4.2 L8.4 17.4 L15.4 8.6 h-4.3 Z" {...common} />
      )}
      {name === "orbit" && (
        <>
          <circle cx="10" cy="10" r="3.1" {...common} />
          <ellipse cx="10" cy="10" rx="8" ry="3.6" {...common} transform="rotate(-24 10 10)" />
        </>
      )}
    </svg>
  );
}

const btn =
  "group relative inline-flex items-center gap-2 rounded-full border px-3.5 py-2 mono text-[10px] uppercase tracking-[0.2em] transition-all duration-300 hover:-translate-y-[1px]";

export default function Transport({
  playing,
  onPlaying,
  speed,
  onSpeed,
  onPulse,
  onReset,
  pulseLabel = "fire pulse",
}: Props) {
  const line = "border-bone/18 text-bone/80 hover:border-smoulder bg-void/50 backdrop-blur-[6px]";
  const solid = "bg-bone text-void border-bone";

  return (
    <div className="pointer-events-auto flex flex-wrap items-center gap-2">
      <button
        className={`${btn} ${solid}`}
        onClick={() => onPlaying(!playing)}
        aria-label={playing ? "Pause animation" : "Play animation"}
      >
        <Icon name={playing ? "pause" : "play"} />
        {playing ? "running" : "paused"}
      </button>

      <div
        className={`flex items-center gap-0.5 rounded-full border p-1 ${line}`}
        role="group"
        aria-label="Flow speed"
      >
        {[0.5, 1, 2].map((s) => (
          <button
            key={s}
            onClick={() => onSpeed(s)}
            className={`mono rounded-full px-2.5 py-1 text-[10px] tracking-[0.12em] transition-colors duration-300 ${
              speed === s ? "bg-smoulder text-void" : "opacity-55 hover:opacity-100"
            }`}
          >
            {s}×
          </button>
        ))}
      </div>

      <button className={`${btn} ${line}`} onClick={onPulse}>
        <Icon name="bolt" />
        {pulseLabel}
      </button>

      {onReset && (
        <button className={`${btn} ${line}`} onClick={onReset}>
          <Icon name="orbit" />
          reset view
        </button>
      )}
    </div>
  );
}
