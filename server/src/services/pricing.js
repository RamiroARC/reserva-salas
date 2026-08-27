import { C, fromDoc, fromDocs, nid } from '../mongo.js';
import { parsePromoIncludes } from '../catalogs/promotionalPackages.js';
import {
  listPromotionalPlatoFondo,
  promoHasPlatoFondoOptions,
  resolvePromotionalPlatoFondo,
} from '../catalogs/promotionalPlatoFondoCatalog.js';

export function isMonthInSeason(month, monthStart, monthEnd) {
  if (monthStart <= monthEnd) {
    return month >= monthStart && month <= monthEnd;
  }
  return month >= monthStart || month <= monthEnd;
}

export async function getSeasonForMonth(month, localId) {
  const seasons = fromDocs(
    await C('season_rates')
      .find({ local_id: nid(localId) }, { projection: { name: 1, multiplier: 1, month_start: 1, month_end: 1 } })
      .toArray()
  );

  return (
    seasons
      .filter((s) => isMonthInSeason(month, s.month_start, s.month_end))
      .sort((a, b) => b.multiplier - a.multiplier)[0] ?? null
  );
}

export async function getSeasonMultiplier(dateStr, localId) {
  const month = new Date(`${dateStr}T12:00:00`).getMonth() + 1;
  return (await getSeasonForMonth(month, localId))?.multiplier ?? 1;
}

export function applyPriceAdjustment(baseAmount, discountPercent = 0, incrementPercent = 0) {
  const discount = Math.max(0, Number(discountPercent) || 0);
  const increment = Math.max(0, Number(incrementPercent) || 0);
  const factor = 1 + increment / 100 - discount / 100;

  return Math.round(baseAmount * factor * 100) / 100;
}

async function resolveMenuPlate(packageId, plateId, category) {
  if (plateId) {
    const selected = fromDoc(
      await C('menu_plates').findOne({
        _id: nid(plateId),
        package_id: nid(packageId),
        category,
      })
    );

    if (selected) return selected;
  }

  return (
    fromDoc(
      await C('menu_plates').findOne(
        { package_id: nid(packageId), category },
        { sort: { price_per_plate: 1 } }
      )
    ) ?? null
  );
}

async function resolveOptionalExtra(packageId, plateId, category, customPrice, guestCount) {
  if (!plateId) return null;

  const plate = fromDoc(
    await C('menu_plates').findOne({
      _id: nid(plateId),
      package_id: nid(packageId),
      category,
    })
  );

  if (!plate) return null;

  let unitPrice = plate.price_per_plate;
  if (customPrice != null && customPrice !== '') {
    unitPrice = Number(customPrice);
    if (Number.isNaN(unitPrice) || unitPrice < 0) {
      return { error: `El costo de ${category} no es válido` };
    }
  }

  const roundedUnit = Math.round(unitPrice * 100) / 100;
  return {
    id: plate.id,
    name: plate.name,
    unitPrice: roundedUnit,
    price: Math.round(roundedUnit * guestCount * 100) / 100,
    attendees: guestCount,
    category: plate.category,
  };
}

async function resolveDecorationItems(decorationIds = [], customPrice, localId) {
  if (!decorationIds?.length) return [];

  const ids = decorationIds.map(Number).filter((id) => id > 0);
  if (!ids.length) return [];

  const packages = await C('packages').find({ local_id: nid(localId) }).toArray();
  const packageIds = packages.map((item) => item._id);
  const items = fromDocs(
    await C('menu_plates')
      .find({
        category: 'decoracion',
        package_id: { $in: packageIds },
        _id: { $in: ids },
      })
      .toArray()
  );

  const overridePrice =
    customPrice != null && customPrice !== '' ? Number(customPrice) : null;
  if (overridePrice != null && (Number.isNaN(overridePrice) || overridePrice < 0)) {
    return { error: 'El costo de decoración no es válido' };
  }

  return items.map((item) => ({
    ...item,
    price_per_plate:
      overridePrice != null && items.length === 1 ? overridePrice : item.price_per_plate,
  }));
}

