import crypto from "node:crypto";
import { google } from "googleapis";

function getBaseUrl(event) {
  const proto = (event.headers["x-forwarded-proto"] || "http").replace(/:$/, "");
  const host = event.headers.host || "localhost:8888";
  return `${proto}://${host}`;
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

    const oauth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

    const state = crypto.randomBytes(16).toString("hex");
    const scopes = ["openid","email","profile"];

    // Build auth URL
    const authUrl = oauth2.generateAuthUrl({
      access_type: "offline",
      prompt: "consent",
      scope: scopes,
      // response_type defaults to 'code'
      include_granted_scopes: true,
      state,
    });

    // DEBUG mode: return URL instead of redirect
    const qp = event.queryStringParameters || {};
    if (qp.debug === "1") {
      return {
        statusCode: 200,
        headers: { "content-type": "text/plain; charset=utf-8" },
        body: `AUTH_URL=\n${authUrl}\n\nredirect_uri=${redirectUri}\nclient_id=${clientId}\nbaseUrl=${baseUrl}`,
      };
    }

    // CSRF: save state in HttpOnly cookie
    const cookie = `g_state=${state}; HttpOnly; Path=/; SameSite=Lax${
      baseUrl.startsWith("https://") ? "; Secure" : ""
    }`;

    return {
      statusCode: 302,
      headers: {
        Location: authUrl,
        "Set-Cookie": cookie,
      },
      body: "",
    };
  } catch (e) {
    return { statusCode: 500, body: `OAuth start error: ${e.message}` };
  }
}


