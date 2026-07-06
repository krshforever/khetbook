import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  Upload,
  Plus,
  Trash2,
  Heart,
  Linkedin,
  Instagram,
  Youtube,
  Wand2,
  FileImage,
  FileText,
  Bell,
  BellOff,
  RefreshCw,
  Github,
  ChevronDown,
  ChevronUp,
  UserRound,
  Languages,
  MessageSquare,
  Tractor,
  DatabaseBackup,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { AppState, Tool, ToolUnit } from "@/lib/types";
import { uid, INITIAL_STATE } from "@/lib/storage";
import { parseVoice } from "@/lib/voice-parser";
import { exportFullLedgerPdf } from "@/lib/pdf-export";
import { APP_VERSION, GITHUB_REPO } from "@/lib/version";
import {
  scheduleDailyReminder,
  cancelDailyReminder,
  fetchLatestRelease,
} from "@/lib/notifications";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "सेटिंग्स — Settings" }] }),
  component: SettingsPage,
});

const UNITS: ToolUnit[] = ["बीघा", "घंटे", "क्विंटल", "फेरा"];

function SettingsPage() {
  const { state, updateSettings, upsertTool, deleteTool, replaceAll, clearSMSLogs } = useStore();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  function exportBackup() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `khetbook-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    updateSettings({ lastBackupAt: new Date().toISOString() });
    toast.success("बैकअप डाउनलोड हुआ ✓");
  }

  function importBackup(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result)) as Partial<AppState>;
        if (!Array.isArray(data.entries)) throw new Error("invalid");
        if (!confirm("मौजूदा डेटा बदलकर बैकअप लोड करें?")) return;
        replaceAll({ ...INITIAL_STATE, ...data, version: 2 });
        toast.success("रिस्टोर पूरा हुआ ✓");
      } catch {
        toast.error("बैकअप फ़ाइल सही नहीं है");
      }
    };
    reader.readAsText(file);
  }

  return (
    <AppShell title="सेटिंग्स" subtitle="Khetbook — रेट, UPI, बैकअप">
      {/* Profile & UPI */}
      <Card title="प्रोफ़ाइल और UPI जानकारी (Profile & UPI)" Icon={UserRound}>
        <Label className="font-hindi">आपका नाम (Your Name)</Label>
        <Input
          value={state.settings.userName ?? ""}
          onChange={(e) => updateSettings({ userName: e.target.value })}
          placeholder="जैसे: राम कुमार"
          className="mt-1 h-12 text-base"
        />

        <Label className="font-hindi mt-3 block">ट्रैक्टर/फ़ार्म का नाम (Farm Alias)</Label>
        <Input
          value={state.settings.userAlias ?? ""}
          onChange={(e) => updateSettings({ userAlias: e.target.value })}
          placeholder="जैसे: जय माता दी ट्रैक्टर्स"
          className="mt-1 h-12 text-base"
        />

        <Label className="font-hindi mt-3 block">मोबाइल नंबर (Mobile Number)</Label>
        <Input
          value={state.settings.userPhone ?? ""}
          onChange={(e) => updateSettings({ userPhone: e.target.value })}
          placeholder="जैसे: 9876543210"
          type="tel"
          className="mt-1 h-12 text-base"
        />

        <Label className="font-hindi mt-3 block">UPI ID (VPA - QR के लिए ज़रूरी)</Label>
        <Input
          value={state.settings.upiVpa}
          onChange={(e) => updateSettings({ upiVpa: e.target.value })}
          placeholder="papa@okaxis"
          className="mt-1 h-12 text-base"
        />
        <Label className="font-hindi mt-3 block">Merchant / खाता नाम</Label>
        <Input
          value={state.settings.merchantName}
          onChange={(e) => updateSettings({ merchantName: e.target.value })}
          placeholder="Ram Kumar"
          className="mt-1 h-12 text-base"
        />
        <p className="font-hindi mt-2 text-xs text-muted-foreground">
          सेव होते ही — हर किसान की प्रोफ़ाइल में सही रक़म वाला QR तैयार हो जाता है।
        </p>
      </Card>

      {/* Voice */}
      <Card title="आवाज़ की भाषा" Icon={Languages}>
        <div className="grid grid-cols-2 gap-2">
          {(["hi-IN", "en-IN"] as const).map((l) => (
            <button
              key={l}
              onClick={() => updateSettings({ voiceLang: l })}
              className={`min-h-14 rounded-2xl border-2 px-3 font-hindi font-bold ${state.settings.voiceLang === l ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
            >
              {l === "hi-IN" ? "हिंदी (hi-IN)" : "Hinglish (en-IN)"}
            </button>
          ))}
        </div>
      </Card>

      {/* SMS Settings */}
      <Card title="SMS नोटिफिकेशन्स" Icon={MessageSquare}>
        <div className="flex items-center justify-between min-h-14 rounded-2xl border border-border bg-card p-4">
          <div>
            <h4 className="font-hindi text-base font-bold text-foreground">काम सेव होने पर SMS भेजें</h4>
            <p className="font-hindi text-xs text-muted-foreground mt-0.5">
              नया काम सेव होते ही किसान को मोबाइल SMS द्वारा हिसाब भेजा जाएगा।
            </p>
          </div>
          <button
            onClick={() => updateSettings({ autoSmsOnSave: !state.settings.autoSmsOnSave })}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              state.settings.autoSmsOnSave ? "bg-primary" : "bg-muted-foreground/35"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-background shadow ring-0 transition duration-200 ease-in-out ${
                state.settings.autoSmsOnSave ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </Card>

      {/* SMS History Log */}
      <Card title="SMS भेजने का इतिहास (SMS Log)" Icon={MessageSquare}>
        <div className="grid gap-2">
          {state.smsLogs && state.smsLogs.length > 0 ? (
            <>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-muted-foreground">{state.smsLogs.length} संदेश रिकॉर्ड</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm("सारा SMS इतिहास मिटा दें?")) clearSMSLogs();
                  }}
                  className="text-xs text-destructive h-8 px-2"
                >
                  लॉग साफ़ करें
                </Button>
              </div>
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                {state.smsLogs.slice().reverse().map((log) => (
                  <div key={log.id} className="border border-border rounded-xl p-3 bg-accent/20 text-sm">
                    <div className="flex justify-between items-start mb-1">
                      <strong className="font-hindi text-base">{log.farmerName}</strong>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${log.status === "success" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                        {log.status === "success" ? "सफल ✓" : "विफल ❌"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mb-1">फोन: {log.phone} | {new Date(log.date).toLocaleString("hi-IN")}</div>
                    <p className="text-xs text-muted-foreground whitespace-pre-line bg-card p-2 rounded-lg border border-border/40 font-mono">{log.message}</p>
                    {log.error && <div className="text-xs text-destructive mt-1 font-bold">त्रुटि (Error): {log.error}</div>}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="font-hindi text-sm text-center text-muted-foreground py-4">कोई SMS इतिहास नहीं है।</p>
          )}
        </div>
      </Card>

      {/* Rates */}
      <Card title="रेट लिस्ट (Default Rates)" Icon={Tractor}>
        <ul className="grid gap-2">
          {state.tools.map((t) => (
            <ToolRow key={t.id} tool={t} onSave={upsertTool} onDelete={() => deleteTool(t.id)} />
          ))}
        </ul>
        <Button
          onClick={() =>
            upsertTool({
              id: uid(),
              nameHi: "नया औजार",
              nameEn: "Tool",
              icon: "🚜",
              unit: "बीघा",
              defaultRate: 0,
            })
          }
          variant="outline"
          className="font-hindi mt-3 h-12 w-full"
        >
          <Plus className="h-5 w-5" /> नया औजार जोड़ें
        </Button>
      </Card>

      <NotificationsCard />

      <UpdatesCard />

      {/* Backup */}
      <Card title="बैकअप / रिस्टोर" Icon={DatabaseBackup}>
        <p className="font-hindi mb-3 text-sm text-muted-foreground">
          पूरा डेटा JSON फ़ाइल में डाउनलोड करें और बाद में रिस्टोर करें।
        </p>
        {state.settings.lastBackupAt && (
          <p className="font-hindi mb-2 text-xs text-muted-foreground">
            पिछला बैकअप: {new Date(state.settings.lastBackupAt).toLocaleDateString("hi-IN")}
          </p>
        )}
        <div className="grid gap-2">
          <Button onClick={exportBackup} className="font-hindi h-14 text-base font-bold">
            <Download className="h-5 w-5" /> बैकअप डाउनलोड (.json)
          </Button>
          <Button
            onClick={async () => {
              toast.info("PDF तैयार हो रहा है...");
              try {
                await exportFullLedgerPdf(state);
                toast.success("PDF डाउनलोड हुआ ✓");
              } catch (err: any) {
                toast.error(err.message || "PDF नहीं बन पाया");
              }
            }}
            variant="outline"
            className="font-hindi h-14 text-base font-bold"
          >
            <FileText className="h-5 w-5" /> पूरा हिसाब PDF डाउनलोड
          </Button>
          <Button
            onClick={() => fileRef.current?.click()}
            variant="outline"
            className="font-hindi h-14 text-base font-bold"
          >
            <Upload className="h-5 w-5" /> रिस्टोर (JSON चुनें)
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importBackup(f);
              e.target.value = "";
            }}
          />
        </div>
      </Card>

      <BatchEntryCard />

      <Card title="ख़तरा क्षेत्र" Icon={Trash2}>
        <Button
          variant="destructive"
          onClick={() => {
            if (confirm("सारा डेटा मिटा दें?")) {
              replaceAll(INITIAL_STATE);
              toast.success("सब कुछ रीसेट हो गया");
              navigate({ to: "/" });
            }
          }}
          className="font-hindi h-14 w-full text-base font-bold"
        >
          <Trash2 className="h-5 w-5" /> सारा डेटा रीसेट करें
        </Button>
      </Card>

      <CreditsFooter />
    </AppShell>
  );
}

