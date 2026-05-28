import { spawn, spawnSync } from 'child_process';

const PORT = Number(process.env.PORT || 5001);

function getListeningPids(port) {
  if (process.platform === 'win32') {
    const netstat = spawnSync('netstat', ['-ano'], { encoding: 'utf8' });
    if (netstat.status !== 0) return [];

    const pattern = new RegExp(`:${port}\\s+.*LISTENING`, 'i');
    const pids = new Set();

    String(netstat.stdout || '')
      .split(/\r?\n/)
      .filter((line) => pattern.test(line))
      .forEach((line) => {
        const parts = line.trim().split(/\s+/);
        const pid = Number(parts[parts.length - 1]);
        if (Number.isFinite(pid) && pid > 0) pids.add(pid);
      });

    return [...pids];
  }

  const lsof = spawnSync('lsof', ['-ti', `tcp:${port}`], { encoding: 'utf8' });
  if (lsof.status !== 0) return [];
  return String(lsof.stdout || '')
    .trim()
    .split(/\s+/)
    .map((pid) => Number(pid.trim()))
    .filter((pid) => Number.isFinite(pid) && pid > 0);
}

function killPids(pids) {
  if (!pids.length) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', ...pids.map(String), '/F'], { stdio: 'inherit' });
    return;
  }

  for (const pid of pids) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      // ignore
    }
  }
}

const pids = getListeningPids(PORT);
if (pids.length) {
  console.log(`Port ${PORT} is already in use by PID(s): ${pids.join(', ')}. Killing them before starting dev server...`);
  killPids(pids);
}

const child = spawn(process.execPath, ['--watch', 'index.mjs'], {
  stdio: 'inherit',
  env: process.env,
});

const forwardSignal = (signal) => {
  if (child.killed) return;
  child.kill(signal);
};

process.once('SIGINT', () => forwardSignal('SIGINT'));
process.once('SIGTERM', () => forwardSignal('SIGTERM'));

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
