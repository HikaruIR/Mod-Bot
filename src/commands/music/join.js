const { getMusicQueue, createMusicQueue } = require('../../services/musicService');
const config = require('../../../config');

module.exports = {
  name: 'join',
  description: 'Join the user voice channel',
  async execute(message) {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel) {
      return message.reply({ content: `${config.emojis.error} You need to join a voice channel first!` });
    }

    let queue = getMusicQueue(message.guild.id);
    if (!queue) {
      queue = createMusicQueue(message.guild.id, voiceChannel, message.channel);
    }

    try {
      await queue.connect();
      return message.reply({ content: `🔊 Connected to **${voiceChannel.name}**!` });
    } catch (err) {
      return message.reply({ content: `${config.emojis.error} Failed to connect to voice channel: ${err.message}` });
    }
  }
};
