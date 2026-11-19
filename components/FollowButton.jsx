import { toggleFollow } from '@/app/social-actions';

export default function FollowButton({ targetId, following, path, small = false }) {
  const style = small ? { minHeight: 36, padding: '6px 12px', fontSize: 13 } : undefined;
  return (
    <form action={toggleFollow}>
      <input type="hidden" name="target_id" value={targetId} />
      <input type="hidden" name="following" value={following ? '1' : '0'} />
      <input type="hidden" name="path" value={path} />
      <button type="submit" className={`btn ${following ? '' : 'btn-accent'}`} style={style} aria-pressed={following}>
        {following ? 'Seguindo' : 'Seguir'}
      </button>
    </form>
  );
}
