import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/supabase/server';
import Avatar from '@/components/Avatar';
import { timeAgo } from '@/lib/format';

export const metadata = { title: 'Mensagens' };

export default async function MensagensPage() {
  const { supabase, user } = await getSession();
  if (!user) redirect('/entrar');

  const [{ data: following }, { data: followers }, msgs] = await Promise.all([
    supabase.from('follows').select('following_id').eq('follower_id', user.id),
    supabase.from('follows').select('follower_id').eq('following_id', user.id),
    supabase.from('messages').select('id, sender_id, recipient_id, body, created_at, read_at')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`).order('created_at', { ascending: false }).limit(500),
  ]);
  const followerSet = new Set((followers || []).map((f) => f.follower_id));
  const mutualIds = (following || []).map((f) => f.following_id).filter((id) => followerSet.has(id));
  const { data: people } = mutualIds.length
    ? await supabase.from('profiles').select('id, username, display_name, avatar_color, avatar_url').in('id', mutualIds)
    : { data: [] };

  // Última mensagem e não lidas por pessoa
  const convo = new Map();
  for (const m of msgs.data || []) {
    const other = m.sender_id === user.id ? m.recipient_id : m.sender_id;
    const c = convo.get(other) || { last: m, unread: 0 };
    if (m.recipient_id === user.id && !m.read_at) c.unread += 1;
    convo.set(other, c);
  }
  const list = (people || []).sort((a, b) => {
    const ta = convo.get(a.id)?.last.created_at || '';
    const tb = convo.get(b.id)?.last.created_at || '';
    return tb.localeCompare(ta);
  });

  return (
    <main className="container page stack" style={{ maxWidth: 720, gap: 20 }}>
      <h1 className="display" style={{ fontSize: 28 }}>Mensagens</h1>
      <p className="muted small">Você pode conversar com quem segue você e é seguido por você.</p>
      {msgs.error && <p className="error">As mensagens ainda não estão ativadas. Rode a atualização do banco (atualizacao-01.sql).</p>}
      {list.length === 0 ? (
        <div className="empty stack" style={{ gap: 12, alignItems: 'center' }}>
          <p>Você ainda não tem amigos mútuos. Siga pessoas e, quando elas seguirem você de volta, aparecem aqui.</p>
          <Link href="/pessoas" className="btn btn-accent">Encontrar pessoas</Link>
        </div>
      ) : (
        <div className="stack" style={{ gap: 0 }}>
          {list.map((p) => {
            const c = convo.get(p.id);
            return (
              <Link key={p.id} href={`/mensagens/${p.username}`} className="row convo" style={{ flexWrap: 'nowrap', gap: 14 }}>
                <Avatar profile={p} size={46} />
                <span className="stack" style={{ gap: 2, flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 600 }}>{p.display_name || p.username}</span>
                  <span className="muted small" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: c?.unread ? 700 : 400, color: c?.unread ? 'var(--text)' : undefined }}>
                    {c ? `${c.last.sender_id === user.id ? 'Você: ' : ''}${c.last.body}` : 'Comece uma conversa'}
                  </span>
                </span>
                <span className="stack" style={{ alignItems: 'flex-end', gap: 4 }}>
                  {c && <span className="muted" style={{ fontSize: 12 }}>{timeAgo(c.last.created_at)}</span>}
                  {c?.unread ? <span className="count-badge">{c.unread}</span> : null}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
