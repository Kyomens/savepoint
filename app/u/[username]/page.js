import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSession } from '@/lib/supabase/server';
import Avatar from '@/components/Avatar';
import Cover from '@/components/Cover';
import Stars from '@/components/Stars';
import GameTile from '@/components/GameTile';
import BadgeList from '@/components/BadgeList';
import FollowButton from '@/components/FollowButton';
import OpenChatButton from '@/components/OpenChatButton';
import ReviewCard, { REVIEW_SELECT } from '@/components/ReviewCard';
import { compatibility, STATUS_ORDER, bannerStyle, profileThemeVars, spotifyEmbed } from '@/lib/format';
import { earnedBadges, nextBadges, loadStats } from '@/lib/badges';

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
  const favIds = (person.top_games || []).slice(0, 3);

  const [{ data: entries }, { count: followers }, { count: followingCount }, relation, favGames, stats, plats] = await Promise.all([
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
    favIds.length
      ? supabase.from('games').select('id, slug, name, cover_url').in('id', favIds)
          .then((r) => favIds.map((id) => (r.data || []).find((g) => g.id === id)).filter(Boolean))
      : Promise.resolve([]),
    loadStats(supabase, person.id),
    supabase.from('platinums').select('game_id').eq('user_id', person.id).then((r) => new Set((r.data || []).map((p) => p.game_id))),
  ]);

  const all = (entries || []).filter((e) => e.games);
  const ratingOf = new Map(all.map((e) => [e.game_id, e.rating]));
  const byStatus = Object.fromEntries(STATUS_ORDER.map(([id]) => [id, all.filter((e) => e.status === id)]));
  const year = new Date().getFullYear();
  const thisYear = byStatus.zerado.filter((e) => new Date(e.updated_at).getFullYear() === year).length;
  const reviewCount = all.filter((e) => e.review).length;
  const mutual = relation.iFollow && relation.followsMe;
  const earned = earnedBadges(stats);
  const name = person.display_name || person.username;
  const first = name.split(' ')[0];

  // Trilha sonora (recompensa de platina)
  let soundtrack = null;
  if (person.soundtrack_url && person.soundtrack_game_id && plats.has(person.soundtrack_game_id)) {
    const embed = spotifyEmbed(person.soundtrack_url);
    if (embed) {
      const { data: g } = await supabase.from('games').select('name, slug').eq('id', person.soundtrack_game_id).maybeSingle();
      soundtrack = { embed, game: g };
    }
  }

  // Compatibilidade e recomendações (só quando você vê o perfil de outra pessoa)
  let compat = null;
  let recs = [];
  if (user && !isMe) {
    const { data: mine } = await supabase.from('game_entries').select('game_id, rating').eq('user_id', user.id).limit(1000);
    compat = compatibility(mine || [], all);
    const mineIds = new Set((mine || []).map((e) => e.game_id));
    recs = all.filter((e) => e.rating >= 9 && !mineIds.has(e.game_id)).slice(0, 4);
  }

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
      <div className="tile-grid">{list.map((e) => <GameTile key={e.id} entry={e} platinum={plats.has(e.game_id)} />)}</div>
    ) : (
      <p className="empty">Nada por aqui ainda.</p>
    );
  } else {
    const sections = STATUS_ORDER.filter(([id]) => byStatus[id].length);
    content = (
      <div className="stack" style={{ gap: 40 }}>
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
              {byStatus[id].slice(0, PREVIEW).map((e) => <GameTile key={e.id} entry={e} platinum={plats.has(e.game_id)} />)}
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <main className="profile-themed profile-page" style={profileThemeVars(person.profile_theme)}>
      <div className="profile-banner" style={bannerStyle(person.banner_url, person.banner_pos)} />
      <section className="container">
        <div className="row" style={{ gap: 24, alignItems: 'flex-end', marginTop: -60 }}>
          <span style={{ borderRadius: '50%', border: '5px solid var(--bg)', display: 'inline-flex', background: 'var(--bg)' }}>
            <Avatar profile={person} size={120} frame={person.avatar_frame} />
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
              <Link href="/editar-perfil" className="btn">Editar perfil</Link>
            ) : user ? (
              <>
                <FollowButton targetId={person.id} following={relation.iFollow} path={path} />
                {mutual ? (
                  <OpenChatButton username={person.username} />
                ) : relation.iFollow ? (
                  <span className="muted small" style={{ maxWidth: 200 }}>Quando {first} te seguir de volta, vocês poderão conversar.</span>
                ) : null}
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
        {(earned.length > 0 || isMe) && (
          <div style={{ marginTop: 22 }}>
            <BadgeList earned={earned} next={isMe ? nextBadges(stats, 3) : []} />
          </div>
        )}
      </section>

      {/* ---------- Favoritos em destaque ---------- */}
      {(favGames.length > 0 || soundtrack) && (
        <section className="container" style={{ marginTop: 36 }}>
          <div className="favorites card">
            {favGames.length > 0 && (
              <div className="stack" style={{ gap: 14, flex: '999 1 420px' }}>
                <h2 className="label" style={{ margin: 0 }}>Favoritos de {first}</h2>
                <div className="favorites-grid">
                  {favGames.map((g, i) => (
                    <Link key={g.id} href={`/jogo/${g.slug}`} className="favorite" title={g.name}>
                      <span className="favorite-rank display">{i + 1}</span>
                      <span className={plats.has(g.id) ? 'platinum-cover' : undefined} style={{ display: 'block' }}>
                        <Cover game={g} badge={plats.has(g.id) ? '🏆 Platina' : null} />
                      </span>
                      <span className="poster-title" style={{ fontSize: 14 }}>{g.name}</span>
                      {ratingOf.get(g.id) ? <Stars rating={ratingOf.get(g.id)} size={14} /> : null}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {soundtrack && (
              <div className="stack" style={{ gap: 10, flex: '1 1 300px' }}>
                <h2 className="label" style={{ margin: 0 }}>Trilha sonora · 🏆 {soundtrack.game?.name}</h2>
                <iframe title={`Trilha sonora de ${soundtrack.game?.name || 'jogo platinado'}`} src={soundtrack.embed} width="100%" height="352"
                  style={{ border: 0, borderRadius: 12 }} loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" />
              </div>
            )}
          </div>
        </section>
      )}

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
                        <span className="stack" style={{ gap: 4 }}>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{r.games.name}</span>
                          <Stars rating={r.rating} size={12} />
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
              <p className="muted small">Troque foto, capa, cores, moldura e seus 3 favoritos. Ganhe insígnias escrevendo reviews e ajudando na comunidade para desbloquear temas e molduras exclusivos.</p>
              <Link href="/editar-perfil" className="btn">Editar perfil</Link>
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
