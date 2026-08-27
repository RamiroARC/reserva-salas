import { ACTIVE_SLOT_STATUSES } from '../catalogs/bookingStatus.js';
import { C, fromDoc, withTransaction } from '../mongo.js';

export const SLOT_CONFLICT_MESSAGE =
  'El local ya se encuentra reservado en el horario seleccionado.';

export class SlotConflictError extends Error {
  constructor(message = SLOT_CONFLICT_MESSAGE) {
    super(message);
    this.name = 'SlotConflictError';
    this.status = 409;
  }
}

/** Half-open interval overlap: [start, end) vs [otherStart, otherEnd). */
export function rangesOverlap(startTime, endTime, otherStart, otherEnd) {
  return startTime < otherEnd && endTime > otherStart;
}

export function overlapQuery({ roomId, startTime, endTime, excludeId = null }) {
  const filter = {
    room_id: Number(roomId),
    status: { $in: [...ACTIVE_SLOT_STATUSES] },
    start_time: { $lt: endTime },
    end_time: { $gt: startTime },
  };

  if (excludeId) {
    filter._id = { $ne: Number(excludeId) };
  }

  return filter;
}

export function findOverlapInList(bookings, { roomId, startTime, endTime, excludeId = null }) {
  return (
    bookings.find(
      (booking) =>
        Number(booking.room_id) === Number(roomId) &&
        ACTIVE_SLOT_STATUSES.includes(booking.status) &&
        booking.start_time < endTime &&
        booking.end_time > startTime &&
        (excludeId == null || Number(booking.id ?? booking._id) !== Number(excludeId))
    ) ?? null
  );
}

export async function findOverlappingBooking({
  roomId,
  startTime,
  endTime,
  excludeId = null,
  session,
}) {
  const doc = await C('bookings').findOne(overlapQuery({ roomId, startTime, endTime, excludeId }), {
    session,
    projection: { start_time: 1, end_time: 1, status: 1 },
  });
  return fromDoc(doc);
}

export async function assertSlotAvailable(slot) {
  const conflict = await findOverlappingBooking(slot);
  if (conflict) throw new SlotConflictError();
}

export function withExclusiveWrite(fn) {
  return withTransaction(fn);
}

export function sendSlotConflict(res) {
  return res.status(409).json({ error: SLOT_CONFLICT_MESSAGE });
}
