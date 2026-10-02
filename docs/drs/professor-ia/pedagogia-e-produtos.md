---
titulo: Como um professor de inglês por IA (voz, família brasileira) deve se comportar — pedagogia por trás e como os tutores de IA de 2026 a implementam
data: 2026-09-30
departamento: tecnologia
encomendado-por: CEO (via dev do app Família Figueiredo, rbk-eng)
decisao-alvo: definir o comportamento do professor (system prompt, progressão PT→EN, forma de corrigir, estrutura da aula, encaixe das palavras do Anki) e o que medir do progresso do aluno
tags: [tutor-de-ia, ensino-de-ingles, correcao-de-erro, lingua-materna, nivelamento-cefr, metricas-de-progresso, estrutura-de-aula, rbk-eng]
validade: media   # pedagogia = longa; benchmark de produtos = curta (meses)
status: parcial
---

# Professor de inglês por IA: pedagogia e benchmark (30/09/2026)

> Legenda usada no texto. **[F]** = fato de fonte aberta e lida. **[V]** = alegação do próprio fornecedor (sem auditoria externa). **[I]** = inferência minha a partir de fatos citados. **[H]** = hipótese de projeto, **sem fonte que dê o número** — ponto de partida para calibrar, não achado. Onde a resposta é "não há fonte", está escrito.

## O essencial em 5 linhas

1. **Língua materna (L1):** a pesquisa não manda banir o português nem fixa um percentual por nível CEFR — **nenhuma fonte lida dá "X% de PT no A1"**. O que existe: revisão de referência (Hall & Cook, 2012) apoiando uso *funcional* da L1 (explicar palavra/gramática, acolher, checar entendimento), posição ACTFL de 90%+ na língua-alvo como meta, e dois produtos que já fazem a regra do CEO (Duolingo: "Falstaff" guiado, com feedback na língua do aluno, para iniciante; "Lily" só em língua-alvo para quem avança). **Recomendo definir a regra por função (quem fala o quê), não por percentual**, e reduzir o PT por função conforme o aluno demonstra entender sem ele.
2. **Correção:** a meta-análise de sala de aula (Lyster & Saito, 2010) dá vantagem a *prompts* (pedir reformulação) sobre *recasts*, mas é disputada (Goo & Mackey, 2013) e em aula individual todas as técnicas funcionam. O que sobrevive às duas escolas: **corrigir de forma seletiva (1–2 alvos por aula), com escada do implícito ao explícito, avisando que é correção, deixando espaço para o aluno repetir sem exigir, repetindo o mesmo erro em várias aulas, e vigiando a ansiedade** (Ellis, 2009). Corrigir o que está certo é a reclamação nº 1 de tutores de IA (Talkpal) — *na dúvida, não corrija*. Nenhuma fonte dá "quantas correções por minuto".
3. **Nível:** o molde validado para estimar nível por conversa é a **entrevista oral do ACTFL (aquecimento → checagens de "piso" → sondas de "teto" → encerramento, 20–30 min)**; LLM avalia transcrição razoavelmente com descritores CEFR (zero-shot supera um baseline treinado, mas fica abaixo de modelos especializados em fala), **e fluência por texto puro não serve: precisa de medidas de tempo** (taxa de fala, pausas). Detectar subida = "o teto virou piso": sondas do nível seguinte sustentadas em mais de um tema e mais de uma sessão.
4. **Aula e Anki:** o padrão de produto (Speak, Busuu, Duolingo) é **alvo curto → prática em tarefa → feedback no fim**; Busuu já faz a conversa usar vocabulário/tópicos do que o aluno estudou. Evidência para o Anki: aprender palavra só por encontro em leitura/escuta rende pouco (9–18% das palavras-alvo no teste imediato; ~1 em 28 depois de 3 meses) — **a conversa deve forçar a produção da palavra que vence hoje (recuperação), não apenas mencioná-la**.
5. **Criança e métricas:** o que há de evidência é estreito — RCT com 67 crianças de 5–8 anos mostrou agente LLM bilíngue **igual ou melhor que pai em compreensão, pior em engajamento afetivo** (o tutor complementa o adulto, não o substitui), e voz expressiva aumenta concentração em pré-escolares. Métricas: **o tripé CAF (complexidade, precisão, fluência) + vocabulário ativo + compreensão sem PT + dependência de PT**, calculadas dos eventos brutos da conversa, nunca guardadas como número solto.

---

## 1. Progressão português → inglês

### O que a pesquisa diz sobre a L1

- **[F]** Hall & Cook (2012, *Language Teaching*), revisão de referência: durante mais de um século assumiu-se que língua se ensina monolingue; a literatura recente **reavalia** isso, documenta uso amplo da L1 em salas do mundo todo (inclusive no Brasil) e examina a noção de uso "ótimo". Funções de L1 documentadas na revisão: explicar vocabulário e gramática, gerenciar a aula, reduzir ansiedade e criar vínculo — com relato específico de benefício afetivo com **iniciantes** (Stibbard, 1998; Levine, 2003, citados por eles). Lido no PDF (trechos), não só no resumo.
- **[F]** Littlewood & Yu (*Language Teaching*, 2011, resumo): o princípio "só língua-alvo" domina há décadas mas professores usam muita L1; o artigo propõe um **quadro de princípios para equilibrar** as duas e estratégias para **maximizar a língua-alvo sem negar o potencial da L1**. Só o resumo foi lido.
- **[F]** Uso observado de L1 por professores (citado em Hall & Cook): entre 0% e ~18% da fala do professor (Rolin-Ianziti & Brownlie, 2002: 0–18,15%; Macaro, 2001: 0–15,2%). **É prática observada em turmas que já usam muito inglês, não prescrição** — não serve de meta para iniciante absoluto.
- **[F]** ACTFL (posição de 21/05/2010): **90%+ em língua-alvo em todos os níveis**, "quando possível" fora da aula, com estratégias de compreensão (apoio visual, gesto, negociação de sentido). A declaração não trata do papel da L1. É uma meta normativa de uma associação, não um achado experimental.
- **[F]** Em voz com LLM: estudo de 6 semanas com 20 universitários coreanos (arXiv 2512.23136, dez/2025) mostrou que aprendizes trocam para a L1 sobretudo para **substituir uma palavra que não sabem** (26,4% dos casos: expressões do dia a dia) e para **expressar emoção e nuance**; relataram **redução de ansiedade** (média 5,72/7). Nove professores desenharam respostas ao code-switching: **intervenção seletiva**, dar o equivalente em inglês, *não* explicar tudo, e às vezes deixar a palavra como "lição de casa". Conclusão dos autores: suporte de L1 **sensível ao contexto**, em momentos específicos, não como opção permanente.
- **[F]** **O prompt sozinho não segura o nível.** "Alignment drift" (arXiv 2505.08351, mai/2025): prompts com CEFR restringem o nível no começo, mas são **frágeis em interações longas** (testado em espanhol A1/B1/C1 com modelos de 7–12B). E para iniciante (A1–A2) outro artigo (arXiv 2506.04072, rev. fev/2026) afirma que **só prompt não resolve** a tendência de LLM falar em complexidade quase nativa; com geração controlada a compreensibilidade subiu de 39,4% para 83,3% (universitários japoneses). **[I]** Modelos maiores de 2026 podem ter melhorado; nenhum dos dois testou os modelos atuais — **a regra de projeto é reinjetar o limite de nível a cada turno e medir**, não confiar no prompt inicial.
- **[F]** Cobertura lexical para *escuta*: 90–95% de palavras conhecidas bastam para compreender fala (van Zeeland & Schmitt, 2012, *Applied Linguistics*; 95% dá compreensão boa e com pouca variação entre aprendizes), bem abaixo dos 98% da leitura. **[I]** Consequência direta para o professor: **≥95% das palavras que ele diz devem ser conhecidas (ou glosadas) pelo aluno**, exceto as palavras-alvo.

