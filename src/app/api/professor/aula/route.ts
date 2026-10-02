import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

const MAX_LETRA = 12_000;

/**
 * Abre uma aula particular sobre um material (hoje: uma música).
 *
 * Encerra a conversa aberta e cria uma nova, do tipo da aula, com o material
 * guardado no banco. Quem abre o professor em seguida (voz ou texto) pega esta
 * conversa como a aberta mais recente e monta a aula a partir dela.
 *
 * Corpo: { tipo: 'musica', titulo, artista, letra }. Resposta: { sessaoId }.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });

  const corpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const titulo = typeof corpo?.titulo === 'string' ? corpo.titulo.trim().slice(0, 200) : '';
  const artista = typeof corpo?.artista === 'string' ? corpo.artista.trim().slice(0, 200) : '';
  const letra = typeof corpo?.letra === 'string' ? corpo.letra.trim().slice(0, MAX_LETRA) : '';
  if (corpo?.tipo !== 'musica' || !titulo || !letra) {
    return NextResponse.json({ erro: 'Aula inválida.' }, { status: 400 });
  }

  await supabase
    .schema('tutor')
    .from('sessions')
    .update({ ended_at: new Date().toISOString() })
    .is('ended_at', null);

  const { data, error } = await supabase
    .schema('tutor')
    .from('sessions')
    .insert({ kind: 'musica', material: { titulo, artista, letra }, model: 'aula-musica' })
    .select('id')
    .single();
  if (error || !data) {
    console.error('[aula] criar sessão', error);
    return NextResponse.json({ erro: 'Não consegui abrir a aula.' }, { status: 500 });
  }
  return NextResponse.json({ sessaoId: data.id });
}
