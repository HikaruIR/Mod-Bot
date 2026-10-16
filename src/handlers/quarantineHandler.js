const db = require('../utils/database');

/**
 * Checks for expired quarantines every 10 seconds
 */
function initQuarantineTicker(client) {
  setInterval(async () => {
    try {
      const allQRs = db.quarantine.all();
      const now = Date.now();

      for (const guildId of Object.keys(allQRs)) {
        const guildData = allQRs[guildId] || {};
        let modified = false;

        for (const userId of Object.keys(guildData)) {
          const entry = guildData[userId];
          if (entry.unqrAt && now >= entry.unqrAt) {
            const guild = client.guilds.cache.get(guildId);
            if (guild) {
              const member = await guild.members.fetch(userId).catch(() => null);
              if (member) {
                // Remove quarantine role
                if (entry.quarantineRoleId) {
                  await member.roles.remove(entry.quarantineRoleId, 'Automatic unquarantine (expired)').catch(() => {});
                }
                // Restore roles
                if (entry.savedRoles && Array.isArray(entry.savedRoles)) {
                  const restore = entry.savedRoles.filter(id => guild.roles.cache.has(id));
                  if (restore.length > 0) {
                    await member.roles.add(restore, 'Restored roles (quarantine expired)').catch(() => {});
                  }
                }
              }
            }
            delete guildData[userId];
            modified = true;
          }
        }

        if (modified) {
          db.quarantine.set(guildId, guildData);
        }
      }
    } catch (err) {
      console.warn('Quarantine ticker error:', err.message);
    }
  }, 10 * 1000);
}

module.exports = {
  initQuarantineTicker
};
