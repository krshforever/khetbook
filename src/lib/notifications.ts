import { Capacitor } from "@capacitor/core";

const PRESETS_HI = [
  "🚜 शाम का हिसाब लिख लिया? आज की एंट्रीज़ Khetbook में जोड़ दीजिये।",
  "नमस्ते 🙏 — आज का काम याद से दर्ज कर लीजिये, कल भूल जाएँगे।",
  "एक मिनट का काम — आज की कमाई और डीजल आज ही लिख दें।",
  "📒 डायरी खुली रह गई? एक टैप में आज की एंट्री जोड़ दें।",
  "उधार और भुगतान दर्ज कर लें, महीने के अंत में आसानी होगी।",
  "आज जुताई/थ्रेशर का काम हुआ हो तो खाते में जोड़ देना न भूलें।",
  "एक छोटा रिमाइंडर — कोई किसान, कोई एंट्री बाक़ी तो नहीं?",
  "डीजल भरा था आज? रेट और लीटर अभी दर्ज कर दीजिये।",
  "🌾 दिनभर की मेहनत का हिसाब Khetbook में सुरक्षित कर लीजिये।",
  "बाकी उधार पर WhatsApp रिमाइंडर भेज सकते हैं — एक नज़र डालिए।",
];

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Schedule (or refresh) a daily local notification at the user's chosen hour. */
export async function scheduleDailyReminder(hour: number) {
  if (!Capacitor.isNativePlatform()) {
    // Best-effort web: schedule one-shot for today (will re-fire on next app open)
    return scheduleWebReminder(hour);
  }
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== "granted") return false;
    await LocalNotifications.cancel({ notifications: [{ id: 4242 }] });
    // Random preset chosen per scheduling moment; native re-fires daily with the same text.
    const body = PRESETS_HI[Math.floor(Math.random() * PRESETS_HI.length)];
    await LocalNotifications.schedule({
      notifications: [
        {
          id: 4242,
          title: "Khetbook",
          body,
          schedule: { on: { hour, minute: 0 }, allowWhileIdle: true, repeats: true },
        },
      ],
    });
    return true;
  } catch {
    return false;
  }
}

export async function cancelDailyReminder() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    await LocalNotifications.cancel({ notifications: [{ id: 4242 }] });
  } catch {
    /* noop */
  }
}

let webReminderTimeout: any = null;

/** Web fallback: shows a Notification when app is opened after the hour, once per day. */
async function scheduleWebReminder(hour: number) {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "default") {
    const p = await Notification.requestPermission();
    if (p !== "granted") return false;
  }
  if (Notification.permission !== "granted") return false;
  const now = new Date();
  if (now.getHours() >= hour) maybeShowToday();
  // Re-check at the top of the hour
  if (webReminderTimeout) {
    clearTimeout(webReminderTimeout);
  }
  webReminderTimeout = setTimeout(
    maybeShowToday,
    Math.max(0, (hour - now.getHours()) * 3600_000 - now.getMinutes() * 60_000),
  );
  return true;
}

function maybeShowToday() {
  try {
    const last = localStorage.getItem("khetbook_last_reminder");
    const today = todayKey();
    if (last === today) return;
    const body = PRESETS_HI[Math.floor(Math.random() * PRESETS_HI.length)];
    new Notification("Khetbook", { body });
    localStorage.setItem("khetbook_last_reminder", today);
  } catch {
    /* noop */
  }
}

/** Fetch latest release tag from GitHub (no auth, public repo). */
export async function fetchLatestRelease(
  repo: string,
): Promise<{ tag: string; url: string; apk?: string } | null> {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) return null;
  try {
    const r = await fetch(`https://api.github.com/repos/${repo}/releases/latest`);
    if (!r.ok) return null;
    const j = (await r.json()) as {
      tag_name: string;
      html_url: string;
      assets?: { name: string; browser_download_url: string }[];
    };
    const apk = j.assets?.find((a) => a.name.toLowerCase().endsWith(".apk"))?.browser_download_url;
    return { tag: j.tag_name, url: j.html_url, apk };
  } catch {
    return null;
  }
}
