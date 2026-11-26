# UJORH Editorial v3.2 — Changes since v3.0

- Shared `evaluation.mjs` logic between the browser demonstration and private Worker, replacing divergent certification gates.
- Private inbox paging: page/perPage, newest receipt-date first, avoids prior `slice(0,18)`, detects 1000-entry directory limitation.
- Fixed missing `id` in private `submission.json` records (real uploader produces `submissionId`).
- Certification candidate requires administrative screening, two accepted current-round reports from assigned labels, sufficient reliability, and zero unresolved critical concerns or revision holds.
- Revisions create new rounds and require documented receipt, repeat screening, and fresh assessments.
- Editorial hold clearance requires documented rationale and new review round.
- Old/invalid certification candidates cannot bypass checks to stage.
- Audit events have sequence, UTC timestamp, author, action, previous/current state, and review round.
- Rating displays *reliability* separately from *contribution*; citation impact does not affect reliability.
- Private staging remains private; no public publishing endpoint or real AI/reviewer identity validation.
- 19 tests pass; interactive browser visual check unavailable in this environment.