function platoFondoLineFromIncludes(includes = []) {
  return (
    includes.find((item) => String(item).trim().toLowerCase().startsWith('plato de fondo')) ?? ''
  );
}

async function resolvePromotionalExtras(extraIds = [], localId) {
  if (!extraIds?.length) return [];

  const ids = extraIds.map(Number).filter((id) => id > 0);
  if (!ids.length) return [];

  const items = fromDocs(
    await C('promotional_optional_items')
      .find({
        active: 1,
        local_id: nid(localId),
        _id: { $in: ids },
      })
      .toArray()
  );

  return items.map((item) => ({
    id: item.id,
    name: item.name,
    unitPrice: Math.round(item.price * 100) / 100,
  }));
}

function applyPromotionalExtrasPerPerson(extras, guestCount) {
  return extras.map((item) => ({
    ...item,
    price: Math.round(item.unitPrice * guestCount * 100) / 100,
    attendees: guestCount,
  }));
}

async function resolvePromotionalPackage(promotionalPackageId, promotionalPackageName, localId) {
  const promoId = Number(promotionalPackageId);
  if (Number.isInteger(promoId) && promoId > 0) {
    const byId = fromDoc(
      await C('promotional_packages').findOne({ _id: promoId, local_id: nid(localId) })
    );
    if (byId && Number(byId.active) === 1) return byId;
  }

  const name = promotionalPackageName?.trim();
  if (name) {
    const byName = fromDoc(
      await C('promotional_packages').findOne({ name, local_id: nid(localId) })
    );
    if (byName && Number(byName.active) === 1) return byName;
  }

  return null;
}

