import { jsPDF } from "jspdf";
import type { AppState } from "./types";
import { fmtDate, fmtINR, dayKey } from "./format";
import { pendingForFarmer } from "./store";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { Capacitor } from "@capacitor/core";
import QRCode from "qrcode";
import html2canvas from "html2canvas-pro";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function saveOrSharePdf(doc: jsPDF, filename: string, shareText?: string) {
  if (Capacitor.isNativePlatform()) {
    try {
      const pdfBlob = doc.output("blob");
      const base64 = await blobToBase64(pdfBlob);

      const fileResult = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Cache,
      });
      await Share.share({
        title: filename,
        text: shareText || "Khetbook हिसाब-किताब PDF",
        url: fileResult.uri,
      });
    } catch (err: any) {
      console.error("Native PDF sharing failed:", err);
      throw new Error("PDF शेयर नहीं हो पाया: " + err.message);
    }
  } else {
    try {
      const pdfBlob = doc.output("blob");
      const file = new File([pdfBlob], filename, { type: "application/pdf" });
      const nav = navigator as Navigator & {
        canShare?: (d: ShareData) => boolean;
        share?: (d: ShareData) => Promise<void>;
      };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        await nav.share({
          files: [file],
          title: filename,
          text: shareText || "Khetbook हिसाब-किताब PDF",
        });
        return;
      }
    } catch (err) {
      console.warn("Web Share API failed, falling back to download", err);
    }
    doc.save(filename);
    if (shareText) {
      const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      window.open(url, "_blank");
    }
  }
}

