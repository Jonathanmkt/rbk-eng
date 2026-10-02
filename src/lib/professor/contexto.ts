import { stripMarks } from '@/lib/anki/rich-text';
import { createClient } from '@/lib/supabase/server';
import type { FotoDoAluno } from './prompt';

const MAX_ANKI = 15;
const MAX_SALVAS = 15;

/**
 * Lê do banco o que o professor precisa saber no início da conversa.
 * RLS garante que só volta o que é do usuário logado.
 */
export async function carregarFotoDoAluno(userId: string): Promise<FotoDoAluno> {
  const supabase = await createClient();
  const agora = new Date().toISOString();

  const [perfil, decks, salvas] = await Promise.all([
    supabase.from('profiles').select('nome_completo').eq('id', userId).single(),
    // Só baralhos de inglês: o Anki também tem baralhos em pt-BR.
    supabase.schema('anki').from('decks').select('id').eq('audio_language', 'en-US'),
    supabase
      .schema('leitor')
      .from('word_bank')
      .select('selected_text')
      .order('created_at', { ascending: false })
      .limit(MAX_SALVAS),
  ]);

  const deckIds = (decks.data ?? []).map((d) => d.id as string);
  let palavrasAnkiHoje: string[] = [];
  if (deckIds.length) {
    const { data: cards } = await supabase
      .schema('anki')
      .from('cards')
      .select('front')
      .in('deck_id', deckIds)
      .lte('due', agora)
      .order('due', { ascending: true })
      .limit(MAX_ANKI);
    palavrasAnkiHoje = (cards ?? []).map((c) => stripMarks(String(c.front)).trim()).filter(Boolean);
  }

  return {
    nome: (perfil.data?.nome_completo as string | null)?.split(' ')[0] ?? null,
    nivel: 'desconhecido',
    palavrasAnkiHoje,
    palavrasSalvas: [
      ...new Set((salvas.data ?? []).map((w) => String(w.selected_text).trim()).filter(Boolean)),
    ],
  };
}
