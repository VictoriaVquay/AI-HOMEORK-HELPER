require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(bodyParser.json());

const upload = multer({ storage: multer.memoryStorage() });

// === AI CONFIG ===
const useMockAI = !process.env.OPENAI_API_KEY;
let openai;

if (!useMockAI) {
  const OpenAI = require('openai');
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  console.log('✅ Using real OpenAI');
} else {
  console.log('⚠️ Using mock AI mode (no API key)');
}

// === M-PESA CONFIG ===
const consumerKey = process.env.MPESA_CONSUMER_KEY || '';
const consumerSecret = process.env.MPESA_CONSUMER_SECRET || '';
const shortcode = process.env.MPESA_SHORTCODE || '';
const passkey = process.env.MPESA_PASSKEY || '';
const callbackUrl = process.env.MPESA_CALLBACK_URL || 'https://yourdomain.com/mpesa-callback';

const useMockMpesa = !(consumerKey && consumerSecret && shortcode && passkey);

if (useMockMpesa) {
  console.log('⚠️ Using mock M-Pesa mode (no credentials)');
} else {
  console.log('✅ Using real M-Pesa sandbox');
}

// === PAYPAL CONFIG ===
const paypalClientId = process.env.PAYPAL_CLIENT_ID || '';
const paypalSecret = process.env.PAYPAL_SECRET || '';
const paypalWebhookId = process.env.PAYPAL_WEBHOOK_ID || '';

if (!paypalClientId || !paypalSecret) {
  console.log('⚠️ Using mock PayPal mode (no credentials)');
} else {
  console.log('✅ Using real PayPal credentials');
}

// === AIRTEL MONEY ROUTE (Mock, Advanced Validation) ===
app.post('/pay-airtel', async (req, res) => {
  let { phone, amount } = req.body;

  // Check for missing fields
  if (!phone || amount === undefined) {
    return res.status(400).json({
      status: "ERROR",
      message: "Phone and amount are required."
    });
  }

  // Accept 07XXXXXXXX or 2547XXXXXXXX
  const phoneRegex = /^(07\d{8}|2547\d{8})$/;
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({
      status: "ERROR",
      message: "Invalid phone. Use format 07XXXXXXXX or 2547XXXXXXXX."
    });
  }

  // Normalize phone to 2547XXXXXXXX
  if (phone.startsWith('07')) phone = '254' + phone.slice(1);

  // Validate amount is a number and within range
  if (
    typeof amount !== "number" ||
    isNaN(amount) ||
    amount < 10 ||
    amount > 70000
  ) {
    return res.status(400).json({
      status: "ERROR",
      message: "Amount must be a number between 10 and 70,000."
    });
  }

  const transactionId = uuidv4();
  const timestamp = new Date().toISOString();
  console.log(`📦 Mock Airtel Money payment for phone: ${phone}, amount: ${amount}`);
  return res.json({
    transactionId,
    status: "SUCCESS",
    message: "Mock Airtel Money payment accepted.",
    phone,
    amount,
    timestamp
  });
});

console.log('✅ Airtel Money mock endpoint ready');

