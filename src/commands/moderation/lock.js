const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const config = require('../../../config');

module.exports = {
  name: 'lock',
  description: 'Lock a channel to prevent normal users from sending messages',
  slashData: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock a channel to prevent users from sending messages')
    .addChannelOption(opt =>
      opt
        .setName('channel')
        .setDescription('Channel to lock (defaults to current channel)')
        .addChannelTypes(ChannelType.GuildText)
    ),

  async executeSlash(interaction) {
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return interaction.reply({ content: `${config.emojis.error} You do not have permission to manage channels!`, ephemeral: true });
    }

    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const guild = interaction.guild;

    try {
      await channel.permissionOverwrites.edit(guild.id, {
        SendMessages: false
      });

      const embed = new EmbedBuilder()
        .setColor(config.colors.danger)
        .setTitle('🔒 Channel Locked')
        .setDescription(`Channel ${channel} has been locked. Normal members can no longer send messages.`)
        .setFooter({ text: `Moderator: ${interaction.user.tag}` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      return interaction.reply({ content: `❌ Failed to lock channel: ${err.message}`, ephemeral: true });
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
        SendMessages: false
      });

      const embed = new EmbedBuilder()
        .setColor(config.colors.danger)
        .setTitle('🔒 Channel Locked')
        .setDescription(`Channel ${channel} has been locked. Normal members can no longer send messages.`)
        .setFooter({ text: `Moderator: ${message.author.tag}` })
        .setTimestamp();

      return message.channel.send({ embeds: [embed] });
    } catch (err) {
      console.error('Lock error:', err);
      return message.channel.send(`${config.emojis.error} Failed to lock channel: ${err.message}`);
    }
  }
};
