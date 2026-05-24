import mineflayer from 'mineflayer';
import pathfinderPkg from 'mineflayer-pathfinder';
const { pathfinder, Movements } = pathfinderPkg;
import minecraftData from 'minecraft-data';
import { config } from './config.js';

const HOSTILE_ENTITY_NAMES = new Set([
  'blaze',
  'bogged',
  'cave_spider',
  'creeper',
  'drowned',
  'elder_guardian',
  'enderman',
  'endermite',
  'evoker',
  'ghast',
  'guardian',
  'hoglin',
  'husk',
  'magma_cube',
  'phantom',
  'piglin_brute',
  'pillager',
  'ravager',
  'shulker',
  'silverfish',
  'skeleton',
  'slime',
  'spider',
  'stray',
  'vex',
  'vindicator',
  'warden',
  'witch',
  'wither_skeleton',
  'zoglin',
  'zombie',
  'zombie_villager',
  'zombified_piglin',
]);

// Conditionally import prismarine-viewer
let mineflayerViewer = null;
if (config.viewer.enabled) {
  try {
    const viewerModule = await import('prismarine-viewer');
    mineflayerViewer = viewerModule.mineflayer;
    console.log('[Bot] prismarine-viewer loaded successfully');
  } catch (err) {
    console.warn('[Bot] Failed to load prismarine-viewer:', err.message);
    console.warn('[Bot] Run "npm install prismarine-viewer" to enable viewer');
  }
}

let mineflayerPvpPlugin = null;
try {
  const pvpModule = await import('mineflayer-pvp');
  mineflayerPvpPlugin = pvpModule.plugin || pvpModule.default?.plugin || pvpModule.default || null;
  if (mineflayerPvpPlugin) {
    console.log('[Bot] mineflayer-pvp loaded successfully');
  }
} catch (err) {
  console.warn('[Bot] Failed to load mineflayer-pvp:', err.message);
  console.warn('[Bot] Run "npm install" in the bot directory to enable advanced melee combat');
}

/**
 * Minecraft Bot wrapper class
 * Handles connection and provides interface for actions
 */
export class Bot {
  constructor() {
    this.bot = null;
    this.isConnected = false;
    this.viewerStarted = false;
    this.pvpEnabled = false;
  }

  /**
   * Connect to Minecraft server
   * @returns {Promise<void>}
   */
  async connect() {
    return new Promise((resolve, reject) => {
      console.log(`[Bot] Connecting to ${config.minecraft.host}:${config.minecraft.port}...`);
      
      this.bot = mineflayer.createBot({
        host: config.minecraft.host,
        port: config.minecraft.port,
        username: config.minecraft.username,
        version: config.minecraft.version,
      });

      // Load pathfinder plugin
      this.bot.loadPlugin(pathfinder);
      if (mineflayerPvpPlugin) {
        this.bot.loadPlugin(mineflayerPvpPlugin);
        this.pvpEnabled = true;
      }

      this.bot.once('spawn', () => {
        console.log('[Bot] Successfully spawned in game!');
        this.isConnected = true;
        
        // Setup pathfinder with mining capabilities
        const mcData = minecraftData(this.bot.version);
        const movements = new Movements(this.bot, mcData);
        
        // 启用挖掘功能 - 允许 bot 挖掘方块来开辟路径
        movements.canDig = true;
        // 允许放置方块（用于搭桥等）
        movements.allow1by1towers = true;
        // 允许在水中移动
        movements.canSwim = true;
        // 设置最大挖掘时间（毫秒）- 避免挖太硬的方块
        movements.maxDropDown = 4;
        // 设置挖掘的方块类型（排除基岩等）
        movements.blocksCantBreak.add(mcData.blocksByName['bedrock']?.id);
        movements.blocksCantBreak.add(mcData.blocksByName['obsidian']?.id);
        
        this.bot.pathfinder.setMovements(movements);
        
        // 保存 movements 引用以便后续修改
        this.movements = movements;
        if (this.hasPvpPlugin()) {
          this.bot.pvp.followRange = 2;
          this.bot.pvp.attackRange = 3.3;
          this.bot.pvp.viewDistance = 48;
          console.log('[Bot] PvP combat backend is active');
        }
        
        // Start prismarine-viewer if enabled
        if (config.viewer.enabled && mineflayerViewer && !this.viewerStarted) {
          try {
            mineflayerViewer(this.bot, {
              port: config.viewer.port,
              firstPerson: config.viewer.firstPerson
            });
            this.viewerStarted = true;
            console.log(`[Bot] Viewer started at http://localhost:${config.viewer.port}`);
          } catch (err) {
            console.error('[Bot] Failed to start viewer:', err.message);
          }
        }
        
        resolve();
      });

      this.bot.on('error', (err) => {
        console.error('[Bot] Error:', err);
        reject(err);
      });

      this.bot.on('end', () => {
        console.log('[Bot] Disconnected from server');
        this.isConnected = false;
      });

      this.bot.on('kicked', (reason) => {
        console.log('[Bot] Kicked from server:', reason);
        this.isConnected = false;
      });

      // Chat message handler
      this.bot.on('chat', (username, message) => {
        if (username === this.bot.username) return;
        console.log(`[Chat] <${username}> ${message}`);
      });
    });
  }

