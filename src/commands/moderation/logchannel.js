const { EmbedBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../../config');

module.exports = {
  name: 'logchannel',
  description: 'Set or unset the moderation and bot log channel',
  async execute(message, args) {
    const member = message.member;
    const guild = message.guild;

    if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply({ content: `${config.emojis.error} You need \`Administrator\` permission to configure the log channel!` });
    }

    const action = args[0]?.toLowerCase();
    const channelMention = message.mentions.channels.first() || (args[1] ? guild.channels.cache.get(args[1].replace(/[^0-9]/g, '')) : null);

    // Also support: !logchannel #channel set OR !logchannel set #channel OR !logchannel unset
    let targetChannel = null;
    let mode = 'set';

    if (action === 'unset') {
      mode = 'unset';
    } else if (action === 'set') {
      mode = 'set';
      targetChannel = channelMention;
    } else if (channelMention) {
      targetChannel = channelMention;
      mode = args[1]?.toLowerCase() === 'unset' ? 'unset' : 'set';
    } else if (!action) {
      const current = db.logs.get(guild.id);
      return message.reply({
        content: `ℹ️ **Current Log Channel:** ${current ? `<#${current}>` : 'Not configured'}\n**Usage:**\n\`!logchannel #channel set\`\n\`!logchannel unset\``
      });
    }

    if (mode === 'unset') {
      db.logs.delete(guild.id);
      return message.reply({ content: `✅ Log channel has been unset. Moderation events will no longer be logged.` });
    }

    if (!targetChannel) {
      return message.reply({
        content: `${config.emojis.error} Please mention a valid text channel!\nExample: \`!logchannel #mod-logs set\``
      });
    }

    db.logs.set(guild.id, targetChannel.id);

    const embed = new EmbedBuilder()
      .setColor(config.colors.success)
      .setTitle('📋 Log Channel Configured')
      .setDescription(`Bot log channel set to <#${targetChannel.id}>. All moderation actions will be recorded here.`)
      .setTimestamp();

    await targetChannel.send({ embeds: [embed] }).catch(() => {});
    return message.reply({ embeds: [embed] });
  }
};
