'use client';
import { useEffect, useState } from 'react';
import { SunIcon, MoonIcon } from './Icons';

export default function ThemeToggle() {
  const [theme, setTheme] = useState('escuro');
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme || 'escuro');
  }, []);
  function toggle() {
    const next = theme === 'escuro' ? 'claro' : 'escuro';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('tema', next);
    } catch {}
    setTheme(next);
  }
  const label = theme === 'escuro' ? 'Mudar para modo claro' : 'Mudar para modo escuro';
  return (
    <button type="button" className="icon-btn" onClick={toggle} aria-label={label} title={label}>
      {theme === 'escuro' ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
