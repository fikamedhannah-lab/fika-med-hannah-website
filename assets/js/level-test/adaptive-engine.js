/* =========================================================
   Fika med Hannah — Swedish Level Test: adaptive engine
   ---------------------------------------------------------
   Rule-based (not full IRT) adaptive item selection. Keeps a running
   "difficulty estimate" per category (Vocabulary/Grammar/Reading/
   Listening) on the same difficulty scale used in question-bank.js
   (11-15 = A1, 21-25 = A2, ... 61-65 = C2).

   Flow:
     1. Diagnostic phase: first questions rotate evenly through all
        4 categories at a neutral starting estimate (A2/B1 boundary).
     2. Adaptive phase: after each answer, the category's estimate
        moves up (correct) or down (incorrect). The step size shrinks
        as more questions are answered in that category, so the
        estimate converges rather than oscillating forever.
     3. Stopping rule: stop once every category has (a) enough
        answered questions, and (b) a "stable" estimate (hasn't
        changed CEFR band across the last few answers) — or once the
        test hits MAX_QUESTIONS as a hard ceiling. Categories that
        land at the very top (C2) or bottom (A1) band get a couple of
        extra confirmation questions before the test accepts that
        extreme as final.
   ========================================================= */

import { LEVEL_ORDER } from './question-bank.js';

export const CATEGORIES = ['vocabulary', 'grammar', 'reading', 'listening'];

export const ADAPTIVE_CONFIG = {
  MIN_QUESTIONS: 25,
  TARGET_QUESTIONS: 34,
  MAX_QUESTIONS: 50,
  MIN_PER_CATEGORY: 5,
  EXTREME_MIN_PER_CATEGORY: 7, // extra confirmation at A1 or C2 edges
  STABILITY_WINDOW: 3,
  INITIAL_ESTIMATE: 25, // A2/B1 boundary — neutral starting point
  INITIAL_STEP: 14,
  MIN_STEP: 3,
  STEP_DECAY: 0.72,
  MIN_DIFFICULTY: 11,
  MAX_DIFFICULTY: 65,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function bandOf(difficulty) {
  // 11-15 -> 1 (A1) ... 61-65 -> 6 (C2)
  return Math.min(6, Math.max(1, Math.floor(difficulty / 10)));
}

/** Creates a fresh adaptive test state for a given question bank. */
export function createAdaptiveState(bank) {
  const perCategory = {};
  CATEGORIES.forEach((cat) => {
    perCategory[cat] = {
      estimate: ADAPTIVE_CONFIG.INITIAL_ESTIMATE,
      asked: 0,
      bandHistory: [],
      answers: [], // { id, difficulty, correct }
      pool: bank.filter((q) => q.category === cat).map((q) => q.id),
    };
  });
  return {
    askedIds: new Set(),
    totalAsked: 0,
    perCategory,
  };
}

function isExtreme(categoryState) {
  return bandOf(categoryState.estimate) === 1 || bandOf(categoryState.estimate) === 6;
}

function isStable(categoryState) {
  const h = categoryState.bandHistory;
  if (h.length < ADAPTIVE_CONFIG.STABILITY_WINDOW) return false;
  const tail = h.slice(-ADAPTIVE_CONFIG.STABILITY_WINDOW);
  return tail.every((b) => b === tail[0]);
}

function minRequiredFor(categoryState) {
  return isExtreme(categoryState)
    ? ADAPTIVE_CONFIG.EXTREME_MIN_PER_CATEGORY
    : ADAPTIVE_CONFIG.MIN_PER_CATEGORY;
}

/** Picks which category to draw the next question from (round-robin
 *  weighted toward whichever category has been asked the least). */
function pickNextCategory(state) {
  let best = null;
  CATEGORIES.forEach((cat) => {
    const c = state.perCategory[cat];
    const hasUnseen = c.pool.some((id) => !state.askedIds.has(id));
    if (!hasUnseen) return;
    if (!best || c.asked < state.perCategory[best].asked) best = cat;
  });
  return best;
}

/** Returns the next question object to show, or null if the test
 *  should stop (no more suitable questions available). */
export function pickNextQuestion(state, bank) {
  const category = pickNextCategory(state);
  if (!category) return null;

  const c = state.perCategory[category];
  const candidates = bank.filter(
    (q) => q.category === category && !state.askedIds.has(q.id)
  );
  if (candidates.length === 0) return null;

  candidates.sort(
    (a, b) => Math.abs(a.difficulty - c.estimate) - Math.abs(b.difficulty - c.estimate)
  );
  return candidates[0];
}

/** Records an answer and updates the per-category difficulty estimate. */
export function recordAnswer(state, question, isCorrect) {
  const c = state.perCategory[question.category];
  const step = Math.max(
    ADAPTIVE_CONFIG.MIN_STEP,
    ADAPTIVE_CONFIG.INITIAL_STEP * Math.pow(ADAPTIVE_CONFIG.STEP_DECAY, c.asked)
  );
  c.estimate = clamp(
    c.estimate + (isCorrect ? step : -step),
    ADAPTIVE_CONFIG.MIN_DIFFICULTY,
    ADAPTIVE_CONFIG.MAX_DIFFICULTY
  );
  c.asked += 1;
  c.answers.push({ id: question.id, difficulty: question.difficulty, correct: isCorrect });
  c.bandHistory.push(bandOf(c.estimate));

  state.askedIds.add(question.id);
  state.totalAsked += 1;
}

/** Decides whether the adaptive test has gathered enough evidence to stop. */
export function shouldStop(state) {
  if (state.totalAsked >= ADAPTIVE_CONFIG.MAX_QUESTIONS) return true;
  if (state.totalAsked < ADAPTIVE_CONFIG.MIN_QUESTIONS) return false;

  return CATEGORIES.every((cat) => {
    const c = state.perCategory[cat];
    const hasUnseen = c.pool.some((id) => !state.askedIds.has(id));
    if (!hasUnseen) return true; // ran out of items in this category — accept as-is
    if (c.asked < minRequiredFor(c)) return false;
    return isStable(c);
  });
}

/** Progress indicator (0-1) for a non-numeric progress bar in the UI. */
export function progressRatio(state) {
  return Math.min(1, state.totalAsked / ADAPTIVE_CONFIG.TARGET_QUESTIONS);
}

export function bandToLevel(band) {
  const entry = Object.entries(LEVEL_ORDER).find(([, order]) => order === band);
  return entry ? entry[0] : 'A1';
}
