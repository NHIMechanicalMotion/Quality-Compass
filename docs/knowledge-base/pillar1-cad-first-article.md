# Pillar 1: CAD & First Article Inspection

This document describes the metrology, blueprint inspection, OCR parsing, auto-ballooning, and standards compliance engine powering **Pillar 1** of Quality Compass.

---

## 1. Overview & Objectives

Pillar 1 transforms engineering blueprints into interactive, auditable First Article Inspection (FAI) packages. It eliminates manual drawing ballooning and transcription errors by extracting dimensions, checking compliance against GD&T standards, assigning metrology tooling, and facilitating bilingual quality sign-offs.

Primary UI Components:
- `src/components/DrawingCanvas.tsx` — Interactive pan/zoom canvas rendering vectors, raster images, and balloon overlays.
- `src/components/InspectionTable.tsx` — Tabular inspection control plan showing nominals, limits, samples 1–5, tooling, and status.
- `src/components/StandardsAuditModal.tsx` — Automated GD&T standard compliance audit engine.
- `src/components/ChinaApprovalModal.tsx` — Bilingual English/Chinese inspection sign-off workflow.
- `src/components/AutoBalloonReviewModal.tsx` — Automated OCR feature review and batch confirmation.

---

## 2. Ingestion & Rendering Pipeline

Quality Compass supports multiple drawing input formats:

```
[Customer Drawing: PDF / DXF / Raster]
               │
       ┌───────┴────────────────────────┐
       ▼                                ▼
[Vector PDF / DXF Parser]      [Raster OCR Engine]
(pdfjs-dist / dxfLoader.ts)    (Tesseract.js)
       │                                │
       └───────┬────────────────────────┘
               ▼
   [Extracted Text & Vectors]
               │
               ▼
  [dimensionParser.ts / cadOcrParser.ts]
               │
               ├──> Nominal value, limits, bilateral/unilateral tolerance
               ├──> GD&T symbols (position, runout, perpendicularity, datums)
               └──> Drawing zone coordinates (X/Y)
               │
               ▼
    [Interactive Balloon Array]
```

### Supported File Formats:
1. **Vector PDF (`pdfjs-dist`):** Renders high-resolution PDF pages to canvas while extracting embedded vector text streams for instant, pixel-perfect dimension extraction without OCR lag.
2. **DXF (`src/utils/dxfLoader.ts`):** Parses AutoCAD DXF entities (`LINE`, `CIRCLE`, `ARC`, `TEXT`, `MTEXT`, `DIMENSION`) into scalable 2D canvas paths.
3. **High-Resolution Images (`JPEG` / `PNG` / `TIFF`):** Processed through Tesseract.js optical character recognition with specialized metrology regex patterns to extract decimal and fractional callouts.

---

## 3. Auto-Ballooning & Dimension Parsing Engine

The parsing engine (`src/utils/dimensionParser.ts` and `src/utils/cadOcrParser.ts`) detects and structures drawing annotations:

### Supported Callout Syntax:
- **Bilateral Symmetrical:** `1.500 ± 0.005`, `25.4 ± 0.1`
- **Bilateral Asymmetrical:** `2.000 +0.010 / -0.002`
- **Limit Dimensions:** `1.255 / 1.245`
- **Basic Dimensions:** `[2.500]`, `(3.000) BASIC`
- **Diameter Callouts:** `Ø 0.750 +0.002/-0.000`
- **Thread Callouts:** `3/8-16 UNC-2B`, `M10 x 1.5 - 6H`
- **GD&T Feature Control Frames:** `[ | 0.005 | A | B | C ]` (Position, Flatness, Cylindricity, Total Runout)

### Characteristic Classification:
Dimensions are automatically categorized to determine inspection frequency and sampling plans:
- **CRITICAL (Diamond / Octagon):** Severe safety, regulatory, or functional fit dimensions requiring 100% inspection or $C_{pk} \ge 1.67$.
- **MAJOR (Hexagon):** Significant performance features requiring $C_{pk} \ge 1.33$ or tight AQL sampling.
- **MINOR (Standard Circle):** Standard reference and non-critical dimensional features.

