/* =========================================================
   Fika med Hannah — Swedish Level Test: recommendations config
   ---------------------------------------------------------
   Editable content only — no logic. Update the URLs/emoji/copy here
   without touching app.js. Mirrors the `CONFIG` pattern already used
   in the site's script.js.
   ========================================================= */

export const RECOMMENDATIONS_CONFIG = {
  // TODO: point this at your real study-planner / course page.
  studyPlannerUrl: 'https://www.fikamedhannah.com/',

  categories: {
    vocabulary: {
      label: 'Ordförråd',
      emoji: '📚',
      description: 'Öva på nya ord varje dag genom att läsa och lyssna på svenska i din vardag.',
      // TODO: replace with a real YouTube video/playlist about Swedish vocabulary.
      youtubeUrl: 'https://www.youtube.com/@FikamedHannah',
    },
    grammar: {
      label: 'Grammatik',
      emoji: '📐',
      description: 'Repetera verbtempus och ordföljd — små dagliga övningar ger stor effekt över tid.',
      // TODO: replace with a real YouTube video/playlist about Swedish grammar.
      youtubeUrl: 'https://www.youtube.com/@FikamedHannah',
    },
    reading: {
      label: 'Läsförståelse',
      emoji: '📖',
      description: 'Läs korta svenska texter (nyheter, bloggar) och sammanfatta dem för dig själv.',
      // TODO: replace with a real YouTube video/playlist about Swedish reading.
      youtubeUrl: 'https://www.youtube.com/@FikamedHannah',
    },
    listening: {
      label: 'Lyssnaförståelse',
      emoji: '🎧',
      description: 'Lyssna på svenska poddar eller videos varje dag, gärna med undertexter till en början.',
      // TODO: replace with a real YouTube video/playlist about Swedish listening.
      youtubeUrl: 'https://www.youtube.com/@FikamedHannah',
    },
  },

  levelDescriptions: {
    A1: 'Du kan använda enkla fraser och ord för vardagliga behov.',
    A2: 'Du kan kommunicera i enkla, rutinmässiga situationer.',
    B1: 'Du klarar de flesta situationer som kan uppstå i vardagen.',
    B2: 'Du kan kommunicera flytande om de flesta ämnen.',
    C1: 'Du uttrycker dig flytande, spontant och med precision.',
    C2: 'Du behärskar svenska nästan som ett modersmål.',
  },
};

export function getRecommendationFor(category) {
  return RECOMMENDATIONS_CONFIG.categories[category];
}
