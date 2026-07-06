'use strict';

const { spawn } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const electron = require('electron');
const main = path.join(root, 'dist-desktop', 'main', 'index.js');
const env = { ...process.env };

// Some automation environments set this so Electron behaves like plain Node.
// The desktop app needs the real Electron main-process APIs.
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electron, [main], {
  cwd: root,
  env,
  stdio: 'inherit',
  windowsHide: false,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
