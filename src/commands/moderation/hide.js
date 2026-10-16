const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const config = require('../../../config');

module.exports = {
  name: 'hide',
  description: 'Hide a channel from normal members',
  slashData: new SlashCommandBuilder()
    .setName('hide')
    .setDescription('Hide a channel from normal members')
    .addChannelOption(opt =>
      opt
        .setName('channel')
        .setDescription('Channel to hide (defaults to current channel)')
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
        ViewChannel: false
      });

      const embed = new EmbedBuilder()
        .setColor(config.colors.danger)
        .setTitle('👁️‍🗨️ Channel Hidden')
        .setDescription(`Channel ${channel} has been hidden from @everyone.`)
        .setFooter({ text: `Moderator: ${interaction.user.tag}` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      return interaction.reply({ content: `❌ Failed to hide channel: ${err.message}`, ephemeral: true });
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
        ViewChannel: false
      });

      const embed = new EmbedBuilder()
        .setColor(config.colors.danger)
        .setTitle('👁️‍🗨️ Channel Hidden')
        .setDescription(`Channel ${channel} has been hidden from @everyone.`)
        .setFooter({ text: `Moderator: ${message.author.tag}` })
        .setTimestamp();

      return message.channel.send({ embeds: [embed] });
    } catch (err) {
      console.error('Hide error:', err);
      return message.channel.send(`${config.emojis.error} Failed to hide channel: ${err.message}`);
    }
  }
};
