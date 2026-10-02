import { NextResponse } from 'next/server';

import { carregarFotoDoAluno } from '@/lib/professor/contexto';
import { montarFotoDoAluno, PROFESSOR_PROMPT_FIXO } from '@/lib/professor/prompt';
import { createClient } from '@/lib/supabase/server';

/**
 * Professor por voz em tempo real — Gemini Live API (tier gratuito do Google AI Studio).
 *
 * A Gemini Live é o professor inteiro: ouve, pensa e fala, com as mesmas
 * instruções pedagógicas e a foto do aluno. Validação, 30/09/2026.
 *
 * Por que uma ponte no servidor: a chave não pode ir ao navegador, e o token
 * temporário do Google é recusado no WebSocket (testado pela casa em 08/2026,
 * erro 1008). Mesmo desenho da conversa por voz da casa
 * (assessor-de-integracoes/integracoes/google-ai-studio/voz/conversa.mjs):
 *   navegador --POST (PCM 16 kHz)--> esta rota --WebSocket--> Google
 *   navegador <--SSE (PCM 24 kHz + transcrições)-- esta rota <--WebSocket-- Google
 *
 * GET  abre um canal e devolve os eventos em SSE (o 1º traz o id do canal).
 * POST ?canal=<id> recebe um pedaço de áudio do microfone (PCM 16-bit, 16 kHz, mono).
 * O id do canal é um UUID aleatório que só o dono recebe: vale como credencial do canal.
 *
 * Sem ferramentas (function calling) de propósito: no teste de 30/09/2026 o
 * 3.1 Flash Live leu o nome da ferramenta em voz alta em vez de chamá-la. Tudo
 * o que o professor precisa saber do aluno entra nas instruções, no início.
 *
 * ⚠️ Tier gratuito: o Google pode usar o conteúdo para melhorar produtos. Só para validar.
 * ⚠️ O registro de canais vive na memória do processo: funciona com um processo só
 * (dev e o standalone da VPS), não com várias réplicas.
 */

export const dynamic = 'force-dynamic';

/** Testado em 30/09/2026 contra 3.8-live e 2.5-native-audio: o mais rápido (1º áudio ~0,8 s) e o único que seguiu o mapa PT/EN. */
const MODELO = process.env.GEMINI_LIVE_MODEL || 'gemini-3.1-flash-live-preview';
const VOZ = process.env.GEMINI_LIVE_VOICE || 'Charon';
const URL_LIVE =
  'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';
const TURNOS_DE_CONTEXTO = 30;

const MODO_VOZ_LIVE = `MODO VOZ AO VIVO: você está conversando por voz, em tempo real, com o aluno.
- Fale no máximo 2 ou 3 frases curtas e passe a vez ao aluno com uma pergunta.
- Fale devagar e com clareza quando falar inglês. Português no ritmo natural.
- Você OUVE a pronúncia do aluno. Se uma palavra em inglês sair com pronúncia que atrapalha entender, diga qual palavra, fale o jeito certo devagar e peça para ele repetir. Um som por vez, e só quando atrapalha.
- Se o aluno ficar em silêncio, espere. Não fale por cima dele.`;

type Evento =
  | { tipo: 'canal'; canal: string; sessaoId: string }
  | { tipo: 'pronto' }
  | { tipo: 'audio'; pcm: string }
  | { tipo: 'voce'; texto: string }
  | { tipo: 'ele'; texto: string }
  | { tipo: 'interrompido' }
  | { tipo: 'fimDeTurno' }
  | { tipo: 'expirando' }
  | { tipo: 'erro'; texto: string }
  | { tipo: 'fim' };

type Canal = { ws: WebSocket; userId: string; aberto: boolean };

type MensagemLive = {
  setupComplete?: unknown;
  goAway?: unknown;
  sessionResumptionUpdate?: { newHandle?: string; resumable?: boolean };
  serverContent?: {
    inputTranscription?: { text?: string };
    outputTranscription?: { text?: string };
    modelTurn?: { parts?: { inlineData?: { data?: string } }[] };
    interrupted?: boolean;
    turnComplete?: boolean;
  };
};

// Sobrevive ao recarregamento de módulo do `next dev`.
const g = globalThis as unknown as { __canaisProfessor?: Map<string, Canal> };
const canais = (g.__canaisProfessor ??= new Map<string, Canal>());

