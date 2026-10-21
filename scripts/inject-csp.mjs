// Runs after `next build` (npm "postbuild"). GitHub Pages can't send HTTP headers, so the
// editor pages get their Content-Security-Policy as the first <meta> in <head>, where the
// browser applies it before any script runs. Only this site and the GitHub API may be contacted.
// 'unsafe-inline' is needed for Next.js' inline bootstrap scripts and the theme script.
import fs from "node:fs";

export const EDITOR_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://api.github.com",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join("; ");

const tags =
  `<meta http-equiv="Content-Security-Policy" content="${EDITOR_CSP}"/>` +
  `<meta name="referrer" content="no-referrer"/>`;

for (const file of ["out/edit/index.html", "out/edit/preview/index.html"]) {
  if (!fs.existsSync(file)) throw new Error(`inject-csp: ${file} is missing`);
  const html = fs.readFileSync(file, "utf8");
  if (html.includes('http-equiv="Content-Security-Policy"')) continue;
  const out = html.replace(/<head([^>]*)>/i, (m) => `${m}${tags}`);
  if (out === html) throw new Error(`inject-csp: no <head> in ${file}`);
  fs.writeFileSync(file, out);
  console.log(`inject-csp: ${file}`);
}
