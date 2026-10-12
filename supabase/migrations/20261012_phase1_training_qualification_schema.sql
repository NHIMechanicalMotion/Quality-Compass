-- ============================================================================
-- Quality Compass // Phase 1: Shop-Floor Operator Training & Skills Qualification Schema
-- NHI Mechanical Motion LLC (NHIMM)
-- 
-- System: ISO 9001:2015 Clause 7.2 (Competence & Training Records)
-- Target Database: QMS & CAD Supabase Database (jggdqmygudsiueaiqzcn)
-- ============================================================================

-- 1. DEPARTMENTS & WORK AREAS
CREATE TABLE IF NOT EXISTS public.training_departments (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    operating_company TEXT NOT NULL DEFAULT 'NHI' CHECK (operating_company IN ('NHI', 'TERRE', 'MANTIS', 'MAKERS', 'ALL')),
    area TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. EMPLOYEES DIRECTORY (With Soft-Archive Rules)
CREATE TABLE IF NOT EXISTS public.training_employees (
    id TEXT PRIMARY KEY,
    employee_number TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    department_id TEXT NOT NULL REFERENCES public.training_departments(id) ON DELETE RESTRICT,
    supervisor_id TEXT REFERENCES public.training_employees(id) ON DELETE SET NULL,
    role TEXT NOT NULL DEFAULT 'OPERATOR' CHECK (role IN ('OPERATOR', 'LEAD', 'SUPERVISOR', 'QUALITY_TECH', 'MANAGER', 'ADMIN')),
    shift TEXT NOT NULL DEFAULT 'Shift 1 (Day)',
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
    archive_reason TEXT,
    hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. APPLICATION USERS & PIN CREDENTIALS (Office Auth + Floor PIN)
CREATE TABLE IF NOT EXISTS public.training_app_users (
    id TEXT PRIMARY KEY,
    user_id UUID, -- Links to auth.users if office email/password user
    employee_id TEXT NOT NULL REFERENCES public.training_employees(id) ON DELETE CASCADE,
    system_role TEXT NOT NULL DEFAULT 'OPERATOR' CHECK (system_role IN ('ADMIN', 'SUPERVISOR', 'HR', 'OPERATOR')),
    pin_hash TEXT NOT NULL, -- 4-digit numeric PIN hash for floor kiosk login
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. EQUIPMENT & WORK CENTERS (With Soft-Archive Rules)
CREATE TABLE IF NOT EXISTS public.training_equipment (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    department_id TEXT NOT NULL REFERENCES public.training_departments(id) ON DELETE RESTRICT,
    location TEXT NOT NULL,
    model TEXT,
    serial_number TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
    archive_reason TEXT,
    sop_document_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. TRAINING MODULES CATALOG
CREATE TABLE IF NOT EXISTS public.training_modules (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('OSHA', 'HR', 'QUALITY', 'MACHINE')),
    frequency_type TEXT NOT NULL DEFAULT 'ANNUAL' CHECK (frequency_type IN ('ONE_TIME', 'ANNUAL', 'BIENNIAL', 'TRIENNIAL', 'CUSTOM_MONTHS')),
    custom_frequency_months INTEGER,
    linked_equipment_id TEXT REFERENCES public.training_equipment(id) ON DELETE SET NULL,
    passing_score INTEGER DEFAULT 80,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
    archive_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. MULTIMODAL TRAINING RESOURCES (YouTube, SharePoint, PDF, Web)
CREATE TABLE IF NOT EXISTS public.training_resources (
    id TEXT PRIMARY KEY,
    training_id TEXT NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    resource_type TEXT NOT NULL CHECK (resource_type IN ('YOUTUBE', 'SHAREPOINT', 'PDF', 'WEB')),
    url TEXT NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. TRAINING COMPLETION RECORDS (STRICTLY APPEND-ONLY FOR AUDIT COMPLIANCE)
CREATE TABLE IF NOT EXISTS public.training_records (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL REFERENCES public.training_employees(id) ON DELETE RESTRICT,
    training_id TEXT NOT NULL REFERENCES public.training_modules(id) ON DELETE RESTRICT,
    completion_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiration_date DATE, -- Calculated automatically based on module frequency
    trainer_name TEXT NOT NULL,
    trainer_id TEXT REFERENCES public.training_employees(id) ON DELETE SET NULL,
    result TEXT NOT NULL DEFAULT 'PASS' CHECK (result IN ('PASS', 'FAIL')),
    score INTEGER,
    certificate_url TEXT,
    notes TEXT,
    recorded_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. EQUIPMENT QUALIFICATIONS (APPEND-ONLY HISTORY LOG)
CREATE TABLE IF NOT EXISTS public.training_equipment_qualifications (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL REFERENCES public.training_employees(id) ON DELETE RESTRICT,
    equipment_id TEXT NOT NULL REFERENCES public.training_equipment(id) ON DELETE RESTRICT,
    level INTEGER NOT NULL CHECK (level BETWEEN 0 AND 4), -- 0=None, 1=Trainee, 2=Qualified, 3=Expert, 4=Trainer
    level_label TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'QUALIFIED' CHECK (status IN ('QUALIFIED', 'DUE_SOON', 'EXPIRED', 'IN_TRAINING', 'NOT_TRAINED')),
    certified_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiration_date DATE NOT NULL,
    certified_by TEXT NOT NULL,
    evaluation_notes TEXT,
    checklist_answers JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. MANDATORY TRAINING REQUIREMENTS (By Role & By Equipment)
CREATE TABLE IF NOT EXISTS public.training_requirements (
    id TEXT PRIMARY KEY,
    requirement_type TEXT NOT NULL CHECK (requirement_type IN ('BY_ROLE', 'BY_EQUIPMENT')),
    target_role TEXT, -- e.g., 'OPERATOR', 'SUPERVISOR'
    target_equipment_id TEXT REFERENCES public.training_equipment(id) ON DELETE CASCADE,
    training_id TEXT NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
    is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
    grace_period_days INTEGER NOT NULL DEFAULT 30,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. SYSTEM AUDIT LOG (Immutable)
CREATE TABLE IF NOT EXISTS public.training_audit_log (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'ARCHIVE', 'RESTORE')),
    performed_by TEXT NOT NULL DEFAULT 'System',
    old_values JSONB,
    new_values JSONB,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- AUDIT & APPEND-ONLY COMPLIANCE TRIGGERS
-- ============================================================================

-- A. Generic Audit Logger Trigger Function
CREATE OR REPLACE FUNCTION public.log_training_audit()
RETURNS TRIGGER AS $$
DECLARE
    op_action TEXT;
    rec_id TEXT;
    old_json JSONB := NULL;
    new_json JSONB := NULL;
BEGIN
    IF TG_OP = 'INSERT' THEN
        op_action := 'INSERT';
        rec_id := NEW.id::TEXT;
        new_json := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        rec_id := NEW.id::TEXT;
        old_json := to_jsonb(OLD);
        new_json := to_jsonb(NEW);
        IF (OLD.status = 'ACTIVE' AND NEW.status = 'ARCHIVED') THEN
            op_action := 'ARCHIVE';
        ELSIF (OLD.status = 'ARCHIVED' AND NEW.status = 'ACTIVE') THEN
            op_action := 'RESTORE';
        ELSE
            op_action := 'UPDATE';
        END IF;
    END IF;

    INSERT INTO public.training_audit_log (
        table_name,
        record_id,
        action,
        performed_by,
        old_values,
        new_values,
        timestamp
    ) VALUES (
        TG_TABLE_NAME,
        rec_id,
        op_action,
        COALESCE(current_setting('request.jwt.claim.email', true), 'System / Service'),
        old_json,
        new_json,
        NOW()
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach Audit Trigger to mutable core tables
DROP TRIGGER IF EXISTS trg_audit_employees ON public.training_employees;
CREATE TRIGGER trg_audit_employees
AFTER INSERT OR UPDATE ON public.training_employees
FOR EACH ROW EXECUTE FUNCTION public.log_training_audit();

DROP TRIGGER IF EXISTS trg_audit_equipment ON public.training_equipment;
CREATE TRIGGER trg_audit_equipment
AFTER INSERT OR UPDATE ON public.training_equipment
FOR EACH ROW EXECUTE FUNCTION public.log_training_audit();

DROP TRIGGER IF EXISTS trg_audit_modules ON public.training_modules;
CREATE TRIGGER trg_audit_modules
AFTER INSERT OR UPDATE ON public.training_modules
FOR EACH ROW EXECUTE FUNCTION public.log_training_audit();

-- B. Append-Only Enforcers for Training Records & Qualifications
CREATE OR REPLACE FUNCTION public.enforce_append_only()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'COMPLIANCE VIOLATION: Records in % are append-only to preserve ISO 9001:2015 Clause 7.2 training integrity. Updates and deletes are forbidden.', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_append_only_training_records ON public.training_records;
CREATE TRIGGER trg_append_only_training_records
BEFORE UPDATE OR DELETE ON public.training_records
FOR EACH ROW EXECUTE FUNCTION public.enforce_append_only();

DROP TRIGGER IF EXISTS trg_append_only_qualifications ON public.training_equipment_qualifications;
CREATE TRIGGER trg_append_only_qualifications
BEFORE UPDATE OR DELETE ON public.training_equipment_qualifications
FOR EACH ROW EXECUTE FUNCTION public.enforce_append_only();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.training_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_equipment_qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_audit_log ENABLE ROW LEVEL SECURITY;

-- Allow read access for authenticated & anonymous clients (for demo/eval)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow read training_departments" ON public.training_departments;
    CREATE POLICY "Allow read training_departments" ON public.training_departments FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Allow read training_employees" ON public.training_employees;
    CREATE POLICY "Allow read training_employees" ON public.training_employees FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Allow read training_app_users" ON public.training_app_users;
    CREATE POLICY "Allow read training_app_users" ON public.training_app_users FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Allow read training_equipment" ON public.training_equipment;
    CREATE POLICY "Allow read training_equipment" ON public.training_equipment FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Allow read training_modules" ON public.training_modules;
    CREATE POLICY "Allow read training_modules" ON public.training_modules FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Allow read training_resources" ON public.training_resources;
    CREATE POLICY "Allow read training_resources" ON public.training_resources FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Allow read training_records" ON public.training_records;
    CREATE POLICY "Allow read training_records" ON public.training_records FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Allow read training_equipment_qualifications" ON public.training_equipment_qualifications;
    CREATE POLICY "Allow read training_equipment_qualifications" ON public.training_equipment_qualifications FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Allow read training_requirements" ON public.training_requirements;
    CREATE POLICY "Allow read training_requirements" ON public.training_requirements FOR SELECT USING (true);

    DROP POLICY IF EXISTS "Allow read training_audit_log" ON public.training_audit_log;
    CREATE POLICY "Allow read training_audit_log" ON public.training_audit_log FOR SELECT USING (true);

    -- Allow write access for authenticated users & anon demo
    DROP POLICY IF EXISTS "Allow write training_employees" ON public.training_employees;
    CREATE POLICY "Allow write training_employees" ON public.training_employees FOR ALL USING (true);

    DROP POLICY IF EXISTS "Allow write training_equipment" ON public.training_equipment;
    CREATE POLICY "Allow write training_equipment" ON public.training_equipment FOR ALL USING (true);

    DROP POLICY IF EXISTS "Allow write training_modules" ON public.training_modules;
    CREATE POLICY "Allow write training_modules" ON public.training_modules FOR ALL USING (true);

    DROP POLICY IF EXISTS "Allow insert training_records" ON public.training_records;
    CREATE POLICY "Allow insert training_records" ON public.training_records FOR INSERT WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow insert training_equipment_qualifications" ON public.training_equipment_qualifications;
    CREATE POLICY "Allow insert training_equipment_qualifications" ON public.training_equipment_qualifications FOR INSERT WITH CHECK (true);
END $$;

-- ============================================================================
-- INITIAL SEED DATA (10 Employees, 6 Work Centers, 8 Trainings)
-- ============================================================================

-- 1. Departments
INSERT INTO public.training_departments (id, code, name, operating_company, area) VALUES
('dept-cnc', 'CNC', 'CNC Machining & Turning', 'NHI', 'Building A - North Bay'),
('dept-stamp', 'STAMP', 'Stamping & Heavy Castings', 'TERRE', 'Building B - Press Hall'),
('dept-conv', 'CONV', 'Conveyor & Pulleys', 'MANTIS', 'Building C - Assembly Line'),
('dept-robot', 'ROBOT', 'Automation & Robotics', 'MAKERS', 'Robotics Automation Lab'),
('dept-qa', 'QA', 'Quality Assurance & Metrology', 'ALL', 'QA Inspection Center')
ON CONFLICT (id) DO NOTHING;

-- 2. Employees (10 Employees across companies)
INSERT INTO public.training_employees (id, employee_number, first_name, last_name, email, department_id, role, shift) VALUES
('emp-1015', '1015', 'Marcus', 'Vance', 'm.vance@nhimm.com', 'dept-cnc', 'OPERATOR', 'Shift 1 (Day)'),
('emp-1022', '1022', 'Sarah', 'Jenkins', 's.jenkins@nhimm.com', 'dept-cnc', 'OPERATOR', 'Shift 1 (Day)'),
('emp-1034', '1034', 'David', 'Chen', 'd.chen@nhimm.com', 'dept-stamp', 'LEAD', 'Shift 2 (Night)'),
('emp-1041', '1041', 'Elena', 'Rostova', 'e.rostova@nhimm.com', 'dept-robot', 'OPERATOR', 'Shift 1 (Day)'),
('emp-1055', '1055', 'Tom', 'Bradley', 't.bradley@nhimm.com', 'dept-conv', 'OPERATOR', 'Shift 2 (Night)'),
('emp-1068', '1068', 'Carlos', 'Mendez', 'c.mendez@nhimm.com', 'dept-stamp', 'OPERATOR', 'Shift 1 (Day)'),
('emp-1070', '1070', 'Lisa', 'Ray', 'l.ray@nhimm.com', 'dept-qa', 'QUALITY_TECH', 'Shift 1 (Day)'),
('emp-1082', '1082', 'James', 'Wilson', 'j.wilson@nhimm.com', 'dept-cnc', 'OPERATOR', 'Shift 3 (Weekend)'),
('emp-1090', '1090', 'Kevin', 'Patel', 'k.patel@nhimm.com', 'dept-robot', 'OPERATOR', 'Shift 1 (Day)'),
('emp-1002', '1002', 'Jack', 'Miller', 'j.miller@nhimm.com', 'dept-cnc', 'SUPERVISOR', 'Shift 1 (Day)')
ON CONFLICT (id) DO NOTHING;

-- Set Supervisor hierarchy
UPDATE public.training_employees SET supervisor_id = 'emp-1002' WHERE id != 'emp-1002';

-- 3. App Users & Floor PINs (Default demo PIN '1234' for everyone)
INSERT INTO public.training_app_users (id, employee_id, system_role, pin_hash) VALUES
('usr-1002', 'emp-1002', 'SUPERVISOR', '1234'),
('usr-1015', 'emp-1015', 'OPERATOR', '1234'),
('usr-1022', 'emp-1022', 'OPERATOR', '1234'),
('usr-1070', 'emp-1070', 'ADMIN', '1234')
ON CONFLICT (id) DO NOTHING;

-- 4. Equipment (6 Key Work Centers)
INSERT INTO public.training_equipment (id, code, name, department_id, location, model, serial_number) VALUES
('eq-haas-vf4', 'MC-101', 'Haas VF-4 Vertical Machining Center', 'dept-cnc', 'Cell 1 - Machining Bay', 'VF-4SS', 'HAAS-2022-8819'),
('eq-mazak-qt', 'MC-104', 'Mazak Quick Turn 250MSY Lathe', 'dept-cnc', 'Cell 2 - Turning Center', 'QT-250MSY', 'MZK-2021-4402'),
('eq-okuma-lb', 'MC-108', 'Okuma LB3000 EX II CNC Lathe', 'dept-cnc', 'Cell 3 - Turning Center', 'LB3000-EX', 'OKU-2023-9112'),
('eq-minster-200', 'PR-201', 'Minster 200-Ton Mechanical Press', 'dept-stamp', 'Press Line 1', 'Minster E2-200', 'MIN-2018-1188'),
('eq-fanuc-robot', 'RB-301', 'Fanuc M-20iD/25 Robotic Tending Cell', 'dept-robot', 'Automation Cell A', 'M-20iD/25', 'FAN-2024-5541'),
('eq-keyence-im', 'IM-401', 'Keyence IM-8000 Optical Comparator', 'dept-qa', 'Metrology Lab', 'IM-8000', 'KEY-2023-7729')
ON CONFLICT (id) DO NOTHING;

-- 5. Training Modules (8 Trainings across categories)
INSERT INTO public.training_modules (id, code, title, description, category, frequency_type, custom_frequency_months, linked_equipment_id) VALUES
('trn-loto', 'SOP-SAF-001', 'Lockout/Tagout (LOTO) & Electrical Zero Energy State', 'OSHA 1910.147 authorized worker protocol and energy isolation verification.', 'OSHA', 'ANNUAL', 12, NULL),
('trn-ppe', 'SOP-SAF-002', 'PPE & Rotating Spindle Safety Protocol', 'Mandatory shop-floor eye, foot, and hearing protection rules with strict no-gloves protocol near rotating machinery.', 'OSHA', 'ANNUAL', 12, NULL),
('trn-fai', 'SOP-QUA-010', 'Five-Piece First Article Inspection & Blueprint Sign-Off', 'ASME Y14.5 dimension verification, calibration check, and first-piece sign-off procedure.', 'QUALITY', 'ANNUAL', 12, NULL),
('trn-haas-l2', 'SOP-MAC-101', 'Haas VF-4 Level 2 Qualified Setup & Operation', 'Independent tool touch-off, work offset verification, safe part loading, and cycle execution.', 'MACHINE', 'ANNUAL', 12, 'eq-haas-vf4'),
('trn-mazak-l2', 'SOP-MAC-104', 'Mazak QT-250 Level 2 Setup & Turret Indexing', 'Live tooling alignment, collet changeover, spindle speed override, and part catcher setup.', 'MACHINE', 'ANNUAL', 12, 'eq-mazak-qt'),
('trn-okuma-l2', 'SOP-MAC-108', 'Okuma LB3000 Level 2 Turning & Chip Management', 'OSP control navigation, tool eye touch-off, safe chip clearance, and finish surface check.', 'MACHINE', 'ANNUAL', 12, 'eq-okuma-lb'),
('trn-press-safe', 'SOP-SAF-020', 'Mechanical Press Light Curtain & Dual Palm Safety', 'Point-of-operation safeguarding, stroke inspection, and emergency stop interlock verification.', 'OSHA', 'ANNUAL', 12, 'eq-minster-200'),
('trn-iso-policy', 'SOP-QMS-001', 'ISO 9001:2015 Quality Policy & Defect Quarantine SOP', 'Understanding enterprise quality objectives, MRB non-conformance containment, and root cause reporting.', 'QUALITY', 'BIENNIAL', 24, NULL)
ON CONFLICT (id) DO NOTHING;

-- 6. Multimodal Training Resources
INSERT INTO public.training_resources (id, training_id, title, resource_type, url, sort_order) VALUES
('res-1', 'trn-haas-l2', 'Haas VF-4 Work Offset & Tool Setting Video Guide', 'YOUTUBE', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 1),
('res-2', 'trn-haas-l2', 'Haas Standard Work Instruction PDF', 'PDF', '/templates/haas_vf4_standard_work.pdf', 2),
('res-3', 'trn-loto', 'NHIMM Zero Energy LOTO Procedure (SharePoint)', 'SHAREPOINT', 'https://nhimm.sharepoint.com/quality/SOP-SAF-001.pdf', 1),
('res-4', 'trn-fai', 'Metrology Tools First Article Inspection Manual', 'WEB', 'https://www.keyence.com/products/measure/measurement-systems/', 1)
ON CONFLICT (id) DO NOTHING;

-- 7. Mandatory Requirements (By Role & Equipment)
INSERT INTO public.training_requirements (id, requirement_type, target_role, target_equipment_id, training_id, is_mandatory) VALUES
('req-1', 'BY_ROLE', 'OPERATOR', NULL, 'trn-loto', TRUE),
('req-2', 'BY_ROLE', 'OPERATOR', NULL, 'trn-ppe', TRUE),
('req-3', 'BY_ROLE', 'OPERATOR', NULL, 'trn-fai', TRUE),
('req-4', 'BY_EQUIPMENT', NULL, 'eq-haas-vf4', 'trn-haas-l2', TRUE),
('req-5', 'BY_EQUIPMENT', NULL, 'eq-mazak-qt', 'trn-mazak-l2', TRUE),
('req-6', 'BY_EQUIPMENT', NULL, 'eq-okuma-lb', 'trn-okuma-l2', TRUE),
('req-7', 'BY_EQUIPMENT', NULL, 'eq-minster-200', 'trn-press-safe', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 8. Seed Historical Qualifications (for Skills Matrix & Dashboards)
INSERT INTO public.training_equipment_qualifications (id, employee_id, equipment_id, level, level_label, status, certified_date, expiration_date, certified_by, evaluation_notes) VALUES
-- Marcus Vance (Haas L3 Expert, Mazak L2, Okuma L1 Trainee, Keyence L2)
('q-1', 'emp-1015', 'eq-haas-vf4', 3, 'Level 3 (Expert / Trainer)', 'QUALIFIED', '2026-01-15', '2027-01-15', 'Jack Miller', 'Certified lead setup expert.'),
('q-2', 'emp-1015', 'eq-mazak-qt', 2, 'Level 2 (Qualified Operator)', 'QUALIFIED', '2025-11-10', '2026-11-10', 'Jack Miller', 'Standard production qualified.'),
('q-3', 'emp-1015', 'eq-okuma-lb', 1, 'Level 1 (Trainee)', 'IN_TRAINING', '2026-09-01', '2026-10-18', 'Jack Miller', 'Currently completing turning training guide.'),
('q-4', 'emp-1015', 'eq-keyence-im', 2, 'Level 2 (Qualified Operator)', 'QUALIFIED', '2026-03-12', '2027-03-12', 'Lisa Ray', 'Optical inspection certified.'),

-- Sarah Jenkins (Haas L1 -> Target of Task B, Mazak L2, Okuma L0)
('q-5', 'emp-1022', 'eq-haas-vf4', 1, 'Level 1 (Trainee)', 'IN_TRAINING', '2026-08-15', '2026-11-15', 'Jack Miller', 'Ready for supervisor sign-off.'),
('q-6', 'emp-1022', 'eq-mazak-qt', 2, 'Level 2 (Qualified Operator)', 'QUALIFIED', '2026-04-10', '2027-04-10', 'Jack Miller', 'Verified independent runner.'),

-- David Chen (Minster Press Expired -> Target of Task C)
('q-7', 'emp-1034', 'eq-minster-200', 2, 'Level 2 (Qualified Operator)', 'EXPIRED', '2025-09-20', '2026-09-20', 'Jack Miller', 'Annual recertification expired.'),
('q-8', 'emp-1034', 'eq-fanuc-robot', 3, 'Level 3 (Expert / Trainer)', 'QUALIFIED', '2026-02-14', '2027-02-14', 'Jack Miller', 'Robotics cell integrator.'),

-- Elena Rostova (Fanuc L2, Keyence L2)
('q-9', 'emp-1041', 'eq-fanuc-robot', 2, 'Level 2 (Qualified Operator)', 'QUALIFIED', '2026-05-18', '2027-05-18', 'David Chen', 'Autonomous cell attendant.'),
('q-10', 'emp-1041', 'eq-keyence-im', 2, 'Level 2 (Qualified Operator)', 'QUALIFIED', '2026-06-20', '2027-06-20', 'Lisa Ray', 'Optical first piece inspector.')
ON CONFLICT (id) DO NOTHING;

-- 9. Seed Completed Training Records
INSERT INTO public.training_records (id, employee_id, training_id, completion_date, expiration_date, trainer_name, result, score, recorded_by, notes) VALUES
('tr-1', 'emp-1015', 'trn-ppe', '2026-01-10', '2027-01-10', 'Jack Miller', 'PASS', 100, 'Jack Miller', 'Verified correct safety attire.'),
('tr-2', 'emp-1015', 'trn-fai', '2026-01-12', '2027-01-12', 'Lisa Ray', 'PASS', 95, 'Lisa Ray', 'Micrometer and caliper proficiency demonstrated.'),
('tr-3', 'emp-1022', 'trn-ppe', '2026-03-05', '2027-03-05', 'Jack Miller', 'PASS', 100, 'Jack Miller', 'Standard work reviewed.'),
('tr-4', 'emp-1034', 'trn-iso-policy', '2025-05-10', '2027-05-10', 'Quality Lead', 'PASS', 92, 'System', 'Biennial QMS compliance.')
ON CONFLICT (id) DO NOTHING;
