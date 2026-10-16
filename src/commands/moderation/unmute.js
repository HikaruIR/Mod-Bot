const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../../config');
const { sendModLog } = require('../../utils/logger');

module.exports = {
  name: 'unmute',
  description: 'Unmute a muted member',
  async execute(message, args) {
    const member = message.member;
    const guild = message.guild;

    if (!member.permissions.has(PermissionsBitField.Flags.ManageRoles) && !member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return message.reply({ content: `${config.emojis.error} You do not have permission to unmute members!` });
    }

    if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return message.reply({ content: `${config.emojis.error} I need \`Manage Roles\` permission!` });
    }

    const targetUser = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0].replace(/[^0-9]/g, '')).catch(() => null) : null);
    if (!targetUser) {
      return message.reply({
        content: `${config.emojis.error} **Invalid usage!**\nFormat: \`!unmute @user\`\nExample: \`!unmute @User\``
      });
    }

    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      return message.reply({ content: `${config.emojis.error} User is not in the server!` });
    }

    const muteRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'muted');
    if (!muteRole || !targetMember.roles.cache.has(muteRole.id)) {
      return message.reply({ content: `${config.emojis.warning} User is not muted!` });
    }

    try {
      await targetMember.roles.remove(muteRole, `Unmuted by ${message.author.tag}`);

      // Clean up database
      const guildMutes = db.mutes.get(guild.id) || [];
      const updatedMutes = guildMutes.filter(m => m.userId !== targetUser.id);
      db.mutes.set(guild.id, updatedMutes);

      const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('🔊 Member Unmuted')
        .setDescription(`Successfully unmuted **${targetUser.tag}** (\`${targetUser.id}\`)`)
        .setFooter({ text: `Moderator: ${message.author.tag}` })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
      await sendModLog(guild, embed);
    } catch (err) {
      console.error('Unmute error:', err);
      return message.reply({ content: `${config.emojis.error} Failed to unmute user: ${err.message}` });
    }
  }
};
