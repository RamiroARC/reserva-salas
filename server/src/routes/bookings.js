import { Router } from 'express';
import { C, deleteById, findById, fromDocs, insertDoc, nid, nowIso, updateById } from '../mongo.js';
import { calculateBookingCosts } from '../services/pricing.js';
import { ACTIVE_SLOT_STATUSES, canMarkAsAttended, isBookingLocked, isValidStatus } from '../catalogs/bookingStatus.js';
import {
  affectsBalance,
  isValidPaymentType,
  normalizePaymentType,
  serializeDecorationColors,
} from '../catalogs/paymentTypes.js';
import { recalculateBookingPayments, sumBalancePayments } from '../services/recalculateBalances.js';
import {
  deleteAttachmentFile,
  deleteBookingUploads,
  enrichBookingAttachments,
  normalizeAttachmentInput,
  parseAttachments,
  serializeAttachments,
  writeAttachmentFile,
} from '../services/attachments.js';
import {
  assertSlotAvailable,
  sendSlotConflict,
  SlotConflictError,
  withExclusiveWrite,
} from '../services/bookingConflicts.js';
import {
  attachPayments,
  getBookingHydrated,
  hydrateBooking,
  listBookings,
  listPayments,
} from '../services/bookingQuery.js';
import { asyncHandler } from '../http.js';

const router = Router();

function extraStoredPrice(extra) {
  return extra?.unitPrice ?? extra?.price ?? 0;
}

function menuExtrasFromCosts(costs) {
  return {
    entrada: {
      id: costs.extras?.entrada?.id ?? null,
      name: costs.extras?.entrada?.name ?? '',
      price: extraStoredPrice(costs.extras?.entrada),
    },
    bebida: {
      id: costs.extras?.bebida?.id ?? null,
      name: costs.extras?.bebida?.name ?? '',
      price: extraStoredPrice(costs.extras?.bebida),
    },
    postre: {
      id: costs.extras?.postre?.id ?? null,
      name: costs.extras?.postre?.name ?? '',
      price: extraStoredPrice(costs.extras?.postre),
    },
  };
}

function menuPlateFieldsFromCosts(costs) {
  if (costs.isPromotional) {
    return {
      menuPlateId: null,
      promotionalPlatoFondoId: costs.plateDetails?.id ?? null,
      menuPlateName: costs.plateDetails?.name ?? '',
    };
  }

  return {
    menuPlateId: costs.plateDetails?.id ?? null,
    promotionalPlatoFondoId: null,
    menuPlateName: costs.plateDetails?.name ?? '',
  };
}

function serializeDecorationItems(items = []) {
  const normalized = items.map((item) => ({
    id: item.id,
    name: item.name,
    price: item.price ?? item.price_per_plate ?? 0,
    description: item.description ?? '',
  }));
  return JSON.stringify(normalized);
}

function serializePromotionalExtras(items = []) {
  const normalized = items.map((item) => ({
    id: item.id,
    name: item.name,
    unitPrice: item.unitPrice ?? item.price ?? 0,
    price: item.price ?? 0,
    attendees: item.attendees ?? null,
  }));
  return JSON.stringify(normalized);
}

function includesFoodFromCosts(costs) {
  return Boolean(costs.isPromotional || costs.package?.includes_food);
}

async function syncAdelantoPayment(bookingId, targetDepositAmount, options = {}) {
  const rows = fromDocs(
    await C('payments').find({ booking_id: nid(bookingId) }, options).sort({ _id: 1 }).toArray()
  );

  const adelanto = rows.find((payment) => payment.payment_type === 'adelanto');
  const amortTotal = rows
    .filter((payment) => payment.payment_type === 'amortizacion')
    .reduce((sum, payment) => sum + payment.amount, 0);

  const targetAdelanto = Math.round(Math.max(targetDepositAmount - amortTotal, 0) * 100) / 100;

  if (adelanto) {
    if (Math.abs(adelanto.amount - targetAdelanto) > 0.009) {
      await C('payments').updateOne({ _id: adelanto.id }, { $set: { amount: targetAdelanto } }, options);
    }
    return;
  }

  if (targetAdelanto > 0) {
    await insertDoc(
      'payments',
      {
        booking_id: nid(bookingId),
        amount: targetAdelanto,
        payment_type: 'adelanto',
        payment_method: 'efectivo',
        operation_number: '',
        notes: 'Adelanto registrado al editar reserva',
        payment_date: nowIso(),
      },
      options
    );
  }
}

