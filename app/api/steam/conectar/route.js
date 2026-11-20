import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// Manda a pessoa para o "Entrar com a Steam" (OpenID oficial da Steam)
export async function GET(request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  if (!user) return NextResponse.redirect(`${origin}/entrar`);
  const params = new URLSearchParams({
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.mode': 'checkid_setup',
    'openid.return_to': `${origin}/api/steam/retorno`,
    'openid.realm': origin,
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
  });
  return NextResponse.redirect(`https://steamcommunity.com/openid/login?${params}`);
}
