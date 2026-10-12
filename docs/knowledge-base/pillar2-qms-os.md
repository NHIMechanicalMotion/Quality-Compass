# Pillar 2: QMS Executive Operating System

This document outlines the architecture, operational workflows, and audit compliance mechanisms of **Pillar 2** in Quality Compass.

---

## 1. Overview & Structure

Pillar 2 provides an audit-ready Quality Management System (QMS) aligned with **ISO 9001:2015**, **IATF 16949**, and Tier-1 OEM customer quality standards.

The central component `src/components/qms/QmsDashboard.tsx` routes between seven core functional sub-views:

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          QmsDashboard.tsx                                │
├──────────┬──────────┬──────────────┬─────────┬──────────┬──────────┬─────┤
│ OVERVIEW │  AUDITS  │  MGMT REVIEW │ CAPA/CI │ METRICS  │ DOC CTRL │ ERP │
└──────────┴──────────┴──────────────┴─────────┴──────────┴──────────┴─────┘
```

---

## 2. Functional Sub-Modules

### A. Executive Overview (`QmsExecutiveOverview.tsx`)
The leadership cockpit consolidates quality KPIs across all operating companies:
- **Quality Health KPI Strip:** Live enterprise PPM, First Pass Yield (FPY %), open high-severity CAPAs, scheduled external audits, and overdue document reviews.
- **Audits Snapshot:** Distribution of internal vs registrar audits with quick drilldown links.
- **Live PPM & Yield Card:** Direct bridge to the Odoo Quality Telemetry dashboard with monthly trend sparklines.
- **Active 8Ds & Financial Impact:** Summarizes containment costs, scrap expenses, and 8D step progress.

### B. Audits Manager (`QmsAuditsManager.tsx`)
End-to-end management of quality audits stored in Supabase table `qms_audits`:
- **Audit Categories:**
  - `INTERNAL`: Scheduled internal process and departmental audits across Claremont facilities.
  - `EXTERNAL_REGISTRAR`: ISO 9001:2015 surveillance and recertification audits conducted by **TÜV SÜD America**.
  - `EXTERNAL_CUSTOMER`: Direct customer supplier quality assessments (e.g., **Tesla Motors**, **John Deere**, **Caterpillar**).
  - `EXTERNAL_REGULATORY`: OSHA, EPA, or municipal regulatory inspections.
- **Finding Severities & Workflow:**
  - `MAJOR`: Critical non-conformance posing customer risk or total systemic breakdown; automatically initiates an 8D CAPA.
  - `MINOR`: Isolated procedural failure not impacting product fit/form/function.
  - `OFI` (Opportunity for Improvement): Advisory finding highlighting optimization opportunities.
  - *Status Lifecycle:* `OPEN` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `CLOSED` $\rightarrow$ `VERIFIED`.

### C. ISO 9001:2015 Clause 9.3 Management Review (`QmsManagementReview.tsx`)
Dedicated executive governance module. Full technical architecture is documented in [ISO 9001 Clause 9.3 Management Review](iso-9001-mrm-architecture.md).
- Dynamic agenda builder defaulting to standard ISO 9001:2015 review inputs.
- Automated live tie-ins to audit findings, CAPA records, Odoo PPM metrics, and Clause 6.1 risks.
- Action item assignment, verification sign-offs, and printable executive minutes.

### D. CAPA (8D) & Kaizen CI Manager (`QmsCapaCiManager.tsx`)
Structured root-cause problem solving and employee suggestion governance stored in `qms_capas` and `qms_continuous_improvements`:

#### Full 8-Discipline (8D) Lifecycle:
1. **D1 — Establish the Team:** Champions, team leader, and cross-functional members.
2. **D2 — Describe the Problem:** 5W2H problem definition (Who, What, Where, When, Why, How, How Many).
3. **D3 — Interim Containment Actions:** Immediate quarantine of WIP, dock hold, customer sorting, and scrap isolation.
4. **D4 — Define & Verify Root Cause:** 5-Why analysis, Ishikawa Fishbone diagram, and escape point verification.
5. **D5 — Permanent Corrective Actions (PCA):** Engineering design changes, tooling modifications, or fixture poka-yokes.
6. **D6 — Implement & Validate PCA:** Production trial run, statistical validation, and Cpk verification.
7. **D7 — Prevent Recurrence:** Updating Control Plans, PFMEAs, Work Instructions, and ERP routings.
8. **D8 — Recognize Team & Close:** Formal leadership sign-off and team acknowledgement.

#### Kaizen Continuous Improvement:
- Captures shopfloor suggestions categorized by: `CYCLE_TIME_REDUCTION`, `SCRAP_REDUCTION`, `ERGONOMICS`, `DIGITAL_POKAYOKE`, and `TOOLING`.
- Tracks estimated annual cost savings versus actual verified annual savings.

### E. Live Quality Metrics & PPM Telemetry (`QmsQualityMetricsView.tsx`)
Detailed in [Live Odoo Quality Telemetry & PPM Engine](odoo-quality-and-ppm.md).
- Real-time shopfloor PPM calculations, First Pass Yield (FPY %), Work Center matrix, and Defect Pareto distributions.

### F. 3-Tier Document Control System (`QmsDocumentControl.tsx`)
Detailed in [3-Tier Document Control System](document-control-system.md).
- Strict separation of Tier 1 Approved PDFs (controlled documents), Tier 2 Source File Vault, and Tier 3 Working Drafts.

### G. Odoo ERP Sync Configuration (`QmsOdooSettingsModal.tsx`)
Interface for viewing Odoo connection parameters, toggling auto-sync intervals, and verifying live connectivity to NHIMM Pulse.
