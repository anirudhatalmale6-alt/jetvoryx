import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import prisma from '@/lib/db';

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const rules = await prisma.markupRule.findMany({
    include: { type: true },
    orderBy: { priority: 'desc' },
  });

  const types = await prisma.aircraftType.findMany();

  return NextResponse.json({ rules, types });
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();
  const { name, typeId, aircraftSlug, markupType, markupValue, priority } = body;

  const rule = await prisma.markupRule.create({
    data: {
      name,
      typeId: typeId || null,
      aircraftSlug: aircraftSlug || null,
      markupType: markupType || 'percentage',
      markupValue: parseFloat(markupValue),
      priority: parseInt(priority) || 0,
      active: true,
    },
  });

  return NextResponse.json(rule);
}
