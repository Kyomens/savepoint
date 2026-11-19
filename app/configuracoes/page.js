import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/supabase/server';
import { signOut } from '@/app/auth/actions';
import ProfileEditor from './ProfileEditor';

export const metadata = { title: 'Editar perfil' };

export default async function ConfigPage({ searchParams }) {
  const { supabase, user, profile } = await getSession();
  if (!user) redirect('/entrar');

  const topIds = profile?.top_games || [];
  const [{ data: topData }, { data: recent }] = await Promise.all([
    topIds.length ? supabase.from('games').select('*').in('id', topIds) : Promise.resolve({ data: [] }),
    supabase.from('game_entries').select('games(*)').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(12),
  ]);
  const topGames = [0, 1, 2, 3].map((i) => {
    const g = (topData || []).find((x) => x.id === topIds[i]);
    return g ? { id: g.id, slug: g.slug, name: g.name, cover_url: g.cover_url } : null;
  });

  // Artes de jogos para usar como capa: dos favoritos e dos jogos marcados recentemente
  const artworks = [];
  const seen = new Set();
  for (const g of [...(topData || []), ...(recent || []).map((r) => r.games).filter(Boolean)]) {
    if (g.artwork_url && !seen.has(g.artwork_url)) {
      seen.add(g.artwork_url);
      artworks.push({ url: g.artwork_url, name: g.name });
    }
  }

  return (
    <main className="container page" style={{ maxWidth: 760 }}>
      <div className="stack" style={{ gap: 22 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h1 className="display" style={{ fontSize: 28 }}>Editar perfil</h1>
          <Link href={`/u/${profile?.username}`} className="muted small">Ver meu perfil →</Link>
        </div>
        {searchParams?.bemvindo && <p className="success">Conta criada! Deixe seu perfil com a sua cara e depois comece a registrar seus jogos.</p>}
        {searchParams?.erro && <p className="error" role="alert">{searchParams.erro}</p>}
        <ProfileEditor profile={profile} topGames={topGames} artworks={artworks.slice(0, 8)} />
        <form action={signOut}>
          <button type="submit" className="btn">Sair da conta</button>
        </form>
      </div>
    </main>
  );
}
