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

// small line icons, drawn as inline SVG
const ICONS = {
  check: "<path d='M22 11.08V12a10 10 0 1 1-5.93-9.14'/><polyline points='22 4 12 14.01 9 11.01'/>",
  cross: "<circle cx='12' cy='12' r='10'/><line x1='15' y1='9' x2='9' y2='15'/><line x1='9' y1='9' x2='15' y2='15'/>",
  alert: "<path d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z'/><line x1='12' y1='9' x2='12' y2='13'/><line x1='12' y1='17' x2='12.01' y2='17'/>",
  help: "<circle cx='12' cy='12' r='10'/><path d='M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3'/><line x1='12' y1='17' x2='12.01' y2='17'/>",
  open: "<path d='M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'/><polyline points='15 3 21 3 21 9'/><line x1='10' y1='14' x2='21' y2='3'/>",
  award: "<circle cx='12' cy='8' r='7'/><polyline points='8.21 13.89 7 23 12 20 17 23 15.79 13.88'/>",
  tag: "<path d='M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z'/><line x1='7' y1='7' x2='7.01' y2='7'/>",
  briefcase: "<rect x='2' y='7' width='20' height='14' rx='2' ry='2'/><path d='M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16'/>",
  bulb: "<path d='M9 18h6'/><path d='M10 22h4'/><path d='M12 2a7 7 0 0 0-4 12.74V17h8v-2.26A7 7 0 0 0 12 2z'/>"
};

function icon(name) {
  return "<svg class='ic' viewBox='0 0 24 24' aria-hidden='true'>" + ICONS[name] + "</svg>";
}

// which icon and short line goes with each result colour
const LEVEL_ICON = { green: "check", amber: "alert", red: "cross", grey: "help" };
const LEVEL_NOTE = {
  green: "Checkable on the issuer's own site",
  amber: "We couldn't confirm it",
  red: "Treat it as fake until proven otherwise",
  grey: "One more step needed"
};

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
  $("checkBtn").addEventListener("click", () => runCheck(true));
  for (const id of ["certInput", "linkInput", "issuerInput"]) {
    $(id).addEventListener("keydown", e => { if (e.key === "Enter") runCheck(true); });
  }

  // example chips
  for (const a of document.querySelectorAll(".try")) {
    a.addEventListener("click", e => {
      e.preventDefault();
      $("certInput").value = a.dataset.cert;
      $("linkInput").value = a.dataset.link || "";
      $("issuerInput").value = a.dataset.issuer || "";
      fileNote("");
      runCheck(true);
    });
  }

  // the certificate file (photo, screenshot or PDF): choose it, or drag and drop it
  $("maxMb").textContent = MAX_FILE_MB;
  $("qrFile").addEventListener("change", () => {
    if ($("qrFile").files.length > 0) readFile($("qrFile").files[0]);
  });
  const drop = $("drop");
  drop.addEventListener("dragover", e => { e.preventDefault(); drop.classList.add("over"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", e => {
    e.preventDefault();
    drop.classList.remove("over");
    if (e.dataTransfer.files.length > 0) readFile(e.dataTransfer.files[0]);
  });

  // numbers in the header and footer come straight from our data files
  const ways = Object.keys(VERIFY_METHODS).filter(k => VERIFY_METHODS[k].domains.length > 0).length;
  $("statCerts").textContent = CERTS.length;
  $("statWays").textContent = ways;
  $("statFake").textContent = FAKE_UNIS.length;
  $("teamLine").textContent = TEAM;
  $("dataInfo").textContent = "Our list has " + CERTS.length + " certificates and " + ways +
    " official ways of verifying them. Live facts last refreshed: " +
    (LIVE_DATA.refreshedOn || "not yet") + ".";
}

// ---------- read the certificate file (image or PDF) ----------

const MAX_FILE_MB = 5;
const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";   // only loaded when a PDF is chosen

function fileNote(text, bad) {
  $("qrStatus").textContent = text;
  $("qrStatus").classList.toggle("bad", bad === true);
}

