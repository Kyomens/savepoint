/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import Avatar from './Avatar';
import { POST_TYPES, timeAgo } from '@/lib/format';
import { toggleVote } from '@/app/jogo/[slug]/comunidade/actions';

export const POST_SELECT =
  'id, type, title, body, image_url, has_spoiler, best_reply_id, created_at, user_id, profiles(username, display_name, avatar_color), post_votes(user_id), post_replies!post_replies_post_id_fkey(count), best:post_replies!posts_best_reply_fk(id, body, profiles(username, display_name, avatar_color))';

export function PlayerBadge({ status }) {
  if (status === 'zerado') return <span className="badge vet">Zerou o jogo</span>;
  if (status === 'jogando') return <span className="badge new">Jogando</span>;
  if (status === 'abandonado') return <span className="badge type">Abandonou</span>;
  return null;
}

export default function PostCard({ post, slug, userId, authorStatus, path, full = false }) {
  const p = post.profiles;
  const votes = post.post_votes?.length || 0;
  const voted = !!userId && post.post_votes?.some((v) => v.user_id === userId);
  const replies = post.post_replies?.[0]?.count || 0;
  const link = `/jogo/${slug}/comunidade/${post.id}`;
  const content = (
    <>
      {post.body && <p className="review-text">{post.body}</p>}
      {post.image_url && (
        <img src={post.image_url} alt={`Imagem enviada por ${p.username}`} loading="lazy"
          style={{ borderRadius: 12, border: '1px solid var(--line)', maxHeight: full ? 'none' : 420, width: '100%', objectFit: 'cover' }} />
      )}
    </>
  );
  return (
    <article className="card stack" style={{ gap: 12, padding: 18 }}>
      <div className="row" style={{ gap: 10, fontSize: 14 }}>
        <Avatar profile={p} size={34} />
        <Link href={`/u/${p.username}`} style={{ fontWeight: 600 }}>{p.display_name || p.username}</Link>
        <PlayerBadge status={authorStatus} />
        <span className="muted small">· {timeAgo(post.created_at)}</span>
        <span className="badge type" style={{ marginLeft: 'auto' }}>{POST_TYPES[post.type]}</span>
      </div>
      {full ? (
        <h1 style={{ fontSize: 24, lineHeight: 1.3 }}>{post.title}</h1>
      ) : (
        <h2 style={{ fontSize: 18, lineHeight: 1.35 }}><Link href={link} style={{ color: 'var(--strong)' }}>{post.title}</Link></h2>
      )}
      {post.has_spoiler ? (
        <details className="spoiler">
          <summary>Este post contém spoiler. <span style={{ color: 'var(--text)', fontWeight: 600 }}>Mostrar mesmo assim</span></summary>
          <div className="stack">{content}</div>
        </details>
      ) : (
        content
      )}
      {!full && post.best && (
        <div className="solved">
          <div className="row small" style={{ gap: 8 }}>
            <span className="solved-title">✓ Melhor resposta</span>
            <span className="muted">por</span>
            <span style={{ fontWeight: 600 }}>{post.best.profiles?.display_name || post.best.profiles?.username}</span>
          </div>
          <p className="review-text" style={{ fontSize: 14, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{post.best.body}</p>
        </div>
      )}
      {!full && post.type === 'duvida' && !post.best && replies === 0 && (
        <p className="small" style={{ fontWeight: 600, color: 'var(--accent-text)' }}>Ainda sem resposta — ajude quem está começando!</p>
      )}
      <div className="row" style={{ gap: 8, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
        {userId ? (
          <form action={toggleVote}>
            <input type="hidden" name="post_id" value={post.id} />
            <input type="hidden" name="voted" value={voted ? '1' : '0'} />
            <input type="hidden" name="path" value={path} />
            <button type="submit" className={`pill ${voted ? 'on' : ''}`} aria-pressed={voted}>▲ {votes} útil</button>
          </form>
        ) : (
          <span className="pill">▲ {votes} útil</span>
        )}
        <Link href={link} className="pill">{replies} {replies === 1 ? 'resposta' : 'respostas'}</Link>
        {!full && <Link href={link} className="pill">Responder</Link>}
      </div>
    </article>
  );
}
