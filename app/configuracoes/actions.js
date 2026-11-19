'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getGameBySlug } from '@/lib/igdb';
import { AVATAR_COLORS, BANNER_PRESETS } from '@/lib/format';

const IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
const fail = (msg) => redirect(`/configuracoes?erro=${encodeURIComponent(msg)}`);

async function uploadImage(supabase, userId, file, kind, maxMb) {
  if (!file || typeof file !== 'object' || !file.size) return { error: 'Escolha uma imagem.' };
  const ext = IMAGE_TYPES[file.type];
  if (!ext) return { error: 'A imagem precisa ser JPG, PNG, WEBP ou GIF.' };
  if (file.size > maxMb * 1024 * 1024) return { error: `A imagem pode ter no máximo ${maxMb} MB.` };
  const path = `${userId}/${kind}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('profile-images').upload(path, file, { contentType: file.type });
  if (error) return { error: 'Não foi possível enviar a imagem. Confira se a atualização do banco foi aplicada.' };
  return { url: supabase.storage.from('profile-images').getPublicUrl(path).data.publicUrl };
}

export async function updateProfile(formData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/entrar');

  const update = {
    display_name: String(formData.get('display_name') || '').trim().slice(0, 40) || null,
    bio: String(formData.get('bio') || '').trim().slice(0, 300) || null,
  };
  const color = String(formData.get('avatar_color') || '');
  if (AVATAR_COLORS.includes(color)) update.avatar_color = color;

  // ----- Foto de perfil -----
  const avatarMode = String(formData.get('avatar_mode') || 'keep');
  if (avatarMode === 'initial') update.avatar_url = null;
  if (avatarMode === 'url') {
    const url = String(formData.get('avatar_url') || '');
    if (url.startsWith('https://api.dicebear.com/')) update.avatar_url = url;
  }
  if (avatarMode === 'upload') {
    const r = await uploadImage(supabase, user.id, formData.get('avatar_file'), 'avatar', 2);
    if (r.error) fail(r.error);
    update.avatar_url = r.url;
  }

  // ----- Capa do perfil -----
  const bannerMode = String(formData.get('banner_mode') || 'keep');
  const bannerValue = String(formData.get('banner_value') || '');
  if (bannerMode === 'none') update.banner_url = null;
  if (bannerMode === 'preset' && BANNER_PRESETS[bannerValue]) update.banner_url = `preset:${bannerValue}`;
  if (bannerMode === 'artwork' && bannerValue.startsWith('https://images.igdb.com/')) update.banner_url = bannerValue;
  if (bannerMode === 'upload') {
    const r = await uploadImage(supabase, user.id, formData.get('banner_file'), 'capa', 5);
    if (r.error) fail(r.error);
    update.banner_url = r.url;
  }

  // ----- Top 4 (não precisa ter avaliado o jogo) -----
  let top = [];
  try {
    top = JSON.parse(String(formData.get('top_games') || '[]'));
  } catch {}
  top = (Array.isArray(top) ? top : [])
    .filter((g) => g && Number(g.id) > 0 && typeof g.slug === 'string')
    .slice(0, 4);
  if (top.length) {
    const ids = top.map((g) => Number(g.id));
    const { data: existing } = await supabase.from('games').select('id').in('id', ids);
    const have = new Set((existing || []).map((g) => g.id));
    for (const g of top) if (!have.has(Number(g.id))) await getGameBySlug(g.slug).catch(() => null);
  }
  update.top_games = [...new Set(top.map((g) => Number(g.id)))];

  const { error } = await supabase.from('profiles').update(update).eq('id', user.id);
  if (error) fail('Não foi possível salvar o perfil. Tente de novo.');
  revalidatePath('/', 'layout');
  redirect('/');
}
