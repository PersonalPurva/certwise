// Test harness for CertWise logic (synthetic posts here are TEST-ONLY, never shipped)
const L = require("../logic.js");
const { CERTS, ROLES } = require("../data/certs.js");

let fails = 0;
function eq(name, got, want) {
  const ok = got === want;
  if (!ok) fails++;
  console.log((ok ? "PASS " : "FAIL ") + name + "  got=" + got + (ok ? "" : "  want=" + want));
}

// --- data sanity ---
const ids = new Set();
for (const c of CERTS) {
  if (ids.has(c.id)) { fails++; console.log("FAIL duplicate id " + c.id); }
  ids.add(c.id);
  for (const k of ["issuerType", "assessment", "costBand"]) {
    const allowed = { issuerType: ["vendor","academic","platform","unknown"], assessment: ["proctored","graded","attendance"], costBand: ["free","low","medium","high"] }[k];
    if (!allowed.includes(c[k])) { fails++; console.log("FAIL bad " + k + " in " + c.id); }
  }
  for (const r of c.roles) if (r !== "all" && !ROLES.some(x => x.id === r)) { fails++; console.log("FAIL bad role " + r + " in " + c.id); }
}
console.log("certs:", CERTS.length);

// --- search ---
const s = q => { const c = L.findCert(q, CERTS); return c ? c.id : null; };
eq("rhcsa", s("rhcsa"), "rhcsa");
eq("typo security plus", s("secuirty plus"), "secplus");
eq("comptia security+", s("CompTIA Security+"), "secplus");
eq("typo cloud practioner", s("aws cloud practioner"), "aws-ccp");
eq("az900 no dash", s("az900"), "az-900");
eq("nptel java", s("nptel java"), "nptel");
eq("tensorflow", s("tensorflow certificate"), "tf-dev");
eq("ai tools workshop", s("AI tools workshop"), "workshop");
eq("paid internship", s("paid virtual internship certificate"), "paid-internship");
eq("ceh", s("CEH"), "ceh");
eq("power bi", s("power bi pl-300"), "pl-300");
eq("gibberish", s("qwerty zzz"), null);

// --- mentions (word boundaries) ---
eq("cka not in mckay", L.mentions("contact mckay for details", "cka"), false);
eq("cka standalone", L.mentions("Must have CKA or CKAD", "cka"), true);
eq("security+ with plus", L.mentions("CompTIA Security+ preferred", "security+"), true);
eq("az-900", L.mentions("Azure (AZ-900) a plus", "az-900"), true);

// --- scoring without posts (demand unscored) ---
const sc = (id, role, posts) => L.scoreCert(CERTS.find(c => c.id === id), role, posts || []);
let r = sc("workshop", "ai"); eq("workshop verdict", r.verdict, "Skip");
r = sc("nptel", "dev"); eq("nptel verdict", r.verdict, "Worth it");
r = sc("rhcsa", "cloud"); eq("rhcsa verdict (no posts)", r.verdict, "Worth it"); console.log("   rhcsa", r.total + "/" + r.max, r.percent + "%");
r = sc("cissp", "sec"); eq("cissp blocked", r.verdict, "Not yet");
r = sc("tf-dev", "ai"); eq("tf closed", r.verdict, "Not available");
r = sc("google-cyber", "sec"); console.log("   google-cyber", r.total + "/" + r.max, r.percent + "%", r.verdict);
r = sc("aws-saa", "cloud"); console.log("   aws-saa", r.total + "/" + r.max, r.percent + "%", r.verdict);
r = sc("rhcsa", "web"); eq("rhcsa for web", r.verdict, "Not for this role");
r = sc("participation", "dev"); eq("participation", r.verdict, "Skip");
r = sc("paid-internship", "dev"); eq("paid internship", r.verdict, "Skip");

// --- demand with TEST-ONLY synthetic posts ---
// --- demand from verified live sources (TEST-ONLY sample, never shipped) ---
const fakeLive = { certs: {
  rhcsa: { demand: [{ url: "https://a.example", quote: "q" }, { url: "https://b.example", quote: "q" }] },
  ccna: { demand: [{ url: "https://a.example", quote: "q" }] },
  "aws-ccp": { demand: [] },
  "az-104": { price: { value: "test value" } }   // free refresh: price checked, demand not looked up
} };
r = sc("rhcsa", "cloud", fakeLive); eq("2 sources -> 2 pts", r.checks[3].points, 2);
r = sc("ccna", "sec", fakeLive); eq("1 source -> 1 pt", r.checks[3].points, 1);
r = sc("aws-ccp", "cloud", fakeLive); eq("0 sources -> 0 pts", r.checks[3].points, 0);
r = sc("az-900", "cloud", fakeLive); eq("not refreshed -> unscored", r.checks[3].points, null);
r = sc("workshop", "cloud", fakeLive); eq("generic type -> 0 pts", r.checks[3].points, 0);
r = sc("az-104", "cloud", fakeLive); eq("free refresh, no demand list -> unscored", r.checks[3].points, null);

