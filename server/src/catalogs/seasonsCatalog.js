import { C, insertDoc } from '../mongo.js';

export const DEFAULT_SEASONS = [
  { name: 'Temporada Baja', month_start: 4, month_end: 5, multiplier: 0.85 },
  { name: 'Normal', month_start: 6, month_end: 11, multiplier: 1.0 },
  { name: 'Fin de año (Alta)', month_start: 12, month_end: 2, multiplier: 1.3 },
];

export async function seedSeasonRates(localId) {
  const count = await C('season_rates').countDocuments({ local_id: localId });
  if (count > 0) return;

  for (const season of DEFAULT_SEASONS) {
    await insertDoc('season_rates', {
      local_id: localId,
      name: season.name,
      month_start: season.month_start,
      month_end: season.month_end,
      multiplier: season.multiplier,
    });
  }
}
