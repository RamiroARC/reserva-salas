import { formatCurrency } from '../../api';

const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function Projections({ data, year, onYearChange }) {
  if (!data) {
    return <div className="loading">Cargando proyecciones…</div>;
  }

  const maxRevenue = Math.max(...data.byMonth.map((m) => m.projectedRevenue), 1);
  const maxAttendees = Math.max(...data.byMonth.map((m) => m.totalAttendees), 1);

  return (
    <div className="projections">
      <div className="projections__toolbar">
        <label>
          Año
          <select value={year} onChange={(e) => onYearChange(Number(e.target.value))}>
            {[year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-card__label">Eventos</span>
          <strong className="stat-card__value">{data.totals.events}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-card__label">Asistentes totales</span>
          <strong className="stat-card__value">{data.totals.total_attendees}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-card__label">Ingresos proyectados</span>
          <strong className="stat-card__value">{formatCurrency(data.totals.projected_revenue)}</strong>
        </div>
        <div className="stat-card">
          <span className="stat-card__label">Adelantos cobrados</span>
          <strong className="stat-card__value">{formatCurrency(data.totals.deposits_collected)}</strong>
        </div>
        <div className="stat-card stat-card--warning">
          <span className="stat-card__label">Saldo pendiente</span>
          <strong className="stat-card__value">{formatCurrency(data.totals.pending_balance)}</strong>
        </div>
      </div>

      <section className="panel">
        <div className="panel__header">
          <h2>Acogida por mes</h2>
        </div>
        <div className="chart">
          {data.byMonth.map((month) => (
            <div key={month.month} className="chart__column">
              <div className="chart__bars">
                <div
                  className="chart__bar chart__bar--revenue"
                  style={{ height: `${(month.projectedRevenue / maxRevenue) * 100}%` }}
                  title={`Ingresos: ${formatCurrency(month.projectedRevenue)}`}
                />
                <div
                  className="chart__bar chart__bar--attendees"
                  style={{ height: `${(month.totalAttendees / maxAttendees) * 100}%` }}
                  title={`Asistentes: ${month.totalAttendees}`}
                />
              </div>
              <span className="chart__label">{MONTH_SHORT[month.month - 1]}</span>
              <span className="chart__count">{month.events} evt.</span>
            </div>
          ))}
        </div>
        <div className="chart-legend">
          <span><i className="legend legend--revenue" /> Ingresos</span>
          <span><i className="legend legend--attendees" /> Asistentes</span>
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <h2>Proyección por temporada</h2>
        </div>
        <div className="season-projection-list">
          {data.bySeason.map((season) => (
            <article key={season.season_name} className="season-projection">
              <div className="season-projection__header">
                <strong>{season.season_name}</strong>
                <span className="tag">×{season.season_multiplier}</span>
              </div>
              <div className="season-projection__stats">
                <div>
                  <span>Eventos</span>
                  <strong>{season.events}</strong>
                </div>
                <div>
                  <span>Asistentes</span>
                  <strong>{season.total_attendees}</strong>
                </div>
                <div>
                  <span>Ingresos</span>
                  <strong>{formatCurrency(season.projected_revenue)}</strong>
                </div>
                <div>
                  <span>Adelantos</span>
                  <strong>{formatCurrency(season.deposits_collected)}</strong>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <h2>Detalle mensual</h2>
        </div>
        <div className="month-table">
          <div className="month-table__header">
            <span>Mes</span>
            <span>Temporada</span>
            <span>Eventos</span>
            <span>Asistentes</span>
            <span>Ingresos</span>
            <span>Adelantos</span>
          </div>
          {data.byMonth.map((month) => (
            <div key={month.month} className="month-table__row">
              <span>{month.monthName}</span>
              <span>{month.seasonName}</span>
              <span>{month.events}</span>
              <span>{month.totalAttendees}</span>
              <span>{formatCurrency(month.projectedRevenue)}</span>
              <span>{formatCurrency(month.depositsCollected)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
