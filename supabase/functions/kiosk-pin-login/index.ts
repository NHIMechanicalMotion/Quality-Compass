// ============================================================================
// Quality Compass: Floor Kiosk PIN Authentication Edge Function
// Path: supabase/functions/kiosk-pin-login/index.ts
//
// Mints authentic Supabase Auth sessions for shop-floor operators logging
// in with Badge Number + 4-digit PIN on shared kiosk terminals.
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request) => {
  // 1. Handle CORS Pre-Flight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { badge_number, pin, device_id } = await req.json();

    if (!badge_number || !pin) {
      return new Response(
        JSON.stringify({ error: 'Badge number and 4-digit PIN are required', code: 'MISSING_FIELDS' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Extract Client IP Address
    const clientIp =
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      device_id ||
      'unknown-ip';

    // 3. Connect to Supabase with Service Role
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Server configuration error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing');
      return new Response(
        JSON.stringify({ error: 'Authentication service configuration error', code: 'SERVER_CONFIG_ERROR' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 4. Verify Credentials & Enforce Lockout / Rate Limits via PostgreSQL RPC
    const { data: verifyResult, error: rpcError } = await supabaseAdmin.rpc('kiosk_pin_login', {
      p_ip: clientIp,
      p_badge: String(badge_number).trim(),
      p_pin: String(pin).trim(),
    });

    if (rpcError) {
      console.error('kiosk_pin_login RPC error:', rpcError);
      return new Response(
        JSON.stringify({ error: 'Database authentication verification failed', details: rpcError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Handle Verification Status Responses
    if (verifyResult.status === 'RATE_LIMITED') {
      return new Response(
        JSON.stringify({ error: verifyResult.message, code: 'RATE_LIMITED' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (verifyResult.status === 'LOCKED') {
      return new Response(
        JSON.stringify({ error: verifyResult.message, code: 'ACCOUNT_LOCKED' }),
        { status: 423, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (verifyResult.status === 'DEACTIVATED') {
      return new Response(
        JSON.stringify({ error: verifyResult.message, code: 'ACCOUNT_DEACTIVATED' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (verifyResult.status !== 'OK') {
      return new Response(
        JSON.stringify({ error: verifyResult.message || 'Invalid Badge Number or PIN.', code: 'INVALID_CREDENTIALS' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. User Verified! Mint authentic GoTrue Session using Admin API
    const targetEmail =
      verifyResult.email ||
      verifyResult.synthetic_email ||
      `badge.${String(badge_number).trim().toLowerCase()}@kiosk.nhimm.internal`;

    let linkData;
    let linkError;

    // Generate magiclink token
    const genResult = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: targetEmail,
    });

    linkData = genResult.data;
    linkError = genResult.error;

    // If user record does not exist yet in auth.users, provision it automatically
    if (linkError && (linkError.message?.toLowerCase().includes('not found') || linkError.status === 404)) {
      const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: targetEmail,
        email_confirm: true,
        user_metadata: {
          person_id: verifyResult.person_id,
          employee_number: verifyResult.employee_number,
          first_name: verifyResult.first_name,
          last_name: verifyResult.last_name,
          is_kiosk_user: true,
        },
      });

      if (createError) {
        console.error('Failed to create auth.users entry for kiosk worker:', createError);
        return new Response(
          JSON.stringify({ error: 'Failed to provision kiosk authentication session', code: 'USER_PROVISION_FAILED' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Link newly created auth user to user_accounts record
      await supabaseAdmin
        .from('user_accounts')
        .update({ auth_user_id: createdUser.user.id })
        .eq('person_id', verifyResult.person_id);

      // Retry generateLink
      const retryResult = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: targetEmail,
      });
      linkData = retryResult.data;
      linkError = retryResult.error;
    }

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error('Failed to generate session link token:', linkError);
      return new Response(
        JSON.stringify({ error: 'Failed to mint kiosk security token', details: linkError?.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Exchange hashed_token for genuine Supabase Access & Refresh Tokens
    const { data: otpData, error: otpError } = await supabaseAdmin.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: 'magiclink',
    });

    if (otpError || !otpData.session) {
      console.error('Failed to exchange magiclink token for session:', otpError);
      return new Response(
        JSON.stringify({ error: 'Session exchange verification failed', details: otpError?.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 8. Ensure user_accounts.auth_user_id is in sync
    if (!verifyResult.auth_user_id && otpData.user) {
      await supabaseAdmin
        .from('user_accounts')
        .update({ auth_user_id: otpData.user.id })
        .eq('person_id', verifyResult.person_id);
    }

    // 9. Return Real Session, User Profile, and Forced PIN Change status
    return new Response(
      JSON.stringify({
        session: otpData.session,
        user: otpData.user,
        person: {
          id: verifyResult.person_id,
          employee_number: verifyResult.employee_number,
          first_name: verifyResult.first_name,
          last_name: verifyResult.last_name,
          job_title: verifyResult.job_title,
          operating_company: verifyResult.operating_company,
        },
        pin_must_change: verifyResult.pin_must_change === true,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Unexpected error in kiosk-pin-login function:', err);
    return new Response(
      JSON.stringify({ error: 'Unexpected server error', details: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
