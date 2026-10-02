# Família Figueiredo

App da Família Figueiredo para **aprendizado de inglês**. Stack inspirada no **Idealis Core**: Next.js (App Router) + TypeScript + Tailwind + Supabase.

## Funcionalidades

- **Leitor** — biblioteca de e-books (upload de PDF ou EPUB, conversão PDF→EPUB feita no próprio navegador). Leitura paginada com seleção de palavras/trechos, áudio da página em voz alta e tradução sob demanda.
- **Música** — busca uma música e vai direto para a letra, com áudio (TTS) e tradução linha a linha.
- **Banco de palavras** — palavras e trechos salvos durante a leitura ou nas letras de música, para revisar depois.
- **Anki** — baralhos de flashcards com repetição espaçada (algoritmo FSRS), no estilo do Anki tradicional.

Todo o conteúdo do app (textos, áudio) é em inglês — não há troca de idioma nas telas (exceto os baralhos do Anki, que podem ser configurados em pt-BR ou en-US).

## Stack

- **Next.js 15** (App Router) + **React 19**
- **TypeScript** (strict) — alias `@/*` aponta para `src/*`
- **Tailwind CSS 4** (CSS-first: `@import 'tailwindcss'` + `@theme`, sem `tailwind.config`)
- **Supabase** (`@supabase/ssr`) — clientes em `src/lib/supabase/`

## Aparência

A identidade visual é montada em **tokens** (nada de cor escrita direto na tela) e organizada em
**presets** de tema — o padrão é o *Glass Brasão* (vidro navy com o vermelho do brasão), e há
ainda *Navy Glass*, *Brasão* e *Neutro*. Trocar de preset muda o app inteiro de uma vez.

Para ver e calibrar tudo junto, com o seletor de tema à mão, rode o projeto e abra
`/dev/style-guide` (componentes) e `/dev/painel` (tema aplicado num painel real).

## Começando

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Comandos

```bash
npm run dev         # servidor de desenvolvimento
npm run build       # build de produção
npm run start       # roda o build
npm run lint        # eslint
npm run type-check  # tsc --noEmit
```

## Variáveis de ambiente

Crie um `.env.local` na raiz com:

| Chave | Descrição |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave pública (publishable) |
| `SUPABASE_SECRET_KEY` | Chave secreta — **somente server, nunca no client** |
| `SUPABASE_JWKS_URL` | URL do JWKS do projeto Supabase (validação de sessão) |
| `AZURE_TRANSLATOR_KEY` / `AZURE_TRANSLATOR_REGION` | Tradução (Azure Translator) usada no leitor e na música |
| `OPENAI_API_KEY` | Explicações contextuais de tradução |
| `DEEPSEEK_API_KEY` | Professor de inglês no modo texto — **somente server** |
| `GOOGLE_AI_API_KEY` | Professor por voz em tempo real (Gemini Live) — **somente server**. `GEMINI_LIVE_MODEL` e `GEMINI_LIVE_VOICE` são opcionais |

> `.env*` está no `.gitignore`. Nunca commite segredos.
>
> A busca de letras (Deezer + LRCLIB) não usa chave — Deezer é chamado por um proxy no
> servidor (sem CORS) e o LRCLIB é chamado direto do navegador.
