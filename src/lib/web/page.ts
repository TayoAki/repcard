/**
 * Minimal server-rendered HTML for the public share pages. No client JS,
 * inline CSS only, og: tags for link previews, and a deep link into the app.
 */
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function htmlPage(options: {
  title: string;
  description: string;
  deepLink: string;
  body: string;
}) {
  const { title, description, deepLink, body } = options;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)} · RepCard</title>
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:site_name" content="RepCard" />
<style>
  :root { color-scheme: dark; }
  * { margin: 0; box-sizing: border-box; }
  body { font-family: -apple-system, system-ui, sans-serif; background: #04120C; color: #F4F7F6;
         min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
  .card { width: 100%; max-width: 420px; border-radius: 28px; padding: 3px;
          background: linear-gradient(135deg, #34D399, #10B981, #065F46); }
  .inner { background: #04120C; border-radius: 25px; padding: 28px; }
  .brand { font-size: 10px; letter-spacing: 3px; color: rgba(209,250,229,.5); text-align: center; margin-top: 20px; }
  h1 { font-size: 26px; letter-spacing: -0.5px; }
  .sub { color: rgba(209,250,229,.6); font-size: 13px; margin-top: 6px; }
  .big { font-size: 56px; font-weight: 800; color: #6EE7B7; line-height: 1; }
  ul { list-style: none; margin-top: 18px; display: grid; gap: 10px; }
  li { background: rgba(255,255,255,.06); border-radius: 14px; padding: 12px 14px; font-size: 14px; }
  li small { display: block; color: rgba(209,250,229,.55); margin-top: 3px; font-size: 12px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 18px; }
  .cell { background: rgba(255,255,255,.06); border-radius: 14px; padding: 12px; }
  .cell b { font-size: 18px; display: block; }
  .cell span { font-size: 9px; letter-spacing: 1px; color: rgba(209,250,229,.5); }
  a.cta { display: block; text-align: center; background: #10B981; color: #052E22; font-weight: 700;
          text-decoration: none; border-radius: 16px; padding: 15px; margin-top: 22px; font-size: 15px; }
  .hint { text-align: center; color: rgba(209,250,229,.45); font-size: 11.5px; margin-top: 10px; }
</style>
</head>
<body>
<main class="card"><div class="inner">
${body}
<a class="cta" href="${esc(deepLink)}">Open in RepCard</a>
<p class="hint">Don't have the app? RepCard is coming to the App Store.</p>
<p class="brand">REPCARD · EVERY ATHLETE GETS A CARD</p>
</div></main>
</body>
</html>`;
}

export const escapeHtml = esc;
