const db = require('../utils/database');

/**
 * Checks for expired mutes every 10 seconds
 */
function initMuteTicker(client) {
  setInterval(async () => {
    try {
      const allMutes = db.mutes.all();
      const now = Date.now();

      for (const guildId of Object.keys(allMutes)) {
        const guildMutes = allMutes[guildId] || [];
        const remainingMutes = [];

        for (const mute of guildMutes) {
          if (mute.unmuteAt && now >= mute.unmuteAt) {
            const guild = client.guilds.cache.get(guildId);
            if (guild) {
              const member = await guild.members.fetch(mute.userId).catch(() => null);
              if (member && mute.roleId) {
                await member.roles.remove(mute.roleId, 'Automatic unmute (duration expired)').catch(() => {});
              }
            }
          } else {
            remainingMutes.push(mute);
          }
        }

        if (remainingMutes.length !== guildMutes.length) {
          db.mutes.set(guildId, remainingMutes);
        }
      }
    } catch (err) {
      console.warn('Mute ticker error:', err.message);
    }
  }, 10 * 1000);
}

module.exports = {
  initMuteTicker
};
