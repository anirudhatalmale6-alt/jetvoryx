import { AircraftProvider, NormalizedAircraft } from './types';

/**
 * NetJets Provider
 *
 * Scrapes real aircraft data from NetJets' Gatsby page-data.json endpoint.
 * - Returns ~17 aircraft with full specs from their compare page
 * - JSON endpoint, no HTML parsing needed
 * - Statute miles converted to nautical miles
 * - No anti-bot protection
 */

const ENDPOINT = 'https://www.netjets.com/page-data/en-us/compare-luxury-private-jets/page-data.json';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const STATUTE_TO_NAUTICAL = 1.15078;

// Unsplash fallback images by category
const CATEGORY_IMAGES: Record<string, string> = {
  'Light Jet': 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=1200&q=80',
  'Midsize Jet': 'https://images.unsplash.com/photo-1474302770737-173ee21bab63?w=1200&q=80',
  'Super Midsize Jet': 'https://images.unsplash.com/photo-1583395838144-09af498fda85?w=1200&q=80',
  'Large Jet': 'https://images.unsplash.com/photo-1569629743817-70d8db6c323b?w=1200&q=80',
  'Long Range': 'https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=1200&q=80',
};

// Default hourly rates (NetJets does not publish rates)
const DEFAULT_RATES: Record<string, number> = {
  'Light Jet': 3500,
  'Midsize Jet': 4800,
  'Super Midsize Jet': 5800,
  'Large Jet': 7800,
  'Long Range': 11000,
};

// Standard amenities by category
const CATEGORY_AMENITIES: Record<string, string[]> = {
  'Light Jet': ['Wi-Fi', 'Leather Seating', 'Climate Control', 'USB Charging', 'Lavatory'],
  'Midsize Jet': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Power Outlets', 'Climate Control', 'Leather Seating'],
  'Super Midsize Jet': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Satellite Phone', 'Power Outlets', 'Climate Control', 'Crew Service'],
  'Large Jet': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Satellite Phone', 'Power Outlets', 'Climate Control', 'Sleeping Configuration', 'Conference Table'],
  'Long Range': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Satellite Phone', 'Power Outlets', 'Climate Control', 'Sleeping Configuration', 'Shower', 'Conference Table'],
};

const FEATURED_MODELS = ['gulfstream g550', 'global 7500', 'global 6000', 'challenger 650'];

// Estimated cruise speeds by category (ktas) for fallback
const CATEGORY_SPEEDS: Record<string, number> = {
  'Light Jet': 400,
  'Midsize Jet': 460,
  'Super Midsize Jet': 480,
  'Large Jet': 500,
  'Long Range': 516,
};

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function extractManufacturer(name: string): string {
  const lower = name.toLowerCase();
  const map: Record<string, string> = {
    'citation': 'Textron Aviation',
    'hawker': 'Textron Aviation',
    'phenom': 'Embraer',
    'praetor': 'Embraer',
    'legacy': 'Embraer',
    'lineage': 'Embraer',
    'gulfstream': 'Gulfstream',
    'global': 'Bombardier',
    'challenger': 'Bombardier',
    'learjet': 'Bombardier',
    'falcon': 'Dassault Aviation',
  };
  for (const [key, mfr] of Object.entries(map)) {
    if (lower.includes(key)) return mfr;
  }
  return 'Various';
}

function classifyCategory(className: string, seats: number, rangeNm: number): string {
  const lower = (className || '').toLowerCase();
  if (lower.includes('light')) return 'Light Jet';
  if (lower.includes('super') && lower.includes('mid')) return 'Super Midsize Jet';
  if (lower.includes('mid')) return 'Midsize Jet';
  if (lower.includes('large') || lower.includes('heavy')) return 'Large Jet';
  if (lower.includes('long') || lower.includes('ultra')) return 'Long Range';

  // Fallback classification by specs
  if (seats <= 7 && rangeNm < 2000) return 'Light Jet';
  if (seats <= 9 && rangeNm < 3500) return 'Midsize Jet';
  if (seats <= 10 && rangeNm < 4500) return 'Super Midsize Jet';
  if (rangeNm >= 5500) return 'Long Range';
  return 'Large Jet';
}

