'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const TYPES = ['duvida', 'foto', 'discussao', 'amizade'];
const IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/entrar');
  return { supabase, user };
}

export async function createPost(formData) {
  const { supabase, user } = await requireUser();
  const gameId = Number(formData.get('game_id'));
  const slug = String(formData.get('slug'));
  const type = String(formData.get('type'));
  const title = String(formData.get('title') || '').trim().slice(0, 200);
  const body = String(formData.get('body') || '').trim().slice(0, 5000) || null;
  const hasSpoiler = formData.get('has_spoiler') === 'on';
  const spoilerScope = hasSpoiler ? String(formData.get('spoiler_scope') || '').trim().slice(0, 80) || null : null;
  const file = formData.get('image');

  if (!TYPES.includes(type)) return { error: 'Escolha o tipo do post.' };
  if (title.length < 3) return { error: 'Escreva um título com pelo menos 3 letras.' };

  let image_url = null;
  if (file && typeof file === 'object' && file.size > 0) {
    const ext = IMAGE_TYPES[file.type];
    if (!ext) return { error: 'A imagem precisa ser JPG, PNG, WEBP ou GIF.' };
    if (file.size > 5 * 1024 * 1024) return { error: 'A imagem pode ter no máximo 5 MB.' };
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('post-images').upload(path, file, { contentType: file.type });
    if (upErr) return { error: 'Não foi possível enviar a imagem.' };
    image_url = supabase.storage.from('post-images').getPublicUrl(path).data.publicUrl;
  }
  if (type === 'foto' && !image_url) return { error: 'Posts do tipo Foto precisam de uma imagem.' };

  const { error } = await supabase.from('posts').insert({ game_id: gameId, user_id: user.id, type, title, body, image_url, has_spoiler: hasSpoiler, spoiler_scope: spoilerScope });
  if (error) return { error: 'Não foi possível publicar. Tente de novo.' };
  revalidatePath(`/jogo/${slug}/comunidade`);
  return { ok: true };
}

export async function deletePost(formData) {
  const { supabase, user } = await requireUser();
  const id = Number(formData.get('post_id'));
  const slug = String(formData.get('slug'));
  await supabase.from('posts').delete().eq('id', id).eq('user_id', user.id);
  revalidatePath(`/jogo/${slug}/comunidade`);
  redirect(`/jogo/${slug}/comunidade`);
}

export async function toggleVote(formData) {
  const { supabase, user } = await requireUser();
  const postId = Number(formData.get('post_id'));
  const voted = formData.get('voted') === '1';
  if (voted) await supabase.from('post_votes').delete().eq('post_id', postId).eq('user_id', user.id);
  else await supabase.from('post_votes').insert({ post_id: postId, user_id: user.id });
  revalidatePath(String(formData.get('path') || '/'));
}

export async function addReply(formData) {
  const { supabase, user } = await requireUser();
  const postId = Number(formData.get('post_id'));
  const body = String(formData.get('body') || '').trim().slice(0, 3000);
  if (body) await supabase.from('post_replies').insert({ post_id: postId, user_id: user.id, body });
  revalidatePath(String(formData.get('path')));
}

export async function deleteReply(formData) {
  const { supabase, user } = await requireUser();
  await supabase.from('post_replies').delete().eq('id', Number(formData.get('reply_id'))).eq('user_id', user.id);
  revalidatePath(String(formData.get('path')));
}

export async function markBest(formData) {
  const { supabase, user } = await requireUser();
  const postId = Number(formData.get('post_id'));
  const replyId = Number(formData.get('reply_id')) || null;
  await supabase.from('posts').update({ best_reply_id: replyId }).eq('id', postId).eq('user_id', user.id);
  revalidatePath(String(formData.get('path')));
  revalidatePath(String(formData.get('list_path')));
}
