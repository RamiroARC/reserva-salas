import { C, insertDoc } from '../mongo.js';

export const DEFAULT_PROMOTIONAL_PACKAGES = [
  {
    name: 'Paquete Económico',
    description: 'Paquete promocional Los Jazmines 2026. Ud. puede organizar su propio paquete con entradas y postres adicionales.',
    price: 40,
    price_type: 'per_person',
    min_attendees: null,
    max_attendees: null,
    includes: [
      'Pisco Sour (adultos) — Frugos o gaseosa (estudiantes)',
      'Plato de fondo a elección: ¼ Parrilla de pollo, ¼ Pollo al horno o 250 grs. Parrilla de chancho',
      'Jarra de chicha morada en mesa y postre',
      'Local decorado por 08 horas',
      'Biombo decorado',
      'Mesas con dos manteles y centro de flores naturales',
      'Menajería completa',
      'Equipo de sonido de salón',
      'Sillón de reyna',
      'Luces modo discoteca',
      'Alfombra',
      'Humo',
      'Servicio de mozos',
    ],
    month_start: null,
    month_end: null,
    active: 1,
    sort_order: 1,
  },
  {
    name: 'Paquete Básico',
    description: 'Paquete promocional Los Jazmines 2026 con bebidas adicionales.',
    price: 45,
    price_type: 'per_person',
    min_attendees: null,
    max_attendees: null,
    includes: [
      'Pisco Sour (adultos) — Frugos o gaseosa (estudiantes)',
      'Plato de fondo a elección: ¼ Parrilla de pollo, ¼ Pollo al horno o 250 grs. Parrilla de chancho',
      'Jarra de chicha morada en mesa y postre',
      'Una botella de vino Santiago Queirolo, gaseosa de 3 litros Inka y Coca Cola original, y 2½ litros de agua',
      'Local decorado por 08 horas',
      'Biombo decorado',
      'Mesas con dos manteles y centro de flores naturales',
      'Menajería completa',
      'Equipo de sonido de salón',
      'Sillón de reyna',
      'Luces modo discoteca',
      'Alfombra',
      'Humo',
      'Servicio de mozos',
    ],
    month_start: null,
    month_end: null,
    active: 1,
    sort_order: 2,
  },
  {
    name: 'Paquete Ejecutivo',
    description: 'Paquete promocional Los Jazmines 2026 con helados y bebidas.',
    price: 50,
    price_type: 'per_person',
    min_attendees: null,
    max_attendees: null,
    includes: [
      'Pisco Sour (adultos) — Frugos o gaseosa (estudiantes)',
      'Plato de fondo a elección: ¼ Parrilla de pollo, ¼ Pollo al horno o 250 grs. Parrilla de chancho',
      'Jarra de chicha morada en mesa y postre',
      'Helados',
      'Una botella de vino Santiago Queirolo, gaseosa de 3 litros Inka y Coca Cola original, y 2½ litros de agua',
      'Local decorado por 08 horas',
      'Biombo decorado',
      'Mesas con dos manteles y centro de flores naturales',
      'Menajería completa',
      'Equipo de sonido de salón',
      'Sillón de reyna',
      'Luces modo discoteca',
      'Alfombra',
      'Humo',
      'Servicio de mozos',
    ],
    month_start: null,
    month_end: null,
    active: 1,
    sort_order: 3,
  },
  {
    name: 'Paquete Super Ejecutivo',
    description: 'Paquete promocional Los Jazmines 2026 — opción premium de plato de fondo.',
    price: 52,
    price_type: 'per_person',
    min_attendees: null,
    max_attendees: null,
    includes: [
      'Pisco Sour (adultos) — Frugos o gaseosa (estudiantes)',
      'Plato de fondo a elección: Parrilla mixta pollo y chancho, Asado de chancho con mote blanco, o 250 grs. Asado de res con puré de papas y arroz',
      'Jarra de chicha morada en mesa y postre',
      'Una botella de vino Santiago Queirolo, gaseosa de 3 litros Inka y Coca Cola original, y 2½ litros de agua',
      'Local decorado por 08 horas',
      'Biombo decorado',
      'Mesas con dos manteles y centro de flores naturales',
      'Menajería completa',
      'Equipo de sonido de salón',
      'Sillón de reyna',
      'Luces modo discoteca',
      'Alfombra',
      'Humo',
      'Servicio de mozos',
    ],
    month_start: null,
    month_end: null,
    active: 1,
    sort_order: 4,
  },
];

export function parsePromoIncludes(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function serializePromoIncludes(items = []) {
  return JSON.stringify(
    items.map((item) => String(item).trim()).filter(Boolean)
  );
}

export function formatPromoPrice(price, priceType) {
  const amount = Number(price) || 0;
  if (priceType === 'per_person') {
    return `${amount.toFixed(2)}/persona`;
  }
  return amount.toFixed(2);
}

export function formatPromoValidity(monthStart, monthEnd) {
  const months = [
    'Ene',
    'Feb',
    'Mar',
    'Abr',
    'May',
    'Jun',
    'Jul',
    'Ago',
    'Sep',
    'Oct',
    'Nov',
    'Dic',
  ];
  if (!monthStart || !monthEnd) return 'Todo el año';
  const start = months[monthStart - 1] ?? monthStart;
  const end = months[monthEnd - 1] ?? monthEnd;
  if (monthStart === monthEnd) return start;
  return `${start} – ${end}`;
}

export async function seedPromotionalPackages(localId) {
  const count = await C('promotional_packages').countDocuments({ local_id: localId });
  if (count > 0) return;

  for (const promo of DEFAULT_PROMOTIONAL_PACKAGES) {
    await insertDoc('promotional_packages', {
      local_id: localId,
      name: promo.name,
      description: promo.description,
      price: promo.price,
      price_type: promo.price_type,
      min_attendees: promo.min_attendees,
      max_attendees: promo.max_attendees,
      includes: serializePromoIncludes(promo.includes),
      month_start: promo.month_start,
      month_end: promo.month_end,
      active: promo.active,
      sort_order: promo.sort_order,
    });
  }
}