async function ensureCancellationPayment(bookingId, options = {}) {
  const existing = await C('payments').findOne(
    { booking_id: nid(bookingId), payment_type: 'cancelacion' },
    options
  );

  if (existing) return;

  await insertDoc(
    'payments',
    {
      booking_id: nid(bookingId),
      amount: 0,
      payment_type: 'cancelacion',
      payment_method: 'efectivo',
      operation_number: '',
      notes: 'Pago final de la reserva',
      payment_date: nowIso(),
    },
    options
  );
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { date, dateFrom, dateTo, status, includePayments } = req.query;
    const results = await listBookings({
      localId: req.localId,
      date,
      dateFrom,
      dateTo,
      status: status && isValidStatus(status) ? status : undefined,
    });
    res.json(includePayments === '1' ? await attachPayments(results) : results);
  })
);

router.get(
  '/availability',
  asyncHandler(async (req, res) => {
    const year = Number(req.query.year);
    const month = Number(req.query.month);

    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Año y mes inválidos' });
    }

    const monthKey = String(month).padStart(2, '0');
    const monthBookings = fromDocs(
      await C('bookings')
        .find({
          room_id: req.localId,
          start_time: { $regex: `^${year}-${monthKey}` },
        })
        .sort({ start_time: 1 })
        .toArray()
    );

    const dateEvents = monthBookings.reduce((acc, booking) => {
      const eventDate = String(booking.start_time).slice(0, 10);
      if (!acc[eventDate]) acc[eventDate] = [];
      acc[eventDate].push({
        id: booking.id,
        eventType: booking.event_type,
        title: booking.title,
        status: booking.status,
      });
      return acc;
    }, {});

    res.json({ year, month, dateEvents });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const booking = await getBookingHydrated(req.params.id, req.localId);

    if (!booking) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    const payments = await listPayments(req.params.id);
    res.json(enrichBookingAttachments({ ...booking, payments }));
  })
);

