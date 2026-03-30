import { AircraftProvider, NormalizedAircraft } from './types';
import * as cheerio from 'cheerio';

/**
 * JetSetGo Provider
 *
 * Scrapes real aircraft data from jetsetgo.in (Indian private jet charter).
 * - Fleet page at /fleets lists ~10 aircraft with embedded Next.js initialData JSON
 * - Detail pages at /fleets/{id} have full specs including cabin dimensions
 * - Next.js SSR — parse embedded JSON from fleet list, then scrape detail pages for cabin dims
 * - No hourly rates published — uses category-based defaults
 * - Rate limit: 600ms between requests
 */

const BASE_URL = 'https://www.jetsetgo.in';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const RATE_LIMIT_MS = 600;

// Unsplash fallback images by category
const CATEGORY_IMAGES: Record<string, { hero: string; gallery: string[] }> = {
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
  'Large Jet': {
    hero: 'https://images.unsplash.com/photo-1569629743817-70d8db6c323b?w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1569629743817-70d8db6c323b?w=800&q=80',
      'https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=800&q=80',
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
  'Twin-Engine Helicopter': {
    hero: 'https://images.unsplash.com/photo-1534790566855-4cb788d389ec?w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1534790566855-4cb788d389ec?w=800&q=80',
    ],
  },
};

// Default hourly rates by category (JetSetGo does not publish rates)
const DEFAULT_RATES: Record<string, number> = {
  'Light Jet': 3200,
  'Midsize Jet': 4500,
  'Super Midsize Jet': 5500,
  'Super Midsize': 5500,
  'Large Jet': 7500,
  'Heavy Jet': 7800,
  'Ultra Long Range': 11000,
  'Twin-Engine Helicopter': 2500,
};

// Standard amenities by category
const CATEGORY_AMENITIES: Record<string, string[]> = {
  'Light Jet': ['Leather Seating', 'Climate Control', 'USB Charging', 'Lavatory'],
  'Midsize Jet': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Power Outlets', 'Climate Control', 'Leather Seating'],
  'Super Midsize Jet': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Satellite Phone', 'Power Outlets', 'Climate Control', 'Crew Service'],
  'Super Midsize': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Satellite Phone', 'Power Outlets', 'Climate Control', 'Crew Service'],
  'Large Jet': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Satellite Phone', 'Power Outlets', 'Climate Control', 'Sleeping Configuration', 'Conference Table'],
  'Heavy Jet': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Satellite Phone', 'Power Outlets', 'Climate Control', 'Sleeping Configuration', 'Conference Table'],
  'Ultra Long Range': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Satellite Phone', 'Power Outlets', 'Climate Control', 'Sleeping Configuration', 'Shower', 'Conference Table'],
  'Twin-Engine Helicopter': ['Leather Seating', 'Climate Control', 'Noise-Cancelling Headsets'],
};

const FEATURED_MODELS = ['falcon 2000', 'legacy 600', 'gulfstream', 'global'];

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function extractManufacturer(name: string): string {
  const lower = name.toLowerCase();
  const map: Record<string, string> = {
    'citation': 'Textron Aviation',
    'cessna': 'Textron Aviation',
    'hawker': 'Textron Aviation',
    'beechcraft': 'Textron Aviation',
    'gulfstream': 'Gulfstream',
    'global': 'Bombardier',
    'challenger': 'Bombardier',
    'learjet': 'Bombardier',
    'falcon': 'Dassault Aviation',
    'legacy': 'Embraer',
    'phenom': 'Embraer',
    'lineage': 'Embraer',
    'augusta': 'Leonardo',
    'agusta': 'Leonardo',
    'aw': 'Leonardo',
    'bell': 'Bell Textron',
    'airbus': 'Airbus',
    'boeing': 'Boeing',
    'pilatus': 'Pilatus',
    'king air': 'Textron Aviation',
  };
  for (const [key, mfr] of Object.entries(map)) {
    if (lower.includes(key)) return mfr;
  }
  return 'Various';
}

