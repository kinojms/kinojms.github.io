import { describe, expect, it } from "vitest";
import { BACKGROUND_RE, DEFAULT_BACKGROUND, backgroundOf, referencedImages, validate, contentFromFiles } from "./format";
import { withPendingImages } from "@/lib/editor/preview";
// The build script's copy of the rules must agree with the editor's.
import * as build from "../../../scripts/og/background.mjs";
import fs from "node:fs";
import path from "node:path";

function load() {
  const files: Record<string, string> = {};
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else files[p.split(path.sep).join("/")] = fs.readFileSync(p, "utf8");
    }
  };
  walk("content");
  return contentFromFiles(files);
}

describe("background", () => {
  it("shares the default and path rules with the build script", () => {
    expect(build.DEFAULT_BACKGROUND).toBe(DEFAULT_BACKGROUND);
    expect(build.BACKGROUND_RE.source).toBe(BACKGROUND_RE.source);
    expect(fs.existsSync(`public${DEFAULT_BACKGROUND}`)).toBe(true);
  });

  it("validates the path: no traversal, quotes, brackets, external or data URLs", () => {
    const c = load();
    const bad = ["/images/../../x.webp", "images/x.webp", '/images/x".webp', "/images/a).webp", "/images/a b.webp", "https://x.com/a.webp", "data:image/webp;base64,AA", "/images/x.gif", "/images/Uploads/X.webp"];
    for (const b of bad) {
      c.site.background = b;
      expect(validate(c).some((i) => /Background/.test(i.message)), b).toBe(true);
    }
    for (const ok of [undefined, "", "/images/uploads/background-ab12c.webp", "/images/armored-landscape.webp"]) {
      c.site.background = ok;
      expect(validate(c).filter((i) => /Background/.test(i.message)), String(ok)).toEqual([]);
    }
  });

  it("counts as a referenced image and falls back to the default", () => {
    const c = load();
    delete c.site.background;
    expect(backgroundOf(c.site)).toBe(DEFAULT_BACKGROUND);
    c.site.background = "/images/uploads/background-x.webp";
    expect(referencedImages(c).has("/images/uploads/background-x.webp")).toBe(true);
  });

  it("previews an unsaved upload", () => {
    const c = load();
    c.site.background = "/images/uploads/background-x.webp";
    const shown = withPendingImages(c, { "/images/uploads/background-x.webp": { dataUrl: "data:image/webp;base64,QQ", base64: "QQ" } });
    expect(shown.site.background).toBe("data:image/webp;base64,QQ");
    delete c.site.background;
    expect(withPendingImages(c, { "/images/uploads/x.webp": { dataUrl: "d", base64: "" } }).site).not.toHaveProperty("background");
  });

  it("the build uses the default when unset, and fails in CI on a bad or missing background", () => {
    const exists = (p: string) => p === "/images/uploads/ok.webp";
    expect(build.resolveBackground(undefined, exists, true)).toEqual({ path: DEFAULT_BACKGROUND });
    expect(build.resolveBackground("/images/uploads/ok.webp", exists, true)).toEqual({ path: "/images/uploads/ok.webp" });
    expect(() => build.resolveBackground("/images/uploads/missing.webp", exists, true)).toThrow(/does not exist/);
    expect(() => build.resolveBackground("/images/../x.webp", exists, true)).toThrow(/not a valid/);
    const local = build.resolveBackground("/images/uploads/missing.webp", exists, false);
    expect(local.path).toBe(DEFAULT_BACKGROUND);
    expect(local.warning).toMatch(/does not exist/);
  });
});
