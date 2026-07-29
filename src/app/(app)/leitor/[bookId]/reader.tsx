'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  BookmarkPlus,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Languages,
  Sparkles,
  Square,
  Volume2,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  caretFromPoint,
  countWords,
  paragraphOf,
  snapRangeToWords,
  wordRangeAt,
} from '@/lib/leitor/words';
import { speak as speakTTS } from '@/lib/tts';
import {
  salvarSelecao,
  saveProgress,
  traduzir,
  traduzirLinhas,
  traduzirNoContexto,
  type BookLanguage,
  type ContextualTranslation,
} from '../actions';

const MAX_WORDS = 8; // limite prático de expressão (padrão LingQ — DR-3)
const HOLD_MS = 550;
const HOLD_TOLERANCE_PX = 8;

type SelectionState = {
  text: string;
  range: Range;
  doc: Document;
  index: number;
  paragraph: string;
  pos: { left: number; top: number };
};

type TranslationPanel = {
  common?: string;
  contextual?: ContextualTranslation;
  loading: 'common' | 'contextual' | null;
  error?: string;
};

export function Reader({
  bookId,
  title,
  language,
  fileUrl,
  initialCfi,
}: {
  bookId: string;
  title: string;
  language: BookLanguage;
  fileUrl: string;
  initialCfi: string | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<FoliateView | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [fraction, setFraction] = useState(0);
  const [sel, setSel] = useState<SelectionState | null>(null);
  const [panel, setPanel] = useState<TranslationPanel>({ loading: null });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const isMobile = useIsMobile();

  const speak = useCallback(
    (text: string, rate = 1) => {
      speakTTS(text, { lang: language, rate });
    },
    [language]
  );

  // Lê em voz alta TODO o texto da página (coluna) visível no momento.
  const [speakingPage, setSpeakingPage] = useState(false);
  const togglePageAudio = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (speakingPage) {
      window.speechSynthesis.cancel();
      setSpeakingPage(false);
      return;
    }
    const doc = viewRef.current?.renderer?.getContents?.()[0]?.doc;
    const win = doc?.defaultView;
    if (!doc || !win) return;
    const vw = win.innerWidth;
    const vh = win.innerHeight;

    // Coleta os text nodes cujo retângulo cai dentro do viewport da página atual.
    const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
    const parts: string[] = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent ?? '';
      if (!text.trim()) continue;
      const range = doc.createRange();
      range.selectNodeContents(node);
      const r = range.getBoundingClientRect();
      if (r.right > 0 && r.left < vw && r.bottom > 0 && r.top < vh) parts.push(text.trim());
    }
    const full = parts.join(' ').replace(/\s+/g, ' ').trim();
    if (!full) return;

    const started = speakTTS(full, {
      lang: language,
      onend: () => setSpeakingPage(false),
      onerror: () => setSpeakingPage(false),
    });
    if (started) setSpeakingPage(true);
  }, [language, speakingPage]);

  // Traduz a página: injeta a tradução (Azure) abaixo de cada parágrafo visível, dentro do iframe.
  const [pageTranslated, setPageTranslated] = useState(false);
  const [translatingPage, setTranslatingPage] = useState(false);
  const togglePageTranslation = useCallback(() => {
    if (translatingPage) return;
    const doc = viewRef.current?.renderer?.getContents?.()[0]?.doc;
    const win = doc?.defaultView;
    if (!doc || !win) return;

    if (pageTranslated) {
      doc.querySelectorAll('.ff-page-tr').forEach((el) => el.remove());
      setPageTranslated(false);
      return;
    }

    const vw = win.innerWidth;
    const vh = win.innerHeight;
    const blocks = ([...doc.querySelectorAll('p, li, blockquote, h1, h2, h3, h4, h5, h6, dd, dt')] as HTMLElement[]).filter(
      (el) => {
        if (el.querySelector('.ff-page-tr') || el.classList.contains('ff-page-tr')) return false;
        const txt = el.textContent?.trim();
        if (!txt) return false;
        const r = el.getBoundingClientRect();
        return r.right > 0 && r.left < vw && r.bottom > 0 && r.top < vh;
      }
    );
    if (!blocks.length) return;

    setTranslatingPage(true);
    traduzirLinhas(
      blocks.map((b) => (b.textContent ?? '').replace(/\s+/g, ' ').trim()),
      language
    )
      .then((trs) => {
        blocks.forEach((b, i) => {
          if (!trs[i]) return;
          const el = doc.createElement('p');
          el.className = 'ff-page-tr';
          el.setAttribute('style', 'opacity:0.6;font-style:italic;margin:0.1em 0 0.5em;');
          el.textContent = trs[i];
          b.after(el);
        });
        setPageTranslated(true);
      })
      .catch(() => {})
      .finally(() => setTranslatingPage(false));
  }, [language, pageTranslated, translatingPage]);

  // Para o áudio ao sair do leitor.
  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  /** Posiciona e abre o menu para um range dentro do iframe de um capítulo. */
  const showMenuFor = useCallback((range: Range, doc: Document, index: number) => {
    const container = containerRef.current;
    const frame = doc.defaultView?.frameElement;
    if (!container || !frame) return;

    const text = range.toString().replace(/\s+/g, ' ').trim();
    if (!text) {
      setSel(null);
      return;
    }

    const rect = range.getBoundingClientRect();
    const frameRect = frame.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const rawLeft = frameRect.left + rect.left + rect.width / 2 - containerRect.left;
    const left = Math.max(150, Math.min(rawLeft, containerRect.width - 150));
    const top = frameRect.top + rect.bottom - containerRect.top + 8;

    setSel((prev) => {
      // Nova expressão → zera painel de tradução e feedback
      if (prev?.text !== text) {
        setPanel({ loading: null });
        setFeedback(null);
      }
      return { text, range, doc, index, paragraph: paragraphOf(range), pos: { left, top } };
    });
  }, []);

  /** Cada capítulo carrega num iframe novo — instala os handlers de seleção nele. */
  const attachSelectionHandlers = useCallback(
    (doc: Document, index: number) => {
      // (a) selectionchange: único ponto que abre/fecha o menu (desktop drag, alças mobile, press-hold)
      doc.addEventListener('selectionchange', () => {
        if (selectionTimer.current) clearTimeout(selectionTimer.current);
        selectionTimer.current = setTimeout(() => {
          const docSel = doc.getSelection();
          if (!docSel || docSel.isCollapsed || docSel.rangeCount === 0) {
            setSel(null);
            return;
          }
          const snapped = snapRangeToWords(docSel.getRangeAt(0), language);
          showMenuFor(snapped, doc, index);
        }, 350);
      });

      // (b) press-and-hold: seleciona a palavra sob o ponteiro
      let start: { x: number; y: number } | null = null;
      doc.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        start = { x: e.clientX, y: e.clientY };
        if (holdTimer.current) clearTimeout(holdTimer.current);
        holdTimer.current = setTimeout(() => {
          if (!start) return;
          const caret = caretFromPoint(doc, start.x, start.y);
          if (!caret) return;
          const word = wordRangeAt(caret.node, caret.offset, language);
          if (!word) return;
          const docSel = doc.getSelection();
          docSel?.removeAllRanges();
          docSel?.addRange(word); // selectionchange abre o menu
        }, HOLD_MS);
      });
      doc.addEventListener('pointermove', (e) => {
        if (!start) return;
        const dist = Math.hypot(e.clientX - start.x, e.clientY - start.y);
        if (dist > HOLD_TOLERANCE_PX && holdTimer.current) {
          clearTimeout(holdTimer.current);
          holdTimer.current = null;
        }
      });
      const cancelHold = () => {
        start = null;
        if (holdTimer.current) {
          clearTimeout(holdTimer.current);
          holdTimer.current = null;
        }
      };
      doc.addEventListener('pointerup', cancelHold);
      doc.addEventListener('pointercancel', cancelHold);
    },
    [language, showMenuFor]
  );

  // Monta o foliate-view (client-only)
  useEffect(() => {
    let cancelled = false;
    let view: FoliateView | null = null;

    (async () => {
      await import('@vendor/foliate-js/view.js');
      const container = containerRef.current;
      if (cancelled || !container) return;

      view = document.createElement('foliate-view') as FoliateView;
      view.style.width = '100%';
      view.style.height = '100%';
      viewRef.current = view;

      view.addEventListener('relocate', (e) => {
        const { cfi, fraction: frac } = e.detail;
        setFraction(frac ?? 0);
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
          if (cfi) void saveProgress(bookId, cfi, frac ?? 0);
        }, 1200);
      });

      view.addEventListener('load', (e) => {
        attachSelectionHandlers(e.detail.doc, e.detail.index);
      });

      container.append(view);
      await view.open(fileUrl);
      if (cancelled) return;

      // Aparência do conteúdo: herda as cores do tema do app (tokens do :root)
      const rootStyle = getComputedStyle(document.documentElement);
      const fg = rootStyle.getPropertyValue('--foreground').trim() || 'CanvasText';
      view.renderer.setAttribute('flow', 'paginated');
      view.renderer.setAttribute('gap', '6%');
      view.renderer.setAttribute('margin', '40px');
      view.renderer.setStyles(`
        html { color-scheme: light dark; }
        body {
          font-family: Georgia, 'Times New Roman', serif;
          line-height: 1.65;
          color: ${fg};
          background: transparent;
          -webkit-touch-callout: none;
        }
        a { color: inherit; }
        ::selection { background: color-mix(in oklab, ${fg} 22%, transparent); }
      `);

      await view.init({ lastLocation: initialCfi ?? undefined, showTextStart: false });
    })();

    return () => {
      cancelled = true;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (selectionTimer.current) clearTimeout(selectionTimer.current);
      if (holdTimer.current) clearTimeout(holdTimer.current);
      view?.close();
      view?.remove();
      viewRef.current = null;
    };
  }, [bookId, fileUrl, initialCfi, attachSelectionHandlers]);

  // Navegação por teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') void viewRef.current?.goLeft();
      if (e.key === 'ArrowRight') void viewRef.current?.goRight();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /** Expande a seleção uma palavra pra esquerda/direita (limite MAX_WORDS). */
  const expand = (dir: 'left' | 'right') => {
    if (!sel) return;
    const docSel = sel.doc.getSelection() as
      | (Selection & { modify?: (alter: string, direction: string, granularity: string) => void })
      | null;
    if (!docSel?.modify) return;

    const current = docSel.rangeCount > 0 ? docSel.getRangeAt(0) : sel.range;
    const previous = current.cloneRange();

    if (dir === 'right') {
      docSel.setBaseAndExtent(
        current.startContainer,
        current.startOffset,
        current.endContainer,
        current.endOffset
      );
      docSel.modify('extend', 'forward', 'word');
    } else {
      docSel.setBaseAndExtent(
        current.endContainer,
        current.endOffset,
        current.startContainer,
        current.startOffset
      );
      docSel.modify('extend', 'backward', 'word');
    }

    if (docSel.rangeCount > 0) {
      const expanded = docSel.getRangeAt(0);
      if (countWords(expanded.toString(), language) > MAX_WORDS) {
        docSel.setBaseAndExtent(
          previous.startContainer,
          previous.startOffset,
          previous.endContainer,
          previous.endOffset
        );
      }
    }
    // selectionchange atualiza o menu
  };

  const handleCopy = async () => {
    if (!sel) return;
    await navigator.clipboard.writeText(sel.text);
    setFeedback('Copiado ✓');
  };

  const handleTranslate = () => {
    if (!sel || panel.loading) return;
    setPanel((p) => ({ ...p, loading: 'common', error: undefined }));
    traduzir(sel.text, language)
      .then((result) => setPanel((p) => ({ ...p, common: result, loading: null })))
      .catch((e) =>
        setPanel((p) => ({ ...p, loading: null, error: e instanceof Error ? e.message : 'Falhou.' }))
      );
  };

  const handleContextual = () => {
    if (!sel || panel.loading) return;
    setPanel((p) => ({ ...p, loading: 'contextual', error: undefined }));
    traduzirNoContexto(sel.text, sel.paragraph, language)
      .then((result) => setPanel((p) => ({ ...p, contextual: result, loading: null })))
      .catch((e) =>
        setPanel((p) => ({ ...p, loading: null, error: e instanceof Error ? e.message : 'Falhou.' }))
      );
  };

  const handleSave = () => {
    if (!sel || isSaving) return;
    const view = viewRef.current;
    let cfi: string | null = null;
    try {
      cfi = view ? view.getCFI(sel.index, sel.range) : null;
    } catch {
      cfi = null;
    }
    startSaving(async () => {
      try {
        await salvarSelecao({
          bookId,
          selectedText: sel.text,
          paragraphContext: sel.paragraph,
          locationCfi: cfi,
          language,
          translationCommon: panel.common ?? null,
          translationContextual: panel.contextual?.traducao ?? null,
          contextExplanation: panel.contextual?.explicacao ?? null,
        });
        setFeedback('Salvo no banco de palavras ✓');
      } catch {
        setFeedback('Não foi possível salvar.');
      }
    });
  };

  const closeMenu = () => {
    sel?.doc.getSelection()?.removeAllRanges();
    setSel(null);
  };

  return (
    <main className="mx-auto flex h-full w-full max-w-4xl flex-col p-4">
      <header className="flex items-center justify-between gap-3 pb-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/leitor">
            <ArrowLeft /> Biblioteca
          </Link>
        </Button>
        <span className="min-w-0 flex-1 truncate text-center text-sm font-medium">{title}</span>
        <div className="flex items-center justify-end gap-2">
          <span className="text-xs tabular-nums text-muted-foreground">
            {Math.round(fraction * 100)}%
          </span>
          <Button
            variant={speakingPage ? 'brand' : 'outline'}
            size="icon"
            className="size-8 shrink-0"
            onClick={togglePageAudio}
            aria-label={speakingPage ? 'Parar áudio' : 'Ouvir esta página'}
            title={speakingPage ? 'Parar' : 'Ouvir esta página'}
          >
            {speakingPage ? <Square /> : <Volume2 />}
          </Button>
          <Button
            variant={pageTranslated ? 'brand' : 'outline'}
            size="icon"
            className="size-8 shrink-0"
            onClick={togglePageTranslation}
            disabled={translatingPage}
            aria-label={pageTranslated ? 'Ocultar tradução' : 'Traduzir esta página'}
            title={pageTranslated ? 'Ocultar tradução' : 'Traduzir esta página'}
          >
            <Languages />
          </Button>
        </div>
      </header>

      <div ref={containerRef} className="relative min-h-0 flex-1 overflow-hidden rounded-lg border">
        {/* Virar página — alvo de toque maior e mais visível no mobile */}
        <button
          type="button"
          aria-label="Página anterior"
          onClick={() => void viewRef.current?.goLeft()}
          className="absolute top-1/2 left-1 z-10 -translate-y-1/2 rounded-full bg-accent/40 p-2.5 text-foreground/70 transition-colors hover:bg-accent hover:text-foreground md:bg-transparent md:p-1.5 md:text-muted-foreground/50"
        >
          <ChevronLeft className="size-6 md:size-5" />
        </button>
        <button
          type="button"
          aria-label="Próxima página"
          onClick={() => void viewRef.current?.goRight()}
          className="absolute top-1/2 right-1 z-10 -translate-y-1/2 rounded-full bg-accent/40 p-2.5 text-foreground/70 transition-colors hover:bg-accent hover:text-foreground md:bg-transparent md:p-1.5 md:text-muted-foreground/50"
        >
          <ChevronRight className="size-6 md:size-5" />
        </button>

        {/* Menu de contexto da seleção — flutuante no desktop, painel ancorado embaixo no mobile */}
        {sel && (
          <div
            className={cn(
              'z-30 rounded-lg border bg-popover p-2 text-popover-foreground shadow-md',
              isMobile
                ? 'fixed inset-x-3 bottom-3'
                : 'absolute w-[300px] -translate-x-1/2'
            )}
            style={isMobile ? undefined : { left: sel.pos.left, top: Math.min(sel.pos.top, 9999) }}
            onMouseDown={(e) => e.preventDefault()}
          >
            <div className="flex items-center justify-between gap-2 pb-1.5">
              <p className="min-w-0 flex-1 truncate text-sm font-medium">{sel.text}</p>
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={() => expand('left')}
                  aria-label="Expandir seleção à esquerda"
                  title="Expandir à esquerda"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={() => expand('right')}
                  aria-label="Expandir seleção à direita"
                  title="Expandir à direita"
                >
                  <ChevronRight className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  onClick={closeMenu}
                  aria-label="Fechar"
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-1">
              <Button variant="outline" size="sm" className="h-8 px-0" onClick={handleCopy} title="Copiar">
                <Copy />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-0"
                onClick={() => speak(sel.text)}
                title="Ouvir"
              >
                <Volume2 />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-0"
                onClick={handleTranslate}
                title="Traduzir"
                disabled={panel.loading === 'common'}
              >
                <Languages />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-0"
                onClick={handleContextual}
                title="Traduzir no contexto (IA)"
                disabled={panel.loading === 'contextual'}
              >
                <Sparkles />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-0"
                onClick={handleSave}
                title="Salvar no banco de palavras"
                disabled={isSaving}
              >
                <BookmarkPlus />
              </Button>
            </div>

            {(panel.loading || panel.common || panel.contextual || panel.error || feedback) && (
              <div className="mt-2 flex flex-col gap-1.5 border-t pt-2 text-sm">
                {panel.loading === 'common' && (
                  <p className="text-xs text-muted-foreground">Traduzindo...</p>
                )}
                {panel.loading === 'contextual' && (
                  <p className="text-xs text-muted-foreground">Analisando o contexto...</p>
                )}
                {panel.common && (
                  <p>
                    <span className="text-xs text-muted-foreground">Tradução: </span>
                    {panel.common}
                  </p>
                )}
                {panel.contextual && (
                  <div className="flex flex-col gap-0.5">
                    <p>
                      <span className="text-xs text-muted-foreground">No contexto: </span>
                      {panel.contextual.traducao}
                    </p>
                    {panel.contextual.explicacao && (
                      <p className="text-xs text-muted-foreground">{panel.contextual.explicacao}</p>
                    )}
                  </div>
                )}
                {panel.error && <p className="text-xs text-destructive">{panel.error}</p>}
                {feedback && (
                  <p className="flex items-center gap-1 text-xs text-success">
                    <Check className="size-3.5" /> {feedback}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
