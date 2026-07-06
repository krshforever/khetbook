import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Capacitor } from "@capacitor/core";
import type { AppState } from "./types";

const BACKUP_FILENAME = "KhetbookBackup/backup.json";

export async function requestStoragePermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true;

  // On Android 13+ (API 33+), traditional public storage permissions are deprecated and auto-denied.
  // Since we write to public documents using modern scoped storage rules, return true immediately.
  if (Capacitor.getPlatform() === "android") {
    const match = navigator.userAgent.match(/Android\s+([0-9.]+)/);
    const androidVersion = match ? parseFloat(match[1]) : null;
    if (androidVersion !== null && androidVersion >= 13) {
      return true;
    }
  }

  try {
    const status = await Filesystem.checkPermissions();
    if (status.publicStorage !== "granted") {
      const request = await Filesystem.requestPermissions();
      return request.publicStorage === "granted";
    }
    return true;
  } catch (err) {
    console.error("Error checking/requesting storage permission:", err);
    return false;
  }
}

export async function writeLocalBackup(state: AppState): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    // 1. Ensure directory exists
    try {
      await Filesystem.mkdir({
        path: "KhetbookBackup",
        directory: Directory.Documents,
        recursive: true,
      });
    } catch (err) {
      // Directory already exists, ignore
    }

    // 2. Write the JSON backup file
    await Filesystem.writeFile({
      path: BACKUP_FILENAME,
      data: JSON.stringify(state, null, 2),
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });
    console.log("Local backup saved successfully to Documents/KhetbookBackup/backup.json");
  } catch (err) {
    console.error("Failed to save local backup:", err);
  }
}

export async function readLocalBackup(): Promise<AppState | null> {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const res = await Filesystem.readFile({
      path: BACKUP_FILENAME,
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });

    let dataStr = "";
    if (typeof res.data === "string") {
      dataStr = res.data;
    } else {
      // Handle array or blob buffer cases if any
      dataStr = new TextDecoder().decode(res.data);
    }

    if (!dataStr) return null;
    const parsed = JSON.parse(dataStr) as Partial<AppState>;
    
    // Strict schema validation to ensure data integrity
    if (!parsed.settings || !Array.isArray(parsed.farmers) || !Array.isArray(parsed.entries)) {
      console.warn("Backup file was read but failed schema validation");
      return null;
    }

    const validatedState: AppState = {
      version: 2,
      settings: {
        upiVpa: parsed.settings.upiVpa || "",
        merchantName: parsed.settings.merchantName || "",
        voiceLang: parsed.settings.voiceLang || "hi-IN",
        dieselState: parsed.settings.dieselState,
        lastDieselPrice: parsed.settings.lastDieselPrice,
        lastBackupAt: parsed.settings.lastBackupAt,
        userName: parsed.settings.userName,
        userAlias: parsed.settings.userAlias,
        userPhone: parsed.settings.userPhone,
        onboardedAt: parsed.settings.onboardedAt,
        notificationsEnabled: parsed.settings.notificationsEnabled,
        reminderHour: parsed.settings.reminderHour,
        lastReminderShown: parsed.settings.lastReminderShown,
        githubRepo: parsed.settings.githubRepo,
        autoSmsOnSave: parsed.settings.autoSmsOnSave ?? false,
      },
      tools: Array.isArray(parsed.tools) ? parsed.tools : [],
      farmers: parsed.farmers,
      entries: parsed.entries,
      payments: Array.isArray(parsed.payments) ? parsed.payments : [],
      fuel: Array.isArray(parsed.fuel) ? parsed.fuel : [],
      smsLogs: Array.isArray(parsed.smsLogs) ? parsed.smsLogs : [],
    };

    return validatedState;
  } catch (err) {
    console.log("No local backup file found or failed to read:", err);
    return null;
  }
}

export async function deleteLocalBackup(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Filesystem.deleteFile({
      path: BACKUP_FILENAME,
      directory: Directory.Documents,
    });
    console.log("Local backup file deleted");
  } catch (err) {
    console.error("Failed to delete local backup:", err);
  }
}
