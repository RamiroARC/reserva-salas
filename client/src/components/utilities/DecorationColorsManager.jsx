import { useState } from 'react';
import { createDecorationColor, deleteDecorationColor } from '../../api';

const emptyForm = {
  name: '',
  hex: '#c8a2c8',
};

function IconTrash() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

export default function DecorationColorsManager({ colors, onRefresh }) {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const saveCreate = async () => {
    if (!form.name.trim()) return;

    setSaving(true);
    try {
      await createDecorationColor({
        name: form.name.trim(),
        hex: form.hex,
      });
      setShowCreate(false);
      setForm(emptyForm);
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const removeColor = async (color) => {
    if (!window.confirm(`¿Eliminar el color "${color.label}"?`)) return;

    setSaving(true);
    try {
      await deleteDecorationColor(color.id);
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="panel decoration-colors-panel">
      <div className="panel__header">
        <div>
          <h2>Colores de decoración</h2>
          <p className="form-hint">
            {colors.length} color(es) disponibles para la sección «Color de decoración del local» en reservas.
          </p>
        </div>
        {!showCreate && (
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={() => setShowCreate(true)}
            disabled={saving}
          >
            + Nuevo color
          </button>
        )}
      </div>

      {showCreate && (
        <div className="decoration-colors-form">
          <label>
            Nombre del color
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Ej. Lila bebé"
            />
          </label>
          <label>
            Muestra (hex)
            <div className="decoration-colors-form__hex">
              <input
                type="color"
                value={form.hex}
                onChange={(e) => setForm((prev) => ({ ...prev, hex: e.target.value }))}
                aria-label="Seleccionar color"
              />
              <input
                type="text"
                value={form.hex}
                onChange={(e) => setForm((prev) => ({ ...prev, hex: e.target.value }))}
                placeholder="#c8a2c8"
              />
            </div>
          </label>
          <div className="decoration-colors-form__actions">
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={saveCreate}
              disabled={saving || !form.name.trim()}
            >
              Guardar color
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => {
                setShowCreate(false);
                setForm(emptyForm);
              }}
              disabled={saving}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <ul className="decoration-colors-list">
        {colors.map((color) => (
          <li key={color.id} className="decoration-colors-list__item">
            <span
              className="decoration-colors-list__swatch"
              style={{ backgroundColor: color.hex }}
              aria-hidden="true"
            />
            <span className="decoration-colors-list__name">{color.label}</span>
            <button
              type="button"
              className="icon-btn icon-btn--danger"
              aria-label={`Eliminar ${color.label}`}
              title="Eliminar"
              onClick={() => removeColor(color)}
              disabled={saving}
            >
              <IconTrash />
            </button>
          </li>
        ))}
      </ul>

      {!colors.length && !showCreate && (
        <p className="form-hint">No hay colores registrados. Agrega el primero con el botón superior.</p>
      )}
    </section>
  );
}
