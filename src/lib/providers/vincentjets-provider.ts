import { AircraftProvider, NormalizedAircraft } from './types';
import * as cheerio from 'cheerio';

/**
 * Vincent Jets Provider
 *
 * Scrapes aircraft data from vincentjets.com (Squarespace)
 * - Fleet page lists aircraft names in h4 elements grouped by category
 * - No detail pages with specs, so we use a curated lookup table for known aircraft models
 * - No anti-bot protection (Squarespace SSR)
 */

const BASE_URL = 'https://www.vincentjets.com';
const FLEET_URL = `${BASE_URL}/fleet`;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Category classification from the fleet page
const CATEGORY_KEYWORDS: { keyword: string; type: string }[] = [
  { keyword: 'light', type: 'Light Jet' },
  { keyword: 'midsize', type: 'Midsize Jet' },
  { keyword: 'supermid', type: 'Super Midsize Jet' },
  { keyword: 'super mid', type: 'Super Midsize Jet' },
  { keyword: 'heavy', type: 'Heavy Jet' },
  { keyword: 'long range', type: 'Long Range Jet' },
];

// Unsplash fallback images by category
const CATEGORY_IMAGES: Record<string, string> = {
  'Light Jet': 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=1200&q=80',
  'Midsize Jet': 'https://images.unsplash.com/photo-1474302770737-173ee21bab63?w=1200&q=80',
  'Super Midsize Jet': 'https://images.unsplash.com/photo-1583395838144-09af498fda85?w=1200&q=80',
  'Heavy Jet': 'https://images.unsplash.com/photo-1569629743817-70d8db6c323b?w=1200&q=80',
  'Long Range Jet': 'https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=1200&q=80',
};

// Default hourly rates by category
const DEFAULT_RATES: Record<string, number> = {
  'Light Jet': 3200,
  'Midsize Jet': 4500,
  'Super Midsize Jet': 5500,
  'Heavy Jet': 7800,
  'Long Range Jet': 11000,
};

// Standard amenities by category
const CATEGORY_AMENITIES: Record<string, string[]> = {
  'Light Jet': ['Wi-Fi', 'Leather Seating', 'Climate Control', 'USB Charging', 'Lavatory'],
  'Midsize Jet': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Power Outlets', 'Climate Control', 'Leather Seating'],
  'Super Midsize Jet': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Satellite Phone', 'Power Outlets', 'Climate Control', 'Crew Service'],
  'Heavy Jet': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Satellite Phone', 'Power Outlets', 'Climate Control', 'Sleeping Configuration', 'Conference Table'],
  'Long Range Jet': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Satellite Phone', 'Power Outlets', 'Climate Control', 'Sleeping Configuration', 'Shower', 'Conference Table'],
};

const FEATURED_MODELS = ['gulfstream g650', 'global 7500', 'falcon 8x', 'gulfstream g550'];

// Curated specs lookup for known aircraft models
// Source: publicly available manufacturer specifications
interface AircraftSpecs {
  manufacturer: string;
  maxPassengers: number;
  maxRange: number;       // nautical miles
  cruiseSpeed: number;    // knots
  cabinHeight: number;    // feet
  cabinWidth: number;     // feet
  cabinLength: number;    // feet
  baggageVolume: number;  // cubic feet
  yearMin: number;
  yearMax: number;
}

