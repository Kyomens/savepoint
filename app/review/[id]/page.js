import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSession } from '@/lib/supabase/server';
import ReviewCard, { REVIEW_SELECT } from '@/components/ReviewCard';
import Avatar from '@/components/Avatar';
import SubmitButton from '@/components/SubmitButton';
import { timeAgo } from '@/lib/format';
import { addComment, deleteComment } from '@/app/jogo/[slug]/actions';

export const metadata = { title: 'Review' };

export default async function ReviewPage({ params }) {
  const id = Number(params.id);
  const { supabase, user } = await getSession();
  const { data: entry } = await supabase.from('game_entries').select(REVIEW_SELECT).eq('id', id).maybeSingle();
  if (!entry || !entry.review) notFound();
  const { data: comments } = await supabase.from('review_comments')
    .select('id, body, created_at, user_id, profiles(username, display_name, avatar_color)').eq('entry_id', id).order('created_at');

  return (
    <main className="container page stack" style={{ maxWidth: 760, gap: 24 }}>
      <Link href={`/jogo/${entry.games.slug}`} className="muted small">← {entry.games.name}</Link>
      <ReviewCard entry={entry} userId={user?.id} path={`/review/${id}`} />
      <section className="stack" style={{ gap: 16 }}>
        <h2 className="label" style={{ margin: 0 }}>Comentários</h2>
        {(comments || []).map((c) => (
          <div key={c.id} className="row" style={{ alignItems: 'flex-start', gap: 12, flexWrap: 'nowrap' }}>
            <Avatar profile={c.profiles} size={32} />
            <div className="stack" style={{ gap: 4, flex: 1, minWidth: 0 }}>
              <div className="row small" style={{ gap: 8 }}>
                <Link href={`/u/${c.profiles.username}`} style={{ fontWeight: 600 }}>{c.profiles.display_name || c.profiles.username}</Link>
                <span className="muted">{timeAgo(c.created_at)}</span>
                {user?.id === c.user_id && (
                  <form action={deleteComment}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="entry_id" value={id} />
                    <button className="pill" style={{ minHeight: 28, padding: '2px 10px' }}>apagar</button>
                  </form>
                )}
              </div>
              <p className="review-text" style={{ fontSize: 14 }}>{c.body}</p>
            </div>
          </div>
        ))}
        {(comments || []).length === 0 && <p className="muted small">Nenhum comentário ainda.</p>}
        {user ? (
          <form action={addComment} className="stack" style={{ gap: 10 }}>
            <input type="hidden" name="entry_id" value={id} />
            <label className="sr-only" htmlFor="comentario">Seu comentário</label>
            <textarea id="comentario" className="field" name="body" rows={3} maxLength={2000} required placeholder="Escreva um comentário…" />
            <div><SubmitButton pendingText="Enviando…">Comentar</SubmitButton></div>
          </form>
        ) : (
          <p className="muted small"><Link href="/entrar" style={{ color: 'var(--accent-text)' }}>Entre</Link> para comentar.</p>
        )}
      </section>
    </main>
  );
}
