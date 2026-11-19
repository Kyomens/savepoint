import Link from 'next/link';
import Cover from './Cover';

// Uma fileira de capas com título, no estilo do Letterboxd
export default function GameRow({ title, subtitle, href, games, badge }) {
  if (!games?.length) return null;
  return (
    <section className="stack" style={{ gap: 14 }}>
      <div className="section-head" style={{ marginBottom: 0, borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>
        <div>
          <h2 className="row-title">{title}</h2>
          {subtitle && <p className="muted small">{subtitle}</p>}
        </div>
        {href && <Link href={href} className="small muted" style={{ whiteSpace: 'nowrap' }}>Ver mais →</Link>}
      </div>
      <div className="poster-row">
        {games.map((g) => (
          <Link key={g.id} href={`/jogo/${g.slug}`} className="cover-item" title={g.name}>
            <Cover game={g} badge={badge ? badge(g) : null} />
            <span className="poster-title">{g.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
