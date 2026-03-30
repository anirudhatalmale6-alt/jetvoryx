export interface NormalizedAircraft {
  sourceProvider: string;
  sourceId: string;
  name: string;
  slug: string;
  manufacturer: string;
  typeName: string;
  yearMin: number | null;
  yearMax: number | null;
  maxPassengers: number;
  maxRange: number;
  cruiseSpeed: number;
  cabinHeight: number | null;
  cabinWidth: number | null;
  cabinLength: number | null;
  baggageVolume: number | null;
  basePricePerHour: number;
  heroImage: string;
  images: string[];
  description: string;
  amenities: string[];
  featured: boolean;
}

export interface AircraftProvider {
  name: string;
  enabled: boolean;
  fetchAll(): Promise<NormalizedAircraft[]>;
  fetchById?(sourceId: string): Promise<NormalizedAircraft | null>;
  healthCheck?(): Promise<boolean>;
}

export interface ProviderStatus {
  name: string;
  enabled: boolean;
  lastFetch: Date | null;
  aircraftCount: number;
  healthy: boolean;
  error: string | null;
}
