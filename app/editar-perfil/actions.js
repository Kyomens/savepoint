'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getGameBySlug } from '@/lib/igdb';
import { AVATAR_COLORS, BANNER_PRESETS, PROFILE_THEMES, AVATAR_FRAMES, spotifyEmbed } from '@/lib/format';
import { earnedBadges, loadStats } from '@/lib/badges';

const fail = (msg) => redirect(`/editar-perfil?erro=${encodeURIComponent(msg)}`);

export async function updateProfile(formData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/entrar');

  const storagePrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profile-images/${user.id}/`;
  const earned = earnedBadges(await loadStats(supabase, user.id)).map((b) => b.id);
  const has = (badge) => !badge || earned.includes(badge);

  const update = {
    display_name: String(formData.get('display_name') || '').trim().slice(0, 40) || null,
    bio: String(formData.get('bio') || '').trim().slice(0, 300) || null,
  };
  const color = String(formData.get('avatar_color') || '');
  if (AVATAR_COLORS.includes(color)) update.avatar_color = color;

  // ----- Foto -----
  const avatarMode = String(formData.get('avatar_mode') || 'keep');
  const avatarUrl = String(formData.get('avatar_url') || '');
  if (avatarMode === 'initial') update.avatar_url = null;
  if (avatarMode === 'url' && avatarUrl.startsWith('https://api.dicebear.com/')) update.avatar_url = avatarUrl;
  if (avatarMode === 'uploaded' && avatarUrl.startsWith(storagePrefix)) update.avatar_url = avatarUrl;

  // ----- Moldura -----
  const frame = String(formData.get('avatar_frame') || '');
  if (!frame) update.avatar_frame = null;
  else if (AVATAR_FRAMES[frame] && has(AVATAR_FRAMES[frame].requires)) update.avatar_frame = frame;

  // ----- Capa -----
  const bannerMode = String(formData.get('banner_mode') || 'keep');
  const bannerValue = String(formData.get('banner_value') || '');
  if (bannerMode === 'none') update.banner_url = null;
  if (bannerMode === 'preset' && bannerValue.startsWith('preset:') && BANNER_PRESETS[bannerValue.slice(7)]) update.banner_url = bannerValue;
  if (bannerMode === 'artwork' && bannerValue.startsWith('https://images.igdb.com/')) update.banner_url = bannerValue;
  if (bannerMode === 'uploaded' && bannerValue.startsWith(storagePrefix)) update.banner_url = bannerValue;
  const pos = parseInt(formData.get('banner_pos'), 10);
  if (Number.isFinite(pos)) update.banner_pos = Math.min(100, Math.max(0, pos));

  // ----- Tema -----
  const theme = String(formData.get('profile_theme') || 'padrao');
  if (PROFILE_THEMES[theme] && has(PROFILE_THEMES[theme].requires)) update.profile_theme = theme;

  // ----- Favoritos (3) -----
  let top = [];
  try {
    top = JSON.parse(String(formData.get('top_games') || '[]'));
  } catch {}
  top = (Array.isArray(top) ? top : []).filter((g) => g && Number(g.id) > 0 && typeof g.slug === 'string').slice(0, 3);
  if (top.length) {
    const ids = top.map((g) => Number(g.id));
    const { data: existing } = await supabase.from('games').select('id').in('id', ids);
    const have = new Set((existing || []).map((g) => g.id));
    for (const g of top) if (!have.has(Number(g.id))) await getGameBySlug(g.slug).catch(() => null);
  }
  update.top_games = [...new Set(top.map((g) => Number(g.id)))];

  // ----- Trilha sonora (só para quem platinou) -----
  const soundGame = Number(formData.get('soundtrack_game_id')) || null;
  const soundUrl = String(formData.get('soundtrack_url') || '').trim();
  if (!soundGame || !soundUrl) {
    update.soundtrack_game_id = null;
    update.soundtrack_url = null;
  } else if (has('platinador') && spotifyEmbed(soundUrl)) {
    const { data: plat } = await supabase.from('platinums').select('game_id').eq('user_id', user.id).eq('game_id', soundGame).maybeSingle();
    if (plat) {
      update.soundtrack_game_id = soundGame;
      update.soundtrack_url = soundUrl;
    }
  }

  const { error } = await supabase.from('profiles').update(update).eq('id', user.id);
  if (error) fail('Não foi possível salvar o perfil. Confira se a atualização 02 do banco foi aplicada.');
  revalidatePath('/', 'layout');
  redirect('/');
}
