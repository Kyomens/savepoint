// Campos de perfil usados em todo o site (avatar, nome etc.)
export const PROFILE_FIELDS = 'id, username, display_name, avatar_color, avatar_url';

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

// Ordem em que os status aparecem no perfil
export const STATUS_ORDER = [
  ['jogando', 'Jogando'],
  ['zerado', 'Zerados'],
  ['quero', 'Quero jogar'],
  ['abandonado', 'Abandonados'],
];

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

// Capas de perfil prontas
export const BANNER_PRESETS = {
  noite: 'linear-gradient(135deg, #1a1216, #3b1d33)',
  oceano: 'linear-gradient(135deg, #0b2545, #13315c 50%, #1d4e89)',
  floresta: 'linear-gradient(135deg, #0f2417, #1f4630 60%, #2e6b46)',
  lava: 'linear-gradient(135deg, #2a0b0b, #7a1d12 60%, #c2410c)',
  neon: 'linear-gradient(135deg, #120c2b, #3b1a7a 55%, #c026d3)',
  aurora: 'linear-gradient(135deg, #062a2a, #0f766e 50%, #65a30d)',
  areia: 'linear-gradient(135deg, #3b2a14, #8a6a2a 60%, #d6b46a)',
  grafite: 'linear-gradient(135deg, #111216, #2a2e36)',
};

// Estilo CSS da capa do perfil a partir do valor salvo
export function bannerStyle(value, pos = 50) {
  if (!value) return { background: 'var(--hero)' };
  if (value.startsWith('preset:')) return { background: BANNER_PRESETS[value.slice(7)] || 'var(--hero)' };
  const y = Number.isFinite(Number(pos)) ? Math.min(100, Math.max(0, Number(pos))) : 50;
  return { backgroundImage: `url("${value}")`, backgroundSize: 'cover', backgroundPosition: `center ${y}%` };
}

// Gêneros do IGDB com o nome em português
export const GENRES = [
  { id: 31, en: 'Adventure', pt: 'Aventura' },
  { id: 12, en: 'Role-playing (RPG)', pt: 'RPG' },
  { id: 5, en: 'Shooter', pt: 'Tiro' },
  { id: 8, en: 'Platform', pt: 'Plataforma' },
  { id: 32, en: 'Indie', pt: 'Indie' },
  { id: 25, en: "Hack and slash/Beat 'em up", pt: 'Hack and slash' },
  { id: 15, en: 'Strategy', pt: 'Estratégia' },
  { id: 11, en: 'Real Time Strategy (RTS)', pt: 'Estratégia em tempo real' },
  { id: 16, en: 'Turn-based strategy (TBS)', pt: 'Estratégia por turnos' },
  { id: 24, en: 'Tactical', pt: 'Tático' },
  { id: 13, en: 'Simulator', pt: 'Simulação' },
  { id: 9, en: 'Puzzle', pt: 'Quebra-cabeça' },
  { id: 10, en: 'Racing', pt: 'Corrida' },
  { id: 14, en: 'Sport', pt: 'Esporte' },
  { id: 4, en: 'Fighting', pt: 'Luta' },
  { id: 33, en: 'Arcade', pt: 'Arcade' },
  { id: 34, en: 'Visual Novel', pt: 'Visual novel' },
  { id: 35, en: 'Card & Board Game', pt: 'Cartas e tabuleiro' },
  { id: 7, en: 'Music', pt: 'Música' },
  { id: 2, en: 'Point-and-click', pt: 'Point-and-click' },
  { id: 36, en: 'MOBA', pt: 'MOBA' },
  { id: 26, en: 'Quiz/Trivia', pt: 'Quiz' },
  { id: 30, en: 'Pinball', pt: 'Pinball' },
];
export function genrePt(name) {
  return GENRES.find((g) => g.en === name)?.pt || name;
}

export const PLATFORMS = [
  { id: 6, label: 'PC' },
  { id: 167, label: 'PlayStation 5' },
  { id: 48, label: 'PlayStation 4' },
  { id: 169, label: 'Xbox Series X|S' },
  { id: 49, label: 'Xbox One' },
  { id: 130, label: 'Nintendo Switch' },
  { id: 39, label: 'iOS' },
  { id: 34, label: 'Android' },
];

export const SORTS = [
  ['populares', 'Mais populares'],
  ['em-alta', 'Em alta (último ano)'],
  ['lancamentos', 'Lançamentos recentes'],
  ['em-breve', 'Em breve'],
  ['critica', 'Melhor nota da crítica'],
  ['savepoint', 'Melhor nota no Savepoint'],
  ['nome', 'Nome (A–Z)'],
];

export function formatDate(value) {
  if (!value) return '';
  const d = typeof value === 'number' ? new Date(value * 1000) : new Date(value);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

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

// ---------------------------------------------------------------------
// Atualização 02
// ---------------------------------------------------------------------

// Temas do perfil (cor de destaque + brilho no fundo). "requires" = insígnia necessária.
export const PROFILE_THEMES = {
  padrao: { name: 'Padrão', accent: '#C6F432', dark: '#4F7A00', glow: 'rgba(198, 244, 50, 0.10)' },
  roxo: { name: 'Roxo', accent: '#A78BFA', dark: '#6D28D9', glow: 'rgba(139, 92, 246, 0.32)' },
  oceano: { name: 'Oceano', accent: '#38BDF8', dark: '#0369A1', glow: 'rgba(14, 165, 233, 0.30)' },
  floresta: { name: 'Floresta', accent: '#4ADE80', dark: '#15803D', glow: 'rgba(34, 197, 94, 0.28)' },
  sangue: { name: 'Sangue', accent: '#F87171', dark: '#B91C1C', glow: 'rgba(239, 68, 68, 0.30)' },
  rosa: { name: 'Rosa', accent: '#F472B6', dark: '#BE185D', glow: 'rgba(236, 72, 153, 0.30)' },
  ouro: { name: 'Ouro', accent: '#FACC15', dark: '#A16207', glow: 'rgba(234, 179, 8, 0.34)', requires: 'critico' },
  neon: { name: 'Neon', accent: '#22D3EE', dark: '#0E7490', glow: 'rgba(217, 70, 239, 0.36)', requires: 'mentor' },
  platina: { name: 'Platina', accent: '#E2E8F0', dark: '#475569', glow: 'rgba(203, 213, 225, 0.38)', requires: 'platinador' },
};

// Molduras da foto de perfil (todas exclusivas de insígnias)
export const AVATAR_FRAMES = {
  critico: { name: 'Crítico', requires: 'critico' },
  voz: { name: 'Voz da comunidade', requires: 'popular' },
  mentor: { name: 'Mentor', requires: 'mentor' },
  platina: { name: 'Platinador', requires: 'platinador' },
  lenda: { name: 'Lenda', requires: 'critico-ouro' },
};

// Estilo (variáveis CSS) do tema do perfil
export function profileThemeVars(id) {
  const t = PROFILE_THEMES[id] || PROFILE_THEMES.padrao;
  return { '--p-accent': t.accent, '--p-accent-dark': t.dark, '--p-glow': t.glow };
}

// Sugestões de "até onde vai o spoiler"
export const SPOILER_SCOPES = ['Começo do jogo', 'Meio da história', 'Final do jogo', 'Pós-game / DLC'];

// Link do Spotify -> endereço do player embutido (ou null se não for válido)
export function spotifyEmbed(url) {
  const m = String(url || '').match(/^https:\/\/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(?:embed\/)?(album|playlist|track)\/([A-Za-z0-9]{10,40})/);
  return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}` : null;
}
