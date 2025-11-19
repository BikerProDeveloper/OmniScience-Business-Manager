const Stripe = require('stripe');

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { amount, currency = 'mxn', paymentMethod } = JSON.parse(event.body);
    
    // Stripe
    if (paymentMethod === 'stripe') {
      const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        automatic_payment_methods: { enabled: true },
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ clientSecret: paymentIntent.client_secret })
      };
    }

    // PayPal order creation
    if (paymentMethod === 'paypal') {
      const auth = Buffer.from(
        `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
      ).toString('base64');

      const paypalOrder = await fetch(`${process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com'}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{
            amount: { currency_code: currency.toUpperCase(), value: amount.toString() }
          }]
        })
      });

      const orderData = await paypalOrder.json();
      return { statusCode: 200, headers, body: JSON.stringify({ id: orderData.id }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid payment method' }) };

  } catch (error) {
    console.error('Payment error:', error);
    return { 
      statusCode: 500, 
      headers,
      body: JSON.stringify({ error: 'Payment processing failed' }) 
    };
  }
};