// === PAYPAL ROUTE (Mock, Advanced Validation & Features) ===
app.post('/pay-paypal', async (req, res) => {
  let { email, amount } = req.body;

  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({
      status: "ERROR",
      message: "Invalid or missing email address."
    });
  }

  // Normalize email to lowercase
  email = email.toLowerCase();

  // Validate amount
  if (
    typeof amount !== "number" ||
    isNaN(amount) ||
    amount < 1 ||
    amount > 10000
  ) {
    return res.status(400).json({
      status: "ERROR",
      message: "Amount must be a number between 1 and 10,000."
    });
  }

  // Custom error simulation: fail if amount is 666
  if (amount === 666) {
    return res.status(400).json({
      status: "FAILED",
      message: "Mock PayPal payment failed: 666 is not allowed (demo error)."
    });
  }

  // Rate limiting: max 3 payments per minute per email
  let logs = [];
  try {
    if (fs.existsSync('paypal_payments.log')) {
      logs = fs.readFileSync('paypal_payments.log', 'utf-8')
        .split('\n')
        .filter(Boolean)
        .map(line => JSON.parse(line));
    }
  } catch (e) {
    logs = [];
  }
  const oneMinuteAgo = Date.now() - 60 * 1000;
  const recentPayments = logs.filter(
    log => log.email === email && new Date(log.timestamp).getTime() > oneMinuteAgo
  );
  if (recentPayments.length >= 3) {
    return res.status(429).json({
      status: "FAILED",
      message: "Rate limit exceeded: Max 3 payments per minute per email."
    });
  }

  // Duplicate detection: same email+amount+reference in log
  const reference = req.body.reference || `PAYPAL-${Math.random().toString(36).substr(2,8).toUpperCase()}`;
  const duplicate = logs.find(
    log => log.email === email && log.amount === amount && log.reference === reference
  );
  if (duplicate) {
    return res.status(409).json({
      status: "FAILED",
      message: "Duplicate payment detected for this email, amount, and reference."
    });
  }

  // Simulate random failure (10% chance)
  if (Math.random() < 0.1) {
    return res.status(500).json({
      status: "FAILED",
      message: "Mock PayPal payment failed due to a simulated error."
    });
  }

  const transactionId = uuidv4();
  const timestamp = new Date().toISOString();
  console.log(`📦 Mock PayPal payment for email: ${email}, amount: ${amount}`);

  // Log transaction
  fs.appendFileSync('paypal_payments.log', JSON.stringify({
    transactionId, email, amount, reference, timestamp
  }) + '\n');

  return res.json({
    transactionId,
    reference,
    status: "SUCCESS",
    message: "Mock PayPal payment accepted.",
    email,
    amount,
    timestamp
  });
});

// === AI ASK ROUTE ===
app.post('/ask', upload.single('photo'), async (req, res) => {
  const question = req.body.question || "What is this?";

  try {
    if (useMockAI) {
      const answer = req.file
        ? `Mock AI: This image looks interesting.`
        : `Mock AI: Here's a sample answer to "${question}".`;
      return res.json({ answer });
    }

    if (req.file) {
      const base64Image = req.file.buffer.toString('base64');
      const mimeType = req.file.mimetype;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: question },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 300,
      });

      return res.json({ answer: completion.choices[0].message.content });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: question }],
      max_tokens: 150,
    });

    res.json({ answer: completion.choices[0].message.content });
  } catch (err) {
    console.error('❌ AI error:', err);
    res.status(500).json({ error: "AI error" });
  }
});

// === M-PESA ROUTE ===
app.post('/pay-mpesa', async (req, res) => {
  const { phone, amount } = req.body;

  if (useMockMpesa) {
    console.log(`📦 Mock M-Pesa payment for phone: ${phone}, amount: ${amount}`);
    return res.json({
      MerchantRequestID: "12345",
      CheckoutRequestID: "MOCK123456789",
      ResponseCode: "0",
      ResponseDescription: "Mock payment accepted",
      CustomerMessage: "This is a mock payment confirmation.",
    });
  }

  try {
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const { data: tokenRes } = await axios.get(
      'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
      { headers: { Authorization: `Basic ${auth}` } }
    );
    const accessToken = tokenRes.access_token;

    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const password = Buffer.from(shortcode + passkey + timestamp).toString('base64');

    const payload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: phone,
      PartyB: shortcode,
      PhoneNumber: phone,
      CallBackURL: callbackUrl,
      AccountReference: "AIHelper",
      TransactionDesc: "AI Homework Helper Payment"
    };

    const { data: mpesaRes } = await axios.post(
      'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
      payload,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    res.json(mpesaRes);
  } catch (err) {
    console.error('❌ M-Pesa error:', err.response?.data || err);
    res.status(500).json({ error: "M-Pesa payment failed" });
  }
});

app.listen(3000, () => console.log('🚀 Server running on http://localhost:3000'));