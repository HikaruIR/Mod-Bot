const db = require('../utils/database');

function initTempbanTicker(client) {
  setInterval(async () => {
    const allTempbans = db.tempbans.all();
    const now = Date.now();

    for (const [guildId, bans] of Object.entries(allTempbans)) {
      if (!Array.isArray(bans) || bans.length === 0) continue;

      const remainingBans = [];
      const guild = client.guilds.cache.get(guildId);

      for (const ban of bans) {
        if (now >= ban.unbanAt) {
          if (guild) {
            try {
              await guild.bans.remove(ban.userId, 'Temporary ban duration expired');
              console.log(`[Tempban] Auto-unbanned ${ban.userId} from guild ${guild.name}`);
            } catch (err) {
              console.error(`[Tempban] Failed to auto-unban ${ban.userId}:`, err.message);
            }
          }
        } else {
          remainingBans.push(ban);
        }
      }

      if (remainingBans.length !== bans.length) {
        db.tempbans.set(guildId, remainingBans);
      }
    }
  }, 10000); // Check every 10 seconds
}

module.exports = {
  initTempbanTicker
};
