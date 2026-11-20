import Link from 'next/link';
import Cover from './Cover';
import Stars from './Stars';

// Capa + a nota que a pessoa deu + trecho da review (usado no perfil)
export default function GameTile({ entry, platinum = false }) {
  const g = entry.games;
  if (!g) return null;
  return (
    <div className="tile">
      <Link href={`/jogo/${g.slug}`} title={g.name} className={platinum ? 'platinum-cover' : undefined}>
        <Cover game={g} badge={platinum ? '🏆 Platina' : null} />
      </Link>
      <div className="tile-meta">
        <Link href={`/jogo/${g.slug}`} className="poster-title">{g.name}</Link>
        {entry.rating ? <Stars rating={entry.rating} size={13} /> : <span className="muted" style={{ fontSize: 12 }}>Sem nota</span>}
        {entry.review && (
          <Link href={`/review/${entry.id}`} className="tile-review">
            {entry.has_spoiler ? <em className="muted">Review com spoiler — toque para ler</em> : `“${entry.review}”`}
          </Link>
        )}
      </div>
    </div>
  );
}
