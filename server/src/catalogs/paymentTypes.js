export const PAYMENT_TYPE_VALUES = ['adelanto', 'garantia', 'amortizacion', 'cancelacion', 'saldo'];

export const BALANCE_PAYMENT_TYPES = ['adelanto', 'amortizacion', 'saldo', 'cancelacion'];

export function isValidPaymentType(type) {
  return PAYMENT_TYPE_VALUES.includes(type);
}

export function affectsBalance(paymentType) {
  return BALANCE_PAYMENT_TYPES.includes(paymentType);
}

export function normalizePaymentType(type) {
  if (type === 'saldo') return 'amortizacion';
  return isValidPaymentType(type) ? type : 'amortizacion';
}

export function serializeDecorationColors(value) {
  if (Array.isArray(value)) {
    return JSON.stringify(value.filter(Boolean));
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '';
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return JSON.stringify(parsed.filter(Boolean));
    } catch {
      /* texto libre */
    }
    return trimmed;
  }
  return '';
}