/** Normalize JetSetGo's category names to standard types */
function normalizeCategory(category: string): string {
  const lower = category.toLowerCase();
  if (lower.includes('light')) return 'Light Jet';
  if (lower.includes('super mid')) return 'Super Midsize Jet';
  if (lower.includes('midsize') || lower.includes('mid size')) return 'Midsize Jet';
  if (lower.includes('large')) return 'Large Jet';
  if (lower.includes('heavy')) return 'Heavy Jet';
  if (lower.includes('ultra')) return 'Ultra Long Range';
  if (lower.includes('heli')) return 'Twin-Engine Helicopter';
  return category;
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

interface FleetListItem {
  id: number;
  name: string;
  category: string;
  description: string;
  seating_capacity: number;
  baggage_capacity_in_kg: number;
  crew: number;
  flight_attendant: boolean;
  year_of_manufacture: string;
  cruise_speed_in_nm_per_hour: number;
  flying_range_in_nm: number;
  display_image: string;
}

interface DetailSpecs {
  cabinHeight: number | null;
  cabinWidth: number | null;
  cabinLength: number | null;
  baggageVolumeCuFt: number | null;
  images: string[];
  yearRefurbished: string | null;
}

/** Extract the fleet list JSON from the Next.js RSC/SSR page source */
function extractFleetJson(html: string): FleetListItem[] {
  // Try __NEXT_DATA__ script tag first
  const nextDataMatch = html.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nextDataMatch) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]);
      const pageProps = nextData?.props?.pageProps;
      if (pageProps) {
        const fleets = pageProps.fleets || pageProps.aircraft || pageProps.data || pageProps.initialData;
        if (Array.isArray(fleets)) return fleets;
        for (const key of Object.keys(pageProps)) {
          if (Array.isArray(pageProps[key]) && pageProps[key].length > 0 && pageProps[key][0]?.name) {
            return pageProps[key];
          }
        }
      }
    } catch {
      // Fall through
    }
  }

  // Next.js RSC streaming format: self.__next_f.push() calls with escaped JSON
  // Look for "initialData":[...] pattern in the raw HTML (may be escaped)
  // First try unescaped
  const initMatch = html.match(/"initialData"\s*:\s*(\[[\s\S]*?\])\s*[,}]/);
  if (initMatch) {
    try {
      return JSON.parse(initMatch[1]);
    } catch {
      // May be double-escaped
    }
  }

  // Try with escaped quotes (RSC format uses \" inside string payloads)
  const escapedMatch = html.match(/\\"initialData\\":\s*(\[[\s\S]*?\])\s*[,\\}]/);
  if (escapedMatch) {
    try {
      // Unescape the JSON string
      const unescaped = escapedMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
      return JSON.parse(unescaped);
    } catch {
      // Fall through
    }
  }

  // Broader approach: find any JSON array with aircraft-like objects in the full HTML
  // Match pattern: [{"id":NNN,"name":"...","category":"...
  const broadMatch = html.match(/\[\s*\{\s*(?:\\?")id(?:\\?"):\s*\d+\s*,\s*(?:\\?")name(?:\\?")/);
  if (broadMatch) {
    // Find the start index and extract the full array
    const startIdx = html.indexOf(broadMatch[0]);
    if (startIdx >= 0) {
      // Walk forward to find matching bracket
      let depth = 0;
      let endIdx = startIdx;
      for (let i = startIdx; i < html.length && i < startIdx + 50000; i++) {
        if (html[i] === '[') depth++;
        else if (html[i] === ']') {
          depth--;
          if (depth === 0) { endIdx = i + 1; break; }
        }
      }
      if (endIdx > startIdx) {
        let jsonStr = html.substring(startIdx, endIdx);
        // Try parsing as-is first, then try unescaping
        try {
          return JSON.parse(jsonStr);
        } catch {
          try {
            jsonStr = jsonStr.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
            return JSON.parse(jsonStr);
          } catch {
            // Fall through
          }
        }
      }
    }
  }

  return [];
}

/** Scrape cabin dimensions and images from a detail page */
function extractDetailSpecs(html: string): DetailSpecs {
  const $ = cheerio.load(html);
  const bodyText = $('body').text();

  // Parse cabin dimensions from spec grid
  const heightMatch = bodyText.match(/(?:cabin\s*)?height[:\s]*([\d.]+)\s*(?:FT|ft|feet)/i);
  const widthMatch = bodyText.match(/(?:cabin\s*)?width[:\s]*([\d.]+)\s*(?:FT|ft|feet)/i);
  const lengthMatch = bodyText.match(/(?:cabin\s*)?length[:\s]*([\d.]+)\s*(?:FT|ft|feet)/i);
  const baggageMatch = bodyText.match(/baggage\s*(?:capacity)?[:\s]*([\d.]+)\s*(?:CUFT|cu\s*ft|cubic)/i);
  const refurbMatch = bodyText.match(/(?:year\s*of\s*)?refurbish(?:ing|ed)?[:\s]*(\d{4})/i);

  // Collect images from the page
  const images: string[] = [];
  $('img[src]').each((_, img) => {
    const src = $(img).attr('src') || '';
    if (src && !src.includes('logo') && !src.includes('icon') && !src.includes('favicon') &&
        (src.includes('cloudfront') || src.includes('jetsetgo') || src.includes('upload'))) {
      const fullSrc = src.startsWith('http') ? src : `${BASE_URL}${src}`;
      if (!images.includes(fullSrc)) {
        images.push(fullSrc);
      }
    }
  });

  return {
    cabinHeight: heightMatch ? parseNumber(heightMatch[1]) : null,
    cabinWidth: widthMatch ? parseNumber(widthMatch[1]) : null,
    cabinLength: lengthMatch ? parseNumber(lengthMatch[1]) : null,
    baggageVolumeCuFt: baggageMatch ? parseNumber(baggageMatch[1]) : null,
    yearRefurbished: refurbMatch ? refurbMatch[1] : null,
    images,
  };
}

export class JetSetGoProvider implements AircraftProvider {
  name = 'jetsetgo';
  enabled = true;

  async fetchAll(): Promise<NormalizedAircraft[]> {
    console.log('[JetSetGo] Starting scrape from jetsetgo.in...');
    const results: NormalizedAircraft[] = [];

    // Step 1: Fetch fleet listing page and extract embedded JSON
    let fleetItems: FleetListItem[] = [];
    try {
      const html = await fetchPage(`${BASE_URL}/fleets`);
      fleetItems = extractFleetJson(html);
      console.log(`[JetSetGo] Extracted ${fleetItems.length} aircraft from fleet JSON`);
    } catch (e) {
      console.error('[JetSetGo] Failed to fetch fleet listing:', e);
      return results;
    }

    if (fleetItems.length === 0) {
      console.warn('[JetSetGo] No aircraft found in fleet JSON — page structure may have changed');
      return results;
    }

    // Step 2: Scrape each detail page for cabin dimensions and extra images
    for (const item of fleetItems) {
      try {
        await new Promise(r => setTimeout(r, RATE_LIMIT_MS));

        const detailUrl = `${BASE_URL}/fleets/${item.id}`;
        const detailHtml = await fetchPage(detailUrl);
        const detail = extractDetailSpecs(detailHtml);

        const category = normalizeCategory(item.category);
        const categoryKey = Object.keys(DEFAULT_RATES).find(
          k => k.toLowerCase() === category.toLowerCase()
        ) || category;

        const slug = slugify(`jetsetgo-${item.name}-${item.id}`);
        const isFeatured = FEATURED_MODELS.some(m => item.name.toLowerCase().includes(m));

        // Determine year range
        const yom = parseInt(item.year_of_manufacture, 10);
        const yearMin = isNaN(yom) ? null : yom;
        const yearMax = detail.yearRefurbished ? parseInt(detail.yearRefurbished, 10) : yearMin;

        // Build image list: detail page images first, then display_image, then fallback
        const fallback = CATEGORY_IMAGES[categoryKey] || CATEGORY_IMAGES['Midsize Jet'];
        const allImages: string[] = [];
        if (detail.images.length > 0) {
          allImages.push(...detail.images);
        }
        if (item.display_image && !allImages.includes(item.display_image)) {
          allImages.unshift(item.display_image);
        }
        const heroImage = allImages[0] || fallback.hero;
        const images = allImages.length > 0 ? allImages : fallback.gallery;

        // Baggage: prefer cu ft from detail page, fall back to kg from list
        const baggageVolume = detail.baggageVolumeCuFt ?? null;

        results.push({
          sourceProvider: this.name,
          sourceId: `${item.id}`,
          name: item.name,
          slug,
          manufacturer: extractManufacturer(item.name),
          typeName: category,
          yearMin,
          yearMax: yearMax ?? yearMin,
          maxPassengers: item.seating_capacity || 0,
          maxRange: item.flying_range_in_nm || 0,
          cruiseSpeed: item.cruise_speed_in_nm_per_hour || 0,
          cabinHeight: detail.cabinHeight,
          cabinWidth: detail.cabinWidth,
          cabinLength: detail.cabinLength,
          baggageVolume,
          basePricePerHour: DEFAULT_RATES[categoryKey] || 5000,
          heroImage,
          images,
          description: item.description ||
            `The ${item.name} is a ${category.toLowerCase()} available for charter through JetSetGo, offering ${item.seating_capacity}-passenger capacity and ${item.flying_range_in_nm} NM range across India and beyond.`,
          amenities: CATEGORY_AMENITIES[categoryKey] || CATEGORY_AMENITIES['Midsize Jet'],
          featured: isFeatured,
        });

        console.log(
          `[JetSetGo] Scraped: ${item.name} (ID ${item.id}) — ${item.seating_capacity}pax, ${item.flying_range_in_nm}NM, cabin ${detail.cabinLength ?? '?'}×${detail.cabinWidth ?? '?'}×${detail.cabinHeight ?? '?'} ft`
        );
      } catch (e) {
        console.error(`[JetSetGo] Failed to scrape detail for ${item.name} (ID ${item.id}):`, e);
      }
    }

    console.log(`[JetSetGo] Total normalized: ${results.length}`);
    return results;
  }

  async fetchById(sourceId: string): Promise<NormalizedAircraft | null> {
    try {
      const detailUrl = `${BASE_URL}/fleets/${sourceId}`;
      const detailHtml = await fetchPage(detailUrl);
      const $ = cheerio.load(detailHtml);
      const bodyText = $('body').text();

      // Extract basic info from detail page
      const nameMatch = bodyText.match(/^[\s\S]*?((?:Cessna|Hawker|Gulfstream|Falcon|Legacy|Bombardier|Embraer|Augusta|Pilatus|Citation|Phenom|Challenger|Learjet|King Air|Global|Lineage)[^\n]+)/i);
      const name = nameMatch ? nameMatch[1].trim() : `Aircraft ${sourceId}`;

      const detail = extractDetailSpecs(detailHtml);

      const paxMatch = bodyText.match(/(?:passenger|seating)[:\s]*(\d+)/i);
      const rangeMatch = bodyText.match(/(?:flying\s*)?range[:\s]*([\d,]+)\s*NM/i);
      const speedMatch = bodyText.match(/(?:cruise\s*)?speed[:\s]*([\d,]+)\s*(?:KTS|knots)/i);
      const categoryMatch = bodyText.match(/(?:aircraft\s*type|category)[:\s]*([A-Za-z\s]+?)(?:\n|$)/i);

      const category = categoryMatch ? normalizeCategory(categoryMatch[1].trim()) : 'Midsize Jet';
      const categoryKey = Object.keys(DEFAULT_RATES).find(
        k => k.toLowerCase() === category.toLowerCase()
      ) || category;
      const slug = slugify(`jetsetgo-${name}-${sourceId}`);
      const fallback = CATEGORY_IMAGES[categoryKey] || CATEGORY_IMAGES['Midsize Jet'];

      return {
        sourceProvider: this.name,
        sourceId,
        name,
        slug,
        manufacturer: extractManufacturer(name),
        typeName: category,
        yearMin: null,
        yearMax: null,
        maxPassengers: paxMatch ? parseInt(paxMatch[1], 10) : 0,
        maxRange: rangeMatch ? parseNumber(rangeMatch[1]) : 0,
        cruiseSpeed: speedMatch ? parseNumber(speedMatch[1]) : 0,
        cabinHeight: detail.cabinHeight,
        cabinWidth: detail.cabinWidth,
        cabinLength: detail.cabinLength,
        baggageVolume: detail.baggageVolumeCuFt,
        basePricePerHour: DEFAULT_RATES[categoryKey] || 5000,
        heroImage: detail.images[0] || fallback.hero,
        images: detail.images.length > 0 ? detail.images : fallback.gallery,
        description: `The ${name} is a ${category.toLowerCase()} available for charter through JetSetGo.`,
        amenities: CATEGORY_AMENITIES[categoryKey] || CATEGORY_AMENITIES['Midsize Jet'],
        featured: false,
      };
    } catch (e) {
      console.error(`[JetSetGo] fetchById(${sourceId}) failed:`, e);
      return null;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${BASE_URL}/fleets`, {
        method: 'HEAD',
        headers: { 'User-Agent': USER_AGENT },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
