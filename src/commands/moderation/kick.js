const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const config = require('../../../config');

module.exports = {
  name: 'kick',
  description: 'Kick a member from the server with DM reason',
  async execute(message, args) {
    const member = message.member;
    const guild = message.guild;

    if (!member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
      return message.reply({ content: `${config.emojis.error} You do not have permission to kick members!` });
    }

    if (!guild.members.me.permissions.has(PermissionsBitField.Flags.KickMembers)) {
      return message.reply({ content: `${config.emojis.error} I do not have \`Kick Members\` permission!` });
    }

    const targetUser = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0].replace(/[^0-9]/g, '')).catch(() => null) : null);
    if (!targetUser) {
      return message.reply({
        content: `${config.emojis.error} **Invalid usage!**\nFormat: \`!kick @user [reason]\`\nExample: \`!kick @Mohammad Inappropriate behavior\``
      });
    }

    if (targetUser.id === message.author.id) {
      return message.reply({ content: `${config.emojis.error} You cannot kick yourself!` });
    }

    if (targetUser.id === guild.ownerId) {
      return message.reply({ content: `${config.emojis.error} You cannot kick the server owner!` });
    }

    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      return message.reply({ content: `${config.emojis.error} This user is not in this server!` });
    }

    if (targetMember.roles.highest.position >= member.roles.highest.position && guild.ownerId !== member.id) {
      return message.reply({ content: `${config.emojis.error} You cannot kick this member because they have an equal or higher role than you!` });
    }

    if (!targetMember.kickable) {
      return message.reply({ content: `${config.emojis.error} I cannot kick this member! Check my role hierarchy and permissions.` });
    }

    const reason = args.slice(1).join(' ') || 'No reason provided';

    // Send DM to member
    let dmSent = false;
    try {
      const dmEmbed = new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle(`👢 You have been kicked from ${guild.name}`)
        .addFields(
          { name: 'Reason', value: reason },
          { name: 'Kicked By', value: message.author.tag }
        )
        .setTimestamp();

      await targetUser.send({ embeds: [dmEmbed] });
      dmSent = true;
    } catch (dmErr) {
      dmSent = false;
    }

    try {
      await targetMember.kick(`${reason} | Kicked by ${message.author.tag}`);

      const responseEmbed = new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle('👢 Member Kicked')
        .setDescription(`Successfully kicked **${targetUser.tag}** (\`${targetUser.id}\`)`)
        .addFields(
          { name: 'Reason', value: reason, inline: true },
          { name: 'User DM', value: dmSent ? '✅ Notified' : '⚠️ Closed DMs', inline: true }
        )
        .setFooter({ text: `Moderator: ${message.author.tag}` })
        .setTimestamp();

      return message.reply({ embeds: [responseEmbed] });
    } catch (err) {
      console.error('Kick error:', err);
      return message.reply({ content: `${config.emojis.error} Failed to kick member: ${err.message}` });
    }
  }
};