function readFile(file) {
  const ok = checkFile(file.name, file.type, file.size, MAX_FILE_MB);   // type and size limit (logic.js)
  if (!ok.ok) {
    fileNote(ok.why, true);
    $("qrFile").value = "";
    return;
  }
  if (typeof jsQR === "undefined") {
    fileNote("The QR reader didn't load (it needs an internet connection).", true);
    return;
  }
  fileNote("Reading " + file.name + "...");
  if (ok.kind === "pdf") readPdf(file);
  else readImage(file);
}

// put the link we found into the form and run the check
function useLink(link, note) {
  $("linkInput").value = link;
  fileNote(note);
  if ($("certInput").value.trim() !== "") runCheck(true);
}

// the QR code in a block of pixels, or null
function qrIn(canvas) {
  const ctx = canvas.getContext("2d");
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(pixels.data, canvas.width, canvas.height);
  return code && code.data ? code.data : null;
}

function readImage(file) {
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    // big photos are shrunk first so the QR reader stays fast
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    const link = qrIn(canvas);
    URL.revokeObjectURL(url);
    if (link) useLink(link, "QR code read - the link is filled in above.");
    else fileNote("No QR code found in this image. Type the link printed on the certificate instead.", true);
  };
  img.onerror = () => {
    URL.revokeObjectURL(url);
    fileNote("Couldn't open this image - try a PNG or JPG screenshot.", true);
  };
  img.src = url;
}

// load the PDF reader (pdf.js) the first time it is needed
let pdfReady = null;
function loadPdfJs() {
  if (!pdfReady) {
    pdfReady = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = PDFJS + "pdf.min.js";
      s.onload = () => {
        pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + "pdf.worker.min.js";
        resolve();
      };
      s.onerror = () => { pdfReady = null; reject(new Error("pdf.js did not load")); };
      document.head.appendChild(s);
    });
  }
  return pdfReady;
}

