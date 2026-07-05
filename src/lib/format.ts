export function fmtINR(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export function todayISO(): string {
  return new Date().toISOString();
}

export function isSameDay(a: string, b: string): boolean {
  const d1 = new Date(a),
    d2 = new Date(b);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function isSameMonth(a: string, b: string): boolean {
  const d1 = new Date(a),
    d2 = new Date(b);
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
}

/** Monday-start week. Compares whether two ISO dates fall in the same ISO week. */
export function isSameWeek(a: string, b: string): boolean {
  const start = (d: Date) => {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = (x.getDay() + 6) % 7; // 0 = Monday
    x.setDate(x.getDate() - day);
    x.setHours(0, 0, 0, 0);
    return x.getTime();
  };
  return start(new Date(a)) === start(new Date(b));
}

/** Returns a stable day-bucket key like "2026-06-29" using local time. */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const HI_MONTHS = [
  "जनवरी",
  "फ़रवरी",
  "मार्च",
  "अप्रैल",
  "मई",
  "जून",
  "जुलाई",
  "अगस्त",
  "सितंबर",
  "अक्तूबर",
  "नवंबर",
  "दिसंबर",
];

export function fmtDayHeading(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date();
  y.setDate(y.getDate() - 1);
  if (isSameDay(iso, today.toISOString())) return "आज";
  if (isSameDay(iso, y.toISOString())) return "कल";
  return `${d.getDate()} ${HI_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function fmtMonthHeading(iso: string): string {
  const d = new Date(iso);
  return `${HI_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function buildUpiLink(vpa: string, name: string, amount: number, farmerName: string): string {
  const pa = encodeURIComponent(vpa || "your@upi");
  const pn = encodeURIComponent(name || "Khetbook");
  const am = amount.toFixed(2);
  const tn = encodeURIComponent(`Khetbook_${farmerName.replace(/\s+/g, "_")}`);
  return `upi://pay?pa=${pa}&pn=${pn}&am=${am}&tn=${tn}&cu=INR`;
}
