import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { createFakeGitHub } from "./fake-github.mjs";
import { createGitHub, GitHubError, SITE_REPO, type Snapshot } from "./github";
import { computeChanges, pullRequestBody, rebaseEdits, snapshotContent, type PendingImages } from "./changes";
import { contentFiles, contentFromFiles, serializeJson, type PortfolioContent } from "@/lib/content/format";

function contentDir(): Record<string, string> {
  const files: Record<string, string> = {};
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else files[p.replace(/\\/g, "/")] = fs.readFileSync(p, "utf8");
    }
  };
  walk("content");
  return files;
}

// Every image file in the repo (tests must not depend on specific projects or avatars,
// because the content is edited from the site).
function imageFiles(dir = "public/images"): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = `${dir}/${e.name}`;
    return e.isDirectory() ? imageFiles(p) : /\.(png|jpe?g|webp|gif|avif)$/i.test(e.name) ? [p] : [];
  });
}
const IMAGES = imageFiles();
const current = () => contentFromFiles(contentDir());
/** The oldest project that has a cover under /images/projects/ (a safe one to "delete"). */
const victim = () => [...current().projects].reverse().find((p) => p.images[0]?.startsWith("/images/projects/"))!;

let fake: any;
let gh: ReturnType<typeof createGitHub>;

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const tiny = { dataUrl: "data:image/webp;base64,AAAA", base64: "AAAA" };

async function edit(snapshot: Snapshot, change: (c: PortfolioContent) => void, pending: PendingImages = {}) {
  const content = clone(snapshotContent(snapshot));
  change(content);
  const set = computeChanges(snapshot, content, pending);
  return { content, set, save: () => gh.save({ snapshot, ...set, title: "Edit", body: pullRequestBody(set.summary, "") }) };
}

beforeEach(() => {
  fake = createFakeGitHub({ files: contentDir(), images: IMAGES });
  gh = createGitHub("good", SITE_REPO, fake.fetch);
});

describe("load", () => {
  it("loads all content files and image paths from main", async () => {
    const snap = await gh.load();
    expect(snap.branch).toBe("main");
    expect(snap.pr).toBeNull();
    expect(Object.keys(snap.files).sort()).toEqual(Object.keys(contentDir()).sort());
    expect(snap.files["content/site.json"].text).toBe(contentDir()["content/site.json"]);
    expect(snap.images[`public${current().site.person.avatar}`]).toBeTruthy();
  });

  it("explains a bad or read-only token", async () => {
    await expect(createGitHub("bad", SITE_REPO, fake.fetch).checkAccess()).rejects.toMatchObject({ kind: "auth" });
    await expect(createGitHub("readonly", SITE_REPO, fake.fetch).checkAccess()).rejects.toMatchObject({ kind: "forbidden" });
    await expect(gh.checkAccess()).resolves.toEqual({ login: "kinojms" });
  });
});

