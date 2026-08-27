export const BOOKING_STATUS_VALUES = [
  'reservado',
  'cancelado',
  'atendido',
];

export const ACTIVE_SLOT_STATUSES = ['reservado'];

export function isValidStatus(status) {
  return BOOKING_STATUS_VALUES.includes(status);
}

export function isBookingLocked(status) {
  return status === 'atendido';
}

export function canMarkAsAttended(balanceDue) {
  return (balanceDue ?? 0) <= 0.01;
}
