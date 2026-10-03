// CertWise - core logic (no HTML in this file)
// 1. findCert()      : match what the student typed to a certificate (handles typos)
// 2. demandSources() : verified sources (from the monthly refresh) that call the certificate in demand
// 3. scoreCert()     : five checks -> score -> verdict
// 4. bestAlternatives(): best certificates in our list for the same role
// 5. checkAd()       : pressure tactics inside an advertisement
// 6. scoreQuiz()     : "Find my role" quiz -> fit % for every role

// ---------- text helpers ----------

function normalize(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9+.\- ]/g, " ")   // keep letters, digits, + . - (for "security+", "1z0-811")
    .replace(/\s+/g, " ")
    .trim();
}

function words(text) {
  return normalize(text).split(" ").filter(w => w.length > 0);
}

// Levenshtein (edit) distance with a DP table:
// dp[i][j] = edits needed to turn the first i letters of a into the first j letters of b
function editDistance(a, b) {
  const dp = [];
  for (let i = 0; i <= a.length; i++) {
    dp.push([i]);
  }
  for (let j = 1; j <= b.length; j++) {
    dp[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,        // delete
        dp[i][j - 1] + 1,        // insert
        dp[i - 1][j - 1] + cost  // replace (or keep)
      );
    }
  }
  return dp[a.length][b.length];
}

// two words "match" if they are equal or only a small typo apart
function wordsMatch(typed, real) {
  if (typed === real) return true;
  if (typed.length < 4) return false;          // short words must match exactly
  const allowed = typed.length >= 7 ? 2 : 1;
  return editDistance(typed, real) <= allowed;
}

// ---------- 1. find the certificate ----------

