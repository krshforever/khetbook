import { createServerFn } from "@tanstack/react-start";
import { Capacitor, CapacitorHttp } from "@capacitor/core";

const STATE_SLUGS: Record<string, string> = {
  UP: "uttar-pradesh",
  MP: "madhya-pradesh",
  BR: "bihar",
  RJ: "rajasthan",
  PB: "punjab",
  HR: "haryana",
  MH: "maharashtra",
  GJ: "gujarat",
  KA: "karnataka",
  TN: "tamil-nadu",
  WB: "west-bengal",
  AP: "andhra-pradesh",
  TS: "telangana",
  KL: "kerala",
  OR: "odisha",
  JH: "jharkhand",
  CG: "chhattisgarh",
  UK: "uttarakhand",
  HP: "himachal-pradesh",
  AS: "assam",
  GA: "goa",
  DL: "delhi",
};

function parsePriceFromHtml(html: string): number | null {
  // NDTV embeds today's price as "₹ 89.62" inside the main price block.
  const m =
    html.match(/Today[^₹]{0,80}₹\s*([0-9]{2,3}(?:\.[0-9]{1,2})?)/i) ??
    html.match(/diesel[^₹]{0,120}₹\s*([0-9]{2,3}(?:\.[0-9]{1,2})?)/i) ??
    html.match(/₹\s*([0-9]{2,3}\.[0-9]{1,2})\s*\/?\s*(?:per\s*)?(?:litre|liter|l)/i);
  const price = m ? parseFloat(m[1]) : null;
  if (price == null || price < 50 || price > 200) {
    return null;
  }
  return price;
}

/** Scrape NDTV public fuel-price page. (Server-side fallback for Web browser development) */
export const getDieselPriceServer = createServerFn({ method: "GET" })
  .inputValidator((data: { state?: string }) => data)
  .handler(async ({ data }) => {
    const code = (data.state ?? "UP").toUpperCase();
    const slug = STATE_SLUGS[code] ?? "uttar-pradesh";
    const url = `https://www.ndtv.com/fuel-prices/diesel-price-in-${slug}-state`;
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android) TractorHisaab/1.0",
          Accept: "text/html",
        },
      });
      if (!res.ok) {
        return { price: null as number | null, source: "ndtv_server", error: `http_${res.status}` };
      }
      const html = await res.text();
      const price = parsePriceFromHtml(html);
      if (price === null) {
        return { price: null, source: "ndtv_server", error: "parse_failed" };
      }
      return { price, source: "ndtv_server", state: code };
    } catch (e) {
      return { price: null, source: "ndtv_server", error: String(e) };
    }
  });

/**
 * Scrapes NDTV public fuel-price page.
 * Detects platform at runtime:
 * - On Native mobile devices, queries directly from the client using CapacitorHttp (bypassing CORS).
 * - On Web development servers, proxies request via getDieselPriceServer.
 */
export async function getDieselPrice(input: { data: { state?: string } }): Promise<{
  price: number | null;
  source: string;
  state?: string;
  error?: string;
}> {
  const stateCode = (input.data?.state ?? "UP").toUpperCase();

  // If running inside Capacitor Native container (Android / iOS)
  if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
    const slug = STATE_SLUGS[stateCode] ?? "uttar-pradesh";
    const url = `https://www.ndtv.com/fuel-prices/diesel-price-in-${slug}-state`;
    try {
      const res = await CapacitorHttp.get({
        url,
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android) TractorHisaab/1.0",
          Accept: "text/html",
        },
      });
      if (res.status !== 200) {
        return { price: null, source: "ndtv_native", error: `http_${res.status}` };
      }
      const price = parsePriceFromHtml(res.data);
      if (price === null) {
        return { price: null, source: "ndtv_native", error: "parse_failed" };
      }
      return { price, source: "ndtv_native", state: stateCode };
    } catch (e) {
      return { price: null, source: "ndtv_native", error: String(e) };
    }
  }

  // Fallback to Server Function proxy for web development
  return getDieselPriceServer(input.data);
}
