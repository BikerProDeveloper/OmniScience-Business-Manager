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

async function ensureSpreadsheet(auth) {
  // Persistimos el ID en Netlify Blobs para no pedirlo cada vez
  const store = getStore({ name: "omni-config", siteID: process.env.SITE_ID, token: process.env.NETLIFY_TOKEN });
  let sheetId = await store.get("GOOGLE_SHEET_ID", { type: "text" });

  if (!sheetId) {
    const drive = google.drive({ version: "v3", auth });
    const sheets = google.sheets({ version: "v4", auth });

    // Crear Spreadsheet
    const resp = await sheets.spreadsheets.create({
      requestBody: { properties: { title: "OmniStudio Data" } }
    });
    sheetId = resp.data.spreadsheetId;

    // Dar permisos a tu cuenta (como propietario ya vale al crearse con tu cuenta)
    await store.set("GOOGLE_SHEET_ID", sheetId);
  }
  return sheetId;
}

function toAOA(rowObj) {
  // Convierte {a:1,b:2} -> [[timestamp, a, b]] y mantiene orden estable
  const keys = Object.keys(rowObj);
  const values = keys.map(k => rowObj[k]);
  const ts = new Date().toISOString();
  return { header: ["timestamp", ...keys], row: [ts, ...values] };
}

export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }
    const baseUrl = `${(event.headers["x-forwarded-proto"]||"http").replace(/:$/,"")}://${event.headers.host}`;
    const redirectUri = `${baseUrl}/.netlify/functions/google-oauth-callback`;

    const body = JSON.parse(event.body || "{}");
    const sheetName = (body.sheet || "Clients").toString().slice(0,50);
    const rowObj = body.row && typeof body.row === "object" ? body.row : null;
    if (!rowObj) return { statusCode: 400, body: "Missing {row:{...}} payload" };

    const auth = oauthFromCookies(event, redirectUri);
    const sheets = google.sheets({ version: "v4", auth });

    // Asegurar Spreadsheet
    const spreadsheetId = await ensureSpreadsheet(auth);

    // Asegurar la hoja (sheet) y cabeceras
    const { header, row } = toAOA(rowObj);

    // Leer primera fila para ver si existen headers
    const getResp = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!1:1`
    }).catch(()=>null);

    const haveHeaders = Array.isArray(getResp?.data?.values) && getResp.data.values.length && getResp.data.values[0]?.length;

    if (!haveHeaders) {
      // Crear hoja si no existe y escribir headers
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title: sheetName } } }]
        }
      }).catch(()=>{}); // si ya existe, ignora

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1:${String.fromCharCode(64+header.length)}1`,
        valueInputOption: "RAW",
        requestBody: { values: [header] }
      });
    }

    // Append row
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [row] }
    });

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: true, spreadsheetId, sheet: sheetName })
    };
  } catch (e) {
    const msg = e.errors?.[0]?.message || e.message || "Unknown error";
    return { statusCode: 500, body: `sheets-append error: ${msg}` };
  }
}

