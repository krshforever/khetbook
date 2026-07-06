import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Capacitor } from "@capacitor/core";
import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  ArrowLeft,
  MessageCircle,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  ArrowUpDown,
  Phone,
  Share2,
  FileText,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useStore, pendingForFarmer, allLandowners } from "@/lib/store";
import { fmtDate, fmtINR, todayISO, buildUpiLink } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { getTool } from "@/lib/voice-parser";
import { JobEntrySheet } from "@/components/JobEntrySheet";
import { exportFarmerBillPdf } from "@/lib/pdf-export";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/khata/$farmerId")({
  head: () => ({ meta: [{ title: "ग्राहक खाता विवरण" }] }),
  component: FarmerDetail,
});

type Row =
  | {
      kind: "entry";
      id: string;
      date: string;
      landowner: string;
      total: number;
      udhar: number;
      entry: import("@/lib/types").Entry;
    }
  | { kind: "payment"; id: string; date: string; amount: number };

function FarmerDetail() {
  const { farmerId } = Route.useParams();
  const navigate = useNavigate();
  const { state, addPayment, deleteEntry, deletePayment } = useStore();
  const farmer = state.farmers.find((f) => f.id === farmerId);
  const pending = farmer ? pendingForFarmer(state, farmer.id) : 0;

  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [editEntryId, setEditEntryId] = useState<string | undefined>();
  const [editSheet, setEditSheet] = useState(false);
  const [landFilter, setLandFilter] = useState<string>("");
  const [order, setOrder] = useState<"new" | "old">("new");
  const [sendOpen, setSendOpen] = useState(false);
  const [period, setPeriod] = useState<3 | 6 | 12 | 0>(3); // months; 0 = all
  const [includeTable, setIncludeTable] = useState(true);

  const upiLink = useMemo(
    () =>
      buildUpiLink(state.settings.upiVpa, state.settings.merchantName || state.settings.userName || "Khetbook"),
    [state.settings],
  );
  const canQR = !!state.settings.upiVpa && pending > 0;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvasRef.current && canQR) {
      QRCode.toCanvas(canvasRef.current, upiLink, {
        width: 280,
        margin: 1,
        color: { dark: "#0B1B14", light: "#FFFFFF" },
      }).catch(() => {});
    }
  }, [upiLink, canQR]);

  const farmerLandowners = useMemo(
    () => (farmerId ? allLandowners(state, farmerId) : []),
    [state, farmerId],
  );

  const rows = useMemo<Row[]>(() => {
    if (!farmer) return [];
    const entryRows: Row[] = state.entries
      .filter((e) => e.farmerId === farmer.id)
      .filter((e) => {
        if (!landFilter) return true;
        if (landFilter === "__self__") return !e.landowner;
        return (e.landowner ?? "") === landFilter;
      })
      .map((e) => ({
        kind: "entry",
        id: e.id,
        date: e.date,
        landowner: e.landowner || "खुद",
        total: e.total,
        udhar: e.udharAdded,
        entry: e,
      }));
    const paymentRows: Row[] = !landFilter
      ? state.payments
          .filter((p) => p.farmerId === farmer.id)
          .map((p) => ({ kind: "payment" as const, id: p.id, date: p.date, amount: p.amount }))
      : [];
    const all = [...entryRows, ...paymentRows];
    all.sort((a, b) => {
      const comp = b.date.localeCompare(a.date);
      return order === "new" ? comp : -comp;
    });
    return all;
  }, [state, farmer, landFilter, order]);

  if (!farmer) {
    return (
      <AppShell title="—">
        <p className="font-hindi">किसान नहीं मिला।</p>
      </AppShell>
    );
  }

  function recordPayment() {
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) return toast.error("रक़म दर्ज करें");
    addPayment({ date: todayISO(), farmerId: farmer!.id, amount: amt });
    toast.success("भुगतान दर्ज हुआ ✓");
    setPayAmount("");
    setPayOpen(false);
  }

  function periodRange(months: number): { from: string; to: string; label: string } {
    const to = new Date();
    const from = new Date();
    if (months === 0) {
      from.setFullYear(2000, 0, 1);
      return { from: from.toISOString(), to: to.toISOString(), label: "पूरा इतिहास" };
    }
    from.setMonth(from.getMonth() - months);
    return {
      from: from.toISOString(),
      to: to.toISOString(),
      label: `पिछले ${months} महीने`,
    };
  }

  function buildWhatsAppMessage(months: number, withTable: boolean): string {
    const { from } = periodRange(months);
    const fromT = +new Date(from);
    const ents = state.entries
      .filter((e) => e.farmerId === farmer!.id && +new Date(e.date) >= fromT)
      .sort((a, b) => a.date.localeCompare(b.date));
    const pays = state.payments
      .filter((p) => p.farmerId === farmer!.id && +new Date(p.date) >= fromT)
      .sort((a, b) => a.date.localeCompare(b.date));

    const alias = state.settings.userAlias || state.settings.merchantName || state.settings.userName || "ट्रैक्टर ऑपरेटर";
    const lines: string[] = [
      `*${alias} (Khetbook बहीखाता)*`,
      `नमस्ते ${farmer!.name} जी 🙏`,
      ``,
      `आपके ट्रैक्टर काम का बकाया हिसाब-किताब इस प्रकार है:`,
      `कुल बाकी राशि: *${fmtINR(pending)}*`,
    ];

    if (withTable && (ents.length || pays.length)) {
      lines.push("", `📋 *हिसाब का विवरण (${months === 0 ? "पूरा" : `पिछले ${months} महीने का`}):*`);
      for (const e of ents) {
        const t = getTool(state, e.toolId)?.nameHi ?? "काम";
        const d = fmtDate(e.date);
        const details = `• *${d}* - ${t} (${e.qty} ${e.unit} × ₹${e.rate}): किराया ₹${e.total} | मिला ₹${e.cashReceived} | बाकी ₹${e.udharAdded}`;
        lines.push(details);
      }
      for (const p of pays) {
        lines.push(`• *${fmtDate(p.date)}* - भुगतान मिला: −₹${p.amount}`);
      }
    }

    lines.push("", "यदि हिसाब में कोई अंतर लगे, तो कृपया मुझे अवश्य बताएं।");
    if (state.settings.upiVpa) {
      lines.push("", "सीधे UPI से भुगतान करने के लिए नीचे दिए लिंक पर क्लिक करें:", upiLink);
    }
    lines.push("", `धन्यवाद!\n— ${state.settings.merchantName || state.settings.userName || "Khetbook"}`);
    return lines.join("\n");
  }

  function openWhatsApp(text: string) {
    const phone = farmer?.phone?.replace(/\D/g, "");
    const url = phone
      ? `https://wa.me/${phone.length === 10 ? "91" + phone : phone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  }

  function sendReminder() {
    openWhatsApp(buildWhatsAppMessage(period, includeTable));
    setSendOpen(false);
  }

  async function sendBillPdf() {
    const { from, to, label } = periodRange(period);
    toast.info("PDF तैयार हो रहा है...");
    try {
      const shareText = buildWhatsAppMessage(period, false);
      await exportFarmerBillPdf(state, farmer!.id, from, to, label, shareText);
      setSendOpen(false);
      if (Capacitor.isNativePlatform()) {
        toast.success("PDF शेयर किया जा रहा है...");
      } else {
        toast.success("PDF डाउनलोड हो गया है! कृपया इसे व्हाट्सएप पर अटैच करें।");
      }
    } catch (err: any) {
      toast.error(err.message || "PDF नहीं बन पाया");
    }
  }

  async function shareQR() {
    if (!canvasRef.current) return;
    try {
      const blob: Blob | null = await new Promise((resolve) =>
        canvasRef.current!.toBlob((b) => resolve(b), "image/png"),
      );
      if (!blob) throw new Error("blob");
      
      const filename = `khetbook-qr-${farmer!.name.replace(/\s+/g, "_")}.png`;
      const text = `${farmer!.name} जी का बाकी ${fmtINR(pending)} — स्कैन करके भेजें।`;

      if (Capacitor.isNativePlatform()) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const base64 = (reader.result as string).split(',')[1];
            const { Filesystem, Directory } = await import("@capacitor/filesystem");
            const { Share } = await import("@capacitor/share");

            const fileResult = await Filesystem.writeFile({
              path: filename,
              data: base64,
              directory: Directory.Cache,
            });

            await Share.share({
              title: "Khetbook — UPI QR",
              text: text,
              url: fileResult.uri,
            });
          } catch (err: any) {
            toast.error("QR शेयर नहीं हो पाया: " + err.message);
          }
        };
        reader.readAsDataURL(blob);
      } else {
        try {
          const file = new File([blob], filename, { type: "image/png" });
          const nav = navigator as Navigator & {
            canShare?: (d: ShareData) => boolean;
            share?: (d: ShareData) => Promise<void>;
          };
          if (nav.share && nav.canShare?.({ files: [file] })) {
            await nav.share({
              files: [file],
              title: "Khetbook — UPI QR",
              text: text,
            });
            return;
          }
        } catch (err) {
          console.warn("Web QR Share failed:", err);
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("QR डाउनलोड हुआ — WhatsApp पर भेज रहे हैं");
        openWhatsApp(text);
      }
    } catch {
      toast.error("शेयर नहीं हो पाया");
    }
  }

  return (
    <AppShell
      title={farmer.name}
      subtitle={
        farmer.phone ??
        (farmer.landownerMemory ? `मालिक: ${farmer.landownerMemory}` : "ग्राहक खाता")
      }
      right={
        <button onClick={() => navigate({ to: "/khata" })} className="rounded-full bg-white/15 p-2">
          <ArrowLeft className="h-6 w-6" />
        </button>
      }
    >
      <div
        className={`rounded-3xl border-2 p-5 text-center shadow-md ${pending > 0 ? "border-destructive bg-destructive/5" : "border-success bg-success/5"}`}
      >
        <div className="font-hindi text-base font-bold text-muted-foreground">उधार बाकी</div>
        <div
          className={`mt-1 text-5xl font-black ${pending > 0 ? "text-destructive" : "text-success"}`}
        >
          {fmtINR(pending)}
        </div>
      </div>

      {canQR ? (
        <div className="mt-4 rounded-3xl border-2 border-border bg-card p-5 text-center shadow-md">
          <div className="font-hindi text-base font-bold">UPI से भुगतान — स्कैन करें</div>
          <canvas ref={canvasRef} className="mx-auto mt-3 rounded-xl" />
          <div className="font-hindi mt-2 text-sm text-muted-foreground">
            {state.settings.merchantName} · {state.settings.upiVpa}
          </div>
          <Button onClick={shareQR} variant="outline" size="sm" className="font-hindi mt-3 h-10">
            <Share2 className="h-4 w-4" /> QR शेयर करें
          </Button>
        </div>
      ) : pending > 0 ? (
        <div className="mt-4 rounded-2xl border-2 border-dashed border-border bg-card p-4 text-center">
          <p className="font-hindi text-sm text-muted-foreground">
            QR दिखाने के लिए सेटिंग्स में UPI ID जोड़ें।
          </p>
          <Link
            to="/settings"
            className="font-hindi mt-2 inline-block font-bold text-primary underline"
          >
            सेटिंग्स पर जाएँ
          </Link>
        </div>
      ) : null}

      <div className="mt-4 grid gap-2">
        <Button
          onClick={() => setSendOpen(true)}
          size="lg"
          className="h-14 bg-success font-hindi text-lg font-black text-success-foreground hover:bg-success/90"
        >
          <MessageCircle className="h-6 w-6" /> WhatsApp रिमाइंडर / बिल भेजें
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => setPayOpen(true)}
            size="lg"
            variant="outline"
            className="font-hindi h-14 text-base font-black"
          >
            <Plus className="h-5 w-5" /> भुगतान
          </Button>
          {farmer.phone ? (
            <a
              href={`tel:${farmer.phone}`}
              className="font-hindi inline-flex h-14 items-center justify-center gap-2 rounded-md border-2 border-border bg-card text-base font-black"
            >
              <Phone className="h-5 w-5" /> कॉल करें
            </a>
          ) : (
            <Button disabled variant="outline" size="lg" className="font-hindi h-14 text-base">
              <Phone className="h-5 w-5" /> फ़ोन नहीं
            </Button>
          )}
        </div>
      </div>

      {/* Ledger header with filter/order */}
      <div className="mt-6 mb-2 flex items-center justify-between">
        <h2 className="font-hindi text-lg font-bold">पूरा हिसाब (नया ऊपर)</h2>
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1 rounded-xl border-2 border-border bg-card px-3 py-2 text-sm font-bold">
              <ArrowUpDown className="h-4 w-4" />
              {landFilter ? (landFilter === "__self__" ? "खुद" : landFilter) : "सभी"}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-60 p-2">
            <div className="font-hindi mb-1 text-xs font-bold text-muted-foreground">
              मालिक के अनुसार
            </div>
            <div className="flex flex-wrap gap-1">
              <FilterChip active={!landFilter} onClick={() => setLandFilter("")}>
                सभी
              </FilterChip>
              <FilterChip
                active={landFilter === "__self__"}
                onClick={() => setLandFilter("__self__")}
              >
                खुद
              </FilterChip>
              {farmerLandowners.map((n) => (
                <FilterChip key={n} active={landFilter === n} onClick={() => setLandFilter(n)}>
                  {n}
                </FilterChip>
              ))}
            </div>
            <div className="font-hindi mt-3 mb-1 text-xs font-bold text-muted-foreground">क्रम</div>
            <div className="flex gap-1">
              <FilterChip active={order === "new"} onClick={() => setOrder("new")}>
                नया पहले
              </FilterChip>
              <FilterChip active={order === "old"} onClick={() => setOrder("old")}>
                पुराना पहले
              </FilterChip>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {rows.length === 0 && (
        <p className="font-hindi rounded-2xl border-2 border-dashed border-border p-6 text-center text-muted-foreground">
          कोई एंट्री नहीं।
        </p>
      )}

      <ul className="grid gap-2">
        {rows.map((row) =>
          row.kind === "entry" ? (
            <EntryRow
              key={"e-" + row.id}
              row={row}
              onEdit={() => {
                setEditEntryId(row.id);
                setEditSheet(true);
              }}
              onDelete={() => {
                if (confirm("एंट्री मिटाएँ?")) deleteEntry(row.id);
              }}
            />
          ) : (
            <PaymentRow
              key={"p-" + row.id}
              row={row}
              onDelete={() => {
                if (confirm("भुगतान मिटाएँ?")) deletePayment(row.id);
              }}
            />
          ),
        )}
      </ul>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-hindi">भुगतान दर्ज करें</DialogTitle>
          </DialogHeader>
          <Label className="font-hindi">रक़म (₹)</Label>
          <Input
            type="number"
            inputMode="decimal"
            value={payAmount}
            autoFocus
            onChange={(e) => setPayAmount(e.target.value)}
            className="h-14 text-2xl font-black"
          />
          <Button onClick={recordPayment} className="font-hindi mt-3 h-14 text-lg font-black">
            सेव करें
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-hindi">WhatsApp पर भेजें</DialogTitle>
          </DialogHeader>
          <div>
            <Label className="font-hindi mb-2 block text-base font-bold">
              कितने महीने का हिसाब?
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {([3, 6, 12, 0] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setPeriod(m)}
                  className={cn(
                    "font-hindi min-h-12 rounded-2xl border-2 px-2 text-sm font-bold",
                    period === m
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card",
                  )}
                >
                  {m === 0 ? "पूरा" : `${m}m`}
                </button>
              ))}
            </div>
          </div>
          <label className="font-hindi mt-2 flex items-center gap-2 rounded-xl border-2 border-border p-3 text-sm font-bold">
            <Checkbox checked={includeTable} onCheckedChange={(v) => setIncludeTable(!!v)} />
            संदेश में टेबल शामिल करें (तारीख-वार)
          </label>
          <div className="mt-3 grid gap-2">
            <Button
              onClick={sendReminder}
              className="font-hindi h-14 bg-success text-base font-black text-success-foreground hover:bg-success/90"
            >
              <MessageCircle className="h-5 w-5" /> सिर्फ़ टेक्स्ट भेजें
            </Button>
            <Button
              onClick={sendBillPdf}
              variant="outline"
              className="font-hindi h-14 text-base font-black"
            >
              <FileText className="h-5 w-5" /> {Capacitor.isNativePlatform() ? "PDF बिल भेजें" : "PDF बिल डाउनलोड करें"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <JobEntrySheet
        open={editSheet}
        onOpenChange={(v) => {
          setEditSheet(v);
          if (!v) setEditEntryId(undefined);
        }}
        editEntryId={editEntryId}
      />
    </AppShell>
  );
}

function EntryRow({
  row,
  onEdit,
  onDelete,
}: {
  row: Extract<Row, { kind: "entry" }>;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { state } = useStore();
  const tool = getTool(state, row.entry.toolId);
  return (
    <li className="rounded-2xl border-2 border-border bg-card p-3">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-xl">
          {tool?.icon ?? "🚜"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-hindi truncate text-base font-bold">
            {tool?.nameHi} · {row.entry.qty} {row.entry.unit}
          </div>
          <div className="text-xs text-muted-foreground">
            {fmtDate(row.date)} · रेट ₹{row.entry.rate}
          </div>
          <span
            className={cn(
              "font-hindi mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold",
              row.entry.landowner
                ? "bg-warning/20 text-warning-foreground"
                : "bg-primary/15 text-primary",
            )}
          >
            {row.entry.landowner ? `मालिक: ${row.entry.landowner}` : "खुद का खेत"}
          </span>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-base font-black">{fmtINR(row.total)}</div>
          {row.udhar > 0 && (
            <div className="text-xs font-bold text-destructive">+{fmtINR(row.udhar)} उधार</div>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="ml-1 rounded-lg p-2 text-muted-foreground active:bg-accent"
              aria-label="और विकल्प"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="font-hindi" onClick={onEdit}>
              <Pencil className="mr-2 h-4 w-4" /> एडिट करें
            </DropdownMenuItem>
            <DropdownMenuItem
              className="font-hindi text-destructive focus:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" /> मिटाएँ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}

function PaymentRow({
  row,
  onDelete,
}: {
  row: Extract<Row, { kind: "payment" }>;
  onDelete: () => void;
}) {
  return (
    <li className="rounded-2xl border-2 border-success/40 bg-success/5 p-3">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-success text-success-foreground text-xl">
          ₹
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-hindi text-base font-bold text-success">भुगतान मिला</div>
          <div className="text-xs text-muted-foreground">{fmtDate(row.date)}</div>
        </div>
        <div className="text-base font-black text-success">−{fmtINR(row.amount)}</div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="ml-1 rounded-lg p-2 text-muted-foreground active:bg-accent"
              aria-label="और विकल्प"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="font-hindi text-destructive focus:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" /> मिटाएँ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border-2 px-3 py-1 text-xs font-bold font-hindi",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card",
      )}
    >
      {children}
    </button>
  );
}


