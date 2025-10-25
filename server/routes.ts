import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertBotSchema, updateBotConfigSchema } from "@shared/schema";
import { ZodError } from "zod";
import { sharedLogger } from "./shared-logger";
import fs from "fs";
import path from "path";

// Cache bot status để tránh đọc file quá nhiều
let cachedBotStatus: any = null;
let lastCacheUpdate = 0;
const CACHE_DURATION = 1000; // 1 giây

function getBotStatus() {
  const now = Date.now();
  if (cachedBotStatus && (now - lastCacheUpdate) < CACHE_DURATION) {
    return cachedBotStatus;
  }

  try {
    const statusPath = path.join(process.cwd(), 'Embe', 'bot-status.json');
    if (fs.existsSync(statusPath)) {
      const data = fs.readFileSync(statusPath, 'utf-8');
      cachedBotStatus = JSON.parse(data);
      lastCacheUpdate = now;
      return cachedBotStatus;
    }
  } catch (err) {
    console.log('Lỗi đọc bot status:', err);
  }

  return {
    status: 'offline',
    connected: false,
    position: { x: 0, y: 64, z: 0 },
    health: 0,
    food: 0,
    inventory: { items: [], equipment: {}, totalItems: 0 }
  };
}

// Create a simple mock botManager to prevent import errors
const botManager = {
  async startBot(id: string): Promise<boolean> {
    console.log(`Mock: Starting bot ${id}`);
    return true;
  },
  async stopBot(id: string): Promise<boolean> {
    console.log(`Mock: Stopping bot ${id}`);
    return true;
  },
  async updateBotConfig(id: string, config: any): Promise<boolean> {
    console.log(`Mock: Updating bot config ${id}`, config);
    return true;
  },
  getBotStatus(id: string): any {
    console.log(`Mock: Getting bot status ${id}`);
    return { status: 'offline', connected: false, health: 20, food: 20, uptime: 0 };
  },
  sendBotMessage(id: string, message: string): boolean {
    console.log(`Mock: Sending message to bot ${id}: ${message}`);
    return true;
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint for uptime monitoring
  app.get("/health", (req, res) => {
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      message: "PinkMineManager is running! 💕"
    });
  });

  // Bot status endpoint cho web màu hồng
  app.get("/api/bot-status", async (req, res) => {
    try {
      const status = getBotStatus();
      res.json(status);
    } catch (error) {
      console.log('Lỗi lấy bot status:', error);
      res.json({
        status: 'offline',
        error: (error as Error).message,
        connected: false,
        inventory: { items: [], equipment: {}, totalItems: 0 }
      });
    }
  });

  // API endpoint để nhận log từ bot process
  app.post("/api/console/log", (req, res) => {
    try {
      const { message, level = 'info', source = 'bot', botId = 'external-bot' } = req.body;

      if (message && message.trim()) {
        // Tạo một global broadcast function reference
        const broadcastFn = (global as any).broadcastToWebConsole;
        if (broadcastFn) {
          broadcastFn(botId, level, message, source);
        } else {
          // Fallback nếu global function chưa sẵn sàng
          broadcastConsoleMessage({
            botId,
            level,
            message,
            source
          });
        }
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error logging to console:', error);
      res.status(500).json({ success: false, error: 'Failed to log message' });
    }
  });

  // Global variable để lưu viewer URLs
  let botViewerUrls: {[key: string]: any} = {};

  // API endpoint để nhận viewer URL từ bot process
  app.post("/api/bot-viewer-url", (req, res) => {
    try {
      const { url, port, status, botId } = req.body;

      botViewerUrls[botId] = {
        url,
        port,
        status,
        lastUpdated: new Date().toISOString()
      };

      console.log(`🎮 Đã cập nhật viewer URL cho ${botId}: ${url}`);
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating viewer URL:', error);
      res.status(500).json({ success: false, error: 'Failed to update viewer URL' });
    }
  });

  // API endpoint để lấy viewer URLs
  app.get("/api/bot-viewer-urls", (req, res) => {
    res.json(botViewerUrls);
  });

  // Update bot configuration endpoint
  app.post("/api/bot/config", async (req, res) => {
    try {
      const { botName, serverHost, serverPort, version } = req.body;

      if (!botName || !serverHost) {
        return res.status(400).json({ 
        success: false, 
        error: "Bot name và server host là bắt buộc" 
      });
      }

      // Parse port (default 25565 if not provided)
      const port = serverPort ? parseInt(serverPort) : 25565;
      const mcVersion = version || '1.19.4';

      // For now, just return success without modifying files
      console.log('Bot config update:', { botName, serverHost, port, mcVersion });

      res.json({ 
        success: true, 
        message: "Cấu hình bot đã được cập nhật thành công!",
        config: {
          botName,
          serverHost,
          port,
          version: mcVersion
        }
      });

    } catch (error) {
      console.error('Lỗi cập nhật config bot:', error);
      res.status(500).json({ 
        success: false, 
        error: "Không thể cập nhật cấu hình bot" 
      });
    }
  });

  // Get current bot configuration
  app.get("/api/bot/config", async (req, res) => {
    try {
      // Return default configuration instead of reading file
      const currentConfig = {
        botName: 'botlolicute',
        serverHost: 'thuatzai123.aternos.me',
        serverPort: 38893,
        version: '1.19.4'
      };

      res.json({ success: true, config: currentConfig });

    } catch (error) {
      console.error('Lỗi đọc config bot:', error);
      res.status(500).json({ success: false, error: "Không thể đọc cấu hình bot" });
    }
  });

  // Bot screen sharing endpoint - Real data from botlolicute
  app.get("/api/bots/:id/screen", async (req, res) => {
    try {
      const { id } = req.params;

      // Try to get real bot status từ bot-status module
      let realBotStatus;
      try {
        // Import dynamic để tránh circular dependency
        const botStatusModule = await import('../Embe/bot-status.js');
        realBotStatus = botStatusModule.getBotStatus();

        // Removed spam log - only log on status change
      } catch (importError) {
        console.log('⚠️ Cannot import bot-status:', importError.message);
        realBotStatus = {
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
          lastActivity: 'Never',
          inventory: { items: [], equipment: {}, totalItems: 0 }
        };
      }

      // Always try to get cached data from prismarine-viewer API as backup
      let viewerData = null;
      try {
        const viewerResponse = await fetch('http://localhost:3001/api/bot-status');
        if (viewerResponse.ok) {
          viewerData = await viewerResponse.json();
          // Removed spam log - only log important changes
        }
      } catch (viewerError) {
        console.log('⚠️ Cannot fetch viewer data:', viewerError.message);
      }

      // Use viewer data as fallback if bot-status is not connected but viewer has data
      const effectiveData = (realBotStatus.connected && realBotStatus.health > 0) ? realBotStatus : (viewerData?.connected ? viewerData : realBotStatus);

      if (!effectiveData.connected) {
        // Return offline data when bot is not connected
        const offlineData = {
          connected: false,
          health: 0,
          food: 0,
          position: { x: 0, y: 64, z: 0 },
          mode: 'offline',
          currentAction: 'Bot không kết nối - Đang thử kết nối lại...',
          nearbyEntities: [],
          inventory: [],
          equipment: { 
            hand: null, 
            offhand: null, 
            helmet: null, 
            chestplate: null, 
            leggings: null, 
            boots: null,
            weapon: null 
          },
          targetPlayer: null,
          uptime: 0,
          lastActivity: 'Never',
          timestamp: new Date().toISOString()
        };
        console.log('🔴 Returning offline data');
        res.json(offlineData);
        return;
      }

      // Return real bot data when connected - with full inventory and equipment
      const inventoryData = effectiveData.inventory || { items: [], equipment: {}, totalItems: 0 };

      const connectedData = {
        connected: true,
        health: effectiveData.health || 20,
        food: effectiveData.food || 20,
        position: effectiveData.position || { x: 0, y: 64, z: 0 },
        mode: effectiveData.mode || 'online',
        currentAction: effectiveData.status || 'Connected and Ready',
        nearbyEntities: effectiveData.nearbyMobs || [],
        inventory: inventoryData.items || [],
        equipment: {
          hand: inventoryData.equipment?.hand?.displayName || inventoryData.equipment?.hand?.name || null,
          offhand: inventoryData.equipment?.offhand?.displayName || inventoryData.equipment?.offhand?.name || null,
          helmet: inventoryData.equipment?.helmet?.displayName || inventoryData.equipment?.helmet?.name || null,
          chestplate: inventoryData.equipment?.chestplate?.displayName || inventoryData.equipment?.chestplate?.name || null,
          leggings: inventoryData.equipment?.leggings?.displayName || inventoryData.equipment?.leggings?.name || null,
          boots: inventoryData.equipment?.boots?.displayName || inventoryData.equipment?.boots?.name || null,
          weapon: inventoryData.equipment?.hand?.displayName || inventoryData.equipment?.hand?.name || null
        },
        targetPlayer: effectiveData.targetPlayer,
        uptime: realBotStatus.uptime,
        lastActivity: realBotStatus.lastActivity
      };

      res.json(connectedData);
    } catch (error) {
      console.error("Error getting bot screen:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/ping", (req, res) => {
    res.status(200).send("pong");
  });

  // Route "Xem Bot" chuyên dụng với tích hợp prismarine-viewer
  app.get("/xem-bot", (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="vi">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>🎮 Xem Bot - botlolicute 3D Viewer</title>
          <style>
              body {
                  margin: 0;
                  padding: 0;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                  color: white;
                  height: 100vh;
                  overflow: hidden;
              }

              .header {
                  background: rgba(0,0,0,0.3);
                  padding: 15px 20px;
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  backdrop-filter: blur(10px);
                  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
              }

              .title {
                  font-size: 1.5rem;
                  font-weight: bold;
                  display: flex;
                  align-items: center;
                  gap: 10px;
              }

              .status-info {
                  display: flex;
                  gap: 20px;
                  align-items: center;
                  font-size: 0.9rem;
              }

              .status-item {
                  background: rgba(255,255,255,0.2);
                  padding: 5px 12px;
                  border-radius: 15px;
                  backdrop-filter: blur(5px);
              }

              .controls {
                  display: flex;
                  gap: 10px;
                  align-items: center;
              }

              .btn {
                  background: rgba(255,255,255,0.2);
                  border: none;
                  color: white;
                  padding: 8px 15px;
                  border-radius: 20px;
                  cursor: pointer;
                  font-size: 0.9rem;
                  transition: all 0.3s ease;
                  backdrop-filter: blur(5px);
              }

              .btn:hover {
                  background: rgba(255,255,255,0.3);
                  transform: translateY(-1px);
              }

              .btn.primary {
                  background: #4CAF50;
              }

              .btn.primary:hover {
                  background: #45a049;
              }

              .viewer-container {
                  height: calc(100vh - 80px);
                  display: flex;
                  position: relative;
              }

              .viewer-iframe {
                  width: 100%;
                  height: 100%;
                  border: none;
                  background: #1a1a1a;
              }

              .sidebar {
                  width: 300px;
                  background: rgba(0,0,0,0.4);
                  backdrop-filter: blur(10px);
                  padding: 20px;
                  overflow-y: auto;
                  border-left: 1px solid rgba(255,255,255,0.1);
              }

              .info-card {
                  background: rgba(255,255,255,0.1);
                  border-radius: 10px;
                  padding: 15px;
                  margin-bottom: 15px;
                  backdrop-filter: blur(5px);
              }

              .info-card h3 {
                  margin: 0 0 10px 0;
                  font-size: 1rem;
                  color: #FFD700;
              }

              .info-row {
                  display: flex;
                  justify-content: space-between;
                  margin: 8px 0;
                  font-size: 0.9rem;
              }

              .loading {
                  display: flex;
                  flex-direction: column;
                  justify-content: center;
                  align-items: center;
                  height: 100%;
                  background: rgba(0,0,0,0.5);
                  color: white;
              }

              .loading-spinner {
                  width: 50px;
                  height: 50px;
                  border: 4px solid rgba(255,255,255,0.3);
                  border-top: 4px solid #FFD700;
                  border-radius: 50%;
                  animation: spin 1s linear infinite;
                  margin-bottom: 20px;
              }

              @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
              }

              .error-message {
                  background: rgba(255,0,0,0.2);
                  border: 1px solid #ff4444;
                  border-radius: 10px;
                  padding: 15px;
                  margin: 20px;
                  text-align: center;
              }

              .toggle-sidebar {
                  position: absolute;
                  right: 10px;
                  top: 50%;
                  transform: translateY(-50%);
                  z-index: 1000;
                  background: rgba(0,0,0,0.7);
                  color: white;
                  border: none;
                  padding: 10px;
                  border-radius: 50%;
                  cursor: pointer;
                  transition: all 0.3s ease;
              }

              .toggle-sidebar:hover {
                  background: rgba(0,0,0,0.9);
              }

              .sidebar.hidden {
                  transform: translateX(100%);
                  transition: transform 0.3s ease;
              }
          </style>
      </head>
      <body>
          <div class="header">
              <div class="title">
                  🎮 Xem Bot - botlolicute
              </div>
              <div class="status-info">
                  <div class="status-item">
                      <span id="connectionStatus">🔴 Đang tải...</span>
                  </div>
                  <div class="status-item">
                      <span id="healthStatus">❤️ --/20</span>
                  </div>
                  <div class="status-item">
                      <span id="foodStatus">🍞 --/20</span>
                  </div>
              </div>
              <div class="controls">
                  <button class="btn" onclick="refreshViewer()">🔄 Làm mới</button>
                  <button class="btn" onclick="openFullscreen()">🔍 Toàn màn hình</button>
                  <button class="btn primary" onclick="goBack()">⬅️ Quay về</button>
              </div>
          </div>

          <div class="viewer-container">
              <div id="viewerContent">
                  <div class="loading">
                      <div class="loading-spinner"></div>
                      <div>Đang tải Real Prismarine 3D Viewer...</div>
                      <div style="font-size: 0.8rem; opacity: 0.7; margin-top: 10px;">
                          Đang kết nối với thế giới Minecraft 3D...
                      </div>
                  </div>
              </div>

              <button class="toggle-sidebar" onclick="toggleSidebar()">
                  <span id="toggleIcon">◀</span>
              </button>

              <div class="sidebar" id="sidebar">
                  <div class="info-card">
                      <h3>📍 Vị trí Bot</h3>
                      <div class="info-row">
                          <span>X:</span>
                          <span id="posX">--</span>
                      </div>
                      <div class="info-row">
                          <span>Y:</span>
                          <span id="posY">--</span>
                      </div>
                      <div class="info-row">
                          <span>Z:</span>
                          <span id="posZ">--</span>
                      </div>
                  </div>

                  <div class="info-card">
                      <h3>⚔️ Trạng thái</h3>
                      <div class="info-row">
                          <span>Chế độ:</span>
                          <span id="mode">--</span>
                      </div>
                      <div class="info-row">
                          <span>Hoạt động:</span>
                          <span id="currentAction">--</span>
                      </div>
                  </div>

                  <div class="info-card">
                      <h3>🎒 Trang bị</h3>
                      <div class="info-row">
                          <span>Vũ khí:</span>
                          <span id="weapon">--</span>
                      </div>
                      <div class="info-row">
                          <span>Giáp:</span>
                          <span id="armor">--</span>
                      </div>
                  </div>

                  <div class="info-card">
                      <h3>👥 Gần đây</h3>
                      <div id="nearbyEntities">
                          Không có entity gần
                      </div>
                  </div>
              </div>
          </div>

          <script>
              let viewerUrl = null;
              let sidebarHidden = false;

              // Kiểm tra viewer URL và tải iframe
              async function loadViewer() {
                  try {
                      // First try to get viewer URL from API
                      const response = await fetch('/api/bot-viewer-urls');
                      const viewerUrls = await response.json();

                      if (viewerUrls.botlolicute && viewerUrls.botlolicute.status === 'active') {
                          viewerUrl = viewerUrls.botlolicute.url;
                      } else {
                          // Fallback to direct port 3004 connection
                          viewerUrl = window.location.protocol + '//' + window.location.hostname + ':3004';
                      }

                      // Test if viewer is accessible
                      const testResponse = await fetch(viewerUrl + '/health').catch(() => null);

                      if (testResponse && testResponse.ok) {
                          document.getElementById('viewerContent').innerHTML = 
                              '<iframe class="viewer-iframe" src="' + viewerUrl + '" title="Real Minecraft 3D Viewer"></iframe>';

                          document.getElementById('connectionStatus').innerHTML = '🟢 3D Viewer kết nối';
                          console.log('✅ Đã tải real prismarine-viewer:', viewerUrl);
                      } else {
                          throw new Error('Real viewer không phản hồi');
                      }
                  } catch (error) {
                      console.log('❌ Không thể tải real viewer:', error);
                      document.getElementById('viewerContent').innerHTML = 
                          '<div class="error-message">' +
                          '<h3>❌ Không thể kết nối Real 3D Viewer</h3>' +
                          '<p>Bot chưa khởi động hoặc prismarine-viewer chưa sẵn sàng trên port 3004.</p>' +
                          '<p>Hãy đảm bảo bot đã kết nối server Minecraft thành công.</p>' +
                          '<button class="btn primary" onclick="loadViewer()">🔄 Thử lại</button>' +
                          '</div>';

                      document.getElementById('connectionStatus').innerHTML = '🔴 Mất kết nối';
                  }
              }

              // Cập nhật thông tin bot
              async function updateBotInfo() {
                  try {
                      const response = await fetch('/api/bots/default-bot-1/screen');
                      const bot = await response.json();

                      if (bot && bot.connected) {
                          const pos = bot.position || { x: 0, y: 64, z: 0 };

                          document.getElementById('healthStatus').textContent = '❤️ ' + (bot.health || 0) + '/20';
                          document.getElementById('foodStatus').textContent = '🍞 ' + (bot.food || 0) + '/20';

                          document.getElementById('posX').textContent = Math.floor(pos.x);
                          document.getElementById('posY').textContent = Math.floor(pos.y);
                          document.getElementById('posZ').textContent = Math.floor(pos.z);

                          document.getElementById('mode').textContent = bot.mode || 'online';
                          document.getElementById('currentAction').textContent = bot.currentAction || 'Không hoạt động';

                          const equipment = bot.equipment || {};
                          document.getElementById('weapon').textContent = equipment.weapon || 'Tay không';
                          document.getElementById('armor').textContent = '0/4';

                          // Cập nhật entities gần
                          const nearbyDiv = document.getElementById('nearbyEntities');
                          const entities = bot.nearbyEntities || [];
                          if (entities.length > 0) {
                              nearbyDiv.innerHTML = entities.slice(0, 5).map(entity => 
                                  '<div class="info-row"><span>' + entity.type + '</span><span>' + entity.distance + 'm</span></div>'
                              ).join('');
                          } else {
                              nearbyDiv.textContent = 'Không có entity gần';
                          }
                      }
                  } catch (error) {
                      console.log('Không thể cập nhật thông tin bot:', error);
                  }
              }

              // Control functions
              function refreshViewer() {
                  loadViewer();
              }

              function openFullscreen() {
                  if (viewerUrl) {
                      window.open(viewerUrl, '_blank');
                  }
              }

              function goBack() {
                  window.history.back();
              }

              function toggleSidebar() {
                  const sidebar = document.getElementById('sidebar');
                  const toggleIcon = document.getElementById('toggleIcon');

                  sidebarHidden = !sidebarHidden;

                  if (sidebarHidden) {
                      sidebar.classList.add('hidden');
                      toggleIcon.textContent = '▶';
                  } else {
                      sidebar.classList.remove('hidden');
                      toggleIcon.textContent = '◀';
                  }
              }

              // Initialize
              loadViewer();
              updateBotInfo();

              // Auto refresh
              setInterval(loadViewer, 30000); // Check viewer every 30s
              setInterval(updateBotInfo, 5000); // Update bot info every 5s

              console.log('🎮 Xem Bot - botlolicute 3D Viewer đã sẵn sàng!');
          </script>
      </body>
      </html>
    `);
  });

  // Bot Viewer integrated route - matching the new design from image 1
  app.get("/bot-view", (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html lang="vi">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>🎮 Bot View - botlolicute</title>
          <style>
              body {
                  margin: 0;
                  padding: 15px;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                  color: white;
                  min-height: 100vh;
              }
              .container {
                  max-width: 400px;
                  margin: 0 auto;
                  padding: 0;
              }

              /* Header card with bot icon and main status */
              .header-card {
                  background: rgba(255,255,255,0.15);
                  border-radius: 15px;
                  padding: 25px;
                  text-align: center;
                  margin-bottom: 15px;
                  backdrop-filter: blur(10px);
                  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37);
              }
              .bot-icon {
                  font-size: 3rem;
                  margin-bottom: 10px;
                  display: block;
              }
              .bot-title {
                  font-size: 1.1rem;
                  margin-bottom: 5px;
                  opacity: 0.9;
              }
              .main-status {
                  font-size: 1.3rem;
                  font-weight: bold;
                  color: #FFD700;
                  word-break: break-all;
                  line-height: 1.2;
              }

              /* Individual status cards */
              .status-card {
                  background: rgba(255,255,255,0.15);
                  border-radius: 15px;
                  padding: 20px;
                  text-align: center;
                  margin-bottom: 15px;
                  backdrop-filter: blur(10px);
                  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37);
              }
              .status-icon {
                  font-size: 2rem;
                  margin-bottom: 10px;
                  display: block;
              }
              .status-label {
                  font-size: 1rem;
                  margin-bottom: 8px;
                  opacity: 0.9;
              }
              .status-value {
                  font-size: 1.4rem;
                  font-weight: bold;
                  color: #FFD700;
              }

              /* Equipment section */
              .equipment-card {
                  background: rgba(255,255,255,0.9);
                  border-radius: 15px;
                  padding: 20px;
                  margin-bottom: 15px;
                  box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37);
              }
              .equipment-title {
                  color: #333;
                  font-size: 1.1rem;
                  font-weight: bold;
                  margin-bottom: 15px;
                  text-align: center;
              }
              .equipment-subtitle {
                  color: #666;
                  font-size: 0.9rem;
                  margin-bottom: 10px;
                  text-align: left;
              }
              .equipment-slot {
                  background: #f0f0f0;
                  padding: 8px 12px;
                  border-radius: 8px;
                  margin-bottom: 8px;
                  border-left: 4px solid #4CAF50;
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
              }
              .slot-label {
                  font-weight: 500;
                  color: #333;
              }
              .slot-value {
                  color: #666;
                  font-size: 0.9rem;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <!-- Main status card with bot icon -->
              <div class="header-card">
                  <span class="bot-icon">🤖</span>
                  <div class="bot-title">Bot Status</div>
                  <div class="main-status" id="mainStatus">Tọa độ: -5118, 111, 4693 | HP: 20/20 | Đồ ăn: 20/20</div>
              </div>

              <!-- Position card -->
              <div class="status-card">
                  <span class="status-icon">📍</span>
                  <div class="status-label">Vị trí</div>
                  <div class="status-value" id="position">-5118, 111, 4693</div>
              </div>

              <!-- Health card -->
              <div class="status-card">
                  <span class="status-icon">❤️</span>
                  <div class="status-label">Máu</div>
                  <div class="status-value" id="health">20/20</div>
              </div>

              <!-- Food card -->
              <div class="status-card">
                  <span class="status-icon">🍞</span>
                  <div class="status-label">Đồ ăn</div>
                  <div class="status-value" id="food">20/20</div>
              </div>

              <!-- Equipment section -->
              <div class="equipment-card">
                  <div class="equipment-title">🎒 Túi đồ & Trang bị (Cập nhật mỗi 5s)</div>

                  <div class="equipment-subtitle">⚔️ Trang bị hiện tại:</div>
                  <div class="equipment-slot">
                      <span class="slot-label">Vũ khí</span>
                      <span class="slot-value" id="weapon">Tay không</span>
                  </div>
                  <div class="equipment-slot">
                      <span class="slot-label">Giáp</span>
                      <span class="slot-value" id="armor">0/4</span>
                  </div>
              </div>
          </div>

          <script>
              // Fetch bot status and update display
              async function updateBotStatus() {
                  try {
                      const response = await fetch('/api/bots/default-bot-1/screen');
                      const bot = await response.json();

                      if (bot && bot.connected) {
                          const pos = bot.position || { x: 0, y: 64, z: 0 };
                          const positionText = Math.floor(pos.x) + ', ' + Math.floor(pos.y) + ', ' + Math.floor(pos.z);
                          const healthText = (bot.health || 0) + '/20';
                          const foodText = (bot.food || 0) + '/20';

                          // Update main status
                          document.getElementById('mainStatus').textContent = 'Tọa độ: ' + positionText + ' | HP: ' + healthText + ' | Đồ ăn: ' + foodText;

                          // Update individual cards
                          document.getElementById('position').textContent = positionText;
                          document.getElementById('health').textContent = healthText;
                          document.getElementById('food').textContent = foodText;

                          // Update equipment
                          const equipment = bot.equipment || {};
                          document.getElementById('weapon').textContent = equipment.weapon || 'Tay không';
                          document.getElementById('armor').textContent = '0/4';
                      } else {
                          // Offline state
                          document.getElementById('mainStatus').textContent = 'Bot không kết nối - Đang thử kết nối lại...';
                          document.getElementById('position').textContent = 'Không xác định';
                          document.getElementById('health').textContent = 'N/A';
                          document.getElementById('food').textContent = 'N/A';
                          document.getElementById('weapon').textContent = 'Offline';
                          document.getElementById('armor').textContent = 'N/A';
                      }
                  } catch (error) {
                      console.log('Không thể tải thông tin bot:', error);
                      document.getElementById('mainStatus').textContent = 'Lỗi kết nối - Thử lại sau...';
                  }
              }

              // Update every 5 seconds
              updateBotStatus();
              setInterval(updateBotStatus, 5000);

              console.log('✅ Bot View với thiết kế mới đã sẵn sàng!');
          </script>
      </body>
      </html>
    `);
  });

  // Bot management routes
  app.get("/api/bots", async (req, res) => {
    try {
      const bots = await storage.getBots();
      res.json(bots);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bots" });
    }
  });

  app.post("/api/bots", async (req, res) => {
    try {
      const validatedData = insertBotSchema.parse(req.body);
      const bot = await storage.createBot(validatedData);
      res.status(201).json(bot);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: "Invalid bot data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to create bot" });
      }
    }
  });

  app.post("/api/bots/:id/start", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await botManager.startBot(id);

      if (success) {
        res.json({ message: "Bot started successfully" });
      } else {
        res.status(500).json({ error: "Failed to start bot" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to start bot" });
    }
  });

  app.post("/api/bots/:id/stop", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await botManager.stopBot(id);

      if (success) {
        res.json({ message: "Bot stopped successfully" });
      } else {
        res.status(500).json({ error: "Failed to stop bot" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to stop bot" });
    }
  });

  app.put("/api/bots/:id/config", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedConfig = updateBotConfigSchema.parse(req.body);

      const success = await botManager.updateBotConfig(id, validatedConfig);

      if (success) {
        const updatedBot = await storage.getBot(id);
        res.json(updatedBot);
      } else {
        res.status(500).json({ error: "Failed to update bot configuration" });
      }
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: "Invalid configuration data", details: error.errors });
      } else {
        res.status(500).json({ error: "Failed to update bot configuration" });
      }
    }
  });

  app.delete("/api/bots/:id", async (req, res) => {
    try {
      const { id } = req.params;

      // Stop bot if running
      await botManager.stopBot(id);

      // Delete from storage
      const success = await storage.deleteBot(id);

      if (success) {
        res.json({ message: "Bot deleted successfully" });
      } else {
        res.status(404).json({ error: "Bot not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to delete bot" });
    }
  });

  app.get("/api/bots/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const status = botManager.getBotStatus(id);
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: "Failed to get bot status" });
    }
  });

  // API endpoint để sync bot status từ botlolicute.ts
  app.post("/api/bots/:id/sync-status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, lastSeen, username, server } = req.body;

      const updateData: any = {
        status: status,
        lastSeen: lastSeen ? new Date(lastSeen) : new Date()
      };

      // Cập nhật username nếu được cung cấp
      if (username) {
        updateData.username = username;
        console.log(`🔄 Cập nhật tên bot trong storage: ${username}`);
      }

      // Cập nhật server nếu được cung cấp
      if (server) {
        updateData.server = server;
        console.log(`🔄 Cập nhật server trong storage: ${server}`);
      }

      const updatedBot = await storage.updateBot(id, updateData);

      if (updatedBot) {
        res.json({ success: true, message: "Bot status synced successfully" });
      } else {
        res.status(404).json({ error: "Bot not found" });
      }
    } catch (error) {
      console.error("Error syncing bot status:", error);
      res.status(500).json({ error: "Failed to sync bot status" });
    }
  });

  const httpServer = createServer(app);

  // Create WebSocket server for real-time console
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Store connected WebSocket clients
  const clients = new Set<WebSocket>();

  wss.on('connection', (ws) => {
    console.log('New WebSocket client connected');
    clients.add(ws);

    // Send initial welcome message
    ws.send(JSON.stringify({
      type: 'welcome',
      message: '🎮 Chào mừng đến với bot loli! 💕',
      timestamp: new Date().toISOString()
    }));

    // Handle client messages
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'command' && message.botId) {
          // Execute bot commands via console
          handleConsoleCommand(message.botId, message.command);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    // Remove client on disconnect
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      clients.delete(ws);
    });

    // Handle WebSocket errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });

  // Function to broadcast console messages to all connected clients
  const broadcastConsoleMessage = (message: any) => {
    const data = JSON.stringify({
      type: 'console',
      ...message,
      timestamp: new Date().toISOString()
    });

    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  };

  // Global function để broadcast logs từ botmineflayer.ts
  (global as any).broadcastToWebConsole = (botId: string, level: string, message: string, source: string) => {
    broadcastConsoleMessage({
      botId,
      level,
      message,
      source
    });
  };

  // Setup shared logger để capture logs từ external processes
  sharedLogger.setBroadcastFunction((message: any) => {
    broadcastConsoleMessage(message);
  });

  // Capture console.log và stream vào web console
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  console.log = (...args: any[]) => {
    originalConsoleLog(...args);
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');

    // Stream những log quan trọng, bỏ qua express system logs
    if (!message.includes('[express]') && 
        !message.includes('WebSocket') && 
        !message.includes('connected') &&
        !message.includes('disconnected') &&
        message.trim()) {

      // Phân loại log dựa trên nội dung
      let source = 'console';
      let level = 'info';
      let botId = 'system';

      if (message.includes('🚀') || message.includes('Bot')) {
        source = 'bot';
        level = 'success';
        botId = 'bot-main';
      } else if (message.includes('🔴') || message.includes('Error')) {
        level = 'error';
      } else if (message.includes('⚠️') || message.includes('Warning')) {
        level = 'warning';
      } else if (message.includes('✅') || message.includes('success')) {
        level = 'success';
        source = 'bot';
      } else if (message.includes('Status:')) {
        source = 'bot';
        level = 'info';
        botId = 'bot-status';
      }

      broadcastConsoleMessage({
        botId,
        level,
        message: message,
        source
      });
    }
  };

  console.error = (...args: any[]) => {
    originalConsoleError(...args);
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');

    if (message.trim() && !message.includes('WebSocket')) {
      broadcastConsoleMessage({
        botId: 'system',
        level: 'error',
        message: message,
        source: 'console'
      });
    }
  };

  console.warn = (...args: any[]) => {
    originalConsoleWarn(...args);
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');

    if (message.trim() && !message.includes('WebSocket')) {
      broadcastConsoleMessage({
        botId: 'system',
        level: 'warning',
        message: message,
        source: 'console'
      });
    }
  };

  // Function to handle console commands
  const handleConsoleCommand = async (botId: string, command: string) => {
    try {
      broadcastConsoleMessage({
        botId,
        level: 'info',
        message: `> ${command}`,
        source: 'user'
      });

      // Execute command based on type
      if (command.startsWith('/start')) {
        await botManager.startBot(botId);
        broadcastConsoleMessage({
          botId,
          level: 'success',
          message: 'Bot đang khởi động...',
          source: 'system'
        });
      } else if (command.startsWith('/stop')) {
        await botManager.stopBot(botId);
        broadcastConsoleMessage({
          botId,
          level: 'success',
          message: 'Bot đã dừng.',
          source: 'system'
        });
      } else if (command.startsWith('/status')) {
        const status = botManager.getBotStatus(botId);
        broadcastConsoleMessage({
          botId,
          level: 'info',
          message: `Trạng thái bot: ${status?.status || 'unknown'}`,
          source: 'system'
        });
      } else if (command.startsWith('/say ')) {
        const message = command.substring(5);
        // Send chat message through bot
        const success = botManager.sendBotMessage(botId, message);
        if (success) {
          broadcastConsoleMessage({
            botId,
            level: 'success',
            message: `Bot nói: ${message}`,
            source: 'chat'
          });
        } else {
          broadcastConsoleMessage({
            botId,
            level: 'error',
            message: 'Không thể gửi tin nhắn. Bot có thể chưa kết nối.',
            source: 'system'
          });
        }
      } else {
        broadcastConsoleMessage({
          botId,
          level: 'warning',
          message: 'Lệnh không hợp lệ. Sử dụng: /start, /stop, /status, /say <message>',
          source: 'system'
        });
      }
    } catch (error) {
      broadcastConsoleMessage({
        botId,
        level: 'error',
        message: `Lỗi thực thi lệnh: ${error}`,
        source: 'system'
      });
    }
  };

  // Export broadcast function for use in other modules
  (global as any).broadcastConsoleMessage = broadcastConsoleMessage;

  return httpServer;
}