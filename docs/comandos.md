# Referência de Comandos

> Catálogo completo de todos os comandos slash no Claude Code.

---

## Visão Geral

Comandos são ações voltadas ao usuário, invocadas com um prefixo `/` no REPL (ex: `/commit`, `/review`). Eles residem em `src/commands/` e são registrados em `src/commands.ts`.

### Tipos de Comando

| Tipo | Descrição | Exemplo |
|------|-------------|---------|
| **PromptCommand** | Envia um prompt formatado para o LLM com ferramentas injetadas | `/review`, `/commit` |
| **LocalCommand** | Executa no processo, retorna texto simples | `/cost`, `/version` |
| **LocalJSXCommand** | Executa no processo, retorna React JSX | `/install`, `/doctor` |

### Padrão de Definição de Comando

```typescript
const command = {
  type: 'prompt',
  name: 'meu-comando',
  description: 'O que este comando faz',
  progressMessage: 'trabalhando...',
  allowedTools: ['Bash(git *)', 'FileRead(*)'],
  source: 'builtin',
  async getPromptForCommand(args, context) {
    return [{ type: 'text', text: '...' }]
  },
} satisfies Command
```

---

## Git e Controle de Versão

| Comando | Origem | Descrição |
|---------|--------|-------------|
| `/commit` | `commit.ts` | Cria um commit git com uma mensagem gerada por IA |
| `/commit-push-pr` | `commit-push-pr.ts` | Commit, push e criação de PR em um único passo |
| `/branch` | `branch/` | Cria ou alterna entre branches git |
| `/diff` | `diff/` | Visualiza mudanças nos arquivos (staged, unstaged ou contra uma ref) |
| `/pr_comments` | `pr_comments/` | Visualiza e aborda comentários de revisão de PR |
| `/rewind` | `rewind/` | Reverte para um estado anterior |

## Qualidade de Código

| Comando | Origem | Descrição |
|---------|--------|-------------|
| `/review` | `review.ts` | Revisão de código baseada em IA de mudanças staged/unstaged |
| `/security-review` | `security-review.ts` | Revisão de código focada em segurança |
| `/advisor` | `advisor.ts` | Obtém conselhos de arquitetura ou design |
| `/bughunter` | `bughunter/` | Encontra bugs potenciais na base de código |

## Sessão e Contexto

| Comando | Origem | Descrição |
|---------|--------|-------------|
| `/compact` | `compact/` | Comprime o contexto da conversa para caber mais histórico |
| `/context` | `context/` | Visualiza o contexto atual (arquivos, memória, etc.) |
| `/resume` | `resume/` | Restaura uma sessão de conversa anterior |
| `/session` | `session/` | Gerencia sessões (listar, alternar, excluir) |
| `/share` | `share/` | Compartilha uma sessão via link |
| `/export` | `export/` | Exporta a conversa para um arquivo |
| `/summary` | `summary/` | Gera um resumo da sessão atual |
| `/clear` | `clear/` | Limpa o histórico da conversa |

## Configurações e Preferências

| Comando | Origem | Descrição |
|---------|--------|-------------|
| `/config` | `config/` | Visualiza ou modifica as configurações do Claude Code |
| `/permissions` | `permissions/` | Gerencia regras de permissão de ferramentas |
| `/theme` | `theme/` | Altera o tema de cores do terminal |
| `/output-style` | `output-style/` | Altera o estilo de formatação da saída |
| `/color` | `color/` | Alterna a saída colorida |
| `/keybindings` | `keybindings/` | Visualiza ou personaliza os atalhos de teclado |
| `/vim` | `vim/` | Alterna o modo vim para entrada |
| `/effort` | `effort/` | Ajusta o nível de esforço da resposta |
| `/model` | `model/` | Alterna o modelo ativo |
| `/privacy-settings` | `privacy-settings/` | Gerencia configurações de privacidade/dados |
| `/fast` | `fast/` | Alterna o modo rápido (respostas mais curtas) |
| `/brief` | `brief.ts` | Alterna o modo de saída breve |

## Memória e Conhecimento

| Comando | Origem | Descrição |
|---------|--------|-------------|
| `/memory` | `memory/` | Gerencia memória persistente (arquivos CLAUDE.md) |
| `/add-dir` | `add-dir/` | Adiciona um diretório ao contexto do projeto |
| `/files` | `files/` | Lista arquivos no contexto atual |

## MCP e Plugins

| Comando | Origem | Descrição |
|---------|--------|-------------|
| `/mcp` | `mcp/` | Gerencia conexões com servidores MCP |
| `/plugin` | `plugin/` | Instala, remove ou gerencia plugins |
| `/reload-plugins` | `reload-plugins/` | Recarrega todos os plugins instalados |
| `/skills` | `skills/` | Visualiza e gerencia skills |

## Autenticação

| Comando | Origem | Descrição |
|---------|--------|-------------|
| `/login` | `login/` | Autentica-se com a Anthropic |
| `/logout` | `logout/` | Encerra a sessão |
| `/oauth-refresh` | `oauth-refresh/` | Atualiza os tokens OAuth |

## Tarefas e Agentes

| Comando | Origem | Descrição |
|---------|--------|-------------|
| `/tasks` | `tasks/` | Gerencia tarefas em segundo plano |
| `/agents` | `agents/` | Gerencia sub-agentes |
| `/ultraplan` | `ultraplan.tsx` | Gera um plano de execução detalhado |
| `/plan` | `plan/` | Entra no modo de planejamento |