export async function GET(request: Request) {
  const chave = process.env.GOOGLE_AI_API_KEY;
  if (!chave) return NextResponse.json({ erro: 'Professor por voz não configurado.' }, { status: 503 });

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub as string | undefined;
  if (!userId) return NextResponse.json({ erro: 'Não autenticado.' }, { status: 401 });

  // A mesma conversa do chat: a aberta mais recente, ou uma nova.
  const { data: aberta } = await supabase
    .schema('tutor')
    .from('sessions')
    .select('id')
    .is('ended_at', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  let sessaoId: string;
  if (aberta) {
    sessaoId = aberta.id;
  } else {
    const { data: nova, error } = await supabase
      .schema('tutor')
      .from('sessions')
      .insert({ model: MODELO })
      .select('id')
      .single();
    if (error || !nova) return NextResponse.json({ erro: 'Não consegui abrir a conversa.' }, { status: 500 });
    sessaoId = nova.id;
  }

  const [{ data: turnosSalvos }, foto] = await Promise.all([
    supabase
      .schema('tutor')
      .from('session_turns')
      .select('idx, role, content')
      .eq('session_id', sessaoId)
      .order('idx', { ascending: false })
      .limit(TURNOS_DE_CONTEXTO),
    carregarFotoDoAluno(userId),
  ]);
  const historico = (turnosSalvos ?? []).reverse();
  let proximoIdx = historico.length ? historico[historico.length - 1].idx + 1 : 0;

  const conversaAteAgora = historico.length
    ? 'CONVERSA ATÉ AGORA (continue dela, sem repetir cumprimentos)\n' +
      historico.map((t) => `${t.role === 'user' ? 'Aluno' : 'Professor'}: ${t.content}`).join('\n')
    : '';

  const instrucoes = [PROFESSOR_PROMPT_FIXO, montarFotoDoAluno(foto), MODO_VOZ_LIVE, conversaAteAgora]
    .filter(Boolean)
    .join('\n\n');

  const canalId = crypto.randomUUID();
  const encoder = new TextEncoder();
  let fechado = false;
  let manterVivo: ReturnType<typeof setInterval> | null = null;
  let ws: WebSocket | null = null;

  // Transcrição acumulada do turno atual, para gravar no banco.
  let falaAluno = '';
  let falaProfessor = '';

  const gravar = async () => {
    const turnos: { role: 'user' | 'assistant'; content: string }[] = [];
    if (falaAluno.trim()) turnos.push({ role: 'user', content: falaAluno.trim() });
    if (falaProfessor.trim()) turnos.push({ role: 'assistant', content: falaProfessor.trim() });
    falaAluno = '';
    falaProfessor = '';
    if (!turnos.length) return;
    const linhas = turnos.map((t) => ({ session_id: sessaoId, idx: proximoIdx++, ...t }));
    const { error } = await supabase.schema('tutor').from('session_turns').insert(linhas);
    if (error) console.error('[professor-live] gravar turnos', error);
    await supabase.schema('tutor').from('sessions').update({ updated_at: new Date().toISOString() }).eq('id', sessaoId);
  };

  const fecharTudo = () => {
    fechado = true;
    if (manterVivo) clearInterval(manterVivo);
    canais.delete(canalId);
    void gravar();
    try {
      ws?.close();
    } catch {}
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const enviar = (e: Evento) => {
        if (fechado) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
        } catch {
          // cliente já foi
        }
      };
      const encerrar = () => {
        if (fechado) return;
        enviar({ tipo: 'fim' });
        fecharTudo();
        try {
          controller.close();
        } catch {}
      };

      // Cada ligação com o Google dura ~10 min; antes de cair ele manda `goAway`.
      // Com a chave de retomada (`sessionResumptionUpdate`), abrimos a ligação
      // seguinte e a conversa continua de onde estava, sem o aluno perceber.
      // Testado em 30/09/2026: a ligação retomada lembrou o que foi dito na anterior.
      let chaveDeRetomada: string | null = null;
      let retomadas = 0;
      const MAX_RETOMADAS = 20;

      const conectar = (retomando: boolean) => {
        const socket = new WebSocket(`${URL_LIVE}?key=${chave}`);
        let substituida = false;
        ws = socket;
        canais.set(canalId, { ws: socket, userId, aberto: false });

        const retomar = () => {
          if (substituida || fechado || !chaveDeRetomada || retomadas >= MAX_RETOMADAS) return false;
          substituida = true;
          retomadas++;
          const canal = canais.get(canalId);
          if (canal) canal.aberto = false;
          try {
            socket.close(1000);
          } catch {}
          conectar(true);
          return true;
        };

        socket.onopen = () => {
          socket.send(
            JSON.stringify({
              setup: {
                model: `models/${MODELO}`,
                generationConfig: {
                  responseModalities: ['AUDIO'],
                  speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOZ } } },
                },
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                // Retomada: a primeira ligação pede a chave; as seguintes usam a última recebida.
                sessionResumption: retomando && chaveDeRetomada ? { handle: chaveDeRetomada } : {},
                // Compressão do contexto: a aula pode passar do teto de uma ligação sem estourar a janela.
                contextWindowCompression: { slidingWindow: {} },
                systemInstruction: { parts: [{ text: instrucoes }] },
              },
            })
          );
        };

        socket.onmessage = async (ev) => {
          if (substituida) return;
          let j: MensagemLive;
          try {
            j = JSON.parse(typeof ev.data === 'string' ? ev.data : await (ev.data as Blob).text());
          } catch {
            return;
          }
          if (j.setupComplete !== undefined) {
            const canal = canais.get(canalId);
            if (canal) canal.aberto = true;
            if (retomando) return; // conversa continua; nada de novo cumprimento
            enviar({ tipo: 'pronto' });
            // O professor fala primeiro.
            const abertura = historico.length
              ? '(o aluno voltou, agora por voz; retome a aula de onde parou)'
              : '(o aluno abriu a conversa por voz)';
            socket.send(
              JSON.stringify({
                clientContent: { turns: [{ role: 'user', parts: [{ text: abertura }] }], turnComplete: true },
              })
            );
            return;
          }
          if (j.sessionResumptionUpdate?.resumable !== false && j.sessionResumptionUpdate?.newHandle) {
            chaveDeRetomada = j.sessionResumptionUpdate.newHandle;
          }
          const sc = j.serverContent;
          if (sc?.inputTranscription?.text) {
            falaAluno += sc.inputTranscription.text;
            enviar({ tipo: 'voce', texto: sc.inputTranscription.text });
          }
          if (sc?.outputTranscription?.text) {
            falaProfessor += sc.outputTranscription.text;
            enviar({ tipo: 'ele', texto: sc.outputTranscription.text });
          }
          for (const p of sc?.modelTurn?.parts ?? []) {
            if (p.inlineData?.data) enviar({ tipo: 'audio', pcm: p.inlineData.data });
          }
          if (sc?.interrupted) enviar({ tipo: 'interrompido' });
          if (sc?.turnComplete) {
            enviar({ tipo: 'fimDeTurno' });
            void gravar();
          }
          if (j.goAway && !retomar()) enviar({ tipo: 'expirando' });
        };

        socket.onerror = () => {
          if (!substituida) console.error('[professor-live] erro no websocket');
        };
        socket.onclose = (ev) => {
          if (substituida || fechado) return;
          // Queda inesperada: tenta retomar antes de desistir.
          if (ev.code !== 1000) {
            console.error('[professor-live] websocket fechado', ev.code, String(ev.reason).slice(0, 200));
            if (retomar()) return;
            enviar({ tipo: 'erro', texto: 'A ligação com o professor caiu.' });
          }
          encerrar();
        };
      };

      enviar({ tipo: 'canal', canal: canalId, sessaoId });
      manterVivo = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': vivo\n\n'));
        } catch {}
      }, 15_000);
      conectar(false);

      request.signal.addEventListener('abort', encerrar);
    },
    cancel() {
      fecharTudo();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

/** Um pedaço do microfone: PCM 16-bit little-endian, 16 kHz, mono (~200 ms). */
export async function POST(request: Request) {
  const canalId = new URL(request.url).searchParams.get('canal') ?? '';
  const canal = canais.get(canalId);
  if (!canal) return NextResponse.json({ erro: 'Canal encerrado.' }, { status: 410 });
  if (!canal.aberto || canal.ws.readyState !== WebSocket.OPEN) return new Response(null, { status: 204 });

  const audio = Buffer.from(await request.arrayBuffer());
  if (!audio.length || audio.length > 256 * 1024) {
    return NextResponse.json({ erro: 'Áudio inválido.' }, { status: 400 });
  }

  canal.ws.send(
    JSON.stringify({ realtimeInput: { audio: { mimeType: 'audio/pcm;rate=16000', data: audio.toString('base64') } } })
  );
  return new Response(null, { status: 204 });
}
