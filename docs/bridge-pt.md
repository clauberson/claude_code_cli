# Camada de Bridge (Integração com IDEs VS Code / JetBrains)

## Visão Geral da Arquitetura

A bridge (`src/bridge/`, ~31 arquivos) conecta as sessões da CLI do Claude Code a extensões de IDE remotas (VS Code, JetBrains) e à interface web claude.ai. Ela é protegida pela flag `feature('BRIDGE_MODE')`, que tem como padrão `false`.

### Protocolos

A bridge usa **duas gerações de transporte**:

| Versão | Caminho de Leitura | Caminho de Escrita | Negociação |
|---------|-----------|------------|-------------|
| **v1 (baseada em env)** | WebSocket para Session-Ingress (`ws(s)://.../v1/session_ingress/ws/{sessionId}`) | HTTP POST para Session-Ingress | Poll/ack/dispatch da API de Ambientes |
| **v2 (sem env)** | Stream SSE via `SSETransport` | `CCRClient` → endpoints `/worker/*` | Direto `POST /v1/code/sessions/{id}/bridge` → JWT do worker |

Ambos são encapsulados pela interface `ReplBridgeTransport` (`replBridgeTransport.ts`).

O caminho v1: registra o ambiente → busca trabalho (poll) → confirma (acknowledge) → inicia a sessão.
O caminho v2: cria a sessão → POST `/bridge` para obter JWT → SSE + CCRClient diretamente.

### Autenticação

1. **Tokens OAuth** — assinatura do claude.ai necessária (`isClaudeAISubscriber()`)
2. **JWT** — Tokens de Session-Ingress (prefixados com `sk-ant-si-`) com claims `exp`.
   `jwtUtils.ts` decodifica e agenda a renovação proativa antes da expiração.
3. **Token de Dispositivo Confiável** — cabeçalho `X-Trusted-Device-Token` para sessões de nível de segurança elevado. Registrado via `trustedDevice.ts`.
4. **Segredo de Ambiente (Environment secret)** — `WorkSecret` codificado em base64url contendo `session_ingress_token`, `api_base_url`, fontes git, tokens de autenticação.

Sobrescrita de desenvolvimento: `CLAUDE_BRIDGE_OAUTH_TOKEN` e `CLAUDE_BRIDGE_BASE_URL` (apenas para funcionários Anthropic, `process.env.USER_TYPE === 'ant'`).

### Fluxo de Mensagens (IDE ↔ CLI)

```
IDE / claude.ai  ──WebSocket/SSE──→  Session-Ingress  ──→  CLI (replBridge)
   ←── POST / CCRClient writes ────  Session-Ingress  ←──  CLI
```

**Entrada** (servidor → CLI):
- Mensagens de `usuário` (prompts da interface web) → `handleIngressMessage()` → enfileiradas para o REPL
- `control_request` (inicializar, definir modelo, interromper, definir modo de permissão, definir máximo de tokens de pensamento)
- `control_response` (decisões de permissão vindas da IDE)

**Saída** (CLI → servidor):
- Mensagens do `assistente` (respostas do Claude)
- Mensagens do `usuário` (ecoadas para sincronização)
- Mensagens de `resultado` (conclusão do turno)
- Eventos do sistema, início de ferramentas, atividades

Deduplicação: `BoundedUUIDSet` rastreia UUIDs postados/recebidos recentemente para rejeitar ecos e reentregas.

### Ciclo de Vida

1. **Verificação de direito (Entitlement check)**: `isBridgeEnabled()` / `isBridgeEnabledBlocking()` → porta do GrowthBook `tengu_ccr_bridge` + verificação de assinante OAuth
2. **Criação de sessão**: `createBridgeSession()` → POST para a API
3. **Inicialização do transporte**: v1 `HybridTransport` ou v2 `SSETransport` + `CCRClient`
4. **Bomba de mensagens**: Lê entrada via transporte, escreve saída via lote (batch)
5. **Renovação de token**: Renovação proativa de JWT via `createTokenRefreshScheduler()`
6. **Encerramento**: `teardown()` → envia pendentes → fecha transporte → arquiva sessão

Modos de inicialização para `claude remote-control`:
- `single-session`: Uma sessão no diretório atual (cwd), a bridge encerra quando a sessão termina
- `worktree`: Servidor persistente, cada sessão recebe um worktree git isolado
- `same-dir`: Servidor persistente, as sessões compartilham o diretório atual

### Tipos Principais

