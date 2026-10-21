import fs from "node:fs";
import path from "node:path";

// Extract the visible text of every exported HTML page so two builds can be compared.
// Usage: node scripts/page-text.mjs <outDir> <jsonOut>
const [outDir, jsonOut] = process.argv.slice(2);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : p.endsWith(".html") ? [p] : [];
  });
}

function text(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<template[\s\S]*?<\/template>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function meta(html) {
  const pick = (re) => (html.match(re) || [])[1] || "";
  return {
    title: pick(/<title>([^<]*)<\/title>/),
    description: pick(/<meta name="description" content="([^"]*)"/),
    images: [...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1]).filter((s) => !s.startsWith("data:")),
    links: [...html.matchAll(/<a[^>]+href="([^"]+)"/g)].map((m) => m[1]),
  };
}

const result = {};
for (const file of walk(outDir).sort()) {
  const rel = path.relative(outDir, file).replace(/\\/g, "/");
  const html = fs.readFileSync(file, "utf8");
  result[rel] = { text: text(html), ...meta(html) };
}
fs.writeFileSync(jsonOut, JSON.stringify(result, null, 2));
console.log(`${Object.keys(result).length} pages -> ${jsonOut}`);
