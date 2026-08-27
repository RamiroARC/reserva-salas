import { C, insertDoc } from '../mongo.js';

export const VENUE = {
  name: 'Los Jazmines',
  capacity: 350,
  baseRentalPrice: 1200,
  description: 'Local de eventos Los Jazmines — salón principal con decoración, banquete y servicio completo.',
  amenities: [
    'Pisco sour y chicha',
    'Decoración 8 horas',
    'Biombo y centro de flores',
    'Menajería completa',
    'Servicio de mozos',
  ],
};

export const DEFAULT_EVENT_TYPES = [
  'Matrimonio',
  'Quinceañero',
  'Fiesta infantil',
  'Evento corporativo',
  'Bautizo / Comunión',
  'Aniversario',
  'Promoción',
  'Otro',
];

export async function seedEventTypes(localId) {
  const count = await C('event_types').countDocuments({ local_id: localId });
  if (count > 0) return;

  for (const [index, name] of DEFAULT_EVENT_TYPES.entries()) {
    await insertDoc('event_types', {
      local_id: localId,
      name,
      sort_order: index,
      active: 1,
    });
  }
}
