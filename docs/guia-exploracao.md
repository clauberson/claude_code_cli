# Guia de Exploração

> Como navegar e estudar o código-fonte do Claude Code.

---

## Início Rápido

Esta é uma **base de código de referência apenas para leitura** — não há sistema de build ou suíte de testes. O objetivo é entender como um assistente de codificação de IA de produção é construído.

### Orientação

| O quê | Onde |
|------|-------|
| Ponto de entrada da CLI | `src/main.tsx` |
| Engine principal de LLM | `src/QueryEngine.ts` (~46K linhas) |
| Definições de ferramentas | `src/Tool.ts` (~29K linhas) |
| Registro de comandos | `src/commands.ts` (~25K linhas) |
| Registro de ferramentas | `src/tools.ts` |
| Coleta de contexto | `src/context.ts` |
| Implementações de ferramentas | `src/tools/` (40 subdiretórios) |
| Implementações de comandos | `src/commands/` (~85 subdiretórios + 15 arquivos) |

---

## Encontrando Coisas

### "Como funciona a ferramenta X?"

1. Vá para `src/tools/{NomeDaFerramenta}/`
2. A implementação principal é `{NomeDaFerramenta}.ts` ou `.tsx`
3. A renderização da UI está em `UI.tsx`
4. A contribuição para o prompt do sistema está em `prompt.ts`

Exemplo — entendendo a BashTool:
```
src/tools/BashTool/
├── BashTool.ts      ← Lógica de execução principal
├── UI.tsx           ← Como a saída do bash é renderizada no terminal
├── prompt.ts        ← O que o prompt do sistema diz sobre o bash
└── ...
```

### "Como funciona o comando X?"

1. Verifique `src/commands/{nome-do-comando}/` (diretório) ou `src/commands/{nome-do-comando}.ts` (arquivo)
2. Procure pela função `getPromptForCommand()` (PromptCommands) ou implementação direta (LocalCommands)

### "Como funciona o recurso X?"

| Recurso | Comece Aqui |
|---------|-----------|
| Permissões | `src/hooks/toolPermission/` |
| Bridge com IDE | `src/bridge/bridgeMain.ts` |
| Cliente MCP | `src/services/mcp/` |
| Sistema de plugins | `src/plugins/` + `src/services/plugins/` |
| Skills | `src/skills/` |
| Entrada de voz | `src/voice/` + `src/services/voice.ts` |
| Multi-agente | `src/coordinator/` |
| Memória | `src/memdir/` |
| Autenticação | `src/services/oauth/` |
| Esquemas de configuração | `src/schemas/` |
| Gerenciamento de estado | `src/state/` |

### "Como flui uma chamada de API?"

Rastreie desde a entrada do usuário até a resposta da API:

```
src/main.tsx                    ← Parsing da CLI
  → src/replLauncher.tsx        ← Início da sessão REPL
    → src/QueryEngine.ts        ← Engine principal
      → src/services/api/       ← Cliente SDK da Anthropic
        → (API da Anthropic)    ← HTTP/streaming
      ← Resposta de uso de ferramenta
      → src/tools/{NomeDaFerramenta}/ ← Execução da ferramenta
      ← Resultado da ferramenta
      → (envia de volta para API) ← Continua o loop
```

---

## Padrões de Código para Reconhecer

### `buildTool()` — Fábrica de Ferramentas

Toda ferramenta usa este padrão:

```typescript
export const MinhaFerramenta = buildTool({
  name: 'MinhaFerramenta',
  inputSchema: z.object({ ... }),
  async call(args, context) { ... },
  async checkPermissions(input, context) { ... },
})
```

### Portas de Feature Flags

```typescript
import { feature } from 'bun:bundle'

if (feature('VOICE_MODE')) {
  // Este código é removido no build se VOICE_MODE estiver desligado
}
```

### Portas Internas da Anthropic

```typescript
if (process.env.USER_TYPE === 'ant') {
  // Recursos exclusivos para funcionários da Anthropic
}
```

### Re-exportações de Index

A maioria dos diretórios tem um `index.ts` que re-exporta a API pública:

```typescript
// src/tools/BashTool/index.ts
export { BashTool } from './BashTool.js'
```

### Importações Dinâmicas (Lazy)

Módulos pesados são carregados apenas quando necessário:

```typescript
const { OpenTelemetry } = await import('./modulo-pesado.js')
```

### ESM com Extensões `.js`

