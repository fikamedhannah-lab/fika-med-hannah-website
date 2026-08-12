# Fika med Hannah — Website

A cosy, Scandinavian-inspired homepage for **Fika med Hannah**, a Swedish-learning brand.
Built with plain **HTML, CSS and JavaScript only** — no frameworks, no backend, no build step —
so it can be hosted for free on GitHub Pages.

## File structure

```
/
├── index.html            Homepage (all sections)
├── privacy-policy.html   Placeholder privacy policy page
├── styles.css            All styling (CSS variables for the color palette)
├── script.js             Small config object + nav/video/form behaviour
├── assets/                Logo, illustrations and icons
│   └── icons/
├── downloads/              Files offered for download (e.g. the study planner PDF)
└── README.md
```

## Running it locally

No install or build step is required — it's just static files. Two easy options:

**Option A — just open it**
Double-click `index.html` (or open it from VS Code with "Open with Live Server" if you have
that extension). Everything will work except that some browsers restrict `fetch`/module
features under `file://`; this site doesn't use either, so plain double-click is fine.

**Option B — a tiny local server (recommended)**
```bash
# from the project folder
python3 -m http.server 8000
# then open http://localhost:8000 in your browser
```

## Publishing with GitHub Pages

1. Create a new GitHub repository (e.g. `fika-med-hannah-website`) and push this folder to it:
   ```bash
   git init
   git add .
   git commit -m "Initial site"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```
2. On GitHub, go to **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. Pick the **main** branch and **/ (root)** folder, then **Save**.
5. GitHub will publish the site at `https://<your-username>.github.io/<your-repo>/`
   (it can take a minute or two the first time).

## Connecting your custom domain (fikamedhannah.com)

1. In your repo, go to **Settings → Pages → Custom domain**, enter `fikamedhannah.com` and save.
   This creates a `CNAME` file in your repo automatically (or you can create one yourself
   containing just `fikamedhannah.com` on a single line).
2. At your domain registrar / DNS provider, add these records:
   - **Apex domain (`fikamedhannah.com`)** — four `A` records pointing to GitHub Pages' IPs:
     ```
     185.199.108.153
     185.199.109.153
     185.199.110.153
     185.199.111.153
     ```
   - **`www` subdomain** (optional but recommended) — a `CNAME` record pointing to
     `<your-username>.github.io`.
3. Back in **Settings → Pages**, wait for the DNS check to pass, then tick
   **Enforce HTTPS** once it becomes available.
4. DNS changes can take anywhere from a few minutes to a few hours to propagate.

## Where to replace things with your real content

| What | File / location | What to do |
|---|---|---|
| YouTube channel link | `script.js` → `CONFIG.youtubeChannelUrl` | Replace with your real channel URL. Every "YouTube" button/link on the site reads from this one place. |
| Level-test button | `script.js` → `CONFIG.levelTestVideoUrl` | Point it at your real "Find Your Swedish Level" video or quiz page. |
| Latest lesson embed | `script.js` → `CONFIG.latestVideoId` | Paste in the YouTube video ID (the part after `v=` in the URL) to swap the placeholder for a real responsive embed. |
| Study planner PDF | `downloads/fika-med-hannah-study-planner.pdf` | Replace this file with your latest export, keeping the same filename so the "Download the Planner" button keeps working (or update the `href` in `index.html` if you rename it). |
| Hero illustration | `assets/hero-illustration.svg` | Replace with real Fika med Hannah artwork (same filename, or update the `src` in `index.html`). |
| Planner cover mockup | `assets/planner-mockup.svg` | Replace with a real photo/mockup of the printed planner. |
| Vocabulary category icons | `assets/icons/icon-everyday.svg`, `icon-food.svg`, `icon-home.svg` | Swap for your own illustrated icons if you like (keep the ~80×80 proportions). |
| Logo | `assets/logo.png` | Already your real brand mark; replace if you refresh the logo. |
| Email newsletter provider | `index.html` → `#signupForm`, `script.js` → `setupSignupForm()` | See "Connecting an email newsletter provider" below. |
| Contact email | `index.html` footer (`mailto:hello@fikamedhannah.com`) | Replace with your real inbox address. |
| Privacy policy | `privacy-policy.html` | Replace the placeholder text with a real, reviewed policy before collecting emails. |

## Connecting an email newsletter provider

The "Join Fika-brevet" form is frontend-only for now — submitting it just shows a friendly
thank-you message and goes nowhere. To connect a real provider such as **MailerLite**,
**Brevo** or **ConvertKit**:

1. Create a signup form/embed in your provider's dashboard and copy the form **action URL**
   and any required field names.
2. In `index.html`, find `<form class="signup-form" id="signupForm" ...>` and:
   - Set `action` to the URL your provider gave you.
   - Make sure the email `<input>`'s `name` attribute matches what your provider expects.
3. In `script.js`, find the `setupSignupForm()` function (marked `EMAIL SIGNUP` in the
   comments) and remove the `event.preventDefault()` line so the form actually submits.
4. Some providers give you a ready-made `<form>` snippet instead — in that case you can
   replace the whole `<form>` block with their snippet and keep the surrounding markup/styles.

## Design notes

- Colors are defined once as CSS variables in `styles.css` (`:root`), matching the existing
  Fika med Hannah brand palette: soft blush pink, warm cream/beige, muted rose-red and a
  gentle sage green.
- Headings use **Fraunces**, body text uses **Poppins**, and small hand-written accents use
  **Caveat** — loaded from Google Fonts.
- Layout is mobile-first and fully responsive, with a max content width of ~1160px, rounded
  cards/buttons, soft borders and very subtle shadows.
- The header is sticky but subtle (translucent + blur, thin border, no heavy shadow).
- Reduced-motion is respected via `prefers-reduced-motion`.
