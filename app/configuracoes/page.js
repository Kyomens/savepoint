import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/supabase/server';
import { signOut } from '@/app/auth/actions';
import PasswordInput from '@/components/PasswordInput';
import SubmitButton from '@/components/SubmitButton';
import ThemeSetting from './ThemeSetting';
import { changePassword, unlinkSteam } from './actions';

export const metadata = { title: 'Configurações' };

const OK = {
  senha: 'Senha alterada.',
  steam: 'Conta Steam conectada!',
  'steam-off': 'Conta Steam desconectada.',
};

export default async function ConfigPage({ searchParams }) {
  const { supabase, user, profile } = await getSession();
  if (!user) redirect('/entrar');
  const { data: links } = await supabase.from('linked_accounts').select('provider, external_id, display_name').eq('user_id', user.id);
  const steam = (links || []).find((l) => l.provider === 'steam');

  return (
    <main className="container page" style={{ maxWidth: 720 }}>
      <div className="stack" style={{ gap: 22 }}>
        <h1 className="display" style={{ fontSize: 28 }}>Configurações</h1>
        {searchParams?.erro && <p className="error" role="alert">{searchParams.erro}</p>}
        {OK[searchParams?.ok] && <p className="success" role="status">{OK[searchParams.ok]}</p>}

        <section className="card stack" style={{ gap: 12 }}>
          <h2 style={{ fontSize: 17 }}>Perfil</h2>
          <p className="muted small">Foto, capa, cores do perfil, moldura, favoritos e trilha sonora.</p>
          <div><Link href="/editar-perfil" className="btn btn-accent">Editar perfil</Link></div>
        </section>

        <section className="card stack" style={{ gap: 12 }}>
          <h2 style={{ fontSize: 17 }}>Aparência do site</h2>
          <ThemeSetting />
          <p className="muted small">As cores do <em>seu perfil</em> (que os outros veem) ficam em Editar perfil.</p>
        </section>

        <section className="card stack" style={{ gap: 14 }}>
          <h2 style={{ fontSize: 17 }}>Contas de jogos</h2>
          <p className="muted small">Conecte sua conta para comprovar platinas e ganhar recompensas no perfil.</p>
          <div className="row" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--line)', paddingTop: 14 }}>
            <span className="stack" style={{ gap: 2 }}>
              <strong>Steam</strong>
              <span className="muted small">{steam ? `Conectada${steam.display_name ? ` como ${steam.display_name}` : ''}` : 'Não conectada'}</span>
            </span>
            {steam ? (
              <form action={unlinkSteam}><button type="submit" className="btn">Desconectar</button></form>
            ) : (
              <a href="/api/steam/conectar" className="btn btn-accent">Conectar Steam</a>
            )}
          </div>
          {steam && <p className="muted small">Para a verificação funcionar, deixe o perfil e os “Detalhes de jogo” públicos nas configurações de privacidade da Steam.</p>}
          <div className="row" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--line)', paddingTop: 14 }}>
            <span className="stack" style={{ gap: 2 }}>
              <strong>Xbox</strong>
              <span className="muted small">Em breve</span>
            </span>
            <button type="button" className="btn" disabled>Conectar</button>
          </div>
          <div className="row" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--line)', paddingTop: 14 }}>
            <span className="stack" style={{ gap: 2 }}>
              <strong>PlayStation</strong>
              <span className="muted small">A Sony não oferece acesso público aos troféus</span>
            </span>
            <button type="button" className="btn" disabled>Indisponível</button>
          </div>
        </section>

        <section className="card stack" style={{ gap: 14 }}>
          <h2 style={{ fontSize: 17 }}>Conta</h2>
          <p className="small"><span className="muted">Usuário:</span> @{profile?.username} <span className="muted">· E-mail:</span> {user.email}</p>
          <form action={changePassword} className="stack" style={{ gap: 10, maxWidth: 380 }}>
            <label className="form-label">Nova senha<PasswordInput name="password" autoComplete="new-password" minLength={8} /></label>
            <label className="form-label">Repita a nova senha<PasswordInput name="confirm" autoComplete="new-password" minLength={8} /></label>
            <div><SubmitButton pendingText="Trocando…">Trocar senha</SubmitButton></div>
          </form>
          <form action={signOut} style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
            <button type="submit" className="btn">Sair da conta</button>
          </form>
        </section>
      </div>
    </main>
  );
}
