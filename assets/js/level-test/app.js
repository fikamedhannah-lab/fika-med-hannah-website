/* =========================================================
   Fika med Hannah — Swedish Level Test: UI controller
   ---------------------------------------------------------
   Wires question-bank.js + adaptive-engine.js + scoring-engine.js +
   recommendations.js + storage.js + analytics.js to the DOM. Plain
   vanilla JS, no framework, matches the conventions in script.js.
   ========================================================= */

import { QUESTION_BANK } from './question-bank.js';
import {
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
import { claimPlannerSpot, FREE_CLAIM_LIMIT } from './planner-claims.js';

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
  email: document.getElementById('lt-screen-email'),
  continueScreen: document.getElementById('lt-screen-continue'),
  startBtn: document.getElementById('lt-start-btn'),
  resumeBtn: document.getElementById('lt-resume-btn'),
  nextBtn: document.getElementById('lt-next-btn'),
  restartBtn: document.getElementById('lt-restart-btn'),
  resultsContinueBtn: document.getElementById('lt-results-continue-btn'),
  emailContinueBtn: document.getElementById('lt-continue-continue-from-email-btn'),
  emailContinueRow: document.getElementById('ltEmailContinueRow'),
  emailForm: document.getElementById('ltEmailForm'),
  emailInput: document.getElementById('ltEmailInput'),
  marketingConsent: document.getElementById('ltMarketingConsent'),
  emailMessage: document.getElementById('ltEmailMessage'),
  progressFill: document.getElementById('lt-progress-fill'),
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
  [els.intro, els.question, els.results, els.email, els.continueScreen].forEach((el) =>
    el.classList.add('is-hidden')
  );
  els[name].classList.remove('is-hidden');
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
  els.resultsContinueBtn.addEventListener('click', () => showScreen('email'));
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

/*
  Claims a real spot via Supabase (see supabase-config.js). If the
  project isn't configured yet, claimPlannerSpot() returns null and we
  fall back to a generic thank-you — never a fabricated claim number.
*/
async function handleEmailSubmit(event) {
  event.preventDefault();
  const email = els.emailInput.value.trim();
  if (!email) return;

  const submitBtn = els.emailForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  els.emailInput.disabled = true;
  els.emailMessage.textContent = 'Skickar...';

  try {
    const claim = await claimPlannerSpot(
      email,
      lastResults ? lastResults.overallLevel : null,
      els.marketingConsent.checked
    );

    trackEvent('email_captured', {
      marketingConsent: els.marketingConsent.checked,
      overallLevel: lastResults ? lastResults.overallLevel : null,
      claimNumber: claim ? claim.claim_number : null,
    });

    if (claim && claim.is_free) {
      els.emailMessage.textContent = `🎉 Du är person #${claim.claim_number} av de första ${FREE_CLAIM_LIMIT} — plannern är gratis för dig! Vi skickar ditt resultat, dina rekommendationer och plannern till din inkorg.`;
    } else if (claim) {
      els.emailMessage.textContent = `Tack! De första ${FREE_CLAIM_LIMIT} gratisplatserna är redan tagna (du är #${claim.claim_number}), men du kan fortfarande köpa plannern för 69 kr. Vi skickar ditt resultat och dina rekommendationer till din inkorg.`;
    } else {
      els.emailMessage.textContent =
        'Tack! Vi skickar ditt resultat och dina rekommendationer till din inkorg.';
    }
  } catch (err) {
    console.warn('Could not submit email', err);
    els.emailMessage.textContent = 'Något gick fel. Försök igen om en stund.';
    submitBtn.disabled = false;
    els.emailInput.disabled = false;
    return;
  }

  els.emailContinueRow.classList.remove('is-hidden');
}

init();

