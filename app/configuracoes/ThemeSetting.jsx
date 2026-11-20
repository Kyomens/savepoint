'use client';
import { useEffect, useState } from 'react';

const OPTIONS = [
  ['escuro', 'Escuro'],
  ['claro', 'Claro'],
  ['auto', 'Igual ao aparelho'],
];

export default function ThemeSetting() {
  const [value, setValue] = useState('auto');
  useEffect(() => {
    try {
      setValue(localStorage.getItem('tema') || 'auto');
    } catch {}
  }, []);
  function choose(v) {
    setValue(v);
    try {
      localStorage.setItem('tema', v);
    } catch {}
    const t = v === 'auto' ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'claro' : 'escuro') : v;
    document.documentElement.dataset.theme = t;
  }
  return (
    <div className="row" role="radiogroup" aria-label="Tema do site" style={{ gap: 8 }}>
      {OPTIONS.map(([id, label]) => (
        <button key={id} type="button" role="radio" aria-checked={value === id} className={`pill ${value === id ? 'on' : ''}`} onClick={() => choose(id)}>
          {label}
        </button>
      ))}
    </div>
  );
}
