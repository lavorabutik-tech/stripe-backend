// /api/create-checkout.js
import Stripe from "stripe";
import { URL } from "url";

export const config = {
  api: {
    bodyParser: true,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const FRONTEND_URL = process.env.FRONTEND_URL || "*";

function safeHttpsUrl(maybeUrl) {
  if (!maybeUrl) return null;
  // convert protocol-relative //host/... => https://host/...
  let s = String(maybeUrl).trim();
  if (s.startsWith("//")) s = "https:" + s;
  // allow only https URLs
  try {
    const u = new URL(s);
    if (u.protocol !== "https:") return null;
    return u.toString();
  } catch (e) {
    return null;
  }
}

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", FRONTEND_URL);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    const { product_id, product_title, product_price, product_image } = req.body || {};

    console.log("Incoming create-checkout request:", { product_id, product_title, product_price, product_image });

    if (!product_id || !product_title || typeof product_price === "undefined") {
      return res.status(400).json({ error: "Missing product_id / product_title / product_price" });
    }

    const amount = Math.round(Number(product_price) * 100);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: "Invalid product_price" });
    }

    // sanitize image
    const cleanImage = safeHttpsUrl(product_image);
    const imagesArray = cleanImage ? [cleanImage] : []; // if invalid or missing, send empty

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card", "p24"],
      line_items: [
        {
          price_data: {
            currency: "pln",
            unit_amount: amount,
            product_data: {
              name: product_title,
              images: imagesArray,
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
    // try to return the underlying Stripe message if present
    const message = err?.message || "Server error";
    return res.status(500).json({ error: message });
  }
}