const SPECS_LOOKUP: Record<string, AircraftSpecs> = {
  // Light Jets
  'citation mustang': {
    manufacturer: 'Textron Aviation', maxPassengers: 4, maxRange: 1150, cruiseSpeed: 340,
    cabinHeight: 4.5, cabinWidth: 4.6, cabinLength: 9.7, baggageVolume: 57, yearMin: 2006, yearMax: 2017,
  },
  'phenom 100': {
    manufacturer: 'Embraer', maxPassengers: 4, maxRange: 1178, cruiseSpeed: 390,
    cabinHeight: 4.9, cabinWidth: 5.1, cabinLength: 11.0, baggageVolume: 60, yearMin: 2008, yearMax: 2024,
  },
  'phenom 300': {
    manufacturer: 'Embraer', maxPassengers: 6, maxRange: 2010, cruiseSpeed: 453,
    cabinHeight: 4.9, cabinWidth: 5.1, cabinLength: 17.2, baggageVolume: 84, yearMin: 2009, yearMax: 2024,
  },
  'citation cj2': {
    manufacturer: 'Textron Aviation', maxPassengers: 6, maxRange: 1613, cruiseSpeed: 418,
    cabinHeight: 4.8, cabinWidth: 4.8, cabinLength: 12.2, baggageVolume: 53, yearMin: 2000, yearMax: 2006,
  },
  'citation cj3': {
    manufacturer: 'Textron Aviation', maxPassengers: 6, maxRange: 1875, cruiseSpeed: 416,
    cabinHeight: 4.8, cabinWidth: 4.8, cabinLength: 15.7, baggageVolume: 66, yearMin: 2004, yearMax: 2024,
  },
  'citation cj4': {
    manufacturer: 'Textron Aviation', maxPassengers: 7, maxRange: 2165, cruiseSpeed: 451,
    cabinHeight: 4.8, cabinWidth: 4.8, cabinLength: 17.3, baggageVolume: 77, yearMin: 2010, yearMax: 2024,
  },
  'vision jet': {
    manufacturer: 'Cirrus Aircraft', maxPassengers: 5, maxRange: 1200, cruiseSpeed: 311,
    cabinHeight: 4.1, cabinWidth: 5.1, cabinLength: 8.6, baggageVolume: 32, yearMin: 2016, yearMax: 2024,
  },
  'nextant 400xti': {
    manufacturer: 'Nextant Aerospace', maxPassengers: 6, maxRange: 2040, cruiseSpeed: 460,
    cabinHeight: 4.8, cabinWidth: 4.9, cabinLength: 15.5, baggageVolume: 54, yearMin: 2011, yearMax: 2024,
  },
  'pilatus pc-12': {
    manufacturer: 'Pilatus', maxPassengers: 6, maxRange: 1845, cruiseSpeed: 285,
    cabinHeight: 4.8, cabinWidth: 5.0, cabinLength: 16.9, baggageVolume: 40, yearMin: 1994, yearMax: 2024,
  },

  // Midsize Jets
  'gulfstream g-150': {
    manufacturer: 'Gulfstream', maxPassengers: 8, maxRange: 2950, cruiseSpeed: 476,
    cabinHeight: 5.7, cabinWidth: 5.7, cabinLength: 17.6, baggageVolume: 57, yearMin: 2006, yearMax: 2017,
  },
  'citation latitude': {
    manufacturer: 'Textron Aviation', maxPassengers: 8, maxRange: 2700, cruiseSpeed: 446,
    cabinHeight: 6.0, cabinWidth: 6.4, cabinLength: 22.0, baggageVolume: 100, yearMin: 2015, yearMax: 2024,
  },
  'citation excel': {
    manufacturer: 'Textron Aviation', maxPassengers: 8, maxRange: 1858, cruiseSpeed: 431,
    cabinHeight: 5.7, cabinWidth: 5.5, cabinLength: 18.5, baggageVolume: 80, yearMin: 1998, yearMax: 2006,
  },
  'citation xls': {
    manufacturer: 'Textron Aviation', maxPassengers: 8, maxRange: 2100, cruiseSpeed: 441,
    cabinHeight: 5.7, cabinWidth: 5.5, cabinLength: 18.5, baggageVolume: 80, yearMin: 2004, yearMax: 2024,
  },
  'hawker 800': {
    manufacturer: 'Textron Aviation', maxPassengers: 8, maxRange: 2540, cruiseSpeed: 447,
    cabinHeight: 5.8, cabinWidth: 6.0, cabinLength: 21.3, baggageVolume: 49, yearMin: 1995, yearMax: 2009,
  },
  'hawker 900xp': {
    manufacturer: 'Textron Aviation', maxPassengers: 8, maxRange: 2800, cruiseSpeed: 466,
    cabinHeight: 5.8, cabinWidth: 6.0, cabinLength: 21.3, baggageVolume: 49, yearMin: 2007, yearMax: 2013,
  },
  'learjet 60': {
    manufacturer: 'Bombardier', maxPassengers: 7, maxRange: 2405, cruiseSpeed: 465,
    cabinHeight: 5.7, cabinWidth: 5.9, cabinLength: 17.7, baggageVolume: 50, yearMin: 1993, yearMax: 2007,
  },

  // Super Midsize Jets
  'citation sovereign': {
    manufacturer: 'Textron Aviation', maxPassengers: 9, maxRange: 3000, cruiseSpeed: 458,
    cabinHeight: 5.7, cabinWidth: 5.5, cabinLength: 25.3, baggageVolume: 135, yearMin: 2004, yearMax: 2024,
  },
  'citation longitude': {
    manufacturer: 'Textron Aviation', maxPassengers: 9, maxRange: 3500, cruiseSpeed: 476,
    cabinHeight: 6.0, cabinWidth: 6.4, cabinLength: 25.2, baggageVolume: 112, yearMin: 2019, yearMax: 2024,
  },
  'citation x': {
    manufacturer: 'Textron Aviation', maxPassengers: 8, maxRange: 3460, cruiseSpeed: 527,
    cabinHeight: 5.7, cabinWidth: 5.5, cabinLength: 23.9, baggageVolume: 82, yearMin: 1996, yearMax: 2018,
  },
  'challenger 300': {
    manufacturer: 'Bombardier', maxPassengers: 9, maxRange: 3100, cruiseSpeed: 470,
    cabinHeight: 6.1, cabinWidth: 7.2, cabinLength: 28.4, baggageVolume: 106, yearMin: 2004, yearMax: 2014,
  },
  'challenger 350': {
    manufacturer: 'Bombardier', maxPassengers: 9, maxRange: 3200, cruiseSpeed: 470,
    cabinHeight: 6.1, cabinWidth: 7.2, cabinLength: 28.6, baggageVolume: 106, yearMin: 2014, yearMax: 2024,
  },
  'gulfstream g200': {
    manufacturer: 'Gulfstream', maxPassengers: 9, maxRange: 3400, cruiseSpeed: 476,
    cabinHeight: 6.3, cabinWidth: 7.0, cabinLength: 24.4, baggageVolume: 150, yearMin: 1999, yearMax: 2011,
  },
  'gulfstream g280': {
    manufacturer: 'Gulfstream', maxPassengers: 9, maxRange: 3600, cruiseSpeed: 482,
    cabinHeight: 6.3, cabinWidth: 7.2, cabinLength: 25.8, baggageVolume: 150, yearMin: 2012, yearMax: 2024,
  },

  // Heavy Jets
  'challenger 605': {
    manufacturer: 'Bombardier', maxPassengers: 12, maxRange: 4000, cruiseSpeed: 470,
    cabinHeight: 6.1, cabinWidth: 7.9, cabinLength: 28.4, baggageVolume: 115, yearMin: 2007, yearMax: 2015,
  },
  'challenger 850': {
    manufacturer: 'Bombardier', maxPassengers: 15, maxRange: 3200, cruiseSpeed: 459,
    cabinHeight: 6.1, cabinWidth: 8.2, cabinLength: 48.4, baggageVolume: 180, yearMin: 2006, yearMax: 2012,
  },
  'gulfstream g-iv': {
    manufacturer: 'Gulfstream', maxPassengers: 14, maxRange: 4220, cruiseSpeed: 476,
    cabinHeight: 6.1, cabinWidth: 7.3, cabinLength: 45.1, baggageVolume: 169, yearMin: 1987, yearMax: 2003,
  },
  'gulfstream gv': {
    manufacturer: 'Gulfstream', maxPassengers: 16, maxRange: 5800, cruiseSpeed: 488,
    cabinHeight: 6.2, cabinWidth: 7.3, cabinLength: 50.1, baggageVolume: 226, yearMin: 1997, yearMax: 2008,
  },
  'gulfstream g550': {
    manufacturer: 'Gulfstream', maxPassengers: 16, maxRange: 6750, cruiseSpeed: 488,
    cabinHeight: 6.2, cabinWidth: 7.3, cabinLength: 50.1, baggageVolume: 226, yearMin: 2003, yearMax: 2021,
  },
  'gulfstream g600': {
    manufacturer: 'Gulfstream', maxPassengers: 16, maxRange: 6500, cruiseSpeed: 516,
    cabinHeight: 6.3, cabinWidth: 7.6, cabinLength: 45.2, baggageVolume: 175, yearMin: 2019, yearMax: 2024,
  },
  'falcon 50ex': {
    manufacturer: 'Dassault Aviation', maxPassengers: 9, maxRange: 3230, cruiseSpeed: 470,
    cabinHeight: 5.9, cabinWidth: 6.1, cabinLength: 23.5, baggageVolume: 115, yearMin: 1996, yearMax: 2008,
  },

  // Long Range Jets
  'gulfstream g650': {
    manufacturer: 'Gulfstream', maxPassengers: 18, maxRange: 7000, cruiseSpeed: 516,
    cabinHeight: 6.4, cabinWidth: 8.5, cabinLength: 53.6, baggageVolume: 195, yearMin: 2012, yearMax: 2024,
  },
  'falcon 8x': {
    manufacturer: 'Dassault Aviation', maxPassengers: 14, maxRange: 6450, cruiseSpeed: 480,
    cabinHeight: 6.2, cabinWidth: 7.7, cabinLength: 42.8, baggageVolume: 140, yearMin: 2016, yearMax: 2024,
  },
  'global express xrs': {
    manufacturer: 'Bombardier', maxPassengers: 15, maxRange: 6150, cruiseSpeed: 499,
    cabinHeight: 6.3, cabinWidth: 8.2, cabinLength: 48.4, baggageVolume: 195, yearMin: 2005, yearMax: 2012,
  },
  'global 6000': {
    manufacturer: 'Bombardier', maxPassengers: 15, maxRange: 6000, cruiseSpeed: 499,
    cabinHeight: 6.3, cabinWidth: 8.2, cabinLength: 48.4, baggageVolume: 195, yearMin: 2012, yearMax: 2024,
  },
  'global 7500': {
    manufacturer: 'Bombardier', maxPassengers: 17, maxRange: 7700, cruiseSpeed: 516,
    cabinHeight: 6.3, cabinWidth: 8.2, cabinLength: 54.4, baggageVolume: 195, yearMin: 2018, yearMax: 2024,
  },
};

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function matchSpecs(name: string): AircraftSpecs | null {
  const lower = name.toLowerCase().trim();
  // Try exact match first
  if (SPECS_LOOKUP[lower]) return SPECS_LOOKUP[lower];
  // Try partial match - find the longest matching key
  let bestMatch: string | null = null;
  let bestLen = 0;
  for (const key of Object.keys(SPECS_LOOKUP)) {
    if (lower.includes(key) || key.includes(lower)) {
      if (key.length > bestLen) {
        bestMatch = key;
        bestLen = key.length;
      }
    }
  }
  if (bestMatch) return SPECS_LOOKUP[bestMatch];
  return null;
}