function Card({
  title,
  children,
  defaultExpanded = false,
  Icon,
}: {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  Icon?: React.ComponentType<{ className?: string }>;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <section className="mt-4 rounded-3xl border-2 border-border bg-card shadow-sm overflow-hidden transition-all duration-350">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-left focus:outline-none active:bg-accent/40"
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className="h-5 w-5 text-primary shrink-0" />}
          <h2 className="font-hindi text-lg font-black m-0">{title}</h2>
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground transition-transform duration-200" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-200" />
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-dashed border-border/60 pt-3 animate-in fade-in duration-200">
          {children}
        </div>
      )}
    </section>
  );
}

function ToolRow({
  tool,
  onSave,
  onDelete,
}: {
  tool: Tool;
  onSave: (t: Tool) => void;
  onDelete: () => void;
}) {
  const [draft, setDraft] = useState(tool);
  useEffect(() => setDraft(tool), [tool]);
  return (
    <li className="rounded-2xl border-2 border-border p-3">
      <div className="flex items-center gap-2">
        <Input
          value={draft.icon}
          onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
          className="h-12 w-14 text-center text-2xl"
          maxLength={2}
        />
        <Input
          value={draft.nameHi}
          onChange={(e) => setDraft({ ...draft, nameHi: e.target.value })}
          className="font-hindi h-12 flex-1 text-base font-bold"
        />
        <button
          onClick={onDelete}
          className="rounded-lg p-2 text-muted-foreground active:bg-accent"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2 grid grid-cols-[1fr_1fr] gap-2">
        <select
          value={draft.unit}
          onChange={(e) => setDraft({ ...draft, unit: e.target.value as ToolUnit })}
          className="font-hindi h-12 rounded-lg border-2 border-border bg-card px-2 text-base"
        >
          {UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
        <Input
          type="number"
          inputMode="decimal"
          value={draft.defaultRate}
          onChange={(e) => setDraft({ ...draft, defaultRate: parseFloat(e.target.value) || 0 })}
          placeholder="रेट"
          className="h-12 text-base"
        />
      </div>
      <Button
        size="sm"
        onClick={() => {
          onSave(draft);
          toast.success("रेट सेव हुआ");
        }}
        className="font-hindi mt-2 h-10 w-full"
        disabled={JSON.stringify(draft) === JSON.stringify(tool)}
      >
        सेव करें
      </Button>
    </li>
  );
}

function NotificationsCard() {
  const { state, updateSettings } = useStore();
  const enabled = !!state.settings.notificationsEnabled;
  const hour = state.settings.reminderHour ?? 19;

  async function toggle() {
    if (enabled) {
      await cancelDailyReminder();
      updateSettings({ notificationsEnabled: false });
      toast.message("रिमाइंडर बंद");
    } else {
      const ok = await scheduleDailyReminder(hour);
      if (ok) {
        updateSettings({ notificationsEnabled: true, reminderHour: hour });
        toast.success("रोज़ का रिमाइंडर चालू ✓");
      } else {
        toast.error("Notification permission नहीं मिली");
      }
    }
  }

  async function updateHour(h: number) {
    updateSettings({ reminderHour: h });
    if (enabled) await scheduleDailyReminder(h);
  }

  return (
    <Card title="रोज़ का रिमाइंडर (शाम को)" Icon={Bell}>
      <p className="font-hindi mb-3 text-sm text-muted-foreground">
        हर रोज़ शाम को एक छोटा रिमाइंडर — "आज का हिसाब लिख लिया?" 10 अलग-अलग संदेशों में से एक।
      </p>
      <div className="grid gap-2">
        <Button
          onClick={toggle}
          className="font-hindi h-14 text-base font-bold"
          variant={enabled ? "outline" : "default"}
        >
          {enabled ? (
            <>
              <BellOff className="h-5 w-5" /> रिमाइंडर बंद करें
            </>
          ) : (
            <>
              <Bell className="h-5 w-5" /> रिमाइंडर चालू करें
            </>
          )}
        </Button>
        <div className="flex items-center gap-2">
          <Label className="font-hindi text-base">समय:</Label>
          <select
            value={hour}
            onChange={(e) => updateHour(+e.target.value)}
            className="font-hindi h-12 flex-1 rounded-lg border-2 border-border bg-card px-3 text-base"
          >
            {Array.from({ length: 24 }, (_, i) => i).map((h) => (
              <option key={h} value={h}>
                {h === 0
                  ? "12 बजे रात"
                  : h < 12
                    ? `${h} बजे सुबह`
                    : h === 12
                      ? "12 बजे दोपहर"
                      : `${h - 12} बजे शाम/रात`}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Card>
  );
}

function UpdatesCard() {
  const [checking, setChecking] = useState(false);
  const [latest, setLatest] = useState<{ tag: string; url: string; apk?: string } | null>(null);

  async function check() {
    setChecking(true);
    const res = await fetchLatestRelease(GITHUB_REPO);
    setChecking(false);
    if (!res) return toast.error("नया वर्शन नहीं मिल पाया");
    setLatest(res);
    toast.success(`नवीनतम: ${res.tag}`);
  }

  return (
    <Card title="ऐप अपडेट (नया APK)" Icon={RefreshCw}>
      <p className="font-hindi mb-3 text-sm text-muted-foreground">
        Khetbook open-source है। हर नया APK GitHub Releases पर मिलता है।
      </p>
      <p className="font-hindi text-sm font-semibold text-primary mb-3">
        वर्तमान वर्शन: {APP_VERSION} · रिपॉजिटरी: {GITHUB_REPO}
      </p>
      <div className="grid gap-2">
        <Button onClick={check} disabled={checking} className="font-hindi h-12">
          <RefreshCw className={`h-5 w-5 ${checking ? "animate-spin" : ""}`} /> अपडेट देखें
        </Button>
        {latest && (
          <a
            href={latest.apk || latest.url}
            target="_blank"
            rel="noreferrer"
            className="font-hindi inline-flex h-12 items-center justify-center gap-2 rounded-md border-2 border-primary bg-primary/10 px-4 text-base font-black text-primary"
          >
            <Download className="h-5 w-5" />{" "}
            {latest.apk ? `${latest.tag} APK डाउनलोड` : `${latest.tag} देखें`}
          </a>
        )}
        <a
          href={`https://github.com/${GITHUB_REPO}`}
          target="_blank"
          rel="noreferrer"
          className="font-hindi inline-flex h-12 items-center justify-center gap-2 rounded-md border-2 border-border bg-card text-sm font-bold"
        >
          <Github className="h-4 w-4" /> repo खोलें
        </a>
      </div>
    </Card>
  );
}

function BatchEntryCard() {
  const { state, addEntry, addFuel, findOrCreateFarmer } = useStore();
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const preview = useMemo(() => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    return lines.map((line) => {
      const isDiesel = /diesel|डीजल|डीज़ल/i.test(line);
      if (isDiesel) {
        const nums = (line.match(/[\d.]+/g) || []).map(parseFloat);
        const total = nums.find((n) => n >= 50) ?? 0;
        const litres = nums.find((n) => n < 50) ?? 0;
        return { kind: "fuel" as const, total, litres, line };
      }
      const p = parseVoice(line, state);
      return { kind: "work" as const, parsed: p, line };
    });
  }, [text, state]);

  function commit() {
    let n = 0;
    for (const row of preview) {
      if (row.kind === "fuel") {
        const price = state.settings.lastDieselPrice ?? 95;
        const litres = row.litres > 0 ? row.litres : row.total > 0 ? row.total / price : 0;
        if (litres > 0 && row.total > 0) {
          addFuel({
            date: new Date().toISOString(),
            amount: row.total,
            litres,
            pricePerLitre: price,
          });
          n++;
        }
      } else {
        const p = row.parsed;
        if (!p.toolId || !p.qty) continue;
        const tool = state.tools.find((t) => t.id === p.toolId)!;
        const rate = tool.defaultRate;
        const mult = p.multiplier === "double" ? 2 : p.multiplier === "triple" ? 3 : 1;
        const total = Math.round(p.qty * rate * mult);
        const name = p.farmerName || "अज्ञात";
        const f = p.farmerId
          ? state.farmers.find((x) => x.id === p.farmerId)!
          : findOrCreateFarmer(name);
        addEntry({
          date: new Date().toISOString(),
          farmerId: f.id,
          toolId: tool.id,
          qty: p.qty,
          unit: tool.unit,
          multiplier: p.multiplier ?? "single",
          rate,
          total,
          cashReceived: p.cashReceived ?? 0,
          udharAdded: Math.max(0, total - (p.cashReceived ?? 0)),
          landowner: p.landowner,
        });
        n++;
      }
    }
    toast.success(`${n} एंट्री जुड़ीं`);
    setText("");
  }

  return (
    <Card title="बैच एंट्री (डायरी से कई एंट्री एक साथ)" Icon={Wand2}>
      <p className="font-hindi mb-2 text-sm text-muted-foreground">
        हर लाइन में एक एंट्री — जैसे "रामू 2 बीघा हल दोहर 500 नकद" या "diesel 500".
      </p>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        className="font-hindi text-base"
        placeholder={"रामू 2 बीघा हल दोहर 500 नकद\nश्याम 3 घंटे थ्रेशर\ndiesel 1000"}
      />
      {preview.length > 0 && (
        <ul className="mt-2 grid gap-1 text-xs">
          {preview.map((r, i) => (
            <li key={i} className="font-hindi rounded-lg bg-accent px-2 py-1">
              {r.kind === "fuel"
                ? `⛽ डीजल — ₹${r.total}${r.litres ? ` · ${r.litres}L` : ""}`
                : `🚜 ${r.parsed.toolId ?? "?"} · qty ${r.parsed.qty ?? "?"} · ${r.parsed.farmerName ?? "?"}`}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button onClick={commit} disabled={!preview.length} className="font-hindi h-12">
          <Wand2 className="h-4 w-4" /> सब जोड़ें
        </Button>
        <Button
          variant="outline"
          onClick={() => fileRef.current?.click()}
          className="font-hindi h-12"
        >
          <FileImage className="h-4 w-4" /> डायरी फ़ोटो (जल्द)
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={() => toast.message("इमेज से OCR जल्द आएगा — फ़िलहाल टेक्स्ट से जोड़ें।")}
        />
      </div>
    </Card>
  );
}

function CreditsFooter() {
  return (
    <footer className="mt-8 mb-4 text-center">
      <p className="font-hindi flex items-center justify-center gap-1 text-sm text-muted-foreground">
        Made with <Heart className="h-3.5 w-3.5 text-destructive" /> by{" "}
        <a
          href="https://www.linkedin.com/in/krish-tiwari-82192230b"
          target="_blank"
          rel="noreferrer"
          className="font-bold text-primary underline"
        >
          Krish Tiwari
        </a>
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <a
          href="https://www.linkedin.com/in/krish-tiwari-82192230b"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-full border-2 border-border bg-card px-3 py-1.5 text-xs font-bold"
        >
          <Linkedin className="h-4 w-4 text-[#0A66C2]" /> LinkedIn
        </a>
        <a
          href="https://instagram.com/krshforever"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-full border-2 border-border bg-card px-3 py-1.5 text-xs font-bold"
        >
          <Instagram className="h-4 w-4 text-[#E4405F]" /> @krshforever
        </a>
        <a
          href="https://youtube.com/@krshforever"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-full border-2 border-border bg-card px-3 py-1.5 text-xs font-bold"
        >
          <Youtube className="h-4 w-4 text-[#FF0000]" /> @krshforever
        </a>
      </div>
      <p className="font-hindi mt-4 text-[11px] leading-relaxed text-muted-foreground">
        Khetbook is open-source under MIT License.
        <br />
        सादर निर्माण — <span className="font-bold">क्रिश तिवारी</span>
        <br />
        अपने पिता और देश के सभी ट्रैक्टर चालकों के सम्मान में।
      </p>
    </footer>
  );
}