### O que os produtos fazem

- **[F] Duolingo** (posts oficiais): *Video Call com Lily* (24/09/2024) fala só a língua-alvo, "se ajusta ao seu nível", **não corrige gramática na chamada** e deixa o aluno pedir "repete/mais devagar". Em 14/01/2026 lançou ***Video Call com Falstaff*** para iniciantes: chamadas **guiadas** — perguntas ao nível, **sugere frases e traduções, dá feedback em tempo real na língua do próprio aluno**; o plano é ter "guiadas (Falstaff) e não guiadas (Lily)" em cada unidade. É a mesma regra do CEO, implementada por produto: **andaime em L1 no começo, língua-alvo pura depois**.
- **[V]** Duolingo (pesquisa própria, 10/03 e 30/03/2026; metodologia e amostras não detalhadas): iniciantes em francês/espanhol que usaram Falstaff falaram melhor as frases de conversa que quem não usou; japoneses de inglês intermediário (Duolingo Score 60–71) que fizeram Lily ≥2x/dia por um mês melhoraram mais num teste padronizado de fala; anglófonos de espanhol (45–55) ganharam em fala e confiança.
- **[F] Speak** ajuda oficial: o curso de inglês tem **português como língua de instrução** (15 línguas nativas listadas); a explicação vem na língua do aluno. **[V]** Praktika (review de terceiro, fonte fraca): A1–A2 com andaime na língua nativa, B1 quase todo em inglês.
- **[F] Busuu** (página de produto): a IA conversa **no nível CEFR da lição atual do aluno** (A1–C1).

### Proposta: regra por função (não por percentual)

**[I]/[H]** — a tabela abaixo é desenho meu, ancorado nos fatos acima; os níveis e quebras são **ponto de partida para calibrar**.

| Função da fala do professor | Pré-A1/A1 | A2 | B1 | B2+ |
|---|---|---|---|---|
| Conteúdo da conversa (o "assunto") | EN, frase curta e lenta; PT só para destravar | EN | EN | EN |
| Instrução da atividade ("agora repita…") | EN curta **+ PT** logo depois | EN; PT se falhar | EN | EN |
| Significado de palavra nova | PT (tradução) + EN modelo | EN simples + PT se falhar | EN (exemplo/definição); PT a pedido | EN |
| Explicar erro / gramática | PT breve (1–2 frases) + exemplo em EN | PT breve ou EN simples | EN + exemplo; PT se travar | EN |
| Acolher, encorajar, desfazer frustração | PT + EN | EN; PT se o aluno travou | EN; PT em frustração | EN; PT em frustração |
| Checar entendimento | PT ("entendeu?") | EN + PT de apoio | EN | EN |

Ponto de partida de **fatia de inglês na fala do professor** **[H]**: A1 ~30–50%; A2 ~60–80%; B1 ~85–95%; B2+ ≥95% (ecoa o "90%+" do ACTFL só a partir do intermediário). **Esses números não vêm de nenhuma fonte** — existem para a primeira versão ter algo a medir e ajustar.

### Como decidir quando reduzir

**[H]**, por função e com evidência do próprio aluno (o nível CEFR só define o *teto* de PT; quem reduz é o desempenho):

1. **Reduz** o PT de uma função quando, nas últimas ~3 sessões, o aluno **responde adequadamente à versão só-EN na primeira tentativa** na maior parte das vezes (limiar inicial sugerido: ~80%), pede PT raramente (ex.: <1 pedido por 10 min) e seus turnos em EN estão ficando mais longos.
2. **Ordem de retirada sugerida [I]:** primeiro instruções e conteúdo da conversa; depois acolhimento; **explicação de gramática é a última** (é onde a L1 mais economiza tempo e carga cognitiva — Hall & Cook).
3. **Volta atrás é permitido e local:** duas falhas seguidas de compreensão → PT *naquela função, naquele tema*, sem regredir o aluno inteiro. Tema novo, cansaço ou frustração autorizam andaime temporário (achado do estudo coreano: L1 reduz ansiedade).
4. **Quando o aluno fala PT no meio da frase** (lacuna de palavra): dar a palavra em EN, pedir que repita e seguir — não dar aula (estudo coreano: substituição de palavra é o caso mais comum).

---

## 2. Nivelamento por conversa e detecção de subida

### O que o teste de colocação conversacional faz de fato

- **[F]** ACTFL OPI (relatório de 2023): entrevista **adaptativa de 20–30 min**: aquecimento (conhece o examinando e escolhe o "nível de trabalho") → **checagens de nível** (perguntas no nível em que ele sustenta desempenho: o **piso**) alternadas com **sondas** (perguntas do nível acima, para achar o **teto**, onde ele deixa de sustentar) → encerramento. Repete-se em **vários temas** até o padrão ficar claro; o nível só é atribuído depois de **provar piso e teto** com múltiplas perguntas. Piso em Novice = linguagem memorizada/formulaica sobre si e o dia a dia; Intermediate = combina e recombina o aprendido para criar sentido novo e responde/pergunta sobre temas familiares.
- **[I]** ACTFL ≠ CEFR (escalas diferentes, sem equivalência 1:1 nas fontes lidas). Aproveita-se o **método** (piso/teto, vários temas, sondas), não os rótulos.
- **[F]** Descritores CEFR para interação oral (texto do Conselho da Europa, **lido via sites secundários**; página oficial deu 403): A1 — interage de modo simples, **dependente de repetição, ritmo mais lento, reformulação e reparo**; A2 — lida com trocas simples e rotineiras, "desde que o outro ajude"; B1 — comunica-se com alguma confiança em temas familiares, rotineiros e não rotineiros. Produção oral global: A1 "frases isoladas"; A2 "série curta de frases simples ligadas em lista"; B1 "descrição linear com razoável fluência". O Companion Volume (2020) acrescentou enriquecimento de **Pré-A1/A1**, relevante para iniciante absoluto e criança.
- **[F]** **LLM como avaliador de transcrição:** Qwen 2.5 72B, *zero-shot*, com descritores "can-do" do CEFR, avaliou fala espontânea de L2 **melhor que um baseline BERT treinado**, mas **abaixo dos sistemas especializados em fala** (SLaTE 2025, arXiv 2507.10200). Para **fluência**, a combinação de um juízo de LLM sobre o texto + medidas de tempo chegou a ρ=0,818 contra o consenso humano (acima da mediana dos avaliadores), e **a forma de escrever as pausas para o LLM não muda nada — o sinal vem das medidas de tempo** (arXiv 2608.26137, jun/2026; 130 falas do ICNALE, não CEFR).
- **[F]** Medidas de fluência que separam níveis (Tavakoli, Nakatsuhara & Hunter, 2020, 32 falantes do Aptis, A2–C1): **velocidade e medidas compostas distinguem de A2 até B2**; várias medidas de interrupção/pausa distinguem A2 do resto; reparo é inconsistente.
- **[V]** Produtos: Google Translate Practice pede ao usuário escolher Básico/Intermediário/Avançado (beta desde 26/08/2025, inclui falantes de português praticando inglês); Busuu usa o nível da lição; ELSA e Duolingo usam teste curto/score (não auditado aqui).

### Proposta de conversa de nivelamento (PT+EN, ~8–12 min) **[I]/[H]**

