import { C, insertDoc } from '../mongo.js';
import { inferBebidaCategory, inferHeladoCategory } from './menuCategories.js';

export const JAZMINES = {
  name: 'Los Jazmines',
  ownerName: 'Jaime A. Brito Mallqui',
  ownerDni: '31760959',
  phones: ['943491997', '975199496'],
  year: 2026,
  extensionPerHour: 120,
  packageIncludes: [
    'Pisco sour para el brindis',
    'Chicha en jarra por mesa',
    'Local decorado por 08 horas',
    'Biombo, mesas con dos manteles y centro de flores naturales',
    'Menajería completa, sillón de reyna, alfombra',
    'Parlante de salón, servicio de mozos',
  ],
  decoration: {
    biombo: 'Biombo creación Jazmines',
    tematico: 'Biombo temático: túnel, arco de globos, flores y/o tela',
    extras: 'Alfombra, silla de trono, luces, máquina de humo',
  },
  extrasTerms: `La fiesta se podrá extender luego de vencido este contrato; habrá que abonar S/. 120.00 soles por cada hora de extensión. Asimismo, deberá acudir a las oficinas del APDAY a pagar los conceptos de derecho de autor. De existir daños ocasionados a los servicios (vasos, copas, menajería en general) se tendrá que reconocer los costos. No se admiten devoluciones por adelantos de ningún monto dinerario debido a que el local ya estaría separado.`,
};

export const MENU_CATALOG = {
  brindis: [{ name: 'Pisco Sour', note: 'Oferta o incluye' }],
  platos_fondo: [
    { name: 'Parrilla de pollo Kid (Sólo fiestas infantiles)', price: 20 },
    { name: '¼ Parrilla de pollo ó ¼ Pollo al horno con ensalada a elección', price: 35 },
    { name: '250 grs. de Parrilla de chancho con ensalada', price: 35 },
    { name: '¼ Picante de cuy', price: 38 },
    { name: '½ Picante de cuy', price: 52 },
    { name: 'Parrilla mixta (pollo y chancho)', price: 44 },
    {
      name: 'Pachamanca dos carnes chancho y pollo (crema de rocoto, papa, camote, habas, choclo con queso, tamal y humita)',
      price: 52,
    },
    { name: 'Seco de res con arroz, yuca y menestra (Seco a la norteña) con ensalada criolla', price: 42 },
    { name: '250 grs. Asado de res con puré de papas y arroz', price: 40 },
    { name: 'Llunca de pollo y ¼ Picante de Cuy (Almuerzo)', price: 47 },
    { name: 'Asado de chancho con mote blanco, ensalada y mollete', price: 38 },
  ],
  bebidas_cortesia: [{ name: 'Jarra de chicha por mesa', note: 'Oferta o incluye' }],
  bebidas_pack: [
    {
      name: 'Gaseosa 3 lts. Agua mineral 3 lts. y Vino Santiago Queirolo',
      price: 5,
      unit: 'persona',
    },
  ],
  bebidas_otras: [
    {
      name: 'Cerveza Pilsen',
      price: 8.5,
      priceAlt: 98,
      unit: 'unidad / caja',
      description: 'C. Trigo: S/. 9.00 / S/. 104.00',
    },
    { name: 'Cerveza Trigo', price: 9, priceAlt: 104, unit: 'unidad / caja' },
    { name: 'Corcho', price: 20, unit: 'caja' },
  ],
  entradas: [
    { name: 'Llunca de pollo', price: 10 },
    { name: 'Tamal con ensalada', price: 5 },
    { name: 'Asado de chancho con mote blanco, ensalada y mollete', price: 12 },
    { name: 'Jamón con ensalada', price: 12 },
    { name: 'Causa criolla de pollo o atún filete', price: 4.5 },
  ],
  helados: [{ name: "Helados D'ONORIO", price: 5 }],
  postres: [{ name: 'Arroz con leche ó Mazamorra morada', price: 4 }],
  decoracion: [
    {
      name: 'Biombo creación Jazmines',
      description: 'Color de decoración del local a elección',
      price: 0,
    },
    {
      name: 'Biombo temático',
      description: 'Túnel, arco de globos, flores y/o tela',
      price: 0,
    },
    {
      name: 'Extras de decoración',
      description: 'Alfombra, silla de trono, luces, máquina de humo',
      price: 0,
    },
  ],
};

