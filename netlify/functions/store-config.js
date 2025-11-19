import { google } from "googleapis";
import { getStore } from "@netlify/blobs";

function oauthFromCookies(event, redirectUri) {
  const cookies = Object.fromEntries(
    (event.headers.cookie || "")
      .split(";").map(s=>s.trim()).filter(Boolean)
      .map(s=>{ const i=s.indexOf("="); return [decodeURIComponent(s.slice(0,i)), decodeURIComponent(s.slice(i+1))]; })
  );
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  const creds = {};
  if (cookies.g_refresh) creds.refresh_token = cookies.g_refresh;
  if (cookies.g_access)  creds.access_token  = cookies.g_access;
  oauth2.setCredentials(creds);
  return oauth2;
}

async function resolveSpreadsheetId(auth) {
  // Try Netlify Blobs first (prod); fallback to Drive search (local/dev)
  try {
    const store = getStore({ name: "omni-config", siteID: process.env.SITE_ID, token: process.env.NETLIFY_TOKEN });
    const id = await store.get("GOOGLE_SHEET_ID", { type: "text" });
    if (id) return id;
  } catch (_) {}
  const drive = google.drive({ version: "v3", auth });
  const resp = await drive.files.list({
    q: "name = 'OmniStudio Data' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",
    orderBy: "createdTime desc",
    pageSize: 1,
    fields: "files(id,name)"
  });
  return resp.data.files?.[0]?.id || null;
}

export async function handler(event) {
  try {
    const baseUrl = `${(event.headers["x-forwarded-proto"]||"http").replace(/:$/,"")}://${event.headers.host}`;
    const redirectUri = `${baseUrl}/.netlify/functions/google-oauth-callback`;
    const auth = oauthFromCookies(event, redirectUri);
    const sheets = google.sheets({ version: "v4", auth });

    const spreadsheetId = await resolveSpreadsheetId(auth);
    if (!spreadsheetId) return { statusCode: 404, body: "No spreadsheet found. Use Store Builder → Save first." };

    // Read StoreConfig
    const cfgResp = await sheets.spreadsheets.values.get({ spreadsheetId, range: "StoreConfig!A1:Z200" });
    let config = {};
    const cfgRows = cfgResp.data.values || [];
    // Assume: timestamp | json blob in col B if saved via sheets-append OR key/value rows
    // Try JSON in B2 first:
    try {
      const raw = cfgRows?.[1]?.[1];
      if (raw) config = JSON.parse(raw);
    } catch (_) {
      // Fallback: key/value pairs (A/B)
      config = Object.fromEntries((cfgRows.slice(1) || []).map(r => [String(r[0]||"").trim(), (r[1]||"").toString()]));
    }

    // Read StoreCatalog
    const catResp = await sheets.spreadsheets.values.get({ spreadsheetId, range: "StoreCatalog!A1:Z2000" });
    const catRows = catResp.data.values || [];
    // Expect header: timestamp, sku, title, price, stock, image, tags
    const items = catRows.slice(1).map(r => ({
      sku:   r?.[1] || "",
      title: r?.[2] || "",
      price: parseFloat(r?.[3] || "0") || 0,
      stock: parseInt(r?.[4] || "0") || 0,
      image: r?.[5] || "",
      tags:  (r?.[6] || "").split(",").map(s=>s.trim()).filter(Boolean)
    })).filter(x=>x.sku || x.title);

    return {
      statusCode: 200,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
      body: JSON.stringify({ ok:true, catalog: items, config })
    };
  } catch (e) {
    return { statusCode: 500, body: "store-config error: " + (e.message || e) };
  }
}