1. **Autoavaliação em PT**, leve ("já estudou? o que entende quando ouve?"), só para escolher o ponto de partida.
2. **Aquecimento** em EN formulaico com PT de fallback (nome, onde mora, gostos).
3. **Checagens** no nível provisório (A1→A2: rotina, família, preferências) e **sondas** um nível acima (passado e planos → B1; opinião com "por quê" e hipótese → B1+/B2). Sondas com apoio (repetir mais devagar uma vez) e **sem PT**, para separar *não entende* de *não sabe dizer*.
4. **Parada:** duas sondas seguidas falhas em dois temas = teto; piso = maior nível sustentado em ≥2 temas.
5. **Saída:** nível provisório **com faixa e confiança baixa**; refinar nas 2–3 primeiras aulas. **Perfil por habilidade**, não nota única: escuta, interação oral, produção, pronúncia — escuta e fala costumam divergir em adulto que estudou na escola (**[I]**; o CEFR descreve "perfis" por habilidade).
6. Não dizer "você é B1" como sentença ao aluno; dizer **o que ele já consegue fazer** ("você já pede comida e conta o que fez ontem").

### Detectar que subiu de nível **[H]**, com a lógica do ACTFL

- **O teto virou piso:** sondas do nível N+1 sustentadas em ≥2 temas e em ≥2 sessões, **sem PT**, com medidas objetivas acima da linha de base do próprio aluno (taxa de fala, comprimento médio do enunciado, pausas dentro de frase).
- **Medir em tarefa nova.** Repetir a mesma tarefa infla fluência (estudo com 6 crianças de 9 anos: fluência sobe com a repetição e os trade-offs entre complexidade/precisão/fluência somem na 3ª vez — Sample & Michel, 2015) — ótimo para treinar, ruim para medir.
- **Quem avalia não é o professor durante a conversa.** Praktika separa, por arquitetura, o agente de lição do "agente de progresso" (OpenAI, 22/01/2026); a razão pedagógica vale aqui: o professor foca em ensinar, e um passo posterior lê a transcrição e atualiza o perfil. (Como montar isso é outra encomenda.)
- **Não existe fonte sobre quantas sessões/turnos dão estimativa confiável**; "confiança baixa até ~3 sessões" é hipótese minha.

---

## 3. Correção de erro na fala

### O que a pesquisa diz

| Achado | Fonte |
|---|---|
| **[F]** *Recasts* (repetir certo) são a técnica mais usada pelos professores (55–57% de todo o feedback, contra ~30% de *prompts*) mas **geram pouco reparo pelo aluno**; elicitação, feedback metalinguístico, pedido de esclarecimento e repetição geram reparo produzido pelo aluno | Lyster & Ranta, 1997 (primário, imersão em francês); Brown, 2016 (meta-análise: recasts 57%, prompts 30%, gramática 43% dos alvos) |
| **[F]** CF tem efeito **significativo e durável** em sala (15 estudos, N=827); efeito **maior para prompts que para recasts** e maior em medidas de resposta livre; **crianças mais novas se beneficiam mais** | Lyster & Saito, 2010 |
| **[F]** Meta-análise de 33 estudos: efeito médio; **feedback implícito se mantém melhor com o tempo**; laboratório > sala; **contextos de língua estrangeira > segunda língua** | Li, 2010 |
| **[F]** *Contradição:* o caso "contra os recasts" tem problemas metodológicos (comparações, tempo de exposição, conhecimento prévio); **recasts funcionam** em dezenas de estudos, inclusive com crianças | Goo & Mackey, 2013 |
| **[F]** Em sala, aprendiz tem dificuldade de notar feedback implícito; **em laboratório, com atenção individual, todas as técnicas são igualmente salientes e eficazes** | Saito (capítulo de Handbook), sobre Li 2010 e Lyster et al. 2013 |
| **[F]** Aprendizes de nível pré-intermediário: **explicação metalinguística superou recast** em testes tardios (passado -ed) | Ellis, Loewen & Erlam, 2006 |
| **[F]** Recast ajuda quem está **"desenvolvimentalmente pronto"** para a forma, não quem não está | Mackey & Philp, 1998 (citado em Saito) |
| **[F]** **Ansiedade:** recasts só beneficiaram aprendizes de **baixa ansiedade** que produziram a forma corrigida; nos de alta ansiedade o grupo com recast não diferiu do controle (N=45) | Sheen, 2008 |
| **[F]** Aprendizes **preferem receber mais correção** do que professores acham que devem dar | Lyster, Saito & Sato, 2013 |
| **[F]** Quando o feedback é **tradução** e recast (adulto em ESL), o reparo do aluno é baixo | Panova & Lyster, 2002 |

**Dez diretrizes de Ellis (2009)** — a síntese mais utilizável [F, lida no PDF]: CF funciona, inclusive em atividade de fluência; **focada (1–2 tipos de erro) tende a ser melhor que não focada**; o aluno deve **saber que está sendo corrigido** (recast oculto pode não ser percebido); começar **implícito** (indicar que há erro) e, se o aluno não se autocorrige, ir ao **explícito**; o timing (imediato × adiado) — *"não é possível chegar a uma conclusão geral"* e a ideia de que correção imediata sempre atrapalha a fluência *"provavelmente não se justifica"*; dar **espaço para o aluno assimilar, sem exigir** que repita; variar por aluno; **corrigir o mesmo erro várias vezes**; **monitorar se a correção gera ansiedade**.

### Quantas correções sem travar a conversa

**Não há fonte com número** (nem "por minuto", nem "por turno"). O que as fontes permitem afirmar: seletividade (Ellis), adaptação à ansiedade (Sheen, Ellis), e que correção imediata não destrói a fluência *se* for breve (Ellis, Basturkmen & Loewen, 2001, citado por Ellis). **Regras de projeto [H]:** 1–2 alvos por aula; no máximo uma correção visível a cada ~3–4 turnos do aluno e nunca duas seguidas; o resto é **acumulado e entregue em até 3 itens no fim da tarefa** (é o que o Busuu faz — feedback ao terminar; e o que Willis propõe: foco em forma depois da tarefa, porque aprendiz de nível baixo não atende a forma e ao sentido ao mesmo tempo).

### Escada por nível **[I]**, sobre os fatos acima

- **Erro vs lapso:** se a forma **não está no repertório** do aluno (erro), *prompt* não funciona — ele não tem o que recuperar; dê o modelo (recast + gloss em PT no A1). Se a forma **é conhecida e escorregou** (lapso), use *prompt* (pedir de novo, "how do you say…?", elicitação), porque o ganho dos prompts vem de forçar **recuperação e produção** (hipótese citada em Panova & Lyster, 2002).
- **Pré-A1/A1:** recast curto + repetição modelada; explicação só em PT e em 1 frase; nunca terminologia gramatical.
- **A2–B1:** escada de Ellis: sinalizar ("Hmm, *yesterday*?") → elicitar → modelo explícito.
- **B2+:** prompts e feedback metalinguístico em EN; resumo de erros recorrentes no fim.
- **Aluno ansioso/criança tímida:** mais implícito e mais elogio específico; menos explícito (professores do estudo coreano relataram o mesmo).
- **Como LLM erra:** (a) "corrige" o que está certo — Talkpal, reclamação nomeada de um aprendiz C1/C2 ("bandeiras laranja constantes… correções incorretas"); (b) Gemini por voz avalia até fala correta ou esquece a instrução de feedback (Android Police, 17/09/2026, relato); (c) modelos corrigem bem a superfície, mas **explicam mal, sem terminologia e conhecimento de domínio** (arXiv 2608.16286, ago/2026); (d) alguns tutores priorizam fluência e **deixam passar erro sutil** (Avouris, 2025). **Regra de projeto:** *na dúvida, não corrija* — confirmar o sentido é melhor que corrigir errado.

### Pronúncia na conversa (só o comportamento; a ferramenta é outra encomenda)

