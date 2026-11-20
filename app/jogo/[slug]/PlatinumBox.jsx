'use client';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { verifyPlatinum } from './actions';

export default function PlatinumBox({ game, platinum, steamLinked }) {
  const [msg, setMsg] = useState(null);
  const [pending, start] = useTransition();

  if (platinum) {
    return (
      <div className="platinum-box on">
        <span className="trophy" aria-hidden="true">🏆</span>
        <span className="stack" style={{ gap: 2 }}>
          <strong>Platinado!</strong>
          <span className="small muted">Verificado pela Steam. Você ganhou a insígnia Platinador e pode colocar a trilha sonora no perfil.</span>
        </span>
      </div>
    );
  }

  return (
    <div className="platinum-box stack" style={{ gap: 10 }}>
      <span className="small" style={{ fontWeight: 600 }}>🏆 Platinou este jogo?</span>
      {steamLinked ? (
        <>
          <button type="button" className="btn" disabled={pending}
            onClick={() => {
              const fd = new FormData();
              fd.set('game_id', game.id);
              fd.set('slug', game.slug);
              setMsg(null);
              start(async () => setMsg(await verifyPlatinum(fd)));
            }}>
            {pending ? 'Conferindo na Steam…' : 'Verificar platina na Steam'}
          </button>
          {msg?.error && <p className="small" style={{ color: 'var(--danger)' }} role="alert">{msg.error}</p>}
          {msg?.ok && <p className="small success" role="status">Platina confirmada! 🎉</p>}
        </>
      ) : (
        <p className="small muted">
          <Link href="/configuracoes" style={{ color: 'var(--accent-text)' }}>Conecte sua Steam</Link> para comprovar e ganhar recompensas.
        </p>
      )}
    </div>
  );
}
