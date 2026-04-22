import { useState, useMemo, Fragment } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { miRNAApi } from '../services/api';
import { ArrowLeft, Dna, Target, BookOpen, Layers, ExternalLink, Info, ArrowUpDown, Microscope, Tag, Activity, Scissors, Map, Search, ChevronLeft, ChevronRight, HelpCircle, AlertTriangle } from 'lucide-react';
import { REFERENCES_DB } from '../utils/referencesData';

interface SituationConfigItem {
    label: string;
    description: string;
    style: string;
}

export default function MiRNADetail() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<'overview' | 'targets' | 'refs' | 'expression'>('overview');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [sortField, setSortField] = useState<'expectation' | 'inhibition'>('expectation');
  const [filterInhibition, setFilterInhibition] = useState<string>('all');
  const [targetSearch, setTargetSearch] = useState('');
  const [targetPage, setTargetPage] = useState(1);
  const targetsPerPage = 10;
  const [expressionMode, setExpressionMode] = useState<'raw' | 'rpm'>('raw');

  const { data: mirna, isLoading } = useQuery({
    queryKey: ['mirna', id],
    queryFn: async () => {
      if (!id) throw new Error("ID required");
      return miRNAApi.getMiRNADetail(id);
    },
  });

  const SITUATION_CONFIG: Record<string, SituationConfigItem> = {
    known: {
        label: "Known miRNA",
        description: "Experimentally supported miRNA previously annotated for Eucalyptus grandis.",
        style: "bg-success-subtle text-success border border-success"
    },
    candidate: {
        label: "Candidate miRNA",
        description: "Experimentally supported miRNA matching a known family but novel to this species.",
        style: "bg-warning-subtle text-warning border border-warning"
    },
    novel: {
        label: "Novel miRNA",
        description: "Experimentally supported miRNA with no known homology (species-specific).",
        style: "bg-purple-subtle text-purple border border-purple"
    }
  };

  const filteredTargets = useMemo(() => {
    if (!mirna?.targets) return [];
    let result = [...mirna.targets];
    if (filterInhibition !== 'all') {
        result = result.filter((t: any) => t.inhibition_type === filterInhibition);
    }
    if (targetSearch.trim() !== '') {
        const lowerSearch = targetSearch.toLowerCase();
        result = result.filter((t: any) => 
            t.target_accession?.toLowerCase().includes(lowerSearch) ||
            t.target_locus?.toLowerCase().includes(lowerSearch) ||
            t.annotation?.description?.toLowerCase().includes(lowerSearch) ||
            t.annotation?.best_hit_arabi?.toLowerCase().includes(lowerSearch) ||
            t.annotation?.go_terms?.toLowerCase().includes(lowerSearch)
        );
    }
    result.sort((a: any, b: any) => {
        if (sortField === 'expectation') {
            const valA = a.expectation || 0;
            const valB = b.expectation || 0;
            return sortOrder === 'asc' ? valA - valB : valB - valA;
        } else if (sortField === 'inhibition') {
            const valA = a.inhibition_type || '';
            const valB = b.inhibition_type || '';
            return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return 0;
    });
    return result;
  }, [mirna?.targets, sortOrder, sortField, filterInhibition, targetSearch]);

  const paginatedTargets = useMemo(() => {
      const startIndex = (targetPage - 1) * targetsPerPage;
      return filteredTargets.slice(startIndex, startIndex + targetsPerPage);
  }, [filteredTargets, targetPage]);

  const totalPages = Math.ceil(filteredTargets.length / targetsPerPage);

  const handleSort = (field: 'expectation' | 'inhibition') => {
      if (sortField === field) {
          setSortOrder(current => current === 'asc' ? 'desc' : 'asc');
      } else {
          setSortField(field);
          setSortOrder('asc');
      }
  };

  const highConfidenceEvidence = useMemo(() => {
    if (!mirna?.discovery_evidence) return [];
    return mirna.discovery_evidence.filter((metric: any) => 
        metric.passed_am2018_filters !== 0 && 
        (metric.score_total === null || metric.score_total >= 0)
    );
  }, [mirna?.discovery_evidence]);

  const filteredExpressions = useMemo(() => {
    return mirna?.expressions || [];
  }, [mirna?.expressions]);

  const filteredDegs = useMemo(() => {
    return mirna?.degs || [];
  }, [mirna?.degs]);

  const filteredReferences = useMemo(() => {
    return mirna?.references || [];
  }, [mirna?.references]);

  if (isLoading) return <div className="d-flex justify-content-center align-items-center vh-100"><div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}><span className="visually-hidden">Loading...</span></div></div>;
  if (!mirna) return <div className="p-5 text-center text-danger">miRNA not found.</div>;

  const currentSituation = SITUATION_CONFIG[mirna.situation as keyof typeof SITUATION_CONFIG] || SITUATION_CONFIG.known;

  return (
    <div className="d-flex flex-column gap-5 animate-fade-in mx-auto pb-5" style={{ maxWidth: '90rem' }}>
      {/* Header */}
      <div className="d-flex flex-column flex-md-row align-items-start align-items-md-center justify-content-between gap-4 bg-white p-4 rounded-4 border shadow-sm">
        <div className="d-flex align-items-center gap-4">
            <Link to="/browser" className="btn btn-outline-primary rounded-circle p-2" style={{ width: '2.5rem', height: '2.5rem' }}>
              <ArrowLeft size={20} />
            </Link>
            <div>
                <div className="d-flex align-items-center gap-3 flex-wrap">
                    <h1 className="h2 font-display text-ema-primary mb-0">{mirna.mirna_id}</h1>
                    <span className={`badge rounded-pill text-uppercase fw-bold border ${
                    mirna.situation === 'known' ? 'bg-success-subtle text-success border-success' :
                    mirna.situation === 'novel' ? 'bg-purple-subtle text-purple border-purple' :
                    'bg-warning-subtle text-warning border-warning'
                    }`}>
                    {mirna.situation}
                    </span>
                    <span className="badge bg-secondary-subtle text-secondary border border-secondary">
                        ACC: {mirna.accession}
                    </span>
                </div>
                <div className="d-flex align-items-center gap-2 mt-2">
                    <span className="small fw-bold text-ema-muted text-uppercase">Mature Sequence:</span>
                    <p className="font-mono mb-0 text-ema-text px-2 py-1 rounded border user-select-all" style={{ backgroundColor: 'rgba(8, 177, 72, 0.05)', borderColor: 'rgba(8, 177, 72, 0.2)' }}>
                        {mirna.mature_sequence}
                    </p>
                </div>
            </div>
        </div>
        <div className="text-end small text-ema-muted">
            <p className="mb-0">Entry Date: {mirna.entry_date ? new Date(mirna.entry_date).toLocaleDateString() : 'N/A'}</p>
        </div>
      </div>

      {/* Tabs */}
      <ul className="nav nav-pills bg-white p-2 rounded-3 border shadow-sm" style={{ width: 'fit-content' }}>
        {[
          { id: 'overview', label: 'Genomics & Family', icon: Dna },
          { id: 'expression', label: 'Expression & DEG', icon: Activity },
          { id: 'targets', label: `Targets (${mirna.targets?.length || 0})`, icon: Target },
          { id: 'refs', label: 'References', icon: BookOpen },
        ].map((tab) => (
          <li key={tab.id} className="nav-item">
            <button
              onClick={() => setActiveTab(tab.id as any)}
              className={`nav-link d-flex align-items-center fw-bold transition-all ${
                activeTab === tab.id ? 'active' : 'text-ema-muted'
              }`}
            >
              <tab.icon size={16} className="me-2" />
              {tab.label}
            </button>
          </li>
        ))}
      </ul>

      <div className="bg-white border rounded-4 p-4 shadow-sm" style={{ minHeight: '500px' }}>

        {/* ABA 1: GENOMICS & FAMILY */}
        {activeTab === 'overview' && (
          <div className="row g-4">
             <div className="col-12 col-lg-4">
                <div className="card border shadow-sm h-100">
                  <div className="card-body p-4">
                    <h3 className="h5 font-display text-ema-text mb-4 d-flex align-items-center border-bottom pb-3">
                        <Layers size={20} className="me-2 text-info"/> Family Information
                    </h3>
                    <div className={`p-3 rounded-3 small mb-4 ${currentSituation.style}`}>
                        <div className="d-flex align-items-start gap-2">
                            <Info size={16} className="mt-1 flex-shrink-0" style={{ opacity: 0.7 }}/>
                            <div>
                                <p className="fw-bold mb-1">{currentSituation.label}</p>
                                <p className="mb-0 lh-base" style={{ opacity: 0.9 }}>{currentSituation.description}</p>
                            </div>
                        </div>
                    </div>
                    {highConfidenceEvidence && highConfidenceEvidence.length > 0 ? (
                        <div className="d-flex flex-column gap-4 animate-fade-in">
                            <div><span className="small fw-bold text-ema-muted text-uppercase d-block mb-1">Family Name</span><p className="h3 fw-bold text-ema-text mb-0">{mirna.family || 'Unclassified'}</p></div>
                            <div className="pt-2 border-top">
                                <span className="small fw-bold text-ema-muted text-uppercase d-block mb-3">Discovery Evidence (per Study/Locus)</span>
                                <div className="d-flex flex-column gap-3">
                                    {highConfidenceEvidence.map((metric: any, mIdx: number) => (
                                        <div key={mIdx} className="p-3 rounded-3 border bg-light shadow-sm">
                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                <span className="fw-bold small text-ema-primary">{metric.study_name || metric.study?.author_id || 'Unknown Study'}</span>
                                                <span className="badge bg-secondary-subtle text-secondary border" style={{ fontSize: '0.6rem' }}>{metric.provisional_id}</span>
                                            </div>
                                            <div className="d-flex flex-column gap-2">
                                                <div className="d-flex align-items-center justify-content-between">
                                                    <div className="d-flex align-items-center gap-1">
                                                        <span className="small text-ema-muted">miRDeep2 Score</span>
                                                        <div className="cursor-help text-info" title="The log-odds score assigned by miRDeep2.">
                                                            <HelpCircle size={10} />
                                                        </div>
                                                    </div>
                                                    <span className="font-mono fw-bold small">{metric.score_total?.toFixed(1)}</span>
                                                </div>
                                                <div className="d-flex align-items-center justify-content-between">
                                                    <div className="d-flex align-items-center gap-1">
                                                        <span className="small text-ema-muted">Randfold</span>
                                                        <div className="cursor-help text-info" title="Estimated randfold p-value.">
                                                            <HelpCircle size={10} />
                                                        </div>
                                                    </div>
                                                    <span className={`badge ${metric.randfold === 'yes' ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'} border`} style={{ fontSize: '0.65rem' }}>
                                                        {metric.randfold || 'N/A'}
                                                    </span>
                                                </div>
                                                <div className="d-flex align-items-center justify-content-between mt-1 pt-1 border-top border-secondary-subtle" style={{ opacity: 0.8 }}>
                                                    <span className="small text-ema-muted" style={{ fontSize: '0.65rem' }}>Reads (M/S/T)</span>
                                                    <span className="small font-mono" style={{ fontSize: '0.65rem' }}>{metric.mature_read_count}/{metric.star_read_count}/{metric.total_read_count}</span>
                                                </div>
                                                {metric.mature_matches_mirbase && (
                                                    <div className="mt-2 pt-2 border-top">
                                                        <span className="small fw-bold text-ema-muted text-uppercase mb-1 d-flex align-items-center gap-1" style={{ fontSize: '0.6rem' }}>
                                                            miRBase match
                                                            <div className="cursor-help text-info" title="Most similar miRBase entry sharing the same seed.">
                                                                <HelpCircle size={10} />
                                                            </div>
                                                        </span>
                                                        <p className="font-mono bg-white p-1 rounded border mb-0 text-center" style={{ fontSize: '0.7rem' }}>{metric.mature_matches_mirbase}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : <p className="text-ema-muted fst-italic mb-0">No high-confidence discovery metrics available.</p>}
                  </div>
                </div>
             </div>
             <div className="col-12 col-lg-8">
                <h3 className="h5 font-display text-ema-text d-flex align-items-center mb-4">
                    <Dna size={20} className="me-2 text-ema-primary"/> Precursor Candidates
                    <span className="ms-2 badge rounded-pill" style={{ backgroundColor: 'rgba(8, 177, 72, 0.1)', color: '#08B148' }}>{highConfidenceEvidence?.length || 0} high-confidence loci</span>
                </h3>
                {highConfidenceEvidence && highConfidenceEvidence.length > 0 ? (
                    highConfidenceEvidence.map((pre: any, idx: number) => (
                        <div key={idx} className="card border shadow-sm hover-lift mb-4">
                          <div className="card-body p-4">
                            <div className="d-flex flex-wrap align-items-center justify-content-between mb-4 pb-3 border-bottom">
                                <div>
                                    <div className="d-flex align-items-center gap-2 mb-2">
                                        <h4 className="h5 fw-bold text-ema-text d-flex align-items-center gap-2 mb-0"><Map size={16} className="text-ema-muted"/> {pre.chr_scaf}</h4>
                                        <span className="small text-ema-muted font-mono bg-secondary-subtle px-2 rounded">{pre.precursor_coordinate || `${pre.chr_scaf}:${pre.start_genomic}-${pre.end_genomic}`}</span>
                                    </div>
                                    <div className="d-flex align-items-center gap-3">
                                        <span className={`badge fw-bold text-uppercase ${pre.strand === '+' ? 'bg-info-subtle text-info border border-info' : 'bg-warning-subtle text-warning border border-warning'}`}>Strand {pre.strand}</span>
                                        <span className="badge bg-secondary-subtle text-secondary text-uppercase">{pre.study_name || pre.study?.author_id || 'Unknown Study'}</span>
                                        <span className="badge bg-dark text-white font-mono">{pre.provisional_id}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="d-flex flex-column gap-4">
                                <div className="row g-3">
                                    <div className="col-3">
                                      <div className="bg-secondary-subtle p-3 rounded border text-center">
                                        <span className="text-uppercase fw-bold d-block text-secondary" style={{ fontSize: '0.625rem' }}>Length</span>
                                        <span className="font-mono fw-bold text-secondary-emphasis">{pre.precursor_length} nt</span>
                                      </div>
                                    </div>
                                    <div className="col-3">
                                      <div className="bg-purple-subtle p-3 rounded border border-purple text-center">
                                        <span className="text-uppercase fw-bold d-block text-purple" style={{ fontSize: '0.625rem' }}>MFE</span>
                                        <span className="font-mono fw-bold text-purple">{pre.mfe}</span>
                                      </div>
                                    </div>
                                    <div className="col-3">
                                      <div className="bg-info-subtle p-3 rounded border border-info text-center">
                                        <span className="text-uppercase fw-bold d-block text-info" style={{ fontSize: '0.625rem' }}>AMFE</span>
                                        <span className="font-mono fw-bold text-info">{pre.amfe}</span>
                                      </div>
                                    </div>
                                    <div className="col-3">
                                      <div className="bg-success-subtle p-3 rounded border border-success text-center">
                                        <div className="d-flex align-items-center justify-content-center gap-1">
                                            <span className="text-uppercase fw-bold text-success" style={{ fontSize: '0.625rem' }}>miRDeep2 Score</span>
                                            <div className="cursor-help text-success" title="The log-odds score assigned by miRDeep2."><HelpCircle size={10} /></div>
                                        </div>
                                        <span className="font-mono fw-bold text-success">{pre.score_total?.toFixed(1) || 'N/A'}</span>
                                      </div>
                                    </div>
                                </div>
                                {pre.star_sequence_predicted && (
                                    <div className="bg-warning-subtle p-3 rounded-3 border border-warning">
                                        <span className="small fw-bold text-warning text-uppercase d-flex align-items-center gap-2 mb-2"><Scissors size={16}/> Predicted Star Sequence (miRNA*)</span>
                                        <div className="font-mono small text-warning-emphasis bg-white p-2 rounded border border-warning text-break shadow-sm">{pre.star_sequence_predicted}</div>
                                    </div>
                                )}
                                <div>
                                    <span className="small fw-bold text-ema-muted text-uppercase d-flex align-items-center gap-1 mb-2">Stem-loop secondary structure (Dot-Bracket) <Info size={12}/></span>
                                    <div className="bg-dark text-success p-3 rounded-3 font-mono small lh-base overflow-x-auto" style={{ letterSpacing: '0.1em', whiteSpace: 'nowrap', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.3)' }}>
                                        <div className="text-white mb-1">{pre.premir_sequence_stem_loop}</div>
                                        <div className="d-flex align-items-center gap-2"><span>{pre.stem_loop_structure_dotbracket}</span></div>
                                    </div>
                                </div>
                                {pre.pri_mirna_context_seq && (
                                    <div>
                                        <span className="small fw-bold text-ema-muted text-uppercase mb-2 d-block">Genomic Context (Pri-miRNA)</span>
                                        <div className="bg-secondary-subtle text-secondary-emphasis p-3 rounded border font-mono small text-break lh-base overflow-y-auto" style={{ maxHeight: '6rem' }}>{pre.pri_mirna_context_seq}</div>
                                    </div>
                                )}
                            </div>
                          </div>
                        </div>
                    ))
                ) : <div className="p-5 text-center bg-secondary-subtle rounded-4 border border-secondary border-dashed"><p className="text-ema-muted mb-0">No precursor information available for this miRNA.</p></div>}
             </div>
          </div>
        )}

        {/* ABA: EXPRESSION & DEG */}
        {activeTab === 'expression' && (
          <div className="animate-fade-in">
            <div className="row g-4">
              <div className="col-12 col-lg-7">
                <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
                  <h3 className="h5 font-display text-ema-text d-flex align-items-center mb-0">
                    <Activity size={20} className="me-2 text-ema-primary"/> Expression Profile
                    <span className="ms-2 badge rounded-pill" style={{ backgroundColor: 'rgba(8, 177, 72, 0.1)', color: '#08B148' }}>{filteredExpressions?.length || 0} samples</span>
                  </h3>
                  {mirna.situation !== 'novel' && (
                    <div className="btn-group btn-group-sm border rounded-3 shadow-sm overflow-hidden">
                        <button className={`btn px-3 fw-bold transition-all ${expressionMode === 'raw' ? 'bg-ema-primary text-white' : 'bg-ema-accent text-ema-primary'}`} onClick={() => setExpressionMode('raw')}>Raw Counts</button>
                        <button className={`btn px-3 fw-bold transition-all ${expressionMode === 'rpm' ? 'bg-ema-primary text-white' : 'bg-ema-accent text-ema-primary'}`} onClick={() => setExpressionMode('rpm')}>RPM</button>
                    </div>
                  )}
                </div>
                
                {filteredExpressions && filteredExpressions.length > 0 ? (
                    <div className="table-responsive rounded-3 border shadow-sm">
                      <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.875rem' }}>
                        <thead className="table-light border-bottom">
                          <tr>
                            <th className="small fw-bold text-ema-muted text-uppercase px-3 py-3">Study</th>
                            <th className="small fw-bold text-ema-muted text-uppercase px-3 py-3">Tissue</th>
                            <th className="small fw-bold text-ema-muted text-uppercase px-3 py-3">Genotype</th>
                            <th className="small fw-bold text-ema-muted text-uppercase px-3 py-3">Condition</th>
                            <th className="small fw-bold text-ema-muted text-uppercase px-3 py-3 text-center">Rep</th>
                            <th className="small fw-bold text-ema-muted text-uppercase px-3 py-3 text-end">Value</th>
                            <th className="small fw-bold text-ema-muted text-uppercase px-3 py-3" style={{ width: '15%' }}>Distribution</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const groupedExpressions = filteredExpressions.reduce((acc: any, exp: any) => {
                              const studyId = exp.sample?.study?.author_id || 'Other';
                              if (!acc[studyId]) acc[studyId] = [];
                              acc[studyId].push(exp);
                              return acc;
                            }, {});
                            const maxVal = Math.max(...filteredExpressions.map((e: any) => {
                                const mTotal = e.sample?.total_mapped_reads || 0;
                                return expressionMode === 'raw' ? e.raw_count : (mTotal > 0 ? (e.raw_count / mTotal) * 1000000 : 0);
                            }));

                            return Object.entries(groupedExpressions).map(([studyId, expressions]: [string, any]) => (
                              <Fragment key={studyId}>
                                {expressions.map((exp: any, idx: number) => {
                                  const sample = exp.sample;
                                  const totalMapped = sample?.total_mapped_reads || 0;
                                  const rawVal = exp.raw_count;
                                  const rpmVal = totalMapped > 0 ? (rawVal / totalMapped) * 1000000 : 0;
                                  const currentVal = expressionMode === 'raw' ? rawVal : rpmVal;
                                  const percentage = maxVal > 0 ? (currentVal / maxVal) * 100 : 0;
                                  const clearNA = (val: any) => (val === null || val === undefined || val === 'N/A' || val === 'nan') ? '' : val;
                                  return (
                                    <tr key={idx}>
                                      <td className="px-3 py-2 fw-bold text-ema-primary">{idx === 0 ? studyId : ''}</td>
                                      <td className="px-3 py-2 text-ema-text">{clearNA(sample?.tissue)}</td>
                                      <td className="px-3 py-2 text-ema-text">{clearNA(sample?.genotype)}</td>
                                      <td className="px-3 py-2 text-ema-text">{clearNA(sample?.condition)}</td>
                                      <td className="px-3 py-2 text-center text-ema-muted">{clearNA(sample?.replicate)}</td>
                                      <td className="px-3 py-2 text-end">
                                        <div className="fw-bold font-mono text-ema-primary">{expressionMode === 'raw' ? currentVal.toLocaleString() : currentVal.toFixed(2)}</div>
                                        <div className="small text-muted font-mono" style={{ fontSize: '0.6rem' }}>{expressionMode === 'raw' ? 'Raw' : 'RPM'}</div>
                                      </td>
                                      <td className="px-3 py-2"><div className="progress" style={{ height: '4px' }}><div className="progress-bar bg-ema-primary shadow-sm" role="progressbar" style={{ width: `${percentage}%` }}></div></div></td>
                                    </tr>
                                  );
                                })}
                              </Fragment>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                ) : <div className="p-5 text-center bg-secondary-subtle rounded-4 border border-secondary border-dashed"><p className="text-ema-muted mb-0">No expression data available for this miRNA.</p></div>}
              </div>
              <div className="col-12 col-lg-5">
                <h3 className="h5 font-display text-ema-text d-flex align-items-center mb-4"><ArrowUpDown size={20} className="me-2 text-ema-primary"/> Differential Expression</h3>
                {filteredDegs && filteredDegs.length > 0 ? (
                  <div className="d-flex flex-column gap-3">
                    {(() => {
                      const interactionEntry = filteredDegs.find((d: any) => d.comparison === 'genotype_tissue_interaction');
                      return filteredDegs.filter((d: any) => d.comparison !== 'genotype_tissue_interaction').map((deg: any, idx: number) => {
                          let expandedLabel = deg.comparison.replace(/_/g, ' ');
                          let directionLabel = deg.direction?.replace(/_/g, ' ');
                          if (deg.comparison === 'stem_vs_callus') {
                            expandedLabel = "Stem vs. Embryogenic Callus (QIN-2021)";
                            directionLabel = `${deg.direction?.includes('up') ? 'up' : 'down'} in stem (averaged across genotypes — QIN-2021)`;
                          } else if (deg.comparison === 'GL9_vs_DH201') {
                            expandedLabel = "Genotype: GL9 vs. DH201-2 (QIN-2021)";
                          }
                          return (
                            <div key={idx} className="card border-0 shadow-sm bg-light hover-lift">
                              <div className="card-body p-3">
                                <div className="d-flex justify-content-between align-items-start mb-2 gap-2">
                                  <span className="small fw-bold text-ema-muted text-uppercase lh-sm" style={{ flex: 1 }}>{expandedLabel}</span>
                                  <span className={`badge rounded-pill text-uppercase flex-shrink-0 ${deg.direction?.toLowerCase().includes('up') ? 'bg-success text-white' : 'bg-danger text-white'}`}>{deg.direction?.replace(/_/g, ' ')}</span>
                                </div>
                                {directionLabel && <div className="small text-ema-text mb-3 lh-sm" style={{ fontSize: '0.8rem' }}>{directionLabel}</div>}
                                <div className="row g-2 text-center mb-2">
                                  <div className="col-6"><div className="bg-white p-2 rounded border shadow-sm"><span className="d-block small text-muted text-uppercase" style={{ fontSize: '0.6rem' }}>log2FC</span><span className={`fw-bold font-mono ${deg.log2_fold_change > 0 ? 'text-success' : 'text-danger'}`}>{deg.log2_fold_change > 0 ? '+' : ''}{deg.log2_fold_change?.toFixed(2)}</span></div></div>
                                  <div className="col-6"><div className="bg-white p-2 rounded border shadow-sm"><span className="d-block small text-muted text-uppercase" style={{ fontSize: '0.6rem' }}>p-adj</span><span className="fw-bold font-mono text-ema-primary">{deg.padj < 0.001 ? deg.padj.toExponential(2) : deg.padj?.toFixed(4)}</span></div></div>
                                </div>
                                {deg.comparison === 'stem_vs_callus' && interactionEntry && (
                                  <div className="mt-3 p-2 bg-warning-subtle text-warning-emphasis border border-warning rounded small d-flex align-items-start gap-2 shadow-sm">
                                    <AlertTriangle size={14} className="mt-1 flex-shrink-0"/><span style={{ fontSize: '0.75rem' }}><strong>Interaction detected</strong> (padj = {interactionEntry.padj?.toFixed(4)}) — the effect is not uniform across genotypes</span>
                                  </div>
                                )}
                                <div className="mt-2 text-end">
                                  <span className="small text-muted fst-italic" style={{ fontSize: '0.7rem' }}>{deg.study?.author_id || deg.author_id}</span>
                                </div>
                              </div>
                            </div>
                          );
                        });
                    })()}
                  </div>
                ) : <div className="p-5 text-center bg-secondary-subtle rounded-4 border border-secondary border-dashed"><p className="text-ema-muted mb-0">No differential expression data available for this miRNA.</p></div>}
              </div>
            </div>
          </div>
        )}

        {/* ABA 2: TARGETS */}
        {activeTab === 'targets' && (
          <div>
            {mirna.targets && mirna.targets.length > 0 ? (
              <>
              <div className="d-flex flex-column flex-sm-row justify-content-between align-items-end align-items-sm-center mb-4 gap-3 animate-fade-in">
                  <div className="position-relative w-100" style={{ maxWidth: '20rem' }}>
                      <input type="text" placeholder="Search targets..." value={targetSearch} onChange={(e) => { setTargetSearch(e.target.value); setTargetPage(1); }} className="form-control form-control-sm rounded-3" style={{ paddingLeft: '2.25rem' }}/>
                      <Search size={16} className="text-muted position-absolute top-50 start-0 translate-middle-y ms-2"/>
                  </div>
                  <div className="d-flex align-items-center gap-3">
                      <div className="d-flex align-items-center gap-2 bg-white px-3 py-2 rounded-3 border">
                          <span className="fw-bold text-ema-muted text-uppercase" style={{ fontSize: '0.625rem' }}>Inhibition:</span>
                          <select value={filterInhibition} onChange={(e) => { setFilterInhibition(e.target.value); setTargetPage(1); }} className="form-select form-select-sm border-0 p-0 fw-medium" style={{ width: 'auto' }}>
                              <option value="all">All Types</option>
                              <option value="Cleavage">Cleavage</option>
                              <option value="Translation">Translation</option>
                          </select>
                      </div>
                  </div>
              </div>
              <div className="table-responsive rounded-3 border">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light border-bottom">
                    <tr>
                      <th className="px-4 py-3 small fw-bold text-ema-muted text-uppercase">Target Locus</th>
                      <th className="px-4 py-3 small fw-bold text-ema-muted text-uppercase">Annotation</th>
                      <th className="px-4 py-3 small fw-bold text-ema-muted text-uppercase"><button onClick={() => handleSort('inhibition')} className="btn btn-link p-0 text-decoration-none d-flex align-items-center text-ema-muted fw-bold">Inhibition <ArrowUpDown size={12} className={sortField === 'inhibition' ? 'text-ema-primary' : 'text-muted'}/></button></th>
                      <th className="px-4 py-3 small fw-bold text-ema-muted text-uppercase"><button onClick={() => handleSort('expectation')} className="btn btn-link p-0 text-decoration-none d-flex align-items-center text-ema-muted fw-bold">Expectation <ArrowUpDown size={12} className={sortField === 'expectation' ? 'text-ema-primary' : 'text-muted'}/></button></th>
                      <th className="px-4 py-3 small fw-bold text-ema-muted text-uppercase">Alignment</th>
                      <th className="px-4 py-3 text-end small fw-bold text-ema-muted text-uppercase">Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTargets.map((target: any) => (
                        <tr key={target.target_interaction_id}>
                            <td className="px-4 py-3">
                                <div className="fw-bold text-ema-text">{target.annotation?.locus_name || target.target_locus || target.target_accession}</div>
                                <div className="small font-mono text-ema-muted">{target.target_accession}</div>
                            </td>
                            <td className="px-4 py-3 align-top">
                                {target.annotation ? (
                                    <div style={{ maxWidth: '20rem' }}>
                                        <p className="small fw-bold text-secondary-emphasis lh-sm mb-1">{target.annotation.description}</p>
                                        <div className="d-flex flex-wrap gap-1">
                                            {target.annotation.best_hit_arabi && <span className="badge bg-secondary-subtle text-secondary border" style={{ fontSize: '0.625rem' }}>{target.annotation.best_hit_arabi}</span>}
                                            {target.annotation.go_terms && target.annotation.go_terms !== "nan" && <span className="badge bg-info-subtle text-info border" style={{ fontSize: '0.5625rem' }}><Tag size={8}/> GO</span>}
                                        </div>
                                    </div>
                                ) : <span className="small text-muted fst-italic">No annotation</span>}
                            </td>
                            <td className="px-4 py-3"><span className={`badge fw-bold border ${target.inhibition_type === 'Cleavage' ? 'bg-danger-subtle text-danger border-danger' : 'bg-warning-subtle text-warning border-warning'}`}>{target.inhibition_type}</span></td>
                            <td className="px-4 py-3"><span className="font-mono fw-bold text-ema-text">{target.expectation}</span></td>
                            <td className="px-4 py-3">
                                <div className="font-mono small bg-secondary-subtle p-2 rounded border d-inline-block">
                                    <div className="d-flex flex-column gap-1" style={{ letterSpacing: '0.2em' }}>
                                        <div className="text-ema-primary fw-bold">{target.mirna_aligned_fragment}</div>
                                        <div className="text-dark fw-bold">{target.target_aligned_fragment}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-end">{target.target_accession && <a href={`https://phytozome-next.jgi.doe.gov/report/transcript/Egrandis_v2_0/${target.target_accession}`} target="_blank" rel="noreferrer" className="text-ema-primary"><ExternalLink size={14} /></a>}</td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="d-flex align-items-center justify-content-between mt-4 px-2">
                  <div className="small text-muted">Showing {filteredTargets.length} targets</div>
                  {totalPages > 1 && (
                      <div className="d-flex align-items-center gap-2">
                          <button onClick={() => setTargetPage(p => Math.max(1, p - 1))} disabled={targetPage === 1} className="btn btn-sm btn-outline-secondary rounded-circle p-1"><ChevronLeft size={16}/></button>
                          <span className="small fw-bold">Page {targetPage}</span>
                          <button onClick={() => setTargetPage(p => Math.min(totalPages, p + 1))} disabled={targetPage === totalPages} className="btn btn-sm btn-outline-secondary rounded-circle p-1"><ChevronRight size={16}/></button>
                      </div>
                  )}
              </div>
              </>
            ) : <div className="d-flex flex-column align-items-center justify-content-center py-5 text-center"><Target size={64} className="text-secondary mb-4" style={{ opacity: 0.3 }}/><h3 className="h5 fw-bold text-muted">No validated targets found</h3></div>}
          </div>
        )}

        {/* ABA 3: REFERENCES */}
        {activeTab === 'refs' && (
             <div className="d-flex flex-column gap-4 animate-fade-in">
               {filteredReferences && filteredReferences.length > 0 ? (
                 filteredReferences.map((ref: any, idx: number) => {
                   const study = ref.study;
                   const authorId = study?.author_id || 'Unknown';
                   const details = REFERENCES_DB[authorId];
                   const samples = study?.samples || [];
                   const tissues = Array.from(new Set(samples.map((s: any) => s.tissue))).filter(Boolean);
                   return (
                     <div key={idx} className="card border shadow-sm overflow-hidden hover-lift">
                        <div className="card-header bg-light p-3 d-flex justify-content-between align-items-start border-bottom">
                            <div className="d-flex align-items-center gap-3">
                                <div className="p-2 bg-info-subtle text-info rounded-3 shadow-sm"><BookOpen size={20}/></div>
                                <div>
                                    <h4 className="h5 fw-bold text-ema-text mb-0">{authorId}</h4>
                                    <span className={`badge rounded-pill shadow-sm border ${ref.detection_source === 'per_sample_quantification' ? 'bg-success-subtle text-success border-success' : 'bg-secondary-subtle text-secondary border-secondary'}`} style={{ fontSize: '0.65rem' }}>{ref.detection_source === 'per_sample_quantification' ? 'Quantified' : 'Detected'}</span>
                                </div>
                            </div>
                            <a href={details ? details.doi : '#'} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-primary rounded-3 fw-bold">Paper <ExternalLink size={12}/></a>
                        </div>
                        <div className="card-body p-4">
                            <p className="text-secondary fst-italic border-start border-3 border-ema-primary ps-3 small mb-4 lh-base">"{details ? details.citation : 'Citation not available'}"</p>
                            <div className="d-flex flex-wrap gap-2">
                                {tissues.map((t: any) => <span key={t} className="badge bg-success-subtle text-success border border-success px-2 py-1 shadow-sm"><Microscope size={12}/> {t}</span>)}
                            </div>
                        </div>
                     </div>
                   );
                 })
               ) : <div className="d-flex flex-column align-items-center justify-content-center py-5 text-center"><BookOpen size={64} className="text-secondary mb-4" style={{ opacity: 0.3 }}/><p className="text-muted mb-0">No references linked.</p></div>}
             </div>
        )}
      </div>
    </div>
  );
}
