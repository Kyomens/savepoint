import Link from 'next/link';
import { getSession } from '@/lib/supabase/server';
import Avatar from '@/components/Avatar';
import FollowButton from '@/components/FollowButton';

export const metadata = { title: 'Pessoas' };

export default async function PessoasPage({ searchParams }) {
  const q = String(searchParams?.q || '').trim().toLowerCase().replace(/[^a-z0-9._ ]/g, '');
  const { supabase, user } = await getSession();
  let query = supabase.from('profiles').select('id, username, display_name, avatar_color, bio').order('created_at', { ascending: false }).limit(40);
  if (q) query = query.or(`username.ilike.%${q}%,display_name.ilike.%${q}%`);
  const { data: people } = await query;
  const { data: follows } = user ? await supabase.from('follows').select('following_id').eq('follower_id', user.id) : { data: [] };
  const followingSet = new Set((follows || []).map((f) => f.following_id));
  const list = (people || []).filter((p) => p.id !== user?.id);
  const path = `/pessoas${q ? `?q=${encodeURIComponent(q)}` : ''}`;

  return (
    <main className="container page stack" style={{ maxWidth: 720, gap: 22 }}>
      <h1 className="display" style={{ fontSize: 28 }}>Pessoas</h1>
      <form action="/pessoas" className="row" role="search">
        <label className="sr-only" htmlFor="busca-pessoas">Buscar pessoas</label>
        <input id="busca-pessoas" className="field" type="search" name="q" defaultValue={q} placeholder="Buscar pelo nome de usuário…" style={{ flex: 1 }} />
        <button className="btn btn-accent" type="submit">Buscar</button>
      </form>
      <p className="label" style={{ margin: 0 }}>{q ? 'Resultados' : 'Quem chegou por último'}</p>
      {list.length === 0 && <p className="empty">Ninguém encontrado.</p>}
      <div className="stack" style={{ gap: 0 }}>
        {list.map((p) => (
          <div key={p.id} className="row" style={{ gap: 14, padding: '14px 0', borderTop: '1px solid var(--line)', flexWrap: 'nowrap' }}>
            <Avatar profile={p} size={44} />
            <Link href={`/u/${p.username}`} className="stack" style={{ gap: 2, flex: 1, minWidth: 0 }}>
              <span style={{ fontWeight: 600 }}>{p.display_name || p.username}</span>
              <span className="muted small" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{p.username}{p.bio ? ` · ${p.bio}` : ''}</span>
            </Link>
            {user && <FollowButton targetId={p.id} following={followingSet.has(p.id)} path={path} small />}
          </div>
        ))}
      </div>
    </main>
  );
}
