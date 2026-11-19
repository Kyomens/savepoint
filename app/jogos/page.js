import Link from 'next/link';
import Cover from '@/components/Cover';
import { searchGames, trendingGames } from '@/lib/igdb';

export const metadata = { title: 'Jogos' };

export default async function JogosPage({ searchParams }) {
  const q = (searchParams?.q || '').trim();
  let games = [];
  let error = null;
  try {
    games = q ? await searchGames(q) : await trendingGames();
  } catch (e) {
    error = e.message;
  }
  return (
    <main className="container page stack" style={{ gap: 24 }}>
      <form action="/jogos" className="row" role="search" style={{ maxWidth: 640 }}>
        <label className="sr-only" htmlFor="busca">Buscar jogos</label>
        <input id="busca" className="field" type="search" name="q" defaultValue={q} placeholder="Digite o nome de um jogo…" style={{ flex: 1 }} />
        <button className="btn btn-accent" type="submit">Buscar</button>
      </form>
      <h1 className="label" style={{ margin: 0 }}>{q ? `Resultados para “${q}”` : 'Em alta no último ano'}</h1>
      {error && <p className="error">{error}</p>}
      {!error && games.length === 0 && <p className="empty">Nenhum jogo encontrado. Tente outro nome (em inglês costuma funcionar melhor).</p>}
      <div className="cover-grid">
        {games.map((g) => (
          <Link key={g.id} href={`/jogo/${g.slug}`} className="cover-item">
            <Cover game={g} />
            <span style={{ fontWeight: 600 }}>{g.name}</span>
            <span className="muted small">{g.release_year || '—'}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
