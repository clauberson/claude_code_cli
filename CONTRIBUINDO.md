# Contribuindo

Obrigado pelo seu interesse em contribuir com o Claude Code CLI!

## O Que Você Pode Contribuir

- **Documentação** — Melhore ou expanda o diretório [docs/](docs/)
- **Servidor MCP** — Aprimore o servidor MCP de exploração em [mcp-server/](mcp-server/)
- **Correções de bugs** — Corrija problemas no servidor MCP ou na infraestrutura de suporte
- **Ferramental** — Scripts ou ferramentas que auxiliam no estudo do código-fonte
- **Análise** — Textos descritivos, diagramas de arquitetura ou passo a passos anotados

## Começando

### Pré-requisitos

- **Bun** (runtime e gerenciador de pacotes)
- **Node.js** 18+ (para o servidor MCP)
- **Git**

### Configuração

```bash
git clone https://github.com/TaGoat/claude_code_cli.git
cd claude_code_cli
```

### Desenvolvimento do Servidor MCP

```bash
cd mcp-server
npm install
npm run dev    # Executa com tsx (sem etapa de build)
npm run build  # Compila para dist/
```

### Linting e Verificação de Tipos

```bash
# Da raiz do repositório
npm run lint        # Lint do Biome
npm run typecheck   # Verificação de tipos TypeScript
```

## Estilo de Código

- TypeScript com modo estrito
- Módulos ES
- Indentação de 2 espaços
- Nomes de variáveis descritivos, comentários mínimos

## Enviando Mudanças

1. Faça um fork do repositório
2. Crie uma branch de recurso (`git checkout -b minha-funcionalidade`)
3. Faça suas alterações
4. Faça o commit com uma mensagem clara
5. Envie (push) e abra um pull request

## Perguntas?

Abra uma issue no [GitHub](https://github.com/TaGoat/claude_code_cli/issues).
