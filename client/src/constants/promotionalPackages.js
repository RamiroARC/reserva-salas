import { isPlatoFondoIncludeText } from './packageMenu';

export { isPlatoFondoIncludeText };

export function parsePromotionalExtras(raw) {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parsePromoIncludes(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export function formatPromoValidity(monthStart, monthEnd) {
  if (!monthStart || !monthEnd) return 'Todo el año';
  const start = MONTHS[monthStart - 1] ?? monthStart;
  const end = MONTHS[monthEnd - 1] ?? monthEnd;
  if (monthStart === monthEnd) return start;
  return `${start} – ${end}`;
}

export function formatPromoAttendees(min, max) {
  if (min && max) return `${min} – ${max} personas`;
  if (min) return `Desde ${min} personas`;
  if (max) return `Hasta ${max} personas`;
  return 'Sin límite de asistentes';
}

export const PRICE_TYPE_OPTIONS = [
  { value: 'fixed', label: 'Precio fijo' },
  { value: 'per_person', label: 'Precio por persona' },
];

export const MONTH_OPTIONS = MONTHS.map((label, index) => ({
  value: String(index + 1),
  label,
}));

export const emptyPromoForm = {
  name: '',
  description: '',
  price: '',
  priceType: 'per_person',
  minAttendees: '',
  maxAttendees: '',
  includesText: '',
  monthStart: '',
  monthEnd: '',
  active: true,
  sortOrder: '0',
};

export function promoToForm(promo) {
  return {
    name: promo.name ?? '',
    description: promo.description ?? '',
    price: String(promo.price ?? ''),
    priceType: promo.price_type ?? 'fixed',
    minAttendees: promo.min_attendees != null ? String(promo.min_attendees) : '',
    maxAttendees: promo.max_attendees != null ? String(promo.max_attendees) : '',
    includesText: (promo.includes ?? []).join('\n'),
    monthStart: promo.month_start != null ? String(promo.month_start) : '',
    monthEnd: promo.month_end != null ? String(promo.month_end) : '',
    active: promo.active !== false,
    sortOrder: String(promo.sort_order ?? 0),
  };
}

export function formToPromoPayload(form) {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    price: Number(form.price) || 0,
    priceType: form.priceType,
    minAttendees: form.minAttendees !== '' ? Number(form.minAttendees) : null,
    maxAttendees: form.maxAttendees !== '' ? Number(form.maxAttendees) : null,
    includes: form.includesText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
    monthStart: form.monthStart !== '' ? Number(form.monthStart) : null,
    monthEnd: form.monthEnd !== '' ? Number(form.monthEnd) : null,
    active: form.active,
    sortOrder: Number(form.sortOrder) || 0,
  };
}
