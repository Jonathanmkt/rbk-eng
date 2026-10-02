---
titulo: Arquitetura de um professor de inglês por voz em tempo real — voz nativa × duas LLMs × cascata, pronúncia e validação em cota gratuita
data: 2026-09-30
departamento: tecnologia
encomendado-por: CEO (via dev do app Família Figueiredo, rbk-eng)
decisao-alvo: Escolher a arquitetura do professor por voz (modelo de voz nativa único, duas LLMs ou cascata) e com qual modelo/serviço validar a ideia agora em cota gratuita, e qual seguir em produção (família com possível menor de idade)
tags: [voz-ia, speech-to-speech, gemini-live, gpt-live, avaliacao-de-pronuncia, duas-llms, function-calling, politica-de-menor, custo-por-hora]
validade: curta
status: parcial
---

# Arquitetura do professor de inglês por voz em tempo real

> ⚠️ **Validade curta: o mercado de voz nativa mudou três vezes em 12 semanas.** Tudo aqui é de
> **30/09/2026**. O modelo que este DR manda testar (`gemini-3.8-live`) saiu em **15/09/2026**; o
> `GPT-Live-1` na API, em **10/09/2026**.
>
> **Este DR corrige o de [camada de voz (30/09)](2026-09-30-camada-de-voz-professor-de-ingles-deepseek-stt-tts-pronuncia.md)
> no que dependia da premissa "o DeepSeek é o cérebro".** Dali continuam valendo, por referência: o
> catálogo de STT/TTS, o preço de cascata e o desenho de Azure Pronunciation Assessment. Não refiz
> pedagogia nem memória/contexto ([pedagogia](2026-09-30-professor-de-ingles-por-ia-pedagogia-e-produtos-2026.md),
> [cérebro](2026-09-30-cerebro-agente-professor-ingles-orquestracao-contexto-memoria.md)).
>
> **Scripts de custo:** [`2026-09-30-voz-professor-arquitetura-custo-por-hora.py`](2026-09-30-voz-professor-arquitetura-custo-por-hora.py)
> — os números de custo saem dali, recalculáveis. Os testes práticos estão na seção 5.

## O essencial em 5 linhas

1. **Um modelo de voz nativa dá conta do professor, e o CEO pode ouvi-lo esta semana a custo zero.**
   Testei na chave da casa (tier gratuito) o `gemini-3.8-live`: seguiu um prompt de ~2.800 palavras
   (regra de idioma por nível **9/9**), chamou ferramenta no meio da fala e falou o dado certo,
   entendeu PT+EN na mesma frase, e respondeu em **mediana 1,1 s** após o fim da fala (n=47). A voz
   é a mesma família que a casa já usa em `voz/` desde agosto. **Não precisa de ponte:** o token
   efêmero, que a casa deu como recusado em agosto, **hoje funciona** (seção 5).
2. **"Duas LLMs" deixou de ser gambiarra: virou produto (GPT-Live-1, API desde 10/09) e pesquisa
   (ConvFill), mas só compensa onde a voz sozinha falha — o que aqui é raro.** Medi o desenho
   "Gemini fala, DeepSeek pensa por ferramenta": o DeepSeek respondeu em 0,9–1,0 s e o Gemini repetiu
   a resposta fielmente, ao custo de **~2,2 s de silêncio** naquele turno. Recomendo o **cérebro
   fora do laço falado** (briefing antes da aula, resumo depois) e só ferramentas de leitura dentro.
3. **Pronúncia: o modelo de voz NÃO serve como juiz espontâneo, e como juiz sob encomenda só pega
   erro óbvio.** Em conversa, elogiou sotaque brasileiro pesado em 2 de 3 tentativas (e se recusou na
   3ª). Com papel de examinador + frase-alvo: **8/8 certos** em erro óbvio, mas só a 1ª palavra
   errada. A literatura: GPT-4o correlaciona **0,24 (fonema) / 0,45–0,50 (frase)** com humanos e
   falha em ~45% das respostas; o dedicado (Azure: >0,5) continua necessário para "deu certo ou não
   por palavra". **O dedicado entra em paralelo, como segundo fluxo do mesmo microfone.**
4. **🔴 Fato que muda a produção: os termos do Gemini API e do Google Cloud (Vertex) proíbem uso em
   aplicação "dirigida a menores de 18 ou com probabilidade de ser acessada por eles"**
   (termos de 28/04/2026 e 24/09/2026). Para a família com menor, o Gemini vale como **bancada de
   validação com dado inventado**, não como produção. O tier gratuito ainda usa o conteúdo para
   melhorar produtos, com revisão humana.
5. **Recomendação:** validar já com **Gemini 3.8 Live** (grátis, token efêmero, 1–2 ferramentas de
   leitura, dado inventado); produzir com **a mesma arquitetura** (voz nativa + ferramentas + pronúncia
   dedicada em paralelo) **atrás de um adaptador de provedor**, com OpenAI (`GPT-Live-1`/`gpt-realtime-2.1`,
   ≈ US$ 2,6–3,3/h) ou Azure Voice Live como candidatos; **cascata (≈ US$ 0,8–1,3/h) é o plano B**
   se a voz nativa falhar no teste com a família. A diferença de custo (≈ US$ 25/mês para 10 h) é
   menor que a de qualidade.
6. **Complemento (o CEO escolheu o `gemini-3.1-flash-live-preview`; seção 7):** a **saída de áudio é
   US$ 12,00/1M (≈ US$ 0,018/min)** — a página oficial de 30/09/2026 tem **uma linha só para os 3 modelos
   Live**, então o 3.1 custa igual ao 3.8. **Sim: cobra-se o contexto inteiro a cada turno** (áudio
   acumulado à tarifa de entrada de áudio), **não há cache** na Live API, e o "US$ 0,005/min" é só
   conversão do preço do áudio **novo** (≈ 30× menos do que a entrada real de uma aula). **Aula de 15 min
   (33 turnos): ≈ US$ 0,90 sem compressão; US$ 0,16–0,25 com compressão de 2,5–4 mil tokens; US$ 0,27–0,33
   reiniciando a sessão com resumo em texto** (≈ US$ 0,7–3,6/h). **A janela de compressão é a alavanca.**

---

## 0. O que mudou desde a encomenda anterior

| Item | Antes (DR de 30/09 manhã) | Hoje (30/09/2026) | Fonte |
|---|---|---|---|
| Voz nativa da Google | `gemini-3-flash-live` / `3.1-flash-live` | **`gemini-3.8-live`** (GA, 15/09) e `…-extended-thinking`; o 3.1 é "legado" | [2][5][6] |
| OpenAI | `gpt-realtime-2.1` | + **`gpt-live-1`** na API (10/09): full-duplex, **US$ 0,05/min só da voz**, pensa em modelo de trás | [17][18] |
| Premissa | DeepSeek é o cérebro → voz nativa "trocaria o cérebro" | **Retirada.** Voz nativa compara em igualdade | esta encomenda |
| Token efêmero do Google (README da casa, 05/08) | "recusado com 1008" | **Aceito** em `v1beta` e `v1alpha`, com sistema e ferramentas travados no token (testado 30/09) | seção 5 |

---

## 1. Modelos de voz nativa em 2026 — o que serve a este caso

Latências: **TTFA = tempo até o 1º áudio**, da Artificial Analysis (AA), conferido por mim no HTML
cru da página em 30/09/2026 [35]. As **definições** das colunas da AA eu não conferi — uso como
ordenação, não como verdade. "Agentic" é a coluna que mais importa aqui (mede ferramenta).

