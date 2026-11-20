import Link from 'next/link';
import { getSession } from '@/lib/supabase/server';
import { homeLists } from '@/lib/igdb';
import Cover from '@/components/Cover';
import Avatar from '@/components/Avatar';
import GameRow from '@/components/GameRow';
import CopyButton from '@/components/CopyButton';
import ReviewCard, { REVIEW_SELECT } from '@/components/ReviewCard';
import { STATUS_VERB, PROFILE_FIELDS, formatDate } from '@/lib/format';
import Stars from '@/components/Stars';

const FEATURES = [
  ['Seu diário de jogos', 'Marque o que está jogando, o que zerou e o que quer jogar. Dê notas de meia a 5 estrelas.'],
  ['Reviews e amigos', 'Escreva o que achou, siga amigos e descubra jogos pelas recomendações de quem tem o seu gosto.'],
  ['Comunidade de cada jogo', 'Tire dúvidas, poste prints e encontre gente jogando o mesmo jogo que você.'],
];

export default async function Home() {
  const { supabase, user, profile } = await getSession();

  const [lists, savepointTop, communityReviews, follows] = await Promise.all([
    homeLists().catch((e) => {
      console.error('homeLists:', e.message);
      return {};
    }),
    supabase.from('game_stats').select('*').gte('ratings_count', 1)
      .order('avg_stars', { ascending: false }).order('ratings_count', { ascending: false }).limit(6)
      .then((r) => r.data || []),
    supabase.from('game_entries').select(REVIEW_SELECT).not('review', 'is', null)
      .order('updated_at', { ascending: false }).limit(6).then((r) => r.data || []),
    user ? supabase.from('follows').select('following_id').eq('follower_id', user.id).then((r) => r.data || []) : Promise.resolve([]),
  ]);

  const trending = lists['em-alta'] || [];
  const heroGame = trending.find((g) => g.artwork_url);
  const friendIds = follows.map((f) => f.following_id);

  let activity = [];
  let friendReviews = [];
  if (friendIds.length) {
    const [a, r] = await Promise.all([
      supabase.from('game_entries')
        .select(`id, status, rating, updated_at, profiles!game_entries_user_id_fkey(${PROFILE_FIELDS}), games(slug, name, cover_url)`)
        .in('user_id', friendIds).not('status', 'is', null).order('updated_at', { ascending: false }).limit(6),
      supabase.from('game_entries').select(REVIEW_SELECT).in('user_id', friendIds).not('review', 'is', null)
        .order('updated_at', { ascending: false }).limit(3),
    ]);
    activity = a.data || [];
    friendReviews = r.data || [];
  }

  return (
    <main>
      {/* ---------- Topo com arte de um jogo em alta ---------- */}
      <section className="home-hero">
        {heroGame && <div className="home-hero-art" style={{ backgroundImage: `url("${heroGame.artwork_url}")` }} aria-hidden="true" />}
        <div className="home-hero-shade" aria-hidden="true" />
        <div className="container home-hero-inner">
          {user ? (
            <>
              <h1 className="display hero-title">Bem-vindo de volta, {profile?.display_name || profile?.username}.</h1>
              <p className="hero-sub">Veja o que seus amigos andam jogando, descubra lançamentos e registre o que você jogou.</p>
              <div className="row">
                <Link href="/jogos" className="btn btn-accent">Explorar jogos</Link>
                <Link href={`/u/${profile?.username}`} className="btn btn-on-image">Meu perfil</Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="display hero-title">Registre os jogos que você jogou.<br />Descubra o que jogar a seguir.</h1>
              <p className="hero-sub">Avalie, escreva reviews, siga seus amigos e participe da comunidade de cada jogo.</p>
              <div className="row">
                <Link href="/cadastro" className="btn btn-accent">Criar conta grátis</Link>
                <Link href="/entrar" className="btn btn-on-image">Já tenho conta</Link>
              </div>
            </>
          )}
        </div>
        {heroGame && (
          <Link href={`/jogo/${heroGame.slug}`} className="hero-credit">Arte: {heroGame.name}</Link>
        )}
      </section>

      <div className="container page stack" style={{ gap: 52 }}>
        {/* ---------- Visitantes: o que dá para fazer ---------- */}
        {!user && (
          <section className="feature-grid">
            {FEATURES.map(([title, text]) => (
              <div key={title} className="card stack" style={{ gap: 8 }}>
                <h2 style={{ fontSize: 18 }}>{title}</h2>
                <p className="muted" style={{ fontSize: 14 }}>{text}</p>
              </div>
            ))}
          </section>
        )}

        {/* ---------- Usuário logado: amigos ---------- */}
        {user && (friendIds.length === 0 ? (
          <section className="card-dashed row" style={{ justifyContent: 'space-between', gap: 16 }}>
            <div className="stack" style={{ gap: 4, flex: '1 1 320px' }}>
              <h2 style={{ fontSize: 18 }}>Siga seus amigos</h2>
              <p className="muted" style={{ fontSize: 14 }}>Assim aparece aqui o que eles estão jogando, as notas e as reviews.</p>
            </div>
            <div className="row">
              <Link href="/pessoas" className="btn btn-accent">Encontrar pessoas</Link>
              <CopyButton className="btn">Copiar link de convite</CopyButton>
            </div>
          </section>
        ) : (
          <section className="stack" style={{ gap: 14 }}>
            <div className="section-head" style={{ marginBottom: 0, borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>
              <h2 className="row-title">Atividade dos amigos</h2>
            </div>
            {activity.length === 0 ? (
              <p className="muted small">Seus amigos ainda não marcaram nenhum jogo.</p>
            ) : (
              <div className="poster-row">
                {activity.map((a) => (
                  <Link key={a.id} href={`/jogo/${a.games.slug}`} className="cover-item" title={`${a.profiles.username} ${STATUS_VERB[a.status]} ${a.games.name}`}>
                    <Cover game={a.games} />
                    <span className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                      <Avatar profile={a.profiles} size={20} />
                      {a.rating ? <Stars rating={a.rating} size={12} /> : <span className="muted" style={{ fontSize: 12 }}>{STATUS_VERB[a.status]}</span>}
                    </span>
                  </Link>
                ))}
              </div>
            )}
            {friendReviews.length > 0 && (
              <div>{friendReviews.map((r) => <ReviewCard key={r.id} entry={r} userId={user.id} path="/" />)}</div>
            )}
          </section>
        ))}

        {/* ---------- Descoberta ---------- */}
        <GameRow title="Em alta" subtitle="Os jogos mais comentados do último ano" href="/jogos?ordem=em-alta" games={trending.slice(0, 6)} />
        <GameRow title="Lançamentos recentes" href="/jogos?ordem=lancamentos" games={(lists.lancamentos || []).slice(0, 6)}
          badge={(g) => (g.release_date ? formatDate(g.release_date) : null)} />
        <GameRow title="Aclamados pela crítica" subtitle="Maiores notas da crítica especializada" href="/jogos?ordem=critica"
          games={(lists.critica || []).slice(0, 6)} badge={(g) => (g.critic_score ? `Crítica ${g.critic_score}` : null)} />
        <GameRow title="Favoritos do Savepoint" subtitle="Maiores notas dadas pela nossa comunidade" href="/jogos?ordem=savepoint"
          games={savepointTop} badge={(g) => `★ ${Number(g.avg_stars).toFixed(1)}`} />
        <GameRow title="Em breve" subtitle="Os lançamentos mais aguardados" href="/jogos?ordem=em-breve" games={(lists['em-breve'] || []).slice(0, 6)}
          badge={(g) => (g.release_date ? formatDate(g.release_date) : null)} />

        {/* ---------- Reviews da comunidade ---------- */}
        <section className="stack" style={{ gap: 4 }}>
          <div className="section-head" style={{ marginBottom: 0, borderBottom: '1px solid var(--line)', paddingBottom: 10 }}>
            <h2 className="row-title">Reviews recentes da comunidade</h2>
          </div>
          {communityReviews.length === 0 ? (
            <p className="muted small" style={{ paddingTop: 12 }}>Nenhuma review ainda. Que tal escrever a primeira?</p>
          ) : (
            <div>{communityReviews.map((r) => <ReviewCard key={r.id} entry={r} userId={user?.id} path="/" />)}</div>
          )}
        </section>

        {!user && (
          <section className="card stack" style={{ alignItems: 'center', textAlign: 'center', gap: 12, padding: 36 }}>
            <h2 className="display" style={{ fontSize: 26 }}>Bora montar seu perfil gamer?</h2>
            <p className="muted">É grátis e leva menos de um minuto.</p>
            <Link href="/cadastro" className="btn btn-accent">Criar conta</Link>
          </section>
        )}

        <footer className="muted small" style={{ borderTop: '1px solid var(--line)', paddingTop: 20 }}>
          Savepoint · Dados de jogos fornecidos pelo IGDB.com
        </footer>
      </div>
    </main>
  );
}
