export const BOOKING_STATUSES = [
  { value: 'reservado', label: 'Reservado' },
  { value: 'cancelado', label: 'No Ejecutado' },
  { value: 'atendido', label: 'Atendido' },
];

export const BOOKING_STATUS_VALUES = BOOKING_STATUSES.map((s) => s.value);

export const ACTIVE_SLOT_STATUSES = ['reservado'];

export function getStatusLabel(status) {
  return BOOKING_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export function isBookingLocked(status) {
  return status === 'atendido';
}

export function canMarkAsAttended(balanceDue) {
  return (balanceDue ?? 0) <= 0.01;
}
