/* eslint-disable @next/next/no-img-element */
// frame = moldura conquistada com insígnias (ex.: "critico", "platina")
export default function Avatar({ profile, size = 34, frame }) {
  const f = frame === undefined ? profile?.avatar_frame : frame;
  let inner;
  if (profile?.avatar_url) {
    inner = (
      <img
        src={profile.avatar_url}
        alt=""
        aria-hidden="true"
        className="avatar"
        loading="lazy"
        style={{ width: size, height: size, objectFit: 'cover', background: 'var(--line2)', display: 'block', imageRendering: profile.avatar_url.includes('pixel-art') ? 'pixelated' : 'auto' }}
      />
    );
  } else {
    const name = profile?.display_name || profile?.username || '?';
    inner = (
      <span className="avatar" aria-hidden="true" style={{ width: size, height: size, background: profile?.avatar_color || '#3B4BDB', fontSize: Math.round(size * 0.4) }}>
        {name.trim().charAt(0)}
      </span>
    );
  }
  if (!f) return inner;
  return <span className={`avatar-frame frame-${f}`} style={{ borderRadius: '50%', display: 'inline-flex', flex: 'none' }}>{inner}</span>;
}
