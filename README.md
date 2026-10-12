# Quality Compass // Enterprise APQP/PPAP & QMS Operating System
**NHI Mechanical Motion LLC (NHIMM)**  
*Release:* `v3.0-ENTERPRISE` | *Classification:* `CONFIDENTIAL // INTERNAL OPERATIONAL SYSTEM` | *Repository:* `NHIMechanicalMotion/Quality-Compass`

---

## 1. Executive Summary

**Quality Compass** is the unified quality engineering, manufacturing compliance, and operational governance platform engineered for **NHI Mechanical Motion LLC** and its operating sub-companies (**NHI**, **Terre Products**, **Mantis Conveyor Products**, and **Makers Automation**).

Built to bridge CAD blueprint engineering with shopfloor quality execution and executive management oversight, Quality Compass integrates two foundational operational pillars and an engineering metrology tools category:
1. **Pillar 1 — QMS Executive Operating System:** Enterprise Quality Management System delivering audit lifecycle tracking (Internal, Registrar TÜV, Customer Tesla, Regulatory), ISO 9001:2015 Clause 9.3 Management Review Cockpit with live data tie-ins, 8D CAPA and Kaizen Continuous Improvement tracking, live Odoo ERP quality telemetry (PPM & First Pass Yield), and a consensus-based 3-Tier Document Control System.
2. **Pillar 2 — APQP & PPAP Launch Hub:** End-to-end New Product Introduction (NPI) workflow aligned to AIAG 4th Edition and VDA standards, managing all 18 PPAP elements, Part Submission Warrants (PSW), DFMEA / PFMEA risk assessments, Control Plans, Gage R&R (MSA), Run-at-Rate capacity verification, and native AIAG Excel workbook generation via ExcelJS.
3. **Tools Category — CAD & First Article Inspection (FAI):** High-precision drawing canvas with vector PDF/DXF ingestion, OCR dimension extraction, ASME Y14.5 / ISO 1101 geometric dimensioning and tolerancing (GD&T) audit engine, automatic balloon numbering, China QC team bilingual sign-off, and FAI report exports.

---

## 2. Multi-Company Operating Architecture

NHI Mechanical Motion LLC operates four specialized manufacturing businesses from its headquarters and manufacturing plants in Claremont, New Hampshire:

```
                      ┌────────────────────────────────────────┐
                      │      NHI Mechanical Motion LLC         │
                      │         Parent Enterprise (ALL)        │
                      └───────────────────┬────────────────────┘
          ┌───────────────────────┬───────┴───────────────┬────────────────────────┐
          │                       │                       │                        │
┌─────────▼───────────┐ ┌─────────▼───────────┐ ┌─────────▼───────────┐  ┌─────────▼───────────┐
│         NHI         │ │    Terre Products   │ │   Mantis Conveyor   │  │  Makers Automation  │
│ Precision Motion,   │ │ Heavy-Duty Ag       │ │ Engineered Pulleys, │  │ Turnkey Robotics,    │
│ Machined Hubs,      │ │ Drivelines, Cast    │ │ Idlers & Lagging    │  │ Vision Fixturing,    │
│ Pulleys & Tensioners│ │ Iron Sprockets      │ │ Systems             │  │ PLC Engineering      │
│ Primary: #70c128    │ │ Primary: #5c6f5a    │ │ Primary: #81C341    │  │ Primary: #ea580c     │
└─────────────────────┘ └─────────────────────┘ └─────────────────────┘  └─────────────────────┘
```

- **NHIMM (Parent):** Consolidated rollup across executive metrics, cross-divisional customer audits, enterprise document control, and APQP governance.
- **NHI:** High-volume precision CNC lathe turning, broaching, induction hardening, automated pulley assembly, and Tier-1 automotive/commercial OEM kanbans.
- **Terre Products:** Heavy-duty agricultural drivetrain components, ductile/gray iron casting machining, high-torque splines, and extreme-duty power transmission.
- **Mantis Conveyor Products:** Industrial conveyor components, motorized rollers, heavy-duty drum and wing pulleys, vulcanized rubber/ceramic lagging, and dynamic balancing.
- **Makers Automation:** Turnkey custom robotic machine-tending cells (Fanuc / ABB), Keyence laser profilometry, custom poka-yoke inspection stations, and PLC control systems.

---

## 3. Operational Pillars & Engineering Tools