describe("computeChanges", () => {
  it("reports nothing when nothing changed", async () => {
    const { set } = await edit(await gh.load(), () => {});
    expect(set).toEqual({ writes: [], deletes: [], summary: [] });
  });

  it("writes only changed files and summarises them", async () => {
    const { set } = await edit(await gh.load(), (c) => {
      c.home.headline = "New headline";
      c.projects[0].summary = "Changed";
    });
    const first = snapshotContent(await gh.load()).projects[0];
    expect(set.writes.map((w) => w.path).sort()).toEqual(["content/home.json", `content/projects/${first.slug}.md`]);
    expect(set.summary).toEqual(["Home page", `Edited project “${first.title}”`]);
  });

  it("adds new projects with their uploaded cover and deletes unused images", async () => {
    const snap = await gh.load();
    const gone = victim();
    const { set } = await edit(
      snap,
      (c) => {
        c.projects = c.projects.filter((p) => p.slug !== gone.slug);
        c.projects.push({ ...c.projects[0], slug: "bean-board", title: "The Bean Board", images: ["/images/uploads/bean.webp"], body: "Hi" });
      },
      { "/images/uploads/bean.webp": tiny, "/images/uploads/unused.webp": tiny },
    );
    expect(set.writes.map((w) => w.path).sort()).toEqual(["content/projects/bean-board.md", "public/images/uploads/bean.webp"]);
    expect(set.deletes.sort()).toEqual([`content/projects/${gone.slug}.md`, `public${gone.images[0]}`].sort());
    expect(set.summary).toContain("New project “The Bean Board”");
    expect(set.summary).toContain(`Deleted project “${gone.title}”`);
  });

  it("only ever deletes images in projects/ or uploads/ (never other avatars or site images)", async () => {
    const snap = await gh.load();
    const old = snapshotContent(snap).site.person.avatar;
    const { set } = await edit(snap, (c) => (c.site.person.avatar = "/images/uploads/me.webp"), { "/images/uploads/me.webp": tiny });
    const deletable = old.startsWith("/images/uploads/") || old.startsWith("/images/projects/");
    expect(set.deletes).toEqual(deletable ? [`public${old}`] : []);
    expect(set.writes.map((w) => w.path).sort()).toEqual(["content/site.json", "public/images/uploads/me.webp"]);
  });

  it("keeps images outside projects/ and uploads/ even when unused", async () => {
    // Point the avatar at a site image, then replace it: the site image must survive.
    const base = await gh.load();
    const site = JSON.parse(contentDir()["content/site.json"]);
    site.person.avatar = "/images/og/home.jpg";
    fake.state.commitDirect("main", { "content/site.json": serializeJson(site), "public/images/og/home.jpg": "img" });
    void base;
    const snap = await gh.load();
    const { set } = await edit(snap, (c) => (c.site.person.avatar = "/images/uploads/me.webp"), { "/images/uploads/me.webp": tiny });
    expect(set.deletes).toEqual([]);
  });
});

describe("save", () => {
  it("creates an edit/ branch, one commit and a pull request; main is untouched", async () => {
    const snap = await gh.load();
    const { save } = await edit(snap, (c) => (c.home.headline = "Hello"));
    const res = await save();
    expect(res.created).toBe(true);
    expect(res.branch).toMatch(/^edit\/\d{8}-\d{6}-[a-z0-9]{1,4}$/);
    expect(JSON.parse(fake.state.read(res.branch, "content/home.json")).headline).toBe("Hello");
    expect(fake.state.read("main", "content/home.json")).toBe(contentDir()["content/home.json"]);
    expect(fake.state.pulls).toHaveLength(1);
    expect(fake.state.pulls[0].body).toContain("- Home page");
  });

  it("continues the open draft instead of opening another, keeping earlier edits", async () => {
    let snap = await gh.load();
    await (await edit(snap, (c) => (c.home.headline = "First"))).save();
    snap = await gh.load();
    expect(snap.pr?.number).toBe(1);
    expect(snapshotContent(snap).home.headline).toBe("First");
    const res = await (await edit(snap, (c) => (c.home.subline = "Second"))).save();
    expect(res.created).toBe(false);
    expect(fake.state.pulls).toHaveLength(1);
    const home = JSON.parse(fake.state.read(res.branch, "content/home.json"));
    expect([home.headline, home.subline]).toEqual(["First", "Second"]);
  });

  it("blocks saving when the same file changed on GitHub after loading", async () => {
    const snap = await gh.load();
    const home = JSON.parse(contentDir()["content/home.json"]);
    home.headline = "Made on GitHub";
    fake.state.commitDirect("main", { "content/home.json": serializeJson(home) });
    const { save } = await edit(snap, (c) => (c.home.headline = "Mine"));
    await expect(save()).rejects.toMatchObject({ kind: "conflict", paths: ["content/home.json"] });
    expect(fake.state.pulls).toHaveLength(0);
  });

  it("allows saving when unrelated files changed, and keeps those changes", async () => {
    const snap = await gh.load();
    fake.state.commitDirect("main", { "README.md": "edited on GitHub" });
    const res = await (await edit(snap, (c) => (c.home.headline = "Mine"))).save();
    expect(fake.state.read(res.branch, "README.md")).toBe("edited on GitHub");
  });

  it("refuses to continue a draft that was merged meanwhile", async () => {
    let snap = await gh.load();
    await (await edit(snap, (c) => (c.home.headline = "First"))).save();
    snap = await gh.load();
    fake.state.mergePull(1);
    await expect((await edit(snap, (c) => (c.home.subline = "x"))).save()).rejects.toMatchObject({ kind: "conflict" });
  });

  it("removes deleted files and uploads binary images", async () => {
    const snap = await gh.load();
    const gone = victim();
    const replaced = current().projects.find((p) => p.slug !== gone.slug && p.images[0])!;
    const res = await (
      await edit(
        snap,
        (c) => {
          c.projects = c.projects.filter((p) => p.slug !== gone.slug);
          c.projects.find((p) => p.slug === replaced.slug)!.images = ["/images/uploads/new.webp"];
        },
        { "/images/uploads/new.webp": tiny },
      )
    ).save();
    expect(fake.state.has(res.branch, `content/projects/${gone.slug}.md`)).toBe(false);
    expect(fake.state.has(res.branch, `public${gone.images[0]}`)).toBe(false);
    const oldCover = replaced.images[0];
    const stillUsed = current().projects.some((p) => p.slug !== replaced.slug && p.images.includes(oldCover));
    const deletable = oldCover.startsWith("/images/projects/") || oldCover.startsWith("/images/uploads/");
    expect(fake.state.has(res.branch, `public${oldCover}`)).toBe(stillUsed || !deletable);
    expect(fake.state.has(res.branch, "public/images/uploads/new.webp")).toBe(true);
  });

  it("surfaces network and rate-limit errors in plain words", async () => {
    const snap = await gh.load();
    const { save } = await edit(snap, (c) => (c.home.headline = "x"));
    fake.state.failNext = { status: 403, message: "API rate limit exceeded" };
    await expect(save()).rejects.toMatchObject({ kind: "ratelimit" });
    const offline = createGitHub("good", SITE_REPO, (() => Promise.reject(new TypeError("Failed to fetch"))) as any);
    await expect(offline.load()).rejects.toBeInstanceOf(GitHubError);
    await expect(offline.load()).rejects.toMatchObject({ kind: "network" });
  });

  it("round-trips: saved files re-load to identical content", async () => {
    const snap = await gh.load();
    const { content, save } = await edit(snap, (c) => (c.about.sections[0].body += "\n\nMore *text* with “quotes”."));
    await save();
    const again = await gh.load();
    expect(contentFiles(snapshotContent(again))).toEqual(contentFiles(content));
  });
});