router.post(
  '/quote',
  asyncHandler(async (req, res) => {
    const roomId = req.localId;
    const {
      packageId,
      promotionalPackageId,
      promotionalPackageName,
      attendees,
      discountPercent,
      incrementPercent,
      plateId,
      unitPrice,
      entradaId,
      entradaPrice,
      bebidaId,
      bebidaPrice,
      postreId,
      postrePrice,
      decorationIds,
      decorationPrice,
      promotionalExtraIds,
      promotionalPlatoFondoId,
    } = req.body;

    if (!roomId || !attendees || (!packageId && !promotionalPackageId && !promotionalPackageName?.trim())) {
      return res.status(400).json({ error: 'Faltan campos para calcular la cotización' });
    }

    const costs = await calculateBookingCosts({
      roomId,
      packageId,
      promotionalPackageId,
      promotionalPackageName,
      attendees,
      discountPercent,
      incrementPercent,
      plateId,
      unitPrice,
      entradaId,
      entradaPrice,
      bebidaId,
      bebidaPrice,
      postreId,
      postrePrice,
      decorationIds,
      decorationPrice,
      promotionalExtraIds,
      promotionalPlatoFondoId,
    });
    if (costs.error) return res.status(400).json({ error: costs.error });

    res.json(costs);
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const roomId = req.localId;
    const {
      packageId,
      promotionalPackageId,
      promotionalPackageName,
      title,
      organizer,
      clientPhone,
      clientPhone2,
      clientEmail,
      attendees,
      startTime,
      endTime,
      depositAmount,
      plateId,
      notes,
      eventType,
      foodTime,
      guaranteeAmount,
      decorationColor,
      decorationColors,
      clientDni,
      discountPercent,
      incrementPercent,
      unitPrice,
      entradaId,
      bebidaId,
      postreId,
      decorationIds,
      entradaPrice,
      bebidaPrice,
      postrePrice,
      decorationPrice,
      promotionalExtraIds,
      promotionalPlatoFondoId,
      paymentMethod,
      operationNumber,
    } = req.body;

    if (
      !roomId ||
      (!packageId && !promotionalPackageId && !promotionalPackageName?.trim()) ||
      !title?.trim() ||
      !organizer?.trim() ||
      !startTime ||
      !endTime
    ) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Fechas inválidas' });
    }

    if (end <= start) {
      return res.status(400).json({ error: 'La hora de fin debe ser posterior al inicio' });
    }

    const costs = await calculateBookingCosts({
      roomId,
      packageId,
      promotionalPackageId,
      promotionalPackageName,
      attendees,
      discountPercent,
      incrementPercent,
      plateId,
      unitPrice,
      entradaId,
      entradaPrice,
      bebidaId,
      bebidaPrice,
      postreId,
      postrePrice,
      decorationIds,
      decorationPrice,
      promotionalExtraIds,
      promotionalPlatoFondoId,
    });

    if (costs.error) return res.status(400).json({ error: costs.error });

    const foodCost = costs.foodCost;
    const { menuPlateId, promotionalPlatoFondoId: storedPromoPlatoFondoId, menuPlateName } =
      menuPlateFieldsFromCosts(costs);
    const menuExtras = menuExtrasFromCosts(costs);
    const promotionalExtrasSerialized = serializePromotionalExtras(costs.promotionalExtras ?? []);
    const storedPackageId = promotionalPackageId ? null : packageId;
    const storedPromotionalPackageId = costs.promotionalPackage?.id ?? promotionalPackageId ?? null;

    const totalCost = costs.totalCost;
    const deposit = depositAmount != null ? Number(depositAmount) : costs.suggestedDeposit;

    if (Number.isNaN(deposit) || deposit < 0 || deposit > totalCost) {
      return res.status(400).json({ error: 'Monto de adelanto inválido' });
    }

    const validMethods = ['efectivo', 'yape', 'plin', 'transferencia'];
    const method = validMethods.includes(paymentMethod) ? paymentMethod : 'efectivo';
    const opNumber = operationNumber?.trim() ?? '';

    if (deposit > 0 && method !== 'efectivo' && !opNumber) {
      return res.status(400).json({ error: 'El nro. de operación es obligatorio para este medio de pago' });
    }

    const balanceDue = Math.round((totalCost - deposit) * 100) / 100;
    const status = 'reservado';
    const decorationSerialized = serializeDecorationColors(decorationColors ?? decorationColor);
    const decorationItemsSerialized = serializeDecorationItems(costs.decorationItems);

    let bookingId;
    try {
      bookingId = await withExclusiveWrite(async (session) => {
        await assertSlotAvailable({ roomId, startTime, endTime, session });

        const result = await insertDoc(
          'bookings',
          {
            room_id: roomId,
            package_id: storedPackageId,
            promotional_package_id: storedPromotionalPackageId,
            promotional_extras: promotionalExtrasSerialized,
            title: title.trim(),
            organizer: organizer.trim(),
            client_phone: clientPhone?.trim() ?? '',
            client_phone_2: clientPhone2?.trim() ?? '',
            client_email: clientEmail?.trim() ?? '',
            attendees: costs.attendees,
            start_time: startTime,
            end_time: endTime,
            rental_cost: costs.rentalCost,
            food_cost: foodCost,
            total_cost: totalCost,
            deposit_amount: deposit,
            deposit_paid: deposit,
            balance_due: balanceDue,
            status,
            season_name: '',
            notes: notes?.trim() ?? '',
            menu_plate_id: menuPlateId,
            promotional_plato_fondo_id: storedPromoPlatoFondoId,
            menu_plate_name: menuPlateName,
            event_type: eventType?.trim() ?? title.trim(),
            food_time: includesFoodFromCosts(costs) ? foodTime?.trim() ?? '' : '',
            guarantee_amount: Number(guaranteeAmount) || 0,
            decoration_color: decorationSerialized,
            decoration_items: decorationItemsSerialized,
            client_dni: clientDni?.trim() ?? '',
            discount_percent: costs.discountPercent,
            increment_percent: costs.incrementPercent,
            menu_entrada_id: menuExtras.entrada.id,
            menu_entrada_name: menuExtras.entrada.name,
            menu_entrada_price: menuExtras.entrada.price,
            menu_bebida_id: menuExtras.bebida.id,
            menu_bebida_name: menuExtras.bebida.name,
            menu_bebida_price: menuExtras.bebida.price,
            menu_postre_id: menuExtras.postre.id,
            menu_postre_name: menuExtras.postre.name,
            menu_postre_price: menuExtras.postre.price,
            attachments: '[]',
            created_at: nowIso(),
          },
          { session }
        );

        if (deposit > 0) {
          await insertDoc(
            'payments',
            {
              booking_id: result.lastInsertRowid,
              amount: deposit,
              payment_type: 'adelanto',
              payment_method: method,
              operation_number: opNumber,
              notes: 'Adelanto inicial al reservar',
              payment_date: nowIso(),
            },
            { session }
          );
        }

        return result.lastInsertRowid;
      });
    } catch (err) {
      if (err instanceof SlotConflictError) return sendSlotConflict(res);
      throw err;
    }

    const booking = await hydrateBooking(await C('bookings').findOne({ _id: nid(bookingId) }));
    res.status(201).json(enrichBookingAttachments(booking));
  })
);

