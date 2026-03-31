import { AircraftProvider, NormalizedAircraft } from './types';
import * as cheerio from 'cheerio';

/**
 * Flexjet Provider
 *
 * Scrapes real aircraft data from flexjet.com
 * - Fleet listing at /en-us/fleet lists all 8 aircraft (7 jets + 1 helicopter)
 * - Detail pages at /en-us/fleet/{slug} have full specs
 * - Next.js SSR on Vercel, no anti-bot protection
 * - Images hosted on flexjet-marketing.cdn.prismic.io
 */

const BASE_URL = 'https://www.flexjet.com';
const FLEET_URL = `${BASE_URL}/en-us/fleet`;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Known fleet slugs for fallback if listing scrape fails
const KNOWN_SLUGS = [
  'phenom-300',
  'challenger-3500',
  'praetor-500',
  'praetor-600',
  'gulfstream-g450',
  'gulfstream-g650',
  'gulfstream-g700',
  'sikorsky-s76',
];

// Unsplash fallback images by category
const CATEGORY_IMAGES: Record<string, string> = {
  'Light Jet': 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=1200&q=80',
  'Midsize Jet': 'https://images.unsplash.com/photo-1474302770737-173ee21bab63?w=1200&q=80',
  'Super Midsize Jet': 'https://images.unsplash.com/photo-1583395838144-09af498fda85?w=1200&q=80',
  'Large Jet': 'https://images.unsplash.com/photo-1569629743817-70d8db6c323b?w=1200&q=80',
  'Ultra Long Range': 'https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=1200&q=80',
  'Helicopter': 'https://images.unsplash.com/photo-1534790566855-4cb788d389ec?w=1200&q=80',
};

// Default hourly rates by category
const DEFAULT_RATES: Record<string, number> = {
  'Light Jet': 3500,
  'Midsize Jet': 4800,
  'Super Midsize Jet': 5800,
  'Large Jet': 7800,
  'Ultra Long Range': 11000,
  'Helicopter': 2500,
};

// Standard amenities by category
const CATEGORY_AMENITIES: Record<string, string[]> = {
  'Light Jet': ['Wi-Fi', 'Leather Seating', 'Climate Control', 'USB Charging', 'Lavatory'],
  'Midsize Jet': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Power Outlets', 'Climate Control', 'Leather Seating'],
  'Super Midsize Jet': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Satellite Phone', 'Power Outlets', 'Climate Control', 'Crew Service'],
  'Large Jet': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Satellite Phone', 'Power Outlets', 'Climate Control', 'Sleeping Configuration', 'Conference Table'],
  'Ultra Long Range': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Satellite Phone', 'Power Outlets', 'Climate Control', 'Sleeping Configuration', 'Shower', 'Conference Table'],
  'Helicopter': ['Leather Seating', 'Climate Control', 'Noise-Cancelling Headsets'],
};

const FEATURED_MODELS = ['gulfstream g650', 'gulfstream g700'];

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function parseNumber(text: string): number {
  return parseFloat(text.replace(/,/g, '').replace(/[^\d.]/g, '')) || 0;
}

function parseFeet(text: string): number {
  // Parse "6' 1\"" or "6.1" or "6 ft 1 in" formats
  const feetInches = text.match(/(\d+)[''′]\s*(\d+)?/);
  if (feetInches) {
    const feet = parseInt(feetInches[1], 10);
    const inches = feetInches[2] ? parseInt(feetInches[2], 10) : 0;
    return Math.round((feet + inches / 12) * 10) / 10;
  }
  const ftIn = text.match(/(\d+)\s*ft\s*(\d+)?\s*in/i);
  if (ftIn) {
    const feet = parseInt(ftIn[1], 10);
    const inches = ftIn[2] ? parseInt(ftIn[2], 10) : 0;
    return Math.round((feet + inches / 12) * 10) / 10;
  }
  const num = parseFloat(text.replace(/[^\d.]/g, ''));
  return isNaN(num) ? 0 : num;
}

