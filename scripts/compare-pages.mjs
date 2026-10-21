// Compare two page-text.mjs snapshots and print differences.
// Usage: node scripts/compare-pages.mjs before.json after.json
import fs from "node:fs";

const [a, b] = process.argv.slice(2).map((f) => JSON.parse(fs.readFileSync(f, "utf8")));
let diffs = 0;
for (const page of new Set([...Object.keys(a), ...Object.keys(b)])) {
  if (!a[page] || !b[page]) {
    console.log(`PAGE ${a[page] ? "removed" : "added"}: ${page}`);
    diffs++;
    continue;
  }
  for (const key of ["title", "description", "text", "images", "links"]) {
    const x = JSON.stringify(a[page][key]);
    const y = JSON.stringify(b[page][key]);
    if (x === y) continue;
    diffs++;
    if (key === "text") {
      const s = a[page].text, t = b[page].text;
      let i = 0;
      while (i < s.length && s[i] === t[i]) i++;
      let j = 0;
      while (j < s.length - i && j < t.length - i && s[s.length - 1 - j] === t[t.length - 1 - j]) j++;
      console.log(`${page} text:\n  before: …${s.slice(Math.max(0, i - 60), s.length - j + 40)}…\n  after:  …${t.slice(Math.max(0, i - 60), t.length - j + 40)}…`);
    } else {
      console.log(`${page} ${key}:\n  before: ${x}\n  after:  ${y}`);
    }
  }
}
console.log(diffs ? `${diffs} difference(s)` : "IDENTICAL");
