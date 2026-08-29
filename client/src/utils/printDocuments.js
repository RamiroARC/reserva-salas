import { formatCurrency, formatDateShort, formatTime } from '../api';
import { formatDecorationColors } from '../constants/decorationColors';
import {
  affectsBalance,
  getPaymentConceptLabel,
  getPaymentMethodLabel,
  sortPayments,
} from '../constants/paymentTypes';
import { getStatusLabel } from '../constants/bookingStatus';
import { buildContractExtrasTermsHtml } from '../constants/contractExtraTerms';
import { resolveBranding } from '../constants/branding';
import { MENU_CATALOG } from '../data/jazminesCatalog';
import { parseDecorationItems } from '../constants/packageMenu';
import {
  isPlatoFondoIncludeText,
  parsePromoIncludes,
  parsePromotionalExtras,
} from '../constants/promotionalPackages';

function formatSoles(amount) {
  if (amount == null || Number.isNaN(amount)) return 'S/. ………';
  return `S/. ${Number(amount).toFixed(2)}`;
}

function todayShort() {
  return formatDateShort(new Date().toISOString());
}

function documentHeaderStyles() {
  return `
    .doc-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid #ccc;
    }
    .doc-header__logo {
      display: block;
      height: 48px;
      width: auto;
      max-width: 110px;
      object-fit: contain;
      object-position: left center;
      flex-shrink: 0;
    }
    .doc-header__text {
      min-width: 0;
    }
    .doc-header__brand {
      display: block;
      font-size: 14px;
      font-weight: bold;
      line-height: 1.2;
    }
    .doc-header__tagline {
      display: block;
      font-size: 10px;
      color: #555;
      margin-top: 2px;
      line-height: 1.2;
    }
  `;
}

function renderDocumentHeader(bannerUrl) {
  return `
  <div class="doc-header">
    <img class="doc-header__logo" src="${bannerUrl}" alt="Los Jazmines" />
    <div class="doc-header__text">
      <strong class="doc-header__brand">Los Jazmines</strong>
      <span class="doc-header__tagline">Eventos y recepciones</span>
    </div>
  </div>`;
}

