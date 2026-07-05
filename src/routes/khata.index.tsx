import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, MoreVertical, Pencil, Trash2, UserPlus } from "lucide-react";
import { useStore, pendingForFarmer } from "@/lib/store";
import { AppShell } from "@/components/AppShell";
import { fmtINR } from "@/lib/format";
import { useMemo, useState } from "react";
import { MicSearchInput } from "@/components/MicSearchInput";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FarmerEditDialog } from "@/components/FarmerEditDialog";
import type { Farmer } from "@/lib/types";
import { toast } from "sonner";

export const Route = createFileRoute("/khata/")({
  head: () => ({ meta: [{ title: "ग्राहक खाता — Khata" }] }),
  component: KhataList,
});

function KhataList() {
  const { state, deleteFarmer } = useStore();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [editFarmer, setEditFarmer] = useState<Farmer | null>(null);

  const rows = useMemo(() => {
    return state.farmers
      .map((f) => ({ farmer: f, pending: pendingForFarmer(state, f.id) }))
      .filter((r) => r.farmer.name.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => b.pending - a.pending || a.farmer.name.localeCompare(b.farmer.name));
  }, [state, q]);

  return (
    <AppShell title="ग्राहक खाता" subtitle="Khata Ledger">
      <MicSearchInput placeholder="किसान खोजें…" value={q} onChange={setQ} />
      <ul className="mt-4 grid gap-2">
        {rows.map(({ farmer, pending }) => (
          <li key={farmer.id} className="flex items-stretch gap-2">
            <button
              onClick={() => navigate({ to: "/khata/$farmerId", params: { farmerId: farmer.id } })}
              className="flex flex-1 items-center gap-3 rounded-2xl border-2 border-border bg-card p-4 text-left shadow-sm active:scale-[0.98]"
            >
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent text-xl font-black text-foreground">
                {farmer.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-hindi truncate text-lg font-bold">{farmer.name}</div>
                {farmer.phone && (
                  <div className="truncate text-xs text-muted-foreground">{farmer.phone}</div>
                )}
              </div>
              <div className="shrink-0 text-right">
                <div
                  className={`text-lg font-black ${pending > 0 ? "text-destructive" : "text-success"}`}
                >
                  {fmtINR(pending)}
                </div>
                <div className="font-hindi text-xs text-muted-foreground">
                  {pending > 0 ? "बाकी" : "चुकता"}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="grid w-10 shrink-0 place-items-center rounded-2xl border-2 border-border bg-card text-muted-foreground active:bg-accent">
                  <MoreVertical className="h-5 w-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="font-hindi" onClick={() => setEditFarmer(farmer)}>
                  <Pencil className="mr-2 h-4 w-4" /> एडिट करें
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="font-hindi text-destructive focus:text-destructive"
                  onClick={() => {
                    if (confirm(`${farmer.name} और सारी एंट्रीज़ मिटाएँ?`)) {
                      deleteFarmer(farmer.id);
                      toast.success("मिट गया");
                    }
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> मिटाएँ
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="rounded-2xl border-2 border-dashed border-border bg-card p-8 text-center">
            <UserPlus className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="font-hindi mt-2 text-base text-muted-foreground">कोई किसान नहीं मिला।</p>
            <p className="font-hindi mt-1 text-sm text-muted-foreground">
              नया काम जोड़ने पर किसान अपने आप जुड़ेंगे।
            </p>
          </li>
        )}
      </ul>

      <FarmerEditDialog
        open={!!editFarmer}
        onOpenChange={(v) => !v && setEditFarmer(null)}
        farmer={editFarmer}
      />
      {/* keep Link import used */}
      <Link to="/khata" className="hidden" />
    </AppShell>
  );
}
