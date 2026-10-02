---
titulo: Camada de voz de um agente professor de inglês (PT/EN misturado) com DeepSeek V4.1 Flash — pilha de conversa por voz, STT/TTS e avaliação de pronúncia
data: 2026-09-30
departamento: tecnologia
encomendado-por: CEO (via dev do app Família Figueiredo, rbk-eng)
decisao-alvo: Escolher (1) a pilha de conversa por voz (tempo real; na pior hipótese, troca de áudio) e (2) o provedor/método de avaliação de pronúncia, para um professor de inglês que fala PT e EN na mesma frase e usa o DeepSeek V4.1 Flash como cérebro
tags: [voz-ia, stt, tts, avaliacao-de-pronuncia, pipecat, livekit, deepseek, azure-speech, codigo-misto-pt-en, privacidade-de-audio]
validade: curta
status: parcial
---

# Camada de voz do professor de inglês — DeepSeek V4.1 Flash, STT/TTS e pronúncia

> ⚠️ **Validade curta e dois módulos de preço volátil.** Tudo abaixo é de **30/09/2026**. Este DR
> **atualiza** o [DR de 03/08/2026](2026-08-03-deepseek-v4-flash-0731.md) e o
> [DR de 28/09/2026](2026-09-28-deepseek-visao-conferencia-fotos-lavagem.md) só no que toca a
> áudio/latência/preço do `deepseek-flash`; não refaz o que eles já dizem (privacidade do DeepSeek,
> benchmark, pesos MIT). **Nenhuma latência foi medida por mim** — o que está como "orçamento" é
> composição de números de fonte, com a fonte de cada parcela.

> **Irmão deste DR, mesmo dia e mesmo projeto:**
> [o cérebro do agente (orquestração, contexto, memória)](2026-09-30-cerebro-agente-professor-ingles-orquestracao-contexto-memoria.md).
> Os dois concordam em: raciocínio do DeepSeek desligado no laço falado; `with_deepseek()` do LiveKit
> ainda usa o nome legado `deepseek-chat`; LiveKit/Pipecat orquestram sem precisar de LangGraph no laço
> de voz. Custo de LLM: ≈ US$ 0,011/h aqui × ≈ US$ 0,014/h lá (hipóteses de contexto diferentes).

## O essencial em 5 linhas

1. **O DeepSeek não tem áudio.** O `deepseek-flash` (V4.1-Flash) é texto + visão; o changelog (último
   item, 10/09/2026) e a página de preço não citam áudio, voz nem API realtime. **O caminho é cascata
   STT → LLM → TTS**, e ele já é o caminho de fábrica dos dois frameworks de voz que importam (o
   Pipecat tem serviço `DeepSeekLLMService` nativo, com o botão de desligar o raciocínio).
2. **É conversável, no limite, desde que o raciocínio esteja desligado.** Soma dos componentes:
   **≈ 1,6 a 3,0 s de voz-para-voz (meio ≈ 2,3 s)**, dominada pelo TTFT do DeepSeek (≈ 1,0 s no
   AA; 1,4 s na nossa medição de 03/08). Isso é ritmo de "professor que pensa", não de conversa entre
   humanos (mediana de troca de turno humana = +100 ms). **Com o raciocínio ligado (o padrão da
   API!) é inviável** (13–20 s na nossa medição). Um spike de 1 dia mede o número real.
3. **O ponto mais duro da encomenda não tem solução provada em lugar nenhum: PT/EN na mesma frase.**
   A doc oficial da Azure diz que a identificação contínua de idioma **não detecta troca dentro da
   mesma frase**; o Whisper decide **um idioma por janela de 30 s**; **não existe benchmark
   independente** PT-EN. Os candidatos sérios para STT são **Deepgram Nova-3 `multi`** (PT+EN
   oficial), **ElevenLabs Scribe v2 Realtime** e **AssemblyAI Universal-3.6** (este só com benchmark
   do próprio fornecedor) — **decidir só depois de um teste de ~30 frases com a voz da família.** Para
   TTS, a Azure tem a única documentação oficial de troca de idioma por texto (voz
   `en-US-AvaMultilingualNeural` detecta `pt-BR` sozinha).
4. **Pronúncia: a Azure Pronunciation Assessment é a única que junta fala livre (sem texto de
   referência) + streaming + fonema/palavra/fluência/prosódia + já estar na casa.** Limites
   documentados: **prosódia e nota de conteúdo só em en-US; "não suporta avaliação de áudio com
   idiomas misturados"** (então o áudio em português tem de ser separado do que vai para avaliação);
   custo = STT padrão (US$ 1,00/h) + complemento de prosódia. ELSA (US$ 0,02 por 15 s em fala livre) é a
   segunda opinião paga; wav2vec2 aberto dá fonemas, **não dá nota pronta**.
5. **Recomendação (seção 8): Pipecat self-hosted (worker Python, transporte WebSocket atrás do
   Traefik) + Deepgram Nova-3 `multi` + DeepSeek `deepseek-flash` sem raciocínio + Azure TTS
   (voz multilíngue) + Azure Pronunciation Assessment em paralelo — ≈ US$ 0,8–1,3 por hora de
   conversa**, sem custo fixo. Plano B (apertar para falar) custa igual e latência ≈ 2,2–3,7 s.
   **Sem o teste bilíngue de STT/TTS, a parte "misturado" é aposta, não decisão.**

---

## 1. O DeepSeek aceita ou gera áudio? Há API realtime?

**Não, e a cascata é o caminho.** Três leituras independentes, todas por ausência (por isso a
confiança é "alta, não absoluta"):

| Fonte (30/09/2026) | O que mostra |
|---|---|
| Changelog oficial `api-docs.deepseek.com/updates` | O último lançamento é o V4.1-Flash (10/09/2026); a tabela de modelos lista `deepseek-flash` e `deepseek-v4-flash` como **Text + Vision**, `deepseek-v4-pro`/`deepseek-chat`/`deepseek-reasoner` como **Text**. Zero menção a áudio, voz, realtime, streaming de entrada. |
| Página oficial de preço/modelo | Recursos do `deepseek-flash`: JSON, tool calls, Responses API, compatibilidade Anthropic, prefix completion (beta), FIM (beta), **visão**. Contexto 1 M, saída máx. 384 K. **Sem áudio.** |
| Pipecat e LiveKit | Tratam o DeepSeek como **LLM de texto** (`DeepSeekLLMService`, `openai.LLM.with_deepseek`); nenhum dos dois o lista como modelo fala-para-fala. |

(Uma busca genérica também diz "a API só aceita texto" — **fonte fraca**, só confirma.)

