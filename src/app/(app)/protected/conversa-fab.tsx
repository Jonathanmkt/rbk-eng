'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, RotateCcw, SendHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { EVENTO_ABRIR_PROFESSOR, type PedidoAbrirProfessor } from './abrir-professor';
import { ModoVozLive } from './modo-voz-live';
import { OndaDeAudio } from './onda-de-audio';
import { RostoProfessor, type EstadoRosto } from './rosto-professor';
import { useConversa, type Conversa } from './use-conversa';

function PainelConversa({
  conversa,
  voz,
  setVoz,
  aoMudarRosto,
}: {
  conversa: Conversa;
  voz: boolean;
  setVoz: (voz: boolean) => void;
  aoMudarRosto: (estado: EstadoRosto) => void;
}) {
  const { mensagens, pensando, erro, enviar, reiniciar } = conversa;
  const [rascunho, setRascunho] = useState('');
  const fimRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: 'end' });
  }, [mensagens, pensando]);

  const ocupado = pensando || mensagens.at(-1)?.content === '';
  const podeEnviar = rascunho.trim().length > 0 && !ocupado;

  const submeter = () => {
    if (!podeEnviar) return;
    const texto = rascunho.trim();
    setRascunho('');
    enviar(texto);
  };

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-3" aria-live="polite">
        {mensagens.map((m, i) =>
          m.role === 'assistant' && !m.content ? null : (
            <div
              key={i}
              className={cn(
                'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap',
                m.role === 'user'
                  ? 'self-end rounded-br-md bg-primary text-primary-foreground'
                  : 'self-start rounded-bl-md bg-muted text-foreground'
              )}
            >
              {m.content}
            </div>
          )
        )}

        {ocupado && (
          <div className="flex items-center gap-2 self-start rounded-2xl rounded-bl-md bg-muted px-3.5 py-2 text-muted-foreground">
            <OndaDeAudio ondulando className="h-4" />
            <span className="sr-only">O professor está escrevendo</span>
          </div>
        )}

        {erro && <p className="self-center text-center text-xs text-destructive">{erro}</p>}
        <div ref={fimRef} />
      </div>

      {voz ? (
        <ModoVozLive conversa={conversa} aoSair={() => setVoz(false)} aoMudarRosto={aoMudarRosto} />
      ) : (
        <form
          className="flex items-end gap-2 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          onSubmit={(e) => {
            e.preventDefault();
            submeter();
          }}
        >
          <Button
            type="button"
            variant="outline"
            size="icon-lg"
            onClick={() => setVoz(true)}
            aria-label="Conversar por voz"
            title="Conversar por voz"
          >
            <Mic />
          </Button>
          <Textarea
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submeter();
              }
            }}
            placeholder="Escreva em inglês ou em português…"
            aria-label="Mensagem para o professor"
            rows={1}
            className="max-h-32 min-h-10 resize-none"
          />
          <Button type="submit" size="icon-lg" disabled={!podeEnviar} aria-label="Enviar">
            <SendHorizontal />
          </Button>
        </form>
      )}

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={reiniciar}
        aria-label="Começar nova conversa"
        title="Nova conversa"
        className="absolute top-3 right-12"
      >
        <RotateCcw />
      </Button>
    </>
  );
}

/**
 * O professor: botão flutuante (canto inferior direito) que abre a conversa, por
 * texto ou por voz (botão de microfone no painel).
 *
 * O painel sobe de baixo, com a largura toda e 95% da altura da tela (decisão
 * do CEO, 30/09/2026). O rosto do professor fica no topo, sempre; no modo voz
 * ele segue o estado da voz (ouvindo, pensando, falando).
 *
 * Outras telas abrem o professor pelo evento `abrirProfessor()` (ver
 * abrir-professor.ts) — a tela de música, por exemplo, depois de criar uma aula.
 * Com `mostrarBotao={false}` o componente fica só ouvindo esse evento.
 *
 * No mobile o botão fica acima da bottom bar (que tem 4rem); no desktop, no canto.
 * As barras ondulam no hover e no foco (via `group`).
 */
export function ConversaFab({ mostrarBotao = true }: { mostrarBotao?: boolean }) {
  const conversa = useConversa();
  const iniciou = useRef(false);
  const [aberto, setAberto] = useState(false);
  const [voz, setVoz] = useState(false);
  const [rostoVoz, setRostoVoz] = useState<EstadoRosto>('parado');
  const rostoTexto: EstadoRosto = conversa.pensando ? 'pensando' : conversa.respondendo ? 'falando' : 'parado';
  const estadoRosto = voz ? rostoVoz : rostoTexto;

  // Primeira abertura: retoma a conversa guardada ou o professor abre a aula.
  const aoMudar = (abrir: boolean) => {
    setAberto(abrir);
    if (abrir && !iniciou.current) {
      iniciou.current = true;
      void conversa.retomar();
    }
  };

  // Aberto por outra tela: a aula já foi criada; recarrega a conversa e vai direto para a voz.
  const recarregarRef = useRef(conversa.recarregar);
  useEffect(() => {
    recarregarRef.current = conversa.recarregar;
  }, [conversa.recarregar]);
  useEffect(() => {
    const abrir = (e: Event) => {
      const { voz: comVoz } = (e as CustomEvent<PedidoAbrirProfessor>).detail ?? {};
      iniciou.current = true;
      setVoz(false); // desmonta uma voz anterior para religar já na aula nova
      void recarregarRef.current();
      setAberto(true);
      if (comVoz) setTimeout(() => setVoz(true), 0);
    };
    window.addEventListener(EVENTO_ABRIR_PROFESSOR, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR_PROFESSOR, abrir);
  }, []);

  return (
    <Sheet open={aberto} onOpenChange={aoMudar}>
      {mostrarBotao && (
        <SheetTrigger asChild>
          <Button
            size="icon-lg"
            aria-label="Abrir conversa com o professor"
            className="group fixed right-5 bottom-[calc(4rem+1.25rem+env(safe-area-inset-bottom))] z-40 size-14 rounded-full shadow-lg md:bottom-6 md:right-6"
          >
            <OndaDeAudio />
          </Button>
        </SheetTrigger>
      )}

      <SheetContent
        side="bottom"
        className="gap-0 rounded-t-2xl data-[side=bottom]:h-[95dvh]"
      >
        {/* Alça: indica que o painel subiu de baixo */}
        <div className="mx-auto mt-2 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/30" aria-hidden />
        <SheetHeader className="items-center gap-1 border-b pt-2 text-center">
          <RostoProfessor estado={estadoRosto} className="size-20" />
          <SheetTitle>Professor de inglês</SheetTitle>
          <SheetDescription>Converse por texto ou toque no microfone para falar.</SheetDescription>
        </SheetHeader>
        <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col pt-4">
          <PainelConversa conversa={conversa} voz={voz} setVoz={setVoz} aoMudarRosto={setRostoVoz} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