function jazminesPrintStyles() {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      line-height: 1.35;
      color: #000;
      padding: 18px 22px;
      max-width: 210mm;
      margin: 0 auto;
    }
    .title {
      text-align: center;
      font-size: 18px;
      font-weight: bold;
      letter-spacing: 1px;
      margin-bottom: 14px;
    }
    .line { margin-bottom: 6px; }
    .line strong { font-weight: bold; }
    .fill {
      display: inline-block;
      border-bottom: 1px solid #000;
      min-width: 120px;
      padding: 0 4px 1px;
      font-weight: normal;
    }
    .fill--wide { min-width: 280px; }
    .fill--short { min-width: 60px; }
    .row-2 {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    .menu-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px 20px;
      margin: 10px 0;
    }
    .menu-block h3 {
      font-size: 11px;
      font-weight: bold;
      margin-bottom: 4px;
      text-decoration: underline;
    }
    .menu-item {
      font-size: 10px;
      margin-bottom: 3px;
      padding-left: 2px;
    }
    .menu-item.selected {
      font-weight: bold;
      background: #f0f0f0;
    }
    .menu-item .price { float: right; white-space: nowrap; }
    .section-title {
      font-weight: bold;
      margin: 10px 0 4px;
      text-decoration: underline;
    }
    .includes, .terms {
      font-size: 10px;
      text-align: justify;
    }
    .includes li, .deco-list li { margin-bottom: 2px; margin-left: 16px; }
    .payments {
      margin: 12px 0;
      font-size: 12px;
      font-weight: bold;
    }
    .payments span { margin-right: 24px; }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 28px;
    }
    .sig-block { text-align: center; font-size: 10px; }
    .sig-line {
      border-top: 1px solid #000;
      margin: 40px 0 6px;
      padding-top: 4px;
    }
    .footer-phones {
      text-align: center;
      margin-top: 14px;
      font-size: 11px;
      font-weight: bold;
    }
    ${documentHeaderStyles()}
    .doc-title {
      text-align: center;
      font-size: 16px;
      font-weight: bold;
      letter-spacing: 1px;
      margin-bottom: 12px;
      text-transform: uppercase;
    }
    @media print {
      body { padding: 8mm 12mm 12mm; }
      @page { size: A4; margin: 8mm; }
      .doc-header__logo {
        height: 42px;
        max-width: 96px;
      }
    }
  `;
}

function formatMenuItemPrice(name, price, description, attendees, perPerson = false) {
  if (description) return description;
  if (price != null && price > 0 && perPerson && attendees) {
    return `S/. ${Number(price).toFixed(2)}/persona × ${attendees} = ${formatSoles(price * attendees)}`;
  }
  if (price != null && price > 0) {
    return formatSoles(price);
  }
  return '';
}

function renderDecorationColorOnly(decorationColor) {
  const colors = formatDecorationColors(decorationColor);
  if (!colors) return '';
  return `<div class="line"><strong>Color de decoración del local:</strong> ${colors}</div>`;
}

function renderPromotionalPackageContent({
  promotionalIncludes = [],
  promotionalExtras = [],
  attendees,
}) {
  let html = '';

  if (promotionalIncludes.length) {
    html += `
  <div class="section-title">Paquete promocional incluye</div>
  <ul class="includes">
    ${promotionalIncludes
      .map((item) => {
        const label = String(item).trim();
        if (!label) return '';
        const isPlatoFondo = isPlatoFondoIncludeText(label);
        return `<li${isPlatoFondo ? ' style="font-weight:bold"' : ''}>${label}</li>`;
      })
      .filter(Boolean)
      .join('')}
  </ul>`;
  }

  if (promotionalExtras.length) {
    html += `
  <div class="section-title">Entradas, sopas y postres adicionales</div>
  ${promotionalExtras
    .map((extra) => {
      const unitPrice = extra.unitPrice ?? extra.price ?? 0;
      const total = extra.price ?? 0;
      const guestCount = extra.attendees ?? attendees;
      const priceLabel =
        guestCount && unitPrice !== total
          ? `${formatSoles(unitPrice)}/persona × ${guestCount} = ${formatSoles(total)}`
          : formatSoles(total);

      return `<div class="menu-item selected">► ${extra.name}<span class="price">${priceLabel}</span></div>`;
    })
    .join('')}`;
  }

  return html;
}

function renderDecorationPackage(decorationColor, decorationItems = []) {
  const selected = decorationItems.filter((item) => item?.name?.trim());
  if (!selected.length) return '';

  const colors = formatDecorationColors(decorationColor);
  const catalogByName = new Map(MENU_CATALOG.decoracion.map((item) => [item.name, item]));

  const rows = selected
    .map((item) => {
      const catalog = catalogByName.get(item.name);
      const colorSuffix =
        item.name.includes('Jazmines') && colors
          ? `. Color de decoración del local: ${colors}`
          : '';
      const priceStr =
        item.price > 0 ? `<span class="price">${formatSoles(item.price)}</span>` : '';
      const description = catalog?.description ? `: ${catalog.description}` : '';
      const themeSuffix = item.themeName
        ? item.themeUnitPrice > 0
          ? ` — Tema: ${item.themeName} (${formatSoles(item.themeUnitPrice)}/unidad)`
          : ` — Tema: ${item.themeName}`
        : '';

      return `<div class="menu-item selected">► ${item.name}${description}${themeSuffix}${colorSuffix}${priceStr}</div>`;
    })
    .join('');

  return `
  <div class="section-title">Decoración del local</div>
  ${rows}`;
}

function renderSelectedMainCourse({ includesFood, menuPlateName, menuPlateDescription, platePrice, attendees }) {
  if (!includesFood || !menuPlateName?.trim()) return '';

  const priceLabel = formatMenuItemPrice(
    menuPlateName,
    platePrice,
    menuPlateDescription,
    attendees,
    true
  );

  return `
  <div class="section-title">Plato de fondo seleccionado</div>
  <div class="menu-item selected">► ${menuPlateName.trim()}<span class="price">${priceLabel}</span></div>`;
}

function renderSelectedPackageItems(data) {
  const {
    includesFood,
    attendees,
    menuEntradaName,
    menuEntradaPrice,
    menuBebidaName,
    menuBebidaPrice,
    menuBebidaDescription,
    menuPostreName,
    menuPostrePrice,
  } = data;

  if (!includesFood) return '';

  const sections = [
    {
      title: 'Entrada seleccionada',
      name: menuEntradaName,
      price: menuEntradaPrice,
      description: null,
    },
    {
      title: 'Bebida seleccionada',
      name: menuBebidaName,
      price: menuBebidaPrice,
      description: menuBebidaDescription,
    },
    {
      title: 'Helado o postre seleccionado',
      name: menuPostreName,
      price: menuPostrePrice,
      description: null,
    },
  ]
    .filter((section) => section.name?.trim())
    .map(
      (section) => `
  <div class="section-title">${section.title}</div>
  <div class="menu-item selected">► ${section.name}<span class="price">${formatMenuItemPrice(
        section.name,
        section.price,
        section.price > 0 ? null : section.description,
        attendees,
        true
      )}</span></div>`
    )
    .join('');

  return sections;
}

function buildJazminesBody(data, docType) {
  const {
    organizer,
    clientDni,
    title,
    eventType,
    eventDate,
    startTime,
    endTime,
    foodTime,
    roomName,
    packageName,
    attendees,
    clientPhone,
    clientPhone2,
    menuPlateName,
    menuPlateDescription,
    platePrice,
    menuEntradaName,
    menuEntradaPrice,
    menuBebidaName,
    menuBebidaPrice,
    menuBebidaDescription,
    menuPostreName,
    menuPostrePrice,
    packageUnitPrice,
    baseLocalCost,
    rentalCost,
    foodCost,
    totalCost,
    depositAmount,
    balanceDue,
    guaranteeAmount,
    decorationColor,
    decorationItems,
    notes,
    includesFood,
    isPromotional,
    promotionalIncludes,
    promotionalExtras,
    extrasTerms,
  } = data;

  const brand = resolveBranding(data.local);
  const isPromoPackage = Boolean(isPromotional ?? data.packageType === 'promotional');
  const isQuote = docType === 'quote';
  const docTitle = isQuote ? 'CONTRATO' : `CONTRATO ${brand.year}`;
  const bannerUrl = data.bannerUrl || brand.bannerUrl;
  const pricingNotes = isPromoPackage
    ? [
        data.pricePerPerson && packageUnitPrice != null && attendees
          ? `Paquete promocional: ${formatSoles(packageUnitPrice)}/persona × ${attendees} = ${formatSoles(baseLocalCost ?? rentalCost)}`
          : packageUnitPrice != null && attendees
            ? `Paquete promocional: ${formatSoles(baseLocalCost ?? rentalCost)}`
            : null,
        foodCost > 0 ? `Extras adicionales: ${formatSoles(foodCost)}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : [
        includesFood && menuPlateName?.trim() && packageUnitPrice != null && attendees
          ? `Plato de fondo: ${menuPlateName.trim()} — ${formatSoles(packageUnitPrice)}/persona × ${attendees} = ${formatSoles(baseLocalCost ?? rentalCost)}`
          : data.pricePerPerson && packageUnitPrice != null && attendees
            ? `Paquete: ${formatSoles(packageUnitPrice)}/persona × ${attendees} = ${formatSoles(baseLocalCost ?? rentalCost)}`
            : packageUnitPrice != null
              ? `Paquete solo local: ${formatSoles(baseLocalCost ?? packageUnitPrice)}`
              : null,
        foodCost > 0 ? `Extras de banquete: ${formatSoles(foodCost)}` : null,
        data.decorationCost > 0 ? `Decoración adicional: ${formatSoles(data.decorationCost)}` : null,
      ]
        .filter(Boolean)
        .join(' · ');

  const decorationSection = isPromoPackage
    ? renderDecorationColorOnly(decorationColor)
    : renderDecorationPackage(decorationColor, decorationItems);

  const menuSection = isPromoPackage
    ? renderPromotionalPackageContent({
        promotionalIncludes,
        promotionalExtras,
        attendees,
      })
    : `${renderSelectedMainCourse({
        includesFood,
        menuPlateName,
        menuPlateDescription,
        platePrice,
        attendees,
      })}${renderSelectedPackageItems({
        includesFood,
        attendees,
        menuEntradaName,
        menuEntradaPrice,
        menuBebidaName,
        menuBebidaPrice,
        menuBebidaDescription,
        menuPostreName,
        menuPostrePrice,
      })}`;

  const defaultIncludesSection = isPromoPackage
    ? ''
    : `
  <div class="section-title">Paquete incluye</div>
  <ul class="includes">
    ${brand.packageIncludes.map((item) => `<li>${item}</li>`).join('')}
  </ul>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${docTitle} — ${brand.name}</title>
  <style>${jazminesPrintStyles()}</style>
</head>
<body>
  ${renderDocumentHeader(bannerUrl)}
  <div class="doc-title">${docTitle}</div>

  <div class="line">
    <strong>Sr(a):</strong>
    <span class="fill fill--wide">${organizer || ''}</span>
  </div>

  <div class="row-2 line">
    <span><strong>Tipo de Evento:</strong> <span class="fill">${eventType || title || ''}</span></span>
    <span><strong>Fecha:</strong> <span class="fill fill--short">${formatDateShort(eventDate)}</span></span>
  </div>

  <div class="row-2 line">
    <span><strong>Hora de Inicio:</strong> <span class="fill fill--short">${startTime || '……'} Hrs.</span></span>
    <span><strong>Hora de fin:</strong> <span class="fill fill--short">${endTime || '……'} Hrs.</span></span>
    ${includesFood ? `<span><strong>Hora de la comida:</strong> <span class="fill fill--short">${foodTime || '……'} Hrs.</span></span>` : ''}
  </div>

  <div class="row-2 line">
    <span><strong>Número de asistentes:</strong> <span class="fill fill--short">${attendees ?? ''} Personas</span></span>
    <span><strong>No. de teléfono de contacto:</strong> <span class="fill">${[clientPhone, clientPhone2].filter(Boolean).join(' / ') || ''}</span></span>
  </div>

  <div class="line">
    <strong>Local:</strong> <span class="fill">${roomName || brand.name}</span>
    &nbsp;&nbsp;
    <strong>Tipo PAQUETE DE:</strong> <span class="fill fill--wide">${packageName || ''}</span>
    <strong>Precio local:</strong> ${formatSoles(rentalCost)}
  </div>
  ${pricingNotes ? `<div class="line"><strong>Detalle de precio:</strong> ${pricingNotes}</div>` : ''}

  ${decorationSection}
  ${menuSection}
  ${defaultIncludesSection}

  ${notes ? `<div class="line" style="margin-top:6px"><strong>Observaciones:</strong> ${notes}</div>` : ''}

  <div class="section-title">Disposiciones extras</div>
  ${buildContractExtrasTermsHtml(extrasTerms, brand.extrasTerms)}

  <div class="payments">
    <span>Adelanto: ${formatSoles(depositAmount)}</span>
    <span>Saldo ${formatSoles(balanceDue)}</span>
    <span>Total ${formatSoles(totalCost)}</span>
    <span>Garantía S/.: ${formatSoles(guaranteeAmount)}</span>
  </div>

  ${isQuote ? `<p class="terms" style="margin-top:8px;font-style:italic">Documento preliminar sujeto a disponibilidad del local. Válido por 7 días calendario.</p>` : ''}

  <div class="signatures">
    <div class="sig-block">
      <div class="sig-line">Firma:</div>
      <div><strong>${brand.ownerName}</strong></div>
      <div>DNI N° ${brand.ownerDni}</div>
      <div>Hz. ${todayShort()}</div>
    </div>
    <div class="sig-block">
      <div class="sig-line">Firma:</div>
      <div><strong>${organizer || ''}</strong></div>
      <div>DNI N° ${clientDni || ''}</div>
      <div>Hz. ${todayShort()}</div>
    </div>
  </div>

  <div class="footer-phones">Telf. Nos. ${brand.phones.join(' ó ')}</div>
</body>
</html>`;
}

