/* =========================================================
   Fika med Hannah — Supabase connection config
   ---------------------------------------------------------
   Paste your project's URL + anon public key below (Supabase
   dashboard → Project Settings → API). Run supabase-schema.sql
   (in the repo root's supabase/ folder) in the SQL Editor first.

   The anon key is meant to be public/client-side — it does NOT
   grant table access here. It only lets the browser call the two
   RPC functions defined in the schema (claim_planner_spot and
   get_planner_claim_count), which validate/limit everything server-side.
   ========================================================= */

export const SUPABASE_CONFIG = {
  url: 'https://fmonynvbhsvseygxsqtk.supabase.co', // e.g. 'https://xxxxxxxxxxxx.supabase.co'
  anonKey: 'sb_publishable_QsG72eLFBOsFLt8eSPgRVA_dB4_iiA6', // e.g. 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
};

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey);
}
