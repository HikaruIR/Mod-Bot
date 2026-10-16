const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../../config');

module.exports = {
  name: 'livenews',
  description: 'Configure automated live broadcast announcer',
  async execute(message, args) {
    const member = message.member;
    const guild = message.guild;

    if (!member.permissions.has(PermissionsBitField.Flags.Administrator) && !member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return message.reply({ content: `${config.emojis.error} You need \`Administrator\` permission to configure live news!` });
    }

    const mode = args[0]?.toLowerCase();

    if (mode === 'disable') {
      const guildNews = db.news.get(guild.id) || {};
      if (guildNews.live) {
        guildNews.live.enabled = false;
        db.news.set(guild.id, guildNews);
      }
      return message.reply({ content: '✅ Live news announcer has been **disabled**.' });
    }

    if (mode === 'enable' || mode === 'set') {
      const channel = message.mentions.channels.first() || guild.channels.cache.get(args[1]?.replace(/[^0-9]/g, ''));
      if (!channel) {
        return message.reply({
          content: `${config.emojis.error} **Invalid usage!**\nFormat: \`!livenews enable #channel [message] [liveurl] [mentions]\`\nExample: \`!livenews enable #announcements We are live right now! https://twitch.tv/streamer @everyone\``
        });
      }

      // Remaining args: message, liveurl, mentions
      const rest = args.slice(2);
      let liveUrl = '';
      let mentions = [];
      let messageWords = [];

      for (const word of rest) {
        if (/^https?:\/\//i.test(word)) {
          liveUrl = word;
        } else if (/<@&\d+>/g.test(word) || word === '@everyone' || word === '@here') {
          mentions.push(word);
        } else if (!word.startsWith('<#')) {
          messageWords.push(word);
        }
      }

      const customMessage = messageWords.join(' ').trim() || '🔴 **We are now LIVE! Come join the stream!**';
      if (!liveUrl) {
        liveUrl = 'https://twitch.tv';
      }

      const guildNews = db.news.get(guild.id) || {};
      guildNews.live = {
        enabled: true,
        channelId: channel.id,
        message: customMessage,
        liveUrl,
        mentions: mentions.join(' '),
        lastAnnounced: null
      };
      db.news.set(guild.id, guildNews);

      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('🔴 Live News Announcer Enabled')
        .setDescription(`Automated live stream alerts configured for <#${channel.id}>`)
        .addFields(
          { name: 'Broadcast URL', value: liveUrl, inline: true },
          { name: 'Role Mentions', value: mentions.length ? mentions.join(' ') : 'None', inline: true },
          { name: 'Custom Message', value: customMessage }
        )
        .setFooter({ text: 'Bot will alert this channel whenever the stream goes live' })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    const helpEmbed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('🔴 Live News Announcer')
      .setDescription('Auto announcer that pings designated roles when a live stream starts:')
      .addFields(
        { name: 'Enable', value: '`!livenews enable #channel [message] [liveurl] [mentions]`' },
        { name: 'Disable', value: '`!livenews disable`' }
      );

    return message.reply({ embeds: [helpEmbed] });
  }
};
