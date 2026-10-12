# Project Brief: Shop-Floor Operator Training & Skills Qualification System

**Project Name:** Shop-Floor Operator Training & Skills Qualification System  
**Organization:** NHI Mechanical Motion LLC & Operating Companies (NHI, Terre Products, Mantis, Makers Automation)  
**System Pillar:** ISO 9001:2015 Clause 7.2 (Competence & Training Records)  
**Milestone:** Phase 1a — Clickable Shop-Floor Usability Mock-Up

---

## 1. Project Purpose & Scope

The Shop-Floor Operator Training & Skills Qualification System provides manufacturing facilities with an immediate, high-visibility platform to manage machine certifications, track upcoming/expired qualifications, and empower operators and supervisors to execute training workflows directly at the work center.

### Phase 1a Objective:
Build a **clickable, high-fidelity mock-up** rather than a fully wired production database application. The primary objective is to test ergonomics, language, and task completion with real shop-floor operators and supervisors on three primary form factors:
1. **Smartphone (Mobile)**: Handheld single-thumb use for supervisors moving between work centers (390px viewport).
2. **Tablet / iPad**: Mounted machine-side at work centers or carried by area lead persons (768px–1024px).
3. **Shop-Floor PC / Kiosk**: High-resolution desktop monitors located at supervisor kiosks and QA stations (1280px–1920px).

---

## 2. Technical Stack & Architecture Constraints

1. **Production-Ready Tech Stack**:
   - React 19, TypeScript 5.8+, Vite 8, Tailwind CSS v4, Lucide Icons.
   - Component architecture follows `shadcn/ui` composition patterns so every view, card, modal, and button can be directly promoted to Phase 1.
2. **100% Mock Data Only**:
   - Zero Supabase database tables or network requests in Phase 1a.
   - Zero user login or authentication barriers — testers can immediately interact without passwords or credentials.
   - State mutations (such as signing off a worker) update in-memory React state so the UI reflects the change immediately.
3. **Multi-Company Context**:
   - Aligned with NHI Mechanical Motion LLC operating companies: Machining & Precision Motion (`NHI`), Cast Sprockets & Power Transmission (`TERRE`), Conveyor Idlers & Pulleys (`MANTIS`), and Turnkey Robotics (`MAKERS`).
4. **Cloudflare Deployment**:
   - Automated preview deployments via Cloudflare Workers / Pages serving static assets.

---

## 3. Mandatory User-Interface Rules

To ensure usability in loud, bright, or greasy industrial shop-floor environments with gloved fingers:

1. **48px Minimum Touch Targets**:
   - Every button, tab, card, input field, and interactive touch zone must have a minimum physical target size of **48px by 48px** (`min-h-[48px]`, `min-w-[48px]`).
2. **16px Minimum Typography**:
   - The absolute minimum font size used anywhere in the application is **16px** (`text-base`). Zero `text-xs` (12px) or `text-sm` (14px) fonts are permitted.
   - Headings and key indicators must scale from `text-lg` (18px) to `text-3xl` (30px) for visibility from 3 feet away.
3. **Plain English (No Software or Academic Jargon)**:
   - Use straightforward language that operators and leads use daily on the floor:
     - *"What Training I Need Next"* (not *"Pending Competency Modules"*)
     - *"Machines I Am Qualified On"* (not *"Authorized Asset Matrix"*)
     - *"Sign Off a Worker"* (not *"Execute Competency Endorsement"*)
     - *"Confirm Sign-Off"* (not *"Commit Transaction"*)
4. **Maximum 5 Navigation Items**:
   - Keep global navigation to 5 or fewer items to prevent cognitive overload.
   - Default navigation: `[ Home ]`, `[ Operator View ]`, `[ Sign Off Worker ]`, `[ Skills Matrix ]`, `[ Reset Demo ]`.
5. **Tri-Attribute Status Presentation (Color + Word + Icon)**:
   - Every qualification or status display must simultaneously present:
     - **Color**: Clear visual signal (Green, Amber, Red, Blue, Slate).
     - **Word**: Plain descriptive text (`"Qualified"`, `"Due Soon"`, `"Expired"`, `"In Training"`, `"Not Trained"`).
     - **Icon**: Accessible graphic symbol (`CheckCircle2`, `Clock`, `AlertTriangle`, `PlayCircle`, `MinusCircle`).

---

## 4. Phase 1a Task Flows

### Task A — Operator Flow
- **Scenario:** An operator clocks in at the start of their shift.
- **Workflow:**
  1. Open app home screen.
  2. Tap **"Operator — View My Training & Machines"**.
  3. View required next training items (spotting due dates and overdue items).
  4. View current list of qualified machines and skill levels (Level 1 to Level 3).
  5. Tap **"Open Training Guide"** on an upcoming lesson to view step-by-step SOP and PPE safety checks.

### Task B — Supervisor on Mobile Phone
- **Scenario:** A supervisor walks the machining line, observes an operator running a Haas CNC Mill safely, and signs them off for independent operation.
- **Workflow:**
  1. Open app on smartphone.
  2. Tap **"Supervisor — Sign Off a Worker"**.
  3. Search / select the operator (e.g., *Sarah Jenkins*).
  4. Select the machine (*Haas VF-4 Vertical Mill*).
  5. Check verified competencies (safety protocol, part loading, 5-piece inspection).
  6. Tap **"Sign Off for Level 2 (Qualified Operator)"**.
  7. Confirm the action in an explicit, high-visibility confirmation dialog.
  8. Receive immediate visual confirmation that the operator's badge is now updated to Level 2.

### Task C — Supervisor or Quality Manager Matrix Flow
- **Scenario:** A supervisor or quality manager prepares for the morning shop stand-up meeting and needs to verify compliance across the department.
- **Workflow:**
  1. Tap **"Manager — View Skills Matrix"**.
  2. Filter by department (e.g., *CNC Machining*).
  3. Inspect matrix grid to immediately identify operators who are **Expired** (Red Alert icon) or **Due Soon** (Amber Clock icon).
  4. Tap on any cell to see recertification due dates and trainer sign-offs.

---

## 5. Next Steps (Phase 1 Roadmap)

Following tester feedback gathered via `docs/MOCKUP_TEST.md`:
1. Iterate on navigation, button layouts, and phrasing until 100% of testers complete all three tasks without guidance.
2. Connect approved screens to Supabase database tables (`training_operators`, `training_machines`, `training_qualifications`, `training_signoffs`).
3. Implement QR-code machine scanning for instantaneous mobile lookups.
