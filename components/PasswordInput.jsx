'use client';
import { useState } from 'react';

export default function PasswordInput({ name = 'password', autoComplete, minLength, id }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'block' }}>
      <input
        id={id}
        className="field"
        type={show ? 'text' : 'password'}
        name={name}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        style={{ paddingRight: 52 }}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Esconder senha' : 'Mostrar senha'}
        title={show ? 'Esconder senha' : 'Mostrar senha'}
        style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', width: 44, height: 40, border: 0, background: 'transparent', color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {show ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3l18 18" /><path d="M10.6 5.1A10 10 0 0 1 12 5c5 0 9 4.5 10 7-.4 1-1.2 2.3-2.4 3.5M6.6 6.6C4.6 8 3.2 10 2 12c1 2.5 5 7 10 7 1.6 0 3-.4 4.3-1" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12c1-2.5 5-7 10-7s9 4.5 10 7c-1 2.5-5 7-10 7S3 14.5 2 12z" /><circle cx="12" cy="12" r="3" /></svg>
        )}
      </button>
    </span>
  );
}
