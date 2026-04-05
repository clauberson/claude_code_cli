# Referência de Ferramentas

> Catálogo completo de todas as ~40 ferramentas do agente no Claude Code.

---

## Visão Geral

Cada ferramenta reside em `src/tools/<NomeDaFerramenta>/` como um módulo autocontido. Cada ferramenta define:

- **Esquema de entrada** — Parâmetros validados pelo Zod
- **Modelo de permissão** — O que requer aprovação do usuário
- **Lógica de execução** — A implementação da ferramenta
- **Componentes de UI** — Renderização no terminal para a invocação e resultados
- **Segurança de concorrência** — Se ela pode rodar em paralelo

As ferramentas são registradas em `src/tools.ts` e invocadas pela Query Engine durante os loops de chamada de ferramentas da LLM.

### Padrão de Definição de Ferramenta

```typescript
export const MinhaFerramenta = buildTool({
  name: 'MinhaFerramenta',
  aliases: ['minha_ferramenta'],
  description: 'O que esta ferramenta faz',
  inputSchema: z.object({
    param: z.string(),
  }),
  async call(args, context, canUseTool, parentMessage, onProgress) {
    // Executa e retorna { data: result, newMessages?: [...] }
  },
  async checkPermissions(input, context) { /* Verificações de permissão */ },
  isConcurrencySafe(input) { /* Pode rodar em paralelo? */ },
  isReadOnly(input) { /* É não-destrutiva? */ },
  prompt(options) { /* Injeção no prompt do sistema */ },
  renderToolUseMessage(input, options) { /* UI para a invocação */ },
  renderToolResultMessage(content, progressMessages, options) { /* UI para o resultado */ },
})
```

**Estrutura de diretório por ferramenta:**

```
src/tools/MinhaFerramenta/
├── MinhaFerramenta.ts # Implementação principal
├── UI.tsx             # Renderização no terminal
├── prompt.ts          # Contribuição para o prompt do sistema
└── utils.ts           # Auxiliares específicos da ferramenta
```

---

## Ferramentas de Sistema de Arquivos

| Ferramenta | Descrição | Somente Leitura |
|------|-------------|-----------|
| **FileReadTool** | Lê conteúdo de arquivos (texto, imagens, PDFs, notebooks). Suporta intervalos de linhas | Sim |
| **FileWriteTool** | Cria ou sobrescreve arquivos | Não |
| **FileEditTool** | Modificação parcial de arquivo via substituição de strings | Não |
| **GlobTool** | Encontra arquivos correspondentes a padrões glob (ex: `**/*.ts`) | Sim |
| **GrepTool** | Busca de conteúdo usando ripgrep (suporta regex) | Sim |
| **NotebookEditTool** | Edita células de notebooks Jupyter | Não |
| **TodoWriteTool** | Escreve em um arquivo de tarefas/todo estruturado | Não |

## Ferramentas de Shell e Execução

| Ferramenta | Descrição | Somente Leitura |
|------|-------------|-----------|
| **BashTool** | Executa comandos shell no bash | Não |
| **PowerShellTool** | Executa comandos PowerShell (Windows) | Não |
| **REPLTool** | Executa código em uma sessão REPL (Python, Node, etc.) | Não |

## Ferramentas de Agente e Orquestração

| Ferramenta | Descrição | Somente Leitura |
|------|-------------|-----------|
| **AgentTool** | Inicia um sub-agente para tarefas complexas | Não |
| **SendMessageTool** | Envia mensagens entre agentes | Não |
| **TeamCreateTool** | Cria uma equipe de agentes paralelos | Não |
| **TeamDeleteTool** | Remove um agente da equipe | Não |
| **EnterPlanModeTool** | Alterna para o modo de planejamento (sem execução) | Não |
| **ExitPlanModeTool** | Sai do modo de planejamento, retoma a execução | Não |
| **EnterWorktreeTool** | Isola o trabalho em um worktree git | Não |
| **ExitWorktreeTool** | Sai do isolamento de worktree | Não |
| **SleepTool** | Pausa a execução (modo proativo) | Sim |
| **SyntheticOutputTool** | Gera saída estruturada | Sim |