- `BridgeConfig` — Configuração completa da bridge (diretório, autenticação, URLs, modo de inicialização, timeouts)
- `WorkSecret` — Payload de trabalho decodificado (token, URL da API, fontes git, configuração MCP)
- `SessionHandle` — Sessão em execução (encerrar, atividades, stdin, atualização de token)
- `ReplBridgeHandle` — API da bridge do REPL (escrever mensagens, requisições de controle, encerramento)
- `BridgeState` — `'ready' | 'connected' | 'reconnecting' | 'failed'`
- `SpawnMode` — `'single-session' | 'worktree' | 'same-dir'`

---

## Análise da Porta de Recurso (Feature Gate)

### O que deve funcionar (atualmente funciona corretamente)

A porta `feature('BRIDGE_MODE')` em `src/shims/bun-bundle.ts` tem como padrão `false` (lê a variável de ambiente `CLAUDE_CODE_BRIDGE_MODE`). Todos os caminhos de código críticos estão devidamente protegidos:

| Localização | Proteção |
|----------|-------|
| `src/entrypoints/cli.tsx:112` | `feature('BRIDGE_MODE') && args[0] === 'remote-control'` |
| `src/main.tsx:2246` | `feature('BRIDGE_MODE') && remoteControlOption !== undefined` |
| `src/main.tsx:3866` | `if (feature('BRIDGE_MODE'))` (subcomando do Commander) |
| `src/hooks/useReplBridge.tsx:79-88` | Todas as chamadas `useAppState` protegidas por ternário `feature('BRIDGE_MODE')` |
| `src/hooks/useReplBridge.tsx:99` | Corpo do `useEffect` protegido por `feature('BRIDGE_MODE')` |
| `src/components/PromptInput/PromptInputFooter.tsx:160` | `if (!feature('BRIDGE_MODE')) return null` |
| `src/components/Settings/Config.tsx:930` | Spread de `feature('BRIDGE_MODE') && isBridgeEnabled()` |
| `src/tools/BriefTool/upload.ts:99` | `if (feature('BRIDGE_MODE'))` |
| `src/tools/ConfigTool/supportedSettings.ts:153` | Spread de `feature('BRIDGE_MODE')` |

### O que pode ser adiado (funcionalidade completa da bridge)

Tudo o que segue está por trás da porta de recurso e inativo:
- `runBridgeLoop()` — Orquestração completa da bridge em `bridgeMain.ts`
- `initReplBridge()` — Inicialização da bridge do REPL
- `initBridgeCore()` / `initEnvLessBridgeCore()` — Negociação de transporte
- `createBridgeApiClient()` — Chamadas à API de Ambientes
- `BridgeUI` — Exibição de status da bridge e códigos QR
- Agendamento de renovação de token
- Gerenciamento de múltiplas sessões (modo worktree)
- Delegação de permissões para a IDE

### O que não quebrará

Importações estáticas de módulos da bridge fora de `src/bridge/` NÃO causam falha porque:

1. **Todos os arquivos da bridge existem** — eles estão no repositório, então as importações são resolvidas.
2. **Sem efeitos colaterais no momento da importação** — os módulos da bridge definem funções/tipos, mas não executam lógica da bridge ao serem importados.
3. **Proteções em tempo de execução** — Funções como `isBridgeEnabled()` retornam `false` quando `feature('BRIDGE_MODE')` é falso. `getReplBridgeHandle()` retorna `null`. `useReplBridge` faz curto-circuito via operadores ternários.

Arquivos com importações estáticas não protegidas (seguro porque os arquivos existem):
- `src/hooks/useReplBridge.tsx` — importa tipos e utilitários da bridge
- `src/components/Settings/Config.tsx` — importa `isBridgeEnabled` (retorna falso)
- `src/components/PromptInput/PromptInputFooter.tsx` — retorna null antecipadamente
- `src/tools/SendMessageTool/SendMessageTool.ts` — `getReplBridgeHandle()` retorna null
- `src/tools/BriefTool/upload.ts` — protegido no local da chamada
- `src/commands/logout/logout.tsx` — `clearTrustedDeviceTokenCache` não executa nenhuma ação

---

## Stub da Bridge

Criado em `src/bridge/stub.ts` com:
- `isBridgeAvailable()` → sempre retorna `false`
- `noopBridgeHandle` — `ReplBridgeHandle` silencioso que não faz nada
- `noopBridgeLogger` — `BridgeLogger` silencioso que não faz nada

Disponível para qualquer código futuro que precise de um fallback seguro quando a bridge estiver desligada.

---

## Ativação da Bridge (Trabalho Futuro)

Para habilitar a bridge:

### 1. Variável de Ambiente
```bash
export CLAUDE_CODE_BRIDGE_MODE=true
```

