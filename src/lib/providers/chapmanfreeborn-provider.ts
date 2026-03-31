import { AircraftProvider, NormalizedAircraft } from './types';
import * as cheerio from 'cheerio';

/**
 * Chapman Freeborn Provider
 *
 * Scrapes real aircraft data from chapmanfreeborn.aero
 * - Aircraft guide listing page indexes all individual aircraft pages
 * - Detail pages at /private-jet-aircraft-guide/{slug}/ contain specs
 * - SSR HTML, Cloudflare protected - uses respectful 1000ms rate limiting
 */

const BASE_URL = 'https://chapmanfreeborn.aero';
const GUIDE_URL = `${BASE_URL}/private-jet-aircraft-guide/`;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const RATE_LIMIT_MS = 1000;

// Unsplash fallback images by category
const CATEGORY_IMAGES: Record<string, string> = {
  'Light Jet': 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=1200&q=80',
  'Midsize Jet': 'https://images.unsplash.com/photo-1474302770737-173ee21bab63?w=1200&q=80',
  'Super Midsize Jet': 'https://images.unsplash.com/photo-1583395838144-09af498fda85?w=1200&q=80',
  'Heavy Jet': 'https://images.unsplash.com/photo-1569629743817-70d8db6c323b?w=1200&q=80',
  'Ultra Long Range': 'https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=1200&q=80',
};

// Default hourly rates by category
const DEFAULT_RATES: Record<string, number> = {
  'Light Jet': 3200,
  'Midsize Jet': 4500,
  'Super Midsize Jet': 5500,
  'Heavy Jet': 7800,
  'Ultra Long Range': 11000,
};

// Standard amenities by category
const CATEGORY_AMENITIES: Record<string, string[]> = {
  'Light Jet': ['Wi-Fi', 'Leather Seating', 'Climate Control', 'USB Charging', 'Lavatory'],
  'Midsize Jet': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Power Outlets', 'Climate Control', 'Leather Seating'],
  'Super Midsize Jet': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Satellite Phone', 'Power Outlets', 'Climate Control', 'Crew Service'],
  'Heavy Jet': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Satellite Phone', 'Power Outlets', 'Climate Control', 'Sleeping Configuration', 'Conference Table'],
  'Ultra Long Range': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Satellite Phone', 'Power Outlets', 'Climate Control', 'Sleeping Configuration', 'Shower', 'Conference Table'],
};

const FEATURED_MODELS = ['falcon 8x', 'global 7500', 'global 6000', 'gulfstream g550', 'gulfstream gv'];

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function parseNumber(text: string): number {
  return parseFloat(text.replace(/,/g, '').replace(/[^\d.]/g, '')) || 0;
}

function parseFeet(text: string): number {
  // Parse "6' 1\"" or "6ft 1in" or "6.1" format to decimal feet
  const ftInMatch = text.match(/(\d+)[''′ft]*\s*(\d+)?/);
  if (ftInMatch) {
    const feet = parseInt(ftInMatch[1], 10);
    const inches = ftInMatch[2] ? parseInt(ftInMatch[2], 10) : 0;
    return Math.round((feet + inches / 12) * 10) / 10;
  }
  const num = parseFloat(text.replace(/[^\d.]/g, ''));
  return isNaN(num) ? 0 : num;
}

function extractManufacturer(name: string): string {
  const lower = name.toLowerCase();
  const map: Record<string, string> = {
    'cessna': 'Textron Aviation',
    'citation': 'Textron Aviation',
    'hawker': 'Textron Aviation',
    'beechcraft': 'Textron Aviation',
    'gulfstream': 'Gulfstream',
    'global': 'Bombardier',
    'challenger': 'Bombardier',
    'learjet': 'Bombardier',
    'falcon': 'Dassault Aviation',
    'embraer': 'Embraer',
    'phenom': 'Embraer',
    'praetor': 'Embraer',
    'legacy': 'Embraer',
    'lineage': 'Embraer',
    'pilatus': 'Pilatus',
    'bombardier': 'Bombardier',
    'dassault': 'Dassault Aviation',
    'boeing': 'Boeing',
    'airbus': 'Airbus',
  };
  for (const [key, mfr] of Object.entries(map)) {
    if (lower.includes(key)) return mfr;
  }
  return 'Various';
}

