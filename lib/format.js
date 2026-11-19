// Nota de 1 a 10 -> estrelas (10 = ★★★★★, 7 = ★★★½)
export function stars(rating) {
  if (!rating) return '';
  return '★'.repeat(Math.floor(rating / 2)) + (rating % 2 ? '½' : '');
}

export const STATUS = {
  jogando: 'Jogando',
  zerado: 'Zerado',
  abandonado: 'Abandonado',
  quero: 'Quero jogar',
};

export const STATUS_VERB = {
  jogando: 'está jogando',
  zerado: 'zerou',
  abandonado: 'abandonou',
  quero: 'quer jogar',
};

export const POST_TYPES = {
  duvida: 'Dúvida',
  foto: 'Foto',
  discussao: 'Discussão',
  amizade: 'Fazer amigos',
};

export const AVATAR_COLORS = ['#3B4BDB', '#C2416B', '#2F7D6B', '#B8762A', '#5B4BC4', '#2A6FB8', '#7A3FB8', '#B83A3A'];

export function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'agora';
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `há ${d} ${d === 1 ? 'dia' : 'dias'}`;
  const w = Math.floor(d / 7);
  if (d < 30) return `há ${w} ${w === 1 ? 'semana' : 'semanas'}`;
  return new Date(date).toLocaleDateString('pt-BR');
}

// Compatibilidade de gosto entre duas pessoas (0–100), a partir dos jogos que as duas avaliaram
export function compatibility(aEntries, bEntries) {
  const b = new Map(bEntries.filter((e) => e.rating).map((e) => [e.game_id, e.rating]));
  const diffs = aEntries.filter((e) => e.rating && b.has(e.game_id)).map((e) => Math.abs(e.rating - b.get(e.game_id)));
  if (diffs.length < 3) return { score: null, common: diffs.length };
  const avg = diffs.reduce((x, y) => x + y, 0) / diffs.length;
  return { score: Math.round(100 - (avg / 9) * 100), common: diffs.length };
}
