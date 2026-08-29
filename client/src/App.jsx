import { useCallback, useEffect, useState } from 'react';

import {
  createBooking,
  deleteBooking,
  deleteBookingAttachment,
  fetchBooking,
  fetchBookings,
  fetchEventTypes,
  fetchPackages,
  fetchPromotionalPackages,
  fetchPromotionalOptionalItems,
  fetchDecorationColors,
  fetchDecorationThemeOptions,
  fetchContractExtraTerms,
  fetchProjections,
  fetchSeasons,
  fetchVenue,
  isoToDateInput,
  toDateInputValue,
  updateBooking,
  updateBookingStatus,
  uploadBookingAttachment,
} from './api';

import { BOOKING_STATUSES, isBookingLocked } from './constants/bookingStatus';
import { buildDecorationColorCatalog } from './constants/decorationColors';
import {
  parseBookingAttachments,
  readFileAsBase64,
  revokeAllAttachmentPreviews,
} from './utils/fileAttachments';

import { useAuth } from './context/AuthContext';

import AvailabilityCalendar from './components/bookings/AvailabilityCalendar';
import BookingForm from './components/bookings/BookingForm';
import BookingList from './components/bookings/BookingList';

import Header from './components/layout/Header';

import LoginPage from './components/auth/LoginPage';
import CompaniesPanel from './components/admin/CompaniesPanel';
import UsersPanel from './components/admin/UsersPanel';
import LocalsPanel from './components/admin/LocalsPanel';

import PackageManager from './components/packages/PackageManager';
import PromotionalPackagesManager from './components/packages/PromotionalPackagesManager';
import UtilitiesPanel from './components/utilities/UtilitiesPanel';

import Projections from './components/reports/Projections';
import Reports from './components/reports/Reports';

import { FAB, Navigation, Progress, Snackbar } from './design-system';

const BASE_TABS = [
  { id: 'reservas', label: 'Reservas' },
  { id: 'reportes', label: 'Reportes' },
  { id: 'paquetes', label: 'Paquetes' },
  { id: 'paquetes-promo', label: 'Paquetes Promocionales' },
  { id: 'utilitarios', label: 'Utilitarios' },
  { id: 'proyecciones', label: 'Proyecciones' },
];

const ADMIN_TABS = [
  { id: 'locales', label: 'Locales' },
  { id: 'usuarios', label: 'Usuarios' },
];

const SELF_MANAGED_TABS = ['locales', 'usuarios'];

export default function App() {
  const { user, loading, isSuperadmin, localId } = useAuth();

  if (loading) {
    return <Progress label="Cargando sesión" />;
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <>
      <a className="skip-link" href="#contenido-principal">
        Saltar al contenido
      </a>
      <Header />

      <div className="app" id="contenido-principal">
        {isSuperadmin ? <CompaniesPanel /> : <Workspace key={localId} />}
      </div>
    </>
  );
}

