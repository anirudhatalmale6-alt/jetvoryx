import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getDisplayPrice } from '@/lib/pricing/markup';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const aircraft = await prisma.aircraft.findUnique({
      where: { slug: params.slug },
      include: { type: true },
    });

    if (!aircraft || !aircraft.active) {
      return NextResponse.json(
        { error: 'Aircraft not found' },
        { status: 404 }
      );
    }

    const displayPrice = await getDisplayPrice(
      aircraft.basePricePerHour,
      aircraft.typeId,
      aircraft.slug
    );

    return NextResponse.json({
      id: aircraft.id,
      name: aircraft.name,
      slug: aircraft.slug,
      type: {
        id: aircraft.type.id,
        name: aircraft.type.name,
        description: aircraft.type.description,
      },
      manufacturer: aircraft.manufacturer,
      yearMin: aircraft.yearMin,
      yearMax: aircraft.yearMax,
      maxPassengers: aircraft.maxPassengers,
      maxRange: aircraft.maxRange,
      cruiseSpeed: aircraft.cruiseSpeed,
      cabinHeight: aircraft.cabinHeight,
      cabinWidth: aircraft.cabinWidth,
      cabinLength: aircraft.cabinLength,
      baggageVolume: aircraft.baggageVolume,
      displayPricePerHour: displayPrice,
      heroImage: aircraft.heroImage,
      images: aircraft.images,
      description: aircraft.description,
      amenities: aircraft.amenities,
      featured: aircraft.featured,
    });
  } catch (error) {
    console.error('Aircraft detail error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch aircraft details' },
      { status: 500 }
    );
  }
}
