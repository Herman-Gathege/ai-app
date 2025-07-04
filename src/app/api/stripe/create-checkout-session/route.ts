// src/app/api/stripe/create-checkout-session/route.ts
import { stripe } from "@/lib/stripe";
import { getUser } from "@/auth/stack";

export async function POST(request: Request) {
  try {
    const { plan } = await request.json();

    const validPlans = ["free", "pro", "team"] as const;
    if (!validPlans.includes(plan)) {
      return new Response("Invalid plan", { status: 400 });
    }

    const { userId } = await getUser();

    const priceMap = {
      free: process.env.STRIPE_PRICE_ID_FREE,
      pro: process.env.STRIPE_PRICE_ID_PRO,
      team: process.env.STRIPE_PRICE_ID_TEAM,
    };

    const selectedPrice = priceMap[plan as keyof typeof priceMap];
    if (!selectedPrice) {
      return new Response("Stripe price ID not configured", { status: 500 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: selectedPrice,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      metadata: {
        userId,
        plan,
      },
    });

    return Response.json({ url: session.url });
  } catch (error: any) {
    console.error("❌ Stripe checkout session error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
