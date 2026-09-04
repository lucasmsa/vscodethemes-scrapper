export function TitleBar() {
  return (
    <header className="title-bar">
      <div className="title-bar__lights" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="title-bar__name">what is my theme?</div>
      <div className="title-bar__right">
        <a href="https://github.com/lucasmsa/vscodethemes-scrapper">
          lucasmsa/vscodethemes-scrapper
        </a>
      </div>
    </header>
  );
}
