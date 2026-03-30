/* eslint-disable @typescript-eslint/no-explicit-any */
import { AircraftProvider, NormalizedAircraft } from './types';
import * as cheerio from 'cheerio';

/**
 * FlyXO Provider
 *
 * Scrapes real aircraft data from flyxo.com
 * - Fleet page lists aircraft by category with detail page links
 * - Detail pages are Next.js SSG with __NEXT_DATA__ JSON in page source
 * - jetData contains: name, slug, description, details (range/altitude/hours), tecspecs (pax/cabin/baggage), images
 * - Category-level specs (speed) come from fleetExploration on the fleet page
 * - No hourly rates available — uses default market rates by category
 * - No anti-bot protection
 */

const BASE_URL = 'https://flyxo.com';
const CDN_BASE = 'https://website-cdn.flyxo.com/data/webapi/';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const RATE_LIMIT_MS = 500;

// Category mappings (FlyXO category title -> normalized type name)
const CATEGORY_MAP: Record<string, string> = {
  'Turboprop': 'Turboprop',
  'Light': 'Light Jet',
  'Midsize': 'Midsize Jet',
  'Super-Midsize': 'Super Midsize Jet',
  'Large-Cabin': 'Heavy Jet',
  'Ultra-Long-Range': 'Ultra Long Range',
};

// Default hourly rates by normalized category (FlyXO has no pricing)
const DEFAULT_RATES: Record<string, number> = {
  'Turboprop': 2200,
  'Light Jet': 3500,
  'Midsize Jet': 4800,
  'Super Midsize Jet': 5800,
  'Heavy Jet': 7800,
  'Ultra Long Range': 11500,
};

// Fallback Unsplash images by category
const CATEGORY_IMAGES: Record<string, string> = {
  'Turboprop': 'https://images.unsplash.com/photo-1559628233-100c798642d4?w=1200&q=80',
  'Light Jet': 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=1200&q=80',
  'Midsize Jet': 'https://images.unsplash.com/photo-1474302770737-173ee21bab63?w=1200&q=80',
  'Super Midsize Jet': 'https://images.unsplash.com/photo-1583395838144-09af498fda85?w=1200&q=80',
  'Heavy Jet': 'https://images.unsplash.com/photo-1569629743817-70d8db6c323b?w=1200&q=80',
  'Ultra Long Range': 'https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=1200&q=80',
};

// Standard amenities by category
const CATEGORY_AMENITIES: Record<string, string[]> = {
  'Turboprop': ['Climate Control', 'Leather Seating', 'USB Charging', 'Lavatory'],
  'Light Jet': ['Wi-Fi', 'Leather Seating', 'Climate Control', 'USB Charging', 'Lavatory'],
  'Midsize Jet': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Power Outlets', 'Climate Control', 'Leather Seating'],
  'Super Midsize Jet': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Satellite Phone', 'Power Outlets', 'Climate Control', 'Crew Service'],
  'Heavy Jet': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Satellite Phone', 'Power Outlets', 'Climate Control', 'Sleeping Configuration', 'Conference Table'],
  'Ultra Long Range': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Satellite Phone', 'Power Outlets', 'Climate Control', 'Sleeping Configuration', 'Shower', 'Conference Table'],
};

const FEATURED_MODELS = [
  'global 7500', 'global 6000', 'challenger 350', 'gulfstream g550',
  'gulfstream giv', 'citation x', 'falcon 7x',
];

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function extractManufacturer(name: string): string {
  const lower = name.toLowerCase();
  const map: [string, string][] = [
    ['citation', 'Textron Aviation'],
    ['cessna', 'Textron Aviation'],
    ['hawker', 'Textron Aviation'],
    ['king air', 'Textron Aviation'],
    ['gulfstream', 'Gulfstream'],
    ['global', 'Bombardier'],
    ['challenger', 'Bombardier'],
    ['falcon', 'Dassault Aviation'],
    ['legacy', 'Embraer'],
    ['praetor', 'Embraer'],
    ['phenom', 'Embraer'],
    ['pilatus', 'Pilatus'],
  ];
  for (const [key, mfr] of map) {
    if (lower.includes(key)) return mfr;
  }
  return 'Various';
}

/**
 * Parse "8-9 passengers" or "Up to 9" or "7" -> number
 */
function parsePassengers(text: string): number {
  // "8-9 passengers" -> take upper bound
  const rangeMatch = text.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (rangeMatch) return parseInt(rangeMatch[2], 10);
  // "Up to 9"
  const upToMatch = text.match(/up\s*to\s*(\d+)/i);
  if (upToMatch) return parseInt(upToMatch[1], 10);
  // Plain number
  const num = parseInt(text.replace(/[^\d]/g, ''), 10);
  return isNaN(num) ? 0 : num;
}

