export interface ReferenceDetails {
  citation: string;
  doi: string;
  // Tags estruturadas para o filtro
  tags: {
    tissues: string[];    // Ex: Stem, Leaves, Xylem
    conditions: string[]; // Ex: Stress, Development
    stage?: string;
  };
}

export const REFERENCES_DB: Record<string, ReferenceDetails> = {
  "LEVY-2014": {
    citation: "LEVY, A. et al. Profiling microRNAs in Eucalyptus grandis during development. BMC Genomics, 2014.",
    doi: "https://doi.org/10.1186/1471-2164-15-524",
    tags: {
      tissues: ["Xylem", "Stem"],
      conditions: ["Development", "Adventitious rooting"],
      stage: "Seedlings (14 days)"
    }
  },
  "LIN-2018": {
    citation: "LIN, Z. et al. Identification of novel miRNAs and their target genes. Tree Genetics & Genomes, 2018.",
    doi: "https://doi.org/10.1007/s11295-018-1273-x",
    tags: {
      tissues: ["Leaves", "Stem"],
      conditions: ["Development"],
      stage: "5 months old"
    }
  },
  "PAPPAS-2013": {
    citation: "PAPPAS, M. et al. Genome-wide discovery and validation of Eucalyptus small RNAs. BMC Genomics, 2015.",
    doi: "https://doi.org/10.1186/s12864-015-2322-6",
    tags: {
      tissues: ["Xylem", "Leaves"],
      conditions: ["Conservation"],
      stage: "Adult and seedlings"
    }
  },
  "QIN-2021": {
    citation: "QIN, Z. et al. Genome-wide identification of microRNAs involved in somatic embryogenesis. G3, 2021.",
    doi: "https://doi.org/10.1093/g3journal/jkab070",
    tags: {
      tissues: ["Stem", "Callus"],
      conditions: ["Somatic embryogenesis"],
      stage: "Adult (source)"
    }
  },
  "TOLENTINO-2022": {
    citation: "TOLENTINO, F. T. et al. Identification of microRNAs and their expression profiles on tension and opposite wood of Eucalyptus. Theoretical and Experimental Plant Physiology, v. 34, p. 485–500, 2022.",
    doi: "https://doi.org/10.1007/s40626-022-00259-9",
    tags: {
      tissues: ["Stem", "Xylem", "Tension wood", "Opposite wood"],
      conditions: ["Mechanical stress", "Tension wood", "Opposite wood", "Control"],
      stage: "Bent plants"
    }
  }
};