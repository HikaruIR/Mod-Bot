const skipCommand = require('./skip');

module.exports = {
  name: 'next',
  description: 'Skip to the next song in the queue',
  async execute(message, args) {
    return skipCommand.execute(message, args);
  }
};
