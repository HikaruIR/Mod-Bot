const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const config = require('../../../config');
const { parseDuration, formatDuration } = require('../../utils/timeParser');

module.exports = {
  name: 'to',
  description: 'Timeout (mute) a member with duration and reason',
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
        content: `${config.emojis.error} **Invalid usage!**\nFormat: \`!to @user [time] [reason]\`\nExample: \`!to @Mohammad 30m Spamming chat\``
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

    const durationArg = args[1];
    const durationMs = parseDuration(durationArg) || (10 * 60 * 1000); // default 10 minutes
    const reason = (parseDuration(durationArg) ? args.slice(2).join(' ') : args.slice(1).join(' ')) || 'No reason provided';

    // Discord maximum timeout is 28 days
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
          { name: 'Duration', value: formatDuration(durationMs) },
          { name: 'Reason', value: reason },
          { name: 'Moderator', value: message.author.tag }
        )
        .setTimestamp();

      await targetUser.send({ embeds: [dmEmbed] });
      dmSent = true;
    } catch (e) {
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
          { name: 'User DM', value: dmSent ? '✅ Notified' : '⚠️ Closed DMs', inline: true }
        )
        .setFooter({ text: `Moderator: ${message.author.tag}` })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Timeout error:', err);
      return message.reply({ content: `${config.emojis.error} Failed to timeout member: ${err.message}` });
    }
  }
};
