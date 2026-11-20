// Insígnias conquistadas (e, no próprio perfil, as próximas)
export default function BadgeList({ earned, next = [] }) {
  if (!earned.length && !next.length) return null;
  return (
    <div className="stack" style={{ gap: 12 }}>
      {earned.length > 0 && (
        <div className="row" style={{ gap: 8 }}>
          {earned.map((b) => (
            <span key={b.id} className="badge-chip" title={b.desc}>
              <span className="badge-icon" style={{ background: b.color }} aria-hidden="true">{b.icon}</span>
              {b.name}
            </span>
          ))}
        </div>
      )}
      {next.length > 0 && (
        <div className="stack" style={{ gap: 8 }}>
          <span className="muted small">Próximas insígnias</span>
          {next.map((b) => (
            <div key={b.id} className="stack" style={{ gap: 4 }}>
              <div className="row small" style={{ justifyContent: 'space-between' }}>
                <span>{b.name} <span className="muted">· {b.desc}</span></span>
                <span className="muted">{b.have}/{b.min}</span>
              </div>
              <div className="progress"><span style={{ width: `${Math.min(100, (b.have / b.min) * 100)}%` }} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
