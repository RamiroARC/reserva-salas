import { seedLocalPackages } from '../catalogs/jazminesCatalog.js';
import { seedPromotionalPackages } from '../catalogs/promotionalPackages.js';
import { seedPromotionalOptionalItems } from '../catalogs/promotionalOptionalItems.js';
import { seedPromotionalPlatoFondo } from '../catalogs/promotionalPlatoFondoCatalog.js';
import { seedDecorationColors } from '../catalogs/decorationColorsCatalog.js';
import { seedContractExtraTerms } from '../catalogs/contractExtraTermsCatalog.js';
import { seedSeasonRates } from '../catalogs/seasonsCatalog.js';
import { seedEventTypes } from '../catalogs/venue.js';

export async function seedLocalCatalogs(localId, localName = 'Local') {
  await seedEventTypes(localId);
  await seedSeasonRates(localId);
  await seedLocalPackages(localId, localName);
  await seedPromotionalPackages(localId);
  await seedPromotionalPlatoFondo(localId);
  await seedPromotionalOptionalItems(localId);
  await seedDecorationColors(localId);
  await seedContractExtraTerms(localId);
}
