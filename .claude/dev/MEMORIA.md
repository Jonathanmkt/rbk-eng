# A casa do dev — RBK Eng (treino de inglês)

> Sua memória **deste** repositório. Leia antes de tocar em qualquer arquivo.
>
> Ela não substitui o `CLAUDE.md` do projeto (que diz o que o projeto é) nem as skills dele
> (que dizem como fazer cada coisa). Ela guarda **o que você aprendeu aqui e ninguém escreveu**.

**Por que este projeto existe, e o que o dono dele quer:** `playbook/empresa/projetos/rbk-eng-treino-de-ingles.md`, na mesa do CEO. Leia
quando a tarefa envolver decisão de produto — é lá que está o porquê, e é o que impede você de
implementar fielmente a coisa errada.

⚠️ **A memória é pista; o código é a verdade.** Divergiu, o código vence — e corrigir esta ficha
faz parte da mesma tarefa.

<!-- FATOS-VERIFICADOS:INICIO -->

> Levantado por `playbook/harness/ferramentas/casa-do-dev.py` em 01/08/2026.
> **Não edite este bloco** — ele é sobrescrito. O que você aprender vai abaixo do fim.

- **Repositório:** `C:\Projetos\APPS\rbk-eng`
- **Stack:** Next.js 15, React 19, TypeScript 5, Tailwind 4, Supabase 2
- **Antes de dizer que terminou, rode:** `npm run build` · `npm run lint` · `npm run type-check`
- **Pastas de topo:** deploy, docs, public, src, supabase, vendor
- **Skills deste projeto:** design-system
- **Git:** 30 commits · último: 2026-07-31 Aponta a skill de UI para a global renomeada e corrige a contagem de tokens

<!-- FATOS-VERIFICADOS:FIM -->

## O que eu aprendi neste código

> Só entra o que **o código não mostra de graça** e que custou tempo descobrir: a armadilha que
> quebra em produção, o vício recorrente daqui, a decisão de forma já tomada e que não se
> rediscute, o caminho que parece certo e não é.
>
> Não entra o que o `casa-do-dev.py` já levanta acima, nem o que o `CLAUDE.md` do projeto já diz.
>
### Professor de inglês (30/09/2026)

- **Voz é a Gemini Live, sozinha** (ouvido, cérebro e boca) — decisão do CEO depois de testar. Não volte a montar cascata STT→LLM→TTS. Por quê e números: `docs/drs/professor-ia/arquitetura-voz-tempo-real.md`.
- **A chave do Google não pode ir ao navegador**: a rota `/api/professor/live` é ponte (POST de PCM 16 kHz sobe, SSE com PCM 24 kHz desce). O registro de canais vive na memória do processo — **não escala para várias réplicas** sem mudar isso.
- **Cada ligação da Live API cai em ~10 min** (`goAway`, fecha com 1008 se o cliente não reage). A ponte retoma com `sessionResumption`; sem isso a aula "cai do nada".
- **A Live API cobra o contexto inteiro a cada turno**, inclusive o áudio antigo, e não tem cache. Custo de aula vem da janela de contexto, não do minuto falado.
- **Function calling no `gemini-3.1-flash-live-preview` é instável**: num teste leu o nome da ferramenta em voz alta; noutro chamou certo quando pedido explicitamente. Dados do aluno entram nas instruções do início.
- **Modo texto ainda é DeepSeek** (`/api/professor`), com raciocínio DESLIGADO (`thinking: {type:'disabled'}`): ligado, a 1ª palavra demora 2,5–4 s.
- **Microfone exige contexto seguro**: no celular, só funciona por `localhost` — use `adb reverse tcp:3000 tcp:3000`. Pelo IP da rede o navegador bloqueia.

### Ambiente local

- **Erro 431 no localhost** = cookies de vários apps da casa somados no mesmo host. O `.npmrc` sobe o limite de cabeçalho do Node (`--max-http-header-size`).
- **`src/lib/database.types.ts` tem blocos escritos à mão** (`anki`, `leitor`, `tutor`): o gerador do MCP só devolve o `public`. Schema novo = bloco novo à mão, espelhando a migration.
- **Schema novo precisa ser exposto na Data API**: `alter role authenticator set pgrst.db_schemas = '...'` + `notify pgrst, 'reload config'` (foi assim com `tutor`).
