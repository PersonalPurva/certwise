// CertWise - monthly data refresh
//
//   node refresh/refresh.mjs              refresh everything (costs API credits)
//   node refresh/refresh.mjs --dry-run    show what would be asked, no API calls
//   node refresh/refresh.mjs --only roles | --only certs | --ids aws-ccp,rhcsa
//
// 1. For each role and certificate, Claude searches the web and reads pages (web_search + web_fetch).
// 2. It must return every fact with the page URL and an exact quote.
// 3. We fetch each page ourselves and keep the fact ONLY if the quote is really there
//    and every number in the value is inside the quote (refresh/verify.js).
// 4. Verified facts go to data/live.js; dropped facts are listed in refresh/report.json.

import Anthropic from "@anthropic-ai/sdk";
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const { CERTS, ROLES } = require(path.join(root, "data", "certs.js"));
const { verifyFact, htmlToText, quoteNamesCert } = require(path.join(here, "verify.js"));

const MODEL = process.env.CERTWISE_MODEL || "claude-opus-5-5";
const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
const ids = args.includes("--ids") ? args[args.indexOf("--ids") + 1].split(",") : null;
const today = new Date().toISOString().slice(0, 10);

const SYSTEM = `You research facts for CertWise, a free tool that helps first-year engineering students in India choose a job role and judge certificates.

Use web_search to find sources and web_fetch to read them. Rules:
- Report a fact only if you read it on a page you fetched. Never use memory, never estimate, never combine numbers from different pages into a new number.
- For every fact give the page URL and a quote copied word-for-word from that page (one or two sentences) that contains the value. Our software checks the quote against the page, so any change in wording makes the fact fail.
- Prefer official pages, government sources and established 2025-2026 reports. Avoid pages that sell the course being judged.
- If you cannot find a fact, use null. An empty answer is better than a guess.

End your answer with the JSON inside <json></json> tags and nothing after it.`;

function roleTask(role) {
  return `Role: ${role.name} (India, fresh graduates).
Find:
1. salary: a typical fresher (0-1 year) salary range in India, e.g. "₹3.5 - 6 LPA".
2. demand: one statement about current hiring demand in India for this role or its main skills.
3. skills: up to 5 skills that employers or reports say this role needs (one fact each).

Return:
<json>{"salary": {"value": "...", "url": "...", "quote": "..."} or null,
 "demand": {"value": "short summary", "url": "...", "quote": "..."} or null,
 "skills": [{"value": "skill name", "url": "...", "quote": "..."}]}</json>`;
}

function certTask(cert) {
  const roles = cert.roles.filter(r => r !== "all").map(r => ROLES.find(x => x.id === r).name).join(", ");
  return `Certificate: ${cert.name} (issued by ${cert.issuer}).
Find:
1. price: the current exam / certificate fee, from the official page if possible (include currency).
2. status: is it currently offered? value "active" or "closed".
3. demand: up to 3 independent sources (not the issuer, not course sellers) that say this certificate is in demand,
   valued, or asked for${roles ? " in " + roles + " jobs" : ""}, preferably in India. The quote must name the certificate.

Return:
<json>{"price": {"value": "...", "url": "...", "quote": "..."} or null,
 "status": {"value": "active or closed", "url": "...", "quote": "..."} or null,
 "demand": [{"url": "...", "quote": "..."}]}</json>`;
}

// ---------- calling Claude ----------

const client = DRY ? null : new Anthropic();

async function ask(task) {
  const messages = [{ role: "user", content: task }];
  for (let round = 0; round < 6; round++) {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium" },
      tools: [
        { type: "web_search_20260209", name: "web_search", max_uses: 6 },
        { type: "web_fetch_20260209", name: "web_fetch", max_uses: 6 }
      ],
      messages: messages
    });

    if (response.stop_reason === "refusal") {
      throw new Error("refused: " + JSON.stringify(response.stop_details));
    }
    if (response.stop_reason === "pause_turn") {
      // long server-tool turn: send it back so Claude can continue
      messages.push({ role: "assistant", content: response.content });
      continue;
    }
    const text = response.content.filter(b => b.type === "text").map(b => b.text).join("\n");
    return parseJson(text);
  }
  throw new Error("too many pause_turn rounds");
}

function parseJson(text) {
  const m = text.match(/<json>([\s\S]*?)<\/json>/);
  if (!m) throw new Error("no <json> block in the answer");
  return JSON.parse(m[1]);
}

// ---------- checking ----------

const pageCache = new Map();

