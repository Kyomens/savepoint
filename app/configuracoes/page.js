import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/supabase/server';
import SubmitButton from '@/components/SubmitButton';
import { AVATAR_COLORS } from '@/lib/format';
import { signOut } from '@/app/auth/actions';
import { updateProfile } from './actions';

export const metadata = { title: 'Editar perfil' };

export default async function ConfigPage({ searchParams }) {
  const { supabase, user, profile } = await getSession();
  if (!user) redirect('/entrar');
  const { data: myGames } = await supabase.from('game_entries').select('game_id, games(name)').eq('user_id', user.id).limit(1000);
  const options = (myGames || []).filter((g) => g.games).sort((a, b) => a.games.name.localeCompare(b.games.name));
  const top = profile?.top_games || [];

  return (
    <main className="container page" style={{ maxWidth: 640 }}>
      <div className="stack" style={{ gap: 24 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h1 className="display" style={{ fontSize: 28 }}>Editar perfil</h1>
          <Link href={`/u/${profile?.username}`} className="muted small">Ver meu perfil →</Link>
        </div>
        {searchParams?.bemvindo && <p className="success">Conta criada! Complete seu perfil e depois comece a avaliar seus jogos.</p>}
        {searchParams?.salvo && <p className="success" role="status">Perfil salvo.</p>}

        <form action={updateProfile} className="card stack" style={{ gap: 18 }}>
          <label className="form-label">
            Nome de exibição
            <input className="field" name="display_name" maxLength={40} defaultValue={profile?.display_name || ''} />
          </label>
          <label className="form-label">
            Bio
            <textarea className="field" name="bio" maxLength={300} rows={3} defaultValue={profile?.bio || ''} placeholder="Que tipo de jogo você curte?" />
          </label>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="form-label" style={{ marginBottom: 8 }}>Cor do avatar</legend>
            <div className="row">
              {AVATAR_COLORS.map((c) => (
                <label key={c} style={{ cursor: 'pointer' }}>
                  <input type="radio" name="avatar_color" value={c} defaultChecked={profile?.avatar_color === c} className="sr-only swatch-input" aria-label={`Cor ${c}`} />
                  <span className="swatch" style={{ background: c }} />
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }} className="stack">
            <legend className="form-label" style={{ marginBottom: 8 }}>Top 4 de todos os tempos</legend>
            {options.length === 0 ? (
              <p className="muted small">Marque ou avalie alguns jogos primeiro, depois volte aqui para escolher seus favoritos. <Link href="/jogos" style={{ color: 'var(--accent-text)' }}>Buscar jogos</Link></p>
            ) : (
              [0, 1, 2, 3].map((i) => (
                <label key={i} className="row" style={{ flexWrap: 'nowrap' }}>
                  <span className="muted small" style={{ width: 20 }}>{i + 1}.</span>
                  <select className="field" name={`top${i + 1}`} defaultValue={top[i] || ''}>
                    <option value="">— nenhum —</option>
                    {options.map((o) => <option key={o.game_id} value={o.game_id}>{o.games.name}</option>)}
                  </select>
                </label>
              ))
            )}
          </fieldset>
          <div><SubmitButton>Salvar perfil</SubmitButton></div>
        </form>

        <form action={signOut}>
          <button type="submit" className="btn">Sair da conta</button>
        </form>
      </div>
    </main>
  );
}
