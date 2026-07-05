import type { AppState, Multiplier, Tool } from "./types";

export interface ParsedVoice {
  toolId?: string;
  multiplier?: Multiplier;
  qty?: number;
  farmerId?: string;
  farmerName?: string;
  landowner?: string;
  cashReceived?: number;
  rate?: number;
}

const MULTIPLIER_KEYWORDS: Record<Multiplier, string[]> = {
  single: ["सिंगल", "single", "एक बार", "इकहरी", "ekehri"],
  double: ["दोहर", "दोहरा", "दोहरी", "दोहराई", "double", "twice", "2 बार", "do bar", "dohar"],
  triple: ["तिहर", "तिहरा", "तिहरी", "triple", "thrice", "3 बार", "teen bar", "tihar"],
};

const HINDI_DIGITS: Record<string, string> = {
  "०": "0",
  "१": "1",
  "२": "2",
  "३": "3",
  "४": "4",
  "५": "5",
  "६": "6",
  "७": "7",
  "८": "8",
  "९": "9",
};

const WORD_NUMBERS: Record<string, number> = {
  आधा: 0.5,
  adha: 0.5,
  half: 0.5,
  पौन: 0.75,
  paun: 0.75,
  सवा: 1.25,
  sawa: 1.25,
  डेढ़: 1.5,
  dedh: 1.5,
  derh: 1.5,
  ढाई: 2.5,
  dhai: 2.5,
  साढ़े: 0.5, // additive — handled below if next is number
  एक: 1,
  ek: 1,
  one: 1,
  दो: 2,
  do: 2,
  two: 2,
  तीन: 3,
  teen: 3,
  three: 3,
  चार: 4,
  char: 4,
  four: 4,
  पांच: 5,
  पाँच: 5,
  panch: 5,
  five: 5,
  छह: 6,
  छः: 6,
  chhe: 6,
  chhah: 6,
  six: 6,
  सात: 7,
  saat: 7,
  seven: 7,
  आठ: 8,
  aath: 8,
  eight: 8,
  नौ: 9,
  nau: 9,
  nine: 9,
  दस: 10,
  das: 10,
  ten: 10,
  ग्यारह: 11,
  gyarah: 11,
  eleven: 11,
  बारह: 12,
  barah: 12,
  twelve: 12,
  तेरह: 13,
  terah: 13,
  thirteen: 13,
  चौदह: 14,
  chaudah: 14,
  fourteen: 14,
  पंद्रह: 15,
  pandrah: 15,
  fifteen: 15,
  सोलह: 16,
  solah: 16,
  sixteen: 16,
  सत्रह: 17,
  satrah: 17,
  seventeen: 17,
  अठारह: 18,
  atharah: 18,
  eighteen: 18,
  उन्नीस: 19,
  unnis: 19,
  nineteen: 19,
  बीस: 20,
  bees: 20,
  twenty: 20,
};

