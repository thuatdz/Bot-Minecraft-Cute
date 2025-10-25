import { Bot } from "@shared/schema";
import { storage } from "../storage";
// Comment out botlolicute import for now - will be created later
// import { botManager as minecraftBotManager, MinecraftBot } from "../botlolicute";

// Temporary interface for MinecraftBot
interface MinecraftBot {
  disconnect(): void;
  getStatus(): any;
  getPosition(): any;
  sendChat(message: string): void;
}

// Temporary bot manager implementation  
const minecraftBotManager = {
  async connectBotToServer(botId: string, username: string, callback: Function): Promise<boolean> {
    console.log(`Connecting bot ${botId} with username ${username}`);
    return true; // Temporary success
  },
  
  getBot(botId: string): MinecraftBot | null {
    // Temporary implementation
    return {
      disconnect: () => console.log(`Bot ${botId} disconnected`),
      getStatus: () => ({ connected: true, health: 20, food: 20, uptime: 0 }),
      getPosition: () => ({ x: 0, y: 64, z: 0 }),
      sendChat: (message: string) => console.log(`Bot says: ${message}`)
    };
  },
  
  removeBot(botId: string): void {
    console.log(`Removed bot ${botId}`);
  }
};

interface BotInstance {
  minecraftBot: MinecraftBot;
  startTime: Date;
  config: {
    autoReconnect: boolean;
    chatEnabled: boolean;
    movementPattern: string;
    responseDelay: number;
  };
}

class BotManager {
  private activeBots: Map<string, BotInstance> = new Map();
  private uptimeIntervals: Map<string, NodeJS.Timeout> = new Map();

  // Helper function to broadcast console messages
  private broadcastMessage(botId: string, level: string, message: string, source: string) {
    try {
      const broadcastFn = (global as any).broadcastConsoleMessage;
      if (broadcastFn) {
        broadcastFn({ botId, level, message, source });
      }
    } catch (error) {
      console.error('Error broadcasting message:', error);
    }
  }

  async startBot(botId: string): Promise<boolean> {
    try {
      const botData = await storage.getBot(botId);
      if (!botData) {
        this.broadcastMessage(botId, 'error', 'Bot không tìm thấy trong database', 'system');
        throw new Error('Bot not found');
      }

      if (this.activeBots.has(botId)) {
        this.broadcastMessage(botId, 'warning', 'Bot đã đang chạy rồi', 'system');
        console.log(`Bot ${botId} is already running`);
        return true;
      }

      // Update status to connecting
      await storage.updateBot(botId, { status: 'connecting' });
      this.broadcastMessage(botId, 'info', `Đang kết nối bot ${botData.username} đến server...`, 'system');

      // Sử dụng minecraftBotManager để kết nối đến server thuatzai123.aternos.me với console callback
      const consoleCallback = (botId: string, level: string, message: string, source: string) => {
        this.broadcastMessage(botId, level, message, source);
      };
      const success = await minecraftBotManager.connectBotToServer(botId, botData.username, consoleCallback);
      
      if (!success) {
        await storage.updateBot(botId, { status: 'error' });
        this.broadcastMessage(botId, 'error', 'Không thể kết nối đến server Minecraft', 'system');
        return false;
      }

      const minecraftBot = minecraftBotManager.getBot(botId);
      if (!minecraftBot) {
        await storage.updateBot(botId, { status: 'error' });
        this.broadcastMessage(botId, 'error', 'Lỗi khởi tạo bot instance', 'system');
        return false;
      }

      const instance: BotInstance = {
        minecraftBot,
        startTime: new Date(),
        config: {
          autoReconnect: botData.autoReconnect ?? true,
          chatEnabled: botData.chatEnabled ?? true,
          movementPattern: botData.movementPattern ?? "random",
          responseDelay: botData.responseDelay ?? 1000,
        }
      };

      // Set up bot status monitoring
      this.setupBotHandlers(botId, instance);

      this.activeBots.set(botId, instance);

      // Start uptime tracking
      this.startUptimeTracking(botId);

      const message = `🚀 Bot ${botData.username} đã kết nối thành công!`;
      console.log(message);
      this.broadcastMessage(botId, 'success', message, 'system');
      await storage.updateBot(botId, { status: 'online' });

      return true;
    } catch (error) {
      const errorMsg = `Lỗi khởi động bot: ${error}`;
      console.error(`Failed to start bot ${botId}:`, error);
      this.broadcastMessage(botId, 'error', errorMsg, 'system');
      await storage.updateBot(botId, { status: 'error' });
      return false;
    }
  }

