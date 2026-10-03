# CertWise — find your role, then check if a certificate is worth it

She Solves 3.0 · Team Ctrl Freaks · Track: Web & Software Development · Domain: Education

**Live:** https://personalpurva.github.io/certwise/ · **Project log:** https://personalpurva.github.io/certwise/project-log.html

First-year engineering students don't know which job role to aim for, and collect certificates that recruiters
don't value, often pulled in by high-pressure ads. CertWise helps in one journey:
**find my role → see what that role needs → check whether a certificate (or an ad) is worth it.**
Market facts (prices, salaries, demand) refresh automatically every month, and no number reaches the site
unless our software has found its exact quote on the source page.

## Run it

- Easiest: double-click `index.html` (no server needed).
- Or: `npm start` and open http://localhost:5173
- Tests: `npm test`

## Files

| File | What it does |
|---|---|
| `index.html`, `style.css`, `app.js` | The page: Find my role · Check a certificate · Check an ad |
| `project-log.html` | Everything we did, step by step: problem choice, research with proof, features, data refresh, corrections, tests |
| `logic.js` | **The core** — typo-tolerant search, the five checks, verdict, alternatives, ad scanner, role quiz |
| `data/certs.js` | 31 certificates with checkable facts (issuer, exam type, cost band, roles, eligibility, status) |
| `data/roles.js` | The 8-question quiz and, per role, college subjects, skills to learn, mini project, research fallback |
| `data/live.js` | **Verified live facts** written by the monthly refresh (empty until the first run) |
| `refresh/refresh.mjs` | Monthly refresh: Claude searches and reads trusted pages and returns facts with exact quotes |
| `refresh/verify.js` | Fact checker: fetches each page itself and keeps a fact only if the quote is really there |
| `.github/workflows/refresh.yml` | Runs the refresh automatically on the 1st of every month and commits `data/live.js` |
| `tests/test_logic.js` | 46 automated tests for the logic and the fact checker |

## How the data stays current (and honest)

1. **Search + read.** For each role (salary, demand, skills) and each certificate (price, status, demand),
   `refresh.mjs` asks Claude (`claude-opus-5-5`) to use web search and web fetch, and to return every fact as
   `{value, url, quote}` with the quote copied word-for-word.
2. **Fact check.** `verify.js` downloads the page itself, turns it into text, and keeps the fact only if
   - the quote is found on the page (small differences like curly quotes, dashes and "Rs." vs "₹" are ignored), and
   - every number in the value is inside the quote, and
   - for demand facts, the quote actually names the certificate.
3. **Publish.** Verified facts go to `data/live.js` with the date they were checked. Facts that fail are dropped
   and listed in `refresh/report.json`. If this month's fact fails, last month's verified fact is kept.
4. **Show.** The site shows each live fact with its quote, a link to the source and the check date. Until the
   first refresh, the role report shows our earlier research, clearly labelled with its sources.

### Proof for everything else

The refresh covers numbers that change. Everything else also has a source:

- **Certificates** (`data/certs.js`): every price, exam type and eligibility rule has a `src` list of official
  pages (44 links in total). The site shows them under each verdict as **Proof**. Prices were checked by hand on
  3 Oct 2026 (`CHECKED_ON`).
- **Roles** (`data/roles.js`): every salary and demand line names its source from `SOURCES` (Naukri JobSpeak,
  India Skills Report, TeamLease, salary guides), and the report links to it.
- **Ad warning signs** (`logic.js`): the "job guarantee" rule links to the CCPA guidelines that ban such claims.
- **Our advice is labelled.** College subjects, skills to learn, mini projects and the notes on some certificates
  are our guidance, not facts. The site marks them *our advice* so nobody mistakes them for data.
- **Known gaps:** Oracle's exam pages (education.oracle.com) were down for maintenance on 3 Oct 2026, so the two
  Oracle prices are shown as "set per country / about USD 245" with the official link. Some pages (Kaggle,
  HackerRank, CompTIA) only show text with JavaScript, so the refresh may drop their facts — that is the
  checker working, not a bug.

We chose this over RAG: CertWise asks fixed questions (salary for role X, price of certificate Y), so a scheduled,
fact-checked refresh is cheaper and safer than generating answers live for every visitor. A free-text
"Ask CertWise" chat would be the point to add RAG.

### Set up the automatic refresh

1. Push this folder to a GitHub repository and turn on GitHub Pages for it.
2. Add a repository secret `ANTHROPIC_API_KEY` (Settings → Secrets and variables → Actions).
3. Actions tab → "Monthly data refresh" → **Run workflow** for the first run; after that it runs monthly.
4. To try it locally: set `ANTHROPIC_API_KEY`, then `npm run refresh -- --ids data,aws-ccp` (two topics only).
   `npm run refresh:dry` shows the questions without calling the API.

Each full refresh makes one Claude request per role and per certificate (about 32), each with up to 6 web searches
and 6 page fetches, so it costs real API credits — check the cost of a two-topic run first.

## How a certificate is scored (be ready to explain this)

Five checks, 0–2 points each: who gives it · how you earn it · fits your role · in demand (verified sources) · cost.
Score = points ÷ points possible. 70%+ = Worth it, 45–69% = Think twice, under 45% = Skip.
Hard stops: needs work experience → "Not yet"; exam closed → "Not available"; wrong job → "Not for this role".
Search typos are handled with **edit distance** (Levenshtein, dynamic programming).

## Before the demo

- [ ] Run the refresh once (at least for the roles and certificates in your demo) so live facts appear.
- [ ] Look through `refresh/report.json` — dropped facts show the checker working; mention it to judges.
- [ ] Fill the survey numbers on slide 5 of the deck.
- [ ] Record a 60–90 second backup video of the golden path.

## Demo script (about 2 minutes)

1. **Find my role** → 8 questions → report: best match, college subjects, verified salary and demand with
   quotes and links → "Use this role and check certificates".
2. Type **AI tools workshop** → **Skip** (attendance-only), with better picks.
3. **Check an ad** → Load example ad → **High-pressure ad**, 7 warning signs with the exact phrases.
4. Tricky case: **secuirty plus** (typo) → still finds CompTIA Security+; **CISSP** → **Not yet**.
5. Open `refresh/report.json`: "these facts were dropped because the quote wasn't on the page".

## Answers to the obvious questions

- **How do you avoid fake information?** Every number must come with a quote that our own code finds on the
  source page; otherwise it is dropped. Students see the quote, the link and the date. Fixed facts (issuer,
  exam type, eligibility) each have a Proof link, and our own guidance is labelled *our advice*.
- **Where do the numbers on your slides come from?** See the proof table in `../Round1_slides_content.md` —
  each number with the exact words on the source page.
- **How is this different from Class Central / course reviews?** Reviews rate how enjoyable a course was;
  we judge whether a certificate is valued for your role, and we decode the ad.
- **How will it scale?** New certificate or role = one data row; the monthly refresh picks it up.
- **Who pays?** Free for students; college placement cells could fund the small API cost. No commission from
  course sellers — that independence is the point.
