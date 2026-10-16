const { getMusicQueue } = require('../../services/musicService');
const config = require('../../../config');

module.exports = {
  name: 'pause',
  description: 'Pause the currently playing track',
  async execute(message) {
    const queue = getMusicQueue(message.guild.id);
    if (!queue || !queue.playing) {
      return message.reply({ content: `${config.emojis.error} There is no music currently playing!` });
    }

    queue.player.pause();
    return message.reply({ content: '⏸️ Music has been **paused**. Use `!resume` to continue.' });
  }
};
