// End-to-end test against the real GitHub API, using a throwaway practice repository.
// Skipped unless PRACTICE_TOKEN (and optionally PRACTICE_REPO=owner/name) are set:
//   PRACTICE_TOKEN=$(gh auth token) PRACTICE_REPO=kinojms/portfolio-editor-test npx vitest run github.live
import { describe, expect, it } from "vitest";
import { createGitHub, type RepoConfig } from "./github";
import { computeChanges, pullRequestBody, snapshotContent } from "./changes";

const token = process.env.PRACTICE_TOKEN;
const [owner, repo] = (process.env.PRACTICE_REPO || "kinojms/portfolio-editor-test").split("/");
const REPO: RepoConfig = { owner, repo, base: "main" };

describe.skipIf(!token)("live GitHub (practice repo)", () => {
  const gh = createGitHub(token!, REPO);
  const api = (method: string, path: string, body?: unknown) => gh.request(method, path, body);
  const stamp = new Date().toISOString();
  /** Pull-request summaries (files/commits) update a few seconds after a push: poll them. */
  async function eventually<T>(read: () => Promise<T>, check: (v: T) => boolean, ms = 30_000): Promise<T> {
    const end = Date.now() + ms;
    let v = await read();
    while (!check(v) && Date.now() < end) {
      await new Promise((r) => setTimeout(r, 2000));
      v = await read();
    }
    return v;
  }
  /** Paths on a branch, read straight from git (no caching). */
  async function branchFiles(branch: string): Promise<Set<string>> {
    const ref = await api("GET", `/git/ref/heads/${branch}`);
    const commit = await api("GET", `/git/commits/${ref.object.sha}`);
    const tree = await api("GET", `/git/trees/${commit.tree.sha}?recursive=1`);
    return new Set(tree.tree.filter((e: any) => e.type === "blob").map((e: any) => e.path));
  }
  let firstPr = 0;

  it("checks access and loads main", async () => {
    await expect(gh.checkAccess()).resolves.toMatchObject({ login: expect.any(String) });
    const snap = await gh.load();
    expect(snap.branch).toBe("main");
    expect(Object.keys(snap.files)).toContain("content/site.json");
    expect(snap.images["public/images/projects/gastos-io.png"]).toBeTruthy();
  }, 60_000);

  it("saves a new draft: branch + commit + pull request, main untouched", async () => {
    const snap = await gh.load();
    const content = structuredClone(snapshotContent(snap));
    content.home.headline = `Live test ${stamp}`;
    content.projects.push({ ...content.projects[0], slug: "live-test", title: "Live test project", images: ["/images/uploads/live-test.webp"], body: "Created by the live test." });
    // 1×1 WebP
    const pending = { "/images/uploads/live-test.webp": { dataUrl: "", base64: "UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA" } };
    const set = computeChanges(snap, content, pending);
    const res = await gh.save({ snapshot: snap, ...set, title: "Live test: new draft", body: pullRequestBody(set.summary, "live test") });
    expect(res.created).toBe(true);
    firstPr = res.pr.number;
    const pr = await api("GET", `/pulls/${firstPr}`);
    expect(pr.state).toBe("open");
    expect(pr.head.ref).toBe(res.branch);
    const files = await api("GET", `/pulls/${firstPr}/files`);
    expect(files.map((f: any) => f.filename).sort()).toEqual(["content/home.json", "content/projects/live-test.md", "public/images/uploads/live-test.webp"]);
    const mainSnap = await gh.load(); // now picks up the draft
    expect(mainSnap.pr?.number).toBe(firstPr);
    expect(snapshotContent(mainSnap).home.headline).toBe(`Live test ${stamp}`);
  }, 120_000);

  it("continues the same draft on the next save", async () => {
    const snap = await gh.load();
    const content = structuredClone(snapshotContent(snap));
    content.about.hero.caption = `Caption ${stamp}`;
    const set = computeChanges(snap, content, {});
    expect(set.summary).toEqual(["About page"]);
    const res = await gh.save({ snapshot: snap, ...set, title: "Live test: second save", body: "" });
    expect(res.created).toBe(false);
    expect(res.pr.number).toBe(firstPr);
    const commits = await eventually(() => api("GET", `/pulls/${firstPr}/commits`), (c: any[]) => c.length === 2);
    expect(commits.length).toBe(2);
  }, 120_000);

  it("blocks a save when the same file changed on GitHub meanwhile", async () => {
    const snap = await gh.load();
    // Someone edits about.json directly on the draft branch.
    const current = await api("GET", `/contents/content/about.json?ref=${encodeURIComponent(snap.branch)}`);
    const text = new TextDecoder().decode(Uint8Array.from(atob(current.content.replace(/\s/g, "")), (c) => c.charCodeAt(0)));
    await api("PUT", "/contents/content/about.json", {
      message: "Edit on GitHub (live test)",
      content: btoa(String.fromCharCode(...new TextEncoder().encode(text.replace("Caption", "Changed on GitHub")))),
      sha: current.sha,
      branch: snap.branch,
    });
    const content = structuredClone(snapshotContent(snap));
    content.about.hero.eyebrow = "Conflicting edit";
    const set = computeChanges(snap, content, {});
    await expect(gh.save({ snapshot: snap, ...set, title: "should fail", body: "" })).rejects.toMatchObject({
      kind: "conflict",
      paths: ["content/about.json"],
    });
  }, 120_000);

  it("deletes a project and its unused upload", async () => {
    const snap = await gh.load();
    const content = structuredClone(snapshotContent(snap));
    content.projects = content.projects.filter((p) => p.slug !== "live-test");
    const set = computeChanges(snap, content, {});
    expect(set.deletes.sort()).toEqual(["content/projects/live-test.md", "public/images/uploads/live-test.webp"]);
    const res = await gh.save({ snapshot: snap, ...set, title: "Live test: delete", body: "" });
    const onBranch = await branchFiles(res.branch);
    expect(onBranch.has("content/projects/live-test.md")).toBe(false);
    expect(onBranch.has("public/images/uploads/live-test.webp")).toBe(false);
    expect(onBranch.has("content/projects/gastos-io.md")).toBe(true);
    const files = await eventually(() => api("GET", `/pulls/${firstPr}/files`), (f: any[]) => f.length === 2);
    expect(files.map((f: any) => f.filename).sort()).toEqual(["content/about.json", "content/home.json"]);
  }, 120_000);

  it("cleans up: closes the PR and deletes the branch", async () => {
    const pr = await api("GET", `/pulls/${firstPr}`);
    await api("PATCH", `/pulls/${firstPr}`, { state: "closed" });
    await api("DELETE", `/git/refs/heads/${pr.head.ref}`);
    expect((await gh.findDraft())).toBeNull();
  }, 60_000);
});