## Ferramentas de Gerenciamento de Tarefas

| Ferramenta | Descrição | Somente Leitura |
|------|-------------|-----------|
| **TaskCreateTool** | Cria uma nova tarefa em segundo plano | Não |
| **TaskUpdateTool** | Atualiza o status ou detalhes de uma tarefa | Não |
| **TaskGetTool** | Obtém detalhes de uma tarefa específica | Sim |
| **TaskListTool** | Lista todas as tarefas | Sim |
| **TaskOutputTool** | Obtém a saída de uma tarefa concluída | Sim |
| **TaskStopTool** | Interrompe uma tarefa em execução | Não |

## Ferramentas Web

| Ferramenta | Descrição | Somente Leitura |
|------|-------------|-----------|
| **WebFetchTool** | Busca conteúdo de uma URL | Sim |
| **WebSearchTool** | Realiza busca na web | Sim |

## Ferramentas MCP (Model Context Protocol)

| Ferramenta | Descrição | Somente Leitura |
|------|-------------|-----------|
| **MCPTool** | Invoca ferramentas em servidores MCP conectados | Varia |
| **ListMcpResourcesTool** | Lista recursos expostos por servidores MCP | Sim |
| **ReadMcpResourceTool** | Lê um recurso MCP específico | Sim |
| **McpAuthTool** | Lida com a autenticação do servidor MCP | Não |
| **ToolSearchTool** | Descobre ferramentas adiadas/dinâmicas de servidores MCP | Sim |

## Ferramentas de Integração

| Ferramenta | Descrição | Somente Leitura |
|------|-------------|-----------|
| **LSPTool** | Operações do Protocolo de Servidor de Linguagem (ir para definição, encontrar referências, etc.) | Sim |
| **SkillTool** | Executa uma skill registrada | Varia |

## Agendamento e Gatilhos (Triggers)

| Ferramenta | Descrição | Somente Leitura |
|------|-------------|-----------|
| **ScheduleCronTool** | Cria um gatilho cron agendado | Não |
| **RemoteTriggerTool** | Dispara um gatilho remoto | Não |

## Ferramentas Utilitárias

| Ferramenta | Descrição | Somente Leitura |
|------|-------------|-----------|
| **AskUserQuestionTool** | Solicita entrada do usuário durante a execução | Sim |
| **BriefTool** | Gera um resumo/brief | Sim |
| **ConfigTool** | Lê ou modifica a configuração do Claude Code | Não |

---

## Modelo de Permissão

Toda invocação de ferramenta passa pelo sistema de permissão (`src/hooks/toolPermission/`). Modos de permissão:

| Modo | Comportamento |
|------|----------|
| `default` | Solicita ao usuário para cada operação potencialmente destrutiva |
| `plan` | Mostra o plano completo, pergunta uma vez |
| `bypassPermissions` | Aprova automaticamente tudo (perigoso) |
| `auto` | Classificador baseado em ML decide |

As regras de permissão usam padrões de curinga:

```
Bash(git *)           # Permite todos os comandos git
FileEdit(/src/*)      # Permite edições em qualquer coisa em src/
FileRead(*)           # Permite ler qualquer arquivo
```

Cada ferramenta implementa `checkPermissions()` retornando `{ granted: boolean, reason?, prompt? }`.

---

## Presets de Ferramentas

As ferramentas são agrupadas em presets em `src/tools.ts` para diferentes contextos (ex: ferramentas somente leitura para revisão de código, conjunto completo de ferramentas para desenvolvimento).

---

## Veja Também

- [Arquitetura](arquitetura.md) — Como as ferramentas se encaixam no pipeline geral
- [Guia de Subsistemas](subsistemas.md) — MCP, permissões e outros subsistemas relacionados a ferramentas
- [Guia de Exploração](guia-exploracao.md) — Como ler o código-fonte das ferramentas
