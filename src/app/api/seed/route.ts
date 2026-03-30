import { NextResponse } from 'next/server';
import { syncAllProviders } from '@/lib/providers/aggregator';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST() {
  try {
    const results = await syncAllProviders();

    // Create default admin if none exists
    const adminCount = await prisma.adminUser.count();
    if (adminCount === 0) {
      const hashedPassword = await bcrypt.hash('jetvoryx2024', 10);
      await prisma.adminUser.create({
        data: {
          email: 'admin@jetvoryx.com',
          password: hashedPassword,
          name: 'Admin',
          role: 'admin',
        },
      });
    }

    // Create default provider configs if none exist
    const providerConfigCount = await prisma.providerConfig.count();
    if (providerConfigCount === 0) {
      await prisma.providerConfig.createMany({
        data: [
          { providerName: 'seed', enabled: true, fetchInterval: 86400, aircraftCount: 0 },
          { providerName: 'charter-extract', enabled: true, fetchInterval: 3600, aircraftCount: 0 },
        ],
      });
    }

    return NextResponse.json({ success: true, providers: results });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 });
  }
}
