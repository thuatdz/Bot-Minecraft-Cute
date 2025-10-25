#!/usr/bin/env tsx
import { botManager, BotConfig } from './botmineflayer';
import readline from 'readline';

// Tạo console interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log(`
🌸 ====================================== 🌸
     MINECRAFT BOT CONSOLE - LOLI CUTE
🌸 ====================================== 🌸

Server: thuatzai123.aternos.me:38893
Phiên bản: 1.19.4

Các lệnh có sẵn:
  /start <tên_bot>  - Tạo và kết nối bot mới
  /stop <tên_bot>   - Dừng bot
  /list             - Liệt kê tất cả bot đang chạy  
  /say <tên_bot> <tin_nhắn> - Gửi tin nhắn từ bot
  /status <tên_bot> - Xem trạng thái bot
  /dance <tên_bot>  - Cho bot nhảy múa
  /help             - Hiển thị trợ giúp
  /exit             - Thoát console

🌸 ====================================== 🌸
`);

// Console callback để nhận log từ bot
const consoleCallback = (botId: string, level: string, message: string, source: string) => {
  const timestamp = new Date().toLocaleTimeString('vi-VN');
  const levelColor = {
    'info': '\x1b[36m',    // cyan
    'success': '\x1b[32m', // green  
    'warning': '\x1b[33m', // yellow
    'error': '\x1b[31m',   // red
    'debug': '\x1b[37m'    // white
  };
  const color = levelColor[level as keyof typeof levelColor] || '\x1b[37m';
  const reset = '\x1b[0m';
  
  console.log(`${color}[${timestamp}] [${botId}] ${level.toUpperCase()}: ${message}${reset}`);
};

// Map để lưu trữ các bot instances
const activeBots = new Map<string, any>();

// Function để xử lý các lệnh
async function handleCommand(input: string) {
  const parts = input.trim().split(' ');
  const command = parts[0];
  
  try {
    switch (command) {
      case '/start':
        if (parts.length < 2) {
          console.log('❌ Cách sử dụng: /start <tên_bot>');
          break;
        }
        const username = parts[1];
        
        if (activeBots.has(username)) {
          console.log(`⚠️  Bot ${username} đã đang chạy rồi!`);
          break;
        }
        
        console.log(`🚀 Đang tạo bot ${username}...`);
        const success = await botManager.connectBotToServer(username, username, consoleCallback);
        
        if (success) {
          const bot = botManager.getBot(username);
          if (bot) {
            activeBots.set(username, bot);
            console.log(`✅ Bot ${username} đã được tạo thành công!`);
          }
        } else {
          console.log(`❌ Không thể tạo bot ${username}`);
        }
        break;
        
      case '/stop':
        if (parts.length < 2) {
          console.log('❌ Cách sử dụng: /stop <tên_bot>');
          break;
        }
        const botToStop = parts[1];
        
        if (!activeBots.has(botToStop)) {
          console.log(`⚠️  Bot ${botToStop} không tồn tại hoặc chưa chạy!`);
          break;
        }
        
        console.log(`🔌 Đang dừng bot ${botToStop}...`);
        botManager.removeBot(botToStop);
        activeBots.delete(botToStop);
        console.log(`✅ Bot ${botToStop} đã được dừng!`);
        break;
        
      case '/list':
        console.log('\n📋 DANH SÁCH BOT ĐANG CHẠY:');
        if (activeBots.size === 0) {
          console.log('   (Không có bot nào đang chạy)');
        } else {
          activeBots.forEach((bot, name) => {
            const status = bot.getStatus();
            const statusIcon = status.connected ? '🟢' : '🔴';
            console.log(`   ${statusIcon} ${name} - ${status.connected ? 'Online' : 'Offline'} | HP: ${status.health} | Food: ${status.food} | Uptime: ${status.uptime}s`);
          });
        }
        console.log('');
        break;
        
      case '/say':
        if (parts.length < 3) {
          console.log('❌ Cách sử dụng: /say <tên_bot> <tin_nhắn>');
          break;
        }
        const botToSpeak = parts[1];
        const message = parts.slice(2).join(' ');
        
        const speakBot = activeBots.get(botToSpeak);
        if (!speakBot) {
          console.log(`⚠️  Bot ${botToSpeak} không tồn tại hoặc chưa chạy!`);
          break;
        }
        
        speakBot.sendChat(message);
        console.log(`💬 Bot ${botToSpeak} đã gửi: "${message}"`);
        break;
        
      case '/status':
        if (parts.length < 2) {
          console.log('❌ Cách sử dụng: /status <tên_bot>');
          break;
        }
        const botToCheck = parts[1];
        
        const checkBot = activeBots.get(botToCheck);
        if (!checkBot) {
          console.log(`⚠️  Bot ${botToCheck} không tồn tại hoặc chưa chạy!`);
          break;
        }
        
        const status = checkBot.getStatus();
        const position = checkBot.getPosition();
        console.log(`