export async function seedLocalPackages(localId, localName = 'Local') {
  const existing = await C('packages').findOne({ local_id: localId });
  if (existing) return;

  const pkgSolo = await insertDoc('packages', {
    local_id: localId,
    name: `${localName} — Solo local`,
    type: 'solo_alquiler',
    description:
      'Alquiler del local con decoración, mesas, menajería y servicio de mozos por 8 horas.',
    rental_price: 0,
    includes_food: 0,
  });

  const pkgBanquete = await insertDoc('packages', {
    local_id: localId,
    name: `${localName} — Con banquete`,
    type: 'alquiler_comida',
    description: 'Paquete completo con plato de fondo a elección por persona.',
    rental_price: 0,
    includes_food: 1,
  });

  for (const item of MENU_CATALOG.platos_fondo) {
    await insertDoc('menu_plates', {
      package_id: pkgBanquete.lastInsertRowid,
      name: item.name,
      description: '',
      price_per_plate: item.price,
      category: 'plato_fondo',
    });
  }

  for (const item of MENU_CATALOG.entradas) {
    await insertDoc('menu_plates', {
      package_id: pkgBanquete.lastInsertRowid,
      name: item.name,
      description: 'Entrada',
      price_per_plate: item.price,
      category: 'entrada',
    });
  }

  for (const item of MENU_CATALOG.helados) {
    await insertDoc('menu_plates', {
      package_id: pkgBanquete.lastInsertRowid,
      name: item.name,
      description: 'Helado',
      price_per_plate: item.price,
      category: inferHeladoCategory(item),
    });
  }

  for (const item of MENU_CATALOG.postres) {
    await insertDoc('menu_plates', {
      package_id: pkgBanquete.lastInsertRowid,
      name: item.name,
      description: 'Postre',
      price_per_plate: item.price,
      category: inferHeladoCategory(item),
    });
  }

  for (const group of ['bebidas_cortesia', 'bebidas_pack', 'bebidas_otras']) {
    for (const item of MENU_CATALOG[group] ?? []) {
      const category = inferBebidaCategory(item);
      await insertDoc('menu_plates', {
        package_id: pkgBanquete.lastInsertRowid,
        name: item.name,
        description: buildPlateDescription(item),
        price_per_plate: category === 'bebida_otras' ? 0 : item.price ?? 0,
        category,
      });
    }
  }

  for (const item of MENU_CATALOG.decoracion) {
    await insertDoc('menu_plates', {
      package_id: pkgSolo.lastInsertRowid,
      name: item.name,
      description: item.description ?? '',
      price_per_plate: item.price ?? 0,
      category: 'decoracion',
    });
  }

  await insertDoc('menu_plates', {
    package_id: pkgSolo.lastInsertRowid,
    name: `Paquete base ${localName}`,
    description: JAZMINES.packageIncludes.join(', '),
    price_per_plate: 0,
    category: 'servicio',
  });
}

function buildPlateDescription(item) {
  if (item.note) return item.note;
  if (item.priceAlt != null && item.price != null) {
    const extra = item.description ? ` — ${item.description}` : '';
    return `${item.unit ?? 'unidad / caja'}: S/. ${item.price.toFixed(2)} / S/. ${item.priceAlt.toFixed(2)}${extra}`;
  }
  if (item.unit && item.price != null) {
    return `S/. ${item.price.toFixed(2)} x ${item.unit}`;
  }
  return item.description ?? '';
}

export const DEFAULT_LOCAL_BRANDING = {
  ownerDni: '',
  phones: [],
  extensionPerHour: JAZMINES.extensionPerHour,
  packageIncludes: JAZMINES.packageIncludes,
  decoration: JAZMINES.decoration,
  extrasTerms: JAZMINES.extrasTerms,
};