router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const roomId = req.localId;
    const {
      packageId,
      promotionalPackageId,
      promotionalPackageName,
      title,
      organizer,
      clientPhone,
      clientPhone2,
      clientEmail,
      attendees,
      startTime,
      endTime,
      depositAmount,
      plateId,
      notes,
      eventType,
      foodTime,
      guaranteeAmount,
      decorationColor,
      decorationColors,
      clientDni,
      discountPercent,
      incrementPercent,
      unitPrice,
      entradaId,
      bebidaId,
      postreId,
      decorationIds,
      entradaPrice,
      bebidaPrice,
      postrePrice,
      decorationPrice,
      promotionalExtraIds,
      promotionalPlatoFondoId,
    } = req.body;

    const existing = await findById('bookings', req.params.id);
    if (!existing || existing.room_id !== req.localId) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    if (isBookingLocked(existing.status)) {
      return res.status(403).json({ error: 'La reserva atendida no puede editarse' });
    }

    if (
      !roomId ||
      (!packageId && !promotionalPackageId && !promotionalPackageName?.trim()) ||
      !title?.trim() ||
      !organizer?.trim() ||
      !startTime ||
      !endTime
    ) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Fechas inválidas' });
    }

    if (end <= start) {
      return res.status(400).json({ error: 'La hora de fin debe ser posterior al inicio' });
    }

    const costs = await calculateBookingCosts({
      roomId,
      packageId,
      promotionalPackageId,
      promotionalPackageName,
      attendees,
      discountPercent,
      incrementPercent,
      plateId,
      unitPrice,
      entradaId,
      entradaPrice,
      bebidaId,
      bebidaPrice,
      postreId,
      postrePrice,
      decorationIds,
      decorationPrice,
      promotionalExtraIds,
      promotionalPlatoFondoId,
    });

    if (costs.error) return res.status(400).json({ error: costs.error });

    const foodCost = costs.foodCost;
    const { menuPlateId, promotionalPlatoFondoId: storedPromoPlatoFondoId, menuPlateName } =
      menuPlateFieldsFromCosts(costs);
    const menuExtras = menuExtrasFromCosts(costs);
    const promotionalExtrasSerialized = serializePromotionalExtras(costs.promotionalExtras ?? []);
    const storedPackageId = promotionalPackageId ? null : packageId;
    const storedPromotionalPackageId = costs.promotionalPackage?.id ?? promotionalPackageId ?? null;

    const totalCost = costs.totalCost;
    let deposit = depositAmount != null ? Number(depositAmount) : existing.deposit_amount;

    if (Number.isNaN(deposit) || deposit < 0) {
      return res.status(400).json({ error: 'Monto de adelanto inválido' });
    }

    if (deposit > totalCost) {
      deposit = totalCost;
    }

    if (deposit < existing.deposit_paid) {
      deposit = Math.min(existing.deposit_paid, totalCost);
    }

    const balanceDue = Math.round(Math.max(totalCost - existing.deposit_paid, 0) * 100) / 100;
    const decorationSerialized = serializeDecorationColors(decorationColors ?? decorationColor);
    const decorationItemsSerialized = serializeDecorationItems(costs.decorationItems);

    try {
      await withExclusiveWrite(async (session) => {
        if (ACTIVE_SLOT_STATUSES.includes(existing.status)) {
          await assertSlotAvailable({
            roomId,
            startTime,
            endTime,
            excludeId: existing.id,
            session,
          });
        }

        await C('bookings').updateOne(
          { _id: existing.id },
          {
            $set: {
              room_id: roomId,
              package_id: storedPackageId,
              promotional_package_id: storedPromotionalPackageId,
              promotional_extras: promotionalExtrasSerialized,
              title: title.trim(),
              organizer: organizer.trim(),
              client_phone: clientPhone?.trim() ?? '',
              client_phone_2: clientPhone2?.trim() ?? '',
              client_email: clientEmail?.trim() ?? '',
              attendees: costs.attendees,
              start_time: startTime,
              end_time: endTime,
              rental_cost: costs.rentalCost,
              food_cost: foodCost,
              total_cost: totalCost,
              deposit_amount: deposit,
              balance_due: balanceDue,
              season_name: '',
              notes: notes?.trim() ?? '',
              menu_plate_id: menuPlateId,
              promotional_plato_fondo_id: storedPromoPlatoFondoId,
              menu_plate_name: menuPlateName,
              event_type: eventType?.trim() ?? title.trim(),
              food_time: includesFoodFromCosts(costs) ? foodTime?.trim() ?? '' : '',
              guarantee_amount: Number(guaranteeAmount) || 0,
              decoration_color: decorationSerialized,
              decoration_items: decorationItemsSerialized,
              client_dni: clientDni?.trim() ?? '',
              discount_percent: costs.discountPercent,
              increment_percent: costs.incrementPercent,
              menu_entrada_id: menuExtras.entrada.id,
              menu_entrada_name: menuExtras.entrada.name,
              menu_entrada_price: menuExtras.entrada.price,
              menu_bebida_id: menuExtras.bebida.id,
              menu_bebida_name: menuExtras.bebida.name,
              menu_bebida_price: menuExtras.bebida.price,
              menu_postre_id: menuExtras.postre.id,
              menu_postre_name: menuExtras.postre.name,
              menu_postre_price: menuExtras.postre.price,
            },
          },
          { session }
        );

        await syncAdelantoPayment(existing.id, deposit, { session });
        await recalculateBookingPayments(existing.id, { session });
      });
    } catch (err) {
      if (err instanceof SlotConflictError) return sendSlotConflict(res);
      throw err;
    }

    const updated = await hydrateBooking(await C('bookings').findOne({ _id: existing.id }));
    const [withPayments] = await attachPayments([updated]);
    res.json(withPayments);
  })
);

