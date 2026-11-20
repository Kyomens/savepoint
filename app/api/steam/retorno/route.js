import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getPlayerName } from '@/lib/steam';

export const dynamic = 'force-dynamic';

// A Steam devolve a pessoa para cá. Conferimos com a própria Steam se o login é verdadeiro.
export async function GET(request) {
  const url = new URL(request.url);
  const origin = process.env.NEXT_PUBLIC_SITE_URL || url.origin;
  const fail = (msg) => NextResponse.redirect(`${origin}/configuracoes?erro=${encodeURIComponent(msg)}`);

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/entrar`);

  const params = new URLSearchParams();
  for (const [k, v] of url.searchParams) if (k.startsWith('openid.')) params.set(k, v);
  if (params.get('openid.mode') !== 'id_res') return fail('Conexão com a Steam cancelada.');
  if (!String(params.get('openid.return_to') || '').startsWith(`${origin}/api/steam/retorno`)) return fail('Resposta inválida da Steam.');
  params.set('openid.mode', 'check_authentication');

  const check = await fetch('https://steamcommunity.com/openid/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    cache: 'no-store',
  }).then((r) => r.text()).catch(() => '');
  if (!/is_valid\s*:\s*true/.test(check)) return fail('Não foi possível confirmar sua conta Steam. Tente de novo.');

  const steamId = String(params.get('openid.claimed_id') || '').match(/\/openid\/id\/(\d{17})$/)?.[1];
  if (!steamId) return fail('Não foi possível ler sua conta Steam.');

  const admin = createAdminClient();
  const { data: taken } = await admin.from('linked_accounts').select('user_id').eq('provider', 'steam').eq('external_id', steamId).maybeSingle();
  if (taken && taken.user_id !== user.id) return fail('Essa conta Steam já está conectada a outro perfil do Savepoint.');

  const name = await getPlayerName(steamId);
  await admin.from('linked_accounts').upsert({ user_id: user.id, provider: 'steam', external_id: steamId, display_name: name, linked_at: new Date().toISOString() });
  return NextResponse.redirect(`${origin}/configuracoes?ok=steam`);
}
