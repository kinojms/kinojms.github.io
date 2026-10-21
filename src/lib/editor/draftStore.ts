// Unsaved editor work, kept in localStorage so closing the tab doesn't lose it.
// Never stores the GitHub token (that lives in sessionStorage only, see token.ts).
import type { PortfolioContent } from "@/lib/content/format";
import type { Snapshot } from "./github";
import type { PendingImages } from "./changes";

const KEY = "portfolio-editor-draft-v1";

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
    return raw ? (JSON.parse(raw) as StoredDraft) : null;
  } catch {
    return null;
  }
}

/** Returns false if the browser refused (e.g. storage full because of large images). */
export function writeDraft(draft: StoredDraft): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(draft));
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
