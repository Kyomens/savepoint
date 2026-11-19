/* eslint-disable @next/next/no-img-element */
export default function Avatar({ profile, size = 34 }) {
  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt=""
        aria-hidden="true"
        className="avatar"
        loading="lazy"
        style={{ width: size, height: size, objectFit: 'cover', background: 'var(--line2)', imageRendering: profile.avatar_url.includes('pixel-art') ? 'pixelated' : 'auto' }}
      />
    );
  }
  const name = profile?.display_name || profile?.username || '?';
  return (
    <span
      className="avatar"
      aria-hidden="true"
      style={{ width: size, height: size, background: profile?.avatar_color || '#3B4BDB', fontSize: Math.round(size * 0.4) }}
    >
      {name.trim().charAt(0)}
    </span>
  );
}
