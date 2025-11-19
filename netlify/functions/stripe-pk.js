async function handler() {
  try {
    const publishable = process.env.STRIPE_PK || process.env.STRIPE_PUBLISHABLE_KEY;
    if (!publishable) return { statusCode: 500, body: "Missing STRIPE_PK (publishable key)" };
    return {
      statusCode: 200,
      headers: { "content-type": "application/json", "cache-control": "no-store" },
      body: JSON.stringify({ publishable })
    };
  } catch (e) {
    return { statusCode: 500, body: "stripe-pk error: " + (e.message || e) };
  }
}
module.exports = { handler };
