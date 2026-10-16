const { EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  name: 'help',
  aliases: ['h', 'commands'],
  description: 'List all commands and capabilities for Sevinnny server',
  async execute(message, args) {
    const prefix = process.env.PREFIX || config.defaultPrefix || '!';

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`✨ ${config.brand.name} Bot Commands Menu`)
      .setDescription(`Welcome to **${config.brand.name}** official bot! Prefix: \`${prefix}\``)
      .addFields(
        {
          name: '🛡️ Moderation Commands',
          value:
            `\`${prefix}ban [user] [reason] [time]\` - Ban permanently or temporarily\n` +
            `\`${prefix}unban [user-id]\` - Unban member\n` +
            `\`${prefix}mute [user] [reason] [time]\` - Mute member (with auto-unmute)\n` +
            `\`${prefix}unmute [user]\` - Unmute member\n` +
            `\`${prefix}timeout [user] [reason] [time]\` - Discord native timeout\n` +
            `\`${prefix}untimeout [user]\` - Remove timeout\n` +
            `\`${prefix}qr [user] [reason] [time]\` - Quarantine member (hides all channels)\n` +
            `\`${prefix}unqr [user]\` - Remove quarantine and restore roles\n` +
            `\`${prefix}logchannel [channel] [set/unset]\` - Configure log channel`
        },
        {
          name: '🔒 Channel Controls',
          value:
            `\`${prefix}lock [channel]\` - Lock channel from sending messages\n` +
            `\`${prefix}unlock [channel]\` - Unlock channel\n` +
            `\`${prefix}hide [channel]\` - Hide channel from @everyone\n` +
            `\`${prefix}show [channel]\` - Make channel visible to @everyone`
        },
        {
          name: '👋 Welcome System (Embed & Square Profile)',
          value:
            `\`${prefix}welcome setup [message] [channel]\` - Variables: \`<user>\`, \`<server>\`, \`<membersnow>\`\n` +
            `\`${prefix}welcome test\` - Test welcome embed in configured channel\n` +
            `\`${prefix}welcome delete\` - Disable welcome system`
        },
        {
          name: '📢 News & Announcers',
          value:
            `\`${prefix}livenews [enable/disable] [channel] [message] [liveurl] [mentions]\` - Stream auto alert\n` +
            `\`${prefix}medianews [enable/disable] [channel] [message] [mediaurl] [mentions]\` - Media auto alert`
        },
        {
          name: '🎵 Music Player (YouTube, Spotify, SoundCloud, Search)',
          value:
            `\`${prefix}play [song name/url]\` - Play or search music\n` +
            `\`${prefix}pause\` / \`${prefix}resume\` - Pause or resume playback\n` +
            `\`${prefix}stop\` - Stop playing & clear queue\n` +
            `\`${prefix}next\` / \`${prefix}skip\` - Skip current track\n` +
            `\`${prefix}previous\` - Play previous track\n` +
            `\`${prefix}queue\` - View upcoming songs\n` +
            `\`${prefix}nowplaying\` - View currently playing song\n` +
            `\`${prefix}join\` / \`${prefix}leave\` - Connect/disconnect from voice`
        },
        {
          name: '📊 Reaction Polls',
          value:
            `\`${prefix}poll [question]\` - Yes / No reaction poll\n` +
            `\`${prefix}poll "Question" "Opt 1" "Opt 2"\` - Multiple-choice poll`
        }
      )
      .setFooter({
        text: config.brand.footer,
        iconURL: message.guild.iconURL({ dynamic: true }) || config.brand.avatar
      })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
};
