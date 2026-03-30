import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import prisma from '@/lib/db';
import { getProviderStatuses, syncProvider, getProviders } from '@/lib/providers/aggregator';

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const [statuses, configs] = await Promise.all([
    getProviderStatuses(),
    prisma.providerConfig.findMany(),
  ]);

  // Merge runtime status with stored config
  const merged = statuses.map(s => {
    const config = configs.find(c => c.providerName === s.name);
    return {
      ...s,
      fetchInterval: config?.fetchInterval || 3600,
      lastFetchAt: config?.lastFetchAt || null,
      configId: config?.id || null,
    };
  });

  return NextResponse.json(merged);
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { action, providerName } = await req.json();

  if (action === 'sync') {
    const providers = getProviders();
    const provider = providers.find(p => p.name === providerName);
    if (!provider) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    try {
      const count = await syncProvider(provider);
      await prisma.providerConfig.upsert({
        where: { providerName },
        update: { lastFetchAt: new Date(), lastFetchOk: true, lastError: null, aircraftCount: count },
        create: { providerName, enabled: true, lastFetchAt: new Date(), aircraftCount: count },
      });
      return NextResponse.json({ success: true, synced: count });
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Unknown error';
      await prisma.providerConfig.upsert({
        where: { providerName },
        update: { lastFetchOk: false, lastError: errMsg },
        create: { providerName, enabled: true, lastFetchOk: false, lastError: errMsg },
      });
      return NextResponse.json({ error: errMsg }, { status: 500 });
    }
  }

  if (action === 'toggle') {
    const config = await prisma.providerConfig.findUnique({ where: { providerName } });
    if (!config) {
      return NextResponse.json({ error: 'Config not found' }, { status: 404 });
    }
    await prisma.providerConfig.update({
      where: { providerName },
      data: { enabled: !config.enabled },
    });
    return NextResponse.json({ success: true, enabled: !config.enabled });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
