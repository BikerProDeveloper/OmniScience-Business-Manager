import { google } from "googleapis";

function getBaseUrl(event) {
  const proto = (event.headers["x-forwarded-proto"] || "http").replace(/:$/, "");
  const host = event.headers.host || "localhost:1586";
  return `${proto}://${host}`;
}

function parseCookies(header) {
  const out = {};
  (header || "").split(";").forEach((p) => {
    const i = p.indexOf("=");
    if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}

export async function handler(event) {
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      return { statusCode: 500, body: "Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET" };
    }

    const baseUrl = getBaseUrl(event);
    const redirectUri = `${baseUrl}/.netlify/functions/google-oauth-callback`;

    const { code, state } = event.queryStringParameters || {};
// DEBUG: show what the callback received when ?debug=1
const qp = event.queryStringParameters || {};
if (qp.debug === "1") {
  return {
    statusCode: 200,
    headers: { "content-type": "text/plain; charset=utf-8" },
    body: [
      "DEBUG google-oauth-callback",
      "code=" + (qp.code || "<none>"),
      "state=" + (qp.state || "<none>"),
      "cookie=" + (event.headers?.cookie || "<none>")
    ].join("\n")
  };
}
    if (!code || !state) return { statusCode: 400, body: "Missing code/state" };

    const cookies = parseCookies(event.headers.cookie || "");
    if (!cookies.g_state || cookies.g_state !== state) return { statusCode: 400, body: "Invalid OAuth state" };

    const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const { tokens } = await oauth2.getToken(code);

    const isHttps = baseUrl.startsWith("https://");
    const setCookies = [];

    if (tokens.refresh_token) {
      setCookies.push(
        `g_refresh=${encodeURIComponent(tokens.refresh_token)}; HttpOnly; Path=/; SameSite=Lax${isHttps ? "; Secure" : ""}`
      );
    } else if (tokens.access_token) {
      const maxAge = tokens.expiry_date ? Math.max(1, Math.floor((tokens.expiry_date - Date.now()) / 1000)) : 3000;
      setCookies.push(
        `g_access=${encodeURIComponent(tokens.access_token)}; Max-Age=${maxAge}; HttpOnly; Path=/; SameSite=Lax${isHttps ? "; Secure" : ""}`
      );
    } else {
      return { statusCode: 400, body: "No refresh_token or access_token returned by Google." };
    }

    setCookies.push("g_state=; Max-Age=0; Path=/; SameSite=Lax");

    return {
      statusCode: 302,
      headers: { "Set-Cookie": setCookies, "Location": "/?google=connected" },
      body: ""
    };
  } catch (e) {
    return { statusCode: 500, body: `OAuth callback error: ${e.message}` };
  }
}

