// CertWise - free refresh with a Google Gemini API key (from Google AI Studio).
//
// Free Gemini keys can't use Google Search, so we do the reading ourselves:
//   1. refresh.mjs downloads the trusted pages we already list for a role or certificate
//   2. we send Gemini the parts of those pages that matter
//   3. Gemini copies out each fact with an exact quote
//   4. verify.js still checks every quote against the page, so nothing made up gets through

import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { collectText } = require("./pages.js");

export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
const GAP_MS = Number(process.env.GEMINI_GAP_MS || 15000);   // wait between calls to stay under free-tier limits

let lastCall = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitTurn() {
  const wait = lastCall + GAP_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastCall = Date.now();
}

// send one prompt, get the answer text back
export async function askGemini(prompt) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    await waitTurn();
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "x-goog-api-key": process.env.GEMINI_API_KEY,
        "Content-Type": "application/json",
        "Api-Revision": "2026-05-20"
      },
      body: JSON.stringify({ model: GEMINI_MODEL, input: prompt }),
      signal: AbortSignal.timeout(120000)
    });
    if (res.status === 429 || res.status >= 500) {
      console.log(`  Gemini busy (${res.status}), waiting a minute...`);
      await sleep(60000);
      continue;
    }
    const body = await res.json();
    if (!res.ok) {
      throw new Error("Gemini " + res.status + ": " + ((body.error && body.error.message) || "request failed"));
    }
    return collectText(body);
  }
  throw new Error("Gemini rate limit - try again later");
}