  async stopBot(botId: string): Promise<boolean> {
    try {
      const instance = this.activeBots.get(botId);
      if (!instance) {
        this.broadcastMessage(botId, 'warning', 'Bot không đang chạy', 'system');
        console.log(`Bot ${botId} is not running`);
        return true;
      }

      this.broadcastMessage(botId, 'info', 'Đang dừng bot...', 'system');

      // Gracefully disconnect the bot
      instance.minecraftBot.disconnect();
      minecraftBotManager.removeBot(botId);
      this.activeBots.delete(botId);

      // Stop uptime tracking
      const uptimeInterval = this.uptimeIntervals.get(botId);
      if (uptimeInterval) {
        clearInterval(uptimeInterval);
        this.uptimeIntervals.delete(botId);
      }

      // Update status
      await storage.updateBot(botId, { 
        status: 'offline',
        lastSeen: new Date()
      });

      const message = `🔌 Bot đã dừng thành công`;
      console.log(message);
      this.broadcastMessage(botId, 'success', message, 'system');
      return true;
    } catch (error) {
      const errorMsg = `Lỗi dừng bot: ${error}`;
      console.error(`Failed to stop bot ${botId}:`, error);
      this.broadcastMessage(botId, 'error', errorMsg, 'system');
      return false;
    }
  }

  async updateBotConfig(botId: string, config: any): Promise<boolean> {
    try {
      const instance = this.activeBots.get(botId);
      if (instance) {
        instance.config = { ...instance.config, ...config };
        console.log(`Updated config for bot ${botId}:`, config);
      }

      await storage.updateBotConfig(botId, config);
      return true;
    } catch (error) {
      console.error(`Failed to update bot config ${botId}:`, error);
      return false;
    }
  }

  private setupBotHandlers(botId: string, instance: BotInstance) {
    // Bot status monitoring - sync với database mỗi 5 giây
    const statusInterval = setInterval(async () => {
      try {
        const minecraftBot = instance.minecraftBot;
        const status = minecraftBot.getStatus();
        
        await storage.updateBot(botId, { 
          status: status.connected ? 'online' : 'offline',
          uptime: status.uptime
        });
      } catch (error) {
        console.error(`Error updating bot ${botId} status:`, error);
      }
    }, 5000);

    // Cleanup khi bot disconnect
    setTimeout(() => {
      const checkBot = setInterval(() => {
        const status = instance.minecraftBot.getStatus();
        if (!status.connected) {
          clearInterval(statusInterval);
          clearInterval(checkBot);
          this.activeBots.delete(botId);
          console.log(`🔌 Bot ${botId} disconnected and cleaned up`);
        }
      }, 1000);
    }, 1000);
  }

  private startUptimeTracking(botId: string) {
    const interval = setInterval(async () => {
      const instance = this.activeBots.get(botId);
      if (instance) {
        const uptimeSeconds = Math.floor((Date.now() - instance.startTime.getTime()) / 1000);
        await storage.updateBot(botId, { uptime: uptimeSeconds });
      } else {
        // Bot không còn active, dừng tracking
        clearInterval(interval);
        this.uptimeIntervals.delete(botId);
      }
    }, 60000); // Update every minute

    this.uptimeIntervals.set(botId, interval);
  }

  // Get bot status for API
  getBotStatus(botId: string): any {
    const instance = this.activeBots.get(botId);
    if (instance) {
      const status = instance.minecraftBot.getStatus();
      const position = instance.minecraftBot.getPosition();
      
      return {
        connected: status.connected,
        health: status.health,
        food: status.food,
        uptime: status.uptime,
        position: position,
        startTime: instance.startTime
      };
    }
    return null;
  }

  // Send chat message
  sendBotMessage(botId: string, message: string): boolean {
    const instance = this.activeBots.get(botId);
    if (instance && instance.minecraftBot.getStatus().connected) {
      instance.minecraftBot.sendChat(message);
      this.broadcastMessage(botId, 'success', `Bot đã gửi: "${message}"`, 'chat');
      return true;
    }
    this.broadcastMessage(botId, 'error', 'Bot chưa kết nối hoặc không tồn tại', 'system');
    return false;
  }

  // Get all active bots
  getActiveBots(): string[] {
    return Array.from(this.activeBots.keys());
  }
}

export const botManager = new BotManager();