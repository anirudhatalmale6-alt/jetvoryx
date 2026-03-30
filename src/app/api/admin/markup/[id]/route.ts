import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import prisma from '@/lib/db';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const body = await req.json();

  if (body.action === 'toggle') {
    const rule = await prisma.markupRule.findUnique({ where: { id: params.id } });
    if (!rule) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const updated = await prisma.markupRule.update({
      where: { id: params.id },
      data: { active: !rule.active },
    });
    return NextResponse.json(updated);
  }

  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.markupType !== undefined) updateData.markupType = body.markupType;
  if (body.markupValue !== undefined) updateData.markupValue = parseFloat(body.markupValue);
  if (body.priority !== undefined) updateData.priority = parseInt(body.priority);

  const rule = await prisma.markupRule.update({
    where: { id: params.id },
    data: updateData,
  });

  return NextResponse.json(rule);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  await prisma.markupRule.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
