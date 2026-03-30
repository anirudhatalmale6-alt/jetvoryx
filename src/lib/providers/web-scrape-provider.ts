import { AircraftProvider, NormalizedAircraft } from './types';
import * as cheerio from 'cheerio';

/**
 * Web Scrape Provider
 *
 * Scrapes real aircraft charter data from publicly accessible aviation websites.
 * Primary source: Paramount Business Jets (paramountbusinessjets.com)
 * - 75+ aircraft models with real specs and hourly charter rates
 * - Server-side rendered HTML, no JS rendering needed
 * - Data includes: model, passengers, range, speed, cabin dims, hourly rate, images
 *
 * Secondary source: Stratos Jets (stratosjets.com) — ready to add
 */

const BASE_URL = 'https://www.paramountbusinessjets.com';
const LISTING_URL = `${BASE_URL}/private-jet-charter/aircraft`;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Map Paramount categories to our normalized types
const CATEGORY_MAP: Record<string, string> = {
  'very light jet': 'Light Jet',
  'very light jets': 'Light Jet',
  'light jet': 'Light Jet',
  'light jets': 'Light Jet',
  'super light jet': 'Light Jet',
  'super light jets': 'Light Jet',
  'midsize jet': 'Midsize Jet',
  'midsize jets': 'Midsize Jet',
  'mid size jet': 'Midsize Jet',
  'mid-size jet': 'Midsize Jet',
  'super midsize jet': 'Super Midsize Jet',
  'super midsize jets': 'Super Midsize Jet',
  'super mid-size jet': 'Super Midsize Jet',
  'large jet': 'Heavy Jet',
  'large jets': 'Heavy Jet',
  'heavy jet': 'Heavy Jet',
  'heavy jets': 'Heavy Jet',
  'ultra long range': 'Ultra Long Range',
  'ultra long range jet': 'Ultra Long Range',
  'ultra long range jets': 'Ultra Long Range',
  'ultra-long range': 'Ultra Long Range',
  'vip airliner': 'Ultra Long Range',
  'vip airliners': 'Ultra Long Range',
  'turboprop': 'Light Jet',
  'turboprops': 'Light Jet',
};

