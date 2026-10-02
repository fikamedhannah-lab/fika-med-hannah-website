/* =========================================================
   Fika med Hannah - site script
   Plain JS, no dependencies. Edit CONFIG below to connect
   real links, videos and the planner file.
   ========================================================= */

const CONFIG = {
  // Your YouTube channel - used by every "YouTube" button/link on the site.
  youtubeChannelUrl: "https://www.youtube.com/@fikamedhannah",

  // Selected homepage lesson, not necessarily the latest channel upload.
  latestVideoId: "R2MUF9MsUOE",
};

document.addEventListener("DOMContentLoaded", () => {
  applyConfigLinks();
  setupNavToggle();
  setupLatestVideo();
  setupSignupForm();
  setupEpisodeLibrary();
  document.getElementById("year").textContent = new Date().getFullYear();
});

/* ---------- Fill in every link marked data-config-href ---------- */
function applyConfigLinks() {
  document.querySelectorAll("[data-config-href]").forEach((el) => {
    const key = el.getAttribute("data-config-href");
    if (CONFIG[key]) el.setAttribute("href", CONFIG[key]);
  });
}

function setupEpisodeLibrary() {
  const list = document.getElementById("episodeList");
  if (!list) return;

  const episodes = Array.from(list.querySelectorAll("[data-episode]"));
  const filters = document.getElementById("episodeFilters");
  const search = document.getElementById("episodeSearch");
  const sort = document.getElementById("episodeSort");
  const pagination = document.getElementById("episodePagination");
  const previous = document.getElementById("episodePrevious");
  const next = document.getElementById("episodeNext");
  const pageSize = 12;
  let page = 1;
  const normalize = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("sv");
  const searchable = new Map(episodes.map((episode) => [episode, normalize(`Avsnitt ${Number(episode.dataset.episode)} ${episode.dataset.topic} ${episode.querySelector("h3").textContent} ${episode.querySelector("p").textContent}`)]));

  const latest = episodes.reduce((current, episode) => !current || Number(episode.dataset.episode) > Number(current.dataset.episode) ? episode : current, null);
  if (latest) {
    document.getElementById("featuredEpisodeNumber").textContent = `Avsnitt ${Number(latest.dataset.episode)}`;
    document.getElementById("featuredEpisodeTitle").textContent = latest.querySelector("h3").textContent;
    document.getElementById("featuredEpisodeTopic").textContent = latest.querySelector("p").textContent;
    document.getElementById("featuredEpisodeLink").href = latest.querySelector("a").href;
    document.querySelector(".vocab-featured > img").src = latest.querySelector("img").src;
  }
  document.getElementById("episodeTotal").textContent = `${episodes.length} avsnitt`;
  document.querySelector(".vocab-next").textContent = latest ? `Fler berättelser är på väg · Avsnitt ${Number(latest.dataset.episode) + 1} kommer snart` : "Fler berättelser är på väg";

  function render() {
    const terms = normalize(search.value.trim()).split(/\s+/).filter(Boolean);
    const matching = episodes.filter((episode) => terms.every((term) => searchable.get(episode).includes(term)))
      .sort((first, second) => sort.value === "oldest" ? Number(first.dataset.episode) - Number(second.dataset.episode) : Number(second.dataset.episode) - Number(first.dataset.episode));
    const pages = Math.max(1, Math.ceil(matching.length / pageSize));
    page = Math.min(page, pages);
    episodes.forEach((episode) => { episode.hidden = true; });
    matching.forEach((episode, index) => {
      episode.hidden = index < (page - 1) * pageSize || index >= page * pageSize;
      list.append(episode);
    });
    document.getElementById("episodeEmpty").hidden = matching.length !== 0;
    document.getElementById("episodeResults").textContent = matching.length ? `Visar ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, matching.length)} av ${matching.length} avsnitt` : "0 avsnitt";
    pagination.hidden = pages <= 1;
    document.getElementById("episodePage").textContent = `Sida ${page} av ${pages}`;
    previous.disabled = page === 1;
    next.disabled = page === pages;
  }

  filters.addEventListener("submit", (event) => event.preventDefault());
  search.addEventListener("input", () => { page = 1; render(); });
  sort.addEventListener("change", () => { page = 1; render(); });
  document.getElementById("episodeReset").addEventListener("click", () => {
    filters.reset();
    page = 1;
    render();
    search.focus();
  });
  previous.addEventListener("click", () => { page -= 1; render(); });
  next.addEventListener("click", () => { page += 1; render(); });
  filters.hidden = false;
  render();
}

/* ---------- Mobile nav toggle ---------- */
function setupNavToggle() {
  const toggle = document.getElementById("navToggle");
  const nav = document.getElementById("primaryNav");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  // Close the mobile menu after choosing a link.
  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

/* ---------- Selected lesson embed ---------- */
function setupLatestVideo() {
  const frame = document.getElementById("videoFrame");
  const placeholder = document.getElementById("videoPlaceholder");
  if (!frame || !CONFIG.latestVideoId) return;

  const ratioBox = document.createElement("div");
  ratioBox.className = "ratio-box";
  ratioBox.innerHTML = `<iframe
      src="https://www.youtube-nocookie.com/embed/${CONFIG.latestVideoId}"
      title="En svensklektion med Fika med Hannah"
      loading="lazy"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowfullscreen></iframe>`;

  placeholder.replaceWith(ratioBox);
}

/* ---------- EMAIL SIGNUP (frontend-only placeholder) ---------- */
function setupSignupForm() {
  const form = document.getElementById("signupForm");
  const message = document.getElementById("signupMessage");
  if (!form || !message) return;

  form.addEventListener("submit", (event) => {
    // TODO: once a real provider (MailerLite / Brevo / ConvertKit) is connected,
    // delete this preventDefault() + fake message so the form posts for real.
    event.preventDefault();

    const email = document.getElementById("signupEmail").value.trim();
    if (!email) return;

    message.textContent = "Tack! Du står nu på listan - välkommen till Fika-brevet.";
    form.reset();
  });
}
