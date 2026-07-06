'use strict';

const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const electron = require('electron');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const main = path.join(root, 'dist-desktop', 'main', 'index.js');
const devUrl = 'http://127.0.0.1:5174';
const children = new Set();

function spawnChild(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: root,
    env: options.env ?? process.env,
    stdio: options.stdio ?? 'inherit',
    windowsHide: options.windowsHide ?? true,
  });
  children.add(child);
  child.on('exit', () => children.delete(child));
  return child;
}

function stopChildren() {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
}

function waitForServer(url, attempts = 80) {
  return new Promise((resolve, reject) => {
    let remaining = attempts;
    const check = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on('error', () => {
        remaining -= 1;
        if (remaining <= 0) {
          reject(new Error(`Timed out waiting for ${url}`));
          return;
        }
        setTimeout(check, 250);
      });
      req.setTimeout(1000, () => req.destroy());
    };
    check();
  });
}

async function mainDev() {
  const vite = spawnChild(npm, ['run', 'desktop:dev:renderer']);
  vite.on('exit', (code) => {
    if (code && code !== 0) process.exit(code);
  });

  await waitForServer(devUrl);

  const env = {
    ...process.env,
    SEEDDECK_DESKTOP_DEV_SERVER_URL: devUrl,
  };
  delete env.ELECTRON_RUN_AS_NODE;

  const app = spawnChild(electron, [main], {
    env,
    windowsHide: false,
  });
  app.on('exit', (code) => {
    stopChildren();
    process.exit(code ?? 0);
  });
}

process.on('SIGINT', () => {
  stopChildren();
  process.exit(130);
});

process.on('SIGTERM', () => {
  stopChildren();
  process.exit(143);
});

mainDev().catch((error) => {
  stopChildren();
  console.error(error);
  process.exit(1);
});
