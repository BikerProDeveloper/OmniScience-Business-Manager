export async function handler(event) {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    const key = process.env.RESEND_API_KEY;
    if (!key) return { statusCode: 500, body: "Missing RESEND_API_KEY" };

    const { to, subject, html, from } = JSON.parse(event.body || "{}");
    if (!to || !subject || !html) return { statusCode: 400, body: "Required: to, subject, html" };

    // NOTE: from must be a verified sender/domain in Resend (e.g., "Jo <jr_navarro_2012@hotmail.com>")
    const payload = { to: Array.isArray(to) ? to : [to], subject, html, from: from || "Jo <jr_navarro_2012@hotmail.com>" };

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const text = await res.text();
    return { statusCode: res.status, headers: { "content-type": "application/json" }, body: text };
  } catch (e) {
    return { statusCode: 500, body: "email-send error: " + (e.message || e) };
  }
}

