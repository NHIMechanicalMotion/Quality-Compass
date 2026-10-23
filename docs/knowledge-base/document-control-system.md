# 3-Tier Document Control System

This document specifies the consensus-driven document control architecture, file classification rules, revision lifecycles, and promotion workflows of the **Document Control System (DCS)** in Quality Compass.

---

## 1. Executive Consensus & Guiding Principles

During platform design, a strict operational consensus was established:

> [!IMPORTANT]
> **Approved PDFs Are the Only Controlled Documents.**  
> Editable formats (`.docx`, `.xlsx`, `.dwg`, `.pptx`) can easily be modified on client machines without leaving an audit trail. To satisfy ISO 9001:2015 Clause 7.5 (Documented Information) and Tier-1 customer audits, released controlled documents must be read-only, signed, watermarked **PDF files**.

To support active engineering authoring while guaranteeing regulatory compliance, Quality Compass implements a **3-Tier Document Control Architecture**:

```
┌────────────────────────────────────────────────────────────────────────┐
│               The 3-Tier Document Control Architecture                 │
├────────────────────────────────────────────────────────────────────────┤
│  TIER 1: Approved Controlled Documents                                 │
│  • Strictly PDF format only                                            │
│  • Official legally auditable release record                           │
│  • Immutable revision history, effective dates & watermarking          │
├────────────────────────────────────────────────────────────────────────┤
│  TIER 2: Source File Vault                                             │
│  • Native editable files (.docx, .xlsx, .dwg, .pptx)                   │
│  • Linked to parent Tier-1 document record                             │
│  • Check-out / check-in reservation tracking                           │
├────────────────────────────────────────────────────────────────────────┤
│  TIER 3: Isolated Working Documents (Draft Sandbox)                    │
│  • Staging area for active authoring, peer reviews & redlines          │
│  • Isolated from plant floor views until compiled to PDF and promoted  │
└────────────────────────────────────────────────────────────────────────┘
```

Component: `src/components/qms/QmsDocumentControl.tsx`  
Types: `src/types/qms.ts` (`ControlledDocument`, `SourceVaultItem`, `WorkingDocument`)  
Supabase Tables: `qms_documents`, `qms_document_revisions`

---

## 2. Tier 1: Approved Controlled Documents

Tier 1 houses the official, active procedures, work instructions, and forms in production:

### Mandatory Controlled Document Attributes:
- **Document Number:** Unique standard code (e.g., `SOP-QA-001`, `WI-MANTIS-012`, `FORM-APQP-04`).
- **Document Title:** Formal descriptive title.
- **Category:** `Quality Manual`, `SOP`, `Work Instruction`, `Inspection Procedure`, or `Form/Template`.
- **Department:** `Quality Assurance`, `Machining`, `Assembly`, `Supply Chain`, `Engineering`, or `Executive`.
- **Current Revision:** Formal alphanumeric revision code (`Rev A`, `Rev B`, `Rev 01`).
- **Approval Metadata:** `approved_by` (QA Manager / Executive) and `approved_at` timestamp.
- **PDF Asset Association:** Direct link to read-only PDF file (`pdf_file_url`, `pdf_file_name`, `pdf_file_size_bytes`).
- **Watermark & Compliance Notice:**
  - Watermark: *"CONTROLLED DOCUMENT — NHI MECHANICAL MOTION LLC"*
  - Uncontrolled Copy Notice: *"UNCONTROLLED IF PRINTED OR DOWNLOADED. VERIFY CURRENT REVISION IN QUALITY COMPASS DCS."*
- **Review Lifecycle:** Tracks `effective_date` and `next_review_date` (annual review cadence).

---

## 3. Tier 2: Native Source File Vault