**Consequência de dado que a encomenda pediu para registrar:** o **áudio nunca chega ao DeepSeek** —
chega a **transcrição em texto** do que o aluno falou. Se o aluno for menor, o texto dele vai para a
API oficial (China, uso para melhoria, sem opt-out claro — DR 03/08 e 28/09). Pesos MIT servidos por
provedor ocidental resolvem (ver seção 3).

### O que mudou no DeepSeek desde os DRs anteriores (para esta decisão)

| Item | 03/08/2026 (DR anterior) | 30/09/2026 (página oficial) |
|---|---|---|
| Modelo | `deepseek-v4-flash` (V4-Flash-0731) | `deepseek-flash` = **V4.1-Flash** (10/09) |
| Preço in (miss) / out, por Mtok | US$ 0,14 / 0,28 | **fora de pico US$ 0,15 / 0,60; em pico US$ 0,30 / 1,20** |
| Cache hit, por Mtok | US$ 0,0028 | US$ 0,003 (fora) / 0,006 (pico) |
| Pico | não existia | **01–04 e 06–10 UTC, seg–sex, exceto feriados chineses** = **22:00–01:00 e 03:00–07:00 no horário de Brasília** (conversão minha, UTC−3). Uso da família à tarde/noite cai quase todo **fora** do pico. |
| Raciocínio | — | **Ligado por padrão, esforço `high`**; desligar com `{"thinking": {"type": "disabled"}}` no `extra_body` |

(O OpenRouter mostrou US$ 0,0198 / 0,396 por Mtok para o modelo — número que não bate com nenhuma
outra fonte e cuja página veio truncada; **não usar sem conferir** — fonte fraca.)

---

## 2. Frameworks de agente de voz em tempo real (LLM OpenAI-compatível arbitrário)

**Números de repositório e pacote conferidos em 30/09/2026** (API do GitHub, PyPI, npm).

| | **Pipecat** | **LiveKit Agents** | **TEN Framework** | **Azure Voice Live API** |
|---|---|---|---|---|
| Linguagem | Python (≥3.11). Clientes: JS, React, React Native, Swift, Kotlin | **Python e Node/TS** (`agents-js`, Apache-2.0) | Python/Go/Node, grafo de nós | Serviço gerenciado; SDKs Py/JS/C#/Java |
| Transporte | **WebSocket (FastAPI)**, **SmallWebRTC** (aiortc, P2P), Daily (WebRTC), LiveKit, Vonage, WhatsApp | **WebRTC** (servidor LiveKit) + WS/HTTP p/ backend; telefonia SIP | Quickstart usa **Agora** (RTC) | WebSocket servidor-a-servidor |
| Turno / interrupção | Silero VAD local (`stop_secs` 0,2 s); **Smart Turn v3.2** (BSD-2, **23 idiomas incl. PT e EN**, 8 MB CPU, ~65 ms); interrupção **ligada por padrão** | Detector de turno (modelo de áudio, **14 idiomas incl. PT e EN**, licença **LiveKit Model License**, à parte); interrupção **adaptativa por padrão** (distingue "aham" de interrupção); modo manual p/ push-to-talk | Não examinei | Detecção de interrupção e fim de turno embutidas |
| LLM arbitrário | `DeepSeekLLMService` nativo (**`thinking` desligável**); `OpenAILLMService(base_url=…)`; `FrameProcessor` próprio | `openai.LLM.with_deepseek()` (**default `deepseek-chat`, nome legado**) ou `openai.LLM(base_url=…, extra_body={…})` | Sim (chave OpenAI no quickstart) | **Só modelos implantados no Foundry da Azure** (BYOM) — **não aceita a API oficial do DeepSeek** |
| Self-host na VPS | **Sim, é só um processo Python.** Via WebSocket atravessa o Traefik sem mudança | Servidor LiveKit (Go) + worker. **Doc manda TCP 7880/7881 + UDP 50000–60000 (ou 7882), TLS, e "host networking" em Docker** — atrito com Swarm/Traefik (inferência minha, não testada) | Sim, Docker | Não (nuvem) |
| Nuvem do próprio | Pipecat Cloud (~US$ 0,01/min, fonte secundária) | **LiveKit Cloud: plano grátis = 1.000 min de agente + 5.000 min WebRTC/mês + US$ 2,50 de créditos** (cobre ~16 h/mês de sessão); Ship US$ 50/mês, US$ 0,01/min acima | — | Sim |
| Licença | **BSD-2-Clause** | **Apache-2.0** (+ modelos de turno sob licença própria) | Apache-2.0 **"com restrições adicionais"** | — |
| Maturidade (30/09) | 16,1 mil ★ · v**1.12.0** (26/09) · 1.11 em 18/09, 1.10 em 12/09 (ritmo ~semanal) | 14,4 mil ★ (Py) · `livekit-agents` 1.8.3 (26/09); `agents-js` 938 ★, 395 issues, `@livekit/agents` 1.9.1 | 11,1 mil ★ | GA; preço por camada do modelo |
| Compat. com orquestrador externo | `FrameProcessor` próprio, `LangchainProcessor`, base_url OpenAI-compatível | Sobrescrever `llm_node`; `livekit-plugins-langchain` (`LLMAdapter` para LangGraph) | — | — |

**Outros relevantes e por que caem:**
- **Vocode** — último push 15/11/2024; parou de evoluir. Fora.
- **Kyutai Unmute** (MIT) — exige **GPU CUDA ≥ 16 GB VRAM**; a VPS da casa não é GPU. Fora.
- **Pipecat Flows** (repositório) — arquivado em 07/2026; hoje é módulo dentro do Pipecat.
- **Speech-to-speech (OpenAI `gpt-realtime-2.1`, Gemini Live)** — trazem o próprio cérebro; trocam o DeepSeek. **Fora da encomenda** (a decisão é manter o DeepSeek). Só para referência de custo: US$ 32 / 64 por Mtok de áudio (in/out) no `gpt-realtime-2.1`, US$ 10 / 20 no `mini`.
- **Serviços "tudo incluído"**: Deepgram Voice Agent API US$ 0,065–0,075/min (≈ US$ 3,9–4,5/h); ElevenLabs Agents "Speech Engine" US$ 0,08/min (≈ US$ 4,8/h). **5× o custo da pilha montada** (seção 7), sem ganho que a encomenda peça.

**Minha leitura:** o **Pipecat** é o que casa com o que a casa tem — um processo Python, WebSocket pelo
Traefik existente, DeepSeek nativo com o desligamento do raciocínio **documentado**, e modelo de turno
open source que cobre PT e EN. O **LiveKit** ganha em transporte (WebRTC de verdade, cancelamento de
eco, rede móvel ruim) e tem worker em **Node** (mesma linguagem do app), mas cobra operação de UDP/host
networking num Swarm ou envia o áudio para a nuvem dele.

