const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../../config');

module.exports = {
  name: 'medianews',
  description: 'Configure automated media and post announcer',
  async execute(message, args) {
    const member = message.member;
    const guild = message.guild;

    if (!member.permissions.has(PermissionsBitField.Flags.Administrator) && !member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return message.reply({ content: `${config.emojis.error} You need \`Administrator\` permission to configure media news!` });
    }

    const mode = args[0]?.toLowerCase();

    if (mode === 'disable') {
      const guildNews = db.news.get(guild.id) || {};
      if (guildNews.media) {
        guildNews.media.enabled = false;
        db.news.set(guild.id, guildNews);
      }
      return message.reply({ content: '✅ Media news announcer has been **disabled**.' });
    }

    if (mode === 'enable' || mode === 'set') {
      const channel = message.mentions.channels.first() || guild.channels.cache.get(args[1]?.replace(/[^0-9]/g, ''));
      if (!channel) {
        return message.reply({
          content: `${config.emojis.error} **Invalid usage!**\nFormat: \`!medianews enable #channel [message] [mediaurl] [mentions]\`\nExample: \`!medianews enable #media Check out our new video! https://youtube.com/watch?v=xyz @everyone\``
        });
      }

      const rest = args.slice(2);
      let mediaUrl = '';
      let mentions = [];
      let messageWords = [];

      for (const word of rest) {
        if (/^https?:\/\//i.test(word)) {
          mediaUrl = word;
        } else if (/<@&\d+>/g.test(word) || word === '@everyone' || word === '@here') {
          mentions.push(word);
        } else if (!word.startsWith('<#')) {
          messageWords.push(word);
        }
      }

      const customMessage = messageWords.join(' ').trim() || '🎬 **New media upload released! Check it out below:**';

      const guildNews = db.news.get(guild.id) || {};
      guildNews.media = {
        enabled: true,
        channelId: channel.id,
        message: customMessage,
        mediaUrl: mediaUrl || '',
        mentions: mentions.join(' '),
        lastAnnounced: null
      };
      db.news.set(guild.id, guildNews);

      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('🎬 Media News Announcer Enabled')
        .setDescription(`Media announcements configured for <#${channel.id}>`)
        .addFields(
          { name: 'Media / Content URL', value: mediaUrl || 'Attached on post', inline: true },
          { name: 'Role Mentions', value: mentions.length ? mentions.join(' ') : 'None', inline: true },
          { name: 'Custom Message', value: customMessage }
        )
        .setTimestamp();

      // Send initial announcement if mediaUrl provided
      if (mediaUrl) {
        channel.send({
          content: `${mentions.join(' ')}\n${customMessage}\n${mediaUrl}`.trim()
        }).catch(() => {});
      }

      return message.reply({ embeds: [embed] });
    }

    const helpEmbed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('🎬 Media News Announcer')
      .setDescription('Configure media alerts with role mentions and custom messages:')
      .addFields(
        { name: 'Enable', value: '`!medianews enable #channel [message] [mediaurl] [mentions]`' },
        { name: 'Disable', value: '`!medianews disable`' }
      );

    return message.reply({ embeds: [helpEmbed] });
  }
};
