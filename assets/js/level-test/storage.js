/* =========================================================
   Fika med Hannah — Swedish Level Test: local persistence
   ---------------------------------------------------------
   Lets a user reload the page mid-test and resume where they left
   off, or explicitly restart. Uses localStorage only (no backend).
   ========================================================= */

const STORAGE_KEY = 'fmh-swedish-level-test-v1';
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 3; // 3 days

export function saveProgress(state, currentQuestionId) {
  try {
    const payload = {
      savedAt: Date.now(),
      currentQuestionId,
      totalAsked: state.totalAsked,
      askedIds: Array.from(state.askedIds),
      perCategory: Object.fromEntries(
        Object.entries(state.perCategory).map(([cat, c]) => [
          cat,
          {
            estimate: c.estimate,
            asked: c.asked,
            bandHistory: c.bandHistory,
            answers: c.answers,
          },
        ])
      ),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    // localStorage can fail in private mode / when full — the test
    // still works, it just won't be resumable.
    console.warn('Level test: could not save progress', err);
  }
}

/** Rehydrates a saved state onto a freshly-created adaptive state
 *  (created via createAdaptiveState(bank)), or returns null if there
 *  is nothing valid to resume. */
export function loadProgress(freshState) {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (!saved.savedAt || Date.now() - saved.savedAt > MAX_AGE_MS) {
      clearProgress();
      return null;
    }

    freshState.totalAsked = saved.totalAsked;
    freshState.askedIds = new Set(saved.askedIds);
    Object.entries(saved.perCategory).forEach(([cat, c]) => {
      if (!freshState.perCategory[cat]) return;
      Object.assign(freshState.perCategory[cat], c);
    });
    return { state: freshState, currentQuestionId: saved.currentQuestionId };
  } catch (err) {
    console.warn('Level test: could not load saved progress', err);
    return null;
  }
}

export function clearProgress() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('Level test: could not clear saved progress', err);
  }
}

export function hasSavedProgress() {
  try {
    return Boolean(window.localStorage.getItem(STORAGE_KEY));
  } catch (err) {
    return false;
  }
}
