import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { miRNAApi } from '../services/api';
import { ChevronLeft, ChevronRight, Search, Tag, X, CheckSquare, Square, DownloadCloud, FileText, FileCode, FileSpreadsheet, Filter, ChevronDown, ChevronUp } from 'lucide-react';

export default function Browser() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [situation, setSituation] = useState<string>('');
  const [selectedFamily, setSelectedFamily] = useState<string>('');
  
  // LÓGICA DE DEBOUNCE (Resolve a lentidão na pesquisa)
  const [searchInput, setSearchInput] = useState(''); // O que o usuário digita
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(''); // O que vai para a API

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchInput);
      setPage(1); // Reseta para a página 1 ao pesquisar
    }, 600); // Espera 600ms após parar de digitar
    return () => clearTimeout(timer);
  }, [searchInput]);

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

  // ESTADO DE EXPANSÃO (para targets e loci)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRowExpansion = (accession: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(accession)) {
        newSet.delete(accession);
      } else {
        newSet.add(accession);
      }
      return newSet;
    });
  };

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

  const handleDownloadFasta = async (type: 'mature' | 'stem-loop') => {
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

  // Download Tabela CSV
  const handleDownloadTable = () => {
    if (!data?.data) return;

    const rowsToExport = selectedIds.length > 0
        ? data.data.filter((m: any) => selectedIds.includes(m.accession))
        : data.data;

    if (rowsToExport.length === 0) return;

    const headers = ["miRNA ID", "Mature Sequence", "Family", "Situation"];
    
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
    link.setAttribute("download", `ema_mirna_table_${selectedIds.length > 0 ? 'selected' : 'page'}.csv`);
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

  const handleRowClick = (accession: number) => {
    window.location.hash = `/mirna/${accession}`;
  };

  const FilterTagList = ({ title, category, facets }: { title: string, category: keyof typeof activeFilters, facets: Record<string, number> | undefined }) => {
    if (!facets || Object.keys(facets).length === 0) return null;
    return (
      <div className="mb-2">
        <span className="small text-ema-muted me-2 fw-bold" style={{ minWidth: '80px', display: 'inline-block' }}>{title}:</span>
        <div className="d-inline-flex flex-wrap gap-1">
          {Object.entries(facets).map(([val, count]) => (
            <button
              key={val}
              onClick={() => toggleFilter(category, val)}
              className={`btn btn-sm py-0 px-2 rounded-pill border ${activeFilters[category].includes(val) ? 'btn-primary border-primary' : 'btn-outline-secondary'}`}
              style={{ fontSize: '0.75rem' }}
            >
              {val} <span className="opacity-50 ms-1">({count})</span>
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
          <h1 className="font-display display-5 text-ema-text">miRNA Browser</h1>
          <p className="text-ema-muted mt-2 fs-5">
            Browse, filter and explore the complete catalog of <em>Eucalyptus grandis</em> miRNAs.
          </p>
        </div>
      </div>

      {/* --- CONTAINER DE FILTROS E AÇÕES --- */}
      <div className="card border shadow rounded-4 p-4">
        <div className="card-body d-flex flex-column gap-4">
        
          {/* 1. SEARCH BAR */}
          <div>
            <label className="d-flex align-items-center gap-2 small fw-bold text-ema-primary text-uppercase letter-spacing-wider mb-3">
              <Search size={16} /> Global Search
            </label>
            <div className="position-relative">
              <input
                type="text"
                placeholder="Search by miRNA ID, sequence, target gene ID or gene description..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="form-control form-control-lg rounded-3"
                style={{ paddingLeft: '3rem' }}
              />
              <Search size={24} className="text-muted position-absolute top-50 start-0 translate-middle-y ms-3" />
            </div>
          </div>

          <hr className="my-1" />

          {/* 2. Grid de Filtros Secundários */}
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
            {/* 3. Filtros de Contexto (Tags Grouped) */}
            <div className="col-lg-8">
              <div className="d-flex align-items-center gap-2 mb-3">
                <Tag size={16} className="text-ema-primary" />
                <h3 className="small fw-bold text-ema-text text-uppercase mb-0">Experimental Context Filters</h3>
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

            {/* 4. Data Export */}
            <div className="col-lg-4 border-start">
              <div className="d-flex align-items-center gap-2 mb-3">
                <DownloadCloud size={16} className="text-ema-primary" />
                <h3 className="small fw-bold text-ema-text text-uppercase mb-0">Data Export</h3>
              </div>

              <div className="bg-light rounded-3 p-3 border">
                <div className="d-flex flex-column gap-3">
                  <div className="d-flex align-items-center justify-content-between">
                    <span className={`small fw-bold ${hasSelection ? 'text-ema-primary' : 'text-secondary'}`}>
                      {selectedIds.length > 0 ? `${selectedIds.length} sequence(s) selected` : 'Export current selection'}
                    </span>
                  </div>

                  <div className="d-flex flex-column gap-2">
                    <button onClick={handleDownloadTable} className="btn btn-outline-secondary btn-sm w-100 d-flex align-items-center justify-content-center">
                      <FileSpreadsheet size={16} className="me-2" /> Table (.csv)
                    </button>
                    <button onClick={() => handleDownloadFasta('mature')} disabled={!hasSelection || isDownloading} className={`btn btn-sm w-100 d-flex align-items-center justify-content-center ${hasSelection ? 'btn-primary' : 'btn-secondary disabled'}`}>
                      <FileCode size={16} className="me-2" /> Mature (.fasta)
                    </button>
                    <button onClick={() => handleDownloadFasta('stem-loop')} disabled={!hasSelection || isDownloading} className={`btn btn-sm w-100 d-flex align-items-center justify-content-center ${hasSelection ? 'btn-success' : 'btn-secondary disabled'}`}>
                      <FileText size={16} className="me-2" /> Stem-loop (.fasta)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Clear Filters Geral */}
          {hasAnyFilter && (
            <div className="d-flex justify-content-end border-top pt-3 mt-3">
              <button onClick={clearFilters} className="btn btn-link btn-sm text-danger fw-bold text-uppercase p-0">
                <X size={12} className="me-1" /> Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* --- TABELA DE RESULTADOS --- */}
      <div className="card border shadow rounded-4 overflow-hidden">
        <div className="card-header bg-success-subtle border-bottom d-flex justify-content-between align-items-center">
          <div className="small fw-medium text-primary">
            {isLoading ? 'Loading...' : `Showing ${data?.total ? ((page - 1) * limit) + 1 : 0}-${Math.min(page * limit, data?.total || 0)} of ${data?.total || 0} entries`}
          </div>
        </div>

        {isLoading ? (
          <div className="d-flex flex-column align-items-center justify-content-center py-5">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
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
                  <th className="px-2" style={{ width: '2rem' }}></th>
                  <th className="px-4 py-3 small fw-bold text-ema-muted text-uppercase">miRNA ID</th>
                  <th className="px-4 py-3 small fw-bold text-ema-muted text-uppercase">Mature Sequence</th>
                  <th className="px-4 py-3 small fw-bold text-ema-muted text-uppercase">Family</th>
                  <th className="px-4 py-3 text-center small fw-bold text-ema-muted text-uppercase">Situation</th>
                </tr>
              </thead>
              <tbody>
                {data?.data.map((mirna: any) => {
                  const isSelected = selectedIds.includes(mirna.accession);
                  const isExpanded = expandedRows.has(mirna.accession);
                  const hasFilteredLoci = mirna._filtered_loci && mirna._filtered_loci.length > 0;
                  const hasMatchingTargets = mirna.matching_targets && mirna.matching_targets.length > 0;

                  return (
                    <Fragment key={mirna.accession}>
                      <tr className={isSelected ? 'table-primary' : ''}>
                        <td className="text-center">
                          <button onClick={(e) => { e.stopPropagation(); toggleSelection(mirna.accession); }} className={`btn btn-link p-0 ${isSelected ? 'text-primary' : 'text-secondary'}`}>
                            {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                          </button>
                        </td>
                        <td className="px-2">
                          <button onClick={(e) => { e.stopPropagation(); toggleRowExpansion(mirna.accession); }} className="btn btn-link p-0 text-primary">
                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </button>
                        </td>
                        <td onClick={() => handleRowClick(mirna.accession)} className="px-4 py-3 fw-bold text-ema-text cursor-pointer">{mirna.mirna_id}</td>
                        <td onClick={() => handleRowClick(mirna.accession)} className="px-4 py-3 font-monospace small text-ema-muted cursor-pointer">{mirna.mature_sequence}</td>
                        <td onClick={() => handleRowClick(mirna.accession)} className="px-4 py-3 cursor-pointer">
                          <span className="badge bg-secondary-subtle text-secondary border">{mirna.family}</span>
                        </td>
                        <td className="px-4 py-3 text-center cursor-pointer" onClick={() => handleRowClick(mirna.accession)}>
                          <span className={`${getSituationStyle(mirna.situation)} small text-uppercase`}>{mirna.situation}</span>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td colSpan={6} className="p-0">
                            <div className="bg-light border-top p-4">
                              <div className="row g-4">
                                {/* LOCI PANEL */}
                                <div className="col-md-5">
                                  <h6 className="small fw-bold text-ema-text text-uppercase mb-3 d-flex align-items-center gap-2">
                                    <Filter size={14} className="text-primary" /> Discovery Evidence (Filtered)
                                  </h6>
                                  {hasFilteredLoci ? (
                                    <div className="table-responsive">
                                      <table className="table table-sm table-bordered bg-white small mb-0">
                                        <thead className="table-secondary">
                                          <tr>
                                            <th>Study</th>
                                            <th>Locus</th>
                                            <th className="text-center">Score</th>
                                            <th className="text-center">Randfold</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {mirna._filtered_loci.map((locus: any, idx: number) => (
                                            <tr key={idx}>
                                              <td className="fw-bold">{locus.study_name}</td>
                                              <td className="font-monospace">{locus.provisional_id}</td>
                                              <td className="text-center">{locus.score}</td>
                                              <td className="text-center">{locus.randfold}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : (
                                    <div className="alert alert-warning py-2 px-3 small mb-0">No discovery evidence matches the active filters.</div>
                                  )}
                                </div>

                                {/* TARGETS PANEL */}
                                <div className="col-md-7">
                                  <h6 className="small fw-bold text-ema-text text-uppercase mb-3 d-flex align-items-center gap-2">
                                    <Search size={14} className="text-success" /> Matching Targets
                                  </h6>
                                  {hasMatchingTargets ? (
                                    <div className="table-responsive">
                                      <table className="table table-sm table-bordered bg-white small mb-0">
                                        <thead className="table-secondary">
                                          <tr>
                                            <th>Target Gene</th>
                                            <th>Description</th>
                                            <th className="text-center">Expect.</th>
                                            <th className="text-center">Inhib.</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {mirna.matching_targets.map((target: any, idx: number) => (
                                            <tr key={idx}>
                                              <td className="font-monospace">{target.target_accession}</td>
                                              <td><div className="text-truncate" style={{ maxWidth: '200px' }} title={target.description}>{target.description || '-'}</div></td>
                                              <td className="text-center">{target.expectation?.toFixed(1)}</td>
                                              <td className="text-center">{target.inhibition_type?.charAt(0)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : (
                                    <div className="text-muted small fst-italic">Search for targets to see matching evidence here.</div>
                                  )}
                                </div>
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

        {/* Pagination */}
        {data && data.total_pages > 1 && (
          <div className="card-footer bg-light border-top">
            <nav aria-label="Page navigation">
              <ul className="pagination justify-content-between mb-0">
                <li className="page-item">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="page-link d-flex align-items-center">
                    <ChevronLeft size={16} className="me-1" /> Prev
                  </button>
                </li>
                <li className="page-item disabled">
                  <span className="page-link">Page {page} of {data.total_pages}</span>
                </li>
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

function Fragment({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
