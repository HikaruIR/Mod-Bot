const config = require('../../config');

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    try {
      // 1. Slash Commands
      if (interaction.isChatInputCommand()) {
        const command = client.slashCommands?.get(interaction.commandName);
        if (command && typeof command.executeSlash === 'function') {
          return await command.executeSlash(interaction);
        }
      }
    } catch (err) {
      console.error('Error handling interaction:', err);
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: `${config.emojis.error} An error occurred while executing this command: \`${err.message}\``,
          ephemeral: true
        }).catch(() => {});
      }
    }
  }
};
