const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const config = require('../../../config');
const { sendModLog } = require('../../utils/logger');

module.exports = {
  name: 'show',
  aliases: ['unhide'],
  description: 'Show (unhide) a channel for normal members',
  slashData: new SlashCommandBuilder()
    .setName('show')
    .setDescription('Make a channel visible to everyone')
    .addChannelOption(opt =>
      opt
        .setName('channel')
        .setDescription('Channel to show (defaults to current channel)')
        .addChannelTypes(ChannelType.GuildText)
    ),

  async executeSlash(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return interaction.reply({ content: `${config.emojis.error} You need \`Manage Channels\` permission!`, ephemeral: true });
    }

    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const guild = interaction.guild;

    try {
      await channel.permissionOverwrites.edit(guild.id, {
        ViewChannel: true
      });

      const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('👁️ Channel Visible')
        .setDescription(`Channel ${channel} is now visible to @everyone.`)
        .setFooter({ text: `Moderator: ${interaction.user.tag}` })
        .setTimestamp();

      await sendModLog(guild, embed);
      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      return interaction.reply({ content: `❌ Failed to show channel: ${err.message}`, ephemeral: true });
    }
  },

  async execute(message, args) {
    const member = message.member;
    const guild = message.guild;

    if (!member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return message.channel.send(`${config.emojis.error} You do not have permission to manage channels!`);
    }

    if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return message.channel.send(`${config.emojis.error} I do not have \`Manage Channels\` permission!`);
    }

    const channel = message.mentions.channels.first() || (args[0] ? guild.channels.cache.get(args[0].replace(/[^0-9]/g, '')) : null) || message.channel;

    try {
      await channel.permissionOverwrites.edit(guild.id, {
        ViewChannel: true
      });

      const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('👁️ Channel Visible')
        .setDescription(`Channel ${channel} is now visible to @everyone.`)
        .setFooter({ text: `Moderator: ${message.author.tag}` })
        .setTimestamp();

      await sendModLog(guild, embed);
      return message.channel.send({ embeds: [embed] });
    } catch (err) {
      console.error('Show error:', err);
      return message.channel.send(`${config.emojis.error} Failed to show channel: ${err.message}`);
    }
  }
};
