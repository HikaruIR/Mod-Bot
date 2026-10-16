const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../../config');
const { parseDuration, formatDuration } = require('../../utils/timeParser');
const { sendModLog } = require('../../utils/logger');

module.exports = {
  name: 'ban',
  description: 'Ban a member permanently or temporarily with reason and duration',
  async execute(message, args) {
    const member = message.member;
    const guild = message.guild;

    if (!member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return message.reply({ content: `${config.emojis.error} You do not have permission to ban members!` });
    }

    if (!guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return message.reply({ content: `${config.emojis.error} I do not have \`Ban Members\` permission!` });
    }

    const targetUser = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0].replace(/[^0-9]/g, '')).catch(() => null) : null);
    if (!targetUser) {
      return message.reply({
        content: `${config.emojis.error} **Invalid usage!**\nFormat: \`!ban @user [reason] [time]\` or \`!ban @user [time] [reason]\`\nExample: \`!ban @User Breaking rules 1d\``
      });
    }

    if (targetUser.id === message.author.id) {
      return message.reply({ content: `${config.emojis.error} You cannot ban yourself!` });
    }

    if (targetUser.id === guild.ownerId) {
      return message.reply({ content: `${config.emojis.error} You cannot ban the server owner!` });
    }

    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
    if (targetMember) {
      if (targetMember.roles.highest.position >= member.roles.highest.position && guild.ownerId !== member.id) {
        return message.reply({ content: `${config.emojis.error} You cannot ban this member because they have an equal or higher role than you!` });
      }

      if (!targetMember.bannable) {
        return message.reply({ content: `${config.emojis.error} I cannot ban this member! Check role hierarchy.` });
      }
    }

    // Determine duration and reason
    let durationMs = null;
    let reasonParts = [];

    const remainingArgs = args.slice(1);
    if (remainingArgs.length > 0) {
      // Check first remaining arg
      const firstCheck = parseDuration(remainingArgs[0]);
      if (firstCheck) {
        durationMs = firstCheck;
        reasonParts = remainingArgs.slice(1);
      } else {
        // Check last remaining arg
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

    // 1. Send DM
    let dmSent = false;
    try {
      const dmEmbed = new EmbedBuilder()
        .setColor(config.colors.danger)
        .setTitle(`🔨 You have been banned from ${guild.name}`)
        .addFields(
          { name: 'Reason', value: reason, inline: true },
          { name: 'Duration', value: durationMs ? formatDuration(durationMs) : 'Permanent', inline: true },
          { name: 'Banned By', value: message.author.tag, inline: true }
        )
        .setTimestamp();

      await targetUser.send({ embeds: [dmEmbed] });
      dmSent = true;
    } catch {
      dmSent = false;
    }

    // 2. Execute Ban
    try {
      await guild.members.ban(targetUser.id, {
        reason: `${reason} | Banned by ${message.author.tag}${durationMs ? ` (${formatDuration(durationMs)})` : ''}`
      });

      // 3. Store tempban if temporary
      if (durationMs) {
        const guildTempbans = db.tempbans.get(guild.id) || [];
        guildTempbans.push({
          userId: targetUser.id,
          unbanAt: Date.now() + durationMs,
          reason: reason
        });
        db.tempbans.set(guild.id, guildTempbans);
      }

      const responseEmbed = new EmbedBuilder()
        .setColor(config.colors.danger)
        .setTitle(`🔨 Member Banned`)
        .setDescription(`Successfully banned **${targetUser.tag}** (\`${targetUser.id}\`)`)
        .addFields(
          { name: 'Reason', value: reason, inline: true },
          { name: 'Duration', value: durationMs ? formatDuration(durationMs) : 'Permanent', inline: true },
          { name: 'DM Notification', value: dmSent ? '✅ Delivered' : '⚠️ Closed DMs', inline: true }
        )
        .setFooter({ text: `Moderator: ${message.author.tag}` })
        .setTimestamp();

      await message.reply({ embeds: [responseEmbed] });
      await sendModLog(guild, responseEmbed);
    } catch (err) {
      console.error('Ban error:', err);
      return message.reply({ content: `${config.emojis.error} Failed to ban user: ${err.message}` });
    }
  }
};
