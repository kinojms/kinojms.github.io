// Turns the editor's in-memory content into the minimal set of repository writes/deletes.
import {
  contentFiles,
  contentFromFiles,
  imageRepoPath,
  JSON_FILES,
  PROJECTS_DIR,
  referencedImages,
  type PortfolioContent,
} from "@/lib/content/format";
import type { Snapshot, Write } from "./github";

/** Images uploaded in the editor but not saved yet, keyed by public path (/images/…). */
export type PendingImages = Record<string, { dataUrl: string; base64: string }>;

export type ChangeSet = { writes: Write[]; deletes: string[]; summary: string[] };

/** Upload folder for new images. Only images in these folders are ever deleted. */
export const UPLOAD_DIR = "/images/uploads";
const DELETABLE = ["/images/projects/", `${UPLOAD_DIR}/`];

export function snapshotContent(snapshot: Snapshot): PortfolioContent {
  return contentFromFiles(Object.fromEntries(Object.entries(snapshot.files).map(([p, f]) => [p, f.text])));
}

export function computeChanges(snapshot: Snapshot, content: PortfolioContent, pending: PendingImages): ChangeSet {
  const before = snapshotContent(snapshot);
  const files = contentFiles(content);
  const writes: Write[] = [];
  const deletes: string[] = [];
  const summary: string[] = [];

  for (const [path, text] of Object.entries(files)) {
    if (snapshot.files[path]?.text !== text) writes.push({ path, text });
  }
  for (const path of Object.keys(snapshot.files)) {
    if (path.startsWith(`${PROJECTS_DIR}/`) && !(path in files)) deletes.push(path);
  }

  // Images: add uploads that are still used; remove project/upload images nobody uses anymore.
  const nowUsed = referencedImages(content);
  const wasUsed = referencedImages(before);
  for (const [publicPath, img] of Object.entries(pending)) {
    if (nowUsed.has(publicPath) && !snapshot.images[imageRepoPath(publicPath)])
      writes.push({ path: imageRepoPath(publicPath), base64: img.base64 });
  }
  let removedImages = 0;
  for (const publicPath of wasUsed) {
    const repoPath = imageRepoPath(publicPath);
    if (!nowUsed.has(publicPath) && DELETABLE.some((d) => publicPath.startsWith(d)) && snapshot.images[repoPath]) {
      deletes.push(repoPath);
      removedImages++;
    }
  }

  // Human-readable summary for the save screen and the pull request.
  const changed = new Set(writes.map((w) => w.path));
  if (changed.has(JSON_FILES.site)) summary.push("Profile and links");
  if (changed.has(JSON_FILES.home)) summary.push("Home page");
  if (changed.has(JSON_FILES.about)) summary.push("About page");
  if (changed.has(JSON_FILES.work)) summary.push("Projects page title/description");
  const oldSlugs = new Set(before.projects.map((p) => p.slug));
  for (const p of content.projects) {
    const path = `${PROJECTS_DIR}/${p.slug}.md`;
    if (!changed.has(path)) continue;
    summary.push(oldSlugs.has(p.slug) ? `Edited project “${p.title}”` : `New project “${p.title}”`);
  }
  for (const path of deletes.filter((d) => d.startsWith(`${PROJECTS_DIR}/`))) {
    const slug = path.slice(PROJECTS_DIR.length + 1, -3);
    const title = before.projects.find((p) => p.slug === slug)?.title || slug;
    summary.push(`Deleted project “${title}”`);
  }
  const added = writes.filter((w) => w.base64 != null).length;
  if (added) summary.push(`${added} new image${added > 1 ? "s" : ""}`);
  if (removedImages) summary.push(`${removedImages} unused image${removedImages > 1 ? "s" : ""} removed`);

  return { writes, deletes, summary };
}

/**
 * Move unsaved edits made on an older version (`base`) onto the latest version (`fresh`).
 * Only the files the edits touched are carried over, so changes made on GitHub to other
 * files are kept. Returns null if any touched file also changed on GitHub (a real conflict).
 */
export function rebaseEdits(base: Snapshot, content: PortfolioContent, pending: PendingImages, fresh: Snapshot): PortfolioContent | null {
  const { writes, deletes } = computeChanges(base, content, pending);
  const touched = [...writes.map((w) => w.path), ...deletes];
  for (const path of touched) {
    const was = base.files[path]?.sha ?? base.images[path];
    const now = fresh.files[path]?.sha ?? fresh.images[path];
    if (was !== now) return null;
  }
  const files: Record<string, string> = Object.fromEntries(Object.entries(fresh.files).map(([p, f]) => [p, f.text]));
  for (const w of writes) if (w.text != null) files[w.path] = w.text;
  for (const d of deletes) delete files[d];
  return contentFromFiles(files);
}

export function pullRequestBody(summary: string[], note: string): string {
  return [
    note.trim() || "Edited from the in-site editor.",
    "",
    "**Changes**",
    ...summary.map((s) => `- ${s}`),
    "",
    "---",
    "Saved from https://kinojms.github.io/edit/. Merge this pull request to publish the changes; " +
      "the site updates about a minute later. Close it to throw the draft away.",
  ].join("\n");
}
