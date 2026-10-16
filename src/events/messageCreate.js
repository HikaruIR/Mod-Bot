const config = require('../../config');
const { checkMessageKeywords } = require('../services/keywordService');
const { checkAttachmentTrigger } = require('../services/triggerService');

module.exports = {
  name: 'messageCreate',
  async execute(client, message) {
    if (!message || message.author?.bot || !message.guild) return;

    // 1. Check Attachment & Receipt Triggers first
    if (message.attachments && message.attachments.size > 0) {
      try {
        const handledAttachment = await checkAttachmentTrigger(message);
        if (handledAttachment) return;
      } catch (err) {
        console.error('Error handling attachment trigger:', err);
      }
    }

    // 2. Check Prefix Commands
    const prefix = process.env.PREFIX || config.defaultPrefix || '!';
    if (message.content.startsWith(prefix)) {
      const args = message.content.slice(prefix.length).trim().split(/ +/);
      const commandName = args.shift().toLowerCase();

      const command = client.commands.get(commandName);
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
        return;
      }
    }

    // 3. Check Keyword Auto-replies
    try {
      await checkMessageKeywords(message);
    } catch (err) {
      console.error('Error checking keyword auto-reply:', err);
    }
  }
};