router.post(
  '/:id/payments',
  asyncHandler(async (req, res) => {
    const { amount, paymentType, notes, paymentMethod, operationNumber } = req.body;
    const paymentAmount = Number(amount);
    const type = normalizePaymentType(paymentType);

    if (!isValidPaymentType(type)) {
      return res.status(400).json({ error: 'Tipo de pago inválido' });
    }

    if (Number.isNaN(paymentAmount) || paymentAmount < 0) {
      return res.status(400).json({ error: 'Monto de pago inválido' });
    }

    if (type !== 'cancelacion' && paymentAmount <= 0) {
      return res.status(400).json({ error: 'Monto de pago inválido' });
    }

    const validMethods = ['efectivo', 'yape', 'plin', 'transferencia'];
    const method = validMethods.includes(paymentMethod) ? paymentMethod : 'efectivo';
    const opNumber = operationNumber?.trim() ?? '';

    if (paymentAmount > 0 && method !== 'efectivo' && !opNumber) {
      return res.status(400).json({ error: 'El nro. de operación es obligatorio para este medio de pago' });
    }

    const booking = await findById('bookings', req.params.id);
    if (!booking || booking.room_id !== req.localId) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    if (isBookingLocked(booking.status)) {
      return res.status(403).json({ error: 'La reserva atendida no permite registrar pagos' });
    }

    if (affectsBalance(type)) {
      const currentPaid = await sumBalancePayments(req.params.id);
      const newPaid = Math.round((currentPaid + paymentAmount) * 100) / 100;

      if (newPaid > booking.total_cost + 0.01) {
        return res.status(400).json({ error: 'El monto supera el saldo pendiente del contrato' });
      }
    }

    await withExclusiveWrite(async (session) => {
      await insertDoc(
        'payments',
        {
          booking_id: nid(req.params.id),
          amount: paymentAmount,
          payment_type: type,
          payment_method: method,
          operation_number: opNumber,
          notes: notes?.trim() ?? '',
          payment_date: nowIso(),
        },
        { session }
      );

      await recalculateBookingPayments(req.params.id, { session });
    });

    const updated = await hydrateBooking(await C('bookings').findOne({ _id: nid(req.params.id) }));
    const payments = await listPayments(req.params.id);
    res.json({ ...updated, payments });
  })
);