**Risco do WebSocket (hipótese, não medida):** é TCP — em rede móvel com perda, o áudio trava em fila;
o WebRTC tolera melhor. O Pipecat permite trocar de transporte sem mexer no resto (`SmallWebRTC` ou
LiveKit), então a decisão do transporte pode ser tomada **depois** do teste no celular.

---

## 3. Orçamento de latência ponta a ponta (cascata com DeepSeek sem raciocínio)

**A parcela que manda — TTFT do DeepSeek `deepseek-flash` sem raciocínio** (Artificial Analysis,
mediana de 72 h, prompt de **10 mil tokens**, conferido 30/09/2026):

| Provedor | TTFT (s) | saída (tok/s) | preço in / out (US$/Mtok) |
|---|---|---|---|
| Modal | **0,67** | 211 | 0,50 / 1,50 |
| LithosAI (ULTRA CHAT) | **0,73** | 631 | 0,35 / 1,40 |
| CoreWeave | 0,89 | 180 | 0,20 / 0,65 |
| **DeepSeek (oficial)** | **1,01** | 207 | 0,30 / 1,20 |
| LithosAI (ULTRA) | 1,02 | 552 | 0,35 / 1,40 |
| LithosAI (FAST) | 1,29 | 477 | 0,25 / 1,00 |

- **Nossa medição de 03/08** (DR anterior): ~1,4 s sem raciocínio no V4-Flash; 13 s em `high`; 20 s em
  `max`. **Com raciocínio ligado o AA mostra o melhor "primeiro token de resposta" em 3,45 s**
  (LithosAI); o "TTFT 0,94 s" que o AA exibe para o modelo em `max` **conta tokens de raciocínio, não de
  resposta** — não confundir. Conclusão igual: **raciocínio desligado é obrigatório.**
- **O TTFT do AA inclui a rede do ponto de medição** (ressalva dita na própria fonte de 30/08). A API
  oficial fica **na China**; o TTFT visto do **Brasil** não está medido (hipótese: pior que 1,0 s).
  Os provedores acima são **pesos abertos de terceiros** (alternativa ocidental): **a política de dado de
  cada um não foi conferida** aqui (o DR de 28/09 só cobre DeepInfra, que o AA **não** lista para este
  modelo).
- Os pesos MIT do V4.1-Flash estão no Hugging Face; fora do escopo rodar em GPU própria.

**Composição (as parcelas de STT/TTS/turno são números de fornecedor, não medição minha):**

| Parcela | Faixa (s) | Base |
|---|---|---|
| Silêncio até decidir "acabou" (VAD + modelo de turno) | 0,3–0,5 | Pipecat `stop_secs` 0,2 + Smart Turn ~65 ms; Deepgram Flux declara ~260 ms de fim de turno |
| STT: texto final após o fim | 0,1–0,3 | Scribe v2 Realtime "~150 ms" (fornecedor); Deepgram sem número publicado |
| **LLM: primeiro token** | **0,7–1,4** | tabela acima + 1,4 s da casa |
| Primeira frase completa (15–25 tokens a ~200 tok/s) | 0,1–0,2 | conta: tokens ÷ velocidade do AA |
| TTS: primeiro byte | 0,1–0,3 | ElevenLabs Flash "~75 ms" (fornecedor); **Azure não publica número** (a doc manda medir `SynthesisFirstByteLatencyMs`) |
| Rede + transporte + fila de áudio | 0,1–0,3 | estimativa |
| **Total** | **≈ 1,4–3,0 (meio ≈ 2,3)** | |

**Referências para julgar:** a mediana de troca de turno entre humanos é **+100 ms**, a maioria entre 0
e 200 ms, em 10 idiomas (Stivers et al., PNAS 2009). Orçamentos de blog para voz-agente: natural
< 800 ms; "degrada" > 1,5 s (**fontes fracas, blogs de fornecedor**); a MarkTechPost (30/08/2026, sobre
o AA) fala em **1,5 s voz-a-voz ≈ 700 ms de TTFT**. **Por qualquer régua, 2,3 s não é "conversa natural"**
— é o ritmo de um professor que espera o aluno iniciante e pensa. Aceitável para aula, **se a
pedagogia aceitar** (decisão do CTO/pedagogia, não minha).

**O que encurta, sem trocar de modelo:** (1) raciocínio desligado; (2) cache de prompt (prefixo fixo
do professor + memória no começo → `prompt_cache_key` existe no `with_deepseek` do LiveKit); (3) respostas
curtas e **primeira cláusula falada imediatamente**; (4) **fim de turno adiantado** (Flux `eager_eot_threshold`
adianta "centenas de ms", ao custo de **+50–70% de chamadas ao LLM** — irrelevante a US$ 0,01/h); (5)
provedor de TTFT menor (Modal/LithosAI) **depois** de conferir dado; (6) uma frase de enchimento
("Hmm, let me see…") tocada localmente enquanto o LLM responde.

---

## 4. STT e TTS para fala bilíngue PT-BR/EN misturada, em streaming

### 4.1 STT — o que se sabe sobre PT+EN na mesma frase

