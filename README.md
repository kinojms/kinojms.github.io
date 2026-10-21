# Justin Sacdalan — portfolio

A personal portfolio using [Once UI Magic Portfolio](https://once-ui.com/products/magic-portfolio) as a base, customized with projects from my Github repositories. Built with Next.js and Once UI. The source template is licensed [CC BY-NC 4.0](LICENSE) (don't worry, attribution is in the footer). Note for viewers: Review that noncommercial license before using the site for commercial purposes or buying the appropriate license.

=== AI-generated ahh description after this part ===

**Live:** https://kinojms.github.io/

## Run locally

```sh
npm ci
npm run dev
```

Visit http://localhost:3000. `npm run build` creates a static export in `out/`. Pushing to `main` builds and deploys it using `.github/workflows/pages.yml`. GitHub Pages is a static host: server APIs, password-protected routes and dynamic OG image generation are unavailable. The site uses local preview images instead.

## Edit from the site

Open **https://kinojms.github.io/edit/** (not linked anywhere, hidden from search engines).

1. **Sign in once per tab.** Follow the link on the sign-in screen to create a GitHub token. Under *Repository access* pick *Only select repositories* → `kinojms.github.io`; *Contents* and *Pull requests* must be *Read and write*. Paste the token. It is kept only in that tab and forgotten when you close it.
2. **Edit** on the Profile, Home, About and Projects tabs. The right side is a live preview using the real site; switch Desktop/Phone there, and use its own theme toggle for light/dark. On a phone, use the Edit/Preview switch at the top.
3. **Save** on the Save tab. This opens a pull request (a draft); nothing is live yet. Saving again adds to the same pull request.
4. **Publish** on GitHub: open the pull request, wait for the green check (the site is built to make sure nothing broke), then press **Merge pull request**. The live site updates about a minute later. To throw a draft away, close the pull request instead.

Unsaved edits are kept in the browser automatically. If something you changed in the editor was also changed on GitHub in the meantime, saving stops and asks you to reload, so nothing gets overwritten.

## Edit the files directly

All editable content lives in `content/` and can also be edited on GitHub or in VS Code:

- `content/site.json`: name, role, email, profile photo, social links
- `content/home.json`: Home headline, intro, featured badge, search title/description
- `content/about.json`: About page text (sections are Markdown), search title/description
- `content/work.json`: Projects page title/description
- `content/projects/<web-address>.md`: one file per project; settings at the top, write-up (Markdown) below
- Images: `public/images/projects/` and `public/images/uploads/` (editor uploads)

Code and design: routes, palette and theme in `src/resources/once-ui.config.ts`; page layouts in `src/components/views/`; the editor in `src/components/editor/` and `src/lib/editor/`. Design notes: `docs/plans/2026-10-21-site-editor-design.md`.

## Checks

`npm test` runs the unit tests (content round-trip, change sets, save flow against a fake GitHub). Every pull request is type-checked, tested and built by `.github/workflows/ci.yml`. The live-API test only runs with a token: `PRACTICE_TOKEN=$(gh auth token) npx vitest run github.live` (uses the private `kinojms/portfolio-editor-test` repo).

The cover studio (`thumbnails/index.html?project=pocket-gains`, served with `python -m http.server 8123`) renders HTML/CSS cover art for projects without screenshots.