describe("review fixes", () => {
  it("save returns the next snapshot directly, identical to a fresh load", async () => {
    const snap = await gh.load();
    const res = await (await edit(snap, (c) => (c.home.headline = "Next"))).save();
    const loaded = await gh.load();
    expect({ ...res.snapshot, loadedAt: "" }).toEqual({ ...loaded, loadedAt: "" });
    expect(res.snapshot.pr?.number).toBe(1);
  });

  it("does not open a second PR even if GitHub's PR list lags right after saving", async () => {
    let snap = await gh.load();
    const first = await (await edit(snap, (c) => (c.home.headline = "One"))).save();
    // Simulate the lag: the PR list is empty for a moment.
    const pulls = fake.state.pulls;
    fake.state.pulls = [];
    snap = first.snapshot; // what the editor continues from
    fake.state.pulls = pulls;
    const second = await (await edit(snap, (c) => (c.home.subline = "Two"))).save();
    expect(second.created).toBe(false);
    expect(fake.state.pulls).toHaveLength(1);
  });

  it("removes the new branch if opening the pull request fails", async () => {
    const snap = await gh.load();
    const { save } = await edit(snap, (c) => (c.home.headline = "x"));
    const real = fake.fetch;
    const wrapped = async (input: any, init: any = {}) =>
      String(input).endsWith("/pulls") && init.method === "POST" ? new Response(JSON.stringify({ message: "Validation Failed" }), { status: 422 }) : real(input, init);
    gh = createGitHub("good", SITE_REPO, wrapped as any);
    await expect(gh.save({ snapshot: snap, ...(await edit(snap, (c) => (c.home.headline = "x"))).set, title: "t", body: "" })).rejects.toMatchObject({ kind: "other" });
    expect(Object.keys(fake.state.refs).filter((r) => r.startsWith("edit/"))).toEqual([]);
    void save;
  });

  it("explains a write the token isn't allowed to make (404 on POST)", async () => {
    const snap = await gh.load();
    fake.state.failNext = null;
    const real = fake.fetch;
    gh = createGitHub("good", SITE_REPO, (async (input: any, init: any = {}) =>
      init.method === "POST" ? new Response(JSON.stringify({ message: "Not Found" }), { status: 404 }) : real(input, init)) as any);
    const { set } = await edit(snap, (c) => (c.home.headline = "x"));
    await expect(gh.save({ snapshot: snap, ...set, title: "t", body: "" })).rejects.toMatchObject({ kind: "forbidden" });
  });

  it("rebases unsaved edits onto a newer version when the touched files didn't change", async () => {
    const base = await gh.load();
    const content = clone(snapshotContent(base));
    content.home.headline = "Mine";
    // Someone renames an About section on GitHub (independent of the current wording).
    const about = JSON.parse(contentDir()["content/about.json"]);
    about.sections[1].heading = "From GitHub";
    fake.state.commitDirect("main", { "content/about.json": serializeJson(about) });
    const fresh = await gh.load();
    const rebased = rebaseEdits(base, content, {}, fresh)!;
    expect(rebased.home.headline).toBe("Mine");
    expect(rebased.about.sections[1].heading).toBe("From GitHub"); // GitHub's change kept
    expect(computeChanges(fresh, rebased, {}).writes.map((w) => w.path)).toEqual(["content/home.json"]);
  });

  it("refuses to rebase when a touched file changed on GitHub", async () => {
    const base = await gh.load();
    const content = clone(snapshotContent(base));
    content.home.headline = "Mine";
    const home = JSON.parse(contentDir()["content/home.json"]);
    home.headline = "Changed on GitHub";
    fake.state.commitDirect("main", { "content/home.json": serializeJson(home) });
    expect(rebaseEdits(base, content, {}, await gh.load())).toBeNull();
  });
});


