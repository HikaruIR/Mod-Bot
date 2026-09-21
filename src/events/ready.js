const { ActivityType, Events } = require('discord.js');
const { initGiveawayTicker } = require('../handlers/giveawayHandler');
const { initTempbanTicker } = require('../handlers/tempbanHandler');

module.exports = {
  name: Events.ClientReady || 'clientReady',
  once: true,
  execute(client) {
    console.log(`========================================`);
    console.log(`✅ Logged in successfully as: ${client.user.tag}`);
    console.log(`🤖 Bot ID: ${client.user.id}`);
    console.log(`🌐 Serving ${client.guilds.cache.size} server(s)`);
    console.log(`========================================`);

    // Set bot presence
    client.user.setPresence({
      activities: [
        {
          name: '!help | Ticket & Giveaway Bot',
          type: ActivityType.Watching
        }
      ],
      status: 'online'
    });

    // Initialize background tickers
    initGiveawayTicker(client);
    initTempbanTicker(client);
    console.log('⚡ Background tickers initialized (Giveaway & Tempban check).');
  }
};
