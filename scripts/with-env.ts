#!/usr/bin/env node
/**
 * Environment-aware script wrapper
 *
 * Loads env file then executes the given command as an argv array (no shell).
 *
 * Usage:
 *   tsx scripts/with-env.ts <command> [args...]
 *   NODE_ENV=production tsx scripts/with-env.ts <command> [args...]
 *   ENV_FILE=.env.production tsx scripts/with-env.ts <command> [args...]
 *
 * Priority: ENV_FILE > .env.{NODE_ENV} > .env.local > .env
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { delimiter, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Ensure local package bins (tsx, drizzle-kit) resolve without a shell. */
function envWithLocalBin(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const binDir = resolve(process.cwd(), 'node_modules', '.bin');
  const pathKey = process.platform === 'win32' ? 'Path' : 'PATH';
  const current = env[pathKey] ?? '';
  if (current.split(delimiter).includes(binDir)) return env;
  return { ...env, [pathKey]: `${binDir}${delimiter}${current}` };
}

function loadEnv(filePath: string) {
  if (!existsSync(filePath)) return false;
  const content = readFileSync(filePath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    // Strip surrounding quotes (single or double)
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
  return true;
}

/**
 * Run a command with argv array (no shell). Returns the child exit status.
 * Exported for unit tests.
 */
export function runArgvCommand(
  argv: string[],
  options?: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    stdio?: 'inherit' | 'pipe';
  }
): number {
  if (argv.length === 0) {
    console.error('❌ No command provided');
    return 1;
  }

  const [command, ...args] = argv;
  console.log(`▶️  ${[command, ...args].join(' ')}\n`);

  const result = spawnSync(command, args, {
    stdio: options?.stdio ?? 'inherit',
    cwd: options?.cwd ?? process.cwd(),
    env: envWithLocalBin(options?.env ?? process.env),
    shell: false,
  });

  if (result.error) {
    console.error(`❌ Failed to start command: ${result.error.message}`);
    return 1;
  }
  if (result.signal) {
    return 1;
  }
  return result.status ?? 1;
}

function loadEnvFiles() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const envFile = process.env.ENV_FILE;

  const filesToTry = envFile
    ? [envFile]
    : [`.env.${nodeEnv}.local`, `.env.${nodeEnv}`, '.env.local', '.env'];

  let loaded = false;
  for (const file of filesToTry) {
    const fullPath = resolve(file);
    if (loadEnv(fullPath)) {
      console.log(`📄 Loaded: ${file}`);
      loaded = true;
    }
  }

  if (!loaded) {
    console.log('⚠️  No env file found, using process environment');
  }
}

function isDirectRun() {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return (
      resolve(entry) === fileURLToPath(import.meta.url) ||
      entry.endsWith('with-env.ts') ||
      entry.endsWith('with-env.js') ||
      entry.endsWith('with-env.mjs')
    );
  } catch {
    return entry.endsWith('with-env.ts') || entry.endsWith('with-env.js');
  }
}

if (isDirectRun()) {
  loadEnvFiles();
  process.exit(runArgvCommand(process.argv.slice(2)));
}
