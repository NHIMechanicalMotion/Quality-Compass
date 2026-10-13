-- ============================================================================
-- Quality Compass: Step 2A.b - Kiosk Authentication & PIN Management Support
-- Migration: 20261013_kiosk_auth_support.sql
-- ============================================================================

-- Ensure pgcrypto extension is available
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ----------------------------------------------------------------------------
-- 1. Kiosk Login Attempts Table (Device & IP-Level Rate Limiting)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kiosk_login_attempts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ip_address TEXT NOT NULL,
  badge_number TEXT,
  success BOOLEAN NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kiosk_attempts_ip_time 
  ON public.kiosk_login_attempts (ip_address, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_kiosk_attempts_badge_time 
  ON public.kiosk_login_attempts (badge_number, attempted_at DESC);

ALTER TABLE public.kiosk_login_attempts ENABLE ROW LEVEL SECURITY;

-- Block direct anon reading/writing on attempts table; access only through security definer functions
DROP POLICY IF EXISTS "Service role manages kiosk login attempts" ON public.kiosk_login_attempts;
CREATE POLICY "Service role manages kiosk login attempts"
  ON public.kiosk_login_attempts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 2. Floor Kiosk PIN Verification Function
-- Atomic handling of IP rate limiting (10 fails / 15 min),
-- Account lockout (5 consecutive fails), PIN bcrypt check, and credential state.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.kiosk_pin_login(
  p_ip TEXT,
  p_badge TEXT,
  p_pin TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_ip_fails INT;
  v_rec RECORD;
  v_clean_badge TEXT;
BEGIN
  v_clean_badge := TRIM(p_badge);

  -- 1. Check IP-Level Rate Limiting (Max 10 failed attempts from this IP within 15 minutes)
  SELECT COUNT(*) INTO v_ip_fails
  FROM public.kiosk_login_attempts
  WHERE ip_address = p_ip
    AND success = FALSE
    AND attempted_at > NOW() - INTERVAL '15 minutes';

  IF v_ip_fails >= 10 THEN
    INSERT INTO public.kiosk_login_attempts (ip_address, badge_number, success)
    VALUES (p_ip, v_clean_badge, FALSE);

    RETURN jsonb_build_object(
      'status', 'RATE_LIMITED',
      'message', 'Too many failed login attempts from this kiosk device. Access throttled for 15 minutes.'
    );
  END IF;

  -- 2. Locate Person and User Account by Badge / Employee Number
  SELECT 
    p.id,
    p.employee_number,
    p.first_name,
    p.last_name,
    p.job_title,
    p.operating_company,
    p.email,
    p.status AS person_status,
    ua.id AS account_id,
    ua.auth_user_id,
    ua.pin_hash,
    ua.pin_must_change,
    ua.failed_attempts,
    ua.is_locked,
    ua.is_active AS account_is_active
  INTO v_rec
  FROM public.people p
  LEFT JOIN public.user_accounts ua ON ua.person_id = p.id
  WHERE LOWER(TRIM(p.employee_number)) = LOWER(v_clean_badge);

  -- If person or account not found
  IF NOT FOUND OR v_rec.account_id IS NULL THEN
    INSERT INTO public.kiosk_login_attempts (ip_address, badge_number, success)
    VALUES (p_ip, v_clean_badge, FALSE);

    RETURN jsonb_build_object(
      'status', 'INVALID',
      'message', 'Invalid Badge Number or PIN.'
    );
  END IF;

  -- 3. Check Account Active State
  IF NOT v_rec.account_is_active OR v_rec.person_status = 'ARCHIVED' THEN
    INSERT INTO public.kiosk_login_attempts (ip_address, badge_number, success)
    VALUES (p_ip, v_clean_badge, FALSE);

    RETURN jsonb_build_object(
      'status', 'DEACTIVATED',
      'message', 'This user account is inactive or archived. Contact HR or Quality Administrator.'
    );
  END IF;

  -- 4. Check Account Lockout State (Already locked)
  IF v_rec.is_locked THEN
    INSERT INTO public.kiosk_login_attempts (ip_address, badge_number, success)
    VALUES (p_ip, v_clean_badge, FALSE);

    RETURN jsonb_build_object(
      'status', 'LOCKED',
      'message', 'Account is locked out due to multiple failed login attempts. Contact your Area Supervisor or HR to unlock.'
    );
  END IF;

  -- 5. Verify PIN using bcrypt
  IF v_rec.pin_hash IS NULL OR extensions.crypt(p_pin, v_rec.pin_hash) != v_rec.pin_hash THEN
    -- Increment failed attempts counter and lock if reached 5
    UPDATE public.user_accounts
    SET failed_attempts = failed_attempts + 1,
        is_locked = CASE WHEN failed_attempts + 1 >= 5 THEN TRUE ELSE FALSE END,
        locked_at = CASE WHEN failed_attempts + 1 >= 5 THEN NOW() ELSE NULL END
    WHERE id = v_rec.account_id;

    INSERT INTO public.kiosk_login_attempts (ip_address, badge_number, success)
    VALUES (p_ip, v_clean_badge, FALSE);

    IF v_rec.failed_attempts + 1 >= 5 THEN
      RETURN jsonb_build_object(
        'status', 'LOCKED',
        'message', 'Account locked out after 5 consecutive failed attempts. Contact your Area Supervisor or HR to unlock.'
      );
    ELSE
      RETURN jsonb_build_object(
        'status', 'INVALID',
        'message', format('Invalid Badge Number or PIN. Attempt %s of 5 before lockout.', v_rec.failed_attempts + 1)
      );
    END IF;
  END IF;

  -- 6. Successful Authentication: Reset failed attempts counter and update last login
  UPDATE public.user_accounts
  SET failed_attempts = 0,
      last_login_at = NOW()
  WHERE id = v_rec.account_id;

  INSERT INTO public.kiosk_login_attempts (ip_address, badge_number, success)
  VALUES (p_ip, v_clean_badge, TRUE);

  RETURN jsonb_build_object(
    'status', 'OK',
    'person_id', v_rec.id,
    'employee_number', v_rec.employee_number,
    'first_name', v_rec.first_name,
    'last_name', v_rec.last_name,
    'job_title', COALESCE(v_rec.job_title, 'Operator'),
    'operating_company', v_rec.operating_company,
    'email', v_rec.email,
    'synthetic_email', 'badge.' || LOWER(TRIM(v_rec.employee_number)) || '@kiosk.nhimm.internal',
    'pin_must_change', v_rec.pin_must_change,
    'auth_user_id', v_rec.auth_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp;

-- ----------------------------------------------------------------------------
-- 3. Forced / Self PIN Change Function
-- Enforces 4 digits, rejects common patterns, clears pin_must_change
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.change_user_pin(
  p_person_id UUID,
  p_old_pin TEXT,
  p_new_pin TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_rec RECORD;
  v_clean_new TEXT;
BEGIN
  v_clean_new := TRIM(p_new_pin);

  -- Validate 4-digit requirement
  IF v_clean_new !~ '^[0-9]{4}$' THEN
    RETURN jsonb_build_object('success', false, 'message', 'PIN must be exactly 4 numeric digits.');
  END IF;

  -- Reject trivial / easily guessable PINs
  IF v_clean_new IN ('0000', '1234', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '4321', '0123', '9876') THEN
    RETURN jsonb_build_object('success', false, 'message', 'This PIN is too common or easily guessable. Please choose a more secure 4-digit PIN.');
  END IF;

  -- Fetch user account
  SELECT ua.id, ua.pin_hash, ua.pin_must_change, p.employee_number
  INTO v_rec
  FROM public.user_accounts ua
  JOIN public.people p ON ua.person_id = p.id
  WHERE ua.person_id = p_person_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'User account not found.');
  END IF;

  -- Reject PIN that matches badge number
  IF v_clean_new = v_rec.employee_number THEN
    RETURN jsonb_build_object('success', false, 'message', 'PIN cannot match your employee badge number.');
  END IF;

  -- Verify old PIN if one was already set
  IF v_rec.pin_hash IS NOT NULL AND p_old_pin IS NOT NULL AND TRIM(p_old_pin) != '' THEN
    IF extensions.crypt(TRIM(p_old_pin), v_rec.pin_hash) != v_rec.pin_hash THEN
      RETURN jsonb_build_object('success', false, 'message', 'Current PIN is incorrect.');
    END IF;
  END IF;

  -- Update PIN and clear pin_must_change
  -- Note: The trigger trg_audit_user_accounts automatically records the PIN_RESET in user_management_audit_log
  UPDATE public.user_accounts
  SET pin_hash = extensions.crypt(v_clean_new, extensions.gen_salt('bf', 10)),
      pin_must_change = FALSE,
      failed_attempts = 0,
      is_locked = FALSE
  WHERE id = v_rec.id;

  RETURN jsonb_build_object('success', true, 'message', 'PIN updated successfully.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp;

-- ----------------------------------------------------------------------------
-- 4. Supervisor / HR PIN Reset Function
-- Generates or sets temporary PIN, forces pin_must_change = TRUE, unlocks account
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reset_user_pin(
  p_target_person_id UUID,
  p_temporary_pin TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_clean_temp TEXT;
  v_account_id UUID;
BEGIN
  v_clean_temp := TRIM(p_temporary_pin);

  IF v_clean_temp !~ '^[0-9]{4}$' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Temporary PIN must be exactly 4 numeric digits.');
  END IF;

  SELECT id INTO v_account_id
  FROM public.user_accounts
  WHERE person_id = p_target_person_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Target user account not found.');
  END IF;

  -- Note: The trigger trg_audit_user_accounts automatically records the PIN_RESET in user_management_audit_log
  UPDATE public.user_accounts
  SET pin_hash = extensions.crypt(v_clean_temp, extensions.gen_salt('bf', 10)),
      pin_must_change = TRUE,
      failed_attempts = 0,
      is_locked = FALSE,
      locked_at = NULL
  WHERE id = v_account_id;

  RETURN jsonb_build_object('success', true, 'message', 'Temporary PIN assigned. User will be forced to change PIN on next login.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp;

-- ----------------------------------------------------------------------------
-- 5. Unlock User Account Function
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.unlock_user_account(
  p_target_person_id UUID
)
RETURNS JSONB AS $$
BEGIN
  -- Note: The trigger trg_audit_user_accounts automatically records the UNLOCK in user_management_audit_log
  UPDATE public.user_accounts
  SET is_locked = FALSE,
      failed_attempts = 0,
      locked_at = NULL
  WHERE person_id = p_target_person_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Target user account not found.');
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Account unlocked successfully.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp;

-- ----------------------------------------------------------------------------
-- 6. Execution Grants
-- ----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.kiosk_pin_login(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.change_user_pin(UUID, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reset_user_pin(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.unlock_user_account(UUID) TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 7. Verification Test User (For Step 2A.b Testing)
-- Provisions Marcus Vance (Badge #1015) with temporary PIN '4829' (pin_must_change = TRUE)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_person_id UUID;
BEGIN
  -- Insert or update Marcus Vance
  INSERT INTO public.people (
    employee_number,
    first_name,
    last_name,
    job_title,
    operating_company,
    department_id,
    shift,
    status
  ) VALUES (
    '1015',
    'Marcus',
    'Vance',
    'CNC Machinist L2',
    'NHI',
    'CNC Machining & Turning',
    'Shift 1 (Day)',
    'ACTIVE'
  )
  ON CONFLICT (employee_number) DO UPDATE
    SET first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        job_title = EXCLUDED.job_title,
        department_id = EXCLUDED.department_id,
        shift = EXCLUDED.shift,
        status = 'ACTIVE'
  RETURNING id INTO v_person_id;

  -- Create or update user account with temporary PIN '4829'
  INSERT INTO public.user_accounts (
    person_id,
    pin_hash,
    pin_must_change,
    failed_attempts,
    is_locked,
    is_active
  ) VALUES (
    v_person_id,
    extensions.crypt('4829', extensions.gen_salt('bf', 10)),
    TRUE,
    0,
    FALSE,
    TRUE
  )
  ON CONFLICT (person_id) DO UPDATE
    SET pin_hash = extensions.crypt('4829', extensions.gen_salt('bf', 10)),
        pin_must_change = TRUE,
        failed_attempts = 0,
        is_locked = FALSE,
        is_active = TRUE;
END $$;

-- Reload PostgREST schema cache so new functions and tables are immediately recognized
NOTIFY pgrst, 'reload schema';
