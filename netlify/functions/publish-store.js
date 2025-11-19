export async function handler() {
  try {
    const siteId = process.env.SITE_ID || "7d482b1f-ca20-41e4-9658-f6cef99ec742";
    const token  = process.env.NETLIFY_TOKEN;
    if (!token)   return { statusCode: 500, body: "Missing NETLIFY_TOKEN env" };
    if (!siteId)  return { statusCode: 500, body: "Missing SITE_ID env" };

    const res = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/builds`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) {
      const txt = await res.text();
      return { statusCode: res.status, body: `Netlify build error: ${txt}` };
    }
    const data = await res.json();
    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ok: true, id: data.id })
    };
  } catch (e) {
    return { statusCode: 500, body: `publish-store error: ${e.message}` };
  }
}
