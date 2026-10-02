# Histórico do projeto

Diário de bordo append-only. Cada entrada registra uma rodada de trabalho: o que mudou e,
principalmente, por quê — o contexto que vale a pena lembrar daqui a alguns meses. Entradas mais
recentes primeiro.

---

## 2026-10-02 — Reverte o ganho do microfone e a detecção de fala da voz ao vivo

**O quê:** Saiu o ganho automático por pedaço no microfone (`audio-live.ts`) e a `realtimeInputConfig` (sensibilidade de início/fim de fala) da ponte (`live/route.ts`). O PCM volta cru, como em 30/09. Ficam os registros de diagnóstico e o encerramento de ligação sem dono, da entrada logo abaixo.
**Por quê:** Os logs de produção do dia mostraram que o ganho levava o ruído ambiente ao nível de fala (volume travado em 0,050); o Google concluía que o aluno nunca parava de falar e o professor deixou de responder. Voltou-se à configuração que funcionava. A baixa amplitude da voz no celular, que motivou o ganho, continua sem solução. Esta entrada corrige o item 3 da entrada seguinte quanto a "detecção de fala mais sensível e ganho automático".
**Arquivos-chave:** `src/lib/professor/audio-live.ts`, `src/app/api/professor/live/route.ts`.

---

## 2026-10-02 — Aula de música com o professor, frases do cartão por DeepSeek e voz mais estável

**O quê:** (1) A tela de música ganhou o botão "Aula": `/api/professor/aula` cria uma sessão `kind = 'musica'` com a letra como material (colunas `kind` e `material` em `tutor.sessions`, migration `tutor_sessions_tipo_e_material` via MCP; tipos à mão em `database.types.ts`). A aula usa um prompt enxuto próprio (`src/lib/professor/aula-musica.ts`), conduzida em português, que substitui as instruções gerais nas rotas de voz e texto. A ferramenta `salvar_para_memorizar` roda no servidor (`memorizar.ts`): grava no banco de palavras, no baralho "Músicas" e aciona a Edge Function; o painel mostra badges do que foi salvo e abre por evento (`abrir-professor.ts`). A barra da música passou a ter voltar + Ouvir/Traduzir/Aula, sem o texto de orientação. (2) A Edge Function `enviar-cards` gera as frases com DeepSeek V4.1 Flash (raciocínio desligado), com gpt-4o-mini de reserva; já publicada (v4) com o segredo `DEEPSEEK_API_KEY` no Supabase. (3) Voz ao vivo: registros por evento na ponte, alarme de "sem resposta", encerramento de ligação sem dono após 15 s, gravação que se recupera de posição duplicada, detecção de fala mais sensível e ganho automático no microfone.
**Por quê:** A música é o conteúdo que a família mais usa; conduzir a aula sobre a letra e já mandar o que importa para memorização fecha o ciclo do curso (pilares Conversação e Memorização). O prompt próprio evita carregar as instruções gerais numa aula com foco único. DeepSeek no cartão segue a mesma escolha do modo texto (barato e rápido sem raciocínio). Os itens de voz atacam travas diagnosticadas em uso. ⚠️ **Os ajustes de voz do item 3 ainda NÃO foram testados no celular** — type-check e lint passam, mas o efeito real (sensibilidade, ganho, encerramento em 15 s) está por confirmar.
**Arquivos-chave:** `src/app/api/professor/aula/route.ts`, `src/lib/professor/{aula-musica,memorizar,audio-live}.ts`, `src/app/api/professor/live/route.ts`, `supabase/functions/enviar-cards/index.ts`.

---

## 2026-09-30 — Professor de inglês por voz (Gemini Live) e início reformulado