function Workspace() {
  const { isAdmin, activeLocal } = useAuth();
  const tabs = isAdmin ? [...BASE_TABS, ...ADMIN_TABS] : BASE_TABS;

  const [activeTab, setActiveTab] = useState('reservas');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);

  const [statusFilter, setStatusFilter] = useState('');
  const [calendarDateFilter, setCalendarDateFilter] = useState('');

  const [reportStatusFilter, setReportStatusFilter] = useState('');
  const [reportDateFrom, setReportDateFrom] = useState('');
  const [reportDateTo, setReportDateTo] = useState('');

  const [venue, setVenue] = useState(null);
  const [eventTypes, setEventTypes] = useState([]);
  const [packages, setPackages] = useState([]);
  const [promotionalPackages, setPromotionalPackages] = useState([]);
  const [promotionalOptionalItems, setPromotionalOptionalItems] = useState([]);
  const [decorationColorCatalog, setDecorationColorCatalog] = useState([]);
  const [decorationThemeOptions, setDecorationThemeOptions] = useState([]);
  const [contractExtraTerms, setContractExtraTerms] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [reportBookings, setReportBookings] = useState([]);
  const [projections, setProjections] = useState(null);
  const [projectionYear, setProjectionYear] = useState(new Date().getFullYear());

  const [calendarRefreshKey, setCalendarRefreshKey] = useState(0);
  const [formDate, setFormDate] = useState(toDateInputValue());
  const [formAttachments, setFormAttachments] = useState([]);
  const [attachmentsUploading, setAttachmentsUploading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const loadBookingsData = useCallback(async () => {
    const [
      venueData,
      typesData,
      packagesData,
      seasonsData,
      promoPackagesData,
      promoOptionalData,
      decorationColorsData,
      decorationThemesData,
      contractExtraTermsData,
      bookingsData,
    ] = await Promise.all([
      fetchVenue(),
      fetchEventTypes(),
      fetchPackages(),
      fetchSeasons(),
      fetchPromotionalPackages(),
      fetchPromotionalOptionalItems(),
      fetchDecorationColors(),
      fetchDecorationThemeOptions().catch(() => []),
      fetchContractExtraTerms().catch(() => []),
      fetchBookings({
        status: statusFilter || undefined,
        date: calendarDateFilter || undefined,
        includePayments: true,
      }),
    ]);

    setVenue(venueData);
    setEventTypes(typesData);
    setPackages(packagesData);
    setSeasons(seasonsData);
    setPromotionalPackages(promoPackagesData);
    setPromotionalOptionalItems(promoOptionalData);
    setDecorationColorCatalog(buildDecorationColorCatalog(decorationColorsData));
    setDecorationThemeOptions(decorationThemesData);
    setContractExtraTerms(contractExtraTermsData);
    setBookings(bookingsData);
    setCalendarRefreshKey((key) => key + 1);
  }, [statusFilter, calendarDateFilter]);

  const reloadEventTypes = useCallback(async () => {
    const typesData = await fetchEventTypes();
    setEventTypes(typesData);
    return typesData;
  }, []);

  const loadReportBookings = useCallback(async () => {
    if (reportDateFrom && reportDateTo && reportDateFrom > reportDateTo) {
      throw new Error('La fecha «desde» no puede ser posterior a la fecha «hasta».');
    }

    const data = await fetchBookings({
      status: reportStatusFilter || undefined,
      dateFrom: reportDateFrom || undefined,
      dateTo: reportDateTo || undefined,
    });
    setReportBookings(data);
  }, [reportStatusFilter, reportDateFrom, reportDateTo]);

  const loadProjections = useCallback(async () => {
    setProjections(await fetchProjections(projectionYear));
  }, [projectionYear]);

  const loadPromotionalCatalog = useCallback(async () => {
    const [promoPackages, optionalItems] = await Promise.all([
      fetchPromotionalPackages(),
      fetchPromotionalOptionalItems(),
    ]);
    setPromotionalPackages(promoPackages);
    setPromotionalOptionalItems(optionalItems);
  }, []);

  const loadPromotionalPackages = useCallback(async () => {
    setPromotionalPackages(await fetchPromotionalPackages());
  }, []);

  const loadPromotionalOptionalItems = useCallback(async () => {
    setPromotionalOptionalItems(await fetchPromotionalOptionalItems());
  }, []);

  const loadDecorationColors = useCallback(async () => {
    const rows = await fetchDecorationColors();
    setDecorationColorCatalog(buildDecorationColorCatalog(rows));
  }, []);

  const loadDecorationThemeOptions = useCallback(async () => {
    setDecorationThemeOptions(await fetchDecorationThemeOptions());
  }, []);

  const loadContractExtraTerms = useCallback(async () => {
    setContractExtraTerms(await fetchContractExtraTerms());
  }, []);

  const loadPromotionalData = useCallback(async () => {
    await loadPromotionalCatalog();
  }, [loadPromotionalCatalog]);

  const loadData = useCallback(async () => {
    if (SELF_MANAGED_TABS.includes(activeTab)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (activeTab === 'proyecciones') {
        await loadProjections();
      } else if (activeTab === 'reportes') {
        const [venueData, packagesData, termsData] = await Promise.all([
          fetchVenue(),
          fetchPackages(),
          fetchContractExtraTerms().catch(() => []),
        ]);

        setVenue(venueData);
        setPackages(packagesData);
        setContractExtraTerms(termsData);

        await loadReportBookings();
      } else if (activeTab === 'paquetes-promo') {
        await loadPromotionalData();
      } else if (activeTab === 'utilitarios') {
        await Promise.all([loadDecorationColors(), loadContractExtraTerms()]);
      } else if (activeTab === 'paquetes') {
        const [packagesData, seasonsData, themesData] = await Promise.all([
          fetchPackages(),
          fetchSeasons(),
          fetchDecorationThemeOptions().catch(() => []),
        ]);

        setPackages(packagesData);
        setSeasons(seasonsData);
        setDecorationThemeOptions(themesData);
      } else {
        await loadBookingsData();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [
    activeTab,
    loadBookingsData,
    loadProjections,
    loadPromotionalData,
    loadDecorationColors,
    loadContractExtraTerms,
    loadReportBookings,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const closeFormView = () => {
    revokeAllAttachmentPreviews(formAttachments);
    setShowNewBooking(false);
    setEditingBooking(null);
    setFormAttachments([]);
  };

  const syncPendingAttachments = async (bookingId, attachments) => {
    const pending = attachments.filter((item) => item.pending && item.file);
    if (!pending.length) return attachments.filter((item) => !item.pending);

    const uploaded = [];
    for (const item of pending) {
      const dataBase64 = await readFileAsBase64(item.file);
      const saved = await uploadBookingAttachment(bookingId, {
        name: item.name,
        mimeType: item.mimeType,
        dataBase64,
      });
      uploaded.push(saved);
      revokeAllAttachmentPreviews([item]);
    }

    return [...attachments.filter((item) => !item.pending), ...uploaded];
  };

  const handleAttachmentsChange = async (nextAttachments) => {
    if (!editingBooking?.id) {
      setFormAttachments(nextAttachments);
      return;
    }

    const removed = formAttachments.filter(
      (item) => !item.pending && !nextAttachments.some((next) => next.id === item.id)
    );

    try {
      for (const item of removed) {
        await deleteBookingAttachment(editingBooking.id, item.id);
      }
      setFormAttachments(nextAttachments);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAttachmentUpload = async (file) => {
    if (!editingBooking?.id) return;

    setAttachmentsUploading(true);
    setError(null);

    try {
      const dataBase64 = await readFileAsBase64(file);
      const saved = await uploadBookingAttachment(editingBooking.id, {
        name: file.name,
        mimeType: file.type,
        dataBase64,
      });
      setFormAttachments((prev) => [...prev, saved]);
    } catch (err) {
      setError(err.message);
    } finally {
      setAttachmentsUploading(false);
    }
  };

  const handleCreateBooking = async (payload) => {
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const created = await createBooking(payload);
      await syncPendingAttachments(created.id, formAttachments);
      setMessage('Reserva registrada correctamente.');
      closeFormView();
      await loadBookingsData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateBooking = async (payload) => {
    if (!editingBooking?.id) return;

    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      await updateBooking(editingBooking.id, payload);
      await syncPendingAttachments(editingBooking.id, formAttachments);
      setMessage('Reserva actualizada correctamente.');
      await loadBookingsData();
      closeFormView();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOccupiedCalendarClick = async (eventOrEvents, dateKey) => {
    const events = Array.isArray(eventOrEvents) ? eventOrEvents : [eventOrEvents];
    if (!events.length) return;

    if (dateKey) setCalendarDateFilter(dateKey);
    await handleEditBooking({ id: events[0].id, status: events[0].status });
  };

  const handleEditBooking = async (booking) => {
    setMessage(null);
    setError(null);

    if (isBookingLocked(booking.status)) {
      setError('Esta reserva ya fue atendida y no puede editarse.');
      return;
    }

    try {
      const detail = await fetchBooking(booking.id);

      if (isBookingLocked(detail.status)) {
        setError('Esta reserva ya fue atendida y no puede editarse.');
        return;
      }

      revokeAllAttachmentPreviews(formAttachments);
      setEditingBooking(detail);
      setFormAttachments(parseBookingAttachments(detail.attachments));
      setFormDate(isoToDateInput(detail.start_time));
      await loadPromotionalCatalog();
      setShowNewBooking(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStatusChange = async (id, status) => {
    setUpdatingStatusId(id);
    setMessage(null);
    setError(null);

    try {
      await updateBookingStatus(id, status);
      setMessage('Estado actualizado.');
      await loadBookingsData();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleDeleteBooking = async (booking) => {
    setMessage(null);
    setError(null);
    await deleteBooking(booking.id);
    setMessage('Reserva eliminada.');
    await loadBookingsData();
  };

  const showBookingForm = showNewBooking || editingBooking;

  const handleSelectTab = (tabId) => {
    if (tabId === '__more') {
      setDrawerOpen(true);
      return;
    }
    setActiveTab(tabId);
    setDrawerOpen(false);
    closeFormView();
  };

  const openNewBooking = async () => {
    revokeAllAttachmentPreviews(formAttachments);
    setFormAttachments([]);
    setEditingBooking(null);
    setFormDate(calendarDateFilter || toDateInputValue());
    await loadPromotionalCatalog();
    setShowNewBooking(true);
  };

  return (
    <>
      <Navigation
        tabs={tabs}
        activeTab={activeTab}
        onSelect={handleSelectTab}
        drawerOpen={drawerOpen}
        onCloseDrawer={() => setDrawerOpen(false)}
      />

      <Snackbar
        message={error || message}
        error={Boolean(error)}
        onClose={() => {
          setError(null);
          setMessage(null);
        }}
      />

      {activeTab === 'locales' ? (
        <LocalsPanel />
      ) : activeTab === 'usuarios' ? (
        <UsersPanel />
      ) : loading ? (
        <Progress label="Cargando" />
      ) : activeTab === 'reservas' ? (
        showBookingForm ? (
          <div className="new-booking-view">
            <div className="toolbar">
              <button type="button" className="btn btn--ghost" onClick={closeFormView}>
                ← Volver al listado
              </button>

              <label className="toolbar__date">
                Fecha del evento
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                />
              </label>
            </div>

            <main className="layout layout--form">
              <div className="layout__main">
                <BookingForm
                  venue={venue}
                  local={activeLocal}
                  eventTypes={eventTypes}
                  packages={packages}
                  promotionalPackages={promotionalPackages}
                  promotionalOptionalItems={promotionalOptionalItems}
                  decorationColorOptions={decorationColorCatalog}
                  decorationThemeOptions={decorationThemeOptions}
                  contractExtraTerms={contractExtraTerms}
                  selectedDate={formDate}
                  booking={editingBooking}
                  onSubmit={editingBooking ? handleUpdateBooking : handleCreateBooking}
                  loading={submitting}
                  attachments={formAttachments}
                  onAttachmentsChange={handleAttachmentsChange}
                  onAttachmentUpload={editingBooking?.id ? handleAttachmentUpload : undefined}
                  attachmentsReadOnly={isBookingLocked(editingBooking?.status)}
                  attachmentsUploading={attachmentsUploading}
                  onEventTypesChange={reloadEventTypes}
                />
              </div>
            </main>
          </div>
        ) : (
          <>
            <AvailabilityCalendar
              refreshKey={calendarRefreshKey}
              selectedDate={calendarDateFilter}
              onSelectDate={(dateKey) =>
                setCalendarDateFilter((prev) => (prev === dateKey ? '' : dateKey))
              }
              onOccupiedClick={handleOccupiedCalendarClick}
              onNewBooking={openNewBooking}
            />

            <div className="toolbar toolbar--reservations">
              <label className="toolbar__filter">
                Filtrar por estado
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">Todos los estados</option>
                  {BOOKING_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </label>

              {calendarDateFilter && (
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => setCalendarDateFilter('')}
                >
                  Quitar filtro de fecha
                </button>
              )}
            </div>

            <BookingList
              bookings={bookings}
              local={activeLocal}
              contractExtraTerms={contractExtraTerms}
              onStatusChange={handleStatusChange}
              updatingStatusId={updatingStatusId}
              onPaymentAdded={loadBookingsData}
              onEdit={handleEditBooking}
              onDelete={handleDeleteBooking}
            />

            <FAB className="md-fab--page" label="Nueva reserva" onClick={openNewBooking} />
          </>
        )
      ) : activeTab === 'reportes' ? (
        <Reports
          bookings={reportBookings}
          local={activeLocal}
          contractExtraTerms={contractExtraTerms}
          statusFilter={reportStatusFilter}
          onStatusFilterChange={setReportStatusFilter}
          dateFrom={reportDateFrom}
          dateTo={reportDateTo}
          onDateFromChange={setReportDateFrom}
          onDateToChange={setReportDateTo}
        />
      ) : activeTab === 'paquetes' ? (
        <PackageManager
          packages={packages}
          seasons={seasons}
          decorationThemeOptions={decorationThemeOptions}
          onRefresh={loadData}
          onRefreshThemes={loadDecorationThemeOptions}
        />
      ) : activeTab === 'paquetes-promo' ? (
        <PromotionalPackagesManager
          packages={promotionalPackages}
          optionalItems={promotionalOptionalItems}
          onRefresh={loadPromotionalPackages}
          onRefreshOptionalItems={loadPromotionalOptionalItems}
        />
      ) : activeTab === 'utilitarios' ? (
        <UtilitiesPanel
          decorationColors={decorationColorCatalog}
          onRefreshDecorationColors={loadDecorationColors}
          contractExtraTerms={contractExtraTerms}
          onRefreshContractExtraTerms={loadContractExtraTerms}
        />
      ) : (
        <Projections data={projections} year={projectionYear} onYearChange={setProjectionYear} />
      )}
    </>
  );
}
