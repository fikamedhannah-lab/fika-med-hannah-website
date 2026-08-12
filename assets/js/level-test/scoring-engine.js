/* =========================================================
   Fika med Hannah — Swedish Level Test: scoring engine
   ---------------------------------------------------------
   Turns the adaptive engine's final state into a CEFR result.
   Not a raw "% correct" score — each category's level comes from
   where its difficulty *estimate* converged (a harder question
   answered correctly moves the estimate up more than an easy one;
   missing an easy question moves it down more than missing a hard
   one — see adaptive-engine.js `recordAnswer`).

   The overall level is a weighted combination that leans toward the
   weakest category, since real-world CEFR placement is usually
   bottlenecked by a learner's weakest skill rather than their average.
   ========================================================= */

import { CATEGORIES, bandToLevel } from './adaptive-engine.js';

function bandOfEstimate(estimate) {
  return Math.min(6, Math.max(1, Math.floor(estimate / 10)));
}

export function computeResults(state) {
  const categories = {};

  CATEGORIES.forEach((cat) => {
    const c = state.perCategory[cat];
    const correctCount = c.answers.filter((a) => a.correct).length;
    const band = bandOfEstimate(c.estimate);
    categories[cat] = {
      level: bandToLevel(band),
      band,
      asked: c.asked,
      correct: correctCount,
      accuracy: c.asked ? correctCount / c.asked : 0,
      estimate: c.estimate,
    };
  });

  // Overall level: weighted average that leans toward the weakest
  // category (double-weighted), rounded to the nearest CEFR band.
  const bands = CATEGORIES.map((cat) => categories[cat].band);
  const minBand = Math.min(...bands);
  const weightedSum = minBand * 2 + bands.reduce((sum, b) => sum + b, 0);
  const weightedAverage = weightedSum / (bands.length + 2);
  const overallBand = Math.min(6, Math.max(1, Math.round(weightedAverage)));

  const sortedByBand = [...CATEGORIES].sort((a, b) => {
    if (categories[a].band !== categories[b].band) return categories[a].band - categories[b].band;
    return categories[a].accuracy - categories[b].accuracy;
  });
  const weakest = sortedByBand[0];
  const strongest = sortedByBand[sortedByBand.length - 1];

  return {
    overallLevel: bandToLevel(overallBand),
    overallBand,
    categories,
    weakest,
    strongest,
    totalQuestions: state.totalAsked,
  };
}