📊 TRẠNG THÁI BOT: ${botToCheck}
🔗 Kết nối: ${status.connected ? '✅ Online' : '❌ Offline'}
❤️  Máu: ${status.health}/20
🍖 Đói: ${status.food}/20  
⏱️  Uptime: ${status.uptime} giây
📍 Vị trí: X:${position.x} Y:${position.y} Z:${position.z}
`);
        break;
        
      case '/dance':
        if (parts.length < 2) {
          console.log('❌ Cách sử dụng: /dance <tên_bot>');
          break;
        }
        const botToDance = parts[1];
        
        const danceBot = activeBots.get(botToDance);
        if (!danceBot) {
          console.log(`⚠️  Bot ${botToDance} không tồn tại hoặc chưa chạy!`);
          break;
        }
        
        danceBot.sendChat('/dance');
        console.log(`💃 Bot ${botToDance} đang bắt đầu nhảy múa!`);
        break;
        
      case '/help':
        console.log(`
🌸 ====== TRỢ GIÚP LỆNH BOT ====== 🌸

/start <tên>     - Tạo bot mới với tên chỉ định
/stop <tên>      - Dừng bot theo tên  
/list            - Xem tất cả bot đang chạy
/say <tên> <msg> - Gửi tin nhắn từ bot
/status <tên>    - Xem chi tiết trạng thái bot
/dance <tên>     - Cho bot nhảy múa cute
/help            - Hiển thị trợ giúp này
/exit            - Thoát console

VÍ DỤ:
  /start LoliBot1
  /say LoliBot1 Hello everyone!
  /dance LoliBot1
  /status LoliBot1
  /stop LoliBot1

🌸 ============================== 🌸
`);
        break;
        
      case '/exit':
        console.log('👋 Đang dừng tất cả bot và thoát console...');
        
        // Dừng tất cả bot trước khi thoát
        activeBots.forEach((bot, name) => {
          console.log(`🔌 Dừng bot ${name}...`);
          botManager.removeBot(name);
        });
        
        console.log('✅ Đã thoát console. Bye bye! 🌸');
        process.exit(0);
        break;
        
      default:
        if (input.trim() !== '') {
          console.log(`❌ Lệnh không hợp lệ: ${command}`);
          console.log('💡 Gõ /help để xem danh sách lệnh có sẵn.');
        }
        break;
    }
  } catch (error) {
    console.error(`❌ Lỗi khi thực hiện lệnh: ${error}`);
  }
}

// Prompt để nhập lệnh
function prompt() {
  rl.question('🌸 Bot Console > ', async (input) => {
    await handleCommand(input);
    prompt();
  });
}

// Bắt đầu console
console.log('💕 Bot Console đã sẵn sàng! Gõ /help để xem lệnh hoặc /start <tên_bot> để bắt đầu!');
prompt();

// Xử lý thoát gracefully
process.on('SIGINT', () => {
  console.log('\n👋 Đang dừng tất cả bot...');
  activeBots.forEach((bot, name) => {
    botManager.removeBot(name);
  });
  console.log('✅ Đã thoát! Bye bye! 🌸');
  process.exit(0);
});