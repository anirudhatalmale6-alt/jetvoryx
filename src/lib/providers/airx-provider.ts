import { AircraftProvider, NormalizedAircraft } from './types';
import * as cheerio from 'cheerio';

/**
 * AirX Provider
 *
 * Scrapes real aircraft data from airx.aero (Malta-based VIP charter operator).
 * - Fleet page at /private-jets/ lists ~12 aircraft in a carousel/slider
 * - Detail pages at /jets/{registration}/ have full specs (cabin dims, speed, range)
 * - WordPress SSR — standard HTML parsing with Cheerio
 * - reCAPTCHA only on forms, not content pages
 * - No hourly rates published — uses category-based defaults
 * - Rate limit: 600ms between requests
 */

const BASE_URL = 'https://www.airx.aero';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const RATE_LIMIT_MS = 600;

// Unsplash fallback images by category
const CATEGORY_IMAGES: Record<string, { hero: string; gallery: string[] }> = {
  'Heavy Jet': {
    hero: 'https://images.unsplash.com/photo-1569629743817-70d8db6c323b?w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1569629743817-70d8db6c323b?w=800&q=80',
      'https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=800&q=80',
    ],
  },
  'Large Jet': {
    hero: 'https://images.unsplash.com/photo-1569629743817-70d8db6c323b?w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1569629743817-70d8db6c323b?w=800&q=80',
      'https://images.unsplash.com/photo-1474302770737-173ee21bab63?w=800&q=80',
    ],
  },
  'Super Midsize Jet': {
    hero: 'https://images.unsplash.com/photo-1583395838144-09af498fda85?w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1583395838144-09af498fda85?w=800&q=80',
      'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=800&q=80',
    ],
  },
  'Ultra Long Range': {
    hero: 'https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=1200&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1436491865332-7a61a109db05?w=800&q=80',
      'https://images.unsplash.com/photo-1569629743817-70d8db6c323b?w=800&q=80',
    ],
  },
};

// Default hourly rates — AirX does not publish rates
const DEFAULT_RATES: Record<string, number> = {
  'Heavy Jet': 7500,
  'Large Jet': 7200,
  'Super Midsize Jet': 5800,
  'Ultra Long Range': 11000,
};

// Standard amenities by category
const CATEGORY_AMENITIES: Record<string, string[]> = {
  'Heavy Jet': ['Wi-Fi', 'Full Galley', 'Dual Lavatories', 'Entertainment System', 'Satellite Phone', 'Power Outlets', 'Climate Control', 'Sleeping Configuration', 'Conference Table', 'Flight Attendant'],
  'Large Jet': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Satellite Phone', 'Power Outlets', 'Climate Control', 'Sleeping Configuration', 'Conference Table', 'Flight Attendant'],
  'Super Midsize Jet': ['Wi-Fi', 'Full Galley', 'Lavatory', 'Entertainment System', 'Satellite Phone', 'Power Outlets', 'Climate Control', 'Crew Service'],
  'Ultra Long Range': ['Wi-Fi', 'Full Galley', 'Dual Lavatories', 'Entertainment System', 'Satellite Phone', 'Power Outlets', 'Climate Control', 'Sleeping Configuration', 'Shower', 'Conference Table', 'Flight Attendant'],
};

// Models that AirX operates — used to classify by type
const MODEL_CATEGORIES: Record<string, string> = {
  'challenger 850': 'Heavy Jet',
  'legacy 600': 'Large Jet',
  'legacy 650': 'Large Jet',
  'global express': 'Ultra Long Range',
  'global 6000': 'Ultra Long Range',
  'global 7500': 'Ultra Long Range',
  'gulfstream g650': 'Ultra Long Range',
};

const FEATURED_REGISTRATIONS = ['9h-amy', '9h-imp', '9h-jad'];

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
  registration: string;
  model: string;
  pax: number;
  rangeHours: number;
  baggageInfo: string;
  detailUrl: string;
  heroImage: string;
}

interface DetailSpecs {
  speedKtas: number;
  cabinLength: number | null;
  cabinHeight: number | null;
  cabinWidth: number | null;
  description: string;
  images: string[];
  amenities: string[];
}

