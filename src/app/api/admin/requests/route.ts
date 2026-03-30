import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 20;

  const where = status && status !== 'all' ? { status } : {};

  const [requests, total] = await Promise.all([
    prisma.tripRequest.findMany({
      where,
      include: {
        aircraft: { select: { name: true, heroImage: true, sourceProvider: true, sourceId: true, type: { select: { name: true } } } },
        statusHistory: { orderBy: { createdAt: 'desc' } },
        paymentLinks: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.tripRequest.count({ where }),
  ]);

  return NextResponse.json({ requests, total, page, totalPages: Math.ceil(total / limit) });
}
