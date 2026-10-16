const { EmbedBuilder } = require('discord.js');
const { getMusicQueue, createMusicQueue, resolveTracks } = require('../../services/musicService');
const config = require('../../../config');

module.exports = {
  name: 'play',
  aliases: ['p'],
  description: 'Play music from YouTube, Spotify, SoundCloud, or text search',
  async execute(message, args) {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      return message.reply({ content: `${config.emojis.error} You need to join a voice channel first!` });
    }

    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has('Connect') || !permissions.has('Speak')) {
      return message.reply({ content: `${config.emojis.error} I need permissions to join and speak in your voice channel!` });
    }

    const query = args.join(' ').trim();
    if (!query) {
      return message.reply({ content: `${config.emojis.error} Please provide a song name, artist, or music URL!\nExample: \`!play Shape of You\` or \`!play https://youtube.com/...\`` });
    }

    const loadingMsg = await message.reply({ content: `🔍 Searching for \`${query}\`...` });

    try {
      const tracks = await resolveTracks(query, message.author);
      if (!tracks || tracks.length === 0) {
        return loadingMsg.edit({ content: `❌ No results found for \`${query}\`. Try searching with a different name or link.` });
      }

      let queue = getMusicQueue(message.guild.id);
      if (!queue) {
        queue = createMusicQueue(message.guild.id, voiceChannel, message.channel);
        await queue.connect();
      }

      if (tracks.length === 1) {
        const song = tracks[0];
        if (queue.playing) {
          queue.songs.push(song);
          const embed = new EmbedBuilder()
            .setColor(config.colors.primary)
            .setTitle('➕ Added to Queue')
            .setDescription(`[**${song.title}**](${song.url})`)
            .addFields(
              { name: 'Channel / Artist', value: song.channel || song.artist || 'Unknown', inline: true },
              { name: 'Position', value: `#${queue.songs.length}`, inline: true }
            )
            .setThumbnail(song.thumbnail || config.brand.avatar);
          await loadingMsg.edit({ content: null, embeds: [embed] });
        } else {
          queue.songs.push(song);
          await loadingMsg.delete().catch(() => {});
          await queue.playNext();
        }
      } else {
        // Multiple tracks (Playlist / Album)
        for (const track of tracks) {
          queue.songs.push(track);
        }
        const embed = new EmbedBuilder()
          .setColor(config.colors.primary)
          .setTitle('📂 Added Album / Playlist to Queue')
          .setDescription(`Loaded **${tracks.length}** tracks into queue!`)
          .setThumbnail(tracks[0].thumbnail || config.brand.avatar);

        await loadingMsg.edit({ content: null, embeds: [embed] });

        if (!queue.playing) {
          await queue.playNext();
        }
      }
    } catch (err) {
      console.error('Play error:', err);
      loadingMsg.edit({ content: `❌ Failed to play: \`${err.message}\`` }).catch(() => {});
    }
  }
};
