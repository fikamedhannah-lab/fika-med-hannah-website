/* =========================================================
   Fika med Hannah — Planner claim tracking (Supabase RPC client)
   ---------------------------------------------------------
   Thin fetch wrapper around the two RPC functions defined in
   supabase/planner-claims-schema.sql. No supabase-js dependency
   needed — this is a static site with no build step, so a couple
   of plain fetch() calls keep things simple.
   ========================================================= */

import { SUPABASE_CONFIG, isSupabaseConfigured } from './supabase-config.js';

export const FREE_CLAIM_LIMIT = 100;

async function callRpc(fnName, body) {
  const res = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/rpc/${fnName}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_CONFIG.anonKey,
      Authorization: `Bearer ${SUPABASE_CONFIG.anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase RPC "${fnName}" failed (${res.status})`);
  return res.json();
}

/**
 * Claims a spot for this email (idempotent — resubmitting the same email
 * returns the same original claim_number rather than counting twice).
 * Returns null if Supabase isn't configured yet, so callers can show a
 * generic thank-you instead of a fabricated claim number.
 */
export async function claimPlannerSpot(email, overallLevel, marketingConsent) {
  if (!isSupabaseConfigured()) return null;
  const [row] = await callRpc('claim_planner_spot', {
    p_email: email,
    p_overall_level: overallLevel,
    p_marketing_consent: marketingConsent,
  });
  return row; // { claim_number, free_claims_used, is_free }
}

/** Read-only current claim count, for showing a live "X of 100 left" badge. */
export async function getPlannerClaimCount() {
  if (!isSupabaseConfigured()) return null;
  return callRpc('get_planner_claim_count', {});
}
