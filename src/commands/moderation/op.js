const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../../config');
const { getGuildConfig } = require('../../utils/permissions');

module.exports = {
  name: 'op',
  description: 'Grant full permissions / OP role to a user',
  async execute(message, args) {
    const member = message.member;
    const guild = message.guild;

    if (guild.ownerId !== member.id && !member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply({ content: `${config.emojis.error} Only the server owner or administrators can grant OP status!` });
    }

    if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return message.reply({ content: `${config.emojis.error} I need \`Manage Roles\` permission to grant OP roles!` });
    }

    const targetUser = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0].replace(/[^0-9]/g, '')).catch(() => null) : null);
    if (!targetUser) {
      return message.reply({
        content: `${config.emojis.error} **Invalid usage!**\nFormat: \`!op @user\`\nExample: \`!op @Mohammad\``
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
      // Find an existing role named OP or Administrator
      opRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'op' || r.name.toLowerCase() === 'operator');
    }

    if (!opRole) {
      return message.reply({
        content: `${config.emojis.warning} No OP role configured! Please configure one first using \`!oprole set [role-id]\`.`
      });
    }

    if (guild.members.me.roles.highest.position <= opRole.position) {
      return message.reply({
        content: `${config.emojis.error} My highest role is lower than or equal to the OP role (${opRole.name})! Please move my bot role higher in Server Settings > Roles.`
      });
    }

    if (targetMember.roles.cache.has(opRole.id)) {
      return message.reply({
        content: `${config.emojis.warning} **${targetUser.tag}** already has the OP role (${opRole})!`
      });
    }

    try {
      await targetMember.roles.add(opRole.id, `OP status granted by ${message.author.tag}`);

      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('⚡ OP Status Granted')
        .setDescription(`Successfully granted OP role (${opRole}) to **${targetUser.tag}**!`)
        .setFooter({ text: `Granted by ${message.author.tag}` })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    } catch (err) {
      console.error('OP grant error:', err);
      return message.reply({ content: `${config.emojis.error} Failed to grant OP role: ${err.message}` });
    }
  }
};
