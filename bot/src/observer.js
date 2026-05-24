/**
 * Environment Observer
 * Collects and structures game state information
 */
export class Observer {
  constructor(bot) {
    this.bot = bot;
    this.chatHistory = [];
    this.eventHistory = [];
    this.lastDamageSource = null;
    this.maxHistorySize = 10;
    
    this._setupListeners();
  }

  /**
   * Setup event listeners
   */
  _setupListeners() {
    const mcBot = this.bot.getMineflayerBot();
    if (!mcBot) return;

    // Listen for chat messages
    mcBot.on('chat', (username, message) => {
      if (username === mcBot.username) return;
      this.chatHistory.push({
        timestamp: Date.now(),
        username,
        message
      });
      this._trimHistory('chat');
    });

    // Listen for damage events
    mcBot.on('health', () => {
      this.eventHistory.push({
        timestamp: Date.now(),
        type: 'health_change',
        details: `Health: ${mcBot.health}, Food: ${mcBot.food}`
      });
      this._trimHistory('events');
    });

    // Listen for entity hurt
    mcBot.on('entityHurt', (entity) => {
      if (entity === mcBot.entity) {
        const attacker = this._findLikelyAttacker(mcBot);
        this.eventHistory.push({
          timestamp: Date.now(),
          type: 'took_damage',
          details: attacker ? `Bot took damage from ${attacker.name}` : 'Bot took damage'
        });
        this.lastDamageSource = attacker;
        this._trimHistory('events');
      }
    });
  }

  _findLikelyAttacker(mcBot) {
    const botPos = mcBot?.entity?.position;
    if (!botPos) return null;

    let closest = null;
    let closestDistance = Infinity;
    for (const entity of Object.values(mcBot.entities || {})) {
      if (!entity || entity === mcBot.entity || !entity.position) continue;
      if (!this.bot.isHostileEntity(entity) && entity.type !== 'player') continue;
      const distance = botPos.distanceTo(entity.position);
      if (distance < closestDistance) {
        closest = entity;
        closestDistance = distance;
      }
    }

    if (!closest) return null;
    return {
      id: closest.id,
      name: closest.name || closest.username || closest.displayName || 'unknown',
      type: closest.type,
      distance: Math.round(closestDistance * 10) / 10,
      position: {
        x: Math.floor(closest.position.x),
        y: Math.floor(closest.position.y),
        z: Math.floor(closest.position.z),
      },
    };
  }

  /**
   * Trim history to max size
   */
  _trimHistory(type) {
    if (type === 'chat' && this.chatHistory.length > this.maxHistorySize) {
      this.chatHistory = this.chatHistory.slice(-this.maxHistorySize);
    }
    if (type === 'events' && this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get complete observation of current state
   * @returns {object}
   */
  getObservation() {
    const mcBot = this.bot.getMineflayerBot();
    const nearbyEntities = this.bot.getNearbyEntities(16);
    const hostileEntities = nearbyEntities
      .filter(entity => entity.isHostile)
      .sort((a, b) => a.distance - b.distance);
    const players = nearbyEntities
      .filter(entity => entity.isPlayer)
      .sort((a, b) => a.distance - b.distance);
    
    return {
      timestamp: Date.now(),
      position: this.bot.getPosition(),
      health: this.bot.getHealth(),
      combat: this.bot.getCombatStatus(),
      nearbyEntities,
      hostileEntities,
      players,
      inventory: this.bot.getInventory(),
      chatMessages: this.getRecentChat(false),
      events: this.getRecentEvents(false),
      lastDamageSource: this.lastDamageSource,
      time: mcBot ? {
        timeOfDay: mcBot.time.timeOfDay,
        isDay: mcBot.time.timeOfDay < 13000 || mcBot.time.timeOfDay > 23000
      } : null,
      weather: mcBot ? {
        isRaining: mcBot.isRaining
      } : null
    };
  }

  /**
   * Get recent chat messages (last N messages since last check)
   * @param {boolean} consume - Whether to clear after reading
   * @returns {Array}
   */
  getRecentChat(consume = true) {
    const messages = [...this.chatHistory];
    if (consume) {
      this.chatHistory = [];
    }
    return messages;
  }

  /**
   * Get recent events
   * @param {boolean} consume - Whether to clear after reading
   * @returns {Array}
   */
  getRecentEvents(consume = true) {
    const events = this.eventHistory.map(e => `${e.type}: ${e.details}`);
    if (consume) {
      this.eventHistory = [];
    }
    return events;
  }

  /**
   * Check if there are new chat messages
   * @returns {boolean}
   */
  hasNewChat() {
    return this.chatHistory.length > 0;
  }

  /**
   * Check if there are new events
   * @returns {boolean}
   */
  hasNewEvents() {
    return this.eventHistory.length > 0;
  }

  /**
   * Get a text summary of the current state
   * @returns {string}
   */
  getSummary() {
    const obs = this.getObservation();
    let summary = [];

    if (obs.position) {
      summary.push(`Position: (${obs.position.x}, ${obs.position.y}, ${obs.position.z})`);
    }

    if (obs.health) {
      summary.push(`Health: ${obs.health.health}/20 | Food: ${obs.health.food}/20`);
    }

    if (obs.hostileEntities.length > 0) {
      summary.push(`Threats: ${obs.hostileEntities.map(e => `${e.name}(${e.distance})`).join(', ')}`);
    } else if (obs.nearbyEntities.length > 0) {
      summary.push(`Nearby: ${obs.nearbyEntities.map(e => e.name).join(', ')}`);
    }

    if (obs.time) {
      summary.push(`Time: ${obs.time.isDay ? 'Day' : 'Night'}`);
    }

    return summary.join('\n');
  }
}

export default Observer;
