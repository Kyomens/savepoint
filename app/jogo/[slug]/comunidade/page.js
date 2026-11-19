import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSession } from '@/lib/supabase/server';
import { loadGame, authorStatuses } from '@/lib/games';
import Cover from '@/components/Cover';
import Avatar from '@/components/Avatar';
import FollowButton from '@/components/FollowButton';
import PostCard, { POST_SELECT } from '@/components/PostCard';
import NewPostForm from './NewPostForm';
import { PROFILE_FIELDS } from '@/lib/format';

export async function generateMetadata({ params }) {
  return { title: `Comunidade · ${decodeURIComponent(params.slug).replace(/-/g, ' ')}` };
}

const FILTERS = [
  ['tudo', 'Tudo'],
  ['duvida', 'Dúvidas'],
  ['foto', 'Fotos'],
  ['discussao', 'Discussões'],
  ['amizade', 'Fazer amigos'],
  ['sem', 'Sem resposta'],
];

export default async function ComunidadePage({ params, searchParams }) {
  const { supabase, user, profile } = await getSession();
  const game = await loadGame(supabase, params.slug);
  if (!game) notFound();
  const filter = FILTERS.some(([id]) => id === searchParams?.tipo) ? searchParams.tipo : 'tudo';
  const base = `/jogo/${game.slug}/comunidade`;
  const path = filter === 'tudo' ? base : `${base}?tipo=${filter}`;

  let q = supabase.from('posts').select(POST_SELECT).eq('game_id', game.id).order('created_at', { ascending: false }).limit(50);
  if (filter === 'sem') q = q.eq('type', 'duvida').is('best_reply_id', null);
  else if (filter !== 'tudo') q = q.eq('type', filter);

  const [{ data: posts }, { count: members }, { data: playing }, { data: follows }] = await Promise.all([
    q,
    supabase.from('game_entries').select('id', { count: 'exact', head: true }).eq('game_id', game.id),
    supabase.from('game_entries').select(`user_id, profiles!game_entries_user_id_fkey(${PROFILE_FIELDS})`).eq('game_id', game.id)
      .eq('status', 'jogando').order('updated_at', { ascending: false }).limit(8),
    user ? supabase.from('follows').select('following_id').eq('follower_id', user.id) : Promise.resolve({ data: [] }),
  ]);
  const statuses = await authorStatuses(supabase, game.id, (posts || []).map((p) => p.user_id));
  const followingSet = new Set((follows || []).map((f) => f.following_id));
  const people = (playing || []).filter((p) => p.user_id !== user?.id && p.profiles).slice(0, 5);
  let list = posts || [];
  if (filter === 'sem') list = list.filter((p) => !(p.post_replies?.[0]?.count > 0));

  return (
    <main>
      <section className="hero">
        <div className="container" style={{ paddingTop: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="row" style={{ gap: 20 }}>
            <Link href={`/jogo/${game.slug}`} aria-label={`Voltar para ${game.name}`}><Cover game={game} width={72} /></Link>
            <div style={{ flex: '1 1 300px', minWidth: 0 }}>
              <p className="muted small">Comunidade</p>
              <h1 className="display" style={{ fontSize: 32 }}>{game.name}</h1>
              <p className="muted small" style={{ marginTop: 4 }}>{members || 0} {members === 1 ? 'pessoa marcou' : 'pessoas marcaram'} este jogo</p>
            </div>
          </div>
          <nav className="row" aria-label="Seções do jogo" style={{ gap: 28, fontSize: 14, fontWeight: 600 }}>
            <Link href={`/jogo/${game.slug}`} className="muted" style={{ padding: '12px 0' }}>Visão geral e reviews</Link>
            <Link href={base} aria-current="page" style={{ padding: '12px 0', color: 'var(--strong)', borderBottom: '2px solid var(--accent)' }}>Comunidade</Link>
          </nav>
        </div>
      </section>

      <div className="container page layout">
        <div className="main" style={{ gap: 22 }}>
          {user ? (
            <NewPostForm game={game} profile={profile} />
          ) : (
            <div className="card row" style={{ justifyContent: 'space-between' }}>
              <span>Entre para postar, responder e votar.</span>
              <Link href="/entrar" className="btn btn-accent">Entrar</Link>
            </div>
          )}
          <nav className="tabs" aria-label="Filtrar posts">
            {FILTERS.map(([id, label]) => (
              <Link key={id} href={id === 'tudo' ? base : `${base}?tipo=${id}`} className={`tab ${filter === id ? 'on' : ''}`}>{label}</Link>
            ))}
          </nav>
          <div className="stack" style={{ gap: 16 }}>
            {list.length === 0 && <p className="empty">Nenhum post aqui ainda. Que tal começar a conversa?</p>}
            {list.map((p) => (
              <PostCard key={p.id} post={p} slug={game.slug} userId={user?.id} authorStatus={statuses[p.user_id]} path={path} />
            ))}
          </div>
        </div>

        <aside className="side">
          <section className="card stack" style={{ gap: 12 }}>
            <h2 style={{ fontSize: 17 }}>Começando agora?</h2>
            <p className="muted" style={{ fontSize: 14 }}>
              Ninguém nasce sabendo. Aqui toda dúvida é bem-vinda, e quem já zerou ajuda sem soltar spoiler.
            </p>
            <Link href={`${base}?tipo=duvida`} className="btn btn-accent">Ver dúvidas</Link>
            <Link href={`${base}?tipo=sem`} className="btn">Ajudar quem está sem resposta</Link>
          </section>
          <section className="card">
            <h2 className="label" style={{ marginBottom: 4 }}>Jogando agora</h2>
            <p className="muted small" style={{ marginBottom: 14 }}>Gente jogando este jogo agora. Que tal fazer amizade?</p>
            {people.length === 0 ? (
              <p className="muted small">Ninguém marcou “Jogando” ainda.</p>
            ) : (
              <div className="stack">
                {people.map(({ profiles: m }) => (
                  <div key={m.id} className="row" style={{ flexWrap: 'nowrap' }}>
                    <Avatar profile={m} size={34} />
                    <Link href={`/u/${m.username}`} style={{ flex: 1, fontWeight: 600, fontSize: 14, minWidth: 0 }}>{m.display_name || m.username}</Link>
                    {user && <FollowButton targetId={m.id} following={followingSet.has(m.id)} path={path} small />}
                  </div>
                ))}
              </div>
            )}
          </section>
          <section className="card-dashed">
            <h2 className="label">Regras da comunidade</h2>
            <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, color: 'var(--body)' }}>
              <li>Spoiler só com a marcação de spoiler.</li>
              <li>Seja gentil com quem está começando.</li>
              <li>Sem ofensas, golpes ou pirataria.</li>
              <li>Viu algo errado? Use o botão Denunciar.</li>
            </ol>
          </section>
        </aside>
      </div>
    </main>
  );
}
