interface TabStripProps {
  hasScreenshot: boolean;
}

export function TabStrip({ hasScreenshot }: TabStripProps) {
  return (
    <div className="tabs" role="tablist">
      <div
        className={`tab ${hasScreenshot ? '' : 'tab--active'}`}
        role="tab"
        aria-selected={!hasScreenshot}
      >
        drop.zone
      </div>
      <div
        className={`tab ${hasScreenshot ? 'tab--active' : ''}`}
        role="tab"
        aria-selected={hasScreenshot}
      >
        matches.json
      </div>
    </div>
  );
}
