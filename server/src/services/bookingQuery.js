import { C, fromDoc, fromDocs, nid } from '../mongo.js';

function trimName(value) {
  return value && String(value).trim() ? String(value).trim() : '';
}

export async function hydrateBooking(doc) {
  if (!doc) return null;
  const booking = fromDoc(doc);

  const [room, pkg, promo, menuPlate, promoPlato, entrada, bebida, postre] = await Promise.all([
    C('rooms').findOne({ _id: booking.room_id }),
    booking.package_id ? C('packages').findOne({ _id: booking.package_id }) : null,
    booking.promotional_package_id
      ? C('promotional_packages').findOne({ _id: booking.promotional_package_id })
      : null,
    booking.menu_plate_id ? C('menu_plates').findOne({ _id: booking.menu_plate_id }) : null,
    booking.promotional_plato_fondo_id
      ? C('promotional_plato_fondo').findOne({ _id: booking.promotional_plato_fondo_id })
      : null,
    booking.menu_entrada_id ? C('menu_plates').findOne({ _id: booking.menu_entrada_id }) : null,
    booking.menu_bebida_id ? C('menu_plates').findOne({ _id: booking.menu_bebida_id }) : null,
    booking.menu_postre_id ? C('menu_plates').findOne({ _id: booking.menu_postre_id }) : null,
  ]);

  return {
    ...booking,
    menu_plate_name:
      trimName(booking.menu_plate_name) || menuPlate?.name || promoPlato?.name || '',
    menu_entrada_name: trimName(booking.menu_entrada_name) || entrada?.name || '',
    menu_bebida_name: trimName(booking.menu_bebida_name) || bebida?.name || '',
    menu_postre_name: trimName(booking.menu_postre_name) || postre?.name || '',
    menu_plate_price: menuPlate?.price_per_plate ?? null,
    menu_plate_description: menuPlate?.description ?? null,
    menu_bebida_description: bebida?.description ?? null,
    package_includes_food:
      booking.promotional_package_id != null ? 1 : (pkg?.includes_food ?? 0),
    room_name: room?.name,
    room_capacity: room?.capacity,
    package_name: promo?.name ?? pkg?.name ?? null,
    package_type: pkg?.type ?? 'promotional',
    promotional_description: promo?.description ?? null,
    promotional_includes: promo?.includes ?? null,
  };
}

function nextDateString(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + 1));
  return date.toISOString().slice(0, 10);
}

export async function getBookingHydrated(id, localId) {
  const filter = { _id: nid(id) };
  if (localId != null) filter.room_id = nid(localId);
  return hydrateBooking(await C('bookings').findOne(filter));
}

export async function listBookings({ localId, date, dateFrom, dateTo, status }) {
  const filter = { room_id: nid(localId) };
  if (status) filter.status = status;

  if (date) {
    filter.start_time = { $gte: date, $lt: nextDateString(date) };
  } else if (dateFrom || dateTo) {
    filter.start_time = {};
    if (dateFrom) filter.start_time.$gte = dateFrom;
    if (dateTo) filter.start_time.$lt = nextDateString(dateTo);
  }

  const docs = await C('bookings').find(filter).sort({ start_time: -1 }).toArray();
  return Promise.all(docs.map(hydrateBooking));
}

export async function listPayments(bookingId) {
  return fromDocs(
    await C('payments')
      .find({ booking_id: nid(bookingId) })
      .sort({ payment_date: 1, _id: 1 })
      .toArray()
  );
}

export async function attachPayments(bookings) {
  if (!bookings.length) return bookings;

  const ids = bookings.map((booking) => booking.id);
  const payments = fromDocs(
    await C('payments')
      .find({ booking_id: { $in: ids } })
      .sort({ payment_date: 1, _id: 1 })
      .toArray()
  );

  const grouped = payments.reduce((acc, payment) => {
    if (!acc[payment.booking_id]) acc[payment.booking_id] = [];
    acc[payment.booking_id].push(payment);
    return acc;
  }, {});

  return bookings.map((booking) => ({
    ...booking,
    payments: grouped[booking.id] ?? [],
  }));
}
