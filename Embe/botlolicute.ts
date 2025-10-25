import mineflayer, { Bot } from 'mineflayer'
import { pathfinder, Movements } from 'mineflayer-pathfinder'
import * as net from 'net'

// Import goals using createRequire for CommonJS module
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { goals } = require('mineflayer-pathfinder')
import { plugin as pvp } from 'mineflayer-pvp'
import { plugin as collectBlock } from 'mineflayer-collectblock'
const autoEat = require('mineflayer-auto-eat').plugin
import { Vec3 } from 'vec3'

// Import các module đã tách
import { BotConfig, BotState } from './types'
import { updateBotStatus, setBotConnected, getBotStatus } from './bot-status'
const { mineflayer: mineflayerViewer } = require('prismarine-viewer')

const geminiApiKey = process.env.GEMINI_API_KEY // Google Gemini API key

// Bot configuration
const BOT_CONFIG: BotConfig = {
  host: process.env.MINECRAFT_SERVER_HOST || 'thuatzai123.aternos.me',
  port: parseInt(process.env.MINECRAFT_SERVER_PORT || '38893'),
  username: process.env.MINECRAFT_BOT_USERNAME || 'ice',
  version: process.env.MINECRAFT_VERSION || '1.21.2',
  auth: 'offline' as const,
  skinUrl: process.env.BOT_SKIN_URL || 'https://crafatar.com/skins/f014f08b7402657d', // Skin từ NameMC
  capeUrl: process.env.BOT_CAPE_URL || undefined
}

// Export BOT_CONFIG globally for bot-status sync
;(global as any).BOT_CONFIG = BOT_CONFIG;

// All manager functionality is now integrated directly in this file

// Global state variables
let bot: Bot
let targetPlayer: any = null
let prismarineViewerInstance: any = null
let prismarineViewerSetup = false
let followInterval: NodeJS.Timeout | null = null
let protectInterval: NodeJS.Timeout | null = null
let autoFarmActive = false
let isFollowing = false
let isProtecting = false
let lootedChests: Set<string> = new Set() // Ghi nhớ rương đã loot
let isEating = false // Track trạng thái đang ăn
let autoFishingActive = false // Track trạng thái câu cá
let autoItemCollectionDisabled = false // Tạm dừng nhặt đồ khi câu cá
let autoEquipDisabled = false // Tạm dừng tự động trang bị khi câu cá
let lastPlayerCommand = Date.now() // Track lần cuối player ra lệnh
let lastEatTime = 0 // Track lần cuối ăn để tránh spam
let bobberThrowCount = 0 // Đếm số lần âm thanh fishing_bobber.throw
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5

// Presence check variables
let presenceCheckFailures = 0
let lastPresenceCheck = Date.now()

// Auto mining variables - RESTORED per user requirements
let autoMiningActive = false
let currentMiningTarget: any = null
let targetOreType = ''
let miningInterval: NodeJS.Timeout | null = null
let lastMinedPosition: any = null
let isCurrentlyDigging = false

// Auto mining variables - REMOVED but needed for cleanup (replaced by new implementation above)

// Auto eat plugin variables
let autoEatPluginActive = false // Track trạng thái auto eat plugin
let lastMobCheckTime = 0 // Track lần cuối kiểm tra mob xung quanh

// Auto mining variables - REMOVED
// Chức năng auto mining đã được loại bỏ hoàn toàn

// Auto chest hunting variables - RESTORED per user requirements
let autoChestHuntingActive = false
let currentChestTarget: any = null
let chestHuntingInterval: NodeJS.Timeout | null = null
let lastChestPosition: any = null
let isCurrentlyApproachingChest = false
let farmInterval: NodeJS.Timeout | null = null // Farm interval for compatibility

// Auto crop farming variables - NEW
let autoCropFarmerActive = false
let cropFarmerInterval: NodeJS.Timeout | null = null
let currentHoeTool: any = null
let harvestedCrops: Set<string> = new Set() // Track harvested crops to avoid re-harvesting

// PVP variables - NEW
let pvpActive = false
let pvpProActive = false
let pvpTargetName = ''
let pvpInterval: NodeJS.Timeout | null = null
let hasWarnedWeakPlayer = false // Track nếu đã chat "Sao cậu yếu thế"
let lastPvpTpAttempt = 0 // Track lần cuối thử /tp trong PVP
let lastShieldCheck = 0 // Track lần cuối check shield
let isCirclingBehind = false // Track nếu đang vòng ra sau lưng

// Biến cho respawn handling
let lastMode = 'idle' // Track chế độ trước khi chết
let lastPosition: any = null // Track vị trí trước khi chết
let lastTargetPlayerName = '' // Track tên player đang theo/bảo vệ
let hasTpPermission: boolean | null = null // Track quyền /tp
let tpFailCount = 0 // Đếm số lần /tp thất bại
let lastAttackTime = 0 // Track lần cuối tấn công để cooldown

// Auto Explore variables - NEW
let autoExploreActive = false
let exploreInterval: NodeJS.Timeout | null = null
let exploreDirection: { x: number, z: number } | null = null
let discoveredStructures: Set<string> = new Set() // Track discovered structures
let lastExploreMove = 0

// Compatibility shims to replace deleted manager modules
let equipmentManager: any
let autoEatManager: any
let combatManager: any
let fishingManager: any
let followingManager: any
let protectingManager: any
let autoFarmManager: any
let autoBuildManager: any
let autoMiningManager: any

// Forward declarations của các hàm sẽ được định nghĩa sau
let startFollowingPlayer: (username: string) => void
let stopFollowing: () => void
let startProtectingPlayer: (username: string) => void
let stopProtecting: () => void
let startSmartAutoFishing: () => void
let stopSmartAutoFishing: () => void
let startSmartAutoBuild: (buildType: string) => void
let stopSmartAutoBuild: () => void
// Auto mining functions removed
let startAutoFarmAll: () => void
let stopAutoFarm: () => void
let startAutoMining: (oreType: string) => void
let stopAutoMining: () => void
// Auto chest hunting functions
let startAutoChestHunting: () => void
let stopAutoChestHunting: () => void
// Auto crop farming functions
let startAutoCropFarmer: () => void
let stopAutoCropFarmer: () => void
// PVP functions
let startPvP: (targetName: string) => void
let startPvPPro: (targetName: string) => void
let stopPvP: (silent?: boolean) => void
// Auto Explore functions
let startAutoExplore: () => void
let stopAutoExplore: () => void

// Create compatibility shims
function createManagerShims() {
  followingManager = {
    startFollowingPlayer: (playerName: string) => startFollowingPlayer(playerName),
    stopFollowing: () => stopFollowing(),
    getIsFollowing: () => isFollowing,
    getTargetPlayerName: () => lastTargetPlayerName
  }

  protectingManager = {
    startProtectingPlayer: (playerName: string) => startProtectingPlayer(playerName),
    stopProtecting: () => stopProtecting(),
    getIsProtecting: () => isProtecting,
    getTargetPlayerName: () => lastTargetPlayerName
  }

  autoFarmManager = {
    startAutoFarm: () => startAutoFarmAll(),
    startAutoFarmAll: () => startAutoFarmAll(),
    stopAutoFarm: () => stopAutoFarm(),
    getIsAutoFarmActive: () => autoFarmActive
  }

  // Auto mining manager removed

  fishingManager = {
    startSmartAutoFishing: () => startSmartAutoFishing(),
    stopSmartAutoFishing: () => stopSmartAutoFishing(),
    getIsAutoFishingActive: () => autoFishingActive
  }

  autoBuildManager = {
    startSmartAutoBuild: (buildType: string) => startSmartAutoBuild(buildType),
    stopSmartAutoBuild: () => stopSmartAutoBuild()
  }

  autoEatManager = {
    setup: () => setupAutoEatPlugin(),
    disable: () => disableAutoEatPlugin()
  }

  equipmentManager = {
    equipBestWeapon: () => equipBestSwordForCombat(),
    setup: () => {}
  }

  combatManager = {
    setup: () => {}
  }
}

async function testServerConnection() {
  return new Promise<boolean>((resolve) => {
    const socket = new net.Socket()

    socket.setTimeout(5000) // 5 second timeout

    socket.on('connect', () => {
      socket.destroy()
      resolve(true)
    })

    socket.on('timeout', () => {
      socket.destroy()
      resolve(false)
    })

    socket.on('error', () => {
      resolve(false)
    })

    socket.connect(BOT_CONFIG.port, BOT_CONFIG.host)
  })
}

