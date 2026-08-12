/* =========================================================
   Fika med Hannah — Swedish Level Test: analytics hook
   ---------------------------------------------------------
   No analytics service is wired into the site today, so this just
   dispatches a CustomEvent on `document` (so any future analytics
   snippet can listen for `fmh:level-test` without app.js changes)
   and logs to the console in development. Swap the body of
   trackEvent() for a real provider (GA4, Plausible, etc.) later.
   ========================================================= */

export function trackEvent(name, detail = {}) {
  try {
    document.dispatchEvent(new CustomEvent('fmh:level-test', { detail: { name, ...detail } }));
  } catch (err) {
    // no-op — CustomEvent should always be available in modern browsers
  }
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.debug('[level-test]', name, detail);
  }
}
