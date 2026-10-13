# Database Schema & Integration Pipeline

This document catalogs the complete database schema, table definitions, foreign key relationships, and query patterns across the dual Supabase backends powering **Quality Compass**.

---

## 1. Dual-Database Topology

Quality Compass maintains strict isolation between internal QMS compliance records and shopfloor ERP operational data:

```
[Quality Compass SPA]
        │
        ├─── [Client A: src/services/supabase.ts] ───────> QMS Core DB (jggdqmygudsiueaiqzcn)
        │                                                  • Drawings & Metrology Balloons
        │                                                  • QMS Audits, CAPA 8D & Reviews
        │                                                  • Controlled Documents & Revisions
        │                                                  • APQP Projects & PPAP Submissions
        │
        └─── [Client B: src/services/odooSupabase.ts] ───> NHIMM Pulse ERP (vrsbfjiafjrbwbyullkh)
                                                           • odoo_sale_orders (12,000+ rows)
                                                           • odoo_sale_order_lines (55,000+ rows)
                                                           • odoo_bom_operations (10,000+ rows)
```

---

## 2. QMS Core Database Tables (`jggdqmygudsiueaiqzcn`)

### A. CAD Drawings & Metrology
- **`drawings`**: Header table storing CAD drawing metadata.
  - Primary Key: `id` (UUID)
  - Columns: `drawing_number`, `part_name`, `revision`, `organization`, `drawn_by`, `checked_by`, `approved_by`, `release_date`, `scale`, `sheet`, `material`, `finish`, `units`, `projection`, `general_tolerance_note`, `compliance_score`, `audit_status`.
- **`dimension_balloons`**: Extracted drawing callouts and balloon coordinates.
  - Primary Key: `id` (UUID)
  - Foreign Key: `drawing_id` $\rightarrow$ `drawings.id`
  - Columns: `item_number`, `dimension_name`, `dimension_name_zh`, `dimension_type`, `classification` (`CRITICAL`, `MAJOR`, `MINOR`), `nominal`, `upper_tol`, `lower_tol`, `min_limit`, `max_limit`, `unit`, `raw_callout`, `drawing_zone`, `pos_x`, `pos_y`, `leader_x`, `leader_y`, `gdt_symbol`, `gdt_tolerance`, `gdt_datums`.
- **`inspection_control_items`**: 5-sample measurement records and gage tooling assignments.
  - Primary Key: `id` (UUID)
  - Foreign Keys: `drawing_id` $\rightarrow$ `drawings.id`, `balloon_id` $\rightarrow$ `dimension_balloons.id`
  - Columns: `item_number`, `sample1`, `sample2`, `sample3`, `sample4`, `sample5`, `status` (`PASS`, `FAIL`), `deviation_notes`, `recommended_tool_en`, `recommended_tool_zh`, `selected_tool_en`, `selected_tool_zh`, `sampling_plan_en`, `sampling_plan_zh`.
- **`china_approvals`**: Bilingual overseas quality sign-offs.
  - Primary Key: `id` (UUID)
  - Foreign Key: `drawing_id` $\rightarrow$ `drawings.id`
  - Columns: `inspector_name`, `inspector_name_zh`, `facility_location`, `inspection_date`, `decision` (`APPROVED`, `CONDITIONAL`, `REJECTED`), `qa_manager_name`, `decision_notes`, `approval_date`.

### B. QMS Audits & Findings
- **`qms_audits`**: Audit event records.
  - Primary Key: `id` (UUID)
  - Columns: `audit_number`, `title`, `audit_type` (`INTERNAL`, `EXTERNAL_REGISTRAR`, `EXTERNAL_CUSTOMER`, `EXTERNAL_REGULATORY`), `scope_standard`, `lead_auditor`, `department`, `start_date`, `end_date`, `status` (`SCHEDULED`, `IN_PROGRESS`, `UNDER_REVIEW`, `COMPLETED`), `score`, `summary_notes`.
- **`qms_audit_findings`**: Non-conformances and improvement opportunities.
  - Primary Key: `id` (UUID)
  - Foreign Key: `audit_id` $\rightarrow$ `qms_audits.id`
  - Columns: `finding_number`, `severity` (`MAJOR`, `MINOR`, `OFI`), `standard_clause`, `description`, `department`, `target_closure_date`, `status` (`OPEN`, `IN_PROGRESS`, `CLOSED`, `VERIFIED`), `root_cause`.

### C. Management Review & Action Governance
- **`qms_management_reviews`**: ISO 9001 Clause 9.3 executive review sessions.
  - Primary Key: `id` (UUID)
  - Columns: `review_code`, `title`, `review_period`, `meeting_date`, `facilitator`, `attendees` (JSONB array), `status` (`SCHEDULED`, `CONDUCTED`, `COMPLETED`), `inputs_evaluated` (JSONB array of agenda items), `summary_notes`, `executive_decision_summary`, `next_review_date`.
- **`qms_review_actions`**: Decisions and assigned action items from management reviews.
  - Primary Key: `id` (UUID)
  - Foreign Key: `review_id` $\rightarrow$ `qms_management_reviews.id`
  - Columns: `source_clause`, `action_description`, `owner`, `department`, `due_date`, `priority` (`HIGH`, `MEDIUM`, `LOW`), `status` (`OPEN`, `IN_PROGRESS`, `COMPLETED`, `VERIFIED_CLOSED`), `completion_notes`, `verified_by`, `verified_at`, `resource_required`.

