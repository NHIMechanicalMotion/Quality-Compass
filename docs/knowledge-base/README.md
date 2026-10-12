# Quality Compass Knowledge Base

This documentation repository is the single source of truth and intent for **Quality Compass** — the enterprise APQP/PPAP, First Article CAD Metrology, and ISO 9001:2015 Quality Management Operating System of **NHI Mechanical Motion LLC (NHIMM)**.

Read this knowledge base before changing CAD parsing logic, APQP workflow gates, QMS audit management, Management Review agendas, 8D CAPA steps, Document Control structures, Odoo quality metrics, or database schemas.

The chapters describe why the system rules exist, the Supabase tables and React components they bind to, and the engineering consensus decisions reached. Where older notes disagree with live code or current consensus, the rules established in this knowledge base govern.

---

## How AI Agents and Engineers Should Use This

1. **Read this index**, then open the domain page corresponding to the feature you are changing.
2. **Follow the design standards and business logic** documented here unless the user explicitly overrides them.
3. **Keep business logic centralized** in dedicated services (`src/services/`) and metrology/audit engines (`src/standards/`, `src/utils/`). Do not duplicate complex calculations ad hoc inside UI components.
4. **Never invent navbar modes, top-level tabs, or undocumented company entities**. The navigation structure in `src/components/Header.tsx` is canonical.
5. **Preserve production Supabase data integrity**. The user actively creates and tracks real audits, findings, and inspection balloons in Supabase. Never issue destructive SQL statements.
6. **When a change supersedes a rule**, update the matching domain chapter in this knowledge base within the same pull request / commit.

---

## Recommended Reading Order

Read in this sequence for an end-to-end understanding of the platform. For targeted bug fixes or feature updates, jump directly to the relevant domain chapter.

1. [Architecture and Data Flow](architecture-and-data-flow.md) — 3-pillar UI structure, dual Supabase connections, and client-side offline fallbacks.
2. [Companies, Branding & Design Standards](companies-and-branding.md) — NHIMM parent enterprise, the 4 operating companies, color hex codes, badges, and visual hierarchy.
3. [Pillar 1: CAD & First Article Inspection](pillar1-cad-first-article.md) — Canvas/SVG viewer, vector DXF/PDF parsing, Tesseract OCR auto-ballooning, ASME/ISO standards audit, and China QC approvals.
4. [Pillar 2: QMS Executive Operating System](pillar2-qms-os.md) — Executive cockpit, audit lifecycle, 8D CAPA, Kaizen CI, and quality telemetry.
5. [Pillar 3: APQP & PPAP Launch Hub](pillar3-apqp-ppap-hub.md) — AIAG 4th Edition / VDA 18-element deliverables, PSW warrants, FMEAs, Control Plans, and ExcelJS workbook generation.
6. [ISO 9001:2015 Clause 9.3 Management Review](iso-9001-mrm-architecture.md) — Dynamic agenda builder, live cross-system data tie-ins, action tracking, and closure verification.
7. [Live Odoo Quality Telemetry & PPM Engine](odoo-quality-and-ppm.md) — PPM formula, First Pass Yield (FPY %), Work Center yield matrix, Defect Pareto analysis, and Odoo discrepancy logs.
8. [3-Tier Document Control System](document-control-system.md) — Consensus model strictly isolating Approved PDFs (controlled) from the Source File Vault and Working Drafts.
9. [Database Schema & Integration Pipeline](database-schema-sync.md) — QMS Supabase tables, Odoo Pulse ERP read-only tables, and mock fallback structures.
10. [Build Pipeline & Cloudflare Pages Deploy](build-pipeline-and-deploy.md) — Vite 8 build logic, Tailwind CSS v4, `wrangler.json`, SPA `_redirects`, and `.vitepress/dist` postbuild mirror.

---

## Domain Map

