import { useCallback, useEffect, useState } from 'react';
import { createUser, deleteUser, fetchUsers, updateUser } from '../../api/admin';
import { useAuth } from '../../context/AuthContext';
import FormModal from '../shared/FormModal';

const EMPTY_FORM = { username: '', fullName: '', password: '', role: 'usuario' };

const ROLE_LABELS = {
  admin: 'Administrador',
  usuario: 'Usuario',
};

export default function UsersPanel() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [open, setOpen] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await fetchUsers());
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

  const closeCreate = () => {
    setOpen(false);
    setForm(EMPTY_FORM);
  };

  const closePassword = () => {
    setPasswordTarget(null);
    setNewPassword('');
  };

  const updateField = (field) => (event) =>
    setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const handleCreate = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      await createUser(form);
      setMessage(`Usuario "${form.username}" creado.`);
      closeCreate();
      await load();
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
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleActive = (target) =>
    runAction(() => updateUser(target.id, { active: !target.active }));

  const handleChangeRole = (target, role) => runAction(() => updateUser(target.id, { role }));

  const handleResetPassword = async (event) => {
    event.preventDefault();
    if (!passwordTarget) return;

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      await updateUser(passwordTarget.id, { password: newPassword });
      setMessage(`Contraseña de "${passwordTarget.username}" actualizada.`);
      closePassword();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (target) => {
    if (!window.confirm(`¿Eliminar al usuario "${target.username}"?`)) return;
    return runAction(() => deleteUser(target.id));
  };

  const modalOpen = open || Boolean(passwordTarget);

  return (
    <div className="admin-grid">
      <section className="panel">
        <div className="panel__header">
          <div>
            <h2>Usuarios de la empresa</h2>
            <p className="panel__subtitle">{users.length} usuarios</p>
          </div>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => {
              setForm(EMPTY_FORM);
              setError(null);
              setOpen(true);
            }}
          >
            Nuevo usuario
          </button>
        </div>

        {(error && !modalOpen) || message ? (
          <div className={`alert ${error && !modalOpen ? 'alert--error' : 'alert--success'}`}>
            {error && !modalOpen ? error : message}
          </div>
        ) : null}

        {loading ? (
          <div className="loading">Cargando…</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Nombre</th>
                <th>Rol</th>
                <th>Estado</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {users.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.username}
                    {item.id === currentUser?.id && <span className="pill pill--soft">tú</span>}
                  </td>
                  <td>{item.fullName || '—'}</td>
                  <td>
                    <select
                      value={item.role}
                      onChange={(e) => handleChangeRole(item, e.target.value)}
                      disabled={item.id === currentUser?.id}
                    >
                      {Object.entries(ROLE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span className={`pill ${item.active ? 'pill--on' : 'pill--off'}`}>
                      {item.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="admin-table__actions">
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => {
                        setError(null);
                        setNewPassword('');
                        setPasswordTarget(item);
                      }}
                    >
                      Contraseña
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => handleToggleActive(item)}
                      disabled={item.id === currentUser?.id}
                    >
                      {item.active ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger btn--sm"
                      onClick={() => handleDelete(item)}
                      disabled={item.id === currentUser?.id}
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
          title="Nuevo usuario"
          subtitle="Los usuarios acceden a todos los locales de la empresa."
          onClose={closeCreate}
        >
          {error && <div className="alert alert--error">{error}</div>}

          <form className="admin-form" onSubmit={handleCreate}>
            <label>
              Usuario
              <input value={form.username} onChange={updateField('username')} required autoFocus />
            </label>

            <label>
              Nombre completo
              <input value={form.fullName} onChange={updateField('fullName')} />
            </label>

            <label>
              Contraseña
              <input
                type="password"
                value={form.password}
                onChange={updateField('password')}
                minLength={6}
                required
              />
            </label>

            <label>
              Rol
              <select value={form.role} onChange={updateField('role')}>
                <option value="usuario">Usuario</option>
                <option value="admin">Administrador</option>
              </select>
            </label>

            <div className="admin-form__actions">
              <button type="button" className="btn btn--ghost" onClick={closeCreate}>
                Cancelar
              </button>
              <button type="submit" className="btn btn--primary" disabled={submitting}>
                {submitting ? 'Creando…' : 'Crear usuario'}
              </button>
            </div>
          </form>
        </FormModal>
      )}

      {passwordTarget && (
        <FormModal
          title="Cambiar contraseña"
          subtitle={`Nueva clave para "${passwordTarget.username}".`}
          onClose={closePassword}
        >
          {error && <div className="alert alert--error">{error}</div>}

          <form className="admin-form" onSubmit={handleResetPassword}>
            <label>
              Nueva contraseña
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                minLength={6}
                required
                autoFocus
              />
            </label>

            <div className="admin-form__actions">
              <button type="button" className="btn btn--ghost" onClick={closePassword}>
                Cancelar
              </button>
              <button type="submit" className="btn btn--primary" disabled={submitting}>
                {submitting ? 'Guardando…' : 'Actualizar contraseña'}
              </button>
            </div>
          </form>
        </FormModal>
      )}
    </div>
  );
}
