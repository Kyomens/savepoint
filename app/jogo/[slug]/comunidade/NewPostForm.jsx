'use client';
import { useRef, useState } from 'react';
import Avatar from '@/components/Avatar';
import SubmitButton from '@/components/SubmitButton';
import { ImageIcon } from '@/components/Icons';
import { createPost } from './actions';

const TYPES = [
  ['duvida', 'Dúvida', 'Qual é a sua dúvida sobre o jogo?'],
  ['foto', 'Foto', 'Dê um título para o seu print…'],
  ['discussao', 'Discussão', 'Sobre o que você quer conversar?'],
  ['amizade', 'Fazer amigos', 'Conte onde você está no jogo e que tipo de amigo procura…'],
];

export default function NewPostForm({ game, profile }) {
  const formRef = useRef(null);
  const [type, setType] = useState('duvida');
  const [fileName, setFileName] = useState('');
  const [msg, setMsg] = useState(null);
  const hint = TYPES.find((t) => t[0] === type)[2];

  async function action(formData) {
    setMsg(null);
    const res = await createPost(formData);
    if (res?.error) setMsg({ error: res.error });
    else {
      formRef.current?.reset();
      setFileName('');
      setMsg({ ok: 'Publicado!' });
    }
  }

  return (
    <form ref={formRef} action={action} className="card stack" style={{ gap: 14, padding: 18 }} aria-label="Criar post">
      <input type="hidden" name="game_id" value={game.id} />
      <input type="hidden" name="slug" value={game.slug} />
      <input type="hidden" name="type" value={type} />
      <div className="row" style={{ gap: 8 }} role="group" aria-label="Tipo do post">
        {TYPES.map(([id, label]) => (
          <button key={id} type="button" className={`pill ${type === id ? 'on' : ''}`} aria-pressed={type === id} onClick={() => setType(id)}>{label}</button>
        ))}
      </div>
      <div className="row" style={{ gap: 12, alignItems: 'flex-start', flexWrap: 'nowrap' }}>
        <Avatar profile={profile} size={38} />
        <div className="stack" style={{ flex: 1, gap: 10, minWidth: 0 }}>
          <label className="sr-only" htmlFor="post-title">Título</label>
          <input id="post-title" className="field" name="title" required minLength={3} maxLength={200} placeholder={hint} />
          <label className="sr-only" htmlFor="post-body">Texto</label>
          <textarea id="post-body" className="field" name="body" rows={3} maxLength={5000} placeholder="Detalhes (opcional)" />
        </div>
      </div>
      <div className="row" style={{ gap: 10 }}>
        <label className="pill" style={{ cursor: 'pointer' }}>
          <ImageIcon />
          {fileName || (type === 'foto' ? 'Escolher imagem (obrigatório)' : 'Adicionar imagem')}
          <input type="file" name="image" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only"
            onChange={(e) => setFileName(e.target.files?.[0]?.name || '')} />
        </label>
        <label className="row small muted" style={{ gap: 6 }}>
          <input type="checkbox" name="has_spoiler" style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} />
          Contém spoiler
        </label>
        <span style={{ marginLeft: 'auto' }}><SubmitButton pendingText="Publicando…">Publicar</SubmitButton></span>
      </div>
      {msg?.error && <p className="error" role="alert">{msg.error}</p>}
      {msg?.ok && <p className="success" role="status">{msg.ok}</p>}
    </form>
  );
}
