import { useState } from 'react';
import { APP_NAME } from '../../constants/app';
import { useAuth } from '../../context/AuthContext';
import { Button, ThemeSwitch } from '../../design-system';
import AccessLogo from '../layout/AccessLogo';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  };

  return (
    <div className="login">
      <form className="login__card panel" onSubmit={handleSubmit}>
        <div className="login__top">
          <AccessLogo className="login__logo" title={APP_NAME} />
          <ThemeSwitch />
        </div>
        <h1 className="login__title">{APP_NAME}</h1>
        <p className="login__subtitle">Ingresa con tu usuario para administrar tus locales.</p>

        {error && (
          <div className="alert alert--error" role="alert">
            {error}
          </div>
        )}

        <label className="login__field">
          Usuario
          <input
            type="text"
            value={username}
            autoComplete="username"
            autoFocus
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </label>

        <label className="login__field">
          Contraseña
          <input
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        <Button type="submit" className="login__submit" loading={submitting} disabled={submitting}>
          {submitting ? 'Ingresando…' : 'Ingresar'}
        </Button>
      </form>
    </div>
  );
}