## Diagnósticos e Status

| Comando | Origem | Descrição |
|---------|--------|-------------|
| `/doctor` | `doctor/` | Executa diagnósticos de ambiente |
| `/status` | `status/` | Mostra o status do sistema e da sessão |
| `/stats` | `stats/` | Mostra estatísticas da sessão |
| `/cost` | `cost/` | Exibe o uso de tokens e o custo estimado |
| `/version` | `version.ts` | Mostra a versão do Claude Code |
| `/usage` | `usage/` | Mostra o uso detalhado da API |
| `/extra-usage` | `extra-usage/` | Mostra detalhes de uso estendidos |
| `/rate-limit-options` | `rate-limit-options/` | Visualiza a configuração de limites de taxa |

## Instalação e Configuração

| Comando | Origem | Descrição |
|---------|--------|-------------|
| `/install` | `install.tsx` | Instala ou atualiza o Claude Code |
| `/upgrade` | `upgrade/` | Atualiza para a versão mais recente |
| `/init` | `init.ts` | Inicializa um projeto (cria CLAUDE.md) |
| `/init-verifiers` | `init-verifiers.ts` | Configura hooks de verificadores |
| `/onboarding` | `onboarding/` | Executa o assistente de configuração inicial |
| `/terminalSetup` | `terminalSetup/` | Configura a integração com o terminal |

## Integração com IDE e Desktop

| Comando | Origem | Descrição |
|---------|--------|-------------|
| `/bridge` | `bridge/` | Gerencia conexões de bridge com IDE |
| `/bridge-kick` | `bridge-kick.ts` | Força o reinício da bridge com a IDE |
| `/ide` | `ide/` | Abre na IDE |
| `/desktop` | `desktop/` | Passa para o aplicativo desktop |
| `/mobile` | `mobile/` | Passa para o aplicativo móvel |
| `/teleport` | `teleport/` | Transfere a sessão para outro dispositivo |

## Remoto e Ambiente

| Comando | Origem | Descrição |
|---------|--------|-------------|
| `/remote-env` | `remote-env/` | Configura o ambiente remoto |
| `/remote-setup` | `remote-setup/` | Configura a sessão remota |
| `/env` | `env/` | Visualiza variáveis de ambiente |
| `/sandbox-toggle` | `sandbox-toggle/` | Alterna o modo sandbox |

## Diversos

| Comando | Origem | Descrição |
|---------|--------|-------------|
| `/help` | `help/` | Mostra a ajuda e os comandos disponíveis |
| `/exit` | `exit/` | Sai do Claude Code |
| `/copy` | `copy/` | Copia o conteúdo para a área de transferência |
| `/feedback` | `feedback/` | Envia feedback para a Anthropic |
| `/release-notes` | `release-notes/` | Visualiza as notas de lançamento |
| `/rename` | `rename/` | Renomeia a sessão atual |
| `/tag` | `tag/` | Adiciona uma tag à sessão atual |
| `/insights` | `insights.ts` | Mostra percepções (insights) da base de código |
| `/stickers` | `stickers/` | Easter egg — stickers |
| `/good-claude` | `good-claude/` | Easter egg — elogia o Claude |
| `/voice` | `voice/` | Alterna o modo de entrada de voz |
| `/chrome` | `chrome/` | Integração com a extensão do Chrome |
| `/issue` | `issue/` | Registra uma issue no GitHub |
| `/statusline` | `statusline.tsx` | Personaliza a linha de status |
| `/thinkback` | `thinkback/` | Reproduz o processo de pensamento do Claude |
| `/thinkback-play` | `thinkback-play/` | Reprodução animada do pensamento |
| `/passes` | `passes/` | Execução em múltiplas passagens |
| `/x402` | `x402/` | Integração com o protocolo de pagamento x402 |

## Comandos Internos / Depuração

| Comando | Origem | Descrição |
|---------|--------|-------------|
| `/ant-trace` | `ant-trace/` | Rastreamento interno da Anthropic |
| `/autofix-pr` | `autofix-pr/` | Correção automática de problemas em PR |
| `/backfill-sessions` | `backfill-sessions/` | Preenchimento retroativo de dados de sessão |
| `/break-cache` | `break-cache/` | Invalida os caches |
| `/btw` | `btw/` | Interjeição "By the way" |
| `/ctx_viz` | `ctx_viz/` | Visualização de contexto (depuração) |
| `/debug-tool-call` | `debug-tool-call/` | Depura uma chamada de ferramenta específica |
| `/heapdump` | `heapdump/` | Gera dump de heap para análise de memória |
| `/hooks` | `hooks/` | Gerencia scripts de hooks |
| `/mock-limits` | `mock-limits/` | Simula limites de taxa para testes |
| `/perf-issue` | `perf-issue/` | Relata problemas de desempenho |
| `/reset-limits` | `reset-limits/` | Redefine os contadores de limite de taxa |

---

## Veja Também

- [Arquitetura](arquitetura.md) — Como o sistema de comandos se encaixa no pipeline
- [Referência de Ferramentas](ferramentas.md) — Ferramentas do agente (diferentes dos comandos slash)
- [Guia de Exploração](guia-exploracao.md) — Como encontrar o código-fonte dos comandos