- **[F]** Aprendizes **notam feedback de pronúncia com mais clareza que de gramática**: em imersão, repararam o erro em 62% dos casos de CF fonológica contra 22% de gramática; razão de reparo >70% em vários contextos (citado em Saito).
- **[F]** *Recasts* de /ɹ/ **em discurso com sentido** + instrução focada melhoraram a fala espontânea (65 japoneses; Saito & Lyster, 2012); a instrução sem CF não. **Mas** aprendizes **inexperientes repetiram o recast e não melhoraram** (Saito & Akiyama, 2017) — falta "conhecimento fonético explícito"; instrução articulatória curta **antes** do CF ajuda (Saito, 2013). Em estudo com coreanos avançados, recast e prompt renderam igual, mas os alunos reagiram de modo diferente (repetiram o modelo vs produziram formas híbridas).
- **[F]** Priorizar o que afeta **compreensibilidade**: em adultos, instrução explícita de **acento de palavra/frase e entonação** rendeu mais que segmentos (Derwing et al., 1998, citado em Saito), e palavras frequentes primeiro.
- **[V] Speak** (blog 01/10/2024) admite que modelos voz-a-voz ainda **não são bons em coaching de pronúncia**; Gemini "perdoa em silêncio" o sotaque (relato, set/2026).
- **Regra de projeto [I]:** na conversa, **um som/ritmo por vez**, só se atrapalha ser entendido; modelo + contraste, peça uma repetição; **no A1, uma frase curta em PT explicando como fazer o som antes do recast**; o registro detalhado vai para a ferramenta de pronúncia, não para a conversa.

---

## 4. Estrutura da aula de 15–30 min e o Anki

### Estruturas que existem

- **[F] Speak:** método "Learn → Practice → Apply" (aprender frases, praticar até automatizar, aplicar numa conversa com o tutor) + revisão espaçada de tudo o que errou; blog de 24/03/2026: se o aluno diz certo o agente segue; se erra gramática **explica o erro e pede para tentar de novo**; se pergunta, responde e devolve à tarefa; se sai do tema, redireciona.
- **[F] Busuu Conversations:** conversa **construída sobre o conteúdo da lição** (vocabulário e tópicos já estudados), nível CEFR da lição, **feedback com correção e explicação curta ao terminar**.
- **[F] Duolingo:** Falstaff começa pedindo para **traduzir as frases aprendidas** na trilha e só depois conversa 1 a 1; chamadas de ~1 min no início e até 3 min mais adiante.
- **[V] Praktika:** plano de estudo por objetivo e nível; três agentes (lição, progresso, planejamento) com memória persistente de objetivos, preferências e **erros passados**; a memória é recuperada **depois** que o aluno fala, para o tutor reagir ao erro de agora (OpenAI, 22/01/2026); "+24% de retenção no dia 1" e "receita 2x" são dados do próprio Praktika/OpenAI.
- **[F] Pesquisa de tarefa:** planejar antes da tarefa aumenta fluência e complexidade (Foster & Skehan, 1996); **repetir a tarefa** eleva fluência e, na 3ª vez, a competição entre fluência/precisão/complexidade some (Sample & Michel, 2015, crianças de 9 anos); Nation propõe equilíbrio entre quatro vertentes (input com foco em sentido, output com foco em sentido, foco na língua e desenvolvimento de fluência) — **lido só em resumos de busca, fonte fraca**.
- **[F]** Estudo randomizado com 86 alunos de MBA (arXiv 2609.23958, set/2026; **não é língua**): **estrutura pedagógica do tutor** produziu o ganho; voz vs texto não mudou a aprendizagem (voz dobrou a interação e custou 2,8x). Transferência limitada, mas reforça "o roteiro da aula importa mais que a modalidade".

### Esqueleto proposto (20 min) **[I]/[H]** — as proporções são minhas

| Min | Fase | O que o professor faz |
|---|---|---|
| 0–2 | **Aquecimento** | Acolhe (PT no A1), puxa um fato da aula passada ou da vida do aluno (memória), dá o objetivo do dia em uma frase ("hoje você vai conseguir…") |
| 2–5 | **Alvo** | Apresenta 3–5 frases/palavras-alvo em contexto, com PT de apoio no A1–A2; aluno repete; **palavras do Anki que vencem hoje entram aqui já como "recuperação"** (veja abaixo) |
| 5–14 | **Prática em tarefa** | Role-play/conversa sobre um tema do aluno, com as palavras-alvo; correção focada (seção 3) |
| 14–18 | **Repetição com variação** | Mesma tarefa de novo, mais rápido ou com um detalhe novo (fluência; trade-offs somem na 3ª repetição) |
| 18–20 | **Fechamento** | Até 3 correções recorrentes (modelo + 1 tentativa), palavras do dia que saíram e as que faltaram, "o que você já consegue fazer", o que vem na próxima aula |

15 min: corte a repetição com variação. 30 min: duas tarefas de prática. **Criança:** 8–10 min, blocos de 2–3 min (seção 6).

### Como encaixar as palavras do Anki que vencem hoje

**Por que não basta "usar a palavra na conversa":** **[F]** ganho de palavra por encontro incidental é baixo — meta-análise de 24 estudos: **9–18%** das palavras-alvo aprendidas no teste imediato e 6–17% no tardio (Webb, Uchihara & Yanagisawa, 2023); em histórias, em média **uma de 28** palavras retida após 3 meses em leitura e **nenhuma** em escuta (Brown, Waring & Donkaewbua, 2008); repetição tem efeito médio (r=.34; espaçamento e engajamento moderam — Uchihara et al., 2019). **[I]** Conversa soma encontros **com produção**, mas não substitui o SRS.

**Regras de projeto:**
1. **Escolher poucas** (3–5 palavras por aula **[H]**; não há fonte para o número) entre as devidas hoje, priorizando as **mais atrasadas** e as que se encaixam no **tema que o aluno escolheu**.
2. **Fazer o aluno produzir a palavra, não ouvi-la.** O professor cria uma pergunta cuja resposta natural usa a palavra ("What did you eat…?"), **espera**, e só então dá pista (primeira letra/contexto) → modelo (recast) → reusa 2 minutos depois. Fundamento **[F]**: ganho de prompts vem de recuperação e produção (Panova & Lyster, 2002).
3. **Registrar o resultado por palavra:** produziu sozinho / com pista / não produziu. **[H]** Essa informação pode alimentar a nota do FSRS, mas a detecção automática de "lembrou" numa conversa é ruidosa — **[I] recomendo sugerir a nota ao aluno no fim ("essa foi fácil, difícil?") em vez de gravar sozinho**; decisão do dev.
4. **Palavras salvas de livro/música que ainda não entraram no Anki** entram como **assunto da conversa** ("you saved *lighthouse* from that song — tell me about…"), convertidas em alvo se o aluno gostar. Motivação e contexto pessoal (Praktika: memória de objetivos/preferências; Duolingo: Lily puxa assunto do aluno).
5. **O professor só usa palavras ao nível do aluno fora dos alvos** (≥95% conhecidas, seção 1) — senão a recuperação vira confusão.

---

## 5. Benchmark de produtos (datado; validade curta)

