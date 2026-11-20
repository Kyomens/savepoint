import Link from 'next/link';
import { signIn } from '@/app/auth/actions';
import SubmitButton from '@/components/SubmitButton';
import PasswordInput from '@/components/PasswordInput';

export const metadata = { title: 'Entrar' };

export default function EntrarPage({ searchParams }) {
  return (
    <main className="container page" style={{ maxWidth: 440 }}>
      <div className="card stack" style={{ gap: 18, padding: 28 }}>
        <h1 className="display" style={{ fontSize: 28 }}>Entrar</h1>
        {searchParams?.aviso === 'confirme' && (
          <p className="success">Conta criada! Confira seu e-mail e clique no link de confirmação para entrar.</p>
        )}
        {searchParams?.erro && <p className="error" role="alert">{searchParams.erro}</p>}
        <form action={signIn} className="stack" style={{ gap: 14 }}>
          <label className="form-label">
            Nome de usuário
            <input className="field" name="login" required autoComplete="username" autoCapitalize="none" placeholder="ex: bia.games" />
          </label>
          <label className="form-label">
            Senha
            <PasswordInput autoComplete="current-password" />
          </label>
          <SubmitButton pendingText="Entrando…">Entrar</SubmitButton>
        </form>
        <p className="muted small">
          Ainda não tem conta? <Link href="/cadastro" style={{ color: 'var(--accent-text)' }}>Cadastre-se</Link>
        </p>
      </div>
    </main>
  );
}
