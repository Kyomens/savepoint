import { createAdminClient } from '@/lib/supabase/admin';

// Idiomas suportados. Para adicionar outro no futuro, é só incluir aqui.
const LANGS = {
  'pt-BR': { deepl: 'PT-BR', mymemory: 'pt-BR' },
};

function decodeEntities(s) {
  return s
    .replace(/&#39;|&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

// DeepL (melhor qualidade). Usado se existir a variável DEEPL_API_KEY.
async function deepl(text, lang) {
  const key = process.env.DEEPL_API_KEY;
  const host = key.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com';
  const res = await fetch(`${host}/v2/translate`, {
    method: 'POST',
    headers: { Authorization: `DeepL-Auth-Key ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ text, source_lang: 'EN', target_lang: LANGS[lang].deepl }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`DeepL ${res.status}`);
  const data = await res.json();
  return data.translations?.[0]?.text || null;
}

// Divide o texto em pedaços de até ~450 letras, sem cortar frases
function chunks(text, max = 450) {
  const parts = text.split(/(?<=[.!?])\s+/);
  const out = [];
  let cur = '';
  for (const p of parts) {
    if (p.length > max) {
      if (cur) out.push(cur);
      cur = '';
      for (let i = 0; i < p.length; i += max) out.push(p.slice(i, i + max));
    } else if ((cur ? cur.length + 1 : 0) + p.length > max) {
      out.push(cur);
      cur = p;
    } else {
      cur = cur ? `${cur} ${p}` : p;
    }
  }
  if (cur) out.push(cur);
  return out;
}

// MyMemory (gratuito, sem cadastro). Usado quando não há chave do DeepL.
async function mymemory(text, lang) {
  const out = [];
  for (const part of chunks(text)) {
    const url = new URL('https://api.mymemory.translated.net/get');
    url.searchParams.set('q', part);
    url.searchParams.set('langpair', `en|${LANGS[lang].mymemory}`);
    if (process.env.MYMEMORY_EMAIL) url.searchParams.set('de', process.env.MYMEMORY_EMAIL);
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`MyMemory ${res.status}`);
    const data = await res.json();
    const t = data?.responseData?.translatedText;
    if (!t || Number(data.responseStatus) !== 200 || /MYMEMORY WARNING/i.test(t)) throw new Error('MyMemory: limite atingido');
    out.push(decodeEntities(t));
  }
  return out.join(' ');
}

// Devolve a descrição do jogo no idioma pedido.
// Traduz só na primeira vez e guarda no banco (tabela game_texts).
export async function translatedSummary(game, lang = 'pt-BR') {
  if (!game?.summary) return { text: null, translated: false };
  if (!LANGS[lang]) return { text: game.summary, translated: false };
  const admin = createAdminClient();
  try {
    const { data } = await admin.from('game_texts').select('summary').eq('game_id', game.id).eq('lang', lang).maybeSingle();
    if (data?.summary) return { text: data.summary, translated: true };
    const text = process.env.DEEPL_API_KEY ? await deepl(game.summary, lang) : await mymemory(game.summary, lang);
    if (text) {
      await admin.from('game_texts').upsert({ game_id: game.id, lang, summary: text, updated_at: new Date().toISOString() });
      return { text, translated: true };
    }
  } catch (e) {
    console.error('Tradução falhou:', e.message);
  }
  return { text: game.summary, translated: false };
}
