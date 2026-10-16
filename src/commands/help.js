const { EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  name: 'help',
  description: 'Complete Ocean Bot command list and system guide',
  async execute(message, args) {
    const embed = new EmbedBuilder()
      .setTitle(`${config.emojis.shop} ${config.brand.name} Command Guide`)
      .setDescription(
        `Multi-purpose management platform with advanced private ticket departments, full moderation suite, join & invite logger, giveaways, and automated keyword responses.\n\n` +
        `**Default Prefix:** \`${process.env.PREFIX || '!'}\` | Supported via Slash Commands (/) and Prefix (!).`
      )
      .setColor('#5865F2')
      .addFields(
        {
          name: '🛡️ Moderation System',
          value:
            '`!lock [#channel]` - Lock a channel from sending messages\n' +
            '`!unlock [#channel]` - Unlock a locked channel\n' +
            '`!hide [#channel]` - Hide a channel from @everyone\n' +
            '`!unhide [#channel]` - Make channel visible again\n' +
            '`!purge <1-100>` - Bulk delete messages\n' +
            '`!slow <seconds>` - Set channel slowmode\n' +
            '`!kick @user [reason]` - Kick a member\n' +
            '`!ban @user [reason]` - Permanently ban a member\n' +
            '`!unban <user_id>` - Unban a user\n' +
            '`!to @user <duration> [reason]` - Timeout member (e.g. 10m, 1h)\n' +
            '`!unto @user` - Remove timeout from member'
        },
        {
          name: '👋 Welcome & Invite Logger',
          value:
            '`!welcome set #channel` - Configure join / welcome logger channel\n' +
            '`!welcome test` - Test the exact welcome embed design\n' +
            '`!invites [@user]` - Check regular, leaves, fake, and total invites'
        },
        {
          name: '🎫 Private Ticket System',
          value:
            '`!ticket panel` - Deploy interactive ticket panel with select menu & buttons\n' +
            '`!ticket create <type>` - Open a private ticket directly\n' +
            '`!ticket add @user` - Grant member access to current ticket\n' +
            '`!ticket remove @user` - Revoke member access from current ticket\n' +
            '`!ticket setcategory <type> <cat_id>` - Set category per department\n' +
            '*Controls:* 🔒 Close | 🔓 Reopen | ✋ Claim | ➕ Add | ➖ Remove | 🗑️ Delete (Auto-Transcript)'
        },
        {
          name: '🎉 Giveaway System',
          value:
            '`!giveaway start <time> <winners>w <prize>` - Launch interactive giveaway\n' +
            '`!giveaway reroll <message_id>` - Pick new winners\n' +
            '`!giveaway end <message_id>` - End giveaway immediately\n' +
            '`!giveaway list` - View active giveaways'
        },
        {
          name: '🔑 Keyword Auto-Replies & Triggers',
          value:
            '`!keyword add <word> <response>` - Register automatic response\n' +
            '`!keyword remove <word>` - Remove automatic response\n' +
            '`!keyword list` - List registered keywords\n' +
            '`!trigger add <response>` - Automated response when receipt image is uploaded'
        },
        {
          name: '⚙️ Configuration & Logging',
          value:
            '`!config setstaff @Role` - Add staff role\n' +
            '`!config setlog #channel` - Configure audit log channel\n' +
            '`!config view` - View current settings'
        }
      )
      .setFooter({ text: `${config.brand.footer} • Watching Ocean🐋`, iconURL: config.brand.avatar })
      .setTimestamp();

    return message.channel.send({ embeds: [embed] });
  }
};
