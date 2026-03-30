import { AircraftProvider, NormalizedAircraft } from './types';
import * as cheerio from 'cheerio';

/**
 * VistaJet Provider
 *
 * Scrapes real aircraft data from vistajet.com
 * - SSR hybrid HTML, specs in dl/dt/dd elements
 * - Fleet page lists 15+ aircraft with detail page links
 * - Detail pages have: pax, sleeping, range, cabin dims, baggage, flight hours
 * - No anti-bot protection
 * - No hourly rates (quote-based)
 */

const BASE_URL = 'https://www.vistajet.com';
const FLEET_URL = `${BASE_URL}/en/fleet/`;
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const CATEGORY_IMAGES: Record<string, string> = {
  'Light Jet': 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=1200&q=80',
  'Midsize Jet': 'https://images.unsplash.com/photo-1474302770737-173ee21bab63?w=1200&q=80',
  'Super Midsize Jet': 'https://images.unsplash.com/photo-1583395838144-09af498fda85?w=1200&q=80',
  'Heavy Jet': 'https://images.unsplash.com/photo-1569629743817-70d8db6c323b?w=1200&q=80',
  'Ultra Long Range': 'https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=1200&q=80',
};

const DEFAULT_RATES: Record<string, number> = {
  'Light Jet': 3400,
  'Midsize Jet': 4800,
  'Super Midsize Jet': 6000,
  'Heavy Jet': 8000,
  'Ultra Long Range': 12000,
};

const CATEGORY_AMENITIES: Record<string, string[]> = {
  'Midsize Jet': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Power Outlets', 'Climate Control'],
  'Super Midsize Jet': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Satellite Phone', 'Power Outlets', 'Crew Service'],
  'Heavy Jet': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Satellite Phone', 'Power Outlets', 'Sleeping Configuration', 'Conference Table'],
  'Ultra Long Range': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Satellite Phone', 'Power Outlets', 'Sleeping Configuration', 'Shower', 'Conference Table'],
};

const FEATURED_MODELS = ['global 7500', 'global 6000', 'challenger 850', 'falcon 7x', 'lineage 1000'];

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function parseNumber(text: string): number {
  return parseFloat(text.replace(/,/g, '').replace(/[^\d.]/g, '')) || 0;
}

function parseFeetInches(text: string): number {
  // Parse "6 ft 2 in" or "54 ft 5 in" format
  const match = text.match(/(\d+)\s*ft\s*(\d+)?\s*(?:in)?/i);
  if (match) {
    const feet = parseInt(match[1], 10);
    const inches = match[2] ? parseInt(match[2], 10) : 0;
    return Math.round((feet + inches / 12) * 10) / 10;
  }
  return 0;
}

function extractManufacturer(name: string): string {
  const lower = name.toLowerCase();
  const map: Record<string, string> = {
    'global': 'Bombardier', 'challenger': 'Bombardier', 'learjet': 'Bombardier',
    'gulfstream': 'Gulfstream', 'citation': 'Textron Aviation',
    'falcon': 'Dassault Aviation', 'legacy': 'Embraer', 'lineage': 'Embraer',
    'phenom': 'Embraer', 'praetor': 'Embraer',
  };
  for (const [key, mfr] of Object.entries(map)) {
    if (lower.includes(key)) return mfr;
  }
  return 'Various';
}

