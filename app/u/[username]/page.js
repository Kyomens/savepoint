import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSession } from '@/lib/supabase/server';
import Avatar from '@/components/Avatar';
import Cover from '@/components/Cover';
import GameTile from '@/components/GameTile';
import FollowButton from '@/components/FollowButton';
import ReviewCard, { REVIEW_SELECT } from '@/components/ReviewCard';
import { stars, compatibility, STATUS_ORDER, bannerStyle } from '@/lib/format';

export async function generateMetadata({ params }) {
  return { title: params.username };
}

const TABS = [['geral', 'Visão geral'], ...STATUS_ORDER, ['reviews', 'Reviews']];
const PREVIEW = 8;

export default async function PerfilPage({ params, searchParams }) {
  const { supabase, user } = await getSession();
  const { data: person } = await supabase.from('profiles').select('*').eq('username', params.username.toLowerCase()).maybeSingle();
  if (!person) notFound();
  const isMe = user?.id === person.id;
  const tab = TABS.some(([id]) => id === searchParams?.aba) ? searchParams.aba : 'geral';
  const path = `/u/${person.username}`;

  const [{ data: entries }, { count: followers }, { count: followingCount }, relation, topGames] = await Promise.all([
    supabase.from('game_entries').select('id, status, rating, review, has_spoiler, updated_at, game_id, games(slug, name, cover_url)')
      .eq('user_id', person.id).order('updated_at', { ascending: false }).limit(1000),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', person.id),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', person.id),
    user && !isMe
      ? supabase.from('follows').select('follower_id, following_id')
          .or(`and(follower_id.eq.${user.id},following_id.eq.${person.id}),and(follower_id.eq.${person.id},following_id.eq.${user.id})`)
          .then((r) => ({
            iFollow: (r.data || []).some((f) => f.follower_id === user.id),
            followsMe: (r.data || []).some((f) => f.follower_id === person.id),
          }))
      : Promise.resolve({ iFollow: false, followsMe: false }),
    person.top_games?.length
      ? supabase.from('games').select('id, slug, name, cover_url').in('id', person.top_games)
          .then((r) => person.top_games.map((id) => (r.data || []).find((g) => g.id === id)).filter(Boolean))
      : Promise.resolve([]),
  ]);
  const all = (entries || []).filter((e) => e.games);
  const byStatus = Object.fromEntries(STATUS_ORDER.map(([id]) => [id, all.filter((e) => e.status === id)]));
  const year = new Date().getFullYear();
  const thisYear = byStatus.zerado.filter((e) => new Date(e.updated_at).getFullYear() === year).length;
  const reviewCount = all.filter((e) => e.review).length;
  const mutual = relation.iFollow && relation.followsMe;

  // Compatibilidade e recomendações (só quando você vê o perfil de outra pessoa)
  let compat = null;
  let recs = [];
  if (user && !isMe) {
    const { data: mine } = await supabase.from('game_entries').select('game_id, rating').eq('user_id', user.id).limit(1000);
    compat = compatibility(mine || [], all);
    const mineIds = new Set((mine || []).map((e) => e.game_id));
    recs = all.filter((e) => e.rating >= 9 && !mineIds.has(e.game_id)).slice(0, 4);
  }

  const name = person.display_name || person.username;
  const first = name.split(' ')[0];

  let content;
  if (tab === 'reviews') {
    const { data: reviews } = await supabase.from('game_entries').select(REVIEW_SELECT).eq('user_id', person.id).not('review', 'is', null)
      .order('updated_at', { ascending: false }).limit(50);
    content = (reviews || []).length
      ? <div>{reviews.map((r) => <ReviewCard key={r.id} entry={r} userId={user?.id} path={`${path}?aba=reviews`} />)}</div>
      : <p className="empty">{isMe ? 'Você ainda não escreveu nenhuma review.' : `${first} ainda não escreveu nenhuma review.`}</p>;
  } else if (tab !== 'geral') {
    const list = byStatus[tab] || [];
    content = list.length ? (
      <div className="tile-grid">{list.map((e) => <GameTile key={e.id} entry={e} />)}</div>
    ) : (
      <p className="empty">Nada por aqui ainda.</p>
    );
  } else {
    const sections = STATUS_ORDER.filter(([id]) => byStatus[id].length);
    content = (
      <div className="stack" style={{ gap: 40 }}>
        {topGames.length > 0 && (
          <section>
            <h2 className="label">Top 4 de todos os tempos</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16, maxWidth: 640 }}>
              {topGames.map((g) => (
                <Link key={g.id} href={`/jogo/${g.slug}`} title={g.name}><Cover game={g} /></Link>
              ))}
            </div>
          </section>
        )}
        {sections.length === 0 && (
          <p className="empty">{isMe ? 'Você ainda não marcou nenhum jogo. Busque um jogo e marque o status!' : `${first} ainda não marcou nenhum jogo.`}</p>
        )}
        {sections.map(([id, label]) => (
          <section key={id} className="stack" style={{ gap: 14 }}>
            <div className="section-head" style={{ marginBottom: 0, borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>
              <h2 className="row-title">{label} <span className="muted" style={{ fontWeight: 500 }}>· {byStatus[id].length}</span></h2>
              {byStatus[id].length > PREVIEW && <Link href={`${path}?aba=${id}`} className="small muted">Ver todos →</Link>}
            </div>
            <div className="tile-grid">
              {byStatus[id].slice(0, PREVIEW).map((e) => <GameTile key={e.id} entry={e} />)}
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <main>
      <div className="profile-banner" style={bannerStyle(person.banner_url)} />
      <section className="container">
        <div className="row" style={{ gap: 24, alignItems: 'flex-end', marginTop: -60 }}>
          <span style={{ borderRadius: '50%', border: '5px solid var(--bg)', display: 'inline-flex', background: 'var(--bg)' }}>
            <Avatar profile={person} size={120} />
          </span>
          <div style={{ flex: '999 1 280px', minWidth: 0, paddingBottom: 6 }}>
            <h1 className="display" style={{ fontSize: 30 }}>{name}</h1>
            <p className="muted small row" style={{ gap: 8 }}>
              @{person.username}
              {relation.followsMe && <span className="badge type">Segue você</span>}
            </p>
            {person.bio && <p style={{ color: 'var(--body)', marginTop: 6, maxWidth: 620 }}>{person.bio}</p>}
          </div>
          <div className="row" style={{ paddingBottom: 6, gap: 8 }}>
            {isMe ? (
              <Link href="/configuracoes" className="btn">Editar perfil</Link>
            ) : user ? (
              <>
                <FollowButton targetId={person.id} following={relation.iFollow} path={path} />
                {mutual ? (
                  <Link href={`/mensagens/${person.username}`} className="btn">Mensagem</Link>
                ) : (
                  <span className="muted small" style={{ maxWidth: 180 }}>
                    {relation.iFollow ? `Quando ${first} te seguir de volta, vocês poderão conversar.` : ''}
                  </span>
                )}
              </>
            ) : (
              <Link href="/entrar" className="btn btn-accent">Entrar para seguir</Link>
            )}
          </div>
        </div>
        <div className="stat-grid" style={{ marginTop: 26, maxWidth: 680 }}>
          <div><div className="stat-num">{all.length}</div><div className="muted small">jogos</div></div>
          <div><div className="stat-num">{thisYear}</div><div className="muted small">zerados em {year}</div></div>
          <div><div className="stat-num">{reviewCount}</div><div className="muted small">reviews</div></div>
          <div><div className="stat-num">{followers || 0}</div><div className="muted small">seguidores · {followingCount || 0} seguindo</div></div>
        </div>
      </section>

      <div className="container page layout">
        <div className="main" style={{ gap: 24 }}>
          <nav className="tabs" aria-label="Jogos do perfil" style={{ borderBottom: '1px solid var(--line)', paddingBottom: 12 }}>
            {TABS.map(([id, label]) => {
              const n = id === 'reviews' ? reviewCount : byStatus[id]?.length;
              return (
                <Link key={id} href={id === 'geral' ? path : `${path}?aba=${id}`} className={`tab ${tab === id ? 'on' : ''}`}>
                  {label}{n ? <span className="muted" style={{ marginLeft: 6, fontWeight: 500 }}>{n}</span> : null}
                </Link>
              );
            })}
          </nav>
          {content}
        </div>

        <aside className="side">
          {user && !isMe && (
            <>
              <section className="card">
                <h2 className="label" style={{ marginBottom: 4 }}>{first} recomenda pra você</h2>
                <p className="muted small" style={{ marginBottom: 14 }}>Jogos que {first} adorou e você ainda não marcou</p>
                {recs.length === 0 ? (
                  <p className="muted small">Nenhuma recomendação por enquanto.</p>
                ) : (
                  <div className="stack" style={{ gap: 12 }}>
                    {recs.map((r) => (
                      <Link key={r.id} href={`/jogo/${r.games.slug}`} className="list-link">
                        <Cover game={r.games} width={40} style={{ borderRadius: 6 }} />
                        <span className="stack" style={{ gap: 2 }}>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{r.games.name}</span>
                          <span className="stars small">{stars(r.rating)}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </section>
              <section className="card">
                <h2 className="label">Compatibilidade</h2>
                {compat?.score != null ? (
                  <div className="row" style={{ gap: 14, flexWrap: 'nowrap' }}>
                    <div className="display" style={{ fontSize: 36, color: 'var(--accent-text)' }}>{compat.score}%</div>
                    <p className="muted small">Vocês deram notas parecidas em {compat.common} jogos em comum.</p>
                  </div>
                ) : (
                  <p className="muted small">Avaliem pelo menos 3 jogos em comum para ver o quanto o gosto de vocês combina.</p>
                )}
              </section>
            </>
          )}
          {isMe && (
            <section className="card-dashed stack" style={{ gap: 10 }}>
              <h2 style={{ fontSize: 16 }}>Seu perfil</h2>
              <p className="muted small">Troque a foto, a capa, a bio e seus 4 jogos favoritos em Editar perfil.</p>
              <Link href="/configuracoes" className="btn">Editar perfil</Link>
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
