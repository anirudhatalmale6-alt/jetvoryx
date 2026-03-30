import { AircraftProvider, NormalizedAircraft } from './types';
import * as cheerio from 'cheerio';

/**
 * Mercury Jets Provider
 *
 * Scrapes real aircraft data from mercuryjets.com
 * - WordPress + Elementor, fully server-side rendered
 * - Category pages list individual aircraft with detail page links
 * - Detail pages have full specs: pax, range, speed, cabin dims, HOURLY RATES
 * - No anti-bot protection
 * - 50+ aircraft models available
 */

const BASE_URL = 'https://www.mercuryjets.com';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Category pages to scrape for aircraft links
const CATEGORY_PAGES: { url: string; type: string }[] = [
  { url: `${BASE_URL}/aircraft-charter/light-jets/`, type: 'Light Jet' },
  { url: `${BASE_URL}/aircraft-charter/mid-size-jets/`, type: 'Midsize Jet' },
  { url: `${BASE_URL}/aircraft-charter/super-midsize-jets/`, type: 'Super Midsize Jet' },
  { url: `${BASE_URL}/aircraft-charter/heavy-private-jets/`, type: 'Heavy Jet' },
  { url: `${BASE_URL}/aircraft-charter/ultra-long-range-jets/`, type: 'Ultra Long Range' },
];

const CATEGORY_IMAGES: Record<string, string> = {
  'Light Jet': 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=1200&q=80',
  'Midsize Jet': 'https://images.unsplash.com/photo-1474302770737-173ee21bab63?w=1200&q=80',
  'Super Midsize Jet': 'https://images.unsplash.com/photo-1583395838144-09af498fda85?w=1200&q=80',
  'Heavy Jet': 'https://images.unsplash.com/photo-1569629743817-70d8db6c323b?w=1200&q=80',
  'Ultra Long Range': 'https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=1200&q=80',
};

const CATEGORY_AMENITIES: Record<string, string[]> = {
  'Light Jet': ['Wi-Fi', 'Leather Seating', 'Climate Control', 'USB Charging', 'Lavatory'],
  'Midsize Jet': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Power Outlets', 'Climate Control'],
  'Super Midsize Jet': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Satellite Phone', 'Power Outlets', 'Crew Service'],
  'Heavy Jet': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Satellite Phone', 'Power Outlets', 'Sleeping Configuration', 'Conference Table'],
  'Ultra Long Range': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Satellite Phone', 'Power Outlets', 'Sleeping Configuration', 'Shower', 'Conference Table'],
};

const DEFAULT_RATES: Record<string, number> = {
  'Light Jet': 3200,
  'Midsize Jet': 4500,
  'Super Midsize Jet': 5500,
  'Heavy Jet': 7500,
  'Ultra Long Range': 11000,
};

const FEATURED_MODELS = ['gulfstream g650', 'gulfstream g600', 'global 7500', 'falcon 8x', 'challenger 650', 'praetor 600'];

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
    'beechcraft': 'Textron Aviation', 'beechjet': 'Textron Aviation', 'premier': 'Textron Aviation',
    'learjet': 'Bombardier', 'challenger': 'Bombardier', 'global': 'Bombardier',
    'gulfstream': 'Gulfstream', 'phenom': 'Embraer', 'praetor': 'Embraer',
    'legacy': 'Embraer', 'lineage': 'Embraer', 'embraer': 'Embraer',
    'falcon': 'Dassault Aviation', 'dassault': 'Dassault Aviation',
    'pilatus': 'Pilatus', 'pc-12': 'Pilatus', 'pc-24': 'Pilatus',
    'hondajet': 'Honda Aircraft', 'honda': 'Honda Aircraft',
    'boeing': 'Boeing', 'bbj': 'Boeing',
    'nextant': 'Nextant Aerospace', 'syberjet': 'SyberJet',
    'daher': 'Daher', 'tbm': 'Daher', 'socata': 'Daher',
    'piper': 'Piper Aircraft', 'bombardier': 'Bombardier',
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
  if (!response.ok) throw new Error(`HTTP ${response.status} fetching ${url}`);
  return response.text();
}

export class MercuryJetsProvider implements AircraftProvider {
  name = 'mercuryjets';
  enabled = true;

