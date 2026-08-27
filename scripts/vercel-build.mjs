/**
 * Vercel Git deploys often ignore vercel.json "rootDirectory" and build from
 * the repo root, where there is no Next.js app. This script installs/builds
 * frontend/ (pnpm) and copies .next to the repo root so @vercel/next can
 * find it. If the dashboard Root Directory is already "frontend", this file
 * is never run.
 */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const frontend = join(root, 'frontend');

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run('npx', ['--yes', 'pnpm@9.15.9', 'install', '--frozen-lockfile'], frontend);
run('npx', ['--yes', 'pnpm@9.15.9', 'build'], frontend);

const from = join(frontend, '.next');
const to = join(root, '.next');
if (!existsSync(from)) {
  console.error('frontend/.next was not produced');
  process.exit(1);
}
rmSync(to, { recursive: true, force: true });
cpSync(from, to, { recursive: true });
