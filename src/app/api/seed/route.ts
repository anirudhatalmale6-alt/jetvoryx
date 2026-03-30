import { NextResponse } from 'next/server';
import { syncAllProviders } from '@/lib/providers/aggregator';

export async function POST() {
  try {
    const results = await syncAllProviders();
    return NextResponse.json({ success: true, synced: results });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to seed data' },
      { status: 500 }
    );
  }
}
