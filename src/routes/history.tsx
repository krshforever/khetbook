import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MoreVertical, Trash2, Fuel } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { fmtDate, fmtINR, dayKey, monthKey, fmtDayHeading, fmtMonthHeading } from "@/lib/format";
import { getTool } from "@/lib/voice-parser";
import { MicSearchInput } from "@/components/MicSearchInput";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/history")({
  head: () => ({ meta: [{ title: "इतिहास — History" }] }),
  component: HistoryPage,
});

type Row =
  | {
      kind: "entry";
      id: string;
      date: string;
      farmerName: string;
      toolId: string;
      icon: string;
      title: string;
      total: number;
      udhar: number;
      landowner?: string;
    }
  | {
      kind: "fuel";
      id: string;
      date: string;
      litres?: number;
      pricePerLitre?: number;
      pump?: string;
      amount: number;
    };

const HI_MONTH_TOKENS: Record<string, number> = {
  जनवरी: 1,
  फ़रवरी: 2,
  फरवरी: 2,
  मार्च: 3,
  अप्रैल: 4,
  मई: 5,
  जून: 6,
  जुलाई: 7,
  अगस्त: 8,
  सितंबर: 9,
  अक्तूबर: 10,
  अक्टूबर: 10,
  नवंबर: 11,
  दिसंबर: 12,
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

/** Parses tokens like "जून 2026", "06/2026", "2026-06", "june 2026", "29 जून 2026", "29/06/2026". */
function parseQueryDate(q: string): { year?: number; month?: number; day?: number } | null {
  const s = q.trim().toLowerCase();
  if (!s) return null;
  // 2026-06[-29]
  const iso = s.match(/^(\d{4})[-/](\d{1,2})(?:[-/](\d{1,2}))?$/);
  if (iso) return { year: +iso[1], month: +iso[2], day: iso[3] ? +iso[3] : undefined };
  // 29/06/2026
  const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) return { day: +dmy[1], month: +dmy[2], year: +dmy[3] };
  // 06/2026
  const my = s.match(/^(\d{1,2})[-/](\d{4})$/);
  if (my) return { month: +my[1], year: +my[2] };
  // word month + year (+ optional day)
  const tokens = s.split(/\s+/);
  let month: number | undefined, year: number | undefined, day: number | undefined;
  for (const tok of tokens) {
    if (HI_MONTH_TOKENS[tok]) month = HI_MONTH_TOKENS[tok];
    else if (/^\d{4}$/.test(tok)) year = +tok;
    else if (/^\d{1,2}$/.test(tok) && !day) day = +tok;
  }
  if (month || year || day) return { month, year, day };
  return null;
}