| Produto | Nível | Língua materna | Correção | Memória/plano | O que usuários elogiam / reclamam |
|---|---|---|---|---|---|
| **Speak** | Método estruturado; "proficiency graph" que rastreia o estado de conhecimento [V, blog 01/10/2024]; Tutor "adapta ao seu nível" (ajuda oficial) | **PT como língua de instrução** (ajuda oficial, 15 línguas) | Corrige e **pede nova tentativa** (blog 24/03/2026); feedback parcial em tempo real (palavras certas acendem); revisão espaçada com base em erros | Plano/review por erros **no Premium Plus** (ajuda oficial) | Elogio: estrutura para iniciante, revisão inteligente (reviewer nomeado, 209 dias, 22/09/2026). Reclamação: repetição pesada, sem salvar vocabulário manual. Trustpilot: só 2 avaliações — sem valor estatístico |
| **Praktika** | Plano por CEFR A1–C1 + objetivo | Andaime em L1 no A1–A2 (fonte fraca, review de terceiro) | "Feedback limitado", plano rígido (reviews de terceiros, fracos) | **Memória persistente + agente de progresso + agente de planejamento** [V, OpenAI 22/01/2026]; Praktika 4.0 (19/02/2026): "Study Plans mais inteligentes" | Trustpilot 30/09/2026: **3,6/5 (1.211 avaliações)**; reclamações: **cobrança/cancelamento**, **IA fala rápido demais para iniciante**, reconhecimento inconsistente, interações repetitivas |
| **Duolingo Max** | Falstaff (iniciante) × Lily (não guiada) | **Falstaff fala na língua do aluno**; Lily só língua-alvo | Lily: **não corrige gramática** na chamada (2024); Falstaff: feedback em tempo real | Nível pela trilha; 1→3 min por chamada | Relato (jan/2026): Lily simpática, mas áudio com atraso, frases inaudíveis, transcrição inconsistente, comentários de gramática/pronúncia fracos; busca de terceiros: corta o aluno e encerra abrupto, **iniciante evita a chamada** (fonte fraca). **[V]** pesquisa interna com ganhos de fala |
| **ELSA** | Teste curto + previsão de CEFR A1–C1 (fonte secundária) | não verificado | Análise por fonema (verde/amarelo/vermelho), entonação, fluência, gramática, vocabulário | conversa com IA "personalizada" | App Store 30/09/2026: 4,8/5 (113 mil); reclamações: **detecção de voz instável**, upsell agressivo, **"mostra o erro, não ensina como melhorar"**. Foco é pronúncia, não professor conversacional |
| **Loora** | Melhor para B1+ (reviews de terceiros, concorrentes — fracos) | sem andaime de L1 no iniciante | Correção **depois** da resposta (reclamação: iniciante quer na hora); explicações durante | "Memória de peixe-dourado" (terceiros) | Trustpilot 30/09/2026: **4,2/5 (129)**; elogio: conversa natural, correção na hora; reclamação: **interrompe antes de terminar**, não entende pronúncia às vezes, conversas repetitivas |
| **Talkpal** | Muitos modos; sem nível claro | IA às vezes não entende a L1 do aluno em chat (Avouris, 2025) | Marcação verde/correção instantânea; **correções erradas** em avançados | sem resumo pós-aula (terceiro) | Trustpilot: elogio de correção instantânea e "parece gente"; reclamação: **correção incorreta**, perguntas repetidas, iniciante "travado" sem vocabulário |
| **Busuu Conversations** | **Nível CEFR da lição** | não especificado | **Feedback ao final**, com explicação curta | conversa usa vocabulário estudado | sem avaliação de usuários lida |
| **Babbel Speak** | pedagogia define progresso, IA faz a conversa [V, beta 16/09/2025] | não especificado | "feedback" — timing não distinguido na página | cenários curados | sem avaliação lida |
| **Google Translate Practice** | usuário escolhe Básico/Intermediário/Avançado; adapta | PT↔EN (falantes de português praticando inglês) | dicas; escuta/fala | "acompanha progresso diário" | grátis, beta desde 26/08/2025; é concorrente direto e gratuito |
| **Gemini/ChatGPT por voz** | prompt do usuário | qualquer | Gemini perdoa sotaque, esquece instrução (17/09/2026) | sem memória pedagógica | flexível, mas sem currículo |

**Padrões que se repetem, por ordem de força:**
1. **Reclamação nº 1 (todos): o tutor fala rápido demais, corta o aluno, não dá tempo de pensar** — Duolingo, Praktika, Loora. O blog de engenharia do Speak (24/03/2026) afirma o mecanismo: aprendiz pausa mais que nativo, e detecção de fim de fala por silêncio fatia a frase. **Comportamento [I]: esperar, e quando o silêncio passa de uns segundos oferecer dica em vez de falar por cima.** (A parte de detecção de turno é tecnologia de voz, outra encomenda.)
2. **Correção errada ou excessiva** derruba confiança (Talkpal, Gemini).
3. **Iniciante sem andaime** abandona (Duolingo criou o Falstaff justamente por isso; Loora/Praktika/Talkpal têm relatos de iniciante travado).
4. **Memória** é o diferencial que os próprios produtos vendem (Praktika, Speak Premium Plus), enquanto Loora/Praktika recebem a crítica de repetição.
5. **Conversa ancorada no que o aluno estudou** (Busuu, Falstaff) é o padrão de quem tem currículo — é exatamente o caso do Anki/leitor/música do app.

Observação de método: **a maior parte dos "reviews" de 2026 é de blog concorrente ou SEO** (Languatalk, practiceme.app, midoo etc. vendem rivais) — usei como sinal fraco e só onde convergem com fonte primária. Reddit e Reclame Aqui não abriram neste ambiente.

---

## 6. Criança × adulto

- **[F] Idade e correção:** a meta-regressão de Lyster & Saito (2010) indica que **aprendizes mais jovens se beneficiam mais de CF** que os mais velhos (15 estudos de sala de aula, quase todos com crianças/adolescentes — **cuidado com o alcance**).
- **[F] Agente LLM bilíngue com criança:** RCT (Xiao, Zou & Lin, 2025, *BJET*) com **67 crianças de 5–8 anos** em leitura dialógica de e-book: o agente superou o pai em **compreensão de leitura**, com ganhos **comparáveis** em vocabulário e reconto; com o agente, **mais engajamento comportamental e atenção visual**; com o pai, **mais engajamento afetivo e vocalizações relevantes à história**. **[I]** Para o app da família: o professor funciona como complemento, e **o pai presente** é parte do desenho.
- **[F] Voz expressiva:** 45 pré-escolares (média 5 anos; bilíngues, ELL e nativos) com robô contador de histórias: com voz **expressiva** as crianças ficaram mais concentradas, recontaram histórias mais longas 4–6 semanas depois; aprendizado/gosto de vocabulário foi **similar** (Kory Westlund et al., 2017). **[I]** Prosódia do TTS e entusiasmo do professor importam para criança (a escolha do TTS é outra encomenda).
- **[F] Repetição de tarefa** funciona com crianças de 9 anos (Sample & Michel, 2015; N=6, exploratório).
- **[I]** O que muda no comportamento, sobre os fatos acima e a prática de ensino de crianças (Cameron, Pinter — **só resumos de busca lidos, fonte fraca**): **blocos curtos (8–10 min, atividades de 2–3 min)**; rotina fixa de abertura e fechamento; jogo, música e movimento; vocabulário concreto do cotidiano da criança; **mais PT por mais tempo**, porque sem apoio visual (é só voz) o contexto é pobre; **recast sem terminologia e sem explicação**, elogio frequente e específico; não usar CEFR como régua ao aluno (o Companion Volume tem Pré-A1, mas **não há fonte lida com descritores/escala para criança**); **sem correção de pronúncia insistente**.
- **Adulto:** quer saber para quê serve (objetivo — Praktika onboarding por objetivo), aceita explicação gramatical curta (Ellis, Loewen & Erlam, 2006), tem **ansiedade de se expor** (Sheen, 2008), e tem vocabulário de vida que o professor deve puxar (trabalho, família).
- **Fora do escopo, sinalizado:** dados de voz/conversa de **criança** têm regras legais (LGPD) — é do jurídico, não desta pesquisa. Reconhecimento de fala de criança costuma ser pior — é tecnologia de voz (outra encomenda).

---

## 7. Métricas de progresso que valem guardar

**Princípio:** guarde **eventos brutos** (transcrição com carimbo de tempo, erros marcados, palavras produzidas) e **recalcule** as métricas; nível CEFR, "vocabulário ativo = N" e médias são **derivados** — guarde com a **data e a evidência**, nunca como número solto.