export function buildQuoteDocument(data) {
  return buildJazminesBody(
    {
      ...data,
      bannerUrl: data.bannerUrl || resolveBranding(data.local).bannerUrl,
      eventDate: data.eventDate,
      startTime: data.startTime,
      endTime: data.endTime,
      balanceDue: data.balance,
      includesFood: data.includesFood,
    },
    'quote'
  );
}

export function buildContractDocument(data) {
  const eventDate = data.startTime?.slice(0, 10) ?? data.eventDate;
  const includesFood = data.includesFood ?? data.packageType !== 'solo_alquiler';
  return buildJazminesBody(
    {
      local: data.local,
      bannerUrl: data.bannerUrl || resolveBranding(data.local).bannerUrl,
      organizer: data.organizer,
      clientDni: data.clientDni,
      title: data.title,
      eventType: data.eventType || data.title,
      eventDate,
      startTime: formatTime(data.startTime),
      endTime: formatTime(data.endTime),
      foodTime: includesFood ? data.foodTime : '',
      includesFood,
      roomName: data.roomName,
      packageName: data.packageName,
      attendees: data.attendees,
      clientPhone: data.clientPhone,
      clientPhone2: data.clientPhone2,
      menuPlateName: data.menuPlateName,
      menuPlateDescription: data.menuPlateDescription,
      platePrice: data.platePrice,
      menuEntradaName: data.menuEntradaName,
      menuEntradaPrice: data.menuEntradaPrice,
      menuBebidaName: data.menuBebidaName,
      menuBebidaPrice: data.menuBebidaPrice,
      menuBebidaDescription: data.menuBebidaDescription,
      menuPostreName: data.menuPostreName,
      menuPostrePrice: data.menuPostrePrice,
      packageUnitPrice: data.packageUnitPrice,
      baseLocalCost: data.baseLocalCost,
      pricePerPerson: data.pricePerPerson,
      rentalCost: data.rentalCost,
      foodCost: data.foodCost,
      totalCost: data.totalCost,
      depositAmount: data.depositPaid ?? data.depositAmount,
      balanceDue: data.balanceDue,
      guaranteeAmount: data.guaranteeAmount,
      decorationColor: data.decorationColor,
      decorationItems: data.decorationItems ?? parseDecorationItems(data.decoration_items),
      decorationCost: data.decorationCost,
      notes: data.notes,
      isPromotional: data.isPromotional ?? data.packageType === 'promotional',
      promotionalDescription: data.promotionalDescription,
      promotionalIncludes: data.promotionalIncludes ?? [],
      promotionalExtras: data.promotionalExtras ?? [],
      extrasTerms: data.extrasTerms,
    },
    'contract'
  );
}

