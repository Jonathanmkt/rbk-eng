import { NextResponse } from 'next/server';

import { lerMaterialMusica, montarAulaDeMusica, type MaterialMusica } from '@/lib/professor/aula-musica';
import { carregarFotoDoAluno } from '@/lib/professor/contexto';
import { trechosMarcadosNaMusica } from '@/lib/professor/memorizar';
import { montarFotoDoAluno, PROFESSOR_PROMPT_FIXO } from '@/lib/professor/prompt';
import { createClient } from '@/lib/supabase/server';

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const MODELO = 'deepseek-flash';
/** Janela de histórico mandada ao modelo. */
const MAX_TURNOS_NO_MODELO = 60;
const MAX_CHARS_MENSAGEM = 2000;
/** Marcador para o modelo quando a conversa começa pelo professor. Não é gravado. */
const ABERTURA = '(o aluno abriu a conversa)';

type Turno = { role: 'user' | 'assistant'; content: string };
type Uso = { cache_hit: number; cache_miss: number; output: number };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function autenticar() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub as string | undefined;
  return { supabase, userId };
}

async function carregarTurnos(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessaoId: string
): Promise<Turno[]> {
  const { data } = await supabase
    .schema('tutor')
    .from('session_turns')
    .select('role, content')
    .eq('session_id', sessaoId)
    .order('idx', { ascending: true });
  return (data ?? []) as Turno[];
}

/**
 * GET: a conversa aberta mais recente do aluno, para reabrir o painel onde parou.
 * Resposta: { sessaoId: string | null, mensagens: Turno[] }
 */
export async function GET() {
  const { supabase, userId } = await autenticar();
  if (!userId) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });

  const { data: sessao } = await supabase
    .schema('tutor')
    .from('sessions')
    .select('id')
    .is('ended_at', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sessao) return NextResponse.json({ sessaoId: null, mensagens: [] });
  return NextResponse.json({ sessaoId: sessao.id, mensagens: await carregarTurnos(supabase, sessao.id) });
}

/**
 * POST: uma rodada da conversa com o professor (DeepSeek V4.1 Flash).
 *
 * Corpo: { sessaoId?: string, mensagem?: string, nova?: boolean }
 * - sem sessaoId, ou com nova=true: encerra a conversa atual (se houver) e abre
 *   outra; o professor fala primeiro.
 * - com sessaoId e mensagem: grava a fala do aluno e responde.
 *
 * O histórico vem do BANCO, não do navegador: a conversa guardada é a fonte da
 * verdade. A resposta sai em streaming (text/plain) e é gravada ao terminar,
 * inclusive se o aluno interromper no meio. O id da conversa vai no cabeçalho
 * `X-Sessao-Id`.
 *
 * Raciocínio DESLIGADO: com ele a primeira palavra demora 2,5–4 s; sem ele,
 * ~0,5–1 s (testes de 30/09/2026).
 */
