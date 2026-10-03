// CertWise - page code (reads input, calls logic.js, shows results)

const TEAM = "Team Ctrl Freaks · She Solves 3.0";

// verified facts from the monthly refresh (data/live.js, written by refresh/refresh.mjs)
const LIVE_DATA = (typeof LIVE !== "undefined") ? LIVE : { refreshedOn: null, roles: {}, certs: {} };

// never put user text into the page without escaping it
function esc(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function $(id) {
  return document.getElementById(id);
}

function selectedRole() {
  return $("role").value;
}

function roleName(id) {
  const r = ROLES.find(x => x.id === id);
  return r ? r.name : id;
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch (e) {
    return "source";
  }
}

// list of {name, url} -> links (only http/https links are ever made clickable)
function proofLinks(list) {
  return list.filter(s => /^https?:\/\//.test(s.url))
    .map(s => "<a href='" + esc(s.url) + "' target='_blank' rel='noopener'>" + esc(s.name) + "</a>").join(" · ");
}

// one verified fact: value, the exact quote, a link to the page and the date it was checked
function factHtml(f, showValue) {
  let html = showValue === false ? "" : "<b>" + esc(f.value) + "</b>";
  html += "<div class='quote'>“" + esc(f.quote) + "”<br>";
  if (/^https?:\/\//.test(f.url)) {
    html += "<a href='" + esc(f.url) + "' target='_blank' rel='noopener'>" + esc(hostOf(f.url)) + "</a>";
  }
  html += " · verified " + esc(f.checkedOn) + "</div>";
  return html;
}

// ---------- setup ----------

function setup() {
  // role dropdown
  for (const r of ROLES) {
    const opt = document.createElement("option");
    opt.value = r.id;
    opt.textContent = r.name;
    $("role").appendChild(opt);
  }

  // tabs
  $("tabQuiz").addEventListener("click", () => showTab("quiz"));
  $("tabCert").addEventListener("click", () => showTab("cert"));
  $("tabAd").addEventListener("click", () => showTab("ad"));
  $("goQuiz").addEventListener("click", e => { e.preventDefault(); showTab("quiz"); });

  // quiz
  renderQuiz();
  $("quizBtn").addEventListener("click", runQuiz);

  // certificate check
  $("certBtn").addEventListener("click", runCertCheck);
  $("certInput").addEventListener("keydown", e => { if (e.key === "Enter") runCertCheck(); });
  for (const a of document.querySelectorAll(".try")) {
    a.addEventListener("click", e => {
      e.preventDefault();
      $("certInput").value = a.textContent;
      runCertCheck();
    });
  }

  // re-run when the role changes
  $("role").addEventListener("change", () => {
    if ($("certInput").value.trim() !== "") runCertCheck();
  });

  // ad check
  $("adBtn").addEventListener("click", runAdCheck);
  $("adExample").addEventListener("click", () => {
    $("adInput").value = "LIVE AI Tools Workshop - only Rs 9 today! Learn 20+ AI tools from Google, Microsoft and OpenAI " +
      "and become 10x more productive in just 3 hours. Get a certificate + bonuses worth Rs 15,000. " +
      "Only 37 seats left - offer ends in 02:59:41. 5 lakh+ students already joined. Earn Rs 50,000 per month with AI.";
    runAdCheck();
  });

  // footer + data info
  $("teamLine").textContent = TEAM;
  let info = "Our list has " + CERTS.length + " certificates. Live facts last refreshed: " +
    (LIVE_DATA.refreshedOn || "not yet") + ".";
  $("dataInfo").textContent = info;
}

function showTab(which) {
  $("paneQuiz").classList.toggle("hidden", which !== "quiz");
  $("paneCert").classList.toggle("hidden", which !== "cert");
  $("paneAd").classList.toggle("hidden", which !== "ad");
  $("tabQuiz").classList.toggle("active", which === "quiz");
  $("tabCert").classList.toggle("active", which === "cert");
  $("tabAd").classList.toggle("active", which === "ad");
}

// ---------- "Find my role" quiz ----------

function renderQuiz() {
  let html = "";
  QUIZ.forEach((item, i) => {
    html += "<fieldset class='q'><legend>" + (i + 1) + ". " + esc(item.q) + "</legend>";
    item.options.forEach((opt, j) => {
      html += "<label class='opt'><input type='radio' name='q" + i + "' value='" + j + "'> " + esc(opt.text) + "</label>";
    });
    html += "</fieldset>";
  });
  $("quizForm").innerHTML = html;
}

function runQuiz() {
  const answers = [];
  for (let i = 0; i < QUIZ.length; i++) {
    const picked = document.querySelector("input[name='q" + i + "']:checked");
    if (!picked) {
      $("quizResult").innerHTML = "<p class='warn'>Please answer question " + (i + 1) + ".</p>";
      return;
    }
    answers.push(Number(picked.value));
  }
  const ranking = scoreQuiz(answers, QUIZ, ROLES.map(r => r.id));
  showReport(ranking, ranking[0].roleId);
}

function sourceLinks(keys) {
  return keys.map(k => "<a href='" + esc(SOURCES[k].url) + "' target='_blank' rel='noopener'>" + esc(SOURCES[k].name) + "</a>").join(", ");
}

// shows the report for one role; the other matches can be opened too
function showReport(ranking, roleId) {
  const info = ROLE_INFO[roleId];
  const mine = ranking.find(r => r.roleId === roleId);
  const top = ranking[0];

  let html = "<div class='result'>";
  if (roleId === top.roleId) {
    html += "<h3>Your best match: " + esc(roleName(roleId)) + " <span class='fit'>" + mine.percent + "% fit</span></h3>";
  } else {
    html += "<h3>" + esc(roleName(roleId)) + " <span class='fit'>" + mine.percent + "% fit</span></h3>";
  }
  html += "<p class='small'>Also see: " + ranking.filter(r => r.roleId !== roleId).slice(0, 3)
    .map(r => "<a href='#' class='other' data-role='" + r.roleId + "'>" + esc(roleName(r.roleId)) + " (" + r.percent + "%)</a>").join(" · ") + "</p>";

  html += "<p>" + esc(info.what) + "</p>";
  html += "<p class='proof'>Facts below come with a <b>Proof</b> link or a quote. Sections marked <i>our advice</i> are our guidance, not facts.</p>";

  // subjects from college
  html += "<h4>College subjects that matter <span class='adv'>our advice</span></h4><p>" +
    info.subjects.map(s => "<span class='chip'>" + esc(s) + "</span>").join(" ") + "</p>";

  // skills to learn
  html += "<h4>Skills to learn next <span class='adv'>our advice</span></h4><ul>" + info.learnNext.map(s => "<li>" + esc(s) + "</li>").join("") + "</ul>";

  // market - verified live facts first, our earlier research only as a labelled fallback
  const live = LIVE_DATA.roles[roleId] || {};
  html += "<h4>What the market is looking for</h4>";
  if (live.demand) {
    html += factHtml(live.demand);
  } else {
    html += "<p><span class='tag'>" + esc(info.demand.label) + "</span> " + esc(info.demand.note) + "</p>";
    html += "<p class='proof'><b>Proof:</b> " + sourceLinks(info.demand.src) + " (our research, Oct 2026)</p>";
  }
  if (live.skills && live.skills.length > 0) {
    html += "<p>Skills employers ask for (verified):</p><ul>";
    for (const s of live.skills) {
      html += "<li>" + factHtml(s) + "</li>";
    }
    html += "</ul>";
  }

  // salary
  html += "<h4>Fresher salary in India</h4>";
  if (live.salary) {
    html += factHtml(live.salary);
  } else {
    html += "<p><b>" + esc(info.salary.range) + "</b></p>";
    html += "<p class='proof'><b>Proof:</b> " + sourceLinks(info.salary.src) + " (our research, Oct 2026)</p>";
  }
  html += "<p class='small'>" + esc(PUNE_NOTE.text) + " (" + sourceLinks(PUNE_NOTE.src) + "). " +
    "Pay depends most on the type of company and the city.</p>";

  // first certificates
  const firsts = bestAlternatives({ id: "none" }, roleId, CERTS, LIVE_DATA, 2);
  if (firsts.length > 0) {
    html += "<h4>Certificates worth a look later</h4><ul>";
    for (const f of firsts) {
      html += "<li><a href='#' class='pick' data-name='" + esc(f.cert.name) + "'>" + esc(f.cert.name) + "</a> - " + esc(f.cert.costNote) + "</li>";
    }
    html += "</ul><p class='small'>In first year, skills and projects come first - certificates come after.</p>";
  }

  // project
  html += "<h4>Try this mini project this month <span class='adv'>our advice</span></h4><p>" + esc(info.project) + "</p>";

  html += "<div class='row'><button id='useRole' class='primary'>Use " + esc(roleName(roleId)) + " and check certificates</button>" +
    "<button id='retake'>Retake quiz</button></div>";

  // compare all roles
  html += "<h4>All roles side by side</h4><table class='checks'><tr><th>Role</th><th>Your fit</th><th>Market</th><th>Fresher salary</th></tr>";
  for (const r of ranking) {
    const ri = ROLE_INFO[r.roleId];
    const lr = LIVE_DATA.roles[r.roleId] || {};
    const salary = lr.salary ? lr.salary.value + " (verified)" : ri.salary.range.split(";")[0];
    html += "<tr><td>" + esc(roleName(r.roleId)) + "</td><td class='pts'>" + r.percent + "%</td><td>" + esc(ri.demand.label) +
      "</td><td>" + esc(salary) + "</td></tr>";
  }
  html += "</table>";
  html += "<p class='small'>This quiz is a starting point, not a final decision. Talk to seniors and try the mini project before you decide.</p>";
  html += "</div>";

  $("quizResult").innerHTML = html;

  // links inside the report
  for (const a of $("quizResult").querySelectorAll(".other")) {
    a.addEventListener("click", e => {
      e.preventDefault();
      showReport(ranking, a.dataset.role);
    });
  }
  for (const a of $("quizResult").querySelectorAll(".pick")) {
    a.addEventListener("click", e => {
      e.preventDefault();
      $("role").value = roleId;
      showTab("cert");
      $("certInput").value = a.dataset.name;
      runCertCheck();
    });
  }
  $("useRole").addEventListener("click", () => {
    $("role").value = roleId;
    showTab("cert");
    $("certInput").focus();
  });
  $("retake").addEventListener("click", () => {
    $("quizResult").innerHTML = "";
    $("quizBox").classList.remove("hidden");
    $("quizBox").scrollIntoView();
  });

  // hide the questions while the report is showing
  $("quizBox").classList.add("hidden");
  $("quizResult").scrollIntoView();
}

// ---------- certificate check ----------

function runCertCheck() {
  const query = $("certInput").value.trim();
  const out = $("certResult");
  if (query === "") {
    out.innerHTML = "";
    return;
  }

  const cert = findCert(query, CERTS);
  if (cert === null) {
    const close = rankCerts(query, CERTS).slice(0, 3);
    let html = "<div class='result'><p>We don't have <b>" + esc(query) + "</b> in our list yet.</p>";
    if (close.length > 0) {
      html += "<p>Did you mean: " + close.map(c => "<a href='#' class='pick' data-name='" + esc(c.cert.name) + "'>" + esc(c.cert.name) + "</a>").join(" · ") + "</p>";
    }
    html += "<p class='small'>Tip: paste its ad in the \"Check an ad\" tab to look for pressure tactics.</p></div>";
    out.innerHTML = html;
    for (const a of out.querySelectorAll(".pick")) {
      a.addEventListener("click", e => {
        e.preventDefault();
        $("certInput").value = a.dataset.name;
        runCertCheck();
      });
    }
    return;
  }

  const role = selectedRole();
  const r = scoreCert(cert, role, LIVE_DATA);
  out.innerHTML = renderResult(r, role);
}

function renderResult(r, role) {
  const c = r.cert;
  let html = "<div class='result'>";
  html += "<h3>" + esc(c.name) + "</h3>";
  html += "<p class='small'>Issued by " + esc(c.issuer) + " · checked for: " + esc(roleName(role)) + "</p>";

  html += "<p class='verdict " + r.level + "'>" + esc(r.verdict);
  if (r.verdict === "Worth it" || r.verdict === "Think twice" || r.verdict === "Skip") {
    html += " <span>(" + r.total + " / " + r.max + " = " + r.percent + "%)</span>";
  }
  html += "</p>";

  // the reason behind a blocker verdict
  if (c.status === "closed") html += "<p class='warn'>This certificate is no longer offered.</p>";
  if (c.eligibility) html += "<p class='warn'>" + esc(c.eligibility) + " A first-year student can't take it yet - plan for it later.</p>";
  if (r.verdict === "Not for this role") html += "<p class='warn'>It may be a good certificate, but not for " + esc(roleName(role)) + ". Change the role above if you meant something else.</p>";

  // the five checks
  html += "<table class='checks'><tr><th>Check</th><th>Points</th><th>Why</th></tr>";
  for (const ch of r.checks) {
    const pts = ch.points === null ? "-" : ch.points + " / " + ch.max;
    html += "<tr><td>" + esc(ch.name) + "</td><td class='pts'>" + pts + "</td><td>" + esc(ch.reason) + "</td></tr>";
  }
  html += "</table>";

  html += "<p><b>Note:</b> " + esc(c.note) + "</p>";

  // proof for the facts above (issuer, exam type, price, eligibility, status)
  if (c.src.length > 0) {
    html += "<p class='proof'><b>Proof:</b> " + proofLinks(c.src) + "</p>";
  } else {
    html += "<p class='proof'>No outside fact here - this note is our advice.</p>";
  }

  // latest verified facts from the monthly refresh
  const lc = LIVE_DATA.certs[c.id];
  if (lc) {
    html += "<h4>Latest verified facts</h4>";
    if (lc.price) html += "<p>Price: " + factHtml(lc.price) + "</p>";
    if (lc.status) html += "<p>Status: " + factHtml(lc.status) + "</p>";
    if (lc.demand && lc.demand.length > 0) {
      html += "<p>Called in demand by:</p><ul>";
      for (const d of lc.demand) html += "<li>" + factHtml(d, false) + "</li>";
      html += "</ul>";
    }
  } else if (c.aliases.length > 0) {
    html += "<p class='small'>Live facts: not refreshed yet. The price in the Cost check is from our research - check the official page.</p>";
  }

  // alternatives
  const alts = bestAlternatives(c, role, CERTS, LIVE_DATA, 2);
  if (alts.length > 0) {
    html += "<div class='alts'><b>Better or cheaper picks for " + esc(roleName(role)) + ":</b><ul>";
    for (const a of alts) {
      html += "<li>" + esc(a.cert.name) + " - " + a.percent + "% · " + esc(a.cert.costNote) + "</li>";
    }
    html += "</ul>";
    if (c.id !== "nptel") {
      html += "<p class='small'>Also look for an NPTEL course on the same topic: free to study, about Rs 1,000 for the supervised exam.</p>";
    }
    html += "</div>";
  }

  html += "</div>";
  return html;
}

// ---------- ad check ----------

function runAdCheck() {
  const text = $("adInput").value.trim();
  const out = $("adResult");
  if (text === "") {
    out.innerHTML = "";
    return;
  }

  const r = checkAd(text, CERTS);
  let html = "<div class='result'>";
  html += "<p class='verdict " + r.level + "'>" + esc(r.verdict) + " <span>(" + r.flags.length + " warning signs)</span></p>";

  if (r.flags.length > 0) {
    html += "<table class='checks'><tr><th>Warning sign</th><th>Found in the ad</th><th>Why it matters</th></tr>";
    for (const f of r.flags) {
      const proof = f.src.length > 0 ? "<br><span class='proof'><b>Proof:</b> " + proofLinks(f.src) + "</span>" : "";
      html += "<tr><td>" + esc(f.label) + "</td><td class='found'>\"" + esc(f.found) + "\"</td><td>" + esc(f.why) + proof + "</td></tr>";
    }
    html += "</table>";
  }

  if (r.good) {
    html += "<p class='okline'>Good sign: the ad mentions \"" + esc(r.good) + "\".</p>";
  }

  if (r.named.length > 0) {
    html += "<p>This ad names: " + r.named.map(c => "<a href='#' class='pick' data-name='" + esc(c.name) + "'>" + esc(c.name) + "</a>").join(" · ") + " - click to check it.</p>";
  } else {
    html += "<p class='small'>The ad doesn't name a recognised certificate. Ask: who issues the certificate, and is there a real exam?</p>";
  }

  html += "</div>";
  out.innerHTML = html;

  for (const a of out.querySelectorAll(".pick")) {
    a.addEventListener("click", e => {
      e.preventDefault();
      showTab("cert");
      $("certInput").value = a.dataset.name;
      runCertCheck();
    });
  }
}

setup();
