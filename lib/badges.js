// Insígnias: calculadas a partir das estatísticas de cada pessoa (função user_stats no banco)
export const BADGES = [
  { id: 'primeira-review', name: 'Primeira review', desc: 'Escreveu a primeira review', stat: 'reviews', min: 1, icon: '✎', color: '#60A5FA' },
  { id: 'critico', name: 'Crítico', desc: 'Escreveu 10 reviews', stat: 'reviews', min: 10, icon: '✎', color: '#FACC15' },
  { id: 'critico-ouro', name: 'Crítico de ouro', desc: 'Escreveu 50 reviews', stat: 'reviews', min: 50, icon: '♛', color: '#F59E0B' },
  { id: 'popular', name: 'Voz da comunidade', desc: 'Recebeu 25 curtidas nas reviews', stat: 'likes_received', min: 25, icon: '♥', color: '#F472B6' },
  { id: 'ajudante', name: 'Ajudante', desc: 'Respondeu 10 posts na comunidade', stat: 'replies', min: 10, icon: '✚', color: '#34D399' },
  { id: 'mentor', name: 'Mentor', desc: 'Teve 5 respostas escolhidas como a melhor', stat: 'best_answers', min: 5, icon: '✔', color: '#22D3EE' },
  { id: 'colecionador', name: 'Colecionador', desc: 'Zerou 25 jogos', stat: 'completed', min: 25, icon: '◆', color: '#A78BFA' },
  { id: 'maratonista', name: 'Maratonista', desc: 'Zerou 100 jogos', stat: 'completed', min: 100, icon: '◆', color: '#C084FC' },
  { id: 'platinador', name: 'Platinador', desc: 'Platinou um jogo (verificado pela Steam)', stat: 'platinums', min: 1, icon: '🏆', color: '#E2E8F0' },
  { id: 'cacador', name: 'Caçador de troféus', desc: 'Platinou 10 jogos', stat: 'platinums', min: 10, icon: '🏆', color: '#FDE68A' },
  { id: 'influente', name: 'Influente', desc: 'Tem 50 seguidores', stat: 'followers', min: 50, icon: '★', color: '#FB923C' },
];

export function earnedBadges(stats) {
  if (!stats) return [];
  return BADGES.filter((b) => (Number(stats[b.stat]) || 0) >= b.min);
}

// Próximas insígnias e quanto falta
export function nextBadges(stats, limit = 3) {
  if (!stats) return [];
  return BADGES.filter((b) => (Number(stats[b.stat]) || 0) < b.min)
    .map((b) => ({ ...b, have: Number(stats[b.stat]) || 0 }))
    .sort((a, b) => a.have / a.min < b.have / b.min ? 1 : -1)
    .slice(0, limit);
}

export const badgeName = (id) => BADGES.find((b) => b.id === id)?.name || id;

export async function loadStats(supabase, userId) {
  const { data, error } = await supabase.rpc('user_stats', { uid: userId });
  if (error) return null;
  return data;
}
