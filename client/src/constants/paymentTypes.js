export const PAYMENT_TYPE_VALUES = ['adelanto', 'garantia', 'amortizacion', 'cancelacion', 'saldo'];

export const PAYMENT_REGISTER_TYPES = [
  { value: 'amortizacion', label: 'Amortización' },
  { value: 'garantia', label: 'Garantía' },
  { value: 'cancelacion', label: 'Pago final' },
];

export const PAYMENT_METHODS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'yape', label: 'Yape' },
  { value: 'plin', label: 'Plin' },
  { value: 'transferencia', label: 'Transferencia' },
];

const METHOD_LABELS = {
  efectivo: 'Efectivo',
  yape: 'Yape',
  plin: 'Plin',
  transferencia: 'Transferencia',
};

export function getPaymentMethodLabel(method) {
  return METHOD_LABELS[method] ?? method;
}

export function affectsBalance(paymentType) {
  return (
    paymentType === 'adelanto' ||
    paymentType === 'amortizacion' ||
    paymentType === 'saldo' ||
    paymentType === 'cancelacion'
  );
}

import { parseAppDateTime } from '../api';

export function sortPayments(payments = []) {
  return [...payments].sort(
    (a, b) =>
      (parseAppDateTime(a.payment_date)?.getTime() ?? 0) -
        (parseAppDateTime(b.payment_date)?.getTime() ?? 0) || a.id - b.id
  );
}

export function getPaymentConceptLabel(payment, allPayments = []) {
  const sorted = sortPayments(allPayments);

  switch (payment.payment_type) {
    case 'adelanto':
      return 'Adelanto';
    case 'garantia':
      return 'Garantía';
    case 'cancelacion':
      return 'Pago final';
    case 'amortizacion':
    case 'saldo': {
      const amortizations = sorted.filter(
        (item) => item.payment_type === 'amortizacion' || item.payment_type === 'saldo'
      );
      const index = amortizations.findIndex((item) => item.id === payment.id);
      return `Amortización ${index + 1}`;
    }
    default:
      return payment.payment_type;
  }
}
