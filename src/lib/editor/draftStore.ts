// Unsaved editor work, kept in localStorage so closing the tab doesn't lose it.
// Never stores the GitHub token (that lives in sessionStorage only, see token.ts).
import type { PortfolioContent } from "@/lib/content/format";
import type { Snapshot } from "./github";
import type { PendingImages } from "./changes";

const KEY = "portfolio-editor-draft-v1";

const mimeOf = (path: string) => {
  const ext = path.split(".").pop()?.toLowerCase();
  return ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "png" ? "image/png" : "image/webp";
};

export type StoredDraft = {
  /** The repository state the edits were made on (used for diffing and conflict checks). */
  snapshot: Snapshot;
  content: PortfolioContent;
  pending: PendingImages;
  savedAt: string;
};

export function readDraft(): StoredDraft | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as StoredDraft;
    // Images are stored once (base64); rebuild their data URLs.
    for (const [path, img] of Object.entries(draft.pending || {})) img.dataUrl = `data:${mimeOf(path)};base64,${img.base64}`;
    return draft;
  } catch {
    return null;
  }
}

/** Returns false if the browser refused (e.g. storage full because of large images). */
export function writeDraft(draft: StoredDraft): boolean {
  try {
    const pending = Object.fromEntries(Object.entries(draft.pending).map(([p, i]) => [p, { dataUrl: "", base64: i.base64 }]));
    localStorage.setItem(KEY, JSON.stringify({ ...draft, pending }));
    return true;
  } catch {
    return false;
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
