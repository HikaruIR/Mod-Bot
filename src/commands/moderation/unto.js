const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const config = require('../../../config');

module.exports = {
  name: 'unto',
  description: 'Remove timeout from a timed out member',
  async execute(message, args) {
    const member = message.member;
    const guild = message.guild;

    if (!member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return message.reply({ content: `${config.emojis.error} You do not have permission to moderate members!` });
    }

    if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return message.reply({ content: `${config.emojis.error} I do not have \`Moderate Members\` permission!` });
    }

    const targetUser = message.mentions.users.first() || (args[0] ? await message.client.users.fetch(args[0].replace(/[^0-9]/g, '')).catch(() => null) : null);
    if (!targetUser) {
      return message.reply({
        content: `${config.emojis.error} **Invalid usage!**\nFormat: \`!unto @user\`\nExample: \`!unto @Mohammad\``
      });
    }

    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      return message.reply({ content: `${config.emojis.error} This member is not in the server!` });
    }

    if (!targetMember.communicationDisabledUntilTimestamp || targetMember.communicationDisabledUntilTimestamp <= Date.now()) {
      return message.reply({ content: `${config.emojis.warning} This member is not currently timed out.` });
    }

    try {
      await targetMember.timeout(null, `Timeout removed by ${message.author.tag}`);

      const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('✅ Timeout Removed')
        .setDescription(`Successfully removed timeout from **${targetUser.tag}** (\`${targetUser.id}\`)`)
        .setFooter({ text: `Moderator: ${message.author.tag}` })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Unto error:', err);
      return message.reply({ content: `${config.emojis.error} Failed to remove timeout: ${err.message}` });
    }
  }
};
