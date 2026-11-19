/* eslint-disable @next/next/no-img-element */
export default function Cover({ game, width, style }) {
  return (
    <div className="cover" style={{ width, ...style }}>
      {game?.cover_url ? (
        <img src={game.cover_url} alt={`Capa de ${game.name}`} loading="lazy" />
      ) : (
        <span className="cover-fallback">{game?.name}</span>
      )}
    </div>
  );
}
