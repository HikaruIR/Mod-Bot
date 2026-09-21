const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../../config');
const { getGuildConfig } = require('../../utils/permissions');

module.exports = {
  name: 'oprole',
  description: 'Set or unsetup the Operator (OP) role for the server',
  async execute(message, args) {
    const member = message.member;
    const guild = message.guild;

    // Only server owner or Administrator can configure oprole
    if (guild.ownerId !== member.id && !member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply({ content: `${config.emojis.error} Only the server owner or administrators can configure the OP role!` });
    }

    const action = args[0]?.toLowerCase();

    if (action === 'set') {
      const roleArg = args[1];
      let targetRole = null;

      if (roleArg) {
        const roleId = roleArg.replace(/[^0-9]/g, '');
        targetRole = guild.roles.cache.get(roleId);
      } else {
        // Try finding a role named "OP"
        targetRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'op' || r.name.toLowerCase() === 'operator');
      }

      if (!targetRole) {
        return message.reply({
          content: `${config.emojis.error} **Role not found!**\nFormat: \`!oprole set [@role / role-id]\`\nExample: \`!oprole set 123456789012345678\``
        });
      }

      const cfg = getGuildConfig(guild.id);
      cfg.opRole = targetRole.id;

      const allConfigs = db.config.all();
      allConfigs[guild.id] = cfg;
      db.config.save();

      const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('⚡ OP Role Configured')
        .setDescription(`Successfully set ${targetRole} (\`${targetRole.id}\`) as the OP role.\nYou can now use \`!op @user\` to grant this role.`)
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    if (action === 'unsetup' || action === 'unset') {
      const cfg = getGuildConfig(guild.id);
      cfg.opRole = null;

      const allConfigs = db.config.all();
      allConfigs[guild.id] = cfg;
      db.config.save();

      return message.reply({
        content: `${config.emojis.success} OP role has been unconfigured for this server.`
      });
    }

    const cfg = getGuildConfig(guild.id);
    const currentOpRole = cfg.opRole ? `<@&${cfg.opRole}>` : 'Not configured';

    const helpEmbed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('⚡ OP Role Configuration')
      .setDescription(`Current OP Role: ${currentOpRole}`)
      .addFields(
        { name: '!oprole set [role-id / @role]', value: 'Sets the role to be granted with `!op`' },
        { name: '!oprole unsetup', value: 'Unsets the configured OP role' }
      );

    return message.reply({ embeds: [helpEmbed] });
  }
};
