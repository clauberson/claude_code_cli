# Guia de Subsistemas

> Documentação detalhada dos principais subsistemas do Claude Code.

---

## Sumário

- [Bridge (Integração com IDE)](#bridge-integração-com-ide)
- [MCP (Model Context Protocol)](#mcp-model-context-protocol)
- [Sistema de Permissões](#sistema-de-permissões)
- [Sistema de Plugins](#sistema-de-plugins)
- [Sistema de Skills](#sistema-de-skills)
- [Sistema de Tarefas](#sistema-de-tarefas)
- [Sistema de Memória](#sistema-de-memória)
- [Coordenador (Multi-Agente)](#coordenador-multi-agente)
- [Sistema de Voz](#sistema-de-voz)
- [Camada de Serviços](#camada-de-serviços)

---

## Bridge (Integração com IDE)

**Localização:** `src/bridge/`

A bridge é uma camada de comunicação bidirecional que conecta a CLI do Claude Code com extensões de IDE (VS Code, JetBrains). Ela permite que a CLI funcione como um backend para interfaces baseadas em IDE.

### Arquitetura

```
┌──────────────────┐         ┌──────────────────────┐
│  Extensão da IDE │◄───────►│   Camada de Bridge   │
│  (VS Code, JB)   │  JWT    │  (src/bridge/)       │
│                  │  Auth   │                      │
│ - Renderiz. de UI│         │ - Gestão de sessões  │
│ - Monitor. arqs  │         │ - Roteamento msgs    │
│ - Exibição diff  │         │ - Proxy de permissão │
└──────────────────┘         └──────────┬───────────┘
                                        │
                                        ▼
                              ┌──────────────────────┐
                              │   Claude Code Core   │
                              │  (QueryEngine, Tools) │
                              └──────────────────────┘
```

### Arquivos-Chave

| Arquivo | Propósito |
|------|---------|
| `bridgeMain.ts` | Loop principal da bridge — inicia o canal bidirecional |
| `bridgeMessaging.ts` | Protocolo de mensagem (serializar/desserializar) |
| `bridgePermissionCallbacks.ts` | Roteia solicitações de permissão para a IDE |
| `bridgeApi.ts` | Superfície de API exposta para a IDE |
| `bridgeConfig.ts` | Configuração da bridge |
| `replBridge.ts` | Conecta a sessão REPL à bridge |
| `jwtUtils.ts` | Autenticação baseada em JWT entre CLI e IDE |
| `sessionRunner.ts` | Gerencia a execução da sessão da bridge |
| `createSession.ts` | Cria novas sessões da bridge |
| `trustedDevice.ts` | Verificação de dispositivo confiável |
| `workSecret.ts` | Segredos com escopo de workspace |
| `inboundMessages.ts` | Lida com mensagens vindas da IDE |
| `inboundAttachments.ts` | Lida com anexos de arquivos da IDE |
| `types.ts` | Tipos TypeScript para o protocolo da bridge |

### Feature Flag

A bridge é protegida pela feature flag `BRIDGE_MODE` e é removida de builds que não são para IDE.

---

## MCP (Model Context Protocol)

**Localização:** `src/services/mcp/`

O Claude Code atua tanto como um **cliente MCP** (consumindo ferramentas/recursos de servidores MCP) quanto pode rodar como um **servidor MCP** (expondo suas próprias ferramentas via `src/entrypoints/mcp.ts`).

### Recursos do Cliente

- **Descoberta de ferramentas** — Enumera ferramentas de servidores MCP conectados
- **Navegação de recursos** — Lista e lê recursos expostos via MCP
- **Carregamento dinâmico de ferramentas** — `ToolSearchTool` descobre ferramentas em tempo de execução
- **Autenticação** — `McpAuthTool` lida com fluxos de autenticação de servidores MCP
- **Monitoramento de conectividade** — Hook `useMcpConnectivityStatus` rastreia a saúde da conexão

### Modo Servidor

Quando lançado via `src/entrypoints/mcp.ts`, o Claude Code expõe suas próprias ferramentas e recursos via protocolo MCP, permitindo que outros agentes de IA usem o Claude Code como um servidor de ferramentas.

### Ferramentas Relacionadas

| Ferramenta | Propósito |
|------|---------|
| `MCPTool` | Invoca ferramentas em servidores MCP conectados |
| `ListMcpResourcesTool` | Lista recursos MCP disponíveis |
| `ReadMcpResourceTool` | Lê um recurso MCP específico |
| `McpAuthTool` | Autentica-se com um servidor MCP |
| `ToolSearchTool` | Descobre ferramentas adiadas de servidores MCP |

### Configuração

Servidores MCP são configurados via comando `/mcp` ou arquivos de configuração. O fluxo de aprovação do servidor reside em `src/services/mcpServerApproval.tsx`.

---

## Sistema de Permissões

**Localização:** `src/hooks/toolPermission/`

Toda invocação de ferramenta passa por uma verificação de permissão centralizada antes da execução.

### Modos de Permissão

| Modo | Comportamento |
|------|----------|
| `default` | Pergunta ao usuário para cada operação potencialmente destrutiva |
| `plan` | Mostra o plano de execução completo e pede aprovação única para o lote |
| `bypassPermissions` | Aprova automaticamente todas as operações (perigoso — para ambientes confiáveis) |
| `auto` | Classificador baseado em ML decide automaticamente (experimental) |

### Como Funciona

1. A ferramenta é invocada pela Query Engine
2. `checkPermissions(input, context)` é chamado na ferramenta
3. O manipulador de permissão verifica contra as regras configuradas
4. Se não for aprovado automaticamente, o usuário é solicitado via terminal ou IDE

### Regras de Permissão

As regras usam padrões de curinga (wildcard) para corresponder a invocações de ferramentas:

```
Bash(git *)           # Permite todos os comandos git sem confirmação
Bash(npm test)        # Permite especificamente 'npm test'
FileEdit(/src/*)      # Permite edições em qualquer coisa sob src/
FileRead(*)           # Permite a leitura de qualquer arquivo
```

### Arquivos-Chave

| Arquivo | Caminho |
|------|------|
| Contexto de permissão | `src/hooks/toolPermission/PermissionContext.ts` |
| Manipuladores de permissão | `src/hooks/toolPermission/handlers/` |
| Registro de permissões | `src/hooks/toolPermission/permissionLogging.ts` |
| Tipos de permissão | `src/types/permissions.ts` |

---

## Sistema de Plugins

**Localização:** `src/plugins/`, `src/services/plugins/`

O Claude Code suporta plugins instaláveis que podem estender suas capacidades.

### Estrutura

| Componente | Localização | Propósito |
|-----------|----------|---------|
| Carregador de plugins | `src/services/plugins/` | Descobre e carrega plugins |
| Plugins integrados | `src/plugins/builtinPlugins.ts` | Plugins que vêm com o Claude Code |
| Plugins empacotados | `src/plugins/bundled/` | Código de plugin embutido no binário |
| Tipos de plugin | `src/types/plugin.ts` | Tipos TypeScript para a API de plugins |

### Ciclo de Vida do Plugin

1. **Descoberta** — Escaneia diretórios de plugins e o marketplace
2. **Instalação** — Baixado e registrado (comando `/plugin`)
3. **Carregamento** — Inicializado na inicialização ou sob demanda
4. **Execução** — Plugins podem contribuir com ferramentas, comandos e prompts
5. **Atualização automática** — `usePluginAutoupdateNotification` lida com atualizações

### Comandos Relacionados

| Comando | Propósito |
|---------|---------|
| `/plugin` | Instala, remove ou gerencia plugins |
| `/reload-plugins` | Recarrega todos os plugins instalados |

---

## Sistema de Skills

**Localização:** `src/skills/`

Skills são fluxos de trabalho reutilizáveis e nomeados que agrupam prompts e configurações de ferramentas para tarefas específicas.

### Estrutura

| Componente | Localização | Propósito |
|-----------|----------|---------|
| Skills empacotadas | `src/skills/bundled/` | Skills que vêm com o Claude Code |
| Carregador de skills | `src/skills/loadSkillsDir.ts` | Carrega skills do disco |
| Construtores de skills MCP | `src/skills/mcpSkillBuilders.ts` | Cria skills a partir de recursos MCP |
| Registro de skills | `src/skills/bundledSkills.ts` | Registro de todas as skills empacotadas |

### Skills Empacotadas (16)

| Skill | Propósito |
|-------|---------|
| `batch` | Operações em lote em múltiplos arquivos |
| `claudeApi` | Interação direta com a API da Anthropic |
| `claudeInChrome` | Integração com a extensão do Chrome |
| `debug` | Fluxos de trabalho de depuração |
| `keybindings` | Configuração de atalhos de teclado |
| `loop` | Loops de refinamento iterativo |
| `loremIpsum` | Gera texto de preenchimento |
| `remember` | Persiste informações na memória |
| `scheduleRemoteAgents` | Agendam agentes para execução remota |
| `simplify` | Simplifica código complexo |
| `skillify` | Cria novas skills a partir de fluxos de trabalho |
| `stuck` | Ajuda quando o processo está travado ou bloqueado |
| `updateConfig` | Modifica a configuração programaticamente |
| `verify` / `verifyContent` | Verifica a correção do código |

### Execução

As skills são invocadas via `SkillTool` ou pelo comando `/skills`. Usuários também podem criar skills personalizadas.

---

## Sistema de Tarefas

**Localização:** `src/tasks/`

Gerencia itens de trabalho em segundo plano e paralelos — tarefas de shell, tarefas de agente e agentes companheiros (teammates).

### Tipos de Tarefa

| Tipo | Localização | Propósito |
|------|----------|---------|
| `LocalShellTask` | `LocalShellTask/` | Execução de comando shell em segundo plano |
| `LocalAgentTask` | `LocalAgentTask/` | Sub-agente rodando localmente |
| `RemoteAgentTask` | `RemoteAgentTask/` | Agente rodando em uma máquina remota |
| `InProcessTeammateTask` | `InProcessTeammateTask/` | Agente companheiro paralelo |
| `DreamTask` | `DreamTask/` | Processo de "devaneio" (dreaming) em segundo plano |
| `LocalMainSessionTask` | `LocalMainSessionTask.ts` | Sessão principal tratada como uma tarefa |

### Ferramentas de Tarefa

| Ferramenta | Propósito |
|------|---------|
| `TaskCreateTool` | Cria uma nova tarefa em segundo plano |
| `TaskUpdateTool` | Atualiza o status da tarefa |
| `TaskGetTool` | Recupera detalhes da tarefa |
| `TaskListTool` | Lista todas as tarefas |
| `TaskOutputTool` | Obtém a saída da tarefa |
| `TaskStopTool` | Interrompe uma tarefa em execução |

---

## Sistema de Memória

**Localização:** `src/memdir/`

Sistema de memória persistente do Claude Code, baseado em arquivos `CLAUDE.md`.

### Hierarquia de Memória

| Escopo | Localização | Propósito |
|-------|----------|---------|
| Memória do projeto | `CLAUDE.md` na raiz do projeto | Fatos e convenções específicos do projeto |
| Memória do usuário | `~/.claude/CLAUDE.md` | Preferências do usuário, entre projetos |
| Memórias extraídas | `src/services/extractMemories/` | Extraídas automaticamente das conversas |
| Sincronização de memória de time | `src/services/teamMemorySync/` | Conhecimento compartilhado da equipe |

### Relacionado

- Comando `/memory` para gerenciar memórias
- Skill `remember` para persistir informações
- Hook `useMemoryUsage` para rastrear o tamanho da memória

---

## Coordenador (Multi-Agente)

**Localização:** `src/coordinator/`

Orquestra múltiplos agentes trabalhando em paralelo em diferentes aspectos de uma tarefa.

### Como Funciona

- `coordinatorMode.ts` gerencia o ciclo de vida do coordenador
- `TeamCreateTool` e `TeamDeleteTool` gerenciam equipes de agentes
- `SendMessageTool` permite a comunicação entre agentes
- `AgentTool` inicia sub-agentes

Protegido pela feature flag `COORDINATOR_MODE`.

---

## Sistema de Voz

**Localização:** `src/voice/`

Suporte a entrada/saída de voz para interação mãos-livres.

### Componentes

| Arquivo | Localização | Propósito |
|------|----------|---------|
| Serviço de voz | `src/services/voice.ts` | Processamento central de voz |
| Streaming de STT | `src/services/voiceStreamSTT.ts` | Streaming de fala para texto (Speech-to-text) |
| Termos-chave | `src/services/voiceKeyterms.ts` | Vocabulário específico do domínio |
| Hooks de voz | `src/hooks/useVoice.ts`, `useVoiceEnabled.ts`, `useVoiceIntegration.tsx` | Hooks React |
| Comando de voz | `src/commands/voice/` | Comando slash `/voice` |

Protegido pela feature flag `VOICE_MODE`.

---

## Camada de Serviços

**Localização:** `src/services/`

Integrações externas e serviços compartilhados.

| Serviço | Caminho | Propósito |
|---------|------|---------|
| **API** | `api/` | Cliente SDK da Anthropic, upload de arquivos, bootstrap |
| **MCP** | `mcp/` | Conexões de cliente MCP e descoberta de ferramentas |
| **OAuth** | `oauth/` | Fluxo de autenticação OAuth 2.0 |
| **LSP** | `lsp/` | Gerenciador de Protocolo de Servidor de Linguagem (Language Server Protocol) |
| **Analytics** | `analytics/` | Feature flags do GrowthBook, telemetria |
| **Plugins** | `plugins/` | Carregador de plugins e marketplace |
| **Compact** | `compact/` | Compressão de contexto de conversa |
| **Policy Limits** | `policyLimits/` | Limites de taxa/quota da organização |
| **Remote Settings** | `remoteManagedSettings/` | Sincronização de configurações gerenciadas de enterprise |
| **Estimativa de Tokens** | `tokenEstimation.ts` | Estimativa de contagem de tokens |
| **Memória de Time** | `teamMemorySync/` | Sincronização de conhecimento da equipe |
| **Dicas** | `tips/` | Dicas de uso contextuais |
| **Resumo de Agente** | `AgentSummary/` | Resumos do trabalho do agente |
| **Sugestão de Prompt** | `PromptSuggestion/` | Sugestões de prompts de acompanhamento |
| **Memória de Sessão** | `SessionMemory/` | Memória em nível de sessão |
| **Magic Docs** | `MagicDocs/` | Geração de documentação |
| **Auto Dream** | `autoDream/` | Ideação em segundo plano |
| **x402** | `x402/` | Protocolo de pagamento x402 |

---

## Veja Também

- [Arquitetura](arquitetura.md) — Como os subsistemas se conectam no pipeline central
- [Referência de Ferramentas](ferramentas.md) — Ferramentas relacionadas a cada subsistema
- [Referência de Comandos](comandos.md) — Comandos para gerenciar os subsistemas
- [Guia de Exploração](guia-exploracao.md) — Como encontrar o código-fonte dos subsistemas
