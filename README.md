# Open Research Hub — GitHub Pages researcher portal (pilot prototype)

**Purpose:** A GitHub-ready bilingual (English / العربية) interactive publishing-hub prototype, prepared for institutional discussion. It is **NOT an official University of Jordan service**, and it does not certify research or implement actual AI peer review.

![Architecture](https://img.shields.io/badge/Frontend-GitHub%20Pages-133649) ![Backend](https://img.shields.io/badge/Receiver-Cloudflare%20Worker-22a48f) ![Storage](https://img.shields.io/badge/Manuscripts-private%20GitHub%20repo-9debd2)

## What you receive

- **A beautiful researcher-facing website** for GitHub Pages, including a guided 3-step manuscript submission form, mobile layouts, Arabic/English switch, light/dark appearance, four **clearly fictional** sample records, an illustrative scoring dashboard, a post-publication evidence simulation, proposed annual awards, and FAQ.
- **A real upload receiver** (Cloudflare Worker), designed for modest non-confidential pilot manuscripts. It accepts PDF or DOCX files up to **5 MB**, checks core metadata and Turnstile, and saves the manuscript + metadata to a **private GitHub repository** that you own. Credentials never appear in the public site.
- Submission receipt IDs such as `UJORH-20261122-XXXXXXXX` for live pilot mode. In unconfigured demo mode IDs begin with `DEMO-` and nothing is transmitted.
- A quick smoke-test suite and this setup guide.

## Very important: two repository design

| Repository | Visibility | Contents | Purpose |
|---|---|---|---|
| `uj-open-research-hub` | **Public** | `docs/`, `worker/` (source), README | Website hosted on GitHub Pages. NO uploaded papers or keys. |
| `uj-orh-submissions` | **Private** | `submissions/<ID>/manuscript.pdf` and `submission.json` | Private destination for actual pilot submissions. |

You cannot securely accept files directly using GitHub Pages alone. The Worker performs server-side validation, Turnstile verification, and an authenticated GitHub API write. **Do not make the receiving repository public**. The receiver deliberately refuses to upload if GitHub reports that the destination repository is public.

## A. Publish the front end to GitHub Pages — no backend yet

1. Log in to your GitHub account in a browser.
2. Create a **new public** repository named `uj-open-research-hub`. You can use another name if preferred.
3. Upload the **contents of this ZIP** into the root of that repository, preserving `docs/`, `worker/` and the other files. From Ubuntu you can also push the folder with `git`.
4. In GitHub repository **Settings → Pages**, choose **Deploy from a branch**, branch `main`, folder **`/docs`**, and save.
5. GitHub Pages will serve your site at:
   `https://YOUR_GITHUB_USERNAME.github.io/uj-open-research-hub/`
6. Open the website and test navigation, language switch, sample library, grades, and test submission. A prominent **DEMO** badge and the receipt confirm that **no file is uploaded** at this stage.

> If the publication URL differs, the website remains functional. Do not create a repository named `YOUR_GITHUB_USERNAME.github.io` unless you want the portal as the root homepage rather than a project page.

## B. Activate limited uploads to your PRIVATE GitHub repository

**Do not accept real confidential research until the governance/security work listed below is completed.** This receiver is suitable only for controlled testing with synthetic or explicitly authorized non-sensitive documents.

### 1. Create the private submissions repository

On GitHub create `uj-orh-submissions`, choose **Private**, and initialize it with a README. Never put it in the public Pages repo.

### 2. Make a fine-grained GitHub access token

In GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens, make a token limited to **only** the private `uj-orh-submissions` repository, with **Contents: Read and write**. Keep the expiration short and rotate the token appropriately. No broad `repo` scope is necessary.

**Never paste your token into `docs/config.js`, `wrangler.toml`, a GitHub issue, this chat, or public source.** You will paste it into a Cloudflare secret prompt in your own authenticated environment.

### 3. Create Cloudflare Turnstile keys

Create a Turnstile widget for `YOUR_GITHUB_USERNAME.github.io` and note the **public site key** and **secret key**. The secret key stays on the Worker side.

### 4. Deploy the Worker from Ubuntu or another terminal

Install Node.js 20+ and open a terminal in `worker/`:

```bash
cd worker
npm install
npx wrangler login
```

Edit `worker/wrangler.toml` and replace `YOUR_GITHUB_USERNAME` in:
- `GITHUB_OWNER` (your account or organization owner)
- `ALLOWED_ORIGIN` (site origin **without project path**)
- `ALLOWED_TURNSTILE_HOSTNAME` (hostname **without https://**)

`GITHUB_REPO` should match your PRIVATE receiving repository. Deploy the receiver and then store secrets securely:

```bash
npx wrangler deploy
npx wrangler secret put GITHUB_TOKEN
npx wrangler secret put TURNSTILE_SECRET
```

The commands prompt you locally for the token and secret; these values are **not saved in your repository**. Note the HTTPS Worker URL shown after deployment, for example `https://uj-orh-submissions.example.workers.dev`.

**If this is your first Worker deployment:** Cloudflare may require you to initialize its workers.dev subdomain first. The CLI will guide you.

### 5. Switch the website from Demo to Live pilot mode

Edit `docs/config.js` in your public GitHub repository:

```javascript
window.UJORH_CONFIG = {
  mode: 'live',
  apiUrl: 'https://uj-orh-submissions.YOUR-SUBDOMAIN.workers.dev',
  turnstileSiteKey: 'YOUR_PUBLIC_TURNSTILE_SITE_KEY',
  maxFileMB: 5,
  supportEmail: ''
};
```

**Only the PUBLIC Turnstile site key belongs in this file.** Commit the change. When GitHub Pages updates, the submission screen displays **PILOT**, not **DEMO**.

### 6. Verify with a synthetic document

1. Submit a small fictional PDF or DOCX with imaginary author details, complete the Turnstile check, and submit.
2. Confirm that the portal shows a receipt similar to `UJORH-YYYYMMDD-XXXXXXXX`.
3. Open your **private** GitHub submissions repository and find:

```
submissions/
  UJORH-YYYYMMDD-XXXXXXXX/
    manuscript.pdf                 # or manuscript.docx
    submission.json
```

4. Open `submission.json` to inspect the title, author, ethics declaration, submission timestamp, and internal pilot status.
5. Confirm that **none** of these files is visible in your public GitHub Pages repository.

### 7. How you review submissions

In this prototype, **your GitHub PRIVATE repository is the administrative inbox**. The public website does not expose any admin credentials, reviewer dashboards, or manuscript contents. To review an upload, log into GitHub, open your private repository, and inspect the submission folder. There is no automatic acceptance, grading, scientific review, publication, or author notification yet.

## C. What works today, what is demonstration only

| Feature | Today |
|---|---|
| Public responsive portal | **Functional** after uploading to GitHub Pages |
| English–Arabic interface | Functional |
| Dark mode | Functional |
| Form validation and PDF/DOCX selection | Functional |
| Demo submission | Functional, **stays in the browser** |
| Real file upload to your account | **Functional only after you deploy/configure the Cloudflare Worker**, and subject to testing |
| Basic file signature checks | Functional in backend (not full antivirus or detailed DOCX validation) |
| Cloudflare anti-bot check | Functional in configured live mode |
| Private GitHub repository check | Functional in backend |
| AI scientific evaluation | **Illustrative UI only**, no model connected |
| Expert reviews, grading, badges, sample library | **Illustrative only** |
| Citations / post-publication quality updates | **Illustrative simulation only** |
| Annual research excellence awards | Proposal only |
| Official University of Jordan authority | **Not established** |

## D. Security and operational limitations

This is a **pilot**, not a production clinical manuscript repository. Before accepting submissions from external researchers, obtain appropriate institutional and legal authorization and implement:

1. A formal privacy notice, consent and copyright terms, a data-retention and deletion policy, and data processing agreements with vendors where required.
2. Antivirus/file scanning, more rigorous document validation, rate limiting/abuse control, monitoring, incident response and backup/restore procedures.
3. Verified author identities and stronger access controls; secure authenticated access for editors/reviewers.
4. A suitable institutional document store for manuscripts (e.g. private object storage), rather than long-term heavy file archiving in GitHub.
5. Research integrity, ethics, conflicts-of-interest, appeals and retraction workflows.
6. AI policy, evaluation reproducibility and human editorial responsibility.
7. A real publication registry, DOI metadata, immutable versioning, access control, indexing and preservation.

The initial Worker is intended for low-volume pilots with **synthetic or expressly authorized non-sensitive manuscripts**. It does not scan for malware; all uploaded files must be treated as untrusted. It does not process patient-identifiable or protected medical data, nor does it provide complete regulatory compliance. The 5 MB file limit is deliberate for lightweight testing. Significant upload volume and larger files require a better storage architecture (e.g. Cloudflare R2 + database) and deeper security review.

**Common failure modes**
- `Unauthorized website origin`: fix `ALLOWED_ORIGIN`; use only the scheme+host, no `/uj-open-research-hub` path.
- `Anti-bot verification`: ensure Turnstile hostname and both keys match.
- `Pilot receiver not configured`: save both secrets via `wrangler secret put`.
- `Private repository is inaccessible`: check token expiration and Contents access for only the target repo.
- `Destination repository must be private`: change repo visibility to private or choose a different private repo.
- Browser does not update: wait for GitHub Pages deployment to finish; refresh without cache.
- `Could not be fully confirmed`: the first GitHub write may already have succeeded. Examine the private repository for the provided submission ID before resubmitting.

## E. Local testing without publishing

From the project root:

```bash
python3 -m http.server 8000 --directory docs
```

Then browse `http://localhost:8000/` and test the **DEMO** behavior. For backend unit tests:

```bash
node --test tests/*.test.mjs
```

These unit tests mock both GitHub and Turnstile and **do not make any network request or upload any file**.

## Architecture

```
Researcher browser
    |
    v
GitHub Pages (public front-end, no secrets)
    |  HTTPS + Turnstile token + PDF/DOCX
    v
Cloudflare Worker (secret verification, file/type checks)
    |  GitHub REST API + secret token
    v
Private GitHub repository (your pilot submission inbox)

Public synthetic library is separate from private submissions.
```

Relevant documentation: [GitHub Pages](https://docs.github.com/en/pages), [GitHub Repository Contents API](https://docs.github.com/en/rest/repos/contents), [Cloudflare Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/), [Cloudflare Turnstile server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).