| | **Gemini 3.8 Live** | **3.8 Live Extended Thinking** | **3.1 Flash Live** (legado) | **gpt-realtime-2.1** | **GPT-Live-1** | **Azure Voice Live** | **Nova 2 Sonic** |
|---|---|---|---|---|---|---|---|
| Situação | **GA 15/09/2026** [5] | GA, 15/09 [9] | "legado", recomendam migrar [3] | 06/07/2026 [14] | API 10/09/2026 [17] | GA; hospeda os modelos da OpenAI e Phi | GA 02/12/2025 [26] |
| TTFA (AA) | **1,18 s** | 1,35 s | 2,99 s (thinking "High") | 1,21 s (High) · 0,97 s (Minimal) | 1,24–1,34 s; 0,80 s turn-taking (relato) | não medido pela AA | 1,14 s |
| Agentic / S2S index (AA) | 30,1% / 76,0 | **68,6% / 82,6** | 37,7% / 71,5 | 45,7% / 73,9 | **59–68% / 80–82** | — | tarefa 57,1% |
| **Medido por mim** | **1º áudio: mediana 1,12 s, p90 1,43 s** (n=47) | voz "trava" e devolve "erro de sistema" (seção 2) | mediana 0,93 s (n=4) | não testei (chave sem realtime) | não testei | não testei | não testei |
| PT-BR + EN, troca na frase | "97 idiomas, detecção automática" (Google); **testei** PT+EN na mesma fala (correto 3/3) | idem | idem | não documentado; **1 relato** de melhora em nomes PT (fraco) | "12 vozes novas"; **1 relato** de sotaque irregular em francês | voz de saída Azure multilíngue (declara mistura) | **voz poliglota**, troca na mesma frase (AWS) [27] |
| Function calling | **assíncrono por padrão** (`NON_BLOCKING`) — **testei** [4] | **só** assíncrono; bloqueante dá erro | **só sequencial**: não fala até receber a resposta | sim; 1 relato de falha no `mini` 2.1 (SIP) | sim, por **delegação** a modelo de trás; relatos de delegação que não dispara | sim | sim, assíncrono |
| Prompt longo | **testei** 2.817 palavras: regra de idioma 9/9 (A2 e B1) | — | — | sem dado | sem dado | sem dado | sem dado |
| Limite de sessão / continuar | áudio **15 min**; conexão ~10 min; **resumption** (handle válido 2 h) + **compressão de contexto** + aviso `GoAway` [10] | idem | idem | **60 min** [15] | não documentado | não lido | **conexão 8 min**; renovação com padrão de código [27] |
| Contexto | 131 k entrada [5] | 131 k | 131 k | 128 k (fonte de terceiro) | não documentado | — | 1 M (fonte fraca) |
| Preço | áudio in **US$ 3**/M, out **12**/M, texto in 0,75, texto out 4,50 [2] ≈ 25 tok/s (**medi 24,8**) | idem (**linha única** na página) | **idem** (mesma linha; ver seção 7) | áudio in **32** (cache 0,40) / out **64**; texto 4 [16] | **US$ 0,05/min** só a voz + modelo de trás [17] | por token, 3 camadas (Pro/Standard/Lite) [22] | fala in **3** / out **12** por M (**só busca, não abri a página oficial**) |
| Cota grátis | **Sim** (testei); usa o conteúdo p/ melhorar produtos, com revisor humano [12] | sim (mesma linha de preço) | sim | **não** | **não** ("free tier: unsupported") [18] | não | não |
| Dado / idade | 🔴 **18+; proíbe app "dirigido a / com probabilidade de acesso por menores de 18"** — **também no Google Cloud** [12][13] | idem | idem | **13+, menor de 18 com permissão dos pais**; API **não treina por padrão**; logs de abuso 30 dias; realtime **sem retenção de estado** [19][20] | idem OpenAI | termos Microsoft; PA e STT em tempo real **"não retém nem armazena"** [24] | Bedrock **não treina**, não guarda prompt; watermark no áudio [26] |

**Outros relevantes (leitura, não testei):**

| | O que é | Por que entra ou sai |
|---|---|---|
| **Ultravox v0.7** | open weights (GLM 4.6), **US$ 0,05/min**, tool calling melhorado [28] | **Sem dado de PT nem de mistura**; não testado. Candidato de reserva, não de primeira linha |
| **Grok Voice Think Fast 2.0** | AA: TTFA **0,70 s** (o mais rápido), índice 81,3, agentic 56,5% [35]; US$ 0,05–0,08/min (busca) | Sem dado de PT-BR nem de política de menor que eu tenha lido. **Não avaliado a fundo** |
| **Qwen Audio 3.0 Realtime (Alibaba)** | AA: 99% raciocínio em fala, TTFA 1,54 s [35] | Nuvem da Alibaba (China); política de dado de menor é pior caso que a do DeepSeek. **Fora** |
| **Moshi / Kyutai** | ~200 ms, código aberto | **Só inglês e sem ferramentas** (revisão de terceiro) — **fora** |
| **Nova 2 Sonic** | acima | **Regiões: N. Virginia, Oregon e Tóquio; São Paulo não** [AWS blog]. Sem controle de tom, sotaque nem velocidade [26]. 8 min de conexão |

**Qualidade da voz em PT-BR e em inglês: não tenho medição independente de nenhum deles.** Não ouvi
as vozes (não tenho canal de áudio). O único dado que a casa tem é prático: o CEO usa a voz `Charon`
da Live API em `voz/` desde agosto — a reclamação dele foi da voz do *navegador*, não da do Gemini.
**Só o ouvido do CEO decide**; seção 5 traz como ouvi-la hoje.

**Regressão conhecida do 3.8:** o `language_code`/sotaque não é mais respeitado como no 3.1 (relato no
fórum oficial em 27/09/2026, sem resposta do Google) [36]. Para um professor que precisa de inglês
americano limpo, isso é um risco a observar, **não medi**.

---

## 2. Um modelo só dá conta do professor inteiro?

**Testes com `gemini-3.8-live`, chave da casa, tier gratuito, 30/09/2026.** Áudios do aluno sintetizados
(SAPI: "Zira" en-US e "Maria" pt-BR — ver limites na seção 5). Sistema de ~2.800 palavras = persona + perfil
inventado (Pedro, 14, A2) + regra de idioma por nível + estilo + ferramentas + plano de aula de 20 passos.

| Exigência do CEO | Resultado | n |
|---|---|---|
| **Seguir prompt pedagógico longo** | Obedeceu regra de tamanho, estilo e persona. Chamou o aluno de "Pedro" sem ser lembrada | todas as sessões |
| **Regra de idioma por nível: A2** (mais inglês; PT só para explicar) | Explicou em português e acrescentou "In English, we call it…" — dentro da regra | **3/3** |
| **Regra de idioma por nível: B1** (só inglês; PT → pedir que tente em inglês) | Respondeu **em inglês e pediu que o aluno tentasse em inglês**; nenhuma resposta em PT | **3/3** (prompt curto) + **3/3** (prompt de 2.817 palavras) |
| **Fala mista PT/EN** | Transcreveu certo "como se diz cachorro-quente em inglês" e respondeu em inglês ("You say hot dog") por ser A2 | 2/3 — **1 sessão não respondeu nada** (áudio 0 s) |
| **Ferramenta no meio da fala, sem travar** | Chamou `get_words_due` e `get_current_lesson`; falou **os dados certos** (borrow, lend, schedule; "At the coffee shop"). Em 12 de 16 turnos disse "Let me check…" **antes** do resultado | 16 turnos |
| **Latência com ferramenta** | 1º áudio: mediana **0,94 s**; do resultado da ferramenta até a fala: mediana **1,42 s** (p90 1,59 s). Ferramenta simulada com 1,5 s | n=16 / n=12 |
| **Cumprir "enquanto roda, fale algo"** | **Não é garantido:** quando a ferramenta chamava outro LLM (seção 3), o modelo ficou **mudo** nos 2 turnos | 2/2 |

