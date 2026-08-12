/* =========================================================
   Fika med Hannah — site script
   Plain JS, no dependencies. Edit CONFIG below to connect
   real links, videos and the planner file.
   ========================================================= */

const CONFIG = {
  // Your YouTube channel — used by every "YouTube" button/link on the site.
  youtubeChannelUrl: "https://www.youtube.com/@fikamedhannah",

  // Set this to a real YouTube video ID (the part after "v=" in the URL,
  // e.g. "dQw4w9WgXcQ") to embed your latest lesson in the "Latest Lesson"
  // section. Leave it as an empty string to keep showing the placeholder.
  latestVideoId: "",
};

document.addEventListener("DOMContentLoaded", () => {
  applyConfigLinks();
  setupNavToggle();
  setupLatestVideo();
  setupSignupForm();
  setupPlannerForm();
  document.getElementById("year").textContent = new Date().getFullYear();
});

/* ---------- Fill in every link marked data-config-href ---------- */
function applyConfigLinks() {
  document.querySelectorAll("[data-config-href]").forEach((el) => {
    const key = el.getAttribute("data-config-href");
    if (CONFIG[key]) el.setAttribute("href", CONFIG[key]);
  });
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

/* ---------- Latest lesson embed ---------- */
function setupLatestVideo() {
  const frame = document.getElementById("videoFrame");
  const placeholder = document.getElementById("videoPlaceholder");
  if (!frame || !CONFIG.latestVideoId) return;

  const ratioBox = document.createElement("div");
  ratioBox.className = "ratio-box";
  ratioBox.innerHTML = `<iframe
      src="https://www.youtube-nocookie.com/embed/${CONFIG.latestVideoId}"
      title="Latest Fika med Hannah lesson on YouTube"
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

    message.textContent = "Tack! You're on the list — welcome to Fika-brevet.";
    form.reset();
  });
}

/* ---------- PLANNER DOWNLOAD GATE (frontend-only placeholder) ----------
   119 kr normally, free for the first 100 downloads. Since this is a static
   site there's no real way to count "first 100" or verify payment — connect
   a real email provider + payment link (Stripe Payment Link / Gumroad) here
   to actually enforce that, and to collect the emails for real. */
function setupPlannerForm() {
  const form = document.getElementById("plannerForm");
  const message = document.getElementById("plannerMessage");
  const downloadLink = document.getElementById("plannerDownloadLink");
  if (!form || !message || !downloadLink) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const email = document.getElementById("plannerEmail").value.trim();
    if (!email) return;

    message.textContent = "Tack! Your planner is ready to download below.";
    downloadLink.classList.remove("is-hidden");
    downloadLink.focus();
    form.reset();
  });
}
