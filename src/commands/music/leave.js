const { getMusicQueue } = require('../../services/musicService');
const config = require('../../../config');

module.exports = {
  name: 'leave',
  aliases: ['disconnect', 'dc'],
  description: 'Disconnect from voice channel',
  async execute(message) {
    const queue = getMusicQueue(message.guild.id);
    if (!queue) {
      return message.reply({ content: `${config.emojis.warning} I am not connected to any voice channel!` });
    }

    queue.songs = [];
    queue.destroy();
    return message.reply({ content: '👋 Disconnected from voice channel.' });
  }
};
