---
titulo: O "cérebro" de um agente professor de inglês com DeepSeek V4.1 Flash — framework (ou não), contexto, cache de prefixo, skills, memória, evals e custo
data: 2026-09-30
departamento: tecnologia
encomendado-por: CEO (via dev do app Família Figueiredo / rbk-eng)
decisao-alvo: Escolher o framework (ou a ausência dele) e o desenho de como o agente professor recebe o contexto do aluno, consulta dados e guarda memória entre aulas, com DeepSeek V4.1 Flash e conversa por voz em tempo real
tags: [agente-de-ia, deepseek, orquestracao, function-calling, cache-de-prefixo, agent-skills, memoria-de-agente, livekit, pipecat, langgraph, evals]
validade: curta
status: parcial
---

# O "cérebro" de um agente professor de inglês com DeepSeek V4.1 Flash

> ⚠️ **Validade curta.** Tudo aqui foi conferido em **30/09/2026**. Este DR **complementa** os de
> [03/08/2026 (V4-Flash-0731)](2026-08-03-deepseek-v4-flash-0731.md) e
> [28/09/2026 (visão, V4.1-Flash)](2026-09-28-deepseek-visao-conferencia-fotos-lavagem.md) — não refaz
> preço histórico, privacidade nem visão. O modelo `deepseek-flash` (V4.1-Flash) tem 20 dias de
> vida; versão de biblioteca, preço e comportamento de cache abaixo têm data e podem mudar em semanas.
> **Fora do escopo, por pedido:** STT/TTS, transporte de áudio, pronúncia e a pedagogia em si.

## O essencial em 5 linhas

1. **Não use LangGraph (nem outro framework de agente) no laço de conversa por voz.** O próprio
   framework de voz — **LiveKit Agents** ou **Pipecat** — já é o orquestrador: dono do laço,
   da interrupção, do ciclo de vida das tools. Os dois têm **suporte de primeira classe ao
   DeepSeek**. O caminho é *loop próprio = o laço do framework de voz + funções Python simples +
   Postgres*. LangGraph não está "errado" — está na **camada errada**: o adaptador do LiveKit exige
   grafo com `messages` e a própria LiveKit alerta que fluxos LangChain "não foram pensados para voz"
   e geram "segundos de silêncio".
