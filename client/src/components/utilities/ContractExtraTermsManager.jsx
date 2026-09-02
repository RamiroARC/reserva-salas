import { useState } from 'react';
import {
  createContractExtraTerm,
  deleteContractExtraTerm,
  updateContractExtraTerm,
} from '../../api';
import CollapsibleUtilitySection from './CollapsibleUtilitySection';

const emptyForm = {
  content: '',
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

export default function ContractExtraTermsManager({ terms, onRefresh }) {
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const saveCreate = async () => {
    if (!createForm.content.trim()) return;

    setSaving(true);
    try {
      await createContractExtraTerm({ content: createForm.content.trim() });
      setShowCreate(false);
      setCreateForm(emptyForm);
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (term) => {
    setEditingId(term.id);
    setEditForm({ content: term.content });
    setShowCreate(false);
  };

  const saveEdit = async () => {
    if (!editingId || !editForm.content.trim()) return;

    setSaving(true);
    try {
      await updateContractExtraTerm(editingId, { content: editForm.content.trim() });
      setEditingId(null);
      setEditForm(emptyForm);
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const removeTerm = async (term) => {
    if (!window.confirm('¿Eliminar esta disposición extra del contrato?')) return;

    setSaving(true);
    try {
      await deleteContractExtraTerm(term.id);
      if (editingId === term.id) {
        setEditingId(null);
        setEditForm(emptyForm);
      }
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <CollapsibleUtilitySection
      className="contract-extra-terms-panel"
      title="Disposiciones extras"
      hint={`Texto que aparece en cotizaciones y contratos bajo «Disposiciones extras». ${terms.length} párrafo(s) registrado(s).`}
      keepOpen={showCreate || Boolean(editingId)}
      actions={
        !showCreate && !editingId ? (
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={() => setShowCreate(true)}
            disabled={saving}
          >
            + Nueva disposición
          </button>
        ) : null
      }
    >
      {showCreate && (
        <div className="contract-extra-terms-form">
          <label>
            Texto de la disposición
            <textarea
              rows={5}
              value={createForm.content}
              onChange={(e) => setCreateForm({ content: e.target.value })}
              placeholder="Escribe el párrafo que se imprimirá en contratos…"
            />
          </label>
          <div className="contract-extra-terms-form__actions">
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={saveCreate}
              disabled={saving || !createForm.content.trim()}
            >
              Guardar
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={() => {
                setShowCreate(false);
                setCreateForm(emptyForm);
              }}
              disabled={saving}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      <ul className="contract-extra-terms-list">
        {terms.map((term) => {
          const isEditing = editingId === term.id;

          return (
            <li key={term.id} className="contract-extra-terms-list__item">
              {isEditing ? (
                <div className="contract-extra-terms-form contract-extra-terms-form--inline">
                  <label>
                    Editar disposición
                    <textarea
                      rows={5}
                      value={editForm.content}
                      onChange={(e) => setEditForm({ content: e.target.value })}
                    />
                  </label>
                  <div className="contract-extra-terms-form__actions">
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={saveEdit}
                      disabled={saving || !editForm.content.trim()}
                    >
                      Guardar cambios
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => {
                        setEditingId(null);
                        setEditForm(emptyForm);
                      }}
                      disabled={saving}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="contract-extra-terms-list__text">{term.content}</p>
                  <div className="contract-extra-terms-list__actions">
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label="Editar disposición"
                      title="Editar"
                      onClick={() => startEdit(term)}
                      disabled={saving}
                    >
                      <IconEdit />
                    </button>
                    <button
                      type="button"
                      className="icon-btn icon-btn--danger"
                      aria-label="Eliminar disposición"
                      title="Eliminar"
                      onClick={() => removeTerm(term)}
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

      {!terms.length && !showCreate && (
        <p className="form-hint">
          No hay disposiciones registradas. Agrega el texto que debe aparecer en contratos.
        </p>
      )}
    </CollapsibleUtilitySection>
  );
}
