const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const config = require('../../../config');

module.exports = {
  name: 'unhide',
  description: 'Unhide a channel to make it visible to normal members (@everyone)',
  async execute(message, args) {
    const member = message.member;
    const guild = message.guild;

    if (!member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return message.reply({ content: `${config.emojis.error} You do not have permission to manage channels!` });
    }

    if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return message.reply({ content: `${config.emojis.error} I do not have \`Manage Channels\` permission!` });
    }

    const channel = message.mentions.channels.first() || (args[0] ? guild.channels.cache.get(args[0].replace(/[^0-9]/g, '')) : null) || message.channel;

    try {
      await channel.permissionOverwrites.edit(guild.id, {
        ViewChannel: null
      });

      const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('👁️ Channel Unhidden')
        .setDescription(`Channel ${channel} is now visible again to normal members (@everyone).`)
        .setFooter({ text: `Moderator: ${message.author.tag}` })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Unhide error:', err);
      return message.reply({ content: `${config.emojis.error} Failed to unhide channel: ${err.message}` });
    }
  }
};
