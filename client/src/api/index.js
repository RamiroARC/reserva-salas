import { request } from './client.js';

export { setActiveLocalId, setUnauthorizedHandler } from './client.js';

export async function fetchVenue() {
  return request('/venue', { fallbackError: 'No se pudo cargar el local de eventos' });
}

export async function fetchEventTypes() {
  return request('/event-types', { fallbackError: 'No se pudieron cargar los tipos de evento' });
}

export async function createEventType(name) {
  return request('/event-types', {
    method: 'POST',
    body: { name },
    fallbackError: 'Error al crear tipo de evento',
  });
}

export async function fetchPackages() {
  return request('/packages', { fallbackError: 'No se pudieron cargar los paquetes' });
}

export async function fetchSeasons() {
  return request('/packages/seasons', { fallbackError: 'No se pudieron cargar las temporadas' });
}

export async function fetchPromotionalPackages() {
  return request('/promotional-packages', {
    fallbackError: 'No se pudieron cargar los paquetes promocionales',
  });
}

export async function createPromotionalPackage(data) {
  return request('/promotional-packages', {
    method: 'POST',
    body: data,
    fallbackError: 'Error al crear paquete promocional',
  });
}

export async function updatePromotionalPackage(id, data) {
  return request(`/promotional-packages/${id}`, {
    method: 'PUT',
    body: data,
    fallbackError: 'Error al actualizar paquete promocional',
  });
}

export async function deletePromotionalPackage(id) {
  return request(`/promotional-packages/${id}`, {
    method: 'DELETE',
    fallbackError: 'Error al eliminar paquete promocional',
  });
}

export async function fetchPromotionalOptionalItems() {
  return request('/promotional-optional-items', {
    fallbackError: 'No se pudieron cargar los ítems adicionales promocionales',
  });
}

export async function createPromotionalOptionalItem(data) {
  return request('/promotional-optional-items', {
    method: 'POST',
    body: data,
    fallbackError: 'Error al crear ítem adicional',
  });
}

export async function updatePromotionalOptionalItem(id, data) {
  return request(`/promotional-optional-items/${id}`, {
    method: 'PUT',
    body: data,
    fallbackError: 'Error al actualizar ítem adicional',
  });
}

export async function deletePromotionalOptionalItem(id) {
  return request(`/promotional-optional-items/${id}`, {
    method: 'DELETE',
    fallbackError: 'Error al eliminar ítem adicional',
  });
}

export async function fetchPromotionalPlatoFondo(packageId) {
  const query = packageId ? `?packageId=${packageId}` : '';
  return request(`/promotional-plato-fondo${query}`, {
    fallbackError: 'No se pudieron cargar los platos de fondo promocionales',
  });
}

export async function createPromotionalPlatoFondo(data) {
  return request('/promotional-plato-fondo', {
    method: 'POST',
    body: data,
    fallbackError: 'Error al crear plato de fondo',
  });
}

export async function updatePromotionalPlatoFondo(id, data) {
  return request(`/promotional-plato-fondo/${id}`, {
    method: 'PUT',
    body: data,
    fallbackError: 'Error al actualizar plato de fondo',
  });
}

export async function deletePromotionalPlatoFondo(id) {
  return request(`/promotional-plato-fondo/${id}`, {
    method: 'DELETE',
    fallbackError: 'Error al eliminar plato de fondo',
  });
}

export async function fetchDecorationColors() {
  return request('/decoration-colors', {
    fallbackError: 'No se pudieron cargar los colores de decoración',
  });
}

export async function createDecorationColor(data) {
  return request('/decoration-colors', {
    method: 'POST',
    body: data,
    fallbackError: 'Error al crear color',
  });
}

export async function deleteDecorationColor(id) {
  return request(`/decoration-colors/${id}`, {
    method: 'DELETE',
    fallbackError: 'Error al eliminar color',
  });
}

export async function fetchDecorationThemeOptions() {
  return request('/decoration-theme-options', {
    fallbackError: 'No se pudieron cargar los temas de biombo temático',
  });
}

export async function createDecorationThemeOption(data) {
  return request('/decoration-theme-options', {
    method: 'POST',
    body: data,
    fallbackError: 'Error al crear tema de biombo',
  });
}

export async function updateDecorationThemeOption(id, data) {
  return request(`/decoration-theme-options/${id}`, {
    method: 'PUT',
    body: data,
    fallbackError: 'Error al actualizar tema de biombo',
  });
}

export async function deleteDecorationThemeOption(id) {
  return request(`/decoration-theme-options/${id}`, {
    method: 'DELETE',
    fallbackError: 'Error al eliminar tema de biombo',
  });
}

export async function fetchContractExtraTerms() {
  return request('/contract-extra-terms', {
    fallbackError: 'No se pudieron cargar las disposiciones extras',
  });
}

export async function createContractExtraTerm(data) {
  return request('/contract-extra-terms', {
    method: 'POST',
    body: data,
    fallbackError: 'Error al crear disposición',
  });
}

export async function updateContractExtraTerm(id, data) {
  return request(`/contract-extra-terms/${id}`, {
    method: 'PUT',
    body: data,
    fallbackError: 'Error al actualizar disposición',
  });
}

export async function deleteContractExtraTerm(id) {
  return request(`/contract-extra-terms/${id}`, {
    method: 'DELETE',
    fallbackError: 'Error al eliminar disposición',
  });
}

