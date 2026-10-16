const config = require('../../config');

module.exports = {
  name: 'messageCreate',
  async execute(client, message) {
    if (!message || message.author?.bot || !message.guild) return;

    // Check Prefix Commands (Default: ?)
    const prefix = process.env.PREFIX || config.defaultPrefix || '?';
    if (message.content.startsWith(prefix)) {
      const args = message.content.slice(prefix.length).trim().split(/ +/);
      const commandName = args.shift().toLowerCase();

      // Check command or alias
      const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
      if (command) {
        // Safe reply wrapper to prevent "Unknown Message" error if message was deleted
        const originalReply = message.reply.bind(message);
        message.reply = async (options) => {
          try {
            return await originalReply(options);
          } catch (err) {
            if (err.code === 50035 || err.message?.includes('MESSAGE_REFERENCE_UNKNOWN_MESSAGE') || err.message?.includes('Unknown Message')) {
              return await message.channel.send(options);
            }
            throw err;
          }
        };

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
