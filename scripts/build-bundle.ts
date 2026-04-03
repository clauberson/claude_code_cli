// scripts/build-bundle.ts
// Usage: bun scripts/build-bundle.ts [--watch] [--minify] [--no-sourcemap]
//
// Production build: bun scripts/build-bundle.ts --minify
// Dev build:        bun scripts/build-bundle.ts
// Watch mode:       bun scripts/build-bundle.ts --watch

import * as esbuild from 'esbuild'
import { resolve, dirname } from 'path'
import { chmodSync, readFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'

// Bun: import.meta.dir — Node 21+: import.meta.dirname — fallback
const __dir: string =
  (import.meta as any).dir ??
  (import.meta as any).dirname ??
  dirname(fileURLToPath(import.meta.url))

const ROOT = resolve(__dir, '..')
const watch = process.argv.includes('--watch')
const minify = process.argv.includes('--minify')
const noSourcemap = process.argv.includes('--no-sourcemap')

// Read version from package.json for MACRO injection
const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf-8'))
const version = pkg.version || '0.0.0-dev'

// ── Plugin: resolve bare 'src/' imports AND .js -> .ts mappings ──
// The codebase uses `import ... from 'src/foo/bar.js'` and `import ... from './baz.js'`
// which relies on TypeScript's resolution. This plugin maps those to real TS files.
const srcResolverPlugin: esbuild.Plugin = {
  name: 'src-resolver',
  setup(build) {
    // Handle both 'src/' and relative imports that end in .js/.jsx
    build.onResolve({ filter: /^(src\/|\.\.?\/).*\.js(x)?$/ }, (args) => {
      const isSrc = args.path.startsWith('src/');
      const basePath = isSrc ? resolve(ROOT, args.path) : resolve(dirname(args.importer), args.path);

      // Try TypeScript extensions
      const withoutExt = basePath.replace(/\.(js|jsx)$/, '')
      for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
        const candidate = withoutExt + ext
        if (existsSync(candidate)) {
          return { path: candidate }
        }
      }

      // Special case: check if it's pointing to a .d.ts that we should skip
      if (existsSync(withoutExt + '.d.ts')) {
          return { path: resolve(ROOT, 'src/shims/empty.ts') }
      }

      // Try as directory with index file
      const dirPath = basePath.replace(/\.(js|jsx)$/, '')
      for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
        const candidate = resolve(dirPath, 'index' + ext)
        if (existsSync(candidate)) {
          return { path: candidate }
        }
      }

      return undefined
    })

    // Catch-all for @ant/ and other potentially missing internal packages
    build.onResolve({ filter: /^(@ant\/|@anthropic-ai\/|color-diff-napi|audio-capture-napi|modifiers-napi|image-processor-napi|sharp|fsevents)/ }, (args) => {
      return { path: resolve(ROOT, 'src/shims/empty.ts') }
    })

    build.onResolve({ filter: /\.d\.ts$/ }, (args) => {
      // In TS code, imports often point to .d.ts files.
      // We want to skip them in the bundle or point to an empty JS-compatible file.
      return { path: resolve(ROOT, 'src/shims/empty.ts') }
    })

    build.onLoad({ filter: /empty\.ts$/ }, () => {
      return { 
        contents: `
          export class SandboxManager {}
          export class McpManifestManager {}
          export class McpSessionManager {}
          export function registerDreamSkill() {}
          export function registerHunterSkill() {}
          export function registerRunSkillGeneratorSkill() {}
          export class ColorDiff {}
          export class ColorFile {}
          export function getSyntaxTheme() {}
          export function getModifiers() {}

          // Anthropic SDK and internal shims
          export default class Anthropic {}
          export class APIError extends Error {}
          export class APIUserAbortError extends APIError {}
          export class APIConnectionError extends APIError {}
          export class APIConnectionTimeoutError extends APIConnectionError {}
          export class AuthenticationError extends APIError {}
          export class NotFoundError extends APIError {}
          
          export const API_RESIZE_PARAMS = {};
          export const targetImageSize = 0;
          export function getSentinelCategory() {}
          export const DEFAULT_GRANT_FLAGS = {};
          export function bindSessionContext() {}
          export function createClaudeForChromeMcpServer() {}
          export function buildComputerUseTools() {}
          export function createComputerUseMcpServer() {}
          export const BROWSER_TOOLS = [];
        `, 
        loader: 'ts' 
      };
    })

    build.onResolve({ filter: /^src\// }, (args) => {
      const basePath = resolve(ROOT, args.path)

      // Already exists as-is
      if (existsSync(basePath)) {
        return { path: basePath }
      }

      // Strip .js/.jsx and try TypeScript extensions
      const withoutExt = basePath.replace(/\.(js|jsx)$/, '')
      for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
        const candidate = withoutExt + ext
        if (existsSync(candidate)) {
          return { path: candidate }
        }
      }

      // Try as directory with index file
      const dirPath = basePath.replace(/\.(js|jsx)$/, '')
      for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
        const candidate = resolve(dirPath, 'index' + ext)
        if (existsSync(candidate)) {
          return { path: candidate }
        }
      }

      // Let esbuild handle it (will error if truly missing)
      return undefined
    })
  },
}

