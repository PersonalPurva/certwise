// CertWise - fact checker used by the monthly refresh.
// A fact from the AI is kept ONLY if:
//   1. its quote really appears on the source page (we fetch the page ourselves), and
//   2. every number in the value also appears inside that quote.
// Anything else is dropped, so no made-up number can reach the site.

// ---------- HTML -> plain text ----------

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " ", rsquo: "'", lsquo: "'",
                   rdquo: "\"", ldquo: "\"", ndash: "-", mdash: "-", hellip: "...", rupee: "₹" };

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (m, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => (ENTITIES[name.toLowerCase()] !== undefined ? ENTITIES[name.toLowerCase()] : " "))
    .replace(/\s+/g, " ")
    .trim();
}

// make small differences (curly quotes, dashes, spacing, "Rs." vs "₹") not matter
function normalize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, "\"")
    .replace(/[‐-―−]/g, "-")
    .replace(/\brs\.?\s*/g, "₹")
    .replace(/\binr\b\s*/g, "₹")
    .replace(/[^a-z0-9₹$%.+\- ]/g, " ")   // drop other punctuation
    .replace(/(\d),(?=\d)/g, "$1")          // 1,500 -> 1500
    .replace(/\s+/g, " ")
    .trim();
}

// all numbers in a string, e.g. "₹3.5 - 6 LPA" -> ["3.5", "6"]
function numbersIn(text) {
  return (normalize(text).match(/\d+(\.\d+)?/g) || []);
}

// ---------- the checks ----------

// returns { ok: true } or { ok: false, why: "..." }
function verifyFact(fact, pageText) {
  if (!fact || typeof fact !== "object") return { ok: false, why: "empty fact" };
  if (!fact.url || !/^https?:\/\//.test(fact.url)) return { ok: false, why: "no source URL" };
  if (!fact.quote || fact.quote.length < 15) return { ok: false, why: "quote too short" };
  if (fact.quote.length > 500) return { ok: false, why: "quote too long" };

  const page = normalize(pageText);
  const quote = normalize(fact.quote);
  if (!page.includes(quote)) return { ok: false, why: "quote not found on the page" };

  if (fact.value !== undefined && fact.value !== null) {
    const quoteNums = numbersIn(fact.quote);
    for (const n of numbersIn(fact.value)) {
      if (!quoteNums.includes(n)) return { ok: false, why: "number " + n + " is not in the quote" };
    }
  }
  return { ok: true };
}

// a "demand" quote must actually talk about this certificate
function quoteNamesCert(quote, cert) {
  const q = normalize(quote);
  return cert.aliases.some(a => q.includes(normalize(a)));
}

if (typeof module !== "undefined") {
  module.exports = { htmlToText, normalize, numbersIn, verifyFact, quoteNamesCert };
}
