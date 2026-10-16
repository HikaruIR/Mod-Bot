const { ActivityType, Events, REST, Routes } = require('discord.js');
const { initTempbanTicker } = require('../handlers/tempbanHandler');
const { initMuteTicker } = require('../handlers/muteHandler');
const { initQuarantineTicker } = require('../handlers/quarantineHandler');
const { initActivitySwitcher } = require('../handlers/activityHandler');
const config = require('../../config');

module.exports = {
  name: Events.ClientReady || 'clientReady',
  once: true,
  async execute(client) {
    console.log(`========================================`);
    console.log(`✅ Logged in successfully as: ${client.user.tag}`);
    console.log(`🤖 Bot ID: ${client.user.id}`);
    console.log(`✨ ${config.brand.name} Engine: Active`);
    console.log(`🌐 Serving ${client.guilds.cache.size} server(s)`);
    console.log(`========================================`);

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

    // Initialize background tickers and 2-minute activity loop
    try {
      initTempbanTicker(client);
      initMuteTicker(client);
      initQuarantineTicker(client);
      initActivitySwitcher(client);
    } catch (err) {
      console.warn('Ticker warning:', err.message);
    }
  }
};