function parseNumber(text: string | number | null | undefined): number {
  if (typeof text === 'number') return text;
  if (!text) return 0;
  return parseFloat(String(text).replace(/,/g, '').replace(/[^\d.]/g, '')) || 0;
}

function statuteToNautical(statuteMiles: number): number {
  return Math.round(statuteMiles / STATUTE_TO_NAUTICAL);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractAircraftFromGatsby(data: any): any[] {
  // Gatsby page-data.json wraps content in result.data or result.pageContext
  // NetJets uses result.pageContext.aircraft
  const pageContext = data?.result?.pageContext;
  if (pageContext?.aircraft && Array.isArray(pageContext.aircraft)) {
    return pageContext.aircraft;
  }

  const pageData = data?.result?.data;
  if (!pageData) return [];

  // Try common Gatsby content node patterns
  // The aircraft list may be in contentfulPage, allContentfulAircraft, etc.
  for (const key of Object.keys(pageData)) {
    const node = pageData[key];

    // Check if it's an array directly
    if (Array.isArray(node)) return node;

    // Check for nodes/edges pattern (Gatsby GraphQL)
    if (node?.nodes && Array.isArray(node.nodes)) return node.nodes;
    if (node?.edges && Array.isArray(node.edges)) {
      return node.edges.map((e: { node: unknown }) => e.node);
    }

    // Check nested content sections for aircraft data
    if (node && typeof node === 'object') {
      for (const subKey of Object.keys(node)) {
        const sub = node[subKey];
        if (Array.isArray(sub) && sub.length > 5) {
          // Likely the aircraft array if it has many entries
          const hasAircraftFields = sub.some(
            (item: Record<string, unknown>) => item && (item.name || item.title || item.aircraftName)
          );
          if (hasAircraftFields) return sub;
        }
        if (sub?.nodes && Array.isArray(sub.nodes)) return sub.nodes;
        if (sub?.edges && Array.isArray(sub.edges)) {
          return sub.edges.map((e: { node: unknown }) => e.node);
        }
      }
    }
  }

  // Deep search: recursively look for arrays with aircraft-like objects
  const candidates: unknown[][] = [];
  function findArrays(obj: unknown, depth: number): void {
    if (depth > 6 || !obj || typeof obj !== 'object') return;
    if (Array.isArray(obj)) {
      if (obj.length >= 5) candidates.push(obj);
      return;
    }
    for (const val of Object.values(obj as Record<string, unknown>)) {
      findArrays(val, depth + 1);
    }
  }
  findArrays(pageData, 0);

  // Pick the largest array that looks like aircraft data
  for (const arr of candidates.sort((a, b) => b.length - a.length)) {
    const sample = arr[0] as Record<string, unknown> | undefined;
    if (sample && typeof sample === 'object' && (sample.name || sample.title || sample.passengers || sample.range)) {
      return arr;
    }
  }

  return [];
}

export class NetJetsProvider implements AircraftProvider {
  name = 'netjets';
  enabled = true;

  private cachedAircraft: NormalizedAircraft[] = [];

  async fetchAll(): Promise<NormalizedAircraft[]> {
    console.log('[NetJets] Starting fetch from page-data.json endpoint...');
    const results: NormalizedAircraft[] = [];

    try {
      const response = await fetch(ENDPOINT, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} fetching ${ENDPOINT}`);
      }

      const data = await response.json();
      const aircraft = extractAircraftFromGatsby(data);

      if (aircraft.length === 0) {
        console.warn('[NetJets] No aircraft found in Gatsby data structure');
        return [];
      }

      console.log(`[NetJets] Found ${aircraft.length} aircraft in Gatsby data`);

      for (const entry of aircraft) {
        try {
          const normalized = this.normalizeAircraft(entry);
          if (normalized) {
            results.push(normalized);
            console.log(`[NetJets] Parsed: ${normalized.name} - ${normalized.maxPassengers}pax, ${normalized.maxRange}NM, ${normalized.cruiseSpeed}ktas`);
          }
        } catch (e) {
          console.error('[NetJets] Failed to normalize aircraft entry:', e);
        }
      }
    } catch (e) {
      console.error('[NetJets] Failed to fetch aircraft data:', e);
    }

    this.cachedAircraft = results;
    console.log(`[NetJets] Total normalized: ${results.length}`);
    return results;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private normalizeAircraft(entry: any): NormalizedAircraft | null {
    // NetJets fields are { type, value } objects - unwrap them
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const v = (field: any): any => {
      if (field && typeof field === 'object' && 'value' in field) return field.value;
      return field;
    };

    // Unwrap potentially nested value objects to plain strings/numbers
    const str = (field: unknown): string => {
      const val = v(field);
      if (typeof val === 'string') return val;
      if (val && typeof val === 'object' && 'name' in val) return String((val as { name: string }).name);
      if (val && typeof val === 'object' && 'value' in val) return String((val as { value: string }).value);
      return val != null ? String(val) : '';
    };
    const num = (field: unknown): number => {
      const val = v(field);
      if (typeof val === 'number') return val;
      return parseNumber(String(val || 0));
    };

    const mfr = str(entry.manufacturer);
    const model = str(entry.model);
    const name = mfr && model ? `${mfr} ${model}` : model || mfr || '';
    if (!name) return null;

    const rawClass = str(entry.cabin_class);
    const seats = num(entry.seats);
    const rangeStatute = num(entry.miles_km);
    const rangeNm = rangeStatute > 0 ? statuteToNautical(rangeStatute) : 0;
    const speed = num(entry.high_speed_cruise);

    const cabinHeight = num(entry.cabin_height) || null;
    const cabinWidth = num(entry.cabin_width) || null;
    const cabinLength = num(entry.cabin_length) || null;
    const baggage = num(entry.baggage_capacity) || null;

    // Image from side_image or spin_images
    let heroImage = '';
    if (entry.side_image?.url) {
      const url = entry.side_image.url;
      heroImage = typeof url === 'string' && url.startsWith('//') ? `https:${url}` : url;
    }

    // Skip entries with no meaningful data
    if (seats === 0 && rangeNm === 0 && speed === 0) return null;

    const category = classifyCategory(rawClass, seats, rangeNm);
    const slug = slugify(`netjets-${name}`);
    const manufacturer = mfr || extractManufacturer(name);
    const isFeatured = FEATURED_MODELS.some(m => name.toLowerCase().includes(m));

    const fallbackImage = CATEGORY_IMAGES[category] || CATEGORY_IMAGES['Large Jet'];
    const finalHeroImage = heroImage || fallbackImage;

    return {
      sourceProvider: 'netjets',
      sourceId: slug,
      name,
      slug,
      manufacturer,
      typeName: category,
      yearMin: 2018,
      yearMax: 2025,
      maxPassengers: seats,
      maxRange: rangeNm,
      cruiseSpeed: speed || CATEGORY_SPEEDS[category] || 460,
      cabinHeight,
      cabinWidth,
      cabinLength,
      baggageVolume: baggage,
      basePricePerHour: DEFAULT_RATES[category] || 5800,
      heroImage: finalHeroImage,
      images: [finalHeroImage],
      description: `The ${name} is a ${category.toLowerCase()} available through NetJets, offering ${seats > 0 ? `${seats}-passenger capacity` : 'premium seating'} and ${rangeNm > 0 ? `${rangeNm} NM range` : 'exceptional range'} for private charter.`,
      amenities: CATEGORY_AMENITIES[category] || CATEGORY_AMENITIES['Large Jet'],
      featured: isFeatured,
    };
  }

  async fetchById(sourceId: string): Promise<NormalizedAircraft | null> {
    try {
      // Use cached data if available
      if (this.cachedAircraft.length > 0) {
        return this.cachedAircraft.find(a => a.sourceId === sourceId) || null;
      }
      // Otherwise fetch all and search
      const all = await this.fetchAll();
      return all.find(a => a.sourceId === sourceId) || null;
    } catch (e) {
      console.error(`[NetJets] fetchById(${sourceId}) failed:`, e);
      return null;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(ENDPOINT, {
        method: 'HEAD',
        headers: { 'User-Agent': USER_AGENT },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
