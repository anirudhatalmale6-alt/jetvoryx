import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tripRequest = await prisma.tripRequest.findUnique({
      where: { id: params.id },
      include: {
        statusHistory: {
          orderBy: { createdAt: 'asc' },
        },
        aircraft: {
          include: { type: true },
        },
      },
    });

    if (!tripRequest) {
      return NextResponse.json(
        { error: 'Request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: tripRequest.id,
      firstName: tripRequest.firstName,
      lastName: tripRequest.lastName,
      email: tripRequest.email,
      phone: tripRequest.phone,
      departureCity: tripRequest.departureCity,
      arrivalCity: tripRequest.arrivalCity,
      departureDate: tripRequest.departureDate,
      returnDate: tripRequest.returnDate,
      passengers: tripRequest.passengers,
      aircraftId: tripRequest.aircraftId,
      aircraftName: tripRequest.aircraft?.name || null,
      specialRequests: tripRequest.specialRequests,
      estimatedPrice: tripRequest.estimatedPrice,
      status: tripRequest.status,
      statusHistory: tripRequest.statusHistory.map(event => ({
        id: event.id,
        status: event.status,
        note: event.note,
        createdAt: event.createdAt,
      })),
      createdAt: tripRequest.createdAt,
    });
  } catch (error) {
    console.error('Request fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch request' },
      { status: 500 }
    );
  }
}