### Pillar 1: Enterprise QMS Executive Operating System (`QMS_DASHBOARD`)
- **Executive Cockpit:** Real-time visibility into open audits, high-risk findings, active 8Ds, PPM trends, and controlled document review schedules.
- **Audits Manager:** Lifecycle management for Internal Audits, External Registrar (TÜV SÜD ISO 9001), Customer Audits (Tesla, John Deere, Cat), and Regulatory inspections.
- **ISO 9001:2015 Clause 9.3 Management Review:** Standard 13-topic agenda builder with custom topic additions, automatic live tie-ins to audit findings, CAPA/8D non-conformances, live Odoo PPM metrics, and Clause 6.1 risk reviews.
- **CAPA (8D) & Kaizen CI:** Full 8-Discipline problem-solving tracking (D1 Team through D8 Recognition) and employee continuous improvement suggestions with financial savings tracking.
- **Live Quality Performance & PPM Engine:** Telemetry dashboard reporting Parts Per Million (PPM), First Pass Yield (FPY %), Work Center yield matrix, Defect Pareto analysis, and Odoo discrepancy logs.
- **3-Tier Document Control System:** Consensus-based document management strictly separating Approved PDFs (controlled documents) from Native Source Files (Vault) and Working Drafts.

### Pillar 2: APQP & PPAP Launch Hub (`APQP_PPAP`)
- **AIAG 4th Edition / VDA 18-Element Matrix:** Phase-gated tracker for all 18 PPAP deliverables with completion status, customer requirements, and attachment linkages.
- **5-Phase APQP Lifecycle:** Plan & Define, Product Design, Process Design, Product & Process Validation, and Feedback/Assessment.
- **Part Submission Warrant (PSW - Form CFG-1001):** Interactive, printable AIAG-standard submission warrant with declaration checkboxes, customer approval signatures, and IMDS tracking.
- **Dimensional Results (Form CFG-1003):** 5-piece layout inspection report dynamically linked to CAD inspection balloon records.
- **FMEA Manager:** AIAG-VDA compliant Design FMEA and Process FMEA with Severity, Occurrence, Detection, and Risk Priority Number (RPN) calculations.
- **Run-at-Rate & Capacity Analysis:** Verification of plant line speed, OEE, scrap allowance, and shift capacity against customer contracted demand.
- **ExcelJS Workbook Generator:** Generates production-ready, fully styled multi-tab Excel workbooks based on official AIAG templates (`PPAP_Forms_Workbook_4th_Edition.xlsx`).

### Tools Category: CAD Blueprint & First Article Inspection (`INSPECTION`)
- **Interactive Inspection Canvas:** Pan, zoom, and inspect vector CAD prints (DXF, vector PDF, and high-resolution raster drawings).
- **Auto-Ballooning & OCR Engine:** Automatic extraction of nominal dimensions, bilateral/unilateral tolerances, and GD&T feature control frames using Tesseract.js OCR and PDF text stream analysis.
- **Standards Audit Engine:** Automated compliance verification against ASME Y14.5M-1994, ASME Y14.5-2018, ISO 1101, and ISO 2768 general tolerance tables.
- **Measurement Tool Recommender:** Intelligent rule-based selection of appropriate metrology instruments (CMM, optical comparator, height gage, micrometer, calipers) based on feature tolerance width.
- **China QC Inspection Workflow:** Dedicated bilingual English/Chinese modal for overseas inspection sign-off, dispositioning, and inspector authorization.
- **AS9102 / AIAG Inspection Export:** Instant generation of formatted Excel First Article Inspection workbooks and PDF inspection packages.