| Opção | PT+EN / mistura | Streaming e latência | Preço por hora (USD) | Fonte e força |
|---|---|---|---|---|
| **Azure Speech (tempo real)** | Identificação **contínua** de idioma (até 10 candidatos) **"não suporta troca de idioma dentro da mesma frase"** (exemplo da própria doc: espanhol com palavras em inglês **não** detecta por palavra). Fast Transcription tem modelo multilíngue incl. `en-US` + `pt-BR` (intra-frase **não** declarado) | WebSocket; 500 ms de timeout de segmentação por padrão | **1,00** (S1); +0,30 "enhanced features" (LID contínuo/diarização/PA prosódia, leitura de medidor) | **oficial** (17, 19, 23) |
| **Deepgram Nova-3 `multi`** | **"multi" cobre EN, ES, FR, DE, HI, RU, PT, JA, IT, NL** (code-switching; oficial). Flux `flux-general-multi` = 10 idiomas com `language_hint` | WS; **Flux tem fim de turno embutido (~260 ms)**; só EN no `flux-general-en` | Nova-3 `multi` **0,0058/min = 0,35/h** (PAYG; "regular" 0,0092). Flux en 0,0065/min | **oficial** (preço/idioma); latência = fornecedor |
| **ElevenLabs Scribe v2 Realtime** | 90+ idiomas; **code-switching não declarado** na doc lida. Benchmark de 3º (do concorrente): 8,77% WER médio em 5 pares | WS, "~150 ms" (fornecedor), timestamps por palavra | **0,39/h** (Scribe v2 lote: 0,22/h) | oficial (preço); **benchmark fraco** |
| **AssemblyAI Universal-3.6 Pro Realtime** | Declara code-switching em 32 idiomas; 7,20% WER (pares PT etc.) | WS | **0,45/h** | **só blog do próprio fornecedor, 30/09/2026 — fonte fraca** |
| **OpenAI** | `gpt-4o-transcribe`: **44,58% de WER** no mesmo benchmark (traduz em vez de transcrever — o fornecedor rival afirma); `gpt-transcribe` novo aceita parâmetro `languages`; `gpt-live-transcribe` (realtime) | lote/stream; realtime US$ 0,017/min | `gpt-4o-mini-transcribe` 0,003/min = **0,18/h**; `gpt-transcribe` 0,0045/min = 0,27/h; `gpt-live-transcribe` 0,017/min = **1,02/h** | oficial (preço); 44,58% = **fraco** |
| **Cartesia Ink 2** | **Só EN, FR, HI, JA, ES** (doc, 17/09/2026) — **sem PT**. `ink-whisper` antigo: não verificado | WS, eventos de turno | ≈ 0,54/h no plano Pro (**derivado**: 100 K créditos = 9h16) | oficial. **Fora** |
| **Whisper / faster-whisper (self-host)** | **Um token de idioma por janela de 30 s**; mantenedores: "não suporta bem code-switching"; 91,76% de erro em fala misturada (estudo indonésio-inglês citado em blog) | `faster-whisper` small int8 em CPU i7-12700K: **13 min de áudio em 1m42s** (lote, ~7,6× tempo real); streaming via WhisperLiveKit (Apache-2.0, recomenda GPU) | 0 marginal | repo **oficial**; discussão da comunidade (**relato**) |
| **Voxtral Realtime (Mistral)** | 13 idiomas incl. PT/EN; **mistura não declarada**. Pesos **Apache-2.0**, 4 B params (**GPU**) | "sub-200 ms" configurável | API 0,006/min = **0,36/h** | oficial (Mistral, 04/02/2026) |

**Achado que pesa:** o único dado comparativo de código-misto (AssemblyAI, publicado **hoje**, rodado
**pelo próprio fornecedor**, 5 pares de idioma com inglês, WER normalizado) coloca **Universal-3.5 Pro
7,69% < Scribe v2 8,77% < Deepgram Nova-3 Multilingual 12,22% ≪ GPT-4o Transcribe 44,58%**
(PT específico: Universal-3.5 8,29% × Scribe v2 8,17%). **Benchmark de quem vende um dos
concorrentes não decide**; serve para ordenar o teste, não para escolher. **Não há avaliação
independente PT-EN em nenhuma fonte achada** — é achado.

**Especificidade do nosso caso (inferência, não medida):** o aluno iniciante fala **inglês com sotaque
brasileiro** e PT com palavras em inglês. Um STT "esperto" pode **corrigir** a pronúncia errada para a
palavra certa, escondendo o erro — bom para o LLM entender, ruim se a transcrição for a base da nota de
pronúncia. A Azure avisa, na própria doc, que no modo sem texto de referência **o STT usado na avaliação
é outro, diferente do Azure STT**.

### 4.2 TTS — falar PT e EN na mesma frase, em streaming

| Opção | Mistura PT/EN | Preço | Observação |
|---|---|---|---|
| **Azure Neural multilíngue** | **Oficial:** vozes `*MultilingualNeural` **detectam sozinhas o idioma do texto** (77 idiomas, incl. `pt-BR`, para `en-US-AvaMultilingualNeural` etc.); elemento `<lang xml:lang>` ajusta sotaque. Também há `pt-BR-ThalitaMultilingualNeural`/`MacerioMultilingualNeural` | **US$ 15 / 1 M caracteres** (S1 Neural); HD US$ 22/M (meter do retail API) — preço específico das multilíngues **não isolado** | **Streaming de texto do LLM** por WebSocket v2, **só C#/C++/Python, sem SSML nesse modo** (doc Microsoft, fev/2026). **Falta ouvir** como soa o PT dito por uma voz `en-US` e o EN dito por uma voz `pt-BR` (sotaque; não provado) |
| **ElevenLabs** | Multilingual v2 e v4: "mantém a qualidade da voz entre trocas de idioma" (fornecedor). Flash v2.5: 32 idiomas, ~75 ms, PT sim; v4 Turbo 90+ idiomas ~100 ms | Flash/Turbo **US$ 0,04/1K caracteres**; v2/v3 US$ 0,08/1K | Plano Starter US$ 6/mês (~273 K caracteres) |
| **OpenAI `gpt-4o-mini-tts`** | 90+ idiomas, "otimizado para inglês"; `instructions` controla sotaque/tom; mistura **não tratada** na doc | **US$ 12 / 1 M** (mini-tts) | Obriga a divulgar que a voz é IA |
| **Cartesia Sonic 3.6** | 44 idiomas; code-switching documentado **só em hinglish**; PT-BR **não confirmado** na página lida | créditos: Pro US$ 5 = 100 K créditos ≈ 133 min (→ ≈ US$ 0,05/1K carac., **derivado**) | Documentação de TTFB/WS **não lida** (a doc redirecionou a login em páginas-chave) |
| **Deepgram Aura-2** | Idiomas não verificados | US$ 0,030/1K | — |
| **Kokoro-82M (self-host)** | **Voz por idioma** (`lang_code` `p` = pt-BR: 1 feminina, 2 masculinas; `a` = en-US): **mistura na frase exige roteamento por trecho** (nosso código). README: "não-inglês pode ser raso por G2P/treino fracos" | **0** (Apache-2.0, 82 M, CPU; `Kokoro-FastAPI` Apache-2.0, push 10/09/2026) | Plano de contenção de custo; qualidade PT **não ouvida** |
| **Voxtral TTS (Mistral)** | 9 idiomas incl. PT; voice-cloning de 3 s; "70 ms" | API US$ 0,016/1K | **Pesos CC BY-NC 4.0 (uso não comercial)** — a VirtueTech é comercial: fato, leitura jurídica não é minha |

**Regra de tradução prática que sai daqui:** **ElevenLabs e Azure declaram a mistura; OpenAI e Cartesia
não; Kokoro não faz sozinho.** Só o **ouvido** da família decide se o "PT falado pela voz en-US" (ou o
inverso) é aceitável.

---

## 5. Avaliação de pronúncia

