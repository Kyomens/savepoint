import { getGameBySlug } from '@/lib/igdb';

// Pega o jogo do nosso banco; se ainda não existir, busca no IGDB
export async function loadGame(supabase, slug) {
  const { data } = await supabase.from('games').select('*').eq('slug', slug).maybeSingle();
  return data || getGameBySlug(slug);
}

export async function authorStatuses(supabase, gameId, userIds) {
  const ids = [...new Set(userIds)];
  if (!ids.length) return {};
  const { data } = await supabase.from('game_entries').select('user_id, status').eq('game_id', gameId).in('user_id', ids);
  return Object.fromEntries((data || []).map((e) => [e.user_id, e.status]));
}
