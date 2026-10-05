import { AVATAR_PATH, internalHref, SELENITE_INVITE_URL } from "../lib/site";

export function LegalHeader() {
  return (
    <header className="site-header shell">
      <a className="brand" href={internalHref("/")} aria-label="Selenite legal home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="brand-avatar" src={AVATAR_PATH} width="42" height="42" alt="" />
        <span>SELENITE</span>
      </a>
      <nav aria-label="Legal navigation">
        <a href={internalHref("terms")}>Terms of Use</a>
        <a href={internalHref("privacy")}>Privacy Policy</a>
        <a className="invite-link" href={SELENITE_INVITE_URL} target="_blank" rel="noreferrer">Invite Selenite <span aria-hidden="true">↗</span></a>
      </nav>
    </header>
  );
}

export function LegalFooter() {
  return (
    <footer className="site-footer shell">
      <div><span className="footer-wordmark">SELENITE</span><p>Independent Discord application. Not affiliated with or endorsed by Discord Inc.</p></div>
      <div className="footer-links"><a href={internalHref("terms")}>Terms of Use</a><a href={internalHref("privacy")}>Privacy Policy</a><a href={SELENITE_INVITE_URL} target="_blank" rel="noreferrer">Invite Selenite</a><a href="https://github.com/Quantum-Sharkware/selenite-legal" rel="noreferrer">Project repository</a></div>
    </footer>
  );
}

type Section = { id: string; title: string; content: React.ReactNode };

export function PolicyPage({ eyebrow, title, summary, effective, sections }: { eyebrow: string; title: string; summary: string; effective: string; sections: Section[] }) {
  return (
    <main>
      <LegalHeader />
      <div className="policy-shell shell">
        <aside className="policy-aside">
          <p className="section-kicker">On this page</p>
          <ol>{sections.map((section, index) => <li key={section.id}><a href={`#${section.id}`}><span>{String(index + 1).padStart(2, "0")}</span>{section.title}</a></li>)}</ol>
        </aside>
        <article className="policy">
          <header className="policy-intro">
            <div className="eyebrow"><span /> {eyebrow}</div>
            <h1>{title}</h1><p>{summary}</p><div className="effective"><span>Effective</span>{effective}</div>
          </header>
          {sections.map((section, index) => (
            <section id={section.id} className="policy-section" key={section.id}>
              <div className="section-number">{String(index + 1).padStart(2, "0")}</div>
              <div><h2>{section.title}</h2>{section.content}</div>
            </section>
          ))}
        </article>
      </div>
      <LegalFooter />
    </main>
  );
}
