import { AircraftProvider, NormalizedAircraft } from './types';
import * as cheerio from 'cheerio';

/**
 * Air Charter Service Provider
 *
 * Scrapes real aircraft data from aircharter.co.uk
 * - Traditional SSR HTML, no SPA framework
 * - Main listing: /aircraft-guide/private/private-aircraft (top 10 + manufacturer grid)
 * - Detail pages: /aircraft-guide/private/{manufacturer}/{model}
 * - Specs: passengers, range (miles), speed (mph), luggage (ft3), aircraft type
 * - No hourly rates on site - uses default rates by category
 * - No anti-bot protection
 * - 40+ aircraft across all categories
 */

const BASE_URL = 'https://www.aircharter.co.uk';
const LISTING_URL = `${BASE_URL}/aircraft-guide/private/private-aircraft`;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const RATE_LIMIT_MS = 500;

// Known detail page paths to seed the crawl (from listing page + known models)
const SEED_PATHS: string[] = [
  // Top 10 from listing page
  '/aircraft-guide/private/embraer-brazil/embraerlegacy650',
  '/aircraft-guide/private/cessnaaircraftcompany-usa/cessnacitationxlsplus',
  '/aircraft-guide/private/embraer-brazil/embraerphenom300',
  '/aircraft-guide/private/bombardier-canada/bombardierglobalxrs6000',
  '/aircraft-guide/private/cessnaaircraftcompany-usa/cessnacitationcj2andcj2plus',
  '/aircraft-guide/private/bombardier-canada/bombardierchallenger850',
  '/aircraft-guide/private/embraer-brazil/embraerpraetor600',
  '/aircraft-guide/private/hawkerbeechcraftcorp-usa/hawkerbeechcraft900xp',
  '/aircraft-guide/private/gulfstream-usa/gulfstreamv',
  '/aircraft-guide/private/dassault-france/dassaultfalcon900lx',
  // Additional known models to expand coverage
  '/aircraft-guide/private/gulfstream-usa/gulfstreamg550',
  '/aircraft-guide/private/gulfstream-usa/gulfstreamg450',
  '/aircraft-guide/private/gulfstream-usa/gulfstreamg500',
  '/aircraft-guide/private/gulfstream-usa/gulfstreamg650',
  '/aircraft-guide/private/gulfstream-usa/gulfstreamg150',
  '/aircraft-guide/private/gulfstream-usa/gulfstreamiv',
  '/aircraft-guide/private/bombardier-canada/bombardierchallenger300',
  '/aircraft-guide/private/bombardier-canada/bombardierglobal5000',
  '/aircraft-guide/private/bombardier-canada/bombardierglobal7500',
  '/aircraft-guide/private/bombardier-canada/bombardierlearjet45xr',
  '/aircraft-guide/private/cessnaaircraftcompany-usa/cessnacitationmustang',
  '/aircraft-guide/private/cessnaaircraftcompany-usa/cessnacitationx',
  '/aircraft-guide/private/cessnaaircraftcompany-usa/cessnacitationcj3',
  '/aircraft-guide/private/cessnaaircraftcompany-usa/cessnacitationcj4',
  '/aircraft-guide/private/dassault-france/dassaultfalcon20',
  '/aircraft-guide/private/dassault-france/dassaultfalcon8x',
  '/aircraft-guide/private/dassault-france/dassaultfalcon7x',
  '/aircraft-guide/private/dassault-france/dassaultfalcon900exdxlx',
  '/aircraft-guide/private/embraer-brazil/embraerlegacy450',
  '/aircraft-guide/private/embraer-brazil/embraerlegacy600',
  '/aircraft-guide/private/embraer-brazil/embraerphenom100',
  '/aircraft-guide/private/hawkerbeechcraftcorp-usa/hawkerbeechcraftkingair350',
  '/aircraft-guide/private/hawkerbeechcraftcorp-usa/hawkerbeechcraft400xp',
  '/aircraft-guide/private/hawkerbeechcraftcorp-usa/hawkerbeechcraft800xp',
];

