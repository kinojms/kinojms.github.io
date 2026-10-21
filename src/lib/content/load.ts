import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import { contentFromFiles, CONTENT_DIR, type PortfolioContent, type Project } from "./format";

/** Read every file under content/ (build time only). */
export const loadContent = cache((): PortfolioContent => {
  const root = path.join(/* turbopackIgnore: true */ process.cwd(), CONTENT_DIR);
  const files: Record<string, string> = {};
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(json|md)$/.test(entry.name)) {
        const rel = `${CONTENT_DIR}/${path.relative(root, full).replace(/\\/g, "/")}`;
        files[rel] = fs.readFileSync(full, "utf8");
      }
    }
  };
  walk(root);
  return contentFromFiles(files);
});

export const loadProjects = (): Project[] => loadContent().projects;

export const findProject = (slug: string): Project | undefined =>
  loadProjects().find((p) => p.slug === slug);
