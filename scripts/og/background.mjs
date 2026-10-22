// Which background image the build should use. Pure (no file access) so it can be unit-tested.
// Keep DEFAULT_BACKGROUND and BACKGROUND_RE in sync with src/lib/content/format.ts.
export const DEFAULT_BACKGROUND = "/images/armored-landscape.webp";
export const BACKGROUND_RE = /^\/images\/[\w\-/]+\.(webp|jpe?g|png)$/;

/**
 * @param {unknown} configured  site.background from content/site.json (may be undefined)
 * @param {(publicPath: string) => boolean} exists  whether public/<path> exists
 * @param {boolean} strict  true in CI: a bad or missing background fails the build so a broken
 *   reference is never deployed (GitHub Pages keeps the previous site live instead).
 * @returns {{ path: string, warning?: string }}
 */
export function resolveBackground(configured, exists, strict) {
  if (configured === undefined || configured === null || configured === "") return { path: DEFAULT_BACKGROUND };
  const problem =
    typeof configured !== "string" || !BACKGROUND_RE.test(configured)
      ? `site.background "${String(configured)}" is not a valid image path`
      : !exists(configured)
        ? `site.background "${configured}" does not exist in public/`
        : null;
  if (!problem) return { path: configured };
  if (strict) throw new Error(problem);
  return { path: DEFAULT_BACKGROUND, warning: `${problem}; using the default background for this local build` };
}