/** Parse the fleet listing page to extract aircraft cards */
function parseFleetList(html: string): FleetListItem[] {
  const $ = cheerio.load(html);
  const items: FleetListItem[] = [];

  // AirX uses a carousel/slider with cards linking to /jets/{reg}/
  $('a[href*="/jets/"]').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href') || '';

    // Extract registration from URL: /jets/9h-amy/
    const regMatch = href.match(/\/jets\/([^/]+)\/?$/i);
    if (!regMatch) return;

    const registration = regMatch[1].toUpperCase();

    // Skip if already added (page may have duplicate links)
    if (items.some(i => i.registration === registration)) return;

    // Walk up to find the card container and extract data
    const $card = $el.closest('[class*="card"], [class*="slide"], [class*="item"], div').first();
    const cardText = $card.length ? $card.text() : $el.text();

    // Extract model name — typically a heading within/near the link
    let model = '';
    const $heading = $card.find('h1, h2, h3, h4, h5, h6, [class*="title"], [class*="name"]').first();
    if ($heading.length) {
      model = $heading.text().trim();
    }
    // Fallback: parse from link text
    if (!model) {
      const linkText = $el.text().trim();
      if (linkText && linkText.length < 50) model = linkText;
    }

    // Clean model name — remove registration if embedded
    model = model.replace(new RegExp(registration.replace('-', '[-\\s]?'), 'i'), '').trim();
    // Remove common non-model text
    model = model.replace(/explore\s*this\s*jet/i, '').replace(/view\s*details?/i, '').trim();

    // Extract pax from card text
    const paxMatch = cardText.match(/(\d+)\s*(?:pax|passenger|seat)/i);
    const pax = paxMatch ? parseInt(paxMatch[1], 10) : 0;

    // Extract range in hours
    const rangeMatch = cardText.match(/([\d.]+)\s*(?:hrs?|hours?)/i);
    const rangeHours = rangeMatch ? parseFloat(rangeMatch[1]) : 0;

    // Extract baggage info
    const bagMatch = cardText.match(/(\d+)\s*(?:bags?|luggage|pieces?)/i);
    const baggageInfo = bagMatch ? bagMatch[0] : '';

    // Get hero image
    let heroImage = '';
    const $img = $card.find('img').first();
    if ($img.length) {
      heroImage = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy-src') || '';
      if (heroImage && !heroImage.startsWith('http')) {
        heroImage = `${BASE_URL}${heroImage}`;
      }
    }

    const detailUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;

    if (registration) {
      items.push({
        registration,
        model: model || `Unknown (${registration})`,
        pax,
        rangeHours,
        baggageInfo,
        detailUrl,
        heroImage,
      });
    }
  });

  return items;
}

/** Scrape full specs from an individual aircraft detail page */
function parseDetailPage(html: string): DetailSpecs {
  const $ = cheerio.load(html);
  const bodyText = $('body').text();

  // Speed in KTAS
  const speedMatch = bodyText.match(/(\d{3,4})\s*(?:KTAS|ktas|KT\/AS)/i)
    || bodyText.match(/(?:max(?:imum)?\s*)?speed[:\s]*([\d,]+)\s*(?:KTAS|ktas|knots|kn)/i)
    || bodyText.match(/([\d,]+)\s*(?:km\/h|kmh)/i);
  let speedKtas = 0;
  if (speedMatch) {
    const val = parseNumber(speedMatch[1]);
    // If the value looks like km/h (>600), convert to knots
    speedKtas = val > 600 ? Math.round(val * 0.539957) : val;
  }

  // Cabin dimensions — AirX shows both ft and m
  const cabinLMatch = bodyText.match(/(?:cabin\s*)?length[:\s]*([\d.]+)\s*(?:FT|ft|feet)/i);
  const cabinHMatch = bodyText.match(/(?:cabin\s*)?height[:\s]*([\d.]+)\s*(?:FT|ft|feet)/i);
  const cabinWMatch = bodyText.match(/(?:cabin\s*)?width[:\s]*([\d.]+)\s*(?:FT|ft|feet)/i);

  // Fallback: parse meters and convert
  let cabinLength = cabinLMatch ? parseNumber(cabinLMatch[1]) : null;
  let cabinHeight = cabinHMatch ? parseNumber(cabinHMatch[1]) : null;
  let cabinWidth = cabinWMatch ? parseNumber(cabinWMatch[1]) : null;

  if (cabinLength === null) {
    const mMatch = bodyText.match(/(?:cabin\s*)?length[:\s]*([\d.]+)\s*(?:M|m|meters?)/i);
    if (mMatch) cabinLength = Math.round(parseNumber(mMatch[1]) * 3.28084 * 100) / 100;
  }
  if (cabinHeight === null) {
    const mMatch = bodyText.match(/(?:cabin\s*)?height[:\s]*([\d.]+)\s*(?:M|m|meters?)/i);
    if (mMatch) cabinHeight = Math.round(parseNumber(mMatch[1]) * 3.28084 * 100) / 100;
  }
  if (cabinWidth === null) {
    const mMatch = bodyText.match(/(?:cabin\s*)?width[:\s]*([\d.]+)\s*(?:M|m|meters?)/i);
    if (mMatch) cabinWidth = Math.round(parseNumber(mMatch[1]) * 3.28084 * 100) / 100;
  }

  // Description — look for main descriptive paragraph
  let description = '';
  $('p').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 80 && text.length < 600 && !description) {
      description = text;
    }
  });

  // Collect images
  const images: string[] = [];
  $('img[src]').each((_, img) => {
    const src = $(img).attr('src') || '';
    if (src && !src.includes('logo') && !src.includes('icon') && !src.includes('favicon') &&
        !src.includes('recaptcha') && !src.includes('gravatar') &&
        (src.includes('airx') || src.includes('wp-content') || src.includes('uploads'))) {
      const fullSrc = src.startsWith('http') ? src : `${BASE_URL}${src}`;
      if (!images.includes(fullSrc)) {
        images.push(fullSrc);
      }
    }
  });

  // Also check srcset and data-src for lazy-loaded images
  $('img[data-src], img[data-lazy-src]').each((_, img) => {
    const src = $(img).attr('data-src') || $(img).attr('data-lazy-src') || '';
    if (src && src.startsWith('http') && !images.includes(src) &&
        !src.includes('logo') && !src.includes('icon')) {
      images.push(src);
    }
  });

  // Extract amenities from page content
  const amenities: string[] = [];
  const amenityKeywords: Record<string, string> = {
    'galley': 'Full Galley',
    'lavator': 'Lavatory',
    'wi-fi': 'Wi-Fi',
    'wifi': 'Wi-Fi',
    'entertainment': 'Entertainment System',
    'conference': 'Conference Table',
    'sofa': 'Convertible Sofa',
    'bed': 'Sleeping Configuration',
    'reclin': 'Reclining Seats',
    'leather': 'Premium Leather Interior',
    'attendant': 'Flight Attendant',
    'satellite': 'Satellite Phone',
  };
  const lowerBody = bodyText.toLowerCase();
  for (const [keyword, amenity] of Object.entries(amenityKeywords)) {
    if (lowerBody.includes(keyword) && !amenities.includes(amenity)) {
      amenities.push(amenity);
    }
  }

  return { speedKtas, cabinLength, cabinHeight, cabinWidth, description, images, amenities };
}