function extractManufacturer(name: string): string {
  const lower = name.toLowerCase();
  const map: Record<string, string> = {
    'phenom': 'Embraer',
    'praetor': 'Embraer',
    'challenger': 'Bombardier',
    'global': 'Bombardier',
    'gulfstream': 'Gulfstream',
    'citation': 'Textron Aviation',
    'falcon': 'Dassault Aviation',
    'sikorsky': 'Sikorsky',
  };
  for (const [key, mfr] of Object.entries(map)) {
    if (lower.includes(key)) return mfr;
  }
  return 'Various';
}

function classifyAircraft(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('sikorsky') || lower.includes('s-76') || lower.includes('s76')) return 'Helicopter';
  if (lower.includes('phenom 300') || lower.includes('phenom-300')) return 'Light Jet';
  if (lower.includes('challenger 3500') || lower.includes('challenger-3500')) return 'Super Midsize Jet';
  if (lower.includes('praetor 500') || lower.includes('praetor-500')) return 'Super Midsize Jet';
  if (lower.includes('praetor 600') || lower.includes('praetor-600')) return 'Super Midsize Jet';
  if (lower.includes('g450') || lower.includes('g-450')) return 'Large Jet';
  if (lower.includes('g650') || lower.includes('g-650')) return 'Large Jet';
  if (lower.includes('g700') || lower.includes('g-700')) return 'Ultra Long Range';
  if (lower.includes('large') || lower.includes('heavy')) return 'Large Jet';
  return 'Midsize Jet';
}

function estimateSpeed(category: string): number {
  const speeds: Record<string, number> = {
    'Light Jet': 453,
    'Midsize Jet': 460,
    'Super Midsize Jet': 480,
    'Large Jet': 500,
    'Ultra Long Range': 516,
    'Helicopter': 155,
  };
  return speeds[category] || 460;
}

