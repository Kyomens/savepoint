'use server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const back = (path, msg) => redirect(`${path}?erro=${encodeURIComponent(msg)}`);

export async function signIn(formData) {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) back('/entrar', 'E-mail ou senha incorretos.');
  redirect('/');
}

export async function signUp(formData) {
  const username = String(formData.get('username') || '').trim().toLowerCase();
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');

  if (!/^[a-z0-9._]{3,20}$/.test(username)) back('/cadastro', 'O nome de usuário precisa ter de 3 a 20 caracteres: letras minúsculas, números, ponto ou _.');
  if (password.length < 8) back('/cadastro', 'A senha precisa ter pelo menos 8 caracteres.');

  const admin = createAdminClient();
  const { data: taken } = await admin.from('profiles').select('id').eq('username', username).maybeSingle();
  if (taken) back('/cadastro', 'Esse nome de usuário já está em uso.');

  const origin = process.env.NEXT_PUBLIC_SITE_URL || `https://${headers().get('host')}`;
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username, display_name: username }, emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) back('/cadastro', error.message.includes('registered') ? 'Esse e-mail já tem conta. Tente entrar.' : 'Não foi possível criar a conta. Tente de novo.');
  if (!data.session) redirect('/entrar?aviso=confirme');
  redirect('/configuracoes?bemvindo=1');
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/');
}
