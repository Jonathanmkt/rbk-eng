// Edge Function: enviar-cards
// Gera 1 card por palavra selecionada, insere no baralho e liga em word_bank.card_id.
// Modelo: DeepSeek V4.1 Flash (raciocínio desligado), decisão do CEO em 02/10/2026; se a
// DeepSeek falhar ou faltar a chave, cai no gpt-4o-mini. Comparados em 02/10/2026 com 5
// expressões de letras de música: qualidade equivalente, DeepSeek igual ou mais rápida.
// Roda em segundo plano (EdgeRuntime.waitUntil) e retorna 202 na hora. Conclusão por email (Etapa 6).
import { createClient } from 'jsr:@supabase/supabase-js@2';

type Entry = {
  id: string;
  selected_text: string;
  paragraph_context: string | null;
  language: string; // 'en-US' | 'pt-BR'
};

type Generated = { sentence_en: string; sentence_pt: string };

type Provedor = { nome: string; url: string; chave: string; modelo: string; extra?: Record<string, unknown> };

/** Ordem de tentativa: DeepSeek primeiro, OpenAI como reserva. Só entra quem tem chave. */
function provedores(): Provedor[] {
  const lista: Provedor[] = [];
  const deepseek = Deno.env.get('DEEPSEEK_API_KEY');
  if (deepseek) {
    lista.push({
      nome: 'deepseek',
      url: 'https://api.deepseek.com/chat/completions',
      chave: deepseek,
      modelo: 'deepseek-flash',
      // Sem raciocínio: a tarefa é mecânica e o raciocínio só atrasa e encarece.
      extra: { thinking: { type: 'disabled' } },
    });
  }
  const openai = Deno.env.get('OPENAI_API_KEY');
  if (openai) {
    lista.push({ nome: 'openai', url: 'https://api.openai.com/v1/chat/completions', chave: openai, modelo: 'gpt-4o-mini' });
  }
  return lista;
}

/** A palavra-alvo precisa vir marcada com **...** na frase inglesa. */
function isValid(g: Generated): boolean {
  return /\*\*[^*]+\*\*/.test(g.sentence_en) && g.sentence_pt.trim().length > 0;
}

async function gerarFrase(entry: Entry, lista: Provedor[]): Promise<Generated | null> {
  const alvoLang = entry.language === 'en-US' ? 'inglês' : 'português';
  const system =
    `Você cria frases de treino para estudo de idiomas. A palavra/expressão-alvo está em ${alvoLang}. ` +
    `Gere UMA frase curta e natural em INGLÊS contendo a expressão-alvo (pode flexioná-la). ` +
    `Todas as OUTRAS palavras da frase devem ser de nível CEFR A1–A2 (bem básicas) — só a expressão-alvo ` +
    `pode ser difícil. Use o parágrafo de contexto APENAS para escolher o sentido correto da expressão ` +
    `(não copie o parágrafo). Marque a expressão-alvo com **asteriscos duplos** tanto na frase em inglês ` +
    `quanto na tradução em português do Brasil. Responda APENAS em JSON: ` +
    `{"sentence_en":"...","sentence_pt":"..."}`;
  const user =
    `Expressão-alvo: "${entry.selected_text}"\n` +
    `Parágrafo de contexto: """${entry.paragraph_context ?? ''}"""`;

  // Duas tentativas em cada provedor, na ordem; o primeiro resultado válido vale.
  for (const p of lista) {
    for (let tentativa = 0; tentativa < 2; tentativa++) {
      try {
        const res = await fetch(p.url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${p.chave}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: p.modelo,
            temperature: 0.4,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user },
            ],
            ...p.extra,
          }),
        });
        if (!res.ok) {
          console.error(`enviar-cards: ${p.nome} respondeu ${res.status}`);
          continue;
        }
        const data = await res.json();
        const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? '{}') as Generated;
        if (isValid(parsed)) return parsed;
      } catch (_) {
        // tenta de novo
      }
    }
  }
  return null;
}

// Campos FSRS de um card novo (equivale ao createEmptyCard do ts-fsrs).
function novoCardFsrs() {
  return {
    state: 0,
    due: new Date().toISOString(),
    stability: 0,
    difficulty: 0,
    elapsed_days: 0,
    scheduled_days: 0,
    reps: 0,
    lapses: 0,
    learning_steps: 0,
    last_review: null as string | null,
  };
}

async function processar(
  admin: ReturnType<typeof createClient>,
  userId: string,
  entryIds: string[],
  deckId: string
) {
  const lista = provedores();
  if (!lista.length) {
    console.error('enviar-cards: nenhuma chave de modelo (DEEPSEEK_API_KEY ou OPENAI_API_KEY)');
    return;
  }

  // Só entradas do usuário que ainda não têm card.
  const { data: entries } = await admin
    .schema('leitor')
    .from('word_bank')
    .select('id, selected_text, paragraph_context, language')
    .in('id', entryIds)
    .eq('user_id', userId)
    .is('card_id', null);

  let criadas = 0;
  let falhas = 0;

  for (const entry of (entries ?? []) as Entry[]) {
    const gerado = await gerarFrase(entry, lista);
    if (!gerado) {
      falhas++;
      continue;
    }

    const { data: card, error: cardErr } = await admin
      .schema('anki')
      .from('cards')
      .insert({
        deck_id: deckId,
        owner_id: userId,
        front: gerado.sentence_en,
        back: gerado.sentence_pt,
        ...novoCardFsrs(),
      })
      .select('id')
      .single();

    if (cardErr || !card) {
      falhas++;
      continue;
    }

    await admin.schema('leitor').from('word_bank').update({ card_id: card.id }).eq('id', entry.id);
    criadas++;
  }

  console.log(`enviar-cards: ${criadas} criadas, ${falhas} falhas (user ${userId})`);
  // TODO Etapa 6: enviar email de conclusão (SMTP via denomailer) com o resumo criadas × falhas.
}

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const { entryIds, deckId } = await req.json();
    if (!Array.isArray(entryIds) || !entryIds.length || !deckId) {
      return new Response(JSON.stringify({ error: 'entryIds e deckId são obrigatórios' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Identifica o usuário pelo JWT recebido.
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Trabalho pesado com service role, escopado ao user, em segundo plano.
    const admin = createClient(url, service);
    const job = processar(admin, user.id, entryIds, deckId);
    // @ts-ignore EdgeRuntime existe no runtime do Supabase Edge Functions
    EdgeRuntime.waitUntil(job);

    return new Response(JSON.stringify({ accepted: true }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
