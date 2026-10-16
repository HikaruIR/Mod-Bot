const { ActivityType, Events, REST, Routes } = require('discord.js');
const { initGiveawayTicker } = require('../handlers/giveawayHandler');
const { initTempbanTicker } = require('../handlers/tempbanHandler');
const config = require('../../config');

module.exports = {
  name: Events.ClientReady || 'clientReady',
  once: true,
  async execute(client) {
    console.log(`========================================`);
    console.log(`✅ Logged in successfully as: ${client.user.tag}`);
    console.log(`🤖 Bot ID: ${client.user.id}`);
    console.log(`🛍️ Ocean Shop Engine: Active`);
    console.log(`🌐 Serving ${client.guilds.cache.size} server(s)`);
    console.log(`========================================`);

    // Set bot presence
    try {
      client.user.setStatus('dnd');
      client.user.setActivity('Ocean🐋', { type: ActivityType.Watching });
      client.user.setPresence({
        activities: [
          {
            name: 'Ocean🐋',
            type: ActivityType.Watching
          }
        ],
        status: 'dnd'
      });
      console.log('⚡ Presence successfully configured: DND | Watching Ocean🐋');
    } catch (presenceErr) {
      console.warn('Presence configuration warning:', presenceErr.message);
    }

    // Register Slash Commands
    try {
      const rest = new REST({ version: '10' }).setToken(client.token);
      const slashCommandsData = [];

      for (const cmd of client.slashCommands.values()) {
        if (cmd.slashData) {
          slashCommandsData.push(cmd.slashData.toJSON());
        }
      }

      if (slashCommandsData.length > 0) {
        console.log(`⏳ Registering ${slashCommandsData.length} application (/) commands globally...`);
        await rest.put(
          Routes.applicationCommands(client.user.id),
          { body: slashCommandsData }
        );
        console.log(`✅ Successfully registered all application (/) commands!`);
      }
    } catch (err) {
      console.error('Failed to register application slash commands:', err);
    }

    // Initialize background tickers and invite tracker
    try {
      initGiveawayTicker(client);
      initTempbanTicker(client);
      const { initMuteTicker } = require('../handlers/muteHandler');
      initMuteTicker(client);
      const { initQuarantineTicker } = require('../handlers/quarantineHandler');
      initQuarantineTicker(client);
      const { initInviteTracker } = require('../services/inviteService');
      await initInviteTracker(client);
      const { initActivitySwitcher } = require('../handlers/activityHandler');
      initActivitySwitcher(client);
    } catch (err) {
      console.warn('Ticker/Tracker warning:', err.message);
    }
  }
};
