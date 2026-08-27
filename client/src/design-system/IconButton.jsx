import Icon from './Icon';

export default function IconButton({ name, label, filled = false, className = '', type = 'button', ...props }) {
  return (
    <button type={type} className={`md-icon-btn ${className}`.trim()} aria-label={label} {...props}>
      <Icon name={name} filled={filled} />
    </button>
  );
}
