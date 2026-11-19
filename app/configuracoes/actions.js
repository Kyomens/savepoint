'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AVATAR_COLORS } from '@/lib/format';

export async function updateProfile(formData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/entrar');
  const display_name = String(formData.get('display_name') || '').trim().slice(0, 40) || null;
  const bio = String(formData.get('bio') || '').trim().slice(0, 300) || null;
  const color = String(formData.get('avatar_color') || '');
  const top = ['top1', 'top2', 'top3', 'top4'].map((k) => Number(formData.get(k) || 0)).filter((n) => n > 0);
  const top_games = [...new Set(top)];
  const update = { display_name, bio, top_games };
  if (AVATAR_COLORS.includes(color)) update.avatar_color = color;
  const { data: me } = await supabase.from('profiles').update(update).eq('id', user.id).select('username').single();
  revalidatePath(`/u/${me?.username}`);
  redirect(`/configuracoes?salvo=1`);
}
