import { entropyFromDistribution, type EmotionAnalyzeResult } from "@/lib/emotion/llm-emotion";

const BASE = [
  { label: "Focused", w: 0.28 },
  { label: "Neutral", w: 0.22 },
  { label: "Engaged", w: 0.2 },
  { label: "Tired", w: 0.12 },
  { label: "Confused", w: 0.1 },
  { label: "Frustrated", w: 0.08 },
] as const;

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** Keyword-tilted heuristic; stable-ish per input with small jitter from hash. */
export function buildFallbackEmotion(text: string): EmotionAnalyzeResult {
  const t = text.toLowerCase();
  const zh = text;

  const weights: { label: string; w: number }[] = BASE.map((b) => ({
    label: b.label,
    w: b.w,
  }));

  const bump = (label: string, delta: number) => {
    const i = weights.findIndex((w) => w.label === label);
    if (i >= 0) weights[i].w += delta;
  };

  if (/累|困|疲惫|sleepy|tired|exhausted/.test(zh) || /tired|exhausted|sleepy/.test(t)) {
    bump("Tired", 0.35);
    bump("Focused", -0.08);
  }
  if (/不懂|难|困惑|confus|stuck|lost|don't understand|dont understand/.test(zh) || /confus|stuck|lost/.test(t)) {
    bump("Confused", 0.3);
    bump("Frustrated", 0.12);
  }
  if (/开心|高兴|喜欢|great|happy|excited|love/.test(zh) || /happy|excited|great/.test(t)) {
    bump("Engaged", 0.3);
  }
  if (/烦|生气|angry|frustrat|annoyed/.test(zh) || /frustrat|angry|annoyed/.test(t)) {
    bump("Frustrated", 0.35);
  }
  if (/专注|认真|focus|concentrat/.test(zh) || /focus|concentrat/.test(t)) {
    bump("Focused", 0.25);
  }

  const h = hashString(text) % 1000;
  const jitter = (h % 7) * 0.005;
  weights.forEach((w, i) => {
    w.w += jitter * (i + 1) * 0.1;
    w.w = Math.max(0.02, w.w);
  });

  const sum = weights.reduce((a, b) => a + b.w, 0);
  const distribution = weights.map((w) => ({
    label: w.label,
    confidence: w.w / sum,
  }));

  const sorted = [...distribution].sort((a, b) => b.confidence - a.confidence);
  const top = sorted[0]!;
  const entropy = entropyFromDistribution(distribution.map((d) => d.confidence));

  let short_advice = "保持适度休息，把难点拆成小步骤再试。";
  if (/confus|不懂|难/.test(zh) || /confus|stuck/.test(t)) {
    short_advice = "遇到卡点可以先写下已知条件，再对照例题一步步对照。";
  }
  if (/累|困|tired/.test(zh) || /tired|exhaust/.test(t)) {
    short_advice = "疲劳时短休息 5–10 分钟再继续，效率通常更高。";
  }

  return {
    top_label: top.label,
    confidence: top.confidence,
    distribution,
    short_advice,
    entropy,
  };
}