// returns a list of { cert, score } sorted best first (score 0..1)
function rankCerts(query, certs) {
  const q = normalize(query);
  const qWords = words(query).filter(w => !["certificate", "certification", "course", "exam", "the", "of", "for"].includes(w));
  const results = [];

  for (const cert of certs) {
    let score = 0;

    // exact alias or name inside the query (e.g. "rhcsa", "az-900")
    const names = [normalize(cert.name)].concat(cert.aliases.map(normalize));
    for (const n of names) {
      if (n.length > 0 && (q === n || q.includes(n) || n.includes(q))) {
        score = Math.max(score, q.length >= 3 ? 1 : 0.5);
      }
    }

    // otherwise: how many typed words appear (with typos allowed) in the name / aliases
    if (score < 1 && qWords.length > 0) {
      const certWords = words(cert.name + " " + cert.aliases.join(" ") + " " + cert.issuer + " " + (cert.keywords || ""));
      let found = 0;
      for (const w of qWords) {
        if (certWords.some(cw => wordsMatch(w, cw))) found++;
      }
      score = Math.max(score, found / qWords.length);
    }

    if (score > 0) results.push({ cert: cert, score: score });
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

function findCert(query, certs) {
  const ranked = rankCerts(query, certs);
  if (ranked.length > 0 && ranked[0].score >= 0.6) return ranked[0].cert;
  return null;
}

// ---------- 2. demand from verified sources ----------

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// true if the alias appears as a separate word / phrase (so "cka" does not match inside "mckay")
function mentions(text, alias) {
  const re = new RegExp("(^|[^a-z0-9])" + escapeRegex(alias) + "($|[^a-z0-9])", "i");
  return re.test(text);
}

// live = LIVE from data/live.js; returns the list of verified sources, or null if never refreshed
function demandSources(cert, live) {
  if (!live || !live.certs || !live.certs[cert.id]) return null;
  return live.certs[cert.id].demand || [];
}

// ---------- 3. score one certificate ----------

const ISSUER_POINTS = {
  vendor:   [2, "Issued by the company or body whose technology / field it tests."],
  academic: [2, "IIT / IISc course with a supervised university-style exam."],
  platform: [1, "Well-known learning platform, but anyone can enrol and finish."],
  unknown:  [0, "Not a known issuer - a recruiter can't tell what it proves."]
};

const ASSESS_POINTS = {
  proctored:  [2, "You must pass a supervised exam."],
  graded:     [1, "You pass online tests or projects, but nobody supervises them."],
  attendance: [0, "You get it just for attending."]
};

const COST_POINTS = {
  free:   [2, "Free."],
  low:    [2, "Low cost (under Rs 2,000)."],
  medium: [1, "Medium cost (Rs 2,000 - 10,000)."],
  high:   [0, "Expensive (above Rs 10,000) - pay only once you are sure."]
};

function scoreCert(cert, roleId, live) {
  const checks = [];

  // check 1: who gives it
  const iss = ISSUER_POINTS[cert.issuerType];
  checks.push({ name: "Who gives it", points: iss[0], max: 2, reason: iss[1] });

  // check 2: how you earn it
  const as = ASSESS_POINTS[cert.assessment];
  checks.push({ name: "How you earn it", points: as[0], max: 2, reason: as[1] });

  // check 3: does it fit the chosen role
  let roleFit = 0;
  if (cert.roles.includes(roleId)) {
    roleFit = 2;
    checks.push({ name: "Fits your role", points: 2, max: 2, reason: "Made for this kind of job." });
  } else if (cert.roles.includes("all")) {
    roleFit = 1;
    checks.push({ name: "Fits your role", points: 1, max: 2, reason: "Depends on the topic you pick." });
  } else {
    checks.push({ name: "Fits your role", points: 0, max: 2, reason: "Made for a different kind of job." });
  }

  // check 4: do verified sources call it in demand?
  const demand = demandSources(cert, live);
  if (cert.aliases.length === 0) {
    checks.push({ name: "In demand (verified sources)", points: 0, max: 2,
      reason: "Not a named credential, so employers can't ask for it." });
  } else if (demand === null) {
    checks.push({ name: "In demand (verified sources)", points: null, max: 2,
      reason: "Not scored yet - this certificate hasn't been through the monthly refresh." });
  } else {
    let pts = 0;
    if (demand.length >= 2) pts = 2;
    else if (demand.length === 1) pts = 1;
    checks.push({ name: "In demand (verified sources)", points: pts, max: 2,
      reason: demand.length === 0 ? "No verified source calls it in demand."
        : "Called in demand by " + demand.length + " verified source" + (demand.length > 1 ? "s" : "") + "." });
  }

  // check 5: value for money
  const co = COST_POINTS[cert.costBand];
  checks.push({ name: "Cost", points: co[0], max: 2, reason: co[1] + " " + cert.costNote });

  // add up only the checks that were scored
  let total = 0, max = 0;
  for (const c of checks) {
    if (c.points !== null) {
      total += c.points;
      max += c.max;
    }
  }
  const percent = Math.round((total / max) * 100);

  // verdict - hard blockers first
  let verdict, level;
  if (cert.status === "closed") {
    verdict = "Not available"; level = "red";
  } else if (cert.eligibility) {
    verdict = "Not yet"; level = "amber";
  } else if (roleFit === 0) {
    verdict = "Not for this role"; level = "amber";
  } else if (percent >= 70) {
    verdict = "Worth it"; level = "green";
  } else if (percent >= 45) {
    verdict = "Think twice"; level = "amber";
  } else {
    verdict = "Skip"; level = "red";
  }

  return { cert: cert, checks: checks, total: total, max: max, percent: percent,
           verdict: verdict, level: level, demand: demand };
}

// ---------- 4. better alternatives ----------

// top `howMany` certificates made for the same role that get a "Worth it" verdict
// sorted by score (high first), then by cost (cheap first)
// (NPTEL fits every role, so the page shows it as a separate tip instead of here)
function bestAlternatives(cert, roleId, certs, live, howMany) {
  const list = [];
  for (const c of certs) {
    if (c.id === cert.id) continue;
    if (!c.roles.includes(roleId)) continue;
    const r = scoreCert(c, roleId, live);
    if (r.verdict === "Worth it") list.push(r);
  }
  list.sort((a, b) => (b.percent - a.percent) || (costRank(a.cert) - costRank(b.cert)));
  return list.slice(0, howMany);
}

function costRank(cert) {
  return ["free", "low", "medium", "high"].indexOf(cert.costBand);
}

// ---------- 5. check an advertisement ----------

const AD_RULES = [
  { id: "urgency", label: "Rushes you to decide",
    why: "Countdown timers and 'last seats' stop you from comparing options.",
    re: /(today only|only today|last \d+ seats|last few seats|seats left|hurry|ends (in|tonight|soon|today)|limited (time|seats|period|offer)|offer expires|closing soon|\b\d{1,2}:\d{2}:\d{2}\b)/i },
  { id: "tinyprice", label: "Tiny entry price",
    why: "A very low entry fee can be the start of a sales pitch for a costlier course - check what is sold at the end.",
    re: /((₹|rs\.?|inr)\s?(9|19|29|49|99|199)(?![\d,]))/i },
  { id: "bonus", label: "Big 'worth' numbers",
    why: "'Bonuses worth Rs 15,000' is a value the seller picked, not a price anyone paid.",
    re: /((worth|value)\s*(of\s*)?(₹|rs\.?|inr)\s?[\d,]+|free bonus|bonuses)/i },
  { id: "guarantee", label: "Guaranteed results",
    why: "No course can guarantee a job or salary. India's consumer protection authority (CCPA) bans such claims in coaching ads and has fined coaching centres for them.",
    src: [{ name: "CCPA guidelines on coaching ads (Social Samosa)", url: "https://www.socialsamosa.com/industry-updates/ccpa-guidelines-tackle-misleading-ads-coaching-sector-7578017" },
          { name: "CCPA fines on 24 coaching centres (Taxmann)", url: "https://www.taxmann.com/post/blog/consumer-protection-authority-fines-24-coaching-centres-%e2%82%b977-6-lakh-for-misleading-ads-urges-compliance-with-guidelines" }],
    re: /(100\s?% (placement|job)|guaranteed (job|placement|salary|income)|job guarantee|placement guarantee|assured (job|placement))/i },
  { id: "earning", label: "Earning promises",
    why: "Income claims are easy to write and hard to check.",
    re: /(\bearn (up to )?(₹|rs\.?|inr)\s?[\d,]+|[\d.]+\s?lpa|(₹|rs\.?)\s?[\d,]+\s?(\/|per)\s?month)/i },
  { id: "speed", label: "Expert in hours",
    why: "Real skills take weeks of practice, not a 3-hour session.",
    re: /(\b10x\b|in (just )?\d+ (hours|hrs)|become (an )?expert|master .{0,30} in \d+ (hours|hrs))/i },
  { id: "brand", label: "Big-company names",
    why: "Teaching 'tools from Google / Microsoft' is not the same as a certificate issued by them. Check who signs the certificate.",
    re: /(tools? (from|by|of|like) .{0,40}\b(google|microsoft|amazon|ibm|meta|openai|chatgpt|nvidia)\b|\b(google|microsoft|amazon|ibm|meta|openai|chatgpt|nvidia)\b.{0,30}\btools?\b)/i },
  { id: "crowd", label: "Huge crowd numbers",
    why: "Lots of people joining doesn't tell you what recruiters think.",
    re: /(\d+(\.\d+)?\s?(lakh|lakhs|k|million|m|crore)\+?\s*(students|learners|people|professionals))/i }
];

const AD_GOOD = /(proctored|supervised exam|official exam|exam fee|credit transfer|credits|swayam|nptel|graded assignments?)/i;

function checkAd(text, certs) {
  const flags = [];
  for (const rule of AD_RULES) {
    const m = text.match(rule.re);
    if (m) flags.push({ label: rule.label, why: rule.why, found: m[0].trim(), src: rule.src || [] });
  }

  const good = text.match(AD_GOOD);

  // does the ad name a certificate we know?
  const named = [];
  const lower = text.toLowerCase();
  for (const c of certs) {
    if (c.aliases.some(a => mentions(lower, a))) named.push(c);
  }

  let verdict, level;
  if (flags.length >= 3) { verdict = "High-pressure ad"; level = "red"; }
  else if (flags.length >= 1) { verdict = "Be careful"; level = "amber"; }
  else { verdict = "No pressure tactics found"; level = "green"; }

  return { flags: flags, good: good ? good[0] : null, named: named, verdict: verdict, level: level };
}

// ---------- 6. "Find my role" quiz ----------

// answers[i] = index of the option picked for question i
// returns every role with its points and fit %, best first
function scoreQuiz(answers, quiz, roleIds) {
  const got = {}, max = {};
  for (const id of roleIds) {
    got[id] = 0;
    max[id] = 0;
  }

  for (let i = 0; i < quiz.length; i++) {
    // the most this role could have got on this question
    for (const id of roleIds) {
      let best = 0;
      for (const opt of quiz[i].options) {
        best = Math.max(best, opt.pts[id] || 0);
      }
      max[id] += best;
    }
    // what the student actually picked
    const picked = quiz[i].options[answers[i]];
    for (const id in picked.pts) {
      got[id] += picked.pts[id];
    }
  }

  const result = roleIds.map(id => ({
    roleId: id, points: got[id], max: max[id],
    percent: Math.round((got[id] / max[id]) * 100)
  }));
  result.sort((a, b) => b.percent - a.percent);
  return result;
}

if (typeof module !== "undefined") {
  module.exports = { normalize, editDistance, rankCerts, findCert, mentions, demandSources,
                     scoreCert, bestAlternatives, checkAd, scoreQuiz };
}
