import { createAdminClient } from '@/lib/supabase/admin';

// Token de acesso da Twitch, guardado em memória enquanto for válido
let cachedToken = null;
let tokenExpiresAt = 0;

async function getToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;
  const url = new URL('https://id.twitch.tv/oauth2/token');
  url.searchParams.set('client_id', process.env.TWITCH_CLIENT_ID);
  url.searchParams.set('client_secret', process.env.TWITCH_CLIENT_SECRET);
  url.searchParams.set('grant_type', 'client_credentials');
  const res = await fetch(url, { method: 'POST', cache: 'no-store' });
  if (!res.ok) throw new Error('Não foi possível conectar à Twitch/IGDB. Confira TWITCH_CLIENT_ID e TWITCH_CLIENT_SECRET.');
  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000;
  return cachedToken;
}

async function igdb(endpoint, body, revalidate = 3600) {
  const token = await getToken();
  const res = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: 'POST',
    headers: {
      'Client-ID': process.env.TWITCH_CLIENT_ID,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'text/plain',
    },
    body,
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`Erro na base de jogos (IGDB): ${res.status}`);
  return res.json();
}

const FIELDS =
  'fields name,slug,summary,first_release_date,cover.image_id,genres.name,platforms.abbreviation,platforms.name,involved_companies.developer,involved_companies.company.name;';

// Converte o formato do IGDB para o formato do nosso banco
function toGame(g) {
  const dev = (g.involved_companies || []).find((c) => c.developer)?.company?.name || null;
  return {
    id: g.id,
    slug: g.slug,
    name: g.name,
    cover_url: g.cover?.image_id ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${g.cover.image_id}.jpg` : null,
    release_year: g.first_release_date ? new Date(g.first_release_date * 1000).getUTCFullYear() : null,
    summary: g.summary || null,
    developer: dev,
    genres: (g.genres || []).map((x) => x.name),
    platforms: (g.platforms || []).map((p) => p.abbreviation || p.name).filter(Boolean),
  };
}

const clean = (s) => String(s || '').replace(/["\;]/g, ' ').trim().slice(0, 80);

export async function searchGames(query) {
  const q = clean(query);
  if (!q) return [];
  const data = await igdb('games', `search "${q}"; ${FIELDS} where version_parent = null; limit 40;`);
  return data.map(toGame);
}

export async function trendingGames() {
  const since = Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 365;
  const data = await igdb(
    'games',
    `${FIELDS} where first_release_date > ${since} & total_rating_count > 10 & version_parent = null; sort total_rating_count desc; limit 24;`,
    86400
  );
  return data.map(toGame);
}

// Busca um jogo pelo slug: primeiro no IGDB (dados atualizados) e salva/atualiza no nosso banco
export async function getGameBySlug(slug) {
  const s = clean(slug);
  const admin = createAdminClient();
  try {
    const data = await igdb('games', `${FIELDS} where slug = "${s}"; limit 1;`, 86400);
    if (!data.length) return null;
    const game = toGame(data[0]);
    await admin.from('games').upsert({ ...game, updated_at: new Date().toISOString() });
    return game;
  } catch (err) {
    // Se o IGDB estiver fora do ar, usa a cópia que já temos
    const { data } = await admin.from('games').select('*').eq('slug', s).maybeSingle();
    if (data) return data;
    throw err;
  }
}
