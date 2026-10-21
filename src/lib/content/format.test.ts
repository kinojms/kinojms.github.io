import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  contentFiles,
  contentFromFiles,
  parseProject,
  referencedImages,
  serializeProject,
  slugify,
  sortProjects,
  validate,
  type PortfolioContent,
} from "./format";

function repoFiles(): Record<string, string> {
  const files: Record<string, string> = {};
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else files[p.replace(/\\/g, "/")] = fs.readFileSync(p, "utf8");
    }
  };
  walk("content");
  return files;
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

describe("content round trip", () => {
  it("re-serializes every content file byte-for-byte", () => {
    const files = repoFiles();
    const again = contentFiles(contentFromFiles(files));
    expect(Object.keys(again).sort()).toEqual(Object.keys(files).sort());
    for (const [p, text] of Object.entries(files)) expect(again[p], p).toBe(text);
  });

  it("uses LF line endings in content files", () => {
    for (const [p, text] of Object.entries(repoFiles())) expect(text.includes("\r"), p).toBe(false);
  });
});

describe("parseProject", () => {
  it("reads JSON and hand-written YAML scalars, CRLF and missing fields", () => {
    const p = parseProject("---\r\ntitle: My app\r\nsummary: 'It''s fast'\r\nimages: [\"/a.png\"]\r\n---\r\n\r\n# Hi\r\n", "my-app");
    expect(p).toMatchObject({ slug: "my-app", title: "My app", summary: "It's fast", images: ["/a.png"], link: "", body: "# Hi\n" });
  });

  it("treats a file without front-matter as body only", () => {
    expect(parseProject("Just text", "x")).toMatchObject({ title: "", body: "Just text" });
  });

  it("keeps optional coverAlt only when set", () => {
    const base = parseProject("---\ntitle: \"A\"\n---\n\nBody", "a");
    expect(serializeProject(base)).not.toContain("coverAlt");
    expect(serializeProject({ ...base, coverAlt: "A screenshot" })).toContain('coverAlt: "A screenshot"');
  });

  it("escapes quotes and newlines in values safely", () => {
    const p = { ...parseProject("", "q"), title: 'Say "hi"\nthere', summary: "s", publishedAt: "2026-01-01" };
    expect(parseProject(serializeProject(p), "q").title).toBe('Say "hi"\nthere');
  });
});

describe("helpers", () => {
  it("sorts newest first, undated last", () => {
    const mk = (slug: string, publishedAt: string) => ({ ...parseProject("", slug), title: slug, publishedAt });
    expect(sortProjects([mk("a", "2024-01-01"), mk("b", ""), mk("c", "2026-01-01")]).map((p) => p.slug)).toEqual(["c", "a", "b"]);
  });

  it("slugifies titles", () => {
    expect(slugify("Gastos.io — Café & Co!")).toBe("gastos-io-cafe-and-co");
  });

  it("finds referenced images including Markdown bodies", () => {
    const c = contentFromFiles(repoFiles());
    c.projects[0].body += "\n![shot](/images/projects/extra.png)";
    const refs = referencedImages(c);
    expect(refs.has("/images/justin-avatar.png")).toBe(true);
    expect(refs.has("/images/projects/gastos-io.png")).toBe(true);
    expect(refs.has("/images/projects/extra.png")).toBe(true);
  });
});

describe("validate", () => {
  const good = (): PortfolioContent => contentFromFiles(repoFiles());

  it("accepts the current content", () => {
    expect(validate(good())).toEqual([]);
  });

  it("flags missing fields, bad links, duplicate slugs, bad dates and a dangling featured link", () => {
    const c = clone(good());
    c.site.person.name = " ";
    c.site.social[0].link = "javascript:alert(1)";
    c.projects[1].slug = c.projects[0].slug;
    c.projects[2].publishedAt = "Oct 2026";
    c.projects[4].publishedAt = "2026-02-30";
    c.projects[3].slug = "Bad Slug";
    c.home.featured.href = "/work/nope";
    const messages = validate(c).map((i) => i.message).join("\n");
    expect(messages).toMatch(/Name is required/);
    expect(messages).toMatch(/needs a full URL/);
    expect(messages).toMatch(/already uses the web address/);
    expect(messages).toMatch(/Date must look like/);
    expect(validate(c).filter((i) => /Date must/.test(i.message))).toHaveLength(2);
    expect(messages).toMatch(/lowercase letters/);
    expect(messages).toMatch(/doesn't exist/);
  });
});