### D. CAPA (8D) & Continuous Improvement
- **`qms_capas`**: 8-Discipline problem-solving records.
  - Primary Key: `id` (UUID)
  - Columns: `capa_number`, `title`, `source`, `severity` (`CRITICAL`, `MAJOR`, `MODERATE`, `LOW`), `status` (`OPEN`, `IN_PROGRESS`, `PENDING_VERIFICATION`, `CLOSED`), `current_step` (`D1_TEAM` through `D8_RECOGNITION`), `owner`, `target_close_date`, `eight_d_data` (JSONB), `odoo_cost_impact`, `odoo_alert_id`.
- **`qms_continuous_improvements`**: Employee Kaizen ideas.
  - Primary Key: `id` (UUID)
  - Columns: `ci_number`, `title`, `submitted_by`, `department`, `category`, `status`, `estimated_annual_savings`, `actual_savings`, `description`.

### E. Document Control System (DCS)
- **`qms_documents`**: Active Tier-1 controlled document records (PDFs only).
  - Primary Key: `id` (UUID)
  - Columns: `doc_number`, `title`, `category`, `department`, `current_revision`, `status` (`DRAFT`, `IN_REVIEW`, `APPROVED`, `OBSOLETE`), `owner`, `effective_date`, `next_review_date`, `description`, `pdf_file_url`, `pdf_file_name`, `pdf_file_size_bytes`, `approved_by`, `approved_at`, `source_vault_id`.
- **`qms_document_revisions`**: Historical revision archive.
  - Primary Key: `id` (UUID)
  - Foreign Key: `document_id` $\rightarrow$ `qms_documents.id`
  - Columns: `revision`, `change_summary`, `created_by`, `approved_by`, `status`, `approved_at`.

### F. APQP Projects & PPAP Submissions
- **`apqp_projects`**: NPI launch projects.
  - Primary Key: `id` (UUID)
  - Columns: `project_code`, `project_name`, `customer_name`, `customer_contact`, `part_number`, `part_revision`, `program_name`, `target_sop_date`, `target_ppap_date`, `current_phase` (1–5), `workflow_mode` (`ENFORCED`, `FLEXIBLE`), `checklist_data` (JSONB), `phase_gates` (JSONB), `lead_engineer`, `status`.
- **`ppap_submissions`**: 18-element AIAG submission packages.
  - Primary Key: `id` (UUID)
  - Foreign Key: `apqp_project_id` $\rightarrow$ `apqp_projects.id`
  - Columns: `submission_level` (Level 1–5), `warrant_status`, `elements` (JSONB dictionary of the 18 deliverables).

### G. Odoo Quality Telemetry Sync Tables (Hourly Pipeline)
Populated hourly by `.github/workflows/odoo_quality_sync.yml` running `scripts/sync_odoo_quality.py`:
- **`odoo_quality_records`**: Individual quality alerts, inspection discrepancies, and scrap transactions.
  - Primary Key: `id` (TEXT)
  - Columns: `alert_code`, `product_sku`, `product_name`, `customer_name`, `workcenter`, `lot_number`, `work_order`, `defect_type`, `quantity_inspected`, `quantity_rejected`, `calculated_ppm`, `scrap_cost`, `date`, `stage`, `is_quarantined_mrb`, `notes`, `synced_at`.
- **`odoo_quality_ppm_metrics`**: Monthly aggregated PPM and yield metrics.
  - Primary Key: `period` (TEXT, e.g. `'2026-10'`)
  - Columns: `total_units`, `defective_units`, `ppm`, `target_ppm`, `fpy_percentage`, `scrap_dollars`, `scrap_percentage`, `mo_pieces_produced`, `mo_scrap_qty`, `mo_scrap_ppm`, `fg_make_sold_12m`, `fg_make_returned_12m`, `fg_make_ppm`, `fg_buy_sold_12m`, `fg_buy_returned_12m`, `fg_buy_ppm`, `fg_total_sold_12m`, `fg_total_returned_12m`, `fg_total_ppm`, `synced_at`.
- **`odoo_quality_defect_pareto`**: Pareto defect distributions.
  - Primary Key: `reason` (TEXT)
  - Columns: `count`, `cost_impact`, `percentage`, `cumulative_percentage`, `synced_at`.
- **`odoo_quality_workcenters`**: Work center yield and PPM performance.
  - Primary Key: `workcenter_name` (TEXT)
  - Columns: `total_units`, `defective_units`, `ppm`, `scrap_cost`, `primary_defect`, `synced_at`.
- **`odoo_quality_sync_logs`**: Sync audit and status log.
  - Primary Key: `id` (BIGINT GENERATED ALWAYS AS IDENTITY)
  - Columns: `sync_timestamp`, `status`, `records_synced`, `duration_seconds`, `message`.

---

## 3. NHIMM Pulse / Odoo ERP Database (`vrsbfjiafjrbwbyullkh`)

Access via read-only anonymous connection in `src/services/odooSupabase.ts`:
- **`odoo_sale_orders`**: Over 12,000 sales orders used for customer order lookups, delivery dates, and open order quantities.
- **`odoo_sale_order_lines`**: Over 55,000 line items linking customers (`partner_name`) to internal manufactured part numbers (`product_sku`), powering autocomplete in APQP and drawing selectors.
- **`odoo_bom_operations`**: Over 10,000 routing steps linking products to Claremont work centers (`workcenterName`) and standard cycle times (`timeCycleMinutes`).
