import { useEffect, useMemo, useState } from 'react';
import { fetchAvailability, formatBookingEventLabel } from '../../api';
import { BOOKING_STATUSES, getStatusLabel } from '../../constants/bookingStatus';
import { Button, IconButton } from '../../design-system';

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const STATUS_PRIORITY = ['reservado', 'atendido', 'cancelado'];

function toDateKey(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function buildCalendarCells(year, month) {
  const firstDay = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7;
  const cells = [];

  for (let i = 0; i < startOffset; i += 1) {
    cells.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day);
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

function getPrimaryStatus(events) {
  if (!events?.length) return null;

  for (const status of STATUS_PRIORITY) {
    if (events.some((event) => event.status === status)) {
      return status;
    }
  }

  return events[0].status;
}

export default function AvailabilityCalendar({
  onSelectDate,
  selectedDate,
  onNewBooking,
  onOccupiedClick,
  refreshKey = 0,
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [dateEvents, setDateEvents] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAvailability(viewYear, viewMonth);
        if (cancelled) return;
        setDateEvents(data.dateEvents ?? {});
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [viewYear, viewMonth, refreshKey]);

  const cells = useMemo(() => buildCalendarCells(viewYear, viewMonth), [viewYear, viewMonth]);

  const handleCellClick = (dateKey, events) => {
    if (events?.length && onOccupiedClick) {
      onOccupiedClick(events.length === 1 ? events[0] : events, dateKey);
      return;
    }

    onSelectDate?.(dateKey);
  };

  const getCellEventLabel = (events) => {
    if (!events?.length) return '';

    if (events.length === 1) {
      return formatBookingEventLabel(events[0].eventType, events[0].title);
    }

    return events
      .map((event) => formatBookingEventLabel(event.eventType, event.title))
      .join(' · ');
  };

  const getEventTooltip = (dateKey, events) => {
    if (!events?.length) return 'Día disponible';

    const labels = events
      .map((event) => {
        const label = formatBookingEventLabel(event.eventType, event.title);
        return `${label} (${getStatusLabel(event.status)})`;
      })
      .join(' · ');

    return `${labels} — clic para ver o editar`;
  };

  const shiftMonth = (delta) => {
    const date = new Date(viewYear, viewMonth - 1 + delta, 1);
    setViewYear(date.getFullYear());
    setViewMonth(date.getMonth() + 1);
  };

  const todayKey = toDateKey(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate()
  );

  return (
    <section className="panel availability-calendar">
      <div className="availability-calendar__header">
        <div>
          <h2>Disponibilidad del local</h2>
          <p className="panel__subtitle">Color según estado de la reserva · toca un día libre para filtrar</p>
        </div>
        <div className="availability-calendar__controls">
          <div className="availability-calendar__nav">
            <IconButton name="chevron_left" label="Mes anterior" onClick={() => shiftMonth(-1)} />
            <strong>
              {MONTHS[viewMonth - 1]} {viewYear}
            </strong>
            <IconButton name="chevron_right" label="Mes siguiente" onClick={() => shiftMonth(1)} />
          </div>
          {onNewBooking && (
            <Button icon="add" onClick={onNewBooking}>
              Nueva reserva
            </Button>
          )}
        </div>
      </div>

      {error && <p className="form-hint form-hint--error">{error}</p>}

      <div className={`availability-calendar__grid ${loading ? 'availability-calendar__grid--loading' : ''}`}>
        {WEEKDAYS.map((day) => (
          <div key={day} className="availability-calendar__weekday">
            {day}
          </div>
        ))}

        {cells.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className="availability-calendar__cell availability-calendar__cell--empty" />;
          }

          const dateKey = toDateKey(viewYear, viewMonth, day);
          const events = dateEvents[dateKey] ?? [];
          const primaryStatus = getPrimaryStatus(events);
          const hasEvents = events.length > 0;
          const isToday = dateKey === todayKey;
          const isSelected = selectedDate === dateKey;
          const statusClass = primaryStatus
            ? `availability-calendar__cell--${primaryStatus}`
            : 'availability-calendar__cell--available';

          return (
            <button
              key={dateKey}
              type="button"
              className={`availability-calendar__cell ${statusClass}${
                isToday ? ' availability-calendar__cell--today' : ''
              }${isSelected ? ' availability-calendar__cell--selected' : ''}${
                hasEvents ? ' availability-calendar__cell--booked' : ''
              }`}
              onClick={() => handleCellClick(dateKey, events)}
              aria-pressed={isSelected}
              aria-label={getEventTooltip(dateKey, events)}
              title={getEventTooltip(dateKey, events)}
            >
              <span className="availability-calendar__day">{day}</span>
              {hasEvents && (
                <span className="availability-calendar__event">{getCellEventLabel(events)}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="availability-calendar__legend">
        <span className="availability-calendar__legend-item">
          <i className="availability-calendar__swatch availability-calendar__swatch--available" />
          Disponible
        </span>
        {BOOKING_STATUSES.map((status) => (
          <span key={status.value} className="availability-calendar__legend-item">
            <i className={`availability-calendar__swatch availability-calendar__swatch--${status.value}`} />
            {status.label}
          </span>
        ))}
      </div>
    </section>
  );
}