/**
 * Parse range like "3,300 nm" or "1,450 nm / 2,685 km" -> nautical miles
 */
function parseRange(text: string): number {
  const match = text.match(/([\d,]+)\s*nm/i);
  if (match) return parseFloat(match[1].replace(/,/g, ''));
  // Fallback: first number
  const num = parseFloat(text.replace(/,/g, '').replace(/[^\d.]/g, ''));
  return isNaN(num) ? 0 : num;
}

/**
 * Parse speed like "863 km/h - 1,127 km/h" -> average in knots
 * FlyXO gives km/h, we convert to knots (1 km/h = 0.539957 knots)
 */
function parseSpeedKmh(text: string): number {
  const KMH_TO_KTS = 0.539957;
  const rangeMatch = text.match(/([\d,]+)\s*km\/h\s*[-–]\s*([\d,]+)\s*km\/h/i);
  if (rangeMatch) {
    const low = parseFloat(rangeMatch[1].replace(/,/g, ''));
    const high = parseFloat(rangeMatch[2].replace(/,/g, ''));
    return Math.round(((low + high) / 2) * KMH_TO_KTS);
  }
  const single = text.match(/([\d,]+)\s*km\/h/i);
  if (single) return Math.round(parseFloat(single[1].replace(/,/g, '')) * KMH_TO_KTS);
  return 0;
}

/**
 * Parse feet/inches like "6 ft 1 in" or "25 ft 2 in" -> decimal feet
 */
function parseFeetInches(text: string): number {
  const match = text.match(/(\d+)\s*ft\s*(\d+)?\s*(in)?/i);
  if (match) {
    const feet = parseInt(match[1], 10);
    const inches = match[2] ? parseInt(match[2], 10) : 0;
    return Math.round((feet + inches / 12) * 10) / 10;
  }
  // Try decimal feet like "19.49 ft"
  const decMatch = text.match(/([\d.]+)\s*ft/i);
  if (decMatch) return parseFloat(decMatch[1]);
  return 0;
}

/**
 * Parse baggage like "106 ft³" or "65 ft³" -> cubic feet
 */
function parseBaggage(text: string): number {
  const match = text.match(/([\d,.]+)\s*ft/i);
  if (match) return parseFloat(match[1].replace(/,/g, ''));
  return 0;
}

/**
 * Extract __NEXT_DATA__ JSON from HTML page source
 */
function extractNextData(html: string): any | null {
  const $ = cheerio.load(html);
  const script = $('script#__NEXT_DATA__').html();
  if (!script) return null;
  try {
    return JSON.parse(script);
  } catch {
    return null;
  }
}