/** Estimate range in NM from flight hours and cruise speed */
function estimateRangeNm(rangeHours: number, speedKtas: number): number {
  if (rangeHours > 0 && speedKtas > 0) {
    return Math.round(rangeHours * speedKtas);
  }
  // Fallback estimates based on typical AirX fleet
  if (rangeHours > 0) return Math.round(rangeHours * 450); // assume ~450 ktas avg
  return 0;
}

/** Categorize aircraft based on model name */
function classifyAircraft(model: string): string {
  const lower = model.toLowerCase();
  for (const [key, category] of Object.entries(MODEL_CATEGORIES)) {
    if (lower.includes(key)) return category;
  }
  // Default classification based on known traits
  if (lower.includes('challenger')) return 'Heavy Jet';
  if (lower.includes('legacy')) return 'Large Jet';
  if (lower.includes('global') || lower.includes('gulfstream')) return 'Ultra Long Range';
  return 'Heavy Jet'; // AirX fleet is primarily heavy/large
}

export class AirXProvider implements AircraftProvider {
  name = 'airx';
  enabled = true;

  async fetchAll(): Promise<NormalizedAircraft[]> {
    console.log('[AirX] Starting scrape from airx.aero...');
    const results: NormalizedAircraft[] = [];

    // Step 1: Fetch fleet listing page
    let fleetItems: FleetListItem[] = [];
    try {
      const html = await fetchPage(`${BASE_URL}/private-jets/`);
      fleetItems = parseFleetList(html);
      console.log(`[AirX] Found ${fleetItems.length} aircraft on fleet page`);
    } catch (e) {
      console.error('[AirX] Failed to fetch fleet listing:', e);
      return results;
    }

    if (fleetItems.length === 0) {
      console.warn('[AirX] No aircraft found on fleet page — HTML structure may have changed');
      return results;
    }

    // Step 2: Scrape each detail page for full specs
    for (const item of fleetItems) {
      try {
        await new Promise(r => setTimeout(r, RATE_LIMIT_MS));

        const detailHtml = await fetchPage(item.detailUrl);
        const detail = parseDetailPage(detailHtml);

        const category = classifyAircraft(item.model);
        const slug = slugify(`airx-${item.model}-${item.registration}`);
        const displayName = `${item.model} (${item.registration})`;
        const isFeatured = FEATURED_REGISTRATIONS.includes(item.registration.toLowerCase());

        // Calculate range in NM from hours + speed
        const rangeNm = estimateRangeNm(item.rangeHours, detail.speedKtas);

        // Build image list
        const fallback = CATEGORY_IMAGES[category] || CATEGORY_IMAGES['Heavy Jet'];
        const allImages: string[] = [];
        if (detail.images.length > 0) {
          allImages.push(...detail.images);
        }
        if (item.heroImage && !allImages.includes(item.heroImage)) {
          allImages.unshift(item.heroImage);
        }
        const heroImage = allImages[0] || fallback.hero;
        const images = allImages.length > 0 ? allImages : fallback.gallery;

        // Use detail amenities if found, else category defaults
        const amenities = detail.amenities.length > 0
          ? detail.amenities
          : (CATEGORY_AMENITIES[category] || CATEGORY_AMENITIES['Heavy Jet']);

        // Description from detail page or generate one
        const description = detail.description ||
          `The ${item.model} (${item.registration}) is a premium ${category.toLowerCase()} in the AirX charter fleet, offering ${item.pax}-passenger VIP seating with ${item.rangeHours}-hour range and luxury cabin appointments.`;

        results.push({
          sourceProvider: this.name,
          sourceId: item.registration.toLowerCase(),
          name: displayName,
          slug,
          manufacturer: extractManufacturer(item.model),
          typeName: category,
          yearMin: null,
          yearMax: null,
          maxPassengers: item.pax,
          maxRange: rangeNm,
          cruiseSpeed: detail.speedKtas || 0,
          cabinHeight: detail.cabinHeight,
          cabinWidth: detail.cabinWidth,
          cabinLength: detail.cabinLength,
          baggageVolume: null, // AirX lists bags not volume
          basePricePerHour: DEFAULT_RATES[category] || 7500,
          heroImage,
          images,
          description,
          amenities,
          featured: isFeatured,
        });

        console.log(
          `[AirX] Scraped: ${displayName} — ${item.pax}pax, ${detail.speedKtas}ktas, ${rangeNm}NM, cabin ${detail.cabinLength ?? '?'}×${detail.cabinWidth ?? '?'}×${detail.cabinHeight ?? '?'} ft`
        );
      } catch (e) {
        console.error(`[AirX] Failed to scrape ${item.model} (${item.registration}):`, e);
      }
    }

    console.log(`[AirX] Total normalized: ${results.length}`);
    return results;
  }

