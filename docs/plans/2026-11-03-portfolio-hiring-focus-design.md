# Portfolio hiring focus

Audience: web/software development internship hiring teams. Preserve Justin's conversational, first-person voice and the existing visual identity; no long case studies.

## Scope

- Keep the short project pages. Rename the card CTA and editor hint from “Read case study” to “About this project.” The link remains conditional on a nonempty write-up.
- Present Pocket Gains honestly as in progress: working fitness/deck-building basics; pet art and animations, more cards and proper workout tutorial videos are unfinished. Update card summary and short page, not a new status field.
- Keep Gastos.io's “I'll log it later” premise and add only the owner-reported benefit: it helps Justin track his own expenses and is easy to use. Do not invent user metrics.
- Preserve “The lights in the sky are stars.” Show the existing editable profile role near it without adding another content field; preview uses the same view.
- Home shows the three newest projects (currently Gastos.io, Pocket Gains, Prescript Terminal), while Projects lists all. No new selection mechanism.
- Replace the generic home search description and move existing work-related About sections before the longer hobbies section; keep its first-person tone and references.

## Checks

Test the rendered home page's project count, role and CTA; run the complete test suite, typecheck and static build. Check exported routes and metadata; compare home/About/Projects/project pages on desktop and mobile in both themes, plus the editor preview. Review the diff and CI before asking Justin to merge a draft PR. Check for an open editor draft before publishing; do not overwrite unsaved browser changes.
