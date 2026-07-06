import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ArrowLeft, Tractor, NotebookPen, UserRound, Heart, Languages, DatabaseBackup } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readLocalBackup, deleteLocalBackup } from "@/lib/backup";
import { toast } from "sonner";
import type { AppState } from "@/lib/types";

type Lang = "hi" | "en";

interface Slide {
  Icon: React.ComponentType<{ className?: string }>;
  // layered gradient backdrop
  bg: string;
  // soft accent blob colors
  blobA: string;
  blobB: string;
  iconRing: string;
  headingHi: string;
  headingEn: string;
  bodyHi: string;
  bodyEn: string;
}

const SLIDES: Slide[] = [
  {
    Icon: NotebookPen,
    bg: "bg-gradient-to-br from-[#0b0f14] via-[#11161d] to-[#1b1208]",
    blobA: "bg-[#c2410c]/40",
    blobB: "bg-[#7c2d12]/30",
    iconRing: "from-[#f97316] to-[#b91c1c]",
    headingHi: "कागज़ की डायरी और बड़ा नुकसान",
    headingEn: "The Danger of Paper Records",
    bodyHi:
      "एक रिसर्च के अनुसार, कागज़ फटने या खोने से 80% से अधिक ऑपरेटरों का हिसाब मिट जाता है, जिससे हर साल हज़ारों का नुकसान होता है।\nकॉपियों में पुराना हिसाब ढूंढना और जोड़ना बेहद सिरदर्द का काम है।",
    bodyEn:
      "Research shows over 80% of tractor operators lose track of calculations due to torn or misplaced paper diaries, causing heavy financial losses.\nFlipping through paper pages to total old balances is a tedious daily headache.",
  },
  {
    Icon: Tractor,
    bg: "bg-gradient-to-br from-[#052e1a] via-[#0d5f37] to-[#1f8a4c]",
    blobA: "bg-[#f59e0b]/35",
    blobB: "bg-[#10b981]/30",
    iconRing: "from-[#fbbf24] to-[#f97316]",
    headingHi: "Khetbook: सच्चा और सुरक्षित साथी",
    headingEn: "Khetbook: Secure & Offline",
    bodyHi:
      "यह ऐप 100% ऑफलाइन है—आपका डेटा सिर्फ आपके फोन में रहेगा, इंटरनेट पर नहीं। इसलिए धोखाधड़ी का कोई खतरा नहीं है।\nबिना इंटरनेट के गहरे खेतों में भी जुताई, हेर्रो और थ्रेशर का सारा हिसाब-किताब सेकंडों में जोड़ेगा।",
    bodyEn:
      "This app is 100% offline—your data stays strictly on your phone, never on any cloud. Zero risk of online fraud.\nWorks deep inside fields without internet to compute Jutai, Herro, and Thresher calculations instantly.",
  },
  {
    Icon: UserRound,
    bg: "bg-gradient-to-br from-[#0a1f2c] via-[#0f3a4a] to-[#137a4e]",
    blobA: "bg-[#22d3ee]/30",
    blobB: "bg-[#34d399]/30",
    iconRing: "from-[#67e8f9] to-[#34d399]",
    headingHi: "अपने डेवलपर के बारे में जानें",
    headingEn: "About Your Developer",
    bodyHi:
      "नमस्ते, मैं Krish Tiwari हूँ। यह ऐप मैंने विशेष रूप से अपने ट्रैक्टर चालक भाइयों के हक और सम्मान की रक्षा के लिए बनाई है।\nयह ऐप हमेशा पूरी तरह से मुफ़्त, विज्ञापन-मुक्त और सुरक्षित रहेगी। यह मेरा आपसे वादा है।",
    bodyEn:
      "Hello, I am Krish Tiwari. I created this app specifically to protect the hard work and dignity of our tractor operators.\nKhetbook is and will always remain 100% free, private, and ad-free. That is my promise to you.",
  },
];