**Onde falha — o que vi e o que li:**

1. 🔴 **Travada de ~25 s em 2 de ~16 turnos com ferramenta** (1ª sessão: primeiro áudio aos 27,5 s e
   aos 26,6 s). Não reproduzi em 8 sessões seguintes (hipótese "1º turno com ferramenta" **refutada**:
   4/4 sem travada). Causa desconhecida. Um professor real precisa de **timeout e "ainda está aí?"**.
2. 🔴 **Uma sessão sem resposta nenhuma a um turno** (áudio 0 s). Hipótese (**não testada**): o 3.8 vem
   com *proactive audio* **sempre ligado** e sem *affective dialog* (doc oficial) — o modelo pode
   "decidir não responder" [5][4].
3. **Erro do reconhecimento por sotaque:** "borrow" dito por voz pt-BR virou "boro"; nas 3 sessões A2
   o modelo **explicou o elemento químico boro**. Nas sessões com o plano de aula no prompt acertou o
   contexto em 2/3 ("borrow"; "to go" em 1). **O professor precisa do vocabulário-alvo da aula no
   prompt** para desambiguar. Áudio sintético, mas o erro é o que um aluno iniciante provoca.
4. **Execução agêntica é fraca no modelo base:** AA "Agentic" do 3.8 Live **30,1%** contra **68,6%** da
   versão Extended Thinking e 59–68% do GPT-Live-1 [35]. Para "decidir o próximo passo do plano",
   não "buscar um dado", o modelo base não é o lugar.
5. **`3.8-live-extended-thinking` não serviu no meu teste:** exige `thinkingLevel` (erro 1007 sem ele);
   em `high`, **3 de 4** respostas foram a frase "ocorreu um erro de sistema e não posso avaliar" (fala
   e nada mais); em `low`, 2 de 4 deram veredito. **Não uso como base de recomendação**; o resultado da
   AA (82,6) não se reproduziu aqui — possível erro meu de harness (o modelo responde depois do
   `turnComplete`; esperei 20 s) **ou** instabilidade do serviço: **não sei qual**.
6. **Cota:** 6 sessões em paralelo devolveram **1011 "exceeded your current quota"** em 1 delas. Teto de
   sessões simultâneas do tier gratuito: **não lido** (o painel exige login).

**Conclusão da seção:** **sim, um modelo só dá conta do que o CEO descreveu** (prompt longo, dados por
ferramenta, regra de idioma por nível) — com duas ressalvas: a **pronúncia** (seção 4) e a **confiabilidade
sob falha** (travadas, turno sem resposta), que é engenharia de timeout, não de modelo.

---

## 3. Duas LLMs — padrões reais, custo e quando compensa

| Padrão | Fonte | Como funciona | Nota |
|---|---|---|---|
| **Delegação nativa do modelo de voz** | GPT-Live-1 (OpenAI, 10/09/2026) [17] | A voz decide falar/esperar/interromper e **delega raciocínio e ferramentas a um "modelo de trás"** (Astra, Luna, "ou um modelo de terceiros"); resposta volta por `session.commentary.append` com `delegation_id` | **US$ 0,05/min só a voz**. Relatos da comunidade [19]: a delegação **não dispara de forma confiável**, `response.done.output` vem vazio, sem `session.update`; "qualidade irregular em sessões longas". Produto com 20 dias |
| **Chat + supervisor** | repositório `openai/openai-realtime-agents` | Modelo realtime conversa; modelo de texto mais esperto (ex.: gpt-4.1) faz ferramentas e respostas difíceis | "pequeno aumento de latência" (repositório) |
| **Talker + reasoner** | ConvFill, UW, jul/2026 [32] | Modelo pequeno fala na hora e preenche; o grande raciocina em paralelo e o pequeno integra | TTFR **478–976 ms**; acurácia do talker **0–6,3%** do reasoner em QA; **só inglês**, n=18 usuários; **não avaliou timeout do reasoner** |
| **Raciocínio "por dentro"** | Gemini 3.8 Live Extended Thinking [9] | Mesma API; raciocínio em segundo plano e ferramentas assíncronas | Você acompanha `interaction_status`; AA: 68,6% agentic. **Instável no meu teste** |
| **A casa, em `voz/`** | `conversa.mjs` + `conversa.log` (ago/2026) | Gemini ouve e fala; o Claude Code (CLI) pensa | O "cérebro" levou **8 s, 21 s e 103 s** por resposta; a "boca" (TTS) leva +**1,1–1,5 s** até o 1º áudio (mediana 1,47 s, n=47). Funcionou porque o CEO aceitava espera; **para aula não serve**. Dois mecanismos que a casa já provou: o canal de escuta responde "ok" e o "ok" é jogado fora; e a Live API **recusa novo input enquanto gera** (laço "já há uma resposta em andamento — tento de novo em 700 ms") |

### O que medi: Gemini fala + DeepSeek pensa, por ferramenta

`consult_teacher_brain(question)` → DeepSeek `deepseek-flash`, **raciocínio desligado**, resposta de ≤2 frases,
com perfil inventado do aluno no prompt dele.

| Medida | Valor |
|---|---|
| DeepSeek, ida e volta | **0,88 s e 1,03 s** (2 chamadas; status 200) |
| Fim da fala → chamada da ferramenta | 0,55 s |
| Resposta da ferramenta → 1º áudio | 0,78 s |
| **Fim da fala → 1ª palavra de conteúdo** | **≈ 2,2 s** (turno PT, limpo). O modelo **não** falou antes da ferramenta nos 2 turnos |
| 1ª sessão | **27,5 s** até o 1º áudio (a travada da seção 2) |
| Fidelidade | O Gemini falou a resposta do DeepSeek **quase palavra por palavra** ("We say I lent my friend a book because you gave the book…") |
| Custo do lado do cérebro | ≈ **US$ 0,01/h** (30 delegações/h; preço DeepSeek de pico) — desprezível |

**Quando compensa (análise minha, apoiada nos números acima):**

| Se… | …então |
|---|---|
| O que o professor precisa da "outra cabeça" é **dado do aluno** (lição, palavras, progresso) | **Não compensa LLM de trás.** Ferramenta de leitura no banco (`get_words_due`, `get_current_lesson`): ~0,1 s de banco, sem segundo LLM. Medi: fala o dado certo |
| A decisão é **pedagógica** (qual o próximo passo, como explicar um erro) | **Faça fora do laço:** um LLM monta o **briefing da aula** *antes* (lição, palavras, erros recorrentes, passo atual → entra no system prompt) e resume *depois* (atualiza memória). É o desenho do DR de contexto, e **tira o 2º LLM do tempo real** |
| Precisa decidir **no meio da fala** algo que o briefing não previu | Aí sim um cérebro por ferramenta — com LLM rápido sem raciocínio (DeepSeek ≈ 1 s), **filler forçado no prompt** e **timeout**. Custa ≈ +1 s e silêncio se o modelo não preencher |
| A política de dado proíbe mandar texto do aluno a um fornecedor | O cérebro **só recebe texto** (nunca áudio): use um provedor ocidental que sirva os pesos abertos (DR 30/09 manhã, seção 3) |

