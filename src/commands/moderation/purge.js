const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const config = require('../../../config');

module.exports = {
  name: 'purge',
  description: 'Bulk delete a specified number of messages from this channel',
  slashData: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Bulk delete messages')
    .addIntegerOption(opt =>
      opt
        .setName('amount')
        .setDescription('Number of messages to delete (1-100)')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    ),

  async executeSlash(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return interaction.reply({ content: `${config.emojis.error} You need \`Manage Messages\` permission to purge messages!`, ephemeral: true });
    }

    const amount = interaction.options.getInteger('amount');
    const deleted = await interaction.channel.bulkDelete(amount, true).catch(err => {
      return null;
    });

    if (!deleted) {
      return interaction.reply({ content: '❌ Failed to delete messages (messages older than 14 days cannot be bulk deleted).', ephemeral: true });
    }

    return interaction.reply({ content: `🧹 Successfully deleted **${deleted.size}** message(s).`, ephemeral: true });
  },

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return message.channel.send(`${config.emojis.error} You need \`Manage Messages\` permission to purge messages!`);
    }

    const amount = parseInt(args[0], 10);
    if (isNaN(amount) || amount < 1 || amount > 100) {
      return message.channel.send('❌ Usage: `!purge <1-100>`');
    }

    const deleted = await message.channel.bulkDelete(amount, true).catch(() => null);
    if (!deleted) {
      return message.channel.send('❌ Failed to delete messages (messages older than 14 days cannot be bulk deleted).');
    }

    const reply = await message.channel.send(`🧹 Successfully deleted **${deleted.size}** message(s).`);
    setTimeout(() => reply.delete().catch(() => {}), 4000);
  }
};
