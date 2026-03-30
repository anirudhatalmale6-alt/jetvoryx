import { AircraftProvider, NormalizedAircraft } from './types';
import * as cheerio from 'cheerio';

/**
 * GlobalJet Provider
 *
 * Scrapes real aircraft data from globaljet.aero (Drupal CMS, SSR HTML).
 * - Fleet listing at /en/charter with 6 paginated pages (?page=0..5)
 * - Detail pages contain full specs: pax, range, speed, cabin dims, luggage, YOM, equipment
 * - No hourly rates published - uses default market rates by category
 * - No anti-bot protection, standard rate limiting at 600ms
 */

const BASE_URL = 'https://globaljet.aero';
const FLEET_URL = `${BASE_URL}/en/charter`;
const TOTAL_PAGES = 6; // pages 0-5
const RATE_LIMIT_MS = 600;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Default hourly rates by aircraft category (GlobalJet publishes no rates)
const DEFAULT_RATES: Record<string, number> = {
  'Very Light Jet': 2800,
  'Light Jet': 3500,
  'Midsize Jet': 4800,
  'Super Midsize Jet': 5800,
  'Heavy Jet': 7800,
  'Ultra Long Range': 11500,
  'VIP Airliner': 18000,
};

// Unsplash fallback images by category
const CATEGORY_IMAGES: Record<string, { hero: string; gallery: string[] }> = {
  'Very Light Jet': {
    hero: 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=800&q=80',
      'https://images.unsplash.com/photo-1559893773-c2a00f5c1e10?w=800&q=80',
    ],
  },
  'Light Jet': {
    hero: 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=800&q=80',
      'https://images.unsplash.com/photo-1559893773-c2a00f5c1e10?w=800&q=80',
    ],
  },
  'Midsize Jet': {
    hero: 'https://images.unsplash.com/photo-1474302770737-173ee21bab63?w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1474302770737-173ee21bab63?w=800&q=80',
      'https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=800&q=80',
    ],
  },
  'Super Midsize Jet': {
    hero: 'https://images.unsplash.com/photo-1583395838144-09af498fda85?w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1583395838144-09af498fda85?w=800&q=80',
      'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=800&q=80',
    ],
  },
  'Heavy Jet': {
    hero: 'https://images.unsplash.com/photo-1569629743817-70d8db6c323b?w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1569629743817-70d8db6c323b?w=800&q=80',
      'https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=800&q=80',
    ],
  },
  'Ultra Long Range': {
    hero: 'https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=800&q=80',
      'https://images.unsplash.com/photo-1569629743817-70d8db6c323b?w=800&q=80',
    ],
  },
  'VIP Airliner': {
    hero: 'https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=800&q=80',
      'https://images.unsplash.com/photo-1569629743817-70d8db6c323b?w=800&q=80',
    ],
  },
};

// Standard amenities by category (used when detail page amenities are sparse)
const CATEGORY_AMENITIES: Record<string, string[]> = {
  'Very Light Jet': ['Leather Seating', 'Climate Control', 'USB Charging', 'Lavatory'],
  'Light Jet': ['Wi-Fi', 'Leather Seating', 'Climate Control', 'USB Charging', 'Lavatory'],
  'Midsize Jet': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Power Outlets', 'Climate Control', 'Leather Seating'],
  'Super Midsize Jet': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Satellite Phone', 'Power Outlets', 'Climate Control', 'Crew Service'],
  'Heavy Jet': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Satellite Phone', 'Power Outlets', 'Climate Control', 'Sleeping Configuration', 'Conference Table'],
  'Ultra Long Range': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Satellite Phone', 'Power Outlets', 'Climate Control', 'Sleeping Configuration', 'Shower', 'Conference Table'],
  'VIP Airliner': ['Wi-Fi', 'Full Galley', 'Multiple Lavatories', 'Entertainment System', 'Satellite Phone', 'Power Outlets', 'Climate Control', 'Sleeping Configuration', 'Shower', 'Conference Room', 'Crew Rest Area'],
};

