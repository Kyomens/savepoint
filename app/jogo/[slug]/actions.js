'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/entrar');
  return { supabase, user };
}

export async function saveEntry(formData) {
  const { supabase, user } = await requireUser();
  const gameId = Number(formData.get('game_id'));
  const slug = String(formData.get('slug'));
  const status = String(formData.get('status') || '') || null;
  const ratingRaw = Number(formData.get('rating') || 0);
  const rating = ratingRaw >= 1 && ratingRaw <= 10 ? Math.round(ratingRaw) : null;
  const review = String(formData.get('review') || '').trim().slice(0, 5000) || null;
  const hasSpoiler = formData.get('has_spoiler') === 'on';

  if (!status && !rating && !review) {
    await supabase.from('game_entries').delete().eq('user_id', user.id).eq('game_id', gameId);
  } else {
    const { error } = await supabase.from('game_entries').upsert(
      {
        user_id: user.id,
        game_id: gameId,
        status: status && ['jogando', 'zerado', 'abandonado', 'quero'].includes(status) ? status : null,
        rating,
        review,
        has_spoiler: hasSpoiler,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,game_id' }
    );
    if (error) return { error: 'Não foi possível salvar. Tente de novo.' };
  }
  revalidatePath(`/jogo/${slug}`);
  revalidatePath('/');
  return { ok: true };
}

export async function toggleLike(formData) {
  const { supabase, user } = await requireUser();
  const entryId = Number(formData.get('entry_id'));
  const liked = formData.get('liked') === '1';
  if (liked) await supabase.from('review_likes').delete().eq('entry_id', entryId).eq('user_id', user.id);
  else await supabase.from('review_likes').insert({ entry_id: entryId, user_id: user.id });
  revalidatePath(String(formData.get('path') || '/'));
}

export async function addComment(formData) {
  const { supabase, user } = await requireUser();
  const entryId = Number(formData.get('entry_id'));
  const body = String(formData.get('body') || '').trim().slice(0, 2000);
  if (body) await supabase.from('review_comments').insert({ entry_id: entryId, user_id: user.id, body });
  revalidatePath(`/review/${entryId}`);
}

export async function deleteComment(formData) {
  const { supabase, user } = await requireUser();
  const id = Number(formData.get('id'));
  await supabase.from('review_comments').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath(`/review/${formData.get('entry_id')}`);
}

export async function report(formData) {
  const { supabase, user } = await requireUser();
  await supabase.from('reports').insert({
    reporter_id: user.id,
    kind: String(formData.get('kind')),
    target_id: String(formData.get('target_id')),
    reason: String(formData.get('reason') || '').slice(0, 500) || null,
  });
  revalidatePath(String(formData.get('path') || '/'));
}