**O DeepSeek continua válido como cérebro, e ganha na comparação de custo** (≈ US$ 0,01/h contra a voz
a US$ 1,9–3,3/h) — **mas o custo dele nunca foi o problema**; o que decide é a latência extra e a
política de dado. Ele **não** ganha como voz (não tem áudio).

---

## 4. Pronúncia — "acertou o som ou não"

### 4.1 O que um modelo de voz nativa faz (evidência publicada + o que testei)

| Fonte | Modelo | Resultado |
|---|---|---|
| Lei et al. (Microsoft), **arXiv 2503.11229** [29] | `gpt-4o-realtime-preview` (**12/2024**, já velho) em Speechocean762 (250 chineses) | PCC com humanos: **fonema 0,241; palavra 0,24–0,28; frase 0,445–0,502**; **41–48% das respostas incompletas**. Baseline dedicado (3MH): 0,69 / 0,69 / 0,81. "**Combinar com o Azure PA melhora ambos**" (utilidade do feedback e correlação) |
| arXiv **2502.09940** [30] | GPT-4o Voice Mode | "Supera Whisper-LLaMA e a maioria dos LALMs" em tarefas de sotaque/prosódia — **pairwise/pointwise genérico**, sem comparação com humano nem nível de fonema. Exploração preliminar |
| Parikh et al., **arXiv 2606.09470** (06/2026) [31] | SpeechLLM **fine-tunado** | Competitivo com Azure PA no nível de frase e melhor que LLMs genéricos em detalhe fino; **"abordagens baseadas em GOP ainda são melhores no nível de fonema"** (resumo; não li o PDF inteiro) |
| Android Police, 17/09/2026 [37] | Gemini Live | O modo de voz **perdoava** o erro por usar transcrição; hoje "consegue analisar o áudio se você perguntar", mas **não detecta erro por conta própria** (relato de usuário, tagalo) |
| **Meu teste** (30/09/2026, `gemini-3.8-live`) | ver 4.2 | |

### 4.2 O que eu testei (frase-alvo: *"I think the weather is very nice today, and my brother likes hot dogs."*)

Dois áudios sintéticos: **A = "Zira" (en-US, deveria estar correto)** e **B = "Maria" (pt-BR lendo o texto em inglês = sotaque brasileiro pesado,
"falha óbvia")**. O reconhecimento já acusou a diferença: o B foi transcrito "**If the** weather…" contra "I think the weather…".

| Modo | Áudio A (correto) | Áudio B (sotaque pesado) |
|---|---|---|
| **Conversa** (persona de professora; depois "minha pronúncia estava certa?") | "muito clara", elogiou **3/3** | "muito clara, não ouvi erros" **2/3**; recusou a 3ª |
| **Juiz com lista de sons no prompt** (minha 1ª versão) | CORRECT 2 de 5 vereditos | INCORRECT 5 de 5 vereditos |
| **Juiz limpo** (só "CORRECT/INCORRECT, nomeie as palavras", com a frase-alvo; 4 por condição) | **CORRECT 4/4** | **INCORRECT 4/4**; nomeou "think" em 4/4 e "weather" em 1/4 |

🔴 **Armadilha que eu mesmo caí:** na 1ª versão listei no prompt os sons "th, v, h…". As respostas
repetiram exatamente esses sons, **inclusive para o áudio correto** (falso positivo). **Detalhe de
fonema vindo do modelo pode ser eco do prompt.** Só a versão "limpa" vale.

**Leitura:** o modelo **distingue erro grosseiro quando recebe o papel de examinador e a frase-alvo** (8/8),
mas (a) **não percebe por conta própria** dentro da conversa, (b) o que ele aponta é **palavra, não fonema**,
(c) a resposta é sensível ao prompt (sem instrução pede "muito clara"; com instrução de rigor vira "INCORRECT" para tudo).
**Limites:** n=4 por condição; **voz sintética**, não aprendiz real; **erro óbvio**, não o sutil que dá trabalho ao
professor (th/d, vogal curta/longa); nenhum adulto ou criança de verdade. **Não generalize.**

### 4.3 Dedicado × voz nativa

| | Dá "certo/errado" **por palavra**? | Fonema? | Fala livre? | Streaming junto da conversa? | Custo |
|---|---|---|---|---|---|
| **Azure Pronunciation Assessment** | **Sim**: `ErrorType = Mispronunciation` por palavra + `AccuracyScore` por palavra/fonema/sílaba (IPA) [25] | Sim (sílaba só en-US) | **Sim** (sem referência, en-US; a doc manda, para texto confiável, **primeiro Azure STT e depois avaliação com referência**) | **Sim**: SDK de navegador; **token de 10 min emitido pelo servidor** | = STT padrão (**US$ 1,00/h**) + complemento de prosódia (DR anterior, seção 5) |
| **ELSA API** | palavra/fonema | Sim | Sim | WebSocket | **US$ 0,02 por 15 s** em fala livre (DR anterior) |
| **SpeechSuper / Speechace / Language Confidence** | sim / sim (Premium) / sim | sim | sim | sem streaming declarado | ver DR anterior |
| **Modelo de voz nativa** | **Só palavra, só sob encomenda, erro óbvio** | Não confiável | Sim | Sim (é a mesma conversa) | ≈ 0 extra |

**Encaixe do dedicado em paralelo à conversa, em cada arquitetura** (inferência minha, não implementada):

| Arquitetura | Como |
|---|---|
| **Voz nativa (Gemini/OpenAI/Azure Voice Live)** | O navegador já captura o microfone: **abre um 2º fluxo** do mesmo PCM para o **Speech SDK do Azure** (`SpeechRecognizer` com `PronunciationAssessmentConfig`, `en-US`, fala livre). Só os trechos em inglês (o roteador "este turno é EN" sai da transcrição da voz nativa). O resultado volta como JSON e vira **ferramenta/contexto** ("última nota") ou só tela. **Nenhuma** das APIs de voz nativa expõe PA — `Voice Live` também não [23] |
| **Duas LLMs** | Idêntico, e o cérebro recebe a nota para explicar o erro |
| **Cascata** | O mesmo áudio que vai ao STT vai ao PA; é o desenho do DR anterior |

**Limites que valem para qualquer dedicado** (doc Azure [24]): **não avalia idiomas misturados**, **um só falante**,
áudio ≥ 16 kHz, compara com "falantes nativos em condições gerais" (**sem modelo para sotaque de quem fala português**), e
orienta **limiar mais brando para criança**. **Não achei avaliação que trate brasileiro falando inglês.**

**Qual dá "deu certo ou não" por palavra, hoje:** Azure PA (já documentado, SDK de navegador, na casa há Azure Translator mas **não há chave de Speech** — é pedido ao CEO). Para **exercício com frase-alvo** dá o "certo/errado" mais
confiável; para **fala livre**, segue a orientação da Microsoft (STT, depois referência).

---

## 5. Validação com cota gratuita — o protótipo mais curto, e o que testei

### 5.1 Protótipo (esta semana, US$ 0, dado inventado)

