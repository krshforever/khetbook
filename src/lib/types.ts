export type ToolUnit = "बीघा" | "घंटे" | "क्विंटल" | "फेरा";

export interface Tool {
  id: string;
  nameHi: string;
  nameEn: string;
  icon: string; // emoji
  unit: ToolUnit;
  defaultRate: number;
}

export interface Farmer {
  id: string;
  name: string;
  landownerMemory?: string;
  phone?: string;
}

export type Multiplier = "single" | "double" | "triple";

export interface Entry {
  id: string;
  date: string; // ISO
  farmerId: string;
  toolId: string;
  qty: number;
  unit: ToolUnit;
  multiplier: Multiplier;
  rate: number;
  total: number;
  cashReceived: number;
  udharAdded: number;
  landowner?: string;
  note?: string;
}

export interface Payment {
  id: string;
  date: string;
  farmerId: string;
  amount: number;
  note?: string;
}

export interface FuelExpense {
  id: string;
  date: string;
  amount: number;
  litres?: number;
  pricePerLitre?: number;
  pumpName?: string;
  note?: string;
}

export interface Settings {
  upiVpa: string;
  merchantName: string;
  voiceLang: "hi-IN" | "en-IN";
  dieselState?: string;
  lastDieselPrice?: number;
  lastBackupAt?: string;
  userName?: string;
  userAlias?: string;
  userPhone?: string;
  onboardedAt?: string;
  // Notifications
  notificationsEnabled?: boolean;
  reminderHour?: number; // 0-23 local hour for the daily reminder
  lastReminderShown?: string; // YYYY-MM-DD
  // Updates (open-source distribution)
  githubRepo?: string; // "owner/name" — used to link to Releases for new APKs
  autoSmsOnSave?: boolean; // toggle to send native background SMS to farmers
}

export interface AppState {
  version: 2;
  settings: Settings;
  tools: Tool[];
  farmers: Farmer[];
  entries: Entry[];
  payments: Payment[];
  fuel: FuelExpense[];
}
