---
name: design-system
description: >-
  Gestão de UI / design system DESTE projeto (Família Figueiredo, web). Use SEMPRE que criar ou
  alterar QUALQUER coisa de aparência: cor, fundo, borda, superfície, botão, campo, badge, tab,
  card, container, sidebar, estado (hover/foco/disabled), tema, movimento/animação, ou escolher
  "qual token usar aqui". Vale mesmo que não digam "shadcn" nem "design system" (ex.: "esse campo
  tá feio", "o foco acende demais", "deixa esse modal no padrão", "anima essa lista"). Aqui mora a
  verdade visual deste app: 4 presets trocáveis por `data-theme`, a marca do brasão, o vidro e os
  tokens de movimento. As regras universais (shadcn-first, regra de ouro, o que nunca fazer) estão
  na skill global `ui-diaria`.
---

<!-- base-playbook: design-system v2 (2026-07-30) -->
<!--
  Preenchida em 30/07/2026, lendo o código. Antes disso o arquivo era o molde do playbook
  copiado sem adaptar: os 5 pontos "ADAPTAR" estavam em branco e ele descrevia um projeto
  genérico. O método já estava implementado no código desde antes — só não estava escrito.
  Nota histórica: até 30/07/2026 esta skill nem carregava, porque havia uma skill global de
  mesmo nome que a sobrepunha (personal > project). A global foi despublicada.
-->

# Design System — Família Figueiredo

> **Este é o projeto de referência de UI da casa.** Medição de 30/07/2026, contando cor escrita
> direto na tela: **0 ocorrências em 35 telas**. Idealis Core: 574. app-singaerj: 1.086.
>
> Aqui trocar uma cor é editar **um** lugar. Preserve isso: a disciplina é o ativo, não o tema.

## Arquitetura: schema de tokens + presets trocáveis

O **schema** (os nomes dos tokens, em `@theme inline`) é o contrato — não muda. Cada **preset**
preenche o mesmo schema com valores diferentes. Trocar de preset = trocar `data-theme` no `<html>`.

O schema tem **46 nomes de token** (dentro do `@theme inline`). Somando as definições de todos os
presets, são **221 linhas** de `--token: valor` no `globals.css` — é o mesmo contrato preenchido
4 vezes. Tailwind v4, cores em `oklch`.

## Os 4 presets

Definidos em `src/lib/theme.ts` + um bloco `[data-theme='…']` no `globals.css`:

| Preset | Rótulo | O que é | Fundo escuro |
|---|---|---|---|
| `glass-brasao` | Glass Brasão | **PADRÃO.** Vidro navy + vermelho do brasão | sim (`forceDark`) |
| `navy-glass` | Navy Glass | Referência Idealis Core (dourado) | sim (`forceDark`) |
| `brasao` | Brasão | Azul do brasão + vermelho, sem vidro | não |
| `neutral` | Neutro | Base shadcn crua, para comparar do zero | não |

`DEFAULT_PRESET = 'glass-brasao'`.

**Herança:** `glass-brasao` não se repete — ele compartilha o bloco de `navy-glass` e sobrescreve
só a marca:

```css
[data-theme='navy-glass'], [data-theme='glass-brasao'] { /* … o tema inteiro … */ }
[data-theme='glass-brasao'] { --brand: oklch(0.62 0.24 27); /* vermelho do brasão */ }
```

É o padrão a seguir para presets novos: herde o mais próximo, troque só o que difere. Preset novo
≈ 5 linhas.

> ⚠️ **`forceDark` não é enfeite.** Preset de fundo escuro **precisa** da classe `.dark` no
> `<html>`, senão os `dark:` internos dos componentes shadcn não disparam e a aba/campo ativo cai
> no tom claro — fica preto sobre fundo escuro. Quem liga isso é `presetForcesDark()` em
> `theme.ts`. Preset escuro novo **tem que** ser marcado `forceDark: true`.

## A marca

| Token | Valor | Papel |
|---|---|---|
| `--brand` | `oklch(0.62 0.24 27)` | vermelho do brasão — destaque de marca, **raro** |
| `--brand-foreground` | `oklch(0.99 0 0)` | texto sobre a marca |
| `--chart-2` | mesma cor da marca | série de gráfico que representa a marca |

**`brand` ≠ `destructive`.** A cor é parecida (as duas são vermelhas), o papel não é: `brand` é
destaque de marca; `destructive` é perigo. Nunca use `brand` em botão comum, nem `destructive`
para dar destaque.

## Vidro (glass) — é propriedade do preset, não da tela

Nenhum componente sabe que é "vidro". Quem decide é o `data-theme`:

```css
[data-theme='navy-glass'] [data-slot='card'],
[data-theme='glass-brasao'] [data-slot='card']          { backdrop-filter: blur(12px); }

[data-theme='navy-glass'] [data-slot='sidebar-inner'],
[data-theme='glass-brasao'] [data-slot='sidebar-inner'] { backdrop-filter: blur(14px); }
```

O `--card` e o `--sidebar` já são translúcidos no preset; o blur completa o efeito.

**Container manual que precisa de vidro:** use a classe `.surface-glass` — ela se adapta ao fundo.
Não recrie o efeito com `bg-white/10 backdrop-blur` na tela.

## Componentes customizados (divergem do shadcn cru)

Rodar `npx shadcn@latest add` **sobrescreve** estes arquivos e faz perder os extras. Se precisar
reinstalar, restaure as variantes depois (ou traga do acervo `ui/components` do playbook).

| Componente | O que tem a mais |
|---|---|
| `Button` | variante **`brand`** |
| `Badge` | variantes de feedback: **`brand`, `success`, `warning`, `info`** |
| `Tabs` | **pílula deslizante** animada (framer-motion `layoutId`), dirigida por `--primary` |

## Movimento

Mesma regra de ouro: **o movimento mora no token, nunca solto na tela.** Tokens em
`src/lib/motion.ts` (framer-motion):

| Export | Para quê |
|---|---|
| `springSoft` / `springSnap` | molas — a base de tudo que se move |
| `motionDur` | durações nomeadas |
| `easeOut` | curva `[0.16, 1, 0.3, 1]` |
| `tapFeedback` | `scale: 0.97` no toque — use com `whileTap` |
| `tabContentVariants` | entrada do conteúdo ao trocar de aba |
| `listContainer` / `listItem` | lista em cascata |

**Princípios:** mola > tempo fixo · 150–320ms · animar só `transform`/`opacity` (ou `layout`) · em
lista com scroll infinito, animar o **item**, não o container.

Animação nova que se repetir vira token aqui. Não deixe valor de mola solto num componente.

## Fonte da verdade (conferido em 30/07/2026)

| Arquivo | O que responde |
|---|---|
| `src/app/globals.css` | o schema (`@theme inline`) + os 4 blocos de preset + regras de vidro. **É aqui que a cor mora.** |
| `src/lib/theme.ts` | lista de presets, `DEFAULT_PRESET`, `presetForcesDark()` |
| `src/lib/motion.ts` | tokens de movimento |
| `src/app/dev/_components/theme-controls.tsx` | seletor de preset + claro/escuro |
| `src/app/dev/style-guide` | laboratório: ver todos os componentes juntos |
| `src/app/dev/painel` | laboratório: ver o tema aplicado num painel real |

**Use o `/dev/style-guide` para calibrar.** É onde se decide um token olhando tudo junto, em vez
de ajustar tela a tela — foi assim que este projeto chegou a zero cor solta.

## Como evoluir

1. **Token** (`globals.css`) → 2. **Componente** (`ui/`) → 3. **Receita** (padrão que se repete) →
4. **Documente aqui**.

A decisão sobe (tela → componente → token), nunca desce. Se você está prestes a escrever uma cor
numa tela, a resposta certa está uma camada acima.

## Receitas

> 🔧 A preencher conforme surgirem: padrões que já se repetem em 3+ telas (footer de modal, barra
> de filtro, cabeçalho de lista). Nenhum documentado até 30/07/2026 — o projeto ainda é pequeno
> (35 telas). Padrão repetido e não documentado vira divergência.
