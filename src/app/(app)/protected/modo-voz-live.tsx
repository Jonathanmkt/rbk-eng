'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Keyboard, Mic, MicOff, RotateCcw } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AltoFalante, Microfone, microfonePermitido } from '@/lib/professor/audio-live';
import { cn } from '@/lib/utils';
import { OndaDeAudio } from './onda-de-audio';
import type { EstadoRosto } from './rosto-professor';
import type { Conversa } from './use-conversa';

type Estado = 'ligando' | 'ouvindo' | 'falando' | 'encerrado' | 'erro';

/** Volume a partir do qual consideramos que o aluno está falando (só para o rosto). */
const LIMIAR_FALA = 0.02;

/**
 * Conversa por voz em tempo real com o professor (Gemini Live, via /api/professor/live).
 *
 * É conversa de verdade: o microfone fica aberto o tempo todo e o aluno pode
 * falar por cima do professor — o Google avisa e a voz dele para na hora.
 * As falas dos dois aparecem transcritas no chat e ficam guardadas na mesma
 * conversa do modo texto.
 */
export function ModoVozLive({
  conversa,
  aoSair,
  aoMudarRosto,
}: {
  conversa: Conversa;
  aoSair: () => void;
  aoMudarRosto?: (estado: EstadoRosto) => void;
}) {
  const [estado, setEstado] = useState<Estado>('ligando');
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [nivel, setNivel] = useState(0);
  const [mudo, setMudo] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  /** Expressões que o professor guardou no banco e na revisão nesta conversa. */
  const [salvos, setSalvos] = useState<string[]>([]);

  const mudoRef = useRef(false);
  const acrescentarRef = useRef(conversa.acrescentarAoVivo);
  const recarregarRef = useRef(conversa.recarregar);
  useEffect(() => {
    acrescentarRef.current = conversa.acrescentarAoVivo;
    recarregarRef.current = conversa.recarregar;
  }, [conversa.acrescentarAoVivo, conversa.recarregar]);
  useEffect(() => {
    mudoRef.current = mudo;
  }, [mudo]);

  // Rosto: falando quando a voz dele toca; ouvindo quando o aluno fala; senão parado.
  useEffect(() => {
    if (!aoMudarRosto) return;
    if (estado === 'falando') aoMudarRosto('falando');
    else if (estado === 'ouvindo' && nivel > LIMIAR_FALA && !mudo) aoMudarRosto('ouvindo');
    else if (estado === 'ligando') aoMudarRosto('pensando');
    else aoMudarRosto('parado');
  }, [estado, nivel, mudo, aoMudarRosto]);

  const conectar = useCallback(() => {
    const permitido = microfonePermitido();
    if (!permitido.ok) {
      setMensagem(permitido.motivo);
      setEstado('erro');
      return () => {};
    }

    const abort = new AbortController();
    const microfone = new Microfone();
    const falante = new AltoFalante((tocando) => setEstado((e) => (e === 'encerrado' || e === 'erro' ? e : tocando ? 'falando' : 'ouvindo')));
    falante.preparar();
    let canal: string | null = null;
    let emVoo = 0;

    const enviarPedaco = (pcm: ArrayBuffer, n: number) => {
      setNivel(n);
      if (!canal || emVoo > 4) return; // rede lenta: descarta em vez de acumular atraso
      // Silenciado: manda silêncio em vez de nada, para o servidor saber que a aula segue aberta.
      if (mudoRef.current) pcm = new ArrayBuffer(pcm.byteLength);
      emVoo++;
      void fetch(`/api/professor/live?canal=${canal}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: pcm,
        signal: abort.signal,
      })
        .catch(() => {})
        .finally(() => {
          emVoo--;
        });
    };

    const tratar = (e: { tipo: string; canal?: string; texto?: string; pcm?: string }) => {
      switch (e.tipo) {
        case 'canal':
          canal = e.canal ?? null;
          break;
        case 'pronto':
          setEstado('ouvindo');
          setMensagem(null);
          microfone.iniciar(enviarPedaco).catch(() => {
            setMensagem('Não consegui usar o microfone. Confira a permissão do navegador.');
            setEstado('erro');
          });
          break;
        case 'audio':
          if (e.pcm) falante.tocar(e.pcm);
          break;
        case 'interrompido':
          falante.parar();
          break;
        case 'voce':
          if (e.texto) acrescentarRef.current('user', e.texto);
          break;
        case 'ele':
          if (e.texto) acrescentarRef.current('assistant', e.texto);
          break;
        case 'salvo':
          if (e.texto) setSalvos((atuais) => (atuais.includes(e.texto!) ? atuais : [...atuais, e.texto!]));
          break;
        case 'expirando':
          setMensagem('A sessão de voz vai terminar em instantes.');
          break;
        case 'erro':
          setMensagem(e.texto ?? 'Algo falhou na ligação.');
          break;
        case 'fim':
          setEstado((atual) => (atual === 'erro' ? atual : 'encerrado'));
          break;
      }
    };

    void (async () => {
      try {
        const resp = await fetch('/api/professor/live', { signal: abort.signal });
        if (!resp.ok || !resp.body) {
          const dados = await resp.json().catch(() => null);
          throw new Error(dados?.erro ?? 'Não consegui ligar para o professor.');
        }
        const leitor = resp.body.getReader();
        const decoder = new TextDecoder();
        let resto = '';
        for (;;) {
          const { done, value } = await leitor.read();
          if (done) break;
          resto += decoder.decode(value, { stream: true });
          const blocos = resto.split('\n\n');
          resto = blocos.pop() ?? '';
          for (const bloco of blocos) {
            const linha = bloco.split('\n').find((l) => l.startsWith('data:'));
            if (!linha) continue;
            try {
              tratar(JSON.parse(linha.slice(5)));
            } catch {}
          }
        }
        setEstado((atual) => (atual === 'erro' ? atual : 'encerrado'));
      } catch (err) {
        if (abort.signal.aborted) return;
        setMensagem(err instanceof Error ? err.message : 'Não consegui ligar para o professor.');
        setEstado('erro');
      } finally {
        microfone.parar();
        falante.fechar();
      }
    })();

    return () => {
      abort.abort();
      microfone.parar();
      falante.fechar();
    };
  }, []);

  // Liga ao entrar (e a cada "continuar"); desliga ao sair.
  useEffect(() => {
    setEstado('ligando');
    const desligar = conectar();
    return () => {
      desligar();
      void recarregarRef.current();
    };
  }, [conectar, tentativa]);

  const rotulo =
    estado === 'ligando'
      ? 'Ligando para o professor…'
      : estado === 'falando'
        ? 'O professor está falando. Pode interromper falando.'
        : estado === 'ouvindo'
          ? mudo
            ? 'Microfone desligado'
            : 'Pode falar'
          : estado === 'encerrado'
            ? 'A conversa por voz terminou.'
            : '';

  return (
    <div className="flex flex-col items-center gap-3 border-t p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div
        className={cn(
          'flex size-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform',
          (estado === 'erro' || estado === 'encerrado' || mudo) && 'bg-muted text-muted-foreground'
        )}
        style={{ transform: `scale(${1 + (estado === 'ouvindo' && !mudo ? Math.min(nivel * 4, 0.3) : 0)})` }}
        aria-hidden
      >
        <OndaDeAudio ondulando={estado === 'falando' || estado === 'ligando'} className="h-8" />
      </div>

      <p className="min-h-5 text-center text-sm text-muted-foreground" aria-live="polite">
        {mensagem ?? rotulo}
      </p>

      {salvos.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-1.5" aria-live="polite">
          <span className="text-xs text-muted-foreground">Guardado para revisar:</span>
          {salvos.map((s) => (
            <Badge key={s} variant="success">
              <Check />
              {s}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2">
        {estado === 'encerrado' || estado === 'erro' ? (
          <Button size="sm" onClick={() => setTentativa((t) => t + 1)}>
            <RotateCcw />
            Continuar por voz
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMudo((m) => !m)}
            aria-pressed={mudo}
            disabled={estado === 'ligando'}
          >
            {mudo ? <MicOff /> : <Mic />}
            {mudo ? 'Ligar microfone' : 'Silenciar'}
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={aoSair}>
          <Keyboard />
          Voltar ao teclado
        </Button>
      </div>
    </div>
  );
}
