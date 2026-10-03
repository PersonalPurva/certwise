// CertWise - small helpers for the free (Gemini) refresh.
//   excerpt()     keeps only the parts of a long page that talk about what we need,
//                 so we send less text to the AI (free keys have per-minute limits)
//   collectText() pulls the answer text out of a Gemini "interaction" response

// keep a window of text around every keyword, merge windows that touch, cap the total size
function excerpt(text, keywords, maxChars) {
  if (text.length <= maxChars) return text;
  const lower = text.toLowerCase();
  const ranges = [];
  for (const k of keywords) {
    const word = k.toLowerCase();
    let at = lower.indexOf(word);
    while (at !== -1 && ranges.length < 200) {
      ranges.push([Math.max(0, at - 250), Math.min(text.length, at + word.length + 350)]);
      at = lower.indexOf(word, at + word.length);
    }
  }
  if (ranges.length === 0) return text.slice(0, maxChars);

  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [ranges[0]];
  for (const r of ranges.slice(1)) {
    const last = merged[merged.length - 1];
    if (r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push(r);
  }

  let out = "";
  for (const [a, b] of merged) {
    const piece = text.slice(a, b);
    if (out.length + piece.length > maxChars) break;
    out += (out ? "\n...\n" : "") + piece;
  }
  return out || text.slice(0, maxChars);
}

// a Gemini interaction looks like { steps: [ {type: "thought"}, {type: "model_output", content: [{type: "text", text}]} ] }
function collectText(interaction) {
  const parts = [];
  for (const step of (interaction && interaction.steps) || []) {
    if (step.type !== "model_output") continue;
    for (const c of step.content || []) {
      if (c.type === "text" && typeof c.text === "string") parts.push(c.text);
    }
  }
  return parts.join("\n");
}

if (typeof module !== "undefined") {
  module.exports = { excerpt, collectText };
}