export async function fetchProjections(year) {
  return request(`/projections?year=${year}`, {
    fallbackError: 'No se pudieron cargar las proyecciones',
  });
}

export async function fetchBookings({ status, date, dateFrom, dateTo, includePayments } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (date) params.set('date', date);
  if (dateFrom) params.set('dateFrom', dateFrom);
  if (dateTo) params.set('dateTo', dateTo);
  if (includePayments) params.set('includePayments', '1');

  const query = params.toString();
  return request(`/bookings${query ? `?${query}` : ''}`, {
    fallbackError: 'No se pudieron cargar las reservas',
  });
}

export async function fetchAvailability(year, month) {
  return request(`/bookings/availability?year=${year}&month=${month}`, {
    fallbackError: 'No se pudo cargar la disponibilidad del calendario',
  });
}

export async function fetchQuote(data) {
  return request('/bookings/quote', {
    method: 'POST',
    body: data,
    fallbackError: 'Error al calcular cotización',
  });
}

export async function fetchBooking(id) {
  return request(`/bookings/${id}`, { fallbackError: 'No se pudo cargar la reserva' });
}

export async function createBooking(data) {
  return request('/bookings', {
    method: 'POST',
    body: data,
    fallbackError: 'Error al crear la reserva',
  });
}

export async function updateBooking(id, data) {
  return request(`/bookings/${id}`, {
    method: 'PUT',
    body: data,
    fallbackError: 'Error al actualizar la reserva',
  });
}

export async function addPayment(bookingId, data) {
  return request(`/bookings/${bookingId}/payments`, {
    method: 'POST',
    body: data,
    fallbackError: 'Error al registrar pago',
  });
}

export async function updateBookingStatus(id, status) {
  return request(`/bookings/${id}/status`, {
    method: 'PATCH',
    body: { status },
    fallbackError: 'Error al actualizar estado',
  });
}

export async function deleteBooking(id) {
  return request(`/bookings/${id}`, {
    method: 'DELETE',
    fallbackError: 'Error al eliminar la reserva',
  });
}

export async function uploadBookingAttachment(bookingId, { name, mimeType, dataBase64 }) {
  return request(`/bookings/${bookingId}/attachments`, {
    method: 'POST',
    body: { name, mimeType, dataBase64 },
    fallbackError: 'Error al adjuntar archivo',
  });
}

export async function deleteBookingAttachment(bookingId, attachmentId) {
  return request(`/bookings/${bookingId}/attachments/${attachmentId}`, {
    method: 'DELETE',
    fallbackError: 'Error al quitar archivo',
  });
}

export async function updatePackage(id, data) {
  return request(`/packages/${id}`, {
    method: 'PUT',
    body: data,
    fallbackError: 'Error al actualizar paquete',
  });
}

export async function updatePlate(id, data) {
  return request(`/packages/plates/${id}`, {
    method: 'PUT',
    body: data,
    fallbackError: 'Error al actualizar plato',
  });
}

export async function createPlate(data) {
  return request('/packages/plates', {
    method: 'POST',
    body: data,
    fallbackError: 'Error al agregar ítem',
  });
}

export async function deletePlate(id) {
  return request(`/packages/plates/${id}`, {
    method: 'DELETE',
    fallbackError: 'Error al eliminar ítem',
  });
}

export function parseAppDateTime(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const str = String(value).trim();
  if (!str) return null;

  const sqliteMatch = str.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}(?::\d{2})?)$/);
  if (sqliteMatch) {
    const d = new Date(`${sqliteMatch[1]}T${sqliteMatch[2]}`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const d = new Date(`${str}T12:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(str.includes('T') ? str : `${str}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDateShort(value) {
  const d = parseAppDateTime(value);
  if (!d) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatPaymentDate(value) {
  const d = parseAppDateTime(value);
  if (!d) return '—';
  return d.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function toDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isoToDateInput(isoString) {
  if (!isoString) return toDateInputValue();
  return isoString.slice(0, 10);
}

export function isoToTimeInput(isoString) {
  if (!isoString) return '18:00';
  const d = parseAppDateTime(isoString);
  if (!d) return '18:00';
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatTime(isoString) {
  const d = parseAppDateTime(isoString);
  if (!d) return '—';
  return d.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateLabel(dateStr) {
  const d = parseAppDateTime(dateStr);
  if (!d) return '—';
  return d.toLocaleDateString('es-PE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateRangeLabel(dateFrom, dateTo) {
  if (dateFrom && dateTo) {
    return `${formatDateLabel(dateFrom)} — ${formatDateLabel(dateTo)}`;
  }
  if (dateFrom) return `Desde ${formatDateLabel(dateFrom)}`;
  if (dateTo) return `Hasta ${formatDateLabel(dateTo)}`;
  return 'Todas las fechas';
}

export function formatEventDateTime(isoString) {
  const d = parseAppDateTime(isoString);
  if (!d) return '—';
  return d.toLocaleDateString('es-PE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatBookingEventLabel(eventType, title) {
  const type = eventType?.trim();
  const ref = title?.trim();

  if (type && ref && type !== ref) {
    return `${type} / ${ref}`;
  }

  return type || ref || 'Sin evento';
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount ?? 0);
}

export function combineDateAndTime(dateStr, timeStr) {
  return new Date(`${dateStr}T${timeStr}:00`).toISOString();
}
