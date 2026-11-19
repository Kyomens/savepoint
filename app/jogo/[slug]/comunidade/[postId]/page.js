import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSession } from '@/lib/supabase/server';
import { loadGame, authorStatuses } from '@/lib/games';
import Avatar from '@/components/Avatar';
import SubmitButton from '@/components/SubmitButton';
import PostCard, { POST_SELECT, PlayerBadge } from '@/components/PostCard';
import { timeAgo, PROFILE_FIELDS } from '@/lib/format';
import { report } from '@/app/jogo/[slug]/actions';
import { addReply, deleteReply, deletePost, markBest } from '../actions';

export const metadata = { title: 'Post' };

function ReportButton({ kind, id, path }) {
  return (
    <form action={report}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="target_id" value={id} />
      <input type="hidden" name="path" value={path} />
      <button type="submit" className="pill" style={{ minHeight: 28, padding: '2px 10px' }}>Denunciar</button>
    </form>
  );
}

export default async function PostPage({ params }) {
  const { supabase, user } = await getSession();
  const game = await loadGame(supabase, params.slug);
  if (!game) notFound();
  const id = Number(params.postId);
  const { data: post } = await supabase.from('posts').select(POST_SELECT).eq('id', id).eq('game_id', game.id).maybeSingle();
  if (!post) notFound();
  const { data: replies } = await supabase.from('post_replies')
    .select(`id, body, created_at, user_id, profiles(${PROFILE_FIELDS})`).eq('post_id', id).order('created_at');
  const statuses = await authorStatuses(supabase, game.id, [post.user_id, ...(replies || []).map((r) => r.user_id)]);
  const listPath = `/jogo/${game.slug}/comunidade`;
  const path = `${listPath}/${id}`;
  const isAuthor = user?.id === post.user_id;
  const sorted = [...(replies || [])].sort((a, b) => (b.id === post.best_reply_id) - (a.id === post.best_reply_id));

  return (
    <main className="container page stack" style={{ maxWidth: 780, gap: 22 }}>
      <Link href={listPath} className="muted small">← Comunidade de {game.name}</Link>
      <PostCard post={post} slug={game.slug} userId={user?.id} authorStatus={statuses[post.user_id]} path={path} full />
      <div className="row" style={{ gap: 8 }}>
        {isAuthor && (
          <form action={deletePost}>
            <input type="hidden" name="post_id" value={id} />
            <input type="hidden" name="slug" value={game.slug} />
            <button type="submit" className="pill">Apagar meu post</button>
          </form>
        )}
        {user && !isAuthor && <ReportButton kind="post" id={id} path={path} />}
      </div>

      <section className="stack" style={{ gap: 0 }}>
        <h2 className="label">{(replies || []).length} {(replies || []).length === 1 ? 'resposta' : 'respostas'}</h2>
        {sorted.map((r) => {
          const best = r.id === post.best_reply_id;
          return (
            <div key={r.id} className={best ? 'solved' : ''} style={{ display: 'flex', gap: 12, padding: best ? 14 : '16px 0', borderTop: best ? undefined : '1px solid var(--line)', marginBottom: best ? 8 : 0, flexDirection: 'row' }}>
              <Avatar profile={r.profiles} size={34} />
              <div className="stack" style={{ gap: 6, flex: 1, minWidth: 0 }}>
                <div className="row small" style={{ gap: 8 }}>
                  {best && <span className="solved-title">✓ Melhor resposta</span>}
                  <Link href={`/u/${r.profiles.username}`} style={{ fontWeight: 600 }}>{r.profiles.display_name || r.profiles.username}</Link>
                  <PlayerBadge status={statuses[r.user_id]} />
                  <span className="muted">{timeAgo(r.created_at)}</span>
                </div>
                <p className="review-text" style={{ fontSize: 14 }}>{r.body}</p>
                <div className="row" style={{ gap: 6 }}>
                  {isAuthor && post.type === 'duvida' && (
                    <form action={markBest}>
                      <input type="hidden" name="post_id" value={id} />
                      <input type="hidden" name="reply_id" value={best ? '' : r.id} />
                      <input type="hidden" name="path" value={path} />
                      <input type="hidden" name="list_path" value={listPath} />
                      <button type="submit" className="pill" style={{ minHeight: 28, padding: '2px 10px' }}>{best ? 'Desmarcar melhor resposta' : 'Marcar como melhor resposta'}</button>
                    </form>
                  )}
                  {user?.id === r.user_id && (
                    <form action={deleteReply}>
                      <input type="hidden" name="reply_id" value={r.id} />
                      <input type="hidden" name="path" value={path} />
                      <button type="submit" className="pill" style={{ minHeight: 28, padding: '2px 10px' }}>Apagar</button>
                    </form>
                  )}
                  {user && user.id !== r.user_id && <ReportButton kind="reply" id={r.id} path={path} />}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {user ? (
        <form action={addReply} className="card stack" style={{ gap: 10 }}>
          <input type="hidden" name="post_id" value={id} />
          <input type="hidden" name="path" value={path} />
          <label className="form-label" htmlFor="resposta">Sua resposta</label>
          <textarea id="resposta" className="field" name="body" rows={4} maxLength={3000} required placeholder="Ajude com o que você sabe. Se tiver spoiler, avise antes!" />
          <div><SubmitButton pendingText="Enviando…">Responder</SubmitButton></div>
        </form>
      ) : (
        <p className="muted small"><Link href="/entrar" style={{ color: 'var(--accent-text)' }}>Entre</Link> para responder.</p>
      )}
    </main>
  );
}