### Shop-Floor Operator Training & Skills Qualification System (`#training`)
- **ISO 9001:2015 Clause 7.2 Compliance:** End-to-end competency tracking, training catalogs, and append-only certification histories.
- **Dual Authentication Modes:** Shop-floor touch keypad (Employee Badge # + 4-digit PIN) for gloved floor use, and Supabase Auth (Email + Password) for office/administration.
- **Interactive Skills Matrix:** Real-time cross-tabulation of active workforce $\times$ work centers with Tri-Attribute status display (Color + Word + Icon), department filters, and cell audit inspection.
- **Supervisor Sign-Off Workflow:** Mobile-optimized observation checklist (E-stop, PPE, tooling setup, 5-piece FAI) with explicit two-step confirmation dialog.
- **Single-Page Printable Dossiers:** Printable employee qualification records with active certifications, full training logs, and formal auditor signature blocks.
- **Compliance Dashboards & Gap Matrix:** Automated identification of expired certifications, 30-day renewal windows, and missing role/machine prerequisite onboarding gaps.
- **Two-Stage CSV Import & ZIP Export:** Ingest workforce and machine records with validation preview and download full system data in a single ZIP backup.

---

## 4. Dual-Supabase Database Architecture

Quality Compass connects to two distinct, isolated Supabase database instances:

| Database Instance | URL / Identifier | Responsibility |
| :--- | :--- | :--- |
| **QMS & CAD Database** | `jggdqmygudsiueaiqzcn` | Drawings, dimension balloons, inspection control items, China approvals, QMS controlled documents & revisions, audits & findings, management reviews & actions, CAPA 8D records, APQP projects, and PPAP submissions. |
| **NHIMM Pulse / Odoo ERP** | `vrsbfjiafjrbwbyullkh` | Read-only operational replica of Odoo ERP containing 12,000+ sales orders (`odoo_sale_orders`), 55,000+ line items (`odoo_sale_order_lines`), 10,000+ BOM operations (`odoo_bom_operations`), and customer records. |

*Zero In-App Credentials Standard:* All quality data sync from Odoo runs server-side via GitHub Actions or AWS Lightsail crontab (`scripts/sync_odoo_quality.py`) with zero secrets stored in the browser frontend.

---

## 5. Technology Stack & Scripts

- **Runtime & Build:** React 19, TypeScript 5.8+, Vite 8, Node.js 22.13+
- **Styling & Design System:** Tailwind CSS v4 (`@tailwindcss/vite`), Lucide React icons
- **Metrology & CAD Parsing:** Tesseract.js (OCR), PDF.js (`pdfjs-dist`), custom DXF loader
- **Document & Spreadsheet Generation:** ExcelJS (multi-tab AIAG templates), FileSaver.js, jsPDF
- **Cloud & Deployment:** Cloudflare Workers (static assets SPA), `wrangler.json`
- **Database Client:** `@supabase/supabase-js` v2.115+

### NPM Scripts
- `npm run dev` — local Vite dev server
- `npm run build` — typecheck + production build to `dist/`
- `npm run preview` — preview the production build
- `npm run lint` — Oxlint
- `npm run deploy` — `wrangler deploy` (static assets + Worker)

---

## 6. Cloudflare Deployment Architecture

Git deploys use **Cloudflare Workers Builds**: `npm run build`, then `npx wrangler deploy` on `main` and `npx wrangler versions upload` on pull requests.

- **Wrangler Configuration:** `wrangler.json` defines a Worker named `quality-compass`. Vite output is `dist/`.
- **Client Routing:** Client-side routes use `assets.not_found_handling: "single-page-application"`. Do **not** add a Pages-style `/* /index.html 200` rule in `_redirects` — Workers treats that as an infinite loop (error 100324).
- **PR Deployments:** `scripts/install-wrangler-shim.mjs` (via `postinstall`) maps `versions upload` to `deploy` so the first Git build can create `quality-compass`.

| Setting | Value |
| :--- | :--- |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Non-production deploy | `npx wrangler versions upload` |
| Node.js version | **22** |

### Local Deploy Check
Requires **Node.js 22.13+**.
```bash
npm ci
npm run build
npx wrangler deploy --dry-run
```

---

## 7. Knowledge Base & Agent Guidance

All developers and autonomous AI coding agents must consult the dedicated Knowledge Base before making architectural, schema, or UI changes:

- **AI Developer Instructions:** [`AGENTS.md`](AGENTS.md)
- **Master Knowledge Base Index:** [`docs/knowledge-base/README.md`](docs/knowledge-base/README.md)
  - [Architecture and Data Flow](docs/knowledge-base/architecture-and-data-flow.md)
  - [Companies, Branding & Design Standards](docs/knowledge-base/companies-and-branding.md)
  - [Pillar 1: CAD & First Article Inspection](docs/knowledge-base/pillar1-cad-first-article.md)
  - [Pillar 2: QMS Executive Operating System](docs/knowledge-base/pillar2-qms-os.md)
  - [Pillar 3: APQP & PPAP Launch Hub](docs/knowledge-base/pillar3-apqp-ppap-hub.md)
  - [ISO 9001:2015 Clause 9.3 Management Review](docs/knowledge-base/iso-9001-mrm-architecture.md)
  - [Live Odoo Quality Telemetry & PPM Engine](docs/knowledge-base/odoo-quality-and-ppm.md)
  - [3-Tier Document Control System](docs/knowledge-base/document-control-system.md)
  - [Database Schema & Integration Pipeline](docs/knowledge-base/database-schema-sync.md)
  - [Build Pipeline & Cloudflare Deploy](docs/knowledge-base/build-pipeline-and-deploy.md)

---

## 8. Confidentiality Notice

**CONFIDENTIAL & PROPRIETARY — PROPERTY OF NHI MECHANICAL MOTION LLC.**  
Unauthorized reproduction, distribution, or disclosure of CAD parsing algorithms, APQP workflows, quality metrics, or internal operational logic is strictly prohibited. All inspection records, audit findings, and product data are classified company confidential.
