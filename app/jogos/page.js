import Link from 'next/link';
import Cover from '@/components/Cover';
import { getSession } from '@/lib/supabase/server';
import { searchGames, listGames } from '@/lib/igdb';
import { SORTS, GENRES, PLATFORMS, formatDate } from '@/lib/format';
import FilterBar from './FilterBar';

export const metadata = { title: 'Jogos' };

const PER_PAGE = 48;

function badgeFor(sort, g) {
  if (sort === 'critica') return g.critic_score ? `Crítica ${g.critic_score}` : null;
  if (sort === 'savepoint') return g.avg_stars ? `★ ${Number(g.avg_stars).toFixed(1)}` : null;
  if (sort === 'lancamentos' || sort === 'em-breve') return g.release_date ? formatDate(g.release_date) : null;
  return null;
}

async function savepointRanking(supabase, { genero, ano, page }) {
  let q = supabase.from('game_stats').select('*').gte('ratings_count', 1)
    .order('avg_stars', { ascending: false }).order('ratings_count', { ascending: false })
    .range((page - 1) * PER_PAGE, page * PER_PAGE - 1);
  const genre = GENRES.find((g) => String(g.id) === String(genero));
  if (genre) q = q.contains('genres', [genre.en]);
  if (parseInt(ano, 10)) q = q.eq('release_year', parseInt(ano, 10));
  const { data, error } = await q;
  if (error) throw new Error('O ranking do Savepoint ainda não está disponível. Rode a atualização do banco (atualizacao-01.sql).');
  const list = data || [];
  list.hasMore = list.length === PER_PAGE;
  return list;
}

export default async function JogosPage({ searchParams }) {
  const q = String(searchParams?.q || '').trim();
  const ordem = SORTS.some(([id]) => id === searchParams?.ordem) ? searchParams.ordem : 'populares';
  const genero = searchParams?.genero || '';
  const plataforma = searchParams?.plataforma || '';
  const ano = searchParams?.ano || '';
  const page = Math.max(1, parseInt(searchParams?.pagina, 10) || 1);
  const filters = { genre: genero, platform: plataforma, year: ano, page, limit: PER_PAGE };

  let games = [];
  let error = null;
  try {
    if (q) games = await searchGames(q, filters);
    else if (ordem === 'savepoint') {
      const { supabase } = await getSession();
      games = await savepointRanking(supabase, { genero, ano, page });
    } else games = await listGames({ sort: ordem, ...filters });
  } catch (e) {
    error = e.message;
  }

  const sortLabel = SORTS.find(([id]) => id === ordem)?.[1];
  const parts = [
    q ? `Resultados para “${q}”` : sortLabel,
    GENRES.find((g) => String(g.id) === genero)?.pt,
    PLATFORMS.find((p) => String(p.id) === plataforma)?.label,
    ano,
  ].filter(Boolean);

  const pageHref = (n) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ q, ordem: ordem === 'populares' ? '' : ordem, genero, plataforma, ano })) if (v) params.set(k, v);
    if (n > 1) params.set('pagina', n);
    return `/jogos${params.toString() ? `?${params}` : ''}`;
  };

  return (
    <main className="container page stack" style={{ gap: 24 }}>
      <h1 className="display" style={{ fontSize: 30 }}>Jogos</h1>
      <FilterBar q={q} ordem={ordem} genero={genero} plataforma={plataforma} ano={ano} />
      <p className="label" style={{ margin: 0 }}>{parts.join(' · ')}{page > 1 ? ` · página ${page}` : ''}</p>
      {ordem === 'savepoint' && !q && plataforma && <p className="muted small">O filtro de plataforma não se aplica ao ranking do Savepoint.</p>}
      {error && <p className="error">{error}</p>}
      {!error && games.length === 0 && (
        <p className="empty">
          {ordem === 'savepoint' ? 'Ainda não há jogos avaliados no Savepoint com esses filtros.' : 'Nenhum jogo encontrado. Tente outro nome ou menos filtros (em inglês costuma funcionar melhor).'}
        </p>
      )}
      <div className="cover-grid">
        {games.map((g) => (
          <Link key={g.id} href={`/jogo/${g.slug}`} className="cover-item">
            <Cover game={g} badge={q ? null : badgeFor(ordem, g)} />
            <span className="poster-title">{g.name}</span>
            <span className="muted small">{g.release_year || '—'}</span>
          </Link>
        ))}
      </div>
      {(page > 1 || games.hasMore) && (
        <nav className="row" aria-label="Páginas" style={{ justifyContent: 'center', gap: 12 }}>
          {page > 1 && <Link className="btn" href={pageHref(page - 1)}>← Anterior</Link>}
          <span className="muted small">Página {page}</span>
          {games.hasMore && <Link className="btn" href={pageHref(page + 1)}>Próxima →</Link>}
        </nav>
      )}
      <p className="muted small">Dados de jogos fornecidos pelo IGDB.com. “Nota da crítica” é a média de análises de veículos especializados reunida pelo IGDB.</p>
    </main>
  );
}
