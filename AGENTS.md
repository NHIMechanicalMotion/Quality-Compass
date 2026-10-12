# Quality Compass // AI & Developer Operational Instructions

This repository is **Quality Compass** — the unified APQP/PPAP Launch Hub, CAD First Article Inspection Engine, and ISO 9001:2015 Quality Management Executive Operating System for **NHI Mechanical Motion LLC** and its operating sub-companies (Vite 8, React 19, TypeScript, Tailwind CSS v4, Dual-Supabase architecture, Cloudflare Pages).

Before making any feature addition, bug fix, schema modification, or visual restyling:

1. **Read `docs/knowledge-base/README.md`** and the specific domain chapter matching your task.
2. **Follow the rules and design standards documented in the knowledge base** unless the user explicitly overrides them.
3. **When a change supersedes a rule or adds a new system capability**, update the corresponding chapter in `docs/knowledge-base/` in the same commit/change.

---

## Core Inviolable Principles (Negative Constraints)

1. **System Hierarchy & Core Navigation Modes**:
   The system hierarchy is organized into 2 core strategic pillars and an engineering/quality tools category, defined in `src/components/Header.tsx` and routed in `src/App.tsx`:
   - **Pillar 1 (`QMS_DASHBOARD`)**: ISO 9001:2015 QMS Executive Operating System (`OVERVIEW`, `AUDITS`, `MANAGEMENT_REVIEW`, `CAPA_CI`, `QUALITY_METRICS`, `DOCUMENT_CONTROL`, `ODOO_CONFIG`).
   - **Pillar 2 (`APQP_PPAP`)**: APQP & PPAP Launch Hub (Phases 1–5, 18 AIAG Elements, PSW, Control Plans, FMEA, Run-at-Rate).
   - **Tools Category (`INSPECTION`)**: CAD & First Article Inspection Engine (Canvas, OCR, auto-ballooning, ASME/ISO GD&T audit, and template training).

2. **Preserve the Multi-Company Operating Structure**:
   NHI Mechanical Motion LLC is the parent enterprise (`ALL`). All views must respect the 4 operating company partitions:
   - `NHI`: Precision motion, machined hubs, pulleys, tensioners (`#70c128`).
   - `TERRE`: Terre Products — heavy-duty cast sprockets, ag power transmission (`#5c6f5a`).
   - `MANTIS`: Mantis Conveyor Products — drum/wing pulleys, idlers, lagging (`#81C341`).
   - `MAKERS`: Makers Automation — turnkey robotic cells, Keyence vision (`#ea580c`).
   Never collapse or hardcode single-company logic where multi-company filtering is expected.

3. **Strict Adherence to 3-Tier Document Control Consensus**:
   - **Tier 1 (Controlled Documents)**: *PDFs only*. Never store editable formats (`.docx`, `.xlsx`, `.dwg`) as released controlled documents. Approved PDFs are the sole legally auditable record.
   - **Tier 2 (Source File Vault)**: Native editable source files (`.docx`, `.xlsx`, `.dwg`, `.pptx`) are preserved here with check-out tracking and parent doc links.
   - **Tier 3 (Working Documents)**: Isolated collaborative sandbox for revisions under drafting or review before PDF compilation and promotion.

4. **Preserve Live Supabase Production Data**:
   - Do NOT drop, re-create, or truncate tables in the QMS Supabase database (`jggdqmygudsiueaiqzcn`).
   - The user actively enters live audit records, audit findings, and inspection balloons.
   - Always implement graceful fallbacks for local/offline execution when Supabase credentials or network connectivity are unavailable.

5. **Dual Supabase Separation of Concerns**:
   - `src/services/supabase.ts` connects to the **QMS & CAD Database** (`jggdqmygudsiueaiqzcn`).
   - `src/services/odooSupabase.ts` connects read-only to **NHIMM Pulse / Odoo ERP** (`vrsbfjiafjrbwbyullkh`).
   - Never write QMS records or upload files into the Odoo Pulse database.

6. **Preserve Cloudflare Workers Static Assets Build Rules**:
   - Production builds run `npm run build` (`tsc -b && vite build`).
   - Git deploys use Workers Builds (`wrangler.json`, output directory `dist/`).
   - Client-side routing is handled via `assets.not_found_handling: "single-page-application"` in `wrangler.json`.
   - Do NOT add a Pages-style `/* /index.html 200` rule to `_redirects` (Workers treats that as an infinite loop error 100324).
   - Requires Node.js 22.13+ (pinned in `.node-version` and `.nvmrc`).

7. **Zero In-App Credential Storage & Hourly Sync Standard**:
   - Never store Odoo passwords, API keys, or Supabase service role keys in frontend code or browser `localStorage`.
   - Quality synchronization runs strictly via `.github/workflows/odoo_quality_sync.yml` on an hourly cron (`0 * * * *`).
   - The frontend reads synced tables (`odoo_quality_records`, `odoo_quality_ppm_metrics`, etc.) via anonymous Supabase keys.
   - Do not re-introduce hardcoded starter/mock records when database tables are empty; always render clean empty states.

---

## Quick Reference to Knowledge Base Domains

| Domain / Task Area | Read First |
| :--- | :--- |
| System Architecture & Dual DB Flow | [`docs/knowledge-base/architecture-and-data-flow.md`](docs/knowledge-base/architecture-and-data-flow.md) |
| Branding, Colors & Multi-Company Rules | [`docs/knowledge-base/companies-and-branding.md`](docs/knowledge-base/companies-and-branding.md) |
| CAD Viewer, OCR & Auto-Ballooning | [`docs/knowledge-base/pillar1-cad-first-article.md`](docs/knowledge-base/pillar1-cad-first-article.md) |
| QMS Executive OS, Audits & 8D CAPA | [`docs/knowledge-base/pillar2-qms-os.md`](docs/knowledge-base/pillar2-qms-os.md) |
| APQP Phases & AIAG 4th Ed PPAP Workbook | [`docs/knowledge-base/pillar3-apqp-ppap-hub.md`](docs/knowledge-base/pillar3-apqp-ppap-hub.md) |
| ISO 9001:2015 Clause 9.3 MRM Cockpit | [`docs/knowledge-base/iso-9001-mrm-architecture.md`](docs/knowledge-base/iso-9001-mrm-architecture.md) |
| Odoo Quality Sync & PPM Math Engine | [`docs/knowledge-base/odoo-quality-and-ppm.md`](docs/knowledge-base/odoo-quality-and-ppm.md) |
| 3-Tier Document Control Architecture | [`docs/knowledge-base/document-control-system.md`](docs/knowledge-base/document-control-system.md) |
| Database Schemas & Table Definitions | [`docs/knowledge-base/database-schema-sync.md`](docs/knowledge-base/database-schema-sync.md) |
| Build Pipeline & Cloudflare Pages Deploy | [`docs/knowledge-base/build-pipeline-and-deploy.md`](docs/knowledge-base/build-pipeline-and-deploy.md) |
