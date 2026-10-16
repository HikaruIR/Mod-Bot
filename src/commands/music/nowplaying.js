const { EmbedBuilder } = require('discord.js');
const { getMusicQueue } = require('../../services/musicService');
const config = require('../../../config');

module.exports = {
  name: 'nowplaying',
  aliases: ['np'],
  description: 'Display details about the currently playing song',
  async execute(message) {
    const queue = getMusicQueue(message.guild.id);
    if (!queue || !queue.currentSong) {
      return message.reply({ content: `${config.emojis.warning} No track is currently playing!` });
    }

    const song = queue.currentSong;
    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('🎶 Now Playing')
      .setDescription(`[**${song.title}**](${song.url})`)
      .addFields(
        { name: 'Channel / Artist', value: song.channel || song.artist || 'Unknown', inline: true },
        { name: 'Duration', value: song.duration || 'Live / Unknown', inline: true },
        { name: 'Requested By', value: `<@${song.requesterId}>`, inline: true }
      )
      .setThumbnail(song.thumbnail || config.brand.avatar)
      .setFooter({ text: 'Status: Playing • Use !pause or !skip to control' })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
};