Convenção do Bun — todas as importações usam extensões `.js` mesmo para arquivos `.ts`:

```typescript
import { algo } from './utils.js'  // Na verdade importa utils.ts
```

---

## Arquivos-Chave por Tamanho

Os maiores arquivos contêm a maior parte da lógica e valem a pena ser estudados:

| Arquivo | Linhas | O que tem dentro |
|------|-------|---------------|
| `QueryEngine.ts` | ~46K | Streaming, loops de ferramentas, repetições, contagem de tokens |
| `Tool.ts` | ~29K | Tipos de ferramentas, `buildTool`, modelos de permissão |
| `commands.ts` | ~25K | Registro de comandos, carregamento condicional |
| `main.tsx` | — | Parser de CLI, otimização de inicialização |
| `context.ts` | — | Montagem de contexto de OS, shell, git, usuário |

---

## Caminhos de Estudo

### Caminho 1: "Como uma ferramenta funciona de ponta a ponta?"

1. Leia `src/Tool.ts` — entenda a interface `buildTool`
2. Escolha uma ferramenta simples como `FileReadTool` em `src/tools/FileReadTool/`
3. Rastreie como `QueryEngine.ts` chama ferramentas durante o loop de ferramentas
4. Veja como as permissões são verificadas em `src/hooks/toolPermission/`

### Caminho 2: "Como a UI funciona?"

1. Leia `src/screens/REPL.tsx` — a tela principal
2. Explore `src/components/` — escolha alguns componentes
3. Veja `src/hooks/useTextInput.ts` — como a entrada do usuário é capturada
4. Verifique `src/ink/` — o wrapper do renderizador Ink

### Caminho 3: "Como funciona a integração com IDE?"

1. Comece em `src/bridge/bridgeMain.ts`
2. Siga `bridgeMessaging.ts` para o protocolo de mensagens
3. Veja `bridgePermissionCallbacks.ts` para saber como as permissões são roteadas para a IDE
4. Verifique `replBridge.ts` para o bridging da sessão REPL

### Caminho 4: "Como os plugins estendem o Claude Code?"

1. Leia `src/types/plugin.ts` — a superfície da API de plugins
2. Veja `src/services/plugins/` — como os plugins são carregados
3. Verifique `src/plugins/builtinPlugins.ts` — exemplos integrados
4. Veja `src/plugins/bundled/` — código de plugins empacotados

### Caminho 5: "Como o MCP funciona?"

1. Leia `src/services/mcp/` — o cliente MCP
2. Veja `src/tools/MCPTool/` — como as ferramentas MCP são invocadas
3. Verifique `src/entrypoints/mcp.ts` — Claude Code como um servidor MCP
4. Veja `src/skills/mcpSkillBuilders.ts` — skills vindas de MCP

---

## Usando o Servidor MCP para Exploração

Este repositório inclui um servidor MCP independente (`mcp-server/`) que permite a qualquer cliente compatível com MCP explorar o código-fonte. Veja o [README do Servidor MCP](../mcp-server/README.md) para configuração.

Uma vez conectado, você pode pedir a um assistente de IA para explorar o código:

- "Como funciona a BashTool?"
- "Pesquise onde as permissões são verificadas"
- "Liste todos os arquivos no diretório bridge"
- "Leia as linhas 1-100 de QueryEngine.ts"

---

## Padrões de Grep

Padrões úteis de grep/ripgrep para encontrar coisas:

```bash
# Encontrar todas as definições de ferramentas
rg "buildTool\(" src/tools/

# Encontrar todas as definições de comandos
rg "satisfies Command" src/commands/

# Encontrar o uso de feature flags
rg "feature\(" src/

# Encontrar portas internas da Anthropic
rg "USER_TYPE.*ant" src/

# Encontrar todos os hooks do React
rg "^export function use" src/hooks/

# Encontrar todos os esquemas Zod
rg "z\.object\(" src/schemas/

# Encontrar todas as contribuições de prompt do sistema
rg "prompt\(" src/tools/*/prompt.ts

# Encontrar padrões de regras de permissão
rg "checkPermissions" src/tools/
```

---

## Veja Também

- [Arquitetura](arquitetura.md) — Design geral do sistema
- [Referência de Ferramentas](ferramentas.md) — Catálogo completo de ferramentas
- [Referência de Comandos](comandos.md) — Todos os comandos slash
- [Guia de Subsistemas](subsistemas.md) — Mergulhos profundos em Bridge, MCP, Permissões, etc.
