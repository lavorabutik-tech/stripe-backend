import Stripe from "stripe";

export const config = {
  api: {
    bodyParser: true,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { product_id, product_title, product_price, product_image } = req.body;

    if (!product_id || !product_title || !product_price) {
      return res.status(400).json({ error: "Missing product data" });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",

      // ENABLE P24 + BLIK + CARD
      payment_method_types: ["card", "p24", "blik"],

      line_items: [
        {
          price_data: {
            currency: "pln",
            unit_amount: Math.round(product_price * 100),
            product_data: {
              name: product_title,
              images: [product_image],
              metadata: { shopify_product_id: product_id }
            }
          },
          quantity: 1
        }
      ],

      success_url: "https://lavorabutik.com/pages/thank-you",
      cancel_url: "https://lavorabutik.com/cart"
    });

    return res.status(200).json({ url: session.url });

  } catch (error) {
    console.error("Stripe error:", error);
    return res.status(400).json({ error: error.message });
  }
}