const buildOptions: esbuild.BuildOptions = {
  entryPoints: [resolve(ROOT, 'src/entrypoints/cli.tsx')],
  bundle: true,
  platform: 'node',
  target: ['node20', 'es2022'],
  format: 'esm',
  outdir: resolve(ROOT, 'dist'),
  outExtension: { '.js': '.mjs' },

  // Single-file output — no code splitting for CLI tools
  splitting: false,

  plugins: [srcResolverPlugin],

  // Use tsconfig for baseUrl / paths resolution (complements plugin above)
  tsconfig: resolve(ROOT, 'tsconfig.json'),

  loader: {
    '.txt': 'text',
    '.md': 'text',
  },

  // Aliases for internal or native packages that are not available
  alias: {
    'bun:bundle': resolve(ROOT, 'src/shims/bun-bundle.ts'),
    '@anthropic-ai/sandbox-runtime': resolve(ROOT, 'src/shims/empty.ts'),
    '@anthropic-ai/claude-agent-sdk': resolve(ROOT, 'src/shims/empty.ts'),
    '@anthropic-ai/mcpb': resolve(ROOT, 'src/shims/empty.ts'),
    '@anthropic-ai/bedrock-sdk': resolve(ROOT, 'src/shims/empty.ts'),
    '@anthropic-ai/foundry-sdk': resolve(ROOT, 'src/shims/empty.ts'),
    '@anthropic-ai/vertex-sdk': resolve(ROOT, 'src/shims/empty.ts'),
    'fsevents': resolve(ROOT, 'src/shims/empty.ts'),
    'sharp': resolve(ROOT, 'src/shims/empty.ts'),
    'image-processor-napi': resolve(ROOT, 'src/shims/empty.ts'),
    'color-diff-napi': resolve(ROOT, 'src/shims/empty.ts'),
    'audio-capture-napi': resolve(ROOT, 'src/shims/empty.ts'),
    'modifiers-napi': resolve(ROOT, 'src/shims/empty.ts'),
  },

  // Don't bundle node built-ins
  external: [
    // Node built-ins (with and without node: prefix)
    'fs', 'path', 'os', 'crypto', 'child_process', 'http', 'https',
    'net', 'tls', 'url', 'util', 'stream', 'events', 'buffer',
    'querystring', 'readline', 'zlib', 'assert', 'tty', 'worker_threads',
    'perf_hooks', 'async_hooks', 'dns', 'dgram', 'cluster',
    'string_decoder', 'module', 'vm', 'constants', 'domain',
    'console', 'process', 'v8', 'inspector',
    'node:*',
    // Cloud SDKs - mark as external to avoid bundling/missing dependency errors
    '@aws-sdk/*',
    '@smithy/*',
    '@google-cloud/*',
    'google-auth-library',
    '@azure/identity',
    '@opentelemetry/*',
    '@ant/*',
  ],

  jsx: 'automatic',

  // Source maps for production debugging (external .map files)
  sourcemap: noSourcemap ? false : 'external',

  // Minification for production
  minify,

  // Tree shaking (on by default, explicit for clarity)
  treeShaking: true,

  // Define replacements — inline constants at build time
  // MACRO.* — originally inlined by Bun's bundler at compile time
  // process.env.USER_TYPE — eliminates 'ant' (Anthropic-internal) code branches
  define: {
    'MACRO.VERSION': JSON.stringify(version),
    'MACRO.PACKAGE_URL': JSON.stringify('@anthropic-ai/claude-code'),
    'MACRO.ISSUES_EXPLAINER': JSON.stringify(
      'report issues at https://github.com/anthropics/claude-code/issues'
    ),
    'process.env.USER_TYPE': '"external"',
    'process.env.NODE_ENV': minify ? '"production"' : '"development"',
  },

  // Banner: shebang for direct CLI execution
  banner: {
    js: '#!/usr/bin/env node\n',
  },

  // Handle the .js → .ts resolution that the codebase uses
  resolveExtensions: ['.tsx', '.ts', '.jsx', '.js', '.json'],

  logLevel: 'info',

  // Metafile for bundle analysis
  metafile: true,
}

async function main() {
  if (watch) {
    const ctx = await esbuild.context(buildOptions)
    await ctx.watch()
    console.log('Watching for changes...')
  } else {
    const startTime = Date.now()
    const result = await esbuild.build(buildOptions)

    if (result.errors.length > 0) {
      console.error('Build failed')
      process.exit(1)
    }

    // Make the output executable
    const outPath = resolve(ROOT, 'dist/cli.mjs')
    try {
      chmodSync(outPath, 0o755)
    } catch {
      // chmod may fail on some platforms, non-fatal
    }

    const elapsed = Date.now() - startTime

    // Print bundle size info
    if (result.metafile) {
      const text = await esbuild.analyzeMetafile(result.metafile, { verbose: false })
      const outFiles = Object.entries(result.metafile.outputs)
      for (const [file, info] of outFiles) {
        if (file.endsWith('.mjs')) {
          const sizeMB = ((info as { bytes: number }).bytes / 1024 / 1024).toFixed(2)
          console.log(`\n  ${file}: ${sizeMB} MB`)
        }
      }
      console.log(`\nBuild complete in ${elapsed}ms → dist/`)

      // Write metafile for further analysis
      const { writeFileSync } = await import('fs')
      writeFileSync(
        resolve(ROOT, 'dist/meta.json'),
        JSON.stringify(result.metafile),
      )
      console.log('  Metafile written to dist/meta.json')
    }
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
