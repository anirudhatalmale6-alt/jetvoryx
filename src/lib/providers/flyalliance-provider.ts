import { AircraftProvider, NormalizedAircraft } from './types';
import * as cheerio from 'cheerio';

/**
 * Fly Alliance Provider
 *
 * Scrapes real aircraft data from flyalliance.com
 * - Category pages list individual aircraft with tail numbers
 * - Detail pages have full specs: pax, range, speed, cabin dims, baggage, amenities
 * - Server-side rendered (Elementor/WordPress), Cheerio-parseable
 */

const BASE_URL = 'https://www.flyalliance.com';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const CATEGORY_PAGES: { url: string; type: string }[] = [
  { url: `${BASE_URL}/light-jets-2/`, type: 'Light Jet' },
  { url: `${BASE_URL}/midsize-jets/`, type: 'Midsize Jet' },
  { url: `${BASE_URL}/super-midsize-jets/`, type: 'Super Midsize Jet' },
  { url: `${BASE_URL}/heavy-jets/`, type: 'Heavy Jet' },
  { url: `${BASE_URL}/ultra-long-range-jets/`, type: 'Ultra Long Range' },
];

// Category images (luxury stock photos)
const CATEGORY_IMAGES: Record<string, string> = {
  'Light Jet': 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=1200&q=80',
  'Midsize Jet': 'https://images.unsplash.com/photo-1474302770737-173ee21bab63?w=1200&q=80',
  'Super Midsize Jet': 'https://images.unsplash.com/photo-1583395838144-09af498fda85?w=1200&q=80',
  'Heavy Jet': 'https://images.unsplash.com/photo-1569629743817-70d8db6c323b?w=1200&q=80',
  'Ultra Long Range': 'https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=1200&q=80',
};

// Default rates by category (market rates when scraping fails)
const DEFAULT_RATES: Record<string, number> = {
  'Light Jet': 3500,
  'Midsize Jet': 4800,
  'Super Midsize Jet': 5800,
  'Heavy Jet': 7800,
  'Ultra Long Range': 11500,
};

// Standard amenities by category
const CATEGORY_AMENITIES: Record<string, string[]> = {
  'Light Jet': ['Wi-Fi', 'Leather Seating', 'Climate Control', 'USB Charging', 'Lavatory'],
  'Midsize Jet': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Power Outlets', 'Climate Control', 'Leather Seating'],
  'Super Midsize Jet': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Satellite Phone', 'Power Outlets', 'Climate Control', 'Crew Service'],
  'Heavy Jet': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Satellite Phone', 'Power Outlets', 'Climate Control', 'Sleeping Configuration', 'Conference Table'],
  'Ultra Long Range': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Satellite Phone', 'Power Outlets', 'Climate Control', 'Sleeping Configuration', 'Shower', 'Conference Table'],
};

const FEATURED_MODELS = ['global express', 'gulfstream gv', 'gulfstream giv', 'citation latitude'];

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function parseFeet(text: string): number {
  // Parse "6' 1\"" or "6' 1"" or "48' 4\"" format to decimal feet
  const match = text.match(/(\d+)[''′]\s*(\d+)?/);
  if (match) {
    const feet = parseInt(match[1], 10);
    const inches = match[2] ? parseInt(match[2], 10) : 0;
    return Math.round((feet + inches / 12) * 10) / 10;
  }
  // Try plain number
  const num = parseFloat(text.replace(/[^\d.]/g, ''));
  return isNaN(num) ? 0 : num;
}

function parseNumber(text: string): number {
  return parseFloat(text.replace(/,/g, '').replace(/[^\d.]/g, '')) || 0;
}

