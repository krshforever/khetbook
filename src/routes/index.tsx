import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Plus, Wallet, AlertCircle, Fuel, TrendingUp, Download } from "lucide-react";
import { useStore, pendingForFarmer } from "@/lib/store";
import { fmtINR, isSameDay, isSameMonth, isSameWeek, todayISO } from "@/lib/format";
import { getTool } from "@/lib/voice-parser";
import { JobEntrySheet } from "@/components/JobEntrySheet";
import { FuelSheet } from "@/components/FuelSheet";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Khetbook — मुख्य डैशबोर्ड" },
      {
        name: "description",
        content: "ट्रैक्टर का हिसाब-किताब — कमाई, उधार, और डीजल खर्चा एक जगह।",
      },
    ],
  }),
  component: Dashboard,
});

function greetingFor() {
  const h = new Date().getHours();
  if (h < 12) return "सुप्रभात";
  if (h < 17) return "नमस्कार";
  return "शुभ संध्या";
}

type Scope = "today" | "week" | "month";

function Dashboard() {
  const { state, ready } = useStore();
  const [openEntry, setOpenEntry] = useState(false);
  const [openFuel, setOpenFuel] = useState(false);
  const [scope, setScope] = useState<Scope>("today");
  const [updateInfo, setUpdateInfo] = useState<{ tag: string; url: string; apk?: string } | null>(null);
  const now = todayISO();

  useEffect(() => {
    // Check for updates automatically on home screen boot
    import("@/lib/version").then(({ APP_VERSION, GITHUB_REPO }) => {
      import("@/lib/notifications").then(({ fetchLatestRelease }) => {
        fetchLatestRelease(GITHUB_REPO).then((latest) => {
          if (latest && latest.tag !== APP_VERSION) {
            // Check if user has ignored this specific version in this session
            const ignored = sessionStorage.getItem(`ignore_update_${latest.tag}`);
            if (!ignored) {
              setUpdateInfo(latest);
            }
          }
        });
      });
    });
  }, []);

  const filter = (iso: string) =>
    scope === "today"
      ? isSameDay(iso, now)
      : scope === "week"
        ? isSameWeek(iso, now)
        : isSameMonth(iso, now);

  const entries = state.entries.filter((e) => filter(e.date));
  const payments = state.payments.filter((p) => filter(p.date));
  const fuel = state.fuel.filter((f) => filter(f.date));

  const earnings =
    entries.reduce((s, e) => s + e.cashReceived, 0) + payments.reduce((s, p) => s + p.amount, 0);
  const pendingTotal = state.farmers.reduce((s, f) => s + pendingForFarmer(state, f.id), 0);
  const fuelTotal = fuel.reduce((s, f) => s + f.amount, 0);
  const profit = earnings - fuelTotal;

  const todayList = state.entries.filter((e) => isSameDay(e.date, now)).slice(0, 8);

  const scopeLabel =
    scope === "today"
      ? "आज का सारांश"
      : scope === "week"
        ? "इस हफ़्ते का सारांश"
        : "इस महीने का सारांश";

  return (
    <AppShell
      title="Khetbook"
      subtitle={scopeLabel}
      right={
        <div className="flex rounded-full bg-white/15 p-0.5 text-xs font-bold">
          {(["today", "week", "month"] as Scope[]).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={`font-hindi rounded-full px-2.5 py-1.5 transition-colors ${scope === s ? "bg-white text-primary" : "text-primary-foreground"}`}
            >
              {s === "today" ? "आज" : s === "week" ? "हफ़्ता" : "महीना"}
            </button>
          ))}
        </div>
      }
    >
      {state.settings.userName && (
        <div className="mb-3 rounded-2xl border-2 border-primary/30 bg-primary/5 px-4 py-3">
          <p className="font-hindi text-base font-bold text-primary">
            {greetingFor()} , {state.settings.userName} जी 🙏
          </p>
          <p className="font-hindi text-xs text-muted-foreground">
            {scope === "today"
              ? "आज का दिन शुभ हो।"
              : scope === "week"
                ? "इस हफ़्ते अच्छी कमाई हो।"
                : "इस महीने आगे बढ़ते रहिये।"}
          </p>
        </div>
      )}
      <div className="grid gap-3">
        <Tile
          icon={<Wallet className="h-7 w-7" />}
          labelHi="कुल कमाई"
          labelEn="Total Earnings"
          value={fmtINR(earnings)}
          accent="primary"
        />
        <Tile
          icon={<AlertCircle className="h-7 w-7" />}
          labelHi="उधार बाकी"
          labelEn="Pending Udhar"
          value={fmtINR(pendingTotal)}
          accent="destructive"
          to="/khata"
        />
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Tile
            icon={<Fuel className="h-7 w-7" />}
            labelHi="डीजल ख़र्चा"
            labelEn="Fuel Expense"
            value={fmtINR(fuelTotal)}
            accent="secondary"
          />
          <button
            onClick={() => setOpenFuel(true)}
            className="flex w-20 flex-col items-center justify-center rounded-3xl border-2 border-secondary bg-secondary text-secondary-foreground shadow-md active:scale-95"
          >
            <Plus className="h-7 w-7" strokeWidth={3} />
            <span className="font-hindi mt-1 text-xs font-black">भरें</span>
          </button>
        </div>
        <div className="flex items-center gap-3 rounded-3xl border-2 border-border bg-card p-4 shadow-sm">
          <div
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${profit >= 0 ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}`}
          >
            <TrendingUp className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-hindi text-sm font-semibold text-muted-foreground">
              मुनाफ़ा अनुमान <span className="text-xs opacity-70">(कमाई − डीजल)</span>
            </div>
            <div
              className={`mt-0.5 text-2xl font-black ${profit >= 0 ? "text-success" : "text-destructive"}`}
            >
              {fmtINR(profit)}
            </div>
          </div>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="font-hindi mb-2 text-lg font-bold">आज की एंट्रीज़</h2>
        {ready && todayList.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-border bg-card p-6 text-center">
            <p className="font-hindi text-base text-muted-foreground">अभी कोई एंट्री नहीं है।</p>
            <p className="font-hindi mt-1 text-sm text-muted-foreground">
              नीचे ऑरेंज बटन से नया काम जोड़ें।
            </p>
          </div>
        ) : (
          <ul className="grid gap-2">
            {todayList.map((e) => {
              const farmer = state.farmers.find((f) => f.id === e.farmerId);
              const tool = getTool(state, e.toolId);
              const paid = e.udharAdded <= 0;
              return (
                <li key={e.id} className="rounded-2xl border-2 border-border bg-card p-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent text-2xl">
                      {tool?.icon ?? "🚜"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-hindi truncate text-base font-bold">
                        {farmer?.name ?? "—"}
                      </div>
                      <div className="font-hindi truncate text-sm text-muted-foreground">
                        {tool?.nameHi} · {e.qty} {e.unit}
                        {e.landowner && ` · मालिक: ${e.landowner}`}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-lg font-black">{fmtINR(e.total)}</div>
                      <div
                        className={`text-xs font-bold ${paid ? "text-success" : "text-destructive"}`}
                      >
                        {paid ? "पूरा भुगतान" : `उधार ${fmtINR(e.udharAdded)}`}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* FAB */}
      <button
        onClick={() => setOpenEntry(true)}
        className="fixed bottom-24 left-1/2 z-30 flex h-16 -translate-x-1/2 items-center gap-2 rounded-full bg-secondary px-6 text-secondary-foreground shadow-xl shadow-secondary/40 ring-4 ring-secondary/20 active:scale-95"
      >
        <Plus className="h-7 w-7" strokeWidth={3} />
        <span className="font-hindi text-lg font-black">नया काम दर्ज करें</span>
      </button>

      <JobEntrySheet open={openEntry} onOpenChange={setOpenEntry} />
      <FuelSheet open={openFuel} onOpenChange={setOpenFuel} />

      {/* Modern Update Alert Dialog */}
      {updateInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl border-2 border-border bg-card p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="font-hindi text-xl font-black text-foreground">नया अपडेट उपलब्ध है! 🎉</h2>
            <p className="font-hindi mt-2 text-sm text-muted-foreground">
              Khetbook का एक नया वर्शन <strong>{updateInfo.tag}</strong> उपलब्ध है। कृपया इसे तुरंत डाउनलोड करें।
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <a
                href={updateInfo.apk || updateInfo.url}
                target="_blank"
                rel="noreferrer"
                className="font-hindi flex h-14 items-center justify-center gap-2 rounded-2xl bg-primary text-base font-black text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
                onClick={() => setUpdateInfo(null)}
              >
                <Download className="h-5 w-5" /> नया वर्शन डाउनलोड करें (APK)
              </a>
              <button
                onClick={() => {
                  sessionStorage.setItem(`ignore_update_${updateInfo.tag}`, "true");
                  setUpdateInfo(null);
                }}
                className="font-hindi h-12 rounded-xl border border-input bg-background text-sm font-semibold text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                बाद में (Skip)
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Tile({
  icon,
  labelHi,
  labelEn,
  value,
  accent,
  to,
}: {
  icon: React.ReactNode;
  labelHi: string;
  labelEn: string;
  value: string;
  accent: "primary" | "secondary" | "destructive";
  to?: string;
}) {
  const accentBg =
    accent === "primary"
      ? "bg-primary text-primary-foreground"
      : accent === "secondary"
        ? "bg-secondary text-secondary-foreground"
        : "bg-destructive text-destructive-foreground";
  const inner = (
    <div className="flex items-center gap-4 rounded-3xl border-2 border-border bg-card p-4 shadow-md">
      <div className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl ${accentBg}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-hindi text-sm font-semibold text-muted-foreground">
          {labelHi} <span className="text-xs opacity-70">({labelEn})</span>
        </div>
        <div className="mt-1 truncate text-3xl font-black tracking-tight">{value}</div>
      </div>
    </div>
  );
  return to ? (
    <Link to={to} className="block active:scale-[0.98] transition-transform">
      {inner}
    </Link>
  ) : (
    inner
  );
}
