import Icon from './Icon';

const VARIANT_CLASS = {
  filled: 'btn--primary',
  tonal: 'btn--secondary',
  outlined: 'btn--outlined',
  text: 'btn--ghost',
  danger: 'btn--danger',
};

export default function Button({
  children,
  variant = 'filled',
  size = 'md',
  icon,
  type = 'button',
  className = '',
  loading = false,
  ...props
}) {
  return (
    <button
      type={type}
      className={`btn ${VARIANT_CLASS[variant] ?? VARIANT_CLASS.filled} ${
        size === 'sm' ? 'btn--sm' : ''
      } ${className}`.trim()}
      {...props}
    >
      {loading ? <span className="md-progress" style={{ width: 18, height: 18, borderWidth: 2 }} /> : null}
      {!loading && icon ? <Icon name={icon} size="sm" /> : null}
      {children}
    </button>
  );
}