function renderStatementHtml(
  state: AppState,
  farmerName: string,
  farmerPhone: string,
  ents: any[],
  pays: any[],
  pending: number,
  rangeLabel: string,
  qrDataUrl: string | null
): HTMLElement {
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "-9999px";
  container.style.width = "750px";
  container.style.backgroundColor = "#ffffff";
  container.style.color = "#1e293b";
  container.style.fontFamily = "sans-serif";
  container.style.padding = "35px";
  
  const alias = state.settings.userAlias || state.settings.merchantName || state.settings.userName || "Khetbook Operator";
  const userName = state.settings.userName || "ऑपरेटर";
  const userPhone = state.settings.userPhone || "";

  let html = `
    <div style="border-bottom: 2px solid #1f8a4c; padding-bottom: 15px; margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div>
          <h1 style="color: #1f8a4c; font-size: 26px; font-weight: 800; margin: 0;">Khetbook</h1>
          <p style="font-size: 11px; color: #64748b; margin: 2px 0 0 0;">आपका डिजिटल बहीखाता (Your Digital Ledger)</p>
        </div>
        <div style="text-align: right;">
          <h2 style="font-size: 16px; font-weight: 800; color: #0f172a; margin: 0;">${alias}</h2>
          <p style="font-size: 11px; color: #64748b; margin: 2px 0 0 0;">नाम: ${userName} ${userPhone ? `| फोन: ${userPhone}` : ""}</p>
        </div>
      </div>
    </div>

    <div style="display: flex; justify-content: space-between; margin-bottom: 25px; background-color: #f8fafc; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; font-size: 13px;">
      <div>
        <h3 style="font-size: 10px; text-transform: uppercase; color: #64748b; margin: 0 0 4px 0; font-weight: bold;">हिसाब किसके लिए (Farmer Details):</h3>
        <p style="font-size: 14px; font-weight: bold; color: #0f172a; margin: 0;">${farmerName}</p>
        ${farmerPhone ? `<p style="font-size: 11px; color: #64748b; margin: 2px 0 0 0;">फोन: ${farmerPhone}</p>` : ""}
      </div>
      <div style="text-align: right;">
        <h3 style="font-size: 10px; text-transform: uppercase; color: #64748b; margin: 0 0 4px 0; font-weight: bold;">विवरण (Statement Range):</h3>
        <p style="font-size: 13px; font-weight: bold; color: #1e293b; margin: 0;">${rangeLabel}</p>
        <p style="font-size: 10px; color: #64748b; margin: 2px 0 0 0;">जारी तारीख: ${new Date().toLocaleDateString("hi-IN")}</p>
      </div>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 12px;">
      <thead>
        <tr style="background-color: #1f8a4c; color: #ffffff;">
          <th style="padding: 10px; text-align: left; border-radius: 6px 0 0 0;">तारीख</th>
          <th style="padding: 10px; text-align: left;">काम (औज़ार)</th>
          <th style="padding: 10px; text-align: right;">मात्रा</th>
          <th style="padding: 10px; text-align: right;">दर (रेट)</th>
          <th style="padding: 10px; text-align: right;">कुल किराया</th>
          <th style="padding: 10px; text-align: right;">नकद मिला</th>
          <th style="padding: 10px; text-align: right; border-radius: 0 6px 0 0;">बाकी उधार</th>
        </tr>
      </thead>
      <tbody>
  `;

  let totalTotal = 0;
  let totalCash = 0;
  let totalUdhar = 0;

  ents.forEach((e, idx) => {
    totalTotal += e.total;
    totalCash += e.cashReceived;
    totalUdhar += e.udharAdded;
    
    const rowBg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
    const toolObj = state.tools.find((t) => t.id === e.toolId);
    const toolName = toolObj ? toolObj.nameHi : "काम";
    const multLabel = e.multiplier !== "single" ? ` (${e.multiplier === "double" ? "x2" : "x3"})` : "";

    html += `
      <tr style="background-color: ${rowBg}; border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px; text-align: left; color: #475569;">${fmtDate(e.date)}</td>
        <td style="padding: 10px; text-align: left; font-weight: bold; color: #0f172a;">${toolName}${multLabel}</td>
        <td style="padding: 10px; text-align: right; color: #334155;">${e.qty} ${e.unit}</td>
        <td style="padding: 10px; text-align: right; color: #334155;">₹${e.rate}</td>
        <td style="padding: 10px; text-align: right; font-weight: bold; color: #0f172a;">₹${e.total}</td>
        <td style="padding: 10px; text-align: right; color: #1f8a4c; font-weight: bold;">₹${e.cashReceived}</td>
        <td style="padding: 10px; text-align: right; color: #ef4444; font-weight: bold;">₹${e.udharAdded}</td>
      </tr>
    `;
  });

  html += `
      <tr style="background-color: #f1f5f9; font-weight: bold; border-top: 2px solid #cbd5e1;">
        <td style="padding: 10px;" colspan="4">कुल जोड़ (Total)</td>
        <td style="padding: 10px; text-align: right;">₹${totalTotal}</td>
        <td style="padding: 10px; text-align: right; color: #1f8a4c;">₹${totalCash}</td>
        <td style="padding: 10px; text-align: right; color: #ef4444;">₹${totalUdhar}</td>
      </tr>
    </tbody>
  </table>
  `;

  if (pays.length) {
    html += `
      <h3 style="font-size: 13px; font-weight: bold; color: #0f172a; margin: 0 0 10px 0;">प्राप्त भुगतान (Payments Received):</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 12px;">
        <thead>
          <tr style="background-color: #ea580c; color: #ffffff;">
            <th style="padding: 8px 12px; text-align: left; border-radius: 6px 0 0 0;">क्रम संख्या</th>
            <th style="padding: 8px 12px; text-align: left;">तारीख</th>
            <th style="padding: 8px 12px; text-align: right; border-radius: 0 6px 0 0;">रकम</th>
          </tr>
        </thead>
        <tbody>
    `;
    pays.forEach((p, idx) => {
      const rowBg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
      html += `
        <tr style="background-color: ${rowBg}; border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 8px 12px; text-align: left; color: #64748b;">#${idx + 1}</td>
          <td style="padding: 8px 12px; text-align: left; color: #334155;">${fmtDate(p.date)}</td>
          <td style="padding: 8px 12px; text-align: right; font-weight: bold; color: #1f8a4c;">₹${p.amount}</td>
        </tr>
      `;
    });
    html += `
        </tbody>
      </table>
    `;
  }

  html += `
    <div style="display: flex; gap: 20px; align-items: stretch; margin-top: 20px;">
      <div style="flex: 1; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; display: flex; flex-direction: column; justify-content: center; font-size: 13px;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #cbd5e1; padding-bottom: 8px; margin-bottom: 8px;">
          <span style="font-weight: bold; color: #475569;">कुल बाकी बकाया (All-Time Udhar):</span>
          <span style="font-size: 18px; font-weight: 900; color: #ef4444;">₹${pending}</span>
        </div>
        <p style="font-size: 10px; color: #64748b; margin: 0;">* यह राशि पिछले सभी भुगतानों और काम का बचा हुआ कुल हिसाब है।</p>
      </div>
  `;

  if (qrDataUrl) {
    html += `
      <div style="width: 320px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; display: flex; align-items: center; gap: 12px; font-size: 11px;">
        <img src="${qrDataUrl}" style="width: 75px; height: 75px; object-fit: contain; border-radius: 6px; border: 1px solid #e2e8f0;" />
        <div style="flex: 1;">
          <h4 style="font-size: 12px; font-weight: 800; color: #1f8a4c; margin: 0 0 2px 0;">UPI भुगतान (Scan & Pay)</h4>
          <p style="font-size: 10px; color: #475569; margin: 0 0 2px 0; word-break: break-all;">UPI: ${state.settings.upiVpa}</p>
          <p style="font-size: 10px; color: #475569; margin: 0 0 2px 0;">नाम: ${state.settings.merchantName || state.settings.userName}</p>
          <p style="font-size: 8px; color: #94a3b8; margin: 0;">UPI ऐप से स्कैन करके भुगतान करें।</p>
        </div>
      </div>
    `;
  }

  html += `
    </div>
    <div style="text-align: center; margin-top: 35px; color: #94a3b8; font-size: 9px; border-top: 1px solid #f1f5f9; padding-top: 15px;">
      Khetbook द्वारा सुरक्षित रूप से जनरेट किया गया
    </div>
  `;

  container.innerHTML = html;
  return container;
}

