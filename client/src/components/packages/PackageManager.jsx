import { useState } from 'react';
import { createPlate, deletePlate, formatCurrency, updatePackage, updatePlate } from '../../api';
import { isPlatoFondoCategory } from '../../constants/packageMenu';

const DECORATION_SECTION = {
  category: 'decoracion',
  label: 'Decoración del local',
  priceSuffix: '',
};

const MENU_SECTIONS = [
  DECORATION_SECTION,
  { category: 'plato_fondo', label: 'Platos de fondo', priceSuffix: '/persona' },
  { category: 'entrada', label: 'Entradas', priceSuffix: '/persona' },
  { category: 'bebida', label: 'Bebidas', priceSuffix: '/persona' },
  { category: 'postre', label: 'Helados y postres', priceSuffix: '/persona' },
];

const PACKAGE_MENU_SECTIONS = MENU_SECTIONS.filter(
  (section) => section.category !== 'decoracion'
);

const emptyItemForm = { name: '', description: '', price: '0' };

function sectionKey(packageId, category) {
  return `${packageId}:${category}`;
}

function formatPlatePrice(plate, suffix, category) {
  const pricePrimary = ['decoracion', 'plato_fondo', 'entrada', 'postre', 'bebida'].includes(category);

  if (pricePrimary) {
    if (category === 'bebida' && !plate.price_per_plate && plate.description) {
      return plate.description;
    }
    return `${formatCurrency(plate.price_per_plate ?? 0)}${suffix}`;
  }

  if (plate.description) {
    return plate.description;
  }
  if (plate.price_per_plate > 0) {
    return `${formatCurrency(plate.price_per_plate)}${suffix}`;
  }
  return 'Incluido / oferta';
}

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