| Peça | Escolha | Por quê |
|---|---|---|
| **Modelo** | **`gemini-3.8-live`** | Grátis na chave da casa (**testado**); GA; ferramenta assíncrona; TTFA 1,1 s medido; voz já conhecida do CEO |
| **Transporte** | **Navegador → Google direto, com token efêmero emitido por uma rota do Next.js** | **Testado hoje:** `POST v1alpha/auth_tokens` com `bidiGenerateContentSetup` (sistema + ferramentas **travados no token**) e `WebSocket …BidiGenerateContentConstrained?access_token=…` → `setupComplete`, conversa e ferramenta funcionando. **Sem ponte, sem servidor de WebSocket.** A casa tinha registrado "recusado" em 05/08 — hoje **funciona** (caminho e versão diferentes do que a casa tentou) |
| **Ferramentas** | `get_current_lesson`, `get_words_due` (somente leitura, dado inventado), executadas pelo cliente contra rotas do Next | Medi: fala o dado certo |
| **Briefing no prompt** | Perfil, vocabulário-alvo e passo do plano **no system prompt** (o teste do "boro" mostra que faz falta) | seção 2 |
| **Sessão longa** | `contextWindowCompression` + `sessionResumption` + tratar `GoAway` (15 min só áudio; conexão ~10 min) | doc [10]; **não exercitei** |
| **Pronúncia** | No protótipo, **só o modo "examinador + frase-alvo"** num exercício; **sem** prometer fonema | seção 4 |
| **Quem ouve** | **Só adulto (CEO), dado inventado.** Tier gratuito **usa o conteúdo para melhorar o produto e tem revisor humano**; os termos do Gemini proíbem aplicação "com probabilidade de acesso por menor" | [12][13] |

`src/app/api/professor/live` e `src/lib/professor/audio-live.ts` já existem no repositório do app (não abri o conteúdo
além do cabeçalho do `audio-live.ts`: captura PCM 16 kHz, toca 24 kHz). **É o mesmo desenho.**

### 5.2 O que **testei** e o que só **li**

| Item | Status | Detalhe |
|---|---|---|
| Live API `gemini-3.8-live` conecta e responde no tier gratuito | **Testado** | `setupComplete` em 215–292 ms; ~60 sessões |
| Latência do 1º áudio (modelo 3.8) | **Testado** | sem ferramenta: mediana **1,12 s**, p90 1,43 s, máx 7,3 s (n=47); **inclui a espera do detector de fim de fala do servidor**. Medi do último pedaço de áudio enviado, áudio em tempo real |
| Latência do 3.1 Flash Live | **Testado (n=4)** | mediana 0,93 s |
| Function calling no meio da fala | **Testado** | 16 turnos; dado correto; 2 chamadas em paralelo e sequenciais observadas |
| Travada ~25 s | **Testado, 2 de ~16** | não reproduzida depois |
| Fala mista PT/EN | **Testado** | transcrição e resposta certas; **1 turno sem resposta** |
| Regra de idioma A2/B1 | **Testado** | 3/3 (A2) e 6/6 (B1, incl. prompt de 2.817 palavras) |
| Erro de pronúncia óbvio | **Testado** | seção 4.2 |
| DeepSeek como cérebro por ferramenta | **Testado (n=2)** | seção 3 |
| Token efêmero com sistema+ferramenta travados | **Testado** | `bidiGenerateContentSetup` (v1alpha) aceito; o campo `liveConnectConstraints` **que a doc cita** foi **rejeitado** ("Unknown name") nos dois versões. **Não testei** se o cliente consegue sobrescrever o sistema travado |
| Extended Thinking | **Testado, instável** | seção 2, item 5 |
| Sessão de 15 min, resumption, GoAway, compressão | **Só li** | doc oficial [10] |
| OpenAI `gpt-realtime-2.1`, `GPT-Live-1`, Azure Voice Live, Nova 2 Sonic | **Só li** | a chave OpenAI da casa não tem realtime nem live; Azure e AWS sem chave |
| PT-BR de cada voz | **Não avaliei** | sem áudio/ouvido |
| Azure PA, ELSA | **Não rodei** | sem chave de Speech |
| Aluno real (criança/adulto com sotaque real) | **Não testei** | áudios sintéticos (SAPI "Zira" e "Maria") |

**Comandos para o CEO ouvir hoje, sem código novo:** a página `voz/conversa.html` da casa usa `gemini-3.1-flash-live-preview`
(legado); trocar para `gemini-3.8-live` é uma linha. **Isto é do `assessor-de-integracoes`**, ver "achados fora do escopo".

---

## 6. Recomendação

### 6.1 Validar agora

**Gemini 3.8 Live, voz nativa única, ferramentas de leitura, briefing no prompt, token efêmero, dado inventado.**
Critério de aceite para o CEO ouvir: (1) a voz em PT-BR e em inglês é aceitável; (2) a troca de idioma por nível
funciona na conversa dele; (3) "Let me check…" antes de ferramenta; (4) aguenta 10 min sem travada.
**Custo: US$ 0.**

### 6.2 Produção (família, possível menor)

**Arquitetura (a que o teste sustenta):**

```
Navegador ──PCM──▶ [A] modelo de voz nativa ◀──ferramentas de leitura──▶ Supabase (aluno, aula, Anki)
    │                     ▲ system prompt = persona + regra de idioma + briefing da aula (montado por LLM ANTES)
    └──PCM (só EN)──▶ [B] Azure Pronunciation Assessment ──JSON──▶ tela + contexto ("última nota")
Depois da aula: LLM (DeepSeek ou outro) resume e atualiza memória/progresso  ◀── transcrição
```

**O que muda entre validação e produção:**

| | **Validação** | **Produção** |
|---|---|---|
| Provedor de voz | Gemini 3.8 Live | **Atrás de um adaptador.** Candidatos: **OpenAI** (`GPT-Live-1` ou `gpt-realtime-2.1`) ou **Azure Voice Live** — **os termos não barram menor** (13+, menor de 18 com permissão dos pais) |
| Faturamento / dado | grátis; dado **inventado** | pago, sem treino; `gpt-realtime-2.1-datazone` no Azure mantém o dado na região |
| Pronúncia | "examinador" na própria conversa | **Azure PA em paralelo** (precisa chave de Speech) |
| Sessão longa | não exercitada | `resumption`/compressão (Google) ou 60 min (OpenAI); **estado da aula no banco** e re-injetado |
| Cérebro | briefing fixo | LLM monta briefing e resume; **nunca** envia áudio |
| Política | — | sem salvar áudio; transcrição sob retenção curta (decisão jurídica, **fora daqui**) |

**Custo por hora** (script: `2026-09-30-voz-professor-arquitetura-custo-por-hora.py`; cenário: aluno fala 20 min/h, professor 25 min/h,
janela de compressão de 16 k; **hipóteses minhas**):

| Arquitetura | 40 turnos/h | 120 turnos/h |
|---|---|---|
| **Gemini 3.8 Live**, com compressão (janela de **16 mil** tokens; com janela de 2,5–4 mil cai para US$ 0,7–1,0/h — seção 7) | US$ 1,87 | US$ 4,57 |
| **Gemini 3.8 Live**, sem compressão | US$ 4,51 | US$ 12,66 |
| **gpt-realtime-2.1**, histórico em **cache** (otimista) | US$ 2,64 | US$ 3,34 |
| **gpt-realtime-2.1**, **sem cache** (pessimista) | US$ 28,63 | US$ 82,63 |
| **GPT-Live-1** (US$ 0,05/min) + DeepSeek atrás | **US$ 3,01** | **US$ 3,01** |
| **Cascata** (Deepgram multi + DeepSeek + Azure TTS + Azure PA), DR anterior | ≈ 0,76–0,87 (mic aberto ≈ 1,0–1,1) | — |
| AA, "custo por hora de entrada" (método da AA, não conferido) | 3.8 Live **0,84** · GPT-Live-1 **4,47–5,83** · realtime-2.1 **10,75** | |

⚠️ **Por que a conta não é "tokens/s × preço":** nos modelos de voz nativa **o contexto inteiro é
re-cobrado a cada turno** (Google: "a API cobra por turno todos os tokens presentes na janela de contexto da sessão"
[11]; medi o contexto crescendo de 320 → 631 → 887 tokens de áudio em 3 turnos). **Quem manda é a compressão (Google) ou o
acerto de cache (OpenAI)** — e **não sei a taxa real de cache da OpenAI** para realtime. **GPT-Live-1 é o mais previsível
(US$ 0,05/min, por segundo), sem dependência de cache.**

