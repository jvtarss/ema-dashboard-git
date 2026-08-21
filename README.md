# EMA Dashboard
![EMA logo](public/logo-branca.svg)
Frontend of the Eucalyptus MicroRNA Archive (EMA), a curated database of microRNAs in *Eucalyptus grandis*. This repository contains only the web dashboard; **the curated database, backend schema, and analysis pipeline are not available publicly.**

**Live dashboard:** https://jvtarss.github.io/ema-dashboard-git

## About EMA

EMA integrates three independent public small RNA sequencing studies (vegetative tissue, somatic embryogenesis, tension wood formation) into a single, locus-resolved catalog of 99 curated miRNAs, with study-level evidence tracking, expression profiles, differential expression results, and predicted miRNA-target and protein-protein interaction networks. 
## Stacks

- React + TypeScript
- Vite (build tool)
- Bootstrap + SASS for styling
- Lucide React for iconography

## Repo structure

```
ema-dashboard-git/
├── .github/workflows/    GitHub Actions workflow for automated deployment to GitHub Pages
├── public/               static assets served as-is
├── scripts/              data preparation/build scripts (Python) that transform curated exports into the static data consumed by the frontend
├── src/                  application source (components, pages, styles)
├── index.html
├── vite.config.ts
├── tsconfig*.json
├── eslint.config.js
├── package.json
└── package-lock.json
```
## Data source

The data displayed in this dashboard is derived from the curated SQLite database maintained in [jvtarss/ema-2026](https://github.com/jvtarss/ema-2026). Any updates to the underlying catalog (new datasets, corrected annotations, expanded confidence tiers) are versioned there first, then propagated to this frontend.

## Contact

For questions, bug reports, or to propose additional datasets for a future EMA release, contact the corresponding author: joao.aires1@uft.edu.br
