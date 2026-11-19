import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/supabase/server';
import Avatar from '@/components/Avatar';
import AutoRefresh from '@/components/AutoRefresh';
import { timeAgo } from '@/lib/format';
import ChatForm from './ChatForm';

export const metadata = { title: 'Mensagens' };

export default async function ConversaPage({ params }) {
  const { supabase, user } = await getSession();
  if (!user) redirect('/entrar');
  const { data: other } = await supabase.from('profiles').select('*').eq('username', params.username.toLowerCase()).maybeSingle();
  if (!other || other.id === user.id) notFound();

  const { data: rel } = await supabase.from('follows').select('follower_id')
    .or(`and(follower_id.eq.${user.id},following_id.eq.${other.id}),and(follower_id.eq.${other.id},following_id.eq.${user.id})`);
  const mutual = (rel || []).length === 2;
  const name = other.display_name || other.username;

  let messages = [];
  if (mutual) {
    await supabase.rpc('mark_read', { other: other.id });
    const { data } = await supabase.from('messages').select('id, sender_id, body, created_at')
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${other.id}),and(sender_id.eq.${other.id},recipient_id.eq.${user.id})`)
      .order('created_at', { ascending: false }).limit(200);
    messages = data || [];
  }

  return (
    <main className="container page stack" style={{ maxWidth: 760, gap: 16 }}>
      <Link href="/mensagens" className="muted small">← Todas as conversas</Link>
      <Link href={`/u/${other.username}`} className="row" style={{ gap: 12 }}>
        <Avatar profile={other} size={44} />
        <span className="stack" style={{ gap: 0 }}>
          <span style={{ fontWeight: 700, color: 'var(--strong)' }}>{name}</span>
          <span className="muted small">@{other.username}</span>
        </span>
      </Link>

      {!mutual ? (
        <p className="empty">Vocês só podem conversar quando um seguir o outro. Siga {name} e espere seguir você de volta.</p>
      ) : (
        <>
          <AutoRefresh seconds={4} />
          <div className="chat-box" aria-live="polite">
            {/* column-reverse: a conversa já começa rolada até a última mensagem */}
            {messages.length === 0 && <p className="muted small" style={{ textAlign: 'center', margin: 'auto' }}>Diga oi! 👋</p>}
            {messages.map((m) => {
              const mine = m.sender_id === user.id;
              return (
                <div key={m.id} className={`bubble ${mine ? 'mine' : ''}`}>
                  <p style={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{m.body}</p>
                  <span className="bubble-time">{timeAgo(m.created_at)}</span>
                </div>
              );
            })}
          </div>
          <ChatForm recipientId={other.id} username={other.username} />
        </>
      )}
    </main>
  );
}