// a PDF certificate: look for a QR code on the first pages, then for links (clickable or printed)
async function readPdf(file) {
  try {
    await loadPdfJs();
  } catch (e) {
    fileNote("The PDF reader didn't load (it needs an internet connection). Try a screenshot instead.", true);
    return;
  }
  try {
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const links = [];
    for (let n = 1; n <= Math.min(pdf.numPages, 3); n++) {
      const page = await pdf.getPage(n);

      // links first (quick): clickable links, then links printed as text
      for (const a of await page.getAnnotations()) {
        if (a.url) links.push(a.url);
      }
      const text = (await page.getTextContent()).items.map(i => i.str).join(" ");
      const printed = text.match(/https?:\/\/[^\s"'<>]+|(?:[a-z0-9-]+\.)+[a-z]{2,}\/[^\s"'<>]+/gi) || [];
      for (const p of printed) links.push(p);

      // then draw the page and look for a QR code. "print" mode draws in one go
      // (the normal mode waits for the screen to repaint); give up on a page after 6 seconds
      const view = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(view.width);
      canvas.height = Math.round(view.height);
      const drawing = page.render({ canvasContext: canvas.getContext("2d"), viewport: view, intent: "print" });
      const drawn = await Promise.race([
        drawing.promise.then(() => true, () => false),
        new Promise(done => setTimeout(() => done(false), 6000))
      ]);
      if (!drawn) {
        drawing.cancel();
        continue;
      }
      const qr = qrIn(canvas);
      if (qr) {
        useLink(qr, "QR code read from the PDF - the link is filled in above.");
        return;
      }
    }
    const link = pickLink(links, VERIFY_METHODS);
    if (link) useLink(link, "Link found in the PDF - it is filled in above.");
    else fileNote("No QR code or link found in this PDF. Type the link or ID printed on the certificate instead.", true);
  } catch (e) {
    fileNote("Couldn't read this PDF - it may be damaged or password-protected. Try a screenshot of the certificate instead.", true);
  }
}

// ---------- the check ----------

function runCheck(scroll) {
  const query = $("certInput").value.trim();
  const input = { link: $("linkInput").value.trim(), issuer: $("issuerInput").value.trim() };
  const out = $("result");

  if (query === "") {
    out.innerHTML = "<section class='box result'><p>Type the certificate's name first.</p></section>";
    return;
  }

  const cert = findCert(query, CERTS);
  if (!cert) {
    out.innerHTML = notFoundHtml(query, input);
  } else {
    const g = checkGenuine(cert, input, VERIFY_METHODS, CERT_VERIFY, FAKE_UNIS);
    const v = marketValue(cert, ROLES, ROLE_INFO, LIVE_DATA);
    out.innerHTML = "<section class='box result'>" +
      "<div class='result-head'><div class='tile'>" + icon("award") + "</div>" +
      "<div><h3>" + esc(cert.name) + "</h3><div class='small'>Issued by " + esc(cert.issuer) + "</div></div></div>" +
      "<div class='two'>" + genuineHtml(cert, g) + valueHtml(cert, v, g) + "</div></section>";
  }
  wirePicks();
  if (scroll) out.scrollIntoView({ behavior: "smooth", block: "start" });
}

// the coloured block with an icon and the verdict
function statusHtml(level, verdict, note) {
  return "<div class='status " + level + "'><div class='status-icon'>" + icon(LEVEL_ICON[level]) + "</div>" +
    "<div><div class='verdict'>" + esc(verdict) + "</div><div class='status-sub'>" + esc(note) + "</div></div></div>";
}

function notFoundHtml(query, input) {
  let html = "<section class='box result'><div class='result-head'><div class='tile'>" + icon("help") + "</div>" +
    "<div><h3>We don't have \"" + esc(query) + "\" in our list yet</h3>" +
    "<div class='small'>We can still check the institute that issued it.</div></div></div>";
  const fake = input.issuer ? matchFakeUni(input.issuer, FAKE_UNIS) : null;
  if (fake) {
    html += statusHtml("red", "Fake university", "Not a valid university") +
      "<ul class='reasons'><li>\"" + esc(fake) + "\" is on UGC's list of fake universities (February 2026). " +
      "Its degrees and certificates are not valid for jobs or higher studies.</li></ul>" +
      "<p class='proof'><b>Proof:</b> " + proofLinks([FAKE_UNIS_SRC]) + "</p>";
  }
  const close = rankCerts(query, CERTS).filter(r => r.score >= 0.3).slice(0, 3);
  if (close.length > 0) {
    html += "<div class='chips'>Did you mean: " + close.map(r => "<a href='#' class='pick' data-name='" + esc(r.cert.name) + "'>" +
      esc(r.cert.name) + "</a>").join(" ") + "</div>";
  }
  html += "<p class='small'>Tip: a real certificate almost always has a verification link or ID. If it has neither, " +
    "anyone could have made it.</p></section>";
  return html;
}

function genuineHtml(cert, g) {
  const fakeUni = g.verdict === "Fake university";
  let html = "<div class='panel' data-level='" + g.level + "'>" +
    "<div class='panel-title'><span class='num'>1</span> Is it genuine?</div>";
  html += statusHtml(g.level, g.verdict, fakeUni ? "Not a valid university" : LEVEL_NOTE[g.level]);
  html += "<ul class='reasons'>";
  for (const r of g.reasons) html += "<li>" + esc(r) + "</li>";
  html += "</ul>";
  if (g.page) {
    html += "<a class='button' href='" + esc(g.page) + "' target='_blank' rel='noopener'>" + icon("open") + " Open the official check</a>";
  }
  if (fakeUni) {
    html += "<p class='proof'><b>Proof:</b> " + proofLinks([FAKE_UNIS_SRC]) + "</p>";
  } else {
    html += "<div class='howbox'><b>How " + esc(cert.issuer) + " certificates are verified:</b> " + esc(g.method.how);
    if (g.method.src.length > 0) html += "<br><b>Proof:</b> " + proofLinks(g.method.src);
    html += "</div>";
  }
  return html + "</div>";
}

// a ring that fills up to the percent
function gaugeHtml(percent, level) {
  const around = 2 * Math.PI * 52;                 // length of the ring
  const empty = around * (1 - percent / 100);      // the part left unfilled
  return "<svg class='gauge " + level + "' viewBox='0 0 120 120' role='img' aria-label='" + percent + " percent'>" +
    "<circle class='gauge-bg' cx='60' cy='60' r='52'/>" +
    "<circle class='gauge-fg' cx='60' cy='60' r='52' stroke-dasharray='" + around.toFixed(1) +
    "' stroke-dashoffset='" + empty.toFixed(1) + "'/>" +
    "<text x='60' y='69' text-anchor='middle'>" + percent + "%</text></svg>";
}

// points as filled / empty dots, e.g. 1 of 2 -> ● ○
function dotsHtml(points, max) {
  let html = "<span class='dots' title='" + points + " of " + max + " points'>";
  for (let i = 0; i < max; i++) html += "<span class='dot" + (i < points ? " on" : "") + "'></span>";
  return html + "</span>";
}

function valueHtml(cert, v, g) {
  const fake = g.level === "red";
  let html = "<div class='panel' data-level='" + (fake ? "red" : v.level) + "'>" +
    "<div class='panel-title'><span class='num'>2</span> What is it worth?</div>";

  if (fake) {
    html += "<div class='gauge-row'>" + gaugeHtml(0, "red") +
      "<div><div class='verdict red-text'>No market value if it is fake</div>" +
      "<div class='status-sub'>A fake certificate is worth nothing - and showing one can cost you the job.</div></div></div>" +
      "<p class='small'>For a genuine " + esc(cert.name) + ", the score would be:</p>";
  }
  html += "<div class='gauge-row'>" + gaugeHtml(v.percent, v.level) +
    "<div><div class='verdict " + v.level + "-text'>" + esc(v.band) + (fake ? " (if genuine)" : "") + "</div>" +
    "<div class='status-sub'>" + v.total + " of " + v.max + " points from 3 checks</div></div></div>";
  if (v.warning) html += "<div class='warn'>" + icon("alert") + "<span>" + esc(v.warning) + "</span></div>";

  html += "<div class='checks'>";
  for (const ch of v.checks) {
    html += "<div class='check-row'><div class='check-head'><span>" + esc(ch.name) + "</span>" +
      dotsHtml(ch.points, ch.max) + "</div><div class='check-why'>" + esc(ch.reason);
    if (ch.src && ch.src.length > 0) html += "<br>Proof: " + sourceLinks(ch.src);
    html += "</div></div>";
  }
  html += "</div>";

  // price (hand-checked, with proof) + newest verified facts from the monthly refresh
  html += "<div class='fact'>" + icon("tag") + "<div><b>Price:</b> " + esc(cert.costNote);
  if (cert.src.length > 0) html += "<div class='proof'>Proof: " + proofLinks(cert.src) + "</div>";
  html += "</div></div>";
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
    html += "<div class='fact'>" + icon("briefcase") + "<div><b>Jobs it leads to</b> (fresher pay in India)</div></div><div class='jobs'>";
    for (const j of v.jobs) {
      const liveRole = LIVE_DATA.roles[j.id];
      if (liveRole && liveRole.salary) {
        html += "<div class='job'><b>" + esc(j.name) + "</b>" + factHtml(liveRole.salary) + "</div>";
      } else {
        html += "<div class='job'><b>" + esc(j.name) + "</b>" + esc(j.info.salary.range) +
          "<div class='proof'>Source: " + sourceLinks(j.info.salary.src) + "</div></div>";
      }
    }
    html += "</div><p class='proof'>" + esc(PUNE_NOTE.text) + " (" + sourceLinks(PUNE_NOTE.src) + ").</p>";
  }

  if (cert.note) html += "<div class='fact'>" + icon("bulb") + "<div><span class='adv'>our advice</span> " + esc(cert.note) + "</div></div>";

  const better = betterValue(cert, CERTS, ROLES, ROLE_INFO, LIVE_DATA, 3);
  if (better.length > 0) {
    html += "<div class='alts'><b>Higher value in the same field</b><ul>";
    for (const b of better) {
      html += "<li><a href='#' class='pick' data-name='" + esc(b.cert.name) + "'>" + esc(b.cert.name) + "</a> " +
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
      fileNote("");
      runCheck(true);
    });
  }
}

setup();
