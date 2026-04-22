import axios from 'axios';
import type { 
  MiRNACore, 
  MiRNADetail, 
  PaginatedResponse, 
  Stats, 
  FamilyInfo,
  PaginatedSearchResponse,
  MatchingTarget
} from '../types/mirna';

const DATA_BASE = `${import.meta.env.BASE_URL}data/export_json`;

// Cache for static data
class DataManager {
  private static instance: DataManager;
  private mirnas: MiRNACore[] | null = null;
  private stats: Stats | null = null;
  private geneAnnotations: any[] | null = null;
  private targets: Map<number, any[]> = new Map();
  private samples: any[] | null = null;
  private studies: any[] | null = null;

  private constructor() {}

  public static getInstance(): DataManager {
    if (!DataManager.instance) {
      DataManager.instance = new DataManager();
    }
    return DataManager.instance;
  }

  public async getMirnas(): Promise<MiRNACore[]> {
    if (!this.mirnas) {
      const response = await axios.get(`${DATA_BASE}/mirnas.json`);
      this.mirnas = response.data.map((m: any) => ({
        ...m,
        family: (m.family === null || m.family === undefined || m.family === 'nan') ? 'Unclassified' : m.family
      }));
    }
    return this.mirnas!;
  }

  public async getFamilies(): Promise<FamilyInfo[]> {
    const mirnas = await this.getMirnas();
    const familiesMap = new Map<string, number>();
    
    mirnas.forEach(m => {
      const family = m.family || 'Unclassified';
      familiesMap.set(family, (familiesMap.get(family) || 0) + 1);
    });

    return Array.from(familiesMap.entries()).map(([family, count]) => ({
      family,
      total_members: count
    })) as FamilyInfo[];
  }

  public async getStats(): Promise<Stats> {
    if (!this.stats) {
      const response = await axios.get(`${DATA_BASE}/stats.json`);
      this.stats = response.data;
    }
    return this.stats!;
  }

  public async getGeneAnnotations(): Promise<any[]> {
    if (!this.geneAnnotations) {
      const response = await axios.get(`${DATA_BASE}/gene_annotations.json`);
      this.geneAnnotations = response.data;
    }
    return this.geneAnnotations!;
  }

  public async getTargets(accession: number): Promise<any[]> {
    if (!this.targets.has(accession)) {
      try {
        const response = await axios.get(`${DATA_BASE}/targets/${accession}.json`);
        this.targets.set(accession, response.data);
      } catch (e) {
        this.targets.set(accession, []);
      }
    }
    return this.targets.get(accession)!;
  }

  public async getSamples(): Promise<any[]> {
    if (!this.samples) {
      const response = await axios.get(`${DATA_BASE}/samples.json`);
      this.samples = response.data;
    }
    return this.samples!;
  }

  public async getStudies(): Promise<any[]> {
    if (!this.studies) {
      const response = await axios.get(`${DATA_BASE}/studies.json`);
      this.studies = response.data;
    }
    return this.studies!;
  }

  public async fetchAllTargets(): Promise<void> {
    const mirnas = await this.getMirnas();
    const accessions = mirnas.map(m => m.accession);
    await Promise.all(accessions.map(acc => this.getTargets(acc)));
  }
}

const dataManager = DataManager.getInstance();

