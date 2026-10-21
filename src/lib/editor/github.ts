// Minimal GitHub REST client for the in-site editor. Runs in the browser and in Node (tests).
// Loads the editable files from the repo and saves a change set as one commit on an
// `edit/…` branch with a pull request into main.

export type RepoConfig = { owner: string; repo: string; base: string };

export const SITE_REPO: RepoConfig = { owner: "kinojms", repo: "kinojms.github.io", base: "main" };

export const DRAFT_PREFIX = "edit/";

export type ErrorKind = "auth" | "forbidden" | "notfound" | "conflict" | "ratelimit" | "network" | "other";

export class GitHubError extends Error {
  constructor(
    message: string,
    public kind: ErrorKind,
    public status = 0,
    public paths: string[] = [],
  ) {
    super(message);
    this.name = "GitHubError";
  }
}

export type LoadedFile = { text: string; sha: string };

export type DraftPR = { number: number; url: string; branch: string };

/** What the editor loaded, used both to diff edits and to detect conflicting changes. */
export type Snapshot = {
  branch: string;
  headSha: string;
  pr: DraftPR | null;
  /** Editable text files under content/. */
  files: Record<string, LoadedFile>;
  /** Blob SHAs of every file under public/images/ (contents are not downloaded). */
  images: Record<string, string>;
  loadedAt: string;
};

export type Write = { path: string; text?: string; base64?: string };

export type SaveRequest = {
  snapshot: Snapshot;
  writes: Write[];
  deletes: string[];
  /** Commit message and PR title. */
  title: string;
  /** Pull request description (Markdown). */
  body: string;
};

export type SaveResult = { branch: string; commitSha: string; pr: DraftPR; created: boolean };

type Fetch = typeof fetch;

const API = "https://api.github.com";

const isContentFile = (path: string) => /^content\/.+\.(json|md)$/.test(path);
const isImageFile = (path: string) => path.startsWith("public/images/");