### 2. Requisitos de Autenticação
- Deve estar logado no claude.ai com uma assinatura ativa (`isClaudeAISubscriber()` deve retornar `true`)
- Tokens OAuth obtidos via `claude auth login` (precisa do escopo `user:profile`)
- A porta do GrowthBook `tengu_ccr_bridge` deve estar habilitada para a organização do usuário

### 3. Extensão de IDE
- VS Code: Extensão Claude Code (conecta-se via camada de Session-Ingress da bridge)
- JetBrains: Integração similar (mesmo protocolo)
- Web: URL `claude.ai/code?bridge={environmentId}`

### 4. Rede / Portas
- **Session-Ingress**: WebSocket (`wss://`) ou SSE para leituras; HTTPS POST para escritas
- **Base da API**: Produção `api.claude.ai` (configurado via configuração OAuth)
- Sobrescritas de desenvolvimento: `CLAUDE_BRIDGE_BASE_URL`, localhost usa caminhos `ws://` e `/v2/`
- Código QR exibido no terminal aponta para `claude.ai/code?bridge={envId}`

### 5. Executando Controle Remoto
```bash
# Sessão única (encerra quando a sessão termina)
claude remote-control

# Sessão nomeada
claude remote-control "meu-projeto"

# Com modo de inicialização específico (requer porta tengu_ccr_bridge_multi_session)
claude remote-control --spawn worktree
claude remote-control --spawn same-dir
```

### 6. Flags Adicionais
- `--remote-control [nome]` / `--rc [nome]` — Inicia o REPL com a bridge pré-habilitada
- `--debug-file <caminho>` — Escreve log de depuração em arquivo
- `--session-id <id>` — Retoma uma sessão existente

---

## Bridge da Extensão do Chrome

### `--claude-in-chrome-mcp` (cli.tsx:72)

Inicia um **servidor MCP do Claude-in-Chrome** via `runClaudeInChromeMcpServer()` de `src/utils/claudeInChrome/mcpServer.ts`. Isso:
- Cria um `StdioServerTransport` (MCP sobre stdin/stdout)
- Usa o pacote `@ant/claude-for-chrome-mcp` para criar um servidor MCP
- Faz a ponte entre o Claude Code e a extensão do Chrome
- Suporta tanto socket nativo (local) quanto bridge WebSocket (`wss://bridge.claudeusercontent.com`)
- Protegido pela flag `tengu_copper_bridge` do GrowthBook (ou `USER_TYPE=ant`)

**Não é protegido por `feature('BRIDGE_MODE')`** — este é um subsistema separado. Só executa quando explicitamente invocado com a flag `--claude-in-chrome-mcp`.

### `--chrome-native-host` (cli.tsx:79)

Inicia o **Chrome Native Messaging Host** via `runChromeNativeHost()` de `src/utils/claudeInChrome/chromeNativeHost.ts`. Isso:
- Implementa o protocolo de mensagens nativas do Chrome (prefixo de comprimento de 4 bytes + JSON sobre stdin/stdout)
- Cria um servidor de socket de domínio Unix em um caminho seguro
- Proxifica mensagens MCP entre a extensão do Chrome e instâncias locais do Claude Code
- Tem seu próprio log de depuração em `~/.claude/debug/chrome-native-host.txt` (apenas para funcionários Anthropic)

**Não é protegido por `feature('BRIDGE_MODE')`** — ponto de entrada separado. Só ativado quando o Chrome chama o binário registrado do host de mensagens nativas.

### Segurança

Ambos os caminhos do Chrome:
- São **importações dinâmicas** — carregados apenas quando a flag específica é passada
- Retornam imediatamente após seu próprio `await` — sem efeitos colaterais na inicialização normal da CLI
- Não podem causar falha na operação normal porque são caminhos de código inteiramente separados
- Não têm dependência da flag de recurso da bridge

---

## Resumo de Verificação

| Verificação | Status |
|-------|--------|
| `feature('BRIDGE_MODE')` retorna `false` por padrão | ✅ Verificado em `src/shims/bun-bundle.ts` |
| Código da bridge não executado quando desabilitado | ✅ Todos os locais de chamada usam a proteção `feature()` |
| Sem erros relacionados à bridge na inicialização | ✅ Importações resolvidas (arquivos existem), sem efeitos colaterais |
| CLI funciona em modo apenas terminal | ✅ Bridge é puramente adicional |
| Caminhos do Chrome não falham | ✅ Importações dinâmicas separadas, apenas em flags explícitas |
| Stub disponível para segurança | ✅ Criado `src/bridge/stub.ts` |
