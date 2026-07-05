import type { AppState, Tool } from "./types";

const KEY = "khetbook_v1";
const LEGACY_KEY = "tractor_hisaab_v1";

export const DEFAULT_TOOLS: Tool[] = [
  {
    id: "jutai",
    nameHi: "जुताई / हल",
    nameEn: "Jutai",
    icon: "🚜",
    unit: "बीघा",
    defaultRate: 500,
  },
  { id: "herro", nameHi: "हेर्रो", nameEn: "Herro", icon: "🌾", unit: "बीघा", defaultRate: 400 },
  { id: "rooter", nameHi: "रूटर", nameEn: "Rooter", icon: "🪓", unit: "घंटे", defaultRate: 600 },
  {
    id: "thresher",
    nameHi: "थ्रेशर",
    nameEn: "Thresher",
    icon: "🌽",
    unit: "क्विंटल",
    defaultRate: 80,
  },
  { id: "trolly", nameHi: "ट्रॉली", nameEn: "Trolly", icon: "🛻", unit: "फेरा", defaultRate: 300 },
];

export const INITIAL_STATE: AppState = {
  version: 2,
  settings: {
    upiVpa: "",
    merchantName: "",
    voiceLang: "hi-IN",
    dieselState: "UP",
    userName: "",
    userAlias: "",
    userPhone: "",
  },
  tools: DEFAULT_TOOLS,
  farmers: [],
  entries: [],
  payments: [],
  fuel: [],
};

export function loadState(): AppState {
  if (typeof window === "undefined") return INITIAL_STATE;
  try {
    let raw = window.localStorage.getItem(KEY);
    if (!raw) {
      // Migrate legacy "Tractor Hisaab" store on first run after rebrand
      raw = window.localStorage.getItem(LEGACY_KEY);
      if (raw) window.localStorage.setItem(KEY, raw);
    }
    if (!raw) return INITIAL_STATE;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      ...INITIAL_STATE,
      ...parsed,
      version: 2,
      settings: { ...INITIAL_STATE.settings, ...(parsed.settings ?? {}) },
      tools: parsed.tools?.length ? parsed.tools : DEFAULT_TOOLS,
      farmers: parsed.farmers ?? [],
      entries: parsed.entries ?? [],
      payments: parsed.payments ?? [],
      fuel: parsed.fuel ?? [],
    };
  } catch {
    return INITIAL_STATE;
  }
}

export function saveState(state: AppState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(state));
}

export function resetState() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
