import { useState } from 'react';

function IconChevron({ open }) {
  return (
    <svg
      className={`utility-section__chevron${open ? ' utility-section__chevron--open' : ''}`}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export default function CollapsibleUtilitySection({
  title,
  hint,
  actions,
  className = '',
  keepOpen = false,
  children,
}) {
  const [expanded, setExpanded] = useState(false);
  const isOpen = keepOpen || expanded;

  const toggle = () => {
    if (!keepOpen) setExpanded((prev) => !prev);
  };

  return (
    <section className={`panel utility-section${isOpen ? '' : ' utility-section--collapsed'} ${className}`.trim()}>
      <div className="utility-section__header">
        <button
          type="button"
          className="utility-section__toggle"
          onClick={toggle}
          aria-expanded={isOpen}
        >
          <IconChevron open={isOpen} />
          <div className="utility-section__heading">
            <h2>{title}</h2>
            {hint ? <p className="form-hint">{hint}</p> : null}
          </div>
        </button>
        {actions ? (
          <div className="utility-section__actions" onClick={(e) => e.stopPropagation()}>
            {actions}
          </div>
        ) : null}
      </div>

      {isOpen ? <div className="utility-section__body">{children}</div> : null}
    </section>
  );
}
