import { NextResponse } from 'next/server';
import { searchGames } from '@/lib/igdb';

export const dynamic = 'force-dynamic';

// Busca rápida usada no "Top 4" do editar perfil
export async function GET(request) {
  const q = new URL(request.url).searchParams.get('q') || '';
  if (q.trim().length < 2) return NextResponse.json([]);
  try {
    const games = await searchGames(q, { limit: 10 });
    return NextResponse.json(
      games.slice(0, 8).map(({ id, slug, name, cover_url, release_year }) => ({ id, slug, name, cover_url, release_year }))
    );
  } catch {
    return NextResponse.json([], { status: 502 });
  }
}