export function mapBookingToContractData(detail) {
  const isPromotional = Boolean(detail.promotional_package_id);
  const includesFood = Boolean(
    detail.package_includes_food ?? detail.package_type !== 'solo_alquiler'
  );
  const attendees = Number(detail.attendees) || 0;
  const menuPlateName = detail.menu_plate_name?.trim() ?? '';
  const platePrice =
    includesFood && attendees > 0 && detail.rental_cost > 0
      ? Math.round((detail.rental_cost / attendees) * 100) / 100
      : Number(detail.menu_plate_price) || 0;
  const decorationItems = isPromotional ? [] : parseDecorationItems(detail.decoration_items);
  const decorationCost = isPromotional
    ? 0
    : decorationItems.reduce((sum, item) => sum + (item.price ?? 0), 0);
  const promotionalIncludes = parsePromoIncludes(detail.promotional_includes);
  const promotionalExtras = parsePromotionalExtras(detail.promotional_extras);

  return {
    id: detail.id,
    title: detail.title,
    eventType: detail.event_type,
    organizer: detail.organizer,
    clientDni: detail.client_dni,
    clientPhone: detail.client_phone,
    clientPhone2: detail.client_phone_2,
    clientEmail: detail.client_email,
    startTime: detail.start_time,
    endTime: detail.end_time,
    foodTime: includesFood ? detail.food_time : '',
    includesFood,
    isPromotional,
    packageType: detail.package_type,
    roomName: detail.room_name,
    packageName: detail.package_name,
    attendees: detail.attendees,
    menuPlateName: isPromotional
      ? detail.menu_plate_name?.trim() || ''
      : menuPlateName,
    menuPlateDescription: isPromotional ? '' : detail.menu_plate_description ?? '',
    platePrice,
    menuEntradaName: isPromotional ? '' : detail.menu_entrada_name?.trim() || '',
    menuEntradaPrice: isPromotional ? 0 : detail.menu_entrada_price || 0,
    menuBebidaName: isPromotional ? '' : detail.menu_bebida_name?.trim() || '',
    menuBebidaPrice: isPromotional ? 0 : detail.menu_bebida_price || 0,
    menuBebidaDescription: isPromotional ? undefined : detail.menu_bebida_description,
    menuPostreName: isPromotional ? '' : detail.menu_postre_name?.trim() || '',
    menuPostrePrice: isPromotional ? 0 : detail.menu_postre_price || 0,
    promotionalDescription: detail.promotional_description ?? '',
    promotionalIncludes,
    promotionalExtras,
    packageUnitPrice: includesFood ? platePrice : undefined,
    pricePerPerson: includesFood,
    baseLocalCost: detail.rental_cost,
    rentalCost: detail.rental_cost,
    foodCost: detail.food_cost,
    totalCost: detail.total_cost,
    depositAmount: detail.deposit_amount,
    depositPaid: detail.deposit_paid,
    balanceDue: detail.balance_due,
    guaranteeAmount: detail.guarantee_amount,
    decorationColor: detail.decoration_color,
    decorationItems,
    decorationCost,
    status: detail.status,
    notes: detail.notes,
    createdAt: detail.created_at,
    payments: detail.payments ?? [],
  };
}

