-- ============================================================================
-- Quality Compass // Step 2A.a: Shared User Management Core Schema
-- NHI Mechanical Motion LLC (NHIMM)
-- 
-- System: ISO 9001:2015 Clause 5.3 & Clause 7.2
-- Target Database: QMS Core Supabase (DEV Database)
--
-- Objects Created:
--   1. Extension: pgcrypto (for secure PIN hashing & verification)
--   2. Table: public.people (Master Enterprise Personnel Directory)
--   3. Table: public.user_accounts (Authentication & Kiosk PIN Credentials)
--   4. Table: public.app_modules (System Modules Catalog)
--   5. Table: public.module_roles (Role Definitions per Module)
--   6. Table: public.user_role_assignments (Person + Module + Role + Scope)
--   7. Table: public.user_management_audit_log (Immutable Security Audit Trail)
--   8. Function & Triggers: public.log_user_management_audit()
--   9. Security Functions:
--        - public.current_person_id()
--        - public.has_permission()
--        - public.verify_user_credential()
-- ============================================================================

-- Ensure pgcrypto extension is available for crypt() / gen_salt()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. MASTER ENTERPRISE PERSONNEL DIRECTORY (public.people)
-- Tracks all human personnel (including floor operators without computer logins).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_number TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE,
    job_title TEXT,
    operating_company TEXT NOT NULL DEFAULT 'NHI' CHECK (operating_company IN ('NHI', 'TERRE', 'MANTIS', 'MAKERS', 'ALL')),
    department_id TEXT NOT NULL,
    shift TEXT NOT NULL DEFAULT 'Shift 1 (Day)',
    hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
    supervisor_id UUID REFERENCES public.people(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
    archive_reason TEXT,
    archived_at TIMESTAMPTZ,
    ukg_employee_id TEXT UNIQUE,
    ukg_sync_hash TEXT,
    last_ukg_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for rapid badge and name lookups
CREATE INDEX IF NOT EXISTS idx_people_employee_number ON public.people (employee_number);
CREATE INDEX IF NOT EXISTS idx_people_company_dept ON public.people (operating_company, department_id);
CREATE INDEX IF NOT EXISTS idx_people_status ON public.people (status);

-- ----------------------------------------------------------------------------
-- 2. APPLICATION USER ACCOUNTS (public.user_accounts)
-- Created only for personnel granted system login access (Office Auth or Floor PIN).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL UNIQUE REFERENCES public.people(id) ON DELETE RESTRICT,
    auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    pin_hash TEXT, -- Stored as salted bcrypt/argon2 hash via crypt(pin, gen_salt('bf'))
    pin_must_change BOOLEAN NOT NULL DEFAULT FALSE,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    locked_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_accounts_person ON public.user_accounts (person_id);
CREATE INDEX IF NOT EXISTS idx_user_accounts_auth ON public.user_accounts (auth_user_id);
CREATE INDEX IF NOT EXISTS idx_user_accounts_active ON public.user_accounts (is_active, is_locked);

-- ----------------------------------------------------------------------------
-- 3. SYSTEM MODULES CATALOG (public.app_modules)
-- Defines the modular architecture of Quality Compass.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_modules (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.app_modules (code, name, description) VALUES
('DOCUMENT_CONTROL', 'Document Control System', 'ISO 9001:2015 Clause 7.5 3-tier document control, review routing, and PDF release governance.'),
('TRAINING', 'Training & Operator Qualification', 'ISO 9001:2015 Clause 7.2 shop-floor skills matrix, machine qualifications, and training catalog.'),
('QMS_CORE', 'QMS Executive & Audits', 'ISO 9001:2015 Clause 9.2/9.3 management reviews, internal/external audits, and 8D CAPA resolution.'),
('CAD_INSPECTION', 'CAD & First Article Inspection', 'Drawing canvas, OCR auto-ballooning, ASME/ISO GD&T audit, and 5-piece inspection plans.'),
('APQP_PPAP', 'APQP & PPAP Launch Hub', 'AIAG 18-element deliverables, PSW warrants, process flow diagrams, and run-at-rate.'),
('SYSTEM', 'System Administration', 'Enterprise configuration, user provisioning, audit inspection, and security management.')
ON CONFLICT (code) DO UPDATE SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description;

-- ----------------------------------------------------------------------------
-- 4. MODULE ROLE DEFINITIONS (public.module_roles)
-- Fixed role definitions scoped per module.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.module_roles (
    id TEXT PRIMARY KEY, -- Formatted as MODULE:ROLE_CODE (e.g. 'DOCUMENT_CONTROL:AUTHOR')
    module_code TEXT NOT NULL REFERENCES public.app_modules(code) ON DELETE CASCADE,
    role_code TEXT NOT NULL,
    role_name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(module_code, role_code)
);

INSERT INTO public.module_roles (id, module_code, role_code, role_name, description) VALUES
-- System Administration
('SYSTEM:SYSTEM_ADMIN', 'SYSTEM', 'SYSTEM_ADMIN', 'System Administrator', 'Enterprise-wide administrative bypass with full oversight across all modules.'),

-- Document Control
('DOCUMENT_CONTROL:VIEWER', 'DOCUMENT_CONTROL', 'VIEWER', 'DCS Viewer', 'View and download approved released controlled PDFs.'),
('DOCUMENT_CONTROL:AUTHOR', 'DOCUMENT_CONTROL', 'AUTHOR', 'DCS Author', 'Create working drafts, check out and check in master source files, and submit for review.'),
('DOCUMENT_CONTROL:REVIEWER', 'DOCUMENT_CONTROL', 'REVIEWER', 'DCS Reviewer', 'Review routed drafts and submit technical endorsements or rejections with comments.'),
('DOCUMENT_CONTROL:APPROVER', 'DOCUMENT_CONTROL', 'APPROVER', 'DCS Approver', 'Execute final release sign-off using electronic credentials. Self-approval strictly forbidden.'),
('DOCUMENT_CONTROL:DOCUMENT_CONTROLLER', 'DOCUMENT_CONTROL', 'DOCUMENT_CONTROLLER', 'Document Controller', 'Administrative authority to manage numbering, force check-in overrides, and declare obsolete.'),
('DOCUMENT_CONTROL:ADMIN', 'DOCUMENT_CONTROL', 'ADMIN', 'DCS Administrator', 'Configure document categories, default routing rules, and category permissions.'),

-- Training & Competency
('TRAINING:EMPLOYEE', 'TRAINING', 'EMPLOYEE', 'Operator / Worker', 'View own training dossier, standard work guides, and sign off training acknowledgments with PIN.'),
('TRAINING:SUPERVISOR', 'TRAINING', 'SUPERVISOR', 'Area Supervisor', 'View department skills matrix, endorse Level 1 and Level 2 machine qualifications, reset floor PINs.'),
('TRAINING:TRAINER', 'TRAINING', 'TRAINER', 'Certified Trainer (L3)', 'Certified expert authorized to instruct and sign off operators for Level 3 (Trainer).'),
('TRAINING:HR', 'TRAINING', 'HR', 'HR Specialist', 'Manage personnel records, update shifts, assign role-based onboarding packages, soft-archive personnel.'),
('TRAINING:MANAGER', 'TRAINING', 'MANAGER', 'Department / Plant Manager', 'Cross-department skills matrix visibility, compliance auditing, and gap analysis.'),
('TRAINING:ADMIN', 'TRAINING', 'ADMIN', 'Training Administrator', 'Manage work centers, equipment, training catalog, recertification intervals, and backup ZIPs.'),

-- QMS Core & Audits
('QMS_CORE:VIEWER', 'QMS_CORE', 'VIEWER', 'QMS Viewer', 'Read-only access to executive quality dashboard, PPM charts, and published reviews.'),
('QMS_CORE:AUDITOR', 'QMS_CORE', 'AUDITOR', 'Quality Auditor', 'Conduct internal audits, record non-conformances, and verify audit findings.'),
('QMS_CORE:QUALITY_TECH', 'QMS_CORE', 'QUALITY_TECH', 'Quality Technician', 'Log non-conformances, advance 8D CAPA steps, and capture defect telemetry.'),
('QMS_CORE:QA_MANAGER', 'QMS_CORE', 'QA_MANAGER', 'QA Manager', 'Direct management review meetings, close major CAPAs, and assign executive actions.'),
('QMS_CORE:EXECUTIVE', 'QMS_CORE', 'EXECUTIVE', 'Executive Leader', 'Review enterprise quality goals, evaluate management review inputs, and allocate resources.'),
('QMS_CORE:ADMIN', 'QMS_CORE', 'ADMIN', 'QMS Administrator', 'Configure QMS clauses, audit templates, and CAPA categories.'),

-- CAD & First Article Inspection
('CAD_INSPECTION:VIEWER', 'CAD_INSPECTION', 'VIEWER', 'CAD Viewer', 'View drawing blueprints, dimension callouts, and inspection plans.'),
('CAD_INSPECTION:INSPECTOR', 'CAD_INSPECTION', 'INSPECTOR', 'Quality Inspector', 'Create auto-balloons, record 5-sample measurements, and select gage tooling.'),
('CAD_INSPECTION:APPROVER', 'CAD_INSPECTION', 'APPROVER', 'Metrology Approver', 'Execute China QC approval and engineering title-block sign-offs.'),
('CAD_INSPECTION:ADMIN', 'CAD_INSPECTION', 'ADMIN', 'Metrology Admin', 'Train part family profiles, customize OCR rules, and manage gage databases.'),

-- APQP & PPAP Launch Hub
('APQP_PPAP:VIEWER', 'APQP_PPAP', 'VIEWER', 'APQP Viewer', 'View launch projects, milestone phases, and PPAP submission statuses.'),
('APQP_PPAP:ENGINEER', 'APQP_PPAP', 'ENGINEER', 'Launch Engineer', 'Advance APQP phases 1-5, complete 18 AIAG deliverables, upload control plans and FMEAs.'),
('APQP_PPAP:APPROVER', 'APQP_PPAP', 'APPROVER', 'PSW Approver', 'Execute Part Submission Warrant sign-offs and customer interim approvals.'),
('APQP_PPAP:ADMIN', 'APQP_PPAP', 'ADMIN', 'APQP Administrator', 'Configure launch phase gates and submission level requirements.')
ON CONFLICT (id) DO UPDATE SET 
    role_name = EXCLUDED.role_name,
    description = EXCLUDED.description;

-- ----------------------------------------------------------------------------
-- 5. MODULAR USER ROLE ASSIGNMENTS (public.user_role_assignments)
-- Maps a person to a role within a module, with optional scoping.
-- Uses ON DELETE RESTRICT on all foreign keys to guarantee historical integrity.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_role_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE RESTRICT,
    module_code TEXT NOT NULL REFERENCES public.app_modules(code) ON DELETE RESTRICT,
    role_code TEXT NOT NULL,
    scope_department TEXT, -- If set, role applies only within this department code.
    scope_doc_type TEXT,   -- If set, role applies only to this document category (e.g. 'SOP').
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,         -- Nullable; if set, role expires after this date.
    assigned_by UUID REFERENCES public.people(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (module_code, role_code) REFERENCES public.module_roles(module_code, role_code) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_ura_person_module ON public.user_role_assignments (person_id, module_code);
CREATE INDEX IF NOT EXISTS idx_ura_scope ON public.user_role_assignments (module_code, role_code, scope_department);

-- ----------------------------------------------------------------------------
-- 6. IMMUTABLE SECURITY AUDIT TRAIL (public.user_management_audit_log)
-- Captures all insertions, updates, archive events, role grants, and lockouts.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_management_audit_log (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'ARCHIVE', 'RESTORE', 'LOCK', 'UNLOCK', 'PIN_RESET', 'ROLE_GRANT', 'ROLE_REVOKE')),
    performed_by TEXT NOT NULL DEFAULT 'System',
    old_values JSONB,
    new_values JSONB,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uma_table_record ON public.user_management_audit_log (table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_uma_timestamp ON public.user_management_audit_log (timestamp DESC);

-- ----------------------------------------------------------------------------
-- 7. AUDIT TRIGGER FUNCTION & TRIGGERS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_user_management_audit()
RETURNS TRIGGER AS $$
DECLARE
    op_action TEXT;
    rec_id TEXT;
    old_json JSONB := NULL;
    new_json JSONB := NULL;
    caller_info TEXT;
BEGIN
    caller_info := COALESCE(
        current_setting('request.jwt.claim.email', true),
        current_setting('request.jwt.claim.sub', true),
        'System'
    );

    IF TG_OP = 'INSERT' THEN
        op_action := 'INSERT';
        rec_id := NEW.id::TEXT;
        new_json := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        op_action := 'DELETE';
        rec_id := OLD.id::TEXT;
        old_json := to_jsonb(OLD);
    ELSIF TG_OP = 'UPDATE' THEN
        rec_id := NEW.id::TEXT;
        old_json := to_jsonb(OLD);
        new_json := to_jsonb(NEW);

        -- Detect specific business transitions
        IF TG_TABLE_NAME = 'people' THEN
            IF (OLD.status = 'ACTIVE' AND NEW.status = 'ARCHIVED') THEN
                op_action := 'ARCHIVE';
            ELSIF (OLD.status = 'ARCHIVED' AND NEW.status = 'ACTIVE') THEN
                op_action := 'RESTORE';
            ELSE
                op_action := 'UPDATE';
            END IF;
        ELSIF TG_TABLE_NAME = 'user_accounts' THEN
            IF (OLD.is_locked = FALSE AND NEW.is_locked = TRUE) THEN
                op_action := 'LOCK';
            ELSIF (OLD.is_locked = TRUE AND NEW.is_locked = FALSE) THEN
                op_action := 'UNLOCK';
            ELSIF (OLD.pin_hash IS DISTINCT FROM NEW.pin_hash) THEN
                op_action := 'PIN_RESET';
            ELSE
                op_action := 'UPDATE';
            END IF;
        ELSE
            op_action := 'UPDATE';
        END IF;
    END IF;

    INSERT INTO public.user_management_audit_log (
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
        caller_info,
        old_json,
        new_json,
        NOW()
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp;

-- Attach triggers
DROP TRIGGER IF EXISTS trg_audit_people ON public.people;
CREATE TRIGGER trg_audit_people
AFTER INSERT OR UPDATE OR DELETE ON public.people
FOR EACH ROW EXECUTE FUNCTION public.log_user_management_audit();

DROP TRIGGER IF EXISTS trg_audit_user_accounts ON public.user_accounts;
CREATE TRIGGER trg_audit_user_accounts
AFTER INSERT OR UPDATE OR DELETE ON public.user_accounts
FOR EACH ROW EXECUTE FUNCTION public.log_user_management_audit();

DROP TRIGGER IF EXISTS trg_audit_role_assignments ON public.user_role_assignments;
CREATE TRIGGER trg_audit_role_assignments
AFTER INSERT OR UPDATE OR DELETE ON public.user_role_assignments
FOR EACH ROW EXECUTE FUNCTION public.log_user_management_audit();

-- ----------------------------------------------------------------------------
-- 8. CORE SECURITY DEFINER HELPER FUNCTIONS
-- All functions include hardened search paths to prevent schema injection.
-- ----------------------------------------------------------------------------

-- Helper A: Resolve current authenticated user to their person_id
CREATE OR REPLACE FUNCTION public.current_person_id()
RETURNS UUID AS $$
  SELECT person_id 
  FROM public.user_accounts 
  WHERE auth_user_id = auth.uid() 
    AND is_active = TRUE
    AND is_locked = FALSE
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

-- Helper B: Check caller permission with module-scoped admin and scoping
CREATE OR REPLACE FUNCTION public.has_permission(
  p_module_code TEXT,
  p_required_role TEXT,
  p_department TEXT DEFAULT NULL,
  p_doc_type TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_person_id UUID;
BEGIN
  v_person_id := public.current_person_id();
  IF v_person_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- 1. Check for enterprise-wide SYSTEM_ADMIN or Module-Scoped ADMIN
  IF EXISTS (
    SELECT 1 FROM public.user_role_assignments ura
    WHERE ura.person_id = v_person_id
      AND (
        ura.role_code = 'SYSTEM_ADMIN'
        OR (ura.module_code = p_module_code AND ura.role_code = 'ADMIN')
      )
      AND (ura.end_date IS NULL OR ura.end_date >= CURRENT_DATE)
  ) THEN
    RETURN TRUE;
  END IF;

  -- 2. Check specific modular role and scope
  RETURN EXISTS (
    SELECT 1 FROM public.user_role_assignments ura
    WHERE ura.person_id = v_person_id
      AND ura.module_code = p_module_code
      AND ura.role_code = p_required_role
      AND (ura.scope_department IS NULL OR ura.scope_department = p_department)
      AND (ura.scope_doc_type IS NULL OR ura.scope_doc_type = p_doc_type)
      AND (ura.start_date <= CURRENT_DATE)
      AND (ura.end_date IS NULL OR ura.end_date >= CURRENT_DATE)
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;

-- Helper C: Verify user credential for re-authenticated electronic signatures
CREATE OR REPLACE FUNCTION public.verify_user_credential(
  p_person_id UUID,
  p_auth_method TEXT,
  p_credential TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_pin_hash TEXT;
  v_is_locked BOOLEAN;
  v_is_active BOOLEAN;
BEGIN
  IF p_person_id IS NULL OR p_credential IS NULL OR p_credential = '' THEN
    RETURN FALSE;
  END IF;

  SELECT pin_hash, is_locked, is_active
  INTO v_pin_hash, v_is_locked, v_is_active
  FROM public.user_accounts
  WHERE person_id = p_person_id;

  IF NOT FOUND OR v_is_active = FALSE OR v_is_locked = TRUE THEN
    RETURN FALSE;
  END IF;

  -- Floor PIN re-authentication
  IF p_auth_method = 'PIN' THEN
    IF v_pin_hash IS NULL THEN
      RETURN FALSE;
    END IF;
    -- Verify using pgcrypto crypt() against stored salt/hash
    RETURN (crypt(p_credential, v_pin_hash) = v_pin_hash);
  END IF;

  -- Office Password re-authentication:
  -- When using Supabase Auth JWT, the caller is already authenticated via auth.uid().
  -- In client flows, the client re-authenticates against Supabase Auth API before invoking the function.
  IF p_auth_method = 'PASSWORD' THEN
    RETURN (public.current_person_id() = p_person_id);
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp;
