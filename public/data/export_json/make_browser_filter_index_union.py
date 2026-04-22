#!/usr/bin/env python3
import json
import sqlite3
from collections import defaultdict
from pathlib import Path

DB = "/mnt/c/Users/joaov/Documents/MIRNADB/ema-dashboard/back/data/ema_mirdeep2_union.db"
OUT = Path("browser_filter_index.json")

conn = sqlite3.connect(DB)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

def clean(x):
    return None if x in ("", "None") else x

def uniq(seq):
    seen = set()
    out = []
    for x in seq:
        key = json.dumps(x, sort_keys=True, ensure_ascii=False) if isinstance(x, (dict, list, dict)) else str(x)
        if key not in seen:
            seen.add(key)
            out.append(x)
    return out

# --------------------------------------------------
# Curated study metadata for UI/traceability
# --------------------------------------------------
study_meta = {
    1: {
        "study_id": 1,
        "study_name": "QIN-2021",
        "citation_short": "QIN, Z. et al. Genome-wide identification of microRNAs involved in somatic embryogenesis. G3, 2021.",
        "biological_context": "somatic embryogenesis; juvenile phase",
        "phase": ["juvenile phase"],
        "age": [],
        "default_tissues": ["callus", "stem"],
        "default_conditions": ["somatic embryogenesis"],
        "default_genotypes": ["GL9", "DH201-2"],
        "study_tags": [
            "QIN-2021",
            "somatic embryogenesis",
            "juvenile phase",
            "callus",
            "stem",
            "GL9",
            "DH201-2"
        ]
    },
    3: {
        "study_id": 3,
        "study_name": "TOLENTINO-2022",
        "citation_short": "TOLENTINO-2022",
        "biological_context": "mechanically induced wood formation; juvenile phase (10 months)",
        "phase": ["juvenile phase"],
        "age": ["10 months"],
        "default_tissues": ["stem"],
        "default_conditions": ["tension_wood", "opposite_wood", "unbent_control"],
        "default_genotypes": [],
        "study_tags": [
            "TOLENTINO-2022",
            "juvenile phase",
            "10 months",
            "stem",
            "tension_wood",
            "opposite_wood",
            "unbent_control"
        ]
    },
    4: {
        "study_id": 4,
        "study_name": "LIN-2018",
        "citation_short": "LIN-2018",
        "biological_context": "vegetative tissues; juvenile phase (5-month-old plants)",
        "phase": ["juvenile phase"],
        "age": ["5 months"],
        "default_tissues": ["leaves", "stem"],
        "default_conditions": [],
        "default_genotypes": [],
        "study_tags": [
            "LIN-2018",
            "juvenile phase",
            "5 months",
            "leaves",
            "stem"
        ]
    }
}

# --------------------------------------------------
# Samples
# --------------------------------------------------
cur.execute("""
SELECT
    s.srr_accession,
    s.study_id,
    st.author_id AS study_name,
    s.tissue,
    s.genotype,
    s.condition,
    s.replicate,
    s.total_mapped_reads
FROM samples s
JOIN studies st ON st.study_id = s.study_id
ORDER BY s.study_id, s.srr_accession
""")
sample_rows = [dict(r) for r in cur.fetchall()]

sample_meta = {}
samples_by_study = defaultdict(list)

for s in sample_rows:
    sid = s["study_id"]
    tissue = clean(s["tissue"])
    genotype = clean(s["genotype"])
    condition = clean(s["condition"])

    if tissue == "leaves-stems":
        tissue_terms = ["leaves", "stem"]
    else:
        tissue_terms = [tissue] if tissue else []

    phase_terms = study_meta.get(sid, {}).get("phase", [])
    age_terms = study_meta.get(sid, {}).get("age", [])

    item = {
        "srr_accession": s["srr_accession"],
        "study_id": sid,
        "study_name": s["study_name"],
        "tissue": tissue,
        "tissue_terms": tissue_terms,
        "genotype": genotype,
        "condition": condition,
        "replicate": s["replicate"],
        "total_mapped_reads": s["total_mapped_reads"],
        "phase": phase_terms,
        "age": age_terms,
        "sample_tags": uniq(
            [s["study_name"]] +
            tissue_terms +
            ([genotype] if genotype else []) +
            ([condition] if condition else []) +
            phase_terms +
            age_terms
        )
    }

    sample_meta[s["srr_accession"]] = item
    samples_by_study[sid].append(item)