**Por que o tripé:** complexidade, precisão e fluência (CAF) são o padrão de pesquisa para descrever desempenho oral e medir progresso (Housen & Kuiken, 2009, *Applied Linguistics*); fala funcional é explicada por **conhecimento linguístico (vocabulário + gramática), velocidade de processamento e pronúncia** — 76% da variância da adequação funcional de fala (de Jong et al., 2012, 181 aprendizes de holandês), com estrutura semelhante nos 40% mais fracos e nos 40% mais fortes (**sem troca de pesos entre níveis**). Praktika rastreia "fluência, precisão, uso de vocabulário e erros recorrentes" [V]; ELSA, cinco áreas [fonte secundária].

**Conjunto enxuto recomendado [I]** (cada item responde a uma decisão do professor):

| Métrica | Como se calcula | Para que serve |
|---|---|---|
| **Tempo de fala do aluno vs do professor** | palavras e segundos por falante, por sessão | prática de fala; a regra folclórica "aluno 70%" é **fonte fraca**, use como tendência, não como meta |
| **Taxa de fala e pausas** | palavras/min; nº e duração de pausas, **dentro** da frase (exige carimbo de tempo do STT) | fluência; velocidade e medidas compostas separam A2→B2 (Tavakoli 2020) |
| **Comprimento médio do enunciado / % de frases completas** | por sessão | complexidade; sinal de sair de "frases isoladas" (A1) |
| **Vocabulário ativo** | lemas **produzidos** pelo aluno (não compreendidos), por faixa de frequência; palavras-alvo produzidas sem pista | o que ele de fato usa (Anki mede reconhecimento/recuperação guiada; a conversa mede uso) |
| **Precisão** | erros por 100 palavras e **lista de erros recorrentes** (categoria, exemplo do aluno, contagem, último visto) | direciona a correção focada; Ellis: corrigir o mesmo erro várias vezes |
| **Reparo após correção** | % de correções seguidas de tentativa certa/autocorreção | mede se a estratégia funciona *para esse aluno* (unidade de análise de Lyster & Ranta) |
| **Compreensão sem PT** | % de falas só-EN do professor respondidas adequadamente na 1ª vez; pedidos de "repete"/"em português" por 10 min | **o gatilho para reduzir o PT** (seção 1) |
| **Participação do PT** | % de turnos do aluno com PT; code-switches por categoria | dependência de L1 |
| **Nível CEFR por habilidade** | estimativa do avaliador + **confiança e data** + trecho-evidência | nivelamento e promoção |
| **Pronúncia** | lista de sons/ritmos problemáticos e tendência — **vem da ferramenta de pronúncia** | use **compreensibilidade**, não "nota de nativo" (Saito; Derwing) |
| **Engajamento** | sessões/semana, minutos, abandono no meio, autoavaliação de confiança/ansiedade (escala de 1–7 como no estudo coreano; Duolingo mediu confiança) | retenção e ajuste de ansiedade |

Cuidados **[F]/[I]**: fluência por LLM sobre texto puro não basta (seção 2); tarefa repetida infla fluência (medir em tarefa nova); "nota de LLM" sem referência humana é a verificação que aprova qualquer coisa — **calibre o avaliador com um conjunto de conversas marcadas por um professor humano** antes de confiar nas faixas; e os dados de eficácia dos produtos são todos do fornecedor.

---

## 8. Recomendação: esboço do comportamento e o que guardar

> Proposta derivada das seções acima; **a decisão é do CTO/dev**. Regras marcadas [F/I/H] pelo peso da base. Para virar system prompt, escrever em PT e mover cada regra para frases curtas.

### 8.1 Regras curtas para o system prompt

**Papel e tom**
1. Você é um professor paciente e caloroso de inglês para uma família brasileira. Erro é normal; nunca expõe, nunca ri, nunca compara alunos.
2. **Uma pergunta por vez. Frases curtas. Fale devagar.** Depois de perguntar, **espere**; se o aluno parar para pensar, não fale por cima — após alguns segundos, dê uma dica. *(Reclamação nº 1 dos produtos.)*
3. Puxe assunto do aluno (o que ele contou, o que salvou, o que gosta) e lembre-se de um detalhe pessoal por aula.

**Idioma (regra do CEO, por função)**
4. A cada turno, você recebe o **mapa função→idioma** deste aluno (ex.: instruções: EN+PT; explicar palavra: PT; explicar erro: PT breve; conversa: EN). **Siga o mapa.** Não reduza o PT por conta própria. [F/I]
5. **Mais de 95% das palavras que você diz devem ser conhecidas pelo aluno**, exceto as palavras-alvo. Se não tem certeza, simplifique. Isto **não basta no prompt inicial**: o sistema reinjeta o limite de nível a cada turno. [F]
6. Se o aluno falar em português para cobrir uma palavra, **dê a palavra em inglês, peça que repita e siga**. Se disser "não entendi", repita mais devagar uma vez, depois use PT *só naquele ponto*. [F]
7. Nunca traduza tudo. Traduza a palavra ou a frase-chave. [I]

**Correção**
8. **Sentido primeiro.** Se entendeu, continue a conversa. Corrija **no máximo 1–2 alvos por aula**: o alvo da lição e o que impede ser entendido. [F]
9. **Erro** (aluno não tem a forma) → dê o modelo (recast curto, e no A1 um gloss em PT) e peça **uma** repetição. **Lapso** (ele sabe, escorregou) → peça que tente de novo ("How do you say…?"). [I]
10. **Avise que é correção** ("small fix:"). Nunca force a repetição. Não corrija duas vezes seguidas; acumule o resto e dê **até 3 itens no fim da tarefa**. [F/H]
11. **Na dúvida se é erro, não corrija** — confirme o sentido. Nunca "corrija" frase certa. Não use termos gramaticais com iniciante e criança. [I]
12. Se o aluno parecer tenso, reduza correção explícita e elogie algo **específico**. O mesmo erro que continuar aparecendo: volte a ele em outras aulas, de outro jeito. [F]
13. **Pronúncia:** só se atrapalha ser entendido; **um som por vez**; modelo + repetição; detalhe vai para a ferramenta de pronúncia. [F/I]

**Aula**
14. Siga o esqueleto: aquecimento → alvo → tarefa → repetir a tarefa com variação → fechamento (seção 4). Abra dizendo o objetivo do dia em uma frase; feche dizendo o que ele **já consegue fazer**. [I/H]
15. **Palavras do Anki devidas hoje** (você recebe a lista): escolha 3–5, crie perguntas cuja resposta natural use a palavra, **espere o aluno produzi-la**, dê pista só depois, reuse 2 minutos depois. **Registre** produziu/pista/não produziu. [F/I/H]
16. Palavras salvas de livro/música: use como **assunto**, não como lista. [I]
17. **Nunca diga o nível CEFR como sentença.** Diga o que ele consegue fazer. [I]

**Criança** (perfil infantil)
18. Blocos de 2–3 min, aula de 8–10 min, rotina fixa, voz animada, vocabulário concreto, mais PT, recast sem explicação, elogio frequente, e **convide o adulto a participar** quando presente. [F/I]

### 8.2 O que precisa ser guardado sobre o aluno

| Grupo | Guardar (bruto) | Observação |
|---|---|---|
| **Perfil** | idade/faixa (criança ou adulto), L1, objetivos, interesses, nome/apelido, tempo disponível, tolerância a correção (ansiedade) | objetivo e interesse mandam no tema da aula |
| **Nível** | CEFR **por habilidade** (escuta, interação oral, produção, pronúncia) + **faixa, confiança, data, trecho-evidência** | derivado: sempre com data; recalculável |
| **Idioma** | **mapa função→idioma** atual e histórico de mudanças; pedidos de PT por sessão | é o estado que implementa a regra do CEO |
| **Erros** | lista recorrente: categoria, frase do aluno, forma certa, contagem, último visto, estado (novo/recorrente/melhorando/resolvido), se houve reparo | alimenta correção focada e fechamento |
| **Vocabulário** | ativo (produzido) × passivo; alvos da semana; **palavras devidas no Anki e resultado na conversa**; palavras salvas ainda não trabalhadas (fonte: livro/música, contexto) | Anki/FSRS continua sendo a fonte de verdade do agendamento |
| **Fala** | transcrição com carimbo de tempo por sessão (ou eventos derivados) | base para recalcular taxa de fala, pausas, comprimento, % de PT |
| **Pronúncia** | sons/ritmos problemáticos e tendência | vem da ferramenta de pronúncia |
| **Sessões** | resumo de 3 linhas, temas tratados e gostados, detalhes pessoais contados, plano da próxima aula | "memória" que torna o professor pessoal |
| **Afeto** | sinais de frustração/ansiedade, abandono no meio, autoavaliação de confiança | ajusta tom e correção |