router.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const { status } = req.body;

    if (!isValidStatus(status)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const booking = await findById('bookings', req.params.id);
    if (!booking || booking.room_id !== req.localId) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    if (isBookingLocked(booking.status)) {
      return res.status(403).json({ error: 'La reserva atendida no puede modificarse' });
    }

    if (status === 'atendido' && !canMarkAsAttended(booking.balance_due)) {
      return res.status(400).json({
        error: 'Solo se puede marcar como Atendido cuando el saldo pendiente es cero',
      });
    }

    try {
      await withExclusiveWrite(async (session) => {
        if (ACTIVE_SLOT_STATUSES.includes(status)) {
          await assertSlotAvailable({
            roomId: booking.room_id,
            startTime: booking.start_time,
            endTime: booking.end_time,
            excludeId: booking.id,
            session,
          });
        }

        await C('bookings').updateOne({ _id: nid(req.params.id) }, { $set: { status } }, { session });

        if (status === 'cancelado') {
          await ensureCancellationPayment(req.params.id, { session });
        }
      });
    } catch (err) {
      if (err instanceof SlotConflictError) return sendSlotConflict(res);
      throw err;
    }

    const updated = await hydrateBooking(await C('bookings').findOne({ _id: nid(req.params.id) }));
    res.json(updated);
  })
);

router.post(
  '/:id/attachments',
  asyncHandler(async (req, res) => {
    const booking = await findById('bookings', req.params.id);
    if (!booking || booking.room_id !== req.localId) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    if (isBookingLocked(booking.status)) {
      return res.status(403).json({ error: 'La reserva atendida no puede editarse' });
    }

    const normalized = normalizeAttachmentInput(req.body);
    if (normalized.error) return res.status(400).json({ error: normalized.error });

    const current = parseAttachments(booking.attachments);
    const next = [...current, normalized.attachment];

    writeAttachmentFile(booking.id, normalized.attachment.storedName, normalized.buffer);
    await updateById('bookings', booking.id, { attachments: serializeAttachments(next) });

    const saved = await hydrateBooking(await C('bookings').findOne({ _id: booking.id }));
    res.status(201).json(enrichBookingAttachments(saved).attachments.at(-1));
  })
);

router.delete(
  '/:id/attachments/:attachmentId',
  asyncHandler(async (req, res) => {
    const booking = await findById('bookings', req.params.id);
    if (!booking || booking.room_id !== req.localId) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    if (isBookingLocked(booking.status)) {
      return res.status(403).json({ error: 'La reserva atendida no puede editarse' });
    }

    const current = parseAttachments(booking.attachments);
    const target = current.find((item) => item.id === req.params.attachmentId);
    if (!target) return res.status(404).json({ error: 'Archivo no encontrado' });

    deleteAttachmentFile(booking.id, target.storedName);
    const next = current.filter((item) => item.id !== req.params.attachmentId);
    await updateById('bookings', booking.id, { attachments: serializeAttachments(next) });

    res.status(204).send();
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const booking = await findById('bookings', req.params.id);
    if (!booking || booking.room_id !== req.localId) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    const attachments = parseAttachments(booking.attachments);
    for (const item of attachments) {
      deleteAttachmentFile(booking.id, item.storedName);
    }
    deleteBookingUploads(booking.id);

    await C('payments').deleteMany({ booking_id: nid(req.params.id) });
    await deleteById('bookings', req.params.id);

    res.status(204).send();
  })
);

export default router;
