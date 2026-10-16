const { getMusicQueue } = require('../../services/musicService');
const config = require('../../../config');

module.exports = {
  name: 'skip',
  aliases: ['next', 'n'],
  description: 'Skip to the next song in the queue',
  async execute(message) {
    const queue = getMusicQueue(message.guild.id);
    if (!queue || !queue.playing) {
      return message.reply({ content: `${config.emojis.error} There is no music playing to skip!` });
    }

    message.reply({ content: '⏭️ Skipped current track!' });
    queue.player.stop(); // triggers AudioPlayerStatus.Idle -> playNext()
  }
};