---

## O que não foi possível confirmar

1. **Percentual de PT por faixa CEFR:** nenhuma fonte dá. A tabela da seção 1 e as faixas "30–50% / 60–80% / 85–95% / ≥95%" são **hipótese minha**. Não há ensaio publicado de tutor de IA que faça *fading* de L1 e meça o efeito.
2. **Quantas correções por minuto sem travar:** nenhuma fonte. "1–2 alvos por aula, ≤1 correção a cada 3–4 turnos" é hipótese.
3. **Eficácia dos produtos:** todos os números (Duolingo, Praktika, Speak) são do **próprio fornecedor**, sem tamanho de amostra ou metodologia detalhada.
4. **Criança:** só há evidência de leitura dialógica (5–8 anos) e de robô com pré-escolares, e uma meta-regressão de idade em CF. **Nada sobre tutor por voz de inglês para criança brasileira**; duração de sessão e uso de PT para criança são inferência. Cameron/Pinter lidos só em resumos de busca.
5. **Descritores CEFR oficiais:** `coe.int` e `rm.coe.int` retornaram 403 (Cloudflare); usei transcrições de sites secundários e uma apresentação de North. Nivelamento de criança por CEFR: sem fonte lida.
6. **Não abertos:** validação do cefr.app (zenodo, jul/2026, fornecedor), ELSA fora da App Store, Nation (quatro vertentes) e Willis/Ellis (TBLT) só por resumo de busca, Macaro (três posições) só por resumo; Cambridge/Wiley bloquearam (403/429) — para esses usei o **resumo oficial via OpenAlex** (texto do abstract, que é o do periódico), não o artigo completo. Reddit e Reclame Aqui indisponíveis.
7. **Modelos de 2026:** os testes de "alignment drift" e de iniciante (2505.08351, 2506.04072) usam modelos menores e mais antigos; o efeito em modelos atuais não foi medido por ninguém que eu tenha lido. Só se sabe testando **este** professor.
8. **Achado fora do escopo:** o que foi lido mostra que a arquitetura da Praktika (agente de lição + agente de progresso + memória) separa quem ensina de quem avalia — como montar isso é da encomenda de arquitetura, não desta.

## Fontes

Acessadas em 30/09/2026 (Wayback quando indicado). **[oficial]** = documento do fornecedor/instituição; **[pesquisa]** = artigo/preprint; **[engenharia]** = blog técnico do fornecedor; **[relato]** = avaliação de pessoa/usuário, sinal fraco.

**Língua materna**
1. Hall & Cook, "Own-language use in language teaching and learning", *Language Teaching* 45(3), 2012 — https://spainwise.net/wp-content/uploads/2021/03/Hall-Cook-2012-Own-language-use-in-language-teaching-and-learning.pdf (PDF lido; resumo em doi 10.1017/S0261444812000067) — [pesquisa]
2. Littlewood & Yu, "First language and target language in the foreign language classroom", *Language Teaching*, 2011 — https://doi.org/10.1017/s0261444809990310 (só resumo, via OpenAlex) — [pesquisa]
3. ACTFL, "Use of the Target Language in the Classroom" (21/05/2010) — https://www.actfl.org/news/use-of-the-target-language-in-the-classroom — [oficial]
4. Understanding EFL Learners' Code-Switching… in LLM-Supported Speaking Practice, arXiv 2512.23136 (29/12/2025) — https://arxiv.org/abs/2512.23136 (PDF lido) — [pesquisa]
5. Alignment Drift in CEFR-prompted LLMs for Interactive Spanish Tutoring, arXiv 2505.08351 (13/05/2025) — http://export.arxiv.org/api/query?id_list=2505.08351 — [pesquisa]
6. Toward Beginner-Friendly LLMs for Language Learning, arXiv 2506.04072 (rev. 18/02/2026) — https://arxiv.org/abs/2506.04072 — [pesquisa]
7. van Zeeland & Schmitt, "Lexical coverage in L1 and L2 listening comprehension", *Applied Linguistics*, 2012 — https://doi.org/10.1093/applin/ams074 (resumo via OpenAlex) — [pesquisa]
8. Duolingo, "Video Call lets you have real life conversations with Lily" (24/09/2024) — https://blog.duolingo.com/video-call (HTML cru) — [oficial]
9. Duolingo, "Our new Video Call with Falstaff…" (14/01/2026) — https://blog.duolingo.com/beginner-video-call-with-falstaff (HTML cru) — [oficial]
10. Duolingo, "Research report: Video Call with Falstaff improves beginners' conversation skills" (10/03/2026) — https://blog.duolingo.com/falstaff-calls-research — [oficial, alegação do fornecedor]
11. Duolingo, "Research report: Our Video Call feature boosts learners' speaking skills" (30/03/2026) — https://blog.duolingo.com/video-call-research-report — [oficial, alegação do fornecedor]
12. Speak, "What languages can I learn with Speak?" — https://help.speak.com/en/articles/8880569-what-languages-can-i-learn-with-speak — [oficial]
13. Busuu Conversations — https://www.busuu.com/en/languages/language-learning-with-busuu-conversations — [oficial]

**Correção**
14. Lyster & Saito, "Oral feedback in classroom SLA: a meta-analysis", *SSLA*, 2010 — https://doi.org/10.1017/S0272263109990520 (resumo via OpenAlex) — [pesquisa]
15. Li, "The effectiveness of corrective feedback in SLA: a meta-analysis", *Language Learning*, 2010 — https://doi.org/10.1111/j.1467-9922.2010.00561.x (resumo) — [pesquisa]
16. Brown, "The type and linguistic foci of oral corrective feedback…", *Language Teaching Research*, 2016 — https://doi.org/10.1177/1362168814563200 (resumo) — [pesquisa]
17. Lyster & Ranta, "Corrective feedback and learner uptake", *SSLA*, 1997 — https://doi.org/10.1017/S0272263197001034 (resumo) — [pesquisa]
18. Goo & Mackey, "The case against the case against recasts", *SSLA*, 2013 — https://doi.org/10.1017/s0272263112000708 (resumo) — [pesquisa]
19. Ellis, Loewen & Erlam, "Implicit and explicit corrective feedback…", *SSLA*, 2006 — https://doi.org/10.1017/s0272263106060141 (resumo) — [pesquisa]
20. Sheen, "Recasts, language anxiety, modified output, and L2 learning", *Language Learning*, 2008 — https://doi.org/10.1111/j.1467-9922.2008.00480.x (resumo) — [pesquisa]
21. Ellis, "Corrective feedback and teacher development", *L2 Journal* 1, 2009 — https://escholarship.org/uc/item/2504d6w3 (PDF lido) — [pesquisa]
22. Lyster, Saito & Sato, "Oral corrective feedback in second language classrooms", *Language Teaching*, 2013 — https://doi.org/10.1017/S0261444812000365 (resumo) — [pesquisa]
23. Panova & Lyster, "Patterns of corrective feedback and uptake in an adult ESL classroom", *TESOL Quarterly*, 2002 — https://doi.org/10.2307/3588241 (resumo) — [pesquisa]
24. Saito & Lyster, "Effects of FFI and CF on L2 pronunciation development of /ɹ/…", *Language Learning*, 2012 — https://doi.org/10.1111/j.1467-9922.2011.00639.x (resumo) — [pesquisa]
25. Saito, "Effects of corrective feedback on second language pronunciation development" (capítulo do Cambridge Handbook of CF) — https://discovery.ucl.ac.uk/id/eprint/10154995/2/Saito_Effects%20of%20Corrective%20Feedback%20on%20Second%20Language%20Pronunciation%20Development_chapter_AAM.pdf (PDF lido) — [pesquisa]
26. Avouris, "AI Conversational Tutors in Foreign Language Learning: A Mixed-Methods Evaluation Study" (out/2025) — https://arxiv.org/abs/2508.05156 (PDF lido) — [pesquisa]
27. TACT: Taxonomy-Aligned Post-Training for Pedagogically Adaptive English Tutoring, arXiv 2608.03952 (v2, 23/09/2026) — https://arxiv.org/abs/2608.03952 (PDF lido; taxonomia de 13 estratégias; corpus B1–C2) — [pesquisa]
28. "Clause Encounters of the Third Kind: Can LLMs Replace Language Teachers?", arXiv 2608.16286 (17/08/2026) — http://export.arxiv.org/api/query?id_list=2608.16286 — [pesquisa]

