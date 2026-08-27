import { useEffect } from 'react';
import Icon from './Icon';

const ICONS = {
  reservas: 'event',
  reportes: 'assessment',
  paquetes: 'inventory_2',
  'paquetes-promo': 'local_offer',
  utilitarios: 'tune',
  proyecciones: 'stacked_bar_chart',
  locales: 'apartment',
  usuarios: 'group',
  empresas: 'domain',
};

export default function Navigation({
  tabs,
  activeTab,
  onSelect,
  drawerOpen,
  onCloseDrawer,
}) {
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onCloseDrawer();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen, onCloseDrawer]);

  const primary = tabs.slice(0, 3);
  const moreActive = !primary.some((tab) => tab.id === activeTab);

  return (
    <>
      <nav className="tabs" aria-label="Secciones principales">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tabs__item ${activeTab === tab.id ? 'tabs__item--active' : ''}`}
            onClick={() => onSelect(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <nav className="md-nav-bar" aria-label="Navegación principal">
        {primary.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`md-nav-bar__item ${activeTab === tab.id ? 'md-nav-bar__item--active' : ''}`}
            onClick={() => onSelect(tab.id)}
          >
            <Icon name={ICONS[tab.id] || 'circle'} filled={activeTab === tab.id} />
            {tab.label}
          </button>
        ))}
        <button
          type="button"
          className={`md-nav-bar__item ${moreActive ? 'md-nav-bar__item--active' : ''}`}
          onClick={() => onSelect('__more')}
        >
          <Icon name="menu" filled={moreActive} />
          Más
        </button>
      </nav>

      {drawerOpen && (
        <div className="md-drawer-backdrop" onClick={onCloseDrawer}>
          <aside
            className="md-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Más secciones"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="panel__subtitle" style={{ padding: '12px 16px' }}>
              Secciones
            </p>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`md-drawer__item ${activeTab === tab.id ? 'md-drawer__item--active' : ''}`}
                onClick={() => onSelect(tab.id)}
              >
                <Icon name={ICONS[tab.id] || 'circle'} filled={activeTab === tab.id} />
                {tab.label}
              </button>
            ))}
          </aside>
        </div>
      )}
    </>
  );
}
