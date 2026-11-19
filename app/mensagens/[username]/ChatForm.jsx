'use client';
import { useRef, useState } from 'react';
import { sendMessage } from '../actions';

export default function ChatForm({ recipientId, username }) {
  const formRef = useRef(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  async function action(formData) {
    setSending(true);
    setError('');
    const res = await sendMessage(formData);
    setSending(false);
    if (res?.error) setError(res.error);
    else formRef.current?.reset();
  }

  return (
    <form ref={formRef} action={action} className="stack" style={{ gap: 8 }}>
      <input type="hidden" name="recipient_id" value={recipientId} />
      <input type="hidden" name="username" value={username} />
      <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-end' }}>
        <label className="sr-only" htmlFor="msg">Mensagem</label>
        <textarea
          id="msg"
          name="body"
          className="field"
          rows={2}
          maxLength={2000}
          required
          placeholder="Escreva uma mensagem… (Enter envia, Shift+Enter pula linha)"
          style={{ minHeight: 48 }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
        />
        <button type="submit" className="btn btn-accent" disabled={sending}>{sending ? 'Enviando…' : 'Enviar'}</button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
    </form>
  );
}
