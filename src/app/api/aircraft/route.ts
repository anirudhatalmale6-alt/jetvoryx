import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getDisplayPrice } from '@/lib/pricing/markup';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const minPax = searchParams.get('minPax');
    const maxPrice = searchParams.get('maxPrice');
    const minPrice = searchParams.get('minPrice');
    const sort = searchParams.get('sort') || 'price_asc';
    const featured = searchParams.get('featured');

    // Build where clause
    const where: Record<string, unknown> = { active: true };

    if (type) {
      where.type = { name: type };
    }

    if (minPax) {
      where.maxPassengers = { gte: parseInt(minPax) };
    }

    if (featured === 'true') {
      where.featured = true;
    }

    const aircraft = await prisma.aircraft.findMany({
      where,
      include: { type: true },
    });

    // Apply markup to each aircraft and strip sensitive fields
    const results = await Promise.all(
      aircraft.map(async (a) => {
        const displayPrice = await getDisplayPrice(
          a.basePricePerHour,
          a.typeId,
          a.slug
        );

        return {
          id: a.id,
          name: a.name,
          slug: a.slug,
          type: {
            id: a.type.id,
            name: a.type.name,
            description: a.type.description,
          },
          manufacturer: a.manufacturer,
          yearMin: a.yearMin,
          yearMax: a.yearMax,
          maxPassengers: a.maxPassengers,
          maxRange: a.maxRange,
          cruiseSpeed: a.cruiseSpeed,
          cabinHeight: a.cabinHeight,
          cabinWidth: a.cabinWidth,
          cabinLength: a.cabinLength,
          baggageVolume: a.baggageVolume,
          displayPricePerHour: displayPrice,
          heroImage: a.heroImage,
          images: a.images,
          description: a.description,
          amenities: a.amenities,
          featured: a.featured,
        };
      })
    );

    // Filter by price range (after markup)
    let filtered = results;
    if (minPrice) {
      filtered = filtered.filter(a => a.displayPricePerHour >= parseInt(minPrice));
    }
    if (maxPrice) {
      filtered = filtered.filter(a => a.displayPricePerHour <= parseInt(maxPrice));
    }

    // Sort
    switch (sort) {
      case 'price_asc':
        filtered.sort((a, b) => a.displayPricePerHour - b.displayPricePerHour);
        break;
      case 'price_desc':
        filtered.sort((a, b) => b.displayPricePerHour - a.displayPricePerHour);
        break;
      case 'capacity':
        filtered.sort((a, b) => b.maxPassengers - a.maxPassengers);
        break;
      case 'range':
        filtered.sort((a, b) => b.maxRange - a.maxRange);
        break;
    }

    return NextResponse.json(filtered);
  } catch (error) {
    console.error('Aircraft fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch aircraft' },
      { status: 500 }
    );
  }
}
