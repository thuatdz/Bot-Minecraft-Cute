// File để export bot status cho web interface
import fetch from 'node-fetch';
export interface BotStatusData {
  connected: boolean;
  health: number;
  food: number;
  position: { x: number; y: number; z: number };
  mode: string;
  status: string;
  nearbyMobs: any[];
  equipment: {
    weapon: string | null;
    armor: string[];
  };
  targetPlayer: string | null;
  uptime: number;
  lastActivity: string;
  inventory?: any;
  gamemode?: string;
  weather?: string;
}

// Global bot status object
let globalBotStatus: BotStatusData = {
  connected: false,
  health: 0,
  food: 0,
  position: { x: 0, y: 64, z: 0 },
  mode: 'offline',
  status: 'Disconnected',
  nearbyMobs: [],
  equipment: { weapon: null, armor: [] },
  targetPlayer: null,
  uptime: 0,
  lastActivity: 'Never'
};

export function updateBotStatus(status: Partial<BotStatusData>) {
  globalBotStatus = { ...globalBotStatus, ...status };
}

export function getBotStatus(): BotStatusData {
  return { ...globalBotStatus };
}

export function setBotConnected(connected: boolean, bot?: any) {
  if (connected && bot) {
    globalBotStatus = {
      connected: true,
      health: bot.health || 20,
      food: bot.food || 20,
      position: bot.entity?.position || { x: 0, y: 64, z: 0 },
      mode: 'online',
      status: 'Connected and Ready',
      nearbyMobs: [],
      equipment: { weapon: null, armor: [] },
      targetPlayer: null,
      uptime: 0,
      lastActivity: new Date().toLocaleString('vi-VN')
    };
  } else {
    globalBotStatus = {
      connected: false,
      health: 0,
      food: 0,
      position: { x: 0, y: 64, z: 0 },
      mode: 'offline',
      status: 'Disconnected',
      nearbyMobs: [],
      equipment: { weapon: null, armor: [] },
      targetPlayer: null,
      uptime: 0,
      lastActivity: new Date().toLocaleString('vi-VN')
    };
  }

  // Sync with storage system for the default bot
  syncWithWebStorage(connected, bot);
}

// Function to sync bot status with the web storage system
async function syncWithWebStorage(connected: boolean, bot?: any) {
  try {
    const body: any = {
      status: connected ? 'online' : 'offline',
      lastSeen: new Date()
    };

    // Sync username and server if bot is connected
    if (connected && bot) {
      if (bot.username) {
        body.username = bot.username;
        console.log(`🔄 Đồng bộ tên bot: ${bot.username}`);
      }
      
      // Sync server info from BOT_CONFIG
      const BOT_CONFIG = (global as any).BOT_CONFIG;
      if (BOT_CONFIG) {
        body.server = `${BOT_CONFIG.host}:${BOT_CONFIG.port}`;
        console.log(`🔄 Đồng bộ server: ${body.server}`);
      }
    }

    // Make HTTP request to update the default bot status in storage
    const response = await fetch('http://localhost:5000/api/bots/default-bot-1/sync-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    if (response.ok) {
      console.log(`✅ Đã sync bot status với web interface: ${connected ? 'online' : 'offline'}`);
    }
  } catch (error) {
    // Silently fail to not disrupt bot operation
    console.log('⚠️ Không thể sync với web interface:', error);
  }
}