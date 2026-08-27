import { useCallback, useEffect, useState } from 'react';
import { createLocal, deleteLocal, fetchLocals, updateLocal } from '../../api/admin';
import { useAuth } from '../../context/AuthContext';
import FormModal from '../shared/FormModal';

const EMPTY_FORM = {
  name: '',
  capacity: '100',
  baseRentalPrice: '0',
  address: '',
  description: '',
  ownerName: '',
  ownerDni: '',
  phones: '',
  bannerPath: '',
  extensionPerHour: '0',
  packageIncludes: '',
  decorationBiombo: '',
  decorationTematico: '',
  decorationExtras: '',
  extrasTerms: '',
};

function toForm(local) {
  return {
    name: local.name,
    capacity: String(local.capacity ?? ''),
    baseRentalPrice: String(local.base_rental_price ?? 0),
    address: local.address ?? '',
    description: local.description ?? '',
    ownerName: local.ownerName ?? '',
    ownerDni: local.ownerDni ?? '',
    phones: (local.phones ?? []).join(', '),
    bannerPath: local.bannerPath ?? '',
    extensionPerHour: String(local.extensionPerHour ?? 0),
    packageIncludes: (local.packageIncludes ?? []).join('\n'),
    decorationBiombo: local.decoration?.biombo ?? '',
    decorationTematico: local.decoration?.tematico ?? '',
    decorationExtras: local.decoration?.extras ?? '',
    extrasTerms: local.extrasTerms ?? '',
  };
}

export default function LocalsPanel() {
  const { refreshLocals } = useAuth();
  const [locals, setLocals] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setLocals(await fetchLocals());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateField = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const closeModal = () => {
    setOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setOpen(true);
  };

  const openEdit = (local) => {
    setEditingId(local.id);
    setForm(toForm(local));
    setError(null);
    setOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      if (editingId) {
        await updateLocal(editingId, form);
        setMessage(`Local "${form.name}" actualizado.`);
      } else {
        await createLocal(form);
        setMessage(`Local "${form.name}" creado con sus catálogos iniciales.`);
      }

      closeModal();
      await load();
      await refreshLocals();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const runAction = async (action) => {
    setError(null);
    setMessage(null);

    try {
      await action();
      await load();
      await refreshLocals();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleActive = (local) =>
    runAction(() => updateLocal(local.id, { active: !local.active }));

  const handleDelete = (local) => {
    if (!window.confirm(`¿Eliminar el local "${local.name}" y sus catálogos?`)) return;
    return runAction(() => deleteLocal(local.id));
  };

  return (
    <div className="admin-grid">
      <section className="panel">
        <div className="panel__header">
          <div>
            <h2>Locales de la empresa</h2>
            <p className="panel__subtitle">{locals.length} locales</p>
          </div>
          <button type="button" className="btn btn--primary" onClick={openCreate}>
            Nuevo local
          </button>
        </div>

        {(error && !open) || message ? (
          <div className={`alert ${error && !open ? 'alert--error' : 'alert--success'}`}>
            {error && !open ? error : message}
          </div>
        ) : null}

        {loading ? (
          <div className="loading">Cargando…</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Local</th>
                <th>Aforo</th>
                <th>Estado</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {locals.map((local) => (
                <tr key={local.id}>
                  <td>
                    {local.name}
                    {local.address && <span className="admin-table__hint">{local.address}</span>}
                  </td>
                  <td>{local.capacity}</td>
                  <td>
                    <span className={`pill ${local.active ? 'pill--on' : 'pill--off'}`}>
                      {local.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="admin-table__actions">
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => openEdit(local)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => handleToggleActive(local)}
                    >
                      {local.active ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger btn--sm"
                      onClick={() => handleDelete(local)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {open && (
        <FormModal
          title={editingId ? 'Editar local' : 'Nuevo local'}
          subtitle="Estos datos alimentan los contratos y documentos del local."
          onClose={closeModal}
          wide
        >
          {error && <div className="alert alert--error">{error}</div>}

          <form className="admin-form" onSubmit={handleSubmit}>
            <label>
              Nombre del local
              <input value={form.name} onChange={updateField('name')} required autoFocus />
            </label>

            <div className="admin-form__row">
              <label>
                Aforo
                <input
                  type="number"
                  min="1"
                  value={form.capacity}
                  onChange={updateField('capacity')}
                />
              </label>

              <label>
                Alquiler base (S/.)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.baseRentalPrice}
                  onChange={updateField('baseRentalPrice')}
                />
              </label>
            </div>

            <label>
              Dirección
              <input value={form.address} onChange={updateField('address')} />
            </label>

            <label>
              Descripción
              <textarea rows={2} value={form.description} onChange={updateField('description')} />
            </label>

            <div className="admin-form__row">
              <label>
                Titular del contrato
                <input value={form.ownerName} onChange={updateField('ownerName')} />
              </label>

              <label>
                DNI del titular
                <input value={form.ownerDni} onChange={updateField('ownerDni')} />
              </label>
            </div>

            <label>
              Teléfonos (separados por coma)
              <input value={form.phones} onChange={updateField('phones')} />
            </label>

            <div className="admin-form__row">
              <label>
                Hora de extensión (S/.)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.extensionPerHour}
                  onChange={updateField('extensionPerHour')}
                />
              </label>

              <label>
                Ruta del banner
                <input
                  value={form.bannerPath}
                  onChange={updateField('bannerPath')}
                  placeholder="/banner-jazmines.png"
                />
              </label>
            </div>

            <label>
              El paquete incluye (una línea por ítem)
              <textarea
                rows={5}
                value={form.packageIncludes}
                onChange={updateField('packageIncludes')}
              />
            </label>

            <label>
              Biombo
              <input value={form.decorationBiombo} onChange={updateField('decorationBiombo')} />
            </label>

            <label>
              Biombo temático
              <input value={form.decorationTematico} onChange={updateField('decorationTematico')} />
            </label>

            <label>
              Extras de decoración
              <input value={form.decorationExtras} onChange={updateField('decorationExtras')} />
            </label>

            <label>
              Disposiciones extras del contrato
              <textarea rows={4} value={form.extrasTerms} onChange={updateField('extrasTerms')} />
            </label>

            <div className="admin-form__actions">
              <button type="button" className="btn btn--ghost" onClick={closeModal}>
                Cancelar
              </button>
              <button type="submit" className="btn btn--primary" disabled={submitting}>
                {submitting ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear local'}
              </button>
            </div>
          </form>
        </FormModal>
      )}
    </div>
  );
}
