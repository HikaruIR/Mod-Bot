const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../../config');
const { parseDuration, formatDuration } = require('../../utils/timeParser');

module.exports = {
  name: 'ban',
  description: 'Ban a member permanently or temporarily, with DM notification and reason',
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
        content: `${config.emojis.error} **Invalid usage!**\nFormat: \`!ban @user [time] [reason]\`\nExample: \`!ban @Mohammad 1d Rule violations\``
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
        return message.reply({ content: `${config.emojis.error} I cannot ban this member! Check my role hierarchy and permissions.` });
      }
    }

    // Check if second argument is duration (e.g., 1d, 2h, 30m)
    let durationMs = null;
    let reasonStartIndex = 1;

    if (args[1]) {
      const parsed = parseDuration(args[1]);
      if (parsed) {
        durationMs = parsed;
        reasonStartIndex = 2;
      }
    }

    const reason = args.slice(reasonStartIndex).join(' ') || 'No reason provided';

    // 1. Send DM to the banned user
    let dmSent = false;
    try {
      const dmEmbed = new EmbedBuilder()
        .setColor(config.colors.danger)
        .setTitle(`🔨 You have been banned from ${guild.name}`)
        .addFields(
          { name: 'Reason', value: reason },
          { name: 'Duration', value: durationMs ? formatDuration(durationMs) : 'Permanent' },
          { name: 'Banned By', value: message.author.tag }
        )
        .setTimestamp();

      await targetUser.send({ embeds: [dmEmbed] });
      dmSent = true;
    } catch (dmErr) {
      dmSent = false;
    }

    // 2. Perform the ban
    try {
      await guild.members.ban(targetUser.id, {
        reason: `${reason} | Banned by ${message.author.tag}${durationMs ? ` (${formatDuration(durationMs)})` : ''}`
      });

      // 3. If temporary ban, store in database
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
        .setDescription(`Successfully banned **${targetUser.tag}** (${targetUser.id})`)
        .addFields(
          { name: 'Reason', value: reason, inline: true },
          { name: 'Duration', value: durationMs ? formatDuration(durationMs) : 'Permanent', inline: true },
          { name: 'User DM', value: dmSent ? '✅ Notified' : '⚠️ Closed DMs', inline: true }
        )
        .setFooter({ text: `Moderator: ${message.author.tag}` })
        .setTimestamp();

      return message.reply({ embeds: [responseEmbed] });
    } catch (banErr) {
      console.error('Ban error:', banErr);
      return message.reply({ content: `${config.emojis.error} Failed to ban user: ${banErr.message}` });
    }
  }
};
