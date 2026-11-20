'use client';

// Abre o chat em pop-up já na conversa com essa pessoa
export default function OpenChatButton({ username }) {
  return (
    <button
      type="button"
      className="btn"
      onClick={() => window.dispatchEvent(new CustomEvent('savepoint:chat', { detail: { username } }))}
    >
      Mensagem
    </button>
  );
}
