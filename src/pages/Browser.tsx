import { useState, useMemo, useEffect, Fragment } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { miRNAApi } from '../services/api';
import { ChevronLeft, ChevronRight, Search, Tag, X, CheckSquare, Square, DownloadCloud, FileText, FileCode, FileSpreadsheet, Filter, ChevronDown, ChevronUp } from 'lucide-react';

const highlightMatch = (text: string, term: string) => {
  if (!text || !term) return text;
  const parts = text.split(new RegExp(`(${term.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === term.toLowerCase() 
          ? <mark key={i} className="p-0 bg-warning-subtle text-dark fw-bold">{part}</mark>
          : part
      )}
    </>
  );
};

export default function Browser() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [situation, setSituation] = useState<string>('');
  const [selectedFamily, setSelectedFamily] = useState<string>('');
  
  // LÓGICA DE DEBOUNCE
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [expandedAccessions, setExpandedAccessions] = useState<number[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchInput);
      setPage(1);
    }, 600);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setExpandedAccessions([]);
  }, [debouncedSearchTerm]);

  // FILTROS BIOLÓGICOS ESTRUTURADOS
  const [activeFilters, setActiveFilters] = useState<{
    tissues: string[];
    conditions: string[];
    genotypes: string[];
    phases: string[];
    ages: string[];
    studies: string[];
  }>({
    tissues: [],
    conditions: [],
    genotypes: [],
    phases: [],
    ages: [],
    studies: []
  });

  const toggleFilter = (category: keyof typeof activeFilters, value: string) => {
    setActiveFilters(prev => {
      const current = prev[category];
      const next = current.includes(value) 
        ? current.filter(v => v !== value) 
        : [...current, value];
      return { ...prev, [category]: next };
    });
    setPage(1);
  };

  const clearFilters = () => {
    setActiveFilters({
      tissues: [],
      conditions: [],
      genotypes: [],
      phases: [],
      ages: [],
      studies: []
    });
    setSituation('');
    setSelectedFamily('');
    setSearchInput('');
    setDebouncedSearchTerm('');
    setPage(1);
  };

  const hasAnyFilter = useMemo(() => {
    return Object.values(activeFilters).some(arr => arr.length > 0) || situation || selectedFamily || debouncedSearchTerm;
  }, [activeFilters, situation, selectedFamily, debouncedSearchTerm]);

  // ESTADO DE SELEÇÃO
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [stemLoopMode, setStemLoopMode] = useState<'stem-loop-best' | 'stem-loop-all'>('stem-loop-best');

  // FETCH DATA
  const { data: browserIndex } = useQuery({ 
    queryKey: ['browserIndex'], 
    queryFn: () => miRNAApi.getBrowserIndex() 
  });

  const facetCounts = browserIndex?.facet_counts;

  const { data, isLoading, isError } = useQuery({
    queryKey: ['mirnas', page, limit, situation, selectedFamily, activeFilters, debouncedSearchTerm],
    queryFn: () => miRNAApi.getMiRNAs({
      page, limit, situation: situation || undefined, family: selectedFamily || undefined, 
      filters: activeFilters, search: debouncedSearchTerm || undefined,
    }),
  });

  const { data: families } = useQuery({ queryKey: ['families'], queryFn: miRNAApi.getFamilies });

  const toggleSelection = (accession: number) => {
    setSelectedIds(prev => 
      prev.includes(accession) 
        ? prev.filter(id => id !== accession) 
        : [...prev, accession]
    );
  };

  const toggleSelectAll = () => {
    if (!data?.data) return;
    const allPageIds = data.data.map((m: any) => m.accession);
    const allSelected = allPageIds.every((id: number) => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !allPageIds.includes(id)));
    } else {
      const newIds = [...new Set([...selectedIds, ...allPageIds])];
      setSelectedIds(newIds);
    }
  };

  const handleDownloadFasta = async (type: 'mature' | 'stem-loop-best' | 'stem-loop-all') => {
    if (selectedIds.length === 0) return;
    setIsDownloading(true);
    try {
        await miRNAApi.downloadSequences(selectedIds, type);
    } catch (error) {
        alert("Error downloading sequences. Please try again.");
    } finally {
        setIsDownloading(false);
    }
  };

  const handleDownloadTable = () => {
    if (!data?.data) return;
    const rowsToExport = selectedIds.length > 0
        ? data.data.filter((m: any) => selectedIds.includes(m.accession))
        : data.data;
    if (rowsToExport.length === 0) return;
    const headers = ["miRNA ID", "Mature sequence", "Family", "Situation"];
    const csvContent = [
        headers.join(","), 
        ...rowsToExport.map((row: any) => [
            row.mirna_id,
            row.mature_sequence,
            row.family,
            row.situation
        ].join(","))
    ].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `ema_mirna_table.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isAllPageSelected = data?.data && data.data.length > 0 && data.data.every((m: any) => selectedIds.includes(m.accession));
  const hasSelection = selectedIds.length > 0;

  const getSituationStyle = (situation: string) => {
    switch (situation) {
      case 'known': return 'badge bg-success-subtle text-success border border-success';
      case 'novel': return 'badge bg-purple-subtle text-purple border border-purple';
      default: return 'badge bg-secondary-subtle text-secondary border border-secondary';
    }
  };

  const formatTagName = (category: string, name: string) => {
    if (!name) return "";
    if (category === 'conditions' || category === 'tissues') {
      return name
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());
    }
    return name;
  };

  const FilterTagList = ({ title, category, facets }: { title: string, category: keyof typeof activeFilters, facets: Record<string, number> | undefined }) => {
    if (!facets || Object.keys(facets).length === 0) return null;
    return (
      <div className="mb-2">
        <span className="small text-ema-muted me-2 fw-bold" style={{ minWidth: '80px', display: 'inline-block' }}>{title}:</span>
        <div className="d-inline-flex flex-wrap gap-1">
          {Object.entries(facets).sort((a,b) => b[1] - a[1]).map(([val, count]) => (
            <button
              key={val}
              onClick={() => toggleFilter(category, val)}
              className={`btn btn-sm py-0 px-2 rounded-pill border ${activeFilters[category].includes(val) ? 'btn-primary border-primary' : 'btn-outline-secondary'}`}
              style={{ fontSize: '0.75rem' }}
            >
              {formatTagName(category, val)} <span className="opacity-50 ms-1">({count})</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="d-flex flex-column gap-4 animate-slide-up position-relative pb-5">

      <div className="d-flex justify-content-between align-items-end">
        <div>
          <h1 className="font-display display-5 text-ema-text">miRNA browser</h1>
          <p className="text-ema-muted mt-2 fs-5">
            Browse, filter and explore the complete catalog of <em>Eucalyptus grandis</em> miRNAs.
          </p>
        </div>
      </div>

      {/* --- CONTAINER DE FILTROS --- */}
      <div className="card border shadow rounded-4 p-4">
        <div className="card-body d-flex flex-column gap-4">
        
          <div>
            <label className="d-flex align-items-center gap-2 small fw-bold text-ema-primary text-uppercase letter-spacing-wider mb-3">
              <Search size={16} /> Global Search
            </label>
            <div className="position-relative">
              <input
                type="text"
                placeholder="Search by miRNA ID, sequence, target gene ID (e.g. Eucgr...) or description..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="form-control form-control-lg rounded-3"
                style={{ paddingLeft: '3rem' }}
              />
              <Search size={24} className="text-muted position-absolute top-50 start-0 translate-middle-y ms-3" />
            </div>
          </div>

          <hr className="my-1" />

          <div className="row row-cols-1 row-cols-md-3 g-3">
            <div className="col">
              <label className="d-flex align-items-center gap-2 small fw-bold text-ema-muted text-uppercase mb-2">
                <Filter size={12} /> Situation
              </label>
              <select value={situation} onChange={(e) => { setSituation(e.target.value); setPage(1); }} className="form-select rounded-3">
                <option value="">All situations</option>
                <option value="known">Known</option>
                <option value="novel">Novel</option>
              </select>
            </div>
            <div className="col">
              <label className="small fw-bold text-ema-muted text-uppercase mb-2 d-block">Family</label>
              <select value={selectedFamily} onChange={(e) => { setSelectedFamily(e.target.value); setPage(1); }} className="form-select rounded-3">
                <option value="">All families</option>
                {families?.map((f: any) => (<option key={f.family} value={f.family}>{f.family} ({f.total_members})</option>))}
              </select>
            </div>
            <div className="col">
              <label className="small fw-bold text-ema-muted text-uppercase mb-2 d-block">Rows per page</label>
              <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} className="form-select rounded-3">
                <option value="25">25 rows</option>
                <option value="50">50 rows</option>
                <option value="100">100 rows</option>
              </select>
            </div>
          </div>

          <hr className="my-1" />

          <div className="row g-4">
            <div className="col-lg-8">
              <div className="d-flex align-items-center gap-2 mb-3">
                <Tag size={16} className="text-ema-primary" />
                <h3 className="small fw-bold text-ema-text text-uppercase mb-0">Experimental context filters</h3>
              </div>
              <div className="bg-light p-3 rounded-3 border overflow-auto" style={{ maxHeight: '300px' }}>
                <FilterTagList title="Studies" category="studies" facets={facetCounts?.studies} />
                <FilterTagList title="Tissues" category="tissues" facets={facetCounts?.tissues} />
                <FilterTagList title="Conditions" category="conditions" facets={facetCounts?.conditions} />
                <FilterTagList title="Genotypes" category="genotypes" facets={facetCounts?.genotypes} />
                <FilterTagList title="Phases" category="phases" facets={facetCounts?.phases} />
                <FilterTagList title="Ages" category="ages" facets={facetCounts?.ages} />
              </div>
            </div>

            <div className="col-lg-4 border-start">
              <div className="d-flex align-items-center gap-2 mb-3">
                <DownloadCloud size={16} className="text-ema-primary" />
                <h3 className="small fw-bold text-ema-text text-uppercase mb-0">Data export</h3>
              </div>
              <div className="bg-light rounded-3 p-3 border">
                <div className="d-flex flex-column gap-2">
                  <button onClick={handleDownloadTable} className="btn btn-outline-secondary btn-sm w-100 d-flex align-items-center justify-content-center">
                    <FileSpreadsheet size={16} className="me-2" /> Table (.csv)
                  </button>
                  <button onClick={() => handleDownloadFasta('mature')} disabled={!hasSelection || isDownloading} className={`btn btn-sm w-100 d-flex align-items-center justify-content-center ${hasSelection ? 'btn-primary' : 'btn-secondary disabled'}`}>
                    <FileCode size={16} className="me-2" /> Mature (.fasta)
                  </button>
                  <div className="mt-2 border-top pt-2">
                    <label className="small fw-bold text-ema-muted text-uppercase mb-1 d-block" style={{ fontSize: '0.65rem' }}>Stem-loop sequence</label>
                    <select 
                      value={stemLoopMode} 
                      onChange={(e) => setStemLoopMode(e.target.value as any)} 
                      disabled={!hasSelection || isDownloading}
                      className="form-select form-select-sm mb-1 rounded-3" 
                      style={{ fontSize: '0.75rem' }}
                      title="Choose whether to download the primary precursor locus sequence only or all supporting loci sequences."
                    >
                      <option value="stem-loop-best">Best candidate only</option>
                      <option value="stem-loop-all">All candidates</option>
                    </select>
                    <div className="small text-muted mb-2 lh-sm" style={{ fontSize: '0.65rem' }}>
                      Best candidate downloads the primary locus sequence; all candidates downloads all supporting loci.
                    </div>
                    <button 
                      onClick={() => handleDownloadFasta(stemLoopMode)} 
                      disabled={!hasSelection || isDownloading} 
                      className={`btn btn-sm w-100 d-flex align-items-center justify-content-center ${hasSelection ? 'btn-success' : 'btn-secondary disabled'}`}
                    >
                      <FileText size={16} className="me-2" /> Stem-loop (.fasta)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {hasAnyFilter && (
            <div className="d-flex justify-content-end border-top pt-3 mt-3">
              <button onClick={clearFilters} className="btn btn-link btn-sm text-danger fw-bold text-uppercase p-0">
                <X size={12} className="me-1" /> Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* --- TABELA --- */}
      <div className="card border shadow rounded-4 overflow-hidden">
        <div className="card-header bg-success-subtle border-bottom d-flex justify-content-between align-items-center py-3">
          <div className="small fw-bold text-primary">
            {isLoading ? 'Loading...' : `FOUND ${(data?.total || 0).toLocaleString('en-US')} miRNAs`}
          </div>
        </div>

        {isLoading ? (
          <div className="d-flex flex-column align-items-center justify-content-center py-5">
            <div className="spinner-border text-primary mb-3" role="status"><span className="visually-hidden">Loading...</span></div>
            <p className="text-ema-muted fw-medium">Processing data...</p>
          </div>
        ) : isError ? (
          <div className="p-5 text-center text-danger">Error loading data.</div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light border-bottom">
                <tr>
                  <th className="text-center" style={{ width: '3rem' }}>
                    <button onClick={toggleSelectAll} className="btn btn-link p-0 text-primary">
                      {isAllPageSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                    </button>
                  </th>
                  <th className="px-4 py-3 small fw-bold text-ema-muted text-uppercase">miRNA ID</th>
                  <th className="px-4 py-3 small fw-bold text-ema-muted text-uppercase">Mature sequence</th>
                  <th className="px-4 py-3 small fw-bold text-ema-muted text-uppercase">Family</th>
                  <th className="px-4 py-3 text-center small fw-bold text-ema-muted text-uppercase">Situation</th>
                  {debouncedSearchTerm && <th className="px-4 py-3 text-center small fw-bold text-ema-muted text-uppercase" style={{ width: '8rem' }}>Matches</th>}
                </tr>
              </thead>
              <tbody>
                {data?.data.map((mirna: any) => {
                  const isSelected = selectedIds.includes(mirna.accession);
                  const hasMatches = debouncedSearchTerm && (
                    mirna.mirna_id.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                    mirna.mature_sequence.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                    (mirna.family && mirna.family.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) ||
                    (mirna.matching_targets && mirna.matching_targets.length > 0)
                  );
                  return (
                    <Fragment key={mirna.accession}>
                      <tr className={isSelected ? 'table-primary' : ''}>
                        <td className="text-center">
                          <button onClick={() => toggleSelection(mirna.accession)} className={`btn btn-link p-0 ${isSelected ? 'text-primary' : 'text-secondary'}`}>
                            {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                          </button>
                        </td>
                        <td className="px-4 py-3 fw-bold text-ema-text">
                          <Link to={`/mirna/${mirna.accession}`} className="text-decoration-none text-ema-text hover-underline">
                            {mirna.mirna_id}
                          </Link>
                        </td>
                        <td className="px-4 py-3 font-monospace small text-ema-muted">{mirna.mature_sequence}</td>
                        <td className="px-4 py-3">
                          <span className="badge bg-secondary-subtle text-secondary border">{mirna.family && mirna.family !== 'nan' ? mirna.family : 'Unclassified'}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`${getSituationStyle(mirna.situation)} small text-uppercase`}>{mirna.situation}</span>
                        </td>
                        {debouncedSearchTerm && (
                          <td className="px-4 py-3 text-center">
                            {hasMatches && (
                              <button 
                                onClick={() => {
                                  const accession = mirna.accession;
                                  setExpandedAccessions(prev => 
                                    prev.includes(accession) 
                                      ? prev.filter(id => id !== accession) 
                                      : [...prev, accession]
                                  );
                                }}
                                className="btn btn-outline-primary btn-sm rounded-pill px-2 py-1 d-inline-flex align-items-center gap-1"
                                style={{ fontSize: '0.75rem' }}
                              >
                                {expandedAccessions.includes(mirna.accession) ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                {expandedAccessions.includes(mirna.accession) ? 'Hide' : 'Show'}
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                      {expandedAccessions.includes(mirna.accession) && hasMatches && (
                        <tr className="bg-light-subtle">
                          <td colSpan={6} className="p-3 border-bottom">
                            <div className="bg-white p-3 rounded-3 border shadow-sm mx-auto animate-fade-in" style={{ maxWidth: '98%' }}>
                              <h6 className="fw-bold text-ema-primary mb-3 border-bottom pb-2" style={{ fontSize: '0.85rem' }}>
                                Search matches for "{debouncedSearchTerm}"
                              </h6>
                              <div className="d-flex flex-column gap-3">
                                {/* miRNA matches */}
                                {(mirna.mirna_id.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                                  mirna.mature_sequence.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                                  (mirna.family && mirna.family.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))) && (
                                  <div className="p-3 bg-light rounded-3 border">
                                    <span className="small fw-bold text-ema-muted text-uppercase d-block mb-2" style={{ fontSize: '0.65rem' }}>miRNA Properties Match</span>
                                    <div className="small">
                                      {mirna.mirna_id.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) && (
                                        <div className="mb-2"><strong>miRNA ID:</strong> {highlightMatch(mirna.mirna_id, debouncedSearchTerm)}</div>
                                      )}
                                      {mirna.mature_sequence.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) && (
                                        <div className="mb-2"><strong>Mature sequence:</strong> <span className="font-mono bg-light px-1 py-0.5 rounded border">{highlightMatch(mirna.mature_sequence, debouncedSearchTerm)}</span></div>
                                      )}
                                      {mirna.family && mirna.family.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) && (
                                        <div><strong>Family:</strong> <span className="badge bg-secondary-subtle text-secondary border">{highlightMatch(mirna.family, debouncedSearchTerm)}</span></div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Target matches */}
                                {mirna.matching_targets && mirna.matching_targets.length > 0 && (
                                  <div className="p-3 bg-light rounded-3 border">
                                    <span className="small fw-bold text-ema-muted text-uppercase d-block mb-2" style={{ fontSize: '0.65rem' }}>Matching Targets ({mirna.matching_targets.length})</span>
                                    <div className="row row-cols-1 row-cols-md-2 g-2">
                                      {mirna.matching_targets.map((t: any, tIdx: number) => (
                                        <div key={tIdx} className="col">
                                          <div className="p-2 border rounded bg-white shadow-sm h-100 small">
                                            <div className="d-flex justify-content-between align-items-center mb-1">
                                              <span className="fw-bold text-ema-primary">{highlightMatch(t.target_locus || t.target_accession, debouncedSearchTerm)}</span>
                                              <span className="badge bg-secondary-subtle text-secondary border" style={{ fontSize: '0.6rem' }}>{t.match_reason}</span>
                                            </div>
                                            {t.target_accession && t.target_accession !== t.target_locus && (
                                              <div className="text-muted mb-1" style={{ fontSize: '0.7rem' }}><strong>Accession:</strong> {highlightMatch(t.target_accession, debouncedSearchTerm)}</div>
                                            )}
                                            {t.description && (
                                              <div className="text-secondary mb-1"><strong>Description:</strong> {highlightMatch(t.description, debouncedSearchTerm)}</div>
                                            )}
                                            {t.go_terms && t.go_terms !== 'nan' && (
                                              <div className="text-muted mb-1" style={{ fontSize: '0.7rem' }}><strong>GO terms:</strong> {highlightMatch(t.go_terms, debouncedSearchTerm)}</div>
                                            )}
                                            {t.best_hit_arabi && (
                                              <div className="text-muted" style={{ fontSize: '0.7rem' }}><strong>Arabidopsis homolog:</strong> {highlightMatch(t.best_hit_arabi, debouncedSearchTerm)}</div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {data && data.total_pages > 1 && (
          <div className="card-footer bg-light border-top">
            <nav>
              <ul className="pagination justify-content-between mb-0">
                <li className="page-item">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="page-link d-flex align-items-center">
                    <ChevronLeft size={16} className="me-1" /> Prev
                  </button>
                </li>
                <li className="page-item disabled px-3 py-2 small fw-bold text-ema-muted">Page {page} of {data.total_pages}</li>
                <li className="page-item">
                  <button onClick={() => setPage(p => Math.min(data.total_pages, p + 1))} disabled={page === data.total_pages} className="page-link d-flex align-items-center">
                    Next <ChevronRight size={16} className="ms-1" />
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