function extractManufacturer(name: string): string {
  const lower = name.toLowerCase();
  const map: Record<string, string> = {
    'citation': 'Textron Aviation',
    'hawker': 'Textron Aviation',
    'learjet': 'Bombardier',
    'gulfstream': 'Gulfstream',
    'global': 'Bombardier',
    'challenger': 'Bombardier',
    'falcon': 'Dassault Aviation',
    'phenom': 'Embraer',
    'vision jet': 'Cirrus Aircraft',
    'nextant': 'Nextant Aerospace',
    'pilatus': 'Pilatus',
  };
  for (const [key, mfr] of Object.entries(map)) {
    if (lower.includes(key)) return mfr;
  }
  return 'Various';
}

function classifyCategory(heading: string): string {
  const lower = heading.toLowerCase();
  for (const { keyword, type } of CATEGORY_KEYWORDS) {
    if (lower.includes(keyword)) return type;
  }
  return 'Midsize Jet';
}

function estimateSpeed(category: string): number {
  const speeds: Record<string, number> = {
    'Light Jet': 390,
    'Midsize Jet': 450,
    'Super Midsize Jet': 480,
    'Heavy Jet': 500,
    'Long Range Jet': 516,
  };
  return speeds[category] || 450;
}

function estimatePassengers(category: string): number {
  const pax: Record<string, number> = {
    'Light Jet': 6,
    'Midsize Jet': 8,
    'Super Midsize Jet': 9,
    'Heavy Jet': 14,
    'Long Range Jet': 16,
  };
  return pax[category] || 8;
}

