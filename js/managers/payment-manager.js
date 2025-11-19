class PaymentManager {
  constructor() {
    this.stripe = null;
    this.elements = null;
  }

  async initializeStripe() {
    if (!window.Stripe) {
      await this.loadStripeJS();
    }
    
    this.stripe = Stripe(process.env.STRIPE_PUBLISHABLE_KEY);
    this.elements = this.stripe.elements();
    
    const cardElement = this.elements.create('card', {
      style: {
        base: {
          color: '#e2e8f0',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          fontSmoothing: 'antialiased',
          fontSize: '16px',
          '::placeholder': { color: '#94a3b8' }
        },
      }
    });
    
    cardElement.mount('#card-element');
    return cardElement;
  }

  async loadStripeJS() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async processStripePayment(amount, currency = 'mxn') {
    try {
      const cardElement = await this.initializeStripe();
      
      const { error, paymentIntent } = await this.stripe.confirmCardPayment(
        await this.getClientSecret(amount, currency, 'stripe'),
        { payment_method: { card: cardElement } }
      );

      if (error) throw error;
      return paymentIntent;
      
    } catch (error) {
      console.error('Stripe payment error:', error);
      throw error;
    }
  }

  async processPayPalPayment(amount, currency = 'MXN') {
    try {
      const order = await this.createPayPalOrder(amount, currency);
      
      return await window.paypal.Buttons({
        style: { layout: 'vertical', color: 'blue' },
        createOrder: () => order.id,
        onApprove: async (data, actions) => {
          const capture = await actions.order.capture();
          return capture;
        },
        onError: (err) => { throw err; }
      }).render('#paypal-button-container');
      
    } catch (error) {
      console.error('PayPal payment error:', error);
      throw error;
    }
  }

  async getClientSecret(amount, currency, paymentMethod) {
    const response = await fetch('/.netlify/functions/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, currency, paymentMethod })
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data.clientSecret;
  }

  async createPayPalOrder(amount, currency) {
    const response = await fetch('/.netlify/functions/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, currency, paymentMethod: 'paypal' })
    });
    
    const data = await response.json();
    if (!response.ok) throw new Error(data.error);
    return data;
  }

  async processOXXOPayment(amount) {
    const response = await fetch('/.netlify/functions/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        amount, 
        currency: 'mxn', 
        paymentMethod: 'oxxo' 
      })
    });
    
    return await response.json();
  }

  async processSPEIPayment(amount, clabe) {
    const response = await fetch('/.netlify/functions/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        amount, 
        currency: 'mxn', 
        paymentMethod: 'spei',
        clabe 
      })
    });
    
    return await response.json();
  }
}