| Domain / Functional Area | Start Here | Live UI Component | Primary Data Service / Engine |
| :--- | :--- | :--- | :--- |
| **System Architecture & Dual DB** | [architecture-and-data-flow.md](architecture-and-data-flow.md) | `src/App.tsx`, `Header.tsx` | `supabase.ts`, `odooSupabase.ts` |
| **Multi-Company Branding & Design** | [companies-and-branding.md](companies-and-branding.md) | `CompanyBrandLogo.tsx`, `Header.tsx` | `operatingCompanies.ts` |
| **CAD Canvas & Metrology Audit** | [pillar1-cad-first-article.md](pillar1-cad-first-article.md) | `DrawingCanvas.tsx`, `InspectionTable.tsx` | `auditEngine.ts`, `cadOcrParser.ts` |
| **China QC Bilingual Sign-Off** | [pillar1-cad-first-article.md](pillar1-cad-first-article.md) | `ChinaApprovalModal.tsx` | `supabase.ts` (`china_approvals`) |
| **Executive QMS Cockpit** | [pillar2-qms-os.md](pillar2-qms-os.md) | `QmsExecutiveOverview.tsx` | `qmsSupabase.ts`, `odooQualityService.ts` |
| **Internal & Registrar Audits** | [pillar2-qms-os.md](pillar2-qms-os.md) | `QmsAuditsManager.tsx` | `qmsSupabase.ts` (`qms_audits`) |
| **ISO 9001 Clause 9.3 MRM** | [iso-9001-mrm-architecture.md](iso-9001-mrm-architecture.md) | `QmsManagementReview.tsx` | `qmsSupabase.ts` (`qms_management_reviews`) |
| **8D CAPA & Continuous Improvement** | [pillar2-qms-os.md](pillar2-qms-os.md) | `QmsCapaCiManager.tsx` | `qmsSupabase.ts` (`qms_capas`, `qms_ci`) |
| **Live PPM & Work Center Yield** | [odoo-quality-and-ppm.md](odoo-quality-and-ppm.md) | `QmsQualityMetricsView.tsx` | `odooQualityService.ts`, `odooService.ts` |
| **3-Tier Document Control** | [document-control-system.md](document-control-system.md) | `QmsDocumentControl.tsx` | `qmsSupabase.ts` (`qms_documents`) |
| **APQP 5-Phase Roadmap & Gates** | [pillar3-apqp-ppap-hub.md](pillar3-apqp-ppap-hub.md) | `ApqpPhaseRoadmap.tsx`, `ApqpPpapDashboard.tsx` | `apqpPpapSupabase.ts` (`apqp_projects`) |
| **AIAG 18-Element PPAP Matrix** | [pillar3-apqp-ppap-hub.md](pillar3-apqp-ppap-hub.md) | `ApqpPpapDashboard.tsx` | `apqpPpapSupabase.ts` (`ppap_submissions`) |
| **Part Submission Warrant (PSW)** | [pillar3-apqp-ppap-hub.md](pillar3-apqp-ppap-hub.md) | `PpapWarrantForm.tsx` | `aiagPdfGenerator.ts`, `aiagExcelService.ts` |
| **FMEA & Control Plans** | [pillar3-apqp-ppap-hub.md](pillar3-apqp-ppap-hub.md) | `PpapFmeaManager.tsx`, `PpapControlPlan.tsx` | `apqpSyncEngine.ts` |
| **Run-at-Rate Capacity Analysis** | [pillar3-apqp-ppap-hub.md](pillar3-apqp-ppap-hub.md) | `PpapCapacityAnalysis.tsx` | `apqpWorkflowRules.ts` |
| **AIAG Excel Workbook Generation** | [pillar3-apqp-ppap-hub.md](pillar3-apqp-ppap-hub.md) | Export Action Buttons | `aiagExcelService.ts` (ExcelJS) |
| **Cloudflare Pages & Build Pipeline**| [build-pipeline-and-deploy.md](build-pipeline-and-deploy.md) | Root build scripts | `wrangler.json`, `package.json`, `_redirects` |

---

## Historical Conflicts & Inviolable Decisions

During the evolution of Quality Compass from an inspection tool into an enterprise QMS and APQP system, key architectural and operational decisions were finalized. These decisions must be preserved:

1. **Document Control Consensus (PDFs Only for Controlled Documents):**
   - *Conflict:* An earlier proposal considered letting users upload Word or Excel documents directly as controlled documents.
   - *Resolution:* Executive consensus was reached: **Approved PDFs are the only controlled documents**. Native editable files (`.docx`, `.xlsx`, `.dwg`) are strictly archived in the **Source File Vault** (Tier 2). Draft modifications take place in **Working Documents** (Tier 3) and must be converted to approved PDFs before promotion.

2. **Management Review Agenda Extensibility (ISO 9001:2015 Clause 9.3):**
   - *Conflict:* A rigid static agenda prevented review teams from addressing site-specific plant safety, capital projects, or enterprise initiatives.
   - *Resolution:* The Management Review module ships with standard ISO 9001:2015 Clause 9.3 agenda items by default, but allows full dynamic addition, editing, and presenter/time allocation for custom agenda topics.

3. **Automated Cross-System Management Review Tie-Ins:**
   - *Conflict:* Management review minutes previously required manual re-entry of audit findings, open CAPAs, ERP scrap, and risk reviews.
   - *Resolution:* Automated live tie-ins query active audit findings (`qms_audit_findings`), open CAPAs (`qms_capas`), live Odoo PPM metrics (`odooQualityService`), and Clause 6.1 risks, auto-populating evidence directly into agenda topic inputs.

4. **Dual-Supabase Database Isolation:**
   - *Conflict:* Attempting to merge QMS quality records into the NHIMM Pulse Odoo database caused schema contention and permission friction.
   - *Resolution:* Dedicated isolation. QMS and CAD data reside in Supabase instance `jggdqmygudsiueaiqzcn`. Operational sales and BOM routing data are read from NHIMM Pulse Supabase instance `vrsbfjiafjrbwbyullkh`.

5. **Cloudflare Pages SPA Deployment Compatibility:**
   - *Conflict:* SPA routes resulted in 404 errors on Cloudflare Pages when users refreshed deep links or navigated directly.
   - *Resolution:* Added `public/_redirects` with `/* /index.html 200` rewrite rule. Configured `wrangler.json` to publish `dist`, and added a `postbuild` script in `package.json` that copies `dist` to `.vitepress/dist` to maintain hosting compatibility.

---

## What This Knowledge Base Does Not Contain

- **Secret Keys and Passwords:** Never commit real API keys, service role secrets, or database passwords to markdown files. All environment variables are referenced by their variable name (e.g., `VITE_SUPABASE_URL`, `VITE_ODOO_SUPABASE_ANON_KEY`).
- **Customer Proprietary CAD Models:** Customer production blueprints, confidential OEM CAD files, and proprietary formulas are strictly omitted from git tracking.
