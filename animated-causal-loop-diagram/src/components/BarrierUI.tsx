import { DIETS, LAYERS, type Layer } from "../data/barrier";
import type { BarrierStats } from "../three/barrier";

/* ---------------- diet control ---------------- */

export function DietDial({
  diet,
  setDiet,
}: {
  diet: number;
  setDiet: (v: number) => void;
}) {
  const active = DIETS.reduce((best, d) =>
    Math.abs(d.value - diet) < Math.abs(best.value - diet) ? d : best,
  );
  return (
    <div
      className="pointer-events-auto w-full max-w-[22rem] rounded-[2px] border border-bone/12 bg-void/70 p-4 backdrop-blur-md"
      style={{ boxShadow: "var(--stage-shadow)" }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className="mono text-[9px] tracking-[0.3em] text-fog uppercase">what you eat</p>
        <p className="mono tnum text-[9px] tracking-[0.2em] text-smoulder uppercase">
          load {Math.round(diet * 100)}%
        </p>
      </div>

      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(diet * 100)}
        onChange={(e) => setDiet(Number(e.target.value) / 100)}
        aria-label="Dietary load: fibre-rich to ultra-processed"
        className="diet-range mt-3 w-full"
        style={{ ["--p" as string]: `${diet * 100}%` }}
      />

      <div className="mt-2 flex gap-1.5">
        {DIETS.map((d) => {
          const on = active.id === d.id;
          return (
            <button
              key={d.id}
              onClick={() => setDiet(d.value)}
              className={`mono flex-1 rounded-[2px] border px-2 py-1.5 text-[8.5px] tracking-[0.14em] uppercase transition-all duration-300 ${
                on
                  ? "border-smoulder bg-smoulder/15 text-smoulder"
                  : "border-bone/12 text-fog/70 hover:border-bone/30 hover:text-bone"
              }`}
            >
              {d.label}
            </button>
          );
        })}
      </div>

      <p
        key={active.id}
        className="card-in mt-3 hidden text-[11.5px] leading-[1.6] text-bone/65 sm:block"
      >
        {active.note}
      </p>

      <style>{`
        .diet-range { -webkit-appearance: none; appearance: none; height: 22px; background: transparent; cursor: pointer; }
        .diet-range::-webkit-slider-runnable-track {
          height: 4px; border-radius: 99px;
          background: linear-gradient(90deg, #4fd0ae 0%, #ffe07a var(--p), rgba(242,239,228,.13) var(--p));
        }
        .diet-range::-moz-range-track {
          height: 4px; border-radius: 99px;
          background: linear-gradient(90deg, #4fd0ae 0%, #ffe07a var(--p), rgba(242,239,228,.13) var(--p));
        }
        .diet-range::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 15px; height: 15px; margin-top: -5.5px; border-radius: 99px;
          background: #f2efe4; border: 2px solid #ff9c2e;
          box-shadow: 0 0 14px rgba(255,156,46,.65); transition: transform .2s;
        }
        .diet-range::-moz-range-thumb {
          width: 13px; height: 13px; border-radius: 99px;
          background: #f2efe4; border: 2px solid #ff9c2e;
          box-shadow: 0 0 14px rgba(255,156,46,.65);
        }
        .diet-range:hover::-webkit-slider-thumb { transform: scale(1.18); }
      `}</style>
    </div>
  );
}

/* ---------------- live readouts ---------------- */

function Meter({
  label,
  value,
  unit,
  pct,
  color,
  invert,
}: {
  label: string;
  value: string;
  unit?: string;
  pct: number;
  color: string;
  invert?: boolean;
}) {
  return (
    <div className="w-[8.5rem]">
      <div className="flex items-baseline justify-between gap-2">
        <span className="mono text-[8.5px] tracking-[0.2em] text-fog/70 uppercase">{label}</span>
        <span className="mono tnum text-[12px] leading-none" style={{ color }}>
          {value}
          {unit && <span className="text-[8px] opacity-60"> {unit}</span>}
        </span>
      </div>
      <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full bg-bone/10">
        <span
          className="block h-full rounded-full transition-[width] duration-300 ease-out"
          style={{
            width: `${Math.max(2, Math.min(100, invert ? 100 - pct : pct))}%`,
            background: color,
            boxShadow: `0 0 10px ${color}`,
          }}
        />
      </div>
    </div>
  );
}

