#!/usr/bin/env node

import { spawn } from 'child_process';

console.log('🚀 Starting web server and bot concurrently...');
console.log('📱 Web server: http://localhost:5000');
console.log('🤖 Bot: Minecraft bot manager');
console.log('─'.repeat(50));

// Tạo màu sắc cho logs
const colors = {
  web: '\x1b[36m', // cyan
  bot: '\x1b[35m', // magenta
  reset: '\x1b[0m'
};

// Chạy web server
const webProcess = spawn('tsx', ['server/index.ts'], {
  env: { ...process.env, NODE_ENV: 'development' },
  stdio: 'pipe'
});

// Chạy bot
const botProcess = spawn('tsx', ['server/botlolicute.ts'], {
  env: { ...process.env, NODE_ENV: 'development' },
  stdio: 'pipe'
});

// Xử lý output của web server
webProcess.stdout.on('data', (data) => {
  process.stdout.write(`${colors.web}[🌐web]${colors.reset} ${data}`);
});

webProcess.stderr.on('data', (data) => {
  process.stderr.write(`${colors.web}[🌐web]${colors.reset} ${data}`);
});

// Xử lý output của bot
botProcess.stdout.on('data', (data) => {
  process.stdout.write(`${colors.bot}[🤖bot]${colors.reset} ${data}`);
});

botProcess.stderr.on('data', (data) => {
  process.stderr.write(`${colors.bot}[🤖bot]${colors.reset} ${data}`);
});

// Xử lý khi process thoát
webProcess.on('close', (code) => {
  console.log(`${colors.web}[🌐web]${colors.reset} Process exited with code ${code}`);
  botProcess.kill();
  process.exit(code);
});

botProcess.on('close', (code) => {
  console.log(`${colors.bot}[🤖bot]${colors.reset} Process exited with code ${code}`);
  if (code !== 0) {
    console.log('Bot process crashed, keeping web server running...');
  }
});

// Xử lý tín hiệu dừng
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping both processes...');
  webProcess.kill();
  botProcess.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Stopping both processes...');
  webProcess.kill();
  botProcess.kill();
  process.exit(0);
});