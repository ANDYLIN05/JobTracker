import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
const command = process.argv[2];
process.env.WRANGLER_WRITE_LOGS ??= 'false';
process.env.WRANGLER_LOG_PATH ??= resolve('.wrangler/logs');
process.env.MINIFLARE_REGISTRY_PATH ??= resolve('.wrangler/registry');
mkdirSync('.wrangler', { recursive: true });
const run = (file, args) => new Promise((resolveRun, reject) => {
  const child = spawn(process.execPath, [file, ...args], { stdio: 'inherit', env: process.env });
  child.on('error', reject);
  child.on('exit', code => code === 0 ? resolveRun() : reject(new Error(`Command failed (${code}): ${file}`)));
});
const migrate = () => run('node_modules/wrangler/bin/wrangler.js', ['d1', 'migrations', 'apply', 'DB', '--local', '--config', 'wrangler.local.json']);
try {
  if (command === 'db:migrate') await migrate();
  else if (command === 'dev') { await migrate(); await run('node_modules/vite/bin/vite.js', process.argv.slice(3)); }
  else if (command === 'build') await run('node_modules/vinext/dist/cli.js', ['build', ...process.argv.slice(3)]);
  else if (command === 'start') { await migrate(); await run('node_modules/vite/bin/vite.js', ['preview', ...process.argv.slice(3)]); }
  else throw new Error(`Unknown command: ${command}`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