function classifyCategory(name: string, bodyText: string): string {
  const lower = name.toLowerCase();
  const text = bodyText.toLowerCase();

  // Check body text for category mentions first
  if (text.includes('ultra long range') || text.includes('ultra-long-range')) return 'Ultra Long Range';
  if (text.includes('super mid') || text.includes('super-mid')) return 'Super Midsize Jet';
  if (text.includes('heavy jet') || text.includes('large jet') || text.includes('large cabin')) return 'Heavy Jet';
  if (text.includes('midsize jet') || text.includes('mid-size jet') || text.includes('medium jet')) return 'Midsize Jet';
  if (text.includes('very light') || text.includes('light jet') || text.includes('entry-level')) return 'Light Jet';

  // Fallback: classify by known model names
  if (/mustang|phenom\s*100|citation\s*m2|honda\s*jet|eclipse/i.test(lower)) return 'Light Jet';
  if (/phenom\s*300|citation\s*(xls|excel|latitude|sovereign)|learjet\s*(45|60|70|75)|hawker/i.test(lower)) return 'Midsize Jet';
  if (/citation\s*(x|longitude)|praetor\s*600|challenger\s*350|legacy\s*(450|500)/i.test(lower)) return 'Super Midsize Jet';
  if (/gulfstream\s*g(iv|450|500|550)|falcon\s*(900|2000)|challenger\s*(600|601|604|605|650)|legacy\s*(600|650)/i.test(lower)) return 'Heavy Jet';
  if (/gulfstream\s*g(v|600|650|700)|global\s*(5000|5500|6000|6500|7500|express|8000)|falcon\s*(7x|8x)|lineage/i.test(lower)) return 'Ultra Long Range';

  // Parse pax/range from body text for heuristic
  const rangeMatch = bodyText.match(/(?:range)[:\s]*([\d,]+)\s*(?:nm|nautical)/i);
  if (rangeMatch) {
    const range = parseNumber(rangeMatch[1]);
    if (range >= 6000) return 'Ultra Long Range';
    if (range >= 4000) return 'Heavy Jet';
    if (range >= 3000) return 'Super Midsize Jet';
    if (range >= 2000) return 'Midsize Jet';
    return 'Light Jet';
  }

  return 'Midsize Jet';
}

function estimateSpeed(category: string): number {
  const speeds: Record<string, number> = {
    'Light Jet': 400,
    'Midsize Jet': 460,
    'Super Midsize Jet': 480,
    'Heavy Jet': 500,
    'Ultra Long Range': 516,
  };
  return speeds[category] || 450;
}