  async fetchById(sourceId: string): Promise<NormalizedAircraft | null> {
    try {
      const reg = sourceId.toLowerCase();
      const detailUrl = `${BASE_URL}/jets/${reg}/`;
      const detailHtml = await fetchPage(detailUrl);
      const $ = cheerio.load(detailHtml);
      const bodyText = $('body').text();

      const detail = parseDetailPage(detailHtml);

      // Extract model from page
      let model = '';
      $('h1, h2').each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length < 40 && !model) {
          model = text.replace(new RegExp(reg.replace('-', '[-\\s]?'), 'i'), '').trim();
        }
      });
      if (!model) model = `Aircraft ${sourceId.toUpperCase()}`;

      // Extract pax
      const paxMatch = bodyText.match(/(\d+)\s*(?:pax|passenger|seat)/i);
      const pax = paxMatch ? parseInt(paxMatch[1], 10) : 0;

      // Extract range hours
      const rangeMatch = bodyText.match(/([\d.]+)\s*(?:hrs?|hours?)/i);
      const rangeHours = rangeMatch ? parseFloat(rangeMatch[1]) : 0;
      const rangeNm = estimateRangeNm(rangeHours, detail.speedKtas);

      const category = classifyAircraft(model);
      const displayName = `${model} (${sourceId.toUpperCase()})`;
      const slug = slugify(`airx-${model}-${sourceId}`);
      const fallback = CATEGORY_IMAGES[category] || CATEGORY_IMAGES['Heavy Jet'];

      return {
        sourceProvider: this.name,
        sourceId: reg,
        name: displayName,
        slug,
        manufacturer: extractManufacturer(model),
        typeName: category,
        yearMin: null,
        yearMax: null,
        maxPassengers: pax,
        maxRange: rangeNm,
        cruiseSpeed: detail.speedKtas || 0,
        cabinHeight: detail.cabinHeight,
        cabinWidth: detail.cabinWidth,
        cabinLength: detail.cabinLength,
        baggageVolume: null,
        basePricePerHour: DEFAULT_RATES[category] || 7500,
        heroImage: detail.images[0] || fallback.hero,
        images: detail.images.length > 0 ? detail.images : fallback.gallery,
        description: detail.description || `The ${model} (${sourceId.toUpperCase()}) is a premium charter aircraft from AirX.`,
        amenities: detail.amenities.length > 0
          ? detail.amenities
          : (CATEGORY_AMENITIES[category] || CATEGORY_AMENITIES['Heavy Jet']),
        featured: false,
      };
    } catch (e) {
      console.error(`[AirX] fetchById(${sourceId}) failed:`, e);
      return null;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${BASE_URL}/private-jets/`, {
        method: 'HEAD',
        headers: { 'User-Agent': USER_AGENT },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
