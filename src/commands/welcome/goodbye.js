const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../../config');

module.exports = {
  name: 'goodbye',
  aliases: ['leavemsg'],
  description: 'Setup, delete, or test custom goodbye/leave embed message with square profile',
  async execute(message, args) {
    const member = message.member;
    const guild = message.guild;

    if (!member.permissions.has(PermissionsBitField.Flags.Administrator) && !member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return message.reply({ content: `${config.emojis.error} You need \`Administrator\` or \`Manage Server\` permission to configure goodbye!` });
    }

    const sub = args[0]?.toLowerCase();

    // 1. Setup Command: ?goodbye setup [goodbye message] #channel
    if (sub === 'setup') {
      const channel = message.mentions.channels.first() || guild.channels.cache.get(args[args.length - 1]?.replace(/[^0-9]/g, ''));
      if (!channel) {
        return message.reply({
          content: `${config.emojis.error} **Invalid usage!**\nFormat: \`?goodbye setup [goodbye message] #channel\`\nVariables: \`<user>\`, \`<server>\`, \`<membersnow>\`\nExample: \`?goodbye setup Goodbye <user>, left <server>! We now have <membersnow> members. #goodbye\``
        });
      }

      let customMessage = '';
      if (message.mentions.channels.first()) {
        const fullText = args.slice(1).join(' ');
        customMessage = fullText.replace(/<#\d+>/g, '').trim();
      } else {
        customMessage = args.slice(1, -1).join(' ').trim();
      }

      if (!customMessage) {
        customMessage = 'Goodbye <user>! We now have <membersnow> members in **<server>**.';
      }

      const goodbyeSettings = {
        channelId: channel.id,
        message: customMessage,
        enabled: true
      };

      db.goodbye.set(guild.id, goodbyeSettings);

      const confirmEmbed = new EmbedBuilder()
        .setColor(config.colors.danger)
        .setTitle('🚪 Goodbye System Configured!')
        .setDescription(`Goodbye channel has been set to <#${channel.id}>`)
        .addFields(
          { name: 'Template Message', value: customMessage },
          { name: 'Available Variables', value: '`<user>` : User Name\n`<server>` : Server Name\n`<membersnow>` : Total Members' }
        )
        .setFooter({ text: 'Use ?goodbye test to preview the result' })
        .setTimestamp();

      return message.reply({ embeds: [confirmEmbed] });
    }

    // 2. Delete Command: ?goodbye delete
    if (sub === 'delete') {
      db.goodbye.delete(guild.id);
      return message.reply({ content: '✅ Goodbye system has been disabled and deleted.' });
    }

    // 3. Test Command: ?goodbye test
    if (sub === 'test') {
      const goodbye = db.goodbye.get(guild.id);

      if (!goodbye || !goodbye.channelId) {
        return message.reply({
          content: `${config.emojis.warning} Goodbye system has not been set up yet! Use \`?goodbye setup [message] #channel\``
        });
      }

      const targetChannel = guild.channels.cache.get(goodbye.channelId);
      if (!targetChannel) {
        return message.reply({ content: `${config.emojis.error} Configured goodbye channel no longer exists!` });
      }

      const formattedMessage = goodbye.message
        .replace(/<user>/g, `**${message.author.tag}**`)
        .replace(/<server>/g, guild.name)
        .replace(/<membersnow>/g, guild.memberCount.toString());

      const userAvatarUrl = message.author.displayAvatarURL({ extension: 'png', forceStatic: false, size: 512 });

      const testEmbed = new EmbedBuilder()
        .setColor(config.colors.danger)
        .setTitle(`🚪 Member Left ${guild.name}`)
        .setDescription(formattedMessage)
        .setThumbnail(userAvatarUrl)
        .addFields(
          { name: '👤 Member', value: `${message.author.tag} (\`${message.author.id}\`)`, inline: true },
          { name: '📊 Remaining Members', value: `#${guild.memberCount}`, inline: true }
        )
        .setFooter({
          text: `${guild.name} • User Left`,
          iconURL: guild.iconURL({ dynamic: true }) || config.brand.avatar
        })
        .setTimestamp();

      await targetChannel.send({ embeds: [testEmbed] });
      return message.reply({ content: `✅ Test goodbye embed sent to <#${targetChannel.id}>!` });
    }

    // Default Help
    const helpEmbed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('🚪 Goodbye System Setup')
      .setDescription('Configure automated goodbye/leave messages completely independent of welcome:')
      .addFields(
        { name: 'Setup', value: '`?goodbye setup [goodbye message] #channel`\nPlaceholders: `<user>`, `<server>`, `<membersnow>`' },
        { name: 'Test', value: '`?goodbye test` - Tests the goodbye embed in the configured channel' },
        { name: 'Delete', value: '`?goodbye delete` - Disables goodbye system' }
      );

    return message.reply({ embeds: [helpEmbed] });
  }
};