function HistoryPage() {
  const { state, deleteEntry, deleteFuel } = useStore();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("");

  const dateQ = useMemo(() => parseQueryDate(q), [q]);

  const rows = useMemo<Row[]>(() => {
    const matchText = (txt: string) => txt.toLowerCase().includes(q.toLowerCase());
    const matchDate = (iso: string) => {
      if (!dateQ) return true;
      const d = new Date(iso);
      if (dateQ.year && d.getFullYear() !== dateQ.year) return false;
      if (dateQ.month && d.getMonth() + 1 !== dateQ.month) return false;
      if (dateQ.day && d.getDate() !== dateQ.day) return false;
      return true;
    };

    const entryRows: Row[] = state.entries
      .filter((e) => !filter || filter === e.toolId)
      .filter((e) => matchDate(e.date))
      .filter((e) => {
        if (!q || dateQ) return true;
        const farmer = state.farmers.find((f) => f.id === e.farmerId);
        return matchText(farmer?.name ?? "") || matchText(e.landowner ?? "");
      })
      .map((e) => {
        const farmer = state.farmers.find((f) => f.id === e.farmerId);
        const tool = getTool(state, e.toolId);
        return {
          kind: "entry" as const,
          id: e.id,
          date: e.date,
          farmerName: farmer?.name ?? "—",
          toolId: e.toolId,
          icon: tool?.icon ?? "🚜",
          title: `${tool?.nameHi ?? ""} · ${e.qty} ${e.unit}`,
          total: e.total,
          udhar: e.udharAdded,
          landowner: e.landowner,
        };
      });

    const fuelRows: Row[] =
      !filter || filter === "fuel"
        ? state.fuel
            .filter((f) => matchDate(f.date))
            .filter((f) => !q || dateQ || "डीजल diesel fuel".includes(q.toLowerCase()))
            .map((f) => ({
              kind: "fuel" as const,
              id: f.id,
              date: f.date,
              litres: f.litres,
              pricePerLitre: f.pricePerLitre,
              pump: f.pumpName,
              amount: f.amount,
            }))
        : [];

    return [...entryRows, ...fuelRows].sort((a, b) => b.date.localeCompare(a.date));
  }, [state, q, filter, dateQ]);

  // Group rows into day-buckets, and inject month separators when month changes
  const grouped = useMemo(() => {
    const out: Array<
      | { type: "month"; iso: string; key: string }
      | { type: "day"; iso: string; key: string; rows: Row[]; total: number; udhar: number }
    > = [];
    let lastMonth = "";
    const byDay = new Map<string, Row[]>();
    for (const r of rows) {
      const k = dayKey(r.date);
      if (!byDay.has(k)) byDay.set(k, []);
      byDay.get(k)!.push(r);
    }
    const dayKeysSorted = [...byDay.keys()].sort((a, b) => (a < b ? 1 : -1));
    for (const dk of dayKeysSorted) {
      const dayRows = byDay.get(dk)!;
      const mk = monthKey(dayRows[0].date);
      if (mk !== lastMonth) {
        out.push({ type: "month", iso: dayRows[0].date, key: mk });
        lastMonth = mk;
      }
      const total = dayRows.reduce((s, r) => s + (r.kind === "fuel" ? -r.amount : r.total), 0);
      const udhar = dayRows.reduce((s, r) => s + (r.kind === "entry" ? r.udhar : 0), 0);
      out.push({ type: "day", iso: dayRows[0].date, key: dk, rows: dayRows, total, udhar });
    }
    return out;
  }, [rows]);

  return (
    <AppShell title="इतिहास" subtitle="सभी एंट्रीज़">
      <MicSearchInput placeholder="किसान / मालिक / जून 2026…" value={q} onChange={setQ} />
      <div className="mt-3 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <Chip active={!filter} onClick={() => setFilter("")}>
          सभी
        </Chip>
        <Chip active={filter === "fuel"} onClick={() => setFilter("fuel")} accent="secondary">
          <Fuel className="mr-1 inline h-4 w-4" /> डीजल
        </Chip>
        {state.tools.map((t) => (
          <Chip key={t.id} active={filter === t.id} onClick={() => setFilter(t.id)}>
            {t.icon} {t.nameHi}
          </Chip>
        ))}
      </div>

      {grouped.length === 0 && (
        <div className="font-hindi mt-6 rounded-2xl border-2 border-dashed border-border p-8 text-center text-muted-foreground">
          कोई एंट्री नहीं मिली।
        </div>
      )}

      <div className="mt-4 space-y-4">
        {grouped.map((g) =>
          g.type === "month" ? (
            <div
              key={"m" + g.key}
              className="sticky top-[72px] z-10 -mx-4 border-y border-border bg-background/95 px-4 py-1.5 backdrop-blur"
            >
              <h3 className="font-hindi text-xs font-black uppercase tracking-wider text-muted-foreground">
                {fmtMonthHeading(g.iso)}
              </h3>
            </div>
          ) : (
            <section key={"d" + g.key}>
              <div className="mb-2 flex items-baseline justify-between">
                <h4 className="font-hindi text-sm font-black text-foreground">
                  {fmtDayHeading(g.iso)}
                </h4>
                <span className="font-hindi text-xs text-muted-foreground">
                  {g.rows.length} एंट्री{g.udhar > 0 ? ` · उधार ${fmtINR(g.udhar)}` : ""}
                </span>
              </div>
              <ul className="grid gap-2">
                {g.rows.map((row) => (
                  <li
                    key={`${row.kind}-${row.id}`}
                    className={`rounded-2xl border-2 ${row.kind === "fuel" ? "border-secondary/30 bg-secondary/5" : "border-border bg-card"} p-3`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-xl ${row.kind === "fuel" ? "bg-secondary text-secondary-foreground" : "bg-accent"}`}
                      >
                        {row.kind === "fuel" ? <Fuel className="h-6 w-6" /> : row.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        {row.kind === "entry" ? (
                          <>
                            <div className="font-hindi truncate text-base font-bold">
                              {row.farmerName}
                            </div>
                            <div className="font-hindi truncate text-xs text-muted-foreground">
                              {row.title} · {fmtDate(row.date)}
                              {row.landowner && ` · मालिक: ${row.landowner}`}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="font-hindi truncate text-base font-bold">
                              डीजल {row.litres ? `· ${row.litres} L` : ""}
                            </div>
                            <div className="font-hindi truncate text-xs text-muted-foreground">
                              {row.pricePerLitre ? `₹${row.pricePerLitre}/L · ` : ""}
                              {fmtDate(row.date)}
                              {row.pump ? ` · ${row.pump}` : ""}
                            </div>
                          </>
                        )}
                      </div>
                      <div className="text-right">
                        <div
                          className={`text-base font-black ${row.kind === "fuel" ? "text-secondary" : ""}`}
                        >
                          {fmtINR(row.kind === "fuel" ? row.amount : row.total)}
                        </div>
                        {row.kind === "entry" && (
                          <div
                            className={`text-xs font-bold ${row.udhar > 0 ? "text-destructive" : "text-success"}`}
                          >
                            {row.udhar > 0 ? `+${fmtINR(row.udhar)} उधार` : "चुकता"}
                          </div>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="ml-1 rounded-lg p-2 text-muted-foreground active:bg-accent">
                            <MoreVertical className="h-5 w-5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="font-hindi text-destructive focus:text-destructive"
                            onClick={() => {
                              if (confirm("एंट्री मिटाएँ?")) {
                                if (row.kind === "entry") deleteEntry(row.id);
                                else deleteFuel(row.id);
                              }
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> मिटाएँ
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ),
        )}
      </div>
    </AppShell>
  );
}

function Chip({
  active,
  onClick,
  children,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  accent?: "secondary";
}) {
  const activeCls =
    accent === "secondary"
      ? "border-secondary bg-secondary text-secondary-foreground"
      : "border-primary bg-primary text-primary-foreground";
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border-2 px-4 py-2 font-hindi text-sm font-bold ${active ? activeCls : "border-border bg-card"}`}
    >
      {children}
    </button>
  );
}
