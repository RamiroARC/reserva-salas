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
  extrasTerms:
    'La fiesta se podrá extender luego de vencido este contrato; habrá que abonar S/. 120.00 soles por cada hora de extensión. Asimismo, deberá acudir a las oficinas del APDAY a pagar los conceptos de derecho de autor. De existir daños ocasionados a los servicios (vasos, copas, menajería en general) se tendrá que reconocer los costos. No se admiten devoluciones por adelantos de ningún monto dinerario debido a que el local ya estaría separado.',
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
  bebidas: [
    { name: 'Jarra de chicha por mesa', note: 'Oferta o incluye' },
    {
      name: 'Gaseosa 3 lts. Agua mineral 3 lts. y Vino Santiago Queirolo',
      price: 5,
      unit: 'persona',
    },
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
  postres: [
    { name: "Helados D'ONORIO", price: 5 },
    { name: 'Arroz con leche ó Mazamorra morada', price: 4 },
  ],
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