Tier 2 serves as the secure digital repository for native, editable authoring assets:
- **Supported Native Types:** Microsoft Word (`.docx`), Microsoft Excel (`.xlsx`), AutoCAD Drawing (`.dwg`), Microsoft PowerPoint (`.pptx`).
- **Direct Vault Deposit:** Authors and quality engineers can click **"+ Deposit Native Master"** to directly upload and catalog approved master `.docx`/`.xlsx`/`.dwg` assets with revision metadata and notes.
- **Master File Retrieval:** The **"Download Master"** action allows authorized users to download the exact binary source file from the vault.
- **Parent Linkage:** Every vault item references a primary `document_id` and `doc_number`.
- **Check-Out Governance:**
  - When an engineer checks out a source file for revision, `is_checked_out` is set to `true` and `checked_out_by` records the engineer's username.
  - Prevents dual-author overwrite collisions during active engineering changes.

---

## 4. Tier 3: Isolated Working Documents (Draft Sandbox)

Tier 3 provides a collaborative staging workspace for documents undergoing active revision:
- **Stages:** `DRAFT` $\rightarrow$ `IN_REVIEW` $\rightarrow$ `PENDING_APPROVAL`.
- **Native File Upload & Drag-and-Drop:**
  - When creating a draft via **"Start Working Draft"**, authors can attach or drag-and-drop Word (`.docx`), Excel (`.xlsx`), or CAD files.
  - The system automatically parses the document number (e.g. `SOP-QA-001`), clean title, file extension, and file size.
- **Draft File Management:**
  - Existing draft rows feature **"Download Draft"** to immediately retrieve the attached working file.
  - Authors can update or replace draft files at any time via **"Attach File"**.
- **Sandbox Isolation:** Working drafts are visible only inside the authoring tab and cannot be accessed from plant floor work stations or audit inspections until formally promoted.
- **Change Summary:** Authors must document proposed changes before submitting for management approval.

---

## 5. Promotion & Release Workflow

Moving a document from a working draft into a released Tier-1 controlled document follows a strict stage-gate process:

```mermaid
flowchart TD
    DRAFT["Tier 3: Working Document\n(Active Draft / In Review)"]
    VAULT["Tier 2: Source File Vault\n(Native .docx / .xlsx / .dwg)"]
    PDF_GEN["Compile & Export Final PDF\n(Apply Headers, Footers & Signatures)"]
    PROMOTED["Tier 1: Approved Controlled Document\n(PDF Promoted to Active Production)"]
    REV_ARCHIVE["Archive Old Revision in\nqms_document_revisions"]

    DRAFT -->|Authoring Complete| PDF_GEN
    VAULT -->|Check-in Source| DRAFT
    PDF_GEN -->|QA Sign-off| PROMOTED
    PROMOTED --> REV_ARCHIVE
```

### Promotion Steps:
1. **Direct Dual-Tier Initiation**:
   - From **Tier 3 (Working Documents)**: Click **"Promote to Controlled PDF"** on the draft row.
   - From **Tier 2 (Source Vault)**: Click **"Promote to Controlled PDF"** directly on any master native file row, or click **"Export PDF"** to generate an instant controlled copy.
2. **Automated Controlled PDF Compilation**:
   - Quality Compass uses `src/services/controlledPdfGenerator.ts` (`generateControlledDocumentPdf`) to compile an official ISO 9001:2015 Clause 7.5.3 controlled PDF.
   - Automatically applies the diagonal `CONTROLLED DOCUMENT — NHI MECHANICAL MOTION LLC` watermark, title block, uncontrolled copy warning banner, and electronic approval authentication stamp.
   - Allows live preview and downloading before formal authorization.
3. **Authorization & Sign-Off**:
   - System prompts for QA Approving Authority (QA Executive / Lead) and sign-off notes.
4. **Automated Lifecycle Execution**:
   - The previous Tier-1 revision is preserved in `qms_document_revisions` as an archived immutable record.
   - The active `qms_documents` record is updated with the new revision code, effective date, and PDF file reference.
   - Master editable source file (`.docx`/`.xlsx`/`.dwg`) is checked into Tier 2 Source Vault.
   - The working draft in Tier 3 is closed.
