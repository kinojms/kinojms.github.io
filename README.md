# Justin Sacdalan — portfolio

A personal portfolio based on [Once UI Magic Portfolio](https://once-ui.com/products/magic-portfolio), customized with ten projects from [@kinojms](https://github.com/kinojms). Built with Next.js and Once UI. The source template is licensed [CC BY-NC 4.0](LICENSE); attribution remains in the footer. Review that noncommercial license before using the site for commercial purposes or buying the appropriate license.

**Live:** https://kinojms.github.io/

## Run locally

```sh
npm ci
npm run dev
```

Visit http://localhost:3000. `npm run build` creates a static export in `out/`. Pushing to `main` builds and deploys it using `.github/workflows/pages.yml`. GitHub Pages is a static host: server APIs, password-protected routes and dynamic OG image generation are unavailable. The site uses local preview images instead.

## Edit

- Identity, contact, homepage text and About content: `src/resources/content.tsx`
- Routes, palette and theme switcher: `src/resources/once-ui.config.ts`
- Project write-ups: `src/app/work/projects/*.mdx`
- Cover images: `public/images/projects/*.png`
- Editable HTML/CSS cover studio: `thumbnails/index.html?project=gastos-io` (serve the repository with `python -m http.server 8123`; change the `project` query parameter to a project slug)

All ten covers were rendered from the cover studio at 1600×900 and saved as PNGs for the portfolio. They are **conceptual cover art**, not screenshots of the actual applications. You can replace a PNG with a real product screenshot later without changing its MDX page. The studio's UI-like artwork is illustrative and should not be presented as a verified application screen.

The site has system-aware light/dark mode and a persistent header toggle. Only GitHub and an email address found in the public repos are included; add confirmed LinkedIn, résumé, work profiles, experience, and a custom domain in the content file when available. The About page intentionally makes no unverified employment or education claims.

The metadata origin defaults to `https://kinojms.github.io`. Set `NEXT_PUBLIC_SITE_URL` to the new public origin if you move the site to another domain.