  /**
   * Send a chat message
   * @param {string} message 
   */
  chat(message) {
    if (this.bot) {
      this.bot.chat(message);
    }
  }

  /**
   * Get bot's current position
   * @returns {{x: number, y: number, z: number} | null}
   */
  getPosition() {
    if (!this.bot || !this.bot.entity) return null;
    const pos = this.bot.entity.position;
    return {
      x: Math.floor(pos.x),
      y: Math.floor(pos.y),
      z: Math.floor(pos.z),
    };
  }

  /**
   * Get bot's health and hunger
   * @returns {{health: number, food: number} | null}
   */
  getHealth() {
    if (!this.bot) return null;
    return {
      health: this.bot.health,
      food: this.bot.food,
    };
  }

  /**
   * Get nearby entities
   * @param {number} range 
   * @returns {Array}
   */
  getNearbyEntities(range = 16) {
    if (!this.bot) return [];
    const entities = [];
    for (const entity of Object.values(this.bot.entities)) {
      if (entity === this.bot.entity) continue;
      const distance = this.bot.entity.position.distanceTo(entity.position);
      if (distance <= range) {
        entities.push({
          type: entity.type,
          name: entity.name || entity.username || entity.displayName || 'unknown',
          displayName: entity.displayName || entity.username || entity.name || 'unknown',
          distance: Math.round(distance * 10) / 10,
          health: entity.health || null,
          isHostile: this.isHostileEntity(entity),
          isPlayer: entity.type === 'player',
          position: {
            x: Math.floor(entity.position.x),
            y: Math.floor(entity.position.y),
            z: Math.floor(entity.position.z),
          },
        });
      }
    }
    return entities;
  }

  /**
   * Get inventory items
   * @returns {Array}
   */
  getInventory() {
    if (!this.bot) return [];
    return this.bot.inventory.items().map(item => ({
      name: item.name,
      displayName: item.displayName,
      count: item.count,
      slot: item.slot,
      isFood: this._isFoodItem(item),
    }));
  }

  /**
   * Check whether an inventory item can be eaten.
   * @param {object} item
   * @returns {boolean}
   */
  _isFoodItem(item) {
    if (!item) return false;
    if (item.foodPoints > 0 || item.saturation > 0) {
      return true;
    }
    if (item.consumable === true) {
      return true;
    }
    const name = item.name || '';
    return [
      'apple',
      'beef',
      'bread',
      'carrot',
      'chicken',
      'cod',
      'golden_apple',
      'mutton',
      'porkchop',
      'potato',
      'rabbit',
      'salmon',
      'stew',
      'suspicious_stew',
    ].some(keyword => name.includes(keyword));
  }

  /**
   * Get hostile entity names known to the bot.
   * @returns {string[]}
   */
  getHostileEntityNames() {
    return [...HOSTILE_ENTITY_NAMES];
  }

  /**
   * Determine whether an entity should be treated as hostile.
   * @param {object} entity
   * @returns {boolean}
   */
  isHostileEntity(entity) {
    if (!entity) return false;
    const name = (entity.name || '').toLowerCase();
    return HOSTILE_ENTITY_NAMES.has(name);
  }

  /**
   * Get the underlying mineflayer bot instance
   * @returns {mineflayer.Bot}
   */
  getMineflayerBot() {
    return this.bot;
  }

  /**
   * Whether mineflayer-pvp is active on the current bot instance.
   * @returns {boolean}
   */
  hasPvpPlugin() {
    return !!(this.bot?.pvp && typeof this.bot.pvp.attack === 'function');
  }

  /**
   * Get current combat backend and target information.
   * @returns {{pvpEnabled: boolean, target: object|null}}
   */
  getCombatStatus() {
    if (!this.bot) {
      return { pvpEnabled: false, target: null };
    }

    const target = this.bot.pvp?.target;
    if (!target || !this.bot.entity) {
      return { pvpEnabled: this.hasPvpPlugin(), target: null };
    }

    return {
      pvpEnabled: this.hasPvpPlugin(),
      target: {
        id: target.id,
        name: target.name || target.username || target.displayName || 'unknown',
        type: target.type,
        distance: Math.round(this.bot.entity.position.distanceTo(target.position) * 10) / 10,
      },
    };
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.bot) {
      if (this.hasPvpPlugin() && typeof this.bot.pvp.forceStop === 'function') {
        this.bot.pvp.forceStop();
      }
      this.bot.quit();
      this.bot = null;
      this.isConnected = false;
      this.pvpEnabled = false;
    }
  }
}

export default Bot;
