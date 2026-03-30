import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import prisma from '@/lib/db';
import { sendEmail, emailStatusUpdate } from '@/lib/email';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const request = await prisma.tripRequest.findUnique({
    where: { id: params.id },
    include: {
      aircraft: { include: { type: true } },
      statusHistory: { orderBy: { createdAt: 'desc' } },
      paymentLinks: { orderBy: { createdAt: 'desc' } },
    },
  });

  if (!request) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(request);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const { status, note, estimatedPrice } = body;

  const updateData: Record<string, unknown> = {};
  if (status) updateData.status = status;
  if (estimatedPrice !== undefined) updateData.estimatedPrice = estimatedPrice;

  const request = await prisma.tripRequest.update({
    where: { id: params.id },
    data: updateData,
  });

  if (status) {
    await prisma.statusEvent.create({
      data: {
        requestId: params.id,
        status,
        note: note || null,
      },
    });

    // Send status update email to client
    const emailContent = emailStatusUpdate({
      firstName: request.firstName,
      status,
      departureCity: request.departureCity,
      arrivalCity: request.arrivalCity,
      note: note || undefined,
    });
    sendEmail({ to: request.email, ...emailContent }).catch(console.error);
  }

  return NextResponse.json(request);
}
