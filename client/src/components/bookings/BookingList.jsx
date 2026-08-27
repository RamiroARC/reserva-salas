import { useState } from 'react';
import {
  addPayment,
  fetchBooking,
  formatBookingEventLabel,
  formatCurrency,
  formatEventDateTime,
  formatPaymentDate,
  formatTime,
} from '../../api';
import { BOOKING_STATUSES, canMarkAsAttended, getStatusLabel, isBookingLocked } from '../../constants/bookingStatus';
import {
  affectsBalance,
  getPaymentConceptLabel,
  getPaymentMethodLabel,
  PAYMENT_METHODS,
  PAYMENT_REGISTER_TYPES,
  sortPayments,
} from '../../constants/paymentTypes';
import {
  buildContractDocument,
  buildPaymentHistoryDocument,
  mapBookingToContractData,
  previewDocument,
} from '../../utils/printDocuments';
import DocumentPreview from '../shared/DocumentPreview';
import FormModal from '../shared/FormModal';

const emptyPaymentForm = {
  bookingId: null,
  amount: '',
  paymentType: 'amortizacion',
  paymentMethod: 'efectivo',
  operationNumber: '',
};

export default function BookingList({
  bookings,
  local,
  contractExtraTerms = [],
  onStatusChange,
  updatingStatusId,
  onPaymentAdded,
  onEdit,
  onDelete,
}) {
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm);
  const [submittingPaymentId, setSubmittingPaymentId] = useState(null);
  const [printingId, setPrintingId] = useState(null);
  const [documentPreview, setDocumentPreview] = useState(null);
  const [bookingToDelete, setBookingToDelete] = useState(null);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const toggleExpanded = (bookingId) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(bookingId)) {
        next.delete(bookingId);
        if (paymentForm.bookingId === bookingId) {
          setPaymentForm(emptyPaymentForm);
        }
      } else {
        next.add(bookingId);
      }
      return next;
    });
  };

  const openPaymentForm = (bookingId) => {
    setPaymentForm((prev) =>
      prev.bookingId === bookingId ? prev : { ...emptyPaymentForm, bookingId }
    );
  };

  const updatePaymentForm = (field, value) => {
    setPaymentForm((prev) => ({ ...prev, [field]: value }));
  };

  const handlePrintContract = async (booking) => {
    setPrintingId(booking.id);
    try {
      const detail = await fetchBooking(booking.id);
      const html = buildContractDocument({
        ...mapBookingToContractData(detail),
        local,
        extrasTerms: contractExtraTerms,
      });
      previewDocument(html, `Contrato — ${local?.name ?? detail.room_name}`, setDocumentPreview);
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

  const handlePayment = async (booking) => {
    if (paymentForm.bookingId !== booking.id) {
      openPaymentForm(booking.id);
      return;
    }

    const paymentType = paymentForm.paymentType || 'amortizacion';
    const amount = Number(paymentForm.amount);

    if (paymentType !== 'cancelacion' && (!amount || amount <= 0)) return;
    if (Number.isNaN(amount) || amount < 0) return;

    if (affectsBalance(paymentType) && amount > booking.balance_due + 0.01) {
      alert('El monto supera el saldo pendiente.');
      return;
    }

    if (
      amount > 0 &&
      paymentForm.paymentMethod !== 'efectivo' &&
      !paymentForm.operationNumber.trim()
    ) {
      alert('Ingresa el nro. de operación para este medio de pago.');
      return;
    }

    setSubmittingPaymentId(booking.id);
    try {
      await addPayment(booking.id, {
        amount: paymentType === 'cancelacion' && !paymentForm.amount ? 0 : amount,
        paymentType,
        paymentMethod: paymentForm.paymentMethod,
        operationNumber: paymentForm.operationNumber.trim(),
      });
      setPaymentForm(emptyPaymentForm);
      await onPaymentAdded();
    } finally {
      setSubmittingPaymentId(null);
    }
  };

  const handleStatusSelect = (booking, newStatus) => {
    if (newStatus === 'atendido' && !canMarkAsAttended(booking.balance_due)) {
      alert('No se puede marcar como Atendido mientras exista saldo pendiente.');
      return;
    }
    onStatusChange(booking.id, newStatus);
  };

  const openDeleteForm = (booking) => {
    setBookingToDelete(booking);
    setDeleteConfirmed(false);
    setDeleteError(null);
  };

  const closeDeleteForm = () => {
    if (deleting) return;
    setBookingToDelete(null);
    setDeleteConfirmed(false);
    setDeleteError(null);
  };

  const handleConfirmDelete = async (event) => {
    event.preventDefault();
    if (!bookingToDelete || !deleteConfirmed) return;

    setDeleting(true);
    setDeleteError(null);
    try {
      await onDelete(bookingToDelete);
      setBookingToDelete(null);
      setDeleteConfirmed(false);
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="panel panel--wide reservations-panel">
      <div className="panel__header">
        <div>
          <h2>Todas las reservas</h2>
          <p className="panel__subtitle">{bookings.length} registro(s)</p>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="empty-state">
          <p>No hay reservas con los filtros seleccionados.</p>
          <span>Usa «Nueva reserva» para registrar una.</span>
        </div>
      ) : (
        <div className="booking-list">
          {bookings.map((booking) => {
            const payments = sortPayments(booking.payments ?? []);
            const isExpanded = expandedIds.has(booking.id);
            const isPaymentFormOpen = paymentForm.bookingId === booking.id;
            const paymentType = isPaymentFormOpen ? paymentForm.paymentType : 'amortizacion';
            const locked = isBookingLocked(booking.status);

            return (
              <article
                key={booking.id}
                className={`booking-card ${isExpanded ? 'booking-card--expanded' : ''}`}
              >
                <button
                  type="button"
                  className="booking-card__summary"
                  onClick={() => toggleExpanded(booking.id)}
                  aria-expanded={isExpanded}
                >
                  <div className="booking-card__summary-content">
                    <div className="booking-card__top">
                      <strong>{formatBookingEventLabel(booking.event_type, booking.title)}</strong>
                      <span className={`status status--${booking.status}`}>
                        {getStatusLabel(booking.status)}
                      </span>
                    </div>
                    <p className="booking-card__meta booking-card__meta--date">
                      {formatEventDateTime(booking.start_time)} ·{' '}
                      {formatTime(booking.start_time)} – {formatTime(booking.end_time)}
                    </p>
                    <p className="booking-card__meta booking-card__meta--compact">
                      {booking.organizer}
                      {booking.package_name ? ` · ${booking.package_name}` : ''}
                    </p>
                    <div className="booking-card__costs booking-card__costs--compact">
                      <span>Total: {formatCurrency(booking.total_cost)}</span>
                      <span>Saldo: {formatCurrency(booking.balance_due)}</span>
                    </div>
                  </div>
                  <span className="booking-card__chevron" aria-hidden="true">
                    {isExpanded ? '▾' : '▸'}
                  </span>
                </button>

                {isExpanded && (
                  <div className="booking-card__details">
                    <div className="booking-card__body">
                      <p className="booking-card__meta">
                        {booking.organizer} · {booking.attendees} asistentes
                        {booking.package_name ? ` · ${booking.package_name}` : ''}
                      </p>
                      <div className="booking-card__costs">
                        <span>Total: {formatCurrency(booking.total_cost)}</span>
                        <span>Adelanto: {formatCurrency(booking.deposit_amount)}</span>
                        <span>Pagado: {formatCurrency(booking.deposit_paid)}</span>
                        <span>Saldo: {formatCurrency(booking.balance_due)}</span>
                      </div>

                      <label className="status-select">
                        Cambiar estado
                        <select
                          value={booking.status}
                          onChange={(e) => handleStatusSelect(booking, e.target.value)}
                          disabled={locked || updatingStatusId === booking.id}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {BOOKING_STATUSES.map((status) => (
                            <option
                              key={status.value}
                              value={status.value}
                              disabled={
                                status.value === 'atendido' &&
                                !canMarkAsAttended(booking.balance_due)
                              }
                            >
                              {status.label}
                              {status.value === 'atendido' &&
                              !canMarkAsAttended(booking.balance_due)
                                ? ' (saldo pendiente)'
                                : ''}
                            </option>
                          ))}
                        </select>
                      </label>

                      {locked && (
                        <p className="booking-card__locked-note">
                          Reserva atendida — solo consulta e impresión de documentos.
                        </p>
                      )}

                      {payments.length > 0 && (
                        <div className="payment-history">
                          <h4 className="payment-history__title">Historial de pagos</h4>
                          <ul className="payment-history__list">
                            {payments.map((payment) => (
                              <li key={payment.id} className="payment-history__item">
                                <span className="payment-history__concept">
                                  {getPaymentConceptLabel(payment, payments)}
                                </span>
                                <span className="payment-history__amount">
                                  {formatCurrency(payment.amount)}
                                </span>
                                <span className="payment-history__meta">
                                  {formatPaymentDate(payment.payment_date)} ·{' '}
                                  {getPaymentMethodLabel(payment.payment_method)}
                                  {payment.operation_number
                                    ? ` · Op. ${payment.operation_number}`
                                    : ''}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {!locked && booking.status !== 'cancelado' && (
                        <div className="payment-form">
                          <h4 className="payment-form__title">Amortizaciones</h4>
                          <div className="payment-form__row">
                            <label>
                              Concepto
                              <select
                                value={isPaymentFormOpen ? paymentForm.paymentType : 'amortizacion'}
                                onFocus={() => openPaymentForm(booking.id)}
                                onChange={(e) => {
                                  openPaymentForm(booking.id);
                                  updatePaymentForm('paymentType', e.target.value);
                                }}
                              >
                                {PAYMENT_REGISTER_TYPES.map((type) => (
                                  <option key={type.value} value={type.value}>
                                    {type.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              Monto
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                max={
                                  paymentType === 'amortizacion'
                                    ? booking.balance_due
                                    : undefined
                                }
                                value={isPaymentFormOpen ? paymentForm.amount : ''}
                                onFocus={() => openPaymentForm(booking.id)}
                                onChange={(e) => {
                                  openPaymentForm(booking.id);
                                  updatePaymentForm('amount', e.target.value);
                                }}
                                placeholder={
                                  paymentType === 'cancelacion'
                                    ? '0 si solo registra pago final'
                                    : paymentType === 'amortizacion'
                                      ? `Máx. ${formatCurrency(booking.balance_due)}`
                                      : 'Monto'
                                }
                              />
                            </label>
                          </div>
                          <div className="payment-form__row">
                            <label>
                              Medio de pago
                              <select
                                value={
                                  isPaymentFormOpen ? paymentForm.paymentMethod : 'efectivo'
                                }
                                onFocus={() => openPaymentForm(booking.id)}
                                onChange={(e) => {
                                  openPaymentForm(booking.id);
                                  updatePaymentForm('paymentMethod', e.target.value);
                                }}
                              >
                                {PAYMENT_METHODS.map((method) => (
                                  <option key={method.value} value={method.value}>
                                    {method.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              Nro. de operación
                              <input
                                type="text"
                                value={isPaymentFormOpen ? paymentForm.operationNumber : ''}
                                onFocus={() => openPaymentForm(booking.id)}
                                onChange={(e) => {
                                  openPaymentForm(booking.id);
                                  updatePaymentForm('operationNumber', e.target.value);
                                }}
                                placeholder={
                                  isPaymentFormOpen &&
                                  paymentForm.paymentMethod !== 'efectivo'
                                    ? 'Obligatorio para Yape, Plin o transferencia'
                                    : 'Opcional en efectivo'
                                }
                              />
                            </label>
                          </div>
                          <button
                            type="button"
                            className="btn btn--secondary btn--sm"
                            onClick={() => handlePayment(booking)}
                            disabled={submittingPaymentId === booking.id}
                          >
                            {submittingPaymentId === booking.id
                              ? 'Registrando…'
                              : 'Registrar pago'}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="booking-card__actions">
                      {!locked && (
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => onEdit(booking)}
                        >
                          Editar
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn--danger btn--sm"
                        onClick={() => openDeleteForm(booking)}
                      >
                        Eliminar
                      </button>
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => handlePrintPayments(booking)}
                        disabled={printingId === booking.id}
                      >
                        {printingId === booking.id ? 'Generando…' : 'Historial PDF'}
                      </button>
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => handlePrintContract(booking)}
                        disabled={printingId === booking.id}
                      >
                        {printingId === booking.id ? 'Generando…' : 'Ver contrato'}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {documentPreview && (
        <DocumentPreview
          html={documentPreview.html}
          title={documentPreview.title}
          onClose={() => setDocumentPreview(null)}
        />
      )}

      {bookingToDelete && (
        <FormModal
          title="Eliminar reserva"
          subtitle="Esta acción no se puede deshacer."
          onClose={closeDeleteForm}
        >
          {deleteError && (
            <div className="alert alert--error" role="alert">
              {deleteError}
            </div>
          )}
          <form className="confirm-delete-form" onSubmit={handleConfirmDelete}>
            <dl className="confirm-delete-form__summary">
              <div>
                <dt>Evento</dt>
                <dd>{formatBookingEventLabel(bookingToDelete.event_type, bookingToDelete.title)}</dd>
              </div>
              <div>
                <dt>Fecha</dt>
                <dd>
                  {formatEventDateTime(bookingToDelete.start_time)} · {formatTime(bookingToDelete.start_time)} –{' '}
                  {formatTime(bookingToDelete.end_time)}
                </dd>
              </div>
              <div>
                <dt>Cliente</dt>
                <dd>{bookingToDelete.organizer || '—'}</dd>
              </div>
              <div>
                <dt>Estado</dt>
                <dd>{getStatusLabel(bookingToDelete.status)}</dd>
              </div>
            </dl>
            <label className="confirm-delete-form__check">
              <input
                type="checkbox"
                checked={deleteConfirmed}
                onChange={(e) => setDeleteConfirmed(e.target.checked)}
              />
              Confirmo que deseo eliminar esta reserva de forma permanente
            </label>
            <div className="confirm-delete-form__actions">
              <button type="button" className="btn btn--ghost" onClick={closeDeleteForm} disabled={deleting}>
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn--danger"
                disabled={!deleteConfirmed || deleting}
              >
                {deleting ? 'Eliminando…' : 'Eliminar reserva'}
              </button>
            </div>
          </form>
        </FormModal>
      )}
    </section>
  );
}