// Aviation images by category
const CATEGORY_IMAGES: Record<string, { hero: string; gallery: string[] }> = {
  'Light Jet': {
    hero: 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=800&q=80',
      'https://images.unsplash.com/photo-1559893773-c2a00f5c1e10?w=800&q=80',
      'https://images.unsplash.com/photo-1583395838144-09af498fda85?w=800&q=80',
    ],
  },
  'Midsize Jet': {
    hero: 'https://images.unsplash.com/photo-1474302770737-173ee21bab63?w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1474302770737-173ee21bab63?w=800&q=80',
      'https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=800&q=80',
      'https://images.unsplash.com/photo-1569629743817-70d8db6c323b?w=800&q=80',
    ],
  },
  'Super Midsize Jet': {
    hero: 'https://images.unsplash.com/photo-1583395838144-09af498fda85?w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1583395838144-09af498fda85?w=800&q=80',
      'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=800&q=80',
      'https://images.unsplash.com/photo-1569629743817-70d8db6c323b?w=800&q=80',
    ],
  },
  'Heavy Jet': {
    hero: 'https://images.unsplash.com/photo-1569629743817-70d8db6c323b?w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1569629743817-70d8db6c323b?w=800&q=80',
      'https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=800&q=80',
      'https://images.unsplash.com/photo-1474302770737-173ee21bab63?w=800&q=80',
    ],
  },
  'Ultra Long Range': {
    hero: 'https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=800&q=80',
      'https://images.unsplash.com/photo-1569629743817-70d8db6c323b?w=800&q=80',
      'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=800&q=80',
    ],
  },
};

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function parseNumber(text: string): number {
  return parseFloat(text.replace(/,/g, '').replace(/[^\d.]/g, '')) || 0;
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

interface ScrapedAircraft {
  name: string;
  category: string;
  pax: number;
  range: number;
  speed: number;
  cabinHeight: number;
  detailUrl: string;
  imageUrl: string;
}

// Default hourly rates by category (from Paramount's published data)
const DEFAULT_RATES: Record<string, number> = {
  'Light Jet': 3200,
  'Midsize Jet': 4500,
  'Super Midsize Jet': 5500,
  'Heavy Jet': 7500,
  'Ultra Long Range': 11000,
};

// Standard amenities by category
const CATEGORY_AMENITIES: Record<string, string[]> = {
  'Light Jet': ['Wi-Fi', 'Leather Seating', 'Climate Control', 'USB Charging', 'Lavatory', 'Luggage Compartment'],
  'Midsize Jet': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Power Outlets', 'USB Charging', 'Climate Control', 'Leather Seating', 'Folding Tables', 'Luggage Compartment'],
  'Super Midsize Jet': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Satellite Phone', 'Power Outlets', 'USB Charging', 'Climate Control', 'Leather Seating', 'Folding Tables', 'Luggage Compartment', 'Crew Service'],
  'Heavy Jet': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Satellite Phone', 'Power Outlets', 'USB Charging', 'Climate Control', 'Leather Seating', 'Folding Tables', 'Luggage Compartment', 'Crew Service', 'Sleeping Configuration', 'Conference Table'],
  'Ultra Long Range': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Satellite Phone', 'Power Outlets', 'USB Charging', 'Climate Control', 'Leather Seating', 'Folding Tables', 'Luggage Compartment', 'Crew Service', 'Sleeping Configuration', 'Shower', 'Conference Table'],
};

// Featured aircraft names
const FEATURED_AIRCRAFT = [
  'gulfstream g700', 'gulfstream g650er', 'gulfstream g650',
  'global 7500', 'global 7000', 'falcon 8x', 'falcon 6x',
  'challenger 350', 'challenger 650',
];

export class WebScrapeProvider implements AircraftProvider {
  name = 'web-scrape';
  enabled = true;

  async fetchAll(): Promise<NormalizedAircraft[]> {
    console.log('[WebScrape] Starting scrape from Paramount Business Jets...');

    try {
      const html = await fetchPage(LISTING_URL);
      const $ = cheerio.load(html);

      const aircraftList: ScrapedAircraft[] = [];
      // Paramount organizes aircraft by category sections with h2/h3 headers
      // Each aircraft is in an <li> with h5 name, specs in nested <li><strong>

      // Parse aircraft cards - each li containing an h5 is an aircraft
      // Reset category tracking by looking at section structure
      let sectionCategory = '';

      $('section, .section, .aircraft-section, div').each((_, sectionEl) => {
        // Check for category header in this section
        const sectionHeader = $(sectionEl).find('h2, h3').first().text().trim().toLowerCase();
        if (CATEGORY_MAP[sectionHeader]) {
          sectionCategory = CATEGORY_MAP[sectionHeader];
        }
      });

      // Direct approach: find all li elements with h5 (aircraft name) and specs
      const processedNames = new Set<string>();

      $('li').each((_, el) => {
        const h5 = $(el).find('h5').first().text().trim();
        if (!h5 || h5.length < 3 || h5.length > 60 || processedNames.has(h5)) return;

        // Extract specs from nested li > strong
        const specs: Record<string, string> = {};
        $(el).find('li').each((__, specEl) => {
          const text = $(specEl).text().trim();
          const strong = $(specEl).find('strong').text().trim();
          if (strong) {
            const label = text.replace(strong, '').trim().toLowerCase();
            specs[label] = strong;
          }
        });

        // Must have at least pax and range to be a valid aircraft
        const pax = parseNumber(specs['pax'] || specs['passengers'] || '0');
        const range = parseNumber(specs['range (nm)'] || specs['range'] || '0');

        if (pax === 0 && range === 0) return;

        processedNames.add(h5);

        const speed = parseNumber(specs['speed (ktas)'] || specs['speed'] || specs['cruise speed'] || '0');
        const cabinH = parseFloat(specs['cabin height (ft)'] || specs['cabin height'] || '0');

        // Get image
        const img = $(el).find('img').attr('src') || $(el).find('img').attr('data-src') || '';

        // Get detail link
        const link = $(el).find('a[href*="/aircraft/"]').attr('href') || '';

        // Determine category from closest header
        let category = sectionCategory || 'Light Jet';

        // Try to determine category from the link or nearby headers
        const parentSection = $(el).closest('section, .section, [class*="aircraft"]');
        const nearestHeader = parentSection.find('h2, h3').first().text().trim().toLowerCase();
        if (CATEGORY_MAP[nearestHeader]) {
          category = CATEGORY_MAP[nearestHeader];
        }

        // Fallback: guess category from specs
        if (category === 'Light Jet') {
          if (pax >= 14 || range >= 6000) category = 'Ultra Long Range';
          else if (pax >= 10 && range >= 4000) category = 'Heavy Jet';
          else if (pax >= 8 && range >= 3000) category = 'Super Midsize Jet';
          else if (pax >= 7 && range >= 2000) category = 'Midsize Jet';
        }

        aircraftList.push({
          name: h5,
          category,
          pax,
          range,
          speed,
          cabinHeight: cabinH,
          detailUrl: link.startsWith('http') ? link : (link ? `${BASE_URL}${link}` : ''),
          imageUrl: img.startsWith('http') ? img : (img ? `${BASE_URL}${img}` : ''),
        });
      });

      console.log(`[WebScrape] Found ${aircraftList.length} aircraft on listing page`);

      // Scrape detail pages for additional data (rate-limited: max 20 to avoid overload)
      const detailData: Map<string, { rate: number; description: string; cabinL: number; cabinW: number; baggage: number }> = new Map();

      const toScrape = aircraftList.filter(a => a.detailUrl).slice(0, 20);
      for (const aircraft of toScrape) {
        try {
          await new Promise(r => setTimeout(r, 500)); // Be respectful: 500ms between requests
          const detailHtml = await fetchPage(aircraft.detailUrl);
          const d = cheerio.load(detailHtml);

          const bodyText = d('body').text();

          // Extract hourly rate
          const rateMatch = bodyText.match(/\$[\d,]+(?:\s*(?:per hour|an hour|\/hr|hourly))/i);
          let rate = 0;
          if (rateMatch) {
            rate = parseNumber(rateMatch[0]);
          }

          // Extract cabin dimensions from text
          const cabinLMatch = bodyText.match(/cabin length[:\s]*(\d+\.?\d*)/i);
          const cabinWMatch = bodyText.match(/cabin width[:\s]*(\d+\.?\d*)/i);
          const baggageMatch = bodyText.match(/baggage[:\s]*(\d+\.?\d*)/i);

          // Get description from meta or first paragraph
          const description = d('meta[name="description"]').attr('content') ||
            d('.aircraft-description, .detail-description, article p').first().text().trim().substring(0, 300) || '';

          detailData.set(aircraft.name, {
            rate,
            description,
            cabinL: cabinLMatch ? parseFloat(cabinLMatch[1]) : 0,
            cabinW: cabinWMatch ? parseFloat(cabinWMatch[1]) : 0,
            baggage: baggageMatch ? parseFloat(baggageMatch[1]) : 0,
          });

          console.log(`[WebScrape] Detail scraped: ${aircraft.name} - $${rate}/hr`);
        } catch (e) {
          console.log(`[WebScrape] Detail failed for ${aircraft.name}: ${e}`);
        }
      }

      // Convert to normalized format
      const results: NormalizedAircraft[] = aircraftList.map(aircraft => {
        const detail = detailData.get(aircraft.name);
        const images = CATEGORY_IMAGES[aircraft.category] || CATEGORY_IMAGES['Light Jet'];
        const slug = slugify(`${aircraft.name}-scrape`);

        // Use scraped rate, or default for category
        const baseRate = (detail?.rate && detail.rate > 500)
          ? detail.rate
          : DEFAULT_RATES[aircraft.category] || 3500;

        // Extract manufacturer from name
        const manufacturer = extractManufacturer(aircraft.name);

        const isFeatured = FEATURED_AIRCRAFT.some(f =>
          aircraft.name.toLowerCase().includes(f)
        );

        return {
          sourceProvider: this.name,
          sourceId: slug,
          name: aircraft.name,
          slug,
          manufacturer,
          typeName: aircraft.category,
          yearMin: 2018,
          yearMax: 2025,
          maxPassengers: aircraft.pax,
          maxRange: aircraft.range,
          cruiseSpeed: aircraft.speed || estimateSpeed(aircraft.category),
          cabinHeight: aircraft.cabinHeight || null,
          cabinWidth: detail?.cabinW || null,
          cabinLength: detail?.cabinL || null,
          baggageVolume: detail?.baggage || null,
          basePricePerHour: baseRate,
          heroImage: aircraft.imageUrl || images.hero,
          images: aircraft.imageUrl ? [aircraft.imageUrl, ...images.gallery.slice(0, 2)] : images.gallery,
          description: detail?.description || `The ${aircraft.name} is a premium ${aircraft.category.toLowerCase()} offering exceptional performance and comfort for up to ${aircraft.pax} passengers.`,
          amenities: CATEGORY_AMENITIES[aircraft.category] || CATEGORY_AMENITIES['Light Jet'],
          featured: isFeatured,
        };
      });

      console.log(`[WebScrape] Total normalized aircraft: ${results.length}`);
      return results;
    } catch (error) {
      console.error('[WebScrape] Scraping failed:', error);
      throw error;
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

function extractManufacturer(name: string): string {
  const manufacturers: Record<string, string> = {
    'citation': 'Textron Aviation',
    'cessna': 'Textron Aviation',
    'hawker': 'Textron Aviation',
    'beechcraft': 'Textron Aviation',
    'king air': 'Textron Aviation',
    'gulfstream': 'Gulfstream',
    'bombardier': 'Bombardier',
    'global': 'Bombardier',
    'challenger': 'Bombardier',
    'learjet': 'Bombardier',
    'embraer': 'Embraer',
    'phenom': 'Embraer',
    'praetor': 'Embraer',
    'legacy': 'Embraer',
    'lineage': 'Embraer',
    'dassault': 'Dassault Aviation',
    'falcon': 'Dassault Aviation',
    'pilatus': 'Pilatus',
    'pc-12': 'Pilatus',
    'pc-24': 'Pilatus',
    'hondajet': 'Honda Aircraft',
    'boeing': 'Boeing',
    'airbus': 'Airbus',
    'bbj': 'Boeing',
    'acj': 'Airbus',
    'piaggio': 'Piaggio Aerospace',
    'avanti': 'Piaggio Aerospace',
    'nextant': 'Nextant Aerospace',
    'syberjet': 'SyberJet',
  };

  const lower = name.toLowerCase();
  for (const [key, mfr] of Object.entries(manufacturers)) {
    if (lower.includes(key)) return mfr;
  }
  return 'Various';
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
