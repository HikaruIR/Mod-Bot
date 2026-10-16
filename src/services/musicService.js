const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState
} = require('@discordjs/voice');
const play = require('play-dl');
const { EmbedBuilder } = require('discord.js');
const config = require('../../config');

class MusicQueue {
  constructor(guildId, voiceChannel, textChannel) {
    this.guildId = guildId;
    this.voiceChannel = voiceChannel;
    this.textChannel = textChannel;
    this.connection = null;
    this.player = createAudioPlayer();
    this.songs = [];
    this.history = [];
    this.currentSong = null;
    this.volume = 1.0;
    this.loop = false;
    this.playing = false;

    this.player.on(AudioPlayerStatus.Idle, () => {
      this.playNext();
    });

    this.player.on('error', error => {
      console.error(`[AudioPlayer Error in ${this.guildId}]:`, error.message);
      this.textChannel.send(`⚠️ Error playing track: \`${error.message}\``).catch(() => {});
      this.playNext();
    });
  }

  async connect() {
    this.connection = joinVoiceChannel({
      channelId: this.voiceChannel.id,
      guildId: this.guildId,
      adapterCreator: this.voiceChannel.guild.voiceAdapterCreator
    });

    this.connection.subscribe(this.player);

    this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(this.connection, VoiceConnectionStatus.Signalling, 5000),
          entersState(this.connection, VoiceConnectionStatus.Connecting, 5000)
        ]);
      } catch {
        this.destroy();
      }
    });
  }

  async playNext() {
    if (this.currentSong) {
      this.history.push(this.currentSong);
    }

    if (this.songs.length === 0) {
      this.currentSong = null;
      this.playing = false;
      this.textChannel.send('🎵 Queue has ended. Leaving voice channel soon if inactive.').catch(() => {});
      return;
    }

    this.currentSong = this.songs.shift();
    await this.startStream(this.currentSong);
  }

  async playPrevious() {
    if (this.history.length === 0) {
      return false;
    }

    const prevSong = this.history.pop();
    if (this.currentSong) {
      this.songs.unshift(this.currentSong);
    }
    this.currentSong = prevSong;
    await this.startStream(this.currentSong);
    return true;
  }

  async startStream(song) {
    try {
      let stream;
      try {
        stream = await play.stream(song.url, { quality: 2 });
      } catch {
        // Fallback search or stream
        const searchResult = await play.search(`${song.title} ${song.artist || ''}`, { limit: 1 });
        if (searchResult.length > 0) {
          stream = await play.stream(searchResult[0].url, { quality: 2 });
        } else {
          throw new Error('Track stream could not be loaded');
        }
      }

      const resource = createAudioResource(stream.stream, {
        inputType: stream.type,
        inlineVolume: true
      });

      if (resource.volume) {
        resource.volume.setVolume(this.volume);
      }

      this.player.play(resource);
      this.playing = true;

      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('🎶 Now Playing')
        .setDescription(`[**${song.title}**](${song.url})`)
        .addFields(
          { name: 'Channel / Artist', value: song.channel || 'Unknown', inline: true },
          { name: 'Duration', value: song.duration || 'Live / Unknown', inline: true },
          { name: 'Requested By', value: `<@${song.requesterId}>`, inline: true }
        )
        .setThumbnail(song.thumbnail || config.brand.avatar)
        .setFooter({ text: 'Use !pause, !resume, !skip, !queue to control' })
        .setTimestamp();

      this.textChannel.send({ embeds: [embed] }).catch(() => {});
    } catch (err) {
      console.error('Stream error:', err);
      this.textChannel.send(`❌ Failed to stream track **${song.title}**: \`${err.message}\``).catch(() => {});
      this.playNext();
    }
  }

  destroy() {
    musicQueues.delete(this.guildId);
    if (this.connection) {
      this.connection.destroy();
    }
  }
}

const musicQueues = new Map();

/**
 * Searches and parses songs from YouTube, Spotify, SoundCloud, or free text
 */
async function resolveTracks(query, requester) {
  const songs = [];

  try {
    // 1. Spotify track / album / playlist
    if (play.is_expired()) {
      await play.refreshToken();
    }

    if (query.includes('spotify.com')) {
      const spData = await play.spotify(query);
      if (spData.type === 'track') {
        songs.push({
          title: spData.name,
          artist: spData.artists.map(a => a.name).join(', '),
          url: spData.url,
          duration: `${Math.floor(spData.durationInSec / 60)}:${String(spData.durationInSec % 60).padStart(2, '0')}`,
          thumbnail: spData.thumbnail?.url,
          requesterId: requester.id
        });
      } else if (spData.type === 'album' || spData.type === 'playlist') {
        const tracks = await spData.all_tracks();
        for (const track of tracks) {
          songs.push({
            title: track.name,
            artist: track.artists.map(a => a.name).join(', '),
            url: track.url,
            duration: `${Math.floor(track.durationInSec / 60)}:${String(track.durationInSec % 60).padStart(2, '0')}`,
            thumbnail: track.thumbnail?.url,
            requesterId: requester.id
          });
        }
      }
      return songs;
    }

    // 2. SoundCloud
    if (query.includes('soundcloud.com')) {
      const soData = await play.soundcloud(query);
      if (soData.type === 'track') {
        songs.push({
          title: soData.name,
          channel: soData.user?.name,
          url: soData.url,
          duration: soData.durationInSec ? `${Math.floor(soData.durationInSec / 60)}:${String(soData.durationInSec % 60).padStart(2, '0')}` : 'Unknown',
          thumbnail: soData.thumbnail,
          requesterId: requester.id
        });
        return songs;
      }
    }

    // 3. YouTube link or general search
    let ytInfo = null;
    if (query.startsWith('http://') || query.startsWith('https://')) {
      ytInfo = await play.video_info(query).catch(() => null);
      if (ytInfo && ytInfo.video_details) {
        const details = ytInfo.video_details;
        songs.push({
          title: details.title,
          channel: details.channel?.name,
          url: details.url,
          duration: details.durationRaw,
          thumbnail: details.thumbnails?.[0]?.url,
          requesterId: requester.id
        });
        return songs;
      }
    }

    // Free text search (Title, Artist, Lyrics)
    const searchResults = await play.search(query, { limit: 1 });
    if (searchResults && searchResults.length > 0) {
      const item = searchResults[0];
      songs.push({
        title: item.title,
        channel: item.channel?.name,
        url: item.url,
        duration: item.durationRaw,
        thumbnail: item.thumbnails?.[0]?.url,
        requesterId: requester.id
      });
    }
  } catch (err) {
    console.warn('Track resolution warning:', err.message);
  }

  return songs;
}

function getMusicQueue(guildId) {
  return musicQueues.get(guildId);
}

function createMusicQueue(guildId, voiceChannel, textChannel) {
  const queue = new MusicQueue(guildId, voiceChannel, textChannel);
  musicQueues.set(guildId, queue);
  return queue;
}

module.exports = {
  MusicQueue,
  musicQueues,
  getMusicQueue,
  createMusicQueue,
  resolveTracks
};
