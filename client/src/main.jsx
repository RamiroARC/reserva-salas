import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import InstallHint from './components/layout/InstallHint.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './design-system/ThemeProvider.jsx';
import './design-system/tokens.css';
import './styles/index.css';
import './styles/App.css';
import './design-system/components.css';

window.__pwaInstallPrompt = null;
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  window.__pwaInstallPrompt = event;
  window.dispatchEvent(new CustomEvent('pwa-install-available', { detail: event }));
});

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <InstallHint />
        <App />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>
);