**Nivelamento e métricas**
29. ACTFL OPI — Part A General Test Information (2023) — https://www.actfl.org/uploads/files/general/Documents/assessments/acereports/OPI_Report_Part_A_General_Information_2023.pdf (PDF lido) — [oficial]
30. Natural Language-based Assessment of L2 Oral Proficiency using LLMs, arXiv 2507.10200 (jul/2025, SLaTE 2025) — https://arxiv.org/abs/2507.10200 — [pesquisa]
31. Interpretable… Automated L2 Speaking Assessment…, arXiv 2608.26137 (25/06/2026 submissão) — https://arxiv.org/abs/2608.26137 — [pesquisa]
32. Tavakoli, Nakatsuhara & Hunter, "Aspects of fluency across assessed levels of speaking proficiency", *MLJ*, 2020 — https://doi.org/10.1111/modl.12620 (resumo) — [pesquisa]
33. de Jong et al., "Facets of speaking proficiency", *SSLA*, 2012 — https://doi.org/10.1017/S0272263111000489 (resumo) — [pesquisa]
34. Housen & Kuiken, "Complexity, accuracy, and fluency in SLA", *Applied Linguistics*, 2009 — https://doi.org/10.1093/applin/amp048 (resumo) — [pesquisa]
35. Ace-CEFR dataset, arXiv 2506.14046 (16/06/2025) — http://export.arxiv.org/api/query?id_list=2506.14046 — [pesquisa] (só resumo; não usado como base de regra)
36. CEFR descriptors (texto do Conselho da Europa via) cefrlevels.com/descriptors/speaking e apresentação de North, oph.fi — https://cefrlevels.com/descriptors/speaking/ — [relato/secundário]; página oficial coe.int: 403

**Aula, vocabulário, tarefa**
37. Webb, Uchihara & Yanagisawa, "How effective is second language incidental vocabulary learning?", *Language Teaching*, 2023 — https://doi.org/10.1017/s0261444822000507 (resumo) — [pesquisa]
38. Uchihara, Webb & Yanagisawa, "Effects of repetition on incidental vocabulary learning", *Language Learning*, 2019 — https://doi.org/10.1111/lang.12343 (resumo) — [pesquisa]
39. Brown, Waring & Donkaewbua, "Incidental vocabulary acquisition from reading, reading-while-listening, and listening to stories", 2008 — https://doi.org/10.64152/10125/66816 (resumo) — [pesquisa]
40. Foster & Skehan, "The influence of planning and task type on second language performance", *SSLA*, 1996 — https://doi.org/10.1017/s0272263100015047 (resumo) — [pesquisa]
41. Sample & Michel, "Trade-off effects of CAF on young learners' oral task repetition", *TESL Canada Journal*, 2015 — https://doi.org/10.18806/tesl.v31i0.1185 (resumo) — [pesquisa]
42. "When AI Tutors Speak: Evidence from a Randomized Field Experiment", arXiv 2609.23958 (21/09/2026) — https://arxiv.org/abs/2609.23958 — [pesquisa] (MBA, não língua)
43. Sato & Lyster, "Peer interaction and corrective feedback…", *SSLA*, 2012 — https://doi.org/10.1017/s0272263112000356 (resumo) — [pesquisa] (consultada; não usada como base)

**Criança**
44. Xiao, Zou & Lin, "Parent-led vs AI-guided dialogic reading: RCT…", *BJET*, 2025 — https://doi.org/10.1111/bjet.13615 (resumo) — [pesquisa]
45. Kory Westlund et al., "Flat vs. expressive storytelling…", *Frontiers in Human Neuroscience*, 2017 — https://doi.org/10.3389/fnhum.2017.00295 (resumo) — [pesquisa]
46. Nikolov & Mihaljević Djigunović, "All shades of every color…", *Annual Review of Applied Linguistics*, 2011 — https://doi.org/10.1017/s0267190511000183 (só resumo; consultada, pouco usada)

**Produtos**
47. OpenAI, "Inside Praktika's conversational approach to language learning" (22/01/2026) — https://openai.com/index/praktika/ (acessado pelo Wayback; 403 direto) — [engenharia, alegação do fornecedor]
48. Praktika 4.0 (19/02/2026) — https://praktika.ai/blog/praktika-4-0 — [oficial]
49. Praktika, "Learning English with an AI Tutor: How It Works" (27/11/2024) — https://praktika.ai/blog/learning-english-with-an-ai-tutor-how-it-works — [oficial]
50. Speak, "Building Speak's Voice Agent Platform" (24/03/2026) — https://www.speak.com/blog/building-speaks-voice-agent-platform (HTML cru) — [engenharia]
51. Speak, "Live Roleplays powered by OpenAI Realtime API" (01/10/2024) — https://www.speak.com/blog/live-roleplays — [engenharia]
52. Speak, "What is Speak Tutor?" — https://help.speak.com/en/articles/11396739-what-is-speak-tutor — [oficial]
53. Christian Tapper, "Speak App Review (209-Day)", atualizado 22/09/2026 — https://lingtuitive.com/blog/speak-review — [relato, autor nomeado]
54. Babbel Speak, press release (16/09/2025 beta) — https://www.babbel.com/press/en-us/releases/babbel-speak — [oficial]
55. Google, "New AI-powered live translation and language learning tools in Google Translate" (26–27/08/2025) — https://blog.google/products-and-platforms/products/translate/language-learning-live-translate/ — [oficial]
56. Jesse Hollington, Android Police, "I tried to use Gemini as a language tutor…" (17/09/2026) — https://www.androidpolice.com/tried-gemini-as-language-tutor-major-missing-feature-ruined-experience/ — [relato, autor nomeado]
57. Trustpilot: Loora (https://www.trustpilot.com/review/loora.com), Praktika (https://www.trustpilot.com/review/praktika.ai), Talkpal (https://www.trustpilot.com/review/talkpal.ai), Speak (https://www.trustpilot.com/review/speak.com) — [relato, agregado; Speak sem volume]
58. ELSA Speak na App Store — https://apps.apple.com/us/app/elsa-speak-english-learning/id1083804886 — [oficial/relato]
59. "Review: Duolingo Max Video Calls" (10/01/2026) — https://theowlandme.blog/2026/01/10/review-duolingo-max-video-calls/ — [relato]
60. Descartada após leitura: A Scoping Review of LLM-Based Pedagogical Agents, arXiv 2604.12253 (genérica, não trata de ensino de língua nem de criança).
