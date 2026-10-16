const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const config = require('../../../config');
const { parseDuration, formatDuration } = require('../../utils/timeParser');
const { sendModLog } = require('../../utils/logger');

module.exports = {
  name: 'timeout',
  aliases: ['to'],
  description: 'Timeout a member with reason and duration',
  async execute(message, args) {
    const member = message.member;
    const guild = message.guild;

    if (!member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return message.reply({ content: `${config.emojis.error} You do not have permission to timeout members!` });
    }

    if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return message.reply({ content: `${config.emojis.error} I do not have \`Moderate Members\` permission!` });
    }

    const targetUser = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0].replace(/[^0-9]/g, '')).catch(() => null) : null);
    if (!targetUser) {
      return message.reply({
        content: `${config.emojis.error} **Invalid usage!**\nFormat: \`!timeout @user [reason] [time]\` or \`!timeout @user [time] [reason]\`\nExample: \`!timeout @User Spamming 30m\``
      });
    }

    if (targetUser.id === message.author.id) {
      return message.reply({ content: `${config.emojis.error} You cannot timeout yourself!` });
    }

    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      return message.reply({ content: `${config.emojis.error} This user is not in the server!` });
    }

    if (targetMember.roles.highest.position >= member.roles.highest.position && guild.ownerId !== member.id) {
      return message.reply({ content: `${config.emojis.error} You cannot timeout this member because they have an equal or higher role than you!` });
    }

    if (!targetMember.moderatable) {
      return message.reply({ content: `${config.emojis.error} I cannot timeout this member! Check role hierarchy.` });
    }

    // Determine duration and reason
    let durationMs = 10 * 60 * 1000; // default 10 minutes
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
    const MAX_TIMEOUT_MS = 28 * 24 * 60 * 60 * 1000;
    if (durationMs > MAX_TIMEOUT_MS) {
      return message.reply({ content: `${config.emojis.error} Timeout duration cannot exceed 28 days!` });
    }

    let dmSent = false;
    try {
      const dmEmbed = new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle(`⏳ You have been timed out in ${guild.name}`)
        .addFields(
          { name: 'Duration', value: formatDuration(durationMs), inline: true },
          { name: 'Reason', value: reason, inline: true },
          { name: 'Moderator', value: message.author.tag, inline: true }
        )
        .setTimestamp();

      await targetUser.send({ embeds: [dmEmbed] });
      dmSent = true;
    } catch {
      dmSent = false;
    }

    try {
      await targetMember.timeout(durationMs, `${reason} | Timed out by ${message.author.tag}`);

      const embed = new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle('⏳ Member Timed Out')
        .setDescription(`Successfully timed out **${targetUser.tag}** (\`${targetUser.id}\`)`)
        .addFields(
          { name: 'Duration', value: formatDuration(durationMs), inline: true },
          { name: 'Reason', value: reason, inline: true },
          { name: 'DM Notification', value: dmSent ? '✅ Delivered' : '⚠️ Closed DMs', inline: true }
        )
        .setFooter({ text: `Moderator: ${message.author.tag}` })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
      await sendModLog(guild, embed);
    } catch (err) {
      console.error('Timeout error:', err);
      return message.reply({ content: `${config.emojis.error} Failed to timeout member: ${err.message}` });
    }
  }
};
