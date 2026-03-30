import prisma from '../db';

interface MarkupResult {
  displayPricePerHour: number;
  markupApplied: string;
}

export async function applyMarkup(
  basePricePerHour: number,
  typeId: string,
  aircraftSlug: string
): Promise<MarkupResult> {
  const rules = await prisma.markupRule.findMany({
    where: { active: true },
    orderBy: { priority: 'desc' },
  });

  // Find the most specific applicable rule
  // Priority: aircraft-specific > type-specific > global
  const applicableRule =
    rules.find(r => r.aircraftSlug === aircraftSlug) ||
    rules.find(r => r.typeId === typeId && !r.aircraftSlug) ||
    rules.find(r => !r.typeId && !r.aircraftSlug);

  if (!applicableRule) {
    return {
      displayPricePerHour: basePricePerHour,
      markupApplied: 'none',
    };
  }

  let displayPrice: number;

  if (applicableRule.markupType === 'percentage') {
    displayPrice = basePricePerHour * (1 + applicableRule.markupValue / 100);
  } else {
    // fixed markup per hour
    displayPrice = basePricePerHour + applicableRule.markupValue;
  }

  // Round to nearest $50
  displayPrice = Math.round(displayPrice / 50) * 50;

  return {
    displayPricePerHour: displayPrice,
    markupApplied: applicableRule.name,
  };
}

export async function getDisplayPrice(
  basePricePerHour: number,
  typeId: string,
  aircraftSlug: string
): Promise<number> {
  const result = await applyMarkup(basePricePerHour, typeId, aircraftSlug);
  return result.displayPricePerHour;
}
