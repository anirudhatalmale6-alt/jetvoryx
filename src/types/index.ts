// Frontend-facing types (never includes source fields)

export interface AircraftType {
  id: string;
  name: string;
  description: string | null;
}

export interface Aircraft {
  id: string;
  name: string;
  slug: string;
  type: AircraftType;
  manufacturer: string;
  yearMin: number | null;
  yearMax: number | null;
  maxPassengers: number;
  maxRange: number;
  cruiseSpeed: number;
  cabinHeight: number | null;
  cabinWidth: number | null;
  cabinLength: number | null;
  baggageVolume: number | null;
  displayPricePerHour: number;
  heroImage: string;
  images: string[];
  description: string | null;
  amenities: string[];
  featured: boolean;
}

export interface AircraftSearchParams {
  type?: string;
  minPassengers?: number;
  maxPrice?: number;
  minPrice?: number;
  sort?: 'price_asc' | 'price_desc' | 'capacity' | 'range';
  from?: string;
  to?: string;
  date?: string;
  passengers?: string;
}

export interface TripRequest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  departureCity: string;
  arrivalCity: string;
  departureDate: string;
  returnDate: string | null;
  passengers: number;
  aircraftId: string | null;
  aircraftName: string | null;
  specialRequests: string | null;
  estimatedPrice: number | null;
  status: RequestStatus;
  statusHistory: StatusEvent[];
  createdAt: string;
}

export interface StatusEvent {
  id: string;
  status: RequestStatus;
  note: string | null;
  createdAt: string;
}

export type RequestStatus =
  | 'pending'
  | 'reviewed'
  | 'quoted'
  | 'confirmed'
  | 'payment_sent'
  | 'paid'
  | 'completed'
  | 'cancelled';

export interface TripRequestInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  departureCity: string;
  arrivalCity: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  aircraftId?: string;
  specialRequests?: string;
}