function renderSummaryHtml(
  state: AppState,
  totalEarn: number,
  pendingTotal: number,
  fuelTotal: number
): HTMLElement {
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "-9999px";
  container.style.width = "750px";
  container.style.backgroundColor = "#ffffff";
  container.style.color = "#1e293b";
  container.style.fontFamily = "sans-serif";
  container.style.padding = "35px";

  const alias = state.settings.userAlias || state.settings.merchantName || state.settings.userName || "Khetbook Operator";

  container.innerHTML = `
    <div style="border-bottom: 2px solid #1f8a4c; padding-bottom: 15px; margin-bottom: 20px;">
      <h1 style="color: #1f8a4c; font-size: 26px; font-weight: 800; margin: 0;">Khetbook</h1>
      <p style="font-size: 11px; color: #64748b; margin: 2px 0 0 0;">संपूर्ण खाता बही रिपोर्ट (Full Ledger Report)</p>
    </div>
    
    <div style="margin-bottom: 25px;">
      <h2 style="font-size: 16px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0;">ऑपरेटर सारांश (Operator Summary)</h2>
      <p style="font-size: 13px; color: #334155; margin: 0;">व्यवसाय: <strong>${alias}</strong> | दिनांक: ${new Date().toLocaleDateString("hi-IN")}</p>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 35px; font-size: 13px;">
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; text-align: center;">
        <h3 style="font-size: 12px; color: #166534; font-weight: bold; margin: 0 0 5px 0;">कुल कमाई (Total Earned)</h3>
        <p style="font-size: 24px; font-weight: 900; color: #15803d; margin: 0;">₹${totalEarn}</p>
      </div>
      <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 20px; text-align: center;">
        <h3 style="font-size: 12px; color: #991b1b; font-weight: bold; margin: 0 0 5px 0;">बाकी उधार (Pending Balance)</h3>
        <p style="font-size: 24px; font-weight: 900; color: #b91c1c; margin: 0;">₹${pendingTotal}</p>
      </div>
      <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 20px; text-align: center;">
        <h3 style="font-size: 12px; color: #92400e; font-weight: bold; margin: 0 0 5px 0;">डीजल खर्च (Diesel Cost)</h3>
        <p style="font-size: 24px; font-weight: 900; color: #d97706; margin: 0;">₹${fuelTotal}</p>
      </div>
      <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 20px; text-align: center;">
        <h3 style="font-size: 12px; color: #1e40af; font-weight: bold; margin: 0 0 5px 0;">शुद्ध मुनाफा (Net Profit)</h3>
        <p style="font-size: 24px; font-weight: 900; color: #1d4ed8; margin: 0;">₹${totalEarn - fuelTotal}</p>
      </div>
    </div>

    <div style="text-align: center; margin-top: 100px; color: #94a3b8; font-size: 9px; border-top: 1px solid #f1f5f9; padding-top: 15px;">
      Khetbook द्वारा जनरेट किया गया
    </div>
  `;
  return container;
}