export function buildBookingsReportDocument(
  bookings,
  { filterLabel, dateRangeLabel, generatedAt, getStatusLabel, local }
) {
  const brand = resolveBranding(local);
  const labelFor = getStatusLabel ?? ((s) => s);
  const rows = bookings
    .map(
      (b, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${formatDateShort(b.start_time)}</td>
        <td>${formatTime(b.start_time)} – ${formatTime(b.end_time)}</td>
        <td>${b.event_type || b.title || '—'}</td>
        <td>${b.organizer || '—'}</td>
        <td>${b.package_name || '—'}</td>
        <td class="num">${b.attendees ?? '—'}</td>
        <td class="num">${formatSoles(b.total_cost)}</td>
        <td class="num">${formatSoles(b.deposit_paid)}</td>
        <td class="num">${formatSoles(b.balance_due)}</td>
        <td>${labelFor(b.status)}</td>
      </tr>`
    )
    .join('');

  const totals = bookings.reduce(
    (acc, b) => ({
      total: acc.total + (b.total_cost || 0),
      paid: acc.paid + (b.deposit_paid || 0),
      balance: acc.balance + (b.balance_due || 0),
    }),
    { total: 0, paid: 0, balance: 0 }
  );

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Reporte de reservas — Los Jazmines</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      color: #111;
      padding: 20px 24px;
    }
    ${documentHeaderStyles()}
    h1 {
      font-size: 16px;
      margin: 0 0 4px;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .meta {
      color: #555;
      margin-bottom: 16px;
      font-size: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }
    th, td {
      border: 1px solid #ccc;
      padding: 6px 8px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: #f3f4f6;
      font-weight: bold;
    }
    td.num { text-align: right; white-space: nowrap; }
    tfoot td {
      font-weight: bold;
      background: #fafafa;
    }
    @media print {
      body { padding: 10px; }
    }
  </style>
</head>
<body>
  ${renderDocumentHeader(brand.bannerUrl)}
  <h1>Reporte de reservas — ${brand.name}</h1>
  <p class="meta">
    Estado: ${filterLabel || 'Todos'} ·
    Fechas: ${dateRangeLabel || 'Todas'} ·
    ${bookings.length} registro(s) ·
    Generado: ${formatDateShort(generatedAt)} ${formatTime(generatedAt)}
  </p>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Fecha</th>
        <th>Horario</th>
        <th>Evento</th>
        <th>Cliente</th>
        <th>Paquete</th>
        <th>Asist.</th>
        <th>Total</th>
        <th>Pagado</th>
        <th>Saldo</th>
        <th>Estado</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="11" style="text-align:center;padding:16px">Sin registros</td></tr>'}
    </tbody>
    ${
      bookings.length
        ? `<tfoot>
      <tr>
        <td colspan="7">Totales</td>
        <td class="num">${formatSoles(totals.total)}</td>
        <td class="num">${formatSoles(totals.paid)}</td>
        <td class="num">${formatSoles(totals.balance)}</td>
        <td></td>
      </tr>
    </tfoot>`
        : ''
    }
  </table>
</body>
</html>`;
}

export function buildPaymentHistoryDocument(detail, local) {
  const brand = resolveBranding(local);
  const payments = sortPayments(detail.payments ?? []);
  const bannerUrl = brand.bannerUrl;
  const eventDate = detail.start_time?.slice(0, 10);
  const decoration = formatDecorationColors(detail.decoration_color);

  const rows = payments
    .map(
      (payment) => `
      <tr>
        <td>${formatDateShort(payment.payment_date)}</td>
        <td><strong>${getPaymentConceptLabel(payment, payments)}</strong></td>
        <td class="num">${formatSoles(payment.amount)}</td>
        <td>${getPaymentMethodLabel(payment.payment_method)}</td>
        <td>${payment.operation_number || '—'}</td>
        <td>${payment.notes || '—'}</td>
      </tr>`
    )
    .join('');

  const paidTowardContract = payments
    .filter((payment) => affectsBalance(payment.payment_type))
    .reduce((sum, payment) => sum + payment.amount, 0);

  const guaranteePaid = payments
    .filter((payment) => payment.payment_type === 'garantia')
    .reduce((sum, payment) => sum + payment.amount, 0);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Historial de pagos — Los Jazmines</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      line-height: 1.35;
      color: #000;
      padding: 18px 22px;
      max-width: 210mm;
      margin: 0 auto;
    }
    ${documentHeaderStyles()}
    .title {
      text-align: center;
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .meta { margin-bottom: 8px; }
    .meta strong { font-weight: bold; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 14px;
      font-size: 10px;
    }
    th, td {
      border: 1px solid #999;
      padding: 7px 8px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: #f3f4f6;
      font-weight: bold;
    }
    td.num { text-align: right; white-space: nowrap; }
    .summary {
      margin-top: 14px;
      display: flex;
      flex-wrap: wrap;
      gap: 16px 24px;
    }
    .summary span { font-weight: bold; }
    .footer-phones {
      margin-top: 18px;
      text-align: center;
      font-size: 10px;
    }
    @media print {
      body { padding: 10px; }
    }
  </style>
</head>
<body>
  ${renderDocumentHeader(bannerUrl)}
  <div class="title">HISTORIAL DE PAGOS — ${brand.name.toUpperCase()} ${brand.year}</div>

  <div class="meta"><strong>Reserva N°:</strong> ${detail.id}</div>
  <div class="meta"><strong>Evento:</strong> ${detail.event_type || detail.title || '—'}</div>
  <div class="meta"><strong>Cliente:</strong> ${detail.organizer || '—'} · DNI: ${detail.client_dni || '—'}</div>
  <div class="meta"><strong>Fecha del evento:</strong> ${formatDateShort(eventDate)} · ${formatTime(detail.start_time)} – ${formatTime(detail.end_time)}</div>
  <div class="meta"><strong>Paquete:</strong> ${detail.package_name || '—'}</div>
  <div class="meta"><strong>Estado:</strong> ${getStatusLabel(detail.status)}</div>
  ${decoration ? `<div class="meta"><strong>Decoración:</strong> ${decoration}</div>` : ''}

  <table>
    <thead>
      <tr>
        <th>Fecha</th>
        <th>Concepto</th>
        <th>Monto</th>
        <th>Medio</th>
        <th>Nro. operación</th>
        <th>Notas</th>
      </tr>
    </thead>
    <tbody>
      ${
        rows ||
        '<tr><td colspan="6" style="text-align:center;padding:14px">Sin pagos registrados</td></tr>'
      }
    </tbody>
  </table>

  <div class="summary">
    <span>Total contrato: ${formatSoles(detail.total_cost)}</span>
    <span>Pagado al contrato: ${formatSoles(paidTowardContract)}</span>
    <span>Saldo: ${formatSoles(detail.balance_due)}</span>
    <span>Garantía registrada: ${formatSoles(guaranteePaid)}</span>
    <span>Garantía pactada: ${formatSoles(detail.guarantee_amount)}</span>
  </div>

  <div class="footer-phones">Telf. Nos. ${brand.phones.join(' ó ')}</div>
</body>
</html>`;
}

export function previewDocument(html, title, onPreview) {
  if (onPreview) {
    onPreview({ html, title });
    return;
  }

  openDocumentInTab(html);
}

export function openDocumentInTab(html) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const tab = window.open(url, '_blank');
  if (!tab) {
    alert('Permite ventanas emergentes para ver el documento.');
    URL.revokeObjectURL(url);
    return false;
  }
  tab.onload = () => URL.revokeObjectURL(url);
  return true;
}

/** @deprecated Usa previewDocument con modal */
export function printDocument(html, title) {
  previewDocument(html, title);
}

export { formatCurrency };