  async fetchAll(): Promise<NormalizedAircraft[]> {
    console.log('[MercuryJets] Starting scrape from mercuryjets.com...');
    const results: NormalizedAircraft[] = [];
    const seenUrls = new Set<string>();

    // Step 1: Collect aircraft detail URLs from category pages
    const aircraftLinks: { url: string; type: string }[] = [];

    for (const category of CATEGORY_PAGES) {
      try {
        await new Promise(r => setTimeout(r, 400));
        const html = await fetchPage(category.url);
        const $ = cheerio.load(html);

        $('a[href*="-charter"]').each((_, el) => {
          const href = $(el).attr('href') || '';
          const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
          // Match aircraft detail pages: /aircraft-name-charter/
          if (fullUrl.includes('mercuryjets.com/') &&
              fullUrl.includes('-charter') &&
              !fullUrl.includes('/aircraft-charter/') &&
              !seenUrls.has(fullUrl)) {
            seenUrls.add(fullUrl);
            aircraftLinks.push({ url: fullUrl, type: category.type });
          }
        });

        console.log(`[MercuryJets] ${category.type}: found ${aircraftLinks.filter(a => a.type === category.type).length} aircraft links`);
      } catch (e) {
        console.error(`[MercuryJets] Failed to scrape category ${category.type}:`, e);
      }
    }

    console.log(`[MercuryJets] Total unique aircraft links: ${aircraftLinks.length}`);

    // Step 2: Scrape detail pages (limit to 60 to avoid overload)
    const toScrape = aircraftLinks.slice(0, 60);
    for (const link of toScrape) {
      try {
        await new Promise(r => setTimeout(r, 500));
        const html = await fetchPage(link.url);
        const $ = cheerio.load(html);
        const bodyText = $('body').text();

        // Extract aircraft name from h1 or title
        let name = $('h1').first().text().trim();
        // Clean up name - remove "Charter", "Private Jet", etc.
        name = name.replace(/\s*(charter|private jet|rental|hire|flights?)\s*/gi, '').trim();
        if (!name || name.length < 3) continue;

        // Extract specs from body text using regex
        const paxMatch = bodyText.match(/(?:seating|passengers?|capacity)[:\s]*(\d+)/i);
        const rangeMatch = bodyText.match(/(?:range)[:\s]*([\d,]+)\s*(?:nm|nautical)/i);
        const speedMatch = bodyText.match(/(?:cruise speed|speed)[:\s]*([\d,]+)\s*(?:ktas|knots|kts)/i);
        const rateMatch = bodyText.match(/(?:price per hour|hourly rate|estimated price)[:\s]*\$?([\d,]+)/i);

        // Cabin dimensions
        const cabinLMatch = bodyText.match(/(?:cabin length)[:\s]*([\d.]+)\s*(?:ft|feet)/i);
        const cabinWMatch = bodyText.match(/(?:cabin width)[:\s]*([\d.]+)\s*(?:ft|feet)/i);
        const cabinHMatch = bodyText.match(/(?:cabin height)[:\s]*([\d.]+)\s*(?:ft|feet)/i);
        const baggageMatch = bodyText.match(/(?:baggage|luggage)[:\s]*([\d.]+)\s*(?:cu|cubic)/i);

        const pax = paxMatch ? parseInt(paxMatch[1], 10) : 0;
        const range = rangeMatch ? parseNumber(rangeMatch[1]) : 0;
        const speed = speedMatch ? parseNumber(speedMatch[1]) : 0;
        const rate = rateMatch ? parseNumber(rateMatch[1]) : 0;
        const cabinL = cabinLMatch ? parseFloat(cabinLMatch[1]) : 0;
        const cabinW = cabinWMatch ? parseFloat(cabinWMatch[1]) : 0;
        const cabinH = cabinHMatch ? parseFloat(cabinHMatch[1]) : 0;
        const baggage = baggageMatch ? parseFloat(baggageMatch[1]) : 0;

        if (pax === 0 && range === 0) {
          console.log(`[MercuryJets] Skipping ${name} - no specs found`);
          continue;
        }

        // Get image
        let heroImage = '';
        $('img[src*="wp-content"]').each((_, img) => {
          const src = $(img).attr('src') || '';
          if (src && !heroImage && !src.includes('logo') && !src.includes('icon') && !src.includes('favicon')) {
            heroImage = src;
          }
        });

        const slug = slugify(`mercury-${name}`);
        const isFeatured = FEATURED_MODELS.some(m => name.toLowerCase().includes(m));
        const finalRate = (rate && rate >= 1000) ? rate : (DEFAULT_RATES[link.type] || 4000);

        results.push({
          sourceProvider: this.name,
          sourceId: slug,
          name,
          slug,
          manufacturer: extractManufacturer(name),
          typeName: link.type,
          yearMin: 2015,
          yearMax: 2025,
          maxPassengers: pax,
          maxRange: range,
          cruiseSpeed: speed || estimateSpeed(link.type),
          cabinHeight: cabinH || null,
          cabinWidth: cabinW || null,
          cabinLength: cabinL || null,
          baggageVolume: baggage || null,
          basePricePerHour: finalRate,
          heroImage: heroImage || CATEGORY_IMAGES[link.type],
          images: heroImage ? [heroImage] : [CATEGORY_IMAGES[link.type]],
          description: `The ${name} is a ${link.type.toLowerCase()} available for private charter at approximately $${finalRate.toLocaleString()}/hour. With ${pax}-passenger capacity and ${range} NM range, it delivers premium performance and comfort.`,
          amenities: CATEGORY_AMENITIES[link.type] || [],
          featured: isFeatured,
        });

        console.log(`[MercuryJets] Scraped: ${name} - ${pax}pax, ${range}NM, $${finalRate}/hr`);
      } catch (e) {
        console.error(`[MercuryJets] Failed to scrape ${link.url}:`, e);
      }
    }

    console.log(`[MercuryJets] Total normalized: ${results.length}`);
    return results;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${BASE_URL}/aircraft-charter/`, {
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
    'Light Jet': 400, 'Midsize Jet': 460, 'Super Midsize Jet': 480,
    'Heavy Jet': 500, 'Ultra Long Range': 516,
  };
  return speeds[category] || 450;
}