**Para uma família de ~10 h/mês:** US$ 19–46/mês (Gemini, pago) · US$ 26–33/mês (OpenAI, cache otimista) · US$ 30/mês
(GPT-Live-1) · US$ 8–13/mês (cascata). **A diferença entre arquiteturas é de dezenas de dólares por mês;
a de qualidade de voz e de turno é o que o CEO sente.**

**Por que não cascata como produção principal:** (1) latência estimada de voz-a-voz **1,6–3,0 s** contra **~1,1 s medido** na
voz nativa (AA: cascata não tem duplex); (2) mais peças (STT + TTS + framework); (3) a fala mista PT/EN no STT não tem
solução provada (DR anterior); (4) **a cascata dá controle de dado e de idioma** — por isso é o **plano B** se a voz nativa
falhar no ouvido da família, **ou** se nenhum dos provedores nativos passar na política.

**Por que não duas LLMs em tempo real como padrão:** seção 3 — custa +1 s e silêncio, e o que o professor precisa em tempo real
(dado do aluno) é leitura de banco, não raciocínio.

### 6.3 O que o CEO decide (o que não é meu)

1. **Pagar uma conta** (Google, OpenAI ou Azure) para passar de "dado inventado" a "dado da família". O que ela desbloqueia: o pago do Google
   não usa o conteúdo — **mas os termos do Google proíbem o app com menor**, então o pago do Google não resolve.
2. **Chave de Speech da Azure** (pronúncia por palavra).
3. **Chave OpenAI com Realtime/Live** (a da casa é projeto restrito; `GPT-Live-1` não tem cota gratuita).

---

## 7. Complemento — preço do Gemini 3.1 Flash Live e o custo de uma aula

**Por que existe:** depois do DR gravado, o dev informou que o CEO escolheu o `gemini-3.1-flash-live-preview`
como professor inteiro e pediu o preço **de saída**, a regra de cobrança e o custo de uma aula. O **DR de
05/08** ([superfície da API Gemini](2026-08-05-superficie-completa-api-gemini-ai-studio.md), linha 349) deixou a **saída em "—"** para
esse modelo: era lacuna minha da época, **fechada aqui**.

### 7.1 As quatro perguntas, na fonte oficial, datadas

| Pergunta | Resposta | Fonte e data |
|---|---|---|
| **(1) Preço de saída de áudio do 3.1 Flash Live** | **US$ 12,00 por 1 M de tokens** (página: "ou US$ 0,018/min"). Saída de texto US$ 4,50/M. **A página tem uma linha só** para `gemini-3.8-live`, `…-extended-thinking` e `gemini-3.1-flash-live-preview`: entrada texto **0,75**, áudio **3,00** (página: "ou US$ 0,005/min"), imagem/vídeo **1,00**. **Tier gratuito: grátis; usa o conteúdo para melhorar os produtos** (no pago, não) | Página de preços, **30/09/2026**, lida no HTML cru [2] |
| **(2) A cobrança é pelo contexto recobrado a cada turno? Há cache?** | **Sim, é.** "A API cobra por turno **todos** os tokens presentes na janela de contexto da sessão"; o passado "é reprocessado e contado em cada novo turno, até o tamanho da janela configurado"; o **áudio acumulado é cobrado à tarifa de entrada de áudio a cada turno**. Com **transcrição** ligada (`inputAudioTranscription`/`outputAudioTranscription`), os tokens de texto gerados pela transcrição são cobrados **à tarifa de saída de texto (US$ 4,50/M), além** do áudio. **Cache: não.** As páginas dos modelos dizem "Caching: não suportado" (3.1 e 3.8); a linha de preço da Live **não tem preço de cache** (a de `gemini-3.5-flash-lite`, na mesma página, tem US$ 0,03); e o `usageMetadata` que recebi em 34 turnos no 3.1 **não traz campo de cache** (só contagem de entrada/saída por modalidade). O dev mediu o mesmo crescimento: 1.579 → 4.157 em 7 turnos | Best practices, **atualizado 15/09/2026** [11]; páginas dos modelos [3][5]; **teste meu, 30/09/2026**. **Não conferi numa fatura** (tier gratuito, não cobra) |
| **(3) O que é o "US$ 0,005/min" e quando vale** | **É conversão de conveniência do preço por token do ÁUDIO, a 25 tokens por segundo**: 3,00 US$/M × 1.500 tokens/min = **US$ 0,0045** (a página arredonda para 0,005); a saída: 12,00 × 1.500 = **US$ 0,018 exato**. (A página diz isso por extenso nas linhas de Translate/Transcribe — "25 tokens por segundo"; na linha da Live, **a conversão é minha**, pela aritmética.) **Vale para o áudio NOVO**: um minuto de fala enviada. **Não é o custo de um minuto de aula**: não inclui o contexto recobrado. Na aula de 15 min do item (4), o "0,005/min" sobre a fala do aluno (4,4 min) prevê **US$ 0,02**; a entrada real de áudio é **US$ 0,64 — ≈ 30×** | [2][11] + conta no script |
| **(4) Custo de uma aula de 15 min (33 turnos)** | Tabela 7.2 | Script `…custo-por-hora.py`, função `aula_live` |

**Duas regras do mesmo parágrafo de cobrança que mudam a conta (Google, 15/09/2026):**
- **3.1 Flash Live: sem *proactive audio*; "a API cobra áudio só quando você transmite a entrada ativamente".** O professor que liga o microfone só quando o aluno fala (ou que o detector do navegador só envia a fala) paga menos.
- **3.8 Live: *proactive audio* permanentemente ligado → cobra a entrada "o tempo todo em que está ouvindo".** Microfone aberto na sessão inteira = **+US$ 0,27/h** (25 tok/s × 3.600 s × US$ 3/M; US$ 0,07 por aula de 15 min), além do resto. **Migrar do 3.1 para o 3.8 muda a conta de entrada.**

### 7.2 Custo de uma aula de 15 min (paga; no tier gratuito é US$ 0)

**Parâmetros (medidos pelo dev em 30/09/2026, 7 turnos, 5 ferramentas):** texto fixo **~1.300 tokens** (sistema + 383 das
5 ferramentas), **+43 de texto por turno** (transcrição), áudio de contexto **+387 por turno** (fala do aluno + resposta do modelo; o 1º turno, 279), **saída de
áudio 190 tokens/turno**. **6 chamadas de ferramenta por aula** (hipótese minha); cada uma **relê o contexto uma vez a mais** (o dev viu 3.168 contra 1.521).
**Os cenários com compressão são piso (cerca de 5–10% baixos):** o modelo comprime no turno em que passa o gatilho, e na prática a queda vem 1–2 turnos depois. O modelo reproduz a série do dev com **≤ 3%** de diferença (turno 1: 1.622 × 1.579; turno 7: 4.202 × 4.157) — **isso é coerência,
não verificação independente**, porque os parâmetros vêm dessa série.

