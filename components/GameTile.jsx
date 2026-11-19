import Link from 'next/link';
import Cover from './Cover';
import { stars } from '@/lib/format';

// Capa + nota + trecho da review (usado no perfil)
export default function GameTile({ entry }) {
  const g = entry.games;
  if (!g) return null;
  return (
    <div className="tile">
      <Link href={`/jogo/${g.slug}`} title={g.name}>
        <Cover game={g} />
      </Link>
      <div className="tile-meta">
        <Link href={`/jogo/${g.slug}`} className="poster-title">{g.name}</Link>
        {entry.rating ? <span className="stars small">{stars(entry.rating)}</span> : null}
        {entry.review && (
          <Link href={`/review/${entry.id}`} className="tile-review">
            {entry.has_spoiler ? <em className="muted">Review com spoiler — toque para ler</em> : `“${entry.review}”`}
          </Link>
        )}
      </div>
    </div>
  );
}
