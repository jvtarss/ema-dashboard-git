export interface MiRNADegAnalysis {
  analysis_id: number;
  study_id: number;
  comparison?: string;
  design?: string;
  n_groups?: number;
  reps_per_group?: string;
  total_mirnas_before_prefilter?: number;
  tested_mirnas_after_prefilter?: number;
  prefilter_rule?: string;
  fdr_threshold?: number;
  significance_rule?: string;
  confidence_class?: string;
  source_file?: string;
  n_significant_dems?: number;
}

export interface Study {
  study_id: number;
  author_id: string;
  doi?: string;
  title?: string;
  deg_analysis: MiRNADegAnalysis[];
}

export interface Sample {
  srr_accession: string;
  study_id: number;
  tissue?: string;
  genotype?: string;
  condition?: string;
  replicate?: number;
  total_mapped_reads?: number;
  study?: Study;
}

export interface MiRNACore {
  accession: number;
  mirna_id: string;
  mature_sequence: string;
  situation: 'known' | 'novel' | 'candidate';
  family?: string;
  curation_status?: string;
  entry_date?: string;
  last_modification?: string;
}

export interface GeneAnnotation {
  transcript_name: string;
  locus_name?: string;
  description?: string;
  go_terms?: string;
  pfam?: string;
  best_hit_arabi?: string;
}

export interface MiRNATarget {
  target_interaction_id: number;
  mirna_core_accession: number;
  target_accession: string;
  target_locus: string;
  target_full_id?: string;
  target_annot_version?: string;
  expectation?: number;
  upe?: number;
  mirna_align_start?: number;
  mirna_align_end?: number;
  target_align_start?: number;
  target_align_end?: number;
  mirna_aligned_fragment?: string;
  target_aligned_fragment?: string;
  inhibition_type?: string;
  annotation?: GeneAnnotation;
}

export interface MiRNAFamily {
  accession: number;
  family_consensus: string;
  best_hit_id?: string;
  pident?: number;
  evalue?: number;
  bitscore?: number;
}

export interface MiRNARef {
  ref_id: number;
  mirna_core_accession: number;
  study_id: number;
  acc_in_work?: string;
  detection_source?: string;
  study?: Study;
}

export interface MiRNAExpression {
  id: number;
  mirna_core_accession: number;
  srr_accession: string;
  raw_count: number;
  cpm?: number;
  sample?: Sample;
}

export interface MiRNADeg {
  id: number;
  mirna_core_accession: number;
  study_id: number;
  comparison: string;
  log2_fold_change?: number;
  padj?: number;
  direction?: string;
  base_mean?: number;
  lfc_se?: number;
  stat?: number;
  pvalue?: number;
  design?: string;
  n_groups?: number;
  reps_per_group?: string;
  total_mirnas_before_prefilter?: number;
  tested_mirnas_after_prefilter?: number;
  prefilter_rule?: string;
  fdr_threshold?: number;
  significance_rule?: string;
  confidence_class?: string;
  study?: Study;
}

export interface MiRNAPrecursor {
  id: number;
  precursor_id?: number;
  mirna_accession: number;
  origin_sequence?: string;
  premir_sequence_stem_loop?: string;
  chr_scaf: string;
  strand: string;
  start_genomic: number;
  end_genomic: number;
  precursor_length?: number;
  mfe?: number;
  amfe?: number;
  mapq?: number;
  gff_annotation?: string;
  star_sequence_predicted?: string;
  duplex_status?: string;
  param_analysis_type?: string;
  tier_classification?: string;
  classification_reason?: string;
  stem_loop_structure_dotbracket?: string;
  pri_mirna_context_seq?: string;
  star_length?: number;
  has_genome_gaps?: string;
}

export interface MiRNADiscoveryMetrics {
  id: number;
  mirna_core_accession: number;
  study_id: number;
  provisional_id?: string;
  score_total?: number;
  score_star?: number;
  score_read_counts?: number;
  score_mfe?: number;
  score_randfold?: number;
  score_cons_seed?: number;
  total_read_count?: number;
  mature_read_count?: number;
  loop_read_count?: number;
  star_read_count?: number;
  randfold?: string;
  true_positive_probability?: string;
  rfam_alert?: string;
  mature_matches_mirbase?: string;
  passed_am2018_filters?: number;
  study?: Study;
}

export interface MiRNADiscoveryEvidence {
  evidence_id: number;
  mirna_core_accession: number;
  mirna_id?: string;
  situation?: string;
  family?: string;
  study_id: number;
  study_name?: string;
  provisional_id: string;
  evidence_relation: string;
  retained_for_dashboard: number;
  source_result_file?: string;

  observed_mature_sequence: string;
  observed_star_sequence?: string;
  observed_precursor_sequence?: string;
  precursor_coordinate?: string;
  mirbase_mirna?: string;
  seed_ref?: string;
  mature_matches_mirbase?: string;

  score_total?: number;
  score_star?: number;
  score_read_counts?: number;
  score_mfe?: number;
  score_randfold?: number;
  score_cons_seed?: number;
  total_read_count?: number;
  mature_read_count?: number;
  loop_read_count?: number;
  star_read_count?: number;
  randfold?: string;
  true_positive_probability?: string;
  rfam_alert?: string;
  passed_am2018_filters?: string;

  chr_scaf?: string;
  strand?: string;
  start_genomic?: number;
  end_genomic?: number;

  precursor_id?: number;
  origin_sequence?: string;
  premir_sequence_stem_loop?: string;
  precursor_length?: number;
  mfe?: number;
  amfe?: number;
  mapq?: number;
  gff_annotation?: string;
  param_analysis_type?: string;
  star_sequence_predicted?: string;
  star_length?: number;
  duplex_status?: string;
  has_genome_gaps?: string;
  pri_mirna_context_seq?: string;
  stem_loop_structure_dotbracket?: string;
  tier_classification?: string;
  classification_reason?: string;
  
  coord_overlap?: string;
  mature_similarity?: string;
  
  study?: Study;
}

export interface MiRNADetail extends MiRNACore {
  targets: MiRNATarget[];
  references: MiRNARef[];
  precursors: MiRNAPrecursor[];
  expressions: MiRNAExpression[];
  degs: MiRNADeg[];
  discovery_metrics: MiRNADiscoveryMetrics[];
  discovery_evidence: MiRNADiscoveryEvidence[];
  family_info?: MiRNAFamily;
}

export interface PaginatedResponse<T = MiRNACore> {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  data: T[];
}

export interface Stats {
  total_mirnas: number;
  known_mirnas: number;
  novel_mirnas: number;
  distinct_families: number;
  total_targets: number;
  total_studies?: number;
  total_samples?: number;
  total_high_confidence?: number;
  total_references?: number;
}

export interface FamilyInfo {
  family: string;
  total_members: number;
  known: number;
  novel: number;
}

export interface MatchingTarget {
  target_accession: string;
  target_locus: string;
  expectation?: number;
  inhibition_type?: string;
  description?: string;
  go_terms?: string;
  best_hit_arabi?: string;
  match_reason?: string;
}

export interface MiRNACoreWithMatches extends MiRNACore {
  matching_targets: MatchingTarget[];
  total_targets: number;
}

export interface PaginatedSearchResponse {
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  data: MiRNACoreWithMatches[];
  search_term?: string;
}