async function createBot() {
  console.log(`🚀 Đang tạo bot mới... (Thử lần ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`)
  console.log(`📡 Kết nối tới: ${BOT_CONFIG.host}:${BOT_CONFIG.port}`)

  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.log('❌ Đã vượt quá số lần thử kết nối tối đa. Dừng bot.')
    console.log('💡 Gợi ý: Kiểm tra xem server Minecraft có đang online không:')
    console.log(`   - Truy cập https://${BOT_CONFIG.host} để kiểm tra status`)
    console.log('   - Hoặc thay đổi MINECRAFT_SERVER_HOST trong file .env')
    return
  }

  // Test server connectivity first
  console.log('🔍 Kiểm tra kết nối server...')
  const serverOnline = await testServerConnection()

  if (!serverOnline) {
    console.log('❌ Server không phản hồi. Server có thể đang offline.')
    console.log('💡 Gợi ý:')
    console.log('   1. Kiểm tra server Aternos có đang chạy không')
    console.log('   2. Thử kết nối bằng Minecraft client trước')
    console.log('   3. Kiểm tra địa chỉ server và port có đúng không')
    console.log('⏳ Sẽ thử lại sau...')

    // Still attempt connection but with warning
  } else {
    console.log('✅ Server phản hồi, đang kết nối bot...')
  }

  bot = mineflayer.createBot({
    host: BOT_CONFIG.host,
    port: BOT_CONFIG.port,
    username: BOT_CONFIG.username,
    version: BOT_CONFIG.version,
    auth: BOT_CONFIG.auth,
    keepAlive: true,
    checkTimeoutInterval: 60000, // Check connection mỗi 60s
    hideErrors: false,
    skinUrl: BOT_CONFIG.skinUrl, // Áp dụng skin từ config
    capeUrl: BOT_CONFIG.capeUrl   // Áp dụng cape nếu có
  })

  // Tăng MaxListeners để tránh warning
  bot.setMaxListeners(100)

  // Setup real prismarine-viewer for 3D world viewing with dedicated host
  function setupPrismarineViewer() {
    // Prevent multiple setups
    if (prismarineViewerSetup) {
      console.log('⚠️ Prismarine viewer already set up, skipping...')
      return
    }

    try {
      console.log('🖥️ Setting up Prismarine Viewer (one-time setup)...')
      prismarineViewerSetup = true

      // Cleanup any existing viewer instance first
      if (prismarineViewerInstance) {
        try {
          console.log('🧹 Cleaning up existing prismarine-viewer instance...')
          if (typeof prismarineViewerInstance.close === 'function') {
            prismarineViewerInstance.close()
          }
        } catch (cleanupErr) {
          console.log('⚠️ Error cleaning up old viewer:', cleanupErr.message)
        }
        prismarineViewerInstance = null
      }

      console.log('🖥️ Đang khởi động Real Prismarine Viewer với host riêng...')

      // Check if mineflayerViewer is available
      if (typeof mineflayerViewer === 'function') {
        // Try ports starting from 3005 to avoid conflicts
        const tryPorts = [3005, 3006, 3007, 3008, 3009]
        let viewerStarted = false

        for (const tryPort of tryPorts) {
          if (viewerStarted) break

          try {
            console.log(`🔍 Trying to start prismarine-viewer on port ${tryPort}...`)

            // Start real prismarine-viewer with dynamic port
            const viewer = mineflayerViewer(bot, {
              port: tryPort,
              firstPerson: false,
              host: '0.0.0.0',  // Bind to all interfaces for Replit
              viewDistance: 'far',
              chatHistory: true,
              outputTextToConsole: false
            })

            // Store viewer instance for cleanup
            prismarineViewerInstance = viewer
            viewerStarted = true

            console.log(`✅ Prismarine viewer started successfully on port ${tryPort}!`)

            // Setup viewer with enhanced options
            if (viewer && typeof viewer.on === 'function') {
              viewer.on('listening', () => {
                console.log(`✅ Real Prismarine Viewer đã khởi động trên port ${tryPort}!`)
                console.log(`🌍 Có thể xem thế giới Minecraft 3D tại: http://0.0.0.0:${tryPort}`)

                // Notify web interface about viewer URL with dynamic port
                const viewerUrl = `https://${process.env.REPL_SLUG || 'workspace'}-${process.env.REPL_OWNER || 'xihobel480'}.replit.dev:${tryPort}`
                console.log(`🎮 External Viewer URL: ${viewerUrl}`)

                // Send viewer URL to main web interface
                fetch('http://localhost:5000/api/bot-viewer-url', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    url: viewerUrl,
                    port: tryPort,
                    status: 'active',
                    botId: 'botlolicute'
                  })
                }).catch(() => {})

                bot.chat('🎮 3D Viewer đã sẵn sàng!')
              })

              viewer.on('error', (error: any) => {
                console.log(`❌ Lỗi Real Prismarine Viewer trên port ${tryPort}:`, error.message)
                // Try next port
                prismarineViewerInstance = null
              })
            } else {
              console.log('⚠️ Prismarine viewer không hỗ trợ events, chỉ khởi động cơ bản')
              console.log(`✅ Real Prismarine Viewer đã khởi động trên port ${tryPort}!`)

              // Still try to notify web interface
              const viewerUrl = `https://${process.env.REPL_SLUG || 'workspace'}-${process.env.REPL_OWNER || 'xihobel480'}.replit.dev:${tryPort}`
              console.log(`🎮 External Viewer URL: ${viewerUrl}`)

              fetch('http://localhost:5000/api/bot-viewer-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  url: viewerUrl,
                  port: tryPort,
                  status: 'active',
                  botId: 'botlolicute'
                })
              }).catch(() => {})

              bot.chat('🎮 3D Viewer đã sẵn sàng!')
            }

            break // Successfully started, exit port loop

          } catch (portError: any) {
            console.log(`❌ Port ${tryPort} busy, trying next port...`)
            prismarineViewerInstance = null
            continue
          }
        }

        if (!viewerStarted) {
          console.log('❌ Không thể khởi động prismarine-viewer trên bất kỳ port nào, dùng fallback')
          throw new Error('All ports busy for prismarine-viewer')
        }
      } else {
        console.log('❌ mineflayerViewer không khả dụng, sử dụng fallback')
        throw new Error('mineflayerViewer not available')
      }

      // Keep bot view tracking for web interface
      startBotViewTracking()
      setupBotEnvironmentTracking()

      console.log('✅ Real Prismarine Viewer setup hoàn tất trên port 3001!')
    } catch (error) {
      console.log('⚠️ Lỗi khởi động Real Prismarine Viewer:', error)
      // Fallback: chỉ chạy basic tracking
      startBotViewTracking()
      setupBotEnvironmentTracking()
    }
  }

  // Enhanced bot view tracking function
  function startBotViewTracking() {
    setInterval(() => {
      if (bot && bot.entity) {
        const pos = bot.entity.position
        const viewData = {
          position: pos,
          health: bot.health,
          food: bot.food,
          yaw: bot.entity.yaw,
          pitch: bot.entity.pitch,
          gamemode: bot.game?.gameMode || 'unknown',
          dimension: bot.game?.dimension || 'overworld',
          inventory: getFullInventoryData(),
          time: bot.time?.timeOfDay || 0,
          weather: bot.isRaining ? 'Mưa' : 'Nắng'
        }

        // Update bot status với enhanced view data - silent update
        updateBotStatus({
          position: viewData.position,
          health: viewData.health,
          food: viewData.food,
          status: `Tọa độ: ${Math.floor(pos.x)}, ${Math.floor(pos.y)}, ${Math.floor(pos.z)} | HP: ${viewData.health}/20 | Đồ ăn: ${viewData.food}/20`,
          inventory: viewData.inventory,
          gamemode: viewData.gamemode,
          weather: viewData.weather
        })

        // Sync với prismarine-viewer để hiển thị real-time data
        syncWithPrismarineViewer(viewData)
      }
    }, 5000) // Update mỗi 5 giây theo yêu cầu
  }

  // Function để lấy đầy đủ thông tin inventory bao gồm trang bị
  function getFullInventoryData() {
    try {
      const items = bot.inventory?.items() || []
      const inventory = items.map(item => ({
        name: item.name,
        displayName: item.displayName || item.name,
        count: item.count,
        slot: item.slot,
        type: item.type
      }))

      // Lấy thông tin trang bị
      const equipment = {
        hand: bot.heldItem ? {
          name: bot.heldItem.name,
          displayName: bot.heldItem.displayName || bot.heldItem.name,
          count: bot.heldItem.count
        } : null,
        helmet: bot.inventory.slots[5] ? {
          name: bot.inventory.slots[5].name,
          displayName: bot.inventory.slots[5].displayName || bot.inventory.slots[5].name,
          count: bot.inventory.slots[5].count
        } : null,
        chestplate: bot.inventory.slots[6] ? {
          name: bot.inventory.slots[6].name,
          displayName: bot.inventory.slots[6].displayName || bot.inventory.slots[6].name,
          count: bot.inventory.slots[6].count
        } : null,
        leggings: bot.inventory.slots[7] ? {
          name: bot.inventory.slots[7].name,
          displayName: bot.inventory.slots[7].displayName || bot.inventory.slots[7].name,
          count: bot.inventory.slots[7].count
        } : null,
        boots: bot.inventory.slots[8] ? {
          name: bot.inventory.slots[8].name,
          displayName: bot.inventory.slots[8].displayName || bot.inventory.slots[8].name,
          count: bot.inventory.slots[8].count
        } : null,
        offhand: bot.inventory.slots[45] ? {
          name: bot.inventory.slots[45].name,
          displayName: bot.inventory.slots[45].displayName || bot.inventory.slots[45].name,
          count: bot.inventory.slots[45].count
        } : null
      }

      return {
        items: inventory,
        equipment: equipment,
        totalItems: items.length
      }
    } catch (error) {
      console.log('Lỗi lấy inventory data:', error)
      return {
        items: [],
        equipment: {},
        totalItems: 0
      }
    }
  }

  // Function để sync data với prismarine-viewer
  async function syncWithPrismarineViewer(viewData: any) {
    try {
      await fetch('http://localhost:3001/api/bot-viewer-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          position: viewData.position,
          health: viewData.health,
          food: viewData.food,
          status: `Tọa độ: ${Math.floor(viewData.position.x)}, ${Math.floor(viewData.position.y)}, ${Math.floor(viewData.position.z)} | HP: ${viewData.health}/20 | Đồ ăn: ${viewData.food}/20`,
          inventory: viewData.inventory,
          connected: true
        })
      })
    } catch (error) {
      // Silent fail để không spam console
    }
  }

  // Thêm tracking environment chi tiết
  function setupBotEnvironmentTracking() {
    if (!bot) return

    // Track các entities xung quanh
    bot.on('entitySpawn', (entity) => {
      if (entity.type === 'player') {
        console.log(`👤 Player xuất hiện: ${entity.username || entity.displayName || 'Unknown'}`)
      } else if (entity.type === 'mob') {
        console.log(`🐾 Mob xuất hiện: ${entity.name || entity.displayName || 'Unknown'}`)
      }
    })

    // Track block breaks/places - disabled to reduce spam
    // bot.on('blockUpdate', (oldBlock, newBlock) => {
    //   if (oldBlock && newBlock && oldBlock.type !== newBlock.type) {
    //     console.log(`🧱 Block thay đổi tại ${newBlock.position}: ${oldBlock.name} → ${newBlock.name}`)
    //   }
    // })

    // Track chat messages
    bot.on('chat', (username, message) => {
      console.log(`💬 [${username}]: ${message}`)
    })
  }

  // Load plugins with error handling
  try {
    bot.loadPlugin(pathfinder)
    bot.loadPlugin(pvp)
    bot.loadPlugin(collectBlock)

    // Load auto-eat plugin với kiểm tra
    if (typeof autoEat === 'function') {
      bot.loadPlugin(autoEat)
      console.log('✅ Auto-eat plugin loaded successfully')
    } else {
      console.log('⚠️ Auto-eat plugin not available, skipping...')
    }

    console.log('✅ Plugins loaded successfully')
  } catch (pluginError) {
    console.log('⚠️ Warning loading plugins:', pluginError)
  }

  // Connection events
  bot.on('login', () => {
    console.log('🔑 Bot đang đăng nhập...')
  })

  bot.on('spawn', () => {
    console.log('🎉 Bot đã spawn thành công!')
    console.log(`🎨 Skin được áp dụng: ${BOT_CONFIG.skinUrl}`)
    if (BOT_CONFIG.capeUrl) {
      console.log(`🎪 Cape được áp dụng: ${BOT_CONFIG.capeUrl}`)
    }
    reconnectAttempts = 0 // Reset on successful connection

    // Reset presence check failures on successful spawn
    presenceCheckFailures = 0
    lastPresenceCheck = Date.now()

    // Đợi 2 giây cho bot ổn định trước khi setup
    setTimeout(() => {
      try {
        const defaultMove = new Movements(bot)
        bot.pathfinder.setMovements(defaultMove)

        // Initialize compatibility shims
        createManagerShims()

        // Start các chức năng với delay
        setTimeout(() => startStatusUpdates(), 1000)
        setTimeout(() => startWebStatusUpdates(), 1500)
        setTimeout(() => setupAutoEatPlugin(), 2000)
        setTimeout(() => collectNearbyItems(), 3000)

        // Xử lý respawn sau khi bot đã ổn định
        setTimeout(() => handleRespawn(), 5000)

        // Khởi động prismarine-viewer trên port 3001
        setTimeout(() => setupPrismarineViewer(), 6000)

        // Start monitoring player list to ensure bot is actually in server
        setTimeout(() => startPlayerListMonitoring(), 7000)

        console.log('✅ Bot setup hoàn tất và ổn định')

        // Cập nhật bot status cho web interface
        setBotConnected(true, bot)
      } catch (error) {
        console.log('⚠️ Lỗi setup bot sau spawn:', error)
      }
    }, 2000)
  })

  // Monitor player list to ensure bot is actually in the server
  function startPlayerListMonitoring() {
    let playerListCheckFailures = 0
    const MAX_PLAYERLIST_FAILURES = 2

    const playerListInterval = setInterval(() => {
      if (!bot || !bot._client || bot._client.state !== 'play') {
        clearInterval(playerListInterval)
        return
      }

      try {
        const playerList = Object.keys(bot.players || {})
        const botInList = playerList.includes(bot.username) || playerList.some(name =>
          name.toLowerCase() === bot.username.toLowerCase()
        )

        if (!botInList && playerList.length > 0) {
          playerListCheckFailures++
          console.log(`⚠️ Bot not found in player list (${playerListCheckFailures}/${MAX_PLAYERLIST_FAILURES})`)
          console.log(`📋 Current players: [${playerList.join(', ')}]`)

          if (playerListCheckFailures >= MAX_PLAYERLIST_FAILURES) {
            console.log('❌ Bot not in server player list, triggering reconnect...')
            clearInterval(playerListInterval)

            // Force disconnect and reconnect
            try {
              bot._client.end()
            } catch (e) {}

            setTimeout(() => {
              if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
                console.log('🚀 Reconnecting due to player list check failure...')
                createBot()
              }
            }, 2000)
            return
          }
        } else {
          if (playerListCheckFailures > 0) {
            console.log('✅ Bot found in player list, monitoring continues')
            playerListCheckFailures = 0
          }
        }
      } catch (error) {
        console.log('⚠️ Player list monitoring error:', error.message)
        playerListCheckFailures++
      }
    }, 15000) // Check every 15 seconds
  }

  bot.on('death', () => {
    console.log('💀 Bot đã chết!')

    // Thông báo qua Facebook Messenger
    // botMessenger.notifyOwner('bot_died', `Bot đã chết tại vị trí ${Math.floor(bot.entity.position.x)}, ${Math.floor(bot.entity.position.y)}, ${Math.floor(bot.entity.position.z)}`)

    // Lưu trạng thái hiện tại
    lastPosition = bot.entity.position ? { ...bot.entity.position } : null

    if (followingManager.getIsFollowing()) {
      lastMode = 'following'
      lastTargetPlayerName = followingManager.getTargetPlayerName() || ''
    } else if (protectingManager.getIsProtecting()) {
      lastMode = 'protecting'
      lastTargetPlayerName = protectingManager.getTargetPlayerName() || ''
    } else if (autoFarmManager.getIsAutoFarmActive()) {
      lastMode = 'farming'
    } else if (autoCropFarmerActive) {
      lastMode = 'crop_farming'
    } else if (autoFishingActive) {
      lastMode = 'fishing'
    // Mining mode removed
    } else if (autoChestHuntingActive) {
      lastMode = 'chest_hunting'
    } else {
      lastMode = 'idle'
    }

    console.log(`💾 Đã lưu trạng thái: ${lastMode}, target: ${lastTargetPlayerName}`)
    bot.chat('💀 Tớ chết rồi! Sẽ quay lại ngay...')
  })

  bot.on('health', () => {
    // Handle health updates silently
  })

  // Suppress deprecated physicTick warnings from plugins
  const originalConsoleWarn = console.warn
  console.warn = (...args) => {
    const message = args.join(' ')
    if (!message.includes('physicTick') && !message.includes('deprecated')) {
      originalConsoleWarn.apply(console, args)
    }
  }

  // Hàm trang bị KIẾM TỐINHẤT - BẮT BUỘC cho chiến đấu
  function equipBestSwordForCombat() {
    try {
      // CHỈ TÌM KIẾM - ưu tiên tuyệt đối cho combat
      const swords = bot.inventory.items().filter(item =>
        item.name.includes('sword')
      )

      if (swords.length > 0) {
        // Sort kiếm theo độ mạnh: netherite > diamond > iron > stone > wood
        const bestSword = swords.sort((a, b) => {
          const getSwordTier = (name: string) => {
            if (name.includes('netherite')) return 10
            if (name.includes('diamond')) return 8
            if (name.includes('iron')) return 6
            if (name.includes('stone')) return 4
            if (name.includes('wooden') || name.includes('wood')) return 2
            return 1
          }
          return getSwordTier(b.name) - getSwordTier(a.name)
        })[0]

        // BẮT BUỘC trang bị kiếm tốt nhất
        if (!bot.heldItem || bot.heldItem.name !== bestSword.name) {
          bot.equip(bestSword, 'hand').catch(() => {})
          console.log(`⚔️ BẮT BUỘC trang bị kiếm: ${bestSword.name} cho combat`)
          return true
        }
        return true
      } else {
        // Không có kiếm, trang bị rìu tốt nhất
        const axes = bot.inventory.items().filter(item => item.name.includes('axe'))
        if (axes.length > 0) {
          const bestAxe = axes.sort((a, b) => {
            const getAxeTier = (name: string) => {
              if (name.includes('netherite')) return 10
              if (name.includes('diamond')) return 8
              if (name.includes('iron')) return 6
              if (name.includes('stone')) return 4
              if (name.includes('wooden') || name.includes('wood')) return 2
              return 1
            }
            return getAxeTier(b.name) - getAxeTier(a.name)
          })[0]

          bot.equip(bestAxe, 'hand').catch(() => {})
          console.log(`🪓 Trang bị rìu thay thế: ${bestAxe.name} cho combat`)
          return true
        }
        console.log('⚠️ Không có kiếm hoặc rìu để combat!')
        return false
      }
    } catch (error) {
      console.log('❌ Lỗi trang bị kiếm combat:', error)
      return false
    }
  }

  // Hàm trang bị công cụ phù hợp khi đi theo (không combat)
  function equipBestToolForFollowing() {
    try {
      // Khi đi theo, ưu tiên pickaxe > shovel > axe > sword
      const tools = bot.inventory.items().filter(item =>
        item.name.includes('pickaxe') ||
        item.name.includes('shovel') ||
        item.name.includes('axe') ||
        item.name.includes('sword')
      )

      if (tools.length > 0) {
        // Sắp xếp theo ưu tiên: pickaxe > shovel > axe > sword
        const bestTool = tools.sort((a, b) => {
          const getToolPriority = (name: string) => {
            if (name.includes('pickaxe')) return 100
            if (name.includes('shovel')) return 80
            if (name.includes('axe')) return 60
            if (name.includes('sword')) return 40
            return 0
          }

          const getTier = (name: string) => {
            if (name.includes('netherite')) return 10
            if (name.includes('diamond')) return 8
            if (name.includes('iron')) return 6
            if (name.includes('stone')) return 4
            if (name.includes('wooden') || name.includes('wood')) return 2
            return 1
          }

          const priorityA = getToolPriority(a.name) + getTier(a.name)
          const priorityB = getToolPriority(b.name) + getTier(b.name)
          return priorityB - priorityA
        })[0]

        if (!bot.heldItem || bot.heldItem.name !== bestTool.name) {
          bot.equip(bestTool, 'hand').catch(() => {})
          console.log(`🔧 Trang bị công cụ theo dõi: ${bestTool.name}`)
        }
      }
    } catch (error) {
      console.log('Lỗi trang bị công cụ:', error)
    }
  }

  // Bow functions removed

  // Kiểm tra vật cản giữa bot và target (raycast) - FIXED VERSION
  function hasLineOfSight(target: any): boolean {
    try {
      if (!target || !target.position) return false

      const botPos = bot.entity.position
      const targetPos = target.position

      // Điều chỉnh vị trí kiểm tra: mắt bot và trung tâm target
      const from = new Vec3(botPos.x, botPos.y + 1.6, botPos.z) // Mắt bot (1.6 blocks cao)
      const to = new Vec3(targetPos.x, targetPos.y + 0.5, targetPos.z) // Trung tâm target

      const distance = from.distanceTo(to)
      if (distance < 2) return true // Quá gần thì luôn có line of sight

      // Tính vector hướng
      const direction = to.clone().subtract(from).normalize()

      // Kiểm tra từng 0.5 block dọc theo đường
      const steps = Math.floor(distance * 2)
      for (let i = 1; i < steps; i++) {
        const checkPoint = from.clone().add(direction.clone().scale(i * 0.5))
        const block = bot.blockAt(checkPoint.floor())

        // Kiểm tra block rắn cản đường
        if (block && block.name !== 'air') {
          // Cho phép bắn qua các block không rắn
          const passableBlocks = [
            'water', 'lava', 'grass', 'tall_grass', 'fern', 'large_fern',
            'flower', 'dandelion', 'poppy', 'rose', 'vine', 'snow',
            'snow_layer', 'torch', 'redstone_torch', 'lever', 'button',
            'pressure_plate', 'tripwire', 'string', 'web', 'fire'
          ]

          const isPassable = passableBlocks.some(passable =>
            block.name.includes(passable)
          )

          if (!isPassable && block.boundingBox === 'block') {
            console.log(`🚫Vật cản: ${block.name} tại ${checkPoint.x.toFixed(1)}, ${checkPoint.y.toFixed(1)}, ${checkPoint.z.toFixed(1)}`)
            return false
          }
        }
      }

      return true // Không có vật cản
    } catch (error) {
      console.log('⚠️ Lỗi kiểm tra line of sight:', error)
      return true // Cho phép tấn công nếu có lỗi để tránh block hoàn toàn
    }
  }

  // Hàm tấn công cận chiến SPAM CỰC NHANH - tấn công liên tục không ngừng
  function meleeAttack(target: any, distance: number): boolean {
    if (!target || !target.isValid || !target.position) return false

    try {
      // Ngắm mục tiêu trước khi tấn công cận chiến
      const targetPos = target.position.clone()
      targetPos.y += target.height * 0.5 // Ngắm vào trung tâm để chính xác hơn

      // Đảm bảo không nhìn xuống đất trong cận chiến
      const botEyeY = bot.entity.position.y + 1.6
      if (targetPos.y < botEyeY - 0.8) {
        targetPos.y = botEyeY - 0.5
      }

      // Ngắm cực nhanh
      bot.lookAt(targetPos, false)

      // Tấn công - giảm xuống để tránh spam
      for (let i = 0; i < 3; i++) {
        bot.attack(target)
      }

      // Bật sprint để tăng damage và tốc độ
      bot.setControlState('sprint', true)

      // Tấn công spam (đã loại bỏ log để tránh spam console)
      return true
    } catch (error) {
      console.log('❌ Lỗi tấn công cận chiến:', error)
      return false
    }
  }

  async function equipBestArmor() {
    try {
      const armorSlots: {[key: string]: any} = {
        head: null,
        torso: null,
        legs: null,
        feet: null
      }

      // Material priority từ xịn đến cùi
      const materialPriority = ['netherite', 'diamond', 'iron', 'gold', 'chainmail', 'leather']

      for (const item of bot.inventory.items()) {
        // Check helmet
        if (item.name.includes('helmet')) {
          if (!armorSlots.head) {
            armorSlots.head = item
          } else {
            // Compare by material priority (safer than maxDurability)
            const currentMaterial = materialPriority.findIndex(m => armorSlots.head.name.includes(m))
            const newMaterial = materialPriority.findIndex(m => item.name.includes(m))
            if (newMaterial < currentMaterial || newMaterial === -1) {
              armorSlots.head = item
            }
          }
        }
        // Check chestplate
        else if (item.name.includes('chestplate')) {
          if (!armorSlots.torso) {
            armorSlots.torso = item
          } else {
            const currentMaterial = materialPriority.findIndex(m => armorSlots.torso.name.includes(m))
            const newMaterial = materialPriority.findIndex(m => item.name.includes(m))
            if (newMaterial < currentMaterial || newMaterial === -1) {
              armorSlots.torso = item
            }
          }
        }
        // Check leggings
        else if (item.name.includes('leggings')) {
          if (!armorSlots.legs) {
            armorSlots.legs = item
          } else {
            const currentMaterial = materialPriority.findIndex(m => armorSlots.legs.name.includes(m))
            const newMaterial = materialPriority.findIndex(m => item.name.includes(m))
            if (newMaterial < currentMaterial || newMaterial === -1) {
              armorSlots.legs = item
            }
          }
        }
        // Check boots
        else if (item.name.includes('boots')) {
          if (!armorSlots.feet) {
            armorSlots.feet = item
          } else {
            const currentMaterial = materialPriority.findIndex(m => armorSlots.feet.name.includes(m))
            const newMaterial = materialPriority.findIndex(m => item.name.includes(m))
            if (newMaterial < currentMaterial || newMaterial === -1) {
              armorSlots.feet = item
            }
          }
        }
      }

      // Equip armor với async/await để tránh lỗi
      for (const [slot, item] of Object.entries(armorSlots)) {
        if (item) {
          try {
            const destination = slot === 'torso' ? 'torso' : slot
            await bot.equip(item, destination as any)
          } catch (equipError) {
            // Silent fail - giáp có thể đã được trang bị rồi
          }
        }
      }
    } catch (error) {
      console.log('Lỗi trang bị giáp:', error)
    }
  }

  async function equipBestTool() {
    try {
      const pickaxes = bot.inventory.items().filter(item => item.name.includes('pickaxe'))

      if (pickaxes.length > 0) {
        const priority = ['netherite', 'diamond', 'iron', 'stone', 'wooden']
        let bestPickaxe = pickaxes[0]

        for (const material of priority) {
          const pickaxe = pickaxes.find(p => p.name.includes(material))
          if (pickaxe) {
            bestPickaxe = pickaxe
            break
          }
        }

        if (!bot.heldItem || bot.heldItem.name !== bestPickaxe.name) {
          await bot.equip(bestPickaxe, 'hand')
          console.log(`🔨 Trang bị ${bestPickaxe.name}`)
        }
        return true
      } else {
        console.log('Không có pickaxe nào để trang bị.')
        return false
      }
    } catch (error) {
      console.log('Lỗi trang bị tool:', error)
      return false
    }
  }

  function equipOffhand() {
    try {
      const totem = bot.inventory.items().find(item => item.name === 'totem_of_undying')
      const shield = bot.inventory.items().find(item => item.name.includes('shield'))

      if (totem) {
        bot.equip(totem, 'off-hand').catch(() => {})
        console.log(`✨ Bot đã trang bị Vật Tổ vào tay trái.`)
      } else if (shield) {
        bot.equip(shield, 'off-hand').catch(() => {})
        console.log(`🛡️ Bot đã trang bị Khiên vào tay trái.`)
      }
    } catch (error) {
      console.log('Lỗi trang bị offhand:', error)
    }
  }

  // Helper function để kiểm tra có nên chặn hoạt động khi câu cá không
  function isBlockedByFishing() {
    return autoFishingActive && (autoEquipDisabled || autoItemCollectionDisabled)
  }

  // Xử lý respawn - quay lại vị trí cũ và tiếp tục chế độ
  async function handleRespawn() {
    // Chỉ xử lý nếu có trạng thái được lưu
    if (lastMode === 'idle' || !lastPosition) {
      return
    }

    console.log(`🔄 Bắt đầu khôi phục trạng thái: ${lastMode}`)

    // Đợi 3 giây để bot ổn định sau khi respawn
    setTimeout(async () => {
      try {
        // Kiểm tra quyền /tp nếu chưa biết
        if (hasTpPermission === null) {
          console.log('🔍 Kiểm tra quyền /tp...')
          const currentPos = bot.entity.position
          bot.chat(`/tp ${bot.username} ${Math.floor(currentPos.x)} ${Math.floor(currentPos.y + 1)} ${Math.floor(currentPos.z)}`)

          // Kiểm tra sau 2 giây
          setTimeout(() => {
            const newPos = bot.entity.position
            const moved = Math.abs(newPos.y - currentPos.y) > 0.5

            if (moved) {
              hasTpPermission = true
              console.log('✅ Bot có quyền /tp')
              // Thực hiện teleport về vị trí cũ
              performRespawnTeleport()
            } else {
              hasTpPermission = false
              tpFailCount++
              console.log('❌ Bot không có quyền /tp')
              bot.chat('🥺 Tớ không có quyền /tp để quay lại vị trí cũ. Dừng hoạt động!')
              resetRespawnState()
            }
          }, 2000)
        } else if (hasTpPermission === true) {
          // Có quyền /tp, thực hiện ngay
          performRespawnTeleport()
        } else {
          // Không có quyền /tp
          tpFailCount++
          if (tpFailCount >= 3) {
            bot.chat('🥺 Tớ không có quyền /tp. Dừng tất cả hoạt động!')
            resetRespawnState()
            return
          }
          console.log('❌ Bỏ qua respawn vì không có quyền /tp')
        }
      } catch (error) {
        console.log('❌ Lỗi khi kiểm tra quyền /tp:', error)
        resetRespawnState()
      }
    }, 3000)
  }

  function performRespawnTeleport() {
    if (!lastPosition) return

    console.log(`🚀 Teleport về vị trí cũ: ${Math.floor(lastPosition.x)}, ${Math.floor(lastPosition.y)}, ${Math.floor(lastPosition.z)}`)
    const tpCommand = `/tp ${bot.username} ${Math.floor(lastPosition.x)} ${Math.floor(lastPosition.y)} ${Math.floor(lastPosition.z)}`
    bot.chat(tpCommand)

    // Kiểm tra thành công sau 3 giây
    setTimeout(() => {
      const currentPos = bot.entity.position
      const distance = Math.sqrt(
        Math.pow(currentPos.x - lastPosition!.x, 2) +
        Math.pow(currentPos.y - lastPosition!.y, 2) +
        Math.pow(currentPos.z - lastPosition!.z, 2)
      )

      if (distance < 10) {
        console.log('✅ Teleport thành công, khôi phục chế độ')
        restorePreviousMode()
      } else {
        console.log('❌ Teleport thất bại, thử lại...')
        tpFailCount++
        if (tpFailCount < 3) {
          setTimeout(() => performRespawnTeleport(), 2000)
        } else {
          console.log('❌ Teleport thất bại quá nhiều lần, dừng khôi phục')
          resetRespawnState()
        }
      }
    }, 3000)
  }

  function restorePreviousMode() {
    console.log(`🔄 Khôi phục chế độ: ${lastMode}`)

    switch (lastMode) {
      case 'following':
        if (lastTargetPlayerName) {
          bot.chat(`🔄 Quay lại theo ${lastTargetPlayerName}!`)
          followingManager.startFollowingPlayer(lastTargetPlayerName)
        }
        break

      case 'protecting':
        if (lastTargetPlayerName) {
          bot.chat(`🔄 Quay lại bảo vệ ${lastTargetPlayerName}!`)
          protectingManager.startProtectingPlayer(lastTargetPlayerName)
        }
        break

      case 'farming':
        bot.chat('🔄 Quay lại auto farm!')
        autoFarmManager.startAutoFarmAll()
        break

      case 'crop_farming':
        bot.chat('🔄 Quay lại auto crop farmer!')
        startAutoCropFarmer()
        break

      case 'fishing':
        bot.chat('🔄 Quay lại auto câu!')
        fishingManager.startSmartAutoFishing()
        break

      // Mining mode removed

      case 'chest_hunting':
        bot.chat('🔄 Quay lại auto tìm rương!')
        startAutoChestHunting()
        break

      default:
        console.log('🔄 Không có chế độ để khôi phục')
        break
    }

    // Reset trạng thái sau khi khôi phục
    resetRespawnState()
  }

  function resetRespawnState() {
    lastPosition = null
    lastMode = 'idle'
    lastTargetPlayerName = ''
    tpFailCount = 0
  }

  // Hàm trang bị vũ khí tốt nhất
  function equipBestWeapon() {
    try {
      // Tìm vũ khí tốt nhất theo thứ tự: sword > axe > bow
      const weapons = bot.inventory.items().filter(item =>
        item.name.includes('sword') ||
        item.name.includes('axe') ||
        item.name.includes('bow')
      )

      if (weapons.length > 0) {
        // Sort theo độ mạnh
        const bestWeapon = weapons.sort((a, b) => {
          const getWeaponTier = (name: string) => {
            if (name.includes('netherite')) return 100
            if (name.includes('diamond')) return 80
            if (name.includes('iron')) return 60
            if (name.includes('stone')) return 40
            if (name.includes('wooden') || name.includes('wood')) return 20
            return 10
          }

          const getWeaponType = (name: string) => {
            if (name.includes('sword')) return 1000
            if (name.includes('axe')) return 800
            if (name.includes('bow')) return 600
            return 0
          }

          const scoreA = getWeaponType(a.name) + getWeaponTier(a.name)
          const scoreB = getWeaponType(b.name) + getWeaponTier(b.name)
          return scoreB - scoreA
        })[0]

        if (!bot.heldItem || bot.heldItem.name !== bestWeapon.name) {
          bot.equip(bestWeapon, 'hand').catch(() => {})
        }
      }
    } catch (error) {
      console.log('Lỗi trang bị vũ khí:', error)
    }
  }

  // Tự động trang bị định kỳ (chặn khi đang câu) - giảm frequency vì plugin tự xử lý
  setInterval(() => {
    // Không trang bị khi đang câu cá hoặc đang ăn
    if (isBlockedByFishing() || isEating) {
      return
    }

    equipBestWeapon()
    equipBestArmor()
    equipOffhand()
  }, 15000) // Tăng lên 15 giây vì plugin tự xử lý việc ăn

  // ------------------ Auto eat plugin ------------------
  function setupAutoEatPlugin() {
    console.log('🍽️ Khởi tạo Auto Eat Plugin - Chỉ ăn khi đói < 6 và an toàn!')

    // Kiểm tra xem bot.autoEat có tồn tại không
    if (!bot.autoEat) {
      console.log('⚠️ Auto eat plugin không khả dụng, sử dụng manual eating')
      autoEatPluginActive = false
      setupManualEating()
      return
    }

    console.log('✅ Auto eat plugin đã hoạt động!')
    autoEatPluginActive = true

    try {
      // Cấu hình auto eat plugin
      bot.autoEat.options = {
        priority: 'foodPoints', // Ưu tiên theo điểm thức ăn
        startAt: 6, // Bắt đầu ăn khi food < 6 (3 đùi)
        bannedFood: [
          // Loại bỏ thức ăn có hiệu ứng độc
          'spider_eye', 'poisonous_potato', 'pufferfish', 'raw_chicken',
          'rotten_flesh', 'suspicious_stew'
        ],
        // Chỉ ăn những thức ăn an toàn không gây hiệu ứng độc
        allowedFood: [
          'bread', 'apple', 'cooked_beef', 'cooked_pork', 'cooked_chicken',
          'cooked_salmon', 'cooked_cod', 'baked_potato', 'carrot',
          'golden_apple', 'enchanted_golden_apple', 'cooked_mutton',
          'cookie', 'melon_slice', 'sweet_berries', 'honey_bottle',
          'milk_bucket', 'mushroom_stew', 'rabbit_stew', 'beetroot_soup'
        ],
        timeout: 3000 // Timeout 3 giây cho việc ăn
      }

      // Event listener khi bắt đầu ăn
      bot.on('autoeat_started', (item: any) => {
        console.log(`🍞 Auto eat bắt đầu ăn: ${item.name} - Food hiện tại: ${bot.food}/20`)
        isEating = true
      })

      // Event listener khi ăn xong
      bot.on('autoeat_finished', (item: any) => {
        console.log(`✅ Auto eat hoàn thành: ${item.name} - Food hiện tại: ${bot.food}/20`)
        isEating = false

        // Trang bị lại công cụ mining sau khi ăn nếu đang mine
        if (autoMiningActive) {
          setTimeout(() => {
            equipBestPickaxe()
          }, 500)
        } else if (!isBlockedByFishing()) {
          setTimeout(() => {
            equipBestWeapon()
          }, 500)
        }
      })

      // Event listener khi lỗi ăn
      bot.on('autoeat_error', (error: any) => {
        console.log('⚠️ Auto eat lỗi:', error.message)
        isEating = false
      })

      // Kiểm tra mob xung quanh mỗi 2 giây - chỉ ăn khi an toàn
      setInterval(() => {
        if (!autoEatPluginActive || !bot.autoEat) return

        const currentTime = Date.now()
        if (currentTime - lastMobCheckTime < 2000) return // Chỉ check mỗi 2 giây
        lastMobCheckTime = currentTime

        const food = bot.food

        // Chỉ kiểm tra khi thực sự cần ăn
        if (food >= 6) {
          // Đủ no, tắt auto eat
          if (bot.autoEat.isEnabled && bot.autoEat.isEnabled()) {
            bot.autoEat.disable()
          }
          return
        }

        // Quét mob xung quanh 4 blocks - chỉ khi không đang mine
        if (!autoMiningActive) {
          const nearbyMobs = Object.values(bot.entities).filter((entity: any) => {
            if (!entity || !entity.position) return false
            if (entity.type !== 'mob') return false
            if (entity.name?.includes('villager') || entity.name?.includes('iron_golem')) return false

            const distance = bot.entity.position.distanceTo(entity.position)
            return distance <= 4
          })

          if (nearbyMobs.length === 0) {
            // An toàn, bật auto eat
            if (bot.autoEat.isEnabled && !bot.autoEat.isEnabled() && food < 6) {
              bot.autoEat.enable()
              console.log('🍽️ Vùng an toàn - Bật auto eat (Food:', food, '/20)')
            }
          } else {
            // Có mob gần, tắt auto eat để tập trung chiến đấu
            if (bot.autoEat.isEnabled && bot.autoEat.isEnabled()) {
              bot.autoEat.disable()
              console.log('⚔️ Có mob gần - Tạm tắt auto eat để combat')
            }
          }
        } else {
          // Đang mine - luôn cho phép ăn khi cần
          if (bot.autoEat.isEnabled && !bot.autoEat.isEnabled() && food < 6) {
            bot.autoEat.enable()
            console.log('⛏️ Mine mode - Bật auto eat (Food:', food, '/20)')
          }
        }
      }, 2000) // Check mỗi 2 giây

      console.log('🍽️ Auto eat plugin setup hoàn tất!')
    } catch (error) {
      console.log('❌ Lỗi setup auto eat plugin:', error.message)
      autoEatPluginActive = false
      setupManualEating()
    }
  }

  // Backup manual eating system
  function setupManualEating() {
    console.log('🍽️ Khởi tạo Manual Eating System')

    setInterval(() => {
      if (autoEatPluginActive || isEating) return

      const food = bot.food
      if (food < 6) { // Chỉ ăn khi đói < 6
        const safeFood = bot.inventory.items().find(item => {
          const name = item.name.toLowerCase()
          const safeItems = [
            'bread', 'apple', 'cooked_beef', 'cooked_pork', 'cooked_chicken',
            'cooked_salmon', 'cooked_cod', 'baked_potato', 'carrot',
            'golden_apple', 'enchanted_golden_apple', 'cooked_mutton',
            'cookie', 'melon_slice', 'sweet_berries'
          ]
          return safeItems.some(safe => name.includes(safe))
        })

        if (safeFood) {
          isEating = true
          console.log(`🍞 Manual eating: ${safeFood.name}`)

          bot.equip(safeFood, 'hand').then(() => {
            bot.consume().then(() => {
              console.log(`✅ Đã ăn ${safeFood.name}`)
              isEating = false

              // Trang bị lại công cụ sau khi ăn
              if (autoMiningActive) {
                setTimeout(() => equipBestPickaxe(), 500)
              } else if (!isBlockedByFishing()) {
                setTimeout(() => equipBestWeapon(), 500)
              }
            }).catch(() => {
              isEating = false
            })
          }).catch(() => {
            isEating = false
          })
        }
      }
    }, 3000) // Check mỗi 3 giây
  }

  // Hàm tắt auto eat plugin
  function disableAutoEatPlugin() {
    if (autoEatPluginActive && bot.autoEat) {
      bot.autoEat.disable()
      autoEatPluginActive = false
      console.log('⏹️ Auto eat plugin đã tắt')
    }
  }

  // ------------------ Nhặt item ------------------
  let itemCollectionDisabled = false // Biến để tắt nhặt đồ khi dừng

  function collectNearbyItems() {
    setInterval(() => {
      // Chặn nhặt đồ khi đang câu cá hoặc khi bị disabled
      if (isBlockedByFishing() || itemCollectionDisabled) {
        return
      }

      try {
        const entities = Object.values(bot.entities)
        for (const entity of entities) {
          if (entity.name === 'item' && entity.position && bot.entity.position.distanceTo(entity.position) < 5) {
            bot.lookAt(entity.position, true).catch(() => {})
            bot.collectBlock.collect(entity).catch(() => {})
          }
        }
      } catch (error) {
        // Ignore errors
      }
    }, 2000)
  }

  // ============= ITEM TRACKING SYSTEM =============
  // Map để lưu thông tin item entities khi chúng spawn
  const itemEntityMap = new Map<number, {
    id: number,
    count: number,
    name: string,
    displayName: string,
    spawnTime: number
  }>()

  // Theo dõi khi item entities spawn để lưu metadata
  bot.on('entitySpawn', (entity: any) => {
    // Chỉ quan tâm đến item entities
    if (entity.name === 'item' && entity.metadata) {
      try {
        // Lấy thông tin item từ metadata
        const itemStack = entity.metadata.item
        if (itemStack && itemStack.itemId !== undefined) {
          // Tra cứu tên item từ registry bằng itemId
          const itemInfo = bot.registry.items[itemStack.itemId]
          if (itemInfo) {
            // Lưu vào Map với entity ID làm key
            itemEntityMap.set(entity.id, {
              id: itemStack.itemId,
              count: itemStack.itemCount || 1,
              name: itemInfo.name,
              displayName: itemInfo.displayName || itemInfo.name,
              spawnTime: Date.now()
            })

            console.log(`📋 Item spawned: ${itemInfo.name} x${itemStack.itemCount || 1} (entity ${entity.id})`)
          }
        }
      } catch (error) {
        // Bỏ qua lỗi parsing metadata
      }
    }
  })

  // Cleanup Map định kỳ để tránh memory leak (xóa items cũ hơn 60 giây)
  setInterval(() => {
    const now = Date.now()
    for (const [entityId, itemData] of itemEntityMap.entries()) {
      if (now - itemData.spawnTime > 60000) { // 60 giây
        itemEntityMap.delete(entityId)
      }
    }
  }, 30000) // Cleanup mỗi 30 giây

  // Track khi bot nhặt item - ENHANCED VERSION
  bot.on('playerCollect', (collector: any, collected: any) => {
    if (collector.username === bot.username) {
      let itemName = 'Unknown item'
      let itemCount = 1

      // PHƯƠNG PHÁP 1: Lấy từ Map đã lưu (ưu tiên cao nhất)
      if (collected.id && itemEntityMap.has(collected.id)) {
        const itemData = itemEntityMap.get(collected.id)!
        itemName = itemData.displayName || itemData.name
        itemCount = itemData.count

        // Xóa khỏi Map sau khi sử dụng
        itemEntityMap.delete(collected.id)

        console.log(`🎁 Bot đã nhận: ${itemName} x${itemCount} (từ Map)`)
        return
      }

      // PHƯƠNG PHÁP 2: Thử lấy từ metadata hiện tại
      if (collected.metadata && collected.metadata.item) {
        const itemStack = collected.metadata.item
        if (itemStack.itemId !== undefined) {
          const itemInfo = bot.registry.items[itemStack.itemId]
          if (itemInfo) {
            itemName = itemInfo.displayName || itemInfo.name
            itemCount = itemStack.itemCount || 1
            console.log(`🎁 Bot đã nhận: ${itemName} x${itemCount} (từ metadata)`)
            return
          }
        }
      }

      // PHƯƠNG PHÁP 3: Fallback methods
      if (collected.metadata && collected.metadata.itemName) {
        itemName = collected.metadata.itemName
      } else if (collected.name && collected.name !== 'item') {
        itemName = collected.name
      } else if (collected.metadata && collected.metadata.itemId) {
        const itemById = bot.registry.items[collected.metadata.itemId]
        if (itemById) {
          itemName = itemById.displayName || itemById.name
        }
      }

      // Làm sạch tên item (bỏ minecraft: prefix nếu có)
      if (itemName.includes(':')) {
        itemName = itemName.split(':').pop() || itemName
      }

      // Log với tên đã được cải thiện
      console.log(`🎁 Bot đã nhận: ${itemName} x${itemCount} (fallback)`)
    }
  })

  // Backup method: Listen for inventory changes để track items được nhặt
  bot.on('windowUpdate', (slot: number, oldItem: any, newItem: any) => {
    // Chỉ track khi có item mới được thêm vào inventory
    if (newItem && !oldItem && slot >= 9 && slot <= 44) { // Slots của main inventory
      let itemName = newItem.name || 'unknown_item'

      // Cải thiện tên hiển thị
      if (newItem.displayName) {
        itemName = newItem.displayName
      } else if (newItem.name) {
        // Convert technical name thành display name
        itemName = newItem.name.replace(/_/g, ' ')
          .split(' ')
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      }

      console.log(`📦 Inventory updated: +${itemName} x${newItem.count} (slot ${slot})`)
    }
  })

  // ------------------ Random Status Updates ------------------
  function startStatusUpdates() {
    setInterval(() => {
      // Removed flirting, now only provides status updates when needed
      if (Math.random() < 0.1) { // 10% chance every 30s for status
        const statusMessages = [
          "🤖 Tớ đang hoạt động bình thường!",
          "⚡ Hệ thống bot stable!",
          "🔋 Bot ready cho commands!",
          "🌟 Mọi thứ OK!"
        ]
        const randomMessage = statusMessages[Math.floor(Math.random() * statusMessages.length)]
        console.log(`Status: ${randomMessage}`)
      }
    }, 30000) // 30 giây một lần
  }

  // Function để cập nhật web status real-time - silent mode
  function startWebStatusUpdates() {
    setInterval(() => {
      if (bot && bot.entity) {
        // Determine current mode
        let currentMode = 'idle';
        let currentStatus = 'Đang chờ lệnh';

        if (isFollowing) {
          currentMode = 'following';
          currentStatus = `Đang theo ${targetPlayer?.username || 'player'}`;
        } else if (isProtecting) {
          currentMode = 'protecting';
          currentStatus = `Đang bảo vệ ${targetPlayer?.username || 'player'}`;
        } else if (autoFarmActive) {
          currentMode = 'autofarming';
          currentStatus = 'Đang auto farm monsters';
        } else if (autoCropFarmerActive) {
          currentMode = 'crop_farming';
          currentStatus = 'Đang auto crop farmer';
        } else if (autoFishingActive) {
          currentMode = 'fishing';
          currentStatus = 'Đang câu cá';
        // Mining status removed
        } else if (autoMiningActive) {
          currentMode = 'mining';
          currentStatus = `Đang đào ${targetOreType}`;
        } else if (autoChestHuntingActive) {
          currentMode = 'chest_hunting';
          currentStatus = 'Đang tìm rương';
        }

        // Get nearby entities
        const nearbyMobs = Object.values(bot.entities)
          .filter(entity => entity.type === 'mob' && entity.position)
          .filter(entity => bot.entity.position.distanceTo(entity.position) < 10)
          .map(entity => ({
            type: entity.name || 'unknown',
            distance: Math.round(bot.entity.position.distanceTo(entity.position) * 10) / 10
          }))
          .slice(0, 5); // Limit to 5 entities

        const currentPosition = {
          x: Math.round(bot.entity.position.x),
          y: Math.round(bot.entity.position.y),
          z: Math.round(bot.entity.position.z)
        };

        // Silent update bot status for web interface (no console logs)
        updateBotStatus({
          connected: true,
          health: bot.health,
          food: bot.food,
          position: currentPosition,
          mode: currentMode,
          status: currentStatus,
          nearbyMobs: nearbyMobs,
          equipment: {
            weapon: bot.heldItem?.name || null,
            armor: [] // Could be expanded later
          },
          targetPlayer: targetPlayer?.username || null,
          lastActivity: new Date().toLocaleString('vi-VN')
        });

        // Đồng bộ với Prismarine Viewer mỗi 10 giây để giảm spam
        if (Date.now() % 10000 < 2000) {
          const viewData = {
            position: currentPosition,
            health: bot.health,
            food: bot.food,
            inventory: getFullInventoryData()
          };

          syncWithPrismarineViewer(viewData);
        }
      }
    }, 5000) // Sync mỗi 5 giây để cân bằng giữa real-time và performance
  }

  // ------------------ SMART AUTO FISHING ------------------
  // Biến tracking cho smart auto fishing
  let isFishing = false
  let fishingInterval: NodeJS.Timeout | null = null
  let currentHook: any = null
  let hookCheckInterval: NodeJS.Timeout | null = null
  let fishingStartTime = 0
  let hasFishBitten = false
  let lastHookPosition: any = null

  // Alias để tương thích với lệnh chat cũ
  startSmartAutoFishing = function() {
    // Dừng các hoạt động khác TRƯỚC khi bắt đầu câu
    stopFollowing()
    stopProtecting()
    autoFarmActive = false

    // Kích hoạt chế độ câu cá thông minh
    autoFishingActive = true
    autoItemCollectionDisabled = true  // Tạm dừng nhặt đồ
    autoEquipDisabled = true           // Tạm dừng tự động trang bị
    itemCollectionDisabled = false     // Bật lại nhặt đồ cho fishing

    isFishing = false
    currentHook = null
    bobberThrowCount = 0 // Reset đếm âm thanh fishing_bobber.throw cho lần câu này

    bot.chat('🎣 Bắt đầu auto câu thông minh! Tớ chỉ cầm cần câu thôi nè~ ✨')
    console.log('🎣 Smart Auto Fishing - Activated')

    if (fishingInterval) {
      clearInterval(fishingInterval)
    }

    fishingInterval = setInterval(async () => {
      if (!autoFishingActive) {
        clearInterval(fishingInterval!)
        fishingInterval = null
        return
      }

      // Nếu đang câu thì không làm gì cả, chỉ đợi
      if (isFishing) {
        return
      }

      try {
        // BƯỚC 1: Kiểm tra cần câu
        const fishingRod = bot.inventory.items().find(item => item.name.includes('fishing_rod'))

        if (!fishingRod) {
          bot.chat('🥺 Không có cần câu! Cần cần câu để hoạt động nè!')
          stopSmartAutoFishing()
          return
        }

        // BƯỚC 2: Chỉ cầm cần câu - bỏ tất cả đồ khác
        if (!bot.heldItem || !bot.heldItem.name.includes('fishing_rod')) {
          await bot.equip(fishingRod, 'hand')
          console.log('🎣 Chỉ cầm cần câu:', fishingRod.name)
          await new Promise(resolve => setTimeout(resolve, 1200))
        }

        // BƯỚC 3: Tìm nước để câu
        const waterBlock = bot.findBlock({
          matching: (block) => block && (block.name === 'water'),
          maxDistance: 20,
          useExtraInfo: true
        })

        if (waterBlock) {
          // Di chuyển đến gần nước nếu cần
          if (bot.entity.position.distanceTo(waterBlock.position) > 5) {
            const movements = new Movements(bot)
            movements.allowSprinting = true
            bot.pathfinder.setMovements(movements)
            const nearWaterGoal = new goals.GoalNear(waterBlock.position.x, waterBlock.position.y, waterBlock.position.z, 4)
            bot.pathfinder.setGoal(nearWaterGoal)
            await new Promise(resolve => setTimeout(resolve, 2000))
            bot.pathfinder.setGoal(null)
          }

          // BƯỚC 4: Thả câu xuống nước
          await bot.lookAt(waterBlock.position.offset(0.5, 0.5, 0.5), true)
          await new Promise(resolve => setTimeout(resolve, 400))

          console.log('🎣 Thả cần xuống nước!')
          isFishing = true
          currentHook = null
          bobberThrowCount = 0 // Reset đếm âm thanh fishing_bobber.throw cho lần câu này
          bot.activateItem() // Thả phao

          // BƯỚC 5: Setup event listeners cho fishing
          setupFishingEventListeners()

          // BƯỚC 6: Đợi 4 giây trước khi theo dõi
          setTimeout(() => {
            if (!autoFishingActive || !isFishing) return

            // Tìm fishing hook entity với nhiều lần thử
            let attempts = 0
            const maxAttempts = 10
            const findHook = () => {
              attempts++
              currentHook = Object.values(bot.entities).find(entity =>
                (entity.name === 'fishing_bobber' || entity.name === 'fishing_hook') &&
                entity.position &&
                bot.entity.position.distanceTo(entity.position) < 15
              )

              if (currentHook) {
                console.log('✅ Đã tìm thấy phao, bắt đầu theo dõi chuyển động...')
                startSmartHookWatcher()
              } else if (attempts < maxAttempts) {
                console.log(`⚠️ Không thấy phao, thử lại... (${attempts}/${maxAttempts})`)
                setTimeout(findHook, 500) // Thử lại sau 0.5 giây
              } else {
                console.log('❌ Không thể tìm thấy phao sau nhiều lần thử, thả cần lại')
                isFishing = false
              }
            }
            findHook()
          }, 4000) // Đợi 4 giây như yêu cầu trước khi theo dõi

        } else {
          bot.chat('🥺 Không tìm thấy nước gần! Cần tìm ao, sông hoặc biển~')
          stopSmartAutoFishing()
        }

      } catch (error) {
        console.log('❌ Lỗi smart fishing:', error)
        bot.chat('😵 Có lỗi khi câu cá! Thử lại sau~')
        isFishing = false
      }
    }, 6000) // Kiểm tra mỗi 6 giây
  }

  // Alias để tương thích với code cũ
  function startAutoFishing() {
    return startSmartAutoFishing()
  }

  // Hàm theo dõi fishing hook metadata - ƯU TIÊN SỐ 1
  let lastHookMetadata: any = null

  // Hệ thống phát hiện cá cắn thông minh - FIXED VERSION
  let fishingIndicators = {
    particleCount: 0,
    velocityDetections: 0,
    positionChanges: 0,
    strongMovements: 0,
    lastResetTime: Date.now()
  }

  function startSmartHookWatcher() {
    if (hookCheckInterval) {
      clearInterval(hookCheckInterval)
    }

    fishingStartTime = Date.now()
    hasFishBitten = false
    lastHookPosition = currentHook.position ? { ...currentHook.position } : null

    // Reset indicators khi bắt đầu fishing mới
    fishingIndicators = {
      particleCount: 0,
      velocityDetections: 0,
      positionChanges: 0,
      strongMovements: 0,
      lastResetTime: Date.now()
    }

    console.log('🎣 Bắt đầu smart hook watcher, đợi 6 giây trước khi phát hiện...')

    hookCheckInterval = setInterval(() => {
      if (!autoFishingActive || !isFishing || hasFishBitten) {
        if (hookCheckInterval) {
          clearInterval(hookCheckInterval)
          hookCheckInterval = null
        }
        return
      }

      const currentTime = Date.now()
      const fishingDuration = currentTime - fishingStartTime

      // Tìm hook entity hiện tại
      const hookEntity = Object.values(bot.entities).find(entity =>
        entity.id === currentHook.id &&
        (entity.name === 'fishing_bobber' || entity.name === 'fishing_hook')
      )

      if (!hookEntity) {
        // Hook biến mất = đã câu được cá (chỉ sau 6 giây)
        if (fishingDuration > 6000) {
          console.log('🐟 PHAO BIẾN MẤT - ĐÃ CÂU ĐƯỢC CÁ!')
          hasFishBitten = true
          handleSmartFishCaught()
        }
        return
      }

      // CHỈ BẮT ĐẦU PHÁT HIỆN SAU 6 GIÂY ĐỂ TRÁNH GIẬT CẦN SỚM
      if (fishingDuration < 6000) {
        // Cập nhật vị trí để chuẩn bị
        if (hookEntity.position) {
          lastHookPosition = { ...hookEntity.position }
        }
        return
      }

      // PHƯƠNG PHÁP 1: Theo dõi chuyển động Y (phao bị kéo xuống)
      if (hookEntity.position && lastHookPosition) {
        const yChange = lastHookPosition.y - hookEntity.position.y // Dương = phao chìm xuống
        const distanceMoved = Math.sqrt(
          (hookEntity.position.x - lastHookPosition.x) ** 2 +
          (hookEntity.position.y - lastHookPosition.y) ** 2 +
          (hookEntity.position.z - lastHookPosition.z) ** 2
        )

        // Log debug mỗi 2 giây (bớt spam)
        if (fishingDuration % 2000 < 100) {
          console.log(`🎣 DEBUG: Y: ${yChange.toFixed(3)}, Dist: ${distanceMoved.toFixed(3)}, Time: ${(fishingDuration/1000).toFixed(1)}s, Sounds: ${bobberThrowCount}`)
        }

        // ĐẾM CÁC DẤU HIỆU CÁ CẮN (chỉ sau 6 giây) - THÔNG SỐ TỐI ƯU

        // ĐIỀU KIỆN 1: Âm thanh fishing_bobber.throw lần 2 + chuyển động thật (ngưỡng cá cắn)
        if (bobberThrowCount >= 2 && (yChange > 0.25 || distanceMoved > 0.25)) {
          console.log(`🐟 ÂM THANH LẦN 2 + CÁ CẮN THẬT! Y: ${yChange.toFixed(3)}, D: ${distanceMoved.toFixed(3)}`)
          handleSmartFishCaught()
          return
        }

        // ĐIỀU KIỆN 2: Chuyển động cực mạnh (chắc chắn có cá) - Ngưỡng gần như chắc chắn
        if (yChange > 0.40 || distanceMoved > 0.40) {
          console.log(`🐟 CHUYỂN ĐỘNG CỰC MẠNH! Y: ${yChange.toFixed(3)}, Distance: ${distanceMoved.toFixed(3)}`)
          handleSmartFishCaught()
          return
        }
      }

      // PHƯƠNG PHÁP 2: Velocity detection - THÔNG SỐ TỐI ƯU
      if (hookEntity.velocity && fishingDuration > 6000) {
        const velocityMagnitude = Math.sqrt(
          hookEntity.velocity.x ** 2 +
          hookEntity.velocity.y ** 2 +
          hookEntity.velocity.z ** 2
        )

        // Chỉ đếm velocity trên ngưỡng nhiễu (>0.05)
        if (velocityMagnitude > 0.05) {
          fishingIndicators.velocityDetections++
        }

        // Velocity cá cắn + âm thanh (ngưỡng tối ưu >0.25)
        if (velocityMagnitude > 0.25 && bobberThrowCount >= 2) {
          console.log(`🐟 VELOCITY CÁ CẮN + ÂM THANH! V: ${velocityMagnitude.toFixed(3)}`)
          handleSmartFishCaught()
          return
        }

        // Velocity gần như chắc chắn (>0.40)
        if (velocityMagnitude > 0.40) {
          console.log(`🐟 VELOCITY CHẮC CHẮN! V: ${velocityMagnitude.toFixed(3)}`)
          handleSmartFishCaught()
          return
        }
      }

      // Cập nhật vị trí cuối của phao
      if (hookEntity.position) {
        lastHookPosition = { ...hookEntity.position }
      }

      // HỆ THỐNG DỰ PHÒNG - CHỈ KÍCH HOẠT MUỘN HƠN
      const totalIndicators = fishingIndicators.particleCount + fishingIndicators.velocityDetections + fishingIndicators.positionChanges

      // DỰ PHÒNG 1: Sau 10 giây + nhiều dấu hiệu mạnh
      if (fishingDuration > 10000 && fishingIndicators.strongMovements >= 5) {
        console.log(`🐟 DỰ PHÒNG (10s): Strong movements: ${fishingIndicators.strongMovements}`)
        handleSmartFishCaught()
        return
      }

      // DỰ PHÒNG 2: Sau 15 giây + có dấu hiệu + âm thanh
      if (fishingDuration > 15000 && totalIndicators >= 10 && bobberThrowCount >= 1) {
        console.log(`🐟 DỰ PHÒNG (15s): Total: ${totalIndicators}, Sounds: ${bobberThrowCount}`)
        handleSmartFishCaught()
        return
      }

      // Timeout sau 25 giây (giảm từ 30 giây)
      if (fishingDuration > 25000) {
        console.log('⏰ Timeout 25s - rút cần và thả lại')
        try {
          bot.activateItem()
          console.log('🎣 Đã rút cần timeout')
        } catch (error) {
          console.log('❌ Lỗi rút cần timeout:', error)
        }
        isFishing = false
        currentHook = null
        bobberThrowCount = 0
        setTimeout(() => {
          if (autoFishingActive && !isFishing) {
            console.log('🎣 Thả cần mới sau timeout...')
          }
        }, 1000)
      }

    }, 100) // Tăng interval từ 30ms lên 100ms để giảm load
  }

  // Setup fishing event listeners để backup detection
  function setupFishingEventListeners() {
    console.log('🎣 Setting up fishing event listeners...')

    // Clear tất cả sound listeners cũ trước khi thêm mới
    bot.removeAllListeners('soundEffectHeard')
    bot.removeAllListeners('particle')
    console.log('🧹 Đã xóa tất cả sound listeners cũ')

    // Listen for sound effects
    const soundListener = (sound: any, position: any) => {
      if (!autoFishingActive || !isFishing || hasFishBitten) return

      const fishingDuration = Date.now() - fishingStartTime
      if (fishingDuration < 4000) return // Chỉ listen sau 4 giây

      // Console để debug âm thanh (nhưng không log fishing_bobber.throw để giảm spam)
      if (!sound.includes('entity.fishing_bobber.throw') &&
          !sound.includes('.step') &&
          !sound.includes('.converted') &&
          !sound.includes('.aggro')) {
        console.log(`🔊 Heard sound: ${sound}, position:`, position)
      }

      // Đếm số lần âm thanh fishing_bobber.throw xuất hiện
      if (sound.includes('entity.fishing_bobber.throw')) {
        bobberThrowCount++
        console.log(`🎣 Âm thanh fishing_bobber.throw lần ${bobberThrowCount}`)

        // Chỉ rút cần khi âm thanh này xuất hiện lần thứ 2 (cá cắn thật)
        if (bobberThrowCount === 2) {
          console.log('🐟 SOUND DETECTION - CÁ CẮN THẬT! (Lần 2)')
          handleSmartFishCaught()
        }
        return // Thoát khỏi function sau khi xử lý
      }

      // Bỏ qua các âm thanh khác không liên quan
      if (sound.includes('entity.fishing_bobber.retrieve') ||
          sound.includes('.step') ||
          sound.includes('.aggro') ||
          sound.includes('.converted') ||
          sound.includes('.break')) {
        return
      }

      // Phương pháp dự phòng: Chỉ phát hiện âm thanh water splash thực sự từ cá cắn
      if (sound && (sound.includes('entity.generic.splash') ||
                   sound.includes('block.water.ambient') ||
                   sound.includes('entity.bobber.splash'))) {
        console.log('🐟 BACKUP SOUND DETECTION - CÁ CẮN!')
        handleSmartFishCaught()
      }
    }

    // Listen for particles near fishing hook - CHỈ ĐỂ THEO DÕI, KHÔNG RÚT CẦN
    const particleListener = (particle: any) => {
      if (!autoFishingActive || !isFishing || hasFishBitten) return
      if (!currentHook) return

      const fishingDuration = Date.now() - fishingStartTime
      if (fishingDuration < 4000) return

      // Check if particle is near fishing hook
      if (particle.position && currentHook.position) {
        const distance = Math.sqrt(
          (particle.position.x - currentHook.position.x) ** 2 +
          (particle.position.y - currentHook.position.y) ** 2 +
          (particle.position.z - currentHook.position.z) ** 2
        )

        if (distance < 3) {
          // CHỈ LOG ĐỂ THEO DÕI - KHÔNG RÚT CẦN
          if (particle.name && (particle.name.includes('splash') || particle.name.includes('fishing'))) {
            console.log(`🌊 Particle ${particle.name} gần phao (${distance.toFixed(2)}m) - chờ âm thanh...`)
          }
        }
      }
    }

    // Thêm listeners
    bot.on('soundEffectHeard', soundListener)
    bot.on('particle', particleListener)

    // Lưu references để cleanup sau này (sẽ được cleanup trong stopSmartAutoFishing)
    // Listeners sẽ được remove bằng removeAllListeners khi setup lại
  }

  function handleSmartFishCaught() {
    if (!isFishing) return
    if (hasFishBitten) return // Tránh xử lý trùng lặp

    hasFishBitten = true

    // Dừng timer theo dõi ngay lập tức
    if (hookCheckInterval) {
      clearInterval(hookCheckInterval)
      hookCheckInterval = null
    }

    console.log('🎣 Phát hiện cá cắn! Đang rút cần...')

    // Rút cần NGAY LẬP TỨC - không delay, không chat spam
    try {
      // Đảm bảo bot đang cầm cần câu
      const fishingRod = bot.inventory.items().find(item => item.name.includes('fishing_rod'))
      if (fishingRod && (!bot.heldItem || !bot.heldItem.name.includes('fishing_rod'))) {
        bot.equip(fishingRod, 'hand').then(() => {
          // Rút cần sau khi trang bị
          bot.activateItem()
          console.log('🎣 Đã rút cần sau khi trang bị!')
          // Chat chỉ 1 lần khi thành công
          bot.chat('🎣 Câu thành công! ✨')
        }).catch(err => {
          console.log('Lỗi trang bị cần khi rút:', err)
          bot.activateItem() // Thử rút dù sao
          bot.chat('🎣 Câu thành công! ✨')
        })
      } else {
        // Đã cầm cần câu rồi, rút ngay
        bot.activateItem()
        console.log('🎣 Đã rút cần!')
        // Chat chỉ 1 lần khi thành công
        bot.chat('🎣 Câu thành công! ✨')
      }
    } catch (error) {
      console.log('❌ Lỗi khi rút cần:', error)
      // Thử rút lần nữa
      setTimeout(() => {
        try {
          bot.activateItem()
          console.log('🎣 Thử rút cần lần 2')
          bot.chat('🎣 Câu thành công! ✨')
        } catch (e) {
          console.log('❌ Không thể rút cần:', e)
        }
      }, 200)
    }

    // Reset trạng thái
    isFishing = false
    currentHook = null
    lastHookPosition = null
    bobberThrowCount = 0 // Reset đếm âm thanh fishing_bobber.throw cho lần câu tiếp theo

    // Reset để câu tiếp - không có chat thêm
    setTimeout(() => {
      hasFishBitten = false
      fishingStartTime = 0
      lastHookPosition = null
      console.log('🎣 Sẵn sàng câu tiếp...')
    }, 1000)
  }

  // Alias để tương thích với code cũ
  function handleFishCaught() {
    return handleSmartFishCaught()
  }

  stopSmartAutoFishing = function() {
    autoFishingActive = false
    autoItemCollectionDisabled = false  // Bật lại nhặt đồ
    autoEquipDisabled = false           // Bật lại tự động trang bị

    isFishing = false
    hasFishBitten = false
    bobberThrowCount = 0 // Reset đếm âm thanh fishing_bobber.throw

    if (fishingInterval) {
      clearInterval(fishingInterval)
      fishingInterval = null
    }

    if (hookCheckInterval) {
      clearInterval(hookCheckInterval)
      hookCheckInterval = null
    }

    currentHook = null
    lastHookPosition = null

    // Chỉ chat khi được gọi trực tiếp, không chat khi dừng tất cả
    if (!arguments[0]) { // Không có parameter silent
      bot.chat('🎣 Dừng auto câu! Các chức năng khác hoạt động lại~')
    }
    console.log('⏹️ Smart Auto Fishing - Deactivated')
    console.log('✅ Auto item collection: Enabled')
    console.log('✅ Auto equipment: Enabled')
  }

  // Alias để tương thích với code cũ
  function stopAutoFishing() {
    return stopSmartAutoFishing()
  }

  // ------------------ AUTO MINING REMOVED ------------------
  // Chức năng auto mining đã được loại bỏ hoàn toàn

  // ------------------ AUTO CHEST HUNTING REMOVED ------------------
  // Chức năng auto tìm rương đã được xóa bỏ hoàn toàn

  // ------------------ SMART AUTO BUILD - PHIÊN BÊN MỚI ------------------
  let autoBuildActive = false
  let currentBuildProject: any = null
  let buildProgress = 0

  // Danh sách thiết kế có sẵn tối ưu
  const quickBuilds: { [key: string]: any } = {
    'nhà nhỏ': {
      name: 'Ngôi nhà nhỏ xinh',
      size: '7x7x4',
      blocks: [
        // Y=0: Nền
        [
          ['oak_planks','oak_planks','oak_planks','oak_planks','oak_planks','oak_planks','oak_planks'],
          ['oak_planks','oak_planks','oak_planks','oak_planks','oak_planks','oak_planks','oak_planks'],
          ['oak_planks','oak_planks','oak_planks','oak_planks','oak_planks','oak_planks','oak_planks'],
          ['oak_planks','oak_planks','oak_planks','oak_planks','oak_planks','oak_planks','oak_planks'],
          ['oak_planks','oak_planks','oak_planks','oak_planks','oak_planks','oak_planks','oak_planks'],
          ['oak_planks','oak_planks','oak_planks','oak_planks','oak_planks','oak_planks','oak_planks'],
          ['oak_planks','oak_planks','oak_planks','oak_planks','oak_planks','oak_planks','oak_planks']
        ],
        // Y=1: Tường
        [
          ['oak_logs','oak_logs','oak_logs','oak_logs','oak_logs','oak_logs','oak_logs'],
          ['oak_logs','air','air','air','air','air','oak_logs'],
          ['oak_logs','air','air','air','air','air','oak_logs'],
          ['oak_logs','oak_door','air','air','air','air','oak_logs'],
          ['oak_logs','air','air','air','air','air','oak_logs'],
          ['oak_logs','air','air','air','air','air','oak_logs'],
          ['oak_logs','oak_logs','oak_logs','oak_logs','oak_logs','oak_logs','oak_logs']
        ],
        // Y=2: Tường + cửa sổ
        [
          ['oak_logs','oak_logs','oak_logs','oak_logs','oak_logs','oak_logs','oak_logs'],
          ['oak_logs','air','air','air','air','air','oak_logs'],
          ['oak_logs','air','air','air','air','air','oak_logs'],
          ['oak_logs','glass','air','air','air','glass','oak_logs'],
          ['oak_logs','air','air','air','air','air','oak_logs'],
          ['oak_logs','air','air','air','air','air','oak_logs'],
          ['oak_logs','oak_logs','oak_logs','oak_logs','oak_logs','oak_logs','oak_logs']
        ],
        // Y=3: Mái
        [
          ['air','oak_planks','oak_planks','oak_planks','oak_planks','oak_planks','air'],
          ['oak_planks','oak_planks','oak_planks','oak_planks','oak_planks','oak_planks','oak_planks'],
          ['oak_planks','oak_planks','oak_planks','oak_planks','oak_planks','oak_planks','oak_planks'],
          ['oak_planks','oak_planks','oak_planks','oak_planks','oak_planks','oak_planks','oak_planks'],
          ['oak_planks','oak_planks','oak_planks','oak_planks','oak_planks','oak_planks','oak_planks'],
          ['oak_planks','oak_planks','oak_planks','oak_planks','oak_planks','oak_planks','oak_planks'],
          ['air','oak_planks','oak_planks','oak_planks','oak_planks','oak_planks','air']
        ]
      ],
      materials: { 'oak_planks': 40, 'oak_logs': 30, 'oak_door': 1, 'glass': 2 }
    },

    'tháp nhỏ': {
      name: 'Tháp quan sát',
      size: '5x5x8',
      blocks: Array.from({length: 8}, (_, y) => {
        if (y === 0) {
          // Nền
          return Array.from({length: 5}, () => Array(5).fill('stone_bricks'))
        } else if (y < 7) {
          // Tường tháp
          const layer = Array.from({length: 5}, () => Array(5).fill('air'))
          for (let x = 0; x < 5; x++) {
            layer[0][x] = 'stone_bricks'
            layer[4][x] = 'stone_bricks'
            layer[x][0] = 'stone_bricks'
            layer[x][4] = 'stone_bricks'
          }
          // Cửa ở tầng 1
          if (y === 1) layer[2][0] = 'oak_door'
          // Cửa sổ
          if (y === 3 || y === 5) {
            layer[0][2] = 'glass'
            layer[4][2] = 'glass'
            layer[2][0] = 'glass'
            layer[2][4] = 'glass'
          }
          return layer
        } else {
          // Mái tháp
          return Array.from({length: 5}, () => Array(5).fill('dark_oak_planks'))
        }
      }),
      materials: { 'stone_bricks': 60, 'dark_oak_planks': 25, 'oak_door': 1, 'glass': 8 }
    },

    'cầu': {
      name: 'Cây cầu gỗ',
      size: '15x3x2',
      blocks: [
        // Y=0: Nền cầu
        Array.from({length: 3}, () => Array.from({length: 15}, () => 'oak_planks')),
        // Y=1: Lan can
        Array.from({length: 3}, (x) =>
          Array.from({length: 15}, (z) => {
            if (x === 0 || x === 2) return 'oak_fence'
            return 'air'
          })
        )
      ],
      materials: { 'oak_planks': 45, 'oak_fence': 30 }
    }
  }

  startSmartAutoBuild = async function(buildType: string) {
    if (autoBuildActive) {
      bot.chat('🏗️ Đang xây công trình khác rồi!')
      return
    }

    // Dừng các hoạt động khác
    stopFollowing()
    stopProtecting()
    if (autoFishingActive) stopAutoFishing()
    autoFarmActive = false

    const lowerType = buildType.toLowerCase()
    let selectedBuild = null

    // KIỂM TRA CHẾĐỘ SÁNG TẠO AI
    if (lowerType.includes('tự do') || lowerType.includes('sáng tạo') || lowerType.includes('ai')) {
      bot.chat('🤖 Chế độ AI sáng tạo! Tớ sẽ thiết kế theo ý tưởng của cậu!')

      // Lấy mô tả từ lệnh
      const description = buildType.replace(/tự do|sáng tạo|ai/gi, '').trim()

      if (!description) {
        bot.chat('🤔 Cậu muốn tớ thiết kế gì? VD: "auto xây tự do lâu đài nhỏ"')
        return
      }

      // Tạo thiết kế AI dựa trên mô tả
      selectedBuild = await generateAIBuildDesign(description)

      if (!selectedBuild) {
        bot.chat('😵 Tớ không thể thiết kế theo ý tưởng đó, thử mô tả khác nhé!')
        return
      }
    } else {
      // Tìm thiết kế có sẵn
      for (const [key, build] of Object.entries(quickBuilds)) {
        if (lowerType.includes(key) || key.includes(lowerType)) {
          selectedBuild = build
          break
        }
      }

      if (!selectedBuild) {
        bot.chat('🤔 Tớ chưa biết xây loại đó. Thử: nhà nhỏ, tháp nhỏ, cầu')
        bot.chat('🔧 Hoặc dùng "auto xây tự do [mô tả]" để AI thiết kế!')
        return
      }
    }

    autoBuildActive = true
    currentBuildProject = selectedBuild
    buildProgress = 0

    bot.chat(`🏗️ Bắt đầu xây ${selectedBuild.name}!`)
    bot.chat(`📏 Kích thước: ${selectedBuild.size}`)

    try {
      // Chuẩn bị materials
      await prepareSmartBuildMaterials(selectedBuild.materials)

      // Bắt đầu xây
      const buildPos = {
        x: Math.floor(bot.entity.position.x + 3),
        y: Math.floor(bot.entity.position.y),
        z: Math.floor(bot.entity.position.z + 3)
      }

      await executeSmartBuild(selectedBuild.blocks, buildPos)

    } catch (error) {
      console.log('❌ Lỗi smart auto build:', error)
      bot.chat('😵 Có lỗi khi xây! Thử lại nhé!')
      autoBuildActive = false
    }
  }

  // HÀM AI SÁNG TẠO THIẾT KẾ XÂY DỰNG
  async function generateAIBuildDesign(description: string): Promise<any | null> {
    try {
      bot.chat(`🧠 AI đang thiết kế "${description}"... Chờ tí nhé!`)
      console.log(`🤖 AI Creative Build: Designing "${description}"`)

      // Phân tích mô tả để tạo thiết kế thông minh
      let buildCategory = 'house'
      let sizeMultiplier = 1
      let height = 4
      let width = 7
      let length = 7

      if (description.toLowerCase().includes('lâu đài') || description.toLowerCase().includes('castle')) {
        buildCategory = 'castle'
        sizeMultiplier = 2
        height = 8
        width = 12
        length = 12
      } else if (description.toLowerCase().includes('tháp') || description.toLowerCase().includes('tower')) {
        buildCategory = 'tower'
        height = 10
        width = 5
        length = 5
      } else if (description.toLowerCase().includes('cầu') || description.toLowerCase().includes('bridge')) {
        buildCategory = 'bridge'
        height = 2
        width = 3
        length = 15
      } else if (description.toLowerCase().includes('nhà thờ') || description.toLowerCase().includes('church')) {
        buildCategory = 'church'
        height = 6
        width = 9
        length = 12
      } else if (description.toLowerCase().includes('kho') || description.toLowerCase().includes('warehouse')) {
        buildCategory = 'warehouse'
        height = 4
        width = 10
        length = 15
      }

      //Xác định kích thước
      if (description.toLowerCase().includes('nhỏ') || description.toLowerCase().includes('mini')) {
        sizeMultiplier = 0.7
      } else if (description.toLowerCase().includes('lớn') || description.toLowerCase().includes('big') || description.toLowerCase().includes('khổng lồ')) {
        sizeMultiplier = 1.5
      }

      width = Math.floor(width * sizeMultiplier)
      length = Math.floor(length * sizeMultiplier)
      height = Math.floor(height * sizeMultiplier)

      // Chọn vật liệu dựa trên mô tả
      let primaryMaterial = 'oak_planks'
      let secondaryMaterial = 'oak_logs'
      let roofMaterial = 'dark_oak_planks'

      if (description.toLowerCase().includes('đá') || description.toLowerCase().includes('stone')) {
        primaryMaterial = 'stone_bricks'
        secondaryMaterial = 'stone'
        roofMaterial = 'stone_brick_stairs'
      } else if (description.toLowerCase().includes('gỗ') || description.toLowerCase().includes('wood')) {
        primaryMaterial = 'oak_planks'
        secondaryMaterial = 'oak_logs'
      } else if (description.toLowerCase().includes('gạch') || description.toLowerCase().includes('brick')) {
        primaryMaterial = 'bricks'
        secondaryMaterial = 'stone_bricks'
      }

      // TẠO THIẾT KẾ THÔNG MINH
      const blocks = generateSmartStructure(buildCategory, width, length, height, primaryMaterial, secondaryMaterial, roofMaterial)

      // Tính toán vật liệu cần thiết
      const materials = calculateMaterials(blocks, primaryMaterial, secondaryMaterial, roofMaterial)

      const aiDesign = {
        name: `${description} (AI thiết kế)`,
        size: `${width}x${length}x${height}`,
        blocks: blocks,
        materials: materials,
        isAIGenerated: true
      }

      bot.chat(`✨ AI đã thiết kế xong! Kích thước: ${width}x${length}x${height}`)
      console.log(`🤖 AI Design complete: ${width}x${length}x${height}`)

      return aiDesign

    } catch (error) {
      console.log('❌ Lỗi AI creative build:', error)
      bot.chat('😵 AI gặp lỗi khi thiết kế, dùng mẫu có sẵn nhé!')
      return quickBuilds['nhà nhỏ'] // Fallback
    }
  }

  // HÀM TẠO CẤU TRÚC THÔNG MINH
  function generateSmartStructure(category: string, width: number, length: number, height: number, primary: string, secondary: string, roof: string): any[] {
    const blocks: any[] = []

    for (let y = 0; y < height; y++) {
      const layer: any[][] = []

      for (let x = 0; x < width; x++) {
        const row: any[] = []

        for (let z = 0; z < length; z++) {
          let blockType = 'air'

          if (y === 0) {
            // Nền
            blockType = primary
          } else if (y === height - 1) {
            // Mái
            if (category === 'castle') {
              blockType = x === 0 || x === width-1 || z === 0 || z === length-1 ? secondary : 'air'
            } else {
              blockType = roof
            }
          } else {
            // Tường
            if (x === 0 || x === width-1 || z === 0 || z === length-1) {
              blockType = secondary

              // Cửa ở tầng 1
              if (y === 1 && x === Math.floor(width/2) && z === 0) {
                blockType = 'oak_door'
              }

              // Cửa sổ ở tầng 2+
              if (y >= 2 && ((x === 0 || x === width-1) && z % 3 === 1) ||
                           ((z === 0 || z === length-1) && x % 3 === 1)) {
                blockType = 'glass'
              }
            } else {
              blockType = 'air'
            }
          }

          row.push(blockType)
        }
        layer.push(row)
      }
      blocks.push(layer)
    }

    return blocks
  }

  // HÀM TÍNH TOÁN VẬT LIỆU
  function calculateMaterials(blocks: any[], primary: string, secondary: string, roof: string): {[key: string]: number} {
    const materials: {[key: string]: number} = {}

    for (const layer of blocks) {
      for (const row of layer) {
        for (const block of row) {
          if (block !== 'air') {
            materials[block] = (materials[block] || 0) + 1
          }
        }
      }
    }

    // Làm tròn lên và thêm 20% buffer
    Object.keys(materials).forEach(material => {
      materials[material] = Math.ceil(materials[material] * 1.2)
    })

    return materials
  }

  async function prepareSmartBuildMaterials(materials: {[key: string]: number}) {
    bot.chat('📦 Chuẩn bị vật liệu xây dựng...')

    // Material mapping để convert tên
    const materialMap: {[key: string]: string} = {
      'oak_logs': 'oak_log',
      'oak_planks': 'oak_planks',
      'stone_bricks': 'stone_bricks',
      'dark_oak_planks': 'dark_oak_planks',
      'oak_door': 'oak_door',
      'oak_fence': 'oak_fence',
      'glass': 'glass'
    }

    for (const [material, amount] of Object.entries(materials)) {
      const mcItem = materialMap[material] || material
      const stacks = Math.ceil(amount / 64)

      for (let i = 0; i < stacks; i++) {
        bot.chat(`/give ${bot.username} ${mcItem} 64`)
        await new Promise(resolve => setTimeout(resolve, 50))
      }
    }

    bot.chat('✅ Đã chuẩn bị xong vật liệu!')
  }

  async function executeSmartBuild(blocks: any[], buildPos: {x: number, y: number, z: number}) {
    let totalBlocks = 0
    let placedBlocks = 0

    // Đếm tổng số blocks
    for (const layer of blocks) {
      for (const row of layer) {
        for (const block of row) {
          if (block !== 'air') totalBlocks++
        }
      }
    }

    bot.chat(`🔨 Bắt đầu xây ${totalBlocks} blocks!`)

    for (let y = 0; y < blocks.length; y++) {
      const layer = blocks[y]

      for (let x = 0; x < layer.length; x++) {
        const row = layer[x]

        for (let z = 0; z < row.length; z++) {
          const blockType = row[z]

          if (blockType === 'air' || !autoBuildActive) continue

          const pos = {
            x: buildPos.x + x,
            y: buildPos.y + y,
            z: buildPos.z + z
          }

          try {
            // Kiểm tra và xử lý block cũ
            const existingBlock = bot.blockAt(new Vec3(pos.x, pos.y, pos.z))
            if (existingBlock && existingBlock.name !== 'air') {
              console.log(`🔨 Đào block cũ ${existingBlock.name} tại ${pos.x},${pos.y},${pos.z}`)

              // Đào block cũ trước khi đặt block mới
              try {
                await bot.dig(existingBlock)
                console.log(`✅ Đã đào xong ${existingBlock.name}`)
                await new Promise(resolve => setTimeout(resolve, 300))
              } catch (digError) {
                console.log(`❌ Không thể đào ${existingBlock.name}, bỏ qua vị trí này`)
                continue
              }
            }

            // Di chuyển đến gần vị trí với timeout ngắn hơn
            const distance = bot.entity.position.distanceTo(new Vec3(pos.x, pos.y, pos.z))
            if (distance > 4) {
              const goal = new goals.GoalNear(pos.x, pos.y, pos.z, 2)
              bot.pathfinder.setGoal(goal)
              await new Promise(resolve => setTimeout(resolve, 800))
            }

            // Tìm và trang bị block
            const itemMap: {[key: string]: string} = {
              'oak_logs': 'oak_log',
              'oak_planks': 'oak_planks',
              'stone_bricks': 'stone_bricks',
              'dark_oak_planks': 'dark_oak_planks',
              'oak_door': 'oak_door',
              'oak_fence': 'oak_fence',
              'glass': 'glass'
            }

            const itemName = itemMap[blockType] || blockType
            const item = bot.inventory.items().find(i => i.name === itemName)

            if (!item) {
              console.log(`⚠️ Không có ${itemName}`)
              continue
            }

            await bot.equip(item, 'hand')

            // Tìm vị trí đặt block tốt nhất
            const possibleTargetBlocks = [
              bot.blockAt(new Vec3(pos.x, pos.y - 1, pos.z)),     // Dưới
              bot.blockAt(new Vec3(pos.x + 1, pos.y, pos.z)),     // Bên phải
              bot.blockAt(new Vec3(pos.x - 1, pos.y, pos.z)),     // Bên trái
              bot.blockAt(new Vec3(pos.x, pos.y, pos.z + 1)),     // Phía sau
              bot.blockAt(new Vec3(pos.x, pos.y, pos.z - 1))      // Phía trước
            ].filter(block => block && block.name !== 'air')

            let placeSuccess = false

            // Thử đặt block vào các hướng khác nhau
            for (let targetBlock of possibleTargetBlocks) {
              if (!targetBlock) continue

              // Thử 3 lần cho mỗi hướng
              for (let attempt = 0; attempt < 3; attempt++) {
                try {
                  // Tính vector hướng đặt
                  const targetPos = targetBlock.position
                  const placeVector = new Vec3(
                    pos.x - targetPos.x,
                    pos.y - targetPos.y,
                    pos.z - targetPos.z
                  )

                  await Promise.race([
                    bot.placeBlock(targetBlock, placeVector),
                    new Promise((_, reject) =>
                      setTimeout(() => reject(new Error('Place timeout')), 2500)
                    )
                  ])

                  placeSuccess = true
                  console.log(`✅ Đã đặt ${blockType} tại ${pos.x},${pos.y},${pos.z}`)
                  break
                } catch (retryError) {
                  if (attempt === 0) {
                    console.log(`⚠️ Thử lại đặt ${blockType} (lần ${attempt + 1})`)
                    await new Promise(resolve => setTimeout(resolve, 400))
                  }
                }
              }

              if (placeSuccess) break // Thoát khỏi loop target blocks nếu thành công
            }

            if (placeSuccess) {
              placedBlocks++
              // Report progress mỗi 5 blocks để giảm spam
              if (placedBlocks % 5 === 0) {
                const progress = Math.round((placedBlocks / totalBlocks) * 100)
                bot.chat(`🏗️ Tiến độ: ${progress}% (${placedBlocks}/${totalBlocks})`)
              }
            } else {
              console.log(`❌ Không thể đặt ${blockType} tại ${pos.x},${pos.y},${pos.z} sau nhiều lần thử`)
            }

            // Tăng delay giữa các block để server xử lý
            await new Promise(resolve => setTimeout(resolve, 200))

          } catch (error) {
            console.log(`⚠️ Lỗi đặt ${blockType} tại ${pos.x},${pos.y},${pos.z}:`, error.message || error)
          }
        }
      }
    }

    // Kiểm tra hoàn thành thực sự
    const completionPercentage = Math.round((placedBlocks / totalBlocks) * 100)

    if(completionPercentage >= 80) {
      // Hoàn thành thành công (>=80%)
      autoBuildActive = false
      currentBuildProject = null
      bot.chat('🎉 Xây xong rồi! Đẹp không nè? ✨')
      bot.chat(`📊 Kết quả tuyệt vời: ${placedBlocks}/${totalBlocks} blocks (${completionPercentage}%)`)
      console.log('✅ Smart Auto Build completed successfully')
    } else if (completionPercentage >= 50) {
      // Hoàn thành một phần (50-79%)
      autoBuildActive = false
      currentBuildProject = null
      bot.chat('🏗️ Xây được một phần rồi! Có thể cần dọn dẹp thêm!')
      bot.chat(`📊 Kết quả: ${placedBlocks}/${totalBlocks} blocks (${completionPercentage}%)`)
      bot.chat('💡 Tip: Chọn vùng phẳng hơn để xây dựng tốt hơn!')
      console.log('⚠️ Smart Auto Build partially completed')
    } else {
      // Hoàn thành kém (<50%)
      autoBuildActive = false
      currentBuildProject = null
      bot.chat('😅 Xây không được bao nhiêu do địa hình khó!')
      bot.chat(`📊 Chỉ xây được: ${placedBlocks}/${totalBlocks} blocks (${completionPercentage}%)`)
      bot.chat('💡 Tip: Tìm vùng phẳng, không có cây cỏ để xây nhé!')
      console.log('❌ Smart Auto Build completion rate too low')
    }
  }

  async function startSmartAutoBuildWithClear(buildType: string) {
    if (autoBuildActive) {
      bot.chat('🏗️ Đang xây công trình khác rồi!')
      return
    }

    // Dừng các hoạt động khác
    stopFollowing()
    stopProtecting()
    if (autoFishingActive) stopAutoFishing()
    autoFarmActive = false

    bot.chat('🌱 Sẽ dọn phẳng khu vực trước khi xây!')
    console.log('🌱 Starting auto build with terrain clearing')

    // Tìm thiết kế
    const lowerType = buildType.toLowerCase()
    let selectedBuild = null

    for (const [key, build] of Object.entries(quickBuilds)) {
      if (lowerType.includes(key) || key.includes(lowerType)) {
        selectedBuild = build
        break
      }
    }

    if (!selectedBuild) {
      selectedBuild = quickBuilds['nhà nhỏ'] // Default
    }

    autoBuildActive = true
    currentBuildProject = selectedBuild

    //Xác định khu vực xây dựng
    const buildPos = {
      x: Math.floor(bot.entity.position.x + 3),
      y: Math.floor(bot.entity.position.y),
      z: Math.floor(bot.entity.position.z + 3)
    }

    try {
      // BƯỚC 1: Clear terrain trước
      await clearBuildTerrain(selectedBuild.blocks, buildPos)

      // BƯỚC 2: Chuẩn bị materials
      await prepareSmartBuildMaterials(selectedBuild.materials)

      // BƯỚC 3: Bắt đầu xây trên terrain đã được clear
      await executeSmartBuild(selectedBuild.blocks, buildPos)

    } catch (error) {
      console.log('❌ Lỗi smart auto build with clear:', error)
      bot.chat('😵 Có lỗi khi xây! Thử lại nhé~')
      autoBuildActive = false
    }
  }

  async function clearBuildTerrain(blocks: any[], buildPos: {x: number, y: number, z: number}) {
    bot.chat('🌿 Bắt đầu dọn dẹp địa hình...')

    // Tính toán kích thước khu vực
    const sizeX = blocks[0]?.length || 7
    const sizeZ = blocks[0]?.[0]?.length || 7
    const sizeY = blocks.length

    let clearedBlocks = 0

    // Clear từ trên xuống dưới và mở rộng 1 block xung quanh
    for (let y = buildPos.y + sizeY; y >= buildPos.y - 1; y--) {
      for (let x = buildPos.x - 1; x <= buildPos.x + sizeX; x++) {
        for (let z = buildPos.z - 1; z <= buildPos.z + sizeZ; z++) {
          if (!autoBuildActive) return // Dừng nếu bị cancel

          try {
            const blockToClear = bot.blockAt(new Vec3(x, y, z))

            if (blockToClear && blockToClear.name !== 'air' &&
                blockToClear.name !== 'bedrock' && blockToClear.name !== 'barrier') {

              // Di chuyển đến gần nếu cần
              const distance = bot.entity.position.distanceTo(new Vec3(x, y, z))
              if (distance > 4) {
                const goal = new goals.GoalNear(x, y, z, 3)
                bot.pathfinder.setGoal(goal)
                await new Promise(resolve => setTimeout(resolve, 600))
              }

              // Đào block
              await bot.dig(blockToClear)
              clearedBlocks++

              if (clearedBlocks % 10 === 0) {
                bot.chat(`🌿 Đã dọn ${clearedBlocks} blocks...`)
              }

              await new Promise(resolve => setTimeout(resolve, 150))
            }
          } catch (error) {
            // Bỏ qua lỗi clear terrain
            console.log(`⚠️ Bỏ qua block tại ${x},${y},${z}:`, error.message)
          }
        }
      }
    }

    bot.chat(`✅ Đã dọn phẳng ${clearedBlocks} blocks! Bắt đầu xây dựng!`)
    console.log(`✅ Terrain cleared: ${clearedBlocks} blocks`)
  }

  stopSmartAutoBuild = function() {
    autoBuildActive = false
    currentBuildProject = null
    buildProgress = 0
    bot.pathfinder.setGoal(null)

    // Chỉ chat khi được gọi trực tiếp
    if (!arguments[0]) { // Không có parameter silent
      bot.chat('🛑 Dừng xây!')
    }
    console.log('⏹️ Smart Auto Build - Deactivated')
  }

  // ------------------ AUTO CHEST HUNTING - NEW IMPLEMENTATION (Per User Requirements) ------------------
  // Main function to start auto chest hunting
  startAutoChestHunting = async function() {
    // 1. Kiểm tra pickaxe trước khi bắt đầu
    const hasPickaxe = bot.inventory.items().some(item => item.name.includes('pickaxe'))

    if (!hasPickaxe) {
      bot.chat('🥺 Không có pickaxe! Không thể tìm rương!')
      console.log('❌ No pickaxe found, stopping all actions')
      stopAll()
      return
    }

    // Stop other activities
    stopFollowing()
    stopProtecting()
    if (autoFishingActive) stopSmartAutoFishing()
    autoFarmActive = false
    if (autoMiningActive) stopAutoMining(true)

    autoChestHuntingActive = true
    bot.chat('📦 Bắt đầu auto tìm rương! Tớ sẽ quét trong phạm vi 200 blocks...')
    console.log('📦 Auto Chest Hunting - Activated (200 block radius)')

    // Clear existing interval if any
    if (chestHuntingInterval) clearInterval(chestHuntingInterval)

    chestHuntingInterval = setInterval(async () => {
      if (!autoChestHuntingActive) {
        clearInterval(chestHuntingInterval!)
        chestHuntingInterval = null
        return
      }

      try {
        // Execute chest hunting cycle (similar to mining cycle)
        await executeChestHuntingCycle()
      } catch (error) {
        console.log('❌ Lỗi auto chest hunting:', error)
        bot.pathfinder.setGoal(null)
      }
    }, 2000) // Kiểm tra mỗi 2 giây như yêu cầu
  }

  // Hàm thực hiện một chu kỳ tìm rương theo yêu cầu user
  async function executeChestHuntingCycle() {
    // Check if chest hunting is still active
    if (!autoChestHuntingActive) {
      console.log('⏹️ Chest hunting stopped, exiting cycle')
      return
    }

    // Bỏ qua nếu đang di chuyển đến rương
    if (isCurrentlyApproachingChest) {
      return
    }

    // Tìm block rương - sử dụng bot.findBlock() như auto mine
    const chestBlock = bot.findBlock({
      matching: (block: any) => {
        if (!block) return false
        // Chỉ tìm rương ở y < 40 theo yêu cầu user
        if (block.position.y >= 40) return false
        // Tìm các loại rương trong Minecraft
        return block.name.includes('chest') ||
               block.name.includes('barrel') ||
               block.name.includes('shulker_box')
      },
      maxDistance: 200, // Phạm vi 200 blocks theo yêu cầu user
      useExtraInfo: true,
      count: 1
    })

    if (chestBlock) {
      console.log(`📦 Tìm thấy ${chestBlock.name} tại (${chestBlock.position.x}, ${chestBlock.position.y}, ${chestBlock.position.z})`)

      // Chat tọa độ rương
      bot.chat(`📦 Tìm thấy rương tại (${chestBlock.position.x}, ${chestBlock.position.y}, ${chestBlock.position.z})!`)

      // Di chuyển đến rương sử dụng logic như auto mine
      await approachChestTarget(chestBlock)

    } else {
      console.log('🔍 Không tìm thấy rương trong phạm vi 200 blocks, khám phá thêm...')
      // Di chuyển ngẫu nhiên để tìm kiếm
      if (Math.random() < 0.3) {
        const distance = 30 + Math.random() * 20
        const angle = Math.random() * Math.PI * 2
        const currentPos = bot.entity.position

        const targetX = currentPos.x + Math.cos(angle) * distance
        const targetZ = currentPos.z + Math.sin(angle) * distance

        const movements = new Movements(bot)
        movements.canDig = true
        bot.pathfinder.setMovements(movements)

        const goal = new goals.GoalXZ(targetX, targetZ)
        bot.pathfinder.setGoal(goal)

        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
  }

  // Di chuyển đến rương sử dụng logic như auto mine
  async function approachChestTarget(chestBlock: any) {
    if (!autoChestHuntingActive) return

    try {
      isCurrentlyApproachingChest = true
      currentChestTarget = chestBlock

      const distance = bot.entity.position.distanceTo(chestBlock.position)

      // Di chuyển gần target - sử dụng logic như auto mine
      if (distance > 3) {
        console.log(`🚶 Di chuyển đến rương (${Math.round(distance)} blocks away)`)

        // Dừng pathfinding trước với error handling
        try {
          bot.pathfinder.setGoal(null)
        } catch (err) {
          // Ignore pathfinder stop errors
        }
        await new Promise(resolve => setTimeout(resolve, 200))

        // Thiết lập pathfinder với error handling
        try {
          const movements = new Movements(bot)
          movements.canDig = true
          movements.digCost = 1
          movements.allow1by1towers = true
          movements.allowParkour = true
          movements.allowSprinting = true
          movements.blocksCantBreak.clear()
          movements.blocksCantBreak.add(bot.registry.blocksByName.bedrock?.id || 0)
          movements.blocksCantBreak.add(bot.registry.blocksByName.barrier?.id || 0)
          bot.pathfinder.setMovements(movements)

          // Di chuyển đến gần rương (3 blocks)
          const goal = new goals.GoalNear(chestBlock.position.x, chestBlock.position.y, chestBlock.position.z, 3)
          bot.pathfinder.setGoal(goal)
        } catch (pathErr) {
          console.log('⚠️ Lỗi thiết lập pathfinder, bỏ qua và tiếp tục')
        }

        // Kiểm tra liên tục mỗi 2 giây nếu bot cách rương 3 blocks
        let checkCount = 0
        const maxChecks = 30 // Tối đa 60 giây (30 * 2s)

        while (autoChestHuntingActive && checkCount < maxChecks) {
          await new Promise(resolve => setTimeout(resolve, 2000)) // Kiểm tra mỗi 2 giây

          try {
            const currentDistance = bot.entity.position.distanceTo(chestBlock.position)
            console.log(`📏 Khoảng cách đến rương: ${currentDistance.toFixed(1)} blocks`)

            if (currentDistance <= 3) {
              console.log('✅ Đã đến gần rương (≤3 blocks), dừng tất cả hành động')
              bot.chat('📦 Đã đến rương rồi!')

              // Dừng tất cả hành động khi cách rương 3 blocks
              stopAll()
              return
            }
          } catch (distErr) {
            console.log('⚠️ Không thể tính khoảng cách, bỏ qua')
          }

          checkCount++
        }

        // Timeout nếu không đến được
        if (checkCount >= maxChecks) {
          console.log('⏰ Timeout khi di chuyển đến rương')
          bot.chat('🥺 Không thể đến rương!')
          stopAll()
          return
        }

      } else {
        // Đã ở gần rương rồi, dừng ngay
        console.log('✅ Đã ở gần rương (≤3 blocks)')
        bot.chat('📦 Đã đến rương rồi!')
        stopAll()
      }

    } catch (error) {
      const errorMsg = error?.message || error?.toString() || 'Unknown error'
      console.log('❌ Lỗi approach chest:', errorMsg)
      stopAll()
    } finally {
      isCurrentlyApproachingChest = false
      currentChestTarget = null

      // Đảm bảo dừng pathfinder
      try {
        bot.pathfinder.setGoal(null)
      } catch (err) {
        // Ignore cleanup errors
      }
    }
  }

  // Function to stop auto chest hunting
  stopAutoChestHunting = function() {
    console.log('⏹️ Stopping auto chest hunting...')
    autoChestHuntingActive = false
    isCurrentlyApproachingChest = false
    currentChestTarget = null

    if (chestHuntingInterval) {
      clearInterval(chestHuntingInterval)
      chestHuntingInterval = null
    }

    bot.pathfinder.setGoal(null)

    // Reset control states
    try {
      bot.setControlState('forward', false)
      bot.setControlState('back', false)
      bot.setControlState('left', false)
      bot.setControlState('right', false)
      bot.setControlState('sprint', false)
    } catch (error) {
      // Ignore control state errors
    }

    bot.chat('🛑 Dừng auto tìm rương.')
    console.log('⏹️ Auto Chest Hunting - Deactivated')
  }

  // ------------------ PVP SYSTEM - NEW IMPLEMENTATION ------------------

  // Helper: Trang bị sword tốt nhất
  async function equipBestSword(): Promise<boolean> {
    try {
      const swords = bot.inventory.items().filter(item =>
        item.name.includes('sword')
      )

      if (swords.length > 0) {
        const priority = ['netherite', 'diamond', 'iron', 'stone', 'wooden', 'wood']
        let bestSword = null

        for (const material of priority) {
          const sword = swords.find(s => s.name.includes(material))
          if (sword) {
            bestSword = sword
            break
          }
        }

        if (!bestSword) bestSword = swords[0]

        if (!bot.heldItem || bot.heldItem.name !== bestSword.name) {
          await bot.equip(bestSword, 'hand')
          console.log(`⚔️ Trang bị ${bestSword.name}`)
        }
        return true
      }
      return false
    } catch (error) {
      console.log('❌ Lỗi trang bị sword:', error?.message || error)
      return false
    }
  }

  // Helper: Check và ăn golden apple nếu có
  async function eatGoldenAppleIfAvailable(): Promise<boolean> {
    try {
      const goldenApple = bot.inventory.items().find(item =>
        item.name.includes('golden_apple')
      )

      if (goldenApple) {
        console.log('🍎 Ăn táo vàng ngay!')
        await bot.equip(goldenApple, 'hand')
        await bot.consume()
        // Trang bị lại sword
        await equipBestSword()
        return true
      }
      return false
    } catch (error) {
      console.log('⚠️ Lỗi ăn táo vàng:', error?.message || error)
      return false
    }
  }

  // Helper: Ăn thức ăn để hồi máu - với cooldown log
  async function eatFoodToHeal(): Promise<boolean> {
    try {
      const safeFood = bot.inventory.items().find(item => {
        const name = item.name.toLowerCase()
        const safeItems = [
          'bread', 'apple', 'cooked_beef', 'cooked_pork', 'cooked_chicken',
          'cooked_salmon', 'cooked_cod', 'baked_potato', 'carrot',
          'cooked_mutton', 'cookie', 'melon_slice', 'sweet_berries'
        ]
        return safeItems.some(safe => name.includes(safe))
      })

      if (safeFood) {
        // Chỉ log mỗi 5 giây để giảm spam
        const now = Date.now()
        if (!lastEatTime || now - lastEatTime > 5000) {
          console.log(`🍖 Ăn ${safeFood.name} để hồi máu`)
          lastEatTime = now
        }

        await bot.equip(safeFood, 'hand')
        await bot.consume()
        // Trang bị lại sword
        await equipBestSword()
        return true
      }
      return false
    } catch (error) {
      // Chỉ log lỗi quan trọng, bỏ qua "Food is full"
      const errorMsg = error?.message || error?.toString() || ''
      if (!errorMsg.includes('Food is full') && !errorMsg.includes('Consuming cancelled')) {
        console.log('⚠️ Lỗi ăn thức ăn:', errorMsg)
      }
      return false
    }
  }

  // Main PVP function - Standard
  startPvP = async function(targetName: string) {
    // Dừng các hoạt động khác
    stopFollowing()
    stopProtecting()
    if (autoFishingActive) stopSmartAutoFishing()
    if (autoFarmActive) stopAutoFarm()
    if (autoMiningActive) stopAutoMining(true)
    if (autoChestHuntingActive) stopAutoChestHunting()

    // Validate player name trước khi bắt đầu PVP
    const allPlayers = Object.keys(bot.players)
    console.log(`📋 Kiểm tra player "${targetName}" trong danh sách: [${allPlayers.join(', ')}]`)

    // Tìm player với nhiều phương pháp
    let validatedName = targetName

    // Phương pháp 1: Tìm chính xác
    if (!bot.players[targetName]) {
      // Phương pháp 2: Tìm không phân biệt hoa thường
      const foundName = allPlayers.find(name =>
        name.toLowerCase() === targetName.toLowerCase()
      )

      if (foundName) {
        validatedName = foundName
        console.log(`✅ Đã tìm thấy player: "${foundName}" (khớp với "${targetName}")`)
      } else {
        // Phương pháp 3: Tìm gần đúng
        const nearName = allPlayers.find(name =>
          name.toLowerCase().includes(targetName.toLowerCase()) ||
          targetName.toLowerCase().includes(name.toLowerCase())
        )

        if (nearName) {
          validatedName = nearName
          console.log(`✅ Đã tìm thấy player gần đúng: "${nearName}" (từ "${targetName}")`)
        } else {
          bot.chat(`🥺 Không tìm thấy player "${targetName}" trong server!`)
          console.log(`❌ Player "${targetName}" không tồn tại. Danh sách players: [${allPlayers.join(', ')}]`)
          return
        }
      }
    }

    pvpActive = true
    pvpTargetName = validatedName
    hasWarnedWeakPlayer = false

    bot.chat(`⚔️ Bắt đầu PVP với ${validatedName}!`)
    console.log(`⚔️ PVP Mode - Target: ${validatedName}`)

    // Trang bị sword ngay
    await equipBestSword()

    // Clear existing interval
    if (pvpInterval) clearInterval(pvpInterval)

    pvpInterval = setInterval(async () => {
      if (!pvpActive) {
        clearInterval(pvpInterval!)
        pvpInterval = null
        return
      }

      try {
        await executePvPCycle()
      } catch (error) {
        console.log('❌ Lỗi PVP cycle:', error?.message || error)
      }
    }, 500) // Check every 0.5 seconds for fast reaction
  }

  // Biến lưu tên player đã tìm thấy để tránh spam logs
  let lastFoundPlayerName = ''
  let lastPlayerSearchLog = 0

  async function executePvPCycle() {
    if (!pvpActive) return

    const now = Date.now()
    const allPlayers = Object.keys(bot.players)

    // Debug: Log danh sách players mỗi 30 giây (tăng từ 10 giây)
    if (allPlayers.length > 0 && (!lastPvpTpAttempt || now - lastPvpTpAttempt > 30000)) {
      console.log(`📋 Danh sách players trong server: [${allPlayers.join(', ')}]`)
      lastPvpTpAttempt = now
    }

    // Tìm target player với nhiều phương pháp
    let targetPlayer = bot.players[pvpTargetName]?.entity
    let foundPlayerName = ''

    // Phương pháp 1: Tìm theo tên chính xác
    if (!targetPlayer) {
      // Phương pháp 2: Tìm không phân biệt hoa thường
      const playerNames = Object.keys(bot.players)
      const foundName = playerNames.find(name =>
        name.toLowerCase() === pvpTargetName.toLowerCase()
      )

      if (foundName) {
        foundPlayerName = foundName
        targetPlayer = bot.players[foundName]?.entity
        pvpTargetName = foundName // Cập nhật tên chính xác

        // Chỉ log khi tìm thấy lần đầu hoặc sau 10 giây
        if (lastFoundPlayerName !== foundName || now - lastPlayerSearchLog > 10000) {
          console.log(`✅ Tìm thấy player: "${foundName}"`)
          lastFoundPlayerName = foundName
          lastPlayerSearchLog = now
        }
      }
    } else {
      foundPlayerName = pvpTargetName
    }

    // Phương pháp 3: Tìm theo tên gần đúng (contains)
    if (!targetPlayer) {
      const playerNames = Object.keys(bot.players)
      const foundName = playerNames.find(name =>
        name.toLowerCase().includes(pvpTargetName.toLowerCase()) ||
        pvpTargetName.toLowerCase().includes(name.toLowerCase())
      )

      if (foundName) {
        foundPlayerName = foundName
        targetPlayer = bot.players[foundName]?.entity
        pvpTargetName = foundName // Cập nhật tên chính xác

        // Chỉ log khi tìm thấy lần đầu hoặc sau 10 giây
        if (lastFoundPlayerName !== foundName || now - lastPlayerSearchLog > 10000) {
          console.log(`✅ Tìm thấy player gần đúng: "${foundName}"`)
          lastFoundPlayerName = foundName
          lastPlayerSearchLog = now
        }
      }
    }

    if (!targetPlayer || !targetPlayer.position) {
      // Chỉ log lỗi mỗi 10 giây (tăng từ 5 giây) và reset found name
      if (lastFoundPlayerName !== '' || now - lastPlayerSearchLog > 10000) {
        console.log(`⚠️ Không tìm thấy player "${pvpTargetName}" trong server`)
        lastFoundPlayerName = ''
        lastPlayerSearchLog = now
      }
      return
    }

    // Check if target is dead hoặc đang respawn - IMPROVED
    const isDead = targetPlayer.metadata?.[8] === 0 || targetPlayer.metadata?.[6] === 0
    const isRespawning = targetPlayer.position.y < 0 || !targetPlayer.isValid
    const healthLow = targetPlayer.metadata?.[9] <= 0 // Check health metadata

    if (isDead || isRespawning || healthLow) {
      // Stop pathfinder immediately to prevent chasing
      bot.pathfinder.setGoal(null)
      bot.pvp.stop()

      bot.chat(`💪 ${pvpTargetName} đã bị tớ đánh bại rồi! Tớ giỏi lắm nhỉ 😎`)
      console.log(`✅ ${pvpTargetName} đã die/respawn, dừng PVP`)
      stopPvP()
      return
    }

    const distance = bot.entity.position.distanceTo(targetPlayer.position)

    // Check máu bot
    const health = bot.health

    // Nếu có táo vàng, ăn ngay không cần bỏ chạy
    if (health < 10) {
      const hasGoldenApple = await eatGoldenAppleIfAvailable()
      if (hasGoldenApple) {
        // Silent - không log để giảm spam
        // Tiếp tục tấn công
      } else if (health < 8) {
        // Không có táo vàng và máu rất yếu, bỏ chạy - chỉ log 1 lần
        if (!lastEatTime || Date.now() - lastEatTime > 5000) {
          console.log('🏃 Máu yếu, bỏ chạy để ăn!')
          lastEatTime = Date.now()
        }

        // Di chuyển ra xa 5 blocks
        const escapeAngle = Math.atan2(
          bot.entity.position.z - targetPlayer.position.z,
          bot.entity.position.x - targetPlayer.position.x
        )
        const escapeX = bot.entity.position.x + Math.cos(escapeAngle) * 5
        const escapeZ = bot.entity.position.z + Math.sin(escapeAngle) * 5

        const movements = new Movements(bot)
        movements.allowSprinting = true
        bot.pathfinder.setMovements(movements)

        const escapeGoal = new goals.GoalNear(escapeX, bot.entity.position.y, escapeZ, 1)
        bot.pathfinder.setGoal(escapeGoal)

        // Nhảy khi bỏ chạy để nhanh hơn
        bot.setControlState('jump', true)
        bot.setControlState('sprint', true)

        await new Promise(resolve => setTimeout(resolve, 1000))

        bot.setControlState('jump', false)

        // Ăn thức ăn
        await eatFoodToHeal()

        return
      }
    }

    // Check khoảng cách
    if (distance > 20) {
      // Player chạy xa quá, check quyền OP và /tp
      if (!hasWarnedWeakPlayer || Date.now() - lastPvpTpAttempt > 10000) {
        lastPvpTpAttempt = Date.now()

        // Thử /tp
        try {
          bot.chat(`/tp ${pvpTargetName}`)
          await new Promise(resolve => setTimeout(resolve, 500))

          // Check xem có /tp thành công không
          const newDistance = bot.entity.position.distanceTo(targetPlayer.position)
          if (newDistance < distance) {
            bot.chat('Cậu không thoát được đâu❤')
            console.log('✅ Đã /tp đến target')
          } else {
            console.log('❌ Không có quyền /tp')
          }
        } catch (tpError) {
          console.log('⚠️ Lỗi khi thử /tp')
        }
      }
    } else if (distance > 12 && !hasWarnedWeakPlayer) {
      // Player bỏ chạy xa 12 blocks
      bot.chat('Sao cậu yếu thế😆')
      hasWarnedWeakPlayer = true
      console.log('😆 Đã chat "Sao cậu yếu thế"')
    }

    // Trang bị sword nếu chưa có
    if (!bot.heldItem || !bot.heldItem.name.includes('sword')) {
      await equipBestSword()
    }

    // Check shield mỗi 2 giây
    if (now - lastShieldCheck > 2000) {
      lastShieldCheck = now

      // Kiểm tra xem player có đang chặn khiên không (metadata 8 bit 0 = đang blocking)
      const isBlocking = targetPlayer.metadata?.[8] === 1 // Active hand = blocking

      if (isBlocking) {
        console.log('🛡️ Player đang chặn khiên! Vòng ra sau lưng...')
        isCirclingBehind = true

        // Tính góc để vòng ra sau lưng player
        const angleToPlayer = Math.atan2(
          targetPlayer.position.z - bot.entity.position.z,
          targetPlayer.position.x - bot.entity.position.x
        )
        // Thêm 180 độ để ra sau lưng
        const behindAngle = angleToPlayer + Math.PI
        const behindX = targetPlayer.position.x + Math.cos(behindAngle) * 2
        const behindZ = targetPlayer.position.z + Math.sin(behindAngle) * 2

        const movements = new Movements(bot)
        movements.allowSprinting = true
        movements.allowParkour = true
        bot.pathfinder.setMovements(movements)

        const behindGoal = new goals.GoalNear(behindX, targetPlayer.position.y, behindZ, 1)
        bot.pathfinder.setGoal(behindGoal, true)

        // Nhảy khi vòng ra sau
        bot.setControlState('jump', true)
        bot.setControlState('sprint', true)

        await new Promise(resolve => setTimeout(resolve, 800))
        bot.setControlState('jump', false)

        isCirclingBehind = false
      }
    }

    // Di chuyển về phía target
    if (distance > 3) {
      const movements = new Movements(bot)
      movements.allowSprinting = true
      movements.allowParkour = true
      bot.pathfinder.setMovements(movements)

      const goal = new goals.GoalFollow(targetPlayer, 2)
      bot.pathfinder.setGoal(goal, true)

      // Nhảy khi di chuyển đến mục tiêu để nhanh hơn
      bot.setControlState('jump', true)
      bot.setControlState('sprint', true)

      await new Promise(resolve => setTimeout(resolve, 300))
      bot.setControlState('jump', false)
    }

    // Tấn công với mineflayer-pvp
    try {
      bot.pvp.attack(targetPlayer)
    } catch (attackError) {
      console.log('⚠️ Lỗi tấn công:', attackError?.message || attackError)
    }
  }

  // Main PVP Pro function - With wind charge and mace - IMPROVED
  startPvPPro = async function(targetName: string) {
    // Check có wind charge và mace không - BẮT BUỘC
    // Debug: Log tất cả items trong inventory
    console.log('🔍 Checking inventory for wind charge and mace...')
    const allItems = bot.inventory.items().map(item => item.name)
    console.log('📦 Current inventory:', allItems.join(', '))

    // Tìm wind charge - hỗ trợ nhiều tên khác nhau (bao gồm custom items)
    const windChargeItem = bot.inventory.items().find(item => {
      const itemName = item.name.toLowerCase()
      const displayName = item.displayName?.toLowerCase() || ''
      // Kiểm tra nhiều biến thể tên của wind charge
      return itemName.includes('wind') ||
             itemName.includes('breeze') ||
             itemName === 'wind_charge' ||
             itemName === 'breeze_rod' ||
             displayName.includes('wind') ||
             displayName.includes('cầu gió')
    })

    // Tìm mace - hỗ trợ nhiều tên khác nhau (bao gồm custom items)
    const maceItem = bot.inventory.items().find(item => {
      const itemName = item.name.toLowerCase()
      const displayName = item.displayName?.toLowerCase() || ''
      // Kiểm tra nhiều biến thể tên của mace
      return itemName.includes('mace') ||
             itemName === 'mace' ||
             displayName.includes('mace') ||
             displayName.includes('búa')
    })

    const hasWindCharge = !!windChargeItem
    const hasMace = !!maceItem

    console.log(`✅ Wind charge found: ${hasWindCharge}${windChargeItem ? ` (${windChargeItem.name})` : ''}`)
    console.log(`✅ Mace found: ${hasMace}${maceItem ? ` (${maceItem.name})` : ''}`)

    if (!hasWindCharge || !hasMace) {
      bot.chat('🥺 Không có cầu gió hoặc búa! Không thể PVP Pro!')
      console.log('❌ Missing wind_charge or mace, stopping all actions')

      // Thông báo chi tiết về item nào thiếu
      if (!hasWindCharge) {
        bot.chat('⚠️ Thiếu: Wind Charge (Cầu gió)')
        console.log('❌ Wind charge not found in inventory')
        console.log('💡 Lưu ý: Wind Charge chỉ có trong Minecraft 1.21+. Server đang chạy 1.19.4')
        bot.chat('💡 Wind Charge chỉ có trong MC 1.21+. Cần plugin/custom item!')
      }
      if (!hasMace) {
        bot.chat('⚠️ Thiếu: Mace (Búa)')
        console.log('❌ Mace not found in inventory')
        console.log('💡 Lưu ý: Mace chỉ có trong Minecraft 1.21+. Server đang chạy 1.19.4')
        bot.chat('💡 Mace chỉ có trong MC 1.21+. Cần plugin/custom item!')
      }

      stopAll() // Dừng tất cả thay vì chuyển sang PVP thường
      return
    }

    // Dừng các hoạt động khác trước khi bắt đầu
    stopFollowing()
    stopProtecting()
    if (autoFishingActive) stopSmartAutoFishing()
    if (autoFarmActive) stopAutoFarm()
    if (autoMiningActive) stopAutoMining(true)
    if (autoChestHuntingActive) stopAutoChestHunting()
    if (pvpActive) stopPvP(true) // Dừng PVP thường nếu đang chạy

    pvpProActive = true
    pvpActive = false // Đảm bảo PVP thường bị tắt
    pvpTargetName = targetName

    bot.chat(`⚔️ Bắt đầu PVP PRO với ${targetName}! CHỈ dùng Wind Charge + Mace combo! 🔥`)
    console.log(`⚔️ PVP PRO Mode - Target: ${targetName}`)
    console.log(`✅ Wind Charge: có, Mace: có - Chỉ dùng combo`)

    // Clear existing interval
    if (pvpInterval) clearInterval(pvpInterval)

    pvpInterval = setInterval(async () => {
      if (!pvpProActive) {
        clearInterval(pvpInterval!)
        pvpInterval = null
        return
      }

      // Kiểm tra lại có đủ items không mỗi cycle
      const stillHasWindCharge = bot.inventory.items().some(item => {
        const itemName = item.name.toLowerCase()
        return itemName.includes('wind') ||
               itemName.includes('breeze') ||
               itemName === 'wind_charge' ||
               itemName === 'breeze_rod'
      })

      const stillHasMace = bot.inventory.items().some(item => {
        const itemName = item.name.toLowerCase()
        return itemName.includes('mace') || itemName === 'mace'
      })

      if (!stillHasWindCharge || !stillHasMace) {
        bot.chat('🥺 Hết cầu gió hoặc búa! Dừng PVP Pro!')
        console.log('❌ Lost wind_charge or mace, stopping PVP Pro')
        stopPvP(true)
        return
      }

      try {
        await executePvPProCycle()
      } catch (error) {
        console.log('❌ Lỗi PVP Pro cycle:', error?.message || error)
      }
    }, 800) // Tăng tốc độ check từ 1s xuống 800ms
  }

  async function executePvPProCycle() {
    if (!pvpProActive) return

    // Tìm target player với nhiều phương pháp
    let targetPlayer = bot.players[pvpTargetName]?.entity

    // Tìm player gần đúng nếu không tìm thấy chính xác
    if (!targetPlayer) {
      const allPlayers = Object.keys(bot.players)
      const foundName = allPlayers.find(name =>
        name.toLowerCase().includes(pvpTargetName.toLowerCase()) ||
        pvpTargetName.toLowerCase().includes(name.toLowerCase())
      )

      if (foundName) {
        targetPlayer = bot.players[foundName]?.entity
        pvpTargetName = foundName
      }
    }

    if (!targetPlayer || !targetPlayer.position) {
      console.log(`⚠️ Không tìm thấy ${pvpTargetName}`)
      return
    }

    // Check if target is dead - IMPROVED
    const isDead = targetPlayer.metadata?.[8] === 0 || targetPlayer.metadata?.[6] === 0
    const isRespawning = targetPlayer.position.y < 0 || !targetPlayer.isValid
    const healthLow = targetPlayer.metadata?.[9] <= 0

    if (isDead || isRespawning || healthLow) {
      // Stop pathfinder immediately to prevent chasing
      bot.pathfinder.setGoal(null)
      bot.pvp.stop()

      bot.chat(`💪 ${pvpTargetName} đã bị tớ cho bay màu với combo Wind Charge + Mace! Quá đỉnh! 🔥`)
      console.log(`✅ ${pvpTargetName} đã die, dừng PVP Pro`)
      stopPvP()
      return
    }

    const distance = bot.entity.position.distanceTo(targetPlayer.position)

    // PVP PRO: CHỈ DI CHUYỂN, KHÔNG ĐÁNH THƯỜNG
    if (distance > 4) {
      // Di chuyển về phía target - KHÔNG tấn công
      const movements = new Movements(bot)
      movements.allowSprinting = true
      movements.allowParkour = true
      movements.allowFreeMotion = true
      bot.pathfinder.setMovements(movements)

      const goal = new goals.GoalFollow(targetPlayer, 2)
      bot.pathfinder.setGoal(goal, true)

      // KHÔNG tấn công khi đang di chuyển - chỉ log
      if (distance <= 8) {
        console.log(`🏃 Đang di chuyển đến ${pvpTargetName} (${distance.toFixed(1)}m) - Chờ combo`)
      }
    } else {
      // Gần target (≤4 blocks), thực hiện CHỈ COMBO Wind Charge + Mace
      try {
        // Dừng di chuyển để thực hiện combo chính xác
        bot.pathfinder.setGoal(null)

        // 1. Kiểm tra có wind charge và mace với nhiều biến thể tên
        const windCharge = bot.inventory.items().find(item => {
          const itemName = item.name.toLowerCase()
          return itemName.includes('wind') ||
                 itemName.includes('breeze') ||
                 itemName === 'wind_charge' ||
                 itemName === 'breeze_rod'
        })

        const mace = bot.inventory.items().find(item => {
          const itemName = item.name.toLowerCase()
          return itemName.includes('mace') || itemName === 'mace'
        })

        if (!windCharge || !mace) {
          bot.chat('🥺 Hết cầu gió hoặc búa! Dừng PVP Pro!')
          console.log('❌ Missing items mid-combo, stopping')
          stopPvP(true)
          return
        }

        console.log('🎯 Bắt đầu COMBO Wind Charge + Mace!')

        // 2. Trang bị wind charge
        await bot.equip(windCharge, 'hand')
        console.log('💨 Trang bị wind charge')
        await new Promise(resolve => setTimeout(resolve, 200))

        // 3. Ném wind charge xuống đất để bay cao
        const groundPos = bot.entity.position.offset(0, -1, 0)
        await bot.lookAt(groundPos, true)
        await new Promise(resolve => setTimeout(resolve, 150))

        bot.activateItem() // Ném wind charge
        console.log('💨 Ném wind charge - BAY LÊN!')

        // 4. Đợi bay lên cao
        await new Promise(resolve => setTimeout(resolve, 600))

        // 5. Trang bị mace trong khi bay
        await bot.equip(mace, 'hand')
        console.log('🔨 Trang bị MACE trong không trung!')
        await new Promise(resolve => setTimeout(resolve, 100))

        // 6. Nhìm chính xác vào đầu target
        const targetHead = targetPlayer.position.offset(0, 1.6, 0)
        await bot.lookAt(targetHead, true)

        // 7. Đợi rơi xuống một chút
        await new Promise(resolve => setTimeout(resolve, 200))

        // 8. SPAM MACE ATTACK khi rơi xuống
        console.log('💥 BẮT ĐẦU MACE SMASH COMBO!')
        for (let i = 0; i < 5; i++) {
          try {
            bot.attack(targetPlayer)
            console.log(`💥 MACE SMASH ${i + 1}/5!`)
          } catch (attackErr) {
            // Ignore individual attack errors
          }
          await new Promise(resolve => setTimeout(resolve, 50))
        }

        bot.chat('💥💥💥 ULTRA MACE COMBO HOÀN THÀNH!')
        console.log('✅ Combo Wind Charge + Mace đã thực hiện xong')

        // 9. Cooldown trước combo tiếp theo
        await new Promise(resolve => setTimeout(resolve, 2000))

      } catch (comboError) {
        console.log('❌ Lỗi combo Wind Charge + Mace:', comboError?.message || comboError)
      }
    }
  }

  // Stop PVP function
  stopPvP = function(silent: boolean = false) {
    console.log('⏹️ Stopping PVP...')
    pvpActive = false
    pvpProActive = false
    pvpTargetName = ''
    hasWarnedWeakPlayer = false

    if (pvpInterval) {
      clearInterval(pvpInterval)
      pvpInterval = null
    }

    try {
      bot.pvp.stop()
      bot.pathfinder.setGoal(null)

      bot.setControlState('forward', false)
      bot.setControlState('back', false)
      bot.setControlState('left', false)
      bot.setControlState('right', false)
      bot.setControlState('sprint', false)
    } catch (error) {
      // Ignore cleanup errors
    }

    if (!silent) {
      bot.chat('⚔️ Dừng PVP rồi!')
    }
    console.log('⏹️ PVP - Deactivated')
  }

  // ------------------ AI Agent Handler ------------------
  async function handleAIAgentCommand(username: string, actionRequest: string) {
    if (!geminiApiKey) {
      bot.chat('🥺 Tớ chưa được cấu hình Gemini API để thực hiện AI actions!')
      return
    }

    try {
      bot.chat(`🤖 AI đang phân tích: "${actionRequest}"...`)
      console.log(`🤖 AI Agent: Processing request from ${username}: ${actionRequest}`)

      // Gọi Gemini API để phân tích hành động
      const systemPrompt = `Bạn là AI agent điều khiển bot Minecraft. Phân tích yêu cầu và trả về JSON với các hành động cụ thể.

Yêu cầu: "${actionRequest}"

Trả về JSON với format:
{
  "actions": [
    {"type": "move", "target": "tree", "distance": 10},
    {"type": "collect", "item": "oak_log", "count": 5},
    {"type": "craft", "item": "planks", "count": 20}
  ],
  "summary": "Tóm tắt ngắn gọn những gì bot sẽ làm"
}

Các loại action hợp lệ:
- move: Di chuyển đến (target: player_name, tree, water, cave, chest)
- collect: Thu thập item (item: oak_log, stone, dirt, wheat, etc.)
- dig: Đào block (block: stone, dirt, coal_ore, iron_ore, etc.)
- craft: Chế tạo (item: planks, stick, crafting_table, etc.)
- smelt: Nung (input: oak_log, iron_ore, output: charcoal, iron_ingot)
- attack: Tấn công (target: zombie, skeleton, creeper, etc.)
- follow: Theo player (player: username)
- chat: Nói (message: "Hello world")

Chỉ trả về JSON, không giải thích thêm.`

      const payload = {
        contents: [{
          parts: [{
            text: systemPrompt
          }]
        }],
        generationConfig: {
          maxOutputTokens: 300,
          temperature: 0.7
        }
      }

      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (!response.ok) {
        console.log('❌ Gemini API Error:', result)
        bot.chat('😵 Lỗi AI API! Không thể phân tích hành động!')
        return
      }

      const generatedText = result?.candidates?.[0]?.content?.parts?.[0]?.text

      if (!generatedText) {
        bot.chat('🤔 AI không thể hiểu yêu cầu này!')
        return
      }

      // Parse JSON response
      let aiPlan
      try {
        // Làm sạch response (loại bỏ markdown code blocks nếu có)
        const cleanJson = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
        aiPlan = JSON.parse(cleanJson)
      } catch (parseError) {
        console.log('❌ JSON parse error:', parseError)
        bot.chat('😵 AI trả về format không hợp lệ!')
        return
      }

      // Thông báo kế hoạch
      bot.chat(`✨ ${aiPlan.summary || 'Bắt đầu thực hiện!'}`)
      console.log('📋 AI Plan:', aiPlan)

      // Thực thi từng action
      for (let i = 0; i < aiPlan.actions.length; i++) {
        const action = aiPlan.actions[i]
        console.log(`🎯 Executing action ${i + 1}/${aiPlan.actions.length}:`, action)

        try {
          await executeAIAction(action, username)
          await new Promise(resolve => setTimeout(resolve, 1000)) // Delay giữa các action
        } catch (actionError) {
          console.log('❌ Action execution error:', actionError)
          bot.chat(`😵 Lỗi khi thực hiện: ${action.type}`)
          break
        }
      }

      bot.chat('✅ Hoàn thành tất cả AI actions!')
      console.log('✅ AI Agent: All actions completed')

    } catch (error) {
      console.log('❌ AI Agent error:', error)
      bot.chat('😵 Có lỗi khi xử lý AI command!')
    }
  }

  // Thực thi một action cụ thể từ AI plan
  async function executeAIAction(action: any, requestUsername: string) {
    const actionType = action.type?.toLowerCase()

    switch (actionType) {
      case 'move':
        await executeAIMove(action)
        break
      case 'collect':
        await executeAICollect(action)
        break
      case 'dig':
        await executeAIDig(action)
        break
      case 'craft':
        await executeAICraft(action)
        break
      case 'smelt':
        await executeAISmelt(action)
        break
      case 'attack':
        await executeAIAttack(action)
        break
      case 'follow':
        await executeAIFollow(action, requestUsername)
        break
      case 'chat':
        bot.chat(action.message || 'Hello!')
        break
      default:
        console.log(`⚠️ Unknown action type: ${actionType}`)
    }
  }

  // AI Move action
  async function executeAIMove(action: any) {
    const target = action.target?.toLowerCase()
    const distance = action.distance || 20

    bot.chat(`🚶 Đang di chuyển đến ${target}...`)

    if (target === 'tree') {
      const tree = bot.findBlock({
        matching: (block: any) => block && (block.name.includes('log') || block.name.includes('oak')),
        maxDistance: distance
      })
      if (tree) {
        await bot.pathfinder.goto(new goals.GoalNear(tree.position.x, tree.position.y, tree.position.z, 2))
        bot.chat(`✅ Đã đến cây!`)
      } else {
        bot.chat(`🥺 Không tìm thấy cây gần đây!`)
      }
    } else if (target === 'water') {
      const water = bot.findBlock({
        matching: (block: any) => block && block.name === 'water',
        maxDistance: distance
      })
      if (water) {
        await bot.pathfinder.goto(new goals.GoalNear(water.position.x, water.position.y, water.position.z, 2))
        bot.chat(`✅ Đã đến nước!`)
      } else {
        bot.chat(`🥺 Không tìm thấy nước!`)
      }
    } else {
      // Di chuyển ngẫu nhiên
      const currentPos = bot.entity.position
      const randomX = currentPos.x + (Math.random() - 0.5) * distance
      const randomZ = currentPos.z + (Math.random() - 0.5) * distance
      await bot.pathfinder.goto(new goals.GoalXZ(randomX, randomZ))
      bot.chat(`✅ Đã di chuyển!`)
    }
  }

  // AI Collect action
  async function executeAICollect(action: any) {
    const itemName = action.item?.toLowerCase()
    const count = action.count || 5

    bot.chat(`🌳 Đang thu thập ${count} ${itemName}...`)

    for (let i = 0; i < count; i++) {
      const block = bot.findBlock({
        matching: (block: any) => block && block.name.toLowerCase().includes(itemName),
        maxDistance: 32
      })

      if (block) {
        await bot.pathfinder.goto(new goals.GoalNear(block.position.x, block.position.y, block.position.z, 2))
        await bot.dig(block)
        await new Promise(resolve => setTimeout(resolve, 500))
      } else {
        bot.chat(`🥺 Chỉ thu thập được ${i}/${count} ${itemName}`)
        break
      }
    }

    bot.chat(`✅ Đã thu thập ${itemName}!`)
  }

  // AI Dig action
  async function executeAIDig(action: any) {
    const blockName = action.block?.toLowerCase()
    const count = action.count || 10

    bot.chat(`⛏️ Đang đào ${count} ${blockName}...`)

    // Trang bị pickaxe nếu cần
    if (blockName.includes('ore') || blockName.includes('stone')) {
      await equipBestPickaxe()
    }

    for (let i = 0; i < count; i++) {
      const block = bot.findBlock({
        matching: (block: any) => block && block.name.toLowerCase().includes(blockName),
        maxDistance: 32
      })

      if (block) {
        await bot.pathfinder.goto(new goals.GoalNear(block.position.x, block.position.y, block.position.z, 3))
        await bot.dig(block)
        await new Promise(resolve => setTimeout(resolve, 800))
      } else {
        bot.chat(`🥺 Chỉ đào được ${i}/${count} ${blockName}`)
        break
      }
    }

    bot.chat(`✅ Đã đào xong ${blockName}!`)
  }

  // AI Craft action
  async function executeAICraft(action: any) {
    const itemName = action.item?.toLowerCase()
    const count = action.count || 1

    bot.chat(`🔨 Đang chế tạo ${count} ${itemName}...`)

    // Placeholder - cần implement craft logic phức tạp hơn
    bot.chat(`⚠️ Craft chưa được implement đầy đủ!`)
  }

  // AI Smelt action
  async function executeAISmelt(action: any) {
    bot.chat(`🔥 Đang nung ${action.input} thành ${action.output}...`)
    bot.chat(`⚠️ Smelt chưa được implement đầy đủ!`)
  }

  // AI Attack action
  async function executeAIAttack(action: any) {
    const targetMob = action.target?.toLowerCase()

    bot.chat(`⚔️ Đang tìm và tấn công ${targetMob}...`)

    const mob = bot.nearestEntity((entity: any) => {
      if (!entity || !entity.position) return false
      const mobName = entity.name?.toLowerCase() || ''
      return mobName.includes(targetMob) && bot.entity.position.distanceTo(entity.position) < 20
    })

    if (mob) {
      await equipBestSwordForCombat()
      await bot.pathfinder.goto(new goals.GoalFollow(mob, 2))

      for (let i = 0; i < 10; i++) {
        if (mob.isValid) {
          bot.attack(mob)
          await new Promise(resolve => setTimeout(resolve, 500))
        } else {
          break
        }
      }

      bot.chat(`✅ Đã tấn công ${targetMob}!`)
    } else {
      bot.chat(`🥺 Không tìm thấy ${targetMob} gần đây!`)
    }
  }

  // AI Follow action
  async function executeAIFollow(action: any, requestUsername: string) {
    const playerName = action.player || requestUsername
    bot.chat(`👣 Đang theo ${playerName}...`)
    startFollowingPlayer(playerName)
  }

  // ------------------ Chat Commands ------------------
  bot.on('chat', async (username: string, message: string) => {
    // FAST LOG - không chờ
    console.log(`💬 [${username}]: ${message}`)

    // Bỏ qua chat từ bot, server, console và các plugin - NHANH HÚN
    if (username === bot.username ||
        username === 'server' ||
        username === 'console' ||
        username === 'Shop' ||
        username.startsWith('[') ||
        username.includes('Plugin') ||
        username.includes('System') ||
        username.includes('Admin') ||
        message.includes('plugin') ||
        message.includes('update available') ||
        message.includes('download at:') ||
        message.includes('spigotmc.org')) {
      return // NHANH - không log
    }

    // Update last command time - NHANH
    lastPlayerCommand = Date.now()
    const cleanMessage = message.toLowerCase().trim()

    // FAST COMMAND PROCESSING - xử lý ngay lập tức không chờ
    setImmediate(async () => {
      console.log(`🔍 Processing: "${cleanMessage}" từ ${username}`)

      // KIỂM TRA AI AGENT COMMAND TRƯỚC TIÊN - ƯU TIÊN CAO
      if (message.startsWith('AI ') || message.startsWith('ai ')) {
        const actionRequest = message.substring(3).trim()
        if (actionRequest) {
          await handleAIAgentCommand(username, actionRequest)
          return
        }
      }

      // Xử lý các lệnh chat - TỐI ƯU HÓA THỨ TỰ CÁC LỆNH HAY DÙNG NHẤT
      if (cleanMessage.includes('dừng') || cleanMessage.includes('stop')) {
        // LỆNH DỪNG - ƯU TIÊN CAO NHẤT
        stopAll()
        return
      } else if (cleanMessage.startsWith('auto xây ')) {
        // LỆNH AUTO XÂY - THỨ TỰ CAO
        // Lấy loại công trình từ lệnh
        const buildType = message.substring(9).trim() // Lấy phần sau "auto xây "
        if (buildType) {
          // Kiểm tra có lệnh "phẳng" để clear terrain trước
          if (buildType.includes('phẳng') || buildType.includes('clear')) {
            const realBuildType = buildType.replace(/phẳng|clear/g, '').trim()
            autoBuildManager.startSmartAutoBuild(realBuildType || 'nhà nhỏ')
          } else {
            autoBuildManager.startSmartAutoBuild(buildType)
          }
        } else {
          bot.chat('🏠 Các loại công trình có sẵn:')
          bot.chat('🏘️ Nhà nhỏ: auto xây nhà nhỏ')
          bot.chat('🗼 Tháp: auto xây tháp nhỏ')
          bot.chat('🌉 Cầu: auto xây cầu')
          bot.chat('🌱 Dọn phẳng: auto xây phẳng [loại]')
          bot.chat('✨ Nhanh, đẹp và tiết kiệm vật liệu!')
        }
      } else if (cleanMessage.includes('dừng xây') || cleanMessage.includes('stop build')) {
        autoBuildManager.stopSmartAutoBuild()
      } else if (cleanMessage.includes('theo')) {
        if (autoFishingActive) stopAutoFishing() // Dừng câu khi có lệnh khác

        // Kiểm tra xem có chỉ định player cụ thể không
        const followMatch = cleanMessage.match(/theo\s+(.+)/)
        if (followMatch && followMatch[1].trim() !== '' && !cleanMessage.startsWith('theo tớ')) {
          const targetName = followMatch[1].trim()
          followingManager.startFollowingPlayer(targetName)
        } else {
          followingManager.startFollowingPlayer(username)
        }
      } else if (cleanMessage.includes('bảo vệ')) {
        if (autoFishingActive) stopAutoFishing() // Dừng câu khi có lệnh khác

        // Kiểm tra xem có chỉ định player cụ thể không
        const protectMatch = cleanMessage.match(/bảo vệ\s+(.+)/)
        if (protectMatch && protectMatch[1].trim() !== '' && !cleanMessage.startsWith('bảo vệ tớ')) {
          const targetName = protectMatch[1].trim()
          protectingManager.startProtectingPlayer(targetName)
        } else {
          protectingManager.startProtectingPlayer(username)
        }
      // Bow commands removed
      } else if (cleanMessage.includes('ngủ')) {
        if (autoFishingActive) stopAutoFishing() // Dừng câu khi có lệnh khác
        goSleep()
      } else if (cleanMessage.includes('cần')) {
        giveItemToPlayer(username, message)
      } else if (cleanMessage.includes('cất đồ')) {
        if (autoFishingActive) stopAutoFishing() // Dừng câu khi có lệnh khác
        storeItemsInChest()
      } else if (cleanMessage.includes('auto farmer') || cleanMessage.includes('crop farm')) {
        if (autoFishingActive) stopAutoFishing() // Dừng câu khi có lệnh khác
        startAutoCropFarmer()
      } else if (cleanMessage.includes('dừng farmer') || cleanMessage.includes('stop farmer')) {
        stopAutoCropFarmer()
      } else if (cleanMessage.includes('auto farm all') || cleanMessage.includes('farm')) {
        if (autoFishingActive) stopAutoFishing() // Dừng câu khi có lệnh khác
        autoFarmManager.startAutoFarmAll()
      } else if (cleanMessage.startsWith('tớ hỏi nè')) {
        handleQuestionWithAI(username, message)
      } else if (cleanMessage.includes('auto câu') || cleanMessage.includes('fishing')) {
        startSmartAutoFishing()
      } else if (cleanMessage.includes('dừng câu') || cleanMessage.includes('stop fishing')) {
        stopSmartAutoFishing()
      } else if (cleanMessage.includes('auto mine') || cleanMessage.includes('auto đào')) {
        // Parse ore type from command
        const oreMatch = cleanMessage.match(/(?:auto mine|auto đào)\s+(\w+)/)
        if (oreMatch) {
          const oreType = oreMatch[1].toLowerCase()
          startAutoMining(oreType)
        } else {
          bot.chat('🤔 Cậu muốn đào quặng gì? VD: "auto mine diamond" hoặc "auto đào iron"')
          bot.chat('📝 Các loại quặng: diamond, iron, gold, coal, copper, emerald, redstone, lapis')
        }
      } else if (cleanMessage.includes('dừng đào') || cleanMessage.includes('stop mining')) {
        if (autoMiningActive) {
          stopAutoMining()
        } else {
          bot.chat('🤔 Tớ không đang đào mà!')
        }
      // Auto chest hunting commands
      } else if (cleanMessage.includes('auto tìm rương') || cleanMessage.includes('auto chest')) {
        startAutoChestHunting()
      } else if (cleanMessage.includes('dừng tìm rương') || cleanMessage.includes('dừng chest') || cleanMessage.includes('stop chest')) {
        stopAutoChestHunting()
      // End auto chest hunting commands
      // Auto Explore commands
      } else if (cleanMessage.includes('auto explore') || cleanMessage.includes('tự khám phá')) {
        startAutoExplore()
      } else if (cleanMessage.includes('dừng explore') || cleanMessage.includes('stop explore')) {
        stopAutoExplore()
      // End Auto Explore commands
      // PVP commands
      } else if (cleanMessage.startsWith('pvp ')) {
        // Standard PVP command: pvp <playername>
        const targetName = message.substring(4).trim()
        if (targetName) {
          startPvP(targetName)
        } else {
          bot.chat('🤔 Cậu muốn PVP với ai? VD: "pvp Steve"')
        }
      } else if (cleanMessage.startsWith('pvppro ') || cleanMessage.startsWith('/pvppro ')) {
        // PVP Pro command: pvppro <playername> hoặc /pvppro <playername>
        const startIndex = cleanMessage.startsWith('/pvppro ') ? 8 : 7
        const targetName = message.substring(startIndex).trim()
        if (targetName) {
          startPvPPro(targetName)
        } else {
          bot.chat('🤔 Cậu muốn PVP Pro với ai? VD: "pvppro Steve"')
        }
      } else if (cleanMessage === 'list players' || cleanMessage === 'danh sách players') {
        // Debug command: hiển thị danh sách players
        const allPlayers = Object.keys(bot.players)
        if (allPlayers.length > 0) {
          bot.chat(`📋 Players trong server: [${allPlayers.join(', ')}]`)
          console.log(`📋 DEBUG - Danh sách players:`, allPlayers)
        } else {
          bot.chat('📋 Không có player nào trong server (ngoài tớ)')
          console.log('📋 DEBUG - Player list empty')
        }
      // End PVP commands
      } else if (cleanMessage.startsWith('hãy nói ')) {
        // Chức năng lặp lại câu nói
        const textToRepeat = message.substring(8).trim() // Lấy phần sau "hãy nói "
        if (textToRepeat) {
          bot.chat(textToRepeat)
          console.log(`🔊 Bot lặp lại: "${textToRepeat}"`)
        } else {
          bot.chat('🤔 Cậu muốn tớ nói gì?')
        }
      } else if (cleanMessage.includes('spam attack') || cleanMessage.includes('tấn công spam')) {
        // Kích hoạt chế độ spam attack đặc biệt
        bot.chat('🔥 SPAM ATTACK MODE ON! Tớ sẽ đánh cực nhanh không delay!')
        console.log('🔥 Spam Attack Mode: ACTIVATED')

        // Tìm và spam attack mob gần nhất
        const nearestMob = bot.nearestEntity((entity: any) => {
          if (!entity || !entity.position) return false
          const distance = bot.entity.position.distanceTo(entity.position)
          if (distance > 10) return false

          const hostileMobs = [
            'zombie', 'skeleton', 'creeper', 'spider', 'witch', 'pillager', 'vindicator',
            'evoker', 'husk', 'stray', 'phantom', 'drowned', 'enderman', 'breeze', 'bogged',
            'slime', 'silverfish', 'cave_spider'
          ]
          const mobName = entity.name ? entity.name.toLowerCase() : ''
          const displayName = entity.displayName ? entity.displayName.toLowerCase() : ''

          const isHostile = hostileMobs.some(mobType =>
            mobName.includes(mobType) || displayName.includes(mobType)
          )

          const isMobType = entity.type === 'mob' &&
                           !mobName.includes('villager') &&
                           !mobName.includes('iron_golem')

          return isHostile || isMobType
        })

        if (nearestMob) {
          equipBestWeapon()
          bot.setControlState('sprint', true)

          // ULTRA MEGA SPAM - 20 lần tấn công liên tiếp
          for (let megaSpam = 0; megaSpam < 20; megaSpam++) {
            meleeAttack(nearestMob, bot.entity.position.distanceTo(nearestMob.position))
          }
          bot.chat('⚔️ MEGA SPAM COMPLETE! 20x attacks delivered!')
        } else {
          bot.chat('🤔 Không thấy mob nào để spam attack!')
        }
      } else if (cleanMessage.startsWith('en ')) {
        // Chức năng enchant công cụ
        const toolName = message.substring(3).trim()
        await handleEnchantTool(username, toolName)
      } else if (!isCommand(cleanMessage)) {
        // Chat thường không phải lệnh - sử dụng AI để trả lời
        console.log(`🧠 Đang suy nghĩ để trả lời chat: "${message}"`)
        await handleChatWithAI(username, message)
      }
    })
  })

  // Theo dõi player join game
  bot.on('playerJoined', (player: any) => {
    if (player.username !== bot.username) {
      console.log(`🎉 Player ${player.username} joined game`)
      welcomePlayer(player.username)
    }
  })

  // Theo dõi player left game
  bot.on('playerLeft', (player: any) => {
    if (player.username !== bot.username) {
      console.log(`👋 Player ${player.username} left game`)
    }
  })

  // ------------------ Enchant Tool Function ------------------
  async function handleEnchantTool(username: string, toolName: string) {
    if (!toolName) {
      bot.chat('🤔 Cậu muốn tớ enchant công cụ gì? VD: en diamond_sword')
      return
    }

    try {
      // Bước 1: Kiểm tra quyền OP bằng cách thử enchant đơn giản
      bot.chat('🔍 Kiểm tra quyền OP...')

      // Thử lệnh gamemode để test OP permission
      try {
        bot.chat('/gamemode survival')
        await new Promise(resolve => setTimeout(resolve, 1000))

        // Nếu không có lỗi chat về permission thì có OP
        if (bot.chat) { // Check if chat function is still available
          console.log('✅ Bot có quyền OP - có thể enchant')
        } else {
           throw new Error("Chat function unavailable");
        }
      } catch (error) {
        bot.chat('🥺 Tớ không có quyền OP để enchant!')
        return
      }

      // Bước 2: Tìm công cụ trong túi đồ
      const toolItem = bot.inventory.items().find(item => {
        const itemName = item.name.toLowerCase()
        const searchName = toolName.toLowerCase()
        return itemName.includes(searchName) ||
               itemName === searchName ||
               itemName.replace('_', '').includes(searchName.replace('_', ''))
      })

      if (!toolItem) {
        bot.chat(`🥺 Không có ${toolName} trong túi để enchant!`)
        bot.chat('Có lỗi rồi')
        return
      }

      // Bước 3: Trang bị công cụ
      await bot.equip(toolItem, 'hand')
      bot.chat(`⚔️ Đã cầm ${toolItem.name}, bắt đầu enchant!`)

      await new Promise(resolve => setTimeout(resolve, 1000))

      // Bước 4: Enchant theo loại công cụ với lệnh đúng định dạng
      const itemName = toolItem.name.toLowerCase()
      let enchantSuccess = true

      if (itemName.includes('sword')) {
        // Enchant cho kiếm với delay dài hơn và format đúng
        bot.chat(`⚔️ Enchant kiếm khó ra dòng xịn lắm`)
        bot.chat(`/enchant sharpness 5`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant sweeping 3`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant looting 3`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant fire_aspect 2`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant knockback 2`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant unbreaking 3`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant mending 1`)

      } else if (itemName.includes('helmet')) {
        // Enchant cho mũ với delay dài hơn
        bot.chat(`Enchant tốn thời gian ghê!!`)
        bot.chat(`/enchant protection 4`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant fireprotection 4`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant blastprotection 4`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant projectileprotection 4`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant respiration 3`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant aquaaffinity 1`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant unbreaking 3`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant mending 1`)

      } else if (itemName.includes('chestplate')) {
        // Enchant cho áo giáp với delay dài hơn
        bot.chat(`🛡️ Enchant áo giáp`)
        bot.chat(`/enchant protection 4`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant fireprotection 4`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant blastprotection 4`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant projectileprotection 4`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant unbreaking 3`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant mending 1`)

      } else if (itemName.includes('leggings')) {
        // Enchant cho quần với delay dài hơn
        bot.chat(`👖 Enchant quần`)
        bot.chat(`/enchant protection 4`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant fireprotection 4`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant blastprotection 4`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant projectileprotection 4`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant unbreaking 3`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant mending 1`)

      } else if (itemName.includes('boots')) {
        // Enchant cho giày với delay dài hơn
        bot.chat(`👢 Enchant giày`)
        bot.chat(`/enchant protection 4`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant fireprotection 4`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant blastprotection 4`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant projectileprotection 4`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant featherfalling 4`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant depthstrider 3`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant unbreaking 3`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant mending 1`)

      } else if (itemName.includes('bow')) {
        // Enchant cho cung với delay dài hơn
        bot.chat(`🏹 Enchant cung với power tối đa!`)
        bot.chat(`/enchant power 5`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant punch 2`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant flame 1`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant infinity 1`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant unbreaking 3`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant mending 1`)

      } else if (itemName.includes('trident')) {
        // Enchant cho đinh ba với delay dài hơn
        bot.chat(`🔱 Enchant đinh ba với impaling tối đa!`)
        bot.chat(`/enchant impaling 5`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant loyalty 3`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant channeling 1`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant unbreaking 3`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant mending 1`)

      } else if (itemName.includes('pickaxe')) {
        // Enchant cho cuốc với delay dài hơn
        bot.chat(`⛏️ Enchant pickaxe`)
        bot.chat(`/enchant efficiency 5`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant fortune 3`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant unbreaking 3`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant mending 1`)

      } else if (itemName.includes('axe')) {
        // Enchant cho rìu với delay dài hơn
        bot.chat(`🪓 Enchant rìu `)
        bot.chat(`/enchant efficiency 5`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant sharpness 5`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant unbreaking 3`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant mending 1`)

      } else if (itemName.includes('shovel')) {
        // Enchant cho xẻng với delay dài hơn
        bot.chat(`🥄 Enchant xẻng`)
        bot.chat(`/enchant efficiency 5`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant unbreaking 3`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant mending 1`)

      } else if (itemName.includes('elytra')) {
        // Enchant cho cánh với delay dài hơn
        bot.chat(`🪶 Enchant elytra!`)
        bot.chat(`/enchant unbreaking 3`)
        await new Promise(resolve => setTimeout(resolve, 1200))
        bot.chat(`/enchant mending 1`)

      } else {
        bot.chat(`🤔 Không biết cách enchant ${toolItem.name}`)
        enchantSuccess = false
      }

      // Bước 5: Hoàn thành với kiểm tra kết quả
      await new Promise(resolve => setTimeout(resolve, 2000))

      if (enchantSuccess) {
        bot.chat(`✨ Hoàn tất enchant ${toolItem.name}! Nè`)
      } else {
        bot.chat(`🤔 Không thể enchant ${toolItem.name} - không hỗ trợ loại này!`)
      }
      bot.chat('Có lỗi rồi')

    } catch (error) {
      console.log('❌ Lỗi enchant tool:', error)
      bot.chat('🥺 Có lỗi khi enchant!')
      bot.chat('Có lỗi rồi')
    }
  }

  // ------------------ Function kiểm tra có phải command không ------------------
  function isCommand(message: string): boolean {
    const commands = [
      'auto xây', 'dừng xây', 'stop build',
      'theo', 'bảo vệ', 'dừng', 'stop',
      'ngủ', 'cần', 'cất đồ',
      'farm', 'auto farm all', 'spam attack',
      'auto farmer', 'crop farm', 'dừng farmer', 'stop farmer',
      'tớ hỏi nè', 'auto câu', 'fishing',
      'dừng câu', 'stop fishing',

      'auto tìm rương', 'auto chest', 'dừng tìm rương', 'dừng chest', 'stop chest',
      'auto explore', 'tự khám phá', 'dừng explore', 'stop explore',
      'hãy nói', 'en '
    ]

    return commands.some(cmd => message.includes(cmd))
  }

  // ------------------ Player Join Welcome ------------------
  function welcomePlayer(username: string) {
    const welcomeMessages = [
      `🎉 Chào mừng ${username} đến server! Tớ là bot helper đây~`,
      `✨ Xin chào ${username}! Cần giúp gì cứ gọi tớ nhé!`,
      `🌟 Hi ${username}! Tớ có thể giúp cậu với nhiều thứ đấy!`,
      `💫 Chào ${username}! Tớ ở đây để hỗ trợ cậu!`,
      `🎈 Welcome ${username}! Tớ là bot thông minh nè~`
    ]

    const randomMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)]

    // Delay ngẫu nhiên 1-3 giây để tự nhiên hơn
    const delay = 1000 + Math.random() * 2000
    setTimeout(() => {
      bot.chat(randomMessage)
    }, delay)
  }

  // ------------------ AI Chat Handler cho chat thường ------------------
  async function handleChatWithAI(username: string, message: string) {
    if (!geminiApiKey) {
      // Không chat gì khi không có AI - im lặng
      return
    }

    try {
      // Không hiển thị "đang suy nghĩ" trong game - chỉ console log
      console.log(`🤖 AI đang phân tích chat từ ${username}: "${message}"`)

      const systemPrompt = `Bạn là bot Minecraft tên Loli, rất đáng yêu và kawaii! ${username} nói: "${message}".

Hãy trả lời một cách tự nhiên với phong cách:
- Dùng emoji cute: 💕 🌸 ✨ (◕‿◕) >.<  uwu (´∀｀) ♡ 💖 🎀
- Xưng tớ, gọi cậu
- Phong cách loli kawaii, ngọt ngào
- Dưới 80 ký tự để chat game không bị cắt
- Thêm từ cute như "nè", "mà", "uwu", "kyaa"
- Trả lời phù hợp với ngữ cảnh`

      const payload = {
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\nChat: ${message}`
          }]
        }],
        generationConfig: {
          maxOutputTokens: 100,
          temperature: 0.8
        }
      }

      // FIX: Gemini API endpoint changed to v1beta and gemini-2.0-flash
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (!response.ok) {
        console.log('❌ AI API Error:', result)
        return // Im lặng khi có lỗi
      }

      const generatedText = result?.candidates?.[0]?.content?.parts?.[0]?.text

      if (generatedText && generatedText.trim() !== '') {
        // Trả lời AI trong game - chỉ khi có nội dung hợp lệ
        const aiResponse = generatedText.substring(0, 80) // Cắt ngắn cho chat game
        bot.chat(aiResponse)
        console.log(`💬 AI đã trả lời: "${aiResponse}"`)
      } else {
        console.log(`🤖 AI không có phản hồi phù hợp cho: "${message}"`)
      }
    } catch (error) {
      // Im lặng khi có lỗi AI - không spam chat
      console.error(`❌ Lỗi AI chat với ${username}:`, error.message || error)
    }
  }

  // ------------------ Question AI Response ------------------
  async function handleQuestionWithAI(username: string, message: string) {
    if (!geminiApiKey) {
      bot.chat('🥺 Tớ chưa được cấu hình Gemini AI, cậu liên hệ admin nhé!')
      return
    }

    try {
      // Hiển thị tin nhắn đang suy nghĩ
      bot.chat('💭 Để tớ suy nghĩ cute cute nè~ (◕‿◕)✨')

      const question = message.replace(/tớ hỏi nè/i, '').trim()
      const systemPrompt = `Bạn là bot Minecraft tên Loli, rất đáng yêu và kawaii! ${username} hỏi: "${question}".

Hãy trả lời câu hỏi này với phong cách:
- Dùng nhiều emoji cute: 💕 🌸 ✨ (◕‿◕) >.<  uwu (´∀｀) ♡ 💖 🎀
- Xưng tớ, gọi cậu
- Phong cách loli kawaii, ngọt ngào
- Dưới 100 ký tự
- Thêm từ cute như "nè", "mà", "uwu", "kyaa"
- Hữu ích nhưng rất đáng yêu`

      const payload = {
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\nCâu hỏi: ${question}`
          }]
        }],
        generationConfig: {
          maxOutputTokens: 120,
          temperature: 0.9
        }
      }

      // FIX: Gemini API endpoint changed to v1beta and gemini-2.0-flash
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (!response.ok) {
        console.log('❌ AI API Error:', result)
        throw new Error(`API Error: ${result.error?.message || 'Unknown error'}`)
      }

      const generatedText = result?.candidates?.[0]?.content?.parts?.[0]?.text

      if (generatedText && generatedText.trim() !== '') {
        // Trả lời AI trong game - chỉ khi có nội dung thật từ AI
        const aiResponse = generatedText.substring(0, 100)
        bot.chat(aiResponse)
      } else {
        // Trả lời đơn giản khi AI không có câu trả lời
        bot.chat('🥺 Tớ không biết câu trả lời này, cậu hỏi câu khác nhé! (◕‿◕)💕')
      }
    } catch (error) {
      // Trả lời đơn giản khi có lỗi AI
      bot.chat('🥺 Tớ bị lỗi rồi, cậu hỏi lại sau nhé!')
      console.error('Lỗi chat AI:', error)
    }
  }

  // ------------------ Follow / Protect ------------------
  startFollowingPlayer = function(username: string) {
    // Tìm player entity với nhiều cách khác nhau
    let playerEntity = bot.players[username]?.entity

    // Nếu không tìm thấy, thử tìm theo tên không có dấu chấm
    if (!playerEntity && username.startsWith('.')) {
      const nameWithoutDot = username.substring(1)
      playerEntity = bot.players[nameWithoutDot]?.entity
    }

    // Nếu vẫn không tìm thấy, thử tìm theo tên có dấu chấm
    if (!playerEntity && !username.startsWith('.')) {
      const nameWithDot = '.' + username
      playerEntity = bot.players[nameWithDot]?.entity
    }

    // Tìm trong tất cả players nếu vẫn không thấy
    if (!playerEntity) {
      const allPlayers = Object.keys(bot.players)
      console.log(`🔍 Tìm kiếm player: ${username} trong danh sách:`, allPlayers)

      // Tìm player gần đúng
      for (const playerName of allPlayers) {
        if (playerName.toLowerCase().includes(username.toLowerCase()) ||
            username.toLowerCase().includes(playerName.toLowerCase())) {
          playerEntity = bot.players[playerName]?.entity
          console.log(`✅ Tìm thấy player tương ứng: ${playerName}`)
          break
        }
      }
    }

    if (!playerEntity) {
      bot.chat(`🥺 Cậu phải ở trong tầm nhìn của tớ thì tớ mới đi theo được!!?`)
      console.log(`❌ Không tìm thấy player: ${username}`)
      return
    }

    targetPlayer = playerEntity
    bot.chat(`❤️ Tớ sẽ theo cậu đến cùng trời cuối đất!`)
    stopProtecting()
    itemCollectionDisabled = false // Bật lại nhặt đồ khi dùng chức năng
    startFollowing()
    console.log(`✅ Bắt đầu theo ${username}`)
  }

  function startFollowing() {
    isFollowing = true
    if (followInterval) clearInterval(followInterval)

    let tpFailCount = 0 // Đếm số lần /tp thất bại
    let lastBoatCheck = 0 // Track lần cuối kiểm tra thuyền
    let isInBoat = false // Track trạng thái đang ngồi thuyền
    let lastMovementTime = 0 // Track để giảm spam movement

    followInterval = setInterval(async () => {
      if (!targetPlayer || !targetPlayer.isValid) {
        stopFollowing()
        return
      }

      const targetPos = targetPlayer.position
      const distance = bot.entity.position.distanceTo(targetPos)
      const currentTime = Date.now()

      // TRANG BỊ CÔNG CỤ PHÙHỢP KHI ĐI THEO (không phải combat) - giảm frequency
      if (currentTime % 15000 < 2000) { // Mỗi 15 giây kiểm tra 1 lần thay vì 10 giây
        equipBestToolForFollowing()
      }

      // KIỂM TRA THUYỀN MỖI 3 GIÂY thay vì 2 giây
      if (currentTime - lastBoatCheck > 3000) {
        lastBoatCheck = currentTime

        // Kiểm tra xem player có đang ngồi thuyền không
        const isPlayerOnBoat = targetPlayer.vehicle && targetPlayer.vehicle.name && targetPlayer.vehicle.name.includes('boat')

        // Tìm thuyền gần trong bán kính 4 blocks
        const nearbyBoat = bot.nearestEntity((entity: any) => {
          if (!entity || !entity.position) return false
          const boatDistance = bot.entity.position.distanceTo(entity.position)
          return boatDistance <= 4 && entity.name && entity.name.includes('boat')
        })

        if (nearbyBoat && !isInBoat && isPlayerOnBoat) {
          try {
            // Di chuyển đến thuyền và ngồi lên
            const movements = new Movements(bot)
            movements.allowSprinting = true
            bot.pathfinder.setMovements(movements)
            bot.pathfinder.setGoal(new goals.GoalNear(nearbyBoat.position.x, nearbyBoat.position.y, nearbyBoat.position.z, 1))

            setTimeout(async () => {
              try {
                await bot.mount(nearbyBoat)
                isInBoat = true
                bot.chat('🛥️ Lên thuyền theo cậu!')
              } catch (mountError) {
                // Silent fail
              }
            }, 1000)
          } catch (error) {
            // Silent fail để giảm spam log
          }
        } else if (isInBoat && (!isPlayerOnBoat || distance > 4)) {
          try {
            bot.dismount()
            isInBoat = false
            bot.chat('🛥️ Xuống thuyền!')
          } catch (error) {
            isInBoat = false // Reset trạng thái
          }
        }
      }

      // Nếu đang ngồi thuyền và gần player thì không cần làm gì thêm
      if (isInBoat && distance <= 4) {
        return
      }

      // Nếu quá xa thì teleport
      if (distance > 14) {
        try {
          // Kiểm tra nếu đã thất bại quá nhiều lần
          if (tpFailCount >= 3) {
            bot.chat('🥺 Tớ không có quyền /tp để theo cậu. Dừng theo dõi!')
            stopFollowing()
            return
          }

          bot.chat(`/tp ${bot.username} ${targetPlayer.username}`)

          // Kiểm tra thành công sau 2 giây
          setTimeout(() => {
            if (!targetPlayer || !targetPlayer.isValid) return

            const newDistance = bot.entity.position.distanceTo(targetPlayer.position)
            if (newDistance > 15) { // Nếu vẫn xa thì /tp thất bại
              tpFailCount++

              if (tpFailCount >= 3) {
                bot.chat('🥺 Tớ không có quyền /tp. Dừng theo dõi!')
                stopFollowing()
              }
            } else {
              tpFailCount = 0 // Reset nếu thành công
            }
          }, 2500)

        } catch (e) {
          tpFailCount++
          if (tpFailCount >= 3) {
            bot.chat('🥺 Tớ không thể đến gần cậu! Dừng theo dõi!')
            stopFollowing()
            return
          }
        }
        return
      }

      // Reset count khi ở gần
      if (distance <= 12) {
        tpFailCount = 0
      }

      // Di chuyển theo logic cải tiến - giảm spam movement
      if (!isInBoat && distance > 3 && currentTime - lastMovementTime > 1000) {
        lastMovementTime = currentTime

        try {
          // Setup movement mới mỗi lần để đảm bảo setting đúng
          const movements = new Movements(bot)
          movements.canDig = distance > 10 // Chỉ đào khi cách xa
          movements.allow1by1towers = true
          movements.allowParkour = true
          movements.allowSprinting = true
          movements.allowEntityDetection = true
          movements.allowFreeMotion = true
          movements.canOpenDoors = true
          movements.infiniteLiquidDropCost = 5
          movements.scafoldingBlocks = [bot.registry.itemsByName.cobblestone?.id, bot.registry.itemsByName.dirt?.id].filter(Boolean)
          bot.pathfinder.setMovements(movements)

          // Sử dụng GoalNear thay vì GoalFollow để ổn định hơn
          const followDistance = distance > 8 ? 3 : 2
          bot.pathfinder.setGoal(new goals.GoalNear(targetPos.x, targetPos.y, targetPos.z, followDistance))

        } catch (error) {
          // Silent fail để giảm spam log
        }
      }
    }, 1500) // Giảm frequency từ 2000ms xuống 1500ms cho responsive hơn
  }

  stopFollowing = function() {
    isFollowing = false
    if (followInterval) clearInterval(followInterval)
    followInterval = null
    bot.pathfinder.setGoal(null)
  }

  startProtectingPlayer = function(username: string) {
    // Tìm player entity với nhiều cách khác nhau
    let playerEntity = bot.players[username]?.entity

    // Nếu không tìm thấy, thử tìm theo tên không có dấu chấm
    if (!playerEntity && username.startsWith('.')) {
      const nameWithoutDot = username.substring(1)
      playerEntity = bot.players[nameWithoutDot]?.entity
    }

    // Nếu vẫn không tìm thấy, thử tìm theo tên có dấu chấm
    if (!playerEntity && !username.startsWith('.')) {
      const nameWithDot = '.' + username
      playerEntity = bot.players[nameWithDot]?.entity
    }

    // Tìm trong tất cả players nếu vẫn không thấy
    if (!playerEntity) {
      const allPlayers = Object.keys(bot.players)
      console.log(`🔍 Tìm kiếm player: ${username} trong danh sách:`, allPlayers)

      // Tìm player gần đúng
      for (const playerName of allPlayers) {
        if (playerName.toLowerCase().includes(username.toLowerCase()) ||
            username.toLowerCase().includes(playerName.toLowerCase())) {
          playerEntity = bot.players[playerName]?.entity
          console.log(`✅ Tìm thấy player tương ứng: ${playerName}`)
          break
        }
      }
    }

    if (!playerEntity) {
      bot.chat(`🥺 Cậu phải ở gần tớ thì tớ mới bảo vệ được!?💞`)
      console.log(`❌ Không tìm thấy player: ${username}`)
      return
    }

    targetPlayer = playerEntity
    bot.chat(`🛡️ Tớ sẽ bảo vệ cậu khỏi tất cả nguy hiểm!`)
    stopFollowing()
    itemCollectionDisabled = false // Bật lại nhặt đồ khi dùng chức năng
    startProtecting()
    console.log(`✅ Bắt đầu bảo vệ ${username}`)
  }

  // Biến kiểm tra quyền OP
  let hasOpPermission: boolean | null = null
  let hasTriedOpCommand = false
  let lastOpCheckTime = 0

  function startProtecting() {
    isProtecting = true
    if (protectInterval) clearInterval(protectInterval)

    // Tắt nhặt đồ khi bảo vệ để tập trung chiến đấu
    itemCollectionDisabled = true

    // Reset OP check khi bắt đầu bảo vệ mới
    hasOpPermission = null
    hasTriedOpCommand = false
    lastOpCheckTime = 0
    let lastMovementTime = 0 // Track để giảm spam movement logs

    protectInterval = setInterval(async () => {
      if (!targetPlayer || !targetPlayer.isValid) {
        stopProtecting()
        return
      }

      const targetPos = targetPlayer.position
      const distanceToPlayer = bot.entity.position.distanceTo(targetPos)
      const health = bot.health
      const protectTime = Date.now()

      // Auto buff khi máu yếu - giảm frequency check
      if (health < 8 && (protectTime - lastOpCheckTime) > 15000) { // Tăng lên 15 giây
        lastOpCheckTime = protectTime

        if (hasOpPermission === null && !hasTriedOpCommand) {
          hasTriedOpCommand = true
          bot.chat(`/effect give ${bot.username} regeneration 5 100 true`)
          setTimeout(() => bot.chat('Đòi ăn ai'), 100)

          setTimeout(() => {
            if (bot.health > health) {
              hasOpPermission = true
            } else {
              hasOpPermission = false
              bot.chat('🥺 Tớ không có quyền OP để tự buff, nhưng vẫn bảo vệ cậu!')
            }
          }, 3000)

        } else if (hasOpPermission === true) {
          bot.chat(`/effect give ${bot.username} regeneration 5 100 true`)
          setTimeout(() => bot.chat(`/effect give ${bot.username} strength 5 2 true`), 100)
          setTimeout(() => bot.chat('Đòi ăn ai'), 200)
        }
      }

      // Tìm quái gần nhất - giảm phạm vi để focused hơn
      let mob = bot.nearestEntity((entity: any) => {
        if (!entity || !entity.position) return false

        const distanceToMob = bot.entity.position.distanceTo(entity.position)
        if (distanceToMob > 15) return false // Giảm từ 20 xuống 15 blocks

        const hostileMobs = [
          'zombie', 'skeleton', 'creeper', 'spider', 'witch', 'pillager', 'vindicator', 'evoker',
          'husk', 'stray', 'phantom', 'drowned', 'enderman', 'breeze', 'bogged',
          'slime', 'silverfish', 'cave_spider'
        ]
        const mobName = entity.name ? entity.name.toLowerCase() : ''
        const displayName = entity.displayName ? entity.displayName.toLowerCase() : ''

        const isHostile = hostileMobs.some(mobType =>
          mobName.includes(mobType) || displayName.includes(mobType)
        )

        const isMobType = entity.type === 'mob' &&
                         !mobName.includes('villager') &&
                         !mobName.includes('iron_golem')

        return isHostile || isMobType
      })

      // LOGIC BẢO VỆ CẢI THIỆN với ít spam log hơn
      if (distanceToPlayer > 14) { // Giảm ngưỡng teleport xuống 14 blocks
        try {
          bot.chat(`/tp ${bot.username} ${targetPlayer.username}`)
          bot.pvp.stop()

          setTimeout(() => {
            if (!targetPlayer || !targetPlayer.isValid) return

            const newDistance = bot.entity.position.distanceTo(targetPlayer.position)
            if (newDistance > 15) {
              // Setup safe movement
              const movements = new Movements(bot)
              movements.canDig = true
              movements.allowSprinting = true
              bot.pathfinder.setMovements(movements)
              bot.pathfinder.setGoal(new goals.GoalNear(targetPos.x, targetPos.y, targetPos.z, 3))
            }
          }, 2500)
        } catch (e) {
          // Fallback movement
          const movements = new Movements(bot)
          movements.canDig = true
          movements.allowSprinting = true
          bot.pathfinder.setMovements(movements)
          bot.pathfinder.setGoal(new goals.GoalNear(targetPos.x, targetPos.y, targetPos.z, 3))
        }
      } else if (mob && health > 6 && !isEating) {
        // CÓ QUÁI VÀ ĐỦ MÁU: TẤN CÔNG
        const mobDistance = bot.entity.position.distanceTo(mob.position)

        // Trang bị vũ khí chỉ khi cần thiết
        const currentWeapon = bot.heldItem
        if (!currentWeapon || !currentWeapon.name.includes('sword')) {
          equipBestSwordForCombat()
          await new Promise(resolve => setTimeout(resolve, 200))
        }

        if (distanceToPlayer > 8) {
          // Quá xa player, quay về
          bot.pvp.stop()
          const movements = new Movements(bot)
          movements.allowSprinting = true
          bot.pathfinder.setMovements(movements)
          bot.pathfinder.setGoal(new goals.GoalNear(targetPos.x, targetPos.y, targetPos.z, 3))
        } else if (mobDistance > 4) {
          // Tiến đến mob nếu an toàn
          const mobPos = mob.position
          const futureDistanceToPlayer = targetPlayer.position.distanceTo(mobPos)

          if (futureDistanceToPlayer <= 6) {
            const movements = new Movements(bot)
            movements.allowSprinting = true
            bot.pathfinder.setMovements(movements)
            bot.pathfinder.setGoal(new goals.GoalNear(mobPos.x, mobPos.y, mobPos.z, 2))
          } else {
            // Mob quá xa, ưu tiên player
            const movements = new Movements(bot)
            movements.allowSprinting = true
            bot.pathfinder.setMovements(movements)
            bot.pathfinder.setGoal(new goals.GoalNear(targetPos.x, targetPos.y, targetPos.z, 3))
          }
        } else {
          // Tấn công trực tiếp
          bot.pathfinder.setGoal(null)
          bot.setControlState('sprint', true)

          if (mob && mob.isValid) {
            // Giảm spam attack từ 8 xuống 5
            for (let attack = 0; attack < 5; attack++) {
              meleeAttack(mob, mobDistance)
            }
          }
        }
      } else if (health <= 6) {
        // MÁU YẾU: Về gần player
        bot.pvp.stop()
        const movements = new Movements(bot)
        movements.allowSprinting = true
        bot.pathfinder.setMovements(movements)
        bot.pathfinder.setGoal(new goals.GoalNear(targetPos.x, targetPos.y, targetPos.z, 2))
      } else if (distanceToPlayer > 4 && protectTime - lastMovementTime > 2000) {
        // KHÔNG CÓ QUÁI VÀ XA PLAYER: Di chuyển về gần - giảm spam logs
        lastMovementTime = protectTime
        bot.pvp.stop()
        const movements = new Movements(bot)
        movements.allowSprinting = true
        bot.pathfinder.setMovements(movements)
        bot.pathfinder.setGoal(new goals.GoalNear(targetPos.x, targetPos.y, targetPos.z, 2))
      }

    }, 800) // Tăng interval từ 600ms lên 800ms để giảm lag
  }

  stopProtecting = function() {
    isProtecting = false
    if (protectInterval) {
      clearInterval(protectInterval)
      protectInterval = null
    }

    // Bật lại nhặt đồ khi dừng bảo vệ
    itemCollectionDisabled = false

    bot.pvp.stop()
    bot.pathfinder.setGoal(null)
  }

  function stopAll() {
    // Dừng tất cả hoạt động SILENT - không chat
    if (followInterval) {
      clearInterval(followInterval)
      followInterval = null
    }
    if (protectInterval) {
      clearInterval(protectInterval)
      protectInterval = null
    }

    // Dừng fishing silent
    autoFishingActive = false
    autoItemCollectionDisabled = false
    autoEquipDisabled = false
    isFishing = false
    hasFishBitten = false
    if (fishingInterval) {
      clearInterval(fishingInterval)
      fishingInterval = null
    }
    if (hookCheckInterval) {
      clearInterval(hookCheckInterval)
      hookCheckInterval = null
    }

    // Dừng build silent
    autoBuildActive = false
    currentBuildProject = null
    buildProgress = 0

    // Dừng mining silent
    if (autoMiningActive) {
      autoMiningActive = false
      if (miningInterval) {
        clearInterval(miningInterval)
        miningInterval = null
      }
      isCurrentlyDigging = false
    }

    // Dừng farm silent
    autoFarmActive = false
    if (farmInterval) clearInterval(farmInterval)

    // Dừng chest hunting silent
    if (autoChestHuntingActive) {
      autoChestHuntingActive = false
      isCurrentlyApproachingChest = false
      currentChestTarget = null
      if (chestHuntingInterval) {
        clearInterval(chestHuntingInterval)
        chestHuntingInterval = null
      }
    }

    // Dừng crop farmer silent
    if (autoCropFarmerActive) {
      autoCropFarmerActive = false
      currentHoeTool = null
      harvestedCrops.clear()
      if (cropFarmerInterval) {
        clearInterval(cropFarmerInterval)
        cropFarmerInterval = null
      }
    }

    // Dừng PVP (gọi stopPvP silent để tránh spam chat)
    if (pvpActive || pvpProActive) {
      stopPvP(true) // true = silent mode, không chat
    }

    // Dừng auto explore silent
    if (autoExploreActive) {
      autoExploreActive = false
      exploreDirection = null
      discoveredStructures.clear()
      if (exploreInterval) {
        clearInterval(exploreInterval)
        exploreInterval = null
      }
    }

    // Reset states
    isFollowing = false
    isProtecting = false

    // Dừng PVP và pathfinder
    try {
      bot.pvp.stop()
    } catch (e) {
      // Ignore PVP stop errors
    }

    try {
      bot.pathfinder.setGoal(null)
    } catch (e) {
      // Ignore pathfinder errors
    }

    // CHỈ CHAT 1 LẦN DUY NHẤT
    if (bot && bot._client && bot._client.state === 'play') {
      bot.chat(`🛑 Dừng tất cả rồi nha cậu! 💕`)
    }
    console.log('⏹️ Dừng tất cả hoạt động')
  }

  // ------------------ Sleep ------------------
  async function goSleep() {
    console.log('😴 Yêu cầu bot đi ngủ')

    if (bot.time.isDay) {
      bot.chat(`☀️ Trời đang sáng mà cậu, chưa đi ngủ được đâu!`)
      return
    }

    const bedBlock = bot.findBlock({
      matching: (block: any) => {
        return block.name.includes('bed')
      },
      maxDistance: 16
    })

    if (bedBlock) {
      bot.chat(`😴 Tớ buồn ngủ quá, đi ngủ thôi nào!`)
      try {
        await bot.sleep(bedBlock)
        bot.chat(`Zzz... 😴`)
      } catch (err) {
        bot.chat(`😢 Tớ không ngủ được ở đây. Cậu tìm chỗ khác nhé.`)
        console.log('Lỗi ngủ:', err)
      }
    } else {
      bot.chat(`🛌 Tớ không tìm thấy giường nào gần đây cả.`)
    }
  }

  // ------------------ Give Item ------------------
  function giveItemToPlayer(username: string, msg: string) {
    const match = msg.match(/cần (\d+) (\w+)/)
    if (!match) return

    const qty = parseInt(match[1])
    const name = match[2]

    // Tìm player entity với nhiều cách khác nhau
    let playerEntity = bot.players[username]?.entity

    // Nếu không tìm thấy, thử tìm theo tên không có dấu chấm
    if (!playerEntity && username.startsWith('.')) {
      const nameWithoutDot = username.substring(1)
      playerEntity = bot.players[nameWithoutDot]?.entity
    }

    // Nếu vẫn không tìm thấy, thử tìm theo tên có dấu chấm
    if (!playerEntity && !username.startsWith('.')) {
      const nameWithDot = '.' + username
      playerEntity = bot.players[nameWithDot]?.entity
    }

    // Tìm trong tất cả players nếu vẫn không thấy
    if (!playerEntity) {
      const allPlayers = Object.keys(bot.players)
      for (const playerName of allPlayers) {
        if (playerName.toLowerCase().includes(username.toLowerCase()) ||
            username.toLowerCase().includes(playerName.toLowerCase())) {
          playerEntity = bot.players[playerName]?.entity
          break
        }
      }
    }

    if (!playerEntity) {
      bot.chat(`🥺 Không thấy cậu để đưa ${name}`)
      return
    }

    const item = bot.inventory.items().find(i => i.name.includes(name))
    if (!item) {
      bot.chat(`🥺 Không có ${name}`)
      return
    }

    const throwItem = async () => {
      try {
        const distance = bot.entity.position.distanceTo(playerEntity.position)
        if (distance > 3) {
          bot.pathfinder.setGoal(new goals.GoalFollow(playerEntity, 2))
        } else {
          await bot.toss(item.type, null, qty)
          bot.chat(`🎁 Đã ném ${item.name} cho ${username}`)
        }
      } catch (error) {
        console.log('Lỗi ném item:', error)
      }
    }

    throwItem()
  }

  // ------------------ Cất đồ vào rương ------------------
  async function storeItemsInChest() {
    try {
      bot.chat('📦 Tớ sẽ cất TẤT CẢ đồ vào rương và sắp xếp theo ưu tiên!')

      // Tìm rương gần nhất
      const chestBlock = bot.findBlock({
        matching: (block: any) => {
          return block.name.includes('chest') ||
                 block.name.includes('barrel') ||
                 block.name.includes('shulker')
        },
        maxDistance: 32
      })

      if (!chestBlock) {
        bot.chat('🥺 Tớ không tìm thấy rương nào gần để cất đồ...')
        return
      }

      // Di chuyển đến rương
      const goal = new goals.GoalNear(chestBlock.position.x, chestBlock.position.y, chestBlock.position.z, 1)
      await bot.pathfinder.goto(goal)

      // Mở rương và cất đồ
      await bot.lookAt(chestBlock.position, true)
      const chest = await bot.openChest(chestBlock)

      // Phân loại đồ theo ưu tiên: khoáng sản > thức ăn > block > linh tinh
      const categorizedItems = {
        minerals: [] as any[],
        food: [] as any[],
        blocks: [] as any[],
        misc: [] as any[]
      }

      // Danh sách khoáng sản
      const minerals = ['diamond', 'emerald', 'gold', 'iron', 'coal', 'redstone', 'lapis', 'quartz', 'netherite', 'copper', 'amethyst']
      // Danh sách thức ăn
      const foods = ['bread', 'apple', 'meat', 'fish', 'potato', 'carrot', 'beef', 'pork', 'chicken', 'mutton', 'salmon', 'cod', 'golden_apple', 'enchanted_golden_apple', 'cookie', 'cake', 'pie', 'soup', 'stew']
      // Danh sách block
      const blocks = ['stone', 'dirt', 'grass', 'wood', 'log', 'plank', 'cobblestone', 'sand', 'gravel', 'glass', 'wool', 'brick', 'concrete', 'terracotta']

      // Phân loại items
      for (const item of bot.inventory.items()) {
        const itemName = item.name.toLowerCase()

        if (minerals.some(mineral => itemName.includes(mineral))) {
          categorizedItems.minerals.push(item)
        } else if (foods.some(food => itemName.includes(food))) {
          categorizedItems.food.push(item)
        } else if (blocks.some(block => itemName.includes(block))) {
          categorizedItems.blocks.push(item)
        } else {
          categorizedItems.misc.push(item)
        }
      }

      let storedCount = 0

      const storeCategory = async (items: any[], categoryName: string) => {
        for (const item of items) {
          try {
            await chest.deposit(item.type, null, item.count)
            storedCount++
            console.log(`📦 Cất ${categoryName}: ${item.name} x${item.count}`)
            await new Promise(resolve => setTimeout(resolve, 100))
          } catch (error) {
            console.log('Lỗi cất', categoryName, ':', error)
          }
        }
      }

      // Cất theo thứ tự ưu tiên
      await storeCategory(categorizedItems.minerals, 'khoáng sản')
      await storeCategory(categorizedItems.food, 'thức ăn')
      await storeCategory(categorizedItems.blocks, 'block')
      await storeCategory(categorizedItems.misc, 'linh tinh')

      chest.close()

      bot.chat(`✅ Đã cất TẤT CẢ ${storedCount} items theo ưu tiên:`)
      bot.chat(`💎 Khoáng sản: ${categorizedItems.minerals.length}`)
      bot.chat(`🍞 Thức ăn: ${categorizedItems.food.length}`)
      bot.chat(`🧱 Block: ${categorizedItems.blocks.length}`)
      bot.chat(`📦 Linh tinh: ${categorizedItems.misc.length}`)

    } catch (error) {
      bot.chat('🥺 Có lỗi khi cất đồ...')
      console.log('Lỗi store items:', error)
    }
  }

  // ------------------ Auto Farm All ------------------
  startAutoFarmAll = function() {
    autoFarmActive = true
    itemCollectionDisabled = false // Bật lại nhặt đồ khi farm

    // Reset OP check cho farm mode
    hasOpPermission = null
    hasTriedOpCommand = false
    lastOpCheckTime = 0

    bot.chat('🗡️ Bắt đầu farm tất cả mob')

    const farmInterval = setInterval(async () => {
      if (!autoFarmActive) {
        clearInterval(farmInterval)
        return
      }

      try {
        // Trang bị vũ khí tốt nhất
        equipBestWeapon()

        // TÌM MOB GẦN NHẤT TRƯỚC TIÊN - ưu tiên gần nhất
        let mob = bot.nearestEntity((entity: any) => {
          if (!entity || !entity.position) return false

          const distance = bot.entity.position.distanceTo(entity.position)
          if (distance > 25) return false // Phạm vi tìm kiếm tối đa 25 blocks

          // Các loại mob cần farm - UPDATED LIST (loại bỏ 'horse')
          const farmableMobs = [
            'zombie', 'skeleton', 'creeper', 'spider', 'witch', 'slime',
            'cow', 'pig', 'chicken', 'sheep', 'rabbit', // Loại bỏ 'horse'
            'zombie_villager', 'husk', 'stray', 'phantom', 'drowned',
            'pillager', 'vindicator', 'evoker', 'ravager', 'enderman', 'xtray', 'sulked',
            'breeze', 'bogged', 'silverfish', 'cave_spider'
          ]

          const mobName = entity.name ? entity.name.toLowerCase() : ''
          const displayName = entity.displayName ? entity.displayName.toLowerCase() : ''

          // Loại trừ các mob không nên farm
          if (mobName.includes('villager') ||
              mobName.includes('iron_golem') ||
              mobName.includes('wolf') ||
              mobName.includes('horse') ||
              entity.username) {
            return false
          }

          // Kiểm tra theo tên
          const isFarmable = farmableMobs.some(mobType =>
            mobName.includes(mobType) || displayName.includes(mobType)
          )

          // Hoặc kiểm tra theo type
          const isMobType = entity.type === 'mob'

          return isFarmable || isMobType
        })

        // Kiểm tra máu vàsử dụng effect nếu cần (tương tự như protect mode)
        const health = bot.health
        const autoFarmTime = Date.now()
        if (health < 8 && (autoFarmTime - lastOpCheckTime) > 10000) { // Tăng lên 10 giây
          lastOpCheckTime = autoFarmTime

          if (hasOpPermission === null && !hasTriedOpCommand) {
            hasTriedOpCommand = true
            bot.chat(`/effect give ${bot.username} regeneration 5 100 true`)
            setTimeout(() => bot.chat('Đòi ăn ai'), 100)

            setTimeout(() => {
              if (bot.health > health) {
                hasOpPermission = true
                console.log('✅ Farm mode: Bot có quyền OP')
              } else {
                hasOpPermission = false
                console.log('❌ Farm mode: Bot không có quyền OP')
              }
            }, 3000)

          } else if (hasOpPermission === true) {
            // AUTO FARM: LOẠI BỎ speed và resistance - chỉ dùng regeneration và strength
            bot.chat(`/effect give ${bot.username} regeneration 5 100 true`)
            setTimeout(() => bot.chat(`/effect give ${bot.username} strength 5 2 true`), 100)
            setTimeout(() => bot.chat('Đòi ăn ai'), 200)
            console.log('💪 Auto farm: Bot đã tự buff!')
          }
        }

        if (mob) {
          // Chỉ log mỗi 10 giây để giảm spam
          const currentTime = Date.now()
          if (!lastAttackTime || currentTime - lastAttackTime > 10000) {
            console.log(`🗡️ Farming ${mob.name || mob.displayName} (${Math.round(bot.entity.position.distanceTo(mob.position))}m)`)
            lastAttackTime = currentTime
          }

          // Di chuyển đến gần mob nếu cần
          const distance = bot.entity.position.distanceTo(mob.position)
          if (distance > 6) {
            const movements = new Movements(bot)
            movements.canDig = false // Không đào khi farm
            movements.allowSprinting = true
            movements.allowParkour = true
            bot.pathfinder.setMovements(movements)

            bot.pathfinder.setGoal(new goals.GoalFollow(mob, 2))

            // Đợi di chuyển một chút
            await new Promise(resolve => setTimeout(resolve, 500))
          }

          // Tấn công mob gần nhất với kiểm tra autoBowMode
          const mobDistance = bot.entity.position.distanceTo(mob.position)

          // Bow code removed - only melee attack
          {
            // Tấn công cận chiến - giảm spam từ 15 xuống 5 lần
            equipBestWeapon()
            bot.setControlState('sprint', true)

            if (mob && mob.isValid && mobDistance <= 7) {
              // Giảm spam attack từ 15 xuống 5 lần để giảm lag
              for (let attack = 0; attack < 5; attack++) {
                meleeAttack(mob, mobDistance)
              }

              // Chỉ log mỗi 5 giây
              if (!lastAttackTime || currentTime - lastAttackTime > 5000) {
                console.log(`⚔️ Attacking ${mob.name} x5`)
              }
            }
          }

          // Thu thập item sau khi giết
          setTimeout(() => {
            const entities = Object.values(bot.entities)
            for (const entity of entities) {
              if (entity.name === 'item' && entity.position &&
                  bot.entity.position.distanceTo(entity.position) < 8) {
                bot.collectBlock.collect(entity).catch(() => {})
              }
            }
          }, 1000)

        } else {
          // Không có mob gần, di chuyển ngẫu nhiên để tìm
          if (Math.random() < 0.3) { // 30% cơ hội di chuyển
            const randomX = Math.floor(Math.random() * 21) - 10
            const randomZ = Math.floor(Math.random() * 21) - 10
            const currentPos = bot.entity.position
            const goal = new goals.GoalXZ(currentPos.x + randomX, currentPos.z + randomZ)
            bot.pathfinder.setGoal(goal)
          }
        }
      } catch (error) {
        console.log('Lỗi auto farm:', error)
        bot.pathfinder.setGoal(null)
        bot.pvp.stop()
      }
    }, 1500) // Giảm tần suất farm từ 500ms lên 1500ms để giảm spam
  }

  stopAutoFarm = function() {
    autoFarmActive = false
    if (farmInterval) clearInterval(farmInterval)
    bot.pathfinder.setGoal(null)
    bot.pvp.stop()
    bot.setControlState('sprint', false)
    console.log('⏹️ Auto Farm All - Deactivated')
  }

  // ------------------ AUTO MINING SYSTEM - IMPLEMENTED PER USER REQUIREMENTS ------------------
  startAutoMining = function(oreType: string) {
    // 1. Dừng các hoạt động khác trước khi bắt đầu mine
    stopFollowing()
    stopProtecting()
    if (autoFishingActive) stopSmartAutoFishing()
    autoFarmActive = false

    autoMiningActive = true
    targetOreType = oreType.toLowerCase()
    currentMiningTarget = null
    lastMinedPosition = null

    bot.chat(`⛏️ Bắt đầu auto mine ${oreType}! Tớ sẽ tìm kiếm trong phạm vi 128 blocks!`)
    console.log(`🔥 Auto Mining ${oreType} - Activated`)

    // Clear previous interval if any
    if (miningInterval) {
      clearInterval(miningInterval)
    }

    miningInterval = setInterval(async () => {
      // Kiểm tra ngay để phản ứng nhanh với lệnh dừng
      if (!autoMiningActive) {
        clearInterval(miningInterval!)
        miningInterval = null
        return
      }

      try {
        await executeMiningCycle()
      } catch (error) {
        console.log('❌ Lỗi auto mining:', error)
        bot.pathfinder.setGoal(null)
      }
    }, 3000) // 3 giây mỗi cycle
  }

  // Hàm thực hiện một chu kỳ mining theo yêu cầu user
  async function executeMiningCycle() {
    // Check if mining is still active first
    if (!autoMiningActive) {
      console.log('⏹️ Mining stopped, exiting cycle')
      return
    }

    // 2. Quét và tìm mục tiêu với bot.findBlock() - phạm vi 128 blocks
    if (isCurrentlyDigging) {
      return // Bỏ qua nếu đang đào
    }

    // Kiểm tra túi đồ đầy - edge case handling
    const inventoryFull = bot.inventory.emptySlotCount() <= 2
    if (inventoryFull) {
      bot.chat('🎒 Túi đồ đầy rồi! Dừng auto mine!')
      stopAutoMining()
      return
    }

    // Kiểm tra đói - CHỈ ĐỔI SANG THỨC ĂN KHI THỰC SỰ ĐÓI
    const food = bot.food
    if (food < 6) { // Chỉ khi đói dưới 6 (3 đùi)
      const safeFood = bot.inventory.items().find(item => {
        const name = item.name.toLowerCase()
        const safeItems = [
          'bread', 'apple', 'cooked_beef', 'cooked_pork', 'cooked_chicken',
          'cooked_salmon', 'cooked_cod', 'baked_potato', 'carrot',
          'golden_apple', 'enchanted_golden_apple', 'cooked_mutton',
          'cookie', 'melon_slice', 'sweet_berries'
        ]
        return safeItems.some(safe => name.includes(safe))
      })

      if (safeFood && !isEating) {
        console.log(`🍞 Mining: Đói (${food}/20), ăn ${safeFood.name} trước khi tiếp tục`)
        isEating = true

        try {
          await bot.equip(safeFood, 'hand')
          await bot.consume()
          console.log(`✅ Đã ăn ${safeFood.name}, tiếp tục mining`)
          isEating = false

          // Trang bị lại pickaxe sau khi ăn
          await equipBestPickaxe()
        } catch (eatError) {
          console.log('⚠️ Lỗi ăn:', eatError.message)
          isEating = false
        }
        return // Bỏ qua cycle này để ăn
      }
    }

    // Trang bị pickaxe tốt nhất (chỉ khi không đang ăn)
    if (!isEating) {
      if (!await equipBestPickaxe()) {
        bot.chat('🥺 Không có pickaxe để đào!')
        stopAutoMining()
        return
      }
    }

    // Tìm block quặng - sử dụng bot.findBlock() như yêu cầu
    const oreBlock = bot.findBlock({
      matching: (block: any) => {
        if (!block) return false
        return isTargetOreType(block, targetOreType)
      },
      maxDistance: 128, // Đúng như yêu cầu user - phạm vi 128 blocks
      useExtraInfo: true,
      count: 1 // Tìm 1 block một lần như yêu cầu user
    })

    if (oreBlock) {
      // Reset search khi tìm thấy
      console.log(`⛏️ Tìm thấy ${oreBlock.name} tại (${oreBlock.position.x}, ${oreBlock.position.y}, ${oreBlock.position.z})`)

      // 3. Tính toán và di chuyển đến mục tiêu - đào từng block một
      await approachAndDigTarget(oreBlock)

    } else {
      // 4. Xử lý trường hợp đặc biệt - không tìm thấy quặng
      console.log(`🔍 Không tìm thấy ${targetOreType} trong phạm vi 128 blocks`)

      // Di chuyển ngẫu nhiên để khám phá vùng mới
      await exploreRandomDirection()
    }
  }

  // Kiểm tra xem block có phải là loại quặng đích không
  function isTargetOreType(block: any, oreType: string): boolean {
    const blockName = block.name.toLowerCase()

    // Mapping các tên quặng Minecraft
    const oreMapping: { [key: string]: string[] } = {
      'diamond': ['diamond_ore', 'deepslate_diamond_ore'],
      'iron': ['iron_ore', 'deepslate_iron_ore'],
      'gold': ['gold_ore', 'deepslate_gold_ore', 'nether_gold_ore'],
      'coal': ['coal_ore', 'deepslate_coal_ore'],
      'copper': ['copper_ore', 'deepslate_copper_ore'],
      'emerald': ['emerald_ore', 'deepslate_emerald_ore'],
      'redstone': ['redstone_ore', 'deepslate_redstone_ore'],
      'lapis': ['lapis_ore', 'deepslate_lapis_ore'],
      'netherite': ['ancient_debris'],
      'ancient_debris': ['ancient_debris']
    }

    const targetOres = oreMapping[oreType] || [oreType + '_ore', 'deepslate_' + oreType + '_ore']
    return targetOres.some(ore => blockName.includes(ore))
  }

  // Trang bị pickaxe tốt nhất với ưu tiên từ xịn đến cùi
  async function equipBestPickaxe(): Promise<boolean> {
    try {
      // Tìm tất cả pickaxe trong inventory
      const pickaxes = bot.inventory.items().filter(item => item.name.includes('pickaxe'))

      if (pickaxes.length > 0) {
        // Ưu tiên từ xịn đến cùi: netherite > diamond > iron > stone > wooden
        const priority = ['netherite', 'diamond', 'iron', 'stone', 'wooden', 'wood']
        let bestPickaxe = null

        // Tìm pickaxe tốt nhất theo thứ tự ưu tiên
        for (const material of priority) {
          const pickaxe = pickaxes.find(p => p.name.includes(material))
          if (pickaxe) {
            bestPickaxe = pickaxe
            break
          }
        }

        // Nếu không tìm thấy theo priority, lấy cái đầu tiên
        if (!bestPickaxe) {
          bestPickaxe = pickaxes[0]
        }

        // Chỉ trang bị nếu chưa cầm pickaxe này
        if (!bot.heldItem || bot.heldItem.name !== bestPickaxe.name) {
          await bot.equip(bestPickaxe, 'hand')
          console.log(`⛏️ Trang bị ${bestPickaxe.name} để đào`)
        }
        return true
      } else {
        console.log('⚠️ Không có pickaxe nào trong inventory!')
        return false
      }
    } catch (error) {
      console.log('❌ Lỗi trang bị pickaxe:', error.message || error)
      return false
    }
  }

  // 3. Di chuyển đến mục tiêu và đào - cải thiện để tránh lỗi "Digging aborted"
  async function approachAndDigTarget(oreBlock: any) {
    // Check if mining is still active
    if (!autoMiningActive) {
      console.log('⏹️ Mining stopped during approach, aborting')
      return
    }

    try {
      isCurrentlyDigging = true
      currentMiningTarget = oreBlock

      // Đảm bảo đang cầm pickaxe trước khi đào
      if (!bot.heldItem || !bot.heldItem.name.includes('pickaxe')) {
        console.log('⛏️ Trang bị pickaxe trước khi đào...')
        if (!await equipBestPickaxe()) {
          console.log('❌ Không có pickaxe, bỏ qua block này')
          return
        }
      }

      const distance = bot.entity.position.distanceTo(oreBlock.position)

      // Di chuyển gần target nếu cần - tối ưu hóa pathfinding
      if (distance > 3.5) {
        console.log(`🚶 Di chuyển đến quặng (${Math.round(distance)} blocks away)`)

        // Dừng tất cả pathfinding trước khi thiết lập mới
        bot.pathfinder.setGoal(null)
        await new Promise(resolve => setTimeout(resolve, 200))

        // Thiết lập pathfinder cải thiện
        const movements = new Movements(bot)
        movements.canDig = true
        movements.digCost = 1   // Giảm cost để đào nhanh hơn
        movements.allow1by1towers = true
        movements.allowParkour = true
        movements.allowSprinting = false  // Tắt sprint khi đào để chính xác hơn
        movements.blocksCantBreak.clear()
        movements.blocksCantBreak.add(bot.registry.blocksByName.bedrock?.id || 0)
        movements.blocksCantBreak.add(bot.registry.blocksByName.barrier?.id || 0)
        movements.scafoldingBlocks = [bot.registry.itemsByName.cobblestone?.id, bot.registry.itemsByName.dirt?.id].filter(Boolean)
        bot.pathfinder.setMovements(movements)

        // Di chuyển đến vị trí tối ưu (gần hơn)
        const goal = new goals.GoalNear(oreBlock.position.x, oreBlock.position.y, oreBlock.position.z, 1.5)
        bot.pathfinder.setGoal(goal)

        // Đợi di chuyển với timeout ngắn hơn
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Dừng pathfinder trước khi đào
        bot.pathfinder.setGoal(null)
        await new Promise(resolve => setTimeout(resolve, 300))
      }

      // Kiểm tra block vẫn tồn tại và có thể đào được
      const currentBlock = bot.blockAt(oreBlock.position)
      if (!currentBlock || currentBlock.name === 'air' || currentBlock.name !== oreBlock.name) {
        console.log(`⚠️ Block ${oreBlock.name} đã bị đào hoặc không tồn tại`)
        lastMinedPosition = { ...oreBlock.position, timestamp: Date.now() }
        return
      }

      // Kiểm tra khoảng cách cuối cùng
      const finalDistance = bot.entity.position.distanceTo(oreBlock.position)
      if (finalDistance > 5) {
        console.log(`⚠️ Quá xa để đào (${finalDistance.toFixed(1)} blocks), bỏ qua`)
        return
      }

      // Chuẩn bị đào: nhìn về phía block và đứng yên
      console.log(`⛏️ Bắt đầu đào ${oreBlock.name}...`)
      bot.setControlState('forward', false)
      bot.setControlState('back', false)
      bot.setControlState('left', false)
      bot.setControlState('right', false)
      bot.setControlState('sprint', false)

      await bot.lookAt(oreBlock.position.offset(0.5, 0.5, 0.5), true)
      await new Promise(resolve => setTimeout(resolve, 500))

      // Kiểm tra lại pickaxe trước khi đào
      if (!bot.heldItem || !bot.heldItem.name.includes('pickaxe')) {
        await equipBestPickaxe()
        await new Promise(resolve => setTimeout(resolve, 300))
      }

      // Đào với improved error handling
      let digSuccess = false
      for (let attempt = 0; attempt < 3; attempt++) {
        // Check if mining is still active before each attempt
        if (!autoMiningActive) {
          console.log('⏹️ Mining stopped during dig attempts, aborting')
          break
        }

        try {
          const digBlock = bot.blockAt(oreBlock.position)
          if (!digBlock || digBlock.name === 'air') {
            console.log(`⚠️ Block đã biến mất trong lúc đào`)
            break
          }

          console.log(`⛏️ Thử đào lần ${attempt + 1}...`)

          // Đào với timeout ngắn hơn cho mỗi attempt
          const digPromise = bot.dig(digBlock)
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Dig timeout')), 8000)
          )

          await Promise.race([digPromise, timeoutPromise])
          console.log(`✅ Đã đào xong ${oreBlock.name}!`)
          digSuccess = true
          break

        } catch (digError) {
          const errorMsg = digError.message || digError.toString()

          if (errorMsg.includes('Digging aborted') || errorMsg.includes('aborted')) {
            console.log(`⚠️ Đào bị hủy lần ${attempt + 1}, thử lại...`)

            // Reset trạng thái và thử lại
            try {
              bot.stopDigging()
            } catch (e) {}

            await new Promise(resolve => setTimeout(resolve, 500))

            // Trang bị lại pickaxe và điều chỉnh vị trí
            await equipBestPickaxe()
            await bot.lookAt(oreBlock.position.offset(0.5, 0.5, 0.5), true)
            await new Promise(resolve => setTimeout(resolve, 300))

          } else if (errorMsg.includes('Dig timeout')) {
            console.log(`⏰ Timeout lần ${attempt + 1}`)
            try {
              bot.stopDigging()
            } catch (e) {}
            await new Promise(resolve => setTimeout(resolve, 200))
          } else {
            console.log(`❌ Lỗi đào lần ${attempt + 1}: ${errorMsg}`)
            break
          }
        }
      }

      if (!digSuccess) {
        console.log(`❌ Không thể đào ${oreBlock.name} sau 3 lần thử`)
        bot.chat('😵 Block này khó đào quá, tớ bỏ qua nhé!')
      }

      // Lưu vị trí đã đào để tránh lặp lại
      lastMinedPosition = { ...oreBlock.position, timestamp: Date.now() }

      // Thu thập items rơi
      await collectDroppedItems(oreBlock.position)

    } catch (error) {
      console.log('❌ Lỗi approach and dig:', error.message || error)
      try {
        bot.stopDigging()
      } catch (e) {}

      // Lưu vị trí lỗi để không thử lại
      lastMinedPosition = { ...oreBlock.position, timestamp: Date.now() }
    } finally {
      isCurrentlyDigging = false
      currentMiningTarget = null

      // Reset control states
      bot.setControlState('forward', false)
      bot.setControlState('back', false)
      bot.setControlState('left', false)
      bot.setControlState('right', false)
      bot.setControlState('sprint', false)
    }
  }

  // Thu thập items rơi sau khi đào
  async function collectDroppedItems(digPosition: any) {
    console.log('🎁 Thu thập items...')
    await new Promise(resolve => setTimeout(resolve, 1000))

    try {
      const entities = Object.values(bot.entities)
      const nearbyItems = entities
        .filter(entity => entity.name === 'item' && entity.position)
        .filter(entity => {
          const distance = digPosition.distanceTo(entity.position!)
          return distance < 8
        })
        .sort((a, b) => {
          const distA = digPosition.distanceTo(a.position!)
          const distB = digPosition.distanceTo(b.position!)
          return distA - distB
        })

      let itemsCollected = 0
      for (const entity of nearbyItems.slice(0, 3)) {
        try {
          await bot.collectBlock.collect(entity)
          itemsCollected++
          await new Promise(resolve => setTimeout(resolve, 300))
        } catch (collectError) {
          // Bỏ qua lỗi thu thập
        }
      }

      if (itemsCollected > 0) {
        console.log(`✅ Thu thập ${itemsCollected} items`)
      }
    } catch (error) {
      console.log('⚠️ Lỗi thu thập items:', error)
    }
  }

  // Khám phá ngẫu nhiên khi không tìm thấy quặng
  async function exploreRandomDirection() {
    if (Math.random() < 0.4) { // 40% cơ hội di chuyển
      const distance = 20 + Math.random() * 15 // 20-35 blocks
      const angle = Math.random() * Math.PI * 2
      const currentPos = bot.entity.position

      const targetX = currentPos.x + Math.cos(angle) * distance
      const targetZ = currentPos.z + Math.sin(angle) * distance

      console.log(`🔍 Khám phá vùng mới để tìm ${targetOreType}...`)

      const movements = new Movements(bot)
      movements.canDig = true
      movements.digCost = 3
      bot.pathfinder.setMovements(movements)

      const goal = new goals.GoalXZ(targetX, targetZ)
      bot.pathfinder.setGoal(goal)

      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }

  // 5. Lệnh dừng auto mining
  stopAutoMining = function() {
    console.log('🛑 Stopping auto mining...')

    // Set flags first to stop all activities immediately
    autoMiningActive = false
    targetOreType = ''
    currentMiningTarget = null
    isCurrentlyDigging = false
    lastMinedPosition = null

    // Clear interval immediately
    if (miningInterval) {
      clearInterval(miningInterval)
      miningInterval = null
      console.log('✅ Mining interval cleared')
    }

    // Stop digging immediately
    try {
      if (bot.targetDigBlock) {
        bot.stopDigging()
        console.log('✅ Stopped current digging')
      }
    } catch (error) {
      // Ignore stop digging error
    }

    // Stop pathfinding
    try {
      bot.pathfinder.setGoal(null)
      console.log('✅ Pathfinder cleared')
    } catch (error) {
      // Ignore pathfinder error
    }

    // Reset control states
    try {
      bot.setControlState('forward', false)
      bot.setControlState('back', false)
      bot.setControlState('left', false)
      bot.setControlState('right', false)
      bot.setControlState('sprint', false)
    } catch (error) {
      // Ignore control state errors
    }

    // Chỉ chat khi được gọi trực tiếp
    if (!arguments[0] && bot && bot._client && bot._client.state === 'play') {
      bot.chat('⛏️ Dừng auto mine rồi nha!')
    }
    console.log('⏹️ Auto Mining - Deactivated completely')
  }

  // ------------------ AUTO CROP FARMING SYSTEM ------------------

  // Function to find and equip best hoe
  async function equipBestHoe(): Promise<boolean> {
    try {
      const hoes = bot.inventory.items().filter(item => item.name.includes('hoe'))

      if (hoes.length > 0) {
        const priority = ['netherite', 'diamond', 'iron', 'stone', 'wooden', 'wood']
        let bestHoe = hoes[0]

        for (const material of priority) {
          const hoe = hoes.find(h => h.name.includes(material))
          if (hoe) {
            bestHoe = hoe
            break
          }
        }

        if (!bot.heldItem || bot.heldItem.name !== bestHoe.name) {
          await bot.equip(bestHoe, 'hand')
          console.log(`🌾 Đã trang bị ${bestHoe.name}`)
        }
        currentHoeTool = bestHoe
        return true
      } else {
        console.log('❌ Không tìm thấy cuốc (hoe) trong túi đồ')
        return false
      }
    } catch (error) {
      console.log('❌ Lỗi trang bị cuốc:', error)
      return false
    }
  }

  // Check if crop is mature
  function isCropMature(block: any): boolean {
    if (!block || !block.name) return false

    const blockName = block.name.toLowerCase()

    // Get age from block metadata - use different methods
    let cropAge = -1
    try {
      // Method 1: Try getProperties() if available
      if (block.getProperties && typeof block.getProperties === 'function') {
        const props = block.getProperties()
        if (props && props.age !== undefined) {
          cropAge = props.age
        }
      }

      // Method 2: Try direct metadata access
      if (cropAge === -1 && block.metadata !== undefined) {
        cropAge = block.metadata
      }

      // Method 3: Check block state
      if (cropAge === -1 && block.stateId !== undefined) {
        // For wheat/carrots/potatoes: stateId represents age directly in many cases
        // This is a simplified check - stateId contains encoded block data
        cropAge = block.stateId % 8 // Age is typically stored in lower 3 bits
      }
    } catch (error) {
      console.log('⚠️ Lỗi lấy crop age:', error)
      return false
    }

    console.log(`🌾 Checking crop: ${blockName}, age: ${cropAge}`)

    // Wheat, carrots, potatoes need age 7
    if (blockName.includes('wheat') || blockName.includes('carrots') || blockName.includes('potatoes')) {
      return cropAge === 7
    }

    // Beetroot needs age 3
    if (blockName.includes('beetroots')) {
      return cropAge === 3
    }

    // Nether wart needs age 3
    if (blockName.includes('nether_wart')) {
      return cropAge === 3
    }

    return false
  }

  // Find seeds in inventory
  function findSeeds(): any {
    const seeds = bot.inventory.items().find(item => {
      const name = item.name.toLowerCase()
      return name.includes('wheat_seeds') ||
             name.includes('carrot') ||
             name.includes('potato') ||
             name.includes('beetroot_seeds') ||
             name.includes('nether_wart')
    })
    return seeds
  }

  // Find bone meal in inventory
  function findBoneMeal(): any {
    return bot.inventory.items().find(item =>
      item.name.toLowerCase().includes('bone_meal')
    )
  }

  // Start auto crop farming
  startAutoCropFarmer = function() {
    // Stop other activities
    stopFollowing()
    stopProtecting()
    if (autoFishingActive) stopSmartAutoFishing()
    if (autoFarmActive) stopAutoFarm()
    if (autoMiningActive) stopAutoMining()
    if (autoChestHuntingActive) stopAutoChestHunting()

    autoCropFarmerActive = true
    harvestedCrops.clear()

    bot.chat('🌾 Bắt đầu auto farmer! Tớ sẽ thu hoạch và trồng cây!')
    console.log('🌾 Auto Crop Farmer - Activated')

    // Clear previous interval if exists
    if (cropFarmerInterval) {
      clearInterval(cropFarmerInterval)
    }

    cropFarmerInterval = setInterval(async () => {
      if (!autoCropFarmerActive) {
        clearInterval(cropFarmerInterval!)
        cropFarmerInterval = null
        return
      }

      try {
        await executeCropFarmingCycle()
      } catch (error) {
        console.log('❌ Lỗi auto crop farming:', error)
        bot.pathfinder.setGoal(null)
      }
    }, 2000) // Every 2 seconds
  }

  // Execute one crop farming cycle
  async function executeCropFarmingCycle() {
    if (!autoCropFarmerActive) return

    // Step 1: Check and equip hoe
    if (!await equipBestHoe()) {
      bot.chat('🥺 Không tìm thấy cuốc (hoe). Dừng auto farmer!')
      stopAutoCropFarmer()
      return
    }

    // Step 2: Find and harvest mature crops
    console.log('🔍 Đang tìm cây trồng chín trong vòng 32 blocks...')

    // First, scan for ANY crops to debug
    const anyCrop = bot.findBlock({
      matching: (block: any) => {
        if (!block) return false
        const blockName = block.name.toLowerCase()
        return blockName.includes('wheat') ||
               blockName.includes('carrots') ||
               blockName.includes('potatoes') ||
               blockName.includes('beetroots')
      },
      maxDistance: 32,
      count: 1
    })

    if (anyCrop) {
      console.log(`✅ Tìm thấy cây trồng: ${anyCrop.name} tại (${anyCrop.position.x}, ${anyCrop.position.y}, ${anyCrop.position.z})`)
    } else {
      console.log('❌ KHÔNG tìm thấy bất kỳ cây trồng nào trong 32 blocks!')
    }

    // Now find mature crops - skip immature ones silently
    const matureCrop = bot.findBlock({
      matching: (block: any) => {
        if (!block || !block.position) return false
        const blockName = block.name.toLowerCase()
        const isCrop = blockName.includes('wheat') ||
                      blockName.includes('carrots') ||
                      blockName.includes('potatoes') ||
                      blockName.includes('beetroots')
        if (!isCrop) return false

        // Check if mature, skip silently if not
        const mature = isCropMature(block)
        return mature
      },
      maxDistance: 32,
      count: 1
    })

    if (matureCrop) {
      const posKey = `${matureCrop.position.x},${matureCrop.position.y},${matureCrop.position.z}`
      if (!harvestedCrops.has(posKey)) {
        console.log(`🌾 Tìm thấy cây chín tại (${matureCrop.position.x}, ${matureCrop.position.y}, ${matureCrop.position.z})`)

        // Move to crop
        const movements = new Movements(bot)
        movements.canDig = false
        bot.pathfinder.setMovements(movements)

        try {
          await bot.pathfinder.goto(new goals.GoalNear(matureCrop.position.x, matureCrop.position.y, matureCrop.position.z, 1))

          // Harvest the crop
          await bot.dig(matureCrop)
          console.log(`✅ Đã thu hoạch ${matureCrop.name}`)
          harvestedCrops.add(posKey)

          // Collect dropped items
          await new Promise(resolve => setTimeout(resolve, 500))
          const entities = Object.values(bot.entities)
          for (const entity of entities) {
            if (entity.name === 'item' && entity.position &&
                bot.entity.position.distanceTo(entity.position) < 5) {
              bot.collectBlock.collect(entity).catch(() => {})
            }
          }

          return // Process one crop per cycle
        } catch (error) {
          console.log('❌ Lỗi thu hoạch:', error)
        }
      } else {
        console.log('⏭️ Cây này đã thu hoạch rồi, tìm cây khác...')
      }
    } else {
      console.log('❌ Không tìm thấy cây chín nào, tìm đất trống để trồng...')
    }

    // Step 3: Find empty farmland and plant seeds
    console.log('🔍 Đang tìm đất trống để trồng hạt...')
    const emptyFarmland = bot.findBlock({
      matching: (block: any) => {
        if (!block || block.name !== 'farmland') return false
        if (!block.position) return false // Check position exists

        // Check if there's no crop above it - with null safety
        try {
          const blockAbove = bot.blockAt(block.position.offset(0, 1, 0))
          return blockAbove && blockAbove.name === 'air'
        } catch (error) {
          return false
        }
      },
      maxDistance: 32,
      count: 1
    })

    if (emptyFarmland) {
      const seeds = findSeeds()
      if (seeds) {
        console.log(`🌱 Tìm thấy đất trống tại (${emptyFarmland.position.x}, ${emptyFarmland.position.y}, ${emptyFarmland.position.z})`)

        try {
          // Move to farmland
          await bot.pathfinder.goto(new goals.GoalNear(emptyFarmland.position.x, emptyFarmland.position.y, emptyFarmland.position.z, 1))

          // Equip seeds
          await bot.equip(seeds, 'hand')

          // Plant on the farmland
          const plantPosition = emptyFarmland.position.offset(0, 1, 0)
          await bot.placeBlock(emptyFarmland, new Vec3(0, 1, 0))
          console.log(`✅ Đã trồng ${seeds.name}`)

          // Optional: Use bone meal if available
          const boneMeal = findBoneMeal()
          if (boneMeal) {
            await new Promise(resolve => setTimeout(resolve, 300))
            const plantedBlock = bot.blockAt(plantPosition)
            if (plantedBlock && plantedBlock.name !== 'air') {
              try {
                await bot.equip(boneMeal, 'hand')
                await bot.activateBlock(plantedBlock)
                console.log(`💚 Đã bón phân cho cây`)
              } catch (error) {
                // Bone meal might fail, that's ok
              }
            }
          }

          // Re-equip hoe
          await equipBestHoe()
          return
        } catch (error) {
          console.log('❌ Lỗi trồng cây:', error)
        }
      } else {
        console.log('❌ Không tìm thấy hạt giống để trồng')
      }
    } else {
      console.log('❌ Không tìm thấy đất trống để trồng')
    }

    // Step 4: Check inventory and store items if needed
    const inventorySpace = bot.inventory.emptySlotCount()
    if (inventorySpace <= 3) {
      console.log('🎒 Túi đồ gần đầy, tìm rương để cất...')

      const chest = bot.findBlock({
        matching: (block: any) => block && (block.name === 'chest' || block.name === 'barrel'),
        maxDistance: 32,
        count: 1
      })

      if (chest) {
        try {
          await bot.pathfinder.goto(new goals.GoalNear(chest.position.x, chest.position.y, chest.position.z, 1))
          const chestContainer = await bot.openContainer(chest)

          // Store crops and excess seeds, keep hoe and some seeds/bone meal
          const itemsToStore = bot.inventory.items().filter(item => {
            const name = item.name.toLowerCase()
            if (name.includes('hoe')) return false // Keep hoe
            if (name.includes('bone_meal') && item.count <= 16) return false // Keep some bone meal
            if (name.includes('seeds') && item.count <= 16) return false // Keep some seeds
            if (name.includes('carrot') && item.count <= 16) return false
            if (name.includes('potato') && item.count <= 16) return false
            return true
          })

          for (const item of itemsToStore) {
            try {
              await chestContainer.deposit(item.type, null, item.count)
              console.log(`📦 Đã cất ${item.name} x${item.count}`)
              await new Promise(resolve => setTimeout(resolve, 100))
            } catch (error) {
              console.log('❌ Lỗi cất đồ:', error)
            }
          }

          chestContainer.close()
          bot.chat('✅ Đã cất đồ vào rương!')
        } catch (error) {
          console.log('❌ Không thể mở rương:', error)
          bot.chat('🥺 Không tìm thấy rương hoặc rương đầy. Dừng auto farmer!')
          stopAutoCropFarmer()
        }
      } else {
        bot.chat('🥺 Không tìm thấy rương. Dừng auto farmer!')
        stopAutoCropFarmer()
      }
    }
  }

  // Stop auto crop farming
  stopAutoCropFarmer = function() {
    console.log('🛑 Stopping auto crop farmer...')

    autoCropFarmerActive = false
    currentHoeTool = null
    harvestedCrops.clear()

    if (cropFarmerInterval) {
      clearInterval(cropFarmerInterval)
      cropFarmerInterval = null
    }

    try {
      bot.pathfinder.setGoal(null)
    } catch (error) {
      // Ignore
    }

    bot.chat('🌾 Dừng auto farmer rồi!')
    console.log('⏹️ Auto Crop Farmer - Deactivated')
  }

  // ------------------ AUTO EXPLORE SYSTEM ------------------

  // Minecraft structure signatures - 2 block patterns to identify structures
  const STRUCTURE_SIGNATURES = {
    'Village': [
      { blocks: ['oak_planks', 'cobblestone'], pattern: 'adjacent' },
      { blocks: ['oak_log', 'oak_planks'], pattern: 'vertical' },
      { blocks: ['hay_block', 'oak_planks'], pattern: 'adjacent' }
    ],
    'Desert Temple': [
      { blocks: ['sandstone', 'orange_terracotta'], pattern: 'adjacent' },
      { blocks: ['chiseled_sandstone', 'sandstone'], pattern: 'vertical' }
    ],
    'Jungle Temple': [
      { blocks: ['mossy_cobblestone', 'cobblestone'], pattern: 'adjacent' },
      { blocks: ['cobblestone', 'vine'], pattern: 'adjacent' }
    ],
    'Witch Hut': [
      { blocks: ['oak_planks', 'spruce_planks'], pattern: 'adjacent' },
      { blocks: ['oak_fence', 'spruce_planks'], pattern: 'vertical' }
    ],
    'Ocean Monument': [
      { blocks: ['prismarine', 'prismarine_bricks'], pattern: 'adjacent' },
      { blocks: ['dark_prismarine', 'prismarine'], pattern: 'adjacent' }
    ],
    'Stronghold': [
      { blocks: ['stone_bricks', 'cracked_stone_bricks'], pattern: 'adjacent' },
      { blocks: ['iron_bars', 'stone_bricks'], pattern: 'adjacent' }
    ],
    'Mineshaft': [
      { blocks: ['oak_fence', 'cobweb'], pattern: 'adjacent' },
      { blocks: ['rail', 'oak_planks'], pattern: 'adjacent' }
    ],
    'Nether Fortress': [
      { blocks: ['nether_bricks', 'nether_brick_fence'], pattern: 'adjacent' },
      { blocks: ['nether_bricks', 'nether_brick_stairs'], pattern: 'adjacent' }
    ],
    'End City': [
      { blocks: ['end_stone_bricks', 'purpur_block'], pattern: 'adjacent' },
      { blocks: ['purpur_pillar', 'purpur_block'], pattern: 'vertical' }
    ],
    'Pillager Outpost': [
      { blocks: ['dark_oak_log', 'dark_oak_planks'], pattern: 'vertical' },
      { blocks: ['cobblestone', 'dark_oak_log'], pattern: 'adjacent' }
    ],
    'Ruined Portal': [
      { blocks: ['obsidian', 'crying_obsidian'], pattern: 'adjacent' },
      { blocks: ['netherrack', 'obsidian'], pattern: 'adjacent' }
    ],
    'Shipwreck': [
      { blocks: ['oak_planks', 'oak_log'], pattern: 'adjacent' },
      { blocks: ['oak_fence', 'oak_planks'], pattern: 'adjacent' }
    ],
    'Buried Treasure': [
      { blocks: ['chest', 'sand'], pattern: 'vertical' },
      { blocks: ['chest', 'sandstone'], pattern: 'vertical' }
    ]
  }

  // Start auto explore
  startAutoExplore = function() {
    // Stop other activities
    stopFollowing()
    stopProtecting()
    if (autoFishingActive) stopSmartAutoFishing()
    if (autoFarmActive) stopAutoFarm()
    if (autoMiningActive) stopAutoMining()
    if (autoCropFarmerActive) stopAutoCropFarmer()
    if (autoChestHuntingActive) stopAutoChestHunting()

    autoExploreActive = true
    discoveredStructures.clear()

    // Pick a random direction to explore
    const angle = Math.random() * Math.PI * 2
    exploreDirection = {
      x: Math.cos(angle),
      z: Math.sin(angle)
    }

    bot.chat('🗺️ Bắt đầu khám phá! Tớ sẽ tìm công trình và đánh quái!')
    console.log('🗺️ Auto Explore - Activated')
    console.log(`📍 Hướng khám phá: ${Math.round(angle * 180 / Math.PI)}°`)

    // Clear previous interval
    if (exploreInterval) {
      clearInterval(exploreInterval)
    }

    exploreInterval = setInterval(async () => {
      if (!autoExploreActive) {
        clearInterval(exploreInterval!)
        exploreInterval = null
        return
      }

      try {
        await executeExploreCycle()
      } catch (error) {
        console.log('❌ Lỗi auto explore:', error)
        bot.pathfinder.setGoal(null)
      }
    }, 3000) // Every 3 seconds
  }

  // Execute one explore cycle
  async function executeExploreCycle() {
    if (!autoExploreActive) return

    const health = bot.health
    const food = bot.food

    // Step 1: Auto eat if hungry
    if (food < 6) {
      console.log('🍞 Đang đói, ăn thức ăn...')
      await eatFoodToHeal()
    }

    // Step 2: Scan for structures within 180 blocks
    await scanForStructures()

    // Step 3: Scan for hostile mobs
    const nearestMob = bot.nearestEntity((entity: any) => {
      if (!entity || !entity.position) return false
      const distance = bot.entity.position.distanceTo(entity.position)
      if (distance > 30) return false // Scan within 30 blocks

      const hostileMobs = [
        'zombie', 'skeleton', 'creeper', 'spider', 'witch', 'pillager', 'vindicator',
        'evoker', 'husk', 'stray', 'phantom', 'drowned', 'enderman', 'breeze', 'bogged',
        'slime', 'silverfish', 'cave_spider', 'wither_skeleton', 'blaze', 'ghast'
      ]
      const mobName = entity.name ? entity.name.toLowerCase() : ''
      const displayName = entity.displayName ? entity.displayName.toLowerCase() : ''

      const isHostile = hostileMobs.some(mobType =>
        mobName.includes(mobType) || displayName.includes(mobType)
      )

      return entity.type === 'mob' && isHostile
    })

    // Step 4: Combat if mob found and health > 6 (3 hearts)
    if (nearestMob && health > 6) {
      const distance = bot.entity.position.distanceTo(nearestMob.position)
      console.log(`⚔️ Phát hiện ${nearestMob.name || 'mob'} cách ${distance.toFixed(1)}m, đánh quái!`)

      // Equip weapon
      await equipBestSword()

      // Move towards mob
      const movements = new Movements(bot)
      movements.allowSprinting = true
      bot.pathfinder.setMovements(movements)

      try {
        await bot.pathfinder.goto(new goals.GoalNear(nearestMob.position.x, nearestMob.position.y, nearestMob.position.z, 2))

        // Attack mob
        bot.pvp.attack(nearestMob)

        // Wait for combat to finish
        await new Promise(resolve => setTimeout(resolve, 3000))

        bot.pvp.stop()
        console.log('✅ Đã tiêu diệt quái, tiếp tục khám phá')
      } catch (error) {
        console.log('⚠️ Lỗi khi đánh quái:', error?.message || error)
      }

      return
    } else if (nearestMob && health <= 6) {
      console.log(`⚠️ Máu yếu (${health}/20), tránh quái ${nearestMob.name || 'mob'}`)
    }

    // Step 5: Continue exploring in chosen direction
    const now = Date.now()
    if (now - lastExploreMove > 5000) { // Move every 5 seconds
      lastExploreMove = now

      const currentPos = bot.entity.position
      const distance = 40 + Math.random() * 40 // 40-80 blocks

      const targetX = currentPos.x + exploreDirection!.x * distance
      const targetZ = currentPos.z + exploreDirection!.z * distance

      const movements = new Movements(bot)
      movements.canDig = true
      movements.allowSprinting = true
      bot.pathfinder.setMovements(movements)

      const goal = new goals.GoalXZ(targetX, targetZ)
      bot.pathfinder.setGoal(goal)

      console.log(`🚶 Di chuyển đến (${Math.floor(targetX)}, ${Math.floor(targetZ)})`)
    }
  }

  // Scan for structures
  async function scanForStructures() {
    const scanRadius = 180
    const botPos = bot.entity.position

    // Scan blocks in radius
    for (const [structureName, signatures] of Object.entries(STRUCTURE_SIGNATURES)) {
      for (const signature of signatures) {
        const [block1Name, block2Name] = signature.blocks

        // Find first block type
        const block1 = bot.findBlock({
          matching: (block: any) => block && block.name === block1Name,
          maxDistance: scanRadius,
          count: 1
        })

        if (!block1) continue

        // Check for second block nearby (adjacent or vertical)
        const offsets = signature.pattern === 'adjacent'
          ? [[1,0,0], [-1,0,0], [0,0,1], [0,0,-1]]
          : [[0,1,0], [0,-1,0]]

        for (const [dx, dy, dz] of offsets) {
          const checkPos = block1.position.offset(dx, dy, dz)
          const block2 = bot.blockAt(checkPos)

          if (block2 && block2.name === block2Name) {
            // Found structure signature!
            const structureKey = `${structureName}_${Math.floor(block1.position.x)}_${Math.floor(block1.position.z)}`

            if (!discoveredStructures.has(structureKey)) {
              discoveredStructures.add(structureKey)
              const coords = `(${Math.floor(block1.position.x)}, ${Math.floor(block1.position.y)}, ${Math.floor(block1.position.z)})`
              bot.chat(`🏛️ Phát hiện ${structureName} tại ${coords}!`)
              console.log(`🏛️ Discovered ${structureName} at ${coords}`)
              return // Only announce one structure per cycle
            }
          }
        }
      }
    }
  }

  // Stop auto explore
  stopAutoExplore = function() {
    console.log('🛑 Stopping auto explore...')

    autoExploreActive = false
    exploreDirection = null
    discoveredStructures.clear()

    if (exploreInterval) {
      clearInterval(exploreInterval)
      exploreInterval = null
    }

    try {
      bot.pathfinder.setGoal(null)
      bot.pvp.stop()
    } catch (error) {
      // Ignore
    }

    bot.chat('🗺️ Dừng khám phá rồi!')
    console.log('⏹️ Auto Explore - Deactivated')
  }

  // Heartbeat để duy trì connection - cải thiện với error handling
  setInterval(() => {
    if (bot && bot._client && bot._client.state === 'play') {
      try {
        // Chỉ heartbeat khi bot thực sự connected và không có hoạt động quan trọng
        if (!isCurrentlyDigging && !isEating) {
          bot.setControlState('sneak', true)
          setTimeout(() => {
            if (bot && bot._client && bot._client.state === 'play') {
              try {
                bot.setControlState('sneak', false)
              } catch (e) {
                // Ignore minor control errors
              }
            }
          }, 50) // Giảm delay từ 100ms xuống 50ms
        }
      } catch (error) {
        // Chỉ log lỗi heartbeat nếu không phải EPIPE
        if (!error.message?.includes('EPIPE')) {
          console.log('⚠️ Heartbeat warning:', error.message || error)
        }
      }
    }
  }, 300000) // 5 phút

  // Auto-check bot presence in server every 5 seconds and reconnect if needed
  let presenceCheckFailures = 0
  const MAX_PRESENCE_FAILURES = 3
  let lastPresenceCheck = Date.now()

  setInterval(async () => {
    const currentTime = Date.now()

    // Kiểm tra xem bot có còn connected không
    if (!bot || !bot._client || bot._client.state !== 'play' || bot._client.ended) {
      presenceCheckFailures++
      console.log(`❌ Bot presence check failed (${presenceCheckFailures}/${MAX_PRESENCE_FAILURES})`)

      if (presenceCheckFailures >= MAX_PRESENCE_FAILURES && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        console.log('🔄 Bot not present in server, attempting reconnect...')

        // Reset presence failures
        presenceCheckFailures = 0

        // Cleanup current bot instance
        try {
          if (bot && bot._client && !bot._client.ended) {
            bot._client.end()
          }
        } catch (e) {
          // Ignore cleanup errors
        }

        // Trigger reconnect
        console.log('🚀 Reconnecting due to presence check failure...')
        setTimeout(() => {
          if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            console.log('🚀 Auto-reconnecting due to presence check failure...')
            createBot()
          }
        }, 2000)

        return
      }
    } else {
      // Bot is connected, check if it's actually responsive
      try {
        // Test if bot can perform basic operations
        const health = bot.health
        const position = bot.entity?.position

        if (health !== undefined && position) {
          // Bot is responsive, reset failure count
          if (presenceCheckFailures > 0) {
            console.log('✅ Bot presence restored')
            presenceCheckFailures = 0
          }
          lastPresenceCheck = currentTime
        } else {
          presenceCheckFailures++
          console.log(`⚠️ Bot unresponsive (${presenceCheckFailures}/${MAX_PRESENCE_FAILURES})`)
        }
      } catch (error) {
        presenceCheckFailures++
        console.log(`⚠️ Bot presence check error (${presenceCheckFailures}/${MAX_PRESENCE_FAILURES}):`, error.message || error)
      }
    }

    // Check for stale connection (no updates for 30+ seconds)
    if (currentTime - lastPresenceCheck > 30000) {
      presenceCheckFailures++
      console.log(`⏰ Stale connection detected (${presenceCheckFailures}/${MAX_PRESENCE_FAILURES})`)
    }

  }, 5000) // Kiểm tra mỗi 5 giây

  // Helper function để kiểm tra kết nối trước khi thực hiện hành động
  function isConnected(): boolean {
    return bot && bot._client && bot._client.state === 'play' && !bot._client.ended
  }

  // Helper function để thực hiện action an toàn
  function safeAction(action: () => void, actionName: string = 'action') {
    try {
      if (!isConnected()) {
        console.log(`⚠️ Bỏ qua ${actionName} - bot không connected`)
        return false
      }
      action()
      return true
    } catch (error) {
      if (!error.message?.includes('EPIPE')) {
        console.log(`⚠️ Lỗi ${actionName}:`, error.message || error)
      }
      return false
    }
  }

  // Error handling với improved EPIPE handling và auto-reconnect
  bot.on('error', (err: any) => {
    const errorMessage = err.message || err.toString()

    // Chỉ log lỗi quan trọng, bỏ qua spam
    if (!errorMessage.includes('write EPIPE') &&
        !errorMessage.includes('read ECONNRESET') &&
        !errorMessage.includes('ECONNRESET') &&
        !errorMessage.includes('ECONN') &&
        !errorMessage.includes('EADDRINUSE')) {
      console.log('🛑 Bot gặp lỗi:', errorMessage)
    }

    // Phân loại lỗi để xử lý phù hợp
    const criticalErrors = ['ENOTFOUND', 'Invalid username', 'EAUTH', 'Failed to authenticate', 'Invalid session']
    const networkErrors = ['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EPIPE', 'socketClosed', 'ECONN']
    const serverErrors = ['Server closed', 'Connection lost', 'Timed out', 'kicked']

    if (criticalErrors.some(errType => errorMessage.includes(errType))) {
      console.log('❌ Lỗi nghiêm trọng, dừng auto-reconnect')
      reconnectAttempts = MAX_RECONNECT_ATTEMPTS // Force stop reconnection
      return
    }

    if (networkErrors.some(errType => errorMessage.includes(errType)) ||
        serverErrors.some(errType => errorMessage.includes(errType))) {
      // Chỉ log EPIPE warning một lần
      if (errorMessage.includes('EPIPE') && !bot._epipeWarned) {
        console.log('⚠️ Kết nối bị ngắt (EPIPE), sẽ auto-reconnect...')
        bot._epipeWarned = true
      }

      // Cleanup safely để tránh thêm EPIPE errors
      try {
        stopAll()
      } catch (cleanupError) {
        // Ignore cleanup errors
      }

      // Trigger auto-reconnect for network/server errors if within limit
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        console.log('🔄 Network error detected, scheduling auto-reconnect...')
        setTimeout(() => {
          if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            console.log('🚀 Auto-reconnecting due to network error...')
            createBot()
          }
        }, 3000)
      }
      return
    }

    console.log('⚠️ Lỗi khác, tiếp tục hoạt động...')
  })

  bot.on('end', (reason: string) => {
    console.log('💔 Bot đã ngắt kết nối:', reason || 'Unknown reason')

    // Graceful cleanup - catch any errors
    try {
      // Clear all activities when disconnected
      autoFarmActive = false
      autoFishingActive = false
      if (typeof autoMiningActive !== 'undefined') {
        autoMiningActive = false
      }
      isEating = false
      if (typeof isCurrentlyDigging !== 'undefined') {
        isCurrentlyDigging = false
      }
      autoEatPluginActive = false
      autoChestHuntingActive = false
      isCurrentlyApproachingChest = false
      currentChestTarget = null

      // Clear intervals safely
      if (followInterval) clearInterval(followInterval)
      if (protectInterval) clearInterval(protectInterval)
      if (typeof miningInterval !== 'undefined' && miningInterval) clearInterval(miningInterval)
      if (fishingInterval) clearInterval(fishingInterval)
      if (hookCheckInterval) clearInterval(hookCheckInterval)
      if (chestHuntingInterval) clearInterval(chestHuntingInterval)

      // Reset pathfinder safely
      if (bot && bot.pathfinder) {
        try {
                    bot.pathfinder.setGoal(null)
        } catch (e) {
          // Ignore pathfinder errors during cleanup
        }
      }

      // Cleanup prismarine-viewer instance
      if (prismarineViewerInstance) {
        try {
          console.log('🧹 Cleaning up prismarine-viewer instance on disconnect...')
          if (typeof prismarineViewerInstance.close === 'function') {
            prismarineViewerInstance.close()
          }
          prismarineViewerInstance = null
          console.log('✅ Prismarine-viewer cleanup completed')
        } catch (viewerCleanupError) {
          // Silent cleanup để tránh spam log
          prismarineViewerInstance = null
        }
      }

      // Reset viewer setup flag to allow setup on reconnect
      prismarineViewerSetup = false
      console.log('🔄 Reset prismarine viewer setup flag for future connections')

    } catch (cleanupError) {
      console.log('⚠️ Lỗi cleanup khi disconnect:', cleanupError.message)
    }

    // Cập nhật bot status cho web interface
    setBotConnected(false)

    const shouldReconnect =
      (
        reason === 'socketClosed' ||
        reason === 'disconnect.timeout' ||
        reason === 'disconnect.quitting' ||
        reason === 'ECONNRESET' ||
        !reason || reason === ''
      ) &&
      reconnectAttempts < MAX_RECONNECT_ATTEMPTS

    if (shouldReconnect) {
      reconnectAttempts++
      // Tăng delay base lên 60s và max lên 5 phút để giảm spam reconnect
      const delay = Math.min(60000 * reconnectAttempts, 300000)
      console.log(`⏳ Server có thể đang không ổn định. Chờ ${delay/1000} giây trước khi reconnect... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`)

      setTimeout(async () => {
        console.log('🔄 Kiểm tra server và thử kết nối lại...')

        // Kiểm tra server trước khi reconnect
        const serverOnline = await testServerConnection()
        if (!serverOnline) {
          console.log('❌ Server vẫn offline, sẽ thử lại sau...')
          // Reset để thử lại
          setTimeout(() => createBot(), 30000)
          return
        }

        createBot()
      }, delay)
    } else {
      console.log('❌ Dừng auto-reconnect')
      console.log(`💡 Lý do: ${reason} | Số lần thử: ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`)

      // Reset reconnect counter sau 10 phút để có thể thử lại sau
      setTimeout(() => {
        reconnectAttempts = 0
        console.log('🔄 Reset reconnect counter, có thể thử manual restart')
      }, 600000)
    }
  })
}

// Khởi tạo bot
createBot()