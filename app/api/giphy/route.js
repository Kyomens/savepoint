import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Busca GIFs e figurinhas no GIPHY (a chave fica só no servidor)
export async function GET(request) {
  const key = process.env.GIPHY_API_KEY;
  if (!key) return NextResponse.json({ enabled: false, items: [] });
  const sp = new URL(request.url).searchParams;
  const type = sp.get('type') === 'stickers' ? 'stickers' : 'gifs';
  const q = (sp.get('q') || '').trim().slice(0, 50);
  const url = new URL(`https://api.giphy.com/v1/${type}/${q ? 'search' : 'trending'}`);
  url.searchParams.set('api_key', key);
  url.searchParams.set('limit', '24');
  url.searchParams.set('rating', 'pg-13');
  if (q) {
    url.searchParams.set('q', q);
    url.searchParams.set('lang', 'pt');
  }
  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return NextResponse.json({ enabled: true, items: [] }, { status: 502 });
    const data = await res.json();
    const items = (data.data || [])
      .map((g) => ({
        id: g.id,
        url: g.images?.fixed_height?.url || g.images?.original?.url,
        preview: g.images?.fixed_height_small?.url || g.images?.fixed_height?.url,
      }))
      .filter((i) => i.url);
    return NextResponse.json({ enabled: true, items });
  } catch {
    return NextResponse.json({ enabled: true, items: [] }, { status: 502 });
  }
}