**O quê:** O início ganhou o card genérico "Lição atual", menu de perfil no canto superior direito e barra mobile em todas as telas. Nasceu o professor de inglês: modo texto com DeepSeek (`/api/professor`) e conversa por voz em tempo real com Gemini Live (`/api/professor/live`, uma ponte servidor que mantém a chave fora do navegador), num painel em sheet de baixo com rosto e onda de áudio. Banco: schema `tutor` (`sessions`, `session_turns`) criado por migration via MCP; o repo não versiona migrations, então os tipos entraram à mão em `database.types.ts`. Ambiente local: `.npmrc` sobe o limite de cabeçalho do Node (erro 431 por cookies de vários apps em localhost), `allowedDevOrigins` abre o app pelo celular na rede. Pesquisa (DRs do professor e do curso) e plano de melhoria do curso foram versionados em `docs/`.
**Por quê:** O CEO decidiu, depois de testar, que o professor por voz é a Gemini Live sozinha (ouvido, cérebro e boca num modelo só), sem cascata STT→LLM→TTS — menos latência e menos peças. O modo texto segue no DeepSeek com raciocínio desligado (ligado, a primeira palavra demora 2,5–4 s). Os motivos do "card genérico" e do menu de perfil não foram documentados à época; o menu e a barra mobile unificada seguem a ideia de navegação igual em todas as telas.
**Arquivos-chave:** `src/app/api/professor/`, `src/lib/professor/`, `src/app/(app)/protected/` (conversa-fab, use-conversa, modo-voz-live), `src/lib/database.types.ts`, `.claude/dev/MEMORIA.md`.

---

## 2026-07-30 — A skill de design system deixa de ser molde em branco (e volta a carregar)

**O quê:** A skill local `.claude/skills/design-system` foi reescrita por inteiro, agora descrevendo
este projeto de verdade: os 4 presets (`glass-brasao` como padrão, `navy-glass`, `brasao`,
`neutral`), o mecanismo de herança entre presets (um herda o bloco do outro e só troca a marca), a
marca do brasão (`--brand` em oklch), o vidro como propriedade do preset (e não da tela), as
variantes customizadas de `Button`/`Badge`/`Tabs`, os tokens de movimento do `src/lib/motion.ts` e
as telas-laboratório `/dev/style-guide` e `/dev/painel`. CLAUDE.md e README foram alinhados ao mesmo
conteúdo.

**Por quê:** Duas falhas somadas. (1) O arquivo era o **molde do playbook copiado e nunca
adaptado** — os 5 pontos marcados `🔧 ADAPTAR` estavam em branco, então a skill descrevia um projeto
genérico que não existe. O método já estava implementado no *código* desde antes; só não estava
escrito em lugar nenhum. (2) E ela **nem carregava**: havia uma skill global de mesmo nome publicada
pelo playbook, e no Claude Code colisão de nome resolve com `personal > project` — a global vencia a
do projeto, sem erro e sem aviso. A global foi despublicada e renomeada para `ui-foundations`
(guardando só o método universal), deixando o nome `design-system` livre para a verdade local.
Escrever isso agora tem valor porque **este é o projeto de referência de UI da casa**: medição de
30/07/2026 contando cor escrita direto na tela deu Família Figueiredo **0** (35 telas), contra 574
no Idealis Core (229 telas) e 1.086 no app-singaerj (206 telas). A hipótese registrada na skill é
que as telas-laboratório são a causa — existe um lugar para calibrar cor fora das telas, então a cor
não vaza para elas.

**Armadilha registrada:** `Button` e `Badge` daqui têm variantes que o shadcn não tem (`brand`,
`success`, `warning`, `info`) e `Tabs` tem pílula animada. Rodar `npx shadcn@latest add` nesses
componentes **sobrescreve e some com tudo isso, em silêncio** — a regra está agora na skill e no
CLAUDE.md.

**Arquivos-chave:** `.claude/skills/design-system/SKILL.md`, `CLAUDE.md`, `README.md`,
`src/lib/theme.ts`, `src/app/globals.css`, `src/lib/motion.ts`.

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
