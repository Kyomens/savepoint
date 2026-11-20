import { createAdminClient } from '@/lib/supabase/admin';

// Descobre o número do jogo na Steam (appid) pelo link da loja que o IGDB guarda
export async function steamAppIdFor(game, igdbQuery) {
  if (game.steam_appid) return game.steam_appid;
  const data = await igdbQuery('games', `fields websites.url; where id = ${Number(game.id)}; limit 1;`);
  const urls = (data?.[0]?.websites || []).map((w) => w.url || '');
  for (const u of urls) {
    const m = u.match(/store\.steampowered\.com\/app\/(\d+)/);
    if (m) {
      const appid = Number(m[1]);
      await createAdminClient().from('games').update({ steam_appid: appid }).eq('id', game.id);
      return appid;
    }
  }
  return null;
}

// Confere as conquistas da pessoa no jogo. Platina = todas as conquistas desbloqueadas.
export async function steamAchievements(steamId, appid) {
  const key = process.env.STEAM_API_KEY;
  if (!key) return { error: 'A verificação pela Steam ainda não foi configurada no site (falta a STEAM_API_KEY).' };
  const url = new URL('https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/');
  url.searchParams.set('key', key);
  url.searchParams.set('steamid', steamId);
  url.searchParams.set('appid', String(appid));
  const res = await fetch(url, { cache: 'no-store' });
  const data = await res.json().catch(() => null);
  const stats = data?.playerstats;
  if (!stats || stats.success === false) {
    const msg = String(stats?.error || '');
    if (/not public|private/i.test(msg) || res.status === 403)
      return { error: 'Seu perfil ou os detalhes de jogo na Steam estão privados. Deixe-os públicos e tente de novo.' };
    if (/no stats/i.test(msg)) return { error: 'Este jogo não tem conquistas na Steam.' };
    return { error: 'Não encontramos esse jogo na sua conta Steam.' };
  }
  const list = stats.achievements || [];
  if (!list.length) return { error: 'Este jogo não tem conquistas na Steam.' };
  const done = list.filter((a) => a.achieved === 1).length;
  return { total: list.length, done, platinum: done === list.length };
}

export async function getPlayerName(steamId) {
  const key = process.env.STEAM_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${key}&steamids=${steamId}`,
      { cache: 'no-store' }
    );
    const data = await res.json();
    return data?.response?.players?.[0]?.personaname || null;
  } catch {
    return null;
  }
}