// API Methods
export const miRNAApi = {
  getMiRNAs: async (params: {
    page: number;
    limit: number;
    situation?: string;
    family?: string;
    search?: string;
    reference?: string;
  }) => {
    let mirnas = await dataManager.getMirnas();

    // Filters
    if (params.situation) {
      mirnas = mirnas.filter(m => m.situation === params.situation);
    }
    if (params.family) {
      mirnas = mirnas.filter(m => m.family === params.family);
    }

    if (params.search) {
      const searchTerm = params.search.toLowerCase();
      
      await dataManager.getGeneAnnotations();
      await dataManager.fetchAllTargets();
      const annotations = await dataManager.getGeneAnnotations();
      
      const matchingGeneAccessions = new Set(
        annotations
          .filter(a => 
            a.locus_name?.toLowerCase().includes(searchTerm) ||
            a.transcript_name?.toLowerCase().includes(searchTerm) ||
            a.description?.toLowerCase().includes(searchTerm) ||
            a.go_terms?.toLowerCase().includes(searchTerm) ||
            a.best_hit_arabi?.toLowerCase().includes(searchTerm)
          )
          .map(a => a.transcript_name)
      );

      const results = [];

      for (const mirna of mirnas) {
        let matchingTargetsForThisMiRNA: MatchingTarget[] = [];
        let matchReason = '';

        const familyName = mirna.family || 'Unclassified';
        if (mirna.mirna_id.toLowerCase().includes(searchTerm) || 
            mirna.mature_sequence.toLowerCase().includes(searchTerm) ||
            familyName.toLowerCase().includes(searchTerm)) {
          matchReason = 'miRNA match';
        }

        const mirnaTargets = await dataManager.getTargets(mirna.accession);
        const matchedTargets = mirnaTargets.filter(t => 
          matchingGeneAccessions.has(t.target_accession) ||
          t.target_accession?.toLowerCase().includes(searchTerm) ||
          t.target_locus?.toLowerCase().includes(searchTerm)
        );

        if (matchedTargets.length > 0) {
          matchingTargetsForThisMiRNA = matchedTargets.map(t => {
            const annot = annotations.find(a => a.transcript_name === t.target_accession);
            return {
              target_accession: t.target_accession,
              target_locus: t.target_locus,
              expectation: t.expectation,
              inhibition_type: t.inhibition_type,
              description: annot?.description,
              go_terms: annot?.go_terms,
              best_hit_arabi: annot?.best_hit_arabi,
              match_reason: matchingGeneAccessions.has(t.target_accession) ? 'Target annotation match' : 'Target ID match'
            };
          });
        }

        if (matchReason || matchingTargetsForThisMiRNA.length > 0) {
          results.push({
            ...mirna,
            matching_targets: matchingTargetsForThisMiRNA,
            total_targets: 0
          });
        }
      }

      const total = results.length;
      const totalPages = Math.ceil(total / params.limit);
      const start = (params.page - 1) * params.limit;
      const paginatedData = results.slice(start, start + params.limit);

      return {
        data: paginatedData,
        total,
        page: params.page,
        total_pages: totalPages
      } as PaginatedSearchResponse;
    }

    const total = mirnas.length;
    const totalPages = Math.ceil(total / params.limit);
    const start = (params.page - 1) * params.limit;
    const paginatedData = mirnas.slice(start, start + params.limit);

    return {
      data: paginatedData,
      total,
      page: params.page,
      total_pages: totalPages
    } as PaginatedResponse<MiRNACore>;
  },

  getFamilies: async () => {
    return dataManager.getFamilies();
  },

  getStats: async () => {
    return dataManager.getStats();
  },

  getMiRNADetail: async (id: number | string) => {
    let rawData: any;
    if (typeof id === 'number' || !isNaN(Number(id))) {
      const accession = Number(id);
      const response = await axios.get(`${DATA_BASE}/mirna_detail/${accession}.json`);
      rawData = response.data;
    } else {
      const response = await axios.get(`${DATA_BASE}/mirna_detail_by_id/${id}.json`);
      rawData = response.data;
    }

    const studies = await dataManager.getStudies();
    const samples = await dataManager.getSamples();
    const annotations = await dataManager.getGeneAnnotations();
    const degAnalysis = await axios.get(`${DATA_BASE}/deg_analysis.json`).then(r => r.data);

    // Deep copy and map data
    const mirnaData: MiRNADetail = {
      ...rawData.core,
      ...rawData,
      family: (rawData.core?.family === null || rawData.core?.family === undefined || rawData.core?.family === 'nan') ? 'Unclassified' : rawData.core.family
    };
    delete (mirnaData as any).core;

    // Map Expressions
    if (mirnaData.expressions) {
      mirnaData.expressions = mirnaData.expressions.map((exp: any) => {
        const sample = samples.find(s => s.srr_accession === exp.srr_accession);
        const study = studies.find(st => st.study_id === (sample?.study_id || exp.sample_study_id));
        return {
          ...exp,
          sample: {
            ...sample,
            study: study
          }
        };
      });
    }

    // Map DEGs
    if (mirnaData.degs) {
      mirnaData.degs = mirnaData.degs.map((deg: any) => {
        const study = studies.find(st => st.study_id === deg.study_id);
        const analysis = degAnalysis.find((a: any) => a.study_id === deg.study_id && a.comparison === deg.comparison);
        return {
          ...deg,
          ...analysis,
          study: study
        };
      });
    }

    // Map References
    if (mirnaData.references) {
      mirnaData.references = mirnaData.references.map((ref: any) => {
        const study = studies.find(st => st.study_id === ref.study_id);
        const studySamples = samples.filter(s => s.study_id === ref.study_id);
        return {
          ...ref,
          study: {
            ...study,
            samples: studySamples
          }
        };
      });
    }

    // Map Targets
    if (mirnaData.targets) {
      mirnaData.targets = mirnaData.targets.map(t => {
        const annot = annotations.find(a => a.transcript_name === t.target_accession);
        return {
          ...t,
          annotation: annot || undefined
        };
      });
    }

    return mirnaData;
  },

  downloadSequences: async (accessions: number[], type: 'mature' | 'stem-loop') => {
    const mirnas = await dataManager.getMirnas();
    let fastaContent = '';

    for (const acc of accessions) {
      const mirna = mirnas.find(m => m.accession === acc);
      if (!mirna) continue;

      if (type === 'mature') {
        fastaContent += `>${mirna.mirna_id}\n${mirna.mature_sequence}\n`;
      } else {
        const detail = await miRNAApi.getMiRNADetail(acc);
        const seq = detail.precursors?.[0]?.premir_sequence_stem_loop || '';
        if (seq) {
          fastaContent += `>${mirna.mirna_id}_stem_loop\n${seq}\n`;
        }
      }
    }
    
    const blob = new Blob([fastaContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ema_${type}_sequences.fasta`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
};
