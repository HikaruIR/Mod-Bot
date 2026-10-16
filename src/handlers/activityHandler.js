const { ActivityType } = require('discord.js');

let currentStep = 0;
let activityInterval = null;

/**
 * Initializes the 2-minute activity & status switcher loop:
 * Step 0: Streaming Sevinnny | Status: Do Not Disturb
 * Step 1: Watching [server-members] | Status: Online
 * Step 2: Playing Minecraft | Status: Idle
 */
function initActivitySwitcher(client) {
  if (activityInterval) clearInterval(activityInterval);

  const updatePresence = () => {
    try {
      if (!client.user) return;

      // Calculate total members across all guilds
      const totalMembers = client.guilds.cache.reduce((acc, guild) => acc + (guild.memberCount || 0), 0);

      switch (currentStep) {
        case 0:
          client.user.setPresence({
            activities: [
              {
                name: 'Sevinnny',
                type: ActivityType.Streaming,
                url: 'https://www.twitch.tv/sevinnny'
              }
            ],
            status: 'dnd'
          });
          break;

        case 1:
          client.user.setPresence({
            activities: [
              {
                name: `${totalMembers.toLocaleString()} Members`,
                type: ActivityType.Watching
              }
            ],
            status: 'online'
          });
          break;

        case 2:
          client.user.setPresence({
            activities: [
              {
                name: 'Play.SevinCraft.ir',
                type: ActivityType.Playing
              }
            ],
            status: 'idle'
          });
          break;
      }

      // Next step in cycle
      currentStep = (currentStep + 1) % 3;
    } catch (err) {
      console.warn('Activity switcher error:', err.message);
    }
  };

  // Run immediately, then every 2 minutes (120,000 ms)
  updatePresence();
  activityInterval = setInterval(updatePresence, 2 * 60 * 1000);
  console.log('🔄 2-Minute Activity Switcher loop initialized!');
}

module.exports = {
  initActivitySwitcher
};
