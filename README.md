# Wellbeing & Responsibility — research site (working draft)

Static site for Oktifani Winarti's PhD research (Goldsmiths, University of London):
*Wellbeing and Responsibility in Neuroliberal Times: News Discourse on AI Chatbots and the Indonesian Case*.

| Page | What it is |
|---|---|
| `index.html` | The story, objective, research questions, theory and design |
| `editor.html` | Revision studio: section-by-section editor with grammar, ethics-form and coherence checks, B/W figures, live rubric score, "Future you" momentum panel, hover tips, paragraph insights with an imagined supervisor lens, Muse personalisation, focus timer + music, add/move/delete sections, import from Word (.docx); edits update the story page |
| `thesis.html` | Thesis studio: the full PhD (9 chapters + front/back matter), Ch1–4 seeded from the upgrade, writing prompts for Ch5–9, word budgets, viva-readiness rubric (UK PhD criteria), same writing tools; saved separately from the upgrade |
| `readiness.html` | Upgrade debugger: upgrade document vs ethics form, gaps, mock panel questions, readiness tracker |
| `figures.html` | 13 candidate figures with where they go and what they argue |
| `posters.html` | Paper pipeline + five work-in-progress posters (printable) and the poster-making process |
| `careers.html` | Career paths in the UK, Indonesia, Europe and the US with likelihood, difficulty and live openings (checked 13 Oct 2026) |

Both studios share one engine (`assets/studio.js`, configured per page). Studio edits are saved in the browser (localStorage). Use *Export → Site data* and replace `assets/upgrade-text.js` to publish edits for everyone.

No build step: plain HTML/CSS/JS. Preview locally with `python3 -m http.server` and open http://localhost:8000.

Working draft — not for citation.
