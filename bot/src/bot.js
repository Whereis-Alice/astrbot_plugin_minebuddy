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

export class Bot {
  constructor() {
    this.bot = null;
    this.isConnected = false;
    this.viewerStarted = false;
    this.pvpEnabled = false;
    this.connectionState = 'idle';
    this.lastConnectError = null;
    this.lastDisconnectReason = null;
    this.lastKickReason = null;
    this.lastConnectStartedAt = null;
    this.lastSpawnAt = null;
    this.lifecycleHandlers = new Set();
    this.movements = null;
  }

  addLifecycleHandler(handler) {
    if (typeof handler === 'function') {
      this.lifecycleHandlers.add(handler);
    }
  }

  removeLifecycleHandler(handler) {
    this.lifecycleHandlers.delete(handler);
  }

  _emitLifecycleEvent(type, payload = {}) {
    const event = {
      type,
      timestamp: Date.now(),
      ...payload,
    };

    for (const handler of this.lifecycleHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error('[Bot] Lifecycle handler error:', error);
      }
    }
  }

  _formatReason(reason) {
    if (reason === undefined || reason === null) {
      return 'unknown';
    }

    if (typeof reason === 'string') {
      return reason;
    }

    if (typeof reason === 'object' && typeof reason.toString === 'function') {
      const text = reason.toString();
      if (text && text !== '[object Object]') {
        return text;
      }
    }

    try {
      return JSON.stringify(reason);
    } catch (error) {
      return String(reason);
    }
  }

  _formatErrorMessage(error) {
    if (!error) {
      return 'unknown error';
    }
    return error.message || this._formatReason(error);
  }

  _buildConnectionError(phase, message, extra = {}) {
    const error = new Error(`[${phase}] ${message}`);
    error.phase = phase;
    error.details = extra;
    return error;
  }

  _recordConnectError(phase, message, extra = {}) {
    this.connectionState = 'failed';
    this.lastConnectError = {
      phase,
      message,
      ...extra,
      at: new Date().toISOString(),
    };
    this._emitLifecycleEvent('connect_error', {
      phase,
      message,
      ...extra,
    });
  }

  /**
   * Connect to Minecraft server
   * @returns {Promise<void>}
   */
  async connect() {
    if (this.bot) {
      this.disconnect();
    }

    return new Promise((resolve, reject) => {
      const connectTimeoutMs = config.minecraft.connectTimeoutMs;
      let botInstance = null;
      let connectTimer = null;
      let settled = false;
      let spawned = false;

      const rejectConnect = (phase, message, extra = {}) => {
        if (settled) {
          return;
        }

        settled = true;
        if (connectTimer) {
          clearTimeout(connectTimer);
        }

        this.isConnected = false;
        this.pvpEnabled = false;
        this.movements = null;
        this.lastDisconnectReason = message;
        this._recordConnectError(phase, message, extra);

        if (botInstance) {
          try {
            botInstance.quit(message);
          } catch (quitError) {
            console.warn('[Bot] Failed to close bot after connect error:', this._formatErrorMessage(quitError));
          }
        }

        if (this.bot === botInstance) {
          this.bot = null;
        }

        reject(this._buildConnectionError(phase, message, extra));
      };

      const resolveConnect = () => {
        if (settled) {
          return;
        }
        settled = true;
        if (connectTimer) {
          clearTimeout(connectTimer);
        }
        resolve();
      };

      this.connectionState = 'connecting';
      this.lastConnectStartedAt = new Date().toISOString();
      this.lastSpawnAt = null;
      this.lastConnectError = null;
      this.lastDisconnectReason = null;
      this.lastKickReason = null;
      this.isConnected = false;
      this.pvpEnabled = false;
      this.movements = null;

      console.log(
        `[Bot] Connecting to ${config.minecraft.host}:${config.minecraft.port} as ${config.minecraft.username} `
        + `(version: ${config.minecraft.version}, timeout: ${connectTimeoutMs}ms)`
      );

      try {
        this.bot = mineflayer.createBot({
          host: config.minecraft.host,
          port: config.minecraft.port,
          username: config.minecraft.username,
          version: config.minecraft.version,
        });
        botInstance = this.bot;
      } catch (error) {
        rejectConnect('create_bot', this._formatErrorMessage(error));
        return;
      }

      try {
        botInstance.loadPlugin(pathfinder);
        if (mineflayerPvpPlugin) {
          botInstance.loadPlugin(mineflayerPvpPlugin);
          this.pvpEnabled = true;
        }
      } catch (error) {
        rejectConnect('plugin_load', this._formatErrorMessage(error));
        return;
      }

      connectTimer = setTimeout(() => {
        rejectConnect(
          'timeout',
          `连接超时：${Math.floor(connectTimeoutMs / 1000)} 秒内没有进入游戏。请检查 mc_host、mc_port、mc_version，或确认服务端是否把机器人踢掉了。`,
          { timeoutMs: connectTimeoutMs }
        );
      }, connectTimeoutMs);

      botInstance.once('spawn', () => {
        console.log('[Bot] Successfully spawned in game!');
        this.isConnected = true;
        this.connectionState = 'connected';
        this.lastSpawnAt = new Date().toISOString();
        this.lastDisconnectReason = null;
        this.lastKickReason = null;
        this.lastConnectError = null;

        try {
          const mcData = minecraftData(botInstance.version);
          const movements = new Movements(botInstance, mcData);

          movements.canDig = true;
          movements.allow1by1towers = true;
          movements.canSwim = true;
          movements.maxDropDown = 4;
          movements.blocksCantBreak.add(mcData.blocksByName.bedrock?.id);
          movements.blocksCantBreak.add(mcData.blocksByName.obsidian?.id);

          botInstance.pathfinder.setMovements(movements);
          this.movements = movements;

          if (this.hasPvpPlugin()) {
            botInstance.pvp.followRange = 2;
            botInstance.pvp.attackRange = 3.3;
            botInstance.pvp.viewDistance = 48;
            console.log('[Bot] PvP combat backend is active');
          }

          if (config.viewer.enabled && mineflayerViewer && !this.viewerStarted) {
            try {
              mineflayerViewer(botInstance, {
                port: config.viewer.port,
                firstPerson: config.viewer.firstPerson,
              });
              this.viewerStarted = true;
              console.log(`[Bot] Viewer started at http://localhost:${config.viewer.port}`);
            } catch (error) {
              console.error('[Bot] Failed to start viewer:', error.message);
            }
          }
        } catch (error) {
          rejectConnect('spawn_setup', this._formatErrorMessage(error));
          return;
        }

        spawned = true;
        this._emitLifecycleEvent('spawn');
        resolveConnect();
      });

      botInstance.on('error', (error) => {
        const message = this._formatErrorMessage(error);
        console.error('[Bot] Error:', error);

        if (!spawned) {
          rejectConnect('error', message, { code: error?.code || null });
          return;
        }

        this.lastConnectError = {
          phase: 'runtime',
          message,
          code: error?.code || null,
          at: new Date().toISOString(),
        };
        this._emitLifecycleEvent('bot_error', {
          message,
          code: error?.code || null,
        });
      });

      botInstance.on('end', () => {
        const reason = this.lastKickReason || this.lastDisconnectReason || '连接已断开';
        console.log(`[Bot] Disconnected from server: ${reason}`);
        this.isConnected = false;
        this.connectionState = 'disconnected';
        this.lastDisconnectReason = reason;
        this._emitLifecycleEvent('disconnect', { reason });

        if (!spawned) {
          rejectConnect('end', reason);
          return;
        }

        if (this.bot === botInstance) {
          this.bot = null;
        }

        this.pvpEnabled = false;
        this.movements = null;
      });

      botInstance.on('kicked', (reason, loggedIn) => {
        const message = this._formatReason(reason);
        console.warn(`[Bot] Kicked from server: ${message}`);
        this.isConnected = false;
        this.lastKickReason = message;
        this.lastDisconnectReason = message;
        this._emitLifecycleEvent('kicked', {
          reason: message,
          loggedIn: Boolean(loggedIn),
        });

        if (!spawned) {
          rejectConnect('kicked', message, { loggedIn: Boolean(loggedIn) });
        }
      });

      botInstance.on('chat', (username, message) => {
        if (username === botInstance.username) return;
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

  getConnectionStatus() {
    return {
      connected: this.isConnected,
      state: this.connectionState,
      host: config.minecraft.host,
      port: config.minecraft.port,
      username: config.minecraft.username,
      version: config.minecraft.version,
      connectTimeoutMs: config.minecraft.connectTimeoutMs,
      lastConnectStartedAt: this.lastConnectStartedAt,
      lastSpawnAt: this.lastSpawnAt,
      lastKickReason: this.lastKickReason,
      lastDisconnectReason: this.lastDisconnectReason,
      lastConnectError: this.lastConnectError,
    };
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.bot) {
      this.lastDisconnectReason = this.lastDisconnectReason || '手动断开连接';
      this.connectionState = 'disconnected';
      if (this.hasPvpPlugin() && typeof this.bot.pvp.forceStop === 'function') {
        this.bot.pvp.forceStop();
      }
      this.bot.quit();
      this.bot = null;
      this.isConnected = false;
      this.pvpEnabled = false;
      this.movements = null;
    }
  }
}

export default Bot;
