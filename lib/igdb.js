import { createAdminClient } from '@/lib/supabase/admin';

// ---------------------------------------------------------------------
// Conexão com o IGDB (base de jogos da Twitch)
// ---------------------------------------------------------------------
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

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export async function igdb(endpoint, body, revalidate = 3600) {
  const token = await getToken();
  for (let attempt = 0; attempt < 3; attempt++) {
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
    // O IGDB aceita no máximo 4 pedidos por segundo: se passar, espera e tenta de novo
    if (res.status === 429 && attempt < 2) {
      await wait(800 * (attempt + 1));
      continue;
    }
    if (!res.ok) {
      const err = new Error(`Erro na base de jogos (IGDB): ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }
  throw new Error('A base de jogos está ocupada. Tente de novo em alguns segundos.');
}

// ---------------------------------------------------------------------
// Formatos
// ---------------------------------------------------------------------
const img = (id, size) => (id ? `https://images.igdb.com/igdb/image/upload/${size}/${id}.jpg` : null);

const LIST_FIELDS =
  'fields name,slug,first_release_date,cover.image_id,aggregated_rating,aggregated_rating_count,themes,artworks.image_id,screenshots.image_id;';
const FULL_FIELDS =
  'fields name,slug,summary,first_release_date,cover.image_id,genres.name,platforms.abbreviation,platforms.name,involved_companies.developer,involved_companies.company.name,aggregated_rating,aggregated_rating_count,themes,artworks.image_id,screenshots.image_id;';

const EROTIC_THEME = 42;

// Converte o formato do IGDB para o formato do nosso banco
function toGame(g) {
  const dev = (g.involved_companies || []).find((c) => c.developer)?.company?.name || null;
  const art = g.artworks?.[0]?.image_id || g.screenshots?.[0]?.image_id;
  return {
    id: g.id,
    slug: g.slug,
    name: g.name,
    cover_url: img(g.cover?.image_id, 't_cover_big'),
    release_year: g.first_release_date ? new Date(g.first_release_date * 1000).getUTCFullYear() : null,
    release_date: g.first_release_date || null,
    summary: g.summary || null,
    developer: dev,
    genres: (g.genres || []).map((x) => x.name),
    platforms: (g.platforms || []).map((p) => p.abbreviation || p.name).filter(Boolean),
    critic_score: g.aggregated_rating ? Math.round(g.aggregated_rating) : null,
    critic_count: g.aggregated_rating_count || null,
    artwork_url: img(art, 't_1080p'),
    adult: (g.themes || []).includes(EROTIC_THEME),
  };
}

// Remove conteúdo adulto e jogos repetidos (mesmo nome e mesmo ano)
function cleanList(list) {
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    const g = toGame(raw);
    if (g.adult) continue;
    const key = `${g.name.toLowerCase()}|${g.release_year}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(g);
  }
  return out;
}

const clean = (s) => String(s || '').replace(/["\\;{}]/g, ' ').trim().slice(0, 80);
const int = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

// Só jogos principais, remakes, remasters e edições expandidas
// (tira ports, coletâneas e DLCs, que causavam jogos repetidos)
function where(conds, withType) {
  const all = [...conds, 'version_parent = null', 'cover != null'];
  if (withType) all.push('game_type = (0,4,8,9,10)');
  return `where ${all.join(' & ')};`;
}

// Tenta com o filtro de tipo; se o IGDB recusar, tenta sem
async function withTypeFallback(build) {
  try {
    return await build(true);
  } catch (e) {
    if (e.status === 400) return build(false);
    throw e;
  }
}

function filterConds({ genre, platform, year }) {
  const conds = [];
  if (int(genre)) conds.push(`genres = (${int(genre)})`);
  if (int(platform)) conds.push(`platforms = (${int(platform)})`);
  const y = int(year);
  if (y) {
    conds.push(`first_release_date >= ${Date.UTC(y, 0, 1) / 1000}`);
    conds.push(`first_release_date < ${Date.UTC(y + 1, 0, 1) / 1000}`);
  }
  return conds;
}

function sortConds(sort) {
  const now = Math.floor(Date.now() / 1000);
  const day = 86400;
  switch (sort) {
    case 'em-alta':
      return { conds: [`first_release_date > ${now - 365 * day}`, `first_release_date < ${now}`, 'total_rating_count > 5'], sort: 'sort total_rating_count desc;' };
    case 'lancamentos':
      return { conds: [`first_release_date < ${now}`, `first_release_date > ${now - 120 * day}`, 'hypes > 2'], sort: 'sort first_release_date desc;' };
    case 'em-breve':
      return { conds: [`first_release_date > ${now}`, 'hypes > 5'], sort: 'sort first_release_date asc;' };
    case 'critica':
      return { conds: ['aggregated_rating_count > 4'], sort: 'sort aggregated_rating desc;' };
    case 'nome':
      return { conds: ['total_rating_count > 10'], sort: 'sort name asc;' };
    default:
      return { conds: ['total_rating_count > 20'], sort: 'sort total_rating_count desc;' };
  }
}

// ---------------------------------------------------------------------
// Consultas usadas pelo site
// ---------------------------------------------------------------------
export async function searchGames(query, { genre, platform, year, page = 1, limit = 48 } = {}) {
  const q = clean(query);
  if (!q) return [];
  const offset = (Math.max(1, page) - 1) * limit;
  const conds = filterConds({ genre, platform, year });
  const data = await withTypeFallback((t) =>
    igdb('games', `search "${q}"; ${LIST_FIELDS} ${where(conds, t)} limit ${limit}; offset ${offset};`)
  );
  const list = cleanList(data);
  list.hasMore = data.length >= limit;
  return list;
}

export async function listGames({ sort = 'populares', genre, platform, year, page = 1, limit = 48 } = {}) {
  const s = sortConds(sort);
  const conds = [...s.conds, ...filterConds({ genre, platform, year })];
  const offset = (Math.max(1, page) - 1) * limit;
  const data = await withTypeFallback((t) =>
    igdb('games', `${LIST_FIELDS} ${where(conds, t)} ${s.sort} limit ${limit}; offset ${offset};`, 21600)
  );
  const list = cleanList(data);
  list.hasMore = data.length >= limit;
  return list;
}

// Todas as listas da tela de início em UM pedido só (multiquery)
export async function homeLists() {
  const sections = ['em-alta', 'lancamentos', 'critica', 'em-breve'];
  const build = (t) =>
    sections
      .map((key) => {
        const s = sortConds(key);
        return `query games "${key}" { ${LIST_FIELDS} ${where(s.conds, t)} ${s.sort} limit 16; };`;
      })
      .join('\n');
  const data = await withTypeFallback((t) => igdb('multiquery', build(t), 21600));
  const out = {};
  for (const block of data) out[block.name] = cleanList(block.result || []).slice(0, 12);
  return out;
}

// Busca um jogo pelo slug: primeiro no IGDB (dados atualizados) e salva/atualiza no nosso banco
export async function getGameBySlug(slug) {
  const s = clean(slug);
  const admin = createAdminClient();
  try {
    const data = await igdb('games', `${FULL_FIELDS} where slug = "${s}"; limit 1;`, 86400);
    if (!data.length) return null;
    const game = toGame(data[0]);
    const { release_date, adult, ...row } = game;
    const { error } = await admin.from('games').upsert({ ...row, updated_at: new Date().toISOString() });
    if (error) {
      // Banco ainda sem as colunas novas: salva só o básico
      const { critic_score, critic_count, artwork_url, ...basic } = row;
      await admin.from('games').upsert({ ...basic, updated_at: new Date().toISOString() });
    }
    return game;
  } catch (err) {
    // Se o IGDB estiver fora do ar, usa a cópia que já temos
    const { data } = await admin.from('games').select('*').eq('slug', s).maybeSingle();
    if (data) return data;
    throw err;
  }
}
