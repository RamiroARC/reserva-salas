import { useState } from 'react';
import {
  createPromotionalPackage,
  createPromotionalOptionalItem,
  createPromotionalPlatoFondo,
  deletePromotionalPackage,
  deletePromotionalOptionalItem,
  deletePromotionalPlatoFondo,
  formatCurrency,
  updatePromotionalPackage,
  updatePromotionalOptionalItem,
  updatePromotionalPlatoFondo,
} from '../../api';
import {
  MONTH_OPTIONS,
  PRICE_TYPE_OPTIONS,
  isPlatoFondoIncludeText,
  emptyPromoForm,
  formToPromoPayload,
  formatPromoAttendees,
  formatPromoValidity,
  promoToForm,
} from '../../constants/promotionalPackages';

const emptyOptionalItemForm = {
  name: '',
  price: '',
  sortOrder: '0',
  active: true,
};

const emptyPlatoFondoForm = {
  name: '',
  sortOrder: '0',
  active: true,
};

function IconEdit() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

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

function IconChevron({ open }) {
  return (
    <svg
      className={`package-card__chevron${open ? ' package-card__chevron--open' : ''}`}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function PromoOptionalItemForm({ form, setForm, onSave, onCancel, saving, saveLabel = 'Guardar' }) {
  return (
    <div className="promo-extra-form">
      <input
        type="text"
        placeholder="Nombre del ítem"
        value={form.name}
        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
      />
      <input
        type="number"
        min="0"
        step="0.01"
        placeholder="Precio"
        value={form.price}
        onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
      />
      <input
        type="number"
        min="0"
        step="1"
        placeholder="Orden"
        value={form.sortOrder}
        onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
      />
      <label className="promo-form__checkbox">
        <input
          type="checkbox"
          checked={form.active}
          onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
        />
        Activo
      </label>
      <div className="promo-extra-form__actions">
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={onSave}
          disabled={saving || !form.name.trim()}
        >
          {saveLabel}
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel} disabled={saving}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

function PromoForm({ form, setForm, onSave, onCancel, saving, saveLabel = 'Guardar' }) {
  return (
    <div className="promo-form">
      <div className="promo-form__grid">
        <label>
          Nombre
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
        </label>
        <label>
          Precio (S/.)
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
            required
          />
        </label>
        <label>
          Tipo de precio
          <select
            value={form.priceType}
            onChange={(e) => setForm((prev) => ({ ...prev, priceType: e.target.value }))}
          >
            {PRICE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Orden
          <input
            type="number"
            min="0"
            step="1"
            value={form.sortOrder}
            onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
          />
        </label>
        <label>
          Mín. asistentes
          <input
            type="number"
            min="1"
            value={form.minAttendees}
            onChange={(e) => setForm((prev) => ({ ...prev, minAttendees: e.target.value }))}
          />
        </label>
        <label>
          Máx. asistentes
          <input
            type="number"
            min="1"
            value={form.maxAttendees}
            onChange={(e) => setForm((prev) => ({ ...prev, maxAttendees: e.target.value }))}
          />
        </label>
        <label>
          Vigencia desde
          <select
            value={form.monthStart}
            onChange={(e) => setForm((prev) => ({ ...prev, monthStart: e.target.value }))}
          >
            <option value="">Todo el año</option>
            {MONTH_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Vigencia hasta
          <select
            value={form.monthEnd}
            onChange={(e) => setForm((prev) => ({ ...prev, monthEnd: e.target.value }))}
          >
            <option value="">Todo el año</option>
            {MONTH_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label>
        Descripción
        <textarea
          rows={2}
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
        />
      </label>

      <label>
        Incluye (una línea por ítem)
        <textarea
          rows={4}
          value={form.includesText}
          onChange={(e) => setForm((prev) => ({ ...prev, includesText: e.target.value }))}
          placeholder={'Local decorado 8 horas\nPisco sour y chicha\nServicio de mozos'}
        />
      </label>

      <label className="promo-form__checkbox">
        <input
          type="checkbox"
          checked={form.active}
          onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
        />
        Paquete activo (visible para uso comercial)
      </label>

      <div className="promo-form__actions">
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={onSave}
          disabled={saving || !form.name.trim()}
        >
          {saveLabel}
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel} disabled={saving}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

export default function PromotionalPackagesManager({
  packages,
  optionalItems,
  onRefresh,
  onRefreshOptionalItems,
}) {
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyPromoForm);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyPromoForm);
  const [saving, setSaving] = useState(false);
  const [editingOptionalId, setEditingOptionalId] = useState(null);
  const [optionalEditForm, setOptionalEditForm] = useState(emptyOptionalItemForm);
  const [showOptionalCreate, setShowOptionalCreate] = useState(false);
  const [optionalCreateForm, setOptionalCreateForm] = useState(emptyOptionalItemForm);
  const [creatingPlatoFondoFor, setCreatingPlatoFondoFor] = useState(null);
  const [platoFondoCreateForm, setPlatoFondoCreateForm] = useState(emptyPlatoFondoForm);
  const [editingPlatoFondoId, setEditingPlatoFondoId] = useState(null);
  const [platoFondoEditForm, setPlatoFondoEditForm] = useState(emptyPlatoFondoForm);

  const toggleExpanded = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startEdit = (promo) => {
    setShowCreate(false);
    setEditingId(promo.id);
    setEditForm(promoToForm(promo));
    setExpandedIds((prev) => new Set(prev).add(promo.id));
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await updatePromotionalPackage(editingId, formToPromoPayload(editForm));
      setEditingId(null);
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const saveCreate = async () => {
    setSaving(true);
    try {
      await createPromotionalPackage(formToPromoPayload(createForm));
      setShowCreate(false);
      setCreateForm(emptyPromoForm);
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const removePromo = async (promo) => {
    if (!window.confirm(`¿Eliminar "${promo.name}"?`)) return;
    setSaving(true);
    try {
      await deletePromotionalPackage(promo.id);
      if (editingId === promo.id) setEditingId(null);
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const activeCount = packages.filter((promo) => promo.active).length;

  const optionalItemToForm = (item) => ({
    name: item.name ?? '',
    price: String(item.price ?? ''),
    sortOrder: String(item.sort_order ?? 0),
    active: item.active !== false,
  });

  const formToOptionalPayload = (form) => ({
    name: form.name.trim(),
    price: Number(form.price) || 0,
    sortOrder: Number(form.sortOrder) || 0,
    active: form.active,
  });

  const platoFondoToForm = (item) => ({
    name: item.name ?? '',
    sortOrder: String(item.sort_order ?? 0),
    active: item.active !== false,
  });

  const formToPlatoFondoPayload = (form, promotionalPackageId) => ({
    name: form.name.trim(),
    promotionalPackageId,
    sortOrder: Number(form.sortOrder) || 0,
    active: form.active,
  });

  const startPlatoFondoEdit = (item) => {
    setCreatingPlatoFondoFor(null);
    setEditingPlatoFondoId(item.id);
    setPlatoFondoEditForm(platoFondoToForm(item));
  };

  const savePlatoFondoEdit = async () => {
    if (!editingPlatoFondoId) return;
    setSaving(true);
    try {
      const item = packages
        .flatMap((promo) => promo.platoFondoOptions ?? [])
        .find((entry) => entry.id === editingPlatoFondoId);
      await updatePromotionalPlatoFondo(
        editingPlatoFondoId,
        formToPlatoFondoPayload(platoFondoEditForm, item?.promotional_package_id)
      );
      setEditingPlatoFondoId(null);
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const savePlatoFondoCreate = async (promotionalPackageId) => {
    if (!platoFondoCreateForm.name.trim()) return;
    setSaving(true);
    try {
      await createPromotionalPlatoFondo(
        formToPlatoFondoPayload(platoFondoCreateForm, promotionalPackageId)
      );
      setCreatingPlatoFondoFor(null);
      setPlatoFondoCreateForm(emptyPlatoFondoForm);
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const removePlatoFondo = async (item) => {
    if (!window.confirm(`¿Eliminar "${item.name}" del catálogo?`)) return;
    setSaving(true);
    try {
      await deletePromotionalPlatoFondo(item.id);
      if (editingPlatoFondoId === item.id) setEditingPlatoFondoId(null);
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const startOptionalEdit = (item) => {
    setShowOptionalCreate(false);
    setEditingOptionalId(item.id);
    setOptionalEditForm(optionalItemToForm(item));
  };

  const saveOptionalEdit = async () => {
    if (!editingOptionalId) return;
    setSaving(true);
    try {
      await updatePromotionalOptionalItem(editingOptionalId, formToOptionalPayload(optionalEditForm));
      setEditingOptionalId(null);
      await onRefreshOptionalItems();
    } finally {
      setSaving(false);
    }
  };

  const saveOptionalCreate = async () => {
    setSaving(true);
    try {
      await createPromotionalOptionalItem(formToOptionalPayload(optionalCreateForm));
      setShowOptionalCreate(false);
      setOptionalCreateForm(emptyOptionalItemForm);
      await onRefreshOptionalItems();
    } finally {
      setSaving(false);
    }
  };

  const removeOptionalItem = async (item) => {
    if (!window.confirm(`¿Eliminar "${item.name}"?`)) return;
    setSaving(true);
    try {
      await deletePromotionalOptionalItem(item.id);
      if (editingOptionalId === item.id) setEditingOptionalId(null);
      await onRefreshOptionalItems();
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="panel promo-packages">
      <div className="panel__header">
        <div>
          <h2>Paquetes promocionales</h2>
          <p className="form-hint">
            {packages.length} paquete(s) · {activeCount} activo(s)
          </p>
        </div>
        {!showCreate && (
          <button type="button" className="btn btn--secondary btn--sm" onClick={() => setShowCreate(true)}>
            + Nuevo paquete
          </button>
        )}
      </div>

      {showCreate && (
        <article className="promo-card promo-card--editing">
          <h3>Nuevo paquete promocional</h3>
          <PromoForm
            form={createForm}
            setForm={setCreateForm}
            onSave={saveCreate}
            onCancel={() => {
              setShowCreate(false);
              setCreateForm(emptyPromoForm);
            }}
            saving={saving}
            saveLabel="Crear paquete"
          />
        </article>
      )}

      <div className="promo-grid">
        {packages.map((promo) => {
          const isExpanded = expandedIds.has(promo.id);
          const isEditing = editingId === promo.id;
          const priceLabel =
            promo.price_type === 'per_person'
              ? `${formatCurrency(promo.price)}/persona`
              : formatCurrency(promo.price);

          return (
            <article
              key={promo.id}
              className={`promo-card ${isExpanded ? '' : 'promo-card--collapsed'}${!promo.active ? ' promo-card--inactive' : ''}`}
            >
              <div className="promo-card__header">
                <button
                  type="button"
                  className="promo-card__toggle"
                  onClick={() => toggleExpanded(promo.id)}
                  aria-expanded={isExpanded}
                >
                  <IconChevron open={isExpanded} />
                  <strong className="promo-card__title">{promo.name}</strong>
                  <span className={`tag ${promo.active ? 'tag--promo' : ''}`}>
                    {promo.active ? 'Activo' : 'Inactivo'}
                  </span>
                </button>
                <div className="promo-card__actions">
                  <span className="promo-card__price">{priceLabel}</span>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Editar ${promo.name}`}
                    title="Editar"
                    onClick={() => startEdit(promo)}
                    disabled={saving}
                  >
                    <IconEdit />
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn--danger"
                    aria-label={`Eliminar ${promo.name}`}
                    title="Eliminar"
                    onClick={() => removePromo(promo)}
                    disabled={saving}
                  >
                    <IconTrash />
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="promo-card__body">
                  {isEditing ? (
                    <PromoForm
                      form={editForm}
                      setForm={setEditForm}
                      onSave={saveEdit}
                      onCancel={() => setEditingId(null)}
                      saving={saving}
                    />
                  ) : (
                    <>
                      {promo.description && <p className="promo-card__desc">{promo.description}</p>}
                      <div className="promo-card__meta">
                        <span>{formatPromoAttendees(promo.min_attendees, promo.max_attendees)}</span>
                        <span>Vigencia: {formatPromoValidity(promo.month_start, promo.month_end)}</span>
                      </div>
                      {promo.includes?.length > 0 && (
                        <>
                          <h4 className="promo-card__includes-title">Incluye</h4>
                          <ul className="promo-card__includes">
                            {promo.includes.map((item) => (
                              <li
                                key={item}
                                className={
                                  isPlatoFondoIncludeText(item) ? 'promo-card__includes-item--plato-fondo' : undefined
                                }
                              >
                                {isPlatoFondoIncludeText(item) && (
                                  <span className="item-badge item-badge--plato-fondo">Plato de fondo</span>
                                )}
                                {isPlatoFondoIncludeText(item)
                                  ? 'Plato de fondo a elección (ver opciones abajo)'
                                  : item}
                              </li>
                            ))}
                          </ul>
                        </>
                      )}

                      <div className="promo-plato-fondo">
                        <div className="promo-plato-fondo__header">
                          <h4 className="promo-plato-fondo__title">Platos de fondo a elección</h4>
                          {creatingPlatoFondoFor !== promo.id && (
                            <button
                              type="button"
                              className="btn btn--secondary btn--sm"
                              onClick={() => {
                                setCreatingPlatoFondoFor(promo.id);
                                setPlatoFondoCreateForm(emptyPlatoFondoForm);
                                setEditingPlatoFondoId(null);
                              }}
                              disabled={saving}
                            >
                              + Agregar plato
                            </button>
                          )}
                        </div>

                        {creatingPlatoFondoFor === promo.id && (
                          <div className="promo-plato-fondo__form">
                            <label>
                              Nombre del plato
                              <input
                                type="text"
                                value={platoFondoCreateForm.name}
                                onChange={(e) =>
                                  setPlatoFondoCreateForm((prev) => ({ ...prev, name: e.target.value }))
                                }
                                placeholder="Ej. ¼ Parrilla de pollo"
                              />
                            </label>
                            <div className="promo-plato-fondo__form-actions">
                              <button
                                type="button"
                                className="btn btn--secondary btn--sm"
                                onClick={() => savePlatoFondoCreate(promo.id)}
                                disabled={saving || !platoFondoCreateForm.name.trim()}
                              >
                                Guardar
                              </button>
                              <button
                                type="button"
                                className="btn btn--ghost btn--sm"
                                onClick={() => {
                                  setCreatingPlatoFondoFor(null);
                                  setPlatoFondoCreateForm(emptyPlatoFondoForm);
                                }}
                                disabled={saving}
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}

                        <ul className="promo-plato-fondo__list">
                          {(promo.platoFondoOptions ?? []).map((item, index) =>
                            editingPlatoFondoId === item.id ? (
                              <li key={item.id} className="promo-plato-fondo__item promo-plato-fondo__item--editing">
                                <label>
                                  Editar plato
                                  <input
                                    type="text"
                                    value={platoFondoEditForm.name}
                                    onChange={(e) =>
                                      setPlatoFondoEditForm((prev) => ({ ...prev, name: e.target.value }))
                                    }
                                  />
                                </label>
                                <div className="promo-plato-fondo__form-actions">
                                  <button
                                    type="button"
                                    className="btn btn--secondary btn--sm"
                                    onClick={savePlatoFondoEdit}
                                    disabled={saving || !platoFondoEditForm.name.trim()}
                                  >
                                    Guardar
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn--ghost btn--sm"
                                    onClick={() => setEditingPlatoFondoId(null)}
                                    disabled={saving}
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </li>
                            ) : (
                              <li
                                key={item.id}
                                className={`promo-plato-fondo__item${!item.active ? ' promo-plato-fondo__item--inactive' : ''}`}
                              >
                                <span>
                                  {String.fromCharCode(97 + index)}) {item.name}
                                </span>
                                <div className="promo-plato-fondo__item-actions">
                                  <button
                                    type="button"
                                    className="icon-btn"
                                    aria-label={`Editar ${item.name}`}
                                    title="Editar"
                                    onClick={() => startPlatoFondoEdit(item)}
                                    disabled={saving}
                                  >
                                    <IconEdit />
                                  </button>
                                  <button
                                    type="button"
                                    className="icon-btn icon-btn--danger"
                                    aria-label={`Eliminar ${item.name}`}
                                    title="Eliminar"
                                    onClick={() => removePlatoFondo(item)}
                                    disabled={saving}
                                  >
                                    <IconTrash />
                                  </button>
                                </div>
                              </li>
                            )
                          )}
                        </ul>

                        {!promo.platoFondoOptions?.length && creatingPlatoFondoFor !== promo.id && (
                          <p className="form-hint">
                            Sin platos registrados. Agrégalos para que aparezcan en el formulario de reservas.
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </article>
          );
        })}

        {!packages.length && !showCreate && (
          <p className="form-hint">No hay paquetes promocionales. Crea el primero con el botón superior.</p>
        )}
      </div>

      <section className="promo-extras panel">
        <div className="panel__header">
          <div>
            <h3>Entradas, sopas y postres adicionales</h3>
            <p className="form-hint">
              {optionalItems.length} ítem(s) · Ud. puede organizar su propio paquete agregando ítems del tarifario promocional 2026.
            </p>
          </div>
          {!showOptionalCreate && (
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => setShowOptionalCreate(true)}
              disabled={saving}
            >
              + Agregar ítem
            </button>
          )}
        </div>

        {showOptionalCreate && (
          <div className="promo-extras__create">
            <PromoOptionalItemForm
              form={optionalCreateForm}
              setForm={setOptionalCreateForm}
              onSave={saveOptionalCreate}
              onCancel={() => {
                setShowOptionalCreate(false);
                setOptionalCreateForm(emptyOptionalItemForm);
              }}
              saving={saving}
              saveLabel="Crear ítem"
            />
          </div>
        )}

        <ul className="promo-extras__list">
          {optionalItems.map((item) =>
            editingOptionalId === item.id ? (
              <li key={item.id} className="promo-extras__item promo-extras__item--editing">
                <PromoOptionalItemForm
                  form={optionalEditForm}
                  setForm={setOptionalEditForm}
                  onSave={saveOptionalEdit}
                  onCancel={() => setEditingOptionalId(null)}
                  saving={saving}
                />
              </li>
            ) : (
              <li key={item.id} className={`promo-extras__item${!item.active ? ' promo-extras__item--inactive' : ''}`}>
                <span>{item.name}</span>
                <div className="promo-extras__item-actions">
                  <strong>{formatCurrency(item.price)}</strong>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Editar ${item.name}`}
                    title="Editar"
                    onClick={() => startOptionalEdit(item)}
                    disabled={saving}
                  >
                    <IconEdit />
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn--danger"
                    aria-label={`Eliminar ${item.name}`}
                    title="Eliminar"
                    onClick={() => removeOptionalItem(item)}
                    disabled={saving}
                  >
                    <IconTrash />
                  </button>
                </div>
              </li>
            )
          )}
        </ul>

        {!optionalItems.length && !showOptionalCreate && (
          <p className="form-hint">No hay ítems adicionales. Agrega el primero con el botón superior.</p>
        )}
      </section>
    </section>
  );
}
