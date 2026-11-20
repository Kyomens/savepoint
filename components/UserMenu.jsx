'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Avatar from './Avatar';
import { signOut } from '@/app/auth/actions';

export default function UserMenu({ profile }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'flex' }}>
      <button type="button" className="avatar-btn" aria-haspopup="menu" aria-expanded={open} aria-label="Menu da conta" onClick={() => setOpen((o) => !o)}>
        <Avatar profile={profile} size={38} />
      </button>
      {open && (
        <div className="user-menu" role="menu">
          <div className="user-menu-head">
            <strong>{profile.display_name || profile.username}</strong>
            <span className="muted small">@{profile.username}</span>
          </div>
          <Link role="menuitem" href={`/u/${profile.username}`}>Meu perfil</Link>
          <Link role="menuitem" href="/editar-perfil">Editar perfil</Link>
          <Link role="menuitem" href="/configuracoes">Configurações</Link>
          <form action={signOut}>
            <button role="menuitem" type="submit">Sair da conta</button>
          </form>
        </div>
      )}
    </div>
  );
}