// Aircraft type category → default hourly rate (USD)
const DEFAULT_RATES: Record<string, number> = {
  'turboprops': 1800,
  'very light jets': 2500,
  'light jets': 3200,
  'super light jets': 3800,
  'mid size jets': 4500,
  'super mid size jets': 5500,
  'heavy jets': 7500,
  'heavy jets (ultra long range)': 11000,
  'vip/executive airliners': 14000,
};

// Fallback images from Unsplash by category
const CATEGORY_IMAGES: Record<string, string> = {
  'turboprops': 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?w=1200&q=80',
  'very light jets': 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=1200&q=80',
  'light jets': 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=1200&q=80',
  'super light jets': 'https://images.unsplash.com/photo-1474302770737-173ee21bab63?w=1200&q=80',
  'mid size jets': 'https://images.unsplash.com/photo-1474302770737-173ee21bab63?w=1200&q=80',
  'super mid size jets': 'https://images.unsplash.com/photo-1583395838144-09af498fda85?w=1200&q=80',
  'heavy jets': 'https://images.unsplash.com/photo-1569629743817-70d8db6c323b?w=1200&q=80',
  'heavy jets (ultra long range)': 'https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=1200&q=80',
  'vip/executive airliners': 'https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=1200&q=80',
};

const CATEGORY_AMENITIES: Record<string, string[]> = {
  'turboprops': ['Leather Seating', 'Climate Control', 'USB Charging'],
  'very light jets': ['Wi-Fi', 'Leather Seating', 'Climate Control', 'USB Charging'],
  'light jets': ['Wi-Fi', 'Leather Seating', 'Climate Control', 'USB Charging', 'Lavatory'],
  'super light jets': ['Wi-Fi', 'Leather Seating', 'Climate Control', 'USB Charging', 'Lavatory', 'Refreshment Center'],
  'mid size jets': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Power Outlets', 'Climate Control'],
  'super mid size jets': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Satellite Phone', 'Power Outlets', 'Crew Service'],
  'heavy jets': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Satellite Phone', 'Power Outlets', 'Sleeping Configuration', 'Conference Table'],
  'heavy jets (ultra long range)': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Satellite Phone', 'Power Outlets', 'Sleeping Configuration', 'Shower', 'Conference Table'],
  'vip/executive airliners': ['Wi-Fi', 'Full Galley', 'Multiple Lavatories', 'Entertainment System', 'Satellite Phone', 'Power Outlets', 'Sleeping Configuration', 'Shower', 'Conference Room', 'Crew Quarters'],
};

const FEATURED_MODELS = [
  'gulfstream g650', 'gulfstream g550', 'gulfstream v',
  'global 7500', 'global xrs', 'falcon 8x', 'falcon 7x',
  'challenger 850', 'praetor 600', 'legacy 650',
];

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function parseNumber(text: string): number {
  return parseFloat(text.replace(/,/g, '').replace(/[^\d.]/g, '')) || 0;
}

function extractManufacturer(name: string): string {
  const lower = name.toLowerCase();
  const map: Record<string, string> = {
    'citation': 'Textron Aviation', 'cessna': 'Textron Aviation', 'hawker': 'Textron Aviation',
    'beechcraft': 'Textron Aviation', 'beechjet': 'Textron Aviation', 'king air': 'Textron Aviation',
    'learjet': 'Bombardier', 'challenger': 'Bombardier', 'global': 'Bombardier',
    'gulfstream': 'Gulfstream', 'phenom': 'Embraer', 'praetor': 'Embraer',
    'legacy': 'Embraer', 'lineage': 'Embraer', 'embraer': 'Embraer',
    'falcon': 'Dassault Aviation', 'dassault': 'Dassault Aviation',
    'pilatus': 'Pilatus', 'pc-12': 'Pilatus', 'pc-24': 'Pilatus',
    'hondajet': 'Honda Aircraft', 'honda': 'Honda Aircraft',
    'boeing': 'Boeing', 'bbj': 'Boeing',
    'bombardier': 'Bombardier',
  };
  for (const [key, mfr] of Object.entries(map)) {
    if (lower.includes(key)) return mfr;
  }
  return 'Various';
}

/**
 * Map the site's category names to a normalized type for rates/amenities lookup
 */
