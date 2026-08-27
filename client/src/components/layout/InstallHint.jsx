import { useEffect, useState } from 'react';

import { APP_NAME } from '../../constants/app';

const STORAGE_KEY = 'pwa-home-shortcut-seen';

function isStandaloneMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    window.navigator.standalone === true
  );
}

function isIosDevice() {
  const ua = window.navigator.userAgent || '';
  const iOS = /iphone|ipad|ipod/i.test(ua);
  const iPadOs = window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1;
  return iOS || iPadOs;
}

function readStoredDecision() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function storeDecision() {
  try {
    window.localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* private mode */
  }
}

export default function InstallHint() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installing, setInstalling] = useState(false);
  const [ios] = useState(() => (typeof window !== 'undefined' ? isIosDevice() : false));

  useEffect(() => {
    if (isStandaloneMode() || readStoredDecision()) {
      return undefined;
    }

    if (window.__pwaInstallPrompt) {
      setDeferredPrompt(window.__pwaInstallPrompt);
    }

    const timer = window.setTimeout(() => {
      if (!isStandaloneMode() && !readStoredDecision()) {
        setVisible(true);
      }
    }, 700);

    const onAvailable = (event) => {
      const promptEvent = event?.detail || window.__pwaInstallPrompt;
      if (promptEvent) {
        setDeferredPrompt(promptEvent);
      }
      if (!readStoredDecision() && !isStandaloneMode()) {
        setVisible(true);
      }
    };

    const onInstalled = () => {
      storeDecision();
      setVisible(false);
      setDeferredPrompt(null);
      window.__pwaInstallPrompt = null;
    };

    window.addEventListener('pwa-install-available', onAvailable);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pwa-install-available', onAvailable);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => {
    storeDecision();
    setVisible(false);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      window.__pwaInstallPrompt = null;
      setDeferredPrompt(null);
      if (outcome === 'accepted') {
        storeDecision();
        setVisible(false);
      }
    } finally {
      setInstalling(false);
    }
  };

  if (!visible) return null;

  const canNativeInstall = Boolean(deferredPrompt);

  return (
    <div className="install-prompt" role="dialog" aria-modal="true" aria-labelledby="install-prompt-title">
      <button
        type="button"
        className="install-prompt__backdrop"
        aria-label="Cerrar"
        onClick={dismiss}
      />
      <div className="install-prompt__card">
        <img src="/icons/icon.svg" alt="" className="install-prompt__icon" width="64" height="64" />
        <h2 id="install-prompt-title">Agregar {APP_NAME}</h2>
        <p>
          Es la primera vez que abres la aplicación en este dispositivo. Agrega el icono a la
          pantalla de inicio para entrar más rápido.
        </p>

        {ios && !canNativeInstall ? (
          <ol className="install-prompt__steps">
            <li>
              Toca <strong>Compartir</strong> en Safari
              <svg className="install-prompt__share" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M12 3.2 7.8 7.4l1.4 1.4 1.8-1.8V15h2V7l1.8 1.8 1.4-1.4L12 3.2zM6 19v-6H4v8h16v-8h-2v6H6z"
                />
              </svg>
            </li>
            <li>
              Elige <strong>Agregar a pantalla de inicio</strong>
            </li>
            <li>
              Confirma <strong>Agregar</strong> para crear el icono
            </li>
          </ol>
        ) : null}

        {!ios && !canNativeInstall ? (
          <p className="install-prompt__fallback">
            En el menú del navegador elige <strong>Instalar aplicación</strong> o{' '}
            <strong>Agregar a la pantalla de inicio</strong>.
          </p>
        ) : null}

        <div className="install-prompt__actions">
          {canNativeInstall ? (
            <button
              type="button"
              className="btn"
              onClick={handleInstall}
              disabled={installing}
            >
              {installing ? 'Agregando…' : 'Agregar icono'}
            </button>
          ) : null}
          <button type="button" className="btn btn--ghost" onClick={dismiss}>
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
}
