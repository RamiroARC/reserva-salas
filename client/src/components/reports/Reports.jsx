import { useState } from 'react';
import {
  fetchBooking,
  formatCurrency,
  formatDateRangeLabel,
  formatEventDateTime,
  formatTime,
} from '../../api';
import { BOOKING_STATUSES, getStatusLabel } from '../../constants/bookingStatus';
import {
  buildBookingsReportDocument,
  buildContractDocument,
  buildPaymentHistoryDocument,
  mapBookingToContractData,
  previewDocument,
} from '../../utils/printDocuments';
import DocumentPreview from '../shared/DocumentPreview';

export default function Reports({
  bookings,
  local,
  contractExtraTerms = [],
  packageIncludeItems = [],
  statusFilter,
  onStatusFilterChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}) {
  const [printingId, setPrintingId] = useState(null);
  const [printingList, setPrintingList] = useState(false);
  const [documentPreview, setDocumentPreview] = useState(null);

  const filterLabel = statusFilter
    ? getStatusLabel(statusFilter)
    : 'Todos los estados';
  const dateRangeLabel = formatDateRangeLabel(dateFrom, dateTo);

  const handlePrintList = () => {
    setPrintingList(true);
    try {
      const html = buildBookingsReportDocument(bookings, {
        filterLabel,
        dateRangeLabel,
        generatedAt: new Date().toISOString(),
        getStatusLabel,
        local,
      });
      previewDocument(
        html,
        `Reporte de reservas — ${filterLabel}`,
        setDocumentPreview
      );
    } finally {
      setPrintingList(false);
    }
  };

  const handlePrintContract = async (booking) => {
    setPrintingId(booking.id);
    try {
      const detail = await fetchBooking(booking.id);
      const html = buildContractDocument({
        ...mapBookingToContractData(detail),
        local,
        extrasTerms: contractExtraTerms,
        packageIncludeItems,
      });
      previewDocument(
        html,
        `Contrato — ${detail.event_type || detail.title}`,
        setDocumentPreview
      );
    } finally {
      setPrintingId(null);
    }
  };

  const handlePrintPayments = async (booking) => {
    setPrintingId(booking.id);
    try {
      const detail = await fetchBooking(booking.id);
      const html = buildPaymentHistoryDocument(detail, local);
      previewDocument(
        html,
        `Historial de pagos — ${detail.event_type || detail.title}`,
        setDocumentPreview
      );
    } finally {
      setPrintingId(null);
    }
  };

  return (
    <section className="panel panel--wide reports-panel">
      <div className="panel__header">
        <div>
          <h2>Reportes</h2>
          <p className="panel__subtitle">
            Contratos, historial de pagos e impresión del listado de reservas
          </p>
        </div>
      </div>

      <div className="toolbar toolbar--reservations reports-toolbar">
        <label className="toolbar__filter">
          Filtrar por estado
          <select value={statusFilter} onChange={(e) => onStatusFilterChange(e.target.value)}>
            <option value="">Todos los estados</option>
            {BOOKING_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
        <label className="toolbar__date">
          Desde
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
          />
        </label>
        <label className="toolbar__date">
          Hasta
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => onDateToChange(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="btn btn--primary"
          onClick={handlePrintList}
          disabled={printingList || bookings.length === 0}
        >
          {printingList ? 'Generando…' : 'Imprimir listado completo'}
        </button>
      </div>

      {bookings.length === 0 ? (
        <div className="empty-state">
          <p>No hay reservas con los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="reports-table-wrap">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Evento</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id}>
                  <td>
                    <div className="reports-table__date">{formatEventDateTime(booking.start_time)}</div>
                    <div className="reports-table__time">
                      {formatTime(booking.start_time)} – {formatTime(booking.end_time)}
                    </div>
                  </td>
                  <td>
                    <strong>{booking.event_type || booking.title}</strong>
                    {booking.package_name && (
                      <div className="reports-table__meta">{booking.package_name}</div>
                    )}
                  </td>
                  <td>{booking.organizer}</td>
                  <td>
                    <span className={`status status--${booking.status}`}>
                      {getStatusLabel(booking.status)}
                    </span>
                  </td>
                  <td className="reports-table__amount">{formatCurrency(booking.total_cost)}</td>
                  <td className="reports-table__actions">
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={() => handlePrintContract(booking)}
                      disabled={printingId === booking.id}
                    >
                      {printingId === booking.id ? 'Generando…' : 'Contrato PDF'}
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => handlePrintPayments(booking)}
                      disabled={printingId === booking.id}
                    >
                      Historial PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
