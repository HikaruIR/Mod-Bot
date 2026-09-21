const { EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  name: 'help',
  description: 'Display all available commands and their usage instructions',
  async execute(message, args) {
    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('🤖 Bot Commands & Modules')
      .setDescription('Here is a complete list of commands available in this bot:')
      .addFields(
        {
          name: '🎫 Ticket System Commands',
          value:
            '`!panel create [name] [dropdown(enable/disable)] [form(enable/disable)] [support-role] [mention-role]`\n' +
            '`!panel dropdownstyle [add/remove/edit] [name] [desc] [emoji] [category-id]`\n' +
            '`!panel form [create/edit/delete] "Q1" "Q2" "Q3"`\n' +
            '`!panel delete [panel-name]`\n' +
            '`!panel support [set/unset] [user/role]`\n' +
            '`!panel setadmin [set/unset] [user/role]`'
        },
        {
          name: '🎉 Giveaway System Commands',
          value:
            '`!giveaway start [time] [winners] [prize]` (e.g. `!giveaway start 10m 1w Nitro`)\n' +
            '`!giveaway end [message-id]`\n' +
            '`!giveaway reroll [message-id]`\n' +
            '`!giveaway blacklist [user/role]`\n' +
            '`!giveaway unblacklist [user/role]`\n' +
            '`!giveaway prizechange [message-id] [new-prize]`\n' +
            '`!giveaway winnerchange [message-id] [count]`'
        },
        {
          name: '🛡️ Moderation Commands',
          value:
            '`!ban @user [time] [reason]` (Sends reason in DM, supports tempban)\n' +
            '`!unban [user-id]`\n' +
            '`!kick @user [reason]`\n' +
            '`!to @user [time] [reason]` (Timeout/Mute)\n' +
            '`!unto @user` (Remove Timeout)\n' +
            '`!lock [channel]`\n' +
            '`!unlock [channel]`\n' +
            '`!hide [channel]` (Hide for normal users)\n' +
            '`!unhide [channel]`\n' +
            '`!oprole [set/unsetup] [role-id]`\n' +
            '`!op @user` (Assign OP role with full perms)\n' +
            '`!deop @user` (Revoke OP role)'
        }
      )
      .setFooter({ text: 'Prefix: ! • Discord.js v14' })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
};
