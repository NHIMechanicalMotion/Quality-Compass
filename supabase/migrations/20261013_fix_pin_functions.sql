-- ============================================================================
-- Fix: Hotfix for change_user_pin, reset_user_pin, unlock_user_account
-- Removes manual insert to user_management_audit_log because trg_audit_user_accounts
-- already logs PIN_RESET and UNLOCK automatically with correct schema.
-- ============================================================================

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

GRANT EXECUTE ON FUNCTION public.change_user_pin(UUID, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reset_user_pin(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.unlock_user_account(UUID) TO authenticated, service_role;
