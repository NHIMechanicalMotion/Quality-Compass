# Companies, Branding & Design Standards

This document establishes the corporate identity, operating sub-company divisions, color palettes, typography, and visual standards for **Quality Compass**.

---

## 1. Corporate Identity & Multi-Company Structure

**NHI Mechanical Motion LLC (NHIMM)** operates four specialized manufacturing businesses under a single unified corporate governance structure in Claremont, New Hampshire. Quality Compass provides both consolidated enterprise views (`ALL`) and filtered operational company views.

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

---

## 2. Company Brand Specifications

Defined in `src/data/operatingCompanies.ts` and rendered via `src/components/common/CompanyBrandLogo.tsx`:

### Consolidated Enterprise: NHI Mechanical Motion LLC (`ALL`)
- **Short Code:** `NHIMM`
- **Primary Color:** `#0B2545` (Navy Industrial)
- **Accent Color:** `#81C341` (Electric Precision Lime)
- **Tailwind Badge Classes:** `bg-[#0B2545] border-[#132E58] text-blue-300`
- **Facility Address:** 35 Connecticut Riverbend Place, Claremont NH 03743
- **Role:** Parent enterprise rollup consolidating quality management, cross-plant audits, enterprise document control, and APQP governance across all four operating companies.

### Sub-Company 1: NHI (`NHI`)
- **Tagline:** *Precision Mechanical Motion, Machined Hubs, Pulleys & Tensioners*
- **Primary Color:** `#70c128` (Precision Green)
- **Tailwind Badge Classes:** `bg-lime-950/80 border-lime-500 text-lime-300`
- **Core Capabilities:**
  - Multi-axis CNC lathe turning & precision boring
  - Precision spindle hub & shaft broaching
  - Automated idler and drive pulley assembly lines
  - 100% in-process gauging & CMM dimensional runout verification
  - OEM long-term agreements & direct Kanbans

### Sub-Company 2: Terre Products (`TERRE`)
- **Tagline:** *Heavy-Duty Power Transmission, Castings & Driveline Components*
- **Primary Color:** `#5c6f5a` (Field & Earth Green)
- **Tailwind Badge Classes:** `bg-emerald-950/70 border-emerald-600/70 text-emerald-200`
- **Core Capabilities:**
  - Heavy-duty agricultural & turf drive pulleys
  - Ductile and gray iron casting machining and finishing
  - High-torque splined hub & keyway power transfer systems
  - Case hardening & high-capacity bearing retention cells
  - Fast-turn agricultural aftermarket distribution

### Sub-Company 3: Mantis Conveyor Products (`MANTIS`)
- **Tagline:** *Engineered Conveyor Components, Precision Rollers, Idlers & Belt Pulleys*
- **Primary Color:** `#81C341` (Vibrant Conveyor Lime)
- **Tailwind Badge Classes:** `bg-green-950/80 border-[#81C341] text-[#81C341]`
- **Core Capabilities:**
  - Heavy-duty drum and wing conveyor pulleys
  - Precision vulcanized rubber & ceramic lagging application
  - Automated conveyor roller swaging & bearing pressing
  - Dynamic balancing & high-speed Total Indicator Reading (TIR) testing
  - Continuous bulk material handling motion systems

### Sub-Company 4: Makers Automation (`MAKERS`)
- **Tagline:** *Turnkey Robotic Cells, Custom Industrial Automation & Controls Engineering*
- **Primary Color:** `#ea580c` (Robotics Industrial Orange)
- **Tailwind Badge Classes:** `bg-orange-950/80 border-orange-500 text-orange-300`
- **Core Capabilities:**
  - Turnkey 6-axis Fanuc / ABB robotic machine-tending cells
  - Custom poka-yoke automated inspection fixtures
  - High-speed machine vision guidance & Keyence laser profilometry
  - Allen-Bradley / Rockwell PLC programming & SCADA integration
  - Autonomous Mobile Robot (AMR) material handling integration

---

## 3. Scope Selector & Filtering Rules

In `src/components/Header.tsx`, the company scope selector allows users to toggle between the consolidated enterprise view (`ALL`) and individual operating sub-companies.

### Filtering Rules Across Views:
1. **Pillar 1 (CAD & First Article):**
   - When a specific company is selected, the drawing picker prioritizes drawing templates and part families belonging to that company (e.g., Selecting `MANTIS` defaults to conveyor drum pulleys and shaft lagging drawings).
2. **Pillar 2 (QMS Executive OS):**
   - **Executive Overview:** Filters open CAPAs, audit scores, and PPM metrics by the selected operating entity.
   - **Audits Manager:** Filters internal audits and customer audits by facility division.
   - **Quality Metrics:** Isolates Odoo scrap, FPY %, and work center performance to the selected division.
   - **Document Control:** Filters controlled procedures and work instructions by operating entity.
3. **Pillar 3 (APQP & PPAP Launch Hub):**
   - APQP project cards are tagged with the operating company short code. Selecting a company filters the active launch pipeline to projects commissioned by that division.

---

## 4. Design System & Typography

- **Dark Theme Foundation:** Backgrounds use `#07172C` (Midnight Deep Navy) and card surfaces use `#0B2545` / `#132E58`.
- **Accent Colors:** Electric lime (`#81C341`) is used for primary action buttons, active tabs, and passing status indicators. Cyan (`#38bdf8`) is used for Pillar 2 navigation and informational callouts.
- **Font Stack:** Clean sans-serif system stack (`Inter`, `ui-sans-serif`, `system-ui`) paired with monospace font (`ui-monospace`, `SFMono-Regular`, `Menlo`) for part numbers, drawing codes, tolerances, and GD&T symbols.
- **Status Color Semantics:**
  - Pass / Conforming / Approved: `emerald-400` / `lime-400`
  - Warning / In Progress / Pending Verification: `amber-400` / `yellow-400`
  - Fail / Non-Conforming / Critical Action: `rose-500` / `red-400`
  - Obsolete / Retained: `slate-500`