export async function POST(request: Request) {
  const chave = process.env.DEEPSEEK_API_KEY;
  if (!chave) {
    return NextResponse.json({ erro: 'Professor indisponível: chave não configurada.' }, { status: 503 });
  }

  const { supabase, userId } = await autenticar();
  if (!userId) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });

  const corpo = (await request.json().catch(() => null)) as {
    sessaoId?: unknown;
    mensagem?: unknown;
    nova?: unknown;
  } | null;
  if (!corpo) return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 });

  const sessaoPedida = typeof corpo.sessaoId === 'string' && UUID.test(corpo.sessaoId) ? corpo.sessaoId : null;
  const mensagem =
    typeof corpo.mensagem === 'string' ? corpo.mensagem.trim().slice(0, MAX_CHARS_MENSAGEM) : '';
  const nova = corpo.nova === true || !sessaoPedida;

  // ── Sessão ────────────────────────────────────────────────────────────────
  let sessaoId: string;
  let usoAcumulado: Uso = { cache_hit: 0, cache_miss: 0, output: 0 };
  let musica: MaterialMusica | null = null;

  if (nova) {
    if (sessaoPedida) {
      await supabase
        .schema('tutor')
        .from('sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', sessaoPedida)
        .is('ended_at', null);
    }
    const { data, error } = await supabase
      .schema('tutor')
      .from('sessions')
      .insert({ model: MODELO })
      .select('id')
      .single();
    if (error || !data) {
      console.error('[professor] criar sessão', error);
      return NextResponse.json({ erro: 'Não consegui abrir a conversa.' }, { status: 500 });
    }
    sessaoId = data.id;
  } else {
    const { data } = await supabase
      .schema('tutor')
      .from('sessions')
      .select('id, usage, ended_at, kind, material')
      .eq('id', sessaoPedida)
      .maybeSingle();
    if (!data || data.ended_at) {
      return NextResponse.json({ erro: 'Conversa não encontrada.' }, { status: 404 });
    }
    if (!mensagem) return NextResponse.json({ erro: 'Mensagem vazia.' }, { status: 400 });
    sessaoId = data.id;
    usoAcumulado = { ...usoAcumulado, ...(data.usage as Partial<Uso>) };
    if (data.kind === 'musica') musica = lerMaterialMusica(data.material);
  }

  const turnos = nova ? [] : await carregarTurnos(supabase, sessaoId);

  if (mensagem && !nova) {
    const { error } = await supabase
      .schema('tutor')
      .from('session_turns')
      .insert({ session_id: sessaoId, idx: turnos.length, role: 'user', content: mensagem });
    if (error) {
      console.error('[professor] gravar fala do aluno', error);
      return NextResponse.json({ erro: 'Não consegui guardar a sua mensagem.' }, { status: 500 });
    }
    turnos.push({ role: 'user', content: mensagem });
  }

  // ── Modelo ────────────────────────────────────────────────────────────────
  const foto = await carregarFotoDoAluno(userId);
  const janela = turnos.slice(-MAX_TURNOS_NO_MODELO);
  // A API espera que a conversa comece pelo usuário; quando o professor abriu, o marcador ocupa esse lugar.
  const historico: Turno[] = janela[0]?.role === 'user' ? janela : [{ role: 'user', content: ABERTURA }, ...janela];

  const resposta = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODELO,
      stream: true,
      stream_options: { include_usage: true },
      thinking: { type: 'disabled' },
      max_tokens: 600,
      user: userId,
      messages: [
        // Aula de música por texto: o prompt próprio dela substitui as instruções gerais,
        // sem a ferramenta (aqui a DeepSeek não salva sozinha).
        ...(musica
          ? [
              {
                role: 'system' as const,
                content: montarAulaDeMusica(
                  musica,
                  {
                    nome: foto.nome,
                    palavrasMarcadas: await trechosMarcadosNaMusica(supabase, musica.letra),
                  },
                  'texto'
                ),
              },
            ]
          : [
              { role: 'system' as const, content: PROFESSOR_PROMPT_FIXO },
              { role: 'system' as const, content: montarFotoDoAluno(foto) },
            ]),
        ...historico,
      ],
    }),
    signal: request.signal,
  }).catch((e: unknown) => {
    console.error('[professor] falha de rede com a DeepSeek', e);
    return null;
  });

  if (!resposta?.ok || !resposta.body) {
    if (resposta) console.error('[professor] DeepSeek respondeu', resposta.status, await resposta.text().catch(() => ''));
    return NextResponse.json(
      { erro: 'O professor não respondeu agora. Tente de novo.' },
      { status: 502, headers: { 'X-Sessao-Id': sessaoId } }
    );
  }

  // ── Streaming + gravação ao final ─────────────────────────────────────────
  const leitor = resposta.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let resto = '';
  let texto = '';
  let uso: Uso | null = null;
  let gravado = false;
  const idxResposta = turnos.length;

  const gravarResposta = async () => {
    if (gravado) return;
    gravado = true;
    const agora = new Date().toISOString();
    if (texto.trim()) {
      const { error } = await supabase
        .schema('tutor')
        .from('session_turns')
        .insert({ session_id: sessaoId, idx: idxResposta, role: 'assistant', content: texto.trim() });
      if (error) console.error('[professor] gravar resposta', error);
    }
    const novoUso = uso
      ? {
          cache_hit: usoAcumulado.cache_hit + uso.cache_hit,
          cache_miss: usoAcumulado.cache_miss + uso.cache_miss,
          output: usoAcumulado.output + uso.output,
        }
      : usoAcumulado;
    await supabase.schema('tutor').from('sessions').update({ updated_at: agora, usage: novoUso }).eq('id', sessaoId);
  };

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await leitor.read();
        if (done) {
          await gravarResposta();
          controller.close();
          return;
        }
        resto += decoder.decode(value, { stream: true });
        const linhas = resto.split('\n');
        resto = linhas.pop() ?? '';
        for (const linha of linhas) {
          const dado = linha.trim();
          if (!dado.startsWith('data:')) continue;
          const json = dado.slice(5).trim();
          if (json === '[DONE]') continue;
          try {
            const evento = JSON.parse(json);
            if (evento.usage) {
              uso = {
                cache_hit: evento.usage.prompt_cache_hit_tokens ?? 0,
                cache_miss: evento.usage.prompt_cache_miss_tokens ?? 0,
                output: evento.usage.completion_tokens ?? 0,
              };
            }
            const pedaco = evento.choices?.[0]?.delta?.content;
            if (pedaco) {
              texto += pedaco;
              controller.enqueue(encoder.encode(pedaco));
            }
          } catch {
            // linha parcial ou keep-alive: ignora
          }
        }
      } catch (e) {
        // Aluno interrompeu ou a conexão caiu: guarda o que já foi dito.
        await gravarResposta();
        controller.error(e);
      }
    },
    async cancel() {
      void leitor.cancel().catch(() => {});
      await gravarResposta();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Sessao-Id': sessaoId,
    },
  });
}
