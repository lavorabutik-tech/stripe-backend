import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { product_id, product_title, product_price, product_image } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
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
    return res.status(400).json({ error: error.message });
  }
}