async function fetchPage(url: string): Promise<string | null> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': BASE_URL,
      'Connection': 'keep-alive',
    },
  });

  if (response.status === 403) {
    console.warn(`[ChapmanFreeborn] Cloudflare blocked request to ${url} (403) - skipping`);
    return null;
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${url}`);
  }

  return response.text();
}

interface AircraftLink {
  name: string;
  slug: string;
  detailUrl: string;
}

export class ChapmanFreebornProvider implements AircraftProvider {
  name = 'chapmanfreeborn';
  enabled = true;

  async fetchAll(): Promise<NormalizedAircraft[]> {
    console.log('[ChapmanFreeborn] Starting scrape from chapmanfreeborn.aero...');
    const results: NormalizedAircraft[] = [];

    // Step 1: Scrape the aircraft guide listing page for all detail links
    const aircraftLinks: AircraftLink[] = [];

    try {
      const html = await fetchPage(GUIDE_URL);
      if (!html) {
        console.error('[ChapmanFreeborn] Failed to fetch aircraft guide listing (Cloudflare block)');
        return results;
      }

      const $ = cheerio.load(html);

      // Find all links to aircraft detail pages matching /private-jet-aircraft-guide/{slug}/
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const match = href.match(/\/private-jet-aircraft-guide\/([a-z0-9-]+)\/?$/i);
        if (match) {
          const aircraftSlug = match[1].toLowerCase();
          // Skip the guide page itself or generic links
          if (aircraftSlug === 'private-jet-aircraft-guide' || aircraftSlug.length < 3) return;

          const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;

          // Avoid duplicates
          if (!aircraftLinks.some(a => a.slug === aircraftSlug)) {
            // Derive a display name from the slug
            const name = aircraftSlug
              .split('-')
              .map(w => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' ');

            aircraftLinks.push({
              name,
              slug: aircraftSlug,
              detailUrl: fullUrl.endsWith('/') ? fullUrl : `${fullUrl}/`,
            });
          }
        }
      });

      console.log(`[ChapmanFreeborn] Found ${aircraftLinks.length} aircraft detail links`);
    } catch (e) {
      console.error('[ChapmanFreeborn] Failed to scrape listing page:', e);
      return results;
    }

    // Step 2: Scrape each detail page with rate limiting
    for (const aircraft of aircraftLinks) {
      try {
        await new Promise(r => setTimeout(r, RATE_LIMIT_MS));

        const html = await fetchPage(aircraft.detailUrl);
        if (!html) {
          console.warn(`[ChapmanFreeborn] Skipping ${aircraft.name} - Cloudflare block`);
          continue;
        }

        const $ = cheerio.load(html);
        const bodyText = $('body').text();

        // Classify aircraft category from page content
        const category = classifyCategory(aircraft.name, bodyText);

        // Extract specs via regex on body text
        const paxMatch = bodyText.match(/(?:passenger|pax|seat)\s*(?:capacity|s)?[:\s]*(\d+)/i)
          || bodyText.match(/(\d+)\s*(?:passenger|pax|seat)/i);
        const rangeMatch = bodyText.match(/(?:maximum\s*)?range[:\s]*([\d,]+)\s*(?:nm|nautical\s*miles)/i)
          || bodyText.match(/([\d,]+)\s*(?:nm|nautical\s*miles)\s*(?:range)?/i);
        const speedMatch = bodyText.match(/(?:cruise|cruising|max(?:imum)?)\s*speed[:\s]*([\d,]+)\s*(?:kn|knts|knots|ktas)/i)
          || bodyText.match(/([\d,]+)\s*(?:kn|knots|ktas)\s*(?:cruise|cruising)?/i);
        const baggageMatch = bodyText.match(/baggage[:\s]*([\d,.]+)\s*(?:cu|cubic)/i);

        // Cabin dimensions
        const cabinHMatch = bodyText.match(/(?:cabin\s*)?height[:\s]*([\d]+[''′ft]*\s*\d*)/i);
        const cabinWMatch = bodyText.match(/(?:cabin\s*)?width[:\s]*([\d]+[''′ft]*\s*\d*)/i);
        const cabinLMatch = bodyText.match(/(?:cabin\s*)?length[:\s]*([\d]+[''′ft]*\s*\d*)/i);

        // Also try metric dimensions (meters) and convert to feet
        const cabinHMetric = bodyText.match(/(?:cabin\s*)?height[:\s]*([\d.]+)\s*m(?:eters?|etres?)?/i);
        const cabinWMetric = bodyText.match(/(?:cabin\s*)?width[:\s]*([\d.]+)\s*m(?:eters?|etres?)?/i);
        const cabinLMetric = bodyText.match(/(?:cabin\s*)?length[:\s]*([\d.]+)\s*m(?:eters?|etres?)?/i);

        const pax = paxMatch ? parseInt(paxMatch[1], 10) : 0;
        const range = rangeMatch ? parseNumber(rangeMatch[1]) : 0;
        const speed = speedMatch ? parseNumber(speedMatch[1]) : 0;

        const cabinH = cabinHMatch ? parseFeet(cabinHMatch[1])
          : cabinHMetric ? Math.round(parseFloat(cabinHMetric[1]) * 3.28084 * 10) / 10
          : 0;
        const cabinW = cabinWMatch ? parseFeet(cabinWMatch[1])
          : cabinWMetric ? Math.round(parseFloat(cabinWMetric[1]) * 3.28084 * 10) / 10
          : 0;
        const cabinL = cabinLMatch ? parseFeet(cabinLMatch[1])
          : cabinLMetric ? Math.round(parseFloat(cabinLMetric[1]) * 3.28084 * 10) / 10
          : 0;
        const baggage = baggageMatch ? parseNumber(baggageMatch[1]) : null;

        // Try to get hero image from the page
        let heroImage = '';
        $('img[src]').each((_, img) => {
          const src = $(img).attr('src') || '';
          if (src && !heroImage && !src.includes('logo') && !src.includes('icon') && !src.includes('favicon')
              && (src.includes('aircraft') || src.includes('jet') || src.includes('upload') || src.includes('wp-content')
                  || src.includes('.jpg') || src.includes('.png') || src.includes('.webp'))
              && !src.includes('svg')) {
            heroImage = src.startsWith('http') ? src : `${BASE_URL}${src}`;
          }
        });

        // Extract amenities from body text
        const amenities: string[] = [];
        const amenityKeywords = ['Wi-Fi', 'WiFi', 'Galley', 'Lavatory', 'Entertainment', 'DVD', 'Power Outlets', 'Satellite Phone', 'Shower', 'Conference', 'Sleeping'];
        for (const keyword of amenityKeywords) {
          if (bodyText.toLowerCase().includes(keyword.toLowerCase())) {
            amenities.push(keyword === 'DVD' ? 'Entertainment System' : keyword === 'WiFi' ? 'Wi-Fi' : keyword);
          }
        }

        // Extract year info if available
        const yearMatch = bodyText.match(/(?:first\s*flight|introduced|production|in\s*service)\s*(?:in\s*)?(\d{4})/i);
        const yearMin = yearMatch ? parseInt(yearMatch[1], 10) : null;
        const yearMax = yearMin ? Math.min(yearMin + 20, 2024) : null;

        // Use page title or og:title for a better name
        const pageTitle = $('meta[property="og:title"]').attr('content')
          || $('title').text()
          || '';
        const displayName = pageTitle
          ? pageTitle.replace(/\s*[-|–].*Chapman.*$/i, '').replace(/\s*[-|–].*Private.*$/i, '').trim()
          : aircraft.name;
        const finalName = displayName || aircraft.name;

        const sourceId = `chapmanfreeborn-${aircraft.slug}`;
        const isFeatured = FEATURED_MODELS.some(m => finalName.toLowerCase().includes(m));
        const fallbackImage = CATEGORY_IMAGES[category] || CATEGORY_IMAGES['Midsize Jet'];

        const normalized: NormalizedAircraft = {
          sourceProvider: this.name,
          sourceId,
          name: finalName,
          slug: slugify(`chapmanfreeborn-${aircraft.slug}`),
          manufacturer: extractManufacturer(finalName),
          typeName: category,
          yearMin,
          yearMax,
          maxPassengers: pax,
          maxRange: range,
          cruiseSpeed: speed || estimateSpeed(category),
          cabinHeight: cabinH || null,
          cabinWidth: cabinW || null,
          cabinLength: cabinL || null,
          baggageVolume: baggage,
          basePricePerHour: DEFAULT_RATES[category] || 5000,
          heroImage: heroImage || fallbackImage,
          images: heroImage ? [heroImage] : [fallbackImage],
          description: `The ${finalName} is a ${category.toLowerCase()} available for private charter, offering ${pax > 0 ? `${pax}-passenger capacity` : 'comfortable seating'}${range > 0 ? ` and ${range} NM range` : ''}.`,
          amenities: amenities.length > 0 ? amenities : (CATEGORY_AMENITIES[category] || []),
          featured: isFeatured,
        };

        results.push(normalized);
        console.log(`[ChapmanFreeborn] Scraped: ${finalName} - ${pax}pax, ${range}NM, ${category}`);
      } catch (e) {
        console.error(`[ChapmanFreeborn] Failed to scrape ${aircraft.name}:`, e);
      }
    }

    console.log(`[ChapmanFreeborn] Total normalized: ${results.length}`);
    return results;
  }

  async fetchById(sourceId: string): Promise<NormalizedAircraft | null> {
    // Extract slug from sourceId (format: chapmanfreeborn-{slug})
    const slug = sourceId.replace(/^chapmanfreeborn-/, '');
    if (!slug) return null;

    const detailUrl = `${BASE_URL}/private-jet-aircraft-guide/${slug}/`;

    try {
      const html = await fetchPage(detailUrl);
      if (!html) return null;

      const $ = cheerio.load(html);
      const bodyText = $('body').text();

      const category = classifyCategory(slug, bodyText);

      const paxMatch = bodyText.match(/(?:passenger|pax|seat)\s*(?:capacity|s)?[:\s]*(\d+)/i)
        || bodyText.match(/(\d+)\s*(?:passenger|pax|seat)/i);
      const rangeMatch = bodyText.match(/(?:maximum\s*)?range[:\s]*([\d,]+)\s*(?:nm|nautical\s*miles)/i)
        || bodyText.match(/([\d,]+)\s*(?:nm|nautical\s*miles)\s*(?:range)?/i);
      const speedMatch = bodyText.match(/(?:cruise|cruising|max(?:imum)?)\s*speed[:\s]*([\d,]+)\s*(?:kn|knts|knots|ktas)/i)
        || bodyText.match(/([\d,]+)\s*(?:kn|knots|ktas)/i);

      const pax = paxMatch ? parseInt(paxMatch[1], 10) : 0;
      const range = rangeMatch ? parseNumber(rangeMatch[1]) : 0;
      const speed = speedMatch ? parseNumber(speedMatch[1]) : 0;

      const pageTitle = $('meta[property="og:title"]').attr('content')
        || $('title').text()
        || '';
      const displayName = pageTitle
        ? pageTitle.replace(/\s*[-|–].*Chapman.*$/i, '').replace(/\s*[-|–].*Private.*$/i, '').trim()
        : slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

      let heroImage = '';
      $('img[src]').each((_, img) => {
        const src = $(img).attr('src') || '';
        if (src && !heroImage && !src.includes('logo') && !src.includes('icon') && !src.includes('favicon')
            && !src.includes('svg')) {
          heroImage = src.startsWith('http') ? src : `${BASE_URL}${src}`;
        }
      });

      const fallbackImage = CATEGORY_IMAGES[category] || CATEGORY_IMAGES['Midsize Jet'];
      const isFeatured = FEATURED_MODELS.some(m => displayName.toLowerCase().includes(m));

      return {
        sourceProvider: this.name,
        sourceId,
        name: displayName,
        slug: slugify(`chapmanfreeborn-${slug}`),
        manufacturer: extractManufacturer(displayName),
        typeName: category,
        yearMin: null,
        yearMax: null,
        maxPassengers: pax,
        maxRange: range,
        cruiseSpeed: speed || estimateSpeed(category),
        cabinHeight: null,
        cabinWidth: null,
        cabinLength: null,
        baggageVolume: null,
        basePricePerHour: DEFAULT_RATES[category] || 5000,
        heroImage: heroImage || fallbackImage,
        images: heroImage ? [heroImage] : [fallbackImage],
        description: `The ${displayName} is a ${category.toLowerCase()} available for private charter.`,
        amenities: CATEGORY_AMENITIES[category] || [],
        featured: isFeatured,
      };
    } catch (e) {
      console.error(`[ChapmanFreeborn] fetchById failed for ${sourceId}:`, e);
      return null;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(GUIDE_URL, {
        method: 'HEAD',
        headers: { 'User-Agent': USER_AGENT },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
