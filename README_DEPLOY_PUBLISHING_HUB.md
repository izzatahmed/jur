# Open Research Hub — Publishing Showcase v2.0 (GitHub Pages update)

## What this adds

This update demonstrates the **finished scholarly publication** stage of the proposed University of Jordan Open Research Hub.

- A new public library with search, discipline labels and status filters.
- Three COMPLETELY FICTIONAL multidisciplinary research records (medicine, environmental engineering, digital humanities).
- Full article pages with structured abstract, manuscript text, example figure, transparency disclosures, and research metadata.
- Downloadable sample PDF manuscripts.
- Example grading, review summaries, publication history, citation/replication indicators, and annual award concept.
- English/Arabic page controls, dark mode, responsive layout.

**This is an independent, unofficial prototype.** All people, publications, evaluations, citations and figures are synthetic. No actual paper has been independently certified. This release does not read or publish files from the private `jus` repository.

## IMPORTANT: Do not overwrite live upload settings

Your upload portal already works with the Cloudflare Worker and the private `jus` repository.

**This package does NOT include `docs/config.js`, `worker/`, a GitHub token, or any other backend credentials.**

**Keep the existing `docs/config.js` on GitHub unchanged. Do not delete your existing `worker/` or other directories.**

## Installation in public repository `jur`

1. Download `UJ_Research_Hub_Publishing_Showcase_v2.0.zip` and unzip it on your Ubuntu computer.
2. Open `https://github.com/izzatahmed/jur` and switch to the Code tab, branch `main`.
3. In the repository ROOT, use **Add file → Upload files**. Upload the **contents of the extracted `docs/` folder preserving their relative paths**. The final repository must contain the paths shown below. If your browser flattens folders, upload into each target folder individually rather than dragging a folder blindly.
4. GitHub will ask to update/replace `docs/index.html` and `docs/assets/app.js`. Confirm these two updates. All other files should be new under `docs/publications/`.
5. **Do not** upload the standalone README into `docs` unless desired, and do not replace `docs/config.js`.
6. Save/commit to `main`. GitHub Pages should remain configured as **Deploy from a branch → main → /docs**.
7. Open `https://izzatahmed.github.io/jur/publications/` and refresh without cache if needed (Ctrl+Shift+R on Ubuntu).
8. Click any article to view the full text; then test the PDF link and the **Scientific assessment**, **Peer reviews**, **Versions & impact** tabs. Test Arabic and mobile screens.
9. Return to `https://izzatahmed.github.io/jur/` and confirm that the submission portal STILL says `PILOT` and that a fictional test upload remains operational. Do not submit identifiable patient data.

### Repository layout after update

```
jur/                                  (public repository)
  docs/
    index.html                        (UPDATED: links to publishing library)
    config.js                         (EXISTING LIVE CONFIG - MUST KEEP)
    privacy.html                      (unchanged)
    assets/
      app.js                          (UPDATED: Arabic labels for new link)
      styles.css                      (unchanged)
      mark.svg                        (unchanged)
    publications/
      index.html                      (NEW: public research library)
      article.html                    (NEW: full article reader)
      assets/
        publisher.css                 (NEW)
        publisher.js                  (NEW)
        papers.json                   (NEW: ONLY synthetic records)
      pdfs/
        home-bp-follow-up.pdf         (NEW: fictional)
        urban-rooftop-heat.pdf        (NEW: fictional)
        textual-cross-reference-map.pdf (NEW: fictional)
  worker/                              (existing - unchanged)
  tests/                               (existing - unchanged)
  README.md                            (existing - unchanged)

jus/                                  (private repository)
  README.md                            (existing)
  submissions/                         (existing PRIVATE documents - untouched)
```

## Direct links after publishing

- Researcher portal: `https://izzatahmed.github.io/jur/`
- New finished-publication library: `https://izzatahmed.github.io/jur/publications/`
- Complete sample medical article: `https://izzatahmed.github.io/jur/publications/article.html?id=UJRH-DEMO-2026-001`
- Environmental engineering example: `https://izzatahmed.github.io/jur/publications/article.html?id=UJRH-DEMO-2026-002`
- Humanities preprint: `https://izzatahmed.github.io/jur/publications/article.html?id=UJRH-DEMO-2026-003`

## Product boundary

Today this website is a public **publication demonstration**, not an actual production scholarly publisher. Real publication will later require a consent- and editor-controlled release procedure, final publication format conversion, peer-review record and privacy checks, persistent DOI assignment through a registration service, preservation, versioning, and indexing. Author submission to `jus` is **not** authorization to publicly release that work.

### How to demonstrate to the President

1. Begin at `/jur/` and show the existing one-time manuscript upload form.
2. Click **Publications** in the header or **Open the publishing hub** in the homepage banner.
3. Show the finished research library with three disciplines and a status filter.
4. Open the medical article to show HTML full text, a synthetic results chart, and a downloadable PDF.
5. Open Scientific assessment to show separate evidence criteria; open Peer reviews and Versions & impact tabs.
6. Open the humanities preprint to demonstrate that public availability does **not** equal certification.
7. Return to the proposed annual excellence awards and explain how the ten best papers might be celebrated.

### Editing examples later

The public library records are in `docs/publications/assets/papers.json`. To add a genuine future public article, the publisher will need a controlled approval process, explicit publication consent, editorial review, genuine metadata and real files. **Do not manually copy any private `jus` file into `docs/publications/` merely because it was submitted.**
