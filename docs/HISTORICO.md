# Histórico do projeto

Diário de bordo append-only. Cada entrada registra uma rodada de trabalho: o que mudou e,
principalmente, por quê — o contexto que vale a pena lembrar daqui a alguns meses. Entradas mais
recentes primeiro.

---

## 2026-07-16 — Foco total em inglês: música com dupla fonte, áudio/tradução no leitor, PDF→EPUB no cliente, TTS centralizado

**O quê:** Rodada grande que fechou vários fios soltos do app. (1) O app passou a ser só de
inglês: removidas as escolhas de idioma no upload de livro e no áudio do leitor/música/palavras —
tudo fixo em `en-US` (só o Anki manteve idioma por baralho). (2) Módulo de música ganhou
arquitetura de **dupla fonte**: descoberta/type-ahead das músicas no Deezer (proxy no servidor,
porque a API não tem CORS) e a letra em si buscada no LRCLIB direto do navegador (CORS aberto);
troca uma tentativa anterior de catálogo local no Supabase (tabela `songs` + RPC `search_songs`,
introduzida e depois abandonada na mesma rodada) por uma solução sem estado próprio. Tela de
loading dedicada (`LyricsLoading`, equalizador animado) cobre o tempo de busca da letra. (3) Leitor
ganhou botão de ouvir a página inteira e botão de traduzir a página (injeta tradução Azure abaixo
de cada parágrafo visível). (4) Conversão de PDF para EPUB passou a rodar 100% no navegador
(`pdfjs-dist` + `fflate`), eliminando a dependência de Calibre/poppler no servidor — o `Dockerfile`
voltou a ser Alpine puro, sem binários extras. (5) Todos os pontos de TTS (leitor, música,
palavras, anki) foram unificados no helper `src/lib/tts.ts`, que força uma voz que casa com o
idioma pedido (antes, texto em inglês podia sair com voz pt-BR do sistema, porque só setar
`utterance.lang` não é garantia).

**Por quê:** Selecionar idioma em cada tela era complexidade desnecessária para um app cujo
propósito é praticar inglês — cortar essa escolha simplificou UX e código. A primeira tentativa de
catálogo de músicas no Supabase (RPC `search_songs`) foi abandonada no mesmo dia porque manter um
catálogo próprio sincronizado exigia scraping/curadoria contínua; a dupla fonte (Deezer para
metadados, LRCLIB para letra) elimina esse estado e usa cada API para o que ela faz bem, sem
servidor no meio da letra (LRCLIB tem bot-protection sensível a IP único de VPS — buscar direto do
navegador do usuário evita bloqueio). O Calibre no Dockerfile inchava a imagem e era complexidade
de infra por uma conversão que dá pra fazer inteiramente no cliente. O TTS centralizado nasceu de
um bug real: vozes de sistema em pt-BR "engolindo" o sotaque de textos em inglês quando só o `lang`
do utterance era setado.

**Arquivos-chave:** `src/lib/tts.ts` (novo), `src/app/(app)/musica/actions.ts`,
`src/app/(app)/musica/lyrics.ts` (novo), `src/app/(app)/musica/music-client.tsx`,
`src/app/(app)/leitor/[bookId]/reader.tsx`, `src/lib/leitor/pdf-to-epub.ts` (novo), `Dockerfile`,
`docs/drs/lyricsdoublesource.md`, `docs/drs/pdftoedpublight.md`.

**Nota de sincronização:** esta entrada foi escrita em 2026-07-28, reconstruindo o trabalho a
partir do git (commits `945b4fc`, `2a69bd6`, `ff3f954`, `086eb0c`, todos de 2026-07-16, mais um
refactor de TTS ainda não commitado feito minutos depois do último commit do dia) — a
documentação ficou defasada por ~12 dias antes desta sincronização.
