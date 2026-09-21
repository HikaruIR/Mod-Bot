const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const config = require('../../../config');

module.exports = {
  name: 'unlock',
  description: 'Unlock a locked channel allowing normal users to send messages',
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
        SendMessages: null
      });

      const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('🔓 Channel Unlocked')
        .setDescription(`Channel ${channel} has been unlocked. Members can send messages again.`)
        .setFooter({ text: `Moderator: ${message.author.tag}` })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Unlock error:', err);
      return message.reply({ content: `${config.emojis.error} Failed to unlock channel: ${err.message}` });
    }
  }
};
