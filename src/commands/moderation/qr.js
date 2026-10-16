const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../../config');
const { parseDuration, formatDuration } = require('../../utils/timeParser');
const { sendModLog } = require('../../utils/logger');

async function getOrCreateQuarantineRole(guild) {
  let role = guild.roles.cache.find(r => r.name.toLowerCase() === 'quarantined');
  if (!role) {
    role = await guild.roles.create({
      name: 'Quarantined',
      color: '#34495e',
      reason: 'Role for isolating quarantined members',
      permissions: []
    });

    // Deny view channel across all channels
    for (const channel of guild.channels.cache.values()) {
      await channel.permissionOverwrites.create(role, {
        ViewChannel: false,
        SendMessages: false,
        Connect: false
      }).catch(() => {});
    }
  }
  return role;
}

module.exports = {
  name: 'qr',
  aliases: ['quarantine'],
  description: 'Quarantine a user (blocks viewing all channels) with reason and time',
  async execute(message, args) {
    const member = message.member;
    const guild = message.guild;

    if (!member.permissions.has(PermissionsBitField.Flags.Administrator) && !member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return message.reply({ content: `${config.emojis.error} You do not have permission to quarantine members!` });
    }

    if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return message.reply({ content: `${config.emojis.error} I need \`Manage Roles\` permission!` });
    }

    const targetUser = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0].replace(/[^0-9]/g, '')).catch(() => null) : null);
    if (!targetUser) {
      return message.reply({
        content: `${config.emojis.error} **Invalid usage!**\nFormat: \`!qr @user [reason] [time]\`\nExample: \`!qr @User Suspicious activity 2h\``
      });
    }

    if (targetUser.id === message.author.id) {
      return message.reply({ content: `${config.emojis.error} You cannot quarantine yourself!` });
    }

    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      return message.reply({ content: `${config.emojis.error} User is not in the server!` });
    }

    if (targetMember.roles.highest.position >= member.roles.highest.position && guild.ownerId !== member.id) {
      return message.reply({ content: `${config.emojis.error} You cannot quarantine someone with an equal or higher role than you!` });
    }

    // Parse duration and reason
    let durationMs = null;
    let reasonParts = [];

    const remainingArgs = args.slice(1);
    if (remainingArgs.length > 0) {
      const firstCheck = parseDuration(remainingArgs[0]);
      if (firstCheck) {
        durationMs = firstCheck;
        reasonParts = remainingArgs.slice(1);
      } else {
        const lastCheck = parseDuration(remainingArgs[remainingArgs.length - 1]);
        if (lastCheck && remainingArgs.length > 1) {
          durationMs = lastCheck;
          reasonParts = remainingArgs.slice(0, remainingArgs.length - 1);
        } else {
          reasonParts = remainingArgs;
        }
      }
    }

    const reason = reasonParts.join(' ').trim() || 'No reason provided';

    try {
      const qrRole = await getOrCreateQuarantineRole(guild);
      if (targetMember.roles.cache.has(qrRole.id)) {
        return message.reply({ content: `${config.emojis.warning} User is already quarantined!` });
      }

      // Save user's current roles (excluding @everyone)
      const previousRoles = targetMember.roles.cache.filter(r => r.id !== guild.id).map(r => r.id);

      // Strip all roles and assign quarantine role
      await targetMember.roles.set([qrRole.id], `Quarantined by ${message.author.tag} | ${reason}`).catch(async () => {
        await targetMember.roles.add(qrRole.id);
      });

      // Save in db
      const guildQRs = db.quarantine.get(guild.id) || {};
      guildQRs[targetUser.id] = {
        userId: targetUser.id,
        savedRoles: previousRoles,
        quarantineRoleId: qrRole.id,
        unqrAt: durationMs ? Date.now() + durationMs : null,
        reason,
        moderator: message.author.tag
      };
      db.quarantine.set(guild.id, guildQRs);

      // Notify user in DM
      let dmSent = false;
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(config.colors.danger)
          .setTitle(`☣️ You have been Quarantined in ${guild.name}`)
          .setDescription('You have been restricted from viewing or participating in all channels.')
          .addFields(
            { name: 'Reason', value: reason, inline: true },
            { name: 'Duration', value: durationMs ? formatDuration(durationMs) : 'Indefinite', inline: true },
            { name: 'Moderator', value: message.author.tag, inline: true }
          )
          .setTimestamp();
        await targetUser.send({ embeds: [dmEmbed] });
        dmSent = true;
      } catch {
        dmSent = false;
      }

      const embed = new EmbedBuilder()
        .setColor(config.colors.danger)
        .setTitle('☣️ Member Quarantined')
        .setDescription(`Successfully quarantined **${targetUser.tag}** (\`${targetUser.id}\`)\nAll channels have been hidden from them.`)
        .addFields(
          { name: 'Reason', value: reason, inline: true },
          { name: 'Duration', value: durationMs ? formatDuration(durationMs) : 'Indefinite', inline: true },
          { name: 'DM Notification', value: dmSent ? '✅ Delivered' : '⚠️ Closed DMs', inline: true }
        )
        .setFooter({ text: `Moderator: ${message.author.tag}` })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
      await sendModLog(guild, embed);
    } catch (err) {
      console.error('Quarantine error:', err);
      return message.reply({ content: `${config.emojis.error} Failed to quarantine user: ${err.message}` });
    }
  }
};
