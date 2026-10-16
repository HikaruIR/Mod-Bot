const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../../config');
const { getUserInvites } = require('../../services/inviteService');

module.exports = {
  name: 'invites',
  description: 'Check invite statistics for yourself or another user',
  slashData: new SlashCommandBuilder()
    .setName('invites')
    .setDescription('Check invite statistics')
    .addUserOption(opt => opt.setName('user').setDescription('User to check invites for (optional)')),

  async executeSlash(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const stats = getUserInvites(interaction.guild.id, targetUser.id);

    const embed = new EmbedBuilder()
      .setTitle(`✉️ Invite Statistics • ${targetUser.username}`)
      .setColor('#5865F2')
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: '✨ Total Invites', value: `**${stats.total}**`, inline: true },
        { name: '🟢 Regular', value: `${stats.regular}`, inline: true },
        { name: '🔴 Leaves', value: `${stats.leaves}`, inline: true },
        { name: '⚠️ Fake / Suspicious', value: `${stats.fake}`, inline: true },
        { name: '🎁 Bonus', value: `${stats.bonus}`, inline: true }
      )
      .setFooter({ text: config.brand.footer, iconURL: config.brand.avatar })
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  },

  async execute(message, args) {
    const targetUser = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0].replace(/[^0-9]/g, '')).catch(() => null) : null) || message.author;
    const stats = getUserInvites(message.guild.id, targetUser.id);

    const embed = new EmbedBuilder()
      .setTitle(`✉️ Invite Statistics • ${targetUser.username}`)
      .setColor('#5865F2')
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: '✨ Total Invites', value: `**${stats.total}**`, inline: true },
        { name: '🟢 Regular', value: `${stats.regular}`, inline: true },
        { name: '🔴 Leaves', value: `${stats.leaves}`, inline: true },
        { name: '⚠️ Fake', value: `${stats.fake}`, inline: true },
        { name: '🎁 Bonus', value: `${stats.bonus}`, inline: true }
      )
      .setFooter({ text: config.brand.footer, iconURL: config.brand.avatar })
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  }
};