# --------------------------------------------------
# miRNA core
# --------------------------------------------------
cur.execute("""
SELECT
    accession,
    mirna_id,
    mature_sequence,
    situation,
    family,
    curation_status
FROM mirna_core
ORDER BY accession
""")
mirnas = [dict(r) for r in cur.fetchall()]

# --------------------------------------------------
# Expression per miRNA x sample
# --------------------------------------------------
cur.execute("""
SELECT
    e.mirna_core_accession,
    e.srr_accession,
    e.raw_count,
    e.cpm,
    s.study_id,
    st.author_id AS study_name
FROM mirna_expression e
JOIN samples s ON s.srr_accession = e.srr_accession
JOIN studies st ON st.study_id = s.study_id
WHERE COALESCE(e.raw_count, 0) > 0
ORDER BY e.mirna_core_accession, s.study_id, e.srr_accession
""")
expr_rows = [dict(r) for r in cur.fetchall()]

expr_by_acc_study = defaultdict(list)
expr_studies_by_acc = defaultdict(set)

for r in expr_rows:
    key = (r["mirna_core_accession"], r["study_id"])
    expr_by_acc_study[key].append(r)
    expr_studies_by_acc[r["mirna_core_accession"]].add(r["study_id"])

# --------------------------------------------------
# Discovery evidence per miRNA x study
# NOTE: keep all evidence rows for traceability, not only passed/visible
# --------------------------------------------------
cur.execute("""
SELECT
    e.evidence_id,
    e.mirna_core_accession,
    e.mirna_id,
    e.situation,
    e.family,
    e.study_id,
    e.study_name,
    e.provisional_id,
    e.evidence_relation,
    e.retained_for_dashboard,
    e.score_total,
    e.score_star,
    e.score_read_counts,
    e.score_mfe,
    e.score_randfold,
    e.score_cons_seed,
    e.total_read_count,
    e.mature_read_count,
    e.loop_read_count,
    e.star_read_count,
    e.randfold,
    e.rfam_alert,
    e.passed_am2018_filters,
    e.chr_scaf,
    e.strand,
    e.start_genomic,
    e.end_genomic,
    e.precursor_id,
    e.coord_overlap,
    e.mature_similarity
FROM mirna_discovery_evidence e
ORDER BY e.mirna_core_accession, e.study_id, e.provisional_id
""")
evidence_rows = [dict(r) for r in cur.fetchall()]

evidence_by_acc_study = defaultdict(list)
evidence_studies_by_acc = defaultdict(set)

for e in evidence_rows:
    key = (e["mirna_core_accession"], e["study_id"])
    evidence_by_acc_study[key].append(e)
    evidence_studies_by_acc[e["mirna_core_accession"]].add(e["study_id"])

# --------------------------------------------------
# Build union-based study entries
# --------------------------------------------------
items = []

facet_counts = {
    "studies": defaultdict(int),
    "tissues": defaultdict(int),
    "conditions": defaultdict(int),
    "genotypes": defaultdict(int),
    "phases": defaultdict(int),
    "ages": defaultdict(int),
    "tags": defaultdict(int),
}

