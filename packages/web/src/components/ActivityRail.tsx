export function ActivityRail() {
  return (
    <nav className="rail" aria-label="steps">
      <div className="rail__item rail__item--active" title="Screenshot">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="9" cy="11" r="2" />
          <path d="M21 16l-5-4-8 7" />
        </svg>
      </div>
      <div className="rail__item" title="Sampled colors">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8" />
          <circle cx="9" cy="10" r="1" />
          <circle cx="14" cy="9" r="1" />
          <circle cx="15" cy="13" r="1" />
        </svg>
      </div>
      <div className="rail__item" title="Matches">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16M4 12h10M4 17h13" />
        </svg>
      </div>
      <div className="rail__spacer" />
      <a
        className="rail__item"
        href="https://lucasmsa.com"
        title="lucasmsa.com"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c1-4 4-6 8-6s7 2 8 6" />
        </svg>
      </a>
    </nav>
  );
}
