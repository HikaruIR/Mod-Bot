const config = require('../../config');

module.exports = {
  name: 'messageCreate',
  async execute(client, message) {
    if (message.author.bot || !message.guild) return;

    const prefix = process.env.PREFIX || config.defaultPrefix || '!';
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);
    if (!command) return;

    try {
      await command.execute(message, args);
    } catch (error) {
      console.error(`Error executing command ${commandName}:`, error);
      message.reply({
        content: `${config.emojis.error} An unexpected error occurred while executing this command: \`${error.message}\``
      }).catch(() => {});
    }
  }
};
