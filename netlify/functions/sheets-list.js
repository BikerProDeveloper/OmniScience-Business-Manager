import { google } from "googleapis";
import { getStore } from "@netlify/blobs";

function oauthFromCookies(event, redirectUri) {
  const cookies = Object.fromEntries(
    (event.headers.cookie || "")
      .split(";")
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => {
        const i = s.indexOf("="); 
        return [decodeURIComponent(s.slice(0,i)), decodeURIComponent(s.slice(i+1))];
      })
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
  // 1) Try Netlify Blobs (prod-ready). In local, token may be missing/invalid -> fallback.
  try {
    const store = getStore({ name: "omni-config", siteID: process.env.SITE_ID, token: process.env.NETLIFY_TOKEN });
    const id = await store.get("GOOGLE_SHEET_ID", { type: "text" });
    if (id) return id;
  } catch (_) { /* ignore and fallback */ }

  // 2) Fallback: search Drive by name (newest match)
  const drive = google.drive({ version: "v3", auth });
  const resp = await drive.files.list({
    q: "name = 'OmniStudio Data' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",
    orderBy: "createdTime desc",
    pageSize: 1,
    fields: "files(id,name)"
  });
  const file = resp.data.files?.[0];
  if (file?.id) return file.id;

  // Not found yet
  return null;
}

export async function handler(event) {
  try {
    const baseUrl = `${(event.headers["x-forwarded-proto"]||"http").replace(/:$/,"")}://${event.headers.host}`;
    const redirectUri = `${baseUrl}/.netlify/functions/google-oauth-callback`;
    const sheet = (event.queryStringParameters?.sheet || "Clients").toString().slice(0,50);

    const auth = oauthFromCookies(event, redirectUri);
    const sheets = google.sheets({ version: "v4", auth });

    const spreadsheetId = await resolveSpreadsheetId(auth);
    if (!spreadsheetId) {
      return { statusCode: 404, body: "No spreadsheet found. Add a first row with Quick Add." };
    }

    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheet}!A1:Z1000`
    });

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: true, rows: resp.data.values || [] })
    };
  } catch (e) {
    const msg = e.errors?.[0]?.message || e.message || "Unknown error";
    return { statusCode: 500, body: `sheets-list error: ${msg}` };
  }
}