export default function PackageManager({ packages, seasons, onRefresh }) {
  const [expandedPackages, setExpandedPackages] = useState(() => new Set());
  const [expandedSections, setExpandedSections] = useState(() => new Set());
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyItemForm);
  const [addingKey, setAddingKey] = useState(null);
  const [newItem, setNewItem] = useState(emptyItemForm);
  const [editingRentalPackageId, setEditingRentalPackageId] = useState(null);
  const [rentalPriceForm, setRentalPriceForm] = useState('');
  const [saving, setSaving] = useState(false);

  const togglePackage = (packageId) => {
    setExpandedPackages((prev) => {
      const next = new Set(prev);
      if (next.has(packageId)) next.delete(packageId);
      else next.add(packageId);
      return next;
    });
  };

  const toggleSection = (key) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const startEdit = (plate) => {
    setAddingKey(null);
    setEditingId(plate.id);
    setEditForm({
      name: plate.name,
      description: plate.description ?? '',
      price: String(plate.price_per_plate ?? 0),
    });
  };

  const startAdd = (packageId, category) => {
    setEditingId(null);
    setExpandedPackages((prev) => new Set(prev).add(packageId));
    setExpandedSections((prev) => new Set(prev).add(sectionKey(packageId, category)));
    setAddingKey(sectionKey(packageId, category));
    setNewItem(emptyItemForm);
  };

  const savePlate = async (plateId) => {
    if (!editForm.name.trim()) return;

    setSaving(true);
    try {
      await updatePlate(plateId, {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        pricePerPlate: Number(editForm.price) || 0,
      });
      setEditingId(null);
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const removePlate = async (plate) => {
    if (!window.confirm(`¿Eliminar "${plate.name}"?`)) return;

    setSaving(true);
    try {
      await deletePlate(plate.id);
      if (editingId === plate.id) setEditingId(null);
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const saveNewItem = async (packageId, category) => {
    if (!newItem.name.trim()) return;

    setSaving(true);
    try {
      await createPlate({
        packageId,
        category,
        name: newItem.name.trim(),
        description: newItem.description.trim(),
        pricePerPlate: Number(newItem.price) || 0,
      });
      setAddingKey(null);
      setNewItem(emptyItemForm);
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const startEditRentalPrice = (pkg) => {
    setEditingRentalPackageId(pkg.id);
    setRentalPriceForm(String(pkg.rental_price ?? 0));
  };

  const saveRentalPrice = async (packageId) => {
    const price = Number(rentalPriceForm);
    if (Number.isNaN(price) || price < 0) return;

    setSaving(true);
    try {
      await updatePackage(packageId, { rentalPrice: price });
      setEditingRentalPackageId(null);
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const renderItemForm = (form, setForm, onSave, onCancel, saveDisabled) => (
    <div className="plate-add">
      <input
        type="text"
        name="plate-name"
        placeholder="Nombre"
        value={form.name}
        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
      />
      <input
        type="text"
        name="plate-description"
        placeholder="Descripción"
        value={form.description}
        onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
      />
      <input
        type="number"
        min="0"
        step="0.01"
        placeholder="Precio"
        value={form.price}
        onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
      />
      <button
        type="button"
        className="btn btn--secondary btn--sm"
        onClick={onSave}
        disabled={saving || saveDisabled}
      >
        Guardar
      </button>
      <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel} disabled={saving}>
        Cancelar
      </button>
    </div>
  );

  const decoracionPackage = packages.find((pkg) => pkg.type === 'solo_alquiler') ?? packages[0];
  const decoracionPlates =
    decoracionPackage?.plates?.filter((plate) => plate.category === 'decoracion') ?? [];

  const renderMenuSection = (packageId, section, plates) => {
    const addKey = sectionKey(packageId, section.category);
    const isAdding = addingKey === addKey;
    const isSectionExpanded = expandedSections.has(addKey);

    const isPlatoFondoSection = isPlatoFondoCategory(section.category);

    return (
      <div
        key={`${packageId}-${section.category}`}
        className={`plate-list ${isSectionExpanded ? '' : 'plate-list--collapsed'}${
          isPlatoFondoSection ? ' plate-list--plato-fondo' : ''
        }`}
      >
        <div className="plate-list__header">
          <button
            type="button"
            className="plate-list__toggle"
            onClick={() => toggleSection(addKey)}
            aria-expanded={isSectionExpanded}
          >
            <IconChevron open={isSectionExpanded} />
            <h4>{section.label}</h4>
            {isPlatoFondoSection && (
              <span className="item-badge item-badge--plato-fondo">Plato de fondo</span>
            )}
            <span className="plate-list__count">{plates.length}</span>
          </button>
          {!isAdding && (
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => startAdd(packageId, section.category)}
            >
              + Agregar ítem
            </button>
          )}
        </div>

        {isSectionExpanded && (
          <div className="plate-list__body">
            {plates.map((plate) =>
              editingId === plate.id ? (
                <div
                  key={plate.id}
                  className={`plate-row plate-row--editing${
                    isPlatoFondoSection ? ' plate-row--plato-fondo' : ''
                  }`}
                >
                  {renderItemForm(
                    editForm,
                    setEditForm,
                    () => savePlate(plate.id),
                    () => setEditingId(null),
                    !editForm.name.trim()
                  )}
                </div>
              ) : (
                <div
                  key={plate.id}
                  className={`plate-row${isPlatoFondoSection ? ' plate-row--plato-fondo' : ''}`}
                >
                  <div className="plate-row__info">
                    <strong>{plate.name}</strong>
                    {plate.description ? (
                      <span className="plate-row__desc">{plate.description}</span>
                    ) : null}
                  </div>
                  <div className="plate-row__actions">
                    <span className="plate-price plate-price--static">
                      {formatPlatePrice(plate, section.priceSuffix, section.category)}
                    </span>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Editar ${plate.name}`}
                      title="Editar"
                      onClick={() => startEdit(plate)}
                      disabled={saving}
                    >
                      <IconEdit />
                    </button>
                    <button
                      type="button"
                      className="icon-btn icon-btn--danger"
                      aria-label={`Eliminar ${plate.name}`}
                      title="Eliminar"
                      onClick={() => removePlate(plate)}
                      disabled={saving}
                    >
                      <IconTrash />
                    </button>
                  </div>
                </div>
              )
            )}

            {isAdding &&
              renderItemForm(
                newItem,
                setNewItem,
                () => saveNewItem(packageId, section.category),
                () => setAddingKey(null),
                !newItem.name.trim()
              )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="packages-layout">
      <section className="panel">
        <div className="panel__header">
          <h2>Paquetes y menús</h2>
        </div>

        {decoracionPackage && (
          <article className="package-card package-card--shared">
            <div className="package-card__shared-header">
              <strong className="package-card__title package-card__title--rental">
                {DECORATION_SECTION.label}
              </strong>
              <span className="tag tag--rental">Solo local y Con banquete</span>
            </div>
            <p className="form-hint package-card__shared-note">
              Catálogo único de decoración para ambos tipos de paquete.
            </p>
            {renderMenuSection(decoracionPackage.id, DECORATION_SECTION, decoracionPlates)}
          </article>
        )}

        <div className="package-grid">
          {packages.map((pkg) => {
            const isExpanded = expandedPackages.has(pkg.id);

            return (
            <article
              key={pkg.id}
              className={`package-card ${isExpanded ? '' : 'package-card--collapsed'}`}
            >
              <button
                type="button"
                className="package-card__header package-card__toggle"
                onClick={() => togglePackage(pkg.id)}
                aria-expanded={isExpanded}
              >
                <IconChevron open={isExpanded} />
                <strong
                  className={`package-card__title ${pkg.type === 'solo_alquiler' ? 'package-card__title--rental' : 'package-card__title--food'}`}
                >
                  {pkg.name}
                </strong>
                <span className={`tag ${pkg.type === 'solo_alquiler' ? 'tag--rental' : 'tag--food'}`}>
                  {pkg.type === 'solo_alquiler' ? 'Solo alquiler' : 'Alquiler + comida'}
                </span>
              </button>

              {!isExpanded ? null : (
              <div className="package-card__body">
              <p>{pkg.description}</p>
              {pkg.type === 'solo_alquiler' ? (
                <div className="package-rental-price">
                  {editingRentalPackageId === pkg.id ? (
                    <div className="package-rental-price__form">
                      <label htmlFor={`rental-price-${pkg.id}`}>Costo de alquiler del local (S/.)</label>
                      <input
                        id={`rental-price-${pkg.id}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={rentalPriceForm}
                        onChange={(e) => setRentalPriceForm(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn--secondary btn--sm"
                        onClick={() => saveRentalPrice(pkg.id)}
                        disabled={saving}
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        onClick={() => setEditingRentalPackageId(null)}
                        disabled={saving}
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="package-rental-price__row">
                      <p className="package-card__price">
                        Costo de alquiler del local: {formatCurrency(pkg.rental_price ?? 0)}
                      </p>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label="Editar costo de alquiler"
                        title="Editar costo"
                        onClick={() => startEditRentalPrice(pkg)}
                        disabled={saving}
                      >
                        <IconEdit />
                      </button>
                    </div>
                  )}
                </div>
              ) : pkg.rental_price > 0 ? (
                <p className="package-card__price">
                  Alquiler base del paquete: {formatCurrency(pkg.rental_price)}
                </p>
              ) : null}

              {PACKAGE_MENU_SECTIONS.map((section) => {
                if (!pkg.includes_food) return null;

                const plates = pkg.plates.filter(
                  (plate) =>
                    section.category === 'plato_fondo'
                      ? plate.category === 'plato_fondo' || !plate.category
                      : plate.category === section.category
                );

                return renderMenuSection(pkg.id, section, plates);
              })}
              </div>
              )}
            </article>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <h2>Temporadas</h2>
        </div>
        <p className="form-hint">
          Los multiplicadores se aplican al costo de alquiler según el mes del evento.
        </p>
        <div className="season-list">
          {seasons.map((season) => (
            <div key={season.id} className="season-row">
              <div>
                <strong>{season.name}</strong>
                <span>
                  Meses {season.month_start} – {season.month_end}
                </span>
              </div>
              <span className={`season-multiplier ${season.multiplier > 1 ? 'season-multiplier--high' : season.multiplier < 1 ? 'season-multiplier--low' : ''}`}>
                ×{season.multiplier}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
