# CertWise — is this certificate genuine, and what is it worth?

She Solves 3.0 · Team Ctrl Freaks · Track: Web & Software Development · Domain: Education

**Live:** https://personalpurva.github.io/certwise/ · **Project log:** https://personalpurva.github.io/certwise/project-log.html

Students collect certificates but can't easily check two things: **is it genuine?** and **what is it worth in the
job market?** Every issuer verifies certificates in its own way (Credly badges, coursera.org/verify links,
NPTEL QR codes, Red Hat IDs...), copy-cat links can look official, and a perfectly genuine certificate can still
be worth very little. CertWise answers both questions in one check, with a source for every fact.

## Run it

- Easiest: double-click `index.html` (no server needed; the QR reader needs internet).
- Or: `npm start` and open http://localhost:5173
- Tests: `npm test`

## Files

| File | What it does |
|---|---|
| `index.html`, `style.css`, `app.js` | The page: certificate name + verification link / ID / QR photo + issuer → two answers |
| `logic.js` | **The core** — typo-tolerant search, the genuineness check, the market value score, higher-value picks |
| `data/certs.js` | 31 certificates with checkable facts (issuer, exam type, price, eligibility, status) and proof links |
| `data/verify.js` | How each issuer verifies certificates (14 official methods, with proof) and UGC's fake university list |
| `data/roles.js` | The jobs a certificate leads to: demand and fresher salary, each with a source |
| `data/live.js` | **Verified live facts** written by the monthly refresh (empty until the first run) |
| `refresh/refresh.mjs` | Monthly refresh: an AI (free Gemini or paid Claude) reads trusted pages and returns facts with exact quotes |
| `refresh/gemini.mjs`, `refresh/pages.js` | Free mode: calls Gemini and cuts long pages down to the parts that matter |
| `refresh/verify.js` | Fact checker: fetches each page itself and keeps a fact only if the quote is really there |
| `.github/workflows/refresh.yml` | Runs the refresh on the 1st of every month and commits `data/live.js` |
| `tests/test_logic.js` | 65 automated tests; `tests/sample_qr.png` is a sample QR (fake NPTEL link) for the photo upload |
| `project-log.html` | Everything we did, with the research and proof |

## 1. Is it genuine? (`checkGenuine` in logic.js)

| What we check | Result |
|---|---|
| The issuer is on UGC's list of 32 fake universities (Feb 2026) | **Fake university** |
| The certificate type has no official record (workshop, participation, paid "internship") | **Can't be verified** |
| The link is on the issuer's official verification site (e.g. credly.com/badges/..., coursera.org/verify/..., nptel.ac.in/noc/...) | **Official verification link** — open it as the last step |
| The link is on the official site but not a verification page | **Official site, but not a verification page** |
| The link copies the issuer's name or is a small typo of it (coursera-verify.com, credlly.com) — found with edit distance | **Look-alike website** — treat as fake |
| Any other website | **Not the issuer's official site** |
| An ID in the right format (Red Hat 123-456-789) | **ID looks right — confirm it** on the official page |

The QR code can be read from a photo or screenshot of the certificate (jsQR, in the browser — nothing is uploaded).
We never say "100% genuine": the browser can't read the issuer's records, so the final step is always the
issuer's own page, which we link to.

## 2. What is it worth? (`marketValue` in logic.js)

Three checks, 0–2 points each:

| Check | 2 | 1 | 0 |
|---|---|---|---|
| Recognition (who gives it) | Company / body that owns the field, or an IIT | Learning platform | Unknown training company |
| Proof of skill (how you earn it) | Supervised exam | Online tests / projects | Attendance |
| Job demand | ≥2 verified sources, or its jobs are "in demand" in cited reports | 1 source / "IT under pressure" / depends on the course | Not a credential employers ask for |

Score = points ÷ 6 → 70%+ High, 45–69% Medium, below 45% Low market value. We also show the price (with proof),
the fresher salary of the jobs it leads to (with sources), warnings (exam closed, needs work experience) and up to
three higher-value certificates in the same field. If the genuineness check finds a fake, the market value is 0%.

## How the data stays current (and honest)

The refresh runs with **one** of two keys (if both are set, the free one is used):

| | Free: `GEMINI_API_KEY` | Paid: `ANTHROPIC_API_KEY` |
|---|---|---|
| Where facts come from | Our script downloads the trusted pages already listed in `data/certs.js` (`src`) and `data/roles.js` (`SOURCES`); Gemini (`gemini-3.8-flash`) copies out the facts | Claude (`claude-opus-5-5`) searches the web and reads pages, so it can find new sources |
| What it updates | Price, status, salary, demand | The same, plus sources that say a certificate is in demand |
| Cost | ₹0 on the free tier (the script waits 15 s between calls) | Pay per use |

Every fact comes back as `{value, url, quote}`. `verify.js` downloads the page itself and keeps the fact only if
the quote is on the page and every number in the value is inside the quote. Failed facts are dropped and listed in
`refresh/report.json`; last month's verified fact is kept.

### Set up the automatic refresh

1. Get a key — **free:** https://aistudio.google.com/api-keys → Create API key; **paid:** https://console.anthropic.com → API Keys.
2. Add it as a repository secret named `GEMINI_API_KEY` or `ANTHROPIC_API_KEY`
   (https://github.com/PersonalPurva/certwise/settings/secrets/actions). Never put a key in code, a commit or a chat.
3. Actions tab → "Monthly data refresh" → **Run workflow** (type `cloud,aws-ccp` for a small test run).
4. `npm run refresh:dry` shows what would be asked, without calling any API.

## Demo script (about 2 minutes)

1. **AWS badge link** example → *Official verification link* + **100% High market value**, cloud salary with sources.
2. **Look-alike Coursera link** (coursera-verify.com) → *Look-alike website* → market value shown as 0% if fake.
3. Upload `tests/sample_qr.png` with "NPTEL" typed → the QR is read → *Official verification link* (nptel.ac.in).
4. **₹9 workshop** → *Can't be verified* + **0% Low market value** → higher-value picks (NPTEL first).
5. **Fake university degree** → *Fake university* (UGC list, with proof).

## Answers to the obvious questions

- **Can you prove a certificate is genuine?** We prove the link points to the issuer's own record (or flag it as a
  copy-cat) and check the UGC list; the last step is the issuer's page. We never claim "100% genuine".
- **How is this different from the SIH25029 teams?** They check genuineness only (OCR / AI / blockchain on degree
  documents). We add the market value score and cover any issuer's verification method, with no partnership needed.
- **Why is a genuine certificate scored low?** Genuine isn't valuable: a real ₹9 workshop certificate has no exam and
  no recognised issuer.
- **Where do the numbers on your slides come from?** See the proof table in `../Round1_slides_content.md`.
- **Who pays?** Free for students; placement cells could fund it. No commission from course sellers.
