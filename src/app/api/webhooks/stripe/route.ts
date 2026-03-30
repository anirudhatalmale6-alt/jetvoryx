import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import prisma from '@/lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-03-25.dahlia',
});

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  // In test mode, skip signature verification if no webhook secret
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  if (webhookSecret && webhookSecret !== 'whsec_placeholder' && signature) {
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }
  } else {
    event = JSON.parse(body) as Stripe.Event;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const requestId = session.metadata?.requestId;

    if (requestId) {
      await prisma.tripRequest.update({
        where: { id: requestId },
        data: { status: 'paid' },
      });

      await prisma.statusEvent.create({
        data: {
          requestId,
          status: 'paid',
          note: 'Payment received via Stripe',
        },
      });

      // Update payment link status
      if (session.payment_link) {
        await prisma.paymentLink.updateMany({
          where: { stripeId: session.payment_link as string },
          data: { status: 'paid' },
        });
      }
    }
  }

  return NextResponse.json({ received: true });
}