// --- free refresh helpers (refresh/pages.js) ---
const P = require("../refresh/pages.js");
const longPage = "x ".repeat(3000) + "The CCNA exam fee is USD 300 plus tax. " + "y ".repeat(3000);
const cut = P.excerpt(longPage, ["fee"], 1500);
eq("excerpt keeps the fee sentence", cut.includes("The CCNA exam fee is USD 300 plus tax."), true);
eq("excerpt is shorter", cut.length <= 1500, true);
eq("short page sent whole", P.excerpt("Exam fee USD 99.", ["fee"], 1500), "Exam fee USD 99.");
const sample = { steps: [{ type: "thought", signature: "abc" },
  { type: "model_output", content: [{ type: "text", text: "<json>{\"price\": null}</json>" }] }] };
eq("gemini answer text read", P.collectText(sample), "<json>{\"price\": null}</json>");
eq("empty gemini answer", P.collectText({}), "");

// --- fact checker (refresh/verify.js) ---
const V = require("../refresh/verify.js");
const page = V.htmlToText("<html><script>var x=1</script><p>Freshers typically earn &#8377;3.5&ndash;6 LPA in data analyst roles.</p>" +
  "<p>The exam costs USD 100.</p></html>");
eq("html stripped", page.includes("var x"), false);
eq("real quote accepted", V.verifyFact({ value: "₹3.5 - 6 LPA", url: "https://x.example", quote: "Freshers typically earn ₹3.5–6 LPA in data analyst roles." }, page).ok, true);
eq("Rs. vs ₹ accepted", V.verifyFact({ value: "Rs 3.5-6 LPA", url: "https://x.example", quote: "Freshers typically earn Rs. 3.5-6 LPA in data analyst roles" }, page).ok, true);
eq("changed quote rejected", V.verifyFact({ value: "₹4 - 8 LPA", url: "https://x.example", quote: "Freshers typically earn ₹4–8 LPA in data analyst roles." }, page).ok, false);
eq("number not in quote rejected", V.verifyFact({ value: "USD 150", url: "https://x.example", quote: "The exam costs USD 100." }, page).ok, false);
eq("missing url rejected", V.verifyFact({ value: "USD 100", url: "", quote: "The exam costs USD 100." }, page).ok, false);
eq("demand quote must name cert", V.quoteNamesCert("Employers want RHCSA holders", CERTS.find(c => c.id === "rhcsa")), true);
eq("demand quote without cert", V.quoteNamesCert("Employers want Linux skills", CERTS.find(c => c.id === "rhcsa")), false);

// --- alternative ---
for (const [id, role] of [["workshop","ai"], ["google-cyber","sec"], ["paid-internship","web"], ["participation","dev"], ["aws-saa","cloud"], ["workshop","data"]]) {
  const alts = L.bestAlternatives(CERTS.find(c => c.id === id), role, CERTS, [], 2);
  console.log("alts for " + id + "/" + role + ":", alts.map(a => a.cert.id + " " + a.percent + "% " + a.cert.costBand).join(", "));
}

// --- ad check ---
const ad = "LIVE AI Tools Workshop - only Rs 9 today! Learn 20+ AI tools from Google, Microsoft and OpenAI and become 10x more productive in just 3 hours. Get a certificate + bonuses worth Rs 15,000. Only 37 seats left - offer ends in 02:59:41. 5 lakh+ students already joined. Earn Rs 50,000 per month with AI.";
const a = L.checkAd(ad, CERTS);
console.log("ad verdict:", a.verdict, a.flags.length, a.flags.map(f => f.label + " [" + f.found + "]").join(" | "));
eq("ad high pressure", a.verdict, "High-pressure ad");
const a2 = L.checkAd("NPTEL course: 12 weeks, graded assignments, proctored exam at a centre, exam fee Rs 1000.", CERTS);
console.log("ad2:", a2.verdict, a2.flags.map(f => f.label + " [" + f.found + "]").join(" | "), "good:", a2.good, "named:", a2.named.map(c => c.id));
const a3 = L.checkAd("Prepare for AWS Certified Cloud Practitioner (CLF-C02). Official exam fee USD 100.", CERTS);
console.log("ad3:", a3.verdict, a3.flags.map(f => f.label + " [" + f.found + "]").join(" | "), "named:", a3.named.map(c => c.id));
eq("vendor ad not flagged brand", a3.flags.some(f => f.label === "Big-company names"), false);

// --- quiz: every role must be reachable as the top match ---
const { ROLE_INFO, QUIZ } = require("../data/roles.js");
const roleIds = ROLES.map(r => r.id);
for (const id of roleIds) {
  // pick, for each question, the option that gives this role the most points
  // (ties broken by fewest points to other roles)
  const answers = QUIZ.map(q => {
    let bestI = 0, bestScore = -1e9;
    q.options.forEach((o, i) => {
      const mine = o.pts[id] || 0;
      const others = Object.keys(o.pts).filter(k => k !== id).reduce((s, k) => s + o.pts[k], 0);
      const sc = mine * 10 - others;
      if (sc > bestScore) { bestScore = sc; bestI = i; }
    });
    return bestI;
  });
  const res = L.scoreQuiz(answers, QUIZ, roleIds);
  eq("quiz top for " + id, res[0].roleId, id);
  if (!ROLE_INFO[id]) { fails++; console.log("FAIL no ROLE_INFO for " + id); }
}

// --- edit distance ---
eq("edit kitten sitting", L.editDistance("kitten", "sitting"), 3);

console.log(fails === 0 ? "\nALL PASS" : "\n" + fails + " FAILED");

