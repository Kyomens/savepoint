'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/entrar');
  return { supabase, user };
}

export async function changePassword(formData) {
  const { supabase } = await requireUser();
  const password = String(formData.get('password') || '');
  const confirm = String(formData.get('confirm') || '');
  if (password.length < 8) redirect('/configuracoes?erro=' + encodeURIComponent('A nova senha precisa ter pelo menos 8 caracteres.'));
  if (password !== confirm) redirect('/configuracoes?erro=' + encodeURIComponent('As duas senhas não são iguais.'));
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect('/configuracoes?erro=' + encodeURIComponent('Não foi possível trocar a senha. Tente sair e entrar de novo.'));
  redirect('/configuracoes?ok=senha');
}

export async function unlinkSteam() {
  const { user } = await requireUser();
  await createAdminClient().from('linked_accounts').delete().eq('user_id', user.id).eq('provider', 'steam');
  revalidatePath('/configuracoes');
  redirect('/configuracoes?ok=steam-off');
}
