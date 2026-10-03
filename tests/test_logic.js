// Test harness for CertWise logic (sample links and "live" facts here are TEST-ONLY, never shipped)
const L = require("../logic.js");
const { CERTS, ROLES } = require("../data/certs.js");
const { VERIFY_METHODS, CERT_VERIFY, FAKE_UNIS } = require("../data/verify.js");
const { ROLE_INFO } = require("../data/roles.js");

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
  for (const r of c.roles) if (r !== "all" && !ROLE_INFO[r]) { fails++; console.log("FAIL bad role " + r + " in " + c.id); }
  if (!VERIFY_METHODS[CERT_VERIFY[c.id]]) { fails++; console.log("FAIL no verify method for " + c.id); }
}
for (const key in VERIFY_METHODS) {
  const m = VERIFY_METHODS[key];
  if (m.domains.length > 0 && m.src.length === 0) { fails++; console.log("FAIL no proof for verify method " + key); }
}
eq("certs in list", CERTS.length, 31);
eq("UGC fake universities", FAKE_UNIS.length, 32);

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
eq("google data analytics", s("Google Data Analytics"), "google-data");
eq("gibberish", s("qwerty zzz"), null);

// --- genuineness ---
const cert = id => CERTS.find(c => c.id === id);
const g = (id, link, issuer) => L.checkGenuine(cert(id), { link: link || "", issuer: issuer || "" }, VERIFY_METHODS, CERT_VERIFY, FAKE_UNIS);
eq("aws credly badge", g("aws-ccp", "https://www.credly.com/badges/sample-id").verdict, "Official verification link");
eq("aws credly, not a badge page", g("aws-ccp", "https://www.credly.com/users/someone").verdict, "Official site, but not a verification page");
eq("coursera verify link", g("google-data", "coursera.org/verify/SAMPLE123").verdict, "Official verification link");
eq("coursera look-alike", g("google-data", "https://coursera-verify.com/verify/SAMPLE123").level, "red");
eq("credly typo domain", g("aws-ccp", "https://www.credlly.com/badges/x").level, "red");
eq("credly link for coursera cert", g("google-data", "https://www.credly.com/badges/x").verdict, "Not the issuer's official site");
eq("unrelated site", g("google-data", "https://example.com/cert/1").verdict, "Not the issuer's official site");
eq("nptel qr link", g("nptel", "https://nptel.ac.in/noc/E_Certificate/NPTEL00SAMPLE").level, "green");
eq("comptia verify subdomain", g("secplus", "https://verify.comptia.org/").level, "green");
eq("red hat id format ok", g("rhcsa", "140-123-456").verdict, "ID looks right - confirm it");
eq("red hat id format wrong", g("rhcsa", "14012345").verdict, "ID doesn't match the format");
eq("workshop can't be verified", g("workshop").verdict, "Can't be verified");
eq("springboard no public page", g("springboard").verdict, "No public check found");
eq("no link yet", g("aws-ccp").verdict, "Not checked yet");
eq("fake university", g("nptel", "", "Commercial University Ltd, Daryaganj").verdict, "Fake university");
eq("fake university typo", g("nptel", "", "Commercial Universty Ltd").verdict, "Fake university");
eq("real university not flagged", g("nptel", "", "Savitribai Phule Pune University").verdict, "Not checked yet");
eq("hostOf without https", L.hostOf("coursera.org/verify/x"), "coursera.org");
eq("hostOf an ID", L.hostOf("140-123-456"), null);
eq("subdomain is not look-alike", L.looksLike("verify.comptia.org", "comptia.org"), false);
eq("look-alike with brand", L.looksLike("coursera-certificates.net", "coursera.org"), true);

