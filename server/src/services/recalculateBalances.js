import { BALANCE_PAYMENT_TYPES } from '../catalogs/paymentTypes.js';
import { C, fromDoc, fromDocs, nid } from '../mongo.js';

export async function recalculateBookingPayments(bookingId, options = {}) {
  const booking = fromDoc(await C('bookings').findOne({ _id: nid(bookingId) }, options));
  if (!booking) return null;

  const payments = fromDocs(
    await C('payments').find({ booking_id: nid(bookingId) }, options).toArray()
  );

  const depositPaid =
    Math.round(
      payments
        .filter((payment) => BALANCE_PAYMENT_TYPES.includes(payment.payment_type))
        .reduce((sum, payment) => sum + payment.amount, 0) * 100
    ) / 100;

  const balanceDue = Math.round(Math.max(booking.total_cost - depositPaid, 0) * 100) / 100;

  await C('bookings').updateOne(
    { _id: nid(bookingId) },
    { $set: { deposit_paid: depositPaid, balance_due: balanceDue } },
    options
  );

  return { depositPaid, balanceDue, status: booking.status };
}

export async function recalculateAllBookingPayments() {
  const bookingIds = await C('bookings').find({}, { projection: { _id: 1 } }).toArray();
  for (const row of bookingIds) {
    await recalculateBookingPayments(row._id);
  }
}

export async function sumBalancePayments(bookingId, options = {}) {
  const payments = await C('payments')
    .find(
      {
        booking_id: nid(bookingId),
        payment_type: { $in: [...BALANCE_PAYMENT_TYPES] },
      },
      options
    )
    .toArray();

  return payments.reduce((sum, payment) => sum + payment.amount, 0);
}
