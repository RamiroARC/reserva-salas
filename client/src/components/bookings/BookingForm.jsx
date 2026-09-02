import { useEffect, useRef, useState } from 'react';
import { combineDateAndTime, createEventType, fetchQuote, formatCurrency, isoToTimeInput } from '../../api';
import {
  parseDecorationColors,
  serializeDecorationColors,
} from '../../constants/decorationColors';
import { isBookingLocked } from '../../constants/bookingStatus';
import { BEBIDA_MANAGER_GROUP, BOOKING_BEBIDA_SECTIONS, PACKAGE_MENU_SECTIONS, formatPlateOptionLabel, getDecoracionPlates, parseDecorationItems } from '../../constants/packageMenu';
import {
  getBookingExtraKey,
  isBebidaCategory,
  isBebidaOtrasCategory,
  isBebidaPackCategory,
} from '../../constants/menuCategories';
import { PAYMENT_METHODS } from '../../constants/paymentTypes';
import { isPlatoFondoIncludeText, parsePromotionalExtras } from '../../constants/promotionalPackages';
import { buildContractDocument, previewDocument } from '../../utils/printDocuments';
import DocumentPreview from '../shared/DocumentPreview';
import BookingAttachments from './BookingAttachments';
import DecorationColorFan from '../utilities/DecorationColorFan';

const defaultTimes = { start: '18:00', end: '23:00', food: '20:00' };

function keepDigits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function parsePackageSelection(value) {
  if (!value) return { type: null, id: null, name: null };
  if (value.startsWith('promo:')) {
    const payload = decodeURIComponent(value.slice(6));
    const asId = Number(payload);
    if (!Number.isNaN(asId) && String(asId) === payload) {
      return { type: 'promo', id: asId, name: null };
    }
    return { type: 'promo', id: null, name: payload };
  }
  if (value.startsWith('pkg:')) return { type: 'pkg', id: Number(value.slice(4)), name: null };
  return { type: 'pkg', id: Number(value), name: null };
}

function deriveUnitPriceFromBooking(booking) {
  const guestCount = booking.attendees || 1;
  return Math.round((booking.rental_cost / guestCount) * 100) / 100;
}