function renderDieselHtml(state: AppState, fuel: any[]): HTMLElement {
  const container = document.createElement("div");
  container.style.position = "absolute";
  container.style.left = "-9999px";
  container.style.top = "-9999px";
  container.style.width = "750px";
  container.style.backgroundColor = "#ffffff";
  container.style.color = "#1e293b";
  container.style.fontFamily = "sans-serif";
  container.style.padding = "35px";

  let html = `
    <div style="border-bottom: 2px solid #ea580c; padding-bottom: 15px; margin-bottom: 20px;">
      <h1 style="color: #ea580c; font-size: 26px; font-weight: 800; margin: 0;">डीजल का हिसाब</h1>
      <p style="font-size: 11px; color: #64748b; margin: 2px 0 0 0;">डीजल खरीद और खर्च का विवरण (Diesel Expense Details)</p>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 12px;">
      <thead>
        <tr style="background-color: #ea580c; color: #ffffff;">
          <th style="padding: 10px; text-align: left; border-radius: 6px 0 0 0;">तारीख</th>
          <th style="padding: 10px; text-align: right;">लीटर (Litres)</th>
          <th style="padding: 10px; text-align: right;">दर (₹/लीटर)</th>
          <th style="padding: 10px; text-align: right;">कुल खर्च</th>
          <th style="padding: 10px; text-align: right; border-radius: 0 6px 0 0;">पंप का नाम</th>
        </tr>
      </thead>
      <tbody>
  `;

  let totalCost = 0;
  fuel.forEach((f, idx) => {
    totalCost += f.amount;
    const rowBg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
    html += `
      <tr style="background-color: ${rowBg}; border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px; text-align: left; color: #475569;">${fmtDate(f.date)}</td>
        <td style="padding: 10px; text-align: right; color: #334155;">${f.litres?.toFixed(2) ?? "—"}</td>
        <td style="padding: 10px; text-align: right; color: #334155;">₹${f.pricePerLitre || "—"}</td>
        <td style="padding: 10px; text-align: right; font-weight: bold; color: #0f172a;">₹${f.amount}</td>
        <td style="padding: 10px; text-align: right; color: #475569;">${f.pumpName || "—"}</td>
      </tr>
    `;
  });

  html += `
      <tr style="background-color: #f1f5f9; font-weight: bold; border-top: 2px solid #cbd5e1;">
        <td style="padding: 10px;" colspan="3">कुल खर्च (Total)</td>
        <td style="padding: 10px; text-align: right; color: #ef4444;">₹${totalCost}</td>
        <td style="padding: 10px;"></td>
      </tr>
    </tbody>
  </table>
  `;

  container.innerHTML = html;
  return container;
}

async function takeHtmlSnapshot(element: HTMLElement): Promise<HTMLCanvasElement> {
  // Render directly using html2canvas-pro, which natively supports oklch() colors.
  // This eliminates style-disabling layout flickering and preserves Noto Sans Devanagari font rendering.
  return html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
  });
}

