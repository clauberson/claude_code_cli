# Arquitetura

> Mergulho profundo em como o Claude Code é estruturado internamente.

---

## Visão Geral de Alto Nível

O Claude Code é um assistente de codificação de IA nativo de terminal, construído como um CLI de binário único. A arquitetura segue um modelo de pipeline:

```
Entrada do Usuário → Parser de CLI → Query Engine → API de LLM → Loop de Execução de Ferramentas → UI de Terminal
```

Toda a camada de UI é construída com **React + Ink** (React para o terminal), tornando-o uma aplicação CLI totalmente reativa com componentes, hooks, gerenciamento de estado e todos os padrões que você esperaria em um app web React — apenas renderizado no terminal.

---

## Pipeline Principal

### 1. Ponto de Entrada (`src/main.tsx`)

O parser de CLI é construído com [Commander.js](https://github.com/tj/commander.js) (`@commander-js/extra-typings`). Na inicialização, ele:

- Dispara efeitos colaterais de prefetch em paralelo (configurações de MDM, Keychain, pré-conexão de API) antes de importações pesadas de módulos
- Analisa argumentos e flags da CLI
- Inicializa o renderizador React/Ink
- Passa o controle para o lançador de REPL (`src/replLauncher.tsx`)

### 2. Inicialização (`src/entrypoints/`)

| Arquivo | Papel |
|------|------|
| `cli.tsx` | Orquestração da sessão CLI — o caminho principal do lançamento ao REPL |
| `init.ts` | Inicialização de configuração, telemetria, OAuth e políticas de MDM |
| `mcp.ts` | Ponto de entrada do modo servidor MCP (Claude Code como um servidor MCP) |
| `sdk/` | SDK do Agente — API programática para incorporar o Claude Code |

A inicialização realiza processos em paralelo: leitura de políticas de MDM, prefetch de Keychain, verificações de feature flags e, em seguida, a inicialização principal.

### 3. Query Engine (`src/QueryEngine.ts`, ~46K linhas)

O coração do Claude Code. Lida com:

- **Respostas em streaming** da API da Anthropic
- **Loops de chamada de ferramentas** — quando o LLM solicita uma ferramenta, executa-a e devolve o resultado
- **Modo de pensamento (Thinking mode)** — pensamento estendido com gerenciamento de orçamento (budget)
- **Lógica de repetição (Retry)** — repetições automáticas com backoff para falhas transitórias
- **Contagem de tokens** — rastreia tokens de entrada/saída e custo por turno
- **Gerenciamento de contexto** — gerencia o histórico da conversa e janelas de contexto

### 4. Sistema de Ferramentas (`src/Tool.ts` + `src/tools/`)

Cada capacidade que o Claude pode invocar é uma **ferramenta**. Cada ferramenta é autocontida com:

- **Esquema de entrada** (validação Zod)
- **Modelo de permissão** (o que precisa de aprovação do usuário)
- **Lógica de execução** (a implementação real)
- **Componentes de UI** (como a invocação/resultados são renderizados no terminal)

As ferramentas são registradas em `src/tools.ts` e descobertas pelo Query Engine durante os loops de chamada de ferramentas.

Veja a [Referência de Ferramentas](ferramentas.md) para o catálogo completo.

### 5. Sistema de Comandos (`src/commands.ts` + `src/commands/`)

Comandos slash voltados para o usuário (`/commit`, `/review`, `/mcp`, etc.) que podem ser digitados no REPL. Três tipos:

| Tipo | Descrição | Exemplo |
|------|-------------|---------|
| **PromptCommand** | Envia um prompt formatado para o LLM com ferramentas injetadas | `/review`, `/commit` |
| **LocalCommand** | Executa no processo, retorna texto simples | `/cost`, `/version` |
| **LocalJSXCommand** | Executa no processo, retorna React JSX | `/doctor`, `/install` |

Os comandos são registrados em `src/commands.ts` e invocados via `/nome-do-comando` no REPL.

Veja a [Referência de Comandos](comandos.md) para o catálogo completo.

---

## Gerenciamento de Estado

O Claude Code usa um padrão de **Contexto React + store personalizada**:

| Componente | Localização | Propósito |
|-----------|----------|---------|
| `AppState` | `src/state/AppStateStore.ts` | Objeto de estado global mutável |
| Provedores de Contexto | `src/context/` | Contexto React para notificações, estatísticas, FPS |
| Seletores | `src/state/` | Funções de estado derivado |
| Observadores de Mudança | `src/state/onChangeAppState.ts` | Efeitos colaterais em mudanças de estado |

O objeto `AppState` é passado para os contextos das ferramentas, dando a elas acesso ao histórico de conversas, configurações e estado de tempo de execução.

---

## Camada de UI

### Componentes (`src/components/`, ~140 componentes)

- Componentes funcionais React usando primitivos Ink (`Box`, `Text`, `useInput()`)
- Estilizados com [Chalk](https://github.com/chalk/chalk) para cores de terminal
- React Compiler ativado para re-renderizações otimizadas
- Primitivos de sistema de design em `src/components/design-system/`

### Telas (`src/screens/`)

Modos de UI em tela cheia:

| Tela | Propósito |
|--------|---------|
| `REPL.tsx` | REPL interativo principal (a tela padrão) |
| `Doctor.tsx` | Diagnósticos de ambiente (`/doctor`) |
| `ResumeConversation.tsx` | Restauração de sessão (`/resume`) |

### Hooks (`src/hooks/`, ~80 hooks)

Padrão padrão de hooks do React. Categorias notáveis:

- **Hooks de permissão** — `useCanUseTool`, `src/hooks/toolPermission/`
- **Integração com IDE** — `useIDEIntegration`, `useIdeConnectionStatus`, `useDiffInIDE`
- **Manipulação de entrada** — `useTextInput`, `useVimInput`, `usePasteHandler`, `useInputBuffer`
- **Gerenciamento de sessão** — `useSessionBackgrounding`, `useRemoteSession`, `useAssistantHistory`
- **Hooks de plugin/skill** — `useManagePlugins`, `useSkillsChange`
- **Hooks de notificação** — `src/hooks/notifs/` (limites de taxa, avisos de depreciação, etc.)

---

## Configuração e Esquemas

### Esquemas de Configuração (`src/schemas/`)

Esquemas baseados em Zod v4 para toda a configuração:

- Configurações de usuário
- Configurações de nível de projeto
- Políticas de organização/empresa
- Regras de permissão

### Migrações (`src/migrations/`)

Lida com mudanças no formato de configuração entre versões — lê configurações antigas e as transforma para o esquema atual.

---

## Sistema de Build

### Bun Runtime

O Claude Code roda no [Bun](https://bun.sh) (não no Node.js). Implicações principais:

- Suporte nativo a JSX/TSX sem uma etapa de transpilação
- Feature flags de `bun:bundle` para eliminação de código morto (dead-code elimination)
- Módulos ES com extensões `.js` (convenção do Bun)

### Feature Flags (Eliminação de Código Morto)

```typescript
import { feature } from 'bun:bundle'

// Código dentro de feature flags inativas é completamente removido no momento do build
if (feature('VOICE_MODE')) {
  const voiceCommand = require('./commands/voice/index.js').default
}
```

Flags notáveis:

| Flag | Recurso |
|------|---------|
| `PROACTIVE` | Modo agente proativo (ações autônomas) |
| `KAIROS` | Subsistema Kairos |
| `BRIDGE_MODE` | Integração de bridge com IDE |
| `DAEMON` | Modo daemon em segundo plano |
| `VOICE_MODE` | Entrada/saída de voz |
| `AGENT_TRIGGERS` | Ações de agente gatilhadas |
| `MONITOR_TOOL` | Ferramenta de monitoramento |
| `COORDINATOR_MODE` | Coordenador multiagente |
| `WORKFLOW_SCRIPTS` | Scripts de automação de fluxo de trabalho |

### Lazy Loading

Módulos pesados são adiados via `import()` dinâmico até o primeiro uso:

- OpenTelemetry (~400KB)
- gRPC (~700KB)
- Outras dependências opcionais

---

## Tratamento de Erros e Telemetria

### Telemetria (`src/services/analytics/`)

- [GrowthBook](https://www.growthbook.io/) para feature flags e testes A/B
- [OpenTelemetry](https://opentelemetry.io/) para rastreamento distribuído e métricas
- Rastreamento de eventos personalizados para análise de uso

### Rastreamento de Custos (`src/cost-tracker.ts`)

Rastreia o uso de tokens e o custo estimado por turno de conversa. Acessível via comando `/cost`.

### Diagnósticos (comando `/doctor`)

A tela `Doctor.tsx` executa verificações de ambiente: conectividade de API, autenticação, disponibilidade de ferramentas, status do servidor MCP e muito mais.

---

## Modelo de Concorrência

O Claude Code usa um **loop de eventos de thread única** (modelo Bun/Node.js) com:

- Async/await para operações de E/S
- Renderização concorrente do React para atualizações de UI
- Web Workers ou processos filhos para tarefas intensivas de CPU (gRPC, etc.)
- Segurança de concorrência de ferramentas — cada ferramenta declara `isConcurrencySafe()` para indicar se pode rodar em paralelo com outras ferramentas

---

## Veja Também

- [Referência de Ferramentas](ferramentas.md) — Catálogo completo de todas as 40 ferramentas do agente
- [Referência de Comandos](comandos.md) — Catálogo completo de todos os comandos slash
- [Guia de Subsistemas](subsistemas.md) — Bridge, MCP, permissões, skills, plugins e muito mais
- [Guia de Exploração](guia-exploracao.md) — Como navegar nesta base de código
