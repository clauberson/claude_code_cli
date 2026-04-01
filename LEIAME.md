<div align="center">

# Claude Code CLI

[![TypeScript](https://img.shields.io/badge/TypeScript-512K%2B_lines-3178C6?logo=typescript&logoColor=white)](#pilha-tecnologica)
[![Bun](https://img.shields.io/badge/Runtime-Bun-f472b6?logo=bun&logoColor=white)](#pilha-tecnologica)
[![Files](https://img.shields.io/badge/~1,900_files-source_only-grey)](#estrutura-de-diretorios)
[![MCP Server](https://img.shields.io/badge/MCP-Explorer_Server-blueviolet)](#-explore-com-o-servidor-mcp)
[![License](https://img.shields.io/badge/license-MIT-green)](#)

</div>

> O snapshot bruto importado é preservado na branch [`backup`](https://github.com/TaGoat/claude_code_cli/tree/backup) deste repositório. A branch `main` contém documentação, ferramentas e metadados adicionais do repositório.

---

## Sumário

- [O que é o Claude Code?](#o-que-e-o-claude-code)
- [Documentação](#-documentacao)
- [Explore com o servidor MCP](#-explore-com-o-servidor-mcp)
- [Estrutura de diretórios](#estrutura-de-diretorios)
- [Arquitetura](#arquitetura)
  - [Sistema de ferramentas](#1-sistema-de-ferramentas)
  - [Sistema de comandos](#2-sistema-de-comandos)
  - [Camada de serviços](#3-camada-de-servicos)
  - [Sistema de bridge](#4-sistema-de-bridge)
  - [Sistema de permissões](#5-sistema-de-permissoes)
  - [Feature flags](#6-feature-flags)
- [Arquivos-chave](#arquivos-chave)
- [Pilha tecnológica](#pilha-tecnologica)
- [Padrões de design](#padroes-de-design)
- [Configuração do GitPretty](#configuracao-do-gitpretty)
- [Contribuindo](#contribuindo)
- [Aviso legal](#aviso-legal)

---

## O que é o Claude Code?

Claude Code é uma ferramenta oficial de CLI para interagir com o Claude diretamente no terminal: editar arquivos, executar comandos, pesquisar em bases de código, gerenciar fluxos com git e mais.

| | |
|---|---|
| **Linguagem** | TypeScript (strict) |
| **Runtime** | [Bun](https://bun.sh) |
| **UI de terminal** | [React](https://react.dev) + [Ink](https://github.com/vadimdemedes/ink) |
| **Escala** | ~1.900 arquivos · 512.000+ linhas de código |

---

## 📚 Documentação

Para guias detalhados, veja o diretório [`docs/`](docs/):

| Guia | Descrição |
|------|-----------|
| **[Arquitetura](docs/architecture.md)** | Pipeline principal, sequência de inicialização, gerenciamento de estado, renderização e fluxo de dados |
| **[Referência de ferramentas](docs/tools.md)** | Catálogo completo de ~40 ferramentas do agente, com categorias e modelo de permissões |
| **[Referência de comandos](docs/commands.md)** | Todos os ~85 comandos slash organizados por categoria |
| **[Guia de subsistemas](docs/subsystems.md)** | Detalhes de Bridge, MCP, Permissões, Plugins, Skills, Tasks, Memory e Voice |
| **[Guia de exploração](docs/exploration-guide.md)** | Como navegar pela base de código — rotas de estudo, padrões de busca e arquivos-chave |

Veja também: [CONTRIBUTING.md](CONTRIBUTING.md) · [README do MCP Server](mcp-server/README.md)

---

## 🔎 Explore com o servidor MCP

Este repositório também inclui um [servidor MCP](https://modelcontextprotocol.io/) que permite a qualquer cliente compatível com MCP (Claude Code, Claude Desktop, VS Code Copilot, Cursor) explorar a base de código de forma interativa.

### Instalação via npm

O servidor MCP está publicado como [`claude-code-explorer-mcp`](https://www.npmjs.com/package/claude-code-explorer-mcp) no npm — sem necessidade de clonar o repositório:

```bash
# Claude Code
claude mcp add claude-code-explorer -- npx -y claude-code-explorer-mcp
```

### Configuração em uma linha (a partir do código-fonte)

```bash
git clone https://github.com/TaGoat/claude_code_cli.git ~/claude_code_cli \
  && cd ~/claude_code_cli/mcp-server \
  && npm install && npm run build \
  && claude mcp add claude-code-explorer -- node ~/claude_code_cli/mcp-server/dist/index.js
```

### Ferramentas e prompts disponíveis

| Ferramenta | Descrição |
|------------|-----------|
| `list_tools` | Lista todas as ~40 ferramentas com arquivos de origem |
| `list_commands` | Lista todos os ~50 comandos slash com arquivos de origem |
| `get_tool_source` | Lê o código-fonte completo de qualquer ferramenta |
| `get_command_source` | Lê o código-fonte de qualquer comando slash |
| `read_source_file` | Lê qualquer arquivo de `src/` por caminho |
| `search_source` | Faz buscas por padrão em toda a árvore de código |
| `list_directory` | Navega diretórios de `src/` |
| `get_architecture` | Exibe visão geral de arquitetura |

| Prompt | Descrição |
|--------|-----------|
| `explain_tool` | Explicação profunda de uma ferramenta específica |
| `explain_command` | Entendimento da implementação de um comando slash |
| `architecture_overview` | Tour guiado pela arquitetura |
| `how_does_it_work` | Explica qualquer subsistema (permissões, MCP, bridge etc.) |
| `compare_tools` | Comparação lado a lado de duas ferramentas |

---

## Estrutura de diretórios

```text
src/
├── main.tsx                 # Ponto de entrada — parser de CLI + renderização React/Ink
├── QueryEngine.ts           # Chamadas da API de LLM
├── Tool.ts                  # Definições de tipo de ferramentas
├── commands.ts              # Registro de comandos
├── tools.ts                 # Registro de ferramentas
├── context.ts               # Coleta de contexto do sistema/usuário
├── cost-tracker.ts          # Rastreamento de custos de tokens
├── tools/                   # Implementações das ferramentas do agente
├── commands/                # Implementações dos comandos slash
├── components/              # Componentes de UI com Ink
├── services/                # Integrações com serviços externos
├── hooks/                   # Hooks React
├── types/                   # Definições TypeScript
├── utils/                   # Funções utilitárias
├── screens/                 # UIs de tela inteira
├── bridge/                  # Integração com IDEs
├── coordinator/             # Orquestração multiagente
├── plugins/                 # Sistema de plugins
├── skills/                  # Sistema de skills
├── server/                  # Modo servidor
├── remote/                  # Sessões remotas
├── memdir/                  # Memória persistente
├── tasks/                   # Gerenciamento de tarefas
└── state/                   # Gerenciamento de estado
```

---

## Arquitetura

### 1) Sistema de ferramentas
Cada ferramenta define esquema de entrada, permissões, execução e renderização de resultado.

### 2) Sistema de comandos
Comandos slash são registrados centralmente e podem ser locais ou baseados em prompt.

### 3) Camada de serviços
Integrações com API, OAuth, MCP, analytics, LSP, plugins e outros serviços.

### 4) Sistema de bridge
Conecta o CLI a IDEs (como VS Code e JetBrains) para fluxo bidirecional.

### 5) Sistema de permissões
Suporta modos de aprovação e regras por padrão (`Bash(git *)`, `FileEdit(/src/*)`).

### 6) Feature flags
Recursos podem ser ativados/desativados em build ou por ambiente.

---

## Arquivos-chave

| Arquivo | Papel |
|---------|-------|
| `src/main.tsx` | Entrada principal da CLI |
| `src/QueryEngine.ts` | Loop principal de chamadas de modelo |
| `src/Tool.ts` | Tipos e fábrica de ferramentas |
| `src/tools.ts` | Registro e presets de ferramentas |
| `src/commands.ts` | Registro de comandos |
| `src/context.ts` | Coleta de contexto de execução |
| `src/cost-tracker.ts` | Rastreamento de custos |

---

## Pilha tecnológica

- **TypeScript** (modo estrito)
- **Bun** (runtime e build)
- **React + Ink** (UI de terminal)
- **Commander.js** (parser de CLI)
- **Zod** (validação)
- **Biome** (lint/format)
- **Model Context Protocol (MCP)**

---

## Padrões de design

- Componentes funcionais e hooks React.
- Registro central para comandos e ferramentas.
- Validação de fronteira com Zod.
- Permissões explícitas por ferramenta.
- Estrutura modular por domínio (`services/`, `tools/`, `commands/`, `state/`).

---

## Configuração do GitPretty

Este repositório inclui suporte a `gitpretty-apply.sh` para workflows de patch limpos e legíveis.

---

## Contribuindo

Consulte [CONTRIBUTING.md](CONTRIBUTING.md) para ambiente de desenvolvimento, convenções e processo de contribuição.

---

## Aviso legal

Este repositório serve para estudo/exploração técnica da arquitetura e organização do CLI.

