// Portfolio content: types plus a parser/serializer shared by the build (Node) and the
// in-browser editor. Keep this module free of Node and React imports.

export type SocialLink = { name: string; icon: string; link: string; essential?: boolean };

export type SiteContent = {
  person: {
    firstName: string;
    lastName: string;
    name: string;
    role: string;
    avatar: string;
    email: string;
    location: string;
    languages: string[];
  };
  social: SocialLink[];
};

export type HomeContent = {
  title: string;
  description: string;
  headline: string;
  subline: string;
  featured: { display: boolean; title: string; href: string };
};

export type AboutSection = { label: string; heading: string; body: string; tags: string[] };

export type AboutContent = {
  title: string;
  description: string;
  hero: { eyebrow: string; headline: string; accent: string; lede: string; caption: string };
  sections: AboutSection[];
  contact: { label: string; heading: string; body: string };
};

export type WorkContent = { title: string; description: string };

export type Project = {
  slug: string;
  title: string;
  publishedAt: string;
  summary: string;
  images: string[];
  link: string;
  coverAlt: string;
  body: string;
};

export type PortfolioContent = {
  site: SiteContent;
  home: HomeContent;
  about: AboutContent;
  work: WorkContent;
  projects: Project[];
};

export const CONTENT_DIR = "content";
export const PROJECTS_DIR = `${CONTENT_DIR}/projects`;
export const JSON_FILES = {
  site: `${CONTENT_DIR}/site.json`,
  home: `${CONTENT_DIR}/home.json`,
  about: `${CONTENT_DIR}/about.json`,
  work: `${CONTENT_DIR}/work.json`,
} as const;

export const projectPath = (slug: string) => `${PROJECTS_DIR}/${slug}.md`;

// ---------------------------------------------------------------------------------------
// Project files: "---" front-matter with one `key: <JSON value>` per line, then Markdown.
// JSON values are valid YAML, so the files stay readable and hand-editable.

const PROJECT_KEYS = ["title", "publishedAt", "summary", "images", "link", "coverAlt"] as const;

function parseValue(raw: string): unknown {
  const value = raw.trim();
  if (value === "") return "";
  try {
    return JSON.parse(value);
  } catch {
    // Hand-written YAML scalars such as `title: My project` or `title: 'My project'`.
    const quoted = value.match(/^'(.*)'$/);
    return quoted ? quoted[1].replace(/''/g, "'") : value;
  }
}

export function parseProject(text: string, slug: string): Project {
  const src = text.replace(/\r\n?/g, "\n");
  const data: Record<string, unknown> = {};
  let body = src;
  if (src.startsWith("---\n")) {
    const end = src.indexOf("\n---\n", 3);
    const endAtEof = end === -1 && src.endsWith("\n---") ? src.length - 4 : -1;
    const close = end !== -1 ? end : endAtEof;
    if (close !== -1) {
      for (const line of src.slice(4, close).split("\n")) {
        const m = line.match(/^([A-Za-z_][\w-]*):(.*)$/);
        if (m) data[m[1]] = parseValue(m[2]);
      }
      body = end !== -1 ? src.slice(end + 5) : "";
      if (body.startsWith("\n")) body = body.slice(1);
    }
  }
  const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
  const images = Array.isArray(data.images)
    ? data.images.map(str).filter(Boolean)
    : data.image
      ? [str(data.image)]
      : [];
  return {
    slug,
    title: str(data.title),
    publishedAt: str(data.publishedAt),
    summary: str(data.summary),
    images,
    link: str(data.link),
    coverAlt: str(data.coverAlt),
    body,
  };
}

export function serializeProject(project: Project): string {
  const lines: string[] = [];
  for (const key of PROJECT_KEYS) {
    const value = project[key];
    if (key === "coverAlt" && !value) continue; // optional
    lines.push(`${key}: ${JSON.stringify(value)}`);
  }
  const body = project.body.replace(/\r\n?/g, "\n");
  return `---\n${lines.join("\n")}\n---\n\n${body}`;
}

export const serializeJson = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

/** Newest first, like the original site. Undated projects go last; ties keep title order. */
export function sortProjects(projects: Project[]): Project[] {
  const time = (p: Project) => {
    const t = Date.parse(p.publishedAt);
    return Number.isNaN(t) ? -Infinity : t;
  };
  return [...projects].sort((a, b) => time(b) - time(a) || a.title.localeCompare(b.title));
}

