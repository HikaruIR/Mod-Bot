const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../../config');

module.exports = {
  name: 'unban',
  description: 'Unban a banned user by ID',
  async execute(message, args) {
    const member = message.member;
    const guild = message.guild;

    if (!member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return message.reply({ content: `${config.emojis.error} You do not have permission to unban members!` });
    }

    if (!guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return message.reply({ content: `${config.emojis.error} I do not have \`Ban Members\` permission!` });
    }

    const userId = args[0]?.replace(/[^0-9]/g, '');
    if (!userId) {
      return message.reply({
        content: `${config.emojis.error} **Invalid usage!**\nFormat: \`!unban [user-id]\`\nExample: \`!unban 123456789012345678\``
      });
    }

    try {
      const banInfo = await guild.bans.fetch(userId).catch(() => null);
      if (!banInfo) {
        return message.reply({ content: `${config.emojis.warning} User with ID \`${userId}\` is not banned on this server.` });
      }

      await guild.bans.remove(userId, `Unbanned by ${message.author.tag}`);

      // Clean up tempban list if present
      const guildTempbans = db.tempbans.get(guild.id) || [];
      const updatedTempbans = guildTempbans.filter(b => b.userId !== userId);
      db.tempbans.set(guild.id, updatedTempbans);

      const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('✅ Member Unbanned')
        .setDescription(`Successfully unbanned **${banInfo.user.tag}** (\`${userId}\`)`)
        .setFooter({ text: `Moderator: ${message.author.tag}` })
        .setTimestamp();

      const { sendModLog } = require('../../utils/logger');
      await sendModLog(guild, embed);
      return message.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Unban error:', err);
      return message.reply({ content: `${config.emojis.error} Failed to unban user: ${err.message}` });
    }
  }
};