export function Readout({ stats }: { stats: BarrierStats }) {
  return (
    <div className="pointer-events-none flex flex-wrap items-start gap-x-5 gap-y-3 rounded-[2px] border border-bone/10 bg-void/55 px-4 py-3 backdrop-blur-md">
      <Meter
        label="barrier integrity"
        value={String(stats.integrity)}
        unit="%"
        pct={stats.integrity}
        color="#4fd0ae"
      />
      <Meter
        label="LPS in blood"
        value={stats.flux.toFixed(1)}
        pct={stats.flux * 9}
        color="#ffe07a"
      />
      <Meter
        label="cytokine tone"
        value={String(stats.cytokine)}
        unit="%"
        pct={stats.cytokine}
        color="#ff7d5c"
      />
      <div className="w-[6.5rem]">
        <span className="mono block text-[8.5px] tracking-[0.2em] text-fog/70 uppercase">
          crossings
        </span>
        <span className="mono tnum mt-1 block text-[12px] text-bone/85">{stats.crossed}</span>
      </div>
    </div>
  );
}

/* ---------------- layer dossier ---------------- */

export function LayerCard({
  layer,
  onClose,
}: {
  layer: Layer;
  onClose: () => void;
}) {
  return (
    <aside
      key={layer.id}
      className="card-in pointer-events-auto relative w-full overflow-hidden rounded-[2px] border border-bone/12 bg-void/85 backdrop-blur-md"
      style={{ boxShadow: "var(--stage-shadow)" }}
    >
      <span
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: `linear-gradient(90deg, ${layer.color}, transparent 78%)` }}
      />
      <div className="flex items-start gap-4 p-5">
        <span
          className="display text-[40px] leading-none font-black"
          style={{ color: layer.color }}
        >
          {layer.index}
        </span>
        <div className="min-w-0 flex-1">
          <p className="mono text-[9px] tracking-[0.26em] text-fog uppercase">{layer.alias}</p>
          <h3 className="display mt-1 text-[25px] leading-[0.98] font-bold">{layer.name}</h3>
          <p
            className="display mt-0.5 text-[15px] italic"
            style={{ color: layer.color, fontVariationSettings: '"SOFT" 100, "WONK" 1' }}
          >
            {layer.role}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          className="mono grid h-7 w-7 shrink-0 place-items-center rounded-full border border-bone/20 text-[13px] text-bone/70 transition-all duration-300 hover:rotate-90 hover:border-smoulder hover:text-smoulder"
        >
          ✕
        </button>
      </div>
      <div className="px-5 pb-5">
        <p className="text-[13px] leading-[1.65] text-bone/75">{layer.body}</p>
        <dl className="mt-4 grid gap-1.5">
          {layer.facts.map((f) => (
            <div key={f.k} className="flex items-baseline gap-3 border-t border-bone/8 pt-1.5">
              <dt className="mono w-[7.5rem] shrink-0 text-[8.5px] tracking-[0.18em] text-fog/70 uppercase">
                {f.k}
              </dt>
              <dd className="mono text-[10.5px] tracking-[0.06em] text-bone/80">{f.v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </aside>
  );
}

/* ---------------- layer index ---------------- */

export function LayerIndex({
  hovered,
  onHover,
  onSelect,
}: {
  hovered: string | null;
  onHover: (id: Layer["id"] | null) => void;
  onSelect: (id: Layer["id"]) => void;
}) {
  return (
    <ul className="flex flex-col items-start gap-1">
      {LAYERS.map((l) => {
        const hot = hovered === l.id;
        return (
          <li key={l.id}>
            <button
              onPointerEnter={() => onHover(l.id)}
              onPointerLeave={() => onHover(null)}
              onClick={() => onSelect(l.id)}
              className="pointer-events-auto group flex items-center gap-2.5 rounded-full border bg-void/55 py-1.5 pr-4 pl-3 backdrop-blur-[6px] transition-all duration-300 hover:translate-x-[3px]"
              style={{ borderColor: hot ? l.color : "var(--line)" }}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full transition-transform duration-300 group-hover:scale-125"
                style={{ background: l.color }}
              />
              <span className="mono text-[9px] tracking-[0.2em] text-fog/60 uppercase">
                {l.index}
              </span>
              <span
                className="display text-[14px] font-semibold whitespace-nowrap transition-colors duration-300"
                style={{ color: hot ? l.color : "var(--page-fg)" }}
              >
                {l.name}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