2. **Modo sem raciocínio (`thinking: disabled`) no laço falado, e raciocínio ligado só nos jobs
   offline** (resumo de sessão, extração de memória, geração de plano). O V4.1 **pensa por padrão**
   (atrasa o primeiro token falado), rejeita `tool_choice` forçado enquanto pensa, e exige devolver
   o `reasoning_content` **em todo request com `tools`** (senão 400) — bug que **vários frameworks
   ainda têm em aberto** (langchain #40219, 05/09/2026; langchainjs #10883). Desligar o pensamento
   elimina essa classe inteira. ⚠️ **Armadilha nova:** o `with_deepseek()` do LiveKit tem
   `model="deepseek-chat"` como padrão (alias que a DeepSeek avisou descontinuar em 24/07/2026) e
   não expõe `thinking` — passe `model="deepseek-flash"` e `extra_body` explícitos.
3. **Contexto em camadas, na ordem do cache:** (a) prefixo global imutável (persona, regras de fala,
   catálogo de skills, schemas das tools) → (b) **foto do aluno congelada no início da sessão**
   (nível, plano, aula atual, top-N memórias, resumo do Anki de hoje) → (c) mensagens só
   **acrescentadas** (nunca editar o que já foi). Mudança no meio da aula entra como **mensagem de
   sistema nova no fim** (a Chat Completions aceita). Cada tool no caminho crítico custa **outro
   round-trip de LLM (~1 s de TTFT medido por terceiro)** — então leia o que puder *antes* da aula e
   deixe só o imprevisível como tool; tools de escrita devolvem nada (sem 2ª chamada).
4. **Skills = padrão de harness, não recurso de modelo.** O formato é aberto (`SKILL.md`, agentskills.io)
   e roda com qualquer modelo que faça function calling: catálogo no prompt (~100 tokens/skill) +
   `activate_skill(name∈enum)`. Em voz, prefira **ativação pelo app** (o passo do plano diz qual
   skill) a ativação pelo modelo, que custa um round-trip. Sem scripts: só instruções.
5. **Memória: tabela própria no Postgres + um job de fim de sessão; sem mem0/Letta.** Os dados do
   aluno (erros, palavras, cartões) já são estruturados no Postgres; o que falta são ~5 tabelas
   pequenas. Letta **aposentou** o servidor que se usaria (repo virou harness de coding agent); mem0
   exige LLM + embedder extras (a DeepSeek não lista API de embeddings) e seus benchmarks são
   autodeclarados. **Custo:** ~**US$ 0,014/hora** com cache funcionando (fora de pico) até
   ~**US$ 0,56/hora** se o cache nunca acertar (pico) — sensível a **acertar o prefixo**, não a
   escolher framework. Dado do aluno vai para a API da DeepSeek: ver lacuna de privacidade.

---

## 0. O que a casa já sabia e o que mudou (data: 30/09/2026)

- Modelo: `deepseek-flash` = DeepSeek-V4.1-Flash (lançado 10/09/2026; contexto 1M; saída máx. 384K;
  suporta tools, JSON, pensar/não pensar). `deepseek-v4-flash` está "temporariamente roteado" para ele;
  `deepseek-chat`/`deepseek-reasoner` tinham descontinuação anunciada para 2026-07-24 [1][2][3].
- **Preço atual** (página oficial, 30/09/2026) [1]: por 1M tokens —

| | Fora de pico | Pico |
|---|---|---|
| Entrada, cache hit | US$ 0,003 | US$ 0,006 |
| Entrada, cache miss | US$ 0,15 | US$ 0,30 |
| Saída | US$ 0,60 | US$ 1,20 |

  Pico = **01–04 e 06–10 UTC, seg–sex**, exceto feriados chineses [1]. Em Brasília (UTC−3) isso é
  **22h–01h e 03h–07h, seg–sex**: aula à tarde/noite de família cai **fora de pico**, exceto 22h–01h
  nos dias úteis. (Conversão de fuso feita por mim, não da fonte.) Este preço é **diferente** do
  ($0,14/$0,28) do DR de 03/08 — o modelo e a tabela mudaram.
- Concorrência: limite de 2.500 [1] — irrelevante para família.

## 1. Precisa de framework? Comparação

**Critério de leitura:** o professor é **um agente só**, com **poucas tools** (≈8), **0–2 rodadas de
tool por turno**, turno falado de poucos segundos, e o laço de áudio (VAD, interrupção) já pertence ao
framework de voz. Quase tudo que os frameworks de agente vendem (multiagente, grafos duráveis, HITL
demorado, handoffs) **não é o problema**.

| Opção | DeepSeek via OpenAI-compatível | Streaming p/ voz | Complexidade p/ este caso | Maturidade (30/09/2026) | Licença |
|---|---|---|---|---|---|
| **Sem framework** (laço do LiveKit/Pipecat + funções) | Nativo: Pipecat tem `DeepSeekLLMService` (padrão `deepseek-flash`, `thinking` desligado de fábrica, adaptador que trata `reasoning_content`) [7][8]; LiveKit via `openai.LLM` com base_url DeepSeek [9][10] | Sim, é o streaming do próprio framework | **Mínima** | LiveKit Agents 1.8.3, 14,4 mil★, push 30/09; Pipecat 1.12.0, 16,1 mil★, push 30/09 [22][23] | Apache-2.0 / BSD-2 |
| **LangGraph Python** | Via `langchain-deepseek`; **bug de `reasoning_content` aberto** (langchain #40219, 05/09/2026) [25] | Sim (`messages`), via `LLMAdapter` no LiveKit [14] | Alta: grafo + estado + adaptador; LiveKit exige `messages` no estado e filtro manual de saída de tool [15] | 1.2.12, 42,5 mil★, MIT [22][23] | MIT |
| **LangGraph JS** | `@langchain/deepseek` 1.1.15; **langchainjs #10883 aberto desde 12/05/2026** [25] | Sim | Alta; no LiveKit JS/Node não há plugin equivalente confirmado | `@langchain/langgraph` 1.4.18, 3,3 mil★ [22][23] | MIT |
| **OpenAI Agents SDK** | Só via Chat Completions (`set_default_openai_api`): "muitos provedores não suportam Responses — 404" (DeepSeek **suporta** Responses desde o 0731) [6][26]; recursos só-Responses (tool search, deferred tools) indisponíveis fora da OpenAI [26]; tracing precisa ser desligado sem chave OpenAI [26] | Sim; correções de streaming de `reasoning` em Chat Completions fechadas em 15/09/2026 (#5042) [27] | Média; sem adaptador oficial em LiveKit/Pipecat achado | py 0.22.3 (29,8 mil★); js 0.18.0 [22][23] | MIT |
| **Vercel AI SDK** | `@ai-sdk/deepseek` 3.0.58: modelos `deepseek-flash`…, `thinking`, `reasoningEffort`, strict mode, `promptCacheHitTokens` em `providerMetadata` [29] | Sim (`streamText`) | Baixa em TS; é cliente+loop, **não** orquestrador de voz | `ai` 7.0.124, 27 mil★ [22][23] | Apache-2.0 (npm) |
| **Mastra** | String `deepseek/deepseek-flash` (catálogo models.dev); a tabela do próprio site marca "sem tools/reasoning" (provável desatualização — **não confirmado**) [31]; correção "preservar raciocínio DeepSeek entre turnos" fechada 25/09/2026 (PR #25189) [27] | Sim (`.stream()`) [30] | Média-alta: traz memória, workflows, vozes — mais do que se precisa | core 1.72.0, 28,5 mil★ [22][23] | **Apache-2.0 + pastas `ee/` sob licença source-available que proíbe uso em produção** [24] |
| **Pydantic AI** | Prefixo `deepseek:`; doc alerta: V4 pensa por padrão e **DeepSeek rejeita `tool_choice` forçado com pensamento ligado** → `thinking=False` [28] | Sim | Baixa-média (Python); excelente p/ saída tipada nos **jobs offline** | 2.52.0, 20,3 mil★, MIT [22][23] | MIT |

**Leitura.** Três achados pesam mais que a tabela:

1. **`reasoning_content` é o ponto de falha recorrente de quem empacota DeepSeek.** Com `tools` no
   request, a DeepSeek exige devolver o `reasoning_content` de **todos** os turnos anteriores (mesmo
   os sem tool call) ou responde **400** [4]. LangChain (py e js), Mastra, Agents SDK e Pydantic AI
   tiveram ou têm issues/PRs sobre isso em 2026 [25][27]. **Pipecat resolve com adaptador próprio e
   desliga o pensamento por padrão** [7][8]. A decisão "sem pensamento no laço falado" (§3) torna o
   problema inexistente.
2. **O laço de voz tem dono.** LiveKit descreve o `AgentSession` como quem "cuida de turnos e
   interrupções"; LangGraph dentro dele é um `LLMAdapter` que converte `chat_ctx` ↔ mensagens
   LangChain [14]. A LiveKit avisa por escrito que fluxos não-desenhados para voz "podem introduzir
   segundos de silêncio" e recomenda agentes com poucas tools sequenciais [15]. O `interrupt()` do
   LangGraph é feito para esperar humano **indefinidamente** — o oposto de barge-in (opinião de blog
   sem medição; **fonte fraca** [17]).
3. **O que LangGraph dá (checkpoint durável, retomada, grafos com HITL) o professor não usa no
   turno.** Onde ele *poderia* entrar é fora da voz: um pipeline noturno que monta o plano de aulas
   em vários passos. Mesmo aí, um script de 100 linhas com Pydantic AI ou uma única chamada com JSON
   resolve — **reavalie só se o pipeline offline passar de ~4–5 passos com ramificação**.

**Resposta à pergunta do CEO:** LangGraph é tecnologia madura (MIT, 42 mil★), mas para um professor
de voz por DeepSeek **é complexidade sem retorno**, e a integração DeepSeek↔LangChain tem defeito
conhecido em aberto.

## 2. Como cada orquestrador se pluga em LiveKit Agents e Pipecat

| Orquestrador | LiveKit Agents | Pipecat |
|---|---|---|
| **Só o framework de voz** | `openai.LLM(model="deepseek-flash", base_url="https://api.deepseek.com/v1", extra_body={"thinking":{"type":"disabled"}})`. Tools com `@function_tool`; `RunContext` dá `session.say()`/`generate_reply()`; tools assíncronas "deixam o agente continuar falando"; handoff entre `Agent`s e `Task`s com `chat_ctx` explícito [11][12][13] | `DeepSeekLLMService` (`pip install "pipecat-ai[deepseek]"`), padrão `deepseek-flash`, `thinking="disabled"`; tools em `LLMContext(tools=[...])`, `cancel_on_interruption`, paralelo/sequencial, timeout por tool [7][8][18] |
| **LangGraph** | `livekit-plugins-langchain` → `LLMAdapter(graph=...)`; exige grafo Pregel com `messages`; não aceita LCEL simples; saída de tool precisa ser filtrada em `llm_node` para não ser falada; issue #3634 ("não responde") aberta desde 13/10/2025 [14][15][16] | `LangchainProcessor` no repositório + exemplo oficial `langchain-ai/pipecat-langgraph-example` e processadores customizados (relato de terceiro) [search] |
| **Qualquer outro laço (Agents SDK, Pydantic AI, Vercel AI SDK, Mastra)** | **Sem plugin oficial achado.** Saída: (a) expor endpoint `/chat/completions` e apontar `base_url`; (b) sobrescrever `llm_node(chat_ctx, tools, model_settings)` devolvendo `ChatChunk`s [21]. Em ambos se perde o tratamento de interrupção/tool do framework | Sem processador oficial achado; escreve-se um `FrameProcessor` |
| **Fluxo de aula como máquina de estados** | `Agent`/`Task`/`TaskGroup` [13] | **Pipecat Flows**: grafo de nós, cada nó com instruções e tools próprias, estratégias `APPEND`/`RESET`/`RESET_WITH_SUMMARY`; aceita "qualquer serviço OpenAI-compatível" [20] |

**Conclusão da §2:** o framework de voz **basta como orquestrador**. A escolha LiveKit×Pipecat é da
encomenda paralela de voz; **o desenho abaixo funciona nos dois**, com a diferença de que hoje o
Pipecat traz a integração DeepSeek mais correta (thinking off de fábrica), e no LiveKit é preciso
configurar à mão. Um cuidado com Flows/`RESET`: trocar o contexto no meio **reescreve o prefixo** e
perde o cache dos tokens seguintes (custo pequeno; efeito em latência **não medido**).

## 3. Function calling e modo de raciocínio no V4.1 Flash

**O que a doc oficial garante** [3][4]:
- Tools no formato OpenAI; **`strict` mode em beta** (`base_url=https://api.deepseek.com/beta`, `strict: true` em *todas* as funções; tipos: object, string, number, integer, boolean, array, enum, anyOf, `$ref`; sem `minLength/maxLength/minItems/maxItems`; todas as props `required` e `additionalProperties:false`). Funciona com e sem pensamento.
- **Chat Completions não permite injetar tool calls "falsos" no meio da conversa** (Responses e Anthropic API permitem), **mas permite mensagens `system` no meio** [3]. Consequência: para pré-carregar contexto, **não simule tool calls**; injete mensagem de sistema.
- **Pensamento:** ligado por padrão, esforço padrão `high`; controle por `thinking:{type:enabled|disabled}` (via `extra_body` no SDK OpenAI) e `reasoning_effort: low|high|max`. Em modo pensamento `temperature`/`penalties` são ignorados; `top_p` ≥ 0,95 [4]. Com `tools` no request, **devolver todos os `reasoning_content`** ou 400 [4]. Pydantic AI documenta ainda que a DeepSeek **rejeita `tool_choice` forçado com pensamento ligado** [28].
- Streaming de tool calls existe (Responses: `response.function_call_arguments.delta`) [6]; o SDK `@ai-sdk/deepseek` declara "suporte a tool streaming" nos quatro modelos [29].

**Confiabilidade — o que há e o que não há:**
- **Não achei avaliação independente de function calling do V4.1-Flash sem pensamento.** A ficha no Hugging Face publica agentic (Terminal-Bench 2.1 90,6; AutomationBench 54,8…) mas com **esforço máximo**, sem tau2/BFCL e sem comparar os dois modos [41]. Artificial Analysis dá **índice 39 (com raciocínio) × 25 (sem)** — o modo sem raciocínio é **bem menos capaz** [40]. Para um professor com ~8 tools simples e *enum*s, o risco prático é baixo, mas **é hipótese até medir** (§7).
- Benchmark de "tool use" de agregador (#24 de 117, 57,6/100) veio de snippet de busca, **não aberto — descartado**.

**Latência extra por tool no meio da fala (dado que decide o desenho):**
- Artificial Analysis, API da DeepSeek, 30/09/2026: **TTFT 1,01 s sem raciocínio / 0,95 s com "max"** (estranho: o número com raciocínio é ligeiramente **menor**; a metodologia de TTFT para modelo que raciocina não foi aberta) e **~207 tokens/s** de saída [40]. Fonte de terceiro, prompt padrão — **não é o prompt do professor**.
- Uma tool no meio do turno = **duas chamadas** ao LLM: a que emite o `tool_call` + a que lê o resultado. Ordem de grandeza: **+1 s a +2 s de silêncio** por tool no caminho crítico + execução da query (Supabase, dezenas de ms, **não medido**). Conta de cabeça feita por mim a partir do TTFT acima.
- **Mitigações com evidência de código/doc:** (i) **tools de escrita que não precisam de resposta**: no LiveKit, `reply_required = fnc_out is not None` — tool que retorna `None` não dispara nova fala; no Pipecat, `FunctionCallResultProperties(run_llm=False)` [19][source-read livekit generation.py]; (ii) **tools assíncronas** (`cancel_on_interruption=False` no Pipecat; "async tools" no LiveKit) [11][18]; (iii) falar **antes** da tool (pré-fala em LiveKit: `ctx.wait_for_playout()`) [12]; (iv) **pré-carregar** na foto do aluno (§4).
- Interrupção do aluno no meio da tool: LiveKit Python "mantém a chamada e responde com erro"; Node "remove a chamada do histórico" — **comportamentos diferentes entre SDKs** [12]. Para mutação, `disallow_interruptions()` [12].

**Recomendação de modo:**
| Uso | Pensamento | Motivo |
|---|---|---|
| Laço falado | **Desligado** (se os evals de §7 segurarem; senão `reasoning_effort: low` e medir TTFT) | Pensar atrasa o 1º token falado [7]; evita 400 de `reasoning_content`; libera `tool_choice` forçado |
| Fim de sessão (resumo, extração de erros/fatos, atualização de nível) | **Ligado** (`high`) | Sem limite de latência, **sem `tools`** no request (então `reasoning_content` nem precisa voltar [4]) |
| Geração de plano de aula | Ligado | idem |

## 4. Contexto: prompt fixo × tool, e o cache de prefixo

### 4.1 Como o cache da DeepSeek funciona hoje (30/09/2026) [5]
- Ligado por padrão, em disco. **Só acerta se o request reusa, por inteiro, uma "unidade de prefixo"
  já persistida.** Com o V4 (atenção de janela deslizante), a persistência mudou: cada request
  grava duas unidades — **fim da entrada do usuário** e **fim da saída do modelo**; o sistema também
  persiste **prefixo comum detectado em vários requests**; e fatia **em intervalos fixos** textos longos.
- Exemplo oficial: `A+B` depois `A+C` **não acerta**; só depois de ver `A` duas vezes ele vira unidade
  (o 3º request `A+D` acerta `A`). **O prefixo comum precisa ser visto ≥ 2 vezes antes de valer.**
- "Melhor esforço", construção leva **segundos**, limpeza "de horas a dias" sem uso. Conferir por
  resposta: `usage.prompt_cache_hit_tokens` / `prompt_cache_miss_tokens` [5]. (O número "72 h" de um
  blog da Mem0 é de vendor e **não** está na doc oficial — descartado [42].)
- **Implicações práticas:** (1) em conversa, o histórico já enviado acerta porque o fim da saída
  anterior virou unidade; o que paga *miss* a cada turno é só a **fala nova do aluno**; (2) a parte
  específica do aluno (foto) é *miss* **uma vez por sessão**; (3) qualquer byte alterado **antes** do
  ponto muda tudo dali para frente.

### 4.2 Ordem de montagem (do mais estável ao mais volátil)
```
[1] system global  — persona, regras de fala (curtas, sem markdown/emoji, 1 pergunta por vez),
                     regras de uso de tool, formato de saída               ← igual p/ todos, dias
[2] catálogo de skills (name+description, ~100 tokens cada)                 ← igual p/ todos
    (+ schemas das tools: fazem parte do prefixo; ordem e texto estáveis)
[3] "foto do aluno" — UMA mensagem system, congelada no início da sessão:
      nível · objetivo · plano e passo atual · top-N memórias (erros recorrentes, fatos, interesses)
      · resumo das 3 últimas sessões · carteira do dia do Anki (n vencem hoje, n difíceis, 10 lemas)
      · palavras salvas recentes (top 15)                                    ← por aluno, por sessão
[4] mensagens user/assistant  — só acrescenta, nunca edita
[5] eventos no meio da aula (avançou o passo, skill ativada, data/hora) → NOVA mensagem system no fim
```
**Regras:** nada volátil (data/hora, contadores, "agora são...") em [1]–[3]; não reordenar tools; não
reescrever o histórico para "resumir" durante a aula (a janela é 1M — uma hora de conversa ≈ 15–20 mil
tokens, **não precisa compactar**); um resumo só entra **entre** sessões.

### 4.3 O que vai no prompt × o que vira tool
| Dado | Onde | Por quê |
|---|---|---|
| Persona, regras de fala, política de correção (texto) | prompt fixo [1] | estável, cacheável |
| Catálogo de skills | prompt fixo [2] | ~100 tokens/skill |
| Nível, objetivo, plano, **passo atual** | foto [3] | lido uma vez; zero latência |
| Resumo do Anki de hoje (contagens + alguns lemas) | foto [3] | o professor "sabe" sem perguntar |
| Top erros recorrentes e fatos do aluno | foto [3] (N pequeno) | é o que ele precisa em toda fala |
| Lista completa de cartões / palavras / livros | **tool** `buscar_palavras(consulta\|lema)`, `listar_cartoes_dificeis(n)`, `trecho_do_livro(book_id,…)` | grande, só às vezes necessário |
| Conteúdo completo do passo do plano (texto da leitura, letra da música) | **tool** `obter_material_do_passo()` | pesado; uma vez por passo |
| Mudar de skill por pedido do aluno ("vamos fazer roleplay") | **tool** `ativar_skill(nome∈enum)` | 1 round-trip aceitável: foi o aluno quem pediu |
| Gravar erro/fato/avanço | **tool de escrita que retorna `None`**, ou nada (job de fim de sessão extrai da transcrição) | sem 2ª chamada de LLM |

**Segurança de dados:** o `user_id` **nunca** é parâmetro de tool — o worker o fixa na abertura da
sessão e as consultas rodam por funções SQL/views com `user_id` injetado. RLS no schema novo.
(Não é decisão minha; é a forma que evita o modelo consultar dado de outro aluno.)

## 5. "Skills" para agente em 2026 e como aplicar sem Anthropic

**O que o mercado chama assim:** *Agent Skills* — pasta com `SKILL.md` (frontmatter `name` ≤64 car.,
`description` ≤1024 car. dizendo **o que faz e quando usar**; corpo em markdown; `scripts/`,
`references/`, `assets/` opcionais). **Divulgação progressiva em 3 níveis:** metadado (~100 tokens,
sempre no prompt) → corpo (<5.000 tokens recomendado, carregado quando ativada) → recursos (sob
demanda) [32][34]. Especificação aberta em agentskills.io; adoção reportada por Claude Code, Codex,
Cursor, Gemini CLI, Copilot, etc. (**fonte secundária**, resultados de busca) e guia oficial de como
**implementar o suporte no seu próprio agente** [33]. Microsoft Agent Framework tem suporte documentado
(página de 18/09/2026) [35]; o Agents SDK da OpenAI aceitou skills em `Agent` (issues #5025/#5028
fechadas em 14–15/09/2026; **não verifiquei** se funciona com Chat Completions/DeepSeek) [27]; para
Pydantic AI existe pacote de terceiro (`pydantic-ai-skills`, 376★, MIT, push 26/09/2026) que registra
`list_skills`/`load_skill`/`read_skill_resource`/`run_skill_script` [36].

**O que é e não é portável:** na API da Anthropic, Skills rodam num **contêiner de execução de código
sem rede** (exige a code execution tool) [34] — **isso não existe na DeepSeek**. O que é portável é o
**padrão**: a doc de implementação descreve exatamente o harness de que o professor precisa — catálogo
no prompt, ativação por **arquivo lido ou ferramenta dedicada**, e "restrinja o parâmetro `name` a um
enum para o modelo não inventar skill" [33]. Com DeepSeek isso é **uma tool com enum** (o `strict`
mode da DeepSeek aceita `enum`) [3][33].

**Como aplicar ao professor (formato, não pedagogia):**
```
skills/
  correcao/SKILL.md            # como e quando corrigir; formato curto para fala
  revisao-de-vocabulario/SKILL.md   # usa tools do Anki/banco de palavras
  roleplay/SKILL.md            # cenários; como sair do personagem
  aquecimento/SKILL.md   encerramento/SKILL.md
```
- **Ativação em voz: pelo app primeiro.** O passo do plano carrega `skill: 'revisao-de-vocabulario'`; o
  app injeta o corpo como **mensagem `system` no fim** (aceita em Chat Completions [3]) — **sem
  round-trip e sem tocar o prefixo**. A tool `ativar_skill` fica só para troca pedida pelo aluno.
- Corpos de **500–1.500 tokens**, sem `scripts/` (não há sandbox). O guia pede **proteger o conteúdo
  de skill contra compactação** e **deduplicar ativações** [33] — na prática, a aula não compacta.
- **Mesmos arquivos servem ao Claude Code** do time (mesmo formato), o que permite **versionar e
  revisar** o comportamento do professor como código, num lugar só. (Decisão do dev; aponto a
  vantagem.)
- Risco declarado pela Anthropic: skill de fonte não confiável pode instruir o modelo a fazer coisa
  diferente do anunciado [34] — aqui as skills são **da casa**, então o risco é de injeção via dado
  (texto de livro/letra de música), não de skill maliciosa.

## 6. Memória entre aulas

**Três tipos, três tratamentos:**
| Tipo | Exemplo | Onde mora | Como entra na aula |
|---|---|---|---|
| **Dado já estruturado** | cartões/FSRS, `review_log`, palavras salvas, livros | `anki.*`, `leitor.*` (já existem) | resumo na foto [3] + tools |
| **Estado do aluno** | nível, plano, passo atual | tabelas novas (§8) | foto [3] |
| **Memória narrativa** | resumo da sessão, fatos ("trabalha com TI, quer viajar em março"), **erros recorrentes** (chave + contagem + exemplos) | `tutor.memory_items` + `tutor.sessions.summary` | top-N por peso/recência na foto [3] |

**Padrões do mercado, com o que verifiquei:**
- **Tabela própria + job de fim de sessão (recomendado).** Uma chamada offline (pensamento ligado,
  sem tools) lê a transcrição e devolve JSON: resumo (≤150 palavras), fatos novos, erros por chave
  (com exemplos), temas cobertos. O app faz *upsert*. Zero latência na aula, zero dependência,
  auditável por SQL. Recuperação **sem vetor** até o volume pedir: `ORDER BY peso, last_seen LIMIT N`.
- **pgvector só quando doer.** Supabase suporta (coluna `vector(n)`, operadores `<=>`/`<->`/`<#>`;
  índice só quando a tabela cresce) [39]. **A DeepSeek não lista API de embeddings** na navegação da
  doc oficial (conferi a barra lateral: Chat, Responses, Anthropic, Files, Vision, Tool Calls, KV Cache…
  **sem** embeddings) — *ausência na navegação*, não declaração expressa. Logo, vetor exige **outro
  provedor de embeddings** (ex.: `gte-small`, 384 dims, citado no guia do Supabase [39]). Para uma
  família, o volume de memória por pessoa cabe inteiro no prompt; **não recomendo vetor agora**
  (julgamento meu; sem fonte de limiar).
- **Mem0** (Apache-2.0; `mem0ai` py 2.2.1 / ts 3.3.1, 25/09/2026; 66 mil★) [22][37]: extrai fatos
  por chamada de LLM, liga entidades, recupera por busca híbrida. OSS suporta DeepSeek como LLM e
  **Supabase/pgvector como vector store** [37] — porém **exige embedder separado** (a doc de config
  usa `OPENAI_API_KEY` para isso) e a doc lista `deepseek-chat` como padrão (alias em descontinuação).
  Benchmarks no README (LoCoMo 92,5; LongMemEval 94,4) são **autodeclarados** e o próprio texto
  diz que a plataforma gerenciada tem otimizações "não disponíveis no OSS" [37]. Um blog de
  concorrente (declara conflito de interesse) diz que números de LoCoMo divergem entre fornecedores
  (75×67×94) — **fonte fraca** [43]. *Não cabe:* adiciona LLM + embedder + caixa-preta para guardar
  ~dezenas de fatos por pessoa que já cabem numa tabela.
- **Letta** (ex-MemGPT): o README atual diz que o código ativo vive em `letta-ai/letta-code` (harness
  de coding agent/TUI) e que o **servidor V1 foi aposentado** (branch `archive`) [38]. **Descartado
  para este caso.**
- Zep/Graphiti e LangMem: aparecem em comparativos, **não abri fonte primária** — fora.

**Poucos usuários (família):** tabela própria. Sem fila, sem vetor, sem serviço novo; o custo é um
job por sessão (~US$ 0,003–0,008, §8.3).

## 7. Como avaliar se o agente se comporta como professor (evals de conversa)

*(Método; o que é "bom professor" é a encomenda de pedagogia.)*

**Pirâmide simples — barata a cara:**
1. **Testes de unidade por turno, determinísticos** (a cada commit, modo texto, sem áudio). O LiveKit
   tem API pronta: `session.run(user_input=...)` → `result.expect.next_event().is_function_call(name=...)`,
   `.is_message(role="assistant").judge(llm, intent="...")`, `no_more_events()`, e mocks de tool [42-LK].
   Verificam: **chamou a tool certa com os argumentos certos**, **não chamou tool quando não devia**,
   **respondeu curto**, **não falou markdown**. Em Pipecat não achei equivalente oficial (lacuna).
2. **Simulações multi-turno com aluno simulado + juiz** (antes de cada release): N cenários
   (persona + objetivo) onde um LLM faz de aluno; ao fim, um juiz dá **aprovado/reprovado binário** por
   regra. Langfuse recomenda **começar com pass/fail binário** e dois desenhos: *simulado* (proativo) e
   *N+1* (pegar sessão real até o turno N e avaliar o N+1) [44]. **LiveKit Agent Simulations está em
   beta e roda no LiveKit Cloud** (15 simultâneas/execução, 30/projeto) [42-LK] — se a voz for
   autohospedada, use um script próprio de ~100 linhas (aluno-LLM ↔ agente em modo texto ↔ juiz).
3. **Juiz:** use **modelo diferente do professor** (o padrão do promptfoo é OpenAI/Anthropic/Google;
   configurável) [45]; rubrica em linguagem simples, 1 regra por pergunta, resposta JSON
   `{reason, pass}`.
4. **Telemetria de produção:** registre por turno `prompt_cache_hit_tokens/miss`, tools chamadas,
   latência do 1º token, e a transcrição; promova **falhas reais** a casos de teste (N+1) [44].
5. **Os testes que só esta arquitetura exige:** (a) *não vazar* dado de outro aluno; (b) *sobreviver a
   tool lenta/timeout*; (c) **invariância do cache** — teste que monta o prompt duas vezes e
   confirma prefixo byte a byte igual; (d) **A/B de modo**: mesmos cenários com `thinking disabled`
   × `reasoning_effort: low` — é o teste que decide a §3.

**Ferramentas:** pytest + API do LiveKit (se LiveKit); **promptfoo** (`llm-rubric`, OSS) para
casos de prompt isolados — a página que abri **não documenta multi-turno** [45]; **Langfuse**
(rastro + scores por sessão; blog de 09/10/2025) [44]; DeepEval tem simulador conversacional
(*só vi em resultado de busca, não abri*). **Para começar:** pytest + juiz próprio + 20–30 cenários.

## 8. Recomendação: a arquitetura que eu montaria

### 8.1 Desenho
```
Aluno ─voz─ [LiveKit Agents | Pipecat]  (worker Python, Docker Swarm)
                  │  laço: VAD → STT → LLM → TTS   (encomenda de voz)
                  │
                  ├─ LLM: deepseek-flash, thinking DESLIGADO, tools (≈8), stream
                  │        └─ usage.prompt_cache_hit_tokens → métricas
                  ├─ tutor/prompt.py   monta [1][2][3] na ordem do cache (testa invariância)
                  ├─ tutor/tools.py    funções finas → SQL (views/funções) com user_id fixado
                  ├─ skills/*/SKILL.md catálogo + ativação pelo passo do plano
                  └─ fim da sessão → job offline (thinking ON, sem tools) → resumo/memória/nível
Next.js ─ telas de plano, progresso, "lição atual" (já há `licao-atual.tsx`/`conversa-fab.tsx` placeholders)
Supabase Postgres ─ anki.* · leitor.* · profiles (existem) + schema `tutor` (novo)
```
- **Sem LangGraph/Mastra/Agents SDK.** Laço = o do framework de voz.
- Se depois quiser **chat de texto** no Next.js: Vercel AI SDK + `@ai-sdk/deepseek`, **reusando os
  mesmos `SKILL.md` e as mesmas funções SQL** (o contrato de dados é Postgres; o de prompt é markdown).
  Duplicar só a cola, não a regra.
- Worker Python: compensa — LiveKit Agents e Pipecat são Python-first [22][23]; o Next.js não
  entra no caminho crítico da voz.

### 8.2 Tabelas novas mínimas (esboço — **colunas de `anki.*`/`leitor.*` não conferidas**: o repo não versiona o schema)
```sql
create schema tutor;

-- estado do aluno (1 linha por aluno)
create table tutor.student_profile (
  user_id uuid primary key references auth.users,
  level text,                      -- rótulo livre do nível (a régua é da encomenda de pedagogia)
  level_evidence jsonb,            -- o que sustentou o nível e quando
  goals text, prefs jsonb,         -- ex.: estilo de correção, tema favorito
  updated_at timestamptz default now()
);

-- plano e passos
create table tutor.lesson_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users,
  title text not null, status text not null default 'active',  -- active|done|paused
  created_by text not null default 'system', created_at timestamptz default now()
);
create table tutor.lesson_steps (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references tutor.lesson_plans on delete cascade,
  position int not null, skill text not null,      -- nome do SKILL.md
  objective text not null, payload jsonb,           -- ex.: {book_id, palavras:[...]}
  status text not null default 'todo',              -- todo|doing|done|skipped
  unique (plan_id, position)
);
-- aula atual = ponteiro (tabela de 1 linha por aluno)
create table tutor.current_lesson (
  user_id uuid primary key references auth.users,
  plan_id uuid references tutor.lesson_plans, step_id uuid references tutor.lesson_steps,
  state jsonb, updated_at timestamptz default now()
);

-- temas a conversar
create table tutor.topics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,               -- null = tema da casa
  title text not null, seed_prompt text, tags text[], last_used_at timestamptz
);

-- sessões e transcrição
create table tutor.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users, plan_id uuid, step_id uuid,
  started_at timestamptz default now(), ended_at timestamptz,
  summary text, model text, usage jsonb              -- tokens hit/miss/out, nº de tools
);
create table tutor.session_turns (
  session_id uuid references tutor.sessions on delete cascade,
  idx int, role text, content text, tool_calls jsonb, created_at timestamptz default now(),
  primary key (session_id, idx)
);

-- memória narrativa
create table tutor.memory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users,
  kind text not null,              -- fact | error_pattern | interest | preference
  key text,                        -- p.ex. 'present-perfect-vs-past' (p/ upsert de contagem)
  content text not null, examples jsonb,
  weight int default 1, first_seen timestamptz default now(), last_seen timestamptz,
  status text default 'active',    -- active | retired
  source_session uuid references tutor.sessions
  -- embedding vector(384) null    -- SÓ se/quando o volume pedir
);
-- RLS em todas: user_id = auth.uid(); o worker usa chave de servidor e fixa user_id por sessão.
```
Views/funções de leitura sobre `anki.*`/`leitor.*` (`tutor.v_anki_hoje`, `tutor.v_dificeis`,
`tutor.v_palavras_recentes`) dão ao worker **um contrato estável** mesmo que o schema do Anki mude.

### 8.3 Custo de tokens por hora de conversa (modelo de cálculo + resultado)

**A relação, não o número** (preço e premissas envelhecem): por hora,
`custo = (hit·P_hit + miss·P_miss + saída·P_out) / 1e6`, onde, para `T` turnos, prefixo estático `S`,
fala do aluno `u`, fala do professor `a`:
`entrada total = T·S + (u+a)·T(T−1)/2`; em regime de cache ideal só `≈ T·u` é *miss*.
**Premissas (minhas, não medidas):** `T=150` turnos/h, `S=4.000` tokens (system + catálogo + schemas +
foto), `u=30`, `a=60` tokens, 20 tools/h (resultado ~300 tokens), sem pensamento. Cálculo feito por script
(`2026-09-30-cerebro-agente-professor-custo-por-hora.py`, ao lado deste DR) (soma por turno do prefixo em *hit* + fala nova em *miss* + saída); a fórmula acima basta para recalcular com os seus números.

| Cenário (tabela de 30/09/2026) | Entrada hit | Entrada miss | Saída | **US$/hora** |
|---|---|---|---|---|
| Cache ideal, **fora de pico** | 1,82 M | 12 mil | 10,8 mil | **≈ 0,014** |
| Cache ideal, pico | 1,82 M | 12 mil | 10,8 mil | ≈ 0,028 |
| Só 50% do histórico acerta, fora de pico | 0,91 M | 0,92 M | 10,8 mil | ≈ 0,15 |
| **Sem cache nenhum**, fora de pico | 0 | 1,83 M | 10,8 mil | ≈ 0,28 |
| Sem cache nenhum, pico | 0 | 1,83 M | 10,8 mil | ≈ 0,56 |
| Cache ideal, **pensamento ligado** (+500 tok/turno) | 1,82 M | 12 mil | 85,8 mil | ≈ 0,059 (fora de pico) |
| Cache ideal, prefixo S = 10.000 | 2,84 M | 12 mil | 10,8 mil | ≈ 0,017 |

**Leituras:** (1) o cache é a diferença de **~20×** (0,014 → 0,28) — por isso a §4 manda mais que a
escolha de framework; (2) **prefixo grande é barato se cacheado** (S=10k custa +US$ 0,003/h) — não
economize tokens de system prompt à custa de instrução; (3) **pensamento ligado ≈ 4×** por causa da
saída — e ainda atrasa a voz; (4) **job de fim de sessão** (~15 mil tokens de transcrição em *miss* +
~600 de saída, pensamento ligado com ~2 mil de raciocínio): **≈ US$ 0,003–0,008** a cada sessão —
desprezível. Custo em reais e câmbio são do `assessor-financeiro`.

### 8.4 Ordem de construção que eu seguiria (sugestão, a decisão é do CTO)
1. Schema `tutor` + views do Anki + `prompt.py` com teste de invariância de prefixo.
2. Laço mínimo em **texto** (CLI) com as tools e 10 cenários de eval — antes de ligar voz.
3. Ligar ao framework de voz escolhido; medir TTFT real do **seu** prompt e taxa de cache.
4. Job de fim de sessão → memória. Skills por passo de plano.
5. Só então: A/B de `thinking` off × `low`; decidir se precisa de pgvector.

## O que não foi possível confirmar

- **Nenhum teste executado:** não tenho chave da DeepSeek nem rodei o professor. Tudo de latência
  (TTFT 1,0 s; +1–2 s por tool) é **medição de terceiro em prompt genérico + conta de cabeça**; a
  taxa real de acerto do cache com prompts do professor **não foi medida**.
- **`deepseek-chat` ainda responde?** A doc diz que seria descontinuado em 24/07/2026 e o AI SDK diz
  "retirado"; **não testei**. O padrão `deepseek-chat` do `with_deepseek()` do LiveKit foi lido no
  código da `main` (30/09/2026) — o comportamento em tempo de execução não foi testado.
- **Confiabilidade de function calling do V4.1-Flash sem pensamento:** não existe avaliação
  independente que eu tenha achado (tau2/BFCL); só benchmarks do fornecedor com esforço máximo.
- **Tool que retorna `None` não dispara resposta:** lido no código do LiveKit (`reply_required`) e na
  doc do Pipecat (`run_llm`); **não executei**.
- **Plugin de `@mastra/livekit`:** o pacote existe no npm; **não abri o conteúdo**. Adaptador oficial
  do Agents SDK/Pydantic AI/Vercel AI SDK para LiveKit/Pipecat: **não achei** (ausência em busca, não
  prova de inexistência).
- **Mastra e "sem tools/reasoning"** na tabela de modelos: contradiz a doc da DeepSeek; tratei como
  desatualização da tabela (hipótese).
- **Pipecat Flows × cache / latência** e **`RESET_WITH_SUMMARY`**: só a descrição da doc; efeito real
  não medido.
- **Equivalente do `judge` de LiveKit em Pipecat:** não achei.
- **Zep/Graphiti/LangMem, DeepEval:** vistos só em resultado de busca — não abertos.
- **Privacidade/LGPD (lacuna para outro cargo):** a API oficial da DeepSeek, conforme o DR de 28/09,
  processa na China e usa dado para treino por padrão (política conferida em 28/09/2026; **não
  reconferida hoje**). Este desenho manda **perfil, erros e transcrição** para o prompt — se houver
  **menor de idade** na família, a leitura é do `analista-de-seguranca`; o caminho alternativo
  (DeepInfra com retenção zero declarada) está no DR de 28/09.
- **Schema real do Anki/leitor:** o repositório não versiona migrations; as tabelas acima são esboço
  sobre os nomes dados na encomenda.
- **Achados fora do escopo (1 linha cada):** (a) `deepseek-flash` no `with_deepseek()`/docs de
  terceiros muda de nome com frequência — trave a string num único lugar; (b) o Agents SDK da OpenAI
  aceitar skills em `Agent` (set/2026) pode virar alternativa futura **se** operar com Chat
  Completions.

## Fontes

*(abertas de fato; acesso em 30/09/2026 salvo nota. Tipo entre colchetes.)*

1. DeepSeek API — Models & Pricing — https://api-docs.deepseek.com/quick_start/pricing — [oficial]
2. DeepSeek API — Change Log — https://api-docs.deepseek.com/updates/ — [oficial/changelog]
3. DeepSeek API — Tool Calls (strict mode, mensagens no meio da conversa) — https://api-docs.deepseek.com/guides/tool_calls — [oficial]
4. DeepSeek API — Thinking Mode (toggle, effort, `reasoning_content` com tools → 400) — https://api-docs.deepseek.com/guides/thinking_mode — [oficial]
5. DeepSeek API — Context Caching (KV cache, regras de persistência) — https://api-docs.deepseek.com/guides/kv_cache/ — [oficial]
6. DeepSeek API — Responses API (eventos de stream) — https://api-docs.deepseek.com/guides/responses_api/ — [oficial]
7. Pipecat — DeepSeek LLM — https://docs.pipecat.ai/server/services/llm/deepseek — [oficial]
8. Pipecat — `services/deepseek/llm.py` — https://github.com/pipecat-ai/pipecat/blob/main/src/pipecat/services/deepseek/llm.py — [repo]
9. LiveKit — OpenAI-compatible LLMs — https://docs.livekit.io/agents/models/llm/openai-compatible-llms/ — [oficial]
10. LiveKit — `livekit-plugins-openai/llm.py` (`with_deepseek`, `extra_body`) — https://github.com/livekit/agents/blob/main/livekit-plugins/livekit-plugins-openai/livekit/plugins/openai/llm.py — [repo]
11. LiveKit — Tools — https://docs.livekit.io/agents/logic/tools/ — [oficial]
12. LiveKit — Tool definition — https://docs.livekit.io/agents/logic/tools/definition/ — [oficial]
13. LiveKit — Workflows (Agents, handoffs, Tasks) — https://docs.livekit.io/agents/logic/workflows/ — [oficial]
14. LiveKit — LangChain/LangGraph plugin (`LLMAdapter`) — https://docs.livekit.io/agents/models/llm/plugins/langchain/ — [oficial]
15. LiveKit blog — "Bring your LangChain Agents to LiveKit" (27/03/2026) — https://livekit.com/blog/langchain-to-livekit — [oficial/blog]
16. livekit/agents issue #3634 (aberta, 13/10/2025) — https://github.com/livekit/agents/issues/3634 — [repo]
17. buildingagenticai.com — "LangGraph for Voice AI Agents" (Muhammad Arbab, 05/07/2026; **sem medições**) — https://buildingagenticai.com/blog/langgraph-for-voice-ai-agents/ — [relato — fraca]
18. Pipecat — Function calling — https://docs.pipecat.ai/pipecat/learn/function-calling — [oficial]
19. Pipecat — `frames.py` (`FunctionCallResultProperties`) — https://github.com/pipecat-ai/pipecat/blob/main/src/pipecat/frames/frames.py — [repo]
20. Pipecat Flows — https://docs.pipecat.ai/pipecat-flows/introduction — [oficial]
21. LiveKit — Nodes (`llm_node`) — https://docs.livekit.io/agents/build/nodes/ — [oficial]
22. GitHub API — estrelas/licença/push de livekit/agents, pipecat, langgraph(js), openai-agents-python/js, vercel/ai, mastra, pydantic-ai, mem0, letta, anthropics/skills — https://api.github.com/repos/… — [repo]
23. npm registry / PyPI — versões e licenças (ai 7.0.124, @ai-sdk/deepseek 3.0.58, @mastra/core 1.72.0, @langchain/langgraph 1.4.18, @langchain/deepseek 1.1.15, @openai/agents 0.18.0, mem0ai 3.3.1; langgraph 1.2.12, pydantic-ai 2.52.0, openai-agents 0.22.3, livekit-agents 1.8.3, pipecat-ai 1.12.0, mem0ai 2.2.1) — https://registry.npmjs.org · https://pypi.org/pypi — [repo/registro]
24. Mastra — `LICENSE.md` e `ee/LICENSE` (EE License 2.0, efetiva 22/09/2026: "não permite Production Use") — https://github.com/mastra-ai/mastra — [repo]
25. LangChain — issues #40219 (aberta, 05/09/2026), #37174 (fechada), #34166 (fechada 03/06/2026); langchainjs #10883 (aberta, 12/05/2026) — https://github.com/langchain-ai/langchain/issues/40219 — [repo]
26. OpenAI Agents SDK — Models (não-OpenAI, Responses × Chat Completions) — https://openai.github.io/openai-agents-python/models/ — [oficial]
27. openai-agents-python e mastra — busca de issues/PRs (#5042, #5025, #5028, #2328; Mastra #25189) — https://api.github.com/search/issues — [repo]
28. Pydantic AI — DeepSeek — https://pydantic.dev/docs/ai/models/deepseek/ — [oficial]
29. AI SDK — provider DeepSeek — https://ai-sdk.dev/providers/ai-sdk-providers/deepseek — [oficial]
30. Mastra — Agents overview — https://mastra.ai/docs/agents/overview — [oficial]
31. Mastra — provider DeepSeek — https://mastra.ai/models/providers/deepseek — [oficial]
32. Agent Skills — Specification — https://agentskills.io/specification — [oficial]
33. Agent Skills — How to add skills support to your agent — https://agentskills.io/client-implementation/adding-skills-support — [oficial]
34. Anthropic — Agent Skills overview — https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview — [oficial]
35. Microsoft Learn — Agent Skills (Agent Framework, 18/09/2026) — https://learn.microsoft.com/en-us/agent-framework/agents/skills — [oficial]
36. DougTrajano/pydantic-ai-skills — https://github.com/DougTrajano/pydantic-ai-skills — [repo, terceiro]
37. Mem0 — README, docs DeepSeek LLM e vector store Supabase — https://github.com/mem0ai/mem0 · https://docs.mem0.ai/components/llms/models/deepseek · https://docs.mem0.ai/components/vectordbs/dbs/supabase — [repo/oficial]
38. Letta — README (servidor V1 aposentado; código em letta-code) — https://github.com/letta-ai/letta — [repo]
39. Supabase — Vector columns (pgvector) — https://supabase.com/docs/guides/ai/vector-columns — [oficial]
40. Artificial Analysis — DeepSeek V4.1 Flash (raciocínio e não-raciocínio) — https://artificialanalysis.ai/models/deepseek-v4-1-flash e …-non-reasoning — [terceiro]
41. Hugging Face — DeepSeek-V4.1-Flash (model card) — https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash — [oficial]
42. Mem0 blog — "DeepSeek V4.1 Flash: 890 bytes per token…" (15/09/2026; **vendor**, só o que contradiz/complementa a doc) — https://mem0.ai/blog/deepseek-v4.1-flash-890-bytes-per-token-zero-bytes-of-persistent-memory — [vendor — fraca]
    **42-LK.** LiveKit — Testing: unit tests e Agent Simulations (beta) — https://docs.livekit.io/testing/unit-tests/ · https://docs.livekit.io/testing/simulations/ · https://docs.livekit.io/agents/start/testing/ — [oficial]
43. Xin Chen (dev.to, jun/2026) — "Mem0 vs Minta vs Letta vs Zep" (**autor declara conflito de interesse**) — https://dev.to/xinchen03/mem0-vs-minta-vs-letta-vs-zep-ai-memory-systems-compared-2026-2k86 — [relato — fraca]
44. Langfuse — Evaluating multi-turn conversations (09/10/2025) — https://langfuse.com/blog/2025-10-09-evaluating-multi-turn-conversations — [engenharia]
45. promptfoo — `llm-rubric` — https://www.promptfoo.dev/docs/configuration/expected-outputs/model-graded/llm-rubric/ — [oficial]
46. Resultados de busca (não abertos além do snippet; usados só para localizar): Pipecat × LangGraph (`langchain-ai/pipecat-langgraph-example`, `processors/frameworks/langchain.py`); adoção do padrão Agent Skills (Codex/Cursor/Gemini CLI) — **[fraca]** ("[search]" na §2).

*Consultadas ≈ 45 (abertas com fetch/curl/API); citadas ≈ 40. Parei por saturação no ponto em que
as mesmas conclusões (reasoning_content, adaptador do LiveKit, cache) apareciam em fontes
independentes.*
