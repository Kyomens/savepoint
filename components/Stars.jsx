// Estrelas desenhadas (inteiras e meia estrela), no lugar de "★★★★½"
const PATH = 'M12 2.6l2.85 6.07 6.65.78-4.92 4.56 1.31 6.57L12 17.3l-5.89 3.28 1.31-6.57L2.5 9.45l6.65-.78z';

export function StarIcon({ size = 14, color = 'var(--accent-text)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
      <path d={PATH} fill={color} />
    </svg>
  );
}

// fill: 0 (vazia), 0.5 (meia) ou 1 (cheia)
export function PartialStar({ size = 14, fill = 1, color = 'var(--accent-text)', empty = 'var(--off)' }) {
  return (
    <span style={{ position: 'relative', width: size, height: size, display: 'inline-block', flex: 'none' }}>
      {empty && <span style={{ position: 'absolute', inset: 0 }}><StarIcon size={size} color={empty} /></span>}
      {fill > 0 && (
        <span style={{ position: 'absolute', left: 0, top: 0, height: size, width: fill >= 1 ? size : size / 2, overflow: 'hidden' }}>
          <StarIcon size={size} color={color} />
        </span>
      )}
    </span>
  );
}

// Mostra só as estrelas conquistadas (ex.: 4 e meia = 4 cheias + 1 meia), como no Letterboxd
export default function Stars({ rating, size = 14 }) {
  if (!rating) return null;
  const full = Math.floor(rating / 2);
  const half = rating % 2 === 1;
  return (
    <span className="stars-row" role="img" aria-label={`${rating / 2} de 5 estrelas`}>
      {Array.from({ length: full }, (_, i) => <StarIcon key={i} size={size} />)}
      {half && <PartialStar size={size} fill={0.5} empty={null} />}
    </span>
  );
}
