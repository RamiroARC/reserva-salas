import { useState } from 'react';
import {
  createPackageIncludeItem,
  deletePackageIncludeItem,
  updatePackageIncludeItem,
} from '../../api';
import CollapsibleUtilitySection from './CollapsibleUtilitySection';

const emptyForm = {
  content: '',
  description: '',
  active: true,
};

function IconEdit() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
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

export default function PackageIncludesManager({ items, onRefresh }) {
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const activeCount = items.filter((item) => item.active).length;

  const saveCreate = async () => {
    if (!createForm.content.trim()) return;

    setSaving(true);
    try {
      await createPackageIncludeItem({
        content: createForm.content.trim(),
        description: createForm.description.trim(),
        active: createForm.active,
      });
      setShowCreate(false);
      setCreateForm(emptyForm);
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditForm({
      content: item.content,
      description: item.description ?? '',
      active: item.active !== false,
    });
    setShowCreate(false);
  };

  const saveEdit = async () => {
    if (!editingId || !editForm.content.trim()) return;

    setSaving(true);
    try {
      await updatePackageIncludeItem(editingId, {
        content: editForm.content.trim(),
        description: editForm.description.trim(),
        active: editForm.active,
      });
      setEditingId(null);
      setEditForm(emptyForm);
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item) => {
    setSaving(true);
    try {
      await updatePackageIncludeItem(item.id, {
        content: item.content,
        description: item.description ?? '',
        active: !item.active,
      });
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const removeItem = async (item) => {
    if (!window.confirm('¿Eliminar este ítem del paquete incluye?')) return;

    setSaving(true);
    try {
      await deletePackageIncludeItem(item.id);
      if (editingId === item.id) {
        setEditingId(null);
        setEditForm(emptyForm);
      }
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const renderForm = (form, setForm, onSave, onCancel, saveLabel) => (
    <div className="contract-extra-terms-form">
      <label>
        Ítem para el contrato
        <input
          type="text"
          value={form.content}
          onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
          placeholder="Ej. Local decorado por 08 horas"
        />
      </label>
      <label>
        Descripción breve (solo referencia interna)
        <textarea
          rows={2}
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Nota opcional para identificar el ítem en utilitarios"
        />
      </label>
      <label className="checkbox-inline">
        <input
          type="checkbox"
          checked={form.active}
          onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
        />
        Activo (se imprime en el contrato)
      </label>
      <div className="contract-extra-terms-form__actions">
        <button
          type="button"
          className="btn btn--secondary btn--sm"
          onClick={onSave}
          disabled={saving || !form.content.trim()}
        >
          {saveLabel}
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel} disabled={saving}>
          Cancelar
        </button>
      </div>
    </div>
  );

  return (
    <CollapsibleUtilitySection
      className="contract-extra-terms-panel"
      title="Paquete incluye"
      hint={`Ítems que aparecen en contratos bajo «Paquete incluye». Solo los activos se imprimen. ${items.length} ítem(s) · ${activeCount} activo(s).`}
      keepOpen={showCreate || Boolean(editingId)}
      actions={
        !showCreate && !editingId ? (
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={() => setShowCreate(true)}
            disabled={saving}
          >
            + Nuevo ítem
          </button>
        ) : null
      }
    >
      {showCreate &&
        renderForm(
          createForm,
          setCreateForm,
          saveCreate,
          () => {
            setShowCreate(false);
            setCreateForm(emptyForm);
          },
          'Guardar'
        )}

      <ul className="contract-extra-terms-list">
        {items.map((item) => {
          const isEditing = editingId === item.id;

          return (
            <li
              key={item.id}
              className={`contract-extra-terms-list__item${!item.active ? ' package-includes-list__item--inactive' : ''}`}
            >
              {isEditing ? (
                renderForm(
                  editForm,
                  setEditForm,
                  saveEdit,
                  () => {
                    setEditingId(null);
                    setEditForm(emptyForm);
                  },
                  'Guardar cambios'
                )
              ) : (
                <>
                  <div className="package-includes-list__content">
                    <p className="contract-extra-terms-list__text">{item.content}</p>
                    {item.description?.trim() ? (
                      <p className="package-includes-list__description">{item.description}</p>
                    ) : null}
                    <span className={`tag ${item.active ? 'tag--promo' : ''}`}>
                      {item.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <div className="contract-extra-terms-list__actions">
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => toggleActive(item)}
                      disabled={saving}
                    >
                      {item.active ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label="Editar ítem"
                      title="Editar"
                      onClick={() => startEdit(item)}
                      disabled={saving}
                    >
                      <IconEdit />
                    </button>
                    <button
                      type="button"
                      className="icon-btn icon-btn--danger"
                      aria-label="Eliminar ítem"
                      title="Eliminar"
                      onClick={() => removeItem(item)}
                      disabled={saving}
                    >
                      <IconTrash />
                    </button>
                  </div>
                </>
              )}
            </li>
          );
        })}
      </ul>

      {!items.length && !showCreate && (
        <p className="form-hint">
          No hay ítems registrados. Agrega los puntos que deben aparecer en el contrato.
        </p>
      )}
    </CollapsibleUtilitySection>
  );
}