async function calculatePromotionalBookingCosts(
  {
    roomId,
    promotionalPackageId,
    promotionalPackageName,
    attendees,
    discountPercent = 0,
    incrementPercent = 0,
    unitPrice,
    promotionalExtraIds = [],
    promotionalPlatoFondoId,
    decorationIds = [],
    decorationPrice,
  }
) {
  const room = fromDoc(
    await C('rooms').findOne(
      { _id: nid(roomId) },
      { projection: { name: 1, capacity: 1, base_rental_price: 1 } }
    )
  );

  if (!room) return { error: 'Local de evento no encontrado' };

  if (!promotionalPackageId && !promotionalPackageName?.trim()) {
    return { error: 'Paquete promocional no válido' };
  }

  const promo = await resolvePromotionalPackage(
    promotionalPackageId,
    promotionalPackageName,
    roomId
  );

  if (!promo) {
    return { error: 'Paquete promocional no encontrado o inactivo' };
  }

  const guestCount = Number(attendees);
  if (!Number.isInteger(guestCount) || guestCount < 1) {
    return { error: 'La cantidad de asistentes debe ser al menos 1' };
  }

  if (guestCount > room.capacity) {
    return { error: `El local admite máximo ${room.capacity} asistentes` };
  }

  if (promo.min_attendees != null && guestCount < promo.min_attendees) {
    return { error: `Este paquete promocional requiere mínimo ${promo.min_attendees} asistentes` };
  }

  if (promo.max_attendees != null && guestCount > promo.max_attendees) {
    return { error: `Este paquete promocional admite máximo ${promo.max_attendees} asistentes` };
  }

  const discount = Math.max(0, Number(discountPercent) || 0);
  const increment = Math.max(0, Number(incrementPercent) || 0);

  if (discount > 100) {
    return { error: 'El descuento no puede ser mayor al 100%' };
  }

  const promoIncludes = parsePromoIncludes(promo.includes);
  const platoFondoLine = platoFondoLineFromIncludes(promoIncludes);
  const hasPlatoFondoCatalog = await promoHasPlatoFondoOptions(promo.id);

  let promoPlatoFondo = null;
  if (hasPlatoFondoCatalog) {
    if (!promotionalPlatoFondoId) {
      return { error: 'Selecciona un plato de fondo para el paquete promocional' };
    }
    promoPlatoFondo = await resolvePromotionalPlatoFondo(promo.id, promotionalPlatoFondoId);
    if (!promoPlatoFondo) {
      return { error: 'Plato de fondo no válido para este paquete promocional' };
    }
  }

  let packageUnitPrice =
    unitPrice != null && unitPrice !== '' ? Number(unitPrice) : Number(promo.price);

  if (Number.isNaN(packageUnitPrice) || packageUnitPrice < 0) {
    return { error: 'El costo por persona no es válido' };
  }

  let baseLocalCost = 0;
  let pricePerPerson = false;

  if (promo.price_type === 'per_person') {
    baseLocalCost = Math.round(packageUnitPrice * guestCount * 100) / 100;
    pricePerPerson = true;
  } else {
    baseLocalCost = Math.round(packageUnitPrice * 100) / 100;
    pricePerPerson = false;
  }

  const rentalCost = applyPriceAdjustment(baseLocalCost, discount, increment);

  const promotionalExtras = applyPromotionalExtrasPerPerson(
    await resolvePromotionalExtras(promotionalExtraIds, roomId),
    guestCount
  );
  const extrasCost =
    Math.round(promotionalExtras.reduce((sum, item) => sum + item.price, 0) * 100) / 100;
  const foodCost = extrasCost;

  const decorationResolved = await resolveDecorationItems(decorationIds, decorationPrice, roomId);
  if (decorationResolved?.error) return decorationResolved;

  const decorationPlates = decorationResolved;
  const decorationCost =
    Math.round(decorationPlates.reduce((sum, item) => sum + item.price_per_plate, 0) * 100) / 100;
  const decorationItems = decorationPlates.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description ?? '',
    price: item.price_per_plate,
  }));

  const totalCost = Math.round((rentalCost + foodCost + decorationCost) * 100) / 100;
  const suggestedDeposit = Math.round(totalCost * 0.3 * 100) / 100;

  return {
    room,
    package: {
      id: null,
      name: promo.name,
      type: 'promotional',
      includes_food: true,
    },
    isPromotional: true,
    promotionalPackage: {
      id: promo.id,
      name: promo.name,
      description: promo.description,
      includes: promoIncludes,
    },
    attendees: guestCount,
    packageUnitPrice,
    baseLocalCost,
    pricePerPerson,
    discountPercent: discount,
    incrementPercent: increment,
    rentalCost,
    foodCost,
    extrasCost,
    extras: {
      entrada: null,
      bebida: null,
      postre: null,
    },
    promotionalExtras,
    promotionalIncludes: promoIncludes,
    decorationCost,
    decorationItems,
    totalCost,
    suggestedDeposit,
    plateDetails: promoPlatoFondo
      ? {
          id: promoPlatoFondo.id,
          name: promoPlatoFondo.name,
          price_per_plate: packageUnitPrice,
          category: 'plato_fondo',
        }
      : platoFondoLine
        ? {
            id: null,
            name: platoFondoLine,
            price_per_plate: packageUnitPrice,
            category: 'plato_fondo',
          }
        : null,
    platoFondoOptions: await listPromotionalPlatoFondo(promo.id),
  };
}

