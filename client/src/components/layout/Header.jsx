import { useState } from 'react';
import { APP_NAME } from '../../constants/app';
import { useAuth } from '../../context/AuthContext';
import { IconButton, ThemeSwitch } from '../../design-system';
import ChangePasswordModal from '../auth/ChangePasswordModal';
import AccessLogo from './AccessLogo';

const ROLE_LABELS = {
  superadmin: 'Superadministrador',
  admin: 'Administrador',
  usuario: 'Usuario',
};

export default function Header() {
  const { user, locals, localId, activeLocal, selectLocal, logout } = useAuth();
  const title = activeLocal?.name ?? user?.companyName ?? APP_NAME;
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState(null);

  return (
    <header className="site-header md-app-bar">
      <div className="site-header__inner">
        {user?.companyLogo ? (
          <img className="site-header__logo" src={user.companyLogo} alt="" />
        ) : (
          <AccessLogo className="site-header__logo" />
        )}
        <div className="site-header__text">
          <p className="site-header__title">{title}</p>
          <p className="site-header__subtitle">
            {user?.companyName ? `${user.companyName} · ` : ''}
            {ROLE_LABELS[user?.role] ?? ''}
          </p>
        </div>

        <div className="site-header__session">
          {locals.length > 1 && (
            <label className="site-header__local">
              <span className="sr-only">Local activo</span>
              <select value={localId ?? ''} onChange={(e) => selectLocal(e.target.value)}>
                {locals.map((local) => (
                  <option key={local.id} value={local.id}>
                    {local.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <span className="site-header__user">{user?.fullName || user?.username}</span>
          {passwordMessage && <span className="site-header__hint">{passwordMessage}</span>}
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => {
              setPasswordMessage(null);
              setPasswordOpen(true);
            }}
          >
            Contraseña
          </button>
          <ThemeSwitch />
          <IconButton name="logout" label="Cerrar sesión" onClick={logout} />
        </div>
      </div>

      {passwordOpen && (
        <ChangePasswordModal
          onClose={() => setPasswordOpen(false)}
          onSuccess={() => setPasswordMessage('Contraseña actualizada.')}
        />
      )}
    </header>
  );
}