for m in mirnas:
    acc = m["accession"]

    union_studies = sorted(
        expr_studies_by_acc.get(acc, set()) |
        evidence_studies_by_acc.get(acc, set())
    )

    if not union_studies:
        continue

    study_entries = []
    facet_studies = set()
    facet_tissues = set()
    facet_conditions = set()
    facet_genotypes = set()
    facet_phases = set()
    facet_ages = set()

    all_tags = set(filter(None, [
        m["mirna_id"],
        m["situation"],
        m["family"]
    ]))

    for sid in union_studies:
        meta = study_meta.get(sid, {
            "study_id": sid,
            "study_name": None,
            "citation_short": None,
            "biological_context": None,
            "phase": [],
            "age": [],
            "default_tissues": [],
            "default_conditions": [],
            "default_genotypes": [],
            "study_tags": [],
        })

        exprs = expr_by_acc_study.get((acc, sid), [])
        evids = evidence_by_acc_study.get((acc, sid), [])

        # infer study_name if missing from study_meta
        inferred_study_name = None
        if exprs:
            inferred_study_name = exprs[0]["study_name"]
        elif evids:
            inferred_study_name = evids[0]["study_name"]

        study_name = meta["study_name"] or inferred_study_name

        # samples_with_expression
        samples_with_expression = []
        for er in exprs:
            sm = sample_meta.get(er["srr_accession"])
            if not sm:
                continue
            samples_with_expression.append({
                "srr_accession": er["srr_accession"],
                "raw_count": er["raw_count"],
                "cpm": er["cpm"],
                "tissue": sm["tissue"],
                "tissue_terms": sm["tissue_terms"],
                "condition": sm["condition"],
                "genotype": sm["genotype"],
                "replicate": sm["replicate"],
                "phase": sm["phase"],
                "age": sm["age"],
                "sample_tags": sm["sample_tags"]
            })

        # loci (all evidence rows for traceability)
        loci = []
        for e in evids:
            loci.append({
                "evidence_id": e["evidence_id"],
                "provisional_id": e["provisional_id"],
                "chr_scaf": e["chr_scaf"],
                "strand": e["strand"],
                "start_genomic": e["start_genomic"],
                "end_genomic": e["end_genomic"],
                "precursor_id": e["precursor_id"],
                "evidence_relation": e["evidence_relation"],
                "retained_for_dashboard": e["retained_for_dashboard"],
                "score_total": e["score_total"],
                "score_star": e["score_star"],
                "score_read_counts": e["score_read_counts"],
                "score_mfe": e["score_mfe"],
                "score_randfold": e["score_randfold"],
                "score_cons_seed": e["score_cons_seed"],
                "randfold": e["randfold"],
                "rfam_alert": e["rfam_alert"],
                "passed_am2018_filters": e["passed_am2018_filters"],
                "reads": {
                    "mature": e["mature_read_count"],
                    "star": e["star_read_count"],
                    "loop": e["loop_read_count"],
                    "total": e["total_read_count"]
                },
                "coord_overlap": e["coord_overlap"],
                "mature_similarity": e["mature_similarity"]
            })

        # biological facets should come primarily from expression-backed samples
        # fallback to curated defaults only if there are no sample-linked values
        expressed_tissues = sorted(set(
            t for s in samples_with_expression for t in s.get("tissue_terms", []) if t
        ))
        expressed_conditions = sorted(set(
            s["condition"] for s in samples_with_expression if s.get("condition")
        ))
        expressed_genotypes = sorted(set(
            s["genotype"] for s in samples_with_expression if s.get("genotype")
        ))
        expressed_phases = sorted(set(
            p for s in samples_with_expression for p in s.get("phase", []) if p
        ))
        expressed_ages = sorted(set(
            a for s in samples_with_expression for a in s.get("age", []) if a
        ))

        # If there are no expression-backed samples in this study entry,
        # keep fallback defaults only for traceability/display.
        fallback_tissues = meta["default_tissues"] if not expressed_tissues else []
        fallback_conditions = meta["default_conditions"] if not expressed_conditions else []
        fallback_genotypes = meta["default_genotypes"] if not expressed_genotypes else []
        fallback_phases = meta["phase"] if not expressed_phases else []
        fallback_ages = meta["age"] if not expressed_ages else []

        entry_tissues = expressed_tissues or fallback_tissues
        entry_conditions = expressed_conditions or fallback_conditions
        entry_genotypes = expressed_genotypes or fallback_genotypes
        entry_phases = expressed_phases or fallback_phases
        entry_ages = expressed_ages or fallback_ages

        optimized_tags = uniq(
            [study_name] +
            meta["study_tags"] +
            entry_tissues +
            entry_conditions +
            entry_genotypes +
            entry_phases +
            entry_ages
        )

        facet_studies.add(study_name)
        facet_tissues.update(entry_tissues)
        facet_conditions.update(entry_conditions)
        facet_genotypes.update(entry_genotypes)
        facet_phases.update(entry_phases)
        facet_ages.update(entry_ages)
        all_tags.update(x for x in optimized_tags if x)

        study_entries.append({
            "study_id": sid,
            "study_name": study_name,
            "citation_short": meta["citation_short"],
            "biological_context": meta["biological_context"],
            "phase": meta["phase"],
            "age": meta["age"],
            "study_tags": meta["study_tags"],
            "expressed_tissues": expressed_tissues,
            "expressed_conditions": expressed_conditions,
            "expressed_genotypes": expressed_genotypes,
            "expressed_phases": expressed_phases,
            "expressed_ages": expressed_ages,
            "fallback_tissues": fallback_tissues,
            "fallback_conditions": fallback_conditions,
            "fallback_genotypes": fallback_genotypes,
            "fallback_phases": fallback_phases,
            "fallback_ages": fallback_ages,
            "optimized_tags": optimized_tags,
            "samples_with_expression": samples_with_expression,
            "loci": loci,
            "has_expression": len(samples_with_expression) > 0,
            "has_loci": len(loci) > 0,
            "traceability_note": (
                "Sample-based biological filters should use samples_with_expression. "
                "Loci provide study-level discovery traceability and may exist independently "
                "from sample-linked expression in the current schema."
            )
        })

    item = {
        "accession": acc,
        "mirna_id": m["mirna_id"],
        "mature_sequence": m["mature_sequence"],
        "situation": m["situation"],
        "family": m["family"],
        "curation_status": m["curation_status"],
        "visible_studies_count": len(study_entries),
        "facets": {
            "studies": sorted(x for x in facet_studies if x),
            "tissues": sorted(facet_tissues),
            "conditions": sorted(facet_conditions),
            "genotypes": sorted(facet_genotypes),
            "phases": sorted(facet_phases),
            "ages": sorted(facet_ages),
        },
        "optimized_tags": sorted(x for x in all_tags if x),
        "study_entries": study_entries
    }

    items.append(item)

    for x in item["facets"]["studies"]:
        facet_counts["studies"][x] += 1
    for x in item["facets"]["tissues"]:
        facet_counts["tissues"][x] += 1
    for x in item["facets"]["conditions"]:
        facet_counts["conditions"][x] += 1
    for x in item["facets"]["genotypes"]:
        facet_counts["genotypes"][x] += 1
    for x in item["facets"]["phases"]:
        facet_counts["phases"][x] += 1
    for x in item["facets"]["ages"]:
        facet_counts["ages"][x] += 1
    for x in item["optimized_tags"]:
        facet_counts["tags"][x] += 1

payload = {
    "schema_version": "2.0",
    "description": "Browser filter index linking miRNA accession -> union of study-level expression and discovery evidence -> biological facets and locus traceability.",
    "important_note": (
        "Study entries are created from the union of expression-backed studies and discovery-evidence studies. "
        "Biological filtering must use samples_with_expression, while locus traceability must use loci."
    ),
    "facet_counts": {
        k: dict(sorted(v.items(), key=lambda kv: str(kv[0]).lower()))
        for k, v in facet_counts.items()
    },
    "items": items
}

OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

print(f"OK: wrote {OUT}")
print(f"items={len(items)}")
