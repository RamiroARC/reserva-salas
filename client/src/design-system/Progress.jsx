export default function Progress({ linear = false, label = 'Cargando' }) {
  if (linear) {
    return <div className="md-progress md-progress--linear" role="progressbar" aria-label={label} />;
  }

  return (
    <div className="loading loading--full" role="status" aria-live="polite">
      <div className="md-progress" aria-hidden="true" />
      <span>{label}…</span>
    </div>
  );
}
