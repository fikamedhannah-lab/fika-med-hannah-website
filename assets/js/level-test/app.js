/* =========================================================
   Fika med Hannah — Swedish Level Test: UI controller
   ---------------------------------------------------------
   Wires question-bank.js + adaptive-engine.js + scoring-engine.js +
   recommendations.js + storage.js + analytics.js to the DOM. Plain
   vanilla JS, no framework, matches the conventions in script.js.
   ========================================================= */

import { QUESTION_BANK } from './question-bank.js';
import {
  ADAPTIVE_CONFIG,
  createAdaptiveState,
  pickNextQuestion,
  recordAnswer,
  shouldStop,
  progressRatio,
} from './adaptive-engine.js';
import { computeResults } from './scoring-engine.js';
import { RECOMMENDATIONS_CONFIG, getRecommendationFor } from './recommendations.js';
import { saveProgress, loadProgress, clearProgress, hasSavedProgress } from './storage.js';
import { trackEvent } from './analytics.js';

const SKILL_LABELS = {
  vocabulary: { label: 'Ordförråd', icon: 'i-pencil' },
  grammar: { label: 'Grammatik', icon: 'i-star' },
  reading: { label: 'Läsförståelse', icon: 'i-book' },
  listening: { label: 'Lyssnaförståelse', icon: 'i-headphones' },
};

function iconSvg(iconId, className) {
  return `<svg class="${className}" aria-hidden="true"><use href="#${iconId}"/></svg>`;
}

const els = {
  intro: document.getElementById('lt-screen-intro'),
  question: document.getElementById('lt-screen-question'),
  results: document.getElementById('lt-screen-results'),
  reward: document.getElementById('lt-screen-reward'),
  email: document.getElementById('lt-screen-email'),
  continueScreen: document.getElementById('lt-screen-continue'),
  startBtn: document.getElementById('lt-start-btn'),
  resumeBtn: document.getElementById('lt-resume-btn'),
  nextBtn: document.getElementById('lt-next-btn'),
  restartBtn: document.getElementById('lt-restart-btn'),
  shareBtn: document.getElementById('lt-share-btn'),
  resultsContinueBtn: document.getElementById('lt-reward-continue-from-results-btn'),
  rewardContinueBtn: document.getElementById('lt-email-continue-from-reward-btn'),
  emailContinueBtn: document.getElementById('lt-continue-continue-from-email-btn'),
  emailContinueRow: document.getElementById('ltEmailContinueRow'),
  emailForm: document.getElementById('ltEmailForm'),
  emailInput: document.getElementById('ltEmailInput'),
  marketingConsent: document.getElementById('ltMarketingConsent'),
  emailMessage: document.getElementById('ltEmailMessage'),
  progressFill: document.getElementById('lt-progress-fill'),
  progressLabel: document.getElementById('lt-progress-label'),
  categoryTag: document.getElementById('lt-category-tag'),
  passage: document.getElementById('lt-passage'),
  audioBlock: document.getElementById('lt-audio-block'),
  audioBtn: document.getElementById('lt-audio-btn'),
  audioEl: document.getElementById('lt-audio-el'),
  prompt: document.getElementById('lt-question-prompt'),
  options: document.getElementById('lt-options'),
  resultsHeadline: document.getElementById('lt-results-headline'),
  resultsSub: document.getElementById('lt-results-sub'),
  skillGrid: document.getElementById('lt-skill-grid'),
  recommendation: document.getElementById('lt-recommendation'),
};

let adaptiveState = null;
let currentQuestion = null;
let selectedIndex = null;