// Models that should be featured in the JETVORYX catalog
const FEATURED_MODELS = [
  'falcon 7x', 'falcon 8x', 'falcon 6x', 'falcon 900',
  'global express', 'global 6000', 'global 7500',
  'gulfstream g650', 'gulfstream gv',
  'acj', 'bbj',
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function extractManufacturer(name: string): string {
  const lower = name.toLowerCase();
  const manufacturers: [string, string][] = [
    ['embraer', 'Embraer'],
    ['pilatus', 'Pilatus'],
    ['cessna', 'Textron Aviation'],
    ['citation', 'Textron Aviation'],
    ['dassault', 'Dassault Aviation'],
    ['falcon', 'Dassault Aviation'],
    ['bombardier', 'Bombardier'],
    ['global', 'Bombardier'],
    ['challenger', 'Bombardier'],
    ['gulfstream', 'Gulfstream'],
    ['airbus', 'Airbus'],
    ['acj', 'Airbus'],
    ['boeing', 'Boeing'],
    ['bbj', 'Boeing'],
  ];
  for (const [key, mfr] of manufacturers) {
    if (lower.includes(key)) return mfr;
  }
  return 'Various';
}

/**
 * Classify an aircraft into a jet category based on its model name,
 * passenger count, and range.
 */
function classifyAircraft(name: string, pax: number, range: number): string {
  const lower = name.toLowerCase();

  // VIP airliners
  if (lower.includes('acj') || lower.includes('bbj') || pax >= 25) return 'VIP Airliner';

  // Ultra long range
  if (
    lower.includes('global') ||
    lower.includes('gulfstream gv') ||
    lower.includes('g650') ||
    lower.includes('falcon 7x') ||
    lower.includes('falcon 8x') ||
    lower.includes('falcon 6x') ||
    range >= 5500
  ) return 'Ultra Long Range';

  // Heavy jets
  if (
    lower.includes('falcon 900') ||
    lower.includes('falcon 2000') ||
    lower.includes('challenger 6') ||
    (range >= 3500 && pax >= 10)
  ) return 'Heavy Jet';

  // Super midsize
  if (
    lower.includes('praetor 600') ||
    lower.includes('latitude') ||
    lower.includes('sovereign') ||
    lower.includes('challenger 3') ||
    (range >= 2700 && pax >= 8)
  ) return 'Super Midsize Jet';

  // Midsize
  if (
    lower.includes('praetor 500') ||
    lower.includes('hawker') ||
    lower.includes('learjet') ||
    (range >= 2000 && pax >= 7)
  ) return 'Midsize Jet';

  // Light jets
  if (
    lower.includes('phenom') ||
    lower.includes('citation cj') ||
    lower.includes('pc-24') ||
    lower.includes('pc24') ||
    (range >= 1200 && pax >= 4)
  ) return 'Light Jet';

  // Very light jets
  if (pax <= 4 || range < 1200) return 'Very Light Jet';

  return 'Midsize Jet';
}

/**
 * Parse a metric dimension string like "5.23 m / 17 ft 2 in" and return
 * the value in feet (decimal). Falls back to meters * 3.28084 if no
 * feet format is found.
 */
function parseDimension(text: string): number | null {
  // Try feet+inches: "17 ft 2 in" or "39 ft"
  const ftMatch = text.match(/(\d+)\s*ft\s*(?:(\d+)\s*in)?/i);
  if (ftMatch) {
    const ft = parseInt(ftMatch[1], 10);
    const inches = ftMatch[2] ? parseInt(ftMatch[2], 10) : 0;
    return Math.round((ft + inches / 12) * 10) / 10;
  }
  // Try meters: "5.23 m"
  const mMatch = text.match(/([\d.]+)\s*m(?:\s|\/|$)/i);
  if (mMatch) {
    return Math.round(parseFloat(mMatch[1]) * 3.28084 * 10) / 10;
  }
  return null;
}

/**
 * Parse a volume string like "2.37m3 - 84ft3" and return cubic feet.
 */
function parseVolume(text: string): number | null {
  const ftMatch = text.match(/([\d.]+)\s*ft\s*3/i);
  if (ftMatch) return Math.round(parseFloat(ftMatch[1]));
  const m3Match = text.match(/([\d.]+)\s*m\s*[³3]/i);
  if (m3Match) return Math.round(parseFloat(m3Match[1]) * 35.3147);
  return null;
}

function parseNumber(text: string): number {
  return parseFloat(text.replace(/,/g, '').replace(/[^\d.]/g, '')) || 0;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9',
      'Accept-Language': 'en-US,en;q=0.9',
    },
    redirect: 'follow',
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${url}`);
  }
  return response.text();
}

interface ListingEntry {
  name: string;
  registration: string;
  detailPath: string;
  pax: number;
  range: number;
}

export class GlobalJetProvider implements AircraftProvider {
  name = 'globaljet';
  enabled = true;

  /**
   * Scrape all paginated fleet listing pages and collect aircraft entries.
   */
  private async scrapeListings(): Promise<ListingEntry[]> {
    const entries: ListingEntry[] = [];
    const seenPaths = new Set<string>();

    // GlobalJet lists all aircraft on the main charter page as <a> links
    // Aircraft links follow pattern: /en/{manufacturer-model-registration}
    try {
      await delay(RATE_LIMIT_MS);
      const html = await fetchPage(FLEET_URL);
      const $ = cheerio.load(html);

      // Find all aircraft detail page links
      // They match pattern: /en/{words}-{reg} where reg is like f-hbdx, lx-and, ec-lae
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const path = href.startsWith('http') ? new URL(href).pathname : href;

        // Must start with /en/ and have enough segments to be an aircraft
        if (!path.startsWith('/en/') || path === '/en/charter') return;

        const slug = path.replace('/en/', '').replace(/\/$/, '');
        // Aircraft slugs have hyphens and contain aircraft model keywords
        if (slug.split('-').length < 3) return;
        // Skip known non-aircraft pages
        if (['brokerage', 'contact', 'sales', 'management', 'design', 'careers',
             'sustainability', 'news', 'destinations', 'legal', 'copyrights',
             'terms', 'privacy', 'charter'].some(skip => slug === skip || slug.startsWith(skip + '-'))) return;

        if (seenPaths.has(path)) return;
        seenPaths.add(path);

        // Derive name and registration from slug
        // Format: embraer-phenom-300-f-hbdx or bombardier-challenger-350-lx-gjm
        const parts = slug.split('-');

        // Find registration break: 1-2 char country prefix followed by remaining
        let regIdx = -1;
        for (let i = parts.length - 1; i >= 2; i--) {
          if (parts[i - 1].length <= 2 && /^[a-z\d]+$/i.test(parts[i - 1])) {
            regIdx = i - 1;
            break;
          }
        }

        let aircraftName: string;
        let registration: string;
        if (regIdx > 0) {
          aircraftName = parts.slice(0, regIdx).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
          registration = parts.slice(regIdx).join('-').toUpperCase();
        } else {
          aircraftName = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
          registration = '';
        }

        entries.push({
          name: aircraftName,
          registration,
          detailPath: path,
          pax: 0,
          range: 0,
        });
      });

      console.log(`[GlobalJet] Found ${entries.length} aircraft links on charter page`);
    } catch (err) {
      console.error(`[GlobalJet] Failed to scrape charter page:`, err);
    }

    // Also try paginated pages
    for (let page = 1; page < TOTAL_PAGES; page++) {
      try {
        await delay(RATE_LIMIT_MS);
        const html = await fetchPage(`${FLEET_URL}?page=${page}`);
        const $ = cheerio.load(html);

        $('a[href]').each((_, el) => {
          const href = $(el).attr('href') || '';
          const path = href.startsWith('http') ? new URL(href).pathname : href;
          if (!path.startsWith('/en/') || path === '/en/charter') return;
          const slug = path.replace('/en/', '').replace(/\/$/, '');
          if (slug.split('-').length < 3) return;
          if (['brokerage', 'contact', 'sales', 'management', 'design', 'careers',
               'sustainability', 'news', 'destinations', 'legal', 'copyrights',
               'terms', 'privacy', 'charter'].some(skip => slug === skip || slug.startsWith(skip + '-'))) return;
          if (seenPaths.has(path)) return;
          seenPaths.add(path);

          const parts = slug.split('-');
          let regIdx = -1;
          for (let i = parts.length - 1; i >= 2; i--) {
            if (parts[i - 1].length <= 2 && /^[a-z\d]+$/i.test(parts[i - 1])) {
              regIdx = i - 1;
              break;
            }
          }

          let aircraftName: string;
          let registration: string;
          if (regIdx > 0) {
            aircraftName = parts.slice(0, regIdx).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
            registration = parts.slice(regIdx).join('-').toUpperCase();
          } else {
            aircraftName = parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
            registration = '';
          }

          entries.push({
            name: aircraftName,
            registration,
            detailPath: path,
            pax: 0,
            range: 0,
          });
        });

        console.log(`[GlobalJet] Page ${page + 1}/${TOTAL_PAGES}: ${entries.length} total aircraft collected`);
      } catch (err) {
        console.error(`[GlobalJet] Failed to scrape page ${page}:`, err);
      }
    }

    return entries;
  }

  /**
   * Scrape a single aircraft detail page for full specifications.
   */
  private async scrapeDetail(entry: ListingEntry): Promise<NormalizedAircraft | null> {
    const url = `${BASE_URL}${entry.detailPath}`;
    const html = await fetchPage(url);
    const $ = cheerio.load(html);
    const bodyText = $('body').text();

    // -- Passengers (from listing or detail page) --
    const paxMatch = bodyText.match(/(\d+)\s*pax/i);
    const pax = paxMatch ? parseInt(paxMatch[1], 10) : entry.pax;

    // -- Range --
    const rangeMatch = bodyText.match(/(?:max\.?\s*)?range[:\s]*([\d,]+)\s*(?:nm|Nm)/i);
    const range = rangeMatch ? parseNumber(rangeMatch[1]) : entry.range;

    // -- Speed: "Max. speed: 470 Kts" or "497 kts - 920 kph" --
    const speedMatch = bodyText.match(/(?:max\.?\s*)?speed[:\s]*([\d,]+)\s*(?:kts|knots|kn)/i);
    const speed = speedMatch ? parseNumber(speedMatch[1]) : 0;

    // -- Year of manufacture --
    const yomMatch = bodyText.match(/YOM[:\s]*(\d{4})/i);
    const yom = yomMatch ? parseInt(yomMatch[1], 10) : null;

    // -- Cabin dimensions: "Max. length: 5.23 m / 17 ft 2 in" --
    const lengthMatch = bodyText.match(/(?:max\.?\s*)?length[:\s]*([\d.]+\s*m\s*\/?\s*[\d]+\s*ft\s*(?:\d+\s*in)?)/i);
    const widthMatch = bodyText.match(/(?:max\.?\s*)?width[:\s]*([\d.]+\s*m\s*\/?\s*[\d]+\s*ft\s*(?:\d+\s*in)?)/i);
    const heightMatch = bodyText.match(/(?:max\.?\s*)?height[:\s]*([\d.]+\s*m\s*\/?\s*[\d]+\s*ft\s*(?:\d+\s*in)?)/i);

    const cabinLength = lengthMatch ? parseDimension(lengthMatch[1]) : null;
    const cabinWidth = widthMatch ? parseDimension(widthMatch[1]) : null;
    const cabinHeight = heightMatch ? parseDimension(heightMatch[1]) : null;

    // -- Luggage volume: "2.37m3 - 84ft3" or "4 m³ / 141 ft3" --
    const luggageMatch = bodyText.match(/(?:luggage|baggage)[^]*?([\d.]+\s*m\s*[³3][^]*?[\d.]+\s*ft\s*3)/i);
    const baggage = luggageMatch ? parseVolume(luggageMatch[1]) : null;

    // -- Hero image from Drupal sites/default/files --
    let heroImage = '';
    const images: string[] = [];
    $('img[src*="sites/default/files"]').each((_, img) => {
      const src = $(img).attr('src') || '';
      if (!src || src.includes('logo') || src.includes('icon') || src.includes('.svg')) return;
      const fullSrc = src.startsWith('http') ? src : `${BASE_URL}${src}`;
      if (!heroImage && (src.includes('Exterior') || src.includes('exterior') || images.length === 0)) {
        heroImage = fullSrc;
      }
      if (!images.includes(fullSrc)) {
        images.push(fullSrc);
      }
    });

    // -- Equipment / Amenities --
    const amenities: string[] = [];
    const amenityChecks: [RegExp, string][] = [
      [/wifi[:\s]*yes/i, 'Wi-Fi'],
      [/satphone[:\s]*yes/i, 'Satellite Phone'],
      [/dvd\s*player[:\s]*yes/i, 'Entertainment System'],
      [/ipad|netflix|entertainment/i, 'Entertainment System'],
      [/espresso|coffee\s*machine|galley/i, 'Full Galley'],
      [/microwave|oven/i, 'Full Galley'],
      [/lavatory/i, 'Lavatory'],
      [/bed\s*capacity[:\s]*(?!no)/i, 'Sleeping Configuration'],
      [/(\d+)\s*(?:double|single)\s*(?:bed|berth)/i, 'Sleeping Configuration'],
      [/230\s*v|usb\s*plug|power\s*outlet/i, 'Power Outlets'],
      [/bose|headset/i, 'Noise-Cancelling Headsets'],
      [/pets\s*allowed[:\s]*(?:yes|upon)/i, 'Pet Friendly'],
    ];

    for (const [pattern, label] of amenityChecks) {
      if (pattern.test(bodyText) && !amenities.includes(label)) {
        amenities.push(label);
      }
    }

    // Skip aircraft with no usable data
    if (pax === 0 && range === 0) {
      console.log(`[GlobalJet] Skipping ${entry.name} (${entry.registration}) - no specs found`);
      return null;
    }

    // -- Classify and build normalized aircraft --
    const category = classifyAircraft(entry.name, pax, range);
    const displayName = entry.registration
      ? `${entry.name} (${entry.registration})`
      : entry.name;
    const slug = slugify(`globaljet-${entry.name}-${entry.registration || 'charter'}`);
    const isFeatured = FEATURED_MODELS.some((m) => entry.name.toLowerCase().includes(m));

    const fallbackImages = CATEGORY_IMAGES[category] || CATEGORY_IMAGES['Midsize Jet'];

    // Estimated speed if not found on detail page
    const estimatedSpeed: Record<string, number> = {
      'Very Light Jet': 380,
      'Light Jet': 420,
      'Midsize Jet': 460,
      'Super Midsize Jet': 480,
      'Heavy Jet': 500,
      'Ultra Long Range': 516,
      'VIP Airliner': 500,
    };

    // Build description from scraped content or generate one
    let description = '';
    // Try to extract the first meaningful paragraph from the page
    $('p').each((_, p) => {
      const pText = $(p).text().trim();
      if (
        !description &&
        pText.length > 60 &&
        (pText.toLowerCase().includes('passenger') ||
          pText.toLowerCase().includes('cabin') ||
          pText.toLowerCase().includes('comfort') ||
          pText.toLowerCase().includes('welcome'))
      ) {
        description = pText;
      }
    });

    if (!description) {
      description = `The ${entry.name} from GlobalJet offers premium ${category.toLowerCase()} charter service with ${pax}-passenger capacity and ${range} NM range. Based in Luxembourg, GlobalJet is one of Europe's leading private aviation operators.`;
    }

    return {
      sourceProvider: this.name,
      sourceId: slug,
      name: displayName,
      slug,
      manufacturer: extractManufacturer(entry.name),
      typeName: category,
      yearMin: yom,
      yearMax: yom,
      maxPassengers: pax,
      maxRange: range,
      cruiseSpeed: speed || estimatedSpeed[category] || 460,
      cabinHeight: cabinHeight,
      cabinWidth: cabinWidth,
      cabinLength: cabinLength,
      baggageVolume: baggage,
      basePricePerHour: DEFAULT_RATES[category] || 5800,
      heroImage: heroImage || fallbackImages.hero,
      images: images.length > 0 ? images : fallbackImages.gallery,
      description,
      amenities: amenities.length >= 3 ? amenities : (CATEGORY_AMENITIES[category] || []),
      featured: isFeatured,
    };
  }

  async fetchAll(): Promise<NormalizedAircraft[]> {
    console.log('[GlobalJet] Starting scrape from globaljet.aero...');
    const results: NormalizedAircraft[] = [];

    // Step 1: Collect all aircraft from paginated listing pages
    const entries = await this.scrapeListings();
    console.log(`[GlobalJet] Found ${entries.length} aircraft in fleet listings`);

    // Step 2: Scrape each detail page (rate-limited)
    for (const entry of entries) {
      try {
        await delay(RATE_LIMIT_MS);
        const aircraft = await this.scrapeDetail(entry);
        if (aircraft) {
          results.push(aircraft);
          console.log(
            `[GlobalJet] Scraped: ${aircraft.name} - ${aircraft.maxPassengers}pax, ${aircraft.maxRange}NM, ${aircraft.typeName}`
          );
        }
      } catch (err) {
        console.error(`[GlobalJet] Failed to scrape ${entry.name} (${entry.registration}):`, err);
      }
    }

    console.log(`[GlobalJet] Total normalized: ${results.length} aircraft`);
    return results;
  }

  async fetchById(sourceId: string): Promise<NormalizedAircraft | null> {
    // Attempt to reconstruct the detail path from the sourceId
    // sourceId format: globaljet-{model}-{registration}
    const pathSlug = sourceId.replace(/^globaljet-/, '');
    const detailPath = `/en/${pathSlug}`;

    try {
      const entry: ListingEntry = {
        name: pathSlug.split('-').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' '),
        registration: '',
        detailPath,
        pax: 0,
        range: 0,
      };
      return await this.scrapeDetail(entry);
    } catch {
      console.error(`[GlobalJet] fetchById failed for ${sourceId}`);
      return null;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(FLEET_URL, {
        method: 'HEAD',
        headers: { 'User-Agent': USER_AGENT },
        redirect: 'follow',
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
