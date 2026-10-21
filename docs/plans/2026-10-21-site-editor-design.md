# In-site portfolio editor — design

Status: validated with the owner section by section, reviewed by a reviewer agent, and
revised. Decisions marked **(review)** came from that review.

## Goal
Let the owner (Justin) edit his portfolio's words and projects from the live site, see a
real-time preview that matches the published look, and save changes as a **draft pull
request** that he merges on GitHub to publish.

In scope: profile (name, role, avatar photo), social links, Home text, About text,
projects (create/edit/delete, write-up, cover image), and per-page SEO title/description.
Out of scope: visual design (background, tint, colors), the About layout itself.

## Constraints
- Next.js 16 + Once UI Magic Portfolio, `output: "export"`, `trailingSlash: true`,
  deployed by `.github/workflows/pages.yml` to the user Pages site
  `kinojms/kinojms.github.io` (https://kinojms.github.io/).
- No server. Saving writes to GitHub from the browser via the REST API.
- Other apps (`/gastos.io/`, `/pocket-gains/`, `/tsukino-prescript/`) share the
  `kinojms.github.io` origin and therefore its `localStorage` **(review)**.

## 1. Content model
| File | Contents |
|---|---|
| `content/site.json` | person (names, role, avatar, email, location, languages), social links |
| `content/home.json` | SEO title/description, headline, subline, featured badge |
| `content/about.json` | SEO title/description, hero (eyebrow, headline, accent, lede, caption), `sections[]` {label, heading, body (Markdown), tags[]}, contact {label, heading, body} **(review: fixed structure, no `##` parsing)** |
| `content/work.json` | Projects page SEO title/description |
| `content/projects/<slug>.md` | front-matter: title, publishedAt, summary, images[], link; body = Markdown write-up |
| `public/images/...` | cover images and avatar |

- Front-matter is written by our own serializer: one `key: <JSON value>` per line in a
  fixed key order (valid YAML, matching the existing files). The same tiny parser runs at
  build time and in the browser. Unchanged load → save is byte-identical **(review)**.
  `.gitattributes` pins `content/**` to LF.
- `.mdx` → `.md` (none of the 10 files contain JSX or expressions) **(review)**.
- `src/resources/content.tsx` becomes an adapter over the JSON, so the Header, Footer,
  schema and Once UI config keep working. Dead About config (`intro`, `technical`) is not
  exposed in the editor **(review)**.
- Contact buttons come from the social links; email is not duplicated **(review)**.
- Projects are ordered by date (existing behaviour). Slug = filename = URL, fixed after
  the project is first saved. The featured badge must point to an existing project, and
  that project can't be deleted while featured **(review)**.

## 2. Rendering (shared by site and preview) **(review)**
- Display-only view components that take data as props: `HomeView`, `AboutView`,
  `WorkView`, `ProjectView` (+ `ProjectList`). Server pages load data from disk and pass
  it in; the preview passes the editor's in-memory data.
- One Markdown renderer for both: `react-markdown` + `remark-gfm` + `remark-math` +
  `rehype-katex`, reusing the existing component map; no raw HTML. Replaces
  `next-mdx-remote` (build-time only, and could execute expressions). Heading ids are
  computed from extracted text, not `children as string`.
- KaTeX CSS loaded wherever Markdown renders.

## 3. Editor (`/edit/`)
- Unlinked; `noindex`; excluded from sitemap; `Disallow: /edit/` in robots; allowed in
  RouteGuard **(review)**. A full-screen shell covers the site header/footer.
- Desktop: split view (editor left, preview right). Mobile: Edit/Preview toggle.
- Sections: Profile · Home · About · Projects · Save.
  - Plain text areas for Markdown with a formatting cheat sheet (toolbar **cut for v1**).
  - Projects: list sorted by date; add/delete; fields; cover upload with alt text.
  - Images resized in the browser (canvas → WebP, ≤1600×900 covers, 512×512 avatar,
    ≤500 KB), which also strips EXIF/GPS **(review)**. Unsaved images preview from data URLs.
- Preview: iframe at `/edit/preview/` rendered inside the real site layout (header, glass
  background, theme toggle, footer), updated via same-origin `postMessage`.
  Desktop/phone width toggle; the site's own theme toggle works inside it **(review)**.
- Unsaved work autosaves to `localStorage` (content only, never the token), together with
  the file versions it was based on. "Discard changes" resets.

## 4. Saving
Auth **(review + owner decision)**: fine-grained PAT limited to `kinojms/kinojms.github.io`
with Contents RW and Pull requests RW (Metadata R is automatic). Pasted each session and
kept in `sessionStorage` only; no "remember me". 401 → "token expired or invalid".

Save as draft:
1. On load: if an open PR from an `edit/` branch exists, load from that branch and
   continue it (one draft at a time — the "new vs. add" choice is **cut**); otherwise load
   from `main`. Record the head commit and each file's blob SHA **(review)**.
2. Write only files whose bytes changed; deleting a project removes its file and any cover
   image no longer referenced (tree entry `sha: null`).
3. Before writing, re-read the branch; if any file being written or deleted changed since
   load, **block** and ask the owner to reload **(review)**.
4. Git Data API: blobs → tree (`base_tree` = current tree) → commit (parent = current
   head) → create `edit/YYYYMMDD-HHMMSS-xxxx` (retry on 422) or fast-forward the existing
   draft branch → open a regular PR. (Not a GitHub "draft" PR: those need an extra "Ready
   for review" click and aren't available on free private repos.)
5. Owner merges on GitHub → `pages.yml` deploys.

CI **(review)**: the existing `.github/workflows/ci.yml` (typecheck + `npm test` + build) runs on every
`pull_request` (a separate `pr-build.yml` was merged into it after code review),
`contents: read`, its own concurrency group, `npm ci && npm run build`, no deploy.
`pages.yml` is untouched, so PR builds can never cancel a production deploy.

Security **(review)**: no third-party scripts on `/edit`; `<meta>` CSP with
`connect-src 'self' https://api.github.com`, `object-src 'none'`, `base-uri 'self'`;
frame-buster on `/edit`; Markdown never renders raw HTML and drops `javascript:` URLs;
preview accepts messages only from its own origin.

## 5. Testing
- Parity: text + metadata of all exported HTML and screenshots of every route (both
  themes, desktop + phone) before vs. after phases 1–2.
- Unit tests (Vitest): front-matter round trip (byte-identical), change-set calculation,
  validation, image-reference cleanup.
- GitHub flow tested from Node against a temporary private practice repo (create branch,
  PR, continue draft, stale-base block, delete), then the repo is deleted.
- Editor UI driven in a real browser (both themes and widths) with a fake GitHub API
  injected into the page.
- One real draft PR on the live repo, closed afterwards.

## Phases
0. PR-build workflow; baseline snapshot. 1. Content extraction + adapter. 2. View
components + shared Markdown renderer (parity check). 3. `/edit` shell, load, forms,
preview. 4. Token + save flow + stale check. 5. Images. 6. CSP, copy, owner guide, live test.
