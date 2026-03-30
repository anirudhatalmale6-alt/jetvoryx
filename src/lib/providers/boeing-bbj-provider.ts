import { AircraftProvider, NormalizedAircraft } from './types';

/**
 * Boeing Business Jets (BBJ) Provider
 *
 * Boeing's BBJ line (businessjets.boeing.com) includes ultra-luxury VIP airliners.
 * Their website uses Cloudflare protection and JavaScript rendering.
 * This provider uses Boeing's published BBJ specifications.
 */

const BBJ_FLEET: {
  name: string;
  manufacturer: string;
  pax: number;
  range: number;
  speed: number;
  cabinH: number;
  cabinW: number;
  cabinL: number;
  baggage: number;
  rate: number;
  description: string;
}[] = [
  {
    name: 'Boeing BBJ MAX 7',
    manufacturer: 'Boeing',
    pax: 50,
    range: 7000,
    speed: 470,
    cabinH: 7.1,
    cabinW: 11.6,
    cabinL: 95.0,
    baggage: 500,
    rate: 18000,
    description: 'The BBJ MAX 7 is the newest member of the Boeing Business Jet family, offering intercontinental range with the largest cabin in its class. Featuring next-generation LEAP-1B engines for exceptional fuel efficiency and a cabin that can be customized with private suites, conference rooms, and full entertainment systems.',
  },
  {
    name: 'Boeing BBJ MAX 8',
    manufacturer: 'Boeing',
    pax: 60,
    range: 6325,
    speed: 470,
    cabinH: 7.1,
    cabinW: 11.6,
    cabinL: 105.6,
    baggage: 600,
    rate: 20000,
    description: 'The BBJ MAX 8 offers an even larger cabin footprint with intercontinental range. Perfect for heads of state, corporations, and ultra-high-net-worth individuals requiring the ultimate in airborne luxury with separate living areas, dining rooms, and private offices.',
  },
  {
    name: 'Boeing BBJ 777X',
    manufacturer: 'Boeing',
    pax: 75,
    range: 11000,
    speed: 516,
    cabinH: 7.3,
    cabinW: 19.5,
    cabinL: 195.0,
    baggage: 1000,
    rate: 35000,
    description: 'The BBJ 777X represents the pinnacle of private aviation. With the largest cabin of any business jet and truly global range, it can connect any two cities on Earth. The twin-aisle widebody cabin offers unprecedented customization possibilities including multiple bedrooms, a full master suite, conference center, and even a cinema.',
  },
  {
    name: 'Boeing BBJ 787-8',
    manufacturer: 'Boeing',
    pax: 40,
    range: 9945,
    speed: 516,
    cabinH: 7.4,
    cabinW: 18.0,
    cabinL: 155.0,
    baggage: 800,
    rate: 28000,
    description: 'The BBJ 787-8 Dreamliner brings revolutionary comfort to private aviation. Higher cabin pressure, larger windows, cleaner air, and lower noise create an unmatched passenger experience on ultra-long-range flights. The composite fuselage enables wider windows and a more open cabin feel.',
  },
];

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export class BoeingBBJProvider implements AircraftProvider {
  name = 'boeing-bbj';
  enabled = true;

  async fetchAll(): Promise<NormalizedAircraft[]> {
    console.log('[BoeingBBJ] Loading Boeing Business Jet fleet data...');

    const results: NormalizedAircraft[] = BBJ_FLEET.map(aircraft => {
      const slug = slugify(`bbj-${aircraft.name}`);

      return {
        sourceProvider: this.name,
        sourceId: slug,
        name: aircraft.name,
        slug,
        manufacturer: aircraft.manufacturer,
        typeName: 'Ultra Long Range',
        yearMin: 2020,
        yearMax: 2025,
        maxPassengers: aircraft.pax,
        maxRange: aircraft.range,
        cruiseSpeed: aircraft.speed,
        cabinHeight: aircraft.cabinH,
        cabinWidth: aircraft.cabinW,
        cabinLength: aircraft.cabinL,
        baggageVolume: aircraft.baggage,
        basePricePerHour: aircraft.rate,
        heroImage: 'https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=1200&q=80',
        images: [
          'https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=800&q=80',
          'https://images.unsplash.com/photo-1569629743817-70d8db6c323b?w=800&q=80',
        ],
        description: aircraft.description,
        amenities: [
          'Wi-Fi',
          'Full Galley',
          'Multiple Lavatories',
          'Entertainment System',
          'Satellite Phone',
          'Power Outlets',
          'Climate Control',
          'Sleeping Configuration',
          'Master Suite',
          'Shower',
          'Conference Room',
          'Crew Quarters',
          'Medical Equipment',
        ],
        featured: true,
      };
    });

    console.log(`[BoeingBBJ] Loaded ${results.length} aircraft`);
    return results;
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}
