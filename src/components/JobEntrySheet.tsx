import { useEffect, useMemo, useState } from "react";
import { Mic, MicOff, Calendar as CalIcon, Check, UserPlus } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useStore, allLandowners, pendingForFarmer } from "@/lib/store";
import { useVoice } from "@/hooks/use-voice";
import { fuzzyMatch, multiplierFactor, multiplierLabel, parseVoice } from "@/lib/voice-parser";
import type { Entry, Multiplier } from "@/lib/types";
import { fmtINR, fmtDate, buildUpiLink } from "@/lib/format";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { registerPlugin, Capacitor } from "@capacitor/core";

const KhetbookNative = registerPlugin<any>("KhetbookNative");

async function sendJobSMS(
  farmerName: string,
  phone: string,
  toolName: string,
  qty: number,
  unit: string,
  total: number,
  cash: number,
  udhar: number,
  totalPending: number,
  upiVpa: string,
  merchantName: string,
  userAlias: string
) {
  if (!Capacitor.isNativePlatform()) {
    console.log("Not running in native app. SMS sending skipped.");
    return;
  }

  // Format the date
  const dateStr = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

  // Calculate updated pending balance including the new entry
  const updatedPending = totalPending + udhar;

  // Generate UPI deep link for the updated pending balance (if positive)
  const payAmount = Math.max(0, updatedPending);
  const upiLink = payAmount > 0 && upiVpa ? buildUpiLink(upiVpa, merchantName, payAmount, farmerName) : "";

  // Construct Hindi SMS notification
  let smsText = `नमस्ते ${farmerName} जी!\nKhetbook हिसाब में नया काम जोड़ा गया है:\nतारीख: ${dateStr}\nकाम: ${toolName} (${qty} ${unit})\nकुल रक़म: ₹${total}\nनकद मिला: ₹${cash}\nबाकी उधार: ₹${udhar}\n\nकुल बाकी हिसाब (All-Time): ₹${updatedPending}`;

  if (upiLink) {
    smsText += `\n\nसीधे UPI से भुगतान करने के लिए इस लिंक पर क्लिक करें:\n${upiLink}`;
  }

  if (userAlias) {
    smsText += `\n\n- ${merchantName} (${userAlias})`;
  } else {
    smsText += `\n\n- ${merchantName}`;
  }

  try {
    await KhetbookNative.sendSMS({ phone, message: smsText });
    toast.success("किसान को SMS भेज दिया गया ✓");
  } catch (err: any) {
    console.error("SMS Sending failed:", err);
    toast.error("SMS नहीं भेजा जा सका: " + err.message);
  }
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editEntryId?: string;
}

