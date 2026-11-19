import Link from 'next/link';
import { signUp } from '@/app/auth/actions';
import SubmitButton from '@/components/SubmitButton';

export const metadata = { title: 'Criar conta' };

export default function CadastroPage({ searchParams }) {
  return (
    <main className="container page" style={{ maxWidth: 440 }}>
      <div className="card stack" style={{ gap: 18, padding: 28 }}>
        <h1 className="display" style={{ fontSize: 28 }}>Criar conta</h1>
        <p className="muted">Monte seu perfil, avalie seus jogos e veja o que seus amigos estão jogando.</p>
        {searchParams?.erro && <p className="error" role="alert">{searchParams.erro}</p>}
        <form action={signUp} className="stack" style={{ gap: 14 }}>
          <label className="form-label">
            Nome de usuário
            <input className="field" name="username" required minLength={3} maxLength={20} pattern="[a-zA-Z0-9._]+" autoComplete="username" placeholder="ex: bia.games" />
            <span className="hint">Letras, números, ponto ou _. Vai aparecer no endereço do seu perfil.</span>
          </label>
          <label className="form-label">
            E-mail
            <input className="field" type="email" name="email" required autoComplete="email" />
          </label>
          <label className="form-label">
            Senha
            <input className="field" type="password" name="password" required minLength={8} autoComplete="new-password" />
            <span className="hint">Pelo menos 8 caracteres.</span>
          </label>
          <SubmitButton pendingText="Criando…">Criar conta</SubmitButton>
        </form>
        <p className="muted small">
          Já tem conta? <Link href="/entrar" style={{ color: 'var(--accent-text)' }}>Entrar</Link>
        </p>
      </div>
    </main>
  );
}
