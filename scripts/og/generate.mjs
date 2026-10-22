// Generates the link-preview image (Open Graph / Twitter card) from the current content,
// so the picture shown when the site is shared on social media never goes stale.
// Runs before every build (`prebuild`). Output:
//   public/images/og/home.jpg         1200 x 630 preview image
//   src/resources/og.json             { "home": "/images/og/home.jpg?v=<hash>" }  (the ?v= busts social caches)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { createElement as h } from "react";
import sharp from "sharp";
import { ImageResponse } from "next/dist/compiled/@vercel/og/index.node.js";

const root = new URL("../../", import.meta.url);
const file = (p) => new URL(p, root);
const json = (p) => JSON.parse(readFileSync(file(p), "utf8"));
const font = (name) => readFileSync(new URL(`./fonts/${name}`, import.meta.url));

const site = json("content/site.json");
const home = json("content/home.json");
const W = 1200, H = 630;

async function dataUrl(path, resize) {
  const buf = await sharp(readFileSync(file(`public${path}`))).resize(resize).png().toBuffer();
  return `data:image/png;base64,${buf.toString("base64")}`;
}

const bg = await dataUrl("/images/armored-landscape.webp", { width: W, height: H, fit: "cover" });
// A missing or external avatar just leaves the photo out instead of failing the build.
const avatar = await dataUrl(site.person.avatar, { width: 220, height: 220, fit: "cover" }).catch(() => null);
const host = "kinojms.github.io";
const headline = home.headline.trim();
const headSize = headline.length > 48 ? 58 : headline.length > 26 ? 70 : 78;

const tree = h(
  "div",
  { style: { width: W, height: H, display: "flex", position: "relative", fontFamily: "Geist", color: "#fff", background: "#0b0f14" } },
  h("img", { src: bg, width: W, height: H, style: { position: "absolute", left: 0, top: 0, width: W, height: H } }),
  // dark "glass" tint, like the site's dark mode
  h("div", { style: { position: "absolute", left: 0, top: 0, width: W, height: H, display: "flex",
    background: "linear-gradient(110deg, rgba(8,11,16,0.86) 0%, rgba(8,11,16,0.62) 50%, rgba(8,11,16,0.25) 100%)" } }),
  h(
    "div",
    { style: { position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between", width: W, height: H, padding: "64px 72px" } },
    // top: avatar + name
    h(
      "div",
      { style: { display: "flex", alignItems: "center", gap: 24 } },
      avatar && h("img", { src: avatar, width: 104, height: 104, style: { borderRadius: 999, border: "3px solid rgba(255,255,255,0.35)" } }),
      h(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: 6 } },
        h("div", { style: { fontSize: 38, fontWeight: 700, letterSpacing: -1 } }, site.person.name),
        h("div", { style: { fontSize: 24, fontWeight: 500, color: "rgba(255,255,255,0.70)" } }, site.person.role),
      ),
    ),
    // middle: headline
    h("div", { style: { display: "flex", maxWidth: 1060, fontSize: headSize, fontWeight: 700, lineHeight: 1.08, letterSpacing: -2.5 } }, headline),
    // bottom: url + sections
    h(
      "div",
      { style: { display: "flex", alignItems: "center", justifyContent: "space-between" } },
      h(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 14, padding: "12px 22px", borderRadius: 999,
          background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.22)", fontFamily: "Geist Mono", fontSize: 24 } },
        h("div", { style: { width: 10, height: 10, borderRadius: 99, background: "#7dd3a8" } }),
        host,
      ),
      h("div", { style: { display: "flex", fontSize: 22, fontWeight: 500, color: "rgba(255,255,255,0.65)", letterSpacing: 3 } }, "PROJECTS · ABOUT · CONTACT"),
    ),
  ),
);

const res = new ImageResponse(tree, {
  width: W,
  height: H,
  fonts: [
    { name: "Geist", data: font("Geist-Regular.ttf"), weight: 400 },
    { name: "Geist", data: font("Geist-Medium.ttf"), weight: 500 },
    { name: "Geist", data: font("Geist-Bold.ttf"), weight: 700 },
    { name: "Geist Mono", data: font("GeistMono-Medium.ttf"), weight: 500 },
  ],
});
// JPEG keeps it small: WhatsApp and some apps skip preview images over ~300 KB.
const png = await sharp(Buffer.from(await res.arrayBuffer())).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
mkdirSync(file("public/images/og"), { recursive: true });
writeFileSync(file("public/images/og/home.jpg"), png);
const v = createHash("sha1").update(png).digest("hex").slice(0, 8);
const manifest = JSON.stringify({ home: `/images/og/home.jpg?v=${v}` }, null, 2) + "\n";
const out = file("src/resources/og.json");
let old = "";
try { old = readFileSync(out, "utf8"); } catch {}
if (old !== manifest) writeFileSync(out, manifest);
console.log(`og: public/images/og/home.jpg (${(png.length / 1024).toFixed(0)} KB, v=${v})`);
