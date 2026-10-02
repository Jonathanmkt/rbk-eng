import type { createClient } from '@/lib/supabase/server';

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Baralho que recebe as expressões salvas nas aulas de música (decisão do CEO, 02/10/2026). */
const BARALHO_MUSICAS = 'Músicas';

export type PedidoMemorizar = {
  expressao: string;
  linhaDaLetra: string;
  traducao: string;
};

export type ResultadoMemorizar = { ok: true; expressao: string } | { ok: false; motivo: string };

/** O baralho "Músicas" do aluno; cria na primeira vez. RLS garante que é dele. */
async function baralhoMusicas(supabase: Supabase): Promise<string | null> {
  const { data: existente } = await supabase
    .schema('anki')
    .from('decks')
    .select('id')
    .eq('name', BARALHO_MUSICAS)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (existente) return existente.id;

  const { data: novo, error } = await supabase
    .schema('anki')
    .from('decks')
    .insert({
      name: BARALHO_MUSICAS,
      description: 'Expressões salvas nas aulas de música com o professor.',
      audio_language: 'en-US',
    })
    .select('id')
    .single();
  if (error || !novo) {
    console.error('[memorizar] criar baralho', error);
    return null;
  }
  return novo.id;
}

/**
 * Guarda uma expressão da música no banco de palavras e manda para a revisão,
 * as duas coisas de uma vez:
 *  1. insere em leitor.word_bank (source_type 'song', a linha da letra como contexto);
 *  2. chama a Edge Function `enviar-cards`, que gera o par de frases (DeepSeek) e cria
 *     o cartão no baralho "Músicas". Ela roda em segundo plano e responde 202 na hora.
 * Se a mesma expressão, na mesma linha, já foi guardada, não duplica.
 */
export async function salvarParaMemorizar(supabase: Supabase, pedido: PedidoMemorizar): Promise<ResultadoMemorizar> {
  const expressao = pedido.expressao.trim().slice(0, 200);
  const linha = pedido.linhaDaLetra.trim().slice(0, 500);
  const traducao = pedido.traducao.trim().slice(0, 300);
  if (!expressao) return { ok: false, motivo: 'expressão vazia' };

  const deckId = await baralhoMusicas(supabase);
  if (!deckId) return { ok: false, motivo: 'não consegui abrir o baralho de músicas' };

  const { data: repetida } = await supabase
    .schema('leitor')
    .from('word_bank')
    .select('id, card_id')
    .eq('source_type', 'song')
    .ilike('selected_text', expressao)
    .eq('paragraph_context', linha)
    .limit(1)
    .maybeSingle();

  let entradaId = repetida?.id ?? null;
  if (repetida?.card_id) return { ok: true, expressao };

  if (!entradaId) {
    const { data: entrada, error } = await supabase
      .schema('leitor')
      .from('word_bank')
      .insert({
        book_id: null,
        source_type: 'song',
        selected_text: expressao,
        paragraph_context: linha || null,
        location_cfi: null,
        language: 'en-US',
        translation_common: traducao || null,
        translation_contextual: null,
        context_explanation: null,
      })
      .select('id')
      .single();
    if (error || !entrada) {
      console.error('[memorizar] gravar no banco de palavras', error);
      return { ok: false, motivo: 'não consegui guardar no banco de palavras' };
    }
    entradaId = entrada.id;
  }

  const { error: erroCards } = await supabase.functions.invoke('enviar-cards', {
    body: { entryIds: [entradaId], deckId },
  });
  if (erroCards) {
    console.error('[memorizar] enviar-cards', erroCards);
    return { ok: false, motivo: 'guardei no banco, mas não consegui criar o cartão de revisão' };
  }
  return { ok: true, expressao };
}

/** Trechos que o aluno já marcou nesta música: entradas de música cujo contexto é uma linha desta letra. */
export async function trechosMarcadosNaMusica(supabase: Supabase, letra: string): Promise<string[]> {
  const linhas = [...new Set(letra.split('\n').map((l) => l.trim()).filter(Boolean))].slice(0, 200);
  if (!linhas.length) return [];
  const { data } = await supabase
    .schema('leitor')
    .from('word_bank')
    .select('selected_text')
    .eq('source_type', 'song')
    .in('paragraph_context', linhas)
    .limit(20);
  return [...new Set((data ?? []).map((w) => String(w.selected_text).trim()).filter(Boolean))];
}
