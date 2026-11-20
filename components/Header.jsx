import Link from 'next/link';
import { getSession } from '@/lib/supabase/server';
import ThemeToggle from './ThemeToggle';
import UserMenu from './UserMenu';
import ChatDock from './ChatDock';
import { LogoIcon, SearchIcon } from './Icons';

export default async function Header() {
  const { profile } = await getSession();
  return (
    <>
      <header className="header">
        <div className="container header-inner">
          <span className="logo display">
            <LogoIcon />
            savepoint
          </span>
          <nav className="nav" aria-label="Principal">
            <Link href="/">Início</Link>
            <Link href="/jogos">Jogos</Link>
            <Link href="/pessoas">Pessoas</Link>
          </nav>
          <div className="header-right">
            <form action="/jogos" className="search" role="search">
              <SearchIcon />
              <input type="search" name="q" placeholder="Buscar jogos…" aria-label="Buscar jogos" />
            </form>
            <ThemeToggle />
            {profile ? (
              <UserMenu profile={profile} />
            ) : (
              <Link href="/entrar" className="btn btn-accent" style={{ minHeight: 40, padding: '8px 16px' }}>
                Entrar
              </Link>
            )}
          </div>
        </div>
      </header>
      {profile && <ChatDock me={{ id: profile.id, username: profile.username }} />}
    </>
  );
}
