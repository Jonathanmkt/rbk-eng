# CLAUDE.md

Guia para o Claude Code (claude.ai/code) neste repositório.

## O que é

App da **Família Figueiredo** para **aprendizado de inglês**. Stack inspirada no Idealis Core: Next.js (App Router) + Supabase + TypeScript. Código, comentários e docs em **pt-BR**; responda em português. O conteúdo do app (leitura, música, áudio) é sempre em **inglês (en-US)** — não há seleção de idioma nas telas.

### Módulos (`src/app/(app)/`)

- **`leitor/`** — biblioteca de e-books. Upload de PDF/EPUB, leitura paginada, seleção de texto → banco de palavras, botão de áudio da página (TTS) e botão de tradução da página (injeta tradução Azure abaixo de cada parágrafo).
- **`musica/`** — busca letra de música com **dupla fonte**: descoberta/type-ahead no **Deezer** (proxy no servidor, sem CORS) e letra no **LRCLIB** (direto do navegador, CORS aberto). Ver `docs/drs/lyricsdoublesource.md`. Também tem TTS da letra e tradução linha a linha.
- **`palavras/`** — banco de palavras salvas (do leitor e da música), com botão de ouvir cada palavra.
- **`anki/`** — clone conceitual do Anki: baralhos, cartões e estudo com algoritmo FSRS (`src/lib/anki/fsrs.ts`). Cada baralho tem seu próprio `audioLanguage` (`pt-BR` ou `en-US`) — é o único módulo que não é fixo em inglês.

## Áudio (TTS) e tradução

- **TTS**: sempre via helper `src/lib/tts.ts` (`speak()` / `pickVoice()`). Nunca monte `SpeechSynthesisUtterance` direto na tela — `utterance.lang` sozinho é só uma dica; sem forçar a `voice`, o navegador pode ler texto em inglês com voz pt-BR do sistema. `speak()` já resolve isso. Leitor/música/palavras chamam sempre com `en-US`; anki usa o `audioLanguage` do baralho.
- **Tradução**: Azure Translator via server actions em `src/app/(app)/leitor/actions.ts` (`traduzir`, `traduzirNoContexto`, `traduzirLinhas`). Requer `AZURE_TRANSLATOR_KEY` + `AZURE_TRANSLATOR_REGION`.

## Comandos

```bash
npm run dev         # servidor de desenvolvimento (porta 3000)
npm run build       # build de produção
npm run lint        # eslint
npm run type-check  # tsc --noEmit — rode após qualquer mudança
```

Ainda não há suíte de testes automatizados; validação = `type-check` + `lint` + verificação manual.

## Convenções

- **Alias de import**: `@/*` → `src/*` (definido no `tsconfig.json`).
- **Tailwind 4** (CSS-first). Config mora no `src/app/globals.css` via `@import 'tailwindcss'` + `@theme` — **não** existe `tailwind.config.*`. PostCSS usa `@tailwindcss/postcss`. Utilitários renomeados no v4 (ex.: `shadow-sm`→`shadow-xs`, `outline-none`→`outline-hidden`, `ring` = 1px); não misturar sintaxe v3.
- **Design system**: schema de tokens + **4 presets** trocáveis por `data-theme` (`glass-brasao` é o padrão, `navy-glass`, `brasao`, `neutral`) — lista em `src/lib/theme.ts`, valores em `src/app/globals.css`. Movimento em `src/lib/motion.ts`. Laboratório em `/dev/style-guide` e `/dev/painel` — calibre lá, não tela a tela. Regra de ouro: cor no token, nunca na tela. **Antes de mexer em qualquer aparência, leia a skill local `.claude/skills/design-system`.**
- ⚠️ **Nunca rode `npx shadcn@latest add` para `button`/`badge`/`tabs`**: eles têm variantes próprias (`brand` no Button; `brand`/`success`/`warning`/`info` no Badge; pílula animada nas Tabs) que o comando sobrescreve **em silêncio**.
- **Supabase**: cliente de browser em `src/lib/supabase/client.ts`; cliente de servidor em `src/lib/supabase/server.ts`. Chaves: `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (públicas) e `SUPABASE_SECRET_KEY` (**só server**, nunca no client).
- **PDF→EPUB no cliente**: `src/lib/leitor/pdf-to-epub.ts` converte PDF→EPUB 100% no navegador (`pdfjs-dist` extrai texto + `fflate` monta o EPUB), sem servidor nem binário externo. Não há mais Calibre/poppler — o `Dockerfile` é Alpine puro.
- **Segredos**: `.env*` está no `.gitignore`. Nunca commitar chaves.

## Estrutura

```
src/
  app/
    (app)/        # área logada: leitor/, musica/, palavras/, anki/
    auth/         # telas de autenticação (Supabase)
    dev/          # /dev/style-guide e /dev/painel — laboratório visual, fora de produção
  lib/
    supabase/     # clientes Supabase (browser + server)
    anki/         # FSRS + rich text dos cartões
    leitor/       # palavras/seleção de texto + conversão PDF→EPUB
    tts.ts        # helper único de TTS (ver seção "Áudio e tradução")
```

> Base enxuta por escolha: adicionar libs por demanda, conforme o app crescer.
