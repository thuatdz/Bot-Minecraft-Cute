#!/usr/bin/env node
import readline from 'readline';
import { botManager } from './botmineflayer';

// Tạo interface để đọc input từ console
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'BotLoli> '
});

console.log(`
🌸 =============================================== 🌸
       Chào mừng đến Console Bot Loli! 💕
🌸 =============================================== 🌸

Các lệnh có sẵn:
📝 create <botId> <username>  - Tạo bot mới
🚀 start <botId>             - Khởi động bot
🛑 stop <botId>              - Dừng bot  
📊 status <botId>            - Kiểm tra trạng thái bot
💬 say <botId> <message>     - Gửi tin nhắn qua bot
💃 dance <botId>             - Bot nhảy múa
🏃 follow <botId> <player>   - Bot theo dõi player
📋 list                      - Liệt kê tất cả bot
❌ exit                      - Thoát console

Gõ 'help' để xem lại các lệnh.
`);

rl.prompt();

rl.on('line', async (input) => {
  const args = input.trim().split(' ');
  const command = args[0].toLowerCase();

  try {
    switch (command) {
      case 'create':
        if (args.length < 3) {
          console.log('❌ Sử dụng: create <botId> <username>');
          break;
        }
        const [, botId, username] = args;
        
        // Console callback để hiển thị logs
        const consoleCallback = (botId: string, level: string, message: string, source: string) => {
          const timestamp = new Date().toLocaleTimeString('vi-VN');
          const prefix = source === 'chat' ? '💬' : 
                        source === 'action' ? '🎭' :
                        source === 'movement' ? '🚶' :
                        source === 'ai' ? '🤖' : 'ℹ️';
          console.log(`${prefix} [${timestamp}] [${botId}] ${message}`);
        };

        const success = await botManager.connectBotToServer(botId, username, consoleCallback);
        if (success) {
          console.log(`✅ Đã tạo bot loli ${username} với ID: ${botId}`);
        } else {
          console.log(`❌ Không thể tạo bot ${username}`);
        }
        break;

      case 'start':
        if (args.length < 2) {
          console.log('❌ Sử dụng: start <botId>');
          break;
        }
        const bot = botManager.getBot(args[1]);
        if (bot) {
          await bot.connect();
          console.log(`🚀 Đã khởi động bot ${args[1]}`);
        } else {
          console.log(`❌ Không tìm thấy bot ${args[1]}`);
        }
        break;

      case 'stop':
        if (args.length < 2) {
          console.log('❌ Sử dụng: stop <botId>');
          break;
        }
        const stopBot = botManager.getBot(args[1]);
        if (stopBot) {
          stopBot.disconnect();
          console.log(`🛑 Đã dừng bot ${args[1]}`);
        } else {
          console.log(`❌ Không tìm thấy bot ${args[1]}`);
        }
        break;

      case 'status':
        if (args.length < 2) {
          console.log('❌ Sử dụng: status <botId>');
          break;
        }
        const statusBot = botManager.getBot(args[1]);
        if (statusBot) {
          const status = statusBot.getStatus();
          const position = statusBot.getPosition();
          console.log(`📊 Trạng thái bot ${args[1]}:`);
          console.log(`   🔗 Kết nối: ${status.connected ? '✅ Online' : '❌ Offline'}`);
          console.log(`   ❤️ Health: ${status.health || 'N/A'}`);
          console.log(`   🍎 Food: ${status.food || 'N/A'}`);
          console.log(`   ⏱️ Uptime: ${status.uptime}s`);
          console.log(`   📍 Vị trí: ${position ? `${position.x}, ${position.y}, ${position.z}` : 'N/A'}`);
        } else {
          console.log(`❌ Không tìm thấy bot ${args[1]}`);
        }
        break;

      case 'say':
        if (args.length < 3) {
          console.log('❌ Sử dụng: say <botId> <message>');
          break;
        }
        const sayBot = botManager.getBot(args[1]);
        const message = args.slice(2).join(' ');
        if (sayBot) {
          sayBot.sendChat(message);
          console.log(`💬 Bot ${args[1]} nói: ${message}`);
        } else {
          console.log(`❌ Không tìm thấy bot ${args[1]}`);
        }
        break;

      case 'dance':
        if (args.length < 2) {
          console.log('❌ Sử dụng: dance <botId>');
          break;
        }
        const danceBot = botManager.getBot(args[1]);
        if (danceBot) {
          danceBot.performDance();
          console.log(`💃 Bot ${args[1]} bắt đầu nhảy múa!`);
        } else {
          console.log(`❌ Không tìm thấy bot ${args[1]}`);
        }
        break;

      case 'follow':
        if (args.length < 3) {
          console.log('❌ Sử dụng: follow <botId> <playerName>');
          break;
        }
        const followBot = botManager.getBot(args[1]);
        if (followBot) {
          followBot.followPlayer(args[2]);
          console.log(`🏃 Bot ${args[1]} đang theo dõi ${args[2]}`);
        } else {
          console.log(`❌ Không tìm thấy bot ${args[1]}`);
        }
        break;

      case 'list':
        const allBots = botManager.getAllBots();
        console.log(`📋 Danh sách bot (${allBots.length}):`);
        allBots.forEach((bot, index) => {
          const status = bot.getStatus();
          console.log(`   ${index + 1}. ${bot.getStatus().connected ? '✅' : '❌'} Bot (${status.connected ? 'Online' : 'Offline'})`);
        });
        break;

      case 'help':
        console.log(`
📚 Hướng dẫn sử dụng Console Bot Loli:
📝 create <botId> <username>  - Tạo bot loli mới
🚀 start <botId>             - Khởi động bot
🛑 stop <botId>              - Dừng bot  
📊 status <botId>            - Kiểm tra trạng thái chi tiết
💬 say <botId> <message>     - Gửi tin nhắn qua bot
💃 dance <botId>             - Bot biểu diễn nhảy múa
🏃 follow <botId> <player>   - Bot theo dõi player
📋 list                      - Xem tất cả bot đang quản lý
❌ exit                      - Thoát console

Ví dụ:
  create bot1 LoliChan
  start bot1
  say bot1 Konnichiwa minna-san!
  dance bot1
        `);
        break;

      case 'exit':
        console.log('👋 Sayonara! Bot loli console đã thoát!');
        process.exit(0);
        break;

      case '':
        break;

      default:
        console.log(`❌ Lệnh không hợp lệ: ${command}. Gõ 'help' để xem hướng dẫn.`);
        break;
    }
  } catch (error) {
    console.error(`💥 Lỗi thực thi lệnh: ${error}`);
  }

  rl.prompt();
});

rl.on('close', () => {
  console.log('\n👋 Sayonara! Bot loli console đã đóng!');
  process.exit(0);
});

// Handle các signals
process.on('SIGINT', () => {
  console.log('\n\n🛑 Đang thoát console...');
  rl.close();
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Console bị terminate...');
  rl.close();
});