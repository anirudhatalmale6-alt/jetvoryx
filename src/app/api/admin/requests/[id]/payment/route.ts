import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import prisma from '@/lib/db';
import Stripe from 'stripe';
import { sendEmail, emailPaymentLink } from '@/lib/email';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-03-25.dahlia',
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const { amount, description } = body;

  const request = await prisma.tripRequest.findUnique({
    where: { id: params.id },
    include: { aircraft: true },
  });

  if (!request) {
    return NextResponse.json({ error: 'Request not found' }, { status: 404 });
  }

  try {
    // Create Stripe payment link
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: description || `JETVORYX Flight: ${request.departureCity} → ${request.arrivalCity}`,
              description: request.aircraft?.name || 'Private Jet Charter',
            },
            unit_amount: Math.round(amount * 100), // cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        requestId: params.id,
      },
      after_completion: {
        type: 'redirect',
        redirect: {
          url: `${process.env.NEXTAUTH_URL || 'http://localhost:3098'}/request/${params.id}?payment=success`,
        },
      },
    });

    // Store payment link
    const payment = await prisma.paymentLink.create({
      data: {
        requestId: params.id,
        stripeUrl: paymentLink.url,
        stripeId: paymentLink.id,
        amount,
        currency: 'usd',
        status: 'pending',
      },
    });

    // Update request status
    await prisma.tripRequest.update({
      where: { id: params.id },
      data: { status: 'payment_sent', estimatedPrice: amount },
    });

    await prisma.statusEvent.create({
      data: {
        requestId: params.id,
        status: 'payment_sent',
        note: `Payment link sent: $${amount.toLocaleString()}`,
      },
    });

    // Send payment link email
    const emailContent = emailPaymentLink({
      firstName: request.firstName,
      departureCity: request.departureCity,
      arrivalCity: request.arrivalCity,
      amount,
      paymentUrl: paymentLink.url,
    });
    sendEmail({ to: request.email, ...emailContent }).catch(console.error);

    return NextResponse.json({ success: true, paymentUrl: paymentLink.url, payment });
  } catch (e) {
    console.error('Stripe error:', e);
    const msg = e instanceof Error ? e.message : 'Stripe error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