| Cenário | **US$ por aula (33 turnos)** | US$/h equivalente (×4) | Contexto máximo cobrado |
|---|---|---|---|
| **Sem compressão** (o que você tem hoje) | **0,90** | 3,61 | 15.382 tokens |
| Sem nenhuma ferramenta (piso do anterior) | 0,77 | 3,09 | 15.382 |
| Compressão: gatilho **4.000** → alvo 2.000 | **0,25** | 1,00 | 3.966 |
| Compressão: gatilho **3.000** → alvo 1.800 (agressiva) | **0,19** | 0,74 | 2.934 |
| Compressão: gatilho **2.500** → alvo 1.600 (muito agressiva) | **0,16** | 0,66 | 2.719 |
| **Reiniciar a sessão a cada 8 turnos** com resumo de 400 tokens de texto | **0,33** | 1,31 | 5.140 |
| Reiniciar a cada 5 turnos | **0,27** | 1,06 | 3.850 |

**Composição do "sem compressão" (US$ 0,90):** entrada de áudio acumulada **0,64** · entrada de texto 0,05 · saída de áudio 0,075 · transcrição 0,006
· releitura das 6 ferramentas ≈ 0,13. **O que custa é o áudio do passado relido.** **Comparação:** a cascata do DR anterior (≈ US$ 0,76–0,87/h) e o
GPT-Live-1 (US$ 3,00/h) — **com compressão agressiva, o Gemini fica no patamar da cascata e abaixo do GPT-Live-1.**

### 7.3 O que a compressão e o reinício custam em qualidade — e o que testei

| | Compressão de contexto (`contextWindowCompression`) | Reiniciar a sessão com resumo em texto |
|---|---|---|
| **Como funciona** | Ao passar o gatilho, a API **descarta os tokens mais antigos** (janela deslizante) e cobra o que ficou + o turno novo [11] | Você fecha o WebSocket **entre turnos** e abre outro com o sistema + um resumo em texto do que aconteceu |
| **Testei?** | **Sim** (3.1 Flash Live, 30/09/2026): gatilho **2.000** / alvo **1.200** → a entrada foi de **2.523 para 1.417** tokens (a queda veio **1–2 turnos depois** de cruzar o gatilho, não no mesmo). O **texto do sistema ficou** (≥ 593 de texto depois, com o prompt de ~510); foi o áudio antigo que saiu. A conversa continuou coerente nos 4 turnos seguintes (leitura minha, sem critério) | **Não** testei; o custo é cálculo. O `setup` leva **215–292 ms** (medido), então a troca **entre turnos** é quase sem pausa |
| **O que se perde** | Os **primeiros turnos da aula** (áudio) — o professor "esquece" o que foi dito há 10 turnos. **Tudo o que precisa persistir tem de estar em texto**: sistema, briefing, **estado da aula numa ferramenta**. O dev já tem isso (lição atual, palavras, plano) | **O áudio anterior inteiro**: o modelo deixa de "ouvir" a pronúncia de antes. O resumo vem das **transcrições** (já ligadas). Um LLM de texto resume por ≈ US$ 0,001 (conta minha, DeepSeek). **Perde nuance acústica e depende da qualidade do resumo** |
| **Quando prefiro** | **Como padrão.** É a configuração oficial, sem código de costura | Se a compressão se mostrar instável, ou se quiser **controlar exatamente** o que o professor lembra (ex.: injetar um resumo curado pelo cérebro pedagógico) |
| **Não confundir** | **`sessionResumption` não reduz custo**: ele restaura o contexto após queda de conexão [10]. O que reduz é a compressão ou o reinício | |

### 7.4 O que isso muda para quem escolheu o 3.1

1. **O 3.1 Flash Live é "legado": o Google recomenda o 3.8 Live** [3][5]; **o preço é o mesmo** (linha única). Migrar é trocar o nome do modelo, **mas** o 3.8 traz *proactive audio*
   sempre ligado (entrada cobrada o tempo todo, e o modelo **pode decidir não responder** — vi 1 turno sem resposta), ferramenta assíncrona (melhor) e a **regressão de sotaque**
   relatada em 27/09 [36]. O 3.1 tem ferramenta **sequencial**: o modelo não fala enquanto a ferramenta não responde (seção 1). **Preview pode mudar ou sair do ar sem prazo que eu tenha lido.**
2. **A alavanca de custo é a janela de compressão, não o modelo.** 15 min custam de **US$ 0,90 (sem nada) a US$ 0,16 (muito agressiva)** — um fator de **~5,5×** —, e a voz não muda.
3. **Continua valendo a cláusula de idade** (seção 1): o tier gratuito serve para o CEO com dado inventado; **os termos do Gemini API e do Google Cloud proíbem app "com probabilidade de
   acesso por menor de 18"**. Quem decide é o CEO; **o custo acima é o do pago**, que **também** tem essa cláusula.
4. **O "US$ 0,005/min" não serve para orçar.** Orce por **tokens de contexto por turno** (o dev já mede com `usageMetadata.promptTokenCount`) e use o script.

---

## O que não foi possível confirmar

- **Fatura real do Gemini pago.** A regra de cobrança (contexto recobrado, sem cache) está na doc oficial e no `usageMetadata`, mas a chave da casa é gratuita: **nunca vi uma fatura**.
- **Compressão e reinício em aula longa de verdade.** Testei compressão em 14 turnos curtos; o **reinício com resumo não foi testado**, e o efeito da compressão na **qualidade pedagógica** (o professor esquecer o início da aula) não foi medido.
- **Qualidade da voz em PT-BR/EN de cada modelo.** Não ouvi; não há avaliação independente achada. É o critério que o CEO decide de ouvido.
- **Latência, function calling e obediência de `gpt-realtime-2.1`, `GPT-Live-1`, Azure Voice Live, Nova 2 Sonic, Ultravox, Grok Voice.** Não testei (sem chave). Só AA, fornecedor e relato.
- **Se o `GPT-Live-1` aceita de fato um modelo de terceiros** (DeepSeek, Claude) atrás: a página de anúncio diz "ou um modelo de terceiros", a página do modelo **não especifica**; relatos de que a delegação não dispara de forma confiável.
- **Pronúncia com aprendiz real.** Áudios sintéticos, erro óbvio, n=4 por condição; nada sobre criança, sobre erro sutil, nem **sobre a nota do Azure PA** (não rodei). **ELSA/SpeechSuper** só pelo DR anterior.
- **Sessão longa** (15 min+), **resumption**, **compressão**, **GoAway**, desvio de obediência em aula de 30 min: só li. O mais longo que rodei foi 3 turnos.
- **Extended Thinking:** não sei se a falha é do meu harness ou do serviço.
- **Cota de sessões simultâneas e de tokens do 3.8 Live no tier gratuito** (painel exige login); observei 1 erro 1011 com 6 sessões em paralelo.
- **Se o cliente consegue sobrescrever o sistema travado num token efêmero.** E a divergência: a doc cita `liveConnectConstraints` e a API real rejeitou; aceitou `bidiGenerateContentSetup`.
- **Preço oficial do Nova 2 Sonic** e da camada de voz do **Azure Voice Live** (por token; a Retail API não trouxe o medidor).
- **Taxa de acerto de cache da OpenAI para realtime** (muda o custo de US$ 2,6 a US$ 29/h).
- **A política de dado de menor em Azure/AWS/xAI/Ultravox:** só registrei OpenAI e Google. Leitura jurídica está fora.
- **O número da AA** (definições das colunas não conferidas; o resumo do `WebFetch` saiu com "julho de 2026" mas o HTML cru já trazia modelos de setembro — usei o HTML).

**Achados fora do escopo (uma linha cada):**
- `assessor-de-integracoes`: o README de `google-ai-studio/` está desatualizado (lista `gemini-3-flash-live` e diz que o token efêmero é recusado; hoje há `gemini-3.8-live` e o token funciona) e `voz/conversa.mjs` ainda usa o modelo "legado" `gemini-3.1-flash-live-preview`.
- `pesquisador-de-direcao`/CEO: os termos do Gemini API e do Google Cloud proíbem apps "com probabilidade de acesso por menor de 18" — afeta **qualquer** produto da casa que use Gemini e atinja menor, não só este.

