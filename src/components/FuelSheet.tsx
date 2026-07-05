import { useEffect, useMemo, useRef, useState } from "react";
import { Fuel, Check, Cloud, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";
import { fmtINR } from "@/lib/format";
import { toast } from "sonner";
import { getDieselPrice } from "@/lib/getDieselPrice.functions";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const STATES = [
  { code: "UP", name: "Uttar Pradesh" },
  { code: "MP", name: "Madhya Pradesh" },
  { code: "BR", name: "Bihar" },
  { code: "RJ", name: "Rajasthan" },
  { code: "PB", name: "Punjab" },
  { code: "HR", name: "Haryana" },
  { code: "MH", name: "Maharashtra" },
  { code: "GJ", name: "Gujarat" },
  { code: "KA", name: "Karnataka" },
  { code: "TN", name: "Tamil Nadu" },
  { code: "WB", name: "West Bengal" },
  { code: "AP", name: "Andhra Pradesh" },
  { code: "TS", name: "Telangana" },
  { code: "DL", name: "Delhi" },
];

const QUICK_AMOUNTS = [200, 500, 1000, 2000];

type LastEdited = "litres" | "price" | "total" | null;

export function FuelSheet({ open, onOpenChange }: Props) {
  const { state, addFuel, updateSettings } = useStore();
  const fetchPrice = getDieselPrice;
  const lastFuel = state.fuel[0];
  const lastPrice = state.settings.lastDieselPrice ?? lastFuel?.pricePerLitre ?? 95;

  const [litres, setLitres] = useState("");
  const [price, setPrice] = useState(String(lastPrice));
  const [total, setTotal] = useState("");
  const [pump, setPump] = useState("");
  const [fetching, setFetching] = useState(false);
  const lastEdited = useRef<LastEdited>(null);

  useEffect(() => {
    if (open) {
      setLitres("");
      setTotal("");
      setPrice(String(state.settings.lastDieselPrice ?? lastFuel?.pricePerLitre ?? 95));
      setPump(lastFuel?.pumpName ?? "");
      lastEdited.current = null;
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Bidirectional sync — derive the third field from the other two.
  useEffect(() => {
    const l = parseFloat(litres);
    const p = parseFloat(price);
    const t = parseFloat(total);
    if (lastEdited.current === "litres" && l > 0 && p > 0) {
      setTotal(String(Math.round(l * p)));
    } else if (lastEdited.current === "total" && t > 0 && p > 0) {
      setLitres((t / p).toFixed(2));
    } else if (lastEdited.current === "price" && p > 0) {
      if (t > 0 && !litres) setLitres((t / p).toFixed(2));
      else if (l > 0) setTotal(String(Math.round(l * p)));
    }
  }, [litres, price, total]); // eslint-disable-line react-hooks/exhaustive-deps

  const computedTotal = useMemo(() => {
    const t = parseFloat(total);
    if (t > 0) return Math.round(t);
    const l = parseFloat(litres) || 0;
    const p = parseFloat(price) || 0;
    return Math.round(l * p);
  }, [litres, price, total]);

  async function fetchTodayPrice() {
    setFetching(true);
    try {
      const result = await fetchPrice({ data: { state: state.settings.dieselState ?? "UP" } });
      if (result?.price) {
        lastEdited.current = "price";
        setPrice(result.price.toFixed(2));
        toast.success(`आज का भाव: ₹${result.price.toFixed(2)}/L`);
      } else {
        toast.message("ऑनलाइन भाव नहीं मिला", { description: "पंप पर देखकर हाथ से भरें।" });
      }
    } catch {
      toast.message("इंटरनेट नहीं — हाथ से भरें");
    } finally {
      setFetching(false);
    }
  }

  function applyQuick(amount: number) {
    lastEdited.current = "total";
    setTotal(String(amount));
  }

  function save() {
    const l = parseFloat(litres);
    const p = parseFloat(price);
    const t = computedTotal;
    if (!l || l <= 0) return toast.error("लीटर दर्ज करें");
    if (!p || p <= 0) return toast.error("₹/लीटर दर्ज करें");
    if (!t || t <= 0) return toast.error("कुल रकम सही नहीं");
    addFuel({
      date: new Date().toISOString(),
      amount: t,
      litres: l,
      pricePerLitre: p,
      pumpName: pump.trim() || undefined,
    });
    updateSettings({ lastDieselPrice: p });
    toast.success("डीजल जुड़ गया ✓");
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[95vh] overflow-y-auto rounded-t-3xl p-0">
        <SheetHeader className="sticky top-0 z-10 border-b-2 border-border bg-secondary px-4 py-4 text-secondary-foreground">
          <SheetTitle className="font-hindi flex items-center gap-2 text-2xl font-black text-secondary-foreground">
            <Fuel className="h-7 w-7" /> डीजल भरें
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5 px-4 py-5 pb-8">
          <div className="flex gap-2">
            <select
              value={state.settings.dieselState ?? "UP"}
              onChange={(e) => updateSettings({ dieselState: e.target.value })}
              className="font-hindi h-12 flex-1 rounded-xl border-2 border-border bg-card px-3 text-base"
            >
              {STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.code} · {s.name}
                </option>
              ))}
            </select>
            <Button
              onClick={fetchTodayPrice}
              disabled={fetching}
              variant="outline"
              className="font-hindi h-12 px-3"
            >
              <Cloud className="h-5 w-5" /> {fetching ? "…" : "आज का भाव"}
            </Button>
          </div>

          {/* Quick amount chips */}
          <div>
            <Label className="font-hindi text-sm font-bold text-muted-foreground">
              अक्सर वाला ₹
            </Label>
            <div className="mt-1 grid grid-cols-4 gap-2">
              {QUICK_AMOUNTS.map((a) => (
                <button
                  key={a}
                  onClick={() => applyQuick(a)}
                  className="rounded-2xl border-2 border-secondary/40 bg-secondary/10 px-2 py-3 text-base font-black text-secondary active:scale-95"
                >
                  ₹{a}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="font-hindi text-base font-bold">लीटर</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={litres}
                onChange={(e) => {
                  lastEdited.current = "litres";
                  setLitres(e.target.value);
                }}
                placeholder="0"
                className="h-16 text-2xl font-black"
              />
            </div>
            <div>
              <Label className="font-hindi text-base font-bold">₹ / लीटर</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={price}
                onChange={(e) => {
                  lastEdited.current = "price";
                  setPrice(e.target.value);
                }}
                placeholder="0"
                className="h-16 text-2xl font-black"
              />
            </div>
          </div>

          <div>
            <Label className="font-hindi text-base font-bold">कुल ₹ (Total)</Label>
            <Input
              type="number"
              inputMode="decimal"
              value={total}
              onChange={(e) => {
                lastEdited.current = "total";
                setTotal(e.target.value);
              }}
              placeholder="0"
              className="h-20 text-4xl font-black text-secondary"
            />
            <p className="font-hindi mt-1 text-xs text-muted-foreground">
              कोई भी दो भरें — तीसरा अपने आप गिनें। गणना: <b>{fmtINR(computedTotal)}</b>
            </p>
          </div>

          <div>
            <Label className="font-hindi text-base font-bold">पंप का नाम (वैकल्पिक)</Label>
            <Input
              value={pump}
              onChange={(e) => setPump(e.target.value)}
              placeholder="IOCL / BPCL …"
              className="h-12 text-base font-hindi"
            />
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-2">
            <Button onClick={save} size="lg" className="h-14 font-hindi text-lg font-black">
              <Check className="h-6 w-6" /> सेव करें
            </Button>
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              size="lg"
              className="h-14 px-4"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