// --- uploaded file: allowed types and size limit ---
const MB = 1024 * 1024;
eq("png accepted", L.checkFile("cert.png", "image/png", 1 * MB, 5).kind, "image");
eq("jpg accepted", L.checkFile("photo.JPG", "image/jpeg", 2 * MB, 5).kind, "image");
eq("pdf accepted", L.checkFile("certificate.pdf", "application/pdf", 3 * MB, 5).kind, "pdf");
eq("pdf by extension when type is missing", L.checkFile("certificate.pdf", "", 3 * MB, 5).kind, "pdf");
eq("too big rejected", L.checkFile("big.pdf", "application/pdf", 7.2 * MB, 5).ok, false);
eq("too big message", L.checkFile("big.pdf", "application/pdf", 7.2 * MB, 5).why, "This file is 7.2 MB - the limit is 5 MB.");
eq("exactly at the limit accepted", L.checkFile("ok.png", "image/png", 5 * MB, 5).ok, true);
eq("word file rejected", L.checkFile("cert.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 1 * MB, 5).ok, false);
eq("gif rejected", L.checkFile("anim.gif", "image/gif", 1 * MB, 5).ok, false);
eq("empty file rejected", L.checkFile("empty.pdf", "application/pdf", 0, 5).ok, false);

// --- links found inside a PDF ---
eq("verify page wins", L.pickLink(["https://www.coursera.org/learn/x", "https://coursera.org/verify/ABC123.", "https://example.com"], VERIFY_METHODS), "https://coursera.org/verify/ABC123");
eq("official site over others", L.pickLink(["https://example.com/a", "https://www.isc2.org/about"], VERIFY_METHODS), "https://www.isc2.org/about");
eq("look-alike kept so it gets flagged", L.pickLink(["https://example.com/a", "https://coursera-verify.com/verify/1"], VERIFY_METHODS), "https://coursera-verify.com/verify/1");
eq("no links", L.pickLink(["not a link", "123"], VERIFY_METHODS), null);

// --- market value ---
const mv = (id, live) => L.marketValue(cert(id), ROLES, ROLE_INFO, live || { certs: {}, roles: {} });
let r = mv("workshop"); eq("workshop value", r.percent, 0); eq("workshop band", r.band, "Low market value");
r = mv("aws-ccp"); eq("aws ccp value", r.percent, 100);
r = mv("nptel"); eq("nptel value", r.percent, 83);
r = mv("google-data"); eq("google data value", r.percent, 67); eq("google data band", r.band, "Medium market value");
r = mv("oracle-java-se"); eq("java se (IT under pressure)", r.percent, 83);
r = mv("cissp"); eq("cissp needs experience", r.warning !== null, true);
r = mv("tf-dev"); eq("tf closed", r.warning, "No longer offered - it can't be earned now.");
eq("aws ccp leads to cloud jobs", mv("aws-ccp").jobs[0].id, "cloud");

// demand from verified live sources (TEST-ONLY sample, never shipped)
const fakeLive = { roles: {}, certs: {
  rhcsa: { demand: [{ url: "https://a.example", quote: "q" }, { url: "https://b.example", quote: "q" }] },
  ccna: { demand: [{ url: "https://a.example", quote: "q" }] },
  "aws-ccp": { demand: [] },
  "az-104": { price: { value: "test value" } }   // free refresh: price checked, demand not looked up
} };
eq("2 sources -> 2 pts", mv("rhcsa", fakeLive).checks[2].points, 2);
eq("1 source -> 1 pt", mv("ccna", fakeLive).checks[2].points, 1);
eq("0 sources -> 0 pts", mv("aws-ccp", fakeLive).checks[2].points, 0);
eq("no demand list -> job demand", mv("az-104", fakeLive).checks[2].points, 2);

// higher value in the same field
const better = (id) => L.betterValue(cert(id), CERTS, ROLES, ROLE_INFO, { certs: {}, roles: {} }, 3).map(v => v.cert.id);
eq("workshop -> nptel first", better("workshop")[0], "nptel");
eq("google data -> pl-300 suggested", better("google-data").includes("pl-300"), true);
eq("aws ccp -> nothing higher", better("aws-ccp").length, 0);
console.log("   better for google-cyber:", better("google-cyber").join(", "));

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
eq("demand quote must name cert", V.quoteNamesCert("Employers want RHCSA holders", cert("rhcsa")), true);
eq("demand quote without cert", V.quoteNamesCert("Employers want Linux skills", cert("rhcsa")), false);

// --- edit distance ---
eq("edit kitten sitting", L.editDistance("kitten", "sitting"), 3);

console.log(fails === 0 ? "\nALL PASS" : "\n" + fails + " FAILED");
