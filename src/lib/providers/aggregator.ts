import prisma from '../db';
import { AircraftProvider, ProviderStatus } from './types';
import { SeedProvider } from './seed-provider';
import { CharterExtractProvider } from './charter-extract-provider';
import { WebScrapeProvider } from './web-scrape-provider';

// Registry of all providers
const providers: AircraftProvider[] = [
  new SeedProvider(),
  new CharterExtractProvider(),
  new WebScrapeProvider(),
];

export function getProviders(): AircraftProvider[] {
  return providers;
}

export function getEnabledProviders(): AircraftProvider[] {
  return providers.filter(p => p.enabled);
}

export async function getProviderStatuses(): Promise<ProviderStatus[]> {
  const statuses: ProviderStatus[] = [];

  for (const provider of providers) {
    const count = await prisma.aircraft.count({
      where: { sourceProvider: provider.name, active: true },
    });

    let healthy = true;
    let error: string | null = null;

    if (provider.healthCheck) {
      try {
        healthy = await provider.healthCheck();
      } catch (e) {
        healthy = false;
        error = e instanceof Error ? e.message : 'Unknown error';
      }
    }

    statuses.push({
      name: provider.name,
      enabled: provider.enabled,
      lastFetch: null,
      aircraftCount: count,
      healthy,
      error,
    });
  }

  return statuses;
}

export async function syncProvider(provider: AircraftProvider): Promise<number> {
  const aircraft = await provider.fetchAll();
  let synced = 0;

  for (const item of aircraft) {
    // Ensure aircraft type exists
    const aircraftType = await prisma.aircraftType.upsert({
      where: { name: item.typeName },
      update: {},
      create: {
        name: item.typeName,
        description: `${item.typeName} category aircraft`,
      },
    });

    // Upsert aircraft
    await prisma.aircraft.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        typeId: aircraftType.id,
        manufacturer: item.manufacturer,
        yearMin: item.yearMin,
        yearMax: item.yearMax,
        maxPassengers: item.maxPassengers,
        maxRange: item.maxRange,
        cruiseSpeed: item.cruiseSpeed,
        cabinHeight: item.cabinHeight,
        cabinWidth: item.cabinWidth,
        cabinLength: item.cabinLength,
        baggageVolume: item.baggageVolume,
        basePricePerHour: item.basePricePerHour,
        heroImage: item.heroImage,
        images: item.images,
        description: item.description,
        amenities: item.amenities,
        sourceProvider: item.sourceProvider,
        sourceId: item.sourceId,
        featured: item.featured,
        active: true,
      },
      create: {
        name: item.name,
        slug: item.slug,
        typeId: aircraftType.id,
        manufacturer: item.manufacturer,
        yearMin: item.yearMin,
        yearMax: item.yearMax,
        maxPassengers: item.maxPassengers,
        maxRange: item.maxRange,
        cruiseSpeed: item.cruiseSpeed,
        cabinHeight: item.cabinHeight,
        cabinWidth: item.cabinWidth,
        cabinLength: item.cabinLength,
        baggageVolume: item.baggageVolume,
        basePricePerHour: item.basePricePerHour,
        heroImage: item.heroImage,
        images: item.images,
        description: item.description,
        amenities: item.amenities,
        sourceProvider: item.sourceProvider,
        sourceId: item.sourceId,
        featured: item.featured,
        active: true,
      },
    });

    synced++;
  }

  return synced;
}

export async function syncAllProviders(): Promise<Record<string, number>> {
  const results: Record<string, number> = {};

  for (const provider of getEnabledProviders()) {
    try {
      results[provider.name] = await syncProvider(provider);
    } catch (e) {
      console.error(`Failed to sync provider ${provider.name}:`, e);
      results[provider.name] = 0;
    }
  }

  // Create default markup rules if none exist
  const markupCount = await prisma.markupRule.count();
  if (markupCount === 0) {
    await prisma.markupRule.createMany({
      data: [
        {
          name: 'Global Default',
          markupType: 'percentage',
          markupValue: 15,
          priority: 0,
          active: true,
        },
        {
          name: 'Heavy Jet Premium',
          markupType: 'percentage',
          markupValue: 20,
          priority: 10,
          active: true,
          // typeId will be set after finding the type
        },
      ],
    });

    // Update Heavy Jet markup with correct typeId
    const heavyType = await prisma.aircraftType.findUnique({ where: { name: 'Heavy Jet' } });
    if (heavyType) {
      await prisma.markupRule.updateMany({
        where: { name: 'Heavy Jet Premium' },
        data: { typeId: heavyType.id },
      });
    }

    // Add Ultra Long Range premium
    const ultraType = await prisma.aircraftType.findUnique({ where: { name: 'Ultra Long Range' } });
    if (ultraType) {
      await prisma.markupRule.create({
        data: {
          name: 'Ultra Long Range Premium',
          typeId: ultraType.id,
          markupType: 'percentage',
          markupValue: 25,
          priority: 10,
          active: true,
        },
      });
    }
  }

  return results;
}
