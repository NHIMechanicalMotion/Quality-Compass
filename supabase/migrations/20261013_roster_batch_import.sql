-- ============================================================================
-- Quality Compass // Step 2A.c: Enterprise Personnel Roster Batch Provisioning
-- Path: supabase/migrations/20261013_roster_batch_import.sql
--
-- Provides atomic batch importing of personnel rosters with automatic
-- user account creation, pgcrypto PIN hashing, and default role assignment.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.provision_roster_batch(
  p_employees JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_item JSONB;
  v_emp_no TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
  v_email TEXT;
  v_job_title TEXT;
  v_company TEXT;
  v_dept TEXT;
  v_shift TEXT;
  v_hire_date DATE;
  v_temp_pin TEXT;
  v_reset_pin BOOLEAN;
  
  v_person_id UUID;
  v_existing_acc_id UUID;
  v_action TEXT;
  v_assigned_pin TEXT;
  v_results JSONB := '[]'::JSONB;
  v_row_result JSONB;
BEGIN
  -- Iterate through JSON array of employee records
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_employees)
  LOOP
    BEGIN
      v_emp_no := TRIM(v_item->>'employee_number');
      v_first_name := TRIM(v_item->>'first_name');
      v_last_name := TRIM(v_item->>'last_name');
      v_email := NULLIF(TRIM(v_item->>'email'), '');
      v_job_title := NULLIF(TRIM(v_item->>'job_title'), '');
      v_company := COALESCE(NULLIF(UPPER(TRIM(v_item->>'operating_company')), ''), 'NHI');
      v_dept := COALESCE(NULLIF(TRIM(v_item->>'department_id'), ''), 'General Operations');
      v_shift := COALESCE(NULLIF(TRIM(v_item->>'shift'), ''), 'Shift 1 (Day)');
      v_hire_date := COALESCE((v_item->>'hire_date')::DATE, CURRENT_DATE);
      v_temp_pin := TRIM(v_item->>'temp_pin');
      v_reset_pin := COALESCE((v_item->>'reset_existing_pin')::BOOLEAN, FALSE);
      v_assigned_pin := NULL;

      -- Validate company constraint
      IF v_company NOT IN ('NHI', 'TERRE', 'MANTIS', 'MAKERS', 'ALL') THEN
        v_company := 'NHI';
      END IF;

      -- Check if person already exists by employee_number
      SELECT id INTO v_person_id
      FROM public.people
      WHERE employee_number = v_emp_no;

      IF v_person_id IS NULL THEN
        -- 1. Insert new person
        INSERT INTO public.people (
          employee_number,
          first_name,
          last_name,
          email,
          job_title,
          operating_company,
          department_id,
          shift,
          hire_date,
          status
        ) VALUES (
          v_emp_no,
          v_first_name,
          v_last_name,
          v_email,
          v_job_title,
          v_company,
          v_dept,
          v_shift,
          v_hire_date,
          'ACTIVE'
        )
        RETURNING id INTO v_person_id;

        v_action := 'INSERTED';

        -- Provision user account with temporary PIN
        IF v_temp_pin IS NOT NULL AND v_temp_pin ~ '^[0-9]{4}$' THEN
          INSERT INTO public.user_accounts (
            person_id,
            pin_hash,
            pin_must_change,
            failed_attempts,
            is_locked,
            is_active
          ) VALUES (
            v_person_id,
            extensions.crypt(v_temp_pin, extensions.gen_salt('bf', 10)),
            TRUE,
            0,
            FALSE,
            TRUE
          );
          v_assigned_pin := v_temp_pin;
        END IF;

        -- Assign default Shop Training role (EMPLOYEE)
        INSERT INTO public.user_role_assignments (
          person_id,
          module_code,
          role_code,
          start_date
        ) VALUES (
          v_person_id,
          'TRAINING',
          'EMPLOYEE',
          CURRENT_DATE
        )
        ON CONFLICT DO NOTHING;

      ELSE
        -- 2. Update existing person profile
        UPDATE public.people
        SET first_name = v_first_name,
            last_name = v_last_name,
            email = COALESCE(v_email, email),
            job_title = COALESCE(v_job_title, job_title),
            operating_company = v_company,
            department_id = v_dept,
            shift = v_shift,
            hire_date = v_hire_date,
            status = 'ACTIVE',
            updated_at = NOW()
        WHERE id = v_person_id;

        v_action := 'UPDATED';

        -- Check user_accounts
        SELECT id INTO v_existing_acc_id
        FROM public.user_accounts
        WHERE person_id = v_person_id;

        IF v_existing_acc_id IS NULL THEN
          -- Provision account for existing person if none existed
          IF v_temp_pin IS NOT NULL AND v_temp_pin ~ '^[0-9]{4}$' THEN
            INSERT INTO public.user_accounts (
              person_id,
              pin_hash,
              pin_must_change,
              failed_attempts,
              is_locked,
              is_active
            ) VALUES (
              v_person_id,
              extensions.crypt(v_temp_pin, extensions.gen_salt('bf', 10)),
              TRUE,
              0,
              FALSE,
              TRUE
            );
            v_assigned_pin := v_temp_pin;
          END IF;
        ELSIF v_reset_pin = TRUE AND v_temp_pin IS NOT NULL AND v_temp_pin ~ '^[0-9]{4}$' THEN
          -- Reset PIN if explicitly requested
          UPDATE public.user_accounts
          SET pin_hash = extensions.crypt(v_temp_pin, extensions.gen_salt('bf', 10)),
              pin_must_change = TRUE,
              failed_attempts = 0,
              is_locked = FALSE,
              is_active = TRUE,
              updated_at = NOW()
          WHERE id = v_existing_acc_id;
          v_assigned_pin := v_temp_pin;
        END IF;

      END IF;

      -- Build success row
      v_row_result := jsonb_build_object(
        'employee_number', v_emp_no,
        'first_name', v_first_name,
        'last_name', v_last_name,
        'job_title', v_job_title,
        'operating_company', v_company,
        'department_id', v_dept,
        'shift', v_shift,
        'status', 'SUCCESS',
        'action', v_action,
        'temp_pin', v_assigned_pin
      );
      v_results := v_results || jsonb_build_array(v_row_result);

    EXCEPTION WHEN OTHERS THEN
      -- Record failure for this specific row without failing the entire batch
      v_row_result := jsonb_build_object(
        'employee_number', v_emp_no,
        'first_name', v_first_name,
        'last_name', v_last_name,
        'status', 'ERROR',
        'action', 'FAILED',
        'error_message', SQLERRM
      );
      v_results := v_results || jsonb_build_array(v_row_result);
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'total_processed', jsonb_array_length(p_employees),
    'results', v_results
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions, pg_temp;

-- Execution grant
GRANT EXECUTE ON FUNCTION public.provision_roster_batch(JSONB) TO anon, authenticated, service_role;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
