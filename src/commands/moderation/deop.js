const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../../config');
const { getGuildConfig } = require('../../utils/permissions');

module.exports = {
  name: 'deop',
  description: 'Revoke OP role from a user',
  async execute(message, args) {
    const member = message.member;
    const guild = message.guild;

    if (guild.ownerId !== member.id && !member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply({ content: `${config.emojis.error} Only the server owner or administrators can revoke OP status!` });
    }

    if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return message.reply({ content: `${config.emojis.error} I need \`Manage Roles\` permission to remove roles!` });
    }

    const targetUser = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0].replace(/[^0-9]/g, '')).catch(() => null) : null);
    if (!targetUser) {
      return message.reply({
        content: `${config.emojis.error} **Invalid usage!**\nFormat: \`!deop @user\`\nExample: \`!deop @Mohammad\``
      });
    }

    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      return message.reply({ content: `${config.emojis.error} Member was not found in this server!` });
    }

    const cfg = getGuildConfig(guild.id);
    let opRole = null;

    if (cfg.opRole) {
      opRole = guild.roles.cache.get(cfg.opRole);
    }

    if (!opRole) {
      opRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'op' || r.name.toLowerCase() === 'operator');
    }

    if (!opRole) {
      return message.reply({ content: `${config.emojis.warning} No OP role configured.` });
    }

    if (!targetMember.roles.cache.has(opRole.id)) {
      return message.reply({ content: `${config.emojis.warning} **${targetUser.tag}** does not have the OP role.` });
    }

    try {
      await targetMember.roles.remove(opRole.id, `OP status revoked by ${message.author.tag}`);

      const embed = new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle('⚡ OP Status Revoked')
        .setDescription(`Successfully removed OP role from **${targetUser.tag}**!`)
        .setFooter({ text: `Revoked by ${message.author.tag}` })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    } catch (err) {
      console.error('DEOP error:', err);
      return message.reply({ content: `${config.emojis.error} Failed to remove OP role: ${err.message}` });
    }
  }
};