**Fronteira do problema (vale para todos):** o alvo da nota é o **inglês**; todos os provedores abaixo
avaliam inglês. A **Azure afirma não suportar "avaliação de idiomas misturados"** e **um só falante por
avaliação**; áudio precisa ser **≥ 16 kHz** e com pouco ruído. Logo **só os trechos em inglês** vão à
avaliação — e o roteador "este trecho é EN" é nosso (pode sair da transcrição). Em fala livre a Azure
recomenda **15 s (mais de 50 palavras) a 10 min**; a nota de tópico exige ≥ 3 frases — **turnos curtos
(3–5 s) dão nota mais ruidosa** (inferência; agregue turnos seguidos em inglês).

| | Mede | Fala livre (sem texto de referência)? | Streaming junto da conversa? | Preço | Dado do áudio |
|---|---|---|---|---|---|
| **Azure Pronunciation Assessment** | Acurácia (fonema, **sílaba só en-US**, palavra, frase), fluência, completude (só com referência), **prosódia só en-US**, miscue (não disponível no modo contínuo); **nota de conteúdo (vocabulário/gramática/tópico) só en-US, só sem script**; 33 locales (incl. `pt-BR` para **roteirizado**; fala livre fora do en-US **não conferida**). Correlação **> 0,5 (Pearson)** com avaliadores humanos (dado da Microsoft) | **Sim**, `en-US` (o STT do modo livre é outro, diferente do Azure STT) | **Sim**: "streaming ininterrupto"; gravação ilimitada no SDK (demo 60 min); **no mesmo reconhecedor** do SDK (JS 1.52.0, 26/09/2026, MIT, ~475 mil downloads/semana) | **= STT padrão US$ 1,00/h; prosódia é complemento** (doc). Retail API: medidor "enhanced feature" US$ 0,30/h (**mapeamento para PA/prosódia é hipótese**). Resposta de moderador no Q&A diz US$ 1,32/h (**fonte fraca; contradiz um pouco**) | Doc: em **tempo real, Fast Transcription, pronunciation assessment e tradução "a Microsoft não retém nem armazena"** |
| **ELSA API** | Pronúncia, entonação, fluência, gramática, vocabulário; palavra/frase/fonema | **Sim** (API "unscripted") | WebSocket (doc da API) | **Padrão US$ 0,008 (roteirizado) / 0,02 (livre) por 15 s; Premium 0,01 / 0,025**; limite 20 s (padrão), 150 s (Premium livre). Precisa pedir chave | Não declarado |
| **Speechace** | Fonema/sílaba; fluência (Pro+); **transcrição e idioma só no Premium (US$ 125/mês, 2 min)**; rubricas IELTS/CEFR | Premium | Não declarado | Basic US$ 40 (5.000 req de 15 s), Pro US$ 80 (10.000), Premium US$ 125; excedente US$ 0,008–0,0125 por 15 s | Não declarado |
| **SpeechSuper** | Pronúncia, fluência, gramática, vocabulário, fonema, acento de sílaba; roteirizado, semi e **livre** | Sim | **Sem streaming/web SDK** citados (SDK só iOS/Android) | **US$ 0,004–0,008 por avaliação roteirizada, mínimo US$ 20/mês** (**fonte secundária, fraca**) | Não declarado |
| **Language Confidence** | Fonema vs. sotaque US/UK ("nativeness"), 5 dimensões | Sim | Não declarado | Não divulgado (vendas) | Não declarado |
| **wav2vec2 aberto** (`facebook/wav2vec2-xlsr-53-espeak-cv-ft` e `lv-60-espeak-cv-ft`, Apache-2.0; 423 mil e 309 mil downloads) | **Reconhecimento de fones** (sequência IPA/espeak), multilíngue | Reconhece fones **sem** texto; **detectar erro exige a sequência esperada** (texto → G2P) e alinhamento (Needleman-Wunsch); **não entrega nota de fluência/prosódia** | Serve (300 M params, CPU pesado) | 0 + engenharia | **Fica na VPS** |

**Mais pesquisa acadêmica aberta (2025–26), não avaliada por mim:** ZIPA (88 idiomas, ~300 M params),
POWSM (modelo "whisper-style" de fones, código aberto). Nenhuma fonte achada trata **brasileiros falando
inglês** especificamente (lacuna).

**Como a Azure encaixa na conversa:** o pacote `AzureSTTService` do Pipecat (doc) **não expõe PA nem
identificação de idioma**. O desenho é um **segundo reconhecedor Azure, em paralelo**, só para os trechos
em inglês — custo = 1 h de STT sobre o **áudio do aluno em inglês** (não sobre a sessão toda).

**O que a nota da Azure NÃO diz:** compara com falantes nativos "em condições gerais" — **não há modelo
para o sotaque de quem fala português**; o limiar de "mispronunciation" é ajustável (doc recomenda
corte mais brando para criança).

---

## 6. Plano B: "troca de áudio" (apertar, falar, soltar)

**Pilha mais simples, sem worker e sem WebRTC:**

1. Navegador: `MediaRecorder` grava enquanto o botão está apertado. **O formato varia por navegador**
   (Chrome/Firefox: webm/opus; Safari: mp4/AAC — **não conferido nesta rodada**; o MDN só manda testar com
   `isTypeSupported`). O push-to-talk também **elimina o problema de eco/auto-interrupção** do viva-voz do
   celular (não há barge-in).
2. Envio do clipe ao Next.js (route handler/server action) ou **direto ao provedor com token temporário**.
3. **STT em lote:** Azure **Fast Transcription** (modelo multilíngue com `en-US` e `pt-BR`, **não** faz PA;
   US$ 0,36/h no retail API), OpenAI `gpt-4o-mini-transcribe` (US$ 0,003/min) ou `gpt-transcribe`
   (US$ 0,0045/min), Deepgram pré-gravado (`multi`: a doc lida **não trata** `multi` em lote —
   conferir), Voxtral Mini Transcribe V2 (US$ 0,003/min, lote).
4. **DeepSeek em streaming** (SSE) sem raciocínio → divisor de frases → **TTS por frase** → fila no Web Audio.
5. **PA (Azure):** o **próprio navegador** manda o clipe em inglês ao Azure por `recognizeOnce` (áudio ≤ 30 s;
   SDK JS; mesmo preço de STT) — sem passar pela nossa VPS.

