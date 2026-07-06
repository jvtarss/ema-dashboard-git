import os
import sys
import sqlite3
import json

def main():
    db_path = "public/data/ema_mirdeep2_union.db"
    annot_file_path = "Egrandis_297_v2.0.P14.annotation_info.txt"
    export_dir = "public/data/export_json"
    
    if not os.path.exists(db_path):
        print(f"Error: Database not found at {db_path}", file=sys.stderr)
        sys.exit(1)
        
    os.makedirs(export_dir, exist_ok=True)
    os.makedirs(os.path.join(export_dir, "mirna_detail"), exist_ok=True)
    os.makedirs(os.path.join(export_dir, "mirna_detail_by_id"), exist_ok=True)
    os.makedirs(os.path.join(export_dir, "targets"), exist_ok=True)
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # ----------------------------------------------------
    # ETAPA 4 -- IMPORTACAO DE ANOTACOES
    # ----------------------------------------------------
    print("=== Importing Gene Annotations ===")
    if not os.path.exists(annot_file_path):
        print(f"Error: Annotation file not found at {annot_file_path}", file=sys.stderr)
        sys.exit(1)
        
    # Clear existing annotations first
    cursor.execute("DELETE FROM gene_annotations;")
    
    annotations_to_insert = []
    with open(annot_file_path, "r", encoding="utf-8") as f:
        header = f.readline().strip().split("\t")
        print("File header columns:", header)
        
        # We need mapping:
        # transcript_name -> transcriptName (col 2)
        # locus_name -> locusName (col 1)
        # description -> Best-hit-arabi-defline (col 11)
        # go_terms -> GO (col 9)
        # pfam -> Pfam (col 4)
        # best_hit_arabi -> Best-hit-arabi-name (col 10)
        
        line_count = 0
        for line in f:
            if not line.strip() or line.startswith("#"):
                continue
            parts = line.strip("\n").split("\t")
            # Pad parts to match header length if truncated
            while len(parts) < len(header):
                parts.append("")
                
            locus_name = parts[1].strip()
            transcript_name = parts[2].strip()
            pfam = parts[4].strip()
            go_terms = parts[9].strip()
            best_hit_arabi = parts[10].strip()
            description = parts[11].strip()
            
            # Helper to check missing/empty values
            def clean_field(val):
                if not val or val.lower() in ("nan", "none", "-", "") or val.isspace():
                    return None
                return val
            
            pfam_c = clean_field(pfam)
            go_c = clean_field(go_terms)
            best_hit_arabi_c = clean_field(best_hit_arabi)
            desc_c = clean_field(description)
            
            # Default description if empty
            if desc_c is None:
                desc_c = "Conserved hypothetical protein"
                
            annotations_to_insert.append((
                transcript_name,
                locus_name,
                desc_c,
                go_c,
                pfam_c,
                best_hit_arabi_c
            ))
            line_count += 1
            
    # Batch insert
    cursor.executemany(
        "INSERT INTO gene_annotations (transcript_name, locus_name, description, go_terms, pfam, best_hit_arabi) VALUES (?, ?, ?, ?, ?, ?);",
        annotations_to_insert
    )
    conn.commit()
    print(f"Successfully loaded {line_count} gene annotations into database.")
    
    # Validation / cross-reference checks
    cursor.execute("SELECT DISTINCT target_accession FROM mirna_targets;")
    target_accessions = [row[0] for row in cursor.fetchall()]
    
    missing_matches = 0
    for acc in target_accessions:
        cursor.execute("SELECT COUNT(*) FROM gene_annotations WHERE transcript_name = ?;", (acc,))
        count = cursor.fetchone()[0]
        if count == 0:
            missing_matches += 1
            
    print(f"Validation: Total unique target_accessions in mirna_targets: {len(target_accessions)}")
    print(f"Validation: Target accessions WITHOUT matching annotation: {missing_matches}")
    
    # ----------------------------------------------------
    # STUDY METADATA MAPPING (ETAPA 1)
    # ----------------------------------------------------
    # Static details from REFERENCES_DB and browser_filter_index.json
    study_metadata = {
        1: { # QIN-2021
            "study_name": "QIN-2021",
            "citation_short": "QIN, Z. et al. Genome-wide identification of microRNAs involved in somatic embryogenesis. G3, 2021.",
            "biological_context": "somatic embryogenesis; juvenile phase",
            "phase": ["juvenile phase"],
            "age": [],
            "study_tags": ["QIN-2021", "somatic embryogenesis", "juvenile phase", "callus", "stem", "GL9", "DH201-2"],
            "fallback_tissues": ["callus", "stem"],
            "fallback_conditions": ["somatic embryogenesis"],
            "fallback_genotypes": ["DH201-2", "GL9"],
            "fallback_phases": ["juvenile phase"],
            "fallback_ages": []
        },
        3: { # TOLENTINO-2022
            "study_name": "TOLENTINO-2022",
            "citation_short": "TOLENTINO-2022",
            "biological_context": "mechanically induced wood formation; juvenile phase (10 months)",
            "phase": ["juvenile phase"],
            "age": ["10 months"],
            "study_tags": ["TOLENTINO-2022", "juvenile phase", "10 months", "stem", "tension_wood", "opposite_wood", "unbent_control"],
            "fallback_tissues": ["stem"],
            "fallback_conditions": ["tension_wood", "opposite_wood", "unbent_control"],
            "fallback_genotypes": [],
            "fallback_phases": ["juvenile phase"],
            "fallback_ages": ["10 months"]
        },
        4: { # LIN-2018
            "study_name": "LIN-2018",
            "citation_short": "LIN-2018",
            "biological_context": "vegetative tissues; juvenile phase (5-month-old plants)",
            "phase": ["juvenile phase"],
            "age": ["5 months"],
            "study_tags": ["LIN-2018", "juvenile phase", "5 months", "leaves", "stem"],
            "fallback_tissues": ["leaves", "stem"],
            "fallback_conditions": [],
            "fallback_genotypes": [],
            "fallback_phases": ["juvenile phase"],
            "fallback_ages": ["5 months"]
        }
    }
    
    # ----------------------------------------------------
    # GENERATING stats.json
    # ----------------------------------------------------
    print("=== Generating stats.json ===")
    cursor.execute("SELECT COUNT(*) FROM mirna_core;")
    total_mirnas = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM mirna_core WHERE situation='known';")
    known_mirnas = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM mirna_core WHERE situation='novel';")
    novel_mirnas = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(DISTINCT family) FROM mirna_core WHERE family IS NOT NULL AND family != '';")
    distinct_families = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM mirna_targets;")
    total_targets = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM studies;")
    total_studies = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM samples;")
    total_samples = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM mirna_precursors WHERE tier_classification IN ('known_reference_supported','novel_multi_study_replicated');")
    total_high_confidence = cursor.fetchone()[0]
    
    stats = {
        "total_mirnas": total_mirnas,
        "known_mirnas": known_mirnas,
        "novel_mirnas": novel_mirnas,
        "distinct_families": distinct_families,
        "total_targets": total_targets,
        "total_studies": total_studies,
        "total_samples": total_samples,
        "total_high_confidence": total_high_confidence
    }
    
    with open(os.path.join(export_dir, "stats.json"), "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2)
        
    # ----------------------------------------------------
    # GENERATING manifest.json
    # ----------------------------------------------------
    print("=== Generating manifest.json ===")
    manifest = {
        "db_source": "ema_mirdeep2_union.db",
        "total_mirnas": total_mirnas,
        "detail_files_by_accession": total_mirnas,
        "detail_files_by_mirna_id": total_mirnas,
        "target_files": total_mirnas,
        "notes": [
            "Only loci with passed_am2018_filters = 1 and score_total >= 0 are exported as visible discovery evidence.",
            "References and expression data are restricted to studies that have at least one visible locus for that miRNA."
        ]
    }
    with open(os.path.join(export_dir, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
        
    # ----------------------------------------------------
    # GENERATING studies.json
    # ----------------------------------------------------
    print("=== Generating studies.json ===")
    cursor.execute("SELECT study_id, author_id, doi, title FROM studies;")
    studies_list = []
    for row in cursor.fetchall():
        studies_list.append({
            "study_id": row[0],
            "author_id": row[1],
            "doi": row[2],
            "title": row[3]
        })
    with open(os.path.join(export_dir, "studies.json"), "w", encoding="utf-8") as f:
        json.dump(studies_list, f, indent=2)
        
    # ----------------------------------------------------
    # GENERATING samples.json
    # ----------------------------------------------------
    print("=== Generating samples.json ===")
    cursor.execute("SELECT srr_accession, study_id, tissue, genotype, condition, replicate, total_mapped_reads FROM samples;")
    samples_list = []
    for row in cursor.fetchall():
        samples_list.append({
            "srr_accession": row[0],
            "study_id": row[1],
            "tissue": row[2] if row[2] else None,
            "genotype": row[3] if row[3] else None,
            "condition": row[4] if row[4] else None,
            "replicate": row[5],
            "total_mapped_reads": row[6]
        })
    with open(os.path.join(export_dir, "samples.json"), "w", encoding="utf-8") as f:
        json.dump(samples_list, f, indent=2)
        
    # ----------------------------------------------------
    # GENERATING families.json
    # ----------------------------------------------------
    print("=== Generating families.json ===")
    cursor.execute("SELECT accession, family_consensus, best_hit_id, pident, evalue, bitscore FROM mirna_families;")
    families_list = []
    for row in cursor.fetchall():
        families_list.append({
            "accession": row[0],
            "family_consensus": row[1],
            "best_hit_id": row[2],
            "pident": row[3],
            "evalue": row[4],
            "bitscore": row[5]
        })
    with open(os.path.join(export_dir, "families.json"), "w", encoding="utf-8") as f:
        json.dump(families_list, f, indent=2)

    # ----------------------------------------------------
    # GENERATING gene_annotations.json
    # ----------------------------------------------------
    print("=== Generating gene_annotations.json ===")
    cursor.execute("SELECT transcript_name, locus_name, description, go_terms, pfam, best_hit_arabi FROM gene_annotations;")
    annotations_list = []
    for row in cursor.fetchall():
        annotations_list.append({
            "transcript_name": row[0],
            "locus_name": row[1],
            "description": row[2],
            "go_terms": row[3],
            "pfam": row[4],
            "best_hit_arabi": row[5]
        })
    with open(os.path.join(export_dir, "gene_annotations.json"), "w", encoding="utf-8") as f:
        json.dump(annotations_list, f, indent=None) # Compact JSON list like old one (one line per element or compact)
        
    # Load all studies and samples for mapping
    studies_by_id = {s["study_id"]: s for s in studies_list}
    samples_by_srr = {s["srr_accession"]: s for s in samples_list}
    
    # ----------------------------------------------------
    # PRE-FETCH DATA FOR miRNA GENERATION
    # ----------------------------------------------------
    cursor.execute("SELECT accession, mirna_id, mature_sequence, situation, family, curation_status, entry_date, last_modification FROM mirna_core;")
    mirnas_db = cursor.fetchall()
    
    mirnas_list = []
    browser_items = []
    
    # Facet counters for browser index
    # We will compute them using sample counts as requested:
    # "browser_filter_index.json: facets de studies/tissues/conditions/ genotypes devem vir de contagem real da tabela samples (20 linhas). O tratamento de idade/fase segue a Etapa 1."
    studies_facet = {}
    tissues_facet = {}
    conditions_facet = {}
    genotypes_facet = {}
    phases_facet = {}
    ages_facet = {}
    tags_facet = {} # Counts of miRNAs having that tag
    
    # Count samples facets
    for s in samples_list:
        st = studies_by_id.get(s["study_id"])
        st_name = st["author_id"] if st else "Unknown"
        studies_facet[st_name] = studies_facet.get(st_name, 0) + 1
        
        if s["tissue"]:
            t = s["tissue"]
            tissues_facet[t] = tissues_facet.get(t, 0) + 1
        if s["condition"]:
            c = s["condition"]
            conditions_facet[c] = conditions_facet.get(c, 0) + 1
        if s["genotype"]:
            g = s["genotype"]
            genotypes_facet[g] = genotypes_facet.get(g, 0) + 1
            
        # Age/phase follow Etapa 1 mapping (sample study_id -> age/phase list)
        meta = study_metadata.get(s["study_id"])
        if meta:
            for p in meta["phase"]:
                phases_facet[p] = phases_facet.get(p, 0) + 1
            for a in meta["age"]:
                ages_facet[a] = ages_facet.get(a, 0) + 1
                
    print("Computed Sample facets:")
    print("  studies:", studies_facet)
    print("  tissues:", tissues_facet)
    print("  conditions:", conditions_facet)
    print("  genotypes:", genotypes_facet)
    print("  phases:", phases_facet)
    print("  ages:", ages_facet)
    
    # Process each miRNA
    for row in mirnas_db:
        acc, mirna_id, mature_seq, situation, family, curation, entry_date, last_mod = row
        
        # 1. Fetch visible loci
        cursor.execute("""
            SELECT evidence_id, mirna_core_accession, mirna_id, situation, family, study_id, study_name, provisional_id, 
                   evidence_relation, retained_for_dashboard, source_result_file, observed_mature_sequence, observed_star_sequence, 
                   observed_precursor_sequence, precursor_coordinate, mirbase_mirna, seed_ref, mature_matches_mirbase, score_total, 
                   score_star, score_read_counts, score_mfe, score_randfold, score_cons_seed, total_read_count, mature_read_count, 
                   loop_read_count, star_read_count, randfold, true_positive_probability, rfam_alert, passed_am2018_filters, 
                   chr_scaf, strand, start_genomic, end_genomic, precursor_id, origin_sequence, premir_sequence_stem_loop, 
                   precursor_length, mfe, amfe, mapq, gff_annotation, param_analysis_type, star_sequence_predicted, star_length, 
                   duplex_status, has_genome_gaps, pri_mirna_context_seq, stem_loop_structure_dotbracket, tier_classification, 
                   classification_reason, coord_overlap, mature_similarity
            FROM mirna_discovery_evidence
            WHERE mirna_core_accession = ?;
        """, (acc,))
        
        all_loci = []
        visible_loci = []
        visible_study_ids = set()
        
        for r in cursor.fetchall():
            # Construct reads dict
            reads_dict = {
                "mature": r[25],
                "star": 27, # Loop read count is 26, star read count is 27
                "loop": r[26],
                "total": r[24]
            }
            # Locus object
            locus = {
                "evidence_id": r[0],
                "mirna_core_accession": r[1],
                "mirna_id": r[2],
                "situation": r[3],
                "family": r[4],
                "study_id": r[5],
                "study_name": r[6],
                "provisional_id": r[7],
                "evidence_relation": r[8],
                "retained_for_dashboard": r[9],
                "source_result_file": r[10],
                "observed_mature_sequence": r[11],
                "observed_star_sequence": r[12],
                "observed_precursor_sequence": r[13],
                "precursor_coordinate": r[14],
                "mirbase_mirna": r[15],
                "seed_ref": r[16],
                "mature_matches_mirbase": r[17],
                "score_total": r[18],
                "score_star": r[19],
                "score_read_counts": r[20],
                "score_mfe": r[21],
                "score_randfold": r[22],
                "score_cons_seed": r[23],
                "total_read_count": r[24],
                "mature_read_count": r[25],
                "loop_read_count": r[26],
                "star_read_count": r[27],
                "randfold": r[28],
                "true_positive_probability": r[29],
                "rfam_alert": r[30],
                "passed_am2018_filters": r[31],
                "chr_scaf": r[32],
                "strand": r[33],
                "start_genomic": r[34],
                "end_genomic": r[35],
                "precursor_id": r[36],
                "origin_sequence": r[37],
                "premir_sequence_stem_loop": r[38],
                "precursor_length": r[39],
                "mfe": r[40],
                "amfe": r[41],
                "mapq": r[42],
                "gff_annotation": r[43],
                "param_analysis_type": r[44],
                "star_sequence_predicted": r[45],
                "star_length": r[46],
                "duplex_status": r[47],
                "has_genome_gaps": r[48],
                "pri_mirna_context_seq": r[49],
                "stem_loop_structure_dotbracket": r[50],
                "tier_classification": r[51],
                "classification_reason": r[52],
                "coord_overlap": r[53],
                "mature_similarity": r[54]
            }
            all_loci.append(locus)
            
            # Visible filters: passed_am2018_filters == 1 AND score_total >= 0
            if r[31] == 1 and (r[18] is None or r[18] >= 0):
                visible_loci.append(locus)
                visible_study_ids.add(r[5])
                
        visible_loci_count = len(visible_loci)
        visible_studies_count = len(visible_study_ids)
        
        # 2. Fetch expression records for visible studies
        # Table mirna_expression columns: id, mirna_core_accession, srr_accession, raw_count, cpm
        expressions_list = []
        if visible_study_ids:
            placeholders = ",".join("?" for _ in visible_study_ids)
            query = f"""
                SELECT e.id, e.mirna_core_accession, e.srr_accession, e.raw_count, e.cpm, s.study_id, s.tissue, s.genotype, s.condition, s.replicate, s.total_mapped_reads
                FROM mirna_expression e
                JOIN samples s ON e.srr_accession = s.srr_accession
                WHERE e.mirna_core_accession = ? AND s.study_id IN ({placeholders});
            """
            params = [acc] + list(visible_study_ids)
            cursor.execute(query, params)
            for r in cursor.fetchall():
                meta = study_metadata.get(r[5])
                expressions_list.append({
                    "id": r[0],
                    "mirna_core_accession": r[1],
                    "srr_accession": r[2],
                    "raw_count": r[3],
                    "cpm": r[4],
                    "sample_study_id": r[5],
                    "tissue": r[6] if r[6] else None,
                    "genotype": r[7] if r[7] else None,
                    "condition": r[8] if r[8] else None,
                    "replicate": r[9],
                    "total_mapped_reads": r[10],
                    "phase": meta["phase"] if meta else [],
                    "age": meta["age"] if meta else []
                })
        expression_samples_count = len(expressions_list)
        
        # 3. Fetch references for visible studies
        # Table mirna_ref columns: ref_id, mirna_core_accession, study_id, acc_in_work, detection_source
        references_list = []
        if visible_study_ids:
            placeholders = ",".join("?" for _ in visible_study_ids)
            query = f"""
                SELECT ref_id, mirna_core_accession, study_id, acc_in_work, detection_source
                FROM mirna_ref
                WHERE mirna_core_accession = ? AND study_id IN ({placeholders});
            """
            params = [acc] + list(visible_study_ids)
            cursor.execute(query, params)
            for r in cursor.fetchall():
                references_list.append({
                    "ref_id": r[0],
                    "mirna_core_accession": r[1],
                    "study_id": r[2],
                    "acc_in_work": r[3] if r[3] else None,
                    "detection_source": r[4]
                })
        references_count = len(references_list)
        
        # 4. Fetch DEGs (Differential Expression) for visible studies
        # Table mirna_deg: id, mirna_core_accession, study_id, comparison, log2_fold_change, padj, direction
        degs_list = []
        if visible_study_ids:
            placeholders = ",".join("?" for _ in visible_study_ids)
            # Simplifications applied: comparison, study_id, log2_fold_change, padj, direction only!
            query = f"""
                SELECT comparison, study_id, log2_fold_change, padj, direction
                FROM mirna_deg
                WHERE mirna_core_accession = ? AND study_id IN ({placeholders});
            """
            params = [acc] + list(visible_study_ids)
            cursor.execute(query, params)
            for r in cursor.fetchall():
                degs_list.append({
                    "comparison": r[0],
                    "study_id": r[1],
                    "log2_fold_change": r[2],
                    "padj": r[3],
                    "direction": r[4]
                })
        degs_count = len(degs_list)
        
        # 5. Fetch targets
        cursor.execute("""
            SELECT target_interaction_id, mirna_core_accession, target_accession, target_pacid, target_locus, 
                   target_full_id, target_annot_version, expectation, upe, mirna_align_start, mirna_align_end, 
                   target_align_start, target_align_end, mirna_aligned_fragment, target_aligned_fragment, inhibition_type
            FROM mirna_targets
            WHERE mirna_core_accession = ?;
        """, (acc,))
        targets_list = []
        for r in cursor.fetchall():
            targets_list.append({
                "target_interaction_id": r[0],
                "mirna_core_accession": r[1],
                "target_accession": r[2],
                "target_pacid": r[3] if r[3] else None,
                "target_locus": r[4] if r[4] else None,
                "target_full_id": r[5] if r[5] else None,
                "target_annot_version": r[6] if r[6] else None,
                "expectation": r[7],
                "upe": r[8] if r[8] else None,
                "mirna_align_start": r[9],
                "mirna_align_end": r[10],
                "target_align_start": r[11],
                "target_align_end": r[12],
                "mirna_aligned_fragment": r[13],
                "target_aligned_fragment": r[14],
                "inhibition_type": r[15],
                "gene_annotation": None
            })
        targets_count = len(targets_list)
        
        # 6. Fetch discovery metrics for visible studies
        # Table mirna_discovery_metrics: id, mirna_core_accession, study_id, provisional_id, score_total, score_star, etc.
        metrics_list = []
        if visible_study_ids:
            placeholders = ",".join("?" for _ in visible_study_ids)
            query = f"""
                SELECT id, mirna_core_accession, study_id, provisional_id, score_total, score_star, score_read_counts, 
                       score_mfe, score_randfold, score_cons_seed, total_read_count, mature_read_count, loop_read_count, 
                       star_read_count, randfold, true_positive_probability, rfam_alert, mature_matches_mirbase, passed_am2018_filters
                FROM mirna_discovery_metrics
                WHERE mirna_core_accession = ? AND study_id IN ({placeholders});
            """
            params = [acc] + list(visible_study_ids)
            cursor.execute(query, params)
            for r in cursor.fetchall():
                metrics_list.append({
                    "id": r[0],
                    "mirna_core_accession": r[1],
                    "study_id": r[2],
                    "provisional_id": r[3],
                    "score_total": r[4],
                    "score_star": r[5],
                    "score_read_counts": r[6],
                    "score_mfe": r[7],
                    "score_randfold": r[8],
                    "score_cons_seed": r[9],
                    "total_read_count": r[10],
                    "mature_read_count": r[11],
                    "loop_read_count": r[12],
                    "star_read_count": r[13],
                    "randfold": r[14],
                    "true_positive_probability": r[15],
                    "rfam_alert": r[16],
                    "mature_matches_mirbase": r[17] if r[17] else None,
                    "passed_am2018_filters": r[18]
                })
                
        # 7. Fetch precursors
        # Table mirna_precursors
        precursors_list = []
        cursor.execute("""
            SELECT id, precursor_id, mirna_accession, origin_sequence, premir_sequence_stem_loop, chr_scaf, strand, 
                   start_genomic, end_genomic, precursor_length, mfe, amfe, mapq, gff_annotation, param_analysis_type, 
                   star_sequence_predicted, star_length, duplex_status, has_genome_gaps, pri_mirna_context_seq, 
                   stem_loop_structure_dotbracket, tier_classification, classification_reason
            FROM mirna_precursors
            WHERE mirna_accession = ?;
        """, (acc,))
        for r in cursor.fetchall():
            precursors_list.append({
                "id": r[0],
                "precursor_id": r[1],
                "mirna_accession": r[2],
                "origin_sequence": r[3] if r[3] else None,
                "premir_sequence_stem_loop": r[4],
                "chr_scaf": r[5],
                "strand": r[6],
                "start_genomic": r[7],
                "end_genomic": r[8],
                "precursor_length": r[9],
                "mfe": r[10],
                "amfe": r[11],
                "mapq": r[12] if r[12] else None,
                "gff_annotation": r[13] if r[13] else None,
                "param_analysis_type": r[14],
                "star_sequence_predicted": r[15],
                "star_length": r[16],
                "duplex_status": r[17],
                "has_genome_gaps": r[18] if r[18] else None,
                "pri_mirna_context_seq": r[19],
                "stem_loop_structure_dotbracket": r[20],
                "tier_classification": r[21],
                "classification_reason": r[22]
            })
            
        # 8. Fetch family info
        cursor.execute("SELECT family_consensus, best_hit_id, pident, evalue, bitscore FROM mirna_families WHERE accession = ?;", (acc,))
        fam_row = cursor.fetchone()
        family_info = None
        if fam_row:
            family_info = {
                "accession": acc,
                "family_consensus": fam_row[0],
                "best_hit_id": fam_row[1],
                "pident": fam_row[2],
                "evalue": fam_row[3],
                "bitscore": fam_row[4]
            }

        # ----------------------------------------------------
        # WRITE detail JSONs
        # ----------------------------------------------------
        detail_data = {
            "core": {
                "accession": acc,
                "mirna_id": mirna_id,
                "mature_sequence": mature_seq,
                "situation": situation,
                "family": family,
                "curation_status": curation,
                "entry_date": entry_date,
                "last_modification": last_mod
            },
            "family_info": family_info,
            "visible_study_ids": sorted(list(visible_study_ids)),
            "visible_loci_count": visible_loci_count,
            "studies": [studies_by_id[sid] for sid in sorted(list(visible_study_ids)) if sid in studies_by_id],
            "references": references_list,
            "expressions": expressions_list,
            "degs": degs_list,
            "discovery_metrics": metrics_list,
            "discovery_evidence": all_loci, # Contain all loci, but frontend uses visible ones
            "precursors": precursors_list,
            "targets": targets_list
        }
        
        # Write to mirna_detail/{accession}.json
        with open(os.path.join(export_dir, "mirna_detail", f"{acc}.json"), "w", encoding="utf-8") as f:
            json.dump(detail_data, f, indent=2)
            
        # Write to mirna_detail_by_id/{mirna_id}.json
        with open(os.path.join(export_dir, "mirna_detail_by_id", f"{mirna_id}.json"), "w", encoding="utf-8") as f:
            json.dump(detail_data, f, indent=2)
            
        # Write to targets/{accession}.json
        with open(os.path.join(export_dir, "targets", f"{acc}.json"), "w", encoding="utf-8") as f:
            json.dump(targets_list, f, indent=2)
            
        # Add to mirnas_list for mirnas.json
        mirnas_list.append({
            "accession": acc,
            "mirna_id": mirna_id,
            "mature_sequence": mature_seq,
            "situation": situation,
            "family": family,
            "curation_status": curation,
            "visible_loci_count": visible_loci_count,
            "visible_studies_count": visible_studies_count,
            "targets_count": targets_count,
            "expression_samples_count": expression_samples_count,
            "references_count": references_count,
            "degs_count": degs_count
        })
        
        # ----------------------------------------------------
        # PREPARE browser_filter_index ITEM
        # ----------------------------------------------------
        # Build facets for this item
        item_studies = []
        item_tissues = set()
        item_conditions = set()
        item_genotypes = set()
        item_phases = set()
        item_ages = set()
        
        item_study_entries = []
        
        for sid in sorted(list(visible_study_ids)):
            st = studies_by_id.get(sid)
            if not st:
                continue
            st_name = st["author_id"]
            item_studies.append(st_name)
            
            meta = study_metadata[sid]
            
            # Check expression in this study
            study_exprs = [e for e in expressions_list if e["sample_study_id"] == sid]
            has_expr = len(study_exprs) > 0
            
            expressed_t = sorted(list(set(e["tissue"] for e in study_exprs if e["tissue"])))
            expressed_c = sorted(list(set(e["condition"] for e in study_exprs if e["condition"])))
            expressed_g = sorted(list(set(e["genotype"] for e in study_exprs if e["genotype"])))
            expressed_p = meta["phase"] if has_expr and meta["phase"] else []
            expressed_a = meta["age"] if has_expr and meta["age"] else []
            
            fallback_t = [] if has_expr else meta["fallback_tissues"]
            fallback_c = [] if has_expr else meta["fallback_conditions"]
            fallback_g = [] if has_expr else meta["fallback_genotypes"]
            fallback_p = [] if has_expr else meta["fallback_phases"]
            fallback_a = [] if has_expr else meta["fallback_ages"]
            
            # Union for this study
            for t in (expressed_t + fallback_t): item_tissues.add(t)
            for c in (expressed_c + fallback_c): item_conditions.add(c)
            for g in (expressed_g + fallback_g): item_genotypes.add(g)
            for p in (expressed_p + fallback_p): item_phases.add(p)
            for a in (expressed_a + fallback_a): item_ages.add(a)
            
            # Format samples_with_expression inside study entry
            samples_we = []
            for e in study_exprs:
                tag_set = [st_name]
                if e["tissue"]: tag_set.append(e["tissue"])
                if e["condition"]: tag_set.append(e["condition"])
                if e["genotype"]: tag_set.append(e["genotype"])
                for p in meta["phase"]: tag_set.append(p)
                for a in meta["age"]: tag_set.append(a)
                
                samples_we.append({
                    "srr_accession": e["srr_accession"],
                    "raw_count": e["raw_count"],
                    "cpm": e["cpm"],
                    "tissue": e["tissue"],
                    "tissue_terms": [e["tissue"]] if e["tissue"] else [],
                    "condition": e["condition"],
                    "genotype": e["genotype"],
                    "replicate": e["replicate"],
                    "total_mapped_reads": e["total_mapped_reads"],
                    "phase": meta["phase"],
                    "age": meta["age"],
                    "sample_tags": sorted(list(set(tag_set)))
                })
                
            # Filter study loci (all of them for this study, including invisible, because runtime filters them)
            study_loci = [l for l in all_loci if l["study_id"] == sid]
            
            # Formulate study entry tags
            se_tags = [st_name]
            for t in (expressed_t + fallback_t): se_tags.append(t)
            for c in (expressed_c + fallback_c): se_tags.append(c)
            for g in (expressed_g + fallback_g): se_tags.append(g)
            for p in (expressed_p + fallback_p): se_tags.append(p)
            for a in (expressed_a + fallback_a): se_tags.append(a)
            se_tags = sorted(list(set(se_tags)))
            
            item_study_entries.append({
                "study_id": sid,
                "study_name": st_name,
                "citation_short": meta["citation_short"],
                "biological_context": meta["biological_context"],
                "phase": meta["phase"],
                "age": meta["age"],
                "study_tags": se_tags,
                "expressed_tissues": expressed_t,
                "expressed_conditions": expressed_c,
                "expressed_genotypes": expressed_g,
                "expressed_phases": expressed_p,
                "expressed_ages": expressed_a,
                "fallback_tissues": fallback_t,
                "fallback_conditions": fallback_c,
                "fallback_genotypes": fallback_g,
                "fallback_phases": fallback_p,
                "fallback_ages": fallback_a,
                "optimized_tags": se_tags,
                "samples_with_expression": samples_we,
                "loci": [{
                    "evidence_id": loc["evidence_id"],
                    "provisional_id": loc["provisional_id"],
                    "chr_scaf": loc["chr_scaf"],
                    "strand": loc["strand"],
                    "start_genomic": loc["start_genomic"],
                    "end_genomic": loc["end_genomic"],
                    "score_total": loc["score_total"],
                    "score_star": loc["score_star"],
                    "score_read_counts": loc["score_read_counts"],
                    "score_mfe": loc["score_mfe"],
                    "score_randfold": loc["score_randfold"],
                    "score_cons_seed": loc["score_cons_seed"],
                    "randfold": loc["randfold"],
                    "rfam_alert": loc["rfam_alert"],
                    "passed_am2018_filters": loc["passed_am2018_filters"],
                    "reads": {
                        "mature": loc["mature_read_count"],
                        "star": loc["star_read_count"],
                        "loop": loc["loop_read_count"],
                        "total": loc["total_read_count"]
                    },
                    "coord_overlap": loc["coord_overlap"],
                    "mature_similarity": loc["mature_similarity"]
                } for loc in study_loci],
                "has_expression": has_expr,
                "has_loci": True,
                "traceability_note": "Sample-based biological filters should use samples_with_expression. Loci provide study-level discovery traceability and may exist independently from sample-linked expression in the current schema."
            })
            
        # Formulate optimized tags for item (union of ID, situation, family, and all biological attributes)
        item_opt_tags = [mirna_id, situation]
        if family and family != 'Unclassified':
            item_opt_tags.append(family)
        for sname in item_studies: item_opt_tags.append(sname)
        for t in item_tissues: item_opt_tags.append(t)
        for c in item_conditions: item_opt_tags.append(c)
        for g in item_genotypes: item_opt_tags.append(g)
        for p in item_phases: item_opt_tags.append(p)
        for a in item_ages: item_opt_tags.append(a)
        item_opt_tags = sorted(list(set(item_opt_tags)))
        
        # Accumulate tags facet counts (distinct miRNAs having this tag)
        for t in item_opt_tags:
            tags_facet[t] = tags_facet.get(t, 0) + 1
            
        browser_items.append({
            "accession": acc,
            "mirna_id": mirna_id,
            "mature_sequence": mature_seq,
            "situation": situation,
            "family": family,
            "curation_status": curation,
            "visible_studies_count": visible_studies_count,
            "facets": {
                "studies": sorted(item_studies),
                "tissues": sorted(list(item_tissues)),
                "conditions": sorted(list(item_conditions)),
                "genotypes": sorted(list(item_genotypes)),
                "phases": sorted(list(item_phases)),
                "ages": sorted(list(item_ages))
            },
            "optimized_tags": item_opt_tags,
            "study_entries": item_study_entries
        })
        
    # Re-calculate facet counts to be the number of matching miRNAs (items) instead of sample counts,
    # as the filters operate on miRNAs, matching user expectations and preventing display mismatch.
    studies_facet = {}
    tissues_facet = {}
    conditions_facet = {}
    genotypes_facet = {}
    phases_facet = {}
    ages_facet = {}
    
    for item in browser_items:
        fac = item["facets"]
        for val in fac["studies"]:
            studies_facet[val] = studies_facet.get(val, 0) + 1
        for val in fac["tissues"]:
            tissues_facet[val] = tissues_facet.get(val, 0) + 1
        for val in fac["conditions"]:
            conditions_facet[val] = conditions_facet.get(val, 0) + 1
        for val in fac["genotypes"]:
            genotypes_facet[val] = genotypes_facet.get(val, 0) + 1
        for val in fac["phases"]:
            phases_facet[val] = phases_facet.get(val, 0) + 1
        for val in fac["ages"]:
            ages_facet[val] = ages_facet.get(val, 0) + 1

    # Write mirnas.json
    with open(os.path.join(export_dir, "mirnas.json"), "w", encoding="utf-8") as f:
        json.dump(mirnas_list, f, indent=2)
        
    # Write browser_filter_index.json
    browser_index = {
        "schema_version": "2.0",
        "description": "Browser filter index linking miRNA accession -> union of study-level expression and discovery evidence -> biological facets and locus traceability.",
        "important_note": "Study entries are created from the union of expression-backed studies and discovery-evidence studies. Biological filtering must use samples_with_expression, while locus traceability must use loci.",
        "facet_counts": {
            "studies": studies_facet,
            "tissues": tissues_facet,
            "conditions": conditions_facet,
            "genotypes": genotypes_facet,
            "phases": phases_facet,
            "ages": ages_facet,
            "tags": tags_facet
        },
        "items": browser_items
    }
    with open(os.path.join(export_dir, "browser_filter_index.json"), "w", encoding="utf-8") as f:
        json.dump(browser_index, f, indent=2)
        
    print(f"Successfully generated 99 miRNA files in {export_dir}.")
    
    conn.close()

if __name__ == "__main__":
    main()