export function OnboardingStory() {
  const { state, updateSettings, replaceAll, ready } = useStore();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [userAlias, setUserAlias] = useState("");
  const [upiVpa, setUpiVpa] = useState("");
  const [show, setShow] = useState(false);
  const [lang, setLang] = useState<Lang>("hi");
  const [detectedBackup, setDetectedBackup] = useState<AppState | null>(null);
  const [checkingBackup, setCheckingBackup] = useState(true);
  const touchStartX = useRef<number | null>(null);

  // Check for local backup on startup
  useEffect(() => {
    async function checkBackup() {
      if (ready && !state.settings.onboardedAt) {
        try {
          const backup = await readLocalBackup();
          if (backup) {
            setDetectedBackup(backup);
          }
        } catch (err) {
          console.error("Error checking local backup file:", err);
        }
      }
      setCheckingBackup(false);
    }
    checkBackup();
  }, [ready, state.settings.onboardedAt]);

  // Show onboarding when ready and checked
  useEffect(() => {
    if (ready && !state.settings.onboardedAt && !checkingBackup) {
      setShow(true);
    }
  }, [ready, state.settings.onboardedAt, checkingBackup]);

  const total = SLIDES.length + 1; // + form
  const isForm = step >= SLIDES.length;
  const slide = !isForm ? SLIDES[step] : null;

  // Re-key animation children on slide change
  const slideKey = useMemo(() => `s-${step}`, [step]);

  if (!show || checkingBackup) return null;

  function next() {
    setStep((s) => Math.min(s + 1, total - 1));
  }
  function prev() {
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleRestore() {
    if (!detectedBackup) return;
    replaceAll(detectedBackup);
    toast.success(lang === "hi" ? "बहीखाता सफलतापूर्वक रीस्टोर किया गया ✓" : "Ledger restored successfully ✓");
    setShow(false);
  }

  async function handleStartFresh() {
    try {
      await deleteLocalBackup();
    } catch (err) {
      console.error("Failed to delete backup file:", err);
    }
    setDetectedBackup(null);
    toast.info(lang === "hi" ? "नया हिसाब शुरू किया गया" : "Starting a fresh ledger");
  }

  function finish() {
    updateSettings({
      userName: name.trim() || undefined,
      userPhone: phone.trim() || undefined,
      userAlias: userAlias.trim() || undefined,
      upiVpa: upiVpa.trim() || undefined,
      merchantName: name.trim() || undefined, // Default merchant name to operator name
      onboardedAt: new Date().toISOString(),
    });
    setShow(false);
  }

  const t = (hi: string, en: string) => (lang === "hi" ? hi : en);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 50) return;
    if (dx < 0) next();
    else prev();
  }

  // Backup restore screen takes priority if detected
  if (detectedBackup) {
    const backupName = detectedBackup.settings?.userName || t("अज्ञात", "Unknown");
    const farmerCount = detectedBackup.farmers?.length || 0;
    const entryCount = detectedBackup.entries?.length || 0;

    return (
      <div className="fixed inset-0 z-[100] flex items-stretch justify-center bg-black/70 backdrop-blur-sm">
        <div className="relative flex w-full max-w-md flex-col overflow-hidden bg-background">
          <div className="relative flex flex-1 flex-col bg-gradient-to-br from-[#0b132b] via-[#1c2541] to-[#3a506b] text-white px-8 pb-12 pt-20 text-center">
            {/* Ambient blobs */}
            <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-[#3a506b]/40 blur-3xl" />
            <div className="pointer-events-none absolute -right-20 bottom-20 h-80 w-80 rounded-full bg-[#1c2541]/30 blur-3xl" />
            
            {/* Lang toggle */}
            <div className="absolute right-5 top-5 z-20">
              <button
                onClick={() => setLang(lang === "hi" ? "en" : "hi")}
                className="flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-bold text-white backdrop-blur transition-colors"
              >
                <Languages className="h-3.5 w-3.5" />
                {lang === "hi" ? "हिं · EN" : "EN · हिं"}
              </button>
            </div>

            <div className="relative z-10 flex flex-1 flex-col items-center justify-center">
              <div className="mb-8">
                <div className="relative grid h-24 w-24 place-items-center rounded-[24px] bg-gradient-to-br from-primary to-accent shadow-2xl">
                  <DatabaseBackup className="h-12 w-12 text-white" />
                </div>
              </div>

              <h2 className={`${lang === "hi" ? "font-hindi" : ""} text-[28px] font-black leading-tight tracking-tight`}>
                {t("पुराना हिसाब मिला!", "Previous Ledger Found!")}
              </h2>
              <div className="my-4 h-[3px] w-12 rounded-full bg-white/70" />
              
              <div className="w-full max-w-xs rounded-2xl bg-white/10 p-5 backdrop-blur-sm border border-white/10 text-left space-y-3 mt-4">
                <div className="flex justify-between border-b border-white/10 pb-2">
                  <span className="text-white/60 text-sm">{t("ऑपरेटर:", "Operator:")}</span>
                  <span className="font-bold text-white">{backupName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60 text-sm">{t("कुल किसान:", "Total Farmers:")}</span>
                  <span className="font-bold text-white">{farmerCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60 text-sm">{t("कुल एंट्रियां:", "Total Entries:")}</span>
                  <span className="font-bold text-white">{entryCount}</span>
                </div>
              </div>

              <p className={`${lang === "hi" ? "font-hindi" : ""} mt-6 text-sm text-white/80 max-w-xs leading-relaxed`}>
                {t(
                  "क्या आप अपना पुराना डेटा रीस्टोर करना चाहते हैं या नई शुरुआत करना चाहते हैं?",
                  "Would you like to restore your previous ledger data or start a completely fresh diary?"
                )}
              </p>
            </div>

            <div className="mt-auto space-y-3 z-10">
              <Button
                onClick={handleRestore}
                size="lg"
                className="w-full h-14 text-lg font-black bg-white text-[#1c2541] hover:bg-white/90 active:scale-98 transition-transform shadow-xl"
              >
                {t("हाँ, पुराना हिसाब रीस्टोर करें", "Yes, Restore Old Data")}
              </Button>
              <button
                onClick={handleStartFresh}
                className="w-full h-12 text-sm font-semibold text-white/70 hover:text-white transition-colors"
              >
                {t("नहीं, नई डायरी शुरू करें", "No, Start Fresh")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-stretch justify-center bg-black/70 backdrop-blur-sm">
      <div
        className="relative flex w-full max-w-md flex-col overflow-hidden bg-background"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Top bar: back button + dots + lang toggle */}
        <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-3 px-5 pt-5">
          {step > 0 && (
            <button
              onClick={prev}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
                isForm
                  ? "border-foreground/15 text-foreground/75 hover:bg-foreground/5"
                  : "border-white/25 text-white hover:bg-white/10"
              }`}
            >
              <ArrowLeft className="h-4.5 w-4.5" />
            </button>
          )}

          <div className="flex flex-1 items-center gap-1.5">
            {Array.from({ length: total }).map((_, i) => {
              const active = i === step;
              const done = i < step;
              return (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-500 ease-out ${
                    active ? "w-8 bg-white" : done ? "w-4 bg-white/70" : "w-4 bg-white/25"
                  } ${isForm ? "!bg-foreground/15 [&.bg-white]:!bg-foreground/80" : ""}`}
                  style={
                    isForm
                      ? {
                          background: active
                            ? "var(--color-foreground)"
                            : done
                              ? "color-mix(in oklab, var(--color-foreground) 60%, transparent)"
                              : "color-mix(in oklab, var(--color-foreground) 15%, transparent)",
                        }
                      : undefined
                  }
                />
              );
            })}
          </div>

          <button
            onClick={() => setLang(lang === "hi" ? "en" : "hi")}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
              isForm
                ? "border border-foreground/15 text-foreground/70"
                : "border border-white/25 bg-white/10 text-white backdrop-blur"
            }`}
          >
            <Languages className="h-3.5 w-3.5" />
            {lang === "hi" ? "हिं · EN" : "EN · हिं"}
          </button>
        </div>

        {!isForm && slide ? (
          <div key={slideKey} className={`relative flex flex-1 flex-col text-white ${slide.bg}`}>
            {/* Ambient blobs */}
            <div
              className="pointer-events-none absolute -left-24 -top-20 h-72 w-72 rounded-full bg-[#c2410c]/40 blur-3xl story-float"
              style={{ backgroundColor: slide.blobA.split(" ")[0].replace("bg-[", "").replace("]", "") }}
            />
            <div
              className="pointer-events-none absolute -right-20 top-1/3 h-80 w-80 rounded-full bg-[#7c2d12]/30 blur-3xl story-float-slow"
              style={{ backgroundColor: slide.blobB.split(" ")[0].replace("bg-[", "").replace("]", "") }}
            />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_50%)]" />
            {/* Subtle grain */}
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
              }}
            />

            <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-8 pb-32 text-center">
              {/* Icon disc with gradient ring */}
              <div className="story-rise mb-10">
                <div
                  className={`relative grid h-28 w-28 place-items-center rounded-[28px] bg-gradient-to-br ${slide.iconRing} shadow-[0_18px_45px_-12px_rgba(0,0,0,0.45)]`}
                >
                  <div className="absolute inset-[3px] rounded-[25px] bg-black/25 backdrop-blur-sm" />
                  <slide.Icon className="relative h-12 w-12 text-white drop-shadow" />
                </div>
              </div>

              <h2
                className={`story-rise-1 ${lang === "hi" ? "font-hindi" : ""} max-w-sm text-[28px] font-black leading-[1.15] tracking-tight`}
              >
                {t(slide.headingHi, slide.headingEn)}
              </h2>
              <div className="story-rise-1 mt-4 h-[3px] w-12 rounded-full bg-white/70" />
              <p
                className={`story-rise-2 ${lang === "hi" ? "font-hindi" : ""} mt-5 max-w-sm whitespace-pre-line text-left text-[15px] leading-[1.7] text-white/95`}
              >
                {t(slide.bodyHi, slide.bodyEn)}
              </p>
            </div>

            {/* Bottom CTA bar */}
            <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-4 bg-gradient-to-t from-black/35 to-transparent px-6 pb-7 pt-6">
              {step > 0 ? (
                <button
                  onClick={prev}
                  className={`${lang === "hi" ? "font-hindi" : ""} flex items-center gap-1 text-sm font-semibold text-white/70 hover:text-white`}
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t("पीछे", "Back")}
                </button>
              ) : (
                <button
                  onClick={() => {
                    // skip to form
                    setStep(SLIDES.length);
                  }}
                  className={`${lang === "hi" ? "font-hindi" : ""} text-sm font-semibold text-white/70 hover:text-white`}
                >
                  {t("छोड़ें", "Skip")}
                </button>
              )}

              <button
                onClick={next}
                className="group flex items-center gap-3 rounded-full bg-white py-3.5 pl-6 pr-4 text-foreground shadow-2xl"
              >
                <span className={`${lang === "hi" ? "font-hindi" : ""} text-[15px] font-black`}>
                  {t("आगे", "Next")}
                </span>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-foreground text-background transition-transform group-active:scale-90">
                  <ArrowRight className="h-5 w-5" />
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div key="form" className="relative flex flex-1 flex-col bg-background px-6 pb-6 pt-20 overflow-y-auto">
            <div className="story-rise">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                <Tractor className="h-3.5 w-3.5" />
                Khetbook
              </div>
              <h2
                className={`${lang === "hi" ? "font-hindi" : ""} text-[26px] font-black leading-tight tracking-tight`}
              >
                {t("डायरी पर अपना प्रोफाइल सेट करें", "Set Up Your Profile")}
              </h2>
              <p
                className={`${lang === "hi" ? "font-hindi" : ""} mt-1 text-xs text-muted-foreground`}
              >
                {t("आगे इसे कभी भी सेटिंग्स में बदल सकते हैं।", "You can edit these details in Settings later.")}
              </p>
            </div>

            <div className="story-rise-1 mt-6 space-y-4">
              <div>
                <Label className={`${lang === "hi" ? "font-hindi" : ""} text-sm font-bold`}>
                  {t("आपका नाम", "Your Name")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("जैसे: राम सिंह", "e.g. Ram Singh")}
                  autoFocus
                  className={`${lang === "hi" ? "font-hindi" : ""} mt-1 h-12 text-lg font-bold`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className={`${lang === "hi" ? "font-hindi" : ""} text-sm font-bold`}>
                    {t("फ़ोन नंबर", "Phone Number")}
                  </Label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="98xxxxxxxx"
                    inputMode="tel"
                    className="mt-1 h-12 text-base font-bold"
                  />
                </div>
                <div>
                  <Label className={`${lang === "hi" ? "font-hindi" : ""} text-sm font-bold`}>
                    {t("उपनाम / फ़र्म", "Alias / Farm Name")}
                  </Label>
                  <Input
                    value={userAlias}
                    onChange={(e) => setUserAlias(e.target.value)}
                    placeholder={t("जैसे: शेरा ट्रैक्टर", "e.g. Shera Tractor")}
                    className={`${lang === "hi" ? "font-hindi" : ""} mt-1 h-12 text-base font-bold`}
                  />
                </div>
              </div>

              <div>
                <Label className={`${lang === "hi" ? "font-hindi" : ""} text-sm font-bold`}>
                  {t("UPI आईडी (भुगतान पाने के लिए)", "UPI ID (for receiving payments)")}
                </Label>
                <Input
                  value={upiVpa}
                  onChange={(e) => setUpiVpa(e.target.value)}
                  placeholder="name@upi"
                  className="mt-1 h-12 text-base font-bold"
                />
              </div>
            </div>

            <Button
              onClick={finish}
              size="lg"
              disabled={!name.trim()}
              className={`${lang === "hi" ? "font-hindi" : ""} story-rise-2 mt-6 h-14 w-full text-lg font-black shadow-xl`}
            >
              {t("हिसाब-किताब शुरू करें", "Start Digital Ledger")}
              <ArrowRight className="ml-1 h-5 w-5" />
            </Button>

            <div className="mt-auto pt-6 text-center">
              <p
                className={`${lang === "hi" ? "font-hindi" : ""} text-[10px] leading-relaxed text-muted-foreground`}
              >
                {lang === "hi" ? (
                  <>
                    सादर निर्माण — <span className="font-bold text-foreground">क्रिश तिवारी</span>
                    <br />
                    अपने पिता और देश के सभी परिश्रमी ट्रैक्टर चालकों के सम्मान में।
                  </>
                ) : (
                  <>
                    Developed with <Heart className="inline h-2.5 w-2.5 text-destructive" /> by{" "}
                    <span className="font-bold text-foreground">Krish Tiwari</span>
                    <br />
                    Dedicated to my revered father and the tireless tractor operators of our nation.
                  </>
                )}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
