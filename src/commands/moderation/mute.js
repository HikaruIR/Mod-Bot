const { EmbedBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../../config');
const { parseDuration, formatDuration } = require('../../utils/timeParser');
const { sendModLog } = require('../../utils/logger');

async function getOrCreateMuteRole(guild) {
  let role = guild.roles.cache.find(r => r.name.toLowerCase() === 'muted');
  if (!role) {
    role = await guild.roles.create({
      name: 'Muted',
      color: '#7f8c8d',
      reason: 'Role created for muting users',
      permissions: []
    });

    // Update channels permissions for muted role
    for (const channel of guild.channels.cache.values()) {
      if (channel.isTextBased()) {
        await channel.permissionOverwrites.create(role, {
          SendMessages: false,
          AddReactions: false,
          CreatePublicThreads: false,
          CreatePrivateThreads: false,
          SendMessagesInThreads: false
        }).catch(() => {});
      } else if (channel.isVoiceBased()) {
        await channel.permissionOverwrites.create(role, {
          Speak: false
        }).catch(() => {});
      }
    }
  }
  return role;
}

module.exports = {
  name: 'mute',
  description: 'Mute a user with reason and optional duration',
  async execute(message, args) {
    const member = message.member;
    const guild = message.guild;

    if (!member.permissions.has(PermissionsBitField.Flags.ManageRoles) && !member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return message.reply({ content: `${config.emojis.error} You do not have permission to mute members!` });
    }

    if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return message.reply({ content: `${config.emojis.error} I need \`Manage Roles\` permission to mute members!` });
    }

    const targetUser = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0].replace(/[^0-9]/g, '')).catch(() => null) : null);
    if (!targetUser) {
      return message.reply({
        content: `${config.emojis.error} **Invalid usage!**\nFormat: \`!mute @user [reason] [time]\`\nExample: \`!mute @User Spamming in chat 1h\``
      });
    }

    if (targetUser.id === message.author.id) {
      return message.reply({ content: `${config.emojis.error} You cannot mute yourself!` });
    }

    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      return message.reply({ content: `${config.emojis.error} User is not in the server!` });
    }

    if (targetMember.roles.highest.position >= member.roles.highest.position && guild.ownerId !== member.id) {
      return message.reply({ content: `${config.emojis.error} You cannot mute this member because they have an equal or higher role than you!` });
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
      const muteRole = await getOrCreateMuteRole(guild);
      if (targetMember.roles.cache.has(muteRole.id)) {
        return message.reply({ content: `${config.emojis.warning} User is already muted!` });
      }

      await targetMember.roles.add(muteRole, `Muted by ${message.author.tag} | ${reason}`);

      // Store in mutes db if temporary
      if (durationMs) {
        const guildMutes = db.mutes.get(guild.id) || [];
        guildMutes.push({
          userId: targetUser.id,
          unmuteAt: Date.now() + durationMs,
          roleId: muteRole.id,
          reason
        });
        db.mutes.set(guild.id, guildMutes);
      }

      // Send DM
      let dmSent = false;
      try {
        const dmEmbed = new EmbedBuilder()
          .setColor(config.colors.warning)
          .setTitle(`🔇 You have been muted in ${guild.name}`)
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
        .setColor(config.colors.warning)
        .setTitle('🔇 Member Muted')
        .setDescription(`Successfully muted **${targetUser.tag}** (\`${targetUser.id}\`)`)
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
      console.error('Mute error:', err);
      return message.reply({ content: `${config.emojis.error} Failed to mute user: ${err.message}` });
    }
  }
};