export async function exportFullLedgerPdf(state: AppState) {
  const doc = new jsPDF("p", "mm", "a4");
  const pdfWidth = doc.internal.pageSize.getWidth(); // 210mm

  // Summary
  const totalEarn =
    state.entries.reduce((s, e) => s + e.cashReceived, 0) +
    state.payments.reduce((s, p) => s + p.amount, 0);
  const pendingTotal = state.farmers.reduce((s, f) => s + pendingForFarmer(state, f.id), 0);
  const fuelTotal = state.fuel.reduce((s, f) => s + f.amount, 0);

  const sumElement = renderSummaryHtml(state, totalEarn, pendingTotal, fuelTotal);
  document.body.appendChild(sumElement);

  try {
    const canvas = await takeHtmlSnapshot(sumElement);
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    doc.addImage(imgData, "JPEG", 0, 0, pdfWidth, Math.min(297, pdfHeight));
  } finally {
    document.body.removeChild(sumElement);
  }

  // Farmer accounts
  for (let i = 0; i < state.farmers.length; i++) {
    const f = state.farmers[i];
    const ents = state.entries.filter((e) => e.farmerId === f.id);
    const pays = state.payments.filter((p) => p.farmerId === f.id);
    if (!ents.length && !pays.length) continue;

    doc.addPage();
    const pending = pendingForFarmer(state, f.id);
    let qrDataUrl: string | null = null;
    if (state.settings.upiVpa && pending > 0) {
      const upiLink = `upi://pay?pa=${state.settings.upiVpa}&pn=${encodeURIComponent(state.settings.merchantName || state.settings.userName || "Khetbook")}&cu=INR`;
      qrDataUrl = await QRCode.toDataURL(upiLink, { margin: 1, width: 150 });
    }

    const farmElement = renderStatementHtml(
      state,
      f.name,
      f.phone || "",
      ents.slice().sort((a, b) => a.date.localeCompare(b.date)),
      pays.slice().sort((a, b) => a.date.localeCompare(b.date)),
      pending,
      "पूरा इतिहास (All-Time)",
      qrDataUrl
    );
    document.body.appendChild(farmElement);

    try {
      const canvas = await takeHtmlSnapshot(farmElement);
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      doc.addImage(imgData, "JPEG", 0, 0, pdfWidth, Math.min(297, pdfHeight));
    } finally {
      document.body.removeChild(farmElement);
    }
  }

  // Diesel
  if (state.fuel.length) {
    doc.addPage();
    const dieselElement = renderDieselHtml(state, state.fuel.slice().sort((a, b) => a.date.localeCompare(b.date)));
    document.body.appendChild(dieselElement);

    try {
      const canvas = await takeHtmlSnapshot(dieselElement);
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      doc.addImage(imgData, "JPEG", 0, 0, pdfWidth, Math.min(297, pdfHeight));
    } finally {
      document.body.removeChild(dieselElement);
    }
  }

  const filename = `khetbook-statement-${dayKey(new Date().toISOString())}.pdf`;
  await saveOrSharePdf(doc, filename);
}

export async function exportFarmerBillPdf(
  state: AppState,
  farmerId: string,
  fromISO: string,
  toISO: string,
  rangeLabel: string,
  shareText?: string
) {
  const f = state.farmers.find((x) => x.id === farmerId);
  if (!f) return;
  const from = +new Date(fromISO);
  const to = +new Date(toISO);

  const ents = state.entries
    .filter((e) => e.farmerId === f.id)
    .filter((e) => {
      const t = +new Date(e.date);
      return t >= from && t <= to;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const pays = state.payments
    .filter((p) => p.farmerId === f.id)
    .filter((p) => {
      const t = +new Date(p.date);
      return t >= from && t <= to;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const doc = new jsPDF("p", "mm", "a4");
  const pdfWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pending = pendingForFarmer(state, f.id);

  let qrDataUrl: string | null = null;
  if (state.settings.upiVpa && pending > 0) {
    const upiLink = `upi://pay?pa=${state.settings.upiVpa}&pn=${encodeURIComponent(state.settings.merchantName || state.settings.userName || "Khetbook")}&cu=INR`;
    qrDataUrl = await QRCode.toDataURL(upiLink, { margin: 1, width: 150 });
  }

  const element = renderStatementHtml(state, f.name, f.phone || "", ents, pays, pending, rangeLabel, qrDataUrl);
  document.body.appendChild(element);

  try {
    const canvas = await takeHtmlSnapshot(element);
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    doc.addImage(imgData, "JPEG", 0, 0, pdfWidth, Math.min(297, pdfHeight));
  } finally {
    document.body.removeChild(element);
  }

  const filename = `khetbook-${f.name.replace(/\s+/g, "_")}-${dayKey(fromISO)}_${dayKey(toISO)}.pdf`;
  await saveOrSharePdf(doc, filename, shareText);
}