describe("background image", () => {
  const uploaded = (name: string) => `/images/uploads/${name}.webp`;

  it("uploads a new background with the draft and lists it in the summary", async () => {
    const { set } = await edit(await gh.load(), (c) => (c.site.background = uploaded("bg-a")), { [uploaded("bg-a")]: tiny });
    expect(set.writes.map((w) => w.path).sort()).toEqual(["content/site.json", `public${uploaded("bg-a")}`]);
    // Replacing an earlier uploaded background deletes it; the default is never deleted.
    const old = current().site.background;
    expect(set.deletes).toEqual(old?.startsWith("/images/uploads/") ? [`public${old}`] : []);
    const site = JSON.parse(set.writes.find((w) => w.path === "content/site.json")!.text!);
    expect(site.background).toBe(uploaded("bg-a"));
  });

  it("deletes a replaced or reset upload, never the default, and keeps one still used as the avatar", async () => {
    const site = JSON.parse(contentDir()["content/site.json"]);
    site.background = uploaded("bg-a");
    fake.state.commitDirect("main", { "content/site.json": serializeJson(site), [`public${uploaded("bg-a")}`]: "img" });
    const snap = await gh.load();

    const replaced = await edit(snap, (c) => (c.site.background = uploaded("bg-b")), { [uploaded("bg-b")]: tiny });
    expect(replaced.set.deletes).toEqual([`public${uploaded("bg-a")}`]);

    const reset = await edit(snap, (c) => void delete c.site.background);
    expect(reset.set.deletes).toEqual([`public${uploaded("bg-a")}`]);
    expect(JSON.parse(reset.set.writes[0].text!)).not.toHaveProperty("background");

    const shared = await edit(snap, (c) => {
      c.site.person.avatar = uploaded("bg-a");
      delete c.site.background;
    });
    expect(shared.set.deletes).not.toContain(`public${uploaded("bg-a")}`);
  });

  it("keeps an unsaved background edit when the draft is rebased onto newer content", async () => {
    const base = await gh.load();
    const content = clone(snapshotContent(base));
    content.site.background = uploaded("bg-a");
    const home = JSON.parse(contentDir()["content/home.json"]);
    home.headline = "Changed on GitHub";
    fake.state.commitDirect("main", { "content/home.json": serializeJson(home) });
    const fresh = await gh.load();
    const rebased = rebaseEdits(base, content, { [uploaded("bg-a")]: tiny }, fresh)!;
    expect(rebased.site.background).toBe(uploaded("bg-a"));
    expect(rebased.home.headline).toBe("Changed on GitHub");
  });
});
