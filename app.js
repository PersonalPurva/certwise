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

function siteOf(url) {
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

// keys of SOURCES in data/roles.js -> links
function sourceLinks(keys) {
  return proofLinks((keys || []).filter(k => SOURCES[k]).map(k => SOURCES[k]));
}

// one verified fact: value, the exact quote, a link to the page and the date it was checked
function factHtml(f, showValue) {
  let html = showValue === false ? "" : "<b>" + esc(f.value) + "</b>";
  html += "<div class='quote'>“" + esc(f.quote) + "”<br>";
  if (/^https?:\/\//.test(f.url)) {
    html += "<a href='" + esc(f.url) + "' target='_blank' rel='noopener'>" + esc(siteOf(f.url)) + "</a>";
  }
  html += " · verified " + esc(f.checkedOn) + "</div>";
  return html;
}

// ---------- setup ----------

function setup() {
  $("checkBtn").addEventListener("click", runCheck);
  for (const id of ["certInput", "linkInput", "issuerInput"]) {
    $(id).addEventListener("keydown", e => { if (e.key === "Enter") runCheck(); });
  }

  // example buttons
  for (const a of document.querySelectorAll(".try")) {
    a.addEventListener("click", e => {
      e.preventDefault();
      $("certInput").value = a.dataset.cert;
      $("linkInput").value = a.dataset.link || "";
      $("issuerInput").value = a.dataset.issuer || "";
      $("qrStatus").textContent = "";
      runCheck();
    });
  }

  $("qrFile").addEventListener("change", () => {
    if ($("qrFile").files.length > 0) readQr($("qrFile").files[0]);
  });

  $("teamLine").textContent = TEAM;
  const ways = Object.keys(VERIFY_METHODS).filter(k => VERIFY_METHODS[k].domains.length > 0).length;
  $("dataInfo").textContent = "Our list has " + CERTS.length + " certificates and " + ways +
    " official ways of verifying them. Live facts last refreshed: " +
    (LIVE_DATA.refreshedOn || "not yet") + ".";
}

// ---------- read the QR code from a photo of the certificate ----------

function readQr(file) {
  if (typeof jsQR === "undefined") {
    $("qrStatus").textContent = "The QR reader didn't load (it needs an internet connection).";
    return;
  }
  $("qrStatus").textContent = "Reading...";
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    // big photos are shrunk first so the QR reader stays fast
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(pixels.data, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    if (code && code.data) {
      $("linkInput").value = code.data;
      $("qrStatus").textContent = "QR code read - the link is filled in above.";
      if ($("certInput").value.trim() !== "") runCheck();
    } else {
      $("qrStatus").textContent = "No QR code found in this image. Type the link printed on the certificate instead.";
    }
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    $("qrStatus").textContent = "Couldn't open this file - use a PNG or JPG photo / screenshot.";
  };
  img.src = url;
}

// ---------- the check ----------

function runCheck() {
  const query = $("certInput").value.trim();
  const input = { link: $("linkInput").value.trim(), issuer: $("issuerInput").value.trim() };
  const out = $("result");

  if (query === "") {
    out.innerHTML = "<section class='box'><p>Type the certificate's name first.</p></section>";
    return;
  }

  const cert = findCert(query, CERTS);
  if (!cert) {
    let html = "<section class='box result'><h3>We don't have \"" + esc(query) + "\" in our list yet</h3>";
    const fake = input.issuer ? matchFakeUni(input.issuer, FAKE_UNIS) : null;
    if (fake) {
      html += "<div class='verdict red'>Fake university</div><p>\"" + esc(fake) + "\" is on UGC's list of fake universities " +
        "(February 2026). Its degrees and certificates are not valid.</p><p class='proof'><b>Proof:</b> " + proofLinks([FAKE_UNIS_SRC]) + "</p>";
    }
    const close = rankCerts(query, CERTS).filter(r => r.score >= 0.3).slice(0, 3);
    if (close.length > 0) {
      html += "<p>Did you mean: " + close.map(r => "<a href='#' class='pick' data-name='" + esc(r.cert.name) + "'>" +
        esc(r.cert.name) + "</a>").join(" · ") + "?</p>";
    }
    html += "<p class='small'>Tip: a real certificate almost always has a verification link or ID. If it has neither, " +
      "anyone could have made it.</p></section>";
    out.innerHTML = html;
    wirePicks();
    return;
  }

  const g = checkGenuine(cert, input, VERIFY_METHODS, CERT_VERIFY, FAKE_UNIS);
  const v = marketValue(cert, ROLES, ROLE_INFO, LIVE_DATA);
  out.innerHTML = "<section class='box result'><h3>" + esc(cert.name) + "</h3>" +
    "<p class='small'>Issued by " + esc(cert.issuer) + "</p>" +
    "<div class='two'>" + genuineHtml(cert, g) + valueHtml(cert, v, g) + "</div></section>";
  wirePicks();
}

function genuineHtml(cert, g) {
  let html = "<div class='panel'><h4>1. Is it genuine?</h4>";
  html += "<div class='verdict " + g.level + "'>" + esc(g.verdict) + "</div><ul>";
  for (const r of g.reasons) html += "<li>" + esc(r) + "</li>";
  html += "</ul>";
  if (g.page) {
    html += "<p><a class='button' href='" + esc(g.page) + "' target='_blank' rel='noopener'>Open the official check</a></p>";
  }
  if (g.verdict === "Fake university") {
    html += "<p class='proof'><b>Proof:</b> " + proofLinks([FAKE_UNIS_SRC]) + "</p>";
  } else {
    html += "<p class='proof'><b>How " + esc(cert.issuer) + " certificates are verified:</b> " + esc(g.method.how);
    if (g.method.src.length > 0) html += "<br><b>Proof:</b> " + proofLinks(g.method.src);
    html += "</p>";
  }
  return html + "</div>";
}

function valueHtml(cert, v, g) {
  let html = "<div class='panel'><h4>2. What is it worth?</h4>";
  if (g.level === "red") {
    html += "<div class='verdict red'>0% <span>No market value if it is fake</span></div>" +
      "<p class='warn'>A fake certificate is worth nothing - and showing one can cost you the job. " +
      "The score below is for a genuine " + esc(cert.name) + ".</p>";
  }
  html += "<div class='verdict " + v.level + "'>" + v.percent + "% <span>" + esc(v.band) + (g.level === "red" ? " (if genuine)" : "") + "</span></div>";
  if (v.warning) html += "<p class='warn'>" + esc(v.warning) + "</p>";

  html += "<table class='checks'><tr><th>Check</th><th>Points</th><th>Why</th></tr>";
  for (const ch of v.checks) {
    let why = esc(ch.reason);
    if (ch.src && ch.src.length > 0) why += "<br><span class='proof'>Proof: " + sourceLinks(ch.src) + "</span>";
    html += "<tr><td>" + esc(ch.name) + "</td><td class='pts'>" + ch.points + " / " + ch.max + "</td><td>" + why + "</td></tr>";
  }
  html += "</table>";

  // price (hand-checked, with proof) + newest verified facts from the monthly refresh
  html += "<p><b>Price:</b> " + esc(cert.costNote) + "</p>";
  if (cert.src.length > 0) html += "<p class='proof'><b>Proof:</b> " + proofLinks(cert.src) + "</p>";
  const lc = LIVE_DATA.certs[cert.id];
  if (lc && (lc.price || lc.status)) {
    html += "<p><b>Latest verified facts:</b></p>";
    if (lc.price) html += "<p>Price: " + factHtml(lc.price) + "</p>";
    if (lc.status) html += "<p>Status: " + factHtml(lc.status) + "</p>";
  }
  if (lc && lc.demand && lc.demand.length > 0) {
    html += "<p><b>Sources that call it in demand:</b></p><ul>";
    for (const d of lc.demand) html += "<li>" + factHtml(d, false) + "</li>";
    html += "</ul>";
  }

  // the jobs it leads to, with fresher salary
  if (v.jobs.length > 0) {
    html += "<p><b>Jobs it leads to (fresher pay in India):</b></p><ul>";
    for (const j of v.jobs) {
      const liveRole = LIVE_DATA.roles[j.id];
      if (liveRole && liveRole.salary) {
        html += "<li>" + esc(j.name) + ": " + factHtml(liveRole.salary) + "</li>";
      } else {
        html += "<li>" + esc(j.name) + ": " + esc(j.info.salary.range) +
          " <span class='proof'>(" + sourceLinks(j.info.salary.src) + ")</span></li>";
      }
    }
    html += "</ul><p class='proof'>" + esc(PUNE_NOTE.text) + " (" + sourceLinks(PUNE_NOTE.src) + ").</p>";
  }

  if (cert.note) html += "<p><span class='adv'>our advice</span> " + esc(cert.note) + "</p>";

  const better = betterValue(cert, CERTS, ROLES, ROLE_INFO, LIVE_DATA, 3);
  if (better.length > 0) {
    html += "<div class='alts'><b>Higher value in the same field:</b><ul>";
    for (const b of better) {
      html += "<li><a href='#' class='pick' data-name='" + esc(b.cert.name) + "'>" + esc(b.cert.name) + "</a> - " +
        b.percent + "% · " + esc(b.cert.costNote) + "</li>";
    }
    html += "</ul></div>";
  }
  return html + "</div>";
}

// "did you mean" and "higher value" links check that certificate
function wirePicks() {
  for (const a of document.querySelectorAll(".pick")) {
    a.addEventListener("click", e => {
      e.preventDefault();
      $("certInput").value = a.dataset.name;
      $("linkInput").value = "";
      $("issuerInput").value = "";
      $("qrStatus").textContent = "";
      runCheck();
      $("result").scrollIntoView();
    });
  }
}

setup();