async function fetchPage(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${url}`);
  }
  return response.text();
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// Spec helper: find a spec by name in tecspecs/details arrays
function findSpec(specs: any[], name: string): string | null {
  const spec = specs.find((s: any) =>
    s.name?.toLowerCase().includes(name.toLowerCase())
  );
  if (!spec || !spec.descr || !spec.descr[0]) return null;
  return spec.descr[0].name || null;
}

interface FleetCategory {
  title: string;
  normalizedType: string;
  highSpeedCruise: string;
  aircraft: { title: string; url: string }[];
}

export class FlyXOProvider implements AircraftProvider {
  name = 'flyxo';
  enabled = true;

  async fetchAll(): Promise<NormalizedAircraft[]> {
    console.log('[FlyXO] Starting scrape from flyxo.com...');
    const results: NormalizedAircraft[] = [];

    // Step 1: Fetch fleet page and extract category data + aircraft list
    const fleetHtml = await fetchPage(`${BASE_URL}/fleet/`);
    const fleetData = extractNextData(fleetHtml);
    if (!fleetData?.props?.pageProps?.pageContent) {
      console.error('[FlyXO] Could not extract __NEXT_DATA__ from fleet page');
      return results;
    }

    const pageContent = fleetData.props.pageProps.pageContent;
    const fleetExplorationRaw = pageContent.fleetExploration || {};
    const fleetExploration: any[] = fleetExplorationRaw.items || fleetExplorationRaw || [];
    const mostRequestedRaw = pageContent.mostRequestedFleet || {};
    const mostRequested: any[] = mostRequestedRaw.items || mostRequestedRaw || [];

    // Build category lookup with speed data
    const categories: FleetCategory[] = [];
    const aircraftCategoryMap = new Map<string, FleetCategory>();

    for (const cat of fleetExploration) {
      const title = cat.title || '';
      const normalizedType = CATEGORY_MAP[title] || title;
      const speedSpec = (cat.techSpec || []).find((s: any) =>
        s.key?.toLowerCase().includes('speed') || s.key?.toLowerCase().includes('cruise')
      );

      const category: FleetCategory = {
        title,
        normalizedType,
        highSpeedCruise: speedSpec?.value || '',
        aircraft: (cat.aircrafts || []).map((a: any) => ({
          title: a.title || '',
          url: a.url || '',
        })),
      };
      categories.push(category);

      // Map each aircraft slug to its category
      for (const ac of category.aircraft) {
        aircraftCategoryMap.set(ac.title.toLowerCase(), category);
      }
    }

    console.log(`[FlyXO] Found ${categories.length} categories with ${Array.from(aircraftCategoryMap.keys()).length} total aircraft`);

    // Build featured image map from mostRequestedFleet
    const featuredImages = new Map<string, string>();
    for (const item of mostRequested) {
      const headline = item.headline || '';
      const imgUrl = item.imageDesktop?.url || item.imageMobile?.url || '';
      if (headline && imgUrl) {
        const fullUrl = imgUrl.startsWith('http') ? imgUrl : `${CDN_BASE}${imgUrl}`;
        featuredImages.set(headline.toLowerCase(), fullUrl);
      }
    }

    // Step 2: Scrape each aircraft detail page
    for (const category of categories) {
      for (const aircraft of category.aircraft) {
        if (!aircraft.url) {
          console.log(`[FlyXO] Skipping ${aircraft.title} - no detail URL`);
          // Create entry from category-level data only
          const slug = slugify(`flyxo-${aircraft.title}`);
          const catSpeedKts = parseSpeedKmh(category.highSpeedCruise);
          const catRange = findCategoryRange(fleetExploration, category.title);
          const catPax = findCategoryPax(fleetExploration, category.title);

          if (catPax > 0) {
            results.push({
              sourceProvider: this.name,
              sourceId: slug,
              name: aircraft.title,
              slug,
              manufacturer: extractManufacturer(aircraft.title),
              typeName: category.normalizedType,
              yearMin: null,
              yearMax: null,
              maxPassengers: catPax,
              maxRange: catRange,
              cruiseSpeed: catSpeedKts,
              cabinHeight: null,
              cabinWidth: null,
              cabinLength: null,
              baggageVolume: null,
              basePricePerHour: DEFAULT_RATES[category.normalizedType] || 5000,
              heroImage: featuredImages.get(aircraft.title.toLowerCase()) || CATEGORY_IMAGES[category.normalizedType] || CATEGORY_IMAGES['Midsize Jet'],
              images: [],
              description: `The ${aircraft.title} is a ${category.normalizedType.toLowerCase()} available through XO's fleet program.`,
              amenities: CATEGORY_AMENITIES[category.normalizedType] || [],
              featured: FEATURED_MODELS.some(m => aircraft.title.toLowerCase().includes(m)),
            });
          }
          continue;
        }

        try {
          await delay(RATE_LIMIT_MS);
          const detailUrl = aircraft.url.startsWith('http')
            ? aircraft.url
            : `${BASE_URL}${aircraft.url.startsWith('/') ? '' : '/'}${aircraft.url}`;

          console.log(`[FlyXO] Fetching detail: ${detailUrl}`);
          const detailHtml = await fetchPage(detailUrl);
          const detailData = extractNextData(detailHtml);

          if (!detailData?.props?.pageProps?.pageContent?.jetData) {
            console.warn(`[FlyXO] No jetData for ${aircraft.title}`);
            continue;
          }

          const jet = detailData.props.pageProps.pageContent.jetData;
          const details: any[] = jet.details || [];
          const tecspecs: any[] = jet.tecspecs || [];

          // Parse specs
          const paxStr = findSpec(tecspecs, 'passenger') || '';
          const pax = parsePassengers(paxStr);
          const rangeStr = findSpec(details, 'range') || '';
          const range = parseRange(rangeStr);
          const cabinHStr = findSpec(tecspecs, 'cabin height') || '';
          const cabinH = parseFeetInches(cabinHStr);
          const cabinWStr = findSpec(tecspecs, 'cabin width') || '';
          const cabinW = parseFeetInches(cabinWStr);
          const cabinLStr = findSpec(tecspecs, 'cabin length') || '';
          const cabinL = parseFeetInches(cabinLStr);
          const baggageStr = findSpec(tecspecs, 'baggage') || findSpec(tecspecs, 'luggage') || '';
          const baggage = parseBaggage(baggageStr);

          // Speed from category level (detail pages don't have cruise speed)
          const cruiseSpeed = parseSpeedKmh(category.highSpeedCruise);

          // Images from jetData
          const images: string[] = [];
          let heroImage = '';
          if (jet.images && Array.isArray(jet.images)) {
            for (const img of jet.images) {
              const url = img.url || '';
              if (url) {
                const fullUrl = url.startsWith('http') ? url : `${CDN_BASE}${url}`;
                images.push(fullUrl);
                if (!heroImage && !url.toLowerCase().includes('floorplan') && !url.toLowerCase().includes('schema')) {
                  heroImage = fullUrl;
                }
              }
            }
          }
          // Also check schema image
          if (jet.schema?.url) {
            const schemaUrl = jet.schema.url.startsWith('http') ? jet.schema.url : `${CDN_BASE}${jet.schema.url}`;
            images.push(schemaUrl);
          }

          // Fallback: featured image from mostRequestedFleet
          if (!heroImage) {
            heroImage = featuredImages.get(aircraft.title.toLowerCase())
              || CATEGORY_IMAGES[category.normalizedType]
              || CATEGORY_IMAGES['Midsize Jet'];
          }

          const name = jet.name || aircraft.title;
          const slug = slugify(`flyxo-${jet.slug || aircraft.title}`);
          const description = jet.description || `The ${name} is a ${category.normalizedType.toLowerCase()} available through XO's global fleet program.`;
          const isFeatured = FEATURED_MODELS.some(m => name.toLowerCase().includes(m));

          if (pax === 0 && range === 0) {
            console.log(`[FlyXO] Skipping ${name} - no usable specs`);
            continue;
          }

          results.push({
            sourceProvider: this.name,
            sourceId: slug,
            name,
            slug,
            manufacturer: extractManufacturer(name),
            typeName: category.normalizedType,
            yearMin: null,
            yearMax: null,
            maxPassengers: pax,
            maxRange: range,
            cruiseSpeed: cruiseSpeed || estimateSpeed(category.normalizedType),
            cabinHeight: cabinH || null,
            cabinWidth: cabinW || null,
            cabinLength: cabinL || null,
            baggageVolume: baggage || null,
            basePricePerHour: DEFAULT_RATES[category.normalizedType] || 5000,
            heroImage,
            images: images.length > 0 ? images : [heroImage],
            description,
            amenities: CATEGORY_AMENITIES[category.normalizedType] || [],
            featured: isFeatured,
          });

          console.log(`[FlyXO] Scraped: ${name} - ${pax}pax, ${range}NM, ${cruiseSpeed}kts`);
        } catch (e) {
          console.error(`[FlyXO] Failed to scrape ${aircraft.title}:`, e);
        }
      }
    }

    console.log(`[FlyXO] Total normalized: ${results.length}`);
    return results;
  }

  async fetchById(sourceId: string): Promise<NormalizedAircraft | null> {
    const all = await this.fetchAll();
    return all.find(a => a.sourceId === sourceId) || null;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${BASE_URL}/fleet/`, {
        method: 'HEAD',
        headers: { 'User-Agent': USER_AGENT },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

function estimateSpeed(category: string): number {
  const speeds: Record<string, number> = {
    'Turboprop': 300,
    'Light Jet': 400,
    'Midsize Jet': 460,
    'Super Midsize Jet': 480,
    'Heavy Jet': 500,
    'Ultra Long Range': 516,
  };
  return speeds[category] || 450;
}

/**
 * Extract range from category-level techSpec (for aircraft without detail pages)
 */
function findCategoryRange(fleetExploration: any[], categoryTitle: string): number {
  const cat = fleetExploration.find((c: any) => c.title === categoryTitle);
  if (!cat) return 0;
  const rangeSpec = (cat.techSpec || []).find((s: any) =>
    s.key?.toLowerCase().includes('range')
  );
  if (!rangeSpec?.value) return 0;
  // Take upper bound of range like "1,568 - 1,770 nm"
  const matches = rangeSpec.value.match(/([\d,]+)/g);
  if (matches && matches.length >= 2) {
    return parseFloat(matches[matches.length - 1].replace(/,/g, ''));
  }
  if (matches && matches.length === 1) {
    return parseFloat(matches[0].replace(/,/g, ''));
  }
  return 0;
}

/**
 * Extract passenger count from category-level techSpec
 */
function findCategoryPax(fleetExploration: any[], categoryTitle: string): number {
  const cat = fleetExploration.find((c: any) => c.title === categoryTitle);
  if (!cat) return 0;
  const paxSpec = (cat.techSpec || []).find((s: any) =>
    s.key?.toLowerCase().includes('passenger')
  );
  if (!paxSpec?.value) return 0;
  return parsePassengers(paxSpec.value);
}
