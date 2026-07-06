import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { uid } from "@/lib/storage";
import type { Farmer } from "@/lib/types";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  farmer: Farmer | null;
}

export function FarmerEditDialog({ open, onOpenChange, farmer }: Props) {
  const { upsertFarmer } = useStore();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (farmer) {
      setName(farmer.name);
      setPhone(farmer.phone ?? "");
    } else {
      setName("");
      setPhone("");
    }
  }, [farmer, open]);

  function save() {
    if (!name.trim()) return toast.error("नाम लिखें");
    const targetFarmer = farmer || { id: uid(), name: name.trim() };
    upsertFarmer({ ...targetFarmer, name: name.trim(), phone: phone.trim() || undefined });
    toast.success(farmer ? "किसान अपडेट हो गया ✓" : "नया किसान जुड़ गया ✓");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-hindi text-xl font-black">
            {farmer ? "किसान एडिट करें" : "नया किसान जोड़ें"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label className="font-hindi">नाम</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="font-hindi h-12 text-base"
              autoFocus
            />
          </div>
          <div>
            <Label className="font-hindi">फ़ोन (वैकल्पिक)</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="98xxxxxxxx"
              inputMode="tel"
              className="h-12 text-base"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={save} className="font-hindi h-12 w-full text-base font-black">
            सेव करें
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