function extractManufacturer(name: string): string {
  const lower = name.toLowerCase();
  const map: Record<string, string> = {
    'citation': 'Textron Aviation',
    'hawker': 'Textron Aviation',
    'gulfstream': 'Gulfstream',
    'global': 'Bombardier',
    'challenger': 'Bombardier',
    'falcon': 'Dassault Aviation',
  };
  for (const [key, mfr] of Object.entries(map)) {
    if (lower.includes(key)) return mfr;
  }
  return 'Various';
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

interface DetailPageData {
  name: string;
  tailNumber: string;
  type: string;
  detailUrl: string;
}

export class FlyAllianceProvider implements AircraftProvider {
  name = 'flyalliance';
  enabled = true;

  async fetchAll(): Promise<NormalizedAircraft[]> {
    console.log('[FlyAlliance] Starting scrape from flyalliance.com...');
    const results: NormalizedAircraft[] = [];

    // Step 1: Collect all aircraft detail URLs from category pages
    const allAircraft: DetailPageData[] = [];

    for (const category of CATEGORY_PAGES) {
      try {
        await new Promise(r => setTimeout(r, 500));
        const html = await fetchPage(category.url);
        const $ = cheerio.load(html);

        // Find all links that point to individual aircraft pages
        // Pattern: flyalliance.com/{model}-{tailnumber}/
        $('a[href]').each((_, el) => {
          const href = $(el).attr('href') || '';
          // Match aircraft detail pages (contain tail number pattern like n123xx)
          if (href.match(/flyalliance\.com\/[a-z]+-[a-z]+-n\d+/i) ||
              href.match(/flyalliance\.com\/[a-z]+-n\d+/i)) {
            const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
            // Extract name from URL
            const pathPart = fullUrl.replace(/^.*flyalliance\.com\//, '').replace(/\/$/, '');
            const parts = pathPart.split('-');
            // Last part is tail number (nXXXXX)
            const tailIdx = parts.findIndex(p => /^n\d+/i.test(p));
            const modelParts = tailIdx > 0 ? parts.slice(0, tailIdx) : parts.slice(0, -1);
            const tailParts = tailIdx > 0 ? parts.slice(tailIdx) : [parts[parts.length - 1]];
            const name = modelParts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
            const tailNumber = tailParts.join('').toUpperCase();

            if (name && !allAircraft.some(a => a.detailUrl === fullUrl)) {
              allAircraft.push({
                name,
                tailNumber,
                type: category.type,
                detailUrl: fullUrl,
              });
            }
          }
        });

        console.log(`[FlyAlliance] ${category.type}: found ${allAircraft.filter(a => a.type === category.type).length} aircraft`);
      } catch (e) {
        console.error(`[FlyAlliance] Failed to scrape category ${category.type}:`, e);
      }
    }

    console.log(`[FlyAlliance] Total aircraft found: ${allAircraft.length}`);

    // Step 2: Scrape detail pages (rate-limited)
    for (const aircraft of allAircraft) {
      try {
        await new Promise(r => setTimeout(r, 600));
        const html = await fetchPage(aircraft.detailUrl);
        const $ = cheerio.load(html);
        const bodyText = $('body').text();

        // Extract specs
        const paxMatch = bodyText.match(/(?:passenger|pax)\s*(?:capacity)?[:\s]*(\d+)/i);
        const rangeMatch = bodyText.match(/(?:maximum\s*)?range[:\s]*([\d,]+)\s*(?:nm|nautical)/i);
        const speedMatch = bodyText.match(/(?:maximum\s*)?(?:cruise\s*)?speed[:\s]*([\d,]+)\s*(?:kn|knts|knots)/i);
        const baggageMatch = bodyText.match(/baggage[:\s]*([\d,.]+)\s*(?:cu|cubic)/i);

        // Cabin dimensions - look for feet/inches patterns
        const cabinHMatch = bodyText.match(/(?:cabin\s*)?height[:\s]*([\d]+[''′]\s*\d*)/i);
        const cabinWMatch = bodyText.match(/(?:cabin\s*)?width[:\s]*([\d]+[''′]\s*\d*)/i);
        const cabinLMatch = bodyText.match(/(?:cabin\s*)?length[:\s]*([\d]+[''′]\s*\d*)/i);

        const pax = paxMatch ? parseInt(paxMatch[1], 10) : 0;
        const range = rangeMatch ? parseNumber(rangeMatch[1]) : 0;
        const speed = speedMatch ? parseNumber(speedMatch[1]) : 0;
        const cabinH = cabinHMatch ? parseFeet(cabinHMatch[1]) : 0;
        const cabinW = cabinWMatch ? parseFeet(cabinWMatch[1]) : 0;
        const cabinL = cabinLMatch ? parseFeet(cabinLMatch[1]) : 0;
        const baggage = baggageMatch ? parseNumber(baggageMatch[1]) : 0;

        // Get image
        let heroImage = '';
        $('img[src*="wp-content/uploads"]').each((_, img) => {
          const src = $(img).attr('src') || '';
          if (src && !heroImage && !src.includes('logo') && !src.includes('icon')) {
            heroImage = src;
          }
        });

        // Extract amenities from page
        const amenities: string[] = [];
        const amenityKeywords = ['WiFi', 'Wi-Fi', 'Galley', 'Lavatory', 'Airshow', 'DVD', 'Power Outlets', 'Heating', 'Pets'];
        for (const keyword of amenityKeywords) {
          if (bodyText.toLowerCase().includes(keyword.toLowerCase())) {
            amenities.push(keyword === 'DVD' ? 'Entertainment System' : keyword);
          }
        }

        if (pax === 0 && range === 0) {
          console.log(`[FlyAlliance] Skipping ${aircraft.name} ${aircraft.tailNumber} - no specs found`);
          continue;
        }

        const displayName = `${aircraft.name} (${aircraft.tailNumber})`;
        const slug = slugify(`flyalliance-${aircraft.name}-${aircraft.tailNumber}`);
        const isFeatured = FEATURED_MODELS.some(m => aircraft.name.toLowerCase().includes(m));

        results.push({
          sourceProvider: this.name,
          sourceId: slug,
          name: displayName,
          slug,
          manufacturer: extractManufacturer(aircraft.name),
          typeName: aircraft.type,
          yearMin: 2015,
          yearMax: 2024,
          maxPassengers: pax,
          maxRange: range,
          cruiseSpeed: speed || estimateSpeed(aircraft.type),
          cabinHeight: cabinH || null,
          cabinWidth: cabinW || null,
          cabinLength: cabinL || null,
          baggageVolume: baggage || null,
          basePricePerHour: DEFAULT_RATES[aircraft.type] || 5000,
          heroImage: heroImage || CATEGORY_IMAGES[aircraft.type] || CATEGORY_IMAGES['Midsize Jet'],
          images: heroImage
            ? [heroImage]
            : [CATEGORY_IMAGES[aircraft.type] || CATEGORY_IMAGES['Midsize Jet']],
          description: `The ${aircraft.name} is a ${aircraft.type.toLowerCase()} in the Fly Alliance fleet, offering premium charter service with ${pax}-passenger capacity and ${range} NM range.`,
          amenities: amenities.length > 0 ? amenities : (CATEGORY_AMENITIES[aircraft.type] || []),
          featured: isFeatured,
        });

        console.log(`[FlyAlliance] Scraped: ${displayName} - ${pax}pax, ${range}NM`);
      } catch (e) {
        console.error(`[FlyAlliance] Failed to scrape ${aircraft.name}:`, e);
      }
    }

    console.log(`[FlyAlliance] Total normalized: ${results.length}`);
    return results;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${BASE_URL}/fleet`, {
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
    'Light Jet': 400,
    'Midsize Jet': 460,
    'Super Midsize Jet': 480,
    'Heavy Jet': 500,
    'Ultra Long Range': 516,
  };
  return speeds[category] || 450;
}