export async function calculateBookingCosts(
  {
    roomId,
    packageId,
    promotionalPackageId,
    promotionalPackageName,
    attendees,
    discountPercent = 0,
    incrementPercent = 0,
    plateId,
    unitPrice,
    entradaId,
    entradaPrice,
    bebidaId,
    bebidaPrice,
    postreId,
    postrePrice,
    decorationIds = [],
    decorationPrice,
    promotionalExtraIds = [],
    promotionalPlatoFondoId,
  }
) {
  if (promotionalPackageId || promotionalPackageName?.trim()) {
    return calculatePromotionalBookingCosts({
      roomId,
      promotionalPackageId,
      promotionalPackageName,
      attendees,
      discountPercent,
      incrementPercent,
      unitPrice,
      promotionalExtraIds,
      promotionalPlatoFondoId,
      decorationIds,
      decorationPrice,
    });
  }

  const room = fromDoc(
    await C('rooms').findOne(
      { _id: nid(roomId) },
      { projection: { name: 1, capacity: 1, base_rental_price: 1 } }
    )
  );

  if (!room) return { error: 'Local de evento no encontrado' };

  const pkg = fromDoc(
    await C('packages').findOne({ _id: nid(packageId), local_id: nid(roomId) })
  );

  if (!pkg) return { error: 'Paquete no encontrado' };

  const guestCount = Number(attendees);
  if (!Number.isInteger(guestCount) || guestCount < 1) {
    return { error: 'La cantidad de asistentes debe ser al menos 1' };
  }

  if (guestCount > room.capacity) {
    return {
      error: `El local admite máximo ${room.capacity} asistentes`,
    };
  }

  const discount = Math.max(0, Number(discountPercent) || 0);
  const increment = Math.max(0, Number(incrementPercent) || 0);

  if (discount > 100) {
    return { error: 'El descuento no puede ser mayor al 100%' };
  }

  let packageUnitPrice = 0;
  let baseLocalCost = 0;
  let pricePerPerson = false;
  let plateDetails = null;

  if (pkg.includes_food) {
    if (!plateId) {
      return { error: 'Selecciona un plato de fondo para calcular el paquete' };
    }

    plateDetails = await resolveMenuPlate(packageId, plateId, 'plato_fondo');
    if (!plateDetails) {
      return { error: 'Plato de fondo no válido para este paquete' };
    }

    const customUnitPrice =
      unitPrice != null && unitPrice !== '' ? Number(unitPrice) : plateDetails.price_per_plate;

    if (Number.isNaN(customUnitPrice) || customUnitPrice < 0) {
      return { error: 'El costo por persona no es válido' };
    }

    packageUnitPrice = customUnitPrice;
    baseLocalCost = Math.round(packageUnitPrice * guestCount * 100) / 100;
    pricePerPerson = true;
  } else {
    const defaultRental = pkg.rental_price > 0 ? pkg.rental_price : room.base_rental_price;
    const customRental =
      unitPrice != null && unitPrice !== '' ? Number(unitPrice) : defaultRental;

    if (Number.isNaN(customRental) || customRental < 0) {
      return { error: 'El costo de alquiler no es válido' };
    }

    packageUnitPrice = customRental;
    baseLocalCost = Math.round(packageUnitPrice * 100) / 100;
    pricePerPerson = false;
  }

  const rentalCost = applyPriceAdjustment(baseLocalCost, discount, increment);

  const entrada = await resolveOptionalExtra(packageId, entradaId, 'entrada', entradaPrice, guestCount);
  if (entrada?.error) return entrada;
  const bebida = await resolveOptionalExtra(packageId, bebidaId, 'bebida', bebidaPrice, guestCount);
  if (bebida?.error) return bebida;
  const postre = await resolveOptionalExtra(packageId, postreId, 'postre', postrePrice, guestCount);
  if (postre?.error) return postre;

  const extras = [entrada, bebida, postre].filter(Boolean);
  const extrasCost = Math.round(extras.reduce((sum, item) => sum + item.price, 0) * 100) / 100;
  const foodCost = extrasCost;

  const decorationResolved = await resolveDecorationItems(decorationIds, decorationPrice, roomId);
  if (decorationResolved?.error) return decorationResolved;

  const decorationPlates = decorationResolved;
  const decorationCost =
    Math.round(decorationPlates.reduce((sum, item) => sum + item.price_per_plate, 0) * 100) / 100;
  const decorationItems = decorationPlates.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description ?? '',
    price: item.price_per_plate,
  }));

  const totalCost = Math.round((rentalCost + foodCost + decorationCost) * 100) / 100;

  const suggestedDeposit = Math.round(totalCost * 0.3 * 100) / 100;

  return {
    room,
    package: pkg,
    attendees: guestCount,
    packageUnitPrice,
    baseLocalCost,
    pricePerPerson,
    discountPercent: discount,
    incrementPercent: increment,
    rentalCost,
    foodCost,
    extrasCost,
    extras: {
      entrada: entrada ?? null,
      bebida: bebida ?? null,
      postre: postre ?? null,
    },
    decorationCost,
    decorationItems,
    totalCost,
    suggestedDeposit,
    plateDetails,
  };
}
