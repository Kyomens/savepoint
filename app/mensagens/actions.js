'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function sendMessage(formData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/entrar');
  const recipient = String(formData.get('recipient_id'));
  const username = String(formData.get('username'));
  const body = String(formData.get('body') || '').trim().slice(0, 2000);
  if (!body) return { error: 'Escreva uma mensagem.' };
  const { error } = await supabase.from('messages').insert({ sender_id: user.id, recipient_id: recipient, body });
  if (error) return { error: 'Não foi possível enviar. Vocês precisam se seguir mutuamente.' };
  revalidatePath(`/mensagens/${username}`);
  revalidatePath('/mensagens');
  return { ok: true };
}
