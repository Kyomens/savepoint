import Link from 'next/link';
import { getSession } from '@/lib/supabase/server';
import ThemeToggle from './ThemeToggle';
import Avatar from './Avatar';
import { LogoIcon, SearchIcon } from './Icons';

export default async function Header() {
  const { supabase, user, profile } = await getSession();
  let unread = 0;
  if (user) {
    const { count } = await supabase.from('messages').select('id', { count: 'exact', head: true })
      .eq('recipient_id', user.id).is('read_at', null);
    unread = count || 0;
  }
  return (
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
          {user && (
            <Link href="/mensagens" className="row" style={{ gap: 6, display: 'inline-flex' }}>
              Mensagens
              {unread > 0 && <span className="count-badge" aria-label={`${unread} não lidas`}>{unread > 9 ? '9+' : unread}</span>}
            </Link>
          )}
        </nav>
        <div className="header-right">
          <form action="/jogos" className="search" role="search">
            <SearchIcon />
            <input type="search" name="q" placeholder="Buscar jogos…" aria-label="Buscar jogos" />
          </form>
          <ThemeToggle />
          {profile ? (
            <Link href={`/u/${profile.username}`} aria-label="Meu perfil" title="Meu perfil">
              <Avatar profile={profile} size={38} />
            </Link>
          ) : (
            <Link href="/entrar" className="btn btn-accent" style={{ minHeight: 40, padding: '8px 16px' }}>
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