function decodeBase64Utf8(b64: string): string {
  const bin = atob(b64.replace(/\s/g, ""));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function stamp(date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

export function createGitHub(token: string, repo: RepoConfig = SITE_REPO, fetchImpl: Fetch = fetch) {
  const base = `${API}/repos/${repo.owner}/${repo.repo}`;

  async function request<T = any>(method: string, path: string, body?: unknown): Promise<T> {
    let res: Response;
    try {
      res = await fetchImpl(path.startsWith("http") ? path : `${base}${path}`, {
        method,
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${token}`,
          "X-GitHub-Api-Version": "2022-11-28",
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store",
      });
    } catch {
      throw new GitHubError("Couldn't reach GitHub. Check your internet connection and try again.", "network");
    }
    if (res.ok) return (res.status === 204 ? null : await res.json()) as T;

    let detail = "";
    try {
      const data = await res.json();
      detail = data?.message || "";
    } catch {}
    if (res.status === 401)
      throw new GitHubError("GitHub didn't accept this token. It may have expired or been revoked — create a new one and sign in again.", "auth", 401);
    if ((res.status === 403 || res.status === 429) && /rate limit/i.test(detail))
      throw new GitHubError("GitHub's rate limit was reached. Wait a few minutes and try again.", "ratelimit", res.status);
    if (res.status === 403)
      throw new GitHubError("This token doesn't have permission for that. It needs Contents and Pull requests set to “Read and write” for this repository.", "forbidden", 403);
    if (res.status === 404) throw new GitHubError(detail || "Not found.", "notfound", 404);
    if (res.status === 409 || res.status === 422) throw new GitHubError(detail || "GitHub rejected the change.", "conflict", res.status);
    throw new GitHubError(`GitHub error ${res.status}${detail ? `: ${detail}` : ""}`, "other", res.status);
  }

  /** Confirms the token can write to the repository and returns the signed-in user. */
  async function checkAccess(): Promise<{ login: string }> {
    const info = await request<any>("GET", "");
    if (!info?.permissions?.push)
      throw new GitHubError(
        `This token can read ${repo.owner}/${repo.repo} but can't write to it. Give it Contents and Pull requests “Read and write”.`,
        "forbidden",
        403,
      );
    let login = repo.owner;
    try {
      login = (await request<any>("GET", `${API}/user`)).login;
    } catch {}
    return { login };
  }

  /** The open editor pull request, if any (one draft at a time). */
  async function findDraft(): Promise<DraftPR | null> {
    const pulls = await request<any[]>("GET", `/pulls?state=open&base=${encodeURIComponent(repo.base)}&per_page=100`);
    const mine = pulls
      .filter((p) => p.head?.repo?.full_name === `${repo.owner}/${repo.repo}` && String(p.head?.ref).startsWith(DRAFT_PREFIX))
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    return mine[0] ? { number: mine[0].number, url: mine[0].html_url, branch: mine[0].head.ref } : null;
  }

  async function headOf(branch: string): Promise<string> {
    const ref = await request<any>("GET", `/git/ref/heads/${branch.split("/").map(encodeURIComponent).join("/")}`);
    return ref.object.sha;
  }

  async function treeOf(commitSha: string): Promise<{ treeSha: string; entries: Record<string, string> }> {
    const commit = await request<any>("GET", `/git/commits/${commitSha}`);
    const tree = await request<any>("GET", `/git/trees/${commit.tree.sha}?recursive=1`);
    if (tree.truncated) throw new GitHubError("The repository is too large to read in one request.", "other");
    const entries: Record<string, string> = {};
    for (const e of tree.tree) if (e.type === "blob") entries[e.path] = e.sha;
    return { treeSha: commit.tree.sha, entries };
  }

  /** Load editable content from the open draft branch, or from the base branch. */
  async function load(): Promise<Snapshot> {
    const pr = await findDraft();
    const branch = pr?.branch ?? repo.base;
    const headSha = await headOf(branch);
    const { entries } = await treeOf(headSha);

    const paths = Object.keys(entries).filter(isContentFile);
    const texts = await mapLimit(paths, 6, async (path) => {
      const blob = await request<any>("GET", `/git/blobs/${entries[path]}`);
      return decodeBase64Utf8(blob.content);
    });
    const files: Record<string, LoadedFile> = {};
    paths.forEach((path, i) => (files[path] = { text: texts[i], sha: entries[path] }));

    const images: Record<string, string> = {};
    for (const [path, sha] of Object.entries(entries)) if (isImageFile(path)) images[path] = sha;

    return { branch, headSha, pr, files, images, loadedAt: new Date().toISOString() };
  }

  /** Paths whose current version differs from the version the edits were based on. */
  function conflicts(snapshot: Snapshot, current: Record<string, string>, paths: string[]): string[] {
    return paths.filter((path) => {
      const was = snapshot.files[path]?.sha ?? snapshot.images[path];
      return (current[path] ?? undefined) !== was;
    });
  }

  /** Raw file contents (base64) of a blob, e.g. an image that so far only exists on the draft branch. */
  async function blobBase64(sha: string): Promise<string> {
    const blob = await request<any>("GET", `/git/blobs/${sha}`);
    return String(blob.content).replace(/\s/g, "");
  }

  async function save(req: SaveRequest): Promise<SaveResult> {
    const { snapshot } = req;
    if (!req.writes.length && !req.deletes.length) throw new GitHubError("There are no changes to save.", "other");

    let head: string;
    try {
      head = await headOf(snapshot.branch);
    } catch (e) {
      if (e instanceof GitHubError && e.kind === "notfound")
        throw new GitHubError(
          "Your draft was merged or closed on GitHub since you opened the editor. Reload to start from the latest version.",
          "conflict",
          404,
        );
      throw e;
    }
    // If continuing a draft, make sure it's still open.
    if (snapshot.pr) {
      const pr = await request<any>("GET", `/pulls/${snapshot.pr.number}`);
      if (pr.state !== "open")
        throw new GitHubError("Your draft was merged or closed on GitHub. Reload to start from the latest version.", "conflict");
    }
    const current = await treeOf(head);
    const touched = [...req.writes.map((w) => w.path), ...req.deletes];
    if (head !== snapshot.headSha) {
      const changed = conflicts(snapshot, current.entries, touched);
      if (changed.length)
        throw new GitHubError(
          "Someone changed the same content on GitHub after you opened the editor. Reload to get the latest version, then redo your edits.",
          "conflict",
          409,
          changed,
        );
    }

    const blobs = await mapLimit(req.writes, 4, async (w) => {
      const blob = await request<any>(
        "POST",
        "/git/blobs",
        w.base64 != null ? { content: w.base64, encoding: "base64" } : { content: w.text ?? "", encoding: "utf-8" },
      );
      return { path: w.path, mode: "100644", type: "blob", sha: blob.sha as string | null };
    });
    const tree = await request<any>("POST", "/git/trees", {
      base_tree: current.treeSha,
      tree: [
        ...blobs,
        ...req.deletes.filter((p) => current.entries[p]).map((path) => ({ path, mode: "100644", type: "blob", sha: null })),
      ],
    });
    const commit = await request<any>("POST", "/git/commits", { message: req.title, tree: tree.sha, parents: [head] });

    if (snapshot.pr) {
      await request("PATCH", `/git/refs/heads/${snapshot.branch.split("/").map(encodeURIComponent).join("/")}`, {
        sha: commit.sha,
        force: false,
      });
      return { branch: snapshot.branch, commitSha: commit.sha, pr: snapshot.pr, created: false };
    }

    let branch = "";
    for (let attempt = 0; attempt < 4 && !branch; attempt++) {
      const name = `${DRAFT_PREFIX}${stamp()}-${Math.random().toString(36).slice(2, 6)}`;
      try {
        await request("POST", "/git/refs", { ref: `refs/heads/${name}`, sha: commit.sha });
        branch = name;
      } catch (e) {
        if (!(e instanceof GitHubError && e.kind === "conflict") || attempt === 3) throw e;
      }
    }
    const pr = await request<any>("POST", "/pulls", { title: req.title, head: branch, base: repo.base, body: req.body });
    return { branch, commitSha: commit.sha, pr: { number: pr.number, url: pr.html_url, branch }, created: true };
  }

  return { request, checkAccess, findDraft, load, save, blobBase64 };
}

export type GitHubClient = ReturnType<typeof createGitHub>;
