export default function Icon({ name, filled = false, size = 'md', className = '', label }) {
  const classes = [
    'md-icon',
    filled ? 'md-icon--filled' : '',
    size === 'sm' ? 'md-icon--sm' : '',
    size === 'lg' ? 'md-icon--lg' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} aria-hidden={label ? undefined : true} aria-label={label}>
      {name}
    </span>
  );
}
