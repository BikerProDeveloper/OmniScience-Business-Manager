export async function handler() {
  try {
    const token = process.env.NETLIFY_TOKEN;
    const siteId = process.env.SITE_ID;
    if (!token)  return { statusCode: 500, body: "Missing NETLIFY_TOKEN" };
    if (!siteId) return { statusCode: 500, body: "Missing SITE_ID" };

    const res = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys?per_page=50`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const text = await res.text();
    return {
      statusCode: res.status,
      headers: { "content-type": res.headers.get("content-type") || "application/json" },
      body: text
    };
  } catch (e) {
    return { statusCode: 500, body: "netlify-deploys error: " + (e.message || e) };
  }
}
