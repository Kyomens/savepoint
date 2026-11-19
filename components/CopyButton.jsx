'use client';
import { useState } from 'react';

export default function CopyButton({ text, children = 'Copiar', className = 'btn btn-accent btn-block' }) {
  const [done, setDone] = useState(false);
  async function copy() {
    const value = text || window.location.origin;
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {
      window.prompt('Copie o link:', value);
    }
  }
  return (
    <button type="button" className={className} onClick={copy}>
      {done ? 'Link copiado!' : children}
    </button>
  );
}