/** Tiny mic button rendered inside text inputs. Independent SpeechRecognition. */
function InlineMic({
  lang,
  onTranscript,
}: {
  lang: "hi-IN" | "en-IN";
  onTranscript: (t: string) => void;
}) {
  const voice = useVoice(lang);
  useEffect(() => {
    if (!voice.listening && voice.transcript) {
      onTranscript(voice.transcript);
      voice.reset();
    }
  }, [voice.listening, voice.transcript]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!voice.supported) return null;
  return (
    <button
      type="button"
      onClick={voice.listening ? voice.stop : voice.start}
      aria-label="आवाज़ से भरें"
      className={cn(
        "absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-secondary text-secondary-foreground shadow-md active:scale-95",
        voice.listening && "pulse-mic",
      )}
    >
      {voice.listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
    </button>
  );
}

export function JobEntrySheet({ open, onOpenChange, editEntryId }: Props) {
  const { state, addEntry, updateEntry, findOrCreateFarmer, upsertFarmer } = useStore();
  const voice = useVoice(state.settings.voiceLang);

  const editing = useMemo<Entry | undefined>(
    () => (editEntryId ? state.entries.find((e) => e.id === editEntryId) : undefined),
    [editEntryId, state.entries],
  );

  const [toolId, setToolId] = useState<string>("");
  const [farmerQuery, setFarmerQuery] = useState("");
  const [farmerId, setFarmerId] = useState<string>("");
  const [landowner, setLandowner] = useState("");
  const [qty, setQty] = useState<string>("");
  const [multiplier, setMultiplier] = useState<Multiplier>("single");
  const [rate, setRate] = useState<string>("");
  const [cashReceived, setCashReceived] = useState<string>("");
  const [date, setDate] = useState<Date>(new Date());
  const [highlights, setHighlights] = useState<Set<string>>(new Set());

  const tool = state.tools.find((t) => t.id === toolId);
  const farmer = state.farmers.find((f) => f.id === farmerId);

  // Prefill in edit mode / reset on open
  useEffect(() => {
    if (!open) return;
    if (editing) {
      const f = state.farmers.find((x) => x.id === editing.farmerId);
      setToolId(editing.toolId);
      setFarmerId(editing.farmerId);
      setFarmerQuery(f?.name ?? "");
      setLandowner(editing.landowner ?? "");
      setQty(String(editing.qty));
      setMultiplier(editing.multiplier);
      setRate(String(editing.rate));
      setCashReceived(editing.cashReceived ? String(editing.cashReceived) : "");
      setDate(new Date(editing.date));
    } else {
      setToolId("");
      setFarmerQuery("");
      setFarmerId("");
      setLandowner("");
      setQty("");
      setMultiplier("single");
      setRate("");
      setCashReceived("");
      setDate(new Date());
    }
    setHighlights(new Set());
    voice.reset();
  }, [open, editEntryId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tool && !rate) setRate(String(tool.defaultRate));
  }, [tool]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (farmer && !landowner && farmer.landownerMemory) {
      setLandowner(farmer.landownerMemory);
    }
  }, [farmerId]); // eslint-disable-line react-hooks/exhaustive-deps

  const total = useMemo(() => {
    const q = parseFloat(qty) || 0;
    const r = parseFloat(rate) || 0;
    return Math.round(q * r * multiplierFactor(multiplier));
  }, [qty, rate, multiplier]);

  const cash = parseFloat(cashReceived) || 0;
  const udhar = Math.max(0, total - cash);

  const farmerSuggestions = useMemo(() => {
    const q = farmerQuery.trim();
    if (!q) return [];
    return fuzzyMatch(state.farmers, q, 5);
  }, [farmerQuery, state.farmers]);

  const exactMatch = farmerSuggestions.some(
    (f) => f.name.toLowerCase() === farmerQuery.trim().toLowerCase(),
  );

  // Landowner autocomplete
  const landownerPool = useMemo(() => {
    const fromFarmer = farmerId ? allLandowners(state, farmerId) : [];
    const others = allLandowners(state).filter((x) => !fromFarmer.includes(x));
    return [...fromFarmer, ...others];
  }, [state, farmerId]);
  const landownerSuggestions = useMemo(() => {
    const q = landowner.trim().toLowerCase();
    if (!q) return [];
    return landownerPool
      .filter((n) => n.toLowerCase().includes(q) && n.toLowerCase() !== q)
      .slice(0, 5);
  }, [landowner, landownerPool]);

  function applyVoice() {
    const parsed = parseVoice(voice.transcript, state);
    const hl = new Set<string>();
    if (parsed.toolId) {
      setToolId(parsed.toolId);
      hl.add("tool");
      const t = state.tools.find((x) => x.id === parsed.toolId);
      if (t) setRate(String(t.defaultRate));
    }
    if (parsed.multiplier) {
      setMultiplier(parsed.multiplier);
      hl.add("mult");
    }
    if (parsed.qty != null) {
      setQty(String(parsed.qty));
      hl.add("qty");
    }
    if (parsed.cashReceived != null) {
      setCashReceived(String(parsed.cashReceived));
      hl.add("cash");
    }
    if (parsed.landowner) {
      setLandowner(parsed.landowner);
      hl.add("landowner");
    }
    if (parsed.farmerId) {
      const f = state.farmers.find((x) => x.id === parsed.farmerId);
      if (f) {
        setFarmerId(f.id);
        setFarmerQuery(f.name);
        hl.add("farmer");
      }
    } else if (parsed.farmerName) {
      // Surface in input + open suggestions; don't auto-create.
      setFarmerQuery(parsed.farmerName);
      setFarmerId("");
      hl.add("farmer");
    }
    setHighlights(hl);
    toast.success("आवाज़ से भरा गया — कृपया जाँचें");
  }

  function pickFarmer(id: string, name: string) {
    setFarmerId(id);
    setFarmerQuery(name);
  }

  function createNewFarmer() {
    const name = farmerQuery.trim();
    if (!name) return;
    const f = findOrCreateFarmer(name);
    setFarmerId(f.id);
    setFarmerQuery(f.name);
    toast.success(`नया किसान जोड़ा: ${f.name}`);
  }

  function save() {
    if (!toolId) return toast.error("कृपया औजार चुनें");
    const name = farmerQuery.trim();
    if (!name) return toast.error("किसान का नाम लिखें");
    if (!qty || parseFloat(qty) <= 0) return toast.error("माप दर्ज करें");
    if (!rate || parseFloat(rate) <= 0) return toast.error("रेट दर्ज करें");

    let fId = farmerId;
    if (!fId) {
      const f = findOrCreateFarmer(name);
      fId = f.id;
    }
    if (landowner.trim()) {
      const existing = state.farmers.find((f) => f.id === fId) ?? { id: fId, name };
      upsertFarmer({ ...existing, landownerMemory: landowner.trim() });
    }

    const payload = {
      date: date.toISOString(),
      farmerId: fId,
      toolId,
      qty: parseFloat(qty),
      unit: tool!.unit,
      multiplier,
      rate: parseFloat(rate),
      total,
      cashReceived: cash,
      udharAdded: udhar,
      landowner: landowner.trim() || undefined,
    };

    if (editing) {
      updateEntry(editing.id, payload);
      toast.success("एंट्री अपडेट हो गयी ✓");
    } else {
      addEntry(payload);
      toast.success("एंट्री सेव हो गयी ✓");

      // Auto-SMS Check
      if (state.settings.autoSmsOnSave) {
        const farmer = state.farmers.find((f) => f.id === fId);
        if (farmer && farmer.phone) {
          const tPending = pendingForFarmer(state, fId);
          const toolObj = state.tools.find((t) => t.id === toolId);
          const toolName = toolObj ? toolObj.nameHi : "काम";
          const merchantName = state.settings.merchantName || state.settings.userName || "ट्रैक्टर हिसाब";
          const userAlias = state.settings.userAlias || "";
          const upiVpa = state.settings.upiVpa || "";

          // Run asynchronously in background
          sendJobSMS(
            farmer.name,
            farmer.phone,
            toolName,
            payload.qty,
            payload.unit,
            payload.total,
            payload.cashReceived,
            payload.udharAdded,
            tPending,
            upiVpa,
            merchantName,
            userAlias
          );
        }
      }
    }
    onOpenChange(false);
  }

  const hl = (k: string) => (highlights.has(k) ? "ring-4 ring-warning/60 bg-warning/10" : "");

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) voice.stop();
        onOpenChange(v);
      }}
    >
      <SheetContent side="bottom" className="h-[95vh] overflow-y-auto rounded-t-3xl p-0">
        <SheetHeader className="sticky top-0 z-10 border-b-2 border-border bg-primary px-4 py-4 text-primary-foreground">
          <SheetTitle className="font-hindi text-2xl font-black text-primary-foreground">
            {editing ? "एंट्री एडिट करें" : "नया काम दर्ज करें"}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 px-4 py-5">
          {/* Voice */}
          <div className="rounded-3xl border-2 border-border bg-card p-4 text-center">
            <button
              onClick={voice.listening ? voice.stop : voice.start}
              disabled={!voice.supported}
              className={cn(
                "mx-auto grid h-24 w-24 place-items-center rounded-full bg-secondary text-secondary-foreground shadow-xl shadow-secondary/40 active:scale-95",
                voice.listening && "pulse-mic",
              )}
            >
              {voice.listening ? <MicOff className="h-12 w-12" /> : <Mic className="h-12 w-12" />}
            </button>
            <p className="font-hindi mt-3 text-base font-bold">
              {voice.supported
                ? voice.listening
                  ? "सुन रहा हूँ… बोलिए"
                  : "बोलकर भरें"
                : "इस ब्राउज़र में आवाज़ उपलब्ध नहीं"}
            </p>
            {voice.transcript && (
              <div className="mt-3 rounded-xl bg-accent p-3 text-left">
                <p className="font-hindi text-sm text-foreground">{voice.transcript}</p>
                <Button onClick={applyVoice} className="mt-2 w-full font-hindi" size="lg">
                  <Check className="h-5 w-5" /> इस्तेमाल करें
                </Button>
              </div>
            )}
          </div>

          {/* Tool */}
          <Section title="औजार">
            <div className={cn("grid grid-cols-2 gap-2 rounded-2xl p-1", hl("tool"))}>
              {state.tools.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setToolId(t.id);
                    setRate(String(t.defaultRate));
                  }}
                  className={cn(
                    "flex min-h-20 flex-col items-center justify-center gap-1 rounded-2xl border-2 p-3 active:scale-95",
                    toolId === t.id ? "border-primary bg-primary/10" : "border-border bg-card",
                  )}
                >
                  <span className="text-3xl">{t.icon}</span>
                  <span className="font-hindi text-sm font-bold">{t.nameHi}</span>
                </button>
              ))}
            </div>
          </Section>

          {/* Farmer */}
          <Section title="किसान का नाम">
            <div className="relative">
              <Input
                value={farmerQuery}
                onChange={(e) => {
                  setFarmerQuery(e.target.value);
                  setFarmerId("");
                }}
                placeholder="नाम लिखें या बोलें…"
                className={cn("h-14 pr-14 text-lg font-hindi", hl("farmer"))}
              />
              <InlineMic
                lang={state.settings.voiceLang}
                onTranscript={(t) => {
                  setFarmerQuery(t);
                  setFarmerId("");
                }}
              />
            </div>
            {farmerQuery.trim() && !farmerId && (
              <div className="mt-2 grid gap-1">
                {farmerSuggestions.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => pickFarmer(f.id, f.name)}
                    className="font-hindi w-full rounded-xl border-2 border-border bg-card px-3 py-2 text-left text-base active:bg-accent"
                  >
                    {f.name}
                  </button>
                ))}
                {!exactMatch && (
                  <button
                    onClick={createNewFarmer}
                    className="font-hindi flex w-full items-center gap-2 rounded-xl border-2 border-dashed border-primary bg-primary/5 px-3 py-2 text-left text-base font-bold text-primary active:bg-primary/10"
                  >
                    <UserPlus className="h-5 w-5" /> + नया किसान जोड़ें: "{farmerQuery.trim()}"
                  </button>
                )}
              </div>
            )}
          </Section>

          {/* Landowner */}
          <Section title="सझियारी / खेत मालिक (वैकल्पिक)">
            <div className="-mx-1 mb-2 flex gap-2 overflow-x-auto px-1">
              <button
                onClick={() => setLandowner("")}
                className={cn(
                  "shrink-0 rounded-full border-2 px-3 py-1.5 font-hindi text-xs font-bold",
                  !landowner
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card",
                )}
              >
                अपना खेत
              </button>
              {landownerPool.slice(0, 4).map((n) => (
                <button
                  key={n}
                  onClick={() => setLandowner(n)}
                  className={cn(
                    "shrink-0 rounded-full border-2 px-3 py-1.5 font-hindi text-xs font-bold",
                    landowner === n
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="relative">
              <Input
                value={landowner}
                onChange={(e) => setLandowner(e.target.value)}
                placeholder="मालिक का नाम या बोलें…"
                className={cn("h-14 pr-14 text-lg font-hindi", hl("landowner"))}
              />
              <InlineMic lang={state.settings.voiceLang} onTranscript={setLandowner} />
            </div>
            {landownerSuggestions.length > 0 && (
              <ul className="mt-2 grid gap-1">
                {landownerSuggestions.map((n) => (
                  <li key={n}>
                    <button
                      onClick={() => setLandowner(n)}
                      className="font-hindi w-full rounded-xl border-2 border-border bg-card px-3 py-2 text-left text-base active:bg-accent"
                    >
                      {n}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* Qty + multiplier */}
          <Section title={`माप (${tool?.unit ?? "बीघा / घंटे / क्विंटल / फेरा"})`}>
            <Input
              type="number"
              inputMode="decimal"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              placeholder="0"
              className={cn("h-16 text-2xl font-black", hl("qty"))}
            />
            <div className={cn("mt-3 grid grid-cols-3 gap-2 rounded-2xl p-1", hl("mult"))}>
              {(["single", "double", "triple"] as Multiplier[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMultiplier(m)}
                  className={cn(
                    "min-h-14 rounded-2xl border-2 px-2 py-2 font-hindi text-sm font-bold active:scale-95",
                    multiplier === m
                      ? "border-secondary bg-secondary text-secondary-foreground"
                      : "border-border bg-card",
                  )}
                >
                  {multiplierLabel(m)}
                  <span className="ml-1 opacity-70">×{multiplierFactor(m)}</span>
                </button>
              ))}
            </div>
          </Section>

          {/* Rate */}
          <Section title="रेट (प्रति इकाई)">
            <Input
              type="number"
              inputMode="decimal"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="0"
              className="h-16 text-2xl font-black"
            />
            <p className="font-hindi mt-2 text-xs text-muted-foreground">
              डिफ़ॉल्ट रेट सेटिंग्स से, छूट के लिए बदलें।
            </p>
          </Section>

          {/* Total + payment */}
          <div className="rounded-3xl border-2 border-primary bg-primary/5 p-4">
            <div className="flex items-baseline justify-between">
              <span className="font-hindi text-base font-bold">कुल</span>
              <span className="text-4xl font-black text-primary">{fmtINR(total)}</span>
            </div>
            <Label className="font-hindi mt-4 block text-base">नकद मिला</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={cashReceived}
              onChange={(e) => setCashReceived(e.target.value)}
              placeholder="0"
              className={cn("mt-1 h-14 text-xl font-bold", hl("cash"))}
            />
            <div className="mt-3 flex items-center justify-between rounded-xl bg-destructive/10 px-3 py-2">
              <span className="font-hindi text-sm font-bold text-destructive">उधार बाकी</span>
              <span className="text-xl font-black text-destructive">{fmtINR(udhar)}</span>
            </div>
          </div>

          {/* Date */}
          <Section title="तारीख">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="font-hindi h-14 w-full justify-start text-base"
                >
                  <CalIcon className="h-5 w-5" /> {fmtDate(date.toISOString())}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </Section>

          <Button onClick={save} size="lg" className="h-16 w-full text-xl font-black font-hindi">
            <Check className="h-7 w-7" /> {editing ? "अपडेट करें" : "सेव करें"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="font-hindi mb-2 block text-base font-bold">{title}</Label>
      {children}
    </div>
  );
}
