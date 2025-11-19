export async function handler() {
  try {
    const token = process.env.CLOUDFLARE_API_TOKEN;
    if (!token) return { statusCode: 500, body: "Missing CLOUDFLARE_API_TOKEN" };

    const res = await fetch("https://api.cloudflare.com/client/v4/zones", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const text = await res.text();
    return {
      statusCode: res.status,
      headers: { "content-type": res.headers.get("content-type") || "application/json" },
      body: text,
    };
  } catch (e) {
    return { statusCode: 500, body: `Server error: ${e.message}` };
  }
}