async function fetchPage(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
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

export class FlexjetProvider implements AircraftProvider {
  name = 'flexjet';
  enabled = true;

  async fetchAll(): Promise<NormalizedAircraft[]> {
    console.log('[Flexjet] Starting scrape from flexjet.com...');
    const results: NormalizedAircraft[] = [];

    // Step 1: Scrape fleet listing page for aircraft links
    let detailSlugs: string[] = [];

    try {
      const html = await fetchPage(FLEET_URL);
      const $ = cheerio.load(html);

      // Find links pointing to /en-us/fleet/{slug}
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const match = href.match(/\/en-us\/fleet\/([a-z0-9-]+)/i);
        if (match && match[1] && !detailSlugs.includes(match[1])) {
          // Exclude the fleet listing itself
          if (match[1] !== 'fleet') {
            detailSlugs.push(match[1]);
          }
        }
      });

      console.log(`[Flexjet] Found ${detailSlugs.length} aircraft from fleet listing`);
    } catch (e) {
      console.error('[Flexjet] Failed to scrape fleet listing, using known slugs:', e);
    }

    // Fallback to known slugs if scraping found nothing
    if (detailSlugs.length === 0) {
      detailSlugs = [...KNOWN_SLUGS];
      console.log(`[Flexjet] Using ${detailSlugs.length} known aircraft slugs as fallback`);
    }

    // Step 2: Scrape each detail page
    for (const slug of detailSlugs) {
      try {
        await delay(600);
        const detailUrl = `${FLEET_URL}/${slug}`;
        const html = await fetchPage(detailUrl);
        const $ = cheerio.load(html);
        const bodyText = $('body').text();

        // Extract aircraft name from page title or heading
        let name = '';
        // Try og:title or page title first
        const ogTitle = $('meta[property="og:title"]').attr('content') || '';
        const pageTitle = $('title').text() || '';
        const h1 = $('h1').first().text().trim();

        if (h1) {
          name = h1;
        } else if (ogTitle) {
          name = ogTitle.split('|')[0].split('-')[0].trim();
        } else if (pageTitle) {
          name = pageTitle.split('|')[0].split('-')[0].trim();
        }

        // Clean up name - remove "Flexjet" prefix/suffix
        name = name.replace(/flexjet\s*/i, '').replace(/\s*flexjet/i, '').trim();

        // Fallback: derive name from slug
        if (!name) {
          name = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        }

        const category = classifyAircraft(name + ' ' + slug);
        const manufacturer = extractManufacturer(name + ' ' + slug);

        // Extract specs from body text using regex
        const paxMatch = bodyText.match(/(?:up\s*to\s*)?(\d+)\s*(?:passenger|pax|seat|guest)/i) ||
                         bodyText.match(/(?:passenger|pax|seat|guest)\s*(?:capacity)?[:\s]*(\d+)/i) ||
                         bodyText.match(/(?:seats?|accommodat\w*)\s*(?:up\s*to\s*)?(\d+)/i);

        const rangeMatch = bodyText.match(/(?:range)[:\s]*([\d,]+)\s*(?:nm|nautical\s*mile)/i) ||
                           bodyText.match(/([\d,]+)\s*(?:nm|nautical\s*mile)\s*(?:range)?/i);

        const speedMatch = bodyText.match(/(?:max(?:imum)?\s*)?(?:cruise\s*)?speed[:\s]*([\d,]+)\s*(?:kn|knts|knots|ktas)/i) ||
                           bodyText.match(/([\d,]+)\s*(?:kn|knts|knots|ktas)/i);

        const baggageMatch = bodyText.match(/baggage[:\s]*([\d,.]+)\s*(?:cu|cubic)/i) ||
                             bodyText.match(/([\d,.]+)\s*(?:cu\.?\s*ft|cubic\s*feet)\s*(?:of\s*)?(?:baggage|luggage|storage)/i);

        // Cabin dimensions
        const cabinHMatch = bodyText.match(/(?:cabin\s*)?height[:\s]*([\d]+[''′]\s*\d*["″]?)/i) ||
                            bodyText.match(/(?:cabin\s*)?height[:\s]*([\d.]+)\s*(?:ft|feet)/i);
        const cabinWMatch = bodyText.match(/(?:cabin\s*)?width[:\s]*([\d]+[''′]\s*\d*["″]?)/i) ||
                            bodyText.match(/(?:cabin\s*)?width[:\s]*([\d.]+)\s*(?:ft|feet)/i);
        const cabinLMatch = bodyText.match(/(?:cabin\s*)?length[:\s]*([\d]+[''′]\s*\d*["″]?)/i) ||
                            bodyText.match(/(?:cabin\s*)?length[:\s]*([\d.]+)\s*(?:ft|feet)/i);

        const pax = paxMatch ? parseInt(paxMatch[1], 10) : 0;
        const range = rangeMatch ? parseNumber(rangeMatch[1]) : 0;
        const speed = speedMatch ? parseNumber(speedMatch[1]) : 0;
        const cabinH = cabinHMatch ? parseFeet(cabinHMatch[1]) : 0;
        const cabinW = cabinWMatch ? parseFeet(cabinWMatch[1]) : 0;
        const cabinL = cabinLMatch ? parseFeet(cabinLMatch[1]) : 0;
        const baggage = baggageMatch ? parseNumber(baggageMatch[1]) : 0;

        // Extract hero image - prefer Prismic CDN images
        let heroImage = '';
        const images: string[] = [];

        $('img[src]').each((_, img) => {
          const src = $(img).attr('src') || '';
          if (src.includes('flexjet-marketing.cdn.prismic.io') && !src.includes('logo') && !src.includes('icon')) {
            if (!heroImage) heroImage = src;
            if (!images.includes(src)) images.push(src);
          }
        });

        // Also check srcset and data-src
        $('img[data-src], img[srcset]').each((_, img) => {
          const dataSrc = $(img).attr('data-src') || '';
          if (dataSrc.includes('flexjet-marketing.cdn.prismic.io') && !images.includes(dataSrc)) {
            if (!heroImage) heroImage = dataSrc;
            images.push(dataSrc);
          }
        });

        // Check for Next.js image patterns
        $('img[src*="/_next/image"]').each((_, img) => {
          const src = $(img).attr('src') || '';
          const urlParam = new URLSearchParams(src.split('?')[1] || '');
          const originalUrl = urlParam.get('url') || '';
          if (originalUrl && originalUrl.includes('prismic') && !images.includes(originalUrl)) {
            if (!heroImage) heroImage = decodeURIComponent(originalUrl);
            images.push(decodeURIComponent(originalUrl));
          }
        });

        // Fallback to Unsplash if no images found
        if (!heroImage) {
          heroImage = CATEGORY_IMAGES[category] || CATEGORY_IMAGES['Midsize Jet'];
        }

        // Extract amenities from page
        const amenities: string[] = [];
        const amenityKeywords = ['Wi-Fi', 'WiFi', 'Galley', 'Lavatory', 'Entertainment', 'Satellite', 'USB', 'Power Outlet', 'Heating', 'Climate Control', 'Sleeping', 'Shower', 'Conference'];
        for (const keyword of amenityKeywords) {
          if (bodyText.toLowerCase().includes(keyword.toLowerCase())) {
            const normalized = keyword === 'WiFi' ? 'Wi-Fi' : keyword;
            if (!amenities.includes(normalized)) amenities.push(normalized);
          }
        }

        // Extract description from meta or first paragraph
        let description = '';
        const metaDesc = $('meta[name="description"]').attr('content') ||
                         $('meta[property="og:description"]').attr('content') || '';
        if (metaDesc) {
          description = metaDesc;
        } else {
          description = `The ${name} is a ${category.toLowerCase()} in the Flexjet fleet, offering premium fractional ownership and charter service${pax ? ` with ${pax}-passenger capacity` : ''}${range ? ` and ${range} NM range` : ''}.`;
        }

        const aircraftSlug = slugify(`flexjet-${slug}`);
        const isFeatured = FEATURED_MODELS.some(m => (name + ' ' + slug).toLowerCase().includes(m));

        const aircraft: NormalizedAircraft = {
          sourceProvider: this.name,
          sourceId: aircraftSlug,
          name,
          slug: aircraftSlug,
          manufacturer,
          typeName: category,
          yearMin: 2018,
          yearMax: 2025,
          maxPassengers: pax || (category === 'Helicopter' ? 6 : 0),
          maxRange: range,
          cruiseSpeed: speed || estimateSpeed(category),
          cabinHeight: cabinH || null,
          cabinWidth: cabinW || null,
          cabinLength: cabinL || null,
          baggageVolume: baggage || null,
          basePricePerHour: DEFAULT_RATES[category] || 5800,
          heroImage,
          images: images.length > 0 ? images : [heroImage],
          description,
          amenities: amenities.length > 0 ? amenities : (CATEGORY_AMENITIES[category] || []),
          featured: isFeatured,
        };

        results.push(aircraft);
        console.log(`[Flexjet] Scraped: ${name} (${category}) - ${pax}pax, ${range}NM, $${aircraft.basePricePerHour}/hr`);
      } catch (e) {
        console.error(`[Flexjet] Failed to scrape ${slug}:`, e);
      }
    }

    console.log(`[Flexjet] Total normalized: ${results.length}`);
    return results;
  }

  async fetchById(sourceId: string): Promise<NormalizedAircraft | null> {
    console.log(`[Flexjet] Fetching aircraft by ID: ${sourceId}`);

    try {
      const allAircraft = await this.fetchAll();
      return allAircraft.find(a => a.sourceId === sourceId || a.slug === sourceId) || null;
    } catch (e) {
      console.error(`[Flexjet] fetchById failed for ${sourceId}:`, e);
      return null;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(FLEET_URL, {
        method: 'HEAD',
        headers: { 'User-Agent': USER_AGENT },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
