import { useState, type CSSProperties } from "react";
import { Reveal } from "./Reveal";
import { SOURCES, SOURCE_EXPLANATIONS, type SourceId, type UpstreamId } from "../data/upstream";

export default function UpstreamSections({ onExplore }: { onExplore: (id: UpstreamId) => void }) {
  const [source, setSource] = useState<SourceId>("lifestyle");
  const routes = SOURCE_EXPLANATIONS[source];
  const selected = SOURCES.find((item) => item.id === source)!;
  return (
    <>
      <section className="up-reading">
        <Reveal className="up-reading-header">
          <div>
            <p className="mono up-eyebrow">Reading the expanded map</p>
            <h2 className="display up-section-heading">One influence.<br /><em>Two entry points.</em></h2>
          </div>
          <p className="up-reading-summary">
            Gut and insulin problems can share upstream causes. Their connection is not only a chain
            from one to the other: daily conditions and inherited susceptibility can affect both at once.
          </p>
        </Reveal>

        <div className="up-pathway-reader">
          <div className="up-reader-sources" role="group" aria-label="Compare shared influences">
            {SOURCES.map((node) => (
              <button
                key={node.id}
                aria-pressed={source === node.id}
                onClick={() => setSource(node.id as SourceId)}
                style={{ "--source-colour": node.color } as CSSProperties}
              >
                <span className="mono text-[10px] opacity-60">{node.index} /</span>
                <span className="display text-[23px] font-semibold">{node.name}</span>
                <svg width="20" height="18" viewBox="0 0 20 18" fill="none" aria-hidden><path d="M2 9h15m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.2" /></svg>
              </button>
            ))}
            <p className="mt-5 max-w-[31ch] text-[12px] leading-[1.75] text-fog">
              Each upper node has a route to the gut and another to insulin resistance. These are
              grouped pathways, not a claim that one mechanism explains everyone.
            </p>
          </div>

          <div className="up-route-copy card-in" key={source} aria-live="polite">
            <article>
              <p className="mono up-small text-coil">Into the gut</p>
              <h3 className="display mt-2 text-[27px] font-semibold">The intestinal environment.</h3>
              <p>{routes.gut}</p>
            </article>
            <article>
              <p className="mono up-small text-lock">Into insulin sensitivity</p>
              <h3 className="display mt-2 text-[27px] font-semibold">The metabolic response.</h3>
              <p>{routes.insulin}</p>
            </article>
            <button className="up-explore-link mono" onClick={() => onExplore(source)} style={{ color: selected.color }}>
              Trace {source === "lifestyle" ? "lifestyle" : "genetic susceptibility"} in 3D
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M4 12 12 4M4 4h8v8" stroke="currentColor" strokeWidth="1.2" /></svg>
            </button>
          </div>
        </div>
      </section>

      <section className="up-takeaway">
        <Reveal className="up-takeaway-inner">
          <span className="display up-takeaway-number" aria-hidden>IV</span>
          <div>
            <p className="mono up-eyebrow">What changes when you look upstream</p>
            <h2 className="display up-section-heading">A tendency.<br /><em>Not a destiny.</em></h2>
            <p className="up-takeaway-copy">
              Shared risk does not mean a fixed outcome. Inherited susceptibility interacts with the
              environment, while supportive changes in activity, nutrition and sleep can affect more
              than one part of the system. The original feedback loop still matters, but it is not
              the whole story.
            </p>
            <p className="mt-5 max-w-[63ch] text-[12px] leading-[1.75] text-fog/65">
              This is a conceptual teaching diagram, not a personalised risk model. Pulse brightness,
              timing and arrow size are illustrative. The genetic links group diverse mechanisms;
              host-genetic effects on the microbiome are context-dependent and often modest.
              Upstream arrows are unsigned: different exposures or inherited variants can raise
              or lower susceptibility.
            </p>
            <div className="up-references">
              <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC5004229/" target="_blank" rel="noopener noreferrer">
                Read: host genetics and the microbiome
              </a>
              <a href="https://www.niddk.nih.gov/health-information/professionals/diabetes-discoveries-practice/the-impact-of-poor-sleep-on-type-2-diabetes" target="_blank" rel="noopener noreferrer">
                Read: sleep and insulin sensitivity
              </a>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}