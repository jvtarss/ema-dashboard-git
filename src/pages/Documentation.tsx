import { BookOpen, ExternalLink, Tag, Microscope } from 'lucide-react';
import { REFERENCES_DB } from '../utils/referencesData';

export default function Documentation() {
  const selectedStudies = ["QIN-2021", "TOLENTINO-2022", "LIN-2018"];

  return (
    <div className="animate-fade-in mx-auto pb-5 px-4" style={{ maxWidth: '60rem' }}>
      
      {/* 1. Overview */}
      <section id="overview" className="mb-5 pt-5">
        <h2 className="h4 font-display text-ema-primary mb-4 fw-bold">1. Overview</h2>
        <p className="text-ema-text lh-lg fs-5">
          The Eucalyptus microRNA Archive (EMA) is a comprehensive repository designed to integrate microRNA evidence across multiple independent studies in <em>Eucalyptus grandis</em>. By consolidating sequencing data and biological observations, EMA provides a unified landscape for the interpretation of microRNA-mediated regulation. The resource focuses on bridging the gap between high-throughput sequencing signals and biological function, offering researchers a curated set of genomic loci, expression profiles, and predicted regulatory targets.
        </p>
      </section>

      {/* 2. Release metrics */}
      <section id="metrics" className="mb-5">
        <h2 className="h4 font-display text-ema-primary mb-4 fw-bold">2. Release metrics</h2>
        <div className="row g-4">
          {[
            { label: "Total miRNAs", value: "91" },
            { label: "Known", value: "27" },
            { label: "Novel", value: "64" },
            { label: "Distinct family groups", value: "12" },
            { label: "Validated target interactions", value: "1590" }
          ].map((m, i) => (
            <div key={i} className="col-12 col-md-4">
              <div className="p-4 border rounded-4 bg-white shadow-sm h-100 d-flex flex-column align-items-center justify-content-center text-center">
                <span className="small text-ema-muted fw-bold text-uppercase d-block mb-2" style={{ letterSpacing: '0.05em' }}>{m.label}</span>
                <span className="h1 fw-bold mb-0 text-ema-text">{m.value}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Datasets */}
      <section id="datasets" className="mb-5">
        <h2 className="h4 font-display text-ema-primary mb-4 fw-bold">3. Datasets</h2>
        <div className="d-flex flex-column gap-4">
          {selectedStudies.map((studyKey) => {
            const study = REFERENCES_DB[studyKey];
            if (!study) return null;
            return (
              <div key={studyKey} className="card border shadow-sm overflow-hidden rounded-4">
                <div className="card-header bg-light p-3 d-flex justify-content-between align-items-start border-bottom">
                  <div className="d-flex align-items-center gap-3">
                    <div className="p-2 bg-info-subtle text-info rounded-3"><BookOpen size={20}/></div>
                    <div>
                      <h4 className="h6 fw-bold text-ema-text mb-0">{studyKey}</h4>
                      <div className="d-flex gap-2 mt-1">
                        {study.tags.tissues.slice(0, 2).map(t => (
                          <span key={t} className="badge bg-secondary-subtle text-secondary border px-2 py-1" style={{ fontSize: '0.6rem' }}>{t}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <a href={study.doi} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-primary rounded-3 d-flex align-items-center fw-bold transition-all">
                    Read paper <ExternalLink size={12} className="ms-2"/>
                  </a>
                </div>
                <div className="card-body p-4">
                  <p className="text-secondary fst-italic border-start border-3 border-ema-primary ps-3 small mb-0 lh-base">
                    "{study.citation}"
                  </p>
                  <div className="mt-4 row g-3">
                    <div className="col-md-6 d-flex align-items-start gap-2">
                       <Microscope size={16} className="text-ema-primary mt-1 flex-shrink-0"/>
                       <div>
                         <span className="d-block small fw-bold text-ema-muted text-uppercase">Tissues</span>
                         <span className="small text-ema-text">{study.tags.tissues.join(", ")}</span>
                       </div>
                    </div>
                    <div className="col-md-6 d-flex align-items-start gap-2">
                       <Tag size={16} className="text-ema-primary mt-1 flex-shrink-0"/>
                       <div>
                         <span className="d-block small fw-bold text-ema-muted text-uppercase">Conditions</span>
                         <span className="small text-ema-text">{study.tags.conditions.join(", ")}</span>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Workflow summary */}
      <section id="workflow" className="mb-5">
        <h2 className="h4 font-display text-ema-primary mb-4 fw-bold">4. Workflow summary</h2>
        <div className="text-ema-text lh-lg">
          <p className="mb-4">
            The sequencing datasets were processed independently using mirdeep2 as a standardized computational pipeline to ensure the accurate detection of microRNA signals. The initial stages involved high-quality read mapping against the <em>Eucalyptus grandis</em> v2.0 reference genome, followed by the identification of microRNA candidates based on canonical structural and sequencing features.
          </p>
          <p className="mb-4">
            After the per-study discovery phase, a unified integration step was performed. Candidate sequences were compared across all datasets to identify consistent signals and resolve redundancies. This approach allows for a robust quantification of microRNA abundance across various tissues and experimental conditions.
          </p>
          <p>
            Functional analysis was conducted through the prediction of regulatory targets and their subsequent annotation. Regulatory interactions were established by linking microRNAs with genomic transcripts, providing a comprehensive view of the potential biological impact of each identified microRNA.
          </p>
        </div>
      </section>

      {/* 5. evidence integration and filtering */}
      <section id="curation" className="mb-5">
        <h2 className="h4 font-display text-ema-primary mb-4 fw-bold">5. Evidence integration and filtering</h2>
        <div className="text-ema-text lh-lg">
          <p className="mb-4">
            Biological evidence was integrated by systematically comparing candidate microRNAs across independent datasets. Consistency was evaluated based on the similarity of mature sequences, agreement in genomic locations, and recurrence across different experimental contexts. This cross-study validation ensures that the repository prioritizes reproducible biological signals.
          </p>
          <div className="p-4 bg-light border rounded-4 mb-4">
             <p className="mb-0 fw-bold text-ema-primary">Priority is given to signals that show:</p>
             <ul className="mt-2 mb-0">
               <li>Exact or highly similar mature sequence matches across studies.</li>
               <li>Consistent genomic positioning within the Eucalyptus reference genome.</li>
               <li>Strong secondary structure support and experimental read distribution.</li>
             </ul>
          </div>
          <p>
            Only signals supported by strong experimental evidence were retained for visualization in the dashboard. Low-confidence detections or inconsistent signals were excluded through a rigorous quality control process, ensuring that the archive presents a reliable set of microRNA loci for downstream biological research.
          </p>
        </div>
      </section>

      {/* 6. Availability */}
      <section id="availability" className="mb-5 text-center py-5 border-top">
        <h2 className="h4 font-display text-ema-primary mb-4 fw-bold">6. Availability</h2>
        <p className="text-ema-text mb-4">
          The EMA resource and the supporting computational framework are publicly available for the scientific community.
        </p>
        <div className="d-flex justify-content-center gap-3">
          <a href="https://github.com" target="_blank" rel="noreferrer" className="btn btn-ema-primary px-5 py-3 fw-bold d-flex align-items-center gap-2 shadow-sm rounded-pill transition-all">
            <BookOpen size={20}/> GitHub Repository
          </a>
        </div>
      </section>

    </div>
  );
}
