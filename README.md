# Khetbook 🚜

> A vibrant, mobile-first हिसाब-किताब (bookkeeping) app for Indian tractor operators.
> 100% offline · Hindi voice entry · UPI QR reminders · WhatsApp bills · Open-source.

Khetbook is an aspirational, fully open-source project — built so that elder tractor operators (like the author's father) can replace their torn paper diaries with a simple, large-touch, voice-friendly app that works without internet.

---

## Features

### Dashboard

- Giant tiles: **कुल कमाई**, **उधार बाकी**, **डीजल ख़र्चा**, **मुनाफ़ा (Earnings − Diesel)**.
- 3-way scope toggle — **आज / हफ़्ता / महीना**.
- Floating action button to log a new job in one tap.

### Smart Job Entry

- **Voice-to-text** (Hindi or Hinglish) auto-fills tool, quantity, multiplier (single/दोहर/तिहर), farmer name, landowner, cash received.
- **Mic on every text field** — farmer name, landowner, search boxes.
- Per-entry landowner tagging — one farmer can have many owners (partnership, rental, अपना खेत).
- Editable rate from settings defaults; quick discounts inline.
- Backdating via large date picker.

### Khata Ledger

- Per-farmer balance with **dynamic UPI QR** (`upi://pay?pa=…&am=<pending>&tn=Tractor_Hisaab_<name>`).
- **WhatsApp send dialog** — pick 3 / 6 / 12 month range, toggle table-format ledger inline, or attach a full **PDF bill** generated on-device via Web Share API.
- Payment logging, edit/delete via 3-dot menus.
- Farmer-level filter & sort by landowner.

### History

- Day-by-day groupings with month/year sticky headers.
- Search **by name, landowner, or date** — recognises `जून 2026`, `06/2026`, `29 जून 2026`, `2026-06-29`, etc.
- Tool filter chips + a dedicated **डीजल** chip.

### Daily Diesel

- Quick "भरें" sheet from dashboard.
- **Bidirectional calculator** — type ₹ to auto-derive litres, or vice-versa.
- Optional live diesel price scraping (NDTV public page) per state.

### Settings

- Settings VPA + Merchant name (powers QR).
- Editable tools, units, default rates.
- Backup / Restore JSON + Export full account PDF (per-farmer, payments, diesel, profit).
- Batch entry — paste many lines from your old diary at once.
- **Offline Data Recovery:** Automatic background synchronization writes backups to the device's public `Documents/` folder, surviving app uninstalls and manual storage clears.
- **Auto-SMS Reminders:** Toggle to automatically send silent background SMS text updates to farmers when new work entries are saved, complete with itemized transaction totals and UPI deep payment links.
- **Update checker** — automatically checks for updates on startup, displaying a dialog modal to download the new APK if a newer version is released on GitHub.
- **Daily reminder** notifications (Android via Capacitor LocalNotifications; web Notification API fallback) — 10 randomised polite presets.

### First-launch story

- 4-slide onboarding (with **HI ⇄ EN** toggle) that explains _why_ the app exists, what it does, and who built it — ending with the user's name + phone, used only for in-app greetings.

---

## Tech

TanStack Start (SSG output) · React 19 · Tailwind v4 · LocalStorage (only persistence) · Capacitor for Android · jsPDF for offline PDFs · qrcode for UPI · Web Speech API for voice.

## Privacy

- **All data stays on the device** in `localStorage` under the key `khetbook_v1`. No server, no analytics, no telemetry.
- The only outbound calls are:
  - `api.github.com/repos/krshforever/khetbook/releases/latest` — automatically on boot or when the user checks for updates.
  - NDTV fuel-price scraping via a TanStack server function — only when the user taps "रेट खोजें" in the diesel sheet.
- UPI ID, name, phone — all on-device.
- WhatsApp uses `wa.me` deep-link, opening the user's own WhatsApp.
- Open-source under the **MIT License** — read every line.


## Open source

This project is MIT-licensed. Distribute APKs via GitHub Releases — push a tag like `v1.0.0` and the workflow attaches the APK to the release automatically.

## Credits

सादर निर्माण — **क्रिश तिवारी (Krish Tiwari)** — अपने पिता और देश के सभी ट्रैक्टर चालकों के सम्मान में।

- LinkedIn: [krish-tiwari-82192230b](https://www.linkedin.com/in/krish-tiwari-82192230b)
- Instagram / YouTube: [@krshforever](https://instagram.com/krshforever)

## License

MIT — see [LICENSE](./LICENSE).