---

## Fontes

Acessadas em **30/09/2026**. Rótulos: [oficial] [changelog] [repo] [engenharia] [relato] [fraca].

**Google**
1. Gemini Live API overview — https://ai.google.dev/gemini-api/docs/live-api — [oficial]
2. Preços da Gemini API (Live/áudio nativo) — https://ai.google.dev/gemini-api/docs/pricing — [oficial]
3. Modelo `gemini-3.1-flash-live-preview` — https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-live-preview — [oficial] ("legado"; função sequencial)
4. Live API capabilities — https://ai.google.dev/gemini-api/docs/live-api/capabilities — [oficial] (NON_BLOCKING; código-switching; VAD)
5. Modelo `gemini-3.8-live` — https://ai.google.dev/gemini-api/docs/models/gemini-3.8-live — [oficial]
6. Anúncio Gemini 3.8 Live (15/09/2026; atualizado 17/09) — https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-8-live-gemini-3-8-live-extended-thinking/ — [oficial] (97 idiomas; SynthID)
7. Guia do desenvolvedor 3.8 Live (Cloud) — https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/guides/gemini-3-8-live — [oficial] (pouco conteúdo útil)
8. Rate limits — https://ai.google.dev/gemini-api/docs/rate-limits — [oficial] (**não lista os modelos Live**)
9. Modelo `gemini-3.8-live-extended-thinking` — https://ai.google.dev/gemini-api/docs/models/gemini-3.8-live-extended-thinking — [oficial]
10. Session management (15 min, resumption, compressão, GoAway) — https://ai.google.dev/gemini-api/docs/live-api/session-management — [oficial]
11. Live API best practices (cobrança por turno de todo o contexto; 25 tok/s) — https://ai.google.dev/gemini-api/docs/live-api/best-practices — [oficial]
12. Gemini API Additional Terms (atualizado 2026-04-28) — https://ai.google.dev/gemini-api/terms — [oficial]
13. Google Cloud Service Specific Terms ("Age Restrictions", modificado 24/09/2026) — https://cloud.google.com/terms/service-terms — [oficial, lido por `curl`]
36. Fórum: regressão `language_code`/sotaque no 3.8 Live (27/09/2026) — https://discuss.ai.google.dev/t/bug-gemini-3-8-live-api-overrides-language-code-ignores-system-prompt-accent-formatting/185304 — [relato]
38. Tokens efêmeros — https://ai.google.dev/gemini-api/docs/ephemeral-tokens — [oficial] (+ **teste meu** de 30/09)

**OpenAI**
14. Fórum de desenvolvedores: `gpt-realtime-2.1` e `mini` (06/07/2026) — https://community.openai.com/t/new-realtime-models-on-the-api-gpt-realtime-2-1-and-gpt-realtime-2-1-mini/1385896 — [relato/oficial misto]
15. Realtime conversations (60 min) — https://developers.openai.com/api/docs/guides/realtime-conversations — [oficial]
16. Preços — https://developers.openai.com/api/docs/pricing — [oficial]
17. "Build more natural voice experiences with GPT-Live-1 in the API" (10/09/2026) — https://openai.com/index/introducing-gpt-live-1-in-the-api/ — [oficial; lido via Wayback, o site dá 403]
18. Modelo `gpt-live-1` — https://developers.openai.com/api/docs/models/gpt-live-1 — [oficial]
19. Fórum: "Introducing GPT-Live-1 in the API" — https://community.openai.com/t/introducing-gpt-live-1-in-the-api/1396471 — [relato]
20. Controles de dado da API — https://developers.openai.com/api/docs/guides/your-data — [oficial]
21. The Batch: "One model talks, another one thinks" — https://www.deeplearning.ai/the-batch/one-model-talks-another-one-thinks — [engenharia/imprensa; diz "sem API" — **superado pela fonte 17**]

**Azure e AWS**
22. Voice Live overview (modelos, camadas, preço) — https://learn.microsoft.com/en-us/azure/ai-services/speech-service/voice-live — [oficial] (atualizado 29/09/2026)
23. Voice Live how-to/FAQ/API ref (busca por "pronunciation": só regras de saída) — https://github.com/MicrosoftDocs/azure-ai-docs/tree/main/articles/ai-services/speech-service — [repo]
24. Características e limites do Pronunciation Assessment — https://learn.microsoft.com/en-us/azure/foundry/responsible-ai/speech-service/pronunciation-assessment/characteristics-and-limitations-pronunciation-assessment — [oficial]
25. How-to Pronunciation Assessment (scripted × unscripted; `ErrorType`) e preço — https://raw.githubusercontent.com/MicrosoftDocs/azure-ai-docs/main/articles/ai-services/speech-service/how-to-pronunciation-assessment.md e `pronunciation-assessment-tool.md` — [repo oficial]
26. Nova 2 Sonic, AWS AI Service Card — https://docs.aws.amazon.com/ai/responsible-ai/nova-2-sonic/overview.html — [oficial]
27. Nova 2 Sonic, guia (polyglot, 8 min) — https://docs.aws.amazon.com/nova/latest/nova2-userguide/using-conversational-speech.html — [oficial]
AWS blog de lançamento (regiões, 02/12/2025) — https://aws.amazon.com/blogs/aws/introducing-amazon-nova-2-sonic-next-generation-speech-to-speech-model-for-conversational-ai/ — [oficial]

**Outros**
28. Ultravox changelog — https://docs.ultravox.ai/changelog/news — [oficial]
29. Lei et al., *Large Multimodal Models as Alternatives for Pronunciation Assessment*, arXiv 2503.11229 — https://arxiv.org/html/2503.11229 — [engenharia/pesquisa]
30. *GPT-4o Voice Mode: a preliminary exploration*, arXiv 2502.09940 — https://arxiv.org/html/2502.09940v1 — [pesquisa]
31. Parikh et al., SpeechLLM fine-tunado para avaliação L2, arXiv 2606.09470 (06/2026) — https://arxiv.org/pdf/2606.09470 — [pesquisa; lido só pelo resumo do WebFetch]
32. ConvFill, arXiv 2511.07397 v3 (01/07/2026) — https://arxiv.org/html/2511.07397 — [pesquisa]
33. Sopyła, *Speech-to-Speech Models in 2026* (27/02/2026) — https://ai.ksopyla.com/posts/voice-to-voice-models-2026-review/ — [engenharia/blog; números da "task adherence" são de 2025, fracos]
34. LiveKit, *Pipeline vs. realtime* (17/04/2026) — https://livekit.com/blog/realtime-vs-cascade — [engenharia; fornecedor do framework de cascata]
35. Artificial Analysis, Speech to Speech — https://artificialanalysis.ai/speech-to-speech — [terceiro; **lido no HTML cru**, tabela de 30/09/2026]
37. Android Police, "I tried to use Gemini as a language tutor…" (17/09/2026) — https://www.androidpolice.com/tried-gemini-as-language-tutor-major-missing-feature-ruined-experience/ — [relato]
39. Busca sobre termos de idade da OpenAI/Microsoft e Grok Voice (snippets): **fracas**; só a fonte 20 é oficial para dado

**Da casa (não externas):** `integracoes/google-ai-studio/README.md` e `voz/conversa.mjs`, `voz/conversa.log` (ago/2026);
DRs de 30/09/2026 (voz, cérebro, pedagogia); **testes próprios de 30/09/2026** (harness em Node no scratchpad da sessão; áudios SAPI).
