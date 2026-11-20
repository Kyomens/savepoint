import Link from 'next/link';
import Avatar from './Avatar';
import Cover from './Cover';
import { timeAgo, PROFILE_FIELDS } from '@/lib/format';
import Stars from './Stars';
import { toggleLike } from '@/app/jogo/[slug]/actions';

// Campos que a consulta precisa trazer para este cartão:
// "profiles!game_entries_user_id_fkey" diz ao banco QUAL ligação usar entre review e perfil
// (sem isso ele se confunde com a tabela de curtidas e não devolve nada)
export const REVIEW_SELECT = `id, rating, review, has_spoiler, spoiler_scope, status, updated_at, user_id, game_id, profiles!game_entries_user_id_fkey(${PROFILE_FIELDS}), games(slug, name, cover_url), review_likes(user_id), review_comments(count)`;

export default function ReviewCard({ entry, userId, showGame = true, path = '/' }) {
  const p = entry.profiles;
  const g = entry.games;
  const likes = entry.review_likes?.length || 0;
  const liked = !!userId && entry.review_likes?.some((l) => l.user_id === userId);
  const comments = entry.review_comments?.[0]?.count || 0;
  return (
    <article className="review">
      {showGame && g && (
        <Link href={`/jogo/${g.slug}`} aria-label={g.name}>
          <Cover game={g} width={84} />
        </Link>
      )}
      {!showGame && <Avatar profile={p} size={40} />}
      <div className="stack" style={{ gap: 8, minWidth: 0, flex: 1 }}>
        <div className="row" style={{ fontSize: 14, gap: 8 }}>
          {showGame && <Avatar profile={p} size={24} />}
          <Link href={`/u/${p.username}`} style={{ fontWeight: 600 }}>{p.display_name || p.username}</Link>
          {showGame && g && (
            <>
              <span className="muted">avaliou</span>
              <Link href={`/jogo/${g.slug}`} className="display" style={{ fontWeight: 600, color: 'var(--strong)' }}>{g.name}</Link>
            </>
          )}
          <Stars rating={entry.rating} />
          <span className="muted small">{timeAgo(entry.updated_at)}</span>
        </div>
        {entry.has_spoiler ? (
          <details className="spoiler">
            <summary>
              <span>Spoiler{entry.spoiler_scope ? <> até: <strong style={{ color: 'var(--text)' }}>{entry.spoiler_scope}</strong></> : ''}.</span>
              <span style={{ color: 'var(--text)', fontWeight: 600 }}>Mostrar mesmo assim</span>
            </summary>
            <p className="review-text">{entry.review}</p>
          </details>
        ) : (
          <p className="review-text">{entry.review}</p>
        )}
        <div className="row" style={{ gap: 8 }}>
          {userId ? (
            <form action={toggleLike}>
              <input type="hidden" name="entry_id" value={entry.id} />
              <input type="hidden" name="liked" value={liked ? '1' : '0'} />
              <input type="hidden" name="path" value={path} />
              <button type="submit" className={`pill ${liked ? 'liked' : ''}`} aria-pressed={liked}>♥ {likes}</button>
            </form>
          ) : (
            <span className="pill">♥ {likes}</span>
          )}
          <Link href={`/review/${entry.id}`} className="pill">{comments} {comments === 1 ? 'comentário' : 'comentários'}</Link>
        </div>
      </div>
    </article>
  );
}
