export default function Avatar({ profile, size = 34 }) {
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
