import Link from 'next/link';
import { getSession } from '@/lib/supabase/server';
import Cover from '@/components/Cover';
import Avatar from '@/components/Avatar';
import CopyButton from '@/components/CopyButton';
import ReviewCard, { REVIEW_SELECT } from '@/components/ReviewCard';
import { stars, STATUS_VERB } from '@/lib/format';

async function popularThisWeek(supabase) {
  const since = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data } = await supabase.from('game_entries').select('game_id, games(slug, name, cover_url, release_year, developer)')
    .gte('updated_at', since).limit(1000);
  const counts = new Map();
  for (const e of data || []) {
    if (!e.games) continue;
    const c = counts.get(e.game_id) || { game: e.games, n: 0 };
    c.n += 1;
    counts.set(e.game_id, c);
  }
  return [...counts.values()].sort((a, b) => b.n - a.n).slice(0, 5);
}

function PopularCard({ popular }) {
  return (
    <section className="card">
      <h2 className="label">Populares esta semana</h2>
      {popular.length === 0 ? (
        <p className="muted small">Ainda sem movimento esta semana. <Link href="/jogos" style={{ color: 'var(--accent-text)' }}>Explore os jogos</Link>.</p>
      ) : (
        <ol className="stack" style={{ listStyle: 'none', margin: 0, padding: 0, gap: 14 }}>
          {popular.map(({ game, n }, i) => (
            <li key={game.slug}>
              <Link href={`/jogo/${game.slug}`} className="list-link">
                <span className="display" style={{ width: 18, color: 'var(--faint)' }}>{i + 1}</span>
                <Cover game={game} width={36} style={{ borderRadius: 6 }} />
                <span className="stack" style={{ gap: 2, minWidth: 0 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{game.name}</span>
                  <span className="muted" style={{ fontSize: 12 }}>{n} {n === 1 ? 'pessoa' : 'pessoas'} esta semana</span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default async function Home() {
  const { supabase, user, profile } = await getSession();
  const popular = await popularThisWeek(supabase);

  if (!user) {
    return (
      <main className="container page layout">
        <div className="main">
          <section className="stack" style={{ gap: 18, padding: '40px 0' }}>
            <h1 className="display" style={{ fontSize: 52, lineHeight: 1.05, maxWidth: 640 }}>Seu diário de jogos, junto com seus amigos.</h1>
            <p className="muted" style={{ fontSize: 18, maxWidth: 560 }}>
              Marque o que você está jogando, dê notas, escreva reviews, veja o que seus amigos recomendam e tire dúvidas na comunidade de cada jogo.
            </p>
            <div className="row">
              <Link href="/cadastro" className="btn btn-accent">Criar conta grátis</Link>
              <Link href="/jogos" className="btn">Explorar jogos</Link>
            </div>
          </section>
        </div>
        <aside className="side"><PopularCard popular={popular} /></aside>
      </main>
    );
  }

  const { data: follows } = await supabase.from('follows').select('following_id').eq('follower_id', user.id);
  const friendIds = (follows || []).map((f) => f.following_id);

  const [{ data: activity }, { data: reviews }, { data: backlog }] = await Promise.all([
    friendIds.length
      ? supabase.from('game_entries').select('id, status, rating, updated_at, profiles(username, display_name, avatar_color), games(slug, name, cover_url)')
          .in('user_id', friendIds).not('status', 'is', null).order('updated_at', { ascending: false }).limit(12)
      : Promise.resolve({ data: [] }),
    friendIds.length
      ? supabase.from('game_entries').select(REVIEW_SELECT).in('user_id', friendIds).not('review', 'is', null)
          .order('updated_at', { ascending: false }).limit(15)
      : Promise.resolve({ data: [] }),
    supabase.from('game_entries').select('games(slug, name, cover_url)').eq('user_id', user.id).eq('status', 'quero')
      .order('updated_at', { ascending: false }).limit(8),
  ]);

  return (
    <main className="container page layout">
      <div className="main">
        <section className="stack" style={{ gap: 6 }}>
          <h1 className="display" style={{ fontSize: 32 }}>Bem-vindo de volta, {profile?.display_name || profile?.username}</h1>
          <p className="muted">Veja o que seus amigos andam jogando e avaliando.</p>
        </section>

        {friendIds.length === 0 ? (
          <section className="card-dashed stack" style={{ gap: 12 }}>
            <h2 style={{ fontSize: 18 }}>Seu feed está vazio por enquanto</h2>
            <p className="muted">Siga seus amigos para ver aqui o que eles estão jogando, as notas e as reviews.</p>
            <div className="row">
              <Link href="/pessoas" className="btn btn-accent">Encontrar pessoas</Link>
              <Link href="/jogos" className="btn">Avaliar meus jogos</Link>
            </div>
          </section>
        ) : (
          <>
            <section>
              <div className="section-head">
                <h2 className="label">Atividade recente dos amigos</h2>
              </div>
              {(activity || []).length === 0 ? (
                <p className="muted small">Seus amigos ainda não marcaram nenhum jogo.</p>
              ) : (
                <div className="cover-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
                  {activity.map((a) => (
                    <Link key={a.id} href={`/jogo/${a.games.slug}`} className="cover-item" title={`${a.profiles.username} ${STATUS_VERB[a.status]} ${a.games.name}`}>
                      <Cover game={a.games} />
                      <span className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                        <Avatar profile={a.profiles} size={20} />
                        {a.rating ? <span className="stars">{stars(a.rating)}</span> : <span className="muted" style={{ fontSize: 12 }}>{STATUS_VERB[a.status]}</span>}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
            <section>
              <h2 className="label">Reviews dos amigos</h2>
              {(reviews || []).length === 0 ? (
                <p className="muted small">Nenhuma review dos seus amigos ainda.</p>
              ) : (
                reviews.map((r) => <ReviewCard key={r.id} entry={r} userId={user.id} path="/" />)
              )}
            </section>
          </>
        )}
      </div>

      <aside className="side">
        <PopularCard popular={popular} />
        <section className="card">
          <h2 className="label" style={{ marginBottom: 4 }}>Seu backlog</h2>
          <p className="muted small" style={{ marginBottom: 14 }}>
            {(backlog || []).length ? `Jogos em “Quero jogar”` : 'Marque jogos como “Quero jogar” para montar sua fila.'}
          </p>
          {(backlog || []).length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 8 }}>
              {backlog.map((b) => (
                <Link key={b.games.slug} href={`/jogo/${b.games.slug}`} title={b.games.name}><Cover game={b.games} style={{ borderRadius: 6 }} /></Link>
              ))}
            </div>
          )}
        </section>
        <section className="card-dashed stack" style={{ gap: 12 }}>
          <h2 style={{ fontSize: 16 }}>Chame seus amigos</h2>
          <p className="muted" style={{ fontSize: 14 }}>O Savepoint fica melhor com a sua turma. Mande o link do site para eles.</p>
          <CopyButton>Copiar link de convite</CopyButton>
        </section>
      </aside>
    </main>
  );
}
