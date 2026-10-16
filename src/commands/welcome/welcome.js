const { EmbedBuilder, PermissionsBitField, ChannelType } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../../config');

module.exports = {
  name: 'welcome',
  description: 'Setup, delete, or test custom embed welcome message with square profile',
  async execute(message, args) {
    const member = message.member;
    const guild = message.guild;

    if (!member.permissions.has(PermissionsBitField.Flags.Administrator) && !member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return message.reply({ content: `${config.emojis.error} You need \`Administrator\` or \`Manage Server\` permission to configure welcome!` });
    }

    const sub = args[0]?.toLowerCase();

    // 1. Setup Command: !welcome setup [welcome message] #channel
    if (sub === 'setup') {
      const channel = message.mentions.channels.first() || guild.channels.cache.get(args[args.length - 1]?.replace(/[^0-9]/g, ''));
      if (!channel) {
        return message.reply({
          content: `${config.emojis.error} **Invalid usage!**\nFormat: \`!welcome setup [welcome message] #channel\`\nVariables: \`<user>\`, \`<server>\`, \`<membersnow>\`\nExample: \`!welcome setup Welcome <user> to <server>! We now have <membersnow> members! #welcome\``
        });
      }

      // Extract message by removing 'setup' and the last argument (channel)
      let customMessage = '';
      if (message.mentions.channels.first()) {
        const fullText = args.slice(1).join(' ');
        customMessage = fullText.replace(/<#\d+>/g, '').trim();
      } else {
        customMessage = args.slice(1, -1).join(' ').trim();
      }

      if (!customMessage) {
        customMessage = 'Welcome <user> to **<server>**! You are member #<membersnow>.';
      }

      const welcomeSettings = {
        channelId: channel.id,
        message: customMessage,
        enabled: true
      };

      const guildConfig = db.config.get(guild.id) || {};
      guildConfig.welcome = welcomeSettings;
      guildConfig.welcomeChannelId = channel.id;
      db.config.set(guild.id, guildConfig);

      const confirmEmbed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('🎉 Welcome System Configured!')
        .setDescription(`Welcome channel has been set to <#${channel.id}>`)
        .addFields(
          { name: 'Template Message', value: customMessage },
          { name: 'Available Variables', value: '`<user>` : User Mention\n`<server>` : Server Name\n`<membersnow>` : Total Members' }
        )
        .setFooter({ text: 'Use !welcome test to preview the result' })
        .setTimestamp();

      return message.reply({ embeds: [confirmEmbed] });
    }

    // 2. Delete Command: !welcome delete
    if (sub === 'delete') {
      const guildConfig = db.config.get(guild.id) || {};
      if (guildConfig.welcome) {
        delete guildConfig.welcome;
      }
      delete guildConfig.welcomeChannelId;
      db.config.set(guild.id, guildConfig);

      return message.reply({ content: '✅ Welcome system has been disabled and deleted.' });
    }

    // 3. Test Command: !welcome test
    if (sub === 'test') {
      const guildConfig = db.config.get(guild.id) || {};
      const welcome = guildConfig.welcome;

      if (!welcome || !welcome.channelId) {
        return message.reply({
          content: `${config.emojis.warning} Welcome system has not been set up yet! Use \`!welcome setup [message] #channel\``
        });
      }

      const targetChannel = guild.channels.cache.get(welcome.channelId);
      if (!targetChannel) {
        return message.reply({ content: `${config.emojis.error} Configured welcome channel no longer exists!` });
      }

      // Replace placeholders
      const formattedMessage = welcome.message
        .replace(/<user>/g, `<@${message.author.id}>`)
        .replace(/<server>/g, guild.name)
        .replace(/<membersnow>/g, guild.memberCount.toString());

      // Square avatar thumbnail url (size 512, webp/png)
      const userAvatarUrl = message.author.displayAvatarURL({ extension: 'png', forceStatic: false, size: 512 });

      const testEmbed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(`🎉 Welcome to ${guild.name}!`)
        .setDescription(formattedMessage)
        .setThumbnail(userAvatarUrl) // Displays as a clean square thumbnail inside the embed
        .addFields(
          { name: '👤 Member', value: `${message.author.tag} (\`${message.author.id}\`)`, inline: true },
          { name: '📊 Member Count', value: `#${guild.memberCount}`, inline: true },
          { name: '📅 Account Created', value: `<t:${Math.floor(message.author.createdTimestamp / 1000)}:R>`, inline: true }
        )
        .setFooter({
          text: `${guild.name} • User Joined`,
          iconURL: guild.iconURL({ dynamic: true }) || config.brand.avatar
        })
        .setTimestamp();

      await targetChannel.send({ embeds: [testEmbed] });
      return message.reply({ content: `✅ Test welcome embed sent to <#${targetChannel.id}>!` });
    }

    // Default Help
    const helpEmbed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('👋 Welcome System Setup')
      .setDescription('Configure automated welcome messages with embeds and square avatar profiles:')
      .addFields(
        { name: 'Setup', value: '`!welcome setup [welcome message] #channel`\nPlaceholders: `<user>`, `<server>`, `<membersnow>`' },
        { name: 'Test', value: '`!welcome test` - Tests the welcome embed inside the configured channel' },
        { name: 'Delete', value: '`!welcome delete` - Disables the welcome system' }
      );

    return message.reply({ embeds: [helpEmbed] });
  }
};