async function pageText(url) {
  if (pageCache.has(url)) return pageCache.get(url);
  let text = null;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "CertWise-factcheck/1.0 (student project)" },
      signal: AbortSignal.timeout(20000)
    });
    const type = res.headers.get("content-type") || "";
    if (res.ok && type.includes("html")) text = htmlToText(await res.text());
  } catch (e) {
    text = null;
  }
  pageCache.set(url, text);
  return text;
}

async function check(fact, report, label, extraTest) {
  if (!fact) return null;
  const text = await pageText(fact.url);
  if (text === null) {
    report.push({ label, url: fact.url, why: "could not read the page ourselves" });
    return null;
  }
  const v = verifyFact(fact, text);
  if (!v.ok) {
    report.push({ label, url: fact.url, why: v.why });
    return null;
  }
  if (extraTest && !extraTest(fact)) {
    report.push({ label, url: fact.url, why: "quote does not name the certificate" });
    return null;
  }
  return { value: fact.value === undefined ? null : fact.value, url: fact.url, quote: fact.quote, checkedOn: today };
}

// ---------- main ----------

function loadLive() {
  const file = path.join(root, "data", "live.js");
  if (!fs.existsSync(file)) return { refreshedOn: null, roles: {}, certs: {} };
  return require(file).LIVE;
}

function saveLive(live) {
  const body = "// CertWise - verified live facts. Written by refresh/refresh.mjs - do not edit by hand.\n" +
    "// Every fact was checked: its quote was found on the source page on checkedOn.\n\n" +
    "const LIVE = " + JSON.stringify(live, null, 2) + ";\n\n" +
    "if (typeof module !== \"undefined\") {\n  module.exports = { LIVE };\n}\n";
  fs.writeFileSync(path.join(root, "data", "live.js"), body);
}

async function main() {
  let roles = ROLES;
  let certs = CERTS.filter(c => c.aliases.length > 0);   // generic types (workshops...) have nothing to look up
  if (only === "roles") certs = [];
  if (only === "certs") roles = [];
  if (ids) {
    roles = roles.filter(r => ids.includes(r.id));
    certs = certs.filter(c => ids.includes(c.id));
  }

  console.log(`Refreshing ${roles.length} roles and ${certs.length} certificates with ${MODEL}${DRY ? " (dry run)" : ""}`);
  if (DRY) {
    for (const r of roles) console.log("\n--- role " + r.id + "\n" + roleTask(r));
    for (const c of certs) console.log("\n--- cert " + c.id + "\n" + certTask(c));
    return;
  }

  const live = loadLive();
  const report = [];

  for (const r of roles) {
    try {
      const a = await ask(roleTask(r));
      const salary = await check(a.salary, report, r.id + " salary");
      const demand = await check(a.demand, report, r.id + " demand");
      const skills = [];
      for (const s of (a.skills || []).slice(0, 5)) {
        const ok = await check(s, report, r.id + " skill");
        if (ok) skills.push(ok);
      }
      // keep the previous verified fact if this month's one failed the check
      const old = live.roles[r.id] || {};
      live.roles[r.id] = { salary: salary || old.salary || null, demand: demand || old.demand || null,
                           skills: skills.length ? skills : (old.skills || []) };
      console.log(`role ${r.id}: salary ${salary ? "ok" : "-"}, demand ${demand ? "ok" : "-"}, skills ${skills.length}`);
    } catch (e) {
      report.push({ label: r.id, why: "error: " + e.message });
      console.log(`role ${r.id}: error ${e.message}`);
    }
  }

  for (const c of certs) {
    try {
      const a = await ask(certTask(c));
      const price = await check(a.price, report, c.id + " price");
      const status = await check(a.status, report, c.id + " status");
      const demand = [];
      for (const d of (a.demand || []).slice(0, 3)) {
        const ok = await check(d, report, c.id + " demand", f => quoteNamesCert(f.quote, c));
        if (ok && !demand.some(x => new URL(x.url).hostname === new URL(ok.url).hostname)) demand.push(ok);
      }
      const old = live.certs[c.id] || {};
      live.certs[c.id] = { price: price || old.price || null, status: status || old.status || null,
                           demand: demand.length ? demand : (old.demand || []) };
      console.log(`cert ${c.id}: price ${price ? "ok" : "-"}, status ${status ? "ok" : "-"}, demand ${demand.length}`);
    } catch (e) {
      report.push({ label: c.id, why: "error: " + e.message });
      console.log(`cert ${c.id}: error ${e.message}`);
    }
  }

  live.refreshedOn = today;
  live.model = MODEL;
  saveLive(live);
  fs.writeFileSync(path.join(here, "report.json"), JSON.stringify({ date: today, dropped: report }, null, 2));
  console.log(`\nSaved data/live.js. Dropped ${report.length} facts (see refresh/report.json).`);
}

main();
