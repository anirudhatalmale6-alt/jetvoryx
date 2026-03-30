import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      firstName,
      lastName,
      email,
      phone,
      departureCity,
      arrivalCity,
      departureDate,
      returnDate,
      passengers,
      aircraftId,
      specialRequests,
    } = body;

    // Validation
    if (!firstName || !lastName || !email || !departureCity || !arrivalCity || !departureDate || !passengers) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get estimated price if aircraft is selected
    let estimatedPrice: number | null = null;
    if (aircraftId) {
      const aircraft = await prisma.aircraft.findUnique({
        where: { id: aircraftId },
      });
      if (aircraft) {
        estimatedPrice = aircraft.basePricePerHour;
      }
    }

    const tripRequest = await prisma.tripRequest.create({
      data: {
        firstName,
        lastName,
        email,
        phone: phone || null,
        departureCity,
        arrivalCity,
        departureDate: new Date(departureDate),
        returnDate: returnDate ? new Date(returnDate) : null,
        passengers: parseInt(passengers),
        aircraftId: aircraftId || null,
        specialRequests: specialRequests || null,
        estimatedPrice,
        status: 'pending',
        statusHistory: {
          create: {
            status: 'pending',
            note: 'Request submitted',
          },
        },
      },
      include: {
        statusHistory: true,
        aircraft: { include: { type: true } },
      },
    });

    return NextResponse.json({
      id: tripRequest.id,
      status: tripRequest.status,
      createdAt: tripRequest.createdAt,
    }, { status: 201 });
  } catch (error) {
    console.error('Request creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create request' },
      { status: 500 }
    );
  }
}
