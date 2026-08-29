import { C } from '../mongo.js';
import {
  BEBIDA_CATEGORIES,
  HELADO_CATEGORY,
  inferBebidaCategory,
  inferHeladoCategory,
} from '../catalogs/menuCategories.js';

async function migrateHeladoPlates() {
  const postres = await C('menu_plates').find({ category: 'postre' }).toArray();

  for (const plate of postres) {
    const category = inferHeladoCategory(plate);
    const description = category === HELADO_CATEGORY ? 'Helado' : 'Postre';
    if (plate.category !== category || plate.description !== description) {
      await C('menu_plates').updateOne(
        { _id: plate._id },
        { $set: { category, description } }
      );
    }
  }
}

async function migrateBebidaPlates() {
  const bebidas = await C('menu_plates')
    .find({ category: { $in: ['bebida', ...BEBIDA_CATEGORIES] } })
    .toArray();

  for (const plate of bebidas) {
    if (BEBIDA_CATEGORIES.includes(plate.category) && plate.category !== 'bebida') {
      continue;
    }

    const category = inferBebidaCategory({
      name: plate.name,
      note: plate.description?.includes('Oferta') ? plate.description : null,
    });

    if (plate.category !== category) {
      await C('menu_plates').updateOne({ _id: plate._id }, { $set: { category } });
    }
  }
}

async function migrateHeladoBookings() {
  const heladoPlates = await C('menu_plates').find({ category: HELADO_CATEGORY }).toArray();
  if (!heladoPlates.length) return;

  const heladoIds = heladoPlates.map((plate) => plate._id);
  const bookings = await C('bookings')
    .find({
      menu_postre_id: { $in: heladoIds },
      $or: [{ menu_helado_id: { $exists: false } }, { menu_helado_id: null }],
    })
    .toArray();

  for (const booking of bookings) {
    await C('bookings').updateOne(
      { _id: booking._id },
      {
        $set: {
          menu_helado_id: booking.menu_postre_id,
          menu_helado_name: booking.menu_postre_name ?? '',
          menu_helado_price: booking.menu_postre_price ?? 0,
          menu_postre_id: null,
          menu_postre_name: '',
          menu_postre_price: 0,
        },
      }
    );
  }
}

export async function migrateMenuPlateCategories() {
  await migrateHeladoPlates();
  await migrateBebidaPlates();
  await migrateHeladoBookings();
}
