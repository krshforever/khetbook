import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ArrowLeft, Tractor, NotebookPen, UserRound, Heart, Languages, DatabaseBackup, Mic, MessageSquare, Bell, CheckCircle2, XCircle } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { readLocalBackup, deleteLocalBackup, requestStoragePermission } from "@/lib/backup";
import { toast } from "sonner";
import type { AppState } from "@/lib/types";
import { registerPlugin, Capacitor } from "@capacitor/core";
import { Filesystem } from "@capacitor/filesystem";
import { LocalNotifications } from "@capacitor/local-notifications";

const KhetbookNative = registerPlugin<any>("KhetbookNative");

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
    headingHi: "हर काम का हिसाब ज़रूरी है",
    headingEn: "Every Job Deserves a Clear Record",
    bodyHi:
      "एक ट्रैक्टर ऑपरेटर सिर्फ़ ट्रैक्टर नहीं चलाता।\n\nकिस किसान के यहाँ कितना काम हुआ, कितने बीघा जुताई हुई, कितना डीज़ल लगा, कितने पैसे मिले और कितना उधार बाकी है—हर काम के साथ एक नया हिसाब जुड़ता जाता है।\n\nसालों से यह पूरा हिसाब एक छोटी-सी डायरी संभालती आई है।\n\nलेकिन आपकी मेहनत का हिसाब इतना ज़रूरी है कि उसे ढूँढने, जोड़ने या खो जाने की चिंता नहीं होनी चाहिए।\n\nइसीलिए है Khetbook।",
    bodyEn:
      "A tractor operator does much more than drive a tractor.\n\nEvery job brings a new calculation—whose field was worked, how much land was covered, how much diesel was used, how much was paid, and how much is still due.\n\nFor years, a small paper diary has carried all of this responsibility.\n\nBut the record of your hard work should not come with the worry of searching, calculating, or losing it.\n\nThat is why Khetbook exists.",
  },
  {
    Icon: Tractor,
    bg: "bg-gradient-to-br from-[#052e1a] via-[#0d5f37] to-[#125735]",
    blobA: "bg-[#f59e0b]/35",
    blobB: "bg-[#10b981]/30",
    iconRing: "from-[#fbbf24] to-[#f97316]",
    headingHi: "वही हिसाब, अब थोड़ा आसान",
    headingEn: "The Same Work, Made Simpler",
    bodyHi:
      "काम की एंट्री करें, किसान का खाता देखें, डीज़ल का खर्च जोड़ें और जानें कि कितना भुगतान बाकी है।\n\nहिंदी या हिंग्लिश में बोलकर एंट्री करें, साफ़ बिल बनाकर WhatsApp पर भेजें और UPI से भुगतान लेना आसान बनाएँ।\n\nइंटरनेट न हो, तब भी Khetbook काम करता है।\n\nन मुश्किल अकाउंटिंग।\nन कागज़ों का झंझट।\n\nबस आपका हिसाब—एक जगह, आपके फोन में।",
    bodyEn:
      "Record jobs, check farmer accounts, track diesel expenses, and see pending payments—all in one place.\n\nUse Hindi or Hinglish voice entry, create clear bills, share them through WhatsApp, and make payments easier with UPI.\n\nKhetbook works even when there is no internet.\n\nNo complicated accounting.\nNo paper-record headaches.\n\nJust your ledger, in one place, on your phone.",
  },
  {
    Icon: Heart,
    bg: "bg-gradient-to-br from-[#070b14] via-[#0e1626] to-[#172740]",
    blobA: "bg-[#3b82f6]/30",
    blobB: "bg-[#6366f1]/30",
    iconRing: "from-[#3b82f6] to-[#6366f1]",
    headingHi: "यह ऐप मेरे घर से शुरू हुआ",
    headingEn: "This App Started at Home",
    bodyHi:
      "नमस्ते, मैं Krish Tiwari हूँ।\n\nमैंने अपने पिताजी को ट्रैक्टर चलाते और किसानों के खेतों में जुताई व दूसरे कृषि कार्य करते देखा है।\n\nदिनभर के काम के साथ एक और जिम्मेदारी चलती रहती है—किसके यहाँ कितना काम हुआ, कितना भुगतान मिला और कितना बाकी है।\n\nइन सबका हिसाब डायरी में संभालते देखकर मेरे मन में एक सवाल आया—\n\nइतनी मेहनत और जिम्मेदारी संभालने वाले ट्रैक्टर ऑपरेटरों के लिए उनका अपना एक आसान हिसाब-किताब ऐप क्यों नहीं है?\n\nउसी सवाल से Khetbook की शुरुआत हुई।",
    bodyEn:
      "Hello, I am Krish Tiwari.\n\nI grew up watching my father operate his tractor and provide agricultural services to farmers.\n\nAlongside the physical work came another responsibility—remembering every job, every payment received, and every amount still due.\n\nWatching him manage all of this through a paper diary made me ask a simple question:\n\nWhy isn't there a simple bookkeeping app built specifically for tractor operators carrying this much responsibility?\n\nThat question became Khetbook.",
  },
  {
    Icon: UserRound,
    bg: "bg-gradient-to-br from-[#0c0f1d] via-[#1a1c32] to-[#251730]",
    blobA: "bg-[#ec4899]/25",
    blobB: "bg-[#8b5cf6]/25",
    iconRing: "from-[#ec4899] to-[#8b5cf6]",
    headingHi: "मेरे पिताजी से, हर ट्रैक्टर ऑपरेटर तक",
    headingEn: "From My Father to Every Tractor Operator",
    bodyHi:
      "Khetbook की शुरुआत मेरे पिताजी की ज़रूरत से हुई, लेकिन यह उन सभी ट्रैक्टर ऑपरेटरों के लिए है जिनकी मेहनत का हर रुपया मायने रखता है।\n\nइसे सरल और उपयोगी रखना मेरी जिम्मेदारी है।\n\nKhetbook हमेशा मुफ़्त और विज्ञापन-मुक्त रहेगा। आपका हिसाब आपके डिवाइस पर आपका ही रहेगा।\n\nऔर क्योंकि Khetbook Open Source है, इसका काम और इसकी नीयत—दोनों दुनिया के सामने खुले हैं।\n\nमेहनत आपकी। हिसाब आपका।\nKhetbook बस उसे संभालने में आपका साथी है।\n\n— Krish Tiwari\nनिर्माता, Khetbook",
    bodyEn:
      "Khetbook began with my father's needs, but it is built for every tractor operator whose hard-earned money deserves a clear record.\n\nKeeping it simple and useful is my responsibility.\n\nKhetbook will remain free and ad-free. Your records stay yours, on your device.\n\nAnd because Khetbook is open source, both its code and its intentions are open for the world to see.\n\nYour hard work. Your records.\nKhetbook is simply here to help you manage them.\n\n— Krish Tiwari\nCreator of Khetbook",
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
          const hasPerm = await requestStoragePermission();
          if (hasPerm) {
            const backup = await readLocalBackup();
            if (backup) {
              setDetectedBackup(backup);
            }
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

  const [micState, setMicState] = useState<"pending" | "granted" | "denied">("pending");
  const [storageState, setStorageState] = useState<"pending" | "granted" | "denied">("pending");
  const [smsState, setSmsState] = useState<"pending" | "granted" | "denied">("pending");
  const [notifState, setNotifState] = useState<"pending" | "granted" | "denied">("pending");

  async function checkInitialPermissions() {
    if (!Capacitor.isNativePlatform()) {
      setMicState("granted");
      setStorageState("granted");
      setSmsState("granted");
      setNotifState("granted");
      return;
    }
    try {
      const fsStatus = await Filesystem.checkPermissions();
      setStorageState(fsStatus.publicStorage === "granted" ? "granted" : "pending");
    } catch (e) {}

    try {
      const notifStatus = await LocalNotifications.checkPermissions();
      setNotifState(notifStatus.display === "granted" ? "granted" : "pending");
    } catch (e) {}

    try {
      const smsStatus = await KhetbookNative.checkSMSPermission();
      setSmsState(smsStatus.sms === "granted" ? "granted" : "pending");
    } catch (e) {}
  }

  // Check permission status when entering permissions page
  useEffect(() => {
    if (step === SLIDES.length) {
      checkInitialPermissions();
    }
  }, [step]);

  async function requestMic() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicState("granted");
      toast.success(lang === "hi" ? "माइक की अनुमति मिल गई ✓" : "Microphone permission granted ✓");
    } catch (err) {
      setMicState("denied");
      toast.error(lang === "hi" ? "माइक की अनुमति नहीं मिली" : "Microphone permission denied");
    }
  }

  async function requestStorage() {
    const granted = await requestStoragePermission();
    if (granted) {
      setStorageState("granted");
      toast.success(lang === "hi" ? "स्टोरेज की अनुमति मिल गई ✓" : "Storage permission granted ✓");
    } else {
      setStorageState("denied");
      toast.error(lang === "hi" ? "स्टोरेज की अनुमति नहीं मिली" : "Storage permission denied");
    }
  }

  async function requestSMS() {
    try {
      const status = await KhetbookNative.requestSMSPermission();
      if (status.sms === "granted") {
        setSmsState("granted");
        toast.success(lang === "hi" ? "एसएमएस की अनुमति मिल गई ✓" : "SMS permission granted ✓");
      } else {
        setSmsState("denied");
        toast.error(lang === "hi" ? "एसएमएस की अनुमति नहीं मिली" : "SMS permission denied");
      }
    } catch (err) {
      setSmsState("denied");
    }
  }

  async function requestNotif() {
    try {
      const status = await LocalNotifications.requestPermissions();
      if (status.display === "granted") {
        setNotifState("granted");
        toast.success(lang === "hi" ? "नोटिफिकेशन की अनुमति मिल गई ✓" : "Notification permission granted ✓");
      } else {
        setNotifState("denied");
        toast.error(lang === "hi" ? "नोटिफिकेशन की अनुमति नहीं मिली" : "Notification permission denied");
      }
    } catch (err) {
      setNotifState("denied");
    }
  }

  async function requestAllRemaining() {
    if (micState === "pending") {
      await requestMic();
    }
    if (storageState === "pending") {
      await requestStorage();
    }
    if (smsState === "pending") {
      await requestSMS();
    }
    if (notifState === "pending") {
      await requestNotif();
    }
  }

  const allProcessed = micState !== "pending" && storageState !== "pending" && smsState !== "pending" && notifState !== "pending";

  const total = SLIDES.length + 2; // + permissions + form
  const isPermissions = step === SLIDES.length;
  const isForm = step === SLIDES.length + 1;
  const isSlide = step < SLIDES.length;
  const slide = isSlide ? SLIDES[step] : null;

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

        {isSlide && slide ? (
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
                    // skip to permissions page
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
        ) : isPermissions ? (
          <div key="permissions" className="relative flex flex-1 flex-col bg-gradient-to-br from-[#090b11] via-[#121622] to-[#1c2235] text-white px-6 pb-6 pt-20 overflow-y-auto">
            {/* Ambient blobs */}
            <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl animate-pulse" />
            <div className="pointer-events-none absolute -right-20 bottom-20 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl animate-pulse" />
            
            <div className="relative z-10 flex-1 flex flex-col justify-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold text-primary self-center">
                <Tractor className="h-3.5 w-3.5" />
                Khetbook
              </div>
              <h2
                className={`${lang === "hi" ? "font-hindi" : ""} text-[26px] font-black leading-tight tracking-tight text-center`}
              >
                {t("ऐप की अनुमतियाँ (Permissions)", "App Permissions")}
              </h2>
              <p
                className={`${lang === "hi" ? "font-hindi" : ""} mt-2 text-xs text-white/60 text-center max-w-xs self-center leading-relaxed`}
              >
                {t("बेहतर अनुभव के लिए कृपया इन अनुमतियों को सेट करें। आप इन्हें बाद में भी बदल सकते हैं।", "Configure these permissions for the best experience. You can adjust them later.")}
              </p>

              {/* List of Permissions */}
              <div className="mt-8 space-y-3.5">
                
                {/* 1. Microphone Card */}
                <div className="flex items-center gap-4 rounded-2xl bg-white/5 p-4 border border-white/10 backdrop-blur-sm">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-orange-500/20 text-orange-400">
                    <Mic className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-[15px] font-bold ${lang === "hi" ? "font-hindi" : ""}`}>
                      {t("आवाज़ से हिसाब (Voice)", "Voice Bookkeeping")}
                    </h3>
                    <p className={`text-xs text-white/60 leading-normal mt-0.5 ${lang === "hi" ? "font-hindi" : ""}`}>
                      {t("बोलकर जुताई, डीजल और नाम एंट्री करने के लिए।", "Use voice recognition to enter jobs and diesel details.")}
                    </p>
                  </div>
                  <div>
                    {micState === "granted" ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-full">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t("सक्रिय", "Active")}
                      </span>
                    ) : micState === "denied" ? (
                      <button onClick={requestMic} className="flex items-center gap-1 text-[11px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-full">
                        <XCircle className="h-3.5 w-3.5" />
                        {t("अस्वीकृत", "Denied")}
                      </button>
                    ) : (
                      <button onClick={requestMic} className="text-xs font-bold text-[#090b11] bg-white hover:bg-white/90 px-3.5 py-1.5 rounded-full transition-transform active:scale-95 shadow">
                        {t("अनुमति दें", "Grant")}
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Storage Card */}
                <div className="flex items-center gap-4 rounded-2xl bg-white/5 p-4 border border-white/10 backdrop-blur-sm">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-green-500/20 text-green-400">
                    <DatabaseBackup className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-[15px] font-bold ${lang === "hi" ? "font-hindi" : ""}`}>
                      {t("डेटा बैकअप (Safe Backup)", "Data Recovery")}
                    </h3>
                    <p className={`text-xs text-white/60 leading-normal mt-0.5 ${lang === "hi" ? "font-hindi" : ""}`}>
                      {t("हिसाब को सुरक्षित रखने और रीस्टोर करने के लिए।", "Keep your ledger backup secure in your Documents folder.")}
                    </p>
                  </div>
                  <div>
                    {storageState === "granted" ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-full">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t("सक्रिय", "Active")}
                      </span>
                    ) : storageState === "denied" ? (
                      <button onClick={requestStorage} className="flex items-center gap-1 text-[11px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-full">
                        <XCircle className="h-3.5 w-3.5" />
                        {t("अस्वीकृत", "Denied")}
                      </button>
                    ) : (
                      <button onClick={requestStorage} className="text-xs font-bold text-[#090b11] bg-white hover:bg-white/90 px-3.5 py-1.5 rounded-full transition-transform active:scale-95 shadow">
                        {t("अनुमति दें", "Grant")}
                      </button>
                    )}
                  </div>
                </div>

                {/* 3. SMS Card */}
                <div className="flex flex-col gap-2 rounded-2xl bg-white/5 p-4 border border-white/10 backdrop-blur-sm">
                  <div className="flex items-center gap-4">
                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-blue-500/20 text-blue-400">
                      <MessageSquare className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-[15px] font-bold ${lang === "hi" ? "font-hindi" : ""}`}>
                        {t("एसएमएस रसीद (SMS Receipts)", "SMS Receipts")}
                      </h3>
                      <p className={`text-xs text-white/60 leading-normal mt-0.5 ${lang === "hi" ? "font-hindi" : ""}`}>
                        {t("किसान को रसीद का एसएमएस भेजने के लिए (वैकल्पिक)।", "Send transaction updates to farmers automatically (optional).")}
                      </p>
                    </div>
                    <div>
                      {smsState === "granted" ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-full">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {t("सक्रिय", "Active")}
                        </span>
                      ) : smsState === "denied" ? (
                        <button onClick={requestSMS} className="flex items-center gap-1 text-[11px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-full">
                          <XCircle className="h-3.5 w-3.5" />
                          {t("अस्वीकृत", "Denied")}
                        </button>
                      ) : (
                        <button onClick={requestSMS} className="text-xs font-bold text-[#090b11] bg-white hover:bg-white/90 px-3.5 py-1.5 rounded-full transition-transform active:scale-95 shadow">
                          {t("अनुमति दें", "Grant")}
                        </button>
                      )}
                    </div>
                  </div>
                  {smsState === "denied" && (
                    <div className={`mt-1 text-[11px] text-amber-300 leading-normal border-t border-white/5 pt-1.5 ${lang === "hi" ? "font-hindi" : ""}`}>
                      {t(
                        "यदि 'अनुमति दें' बटन नहीं दब रहा है (अवरुद्ध है): फ़ोन सेटिंग्स > ऐप्स > Khetbook में जाएँ, ऊपर 3-डॉट पर टैप करें और 'Allow restricted settings' चालू करें।",
                        "If the 'Allow' button is greyed out (Blocked): Go to Settings > Apps > Khetbook, tap the 3-dot menu at top-right, and select 'Allow restricted settings'."
                      )}
                    </div>
                  )}
                </div>

                {/* 4. Notifications Card */}
                <div className="flex items-center gap-4 rounded-2xl bg-white/5 p-4 border border-white/10 backdrop-blur-sm">
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-purple-500/20 text-purple-400">
                    <Bell className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-[15px] font-bold ${lang === "hi" ? "font-hindi" : ""}`}>
                      {t("दैनिक याद दिलाएं (Reminders)", "Daily Reminders")}
                    </h3>
                    <p className={`text-xs text-white/60 leading-normal mt-0.5 ${lang === "hi" ? "font-hindi" : ""}`}>
                      {t("रोज़ शाम को हिसाब जोड़ने की याद दिलाने के लिए।", "Polite reminders to update your diary at the end of the day.")}
                    </p>
                  </div>
                  <div>
                    {notifState === "granted" ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded-full">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t("सक्रिय", "Active")}
                      </span>
                    ) : notifState === "denied" ? (
                      <button onClick={requestNotif} className="flex items-center gap-1 text-[11px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded-full">
                        <XCircle className="h-3.5 w-3.5" />
                        {t("अस्वीकृत", "Denied")}
                      </button>
                    ) : (
                      <button onClick={requestNotif} className="text-xs font-bold text-[#090b11] bg-white hover:bg-white/90 px-3.5 py-1.5 rounded-full transition-transform active:scale-95 shadow">
                        {t("अनुमति दें", "Grant")}
                      </button>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom CTA bar */}
            <div className="mt-auto pt-6 space-y-3 z-10 flex flex-col">
              <Button
                onClick={async () => {
                  if (allProcessed) {
                    next();
                  } else {
                    await requestAllRemaining();
                  }
                }}
                size="lg"
                className="w-full h-14 text-lg font-black bg-white text-[#090b11] hover:bg-white/90 active:scale-98 transition-transform shadow-xl"
              >
                {allProcessed 
                  ? t("अनुमतियाँ सहेजें और आगे बढ़ें", "Save & Continue") 
                  : t("शेष अनुमतियाँ सेटअप करें", "Set Remaining Permissions")}
                <ArrowRight className="ml-1 h-5 w-5" />
              </Button>
              {!allProcessed && (
                <button
                  onClick={next}
                  className="w-full h-10 text-xs font-bold text-white/50 hover:text-white transition-colors"
                >
                  {t("अभी छोड़ें (बाद में सेटिंग्स में बदलें)", "Skip for now (configure later)")}
                </button>
              )}
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