function showScreen(name) {
  [els.intro, els.question, els.results, els.reward, els.email, els.continueScreen].forEach((el) =>
    el.classList.add('is-hidden')
  );
  els[name].classList.remove('is-hidden');
  els[name].scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function init() {
  if (hasSavedProgress()) {
    els.resumeBtn.classList.remove('is-hidden');
  }
  els.startBtn.addEventListener('click', () => startTest(false));
  els.resumeBtn.addEventListener('click', () => startTest(true));
  els.nextBtn.addEventListener('click', handleNext);
  els.restartBtn.addEventListener('click', () => {
    clearProgress();
    window.location.reload();
  });
  els.shareBtn.addEventListener('click', shareResult);
  els.resultsContinueBtn.addEventListener('click', () => {
    trackEvent('reward_viewed');
    showScreen('reward');
  });
  els.rewardContinueBtn.addEventListener('click', () => showScreen('email'));
  els.emailContinueBtn.addEventListener('click', () => showScreen('continueScreen'));
  els.emailForm.addEventListener('submit', handleEmailSubmit);
}

function startTest(resume) {
  adaptiveState = createAdaptiveState(QUESTION_BANK);
  let resumeQuestionId = null;

  if (resume) {
    const restored = loadProgress(adaptiveState);
    if (restored) {
      adaptiveState = restored.state;
      resumeQuestionId = restored.currentQuestionId;
    }
  } else {
    clearProgress();
  }

  trackEvent(resume ? 'test_resumed' : 'test_started');
  showScreen('question');

  const next =
    (resumeQuestionId && QUESTION_BANK.find((q) => q.id === resumeQuestionId)) ||
    pickNextQuestion(adaptiveState, QUESTION_BANK);
  renderQuestion(next);
}

function renderQuestion(question) {
  if (!question) {
    finishTest();
    return;
  }
  currentQuestion = question;
  selectedIndex = null;

  const meta = SKILL_LABELS[question.category];
  els.categoryTag.innerHTML = `${iconSvg(meta.icon, 'eyebrow-icon')}${meta.label}`;

  const ratio = progressRatio(adaptiveState);
  els.progressFill.style.width = `${Math.round(ratio * 100)}%`;
  els.progressLabel.textContent = `Fråga ${adaptiveState.totalAsked + 1} av ca ${ADAPTIVE_CONFIG.TARGET_QUESTIONS}`;

  if (question.passage) {
    els.passage.textContent = question.passage;
    els.passage.classList.remove('is-hidden');
  } else {
    els.passage.classList.add('is-hidden');
  }

  if (question.audioFile) {
    els.audioBlock.classList.remove('is-hidden');
    els.audioEl.src = question.audioFile;
    setupAudioFallback(question);
  } else {
    els.audioBlock.classList.add('is-hidden');
  }

  els.prompt.textContent = question.prompt;

  els.options.innerHTML = '';
  question.options.forEach((optionText, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lt-option';
    btn.setAttribute('aria-pressed', 'false');
    btn.textContent = optionText;
    btn.addEventListener('click', () => selectOption(index, btn));
    els.options.appendChild(btn);
  });

  els.nextBtn.disabled = true;
  saveProgress(adaptiveState, question.id);
}

function setupAudioFallback(question) {
  els.audioBtn.onclick = () => {
    els.audioEl.currentTime = 0;
    els.audioEl.play().catch(() => speakFallback(question));
  };
  els.audioEl.onerror = () => {
    // mp3 not generated yet — fall back to browser speech synthesis so
    // the test still works during development. This speaks the same
    // audio content the mp3 would have, without exposing any answer.
    els.audioBtn.onclick = () => speakFallback(question);
  };
}

function speakFallback(question) {
  if (!window.speechSynthesis || !question.transcript) return;
  const utterance = new SpeechSynthesisUtterance(question.transcript);
  utterance.lang = 'sv-SE';
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function selectOption(index, btn) {
  selectedIndex = index;
  Array.from(els.options.children).forEach((child, i) => {
    child.setAttribute('aria-pressed', String(i === index));
  });
  els.nextBtn.disabled = false;
}

function handleNext() {
  if (selectedIndex === null || !currentQuestion) return;
  const isCorrect = selectedIndex === currentQuestion.correct;
  recordAnswer(adaptiveState, currentQuestion, isCorrect);
  trackEvent('question_answered', { category: currentQuestion.category, correct: isCorrect });

  if (shouldStop(adaptiveState)) {
    finishTest();
    return;
  }
  renderQuestion(pickNextQuestion(adaptiveState, QUESTION_BANK));
}

let lastResults = null;

function finishTest() {
  clearProgress();
  const results = computeResults(adaptiveState);
  lastResults = results;
  trackEvent('test_completed', { overallLevel: results.overallLevel, totalQuestions: results.totalQuestions });
  renderResults(results);
  showScreen('results');
}

function renderResults(results) {
  els.resultsHeadline.textContent = `Din nivå: ${results.overallLevel}`;
  els.resultsSub.textContent = RECOMMENDATIONS_CONFIG.levelDescriptions[results.overallLevel] || '';

  els.skillGrid.innerHTML = '';
  Object.entries(results.categories).forEach(([cat, data]) => {
    const meta = SKILL_LABELS[cat];
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="lt-skill-row">
        ${iconSvg(meta.icon, 'lt-skill-icon')}
        <span class="lt-skill-info">
          <strong>${meta.label}</strong>
          <span class="lt-skill-bar-track"><span class="lt-skill-bar-fill" style="width:${Math.round((data.band / 6) * 100)}%"></span></span>
        </span>
        <span class="lt-skill-level">${data.level}</span>
      </div>
    `;
    els.skillGrid.appendChild(li);
  });

  const rec = getRecommendationFor(results.weakest);
  const weakestMeta = SKILL_LABELS[results.weakest];
  els.recommendation.innerHTML = `
    ${iconSvg(weakestMeta.icon, 'lt-skill-icon')}
    <span>
      <h3>Fokusera på: ${weakestMeta.label}</h3>
      <p>${rec.description}</p>
      <a href="${rec.youtubeUrl}" target="_blank" rel="noopener">Se en video om ${rec.label.toLowerCase()} &rarr;</a>
    </span>
  `;
}

async function shareResult() {
  if (!lastResults) return;
  const text = `Jag testade min svenska nivå hos Fika med Hannah och fick ${lastResults.overallLevel}! Testa din egen: ${window.location.href}`;
  if (navigator.share) {
    try {
      await navigator.share({ text, url: window.location.href });
      trackEvent('result_shared', { method: 'web_share' });
      return;
    } catch (err) {
      // user cancelled or share failed — fall through to clipboard
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    trackEvent('result_shared', { method: 'clipboard' });
    els.shareBtn.textContent = 'Kopierat!';
    setTimeout(() => { els.shareBtn.textContent = 'Dela ditt resultat'; }, 2000);
  } catch (err) {
    console.warn('Could not share or copy result', err);
  }
}

/*
  FRONTEND-ONLY FOR NOW. Mirrors the pattern used by the newsletter form
  in script.js. Once a real backend is wired up (chosen: Supabase free
  tier), replace the body of this function with a POST to that API —
  it should store { email, marketingConsent, overallLevel, categories }
  and (once claim-tracking exists) return the current claim count so we
  never show a fabricated "X of 100 left" number here.
*/
function handleEmailSubmit(event) {
  event.preventDefault();
  const email = els.emailInput.value.trim();
  if (!email) return;

  trackEvent('email_captured', {
    marketingConsent: els.marketingConsent.checked,
    overallLevel: lastResults ? lastResults.overallLevel : null,
  });

  els.emailMessage.textContent =
    'Tack! Vi skickar ditt resultat, dina rekommendationer och fika-bonusen till din inkorg så snart den är redo.';
  els.emailForm.querySelector('button[type="submit"]').disabled = true;
  els.emailInput.disabled = true;
  els.emailContinueRow.classList.remove('is-hidden');
}

init();
