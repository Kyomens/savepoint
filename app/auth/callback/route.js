import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Para onde o link de confirmação do e-mail leva
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(`${origin}/editar-perfil?bemvindo=1`);
}
