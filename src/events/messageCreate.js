const config = require('../../config');

module.exports = {
  name: 'messageCreate',
  async execute(client, message) {
    if (!message || message.author?.bot || !message.guild) return;

    // Check Prefix Commands
    const prefix = process.env.PREFIX || config.defaultPrefix || '!';
    if (message.content.startsWith(prefix)) {
      const args = message.content.slice(prefix.length).trim().split(/ +/);
      const commandName = args.shift().toLowerCase();

      // Check command or alias
      const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
      if (command) {
        // Automatically delete the command invocation message
        message.delete().catch(() => {});

        try {
          await command.execute(message, args);
        } catch (error) {
          console.error(`Error executing command ${commandName}:`, error);
          message.channel.send({
            content: `${config.emojis.error} An error occurred while executing command \`${commandName}\`: \`${error.message}\``
          }).catch(() => {});
        }
      }
    }
  }
};
