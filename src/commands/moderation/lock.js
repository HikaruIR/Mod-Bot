const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const config = require('../../../config');

module.exports = {
  name: 'lock',
  description: 'Lock a channel to prevent normal users from sending messages',
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
        SendMessages: false
      });

      const embed = new EmbedBuilder()
        .setColor(config.colors.danger)
        .setTitle('🔒 Channel Locked')
        .setDescription(`Channel ${channel} has been locked. Normal members can no longer send messages.`)
        .setFooter({ text: `Moderator: ${message.author.tag}` })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Lock error:', err);
      return message.reply({ content: `${config.emojis.error} Failed to lock channel: ${err.message}` });
    }
  }
};
