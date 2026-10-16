const { getMusicQueue } = require('../../services/musicService');
const config = require('../../../config');

module.exports = {
  name: 'stop',
  description: 'Stop music playback and clear the queue',
  async execute(message) {
    const queue = getMusicQueue(message.guild.id);
    if (!queue) {
      return message.reply({ content: `${config.emojis.error} There is no active music playback to stop!` });
    }

    queue.songs = [];
    queue.player.stop();
    queue.destroy();
    return message.reply({ content: '⏹️ Music playback stopped and queue cleared.' });
  }
};
