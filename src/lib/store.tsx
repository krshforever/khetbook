import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppState, Entry, Farmer, FuelExpense, Payment, Settings, Tool, SMSLog } from "./types";
import { INITIAL_STATE, loadState, saveState, uid } from "./storage";
import { writeLocalBackup } from "./backup";

interface Ctx {
  state: AppState;
  setState: (updater: (s: AppState) => AppState) => void;
  // settings
  updateSettings: (patch: Partial<Settings>) => void;
  // tools
  upsertTool: (tool: Tool) => void;
  deleteTool: (id: string) => void;
  // farmers
  upsertFarmer: (farmer: Farmer) => Farmer;
  deleteFarmer: (id: string) => void;
  findOrCreateFarmer: (name: string) => Farmer;
  // entries
  addEntry: (entry: Omit<Entry, "id">) => Entry;
  updateEntry: (id: string, patch: Partial<Omit<Entry, "id">>) => void;
  deleteEntry: (id: string) => void;
  // payments
  addPayment: (p: Omit<Payment, "id">) => Payment;
  deletePayment: (id: string) => void;
  // fuel
  addFuel: (f: Omit<FuelExpense, "id">) => FuelExpense;
  deleteFuel: (id: string) => void;
  // sms logs
  addSMSLog: (log: Omit<SMSLog, "id">) => void;
  clearSMSLogs: () => void;
  // bulk
  replaceAll: (s: AppState) => void;
  ready: boolean;
}

const StoreContext = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setStateInner] = useState<AppState>(INITIAL_STATE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setStateInner(loadState());
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) {
      saveState(state);
      writeLocalBackup(state);
    }
  }, [state, ready]);

  const setState = useCallback((updater: (s: AppState) => AppState) => {
    setStateInner((prev) => updater(prev));
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      state,
      setState,
      ready,
      updateSettings: (patch) =>
        setStateInner((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
      upsertTool: (tool) =>
        setStateInner((s) => {
          const exists = s.tools.some((t) => t.id === tool.id);
          return {
            ...s,
            tools: exists ? s.tools.map((t) => (t.id === tool.id ? tool : t)) : [...s.tools, tool],
          };
        }),
      deleteTool: (id) =>
        setStateInner((s) => ({ ...s, tools: s.tools.filter((t) => t.id !== id) })),
      upsertFarmer: (farmer) => {
        setStateInner((s) => {
          const exists = s.farmers.some((f) => f.id === farmer.id);
          return {
            ...s,
            farmers: exists
              ? s.farmers.map((f) => (f.id === farmer.id ? farmer : f))
              : [...s.farmers, farmer],
          };
        });
        return farmer;
      },
      deleteFarmer: (id) =>
        setStateInner((s) => ({
          ...s,
          farmers: s.farmers.filter((f) => f.id !== id),
          entries: s.entries.filter((e) => e.farmerId !== id),
          payments: s.payments.filter((p) => p.farmerId !== id),
        })),
      findOrCreateFarmer: (rawName) => {
        const name = rawName.trim();
        const existing = state.farmers.find(
          (f) => f.name.toLowerCase() === name.toLowerCase(),
        );
        if (existing) return existing;

        const created: Farmer = { id: uid(), name };
        setStateInner((s) => {
          const exists = s.farmers.some((f) => f.name.toLowerCase() === name.toLowerCase());
          if (exists) return s;
          return { ...s, farmers: [...s.farmers, created] };
        });
        return created;
      },
      addEntry: (entry) => {
        const full: Entry = { ...entry, id: uid() };
        setStateInner((s) => ({ ...s, entries: [full, ...s.entries] }));
        return full;
      },
      deleteEntry: (id) =>
        setStateInner((s) => ({ ...s, entries: s.entries.filter((e) => e.id !== id) })),
      updateEntry: (id, patch) =>
        setStateInner((s) => ({
          ...s,
          entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),
      addPayment: (p) => {
        const full: Payment = { ...p, id: uid() };
        setStateInner((s) => ({ ...s, payments: [full, ...s.payments] }));
        return full;
      },
      deletePayment: (id) =>
        setStateInner((s) => ({ ...s, payments: s.payments.filter((p) => p.id !== id) })),
      addFuel: (f) => {
        const full: FuelExpense = { ...f, id: uid() };
        setStateInner((s) => ({ ...s, fuel: [full, ...s.fuel] }));
        return full;
      },
      deleteFuel: (id) => setStateInner((s) => ({ ...s, fuel: s.fuel.filter((f) => f.id !== id) })),
      addSMSLog: (log) =>
        setStateInner((s) => {
          const logs = [...(s.smsLogs || []), { ...log, id: uid() }];
          return {
            ...s,
            smsLogs: logs.slice(-100),
          };
        }),
      clearSMSLogs: () =>
        setStateInner((s) => ({
          ...s,
          smsLogs: [],
        })),
      replaceAll: (s) =>
        setStateInner((prev) => ({
          ...prev,
          ...s,
          settings: { ...prev.settings, ...(s?.settings ?? {}) },
          tools: Array.isArray(s?.tools) ? s.tools : prev.tools,
          farmers: Array.isArray(s?.farmers) ? s.farmers : [],
          entries: Array.isArray(s?.entries) ? s.entries : [],
          payments: Array.isArray(s?.payments) ? s.payments : [],
          fuel: Array.isArray(s?.fuel) ? s.fuel : [],
          smsLogs: Array.isArray(s?.smsLogs) ? s.smsLogs : [],
        })),
    }),
    [state, setState, ready],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export function pendingForFarmer(state: AppState, farmerId: string): number {
  const debits = state.entries
    .filter((e) => e.farmerId === farmerId)
    .reduce((sum, e) => sum + e.udharAdded, 0);
  const credits = state.payments
    .filter((p) => p.farmerId === farmerId)
    .reduce((sum, p) => sum + p.amount, 0);
  return Math.max(0, Math.round(debits - credits));
}

/** Unique landowner names ever used. Optionally scoped to one farmer. */
export function allLandowners(state: AppState, farmerId?: string): string[] {
  const set = new Set<string>();
  for (const e of state.entries) {
    if (farmerId && e.farmerId !== farmerId) continue;
    if (e.landowner && e.landowner.trim()) set.add(e.landowner.trim());
  }
  return Array.from(set).sort();
}
