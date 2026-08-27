import {
  getDecorationColorHex,
  getDecorationColorLabel,
} from '../../constants/decorationColors';

const FAN = {
  cx: 100,
  cy: 98,
  radius: 88,
};

function polarPoint(angle) {
  return {
    x: FAN.cx + FAN.radius * Math.cos(angle),
    y: FAN.cy - FAN.radius * Math.sin(angle),
  };
}

function buildFanSegmentPath(index, total) {
  const startAngle = Math.PI - ((index + 1) / total) * Math.PI;
  const endAngle = Math.PI - (index / total) * Math.PI;
  const start = polarPoint(startAngle);
  const end = polarPoint(endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

  return [
    `M ${FAN.cx} ${FAN.cy}`,
    `L ${start.x.toFixed(2)} ${start.y.toFixed(2)}`,
    `A ${FAN.radius} ${FAN.radius} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`,
    'Z',
  ].join(' ');
}

export default function DecorationColorFan({ colors = [], catalog = [] }) {
  const selectedColors = colors.filter(Boolean);

  return (
    <div className="decoration-fan">
      <p className="decoration-fan__title">Abanico de Decoración</p>

      <div className="decoration-fan__stage">
        <svg
          className="decoration-fan__svg"
          viewBox="0 0 200 108"
          role="img"
          aria-label={
            selectedColors.length
              ? `Abanico con colores: ${selectedColors.map((color) => getDecorationColorLabel(color, catalog)).join(', ')}`
              : 'Abanico de Decoración sin colores seleccionados'
          }
        >
          <defs>
            <filter id="decoration-fan-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.12" />
            </filter>
          </defs>

          {selectedColors.length === 0 ? (
            <path
              className="decoration-fan__placeholder"
              d={buildFanSegmentPath(0, 1)}
              filter="url(#decoration-fan-shadow)"
            />
          ) : (
            selectedColors.map((color, index) => (
              <path
                key={`${color}-${index}`}
                d={buildFanSegmentPath(index, selectedColors.length)}
                fill={getDecorationColorHex(color, catalog)}
                stroke="rgba(255,255,255,0.85)"
                strokeWidth="1.5"
                filter="url(#decoration-fan-shadow)"
              />
            ))
          )}

          <circle className="decoration-fan__pivot" cx={FAN.cx} cy={FAN.cy} r="4.5" />
          <line
            className="decoration-fan__base"
            x1="28"
            y1={FAN.cy}
            x2="172"
            y2={FAN.cy}
          />
        </svg>
      </div>

      {selectedColors.length > 0 ? (
        <div className="decoration-fan__labels">
          {selectedColors.map((color, index) => (
            <span key={`${color}-${index}`} className="decoration-fan__label">
              <i
                className="decoration-fan__swatch"
                style={{ backgroundColor: getDecorationColorHex(color, catalog) }}
              />
              {getDecorationColorLabel(color, catalog)}
            </span>
          ))}
        </div>
      ) : (
        <p className="decoration-fan__hint">
          Selecciona colores para ver el abanico.
        </p>
      )}
    </div>
  );
}