export default function BookingForm({
  venue,
  local,
  eventTypes,
  packages,
  promotionalPackages = [],
  promotionalOptionalItems = [],
  decorationColorOptions = [],
  contractExtraTerms = [],
  packageIncludeItems = [],
  selectedDate,
  booking,
  onSubmit,
  loading,
  attachments = [],
  onAttachmentsChange,
  onAttachmentUpload,
  attachmentsReadOnly = false,
  attachmentsUploading = false,
  onEventTypesChange,
}) {
  const isEditing = Boolean(booking?.id);
  const readOnly = isBookingLocked(booking?.status);
  const skipDepositAutoFill = useRef(isEditing);
  const skipPackageAutoFill = useRef(isEditing);
  const prevPackageSelectionRef = useRef('');
  const prevPlateIdRef = useRef('');
  const prevEntradaIdRef = useRef('');
  const prevBebidaIdRef = useRef('');
  const prevPostreIdRef = useRef('');
  const prevHeladoIdRef = useRef('');
  const prevDecorationNameRef = useRef('');
  const [decorationDetail, setDecorationDetail] = useState('');
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [clientDni, setClientDni] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientPhone2, setClientPhone2] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [packageSelection, setPackageSelection] = useState('');
  const [selectedPromoExtraIds, setSelectedPromoExtraIds] = useState([]);
  const [attendees, setAttendees] = useState(50);
  const [plateId, setPlateId] = useState('');
  const [promoPlatoFondoId, setPromoPlatoFondoId] = useState('');
  const [entradaId, setEntradaId] = useState('');
  const [bebidaId, setBebidaId] = useState('');
  const [postreId, setPostreId] = useState('');
  const [heladoId, setHeladoId] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [entradaPrice, setEntradaPrice] = useState('');
  const [bebidaPrice, setBebidaPrice] = useState('');
  const [bebidaDetail, setBebidaDetail] = useState('');
  const [postrePrice, setPostrePrice] = useState('');
  const [heladoPrice, setHeladoPrice] = useState('');
  const [decorationPrice, setDecorationPrice] = useState('');
  const [startTime, setStartTime] = useState(defaultTimes.start);
  const [endTime, setEndTime] = useState(defaultTimes.end);
  const [foodTime, setFoodTime] = useState(defaultTimes.food);
  const [depositAmount, setDepositAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [operationNumber, setOperationNumber] = useState('');
  const [guaranteeAmount, setGuaranteeAmount] = useState('');
  const [decorationColors, setDecorationColors] = useState([]);
  const [colorPickerExpanded, setColorPickerExpanded] = useState(true);
  const [selectedDecorationName, setSelectedDecorationName] = useState('');
  const [notes, setNotes] = useState('');
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState('');
  const [quoting, setQuoting] = useState(false);
  const [documentPreview, setDocumentPreview] = useState(null);
  const [newEventTypeName, setNewEventTypeName] = useState('');
  const [addingEventType, setAddingEventType] = useState(false);
  const [eventTypeError, setEventTypeError] = useState('');
  const [showAddEventType, setShowAddEventType] = useState(false);

  useEffect(() => {
    if (!booking) return;

    setTitle(booking.title || '');
    setEventType(booking.event_type || '');
    setOrganizer(booking.organizer || '');
    setClientDni(booking.client_dni || '');
    setClientPhone(booking.client_phone || '');
    setClientPhone2(booking.client_phone_2 || '');
    setClientEmail(booking.client_email || '');
    if (booking.promotional_package_id) {
      const promo = promotionalPackages.find((item) => item.id === booking.promotional_package_id);
      setPackageSelection(
        promo
          ? `promo:${encodeURIComponent(promo.name)}`
          : `promo:${booking.promotional_package_id}`
      );
      setSelectedPromoExtraIds(
        parsePromotionalExtras(booking.promotional_extras).map((item) => item.id)
      );
    } else {
      setPackageSelection(booking.package_id ? `pkg:${booking.package_id}` : '');
      setSelectedPromoExtraIds([]);
    }
    setAttendees(booking.attendees || 50);
    setPlateId(booking.menu_plate_id ? String(booking.menu_plate_id) : '');
    setPromoPlatoFondoId(
      booking.promotional_plato_fondo_id ? String(booking.promotional_plato_fondo_id) : ''
    );
    if (booking.promotional_package_id && booking.attendees) {
      setUnitPrice(String(deriveUnitPriceFromBooking(booking)));
    } else if (booking.menu_plate_id && booking.attendees) {
      setUnitPrice(String(deriveUnitPriceFromBooking(booking)));
    } else if (booking.package_id) {
      const pkg = packages.find((p) => p.id === booking.package_id);
      if (pkg?.includes_food && booking.attendees) {
        setUnitPrice(String(deriveUnitPriceFromBooking(booking)));
      } else if (pkg && !pkg.includes_food) {
        setUnitPrice(String(booking.rental_cost ?? ''));
      } else {
        setUnitPrice('');
      }
    } else {
      setUnitPrice('');
    }
    prevPlateIdRef.current = booking.menu_plate_id ? String(booking.menu_plate_id) : '';
    setEntradaId(booking.menu_entrada_id ? String(booking.menu_entrada_id) : '');
    setBebidaId(booking.menu_bebida_id ? String(booking.menu_bebida_id) : '');

    const bookingPackage = packages.find((pkg) => pkg.id === booking.package_id);
    const legacyPostrePlate = bookingPackage?.plates?.find(
      (plate) => plate.id === booking.menu_postre_id
    );
    const legacyHeladoInPostre = legacyPostrePlate?.category === 'helado';

    if (booking.menu_helado_id) {
      setHeladoId(String(booking.menu_helado_id));
      setHeladoPrice(String(booking.menu_helado_price ?? ''));
      setPostreId(booking.menu_postre_id ? String(booking.menu_postre_id) : '');
      setPostrePrice(
        booking.menu_postre_id ? String(booking.menu_postre_price ?? '') : ''
      );
    } else if (legacyHeladoInPostre) {
      setHeladoId(String(booking.menu_postre_id));
      setHeladoPrice(String(booking.menu_postre_price ?? ''));
      setPostreId('');
      setPostrePrice('');
    } else {
      setPostreId(booking.menu_postre_id ? String(booking.menu_postre_id) : '');
      setPostrePrice(
        booking.menu_postre_id ? String(booking.menu_postre_price ?? '') : ''
      );
      setHeladoId('');
      setHeladoPrice('');
    }

    setEntradaPrice(
      booking.menu_entrada_id ? String(booking.menu_entrada_price ?? '') : ''
    );
    setBebidaPrice(booking.menu_bebida_id ? String(booking.menu_bebida_price ?? '') : '');
    setBebidaDetail(booking.menu_bebida_detail ?? '');
    prevEntradaIdRef.current = booking.menu_entrada_id ? String(booking.menu_entrada_id) : '';
    prevBebidaIdRef.current = booking.menu_bebida_id ? String(booking.menu_bebida_id) : '';
    prevPostreIdRef.current = booking.menu_postre_id && !legacyHeladoInPostre
      ? String(booking.menu_postre_id)
      : '';
    prevHeladoIdRef.current = booking.menu_helado_id
      ? String(booking.menu_helado_id)
      : legacyHeladoInPostre
        ? String(booking.menu_postre_id)
        : '';
    setStartTime(isoToTimeInput(booking.start_time));
    setEndTime(isoToTimeInput(booking.end_time));
    setFoodTime(booking.food_time || defaultTimes.food);
    setDepositAmount(
      String(Math.max(booking.deposit_amount ?? 0, booking.deposit_paid ?? 0) || '')
    );
    setGuaranteeAmount(
      booking.guarantee_amount ? String(booking.guarantee_amount) : ''
    );
    const savedDecorationColors = parseDecorationColors(booking.decoration_color);
    setDecorationColors(savedDecorationColors);
    setColorPickerExpanded(savedDecorationColors.length === 0);
    const savedDecoration = parseDecorationItems(booking.decoration_items)[0];
    setSelectedDecorationName(savedDecoration?.name ?? '');
    setDecorationDetail(savedDecoration?.detail ?? '');
    setDecorationPrice(savedDecoration?.price != null ? String(savedDecoration.price) : '');
    prevDecorationNameRef.current = savedDecoration?.name ?? '';
    setNotes(booking.notes || '');
    skipDepositAutoFill.current = true;
    skipPackageAutoFill.current = true;
  }, [booking, promotionalPackages, packages]);

  useEffect(() => {
    if (!booking?.promotional_package_id || !promotionalPackages.length || !packageSelection) return;
    const { type, name } = parsePackageSelection(packageSelection);
    if (type !== 'promo' || name) return;
    const promo = promotionalPackages.find((item) => item.id === booking.promotional_package_id);
    if (promo) {
      setPackageSelection(`promo:${encodeURIComponent(promo.name)}`);
    }
  }, [booking, promotionalPackages, packageSelection]);

  const toggleDecorationColor = (value) => {
    setDecorationColors((prev) => {
      const next = prev.includes(value)
        ? prev.filter((color) => color !== value)
        : [...prev, value];
      if (next.length === 0) {
        setColorPickerExpanded(true);
      }
      return next;
    });
  };

  const hasSelectedDecorationColors = decorationColors.length > 0;
  const showColorPicker = !hasSelectedDecorationColors || colorPickerExpanded;

  const { type: packageType, id: selectedPackageId, name: selectedPromoName } =
    parsePackageSelection(packageSelection);
  const isPromoPackage = packageType === 'promo';
  const packageId = packageType === 'pkg' ? String(selectedPackageId ?? '') : '';
  const selectedPackage = packages.find((p) => p.id === selectedPackageId);
  const selectedPromoPackage = promotionalPackages.find(
    (promo) =>
      (selectedPackageId != null && promo.id === selectedPackageId) ||
      (selectedPromoName && promo.name === selectedPromoName)
  );
  const promotionalPackageId = selectedPromoPackage?.id ?? selectedPackageId;
  const promotionalPackageName = selectedPromoPackage?.name ?? selectedPromoName ?? '';
  const activePromotionalPackages = promotionalPackages.filter((promo) => promo.active);
  const activePromotionalOptionalItems = promotionalOptionalItems.filter((item) => item.active);
  const activePromoPlatoFondoOptions =
    selectedPromoPackage?.platoFondoOptions?.filter((item) => item.active !== false) ?? [];
  const selectedPromoPlatoFondo = activePromoPlatoFondoOptions.find(
    (item) => item.id === Number(promoPlatoFondoId)
  );
  const includesFood = Boolean(selectedPackage?.includes_food || isPromoPackage);
  const isSoloLocalPackage = Boolean(selectedPackage && !selectedPackage.includes_food);
  const selectedPackageName = isPromoPackage
    ? selectedPromoPackage?.name ?? selectedPromoName
    : selectedPackage?.name;
  const platosFondo =
    selectedPackage?.plates?.filter((p) => p.category === 'plato_fondo' || !p.category) ?? [];

  const optionalMenuSections = PACKAGE_MENU_SECTIONS.filter(
    (section) => section.category !== 'plato_fondo'
  );
  const optionalNonBebidaSections = optionalMenuSections.filter(
    (section) => !isBebidaCategory(section.category)
  );
  const bebidaMenuSections = BOOKING_BEBIDA_SECTIONS;
  const selectedBebidaPlate =
    selectedPackage?.plates?.find((plate) => plate.id === Number(bebidaId)) ?? null;

  const menuExtraState = {
    entrada: { id: entradaId, setId: setEntradaId, price: entradaPrice, setPrice: setEntradaPrice },
    bebida: { id: bebidaId, setId: setBebidaId, price: bebidaPrice, setPrice: setBebidaPrice },
    postre: { id: postreId, setId: setPostreId, price: postrePrice, setPrice: setPostrePrice },
    helado: { id: heladoId, setId: setHeladoId, price: heladoPrice, setPrice: setHeladoPrice },
  };

  const decoracionPlates = getDecoracionPlates(packages);

  const selectedDecorationId =
    decoracionPlates.find((plate) => plate.name === selectedDecorationName)?.id ?? null;

  const selectedDecorationIds = selectedDecorationId ? [selectedDecorationId] : [];

  useEffect(() => {
    if (!venue?.id || !packageSelection || !attendees) {
      setQuote(null);
      setQuoteError('');
      return;
    }

    if (isPromoPackage) {
      if (!selectedPromoPackage && !selectedPromoName) {
        setQuote(null);
        setQuoteError('');
        return;
      }
      if (activePromoPlatoFondoOptions.length > 0 && !promoPlatoFondoId) {
        setQuote(null);
        setQuoteError('');
        return;
      }
    } else if (selectedPackage?.includes_food && (!plateId || unitPrice === '')) {
      setQuote(null);
      setQuoteError('');
      return;
    } else if (isSoloLocalPackage && unitPrice === '') {
      setQuote(null);
      setQuoteError('');
      return;
    }

    const parsedUnitPrice = isPromoPackage
      ? unitPrice !== ''
        ? Number(unitPrice)
        : Number(selectedPromoPackage?.price ?? 0)
      : includesFood || isSoloLocalPackage
        ? Number(unitPrice)
        : undefined;

    if (
      (includesFood || isSoloLocalPackage) &&
      (parsedUnitPrice == null || Number.isNaN(parsedUnitPrice) || parsedUnitPrice < 0)
    ) {
      setQuote(null);
      setQuoteError('');
      return;
    }

    const timer = setTimeout(async () => {
      setQuoting(true);
      setQuoteError('');
      try {
        const data = await fetchQuote({
          roomId: venue.id,
          packageId: isPromoPackage ? undefined : Number(packageId),
          promotionalPackageId: isPromoPackage ? Number(promotionalPackageId) || undefined : undefined,
          promotionalPackageName: isPromoPackage ? promotionalPackageName : undefined,
          promotionalExtraIds: isPromoPackage ? selectedPromoExtraIds : undefined,
          promotionalPlatoFondoId:
            isPromoPackage && promoPlatoFondoId ? Number(promoPlatoFondoId) : undefined,
          attendees: Number(attendees),
          plateId: isPromoPackage ? undefined : plateId ? Number(plateId) : undefined,
          unitPrice:
            includesFood || isSoloLocalPackage ? parsedUnitPrice : undefined,
          entradaId: isPromoPackage ? undefined : entradaId ? Number(entradaId) : undefined,
          entradaPrice: isPromoPackage ? undefined : entradaId ? Number(entradaPrice) || 0 : undefined,
          bebidaId: isPromoPackage ? undefined : bebidaId ? Number(bebidaId) : undefined,
          bebidaPrice: isPromoPackage ? undefined : bebidaId ? Number(bebidaPrice) || 0 : undefined,
          bebidaDetail:
            isPromoPackage || !bebidaId ? undefined : bebidaDetail.trim() || undefined,
          postreId: isPromoPackage ? undefined : postreId ? Number(postreId) : undefined,
          postrePrice: isPromoPackage ? undefined : postreId ? Number(postrePrice) || 0 : undefined,
          heladoId: isPromoPackage ? undefined : heladoId ? Number(heladoId) : undefined,
          heladoPrice: isPromoPackage ? undefined : heladoId ? Number(heladoPrice) || 0 : undefined,
          decorationIds: isPromoPackage ? undefined : selectedDecorationIds,
          decorationDetail:
            !isPromoPackage && includesFood && selectedDecorationName
              ? decorationDetail.trim()
              : undefined,
          decorationPrice: isPromoPackage
            ? undefined
            : selectedDecorationName
              ? Number(decorationPrice) || 0
              : undefined,
        });
        setQuote(data);
        setQuoteError('');
        if (!skipDepositAutoFill.current && !depositAmount) {
          setDepositAmount(String(data.suggestedDeposit));
        }
      } catch (err) {
        setQuote(null);
        setQuoteError(err.message || 'Error al calcular cotización');
      } finally {
        setQuoting(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [
    venue?.id,
    packageSelection,
    isPromoPackage,
    promotionalPackageName,
    selectedPromoName,
    selectedPromoPackage,
    selectedPromoExtraIds,
    promoPlatoFondoId,
    activePromoPlatoFondoOptions.length,
    attendees,
    plateId,
    unitPrice,
    includesFood,
    isSoloLocalPackage,
    selectedPackage?.includes_food,
    selectedDecorationName,
    decorationDetail,
    entradaId,
    entradaPrice,
    bebidaId,
    bebidaPrice,
    bebidaDetail,
    postreId,
    postrePrice,
    heladoId,
    heladoPrice,
    decorationPrice,
    packageId,
  ]);

  useEffect(() => {
    if (skipPackageAutoFill.current) {
      skipPackageAutoFill.current = false;
      prevPackageSelectionRef.current = packageSelection;
      return;
    }

    if (prevPackageSelectionRef.current === packageSelection) return;
    prevPackageSelectionRef.current = packageSelection;

    if (isPromoPackage) {
      setPlateId('');
      setPromoPlatoFondoId('');
      setEntradaId('');
      setBebidaId('');
      setPostreId('');
      setHeladoId('');
      setEntradaPrice('');
      setBebidaPrice('');
      setBebidaDetail('');
      setPostrePrice('');
      setHeladoPrice('');
      setSelectedDecorationName('');
      setDecorationDetail('');
      setDecorationPrice('');
      prevPlateIdRef.current = '';
      prevEntradaIdRef.current = '';
      prevBebidaIdRef.current = '';
      prevPostreIdRef.current = '';
      prevHeladoIdRef.current = '';
      prevDecorationNameRef.current = '';
      setSelectedPromoExtraIds([]);
      if (selectedPromoPackage) {
        setUnitPrice(String(selectedPromoPackage.price));
      }
      return;
    }

    if (selectedPackage && !selectedPackage.includes_food) {
      setPlateId('');
      setEntradaId('');
      setBebidaId('');
      setPostreId('');
      setHeladoId('');
      setEntradaPrice('');
      setBebidaPrice('');
      setBebidaDetail('');
      setPostrePrice('');
      setHeladoPrice('');
      const defaultRental =
        selectedPackage.rental_price > 0
          ? selectedPackage.rental_price
          : venue?.base_rental_price ?? 0;
      setUnitPrice(String(defaultRental));
      prevPlateIdRef.current = '';
      prevEntradaIdRef.current = '';
      prevBebidaIdRef.current = '';
      prevPostreIdRef.current = '';
      prevHeladoIdRef.current = '';
      setFoodTime('');
    }

    setSelectedPromoExtraIds([]);
  }, [packageSelection, isPromoPackage, selectedPackage, selectedPromoPackage, venue?.base_rental_price]);

  useEffect(() => {
    if (!selectedPackage?.includes_food || !plateId) return;
    if (prevPlateIdRef.current === plateId) return;

    const plate = platosFondo.find((p) => p.id === Number(plateId));
    if (plate) {
      setUnitPrice(String(plate.price_per_plate));
    }
    prevPlateIdRef.current = plateId;
  }, [plateId, selectedPackage?.includes_food, platosFondo]);

  useEffect(() => {
    if (!entradaId) {
      setEntradaPrice('');
      prevEntradaIdRef.current = '';
      return;
    }
    if (prevEntradaIdRef.current === entradaId) return;
    const plate = selectedPackage?.plates?.find((p) => p.id === Number(entradaId));
    if (plate) setEntradaPrice(String(plate.price_per_plate));
    prevEntradaIdRef.current = entradaId;
  }, [entradaId, selectedPackage]);

  useEffect(() => {
    if (!bebidaId) {
      setBebidaPrice('');
      setBebidaDetail('');
      prevBebidaIdRef.current = '';
      return;
    }
    if (prevBebidaIdRef.current === bebidaId) return;
    const plate = selectedPackage?.plates?.find((p) => p.id === Number(bebidaId));
    if (!plate) return;

    if (isBebidaOtrasCategory(plate.category)) {
      setBebidaPrice('');
    } else if (isBebidaPackCategory(plate.category)) {
      setBebidaPrice(String(plate.price_per_plate ?? ''));
      setBebidaDetail('');
    } else {
      setBebidaPrice(String(plate.price_per_plate ?? 0));
      setBebidaDetail('');
    }
    prevBebidaIdRef.current = bebidaId;
  }, [bebidaId, selectedPackage]);

  useEffect(() => {
    if (!postreId) {
      setPostrePrice('');
      prevPostreIdRef.current = '';
      return;
    }
    if (prevPostreIdRef.current === postreId) return;
    const plate = selectedPackage?.plates?.find((p) => p.id === Number(postreId));
    if (plate) setPostrePrice(String(plate.price_per_plate));
    prevPostreIdRef.current = postreId;
  }, [postreId, selectedPackage]);

  useEffect(() => {
    if (!heladoId) {
      setHeladoPrice('');
      prevHeladoIdRef.current = '';
      return;
    }
    if (prevHeladoIdRef.current === heladoId) return;
    const plate = selectedPackage?.plates?.find((p) => p.id === Number(heladoId));
    if (plate) setHeladoPrice(String(plate.price_per_plate));
    prevHeladoIdRef.current = heladoId;
  }, [heladoId, selectedPackage]);

  useEffect(() => {
    if (!selectedDecorationName) {
      setDecorationPrice('');
      setDecorationDetail('');
      prevDecorationNameRef.current = '';
      return;
    }
    if (prevDecorationNameRef.current === selectedDecorationName) return;
    const plate = decoracionPlates.find((p) => p.name === selectedDecorationName);
    if (plate) setDecorationPrice(String(plate.price_per_plate ?? 0));
    setDecorationDetail('');
    prevDecorationNameRef.current = selectedDecorationName;
  }, [selectedDecorationName, decoracionPlates]);

  const foodCost = quote?.foodCost ?? 0;
  const totalCost = quote?.totalCost ?? 0;
  const balance = totalCost - (Number(depositAmount) || 0);
  const selectedPlate = platosFondo.find((p) => p.id === Number(plateId));
  const minDeposit = isEditing ? booking?.deposit_paid ?? 0 : 0;
  const pendingBalance = isEditing
    ? Math.max(totalCost - (booking?.deposit_paid ?? 0), 0)
    : Math.max(balance, 0);
  const packageLineLabel = isPromoPackage
    ? `${selectedPackageName} (${formatCurrency(quote?.packageUnitPrice ?? 0)} × ${attendees} personas)`
    : quote?.pricePerPerson
      ? `${quote.plateDetails?.name ?? selectedPackageName ?? 'Paquete'} (${formatCurrency(quote.packageUnitPrice)} × ${attendees} personas)`
      : `Paquete solo local (${formatCurrency(quote?.packageUnitPrice ?? 0)})`;

  const togglePromoExtra = (itemId) => {
    setSelectedPromoExtraIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const handlePackageSelectionChange = (value) => {
    setPackageSelection(value);
    setQuoteError('');
    const { type, id, name } = parsePackageSelection(value);
    if (type === 'promo') {
      const promo = promotionalPackages.find(
        (item) => (id != null && item.id === id) || (name && item.name === name)
      );
      if (promo) setUnitPrice(String(promo.price));
    }
  };

  const renderCostSummary = () => {
    if (!packageSelection) return null;

    return (
      <div className="cost-summary">
        <h3>Resumen de costos</h3>
        {quoting && <p className="form-hint">Calculando…</p>}
        {quoteError && !quoting && (
          <p className="form-hint form-hint--error">{quoteError}</p>
        )}
        {quote && (
          <>
            <div className="cost-summary__row">
              <span>{packageLineLabel}</span>
              <span>{formatCurrency(quote.baseLocalCost)}</span>
            </div>
            {quote.promotionalExtras?.map((extra) => (
              <div key={extra.id} className="cost-summary__row">
                <span>
                  Adicional: {extra.name} ({formatCurrency(extra.unitPrice ?? extra.price)} ×{' '}
                  {extra.attendees ?? attendees})
                </span>
                <span>{formatCurrency(extra.price)}</span>
              </div>
            ))}
            {quote.extras?.entrada && (
              <div className="cost-summary__row">
                <span>
                  Entrada: {quote.extras.entrada.name} (
                  {formatCurrency(quote.extras.entrada.unitPrice ?? quote.extras.entrada.price)} ×{' '}
                  {quote.extras.entrada.attendees ?? attendees})
                </span>
                <span>{formatCurrency(quote.extras.entrada.price)}</span>
              </div>
            )}
            {quote.extras?.bebida && (
              <div className="cost-summary__row">
                <span>
                  Bebida: {quote.extras.bebida.name}
                  {quote.extras.bebida.detail ? ` — ${quote.extras.bebida.detail}` : ''}
                  {quote.extras.bebida.pricingMode === 'fixed_total' ? (
                    <> ({formatCurrency(quote.extras.bebida.price)})</>
                  ) : quote.extras.bebida.pricingMode === 'included' &&
                    (quote.extras.bebida.unitPrice ?? 0) <= 0 ? (
                    <> (Cortesía)</>
                  ) : (
                    <>
                      {' '}
                      ({formatCurrency(quote.extras.bebida.unitPrice ?? quote.extras.bebida.price)}{' '}
                      × {quote.extras.bebida.attendees ?? attendees})
                    </>
                  )}
                </span>
                <span>{formatCurrency(quote.extras.bebida.price)}</span>
              </div>
            )}
            {quote.extras?.postre && (
              <div className="cost-summary__row">
                <span>
                  Postre: {quote.extras.postre.name} (
                  {formatCurrency(quote.extras.postre.unitPrice ?? quote.extras.postre.price)} ×{' '}
                  {quote.extras.postre.attendees ?? attendees})
                </span>
                <span>{formatCurrency(quote.extras.postre.price)}</span>
              </div>
            )}
            {quote.extras?.helado && (
              <div className="cost-summary__row">
                <span>
                  Helado: {quote.extras.helado.name} (
                  {formatCurrency(quote.extras.helado.unitPrice ?? quote.extras.helado.price)} ×{' '}
                  {quote.extras.helado.attendees ?? attendees})
                </span>
                <span>{formatCurrency(quote.extras.helado.price)}</span>
              </div>
            )}
            {(quote.decorationCost > 0 || selectedDecorationName) && (
              <div className="cost-summary__row">
                <span>
                  Decoración del local
                  {quote.decorationItems?.[0]?.name ? `: ${quote.decorationItems[0].name}` : ''}
                  {quote.decorationItems?.[0]?.detail
                    ? ` — "${quote.decorationItems[0].detail}"`
                    : ''}
                </span>
                <span>{formatCurrency(quote.decorationCost ?? 0)}</span>
              </div>
            )}
            <div className="cost-summary__row cost-summary__row--total">
              <span>Total</span>
              <span>{formatCurrency(totalCost)}</span>
            </div>
          </>
        )}
      </div>
    );
  };

  const handleAddEventType = async () => {
    const name = newEventTypeName.trim();
    if (!name || readOnly) return;

    setAddingEventType(true);
    setEventTypeError('');
    try {
      const created = await createEventType(name);
      setEventType(created.name);
      setNewEventTypeName('');
      setShowAddEventType(false);
      await onEventTypesChange?.();
    } catch (err) {
      setEventTypeError(err.message || 'No se pudo agregar el tipo de evento');
    } finally {
      setAddingEventType(false);
    }
  };

  const handlePrintQuote = () => {
    if (!quote || !venue || !selectedPackageName || !eventType) return;

    try {
      const promoExtras = quote.promotionalExtras ?? [];
      const html = buildContractDocument({
        local,
        title,
        eventType,
        organizer,
        clientDni,
        clientPhone,
        clientPhone2,
        startTime: combineDateAndTime(selectedDate, startTime),
        endTime: combineDateAndTime(selectedDate, endTime),
        foodTime: includesFood ? foodTime : '',
        includesFood,
        isPromotional: isPromoPackage,
        packageType: isPromoPackage ? 'promotional' : includesFood ? 'con_banquete' : 'solo_alquiler',
        roomName: venue.name,
        packageName: selectedPackageName,
        attendees: Number(attendees),
        promotionalDescription: selectedPromoPackage?.description ?? '',
        promotionalIncludes:
          selectedPromoPackage?.includes ?? quote.promotionalIncludes ?? [],
        promotionalExtras: promoExtras,
        menuPlateName: isPromoPackage
          ? selectedPromoPlatoFondo?.name
          : selectedPlate?.name,
        menuPlateDescription: isPromoPackage ? undefined : selectedPlate?.description ?? '',
        platePrice: Number(unitPrice) || quote.packageUnitPrice,
        menuEntradaName: isPromoPackage
          ? undefined
          : selectedPackage?.plates?.find((p) => p.id === Number(entradaId))?.name,
        menuEntradaPrice: isPromoPackage
          ? undefined
          : Number(entradaPrice) || quote.extras?.entrada?.unitPrice || 0,
        menuBebidaName: selectedPackage?.plates?.find((p) => p.id === Number(bebidaId))?.name,
        menuBebidaPrice: Number(bebidaPrice) || quote.extras?.bebida?.unitPrice || 0,
        menuBebidaDetail: bebidaDetail.trim(),
        menuBebidaPricingMode: quote.extras?.bebida?.pricingMode ?? null,
        menuBebidaDescription: selectedPackage?.plates?.find((p) => p.id === Number(bebidaId))
          ?.description,
        menuPostreName: selectedPackage?.plates?.find((p) => p.id === Number(postreId))?.name,
        menuPostrePrice: Number(postrePrice) || quote.extras?.postre?.unitPrice || 0,
        menuHeladoName: selectedPackage?.plates?.find((p) => p.id === Number(heladoId))?.name,
        menuHeladoPrice: Number(heladoPrice) || quote.extras?.helado?.unitPrice || 0,
        packageUnitPrice: quote.packageUnitPrice,
        baseLocalCost: quote.baseLocalCost,
        pricePerPerson: quote.pricePerPerson,
        rentalCost: quote.rentalCost,
        foodCost,
        totalCost,
        depositAmount: Number(depositAmount) || 0,
        balanceDue: Math.max(balance, 0),
        guaranteeAmount: Number(guaranteeAmount) || 0,
        decorationColor: serializeDecorationColors(decorationColors),
        decorationItems: isPromoPackage ? [] : quote.decorationItems ?? [],
        decorationCost: isPromoPackage ? 0 : quote.decorationCost ?? 0,
        notes,
        extrasTerms: contractExtraTerms,
        packageIncludeItems,
      });

      previewDocument(html, `Contrato — ${eventType}`, setDocumentPreview);
    } catch (err) {
      console.error(err);
      alert('No se pudo generar la vista previa del contrato.');
    }
  };

  const canPrintContract =
    isEditing &&
    quote &&
    venue &&
    selectedPackageName &&
    organizer.trim() &&
    eventType;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (readOnly || !venue?.id || !packageSelection) return;

    const deposit = Number(depositAmount) || 0;
    if (!isEditing && deposit > 0 && paymentMethod !== 'efectivo' && !operationNumber.trim()) {
      return;
    }

    await onSubmit({
      roomId: venue.id,
      packageId: isPromoPackage ? undefined : Number(packageId),
      promotionalPackageId: isPromoPackage ? Number(promotionalPackageId) || undefined : undefined,
      promotionalPackageName: isPromoPackage ? promotionalPackageName : undefined,
      promotionalExtraIds: isPromoPackage ? selectedPromoExtraIds : undefined,
      promotionalPlatoFondoId:
        isPromoPackage && promoPlatoFondoId ? Number(promoPlatoFondoId) : undefined,
      title: title.trim() || eventType,
      eventType,
      organizer,
      clientDni,
      clientPhone,
      clientPhone2,
      clientEmail,
      attendees: Number(attendees),
      startTime: combineDateAndTime(selectedDate, startTime),
      endTime: combineDateAndTime(selectedDate, endTime),
      foodTime: includesFood ? foodTime : '',
      depositAmount: Number(depositAmount),
      paymentMethod: isEditing ? undefined : paymentMethod,
      operationNumber: isEditing ? undefined : operationNumber.trim(),
      guaranteeAmount: Number(guaranteeAmount) || 0,
      decorationColors: serializeDecorationColors(decorationColors),
      discountPercent: 0,
      incrementPercent: 0,
      plateId: isPromoPackage ? undefined : plateId ? Number(plateId) : undefined,
      entradaId: isPromoPackage ? undefined : entradaId ? Number(entradaId) : undefined,
      entradaPrice: isPromoPackage ? undefined : entradaId ? Number(entradaPrice) || 0 : undefined,
      bebidaId: isPromoPackage ? undefined : bebidaId ? Number(bebidaId) : undefined,
      bebidaPrice: isPromoPackage ? undefined : bebidaId ? Number(bebidaPrice) || 0 : undefined,
      bebidaDetail:
        isPromoPackage || !bebidaId ? undefined : bebidaDetail.trim() || undefined,
      postreId: isPromoPackage ? undefined : postreId ? Number(postreId) : undefined,
      postrePrice: isPromoPackage ? undefined : postreId ? Number(postrePrice) || 0 : undefined,
      heladoId: isPromoPackage ? undefined : heladoId ? Number(heladoId) : undefined,
      heladoPrice: isPromoPackage ? undefined : heladoId ? Number(heladoPrice) || 0 : undefined,
      decorationIds: isPromoPackage ? undefined : selectedDecorationIds,
      decorationDetail:
        !isPromoPackage && includesFood && selectedDecorationName
          ? decorationDetail.trim()
          : undefined,
      decorationPrice: isPromoPackage
        ? undefined
        : selectedDecorationName
          ? Number(decorationPrice) || 0
          : undefined,
      unitPrice: unitPrice !== '' ? Number(unitPrice) : undefined,
      notes,
    });

    if (isEditing) return;

    setTitle('');
    setEventType('');
    setOrganizer('');
    setClientDni('');
    setClientPhone('');
    setClientPhone2('');
    setClientEmail('');
    setPackageSelection('');
    setSelectedPromoExtraIds([]);
    setAttendees(50);
    setPlateId('');
    setPromoPlatoFondoId('');
    setEntradaId('');
    setBebidaId('');
    setPostreId('');
    setHeladoId('');
    setEntradaPrice('');
    setBebidaPrice('');
    setBebidaDetail('');
    setPostrePrice('');
    setHeladoPrice('');
    setUnitPrice('');
    prevPlateIdRef.current = '';
    prevEntradaIdRef.current = '';
    prevBebidaIdRef.current = '';
    prevPostreIdRef.current = '';
    prevHeladoIdRef.current = '';
    setDepositAmount('');
    setPaymentMethod('efectivo');
    setOperationNumber('');
    setGuaranteeAmount('');
    setDecorationColors([]);
    setColorPickerExpanded(true);
    setSelectedDecorationName('');
    setDecorationDetail('');
    setDecorationPrice('');
    prevDecorationNameRef.current = '';
    setNotes('');
    setStartTime(defaultTimes.start);
    setEndTime(defaultTimes.end);
    setFoodTime(defaultTimes.food);
    setQuote(null);
    setQuoteError('');
  };

  if (!venue) {
    return (
      <section className="panel">
        <p className="form-hint">Cargando local…</p>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="panel__header">
        <h2>{isEditing ? 'Editar reserva' : 'Nueva reserva'}</h2>
        {isEditing && (
          <p className="panel__subtitle">
            Reserva #{booking.id} · Pagado: {formatCurrency(booking.deposit_paid)}
          </p>
        )}
        {readOnly && (
          <p className="panel__subtitle panel__subtitle--locked">
            Reserva atendida — solo lectura
          </p>
        )}
      </div>

      <form className="booking-form" onSubmit={handleSubmit}>
        <fieldset disabled={readOnly} className="booking-form__fields">
        <div className="event-type-field">
          <span className="event-type-field__label">Tipo de evento</span>
          <div className="event-type-field__row">
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              required
            >
              <option value="">Selecciona el tipo de evento</option>
              {eventTypes.map((type) => (
                <option key={type.id} value={type.name}>
                  {type.name}
                </option>
              ))}
            </select>
            {!readOnly && (
              <button
                type="button"
                className="btn btn--ghost btn--sm event-type-field__toggle"
                onClick={() => {
                  setShowAddEventType((prev) => !prev);
                  setEventTypeError('');
                }}
                aria-expanded={showAddEventType}
                title="Agregar tipo de evento"
              >
                {showAddEventType ? 'Cerrar' : '+ Nuevo'}
              </button>
            )}
          </div>
          {showAddEventType && !readOnly && (
            <div className="event-type-field__add">
              <input
                type="text"
                value={newEventTypeName}
                onChange={(e) => setNewEventTypeName(e.target.value)}
                placeholder="Nombre del nuevo tipo"
                maxLength={80}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddEventType();
                  }
                }}
              />
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={handleAddEventType}
                disabled={!newEventTypeName.trim() || addingEventType}
              >
                {addingEventType ? 'Agregando…' : 'Agregar'}
              </button>
            </div>
          )}
          {eventTypeError && <p className="form-hint form-hint--error">{eventTypeError}</p>}
        </div>

        <label>
          Nombre / referencia del evento
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Boda García-López (opcional)"
          />
        </label>

        <label>
          Cliente / organizador
          <input
            type="text"
            value={organizer}
            onChange={(e) => setOrganizer(e.target.value)}
            placeholder="Nombre del cliente"
            required
          />
        </label>

        <div className="booking-form__row booking-form__row--contact">
          <label>
            DNI del cliente
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={clientDni}
              onChange={(e) => setClientDni(keepDigits(e.target.value))}
              placeholder="Documento de identidad"
            />
          </label>
          <label>
            Teléfono
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={clientPhone}
              onChange={(e) => setClientPhone(keepDigits(e.target.value))}
              placeholder="943491997"
            />
          </label>
          <label>
            Teléfono 2 <span className="form-hint form-hint--inline">(opcional)</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={clientPhone2}
              onChange={(e) => setClientPhone2(keepDigits(e.target.value))}
              placeholder="Opcional"
            />
          </label>
        </div>

        <label>
          Correo
          <input
            type="email"
            value={clientEmail}
            onChange={(e) => setClientEmail(e.target.value)}
            placeholder="cliente@email.com"
          />
        </label>

        <label>
          Paquete Los Jazmines
          <select
            value={packageSelection}
            onChange={(e) => handlePackageSelectionChange(e.target.value)}
            required
          >
            <option value="">Selecciona un paquete</option>
            <optgroup label="Paquetes regulares">
              {packages.map((pkg) => (
                <option key={`pkg-${pkg.id}`} value={`pkg:${pkg.id}`}>
                  {pkg.name}
                  {pkg.type === 'solo_alquiler' ? ' (solo local)' : ' (con banquete)'}
                </option>
              ))}
            </optgroup>
            {activePromotionalPackages.length > 0 && (
              <optgroup label="Paquetes promocionales 2026">
                {activePromotionalPackages.map((promo) => (
                  <option key={`promo-${promo.id}`} value={`promo:${encodeURIComponent(promo.name)}`}>
                    {promo.name} — {formatCurrency(promo.price)}/persona
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>

        {selectedPackage && (
          <p className="form-hint">{selectedPackage.description}</p>
        )}

        {isPromoPackage && selectedPromoPackage && (
          <>
            {selectedPromoPackage.description && (
              <p className="form-hint">{selectedPromoPackage.description}</p>
            )}
            {selectedPromoPackage.includes?.length > 0 && (
              <div className="booking-promo-includes">
                <h4 className="booking-promo-includes__title">Incluye</h4>
                <ul className="booking-promo-includes__list">
                  {selectedPromoPackage.includes.map((item) => (
                    <li
                      key={item}
                      className={
                        isPlatoFondoIncludeText(item)
                          ? 'booking-promo-includes__item--plato-fondo'
                          : undefined
                      }
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {activePromoPlatoFondoOptions.length > 0 && (
              <div className="booking-field--plato-fondo">
                <label>
                  <span className="item-badge item-badge--plato-fondo">Plato de fondo a elección</span>
                  <select
                    value={promoPlatoFondoId}
                    onChange={(e) => setPromoPlatoFondoId(e.target.value)}
                    required
                  >
                    <option value="">Selecciona el plato de fondo</option>
                    {activePromoPlatoFondoOptions.map((plate, index) => (
                      <option key={plate.id} value={plate.id}>
                        {String.fromCharCode(97 + index)}) {plate.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </>
        )}

        <label>
          Cantidad de asistentes
          <input
            type="number"
            min="1"
            max={venue.capacity}
            value={attendees}
            onChange={(e) => setAttendees(e.target.value)}
            required
          />
        </label>

        {isPromoPackage && selectedPromoPackage && (
          <>
            <label>
              Costo por persona (S/.)
              <input
                type="number"
                min="0"
                step="0.01"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                required
              />
              <span className="form-hint form-hint--inline">
                Total paquete promocional:{' '}
                {formatCurrency((Number(unitPrice) || 0) * Number(attendees))} ({attendees}{' '}
                asistentes)
              </span>
            </label>

            {activePromotionalOptionalItems.length > 0 && (
              <div className="booking-promo-extras">
                <span className="decoration-field__label">
                  Entradas, sopas y postres adicionales
                </span>
                <div className="booking-promo-extras__options">
                  {activePromotionalOptionalItems.map((item) => (
                    <label key={item.id} className="decoration-option">
                      <input
                        type="checkbox"
                        checked={selectedPromoExtraIds.includes(item.id)}
                        onChange={() => togglePromoExtra(item.id)}
                      />
                      <span>
                        {item.name} — {formatCurrency(item.price)}/persona
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {!isPromoPackage && isSoloLocalPackage && (
          <label>
            Costo de alquiler del local (S/.)
            <input
              type="number"
              min="0"
              step="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              required
            />
            <span className="form-hint form-hint--inline">
              Valor base del paquete solo local. Puedes ajustarlo para esta reserva.
            </span>
          </label>
        )}

        {!isPromoPackage && selectedPackage?.includes_food && platosFondo.length > 0 && (
          <div className="booking-form__menu-block">
            <div className="booking-field--plato-fondo">
              <label>
                <span className="item-badge item-badge--plato-fondo">Plato de fondo</span>
                <select value={plateId} onChange={(e) => setPlateId(e.target.value)} required>
                  <option value="">Selecciona el plato de fondo</option>
                  {platosFondo.map((plate) => (
                    <option key={plate.id} value={plate.id}>
                      {plate.name} — {formatCurrency(plate.price_per_plate)}/persona
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="booking-form__menu-row">
              <div className="booking-form__menu-row-main">
                <span className="booking-form__menu-row-label">Costo del plato de fondo</span>
                <span className="form-hint form-hint--inline">
                  Total paquete: {formatCurrency((Number(unitPrice) || 0) * Number(attendees))} (
                  {attendees} asistentes)
                </span>
              </div>
              <label className="booking-form__menu-row-price">
                Costo por persona (S/.)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  required
                />
              </label>
            </div>

            {optionalNonBebidaSections.map((section) => {
              const options =
                selectedPackage?.plates?.filter(
                  (plate) => plate.category === section.category
                ) ?? [];

              if (!options.length) return null;

              const extraKey = getBookingExtraKey(section.category);
              const extraState = extraKey ? menuExtraState[extraKey] : null;
              if (!extraState) return null;

              const { id: value, setId: onChange, price: priceValue, setPrice: onPriceChange } =
                extraState;

              return (
                <div
                  key={section.category}
                  className={`booking-form__menu-row${value ? '' : ' booking-form__menu-row--single'}`}
                >
                  <label className="booking-form__menu-row-main">
                    <span className="booking-form__menu-row-label">{section.label}</span>
                    <select value={value} onChange={(e) => onChange(e.target.value)}>
                      <option value="">Sin selección</option>
                      {options.map((plate) => (
                        <option key={plate.id} value={plate.id}>
                          {formatPlateOptionLabel(plate)}
                        </option>
                      ))}
                    </select>
                    {value ? (
                      <span className="form-hint form-hint--inline">
                        Total {section.label.toLowerCase()}:{' '}
                        {formatCurrency((Number(priceValue) || 0) * Number(attendees))} (
                        {attendees} asistentes)
                      </span>
                    ) : null}
                  </label>
                  {value ? (
                    <label className="booking-form__menu-row-price">
                      Costo por persona (S/.)
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={priceValue}
                        onChange={(e) => onPriceChange(e.target.value)}
                      />
                    </label>
                  ) : null}
                </div>
              );
            })}

            {bebidaMenuSections.some(
              (section) =>
                selectedPackage?.plates?.some((plate) => plate.category === section.category)
            ) && (
              <div className="booking-form__menu-group">
                <span className="booking-form__menu-group-label">{BEBIDA_MANAGER_GROUP.label}</span>

                {bebidaMenuSections.map((section) => {
                  const options =
                    selectedPackage?.plates?.filter(
                      (plate) => plate.category === section.category
                    ) ?? [];

                  if (!options.length) return null;

                  const value =
                    selectedBebidaPlate?.category === section.category ? bebidaId : '';

                  return (
                    <div
                      key={section.category}
                      className={`booking-form__menu-row${
                        value ? '' : ' booking-form__menu-row--single'
                      } booking-form__menu-row--nested`}
                    >
                      <label className="booking-form__menu-row-main">
                        <span className="booking-form__menu-row-label">{section.label}</span>
                        <select
                          value={value}
                          onChange={(e) => {
                            setBebidaId(e.target.value);
                            if (!e.target.value) {
                              setBebidaDetail('');
                              setBebidaPrice('');
                            }
                          }}
                        >
                          <option value="">Sin selección</option>
                          {options.map((plate) => (
                            <option key={plate.id} value={plate.id}>
                              {formatPlateOptionLabel(plate)}
                            </option>
                          ))}
                        </select>
                        {value && isBebidaPackCategory(section.category) ? (
                          <span className="form-hint form-hint--inline">
                            Total pack:{' '}
                            {formatCurrency((Number(bebidaPrice) || 0) * Number(attendees))} (
                            {attendees} asistentes)
                          </span>
                        ) : null}
                      </label>
                      {value && isBebidaPackCategory(section.category) ? (
                        <label className="booking-form__menu-row-price">
                          Costo por persona (S/.)
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={bebidaPrice}
                            onChange={(e) => setBebidaPrice(e.target.value)}
                          />
                        </label>
                      ) : null}
                    </div>
                  );
                })}

                {selectedBebidaPlate && isBebidaOtrasCategory(selectedBebidaPlate.category) && (
                  <div className="booking-form__menu-group-extra">
                    <label className="decoration-detail-field">
                      Detalle de la bebida
                      <textarea
                        rows={2}
                        value={bebidaDetail}
                        onChange={(e) => setBebidaDetail(e.target.value)}
                        placeholder="Ej.: 3 cajas Pilsen × S/. 98, 2 corchos"
                        disabled={readOnly}
                      />
                    </label>
                    <label className="booking-form__menu-row-price">
                      Importe total (S/.)
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={bebidaPrice}
                        onChange={(e) => setBebidaPrice(e.target.value)}
                        disabled={readOnly}
                      />
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div
          className={`booking-form__row booking-form__row--times${
            includesFood ? '' : ' booking-form__row--times-duo'
          }`}
        >
          <label>
            Hora inicio
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </label>
          <label>
            Hora fin
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </label>
          {includesFood && (
            <label>
              Hora de la comida
              <input
                type="time"
                value={foodTime}
                onChange={(e) => setFoodTime(e.target.value)}
              />
            </label>
          )}
        </div>

        <div className="decoration-field decoration-field--compact">
          <span className="decoration-field__label">Color de decoración del local</span>

          <div
            className={`decoration-colors-panel${
              hasSelectedDecorationColors && !showColorPicker
                ? ' decoration-colors-panel--confirmed'
                : ''
            }`}
          >
            <div className="decoration-colors-panel__fan">
              <DecorationColorFan
                colors={decorationColors}
                catalog={decorationColorOptions}
              />
            </div>

            {showColorPicker ? (
              <>
                <ul className="decoration-color-chips" aria-label="Colores disponibles">
                  {decorationColorOptions.map((color) => {
                    const selected = decorationColors.includes(color.value);
                    return (
                      <li key={color.value}>
                        <label
                          className={`decoration-color-chip${
                            selected ? ' decoration-color-chip--selected' : ''
                          }`}
                          title={color.label}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleDecorationColor(color.value)}
                            disabled={readOnly}
                          />
                          <span
                            className="decoration-color-chip__swatch"
                            style={{ backgroundColor: color.hex }}
                            aria-hidden="true"
                          />
                          <span className="decoration-color-chip__label">{color.label}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
                {hasSelectedDecorationColors && !readOnly && (
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm decoration-colors-panel__confirm"
                    onClick={() => setColorPickerExpanded(false)}
                  >
                    Confirmar selección ({decorationColors.length})
                  </button>
                )}
              </>
            ) : (
              !readOnly && (
                <button
                  type="button"
                  className="btn btn--ghost btn--sm decoration-colors-panel__change"
                  onClick={() => setColorPickerExpanded(true)}
                >
                  Cambiar colores
                </button>
              )
            )}
          </div>

          {packageSelection && !isPromoPackage && decoracionPlates.length > 0 && (
            <div className="decoration-field__package">
              <span className="decoration-field__label">Decoración del local</span>
              <div className="decoration-options decoration-options--packages">
                {decoracionPlates.map((plate) => (
                  <label key={plate.id} className="decoration-option decoration-option--package">
                    <input
                      type="radio"
                      name="decoration-package"
                      checked={selectedDecorationName === plate.name}
                      onChange={() => setSelectedDecorationName(plate.name)}
                    />
                    <span className="decoration-option__package-name">{plate.name}</span>
                    {plate.price_per_plate > 0 && (
                      <span className="decoration-option__package-price">
                        {formatCurrency(plate.price_per_plate)}
                      </span>
                    )}
                  </label>
                ))}
              </div>
              {selectedDecorationName && (
                <>
                  {includesFood && (
                    <label className="decoration-detail-field">
                      {selectedDecorationName}
                      <textarea
                        rows={2}
                        value={decorationDetail}
                        onChange={(e) => setDecorationDetail(e.target.value)}
                        placeholder="Detalle de la decoración elegida"
                        disabled={readOnly}
                      />
                    </label>
                  )}
                  <label className="decoration-price-field">
                  Costo decoración (S/.)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={decorationPrice}
                    onChange={(e) => setDecorationPrice(e.target.value)}
                  />
                  </label>
                </>
              )}
            </div>
          )}
        </div>

        <BookingAttachments
          attachments={attachments}
          onChange={onAttachmentsChange}
          onUpload={onAttachmentUpload}
          readOnly={attachmentsReadOnly || readOnly}
          uploading={attachmentsUploading}
        />

        <div className="booking-form__row">
          <label>
            Adelanto
            <input
              type="number"
              min={minDeposit}
              step="0.01"
              max={totalCost || undefined}
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              required
            />
            {isEditing && minDeposit > 0 && (
              <span className="form-hint form-hint--inline">
                Mínimo S/. {minDeposit.toFixed(2)} (ya pagado) · máximo S/.{' '}
                {(totalCost || 0).toFixed(2)}
              </span>
            )}
          </label>
          {!isEditing && (
            <label>
              Medio de pago
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {!isEditing && (
            <label>
              Nro. de operación
              <input
                value={operationNumber}
                onChange={(e) => setOperationNumber(e.target.value)}
                required={(Number(depositAmount) || 0) > 0 && paymentMethod !== 'efectivo'}
                placeholder={
                  paymentMethod !== 'efectivo' ? 'Obligatorio' : 'Opcional en efectivo'
                }
              />
            </label>
          )}
          <label>
            Garantía
            <input
              type="number"
              min="0"
              step="0.01"
              value={guaranteeAmount}
              onChange={(e) => setGuaranteeAmount(e.target.value)}
              placeholder="Monto de garantía"
            />
          </label>
        </div>

        {totalCost > 0 && (
          <p className="form-hint">
            {isEditing ? (
              <>
                Total pagado: <strong>{formatCurrency(booking.deposit_paid)}</strong> · Saldo
                pendiente:{' '}
                <strong>{formatCurrency(pendingBalance)}</strong>
              </>
            ) : (
              <>
                Saldo pendiente: <strong>{formatCurrency(Math.max(balance, 0))}</strong>
              </>
            )}
          </p>
        )}

        <label>
          Notas
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Requerimientos especiales"
            rows={2}
          />
        </label>

        {renderCostSummary()}

        </fieldset>

        {!readOnly && (
        <div className="form-actions">
          {isEditing && (
            <button
              type="button"
              className="btn btn--secondary"
              onClick={handlePrintQuote}
              disabled={!canPrintContract || quoting}
            >
              Contrato
            </button>
          )}
          <button type="submit" className="btn btn--primary" disabled={loading || quoting}>
            {loading
              ? isEditing
                ? 'Guardando…'
                : 'Reservando…'
              : isEditing
                ? 'Guardar cambios'
                : 'Confirmar reserva'}
          </button>
        </div>
        )}
      </form>

      {documentPreview && (
        <DocumentPreview
          html={documentPreview.html}
          title={documentPreview.title}
          onClose={() => setDocumentPreview(null)}
        />
      )}
    </section>
  );
}
