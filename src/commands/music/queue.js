const { EmbedBuilder } = require('discord.js');
const { getMusicQueue } = require('../../services/musicService');
const config = require('../../../config');

module.exports = {
  name: 'queue',
  aliases: ['q'],
  description: 'Display current music queue and upcoming tracks',
  async execute(message) {
    const queue = getMusicQueue(message.guild.id);
    if (!queue || (!queue.currentSong && queue.songs.length === 0)) {
      return message.reply({ content: `${config.emojis.warning} The music queue is currently empty!` });
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`🎵 Music Queue for ${message.guild.name}`)
      .setTimestamp();

    if (queue.currentSong) {
      embed.addFields({
        name: '▶️ Currently Playing',
        value: `[**${queue.currentSong.title}**](${queue.currentSong.url}) | \`${queue.currentSong.duration || 'Live'}\` (Requested by <@${queue.currentSong.requesterId}>)`
      });
    }

    if (queue.songs.length > 0) {
      const upcoming = queue.songs.slice(0, 10).map((song, i) => {
        return `\`${i + 1}.\` [${song.title}](${song.url}) - \`${song.duration || 'Live'}\``;
      }).join('\n');

      embed.addFields({
        name: `📋 Up Next (${queue.songs.length} track${queue.songs.length > 1 ? 's' : ''})`,
        value: upcoming + (queue.songs.length > 10 ? `\n*...and ${queue.songs.length - 10} more tracks*` : '')
      });
    } else {
      embed.addFields({
        name: '📋 Up Next',
        value: 'No songs queued after this one.'
      });
    }

    return message.reply({ embeds: [embed] });
  }
};