function normalizeCategory(rawType: string): string {
  const lower = rawType.toLowerCase().trim();
  // Direct match
  if (DEFAULT_RATES[lower] !== undefined) return lower;
  // Fuzzy match
  if (lower.includes('ultra long')) return 'heavy jets (ultra long range)';
  if (lower.includes('vip') || lower.includes('executive airliner')) return 'vip/executive airliners';
  if (lower.includes('super mid')) return 'super mid size jets';
  if (lower.includes('super light')) return 'super light jets';
  if (lower.includes('very light')) return 'very light jets';
  if (lower.includes('heavy')) return 'heavy jets';
  if (lower.includes('mid')) return 'mid size jets';
  if (lower.includes('light')) return 'light jets';
  if (lower.includes('turbo')) return 'turboprops';
  return 'mid size jets'; // safe fallback
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchPage(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    redirect: 'follow',
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} fetching ${url}`);
  return response.text();
}

/**
 * Extract all /aircraft-guide/private/xxx/yyy links from a cheerio page
 */
function extractDetailLinks($: cheerio.CheerioAPI): string[] {
  const links: string[] = [];
  $('a[href*="/aircraft-guide/private/"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    // Match detail pages: /aircraft-guide/private/{manufacturer}/{model}
    const match = href.match(/\/aircraft-guide\/private\/[^/?]+\/[^/?]+/);
    if (match) {
      let path = match[0];
      // Remove trailing slash
      if (path.endsWith('/')) path = path.slice(0, -1);
      links.push(path);
    }
  });
  return links;
}

interface ScrapedSpecs {
  name: string;
  aircraftType: string;
  passengers: number;
  cruiseSpeedMph: number;
  rangeMiles: number;
  luggageFt3: number;
  description: string;
  heroImage: string;
  images: string[];
  relatedLinks: string[];
}

function scrapeDetailPage(html: string): ScrapedSpecs | null {
  const $ = cheerio.load(html);

  // Aircraft name from h1
  const name = $('h1').first().text().trim();
  if (!name || name.length < 2) return null;

  // Parse "Key details" section - look for <strong> labels in list items
  let aircraftType = '';
  let passengers = 0;
  let cruiseSpeedMph = 0;
  let rangeMiles = 0;
  let luggageFt3 = 0;

  // Iterate all <li> or text blocks containing <strong> labels
  $('li, p, div').each((_, el) => {
    const $el = $(el);
    const strong = $el.find('strong').first().text().toLowerCase().trim();
    const fullText = $el.text().trim();

    if (strong.includes('aircraft type')) {
      // Text after the label
      aircraftType = fullText.replace(/aircraft\s*type/i, '').trim();
    } else if (strong.includes('passengers') || strong.includes('passenger')) {
      // "Passengers 7-8" or "Passengers 16"
      const match = fullText.match(/(\d+)\s*[-–]?\s*(\d+)?/);
      if (match) {
        passengers = parseInt(match[2] || match[1], 10); // take upper bound
      }
    } else if (strong.includes('cruise speed')) {
      // "Cruise speed 839 KM/H / 521 MPH"
      const mphMatch = fullText.match(/([\d,]+)\s*mph/i);
      if (mphMatch) cruiseSpeedMph = parseNumber(mphMatch[1]);
    } else if (strong.includes('range')) {
      // "Range 3650 KM / 2268 Miles"
      const milesMatch = fullText.match(/([\d,]+)\s*miles/i);
      if (milesMatch) rangeMiles = parseNumber(milesMatch[1]);
    } else if (strong.includes('luggage') || strong.includes('baggage')) {
      // "Luggage space 84ft³" or "6.4m³ - 226ft³"
      const ft3Match = fullText.match(/([\d,.]+)\s*ft/i);
      if (ft3Match) luggageFt3 = parseNumber(ft3Match[1]);
    }
  });

  if (!aircraftType && passengers === 0 && rangeMiles === 0) {
    return null; // Not a valid detail page
  }

  // Description - first substantial paragraph
  let description = '';
  $('p').each((_, el) => {
    if (description) return;
    const text = $(el).text().trim();
    if (text.length > 80 && !text.includes('cookie') && !text.includes('Cookie')) {
      description = text;
    }
  });

  // Images from aircharterservice.com image CDN
  const images: string[] = [];
  let heroImage = '';
  $('img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src') || '';
    if (src.includes('images.aircharterservice.com') && !src.includes('logo') && !src.includes('icon')) {
      const fullSrc = src.startsWith('http') ? src : `https:${src}`;
      if (!heroImage) heroImage = fullSrc;
      if (!images.includes(fullSrc)) images.push(fullSrc);
    }
  });

  // Collect related aircraft links for crawling
  const relatedLinks = extractDetailLinks($);

  return {
    name,
    aircraftType,
    passengers,
    cruiseSpeedMph,
    rangeMiles,
    luggageFt3,
    description,
    heroImage,
    images,
    relatedLinks,
  };
}

export class AirCharterServiceProvider implements AircraftProvider {
  name = 'aircharterservice';
  enabled = true;

  async fetchAll(): Promise<NormalizedAircraft[]> {
    console.log('[AirCharterService] Starting scrape from aircharter.co.uk...');
    const results: NormalizedAircraft[] = [];
    const visitedPaths = new Set<string>();
    const pendingPaths: string[] = [];

    // Step 1: Scrape listing page for initial aircraft links
    try {
      const listingHtml = await fetchPage(LISTING_URL);
      const $ = cheerio.load(listingHtml);
      const listingLinks = extractDetailLinks($);
      for (const path of listingLinks) {
        if (!visitedPaths.has(path)) {
          pendingPaths.push(path);
          visitedPaths.add(path);
        }
      }
      console.log(`[AirCharterService] Listing page yielded ${pendingPaths.length} aircraft links`);
    } catch (e) {
      console.error('[AirCharterService] Failed to scrape listing page:', e);
    }

    // Step 2: Add seed paths
    for (const path of SEED_PATHS) {
      if (!visitedPaths.has(path)) {
        pendingPaths.push(path);
        visitedPaths.add(path);
      }
    }

    console.log(`[AirCharterService] Total unique paths to scrape: ${pendingPaths.length}`);

    // Step 3: Scrape detail pages, discovering more via related links
    // Process in waves: first all pending, then any newly discovered
    let processed = 0;
    const MAX_AIRCRAFT = 60;

    while (pendingPaths.length > 0 && processed < MAX_AIRCRAFT) {
      const path = pendingPaths.shift()!;
      const url = `${BASE_URL}${path}`;

      try {
        await delay(RATE_LIMIT_MS);
        const html = await fetchPage(url);
        processed++;

        const specs = scrapeDetailPage(html);
        if (!specs) {
          console.log(`[AirCharterService] Skipping ${path} - no specs found`);
          continue;
        }

        // Discover new aircraft from related links
        for (const relLink of specs.relatedLinks) {
          if (!visitedPaths.has(relLink)) {
            pendingPaths.push(relLink);
            visitedPaths.add(relLink);
          }
        }

        // Skip if no meaningful data
        if (specs.passengers === 0 && specs.rangeMiles === 0 && specs.cruiseSpeedMph === 0) {
          console.log(`[AirCharterService] Skipping ${specs.name} - no usable specs`);
          continue;
        }

        const category = normalizeCategory(specs.aircraftType);
        const slug = slugify(`acs-${specs.name}`);
        const sourceId = path.split('/').pop() || slug;
        const isFeatured = FEATURED_MODELS.some(m => specs.name.toLowerCase().includes(m));
        const rate = DEFAULT_RATES[category] || 4500;

        // Convert speed from mph to knots (1 mph = 0.868976 knots)
        const cruiseSpeedKnots = specs.cruiseSpeedMph
          ? Math.round(specs.cruiseSpeedMph * 0.868976)
          : estimateSpeed(category);

        // Convert range from miles to nautical miles (1 mile = 0.868976 nm)
        const rangeNm = specs.rangeMiles
          ? Math.round(specs.rangeMiles * 0.868976)
          : 0;

        const fallbackImage = CATEGORY_IMAGES[category] || CATEGORY_IMAGES['mid size jets'];

        const aircraft: NormalizedAircraft = {
          sourceProvider: this.name,
          sourceId,
          name: specs.name,
          slug,
          manufacturer: extractManufacturer(specs.name),
          typeName: formatTypeName(category),
          yearMin: 2010,
          yearMax: 2025,
          maxPassengers: specs.passengers,
          maxRange: rangeNm,
          cruiseSpeed: cruiseSpeedKnots,
          cabinHeight: null,
          cabinWidth: null,
          cabinLength: null,
          baggageVolume: specs.luggageFt3 || null,
          basePricePerHour: rate,
          heroImage: specs.heroImage || fallbackImage,
          images: specs.images.length > 0 ? specs.images : [fallbackImage],
          description: specs.description || `The ${specs.name} is a ${formatTypeName(category).toLowerCase()} available for private charter. With ${specs.passengers}-passenger capacity and ${specs.rangeMiles.toLocaleString()}-mile range, it delivers exceptional performance and comfort.`,
          amenities: CATEGORY_AMENITIES[category] || CATEGORY_AMENITIES['mid size jets'],
          featured: isFeatured,
        };

        results.push(aircraft);
        console.log(`[AirCharterService] Scraped: ${specs.name} (${formatTypeName(category)}) - ${specs.passengers}pax, ${specs.rangeMiles}mi, ${specs.cruiseSpeedMph}mph, ${specs.luggageFt3}ft³`);
      } catch (e) {
        console.error(`[AirCharterService] Failed to scrape ${url}:`, e);
      }
    }

    console.log(`[AirCharterService] Total normalized: ${results.length} (visited ${processed} pages)`);
    return results;
  }

  async fetchById(sourceId: string): Promise<NormalizedAircraft | null> {
    // Try to find it in the seed paths by matching sourceId
    const matchingPath = SEED_PATHS.find(p => p.endsWith(`/${sourceId}`));
    if (!matchingPath) return null;

    try {
      const url = `${BASE_URL}${matchingPath}`;
      const html = await fetchPage(url);
      const specs = scrapeDetailPage(html);
      if (!specs) return null;

      const category = normalizeCategory(specs.aircraftType);
      const slug = slugify(`acs-${specs.name}`);
      const rate = DEFAULT_RATES[category] || 4500;
      const fallbackImage = CATEGORY_IMAGES[category] || CATEGORY_IMAGES['mid size jets'];

      return {
        sourceProvider: this.name,
        sourceId,
        name: specs.name,
        slug,
        manufacturer: extractManufacturer(specs.name),
        typeName: formatTypeName(category),
        yearMin: 2010,
        yearMax: 2025,
        maxPassengers: specs.passengers,
        maxRange: specs.rangeMiles ? Math.round(specs.rangeMiles * 0.868976) : 0,
        cruiseSpeed: specs.cruiseSpeedMph
          ? Math.round(specs.cruiseSpeedMph * 0.868976)
          : estimateSpeed(category),
        cabinHeight: null,
        cabinWidth: null,
        cabinLength: null,
        baggageVolume: specs.luggageFt3 || null,
        basePricePerHour: rate,
        heroImage: specs.heroImage || fallbackImage,
        images: specs.images.length > 0 ? specs.images : [fallbackImage],
        description: specs.description || `The ${specs.name} is a ${formatTypeName(category).toLowerCase()} available for private charter.`,
        amenities: CATEGORY_AMENITIES[category] || CATEGORY_AMENITIES['mid size jets'],
        featured: FEATURED_MODELS.some(m => specs.name.toLowerCase().includes(m)),
      };
    } catch (e) {
      console.error(`[AirCharterService] Failed to fetch by ID ${sourceId}:`, e);
      return null;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(LISTING_URL, {
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
    'turboprops': 260,
    'very light jets': 340,
    'light jets': 380,
    'super light jets': 410,
    'mid size jets': 430,
    'super mid size jets': 460,
    'heavy jets': 490,
    'heavy jets (ultra long range)': 510,
    'vip/executive airliners': 490,
  };
  return speeds[category] || 430;
}

function formatTypeName(category: string): string {
  const map: Record<string, string> = {
    'turboprops': 'Turboprop',
    'very light jets': 'Very Light Jet',
    'light jets': 'Light Jet',
    'super light jets': 'Super Light Jet',
    'mid size jets': 'Midsize Jet',
    'super mid size jets': 'Super Midsize Jet',
    'heavy jets': 'Heavy Jet',
    'heavy jets (ultra long range)': 'Ultra Long Range',
    'vip/executive airliners': 'VIP Airliner',
  };
  return map[category] || 'Midsize Jet';
}
