// /api/create-checkout.js
import Stripe from "stripe";

export const config = {
  api: {
    bodyParser: true,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const FRONTEND_URL = process.env.FRONTEND_URL || "*"; // set FRONTEND_URL to https://lavorabutik.com in Vercel for security

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", FRONTEND_URL);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    // respond to preflight
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // Basic checks
  try {
    const { product_id, product_title, product_price, product_image } = req.body || {};

    console.log("Incoming create-checkout request:", { product_id, product_title, product_price });

    if (!product_id || !product_title || typeof product_price === "undefined") {
      return res.status(400).json({ error: "Missing product_id/product_title/product_price" });
    }

    const amount = Math.round(Number(product_price) * 100); // cents

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card", "p24", "blik"],
      line_items: [
        {
          price_data: {
            currency: "pln",
            unit_amount: amount,
            product_data: {
              name: product_title,
              images: product_image ? [product_image] : [],
              metadata: { shopify_product_id: product_id },
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${FRONTEND_URL}/pages/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/cart`,
      locale: "pl",
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Stripe error:", err);
    return res.status(500).json({ error: err.message || "Server error" });
  }
}
