import Icon from './Icon';

export default function FAB({ icon = 'add', label, onClick, className = '', extended = false }) {
  return (
    <button
      type="button"
      className={`md-fab ${extended ? 'md-fab--extended' : ''} ${className}`.trim()}
      onClick={onClick}
      aria-label={label}
    >
      <Icon name={icon} />
      {extended ? label : null}
    </button>
  );
}
