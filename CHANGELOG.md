# v3.0 — Editorial Bridge (2026-11-23)

* Added public, fully synthetic editorial workflow simulator (`docs/editorial-demo`).
* Added manual screening checklist, reviewer assignments, structured assessments and provisional grades.
* Added revision/hold decisions, publication-authorization gate, draft article proof and JSON metadata export.
* Added complete activity trail stored locally for demonstration.
* Added a separate, locked-by-default Cloudflare Access JWT-verified Worker for private metadata editorial pilot.
* Protected all private Worker static assets with Worker-first authorization; default config fails closed.
* No private manuscripts or private metadata are included in this release.
* No changes to the existing `jur` homepage, `docs/config.js`, production submission Worker, or existing publishing showcase.
* Publication remains demonstrative/staged only; no automatic public release.