function estimateRange(category: string): number {
  const ranges: Record<string, number> = {
    'Light Jet': 1500,
    'Midsize Jet': 2500,
    'Super Midsize Jet': 3300,
    'Heavy Jet': 5000,
    'Long Range Jet': 6500,
  };
  return ranges[category] || 3000;
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

export class VincentJetsProvider implements AircraftProvider {
  name = 'vincentjets';
  enabled = true;

  private cachedAircraft: NormalizedAircraft[] = [];

  async fetchAll(): Promise<NormalizedAircraft[]> {
    console.log('[VincentJets] Starting scrape from vincentjets.com/fleet...');
    const results: NormalizedAircraft[] = [];

    try {
      const html = await fetchPage(FLEET_URL);
      const $ = cheerio.load(html);

      // The page organizes aircraft by category sections
      // Category headings are typically in larger heading elements (h1, h2, h3)
      // Aircraft names are in h4 elements within each category section
      let currentCategory = 'Midsize Jet';

      // Walk through all heading elements in document order
      // Look for category headings (h1/h2/h3) and aircraft names (h4)
      $('h1, h2, h3, h4').each((_, el) => {
        const tagName = (el as cheerio.Element).tagName?.toLowerCase() || '';
        const text = $(el).text().trim();

        if (!text) return;

        // Category headings (h1, h2, h3) contain keywords like "Light Jets", "Heavy Jets"
        if (['h1', 'h2', 'h3'].includes(tagName)) {
          const lower = text.toLowerCase();
          if (lower.includes('jet') || lower.includes('range')) {
            const detected = classifyCategory(text);
            if (detected !== currentCategory) {
              currentCategory = detected;
              console.log(`[VincentJets] Category: ${currentCategory}`);
            }
          }
          return;
        }

        // h4 elements are aircraft names
        if (tagName === 'h4') {
          const aircraftName = text;
          if (!aircraftName || aircraftName.length < 3) return;

          const slug = slugify(`vincentjets-${aircraftName}`);
          const specs = matchSpecs(aircraftName);
          const isFeatured = FEATURED_MODELS.some(m => aircraftName.toLowerCase().includes(m));

          const pax = specs?.maxPassengers || estimatePassengers(currentCategory);
          const range = specs?.maxRange || estimateRange(currentCategory);
          const speed = specs?.cruiseSpeed || estimateSpeed(currentCategory);

          results.push({
            sourceProvider: this.name,
            sourceId: slug,
            name: aircraftName,
            slug,
            manufacturer: specs?.manufacturer || extractManufacturer(aircraftName),
            typeName: currentCategory,
            yearMin: specs?.yearMin || 2010,
            yearMax: specs?.yearMax || 2024,
            maxPassengers: pax,
            maxRange: range,
            cruiseSpeed: speed,
            cabinHeight: specs?.cabinHeight || null,
            cabinWidth: specs?.cabinWidth || null,
            cabinLength: specs?.cabinLength || null,
            baggageVolume: specs?.baggageVolume || null,
            basePricePerHour: DEFAULT_RATES[currentCategory] || 5000,
            heroImage: CATEGORY_IMAGES[currentCategory] || CATEGORY_IMAGES['Midsize Jet'],
            images: [CATEGORY_IMAGES[currentCategory] || CATEGORY_IMAGES['Midsize Jet']],
            description: `The ${aircraftName} is a ${currentCategory.toLowerCase()} available through Vincent Jets, offering ${pax}-passenger capacity and up to ${range.toLocaleString()} NM range for premium charter service.`,
            amenities: CATEGORY_AMENITIES[currentCategory] || [],
            featured: isFeatured,
          });

          console.log(`[VincentJets] Scraped: ${aircraftName} (${currentCategory}) - ${pax}pax, ${range}NM`);
        }
      });
    } catch (e) {
      console.error('[VincentJets] Failed to scrape fleet page:', e);
    }

    this.cachedAircraft = results;
    console.log(`[VincentJets] Total normalized: ${results.length}`);
    return results;
  }

  async fetchById(sourceId: string): Promise<NormalizedAircraft | null> {
    // If cache is empty, fetch all first
    if (this.cachedAircraft.length === 0) {
      await this.fetchAll();
    }
    return this.cachedAircraft.find(a => a.sourceId === sourceId) || null;
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
