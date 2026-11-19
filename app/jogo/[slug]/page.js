import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSession } from '@/lib/supabase/server';
import { getGameBySlug } from '@/lib/igdb';
import { translatedSummary } from '@/lib/translate';
import Cover from '@/components/Cover';
import Avatar from '@/components/Avatar';
import ReviewCard, { REVIEW_SELECT } from '@/components/ReviewCard';
import { ChatIcon } from '@/components/Icons';
import { stars, STATUS, PROFILE_FIELDS, genrePt, formatDate } from '@/lib/format';
import EntryForm from './EntryForm';

export async function generateMetadata({ params }) {
  return { title: decodeURIComponent(params.slug).replace(/-/g, ' ') };
}

const NO_ONE = ['00000000-0000-0000-0000-000000000000'];

export default async function JogoPage({ params, searchParams }) {
  const game = await getGameBySlug(params.slug);
  if (!game) notFound();
  const { supabase, user } = await getSession();
  const tab = searchParams?.aba === 'amigos' && user ? 'amigos' : 'todas';

  const [{ data: all }, { data: following }, { count: postsToday }, myEntry, summary] = await Promise.all([
    supabase.from('game_entries').select('user_id, status, rating').eq('game_id', game.id),
    user ? supabase.from('follows').select('following_id').eq('follower_id', user.id) : Promise.resolve({ data: [] }),
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('game_id', game.id)
      .gte('created_at', new Date(Date.now() - 86400000).toISOString()),
    user
      ? supabase.from('game_entries').select('*').eq('game_id', game.id).eq('user_id', user.id).maybeSingle().then((r) => r.data)
      : Promise.resolve(null),
    translatedSummary(game, 'pt-BR'),
  ]);
  const entries = all || [];
  const friendIds = (following || []).map((f) => f.following_id);

  // Estatísticas da comunidade
  const rated = entries.filter((e) => e.rating);
  const avg = rated.length ? rated.reduce((s, e) => s + e.rating, 0) / rated.length / 2 : null;
  const dist = Array.from({ length: 10 }, (_, i) => rated.filter((e) => e.rating === i + 1).length);
  const maxDist = Math.max(1, ...dist);
  const count = (s) => entries.filter((e) => e.status === s).length;

  // Reviews: todas (padrão) ou só dos amigos
  let reviewsQuery = supabase.from('game_entries').select(REVIEW_SELECT).eq('game_id', game.id).not('review', 'is', null)
    .order('updated_at', { ascending: false }).limit(30);
  if (tab === 'amigos') reviewsQuery = reviewsQuery.in('user_id', friendIds.length ? friendIds : NO_ONE);
  const { data: reviews, error: reviewsError } = await reviewsQuery;
  if (reviewsError) console.error('reviews:', reviewsError.message);

  // Amigos que jogaram
  const { data: friendEntries } = friendIds.length
    ? await supabase.from('game_entries').select(`status, rating, profiles!game_entries_user_id_fkey(${PROFILE_FIELDS})`)
        .eq('game_id', game.id).in('user_id', friendIds).limit(12)
    : { data: [] };

  const path = `/jogo/${game.slug}`;
  const releaseText = game.release_date
    ? game.release_date * 1000 > Date.now() ? `Lança em ${formatDate(game.release_date)}` : formatDate(game.release_date)
    : game.release_year;

  return (
    <main>
      <section className="game-hero">
        {game.artwork_url && <div className="game-hero-art" style={{ backgroundImage: `url("${game.artwork_url}")` }} aria-hidden="true" />}
        <div className="game-hero-shade" aria-hidden="true" />
        <div className="container game-hero-inner">
          <Cover game={game} width={210} style={{ borderRadius: 14, boxShadow: '0 20px 50px rgba(0,0,0,.45)' }} />
          <div className="stack" style={{ flex: '999 1 360px', minWidth: 0, gap: 14 }}>
            <p className="muted small">{[releaseText, game.developer].filter(Boolean).join(' · ')}</p>
            <h1 className="display" style={{ fontSize: 42, lineHeight: 1.05 }}>{game.name}</h1>
            <div className="row" style={{ gap: 8 }}>
              {(game.genres || []).map((t) => <span key={t} className="chip">{genrePt(t)}</span>)}
              {(game.platforms || []).slice(0, 6).map((t) => <span key={t} className="chip">{t}</span>)}
            </div>
            {summary.text && (
              <div className="stack" style={{ gap: 6, maxWidth: 680 }}>
                <p style={{ color: 'var(--body)', lineHeight: 1.65 }}>{summary.text}</p>
                <p className="muted" style={{ fontSize: 12 }}>
                  {summary.translated ? 'Descrição traduzida automaticamente.' : 'Descrição original em inglês (tradução indisponível no momento).'}
                </p>
              </div>
            )}
            <div className="row" style={{ gap: 32, alignItems: 'flex-end', marginTop: 8 }}>
              <div>
                <div className="display" style={{ fontSize: 46, color: 'var(--accent-text)', lineHeight: 1 }}>{avg ? avg.toFixed(1) : '—'}</div>
                <div className="muted small">
                  {rated.length ? `Savepoint · ${rated.length} ${rated.length === 1 ? 'avaliação' : 'avaliações'}` : 'Savepoint · sem avaliações'}
                </div>
              </div>
              {rated.length > 0 && (
                <div role="img" aria-label="Distribuição das notas, de meia a 5 estrelas" style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 56 }}>
                  {dist.map((n, i) => (
                    <span key={i} style={{ width: 14, height: `${Math.max(4, (n / maxDist) * 100)}%`, borderRadius: '3px 3px 0 0', background: i === 9 ? 'var(--accent)' : 'var(--off)' }} />
                  ))}
                </div>
              )}
              {game.critic_score ? (
                <div>
                  <div className="display critic-score">{game.critic_score}</div>
                  <div className="muted small">Crítica · {game.critic_count} {game.critic_count === 1 ? 'análise' : 'análises'}</div>
                </div>
              ) : null}
            </div>
          </div>
          <div style={{ flex: '1 1 280px' }}>
            <EntryForm game={game} entry={myEntry} loggedIn={!!user} />
          </div>
        </div>
      </section>

      <div className="container page layout">
        <div className="main" style={{ gap: 24 }}>
          <Link href={`${path}/comunidade`} className="card row" style={{ gap: 16 }}>
            <span style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent)', color: 'var(--on-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}><ChatIcon /></span>
            <span className="stack" style={{ flex: '1 1 240px', gap: 2 }}>
              <span style={{ fontWeight: 700, color: 'var(--strong)' }}>Comunidade de {game.name}</span>
              <span className="muted" style={{ fontSize: 14 }}>
                Tire dúvidas, poste prints e encontre gente pra jogar junto{postsToday ? ` · ${postsToday} posts novos hoje` : ''}
              </span>
            </span>
            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--accent-text)' }}>Entrar →</span>
          </Link>

          <div>
            <div className="tabs" style={{ marginBottom: 8 }}>
              <Link href={path} className={`tab ${tab === 'todas' ? 'on' : ''}`}>Todas as reviews</Link>
              {user && <Link href={`${path}?aba=amigos`} className={`tab ${tab === 'amigos' ? 'on' : ''}`}>Dos meus amigos</Link>}
            </div>
            {(reviews || []).length === 0 ? (
              <p className="empty" style={{ marginTop: 16 }}>
                {tab === 'amigos' ? 'Nenhum amigo escreveu review deste jogo ainda.' : 'Ninguém escreveu review deste jogo ainda. Que tal ser a primeira pessoa?'}
              </p>
            ) : (
              reviews.map((r) => <ReviewCard key={r.id} entry={r} userId={user?.id} showGame={false} path={tab === 'amigos' ? `${path}?aba=amigos` : path} />)
            )}
          </div>
        </div>

        <aside className="side">
          {friendIds.length > 0 && (
            <section className="card">
              <h2 className="label">Amigos que jogaram</h2>
              {(friendEntries || []).length === 0 ? (
                <p className="muted small">Nenhum dos seus amigos marcou este jogo ainda.</p>
              ) : (
                <div className="stack">
                  {friendEntries.map((f) => (
                    <Link key={f.profiles.username} href={`/u/${f.profiles.username}`} className="list-link" style={{ fontSize: 14 }}>
                      <Avatar profile={f.profiles} size={30} />
                      <span style={{ flex: 1, fontWeight: 500 }}>{f.profiles.display_name || f.profiles.username}</span>
                      <span className="muted small">{STATUS[f.status] || ''}</span>
                      <span className="stars small">{stars(f.rating)}</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}
          <section className="card stat-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
            <div><div className="stat-num">{count('zerado')}</div><div className="muted small">zeraram</div></div>
            <div><div className="stat-num">{count('jogando')}</div><div className="muted small">jogando agora</div></div>
            <div><div className="stat-num">{count('quero')}</div><div className="muted small">querem jogar</div></div>
            <div><div className="stat-num">{count('abandonado')}</div><div className="muted small">abandonaram</div></div>
          </section>
          <p className="muted small">Dados do jogo e nota da crítica fornecidos pelo IGDB.com</p>
        </aside>
      </div>
    </main>
  );
}
