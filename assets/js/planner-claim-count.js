/* =========================================================
   Fika med Hannah — homepage planner claim-count badge
   ---------------------------------------------------------
   Shows the real number of free planner spots left, fetched from
   Supabase. Stays hidden if Supabase isn't configured yet (see
   assets/js/level-test/supabase-config.js) — never fakes this number.
   ========================================================= */

import { getPlannerClaimCount, FREE_CLAIM_LIMIT } from './level-test/planner-claims.js';

async function renderClaimCountBadge() {
  const badge = document.getElementById('plannerClaimCount');
  if (!badge) return;

  try {
    const count = await getPlannerClaimCount();
    if (count === null) return;

    const remaining = Math.max(0, FREE_CLAIM_LIMIT - count);
    badge.textContent =
      remaining > 0
        ? `${remaining} av ${FREE_CLAIM_LIMIT} gratisplatser kvar`
        : `Alla ${FREE_CLAIM_LIMIT} gratisplatser är tagna`;
    badge.classList.remove('is-hidden');
  } catch (err) {
    console.warn('Could not load planner claim count', err);
  }
}

renderClaimCountBadge();