function categorizeByRange(range: number, pax: number): string {
  if (range >= 5500 || pax >= 14) return 'Ultra Long Range';
  if (range >= 3500 || pax >= 10) return 'Heavy Jet';
  if (range >= 2500 || pax >= 8) return 'Super Midsize Jet';
  if (range >= 1500) return 'Midsize Jet';
  return 'Light Jet';
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

export class VistaJetProvider implements AircraftProvider {
  name = 'vistajet';
  enabled = true;

  async fetchAll(): Promise<NormalizedAircraft[]> {
    console.log('[VistaJet] Starting scrape from vistajet.com...');
    const results: NormalizedAircraft[] = [];

    // Step 1: Get aircraft detail page URLs from fleet page
    const detailUrls: string[] = [];
    try {
      const html = await fetchPage(FLEET_URL);
      const $ = cheerio.load(html);

      $('a[href*="/private-jets/"]').each((_, el) => {
        const href = $(el).attr('href') || '';
        if (href && !detailUrls.includes(href) && href.split('/').filter(Boolean).length >= 4) {
          const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
          if (!detailUrls.includes(fullUrl)) {
            detailUrls.push(fullUrl);
          }
        }
      });

      console.log(`[VistaJet] Found ${detailUrls.length} aircraft detail pages`);
    } catch (e) {
      console.error('[VistaJet] Failed to scrape fleet page:', e);
      return results;
    }

    // Step 2: Scrape each detail page
    for (const url of detailUrls) {
      try {
        await new Promise(r => setTimeout(r, 500));
        const html = await fetchPage(url);
        const $ = cheerio.load(html);

        // Extract name from h1 or URL
        let name = $('h1').first().text().trim()
          .replace(/\s*private jet\s*/gi, '')
          .replace(/\s*business jet\s*/gi, '')
          .trim();
        if (!name || name.length < 3) {
          // Parse from URL: /en/private-jets/bombardier/global-7500/
          const parts = url.split('/').filter(Boolean);
          name = parts[parts.length - 1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        }

        // Extract specs from body text (SSR doesn't render dt/dd, specs are in text)
        const bodyText = $('body').text();

        const paxMatch = bodyText.match(/(\d+)\s*(?:passengers|seats)/i);
        const pax = paxMatch ? parseInt(paxMatch[1], 10) : 0;

        const rangeMatch = bodyText.match(/([\d,]+)\s*nm/i);
        const range = rangeMatch ? parseNumber(rangeMatch[1]) : 0;

        const cabinHMatch = bodyText.match(/cabin height[:\s]*([\d]+\s*ft\s*\d*\s*(?:in)?)/i);
        const cabinWMatch = bodyText.match(/cabin width[:\s]*([\d]+\s*ft\s*\d*\s*(?:in)?)/i);
        const cabinLMatch = bodyText.match(/cabin length[:\s]*([\d]+\s*ft\s*\d*\s*(?:in)?)/i);
        const baggageMatch = bodyText.match(/([\d]+)\s*ft[³3]/i);

        const cabinH = cabinHMatch ? parseFeetInches(cabinHMatch[1]) : 0;
        const cabinW = cabinWMatch ? parseFeetInches(cabinWMatch[1]) : 0;
        const cabinL = cabinLMatch ? parseFeetInches(cabinLMatch[1]) : 0;
        const baggage = baggageMatch ? parseNumber(baggageMatch[1]) : 0;

        if (pax === 0 && range === 0) {
          console.log(`[VistaJet] Skipping ${name} - no specs found`);
          continue;
        }

        // Get hero image
        let heroImage = '';
        $('img[src*="vistajet"]').each((_, img) => {
          const src = $(img).attr('src') || $(img).attr('data-src') || '';
          if (src && !heroImage && !src.includes('logo') && !src.includes('icon')) {
            heroImage = src.startsWith('http') ? src : `${BASE_URL}${src}`;
          }
        });

        const type = categorizeByRange(range, pax);
        const slug = slugify(`vistajet-${name}`);
        const isFeatured = FEATURED_MODELS.some(m => name.toLowerCase().includes(m));

        results.push({
          sourceProvider: this.name,
          sourceId: slug,
          name,
          slug,
          manufacturer: extractManufacturer(name),
          typeName: type,
          yearMin: 2016,
          yearMax: 2025,
          maxPassengers: pax,
          maxRange: range,
          cruiseSpeed: estimateSpeed(type),
          cabinHeight: cabinH || null,
          cabinWidth: cabinW || null,
          cabinLength: cabinL || null,
          baggageVolume: baggage || null,
          basePricePerHour: DEFAULT_RATES[type] || 6000,
          heroImage: heroImage || CATEGORY_IMAGES[type] || CATEGORY_IMAGES['Heavy Jet'],
          images: heroImage ? [heroImage] : [CATEGORY_IMAGES[type] || CATEGORY_IMAGES['Heavy Jet']],
          description: `The ${name} is available for private charter through VistaJet, offering ${pax}-passenger capacity with ${range} NM range. VistaJet operates the world's largest privately owned fleet of silver and red business aircraft.`,
          amenities: CATEGORY_AMENITIES[type] || CATEGORY_AMENITIES['Heavy Jet'],
          featured: isFeatured,
        });

        console.log(`[VistaJet] Scraped: ${name} - ${pax}pax, ${range}NM`);
      } catch (e) {
        console.error(`[VistaJet] Failed to scrape ${url}:`, e);
      }
    }

    console.log(`[VistaJet] Total normalized: ${results.length}`);
    return results;
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

function estimateSpeed(category: string): number {
  const speeds: Record<string, number> = {
    'Light Jet': 400, 'Midsize Jet': 460, 'Super Midsize Jet': 480,
    'Heavy Jet': 500, 'Ultra Long Range': 516,
  };
  return speeds[category] || 480;
}
