const { getMusicQueue } = require('../../services/musicService');
const config = require('../../../config');

module.exports = {
  name: 'resume',
  description: 'Resume paused music playback',
  async execute(message) {
    const queue = getMusicQueue(message.guild.id);
    if (!queue) {
      return message.reply({ content: `${config.emojis.error} There is no active music player!` });
    }

    queue.player.unpause();
    return message.reply({ content: '▶️ Music has been **resumed**!' });
  }
};
