import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import prisma from '@/lib/db';

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const [
    totalRequests,
    pendingRequests,
    confirmedRequests,
    paidRequests,
    totalAircraft,
    activeAircraft,
    providers,
    recentRequests,
    revenue,
  ] = await Promise.all([
    prisma.tripRequest.count(),
    prisma.tripRequest.count({ where: { status: 'pending' } }),
    prisma.tripRequest.count({ where: { status: 'confirmed' } }),
    prisma.tripRequest.count({ where: { status: { in: ['paid', 'completed'] } } }),
    prisma.aircraft.count(),
    prisma.aircraft.count({ where: { active: true } }),
    prisma.providerConfig.findMany(),
    prisma.tripRequest.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { aircraft: { select: { name: true, type: { select: { name: true } } } } },
    }),
    prisma.tripRequest.aggregate({
      where: { status: { in: ['paid', 'completed'] } },
      _sum: { estimatedPrice: true },
    }),
  ]);

  return NextResponse.json({
    totalRequests,
    pendingRequests,
    confirmedRequests,
    paidRequests,
    totalAircraft,
    activeAircraft,
    providers,
    recentRequests,
    totalRevenue: revenue._sum.estimatedPrice || 0,
  });
}
