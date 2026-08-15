/* =========================================================
   Fika med Hannah — send-level-test-email (Supabase Edge Function)
   ---------------------------------------------------------
   Sends the "your result + recommendation + planner" follow-up email
   after someone submits their address on the level-test results page.
   Called from the browser by sendResultEmail() in
   assets/js/level-test/planner-claims.js — see that file for the
   request payload shape.

   Setup:
     1. Install the Supabase CLI, then from the repo root:
          supabase login
          supabase link --project-ref <your-project-ref>
     2. Run the updated supabase/planner-claims-schema.sql in the
        Supabase dashboard's SQL Editor (adds email_sent +
        try_start_email_send — safe to re-run, it's idempotent).
     3. Sign up at https://resend.com (free tier is plenty for this),
        verify a sending domain (or use their onboarding@resend.dev
        sender while testing), then set the secrets:
          supabase secrets set RESEND_API_KEY=re_xxx
          supabase secrets set FROM_EMAIL="Fika med Hannah <hello@fikamedhannah.com>"
     4. Deploy:
          supabase functions deploy send-level-test-email --no-verify-jwt
        (--no-verify-jwt because this is called with the public anon key
        from a static site, same as the RPCs in planner-claims.js.)

   Abuse guards: try_start_email_send() only returns true once per email
   AND only for emails that already have a real row in planner_claims
   (i.e. went through the real claim_planner_spot flow first) — so this
   endpoint can't be used as a generic mail relay to arbitrary addresses,
   and can't be spammed repeatedly for the same address.
   ========================================================= */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'Fika med Hannah <onboarding@resend.dev>';

const SITE_URL = 'https://fikamedhannah.com';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] as string
  ));
}

/** Only allow http(s) URLs through into href attributes; anything else
 *  (e.g. a javascript: URL) falls back to the site itself. */
function safeUrl(value: unknown, fallback: string): string {
  const str = String(value ?? '');
  return /^https?:\/\//i.test(str) ? str : fallback;
}

async function callRpc(fnName: string, payload: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`RPC "${fnName}" failed (${res.status})`);
  return res.json();
}

interface EmailPayload {
  email: string;
  overallLevel: string;
  overallDescription: string;
  categories: { label: string; level: string }[];
  weakestLabel: string;
  recommendationDescription: string;
  recommendationYoutubeUrl: string;
  isFree: boolean;
  claimNumber: number;
}

function buildEmailHtml(p: EmailPayload): string {
  const plannerDownloadUrl = `${SITE_URL}/downloads/fika-med-hannah-study-planner.pdf`;
  const plannerPageUrl = `${SITE_URL}/index.html#planner`;
  const youtubeUrl = safeUrl(p.recommendationYoutubeUrl, 'https://www.youtube.com/@fikamedhannah');

  const categoryRows = (p.categories || [])
    .map(
      (c) => `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
        <tr>
          <td style="padding:10px 14px;border:1.5px dashed #dec5bb;border-radius:10px;font-size:14px;">
            <strong style="color:#21395c;">${escapeHtml(c.label)}</strong>
            <span style="float:right;font-weight:700;color:#21395c;">${escapeHtml(c.level)}</span>
          </td>
        </tr>
      </table>`
    )
    .join('');

  const plannerBlock = p.isFree
    ? `
      <p style="margin:0 0 14px;font-size:15px;">🎉 Din studieplanner är gratis!</p>
      <a href="${plannerDownloadUrl}" style="display:inline-block;background-color:#21395c;color:#ffffff;font-weight:600;padding:12px 26px;border-radius:999px;text-decoration:none;font-size:15px;">Ladda ner din planner &darr;</a>`
    : `
      <p style="margin:0 0 14px;font-size:15px;">De första 100 gratisplatserna är redan tagna, men du kan fortfarande få plannern för 69 kr.</p>
      <a href="${plannerPageUrl}" style="display:inline-block;background-color:#21395c;color:#ffffff;font-weight:600;padding:12px 26px;border-radius:999px;text-decoration:none;font-size:15px;">Läs mer om plannern &rarr;</a>`;

  return `<!DOCTYPE html>
<html lang="sv">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin:0;padding:0;background-color:#faf5ef;font-family:'Poppins',Arial,sans-serif;color:#3a2c28;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#faf5ef;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:560px;background-color:#fffaf7;border:2px dashed #dec5bb;border-radius:20px;padding:36px 32px;" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="padding-bottom:18px;">
                <span style="font-family:Georgia,serif;font-weight:700;font-size:22px;color:#21395c;">Fika <em style="color:#b58b7f;">med</em> Hannah</span>
              </td>
            </tr>
            <tr>
              <td>
                <p style="margin:0 0 6px;font-size:13px;color:#b58b7f;text-transform:uppercase;letter-spacing:.04em;">Ditt nivåtest är klart</p>
                <h1 style="margin:0 0 12px;font-family:Georgia,serif;font-size:26px;color:#21395c;">Din nivå: ${escapeHtml(p.overallLevel)}</h1>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.55;">${escapeHtml(p.overallDescription)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding-bottom:20px;">
                ${categoryRows}
              </td>
            </tr>
            <tr>
              <td style="background-color:#e3ebd9;border:1.5px dashed #dec5bb;border-radius:14px;padding:18px 20px;">
                <h2 style="margin:0 0 6px;font-family:Georgia,serif;font-size:17px;color:#5c6b4d;">Fokusera på: ${escapeHtml(p.weakestLabel)}</h2>
                <p style="margin:0 0 10px;font-size:14px;line-height:1.5;color:#3a2c28;">${escapeHtml(p.recommendationDescription)}</p>
                <a href="${youtubeUrl}" style="color:#21395c;font-weight:600;text-decoration:underline;font-size:14px;">Se en video om ${escapeHtml(p.weakestLabel.toLowerCase())} &rarr;</a>
              </td>
            </tr>
            <tr><td style="height:24px;line-height:24px;">&nbsp;</td></tr>
            <tr>
              <td style="background-color:#fdeeec;border:1.5px dashed #dec5bb;border-radius:14px;padding:20px 22px;text-align:center;">
                ${plannerBlock}
              </td>
            </tr>
            <tr>
              <td style="padding-top:28px;text-align:center;font-size:12px;color:#8a7a74;">
                <p style="margin:0 0 6px;">Fika med Hannah &middot; Lär dig svenska, en fika i taget.</p>
                <p style="margin:0;"><a href="${SITE_URL}/privacy-policy.html" style="color:#8a7a74;">Integritetspolicy</a></p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body: EmailPayload;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const email = String(body?.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return json({ error: 'Invalid email' }, 400);

  let canSend: boolean;
  try {
    canSend = await callRpc('try_start_email_send', { p_email: email });
  } catch (err) {
    console.error('try_start_email_send failed', err);
    return json({ error: 'Could not verify claim' }, 502);
  }
  if (!canSend) return json({ skipped: true });

  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — skipping send (configure it to enable real email delivery)');
    return json({ skipped: true, reason: 'email provider not configured' });
  }

  const html = buildEmailHtml({ ...body, email });
  const sendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: email,
      subject: `Ditt resultat: ${body.overallLevel || ''} — Fika med Hannah`,
      html,
    }),
  });

  if (!sendRes.ok) {
    console.error('Resend send failed', sendRes.status, await sendRes.text());
    return json({ error: 'Could not send email' }, 502);
  }

  return json({ sent: true });
});
