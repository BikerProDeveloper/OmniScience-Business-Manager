const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SK, { apiVersion: "2023-10-16" });

async function handler(event) {
  try {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    const body = JSON.parse(event.body || "{}");
    const amount = Number(body.amount);
    const currency = String(body.currency || "usd").toLowerCase();

    if (!amount || amount < 50) {
      return { statusCode: 400, body: "Amount (>=50) in cents is required" };
    }

    const intent = await stripe.paymentIntents.create({
      amount,
      currency,
      automatic_payment_methods: { enabled: true },
    });

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ client_secret: intent.client_secret }),
    };
  } catch (e) {
    return { statusCode: 500, body: "Stripe error: " + (e.message || e) };
  }
}
module.exports = { handler };