/** Every file the content produces, keyed by repository path. */
export function contentFiles(content: PortfolioContent): Record<string, string> {
  const files: Record<string, string> = {
    [JSON_FILES.site]: serializeJson(content.site),
    [JSON_FILES.home]: serializeJson(content.home),
    [JSON_FILES.about]: serializeJson(content.about),
    [JSON_FILES.work]: serializeJson(content.work),
  };
  for (const project of content.projects) files[projectPath(project.slug)] = serializeProject(project);
  return files;
}

/** Parse repository files (path → text) back into content. */
export function contentFromFiles(files: Record<string, string>): PortfolioContent {
  const json = <T,>(path: string): T => {
    if (!(path in files)) throw new Error(`Missing ${path}`);
    return JSON.parse(files[path]) as T;
  };
  const projects = Object.entries(files)
    .filter(([path]) => path.startsWith(`${PROJECTS_DIR}/`) && path.endsWith(".md"))
    .map(([path, text]) => parseProject(text, path.slice(PROJECTS_DIR.length + 1, -3)));
  return {
    site: json(JSON_FILES.site),
    home: json(JSON_FILES.home),
    about: json(JSON_FILES.about),
    work: json(JSON_FILES.work),
    projects: sortProjects(projects),
  };
}

/** Public image paths (e.g. "/images/projects/x.webp") referenced anywhere in the content. */
export function referencedImages(content: PortfolioContent): Set<string> {
  const refs = new Set<string>();
  const add = (s: string) => {
    if (s && s.startsWith("/images/")) refs.add(s);
  };
  add(content.site.person.avatar);
  for (const p of content.projects) p.images.forEach(add);
  // Images used inside Markdown bodies, e.g. ![alt](/images/projects/shot.png)
  const md = [content.about.sections.map((s) => s.body).join("\n"), ...content.projects.map((p) => p.body)];
  for (const text of md) for (const m of text.matchAll(/\]\((\/images\/[^)\s]+)/g)) add(m[1]);
  return refs;
}

export const imageRepoPath = (publicPath: string) => `public${publicPath}`;

// ---------------------------------------------------------------------------------------
// Validation

export type ValidationIssue = { where: string; message: string };

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

function isUrl(value: string, { allowMailto = false, allowInternal = false } = {}) {
  if (allowInternal && /^\/(?!\/)/.test(value)) return true;
  if (allowMailto && /^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return true;
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export function validate(content: PortfolioContent): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const need = (where: string, value: string, label: string) => {
    if (!value || !value.trim()) issues.push({ where, message: `${label} is required.` });
  };
  const { site, home, about, work, projects } = content;

  need("Profile", site.person.name, "Name");
  need("Profile", site.person.role, "Role");
  if (site.person.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(site.person.email))
    issues.push({ where: "Profile", message: "Email address doesn't look right." });
  site.social.forEach((s, i) => {
    need("Profile", s.name, `Link ${i + 1} name`);
    if (!isUrl(s.link, { allowMailto: true }))
      issues.push({ where: "Profile", message: `Link "${s.name || i + 1}" needs a full URL (https://…) or mailto: address.` });
  });

  need("Home", home.title, "Page title");
  need("Home", home.headline, "Headline");
  if (home.featured.display) {
    need("Home", home.featured.title, "Featured badge text");
    const m = home.featured.href.match(/^\/work\/([^/]+)\/?$/);
    if (m && !projects.some((p) => p.slug === m[1]))
      issues.push({ where: "Home", message: `Featured badge points to a project that doesn't exist (${home.featured.href}).` });
    if (!m && !isUrl(home.featured.href, { allowInternal: true }))
      issues.push({ where: "Home", message: "Featured badge link must be a project page or a full URL." });
  }

  need("About", about.title, "Page title");
  need("About", about.hero.headline, "Headline");
  about.sections.forEach((s, i) => {
    need("About", s.heading, `Section ${i + 1} heading`);
    need("About", s.body, `Section ${i + 1} text`);
  });

  need("Projects", work.title, "Projects page title");
  const seen = new Set<string>();
  for (const p of projects) {
    const where = `Project “${p.title || p.slug || "untitled"}”`;
    need(where, p.title, "Title");
    need(where, p.summary, "Summary");
    if (!SLUG_RE.test(p.slug)) issues.push({ where, message: "Web address may only use lowercase letters, numbers and dashes." });
    if (seen.has(p.slug)) issues.push({ where, message: `Another project already uses the web address “${p.slug}”.` });
    seen.add(p.slug);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.publishedAt) || Number.isNaN(Date.parse(p.publishedAt)))
      issues.push({ where, message: "Date must look like 2026-10-21." });
    if (p.link && !isUrl(p.link)) issues.push({ where, message: "Project link must be a full URL (https://…)." });
  }
  return issues;
}