function normalize(text: string): string {
  return text
    .replace(/[०-९]/g, (d) => HINDI_DIGITS[d] ?? d)
    .replace(/[।,.;:!?]/g, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

/** Parse a number token (digit, word, or fractional word). Supports "सवा 2" → 2.25, "साढ़े 3" → 3.5. */
function tokenToNumber(tok: string): number | undefined {
  if (/^\d+(\.\d+)?$/.test(tok)) return parseFloat(tok);
  if (tok in WORD_NUMBERS) return WORD_NUMBERS[tok];
  return undefined;
}

function readNumberAt(toks: string[], i: number): { value: number; consumed: number } | undefined {
  const t = toks[i];
  if (!t) return undefined;
  // Compound: सवा/साढ़े/पौने + N
  if (t === "सवा" || t === "sawa") {
    const next = toks[i + 1] ? tokenToNumber(toks[i + 1]) : undefined;
    if (next != null) return { value: next + 0.25, consumed: 2 };
    return { value: 1.25, consumed: 1 };
  }
  if (t === "साढ़े" || t === "sadhe" || t === "sade") {
    const next = toks[i + 1] ? tokenToNumber(toks[i + 1]) : undefined;
    if (next != null) return { value: next + 0.5, consumed: 2 };
  }
  if (t === "पौने" || t === "paune") {
    const next = toks[i + 1] ? tokenToNumber(toks[i + 1]) : undefined;
    if (next != null) return { value: next - 0.25, consumed: 2 };
    return { value: 0.75, consumed: 1 };
  }
  const v = tokenToNumber(t);
  if (v != null) return { value: v, consumed: 1 };
  return undefined;
}

/** Find a number adjacent (within `window` tokens) to any of the given keywords. */
function findNumberNear(toks: string[], keywords: string[], window = 4): number | undefined {
  for (let i = 0; i < toks.length; i++) {
    if (keywords.some((k) => toks[i].includes(k))) {
      // Look backwards first (most natural in Hindi: "2 बीघा"), then forward.
      for (let j = i - 1; j >= Math.max(0, i - window); j--) {
        const r = readNumberAt(toks, j);
        if (r) return r.value;
      }
      for (let j = i + 1; j <= Math.min(toks.length - 1, i + window); j++) {
        const r = readNumberAt(toks, j);
        if (r) return r.value;
      }
    }
  }
  return undefined;
}

function firstNumber(toks: string[]): number | undefined {
  for (let i = 0; i < toks.length; i++) {
    const r = readNumberAt(toks, i);
    if (r) return r.value;
  }
  return undefined;
}

function toolAliases(tool: Tool): string[] {
  const hi = tool.nameHi
    .toLowerCase()
    .split(/[\s/]+/)
    .filter((w) => w.length > 1);
  const en = tool.nameEn
    .toLowerCase()
    .split(/[\s/]+/)
    .filter((w) => w.length > 1);
  return [...new Set([...hi, ...en])];
}

const EXTRA_TOOL_KEYWORDS: Record<string, string[]> = {
  jutai: ["हल", "जुताई", "plough", "plow", "hal"],
  herro: ["हेर्रो", "हेरो", "harrow"],
  rooter: ["रूटर", "rotor", "router", "रोटर"],
  thresher: ["थ्रेशर", "thresher", "थ्रेसर"],
  trolly: ["ट्रॉली", "trolley", "ट्राली", "trolly"],
};

export function parseVoice(rawText: string, state: AppState): ParsedVoice {
  const text = normalize(rawText);
  const toks = tokens(text);
  const out: ParsedVoice = {};

  // ---- Tool ----
  for (const tool of state.tools) {
    const aliases = [...toolAliases(tool), ...(EXTRA_TOOL_KEYWORDS[tool.id] ?? [])];
    if (aliases.some((k) => k && text.includes(k.toLowerCase()))) {
      out.toolId = tool.id;
      break;
    }
  }

  // ---- Multiplier (stem match for दोह*/तिह*) ----
  if (/दोह|दुह|double|twice/.test(text)) out.multiplier = "double";
  else if (/तिह|triple|thrice/.test(text)) out.multiplier = "triple";
  else {
    for (const [mult, kws] of Object.entries(MULTIPLIER_KEYWORDS)) {
      if (kws.some((k) => text.includes(k.toLowerCase()))) {
        out.multiplier = mult as Multiplier;
        break;
      }
    }
  }

  // ---- Quantity ----
  const unitKeywords = [
    "बीघा",
    "bigha",
    "घंटे",
    "घंटा",
    "ghanta",
    "hour",
    "क्विंटल",
    "quintal",
    "kuntal",
    "फेरा",
    "phera",
    "trip",
  ];
  out.qty = findNumberNear(toks, unitKeywords, 4);
  if (out.qty == null) out.qty = firstNumber(toks);

  // ---- Cash received ----
  const cashKeywords = [
    "नकद",
    "cash",
    "मिले",
    "मिला",
    "दिए",
    "दिये",
    "diye",
    "rupay",
    "rupaye",
    "रुपए",
    "रुपये",
    "rupees",
    "rs",
    "₹",
  ];
  const cash = findNumberNear(toks, cashKeywords, 4);
  if (cash != null && cash !== out.qty) out.cashReceived = cash;

  // ---- Rate (per/के हिसाब/rate) ----
  const rateKeywords = ["rate", "रेट", "हिसाब", "per", "के"];
  const rateNum = findNumberNear(toks, rateKeywords, 3);
  // Only treat as rate if it's a "large" number (>50) to avoid confusion
  if (rateNum != null && rateNum >= 50 && rateNum !== out.qty && rateNum !== out.cashReceived) {
    out.rate = rateNum;
  }

  // ---- Landowner: "मालिक X" / "owner X" / "X का खेत" / "साझेदारी X" ----
  const lo = matchAfter(toks, ["मालिक", "owner", "साझेदारी", "साझे", "किराये", "rent", "rental"]);
  if (lo) out.landowner = lo;

  // ---- Farmer name: fuzzy token match against existing farmers ----
  let bestFarmer: { id: string; name: string; score: number } | undefined;
  for (const f of state.farmers) {
    const fname = f.name.toLowerCase();
    const score = fuzzyScore(text, fname);
    if (score > 0 && (!bestFarmer || score > bestFarmer.score)) {
      bestFarmer = { id: f.id, name: f.name, score };
    }
  }
  // Only auto-pick when match is strong (full name substring). Otherwise
  // surface the spoken phrase so the user can pick from suggestions or
  // tap "+ नया किसान".
  if (bestFarmer && bestFarmer.score >= bestFarmer.name.length * 1.5) {
    out.farmerId = bestFarmer.id;
    out.farmerName = bestFarmer.name;
  } else {
    const nm = matchAfter(toks, ["किसान", "farmer", "नाम", "name"]) ?? extractLikelyName(toks);
    if (nm) out.farmerName = nm;
  }

  return out;
}

/** Heuristic: pick a 1-2 token alphabetic phrase that isn't a number/tool/known keyword. */
function extractLikelyName(toks: string[]): string | undefined {
  const STOP = new Set([
    "है",
    "हैं",
    "का",
    "की",
    "के",
    "को",
    "में",
    "से",
    "और",
    "तो",
    "भी",
    "नकद",
    "cash",
    "मिले",
    "मिला",
    "रुपए",
    "रुपये",
    "बीघा",
    "घंटे",
    "घंटा",
    "क्विंटल",
    "फेरा",
    "rate",
    "रेट",
    "मालिक",
    "owner",
    "जुताई",
    "हल",
    "हेर्रो",
    "रूटर",
    "थ्रेशर",
    "ट्रॉली",
    "सिंगल",
    "दोहर",
    "तिहर",
    "single",
    "double",
    "triple",
  ]);
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (/\d/.test(t)) continue;
    if (STOP.has(t)) continue;
    if (t in WORD_NUMBERS) continue;
    if (t.length < 2) continue;
    const next = toks[i + 1];
    if (
      next &&
      !/\d/.test(next) &&
      !STOP.has(next) &&
      !(next in WORD_NUMBERS) &&
      next.length >= 2
    ) {
      return `${t} ${next}`;
    }
    return t;
  }
  return undefined;
}

/** Grab 1-2 tokens after any keyword (skip joining words). */
function matchAfter(toks: string[], keywords: string[]): string | undefined {
  for (let i = 0; i < toks.length; i++) {
    if (keywords.includes(toks[i])) {
      const skip = new Set(["का", "की", "के", "ka", "ki", "ke", "is"]);
      const parts: string[] = [];
      for (let j = i + 1; j <= Math.min(toks.length - 1, i + 3) && parts.length < 2; j++) {
        if (skip.has(toks[j])) continue;
        if (/^\d/.test(toks[j])) break;
        parts.push(toks[j]);
      }
      if (parts.length) return parts.join(" ");
    }
  }
  return undefined;
}

function fuzzyScore(haystack: string, needle: string): number {
  if (!needle) return 0;
  if (haystack.includes(needle)) return needle.length * 2;
  const ntoks = needle.split(/\s+/);
  let score = 0;
  for (const t of ntoks) {
    if (t.length > 1 && haystack.includes(t)) score += t.length;
  }
  return score;
}

export function multiplierFactor(m: Multiplier): number {
  return m === "single" ? 1 : m === "double" ? 2 : 3;
}

export function multiplierLabel(m: Multiplier): string {
  return m === "single" ? "सिंगल" : m === "double" ? "दोहर" : "तिहर";
}

export function getTool(state: AppState, id: string): Tool | undefined {
  return state.tools.find((t) => t.id === id);
}

/** Levenshtein distance (small strings). */
function lev(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => i);
  for (let j = 1; j <= b.length; j++) {
    let prev = dp[0];
    dp[0] = j;
    for (let i = 1; i <= a.length; i++) {
      const tmp = dp[i];
      dp[i] = Math.min(dp[i] + 1, dp[i - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[a.length];
}

/** Fuzzy match a list of candidate strings against a query.
 *  Returns ordered matches by descending score. */
export function fuzzyMatch<T extends { name: string }>(items: T[], query: string, limit = 6): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored = items
    .map((it) => {
      const name = it.name.toLowerCase();
      let score = 0;
      if (name === q) score = 1000;
      else if (name.startsWith(q)) score = 600 - (name.length - q.length);
      else if (name.includes(q)) score = 400;
      else {
        // Token-level fuzzy: any token of name close to any token of q.
        const qToks = q.split(/\s+/);
        const nToks = name.split(/\s+/);
        for (const qt of qToks) {
          for (const nt of nToks) {
            if (qt === nt) score += 200;
            else if (nt.startsWith(qt) || qt.startsWith(nt)) score += 120;
            else {
              const d = lev(qt, nt);
              const max = Math.max(qt.length, nt.length);
              if (max > 2 && d <= 2) score += Math.max(0, 90 - d * 30);
            }
          }
        }
      }
      return { it, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.it);
  return scored;
}
