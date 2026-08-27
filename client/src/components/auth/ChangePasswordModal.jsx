import { useState } from 'react';
import { changePassword } from '../../api/admin';
import FormModal from '../shared/FormModal';

const EMPTY = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

export default function ChangePasswordModal({ onClose, onSuccess }) {
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const updateField = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (form.newPassword !== form.confirmPassword) {
      setError('La confirmación no coincide con la nueva contraseña.');
      return;
    }

    setSubmitting(true);
    try {
      await changePassword(form.currentPassword, form.newPassword);
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormModal title="Cambiar contraseña" subtitle="Usa tu clave actual para definir una nueva." onClose={onClose}>
      {error && (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      )}

      <form className="admin-form" onSubmit={handleSubmit}>
        <label>
          Contraseña actual
          <input
            type="password"
            value={form.currentPassword}
            onChange={updateField('currentPassword')}
            autoComplete="current-password"
            required
            autoFocus
          />
        </label>

        <label>
          Nueva contraseña
          <input
            type="password"
            value={form.newPassword}
            onChange={updateField('newPassword')}
            autoComplete="new-password"
            minLength={6}
            required
          />
        </label>

        <label>
          Confirmar nueva contraseña
          <input
            type="password"
            value={form.confirmPassword}
            onChange={updateField('confirmPassword')}
            autoComplete="new-password"
            minLength={6}
            required
          />
        </label>

        <div className="admin-form__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? 'Guardando…' : 'Actualizar contraseña'}
          </button>
        </div>
      </form>
    </FormModal>
  );
}
