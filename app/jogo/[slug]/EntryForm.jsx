'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { saveEntry } from './actions';

const STATUSES = [
  ['jogando', 'Jogando'],
  ['zerado', 'Zerado'],
  ['abandonado', 'Abandonado'],
  ['quero', 'Quero jogar'],
];

function StarPicker({ value, onChange }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }} onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const full = shown >= n * 2;
        const half = !full && shown === n * 2 - 1;
        return (
          <span key={n} style={{ position: 'relative', width: 40, height: 44, fontSize: 34, lineHeight: '44px', textAlign: 'center' }}>
            <span aria-hidden="true" style={{ color: 'var(--off)' }}>★</span>
            {(full || half) && (
              <span aria-hidden="true" style={{ position: 'absolute', inset: 0, color: 'var(--accent-text)', overflow: 'hidden', width: full ? '100%' : '50%' }}>★</span>
            )}
            <button type="button" aria-label={`${n - 0.5} estrelas`} onMouseEnter={() => setHover(n * 2 - 1)} onClick={() => onChange(value === n * 2 - 1 ? 0 : n * 2 - 1)}
              style={{ position: 'absolute', left: 0, top: 0, width: '50%', height: '100%', background: 'transparent', border: 0, cursor: 'pointer', padding: 0 }} />
            <button type="button" aria-label={`${n} estrelas`} onMouseEnter={() => setHover(n * 2)} onClick={() => onChange(value === n * 2 ? 0 : n * 2)}
              style={{ position: 'absolute', right: 0, top: 0, width: '50%', height: '100%', background: 'transparent', border: 0, cursor: 'pointer', padding: 0 }} />
          </span>
        );
      })}
    </div>
  );
}

export default function EntryForm({ game, entry, loggedIn }) {
  const [status, setStatus] = useState(entry?.status || '');
  const [rating, setRating] = useState(entry?.rating || 0);
  const [review, setReview] = useState(entry?.review || '');
  const [spoiler, setSpoiler] = useState(!!entry?.has_spoiler);
  const [openReview, setOpenReview] = useState(!!entry?.review);
  const [msg, setMsg] = useState('');
  const [pending, startTransition] = useTransition();

  if (!loggedIn) {
    return (
      <div className="card stack" style={{ gap: 12 }}>
        <p style={{ fontWeight: 600 }}>Quer avaliar este jogo?</p>
        <p className="muted small">Entre para marcar o status, dar nota e escrever sua review.</p>
        <Link href="/entrar" className="btn btn-accent">Entrar</Link>
        <Link href="/cadastro" className="btn">Criar conta</Link>
      </div>
    );
  }

  function save(next = {}) {
    const fd = new FormData();
    fd.set('game_id', game.id);
    fd.set('slug', game.slug);
    fd.set('status', next.status ?? status);
    fd.set('rating', next.rating ?? rating);
    fd.set('review', next.review ?? review);
    if (next.spoiler ?? spoiler) fd.set('has_spoiler', 'on');
    setMsg('');
    startTransition(async () => {
      const res = await saveEntry(fd);
      setMsg(res?.error || 'Salvo!');
      setTimeout(() => setMsg(''), 2000);
    });
  }

  return (
    <div className="card stack" style={{ gap: 18 }}>
      <div>
        <p className="small muted" style={{ fontWeight: 600, marginBottom: 10 }}>Status</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          {STATUSES.map(([id, label]) => (
            <button key={id} type="button" aria-pressed={status === id} className={`btn ${status === id ? 'btn-accent' : ''}`} style={{ fontSize: 14, padding: 10 }}
              onClick={() => { const s = status === id ? '' : id; setStatus(s); save({ status: s }); }}>
              {label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="small muted" style={{ fontWeight: 600, marginBottom: 4 }}>
          Sua nota {rating ? <span style={{ color: 'var(--text)' }}>{rating / 2}/5</span> : null}
        </p>
        <StarPicker value={rating} onChange={(r) => { setRating(r); save({ rating: r }); }} />
      </div>
      {openReview ? (
        <div className="stack" style={{ gap: 10 }}>
          <label className="form-label">
            Sua review
            <textarea className="field" rows={5} maxLength={5000} value={review} onChange={(e) => setReview(e.target.value)} placeholder="O que você achou do jogo?" />
          </label>
          <label className="row small muted" style={{ gap: 8 }}>
            <input type="checkbox" checked={spoiler} onChange={(e) => setSpoiler(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} />
            Minha review tem spoiler
          </label>
          <button type="button" className="btn btn-accent" disabled={pending} onClick={() => save()}>
            {pending ? 'Salvando…' : 'Publicar review'}
          </button>
        </div>
      ) : (
        <button type="button" className="btn btn-accent" onClick={() => setOpenReview(true)}>Escrever review</button>
      )}
      <p className="small" aria-live="polite" style={{ minHeight: 20, color: msg === 'Salvo!' ? 'var(--solved)' : 'var(--danger)' }}>
        {pending ? <span className="muted">Salvando…</span> : msg}
      </p>
    </div>
  );
}
