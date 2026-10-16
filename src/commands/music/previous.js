const { getMusicQueue } = require('../../services/musicService');
const config = require('../../../config');

module.exports = {
  name: 'previous',
  aliases: ['prev'],
  description: 'Play the previously played song in the history',
  async execute(message) {
    const queue = getMusicQueue(message.guild.id);
    if (!queue) {
      return message.reply({ content: `${config.emojis.error} There is no active music session!` });
    }

    if (queue.history.length === 0) {
      return message.reply({ content: `${config.emojis.warning} There are no previously played tracks in history!` });
    }

    const success = await queue.playPrevious();
    if (success) {
      return message.reply({ content: '⏮️ Playing previous track!' });
    } else {
      return message.reply({ content: `${config.emojis.error} Failed to play previous track.` });
    }
  }
};
