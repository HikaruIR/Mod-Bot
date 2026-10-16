const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../../config');
const { sendModLog } = require('../../utils/logger');

module.exports = {
  name: 'unqr',
  aliases: ['unquarantine'],
  description: 'Unquarantine a member and restore their previous roles',
  async execute(message, args) {
    const member = message.member;
    const guild = message.guild;

    if (!member.permissions.has(PermissionsBitField.Flags.Administrator) && !member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return message.reply({ content: `${config.emojis.error} You do not have permission to unquarantine members!` });
    }

    if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return message.reply({ content: `${config.emojis.error} I need \`Manage Roles\` permission!` });
    }

    const targetUser = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0].replace(/[^0-9]/g, '')).catch(() => null) : null);
    if (!targetUser) {
      return message.reply({
        content: `${config.emojis.error} **Invalid usage!**\nFormat: \`!unqr @user\`\nExample: \`!unqr @User\``
      });
    }

    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      return message.reply({ content: `${config.emojis.error} User is not in the server!` });
    }

    const guildQRs = db.quarantine.get(guild.id) || {};
    const qrData = guildQRs[targetUser.id];
    const qrRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'quarantined');

    if (!qrData && (!qrRole || !targetMember.roles.cache.has(qrRole.id))) {
      return message.reply({ content: `${config.emojis.warning} User is not quarantined!` });
    }

    try {
      // Remove quarantine role
      if (qrRole && targetMember.roles.cache.has(qrRole.id)) {
        await targetMember.roles.remove(qrRole.id, `Unquarantined by ${message.author.tag}`);
      }

      // Restore saved roles
      if (qrData && qrData.savedRoles && Array.isArray(qrData.savedRoles)) {
        const rolesToRestore = qrData.savedRoles.filter(roleId => guild.roles.cache.has(roleId));
        if (rolesToRestore.length > 0) {
          await targetMember.roles.add(rolesToRestore, `Restored roles after quarantine`).catch(() => {});
        }
      }

      // Delete from db
      delete guildQRs[targetUser.id];
      db.quarantine.set(guild.id, guildQRs);

      const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('✅ Member Unquarantined')
        .setDescription(`Successfully removed quarantine from **${targetUser.tag}** (\`${targetUser.id}\`)\nTheir previous roles and channel access have been restored.`)
        .setFooter({ text: `Moderator: ${message.author.tag}` })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
      await sendModLog(guild, embed);
    } catch (err) {
      console.error('Unquarantine error:', err);
      return message.reply({ content: `${config.emojis.error} Failed to unquarantine user: ${err.message}` });
    }
  }
};
