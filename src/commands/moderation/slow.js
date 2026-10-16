const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const config = require('../../../config');

module.exports = {
  name: 'slow',
  description: 'Set slowmode rate limit for this channel',
  slashData: new SlashCommandBuilder()
    .setName('slow')
    .setDescription('Set slowmode for this channel')
    .addIntegerOption(opt =>
      opt
        .setName('seconds')
        .setDescription('Slowmode duration in seconds (0 to disable, max 21600)')
        .setMinValue(0)
        .setMaxValue(21600)
        .setRequired(true)
    ),

  async executeSlash(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return interaction.reply({ content: `${config.emojis.error} You need \`Manage Channels\` permission!`, ephemeral: true });
    }

    const seconds = interaction.options.getInteger('seconds');
    await interaction.channel.setRateLimitPerUser(seconds);

    return interaction.reply({
      content: seconds === 0
        ? '⏳ Slowmode disabled for this channel.'
        : `⏳ Slowmode set to **${seconds}** second(s).`
    });
  },

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return message.channel.send(`${config.emojis.error} You need \`Manage Channels\` permission!`);
    }

    const seconds = parseInt(args[0], 10);
    if (isNaN(seconds) || seconds < 0 || seconds > 21600) {
      return message.channel.send('❌ Usage: `!slow <0-21600>` (0 to disable)');
    }

    await message.channel.setRateLimitPerUser(seconds);
    return message.channel.send(
      seconds === 0 ? '⏳ Slowmode disabled.' : `⏳ Slowmode set to **${seconds}** second(s).`
    );
  }
};