---

## 4. Standards Audit Engine

Implemented in `src/standards/auditEngine.ts` with reference rule sets in `src/standards/standardsLibrary.ts`:

### Supported Metrology Standards:
- **ASME Y14.5M-1994** & **ASME Y14.5-2018:** Dimensioning and Tolerancing (US customary & metric).
- **ISO 1101:** Geometrical Product Specifications (GPS) — Geometrical tolerancing.
- **ISO 2768-1 / ISO 2768-2:** General geometrical tolerances for linear and angular dimensions without individual tolerance indications.

### Automated Checks Performed:
1. **Title Block Completeness:** Verifies drawing number, part name, revision code, drawn-by, approved-by, sheet count, and general tolerance note.
2. **Datum Definition Integrity:** Verifies that datum reference frames (`A`, `B`, `C`) referenced in feature control frames are physically declared and valid on the drawing.
3. **Tolerance Redundancy:** Flags double-dimensioned features or conflicting general tolerance notes.
4. **Compliance Scoring:** Calculates an overall compliance score (0–100%) and categorizes findings as Passed, Warning, or Critical Violation.

---

## 5. Metrology Tool Recommender

Defined in `src/utils/toolRecommender.ts`, this engine recommends the optimal physical measuring instrument based on feature tolerance width:

$$\text{Tolerance Band} = \text{Upper Limit} - \text{Lower Limit}$$

| Tolerance Band | Feature Type | Recommended Tool (EN) | Recommended Tool (ZH) | Rule of Ten (Gage Resolution) |
| :--- | :--- | :--- | :--- | :--- |
| $\ge 0.50\text{ mm}$ ($\ge 0.020''$) | General Length / OD | Digital Caliper (0.01mm) | 数显卡尺 (0.01mm) | Satisfies 10:1 ratio for wide limits |
| $0.10\text{ to }0.49\text{ mm}$ | Shaft OD / Thickness | Digital Outside Micrometer | 外径千分尺 (0.001mm) | High precision screw spindle |
| $0.02\text{ to }0.09\text{ mm}$ | Precision Bore / Hub Hole | Bore Gage / Air Gage | 内径量表 / 气动量仪 | Eliminates operator feel error |
| $< 0.020\text{ mm}$ ($< 0.0008''$) | Critical Bearing Bore | Coordinate Measuring Machine (CMM) | 三坐标测量机 (CMM) | Sub-micron automated multi-axis probing |
| Any GD&T Position / Runout | Complex GD&T Feature | Multi-Axis CMM / Roundness Tester | 三坐标 / 圆度仪 | Multi-datum alignment alignment |
| External Thread Callout | Thread Pitch & Major Dia | Thread Go/No-Go Ring Gage | 螺纹通止规 | Functional pitch boundary check |

---

## 6. China QC Team Bilingual Sign-Off Workflow

Implemented in `src/components/ChinaApprovalModal.tsx`:

To support NHIMM's international supply chain and overseas manufacturing plants:
- Provides full bilingual English / Simplified Chinese (`zh-CN`) user interface.
- Records Inspector Name (e.g., *"张建国 / Jianguo Zhang"*), Inspection Date, Facility Location (e.g., *"Ningbo Plant 2"*), and QA Manager approval.
- Captures disposition: **APPROVED (合格)**, **CONDITIONALLY APPROVED (特采/让步接收)**, or **REJECTED (不合格)**.
- Stores immutable sign-off records in Supabase table `china_approvals`.

---

## 7. Report Export Engines

1. **Excel First Article Inspection Report (`src/utils/excelExport.ts`):** Formats an AS9102 Form 3 / AIAG layout inspection workbook containing balloon numbers, dimensions, tolerances, 5 sample measurement values, PASS/FAIL badges, and tool assignments.
2. **PDF Inspection Package (`src/utils/pdfExport.ts`):** Produces a vectorized PDF packet with title block metadata, compliance score, inspector signatures, and tabular inspection results.
