// Messages between the editor (/edit/) and its preview iframe (/edit/preview/).
import type { PortfolioContent } from "@/lib/content/format";
import type { PendingImages } from "./changes";

export type PreviewView =
  | { kind: "home" }
  | { kind: "about" }
  | { kind: "work" }
  | { kind: "project"; slug: string };

export type ToPreview = { type: "pe:update"; view: PreviewView; content: PortfolioContent };
export type FromPreview = { type: "pe:ready" } | { type: "pe:navigate"; view: PreviewView };

export function viewForPath(pathname: string): PreviewView | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return { kind: "home" };
  if (path === "/about") return { kind: "about" };
  if (path === "/work") return { kind: "work" };
  const m = path.match(/^\/work\/([^/]+)$/);
  return m ? { kind: "project", slug: decodeURIComponent(m[1]) } : null;
}

export function sameView(a: PreviewView, b: PreviewView) {
  return a.kind === b.kind && (a.kind !== "project" || a.slug === (b as { slug: string }).slug);
}

/** Swap not-yet-saved image paths for their in-memory data URLs. */
export function withPendingImages(content: PortfolioContent, pending: PendingImages): PortfolioContent {
  const paths = Object.keys(pending);
  if (!paths.length) return content;
  const swap = (s: string) => (pending[s] ? pending[s].dataUrl : s);
  const swapText = (text: string) => paths.reduce((t, p) => t.split(`](${p}`).join(`](${pending[p].dataUrl}`), text);
  return {
    ...content,
    site: {
      ...content.site,
      person: { ...content.site.person, avatar: swap(content.site.person.avatar) },
      ...(content.site.background ? { background: swap(content.site.background) } : {}),
    },
    about: { ...content.about, sections: content.about.sections.map((s) => ({ ...s, body: swapText(s.body) })) },
    projects: content.projects.map((p) => ({ ...p, images: p.images.map(swap), body: swapText(p.body) })),
  };
}
