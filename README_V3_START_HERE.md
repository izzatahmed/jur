# University of Jordan Open Research Hub — Editorial Bridge v3.0

**Purpose:** An interactive demonstration of the workflow between private manuscript upload (`jus`) and the public publishing showcase (`jur`).

## What is already implemented

The `docs/editorial-demo/` folder is an independently loadable, responsive static demonstration. It contains FIVE **fictional** manuscripts and allows you to:

- Browse submissions by status and search by title, discipline or author.
- Record a preliminary screening checklist (not a real AI evaluation).
- Record a reviewer assignment and two structured review reports (no actual invitations sent).
- Inspect transparent dimension-by-dimension scores and an indicative grade.
- Request revision, withhold certification, or record a certification **candidate**.
- Mark author-release and editor-approval declarations and move the paper to **publication staging**.
- Preview a public article proof and export a publication metadata draft JSON.
- Simulate publication of a **fictional** article locally in the browser (does not publish to GitHub).
- View an editorial activity history.

All demonstration records are fictional and clearly marked. Changes are stored in this browser's `localStorage`; no files are sent or received by the public demo.

A separate `editorial-worker/` contains an **optional, restricted pilot** for authenticated access to actual private submission *metadata* in `jus`. It is not deployed or configured by unpacking this ZIP.

## Step A — Save a backup first

Open your public `jur` repository on GitHub. Record its current working commit hash (Code > Commits), or use **Code > Download ZIP** to save a copy. Do NOT delete or replace `docs/config.js`, `docs/index.html`, `docs/publications/`, or your existing `worker/` folder.

## Step B — Publish the safe demonstration in `jur`

Upload ONLY this folder to your public repository, preserving its location:

```text
jur/
└── docs/
    └── editorial-demo/
        ├── index.html
        └── assets/
            ├── editorial.css
            ├── editorial.js
            └── samples.json
```

**Do not place the editorial-worker source into your public website's `docs` directory.**

GitHub Pages is already configured to publish from `main` > `/docs`. Your new demo should appear at:

**https://izzatahmed.github.io/jur/editorial-demo/**

After deployment: open Overview > Manuscript inbox > choose a fictional manuscript > record screening and review > explore Publication staging. Reset the demo using the button on the overview page.

Do not share this demonstration as an actual private administrator login. It is a *public, fictional simulator*. It is not linked to actual private submissions.

## Step C — Optional future private editorial pilot

**Do not deploy the private Worker until Cloudflare Access is configured.** This is a separate application. Its default placeholder configuration deliberately rejects all requests.

### 1. Cloudflare Access gate

In Cloudflare Zero Trust > Access > Applications, create a **Self-hosted application** protecting the future editorial Worker hostname, for example `uj-orh-editorial.ujresearch.workers.dev`.

- Set the application type and hostname to match the actual Worker route.
- Allow only explicitly approved editorial email addresses (prefer a tightly controlled individual email policy, not a broad domain).
- Enable multi-factor authentication as appropriate and test the sign-in policy.
- Copy the application's **AUD tag** and your Cloudflare Access **team domain** (`https://YOUR-TEAM.cloudflareaccess.com`).
- Ensure **all** paths, including static assets, require authentication.

Do not use a public site with a password field added in JavaScript as an admin portal. Authorization must occur at the Worker/Access layer.

Cloudflare Access instructions: https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/ and JWT validation: https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/ .

### 2. Configure the new Worker locally

Unzip this package on your Ubuntu computer. Navigate to the **new** `editorial-worker/` directory (NOT the existing uploader's `worker/` directory). Edit `editorial-worker/wrangler.toml`:

```toml
[vars]
GITHUB_OWNER = "izzatahmed"
GITHUB_REPO = "jus"
ACCESS_TEAM_DOMAIN = "https://YOUR-REAL-TEAM.cloudflareaccess.com"
ACCESS_AUD = "YOUR-REAL-ACCESS-AUDIENCE-TAG"
ADMIN_EMAILS = "your-actual-approved-email@example.com"
```

The placeholder values intentionally fail closed until replaced. You may comma-separate a small list of trusted admin emails. Do not place the GitHub token or any secret in `wrangler.toml` or GitHub.

### 3. Deploy the *separate* Worker

With Node.js / npm and Wrangler authenticated on Ubuntu, in `editorial-worker/`:

```bash
npm install
npx wrangler deploy
npx wrangler secret put GITHUB_TOKEN
```

At the secret prompt, enter a fine-grained GitHub token with access to **only** `izzatahmed/jus` (Contents: Read and write). It may be the same restricted token already used for uploads, although using a separately issued editorial token with its own expiry is preferable. The new worker needs its own separately stored secret; it does not automatically share the existing uploader's secrets.

The live editorial Worker stores `submissions/<ID>/editorial.json` privately alongside existing `submission.json` and manuscript files. It does **not** overwrite or reconfigure `uj-orh-submissions` and does **not** publish anything to `jur`.

### 4. Verify security before use

- Visit the URL in an unauthenticated browser. It must NOT show manuscript details.
- Sign in with an approved editor email, then verify that only allowed private pilot metadata appears.
- Test using a fictional submission; record an assignment and a review, then confirm `editorial.json` appears in private `jus`.
- Confirm that no private manuscript, contact details, or private `editorial.json` becomes public in `jur`.
- Check Cloudflare Access audit logs and GitHub commit history for the test.

## Current limitations / integrity protection

1. **No genuine AI analysis.** Screening is a structured checklist placeholder.
2. **No independently authenticated reviewers.** Admin entries cannot establish independent expert review; the live Worker records only a *certification candidate*, not a verified grade.
3. **No public publication API.** “Stage” writes a PRIVATE staging record, not a publicly accessible article. “Simulate public release” exists only in fictional demo mode.
4. **No author notifications, revision uploads, formal reviewer conflicts-of-interest declarations, production antivirus scanning, full access-control review, rate-limiting audit, encrypted database, or institutional privacy governance.**
5. The GitHub API-backed editorial pilot fetches up to **18 submissions** per view to remain within lightweight API limits. This is not yet a scalable production manuscript database.
6. No research involving patient identifiers, protected health data or confidential unpublished work should be used to test the public demo. The private pilot also requires institutional authorization and a comprehensive security/privacy assessment before external use.
7. This is an independent proposal prototype; it is **not an official University of Jordan service**.

## Recommended next stage — From staging to publication

After validating administrator access and reviewer independence, the next development should support **final file approval and publication** through a separate, signed-off release action. That action must verify author permissions, licensing, final content/redactions, editorial decision, ethical declarations, and DOI/archiving requirements before writing an approved copy to the public library. Nothing in this v3 release bypasses these checks.

## Local tests

From the ZIP root:

```bash
node --test tests/*.test.mjs
python3 -m http.server 8000 --directory docs
```

Open `http://localhost:8000/editorial-demo/`. The test suite uses simulated credentials and mocked Access certificates; it does **not** touch your real `jus` repository or Cloudflare account.

## File manifest

- `docs/editorial-demo/index.html` — public fictional dashboard
- `docs/editorial-demo/assets/editorial.css` — responsive layout
- `docs/editorial-demo/assets/editorial.js` — full simulated workflow
- `docs/editorial-demo/assets/samples.json` — invented multidisciplinary manuscripts
- `editorial-worker/` — optional Cloudflare Access-protected private pilot (do not expose as static public files)
- `tests/` — automated security and workflow checks
