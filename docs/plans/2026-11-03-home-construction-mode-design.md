# Home construction mode

## Goal

Keep the normal portfolio fast to scan, with one brief decorative cursor flourish. Offer an opt-in in-place theatrical mode on Home that literally reveals the hero and three featured project cards as the visitor scrolls. No separate route, copied content or Swarm bundle.

## Behavior

- The existing static export and RouteGuard remain unchanged: the header/footer are in exported HTML, while Home content appears after the existing hydration gate. The effect does not add another content source or gate to normal browsing.
- A Home-only “Watch it build” button starts theatrical mode, remembers the entry scroll position and returns to the top. A persistent, keyboard-accessible “Exit build mode” button is available from the first frame. Mode does not persist.
- Header, footer and background receive a short cursor/guide construction pass first, without withholding their controls. The footer is prebuilt offscreen, not duplicated as a fixed footer.
- After the shell pass, the hero and the three existing project cards reserve their layout space but start visually hidden. As they enter the viewport, a cursor and selection outline appear, then the real content reveals. The effect may echo short headings decoratively; it never mutates the actual text or creates duplicate accessible headings.
- Scrolling a large distance, tabbing into a hidden section (including during the shell pass), or changing to reduced motion reveals content immediately. Exit restores the normal Home and entry position. Navigation away cancels animation.
- The normal Home keeps its existing RevealFx/ScrollReveal. The theatrical branch bypasses those effects so there is only one reveal owner. `/edit/preview/` uses the same Home content but has the animation and control disabled.
- Decorative layers are pointer-transparent and aria-hidden; colors use site tokens for light/dark. Avoid a full-viewport blur or fixed-width scene.

## Verification

Unit-test the stage eligibility/catch-up logic and static Home/preview markup. Build and typecheck the export; browser-test normal and theatrical Home, shell links, mode toggle, fast scroll/back, keyboard focus, reduced-motion changes, themes and mobile. Check other routes and editor preview parity, then run a diff reviewer before deployment and verify the live Pages build.