**Latência (estimativa por composição, não medida):** STT em lote 0,5–1,5 s (a Deepgram só diz "alguns
segundos" para pré-gravado) + LLM 0,7–1,4 + primeira frase 0,1–0,3 + TTS 0,1–0,3 + rede 0,2 ≈ **2,2–3,7 s**,
**+0,5–1 s** a mais que a cascata em tempo real, e **sem** interrupção nem mãos-livres.
**Custo por hora ≈ o mesmo da cascata** (seção 7). É a saída segura se o WebSocket/VAD no celular
der problema — e o mesmo código de LLM/TTS serve aos dois planos.

**Meio-termo sem framework:** o navegador como orquestrador — `@ricky0123/vad-web` (Silero VAD, ISC,
0.0.31 de 12/09/2026, 2,1 mil ★, ~370 mil downloads/semana, compatível com iOS Safari) detecta fala e
dispara o envio; STT/TTS por WebSocket direto com token temporário. Mais "tempo real" que o apertar-e-falar,
**sem** worker — mas reimplementa à mão o que o Pipecat já traz (turno, interrupção).

---

## 7. Custo por hora de conversa (fórmula + exemplo recalculável)

**Fórmula:** `custo/h = STT + LLM + TTS + PA`, onde
`STT = minutos_de_áudio_transmitido × preço/min`, `TTS = caracteres_falados × preço/char`,
`PA = minutos_de_fala_do_aluno_em_inglês × preço_STT_Azure/min`,
`LLM = (tokens_in_miss × p_in + tokens_in_hit × p_hit + tokens_out × p_out)`.

**Hipóteses do exemplo (minhas, a recalibrar com uso real):** aluno fala **20 min/h** (áudio transmitido
só durante a fala, por VAD; se o microfone ficar aberto, use 60 min); professor fala **25 min/h a
~800 caracteres/min = 20.000 caracteres**; **40 turnos/h**, **4.000 tokens de entrada por turno com
90% de cache** e **120 de saída** (o tamanho real depende da memória do aluno, encomenda paralela);
preço DeepSeek de **pico** (conservador).

| Parcela | Opção | US$/h (20 min / mic aberto 60 min) |
|---|---|---|
| **LLM** | DeepSeek `deepseek-flash`, 160 K tokens in (144 K em cache) + 4,8 K out | **≈ 0,011** (linear no contexto) |
| **STT** | Deepgram Nova-3 `multi` (0,0058/min) | **0,12 / 0,35** |
| | Scribe v2 Realtime (0,39/h) | 0,13 / 0,39 |
| | Azure real-time (1,00/h; +0,30 complemento) | 0,33–0,43 / 1,00–1,30 |
| | `gpt-live-transcribe` (0,017/min) | 0,34 / 1,02 |
| **TTS** | OpenAI `gpt-4o-mini-tts` (12/M) | 0,24 |
| | Azure Neural (15/M) · HD (22/M) | 0,30 · 0,44 |
| | Deepgram Aura-2 (0,03/1K) | 0,60 |
| | ElevenLabs Flash/Turbo (0,04/1K) · v3 (0,08/1K) | 0,80 · 1,60 |
| | Cartesia (≈ 0,05/1K, derivado) | ≈ 1,00 |
| | Kokoro self-host | 0 |
| **PA** | Azure (20 min × US$ 1,00–1,32/h) | **0,33–0,44** |
| | ELSA livre (80 blocos de 15 s × 0,02) | 1,60 |

**Pilha recomendada:** Deepgram `multi` (0,12) + DeepSeek (0,01) + Azure TTS (0,30) + Azure PA
(0,33–0,44) ≈ **US$ 0,76–0,87/h**; com o microfone aberto na hora toda, ≈ US$ 1,0–1,1/h. **Sem PA:** ≈ US$ 0,43/h.
Com ElevenLabs Flash no lugar do TTS: +US$ 0,50/h.

⚠️ **Pegadinha de preço (Deepgram):** os preços publicados **são os com participação no programa de
melhoria de modelo (treino)** segundo o blog Humla (04/08/2026, fonte fraca, citando nota de rodapé que
**não consegui ler** na página); um funcionário da Deepgram disse em 18/06/2025 que sair do programa
"abre mão de um desconto de 50%". **Se o aluno for menor e o treino for inaceitável, conte com o preço
possivelmente dobrado** (`mip_opt_out=true` em **toda** requisição). Não confirmado em fonte oficial.

**Custo fixo:** nenhum (VPS já existe; Pipecat em CPU — Silero + Smart Turn 8 MB). Família com 10 h/mês ≈
US$ 8–13/mês. LiveKit Cloud Ship (US$ 50/mês) **não se justifica** e o plano grátis cobre ~16 h/mês,
mas o áudio passa pela nuvem deles.

---

## 8. Recomendação e o que fica de fora

**A pilha que eu montaria** (ordem de decisão; o 1º passo é o que decide o resto):

1. **Teste de 1 dia antes de codar** (é o que separa aposta de decisão): ~30 frases gravadas com as vozes
   da família (PT puro, EN puro, **mistura na mesma frase**, inglês com sotaque brasileiro) passadas por
   **Deepgram Nova-3 `multi`, Scribe v2 Realtime, AssemblyAI Universal-3.6 e Azure Fast Transcription
   multilíngue**; e 10 frases de TTS ouvidas em **Azure `en-US-AvaMultilingualNeural`, ElevenLabs
   (Flash e v2) e `gpt-4o-mini-tts`**. Medir também o **TTFT do DeepSeek a partir da VPS**.
2. **Orquestração de voz: Pipecat** (BSD-2) em um worker Python na VPS, **transporte WebSocket** pelo
   Traefik (e migrar para SmallWebRTC/LiveKit só se o teste no celular mostrar travamento), **Smart Turn
   v3.2** para fim de turno (PT e EN), `DeepSeekLLMService` com `thinking` desligado.
3. **STT:** o vencedor do teste; **candidato inicial: Deepgram Nova-3 `multi`** (preço, PT+EN oficial,
   sem GPU).
4. **TTS:** o vencedor do ouvido; **candidato inicial: Azure multilíngue** (já na casa, mistura
   documentada, menor preço entre os que declaram mistura).
5. **Pronúncia: Azure PA em paralelo, em `en-US`, só nos trechos em inglês, sem texto de referência**;
   mostrar ao aluno **tendências por fonema/palavra ao longo de várias falas**, não nota de um turno
   curto (nota por turno é ruidosa — inferência). ELSA só como segunda opinião se a Azure não convencer.
6. **LLM:** oficial com raciocínio desligado para o teste; para produção com menor, **decidir entre
   oficial (China) e provedor de pesos abertos (Modal/CoreWeave/LithosAI) só depois de ler a política de
   dado de cada um** (o DR de 28/09 cobre só DeepInfra).
7. **Plano B (apertar-e-falar)** entra como **modo alternativo do mesmo app**, não como recuo.

**Fica de fora, com o motivo:**
- **LiveKit self-host no Swarm** (UDP/host networking, transporte a mais) — volta só se o WebSocket do
  Pipecat não aguentar rede móvel.
- **Whisper/faster-whisper e Voxtral self-host** — Whisper não troca de idioma na frase; Voxtral Realtime
  (4 B) precisa de GPU que a VPS não tem.
- **Kokoro** no v1 — exige roteamento de idioma por trecho e PT "raso"; fica como **plano de custo zero**.
- **Cartesia STT (Ink 2)** — sem PT. **Cartesia TTS** — mistura só documentada em hinglish.
- **Voxtral TTS** — pesos não comerciais.
- **Azure Voice Live API** — BYOM só com modelos do Foundry; não conecta ao DeepSeek oficial.
- **Speech-to-speech (OpenAI/Gemini Live)** — trocam o cérebro.
- **wav2vec2 para nota** — sem nota pronta nem calibração para brasileiros; vira **experimento da fase 2**
  se a Azure falhar.
- **Speechace, SpeechSuper, Language Confidence** — sem streaming declarado, mensalidade mínima ou preço não
  público.

**Outros cargos:** o julgamento de se 2,3 s de latência serve à pedagogia é do CTO/da encomenda
pedagógica; a leitura legal de áudio de menor (LGPD/ECA Digital) é do `analista-de-seguranca` /
jurídico — **abaixo só os fatos de retenção**.

### Retenção e uso do áudio por provedor (fatos, sem leitura jurídica)

| Provedor | O que a fonte diz |
|---|---|
| **DeepSeek (API oficial)** | Só recebe **texto**. Processa/armazena na China, usa para melhoria, sem opt-out claro (DR 03/08 e 28/09, reconferido em 28/09) |
| **Azure Speech** | STT em tempo real, Fast Transcription, **pronunciation assessment** e tradução: "a Microsoft **não retém nem armazena** os dados do cliente" (doc atualizada 26/08/2026). TTS: "nenhum dado persistido". **Lote**: armazenamento do cliente. Aviso: áudio de voz pode ser dado biométrico/pessoal — responsabilidade do cliente |
| **Deepgram** | Programa de melhoria de modelo **retém "frações" do áudio** e treina se o cliente participa; **opt-out por requisição** (`mip_opt_out=true`); padrão de novas contas **não confirmado** em fonte oficial (ver pegadinha de preço) |
| **ElevenLabs** | TTS/STT **retidos por padrão**; apagar por API (backups até 30 dias); **Zero Retention Mode só Enterprise**; provedores de LLM contratados **proibidos de treinar** com o conteúdo |
| **OpenAI** | API **não treina** por padrão (desde 01/03/2023); logs de abuso até **30 dias**; **`/v1/audio/transcriptions` fica sem retenção de abuso** e é elegível a ZDR; `gpt-4o-mini-tts`: não visto na lista |
| **Cartesia** | **Não lido** (a página de retenção redireciona a login) |
| **ELSA / Speechace / SpeechSuper / Language Confidence** | **Não declarado** nas páginas lidas |
| **Self-host (Pipecat/Kokoro/wav2vec2/Whisper)** | O áudio **não sai da VPS** (por construção) — mas STT/TTS em nuvem mandam o áudio mesmo assim |
| **LiveKit Cloud** | Áudio passa pela nuvem do fornecedor (não examinei política) |

---

## O que não foi possível confirmar

- **Nenhuma latência foi medida** (nem do DeepSeek a partir do Brasil, nem de STT/TTS). Todo o orçamento da seção 3 é composição.
- **PT+EN na mesma frase:** sem benchmark independente; o único é do AssemblyAI (vendor, 30/09/2026). Deepgram `multi` e Azure Fast Transcription multilíngue: **intra-frase não declarado nem testado**.
- **Azure TTS:** sem número de primeiro byte publicado; preço das vozes multilíngues não isolado; se "PT falado por voz en-US" soa aceitável — só ouvindo.
- **Azure PA:** se a fala livre (sem referência) existe em `pt-BR`/outros (não preciso aqui: o alvo é inglês); o mapeamento do medidor "US$ 0,30/h" para prosódia/PA é **hipótese**; a página de preço da Azure renderizou "$-" (só o retail API deu valores).
- **Deepgram:** se o preço de tabela já exige participação no treino, e o preço sem ela — nota de rodapé não lida na página oficial.
- **Cartesia:** privacidade (login), TTFB e suporte a PT-BR não confirmados; `ink-whisper` não verificado.
- **ELSA, Speechace, SpeechSuper, Language Confidence:** retenção de dado, streaming real e (SpeechSuper) preço só por fonte secundária/ausente. ELSA: preço na página oficial `elsaspeak.com/en/elsa-api/`; a página de "Capterra" foi descartada.
- **Formato de `MediaRecorder` no Safari/iOS** não conferido nesta rodada.
- **LiveKit Agents JS:** cobertura do modelo de turno para PT em Node não verificada.
- **TEN Framework:** só README lido (licença "Apache-2.0 com restrições" — não li o texto das restrições).
- **Políticas de dado dos provedores ocidentais do V4.1-Flash** (Modal, CoreWeave, LithosAI): não lidas.
- **Idade mínima nos termos** de cada fornecedor: não levantada.
- Fora da lista da encomenda e não pesquisados: Google (Chirp/Gemini-TTS), Amazon, Speechmatics, Gladia.
- O Pipecat v1.0 "estável em abril/2026" é de fonte secundária (blog de comparação), não do repositório.

## Fontes

Data de acesso de todas: **30/09/2026**.

**DeepSeek**
1. DeepSeek API Changelog — https://api-docs.deepseek.com/updates/ — [oficial]
2. DeepSeek Models & Pricing (deepseek-flash) — https://api-docs.deepseek.com/quick_start/pricing — [oficial]
3. DeepSeek Thinking Mode — https://api-docs.deepseek.com/guides/thinking_mode — [oficial]
4. Busca "DeepSeek API audio input realtime" (resumo de busca; só confirma) — [relato, fraca]
5. Artificial Analysis, DeepSeek V4.1 Flash (Non-reasoning) providers — https://artificialanalysis.ai/models/deepseek-v4-1-flash-non-reasoning/providers — [engenharia/medição com metodologia]
6. Artificial Analysis, V4.1 Flash (max) (via busca) — https://artificialanalysis.ai/models/deepseek-v4-1-flash/providers — [engenharia]
7. OpenRouter, DeepSeek V4.1 Flash — https://openrouter.ai/deepseek/deepseek-v4.1-flash/providers — [relato, truncada; preço inconsistente]
8. MarkTechPost, benchmark de TTFT para voz (30/08/2026) — https://www.marktechpost.com/2026/08/30/lowest-latency-inference-apis-for-voice-and-realtime-agents-a-time-to-first-token-ttft-first-benchmark/ — [engenharia secundária]

**Frameworks**
9. LiveKit Agents — https://docs.livekit.io/agents/ — [oficial]
10. LiveKit Agents (README) — https://raw.githubusercontent.com/livekit/agents/main/README.md — [repo]
11. LiveKit: turn detection/interrupções — https://docs.livekit.io/agents/logic/turns/ e .../turn-detector/ — [oficial]
12. LiveKit: plugin OpenAI/`with_deepseek`; código-fonte `llm.py` — https://docs.livekit.io/agents/models/llm/plugins/openai/ e https://github.com/livekit/agents/blob/main/livekit-plugins/livekit-plugins-openai/livekit/plugins/openai/llm.py — [oficial/repo]
13. LiveKit: portas e deploy self-host — https://docs.livekit.io/transport/self-hosting/ports-firewall/ e .../deployment/ — [oficial]
14. LiveKit Cloud Pricing — https://livekit.com/pricing — [oficial]
15. Busca LiveKit `llm_node` + LangChain plugin — https://docs.livekit.io/agents/models/llm/langchain/ — [oficial, via busca]
16. Pipecat: introdução, README, DeepSeek, Azure STT, SmallWebRTC, speech input — https://docs.pipecat.ai/ e https://github.com/pipecat-ai/pipecat — [oficial/repo]
17. Pipecat Smart Turn v3.2 — https://github.com/pipecat-ai/smart-turn — [repo]
18. Busca Pipecat LangChain/FrameProcessor — https://docs.pipecat.ai/guides/fundamentals/custom-frame-processor — [oficial, via busca]
19. API do GitHub (estrelas, push, licença: livekit/agents, agents-js, pipecat, smart-turn, TEN, Unmute, vocode, pipecat-flows, faster-whisper, WhisperLiveKit, Kokoro-FastAPI, chatterbox, etc.), PyPI e npm (`@livekit/agents`, `pipecat-ai`, `@ricky0123/vad-web`, `microsoft-cognitiveservices-speech-sdk`) — [repo]
20. TEN Framework README — https://github.com/TEN-framework/ten-framework — [repo]
21. Kyutai Unmute README — https://github.com/kyutai-labs/unmute — [repo]
22. Busca de frameworks 2026 (micdrop.dev e outros; só contexto de mercado) — [relato, fraca]

**Azure**
23. Pronunciation assessment (how-to) — https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment — [oficial]
24. Pronunciation assessment (Foundry, preços/cenários) — .../pronunciation-assessment-tool — [oficial]
25. Language support (PA, STT, TTS — includes do GitHub) — https://github.com/MicrosoftDocs/azure-ai-docs — [oficial/repo]
26. Language identification — .../language-identification — [oficial]
27. STT data privacy — .../foundry/responsible-ai/speech-service/speech-to-text/data-privacy-security — [oficial]
28. PA characteristics and limitations — .../pronunciation-assessment/characteristics-and-limitations-pronunciation-assessment — [oficial]
29. Voice Live API e BYOM — .../voice-live, .../how-to-bring-your-own-model — [oficial]
30. SSML `lang` — .../speech-synthesis-markup-voice — [oficial]
31. Fast transcription — .../fast-transcription-create — [oficial]
32. Reduzir latência de TTS — .../how-to-lower-speech-synthesis-latency — [oficial]
33. Azure Retail Prices API (`prices.azure.com`, serviço "Foundry Tools", Azure Speech) — [oficial]
34. Microsoft Q&A, preço de PA — https://learn.microsoft.com/en-in/answers/questions/5608069/... — [relato, fraca]
35. Busca "Azure enhanced features $0.30/h" (blogs) — [relato, fraca]

**Outros provedores**
36. Deepgram: preços, idiomas, Flux, programa de melhoria, pré-gravado — https://deepgram.com/pricing, https://developers.deepgram.com/docs/ — [oficial]
37. Humla, Deepgram Data Retention (04/08/2026) — https://humla.team/blog/deepgram-data-retention-policy — [relato, fraca]
38. ElevenLabs: preço API, modelos, Scribe, retenção zero — https://elevenlabs.io/pricing/api, /docs/overview/models, /docs/overview/capabilities/speech-to-text, /docs/developers/resources/zero-retention-mode — [oficial]
39. Cartesia: preço, TTS Sonic 3.6, STT Ink 2, llms.txt — https://cartesia.ai/pricing, https://docs.cartesia.ai/ — [oficial]
40. OpenAI: preços, STT, TTS, retenção — https://developers.openai.com/api/docs/pricing, .../guides/speech-to-text, .../guides/text-to-speech, .../guides/your-data — [oficial]
41. AssemblyAI, benchmark de code-switching (30/09/2026) — https://www.assemblyai.com/blog/multilingual-speech-to-text-api — [fornecedor concorrente, fraca]
42. Mistral Voxtral Transcribe 2 e Voxtral TTS — https://mistral.ai/news/voxtral-transcribe-2/, https://mistral.ai/news/voxtral-tts/ — [oficial]
43. Kokoro-82M (VOICES.md, README) — https://huggingface.co/hexgrad/Kokoro-82M — [repo]
44. faster-whisper README — https://github.com/SYSTRAN/faster-whisper — [repo]
45. WhisperLiveKit — https://github.com/QuentinFuxa/WhisperLiveKit — [repo]
46. Whisper Discussion #2009 — https://github.com/openai/whisper/discussions/2009 — [relato da comunidade]

**Pronúncia**
47. SpeechSuper — https://www.speechsuper.com/ — [oficial]
48. Speechace API plans — https://www.speechace.com/api-plans/ — [oficial]
49. ELSA API — https://elsaspeak.com/en/elsa-api/ e https://api-external-doc.elsanow.co/General-api-info — [oficial]
50. Language Confidence — https://docs.languageconfidence.ai/ — [oficial]
51. Hugging Face: `facebook/wav2vec2-xlsr-53-espeak-cv-ft`, `wav2vec2-lv-60-espeak-cv-ft` (API de metadados) — [repo]
52. Repo `crazycloud/mispronunciation-detection-diagnosis-wav2vec2-and-llm` (60 ★, Apache-2.0, parado desde 05/2024); buscas acadêmicas (wav2vec2 MDD, ZIPA, POWSM) — [repo/relato acadêmico, só orientação]

**Conversa e cliente**
53. Stivers et al., turn-taking em 10 idiomas, PNAS 2009 — https://pmc.ncbi.nlm.nih.gov/articles/PMC2705608/ — [acadêmico]
54. `@ricky0123/vad-web` — https://github.com/ricky0123/vad — [repo]
55. MDN `MediaRecorder.isTypeSupported` — https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static — [oficial; tabela não veio]

*Parei em ~55 fontes (passei das 30 do alvo): o território tem quatro decisões acopladas —
orquestração, STT, TTS e pronúncia — e a pergunta de mistura PT/EN exigiu confrontar fonte oficial e fonte
de fornecedor provedor por provedor.*
