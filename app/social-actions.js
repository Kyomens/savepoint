'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function toggleFollow(formData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/entrar');
  const target = String(formData.get('target_id'));
  const following = formData.get('following') === '1';
  if (target === user.id) return;
  if (following) await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', target);
  else await supabase.from('follows').insert({ follower_id: user.id, following_id: target });
  revalidatePath(String(formData.get('path') || '/'));
  revalidatePath('/');
}
