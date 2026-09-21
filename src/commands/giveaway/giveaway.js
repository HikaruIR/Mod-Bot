const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField
} = require('discord.js');
const db = require('../../utils/database');
const config = require('../../../config');
const { parseDuration, formatDuration } = require('../../utils/timeParser');
const { isGiveawayManager } = require('../../utils/permissions');
const {
  buildGiveawayEmbed,
  endGiveaway
} = require('../../handlers/giveawayHandler');

module.exports = {
  name: 'giveaway',
  description: 'Manage giveaways, rerolls, blacklists, and prize configurations',
  async execute(message, args) {
    const member = message.member;
    const guild = message.guild;

    if (!isGiveawayManager(member)) {
      return message.reply({
        content: `${config.emojis.error} You need Manage Server or Manage Events permission to manage giveaways!`
      });
    }

    const sub = args[0]?.toLowerCase();

    // 1. !giveaway start [duration/time] [winner-numbers] [prize]
    // Also supports: !giveaway start [prize] [winner-numbers] [duration]
    if (sub === 'start') {
      const remainingArgs = args.slice(1);
      if (remainingArgs.length < 2) {
        return message.reply({
          content: `${config.emojis.error} **Invalid usage!**\nFormat: \`!giveaway start [time] [winner-numbers] [prize]\`\nExample: \`!giveaway start 10m 1w Discord Nitro 1 Month\``
        });
      }

      let durationMs = null;
      let winnersCount = 1;
      let prizeParts = [];

      // Smart parsing
      for (const arg of remainingArgs) {
        const parsedMs = parseDuration(arg);
        if (parsedMs && !durationMs) {
          durationMs = parsedMs;
          continue;
        }

        const winMatch = arg.match(/^(\d+)w(?:inners?)?$/i) || (arg.match(/^\d+$/) && !durationMs && winnersCount === 1);
        if (winMatch && !prizeParts.length) {
          winnersCount = parseInt(winMatch[1] || arg, 10);
          continue;
        }

        prizeParts.push(arg);
      }

      if (!durationMs) {
        // Default to 10 minutes if no duration recognized
        durationMs = 10 * 60 * 1000;
      }

      const prize = prizeParts.join(' ') || 'Discord Nitro';
      if (winnersCount < 1) winnersCount = 1;

      const endAt = Date.now() + durationMs;

      const giveawayData = {
        guildId: guild.id,
        channelId: message.channel.id,
        messageId: null,
        prize: prize,
        winnersCount: winnersCount,
        endAt: endAt,
        hostedBy: message.author.id,
        participants: [],
        ended: false,
        winners: []
      };

      const embed = buildGiveawayEmbed(giveawayData, false);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('giveaway_enter_temp')
          .setLabel('Enter (0)')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🎉')
      );

      const giveawayMsg = await message.channel.send({
        content: `🎉 **GIVEAWAY STARTED** 🎉`,
        embeds: [embed],
        components: [row]
      });

      giveawayData.messageId = giveawayMsg.id;

      // Update button customId with actual message ID
      const updatedRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`giveaway_enter_${giveawayMsg.id}`)
          .setLabel('Enter (0)')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🎉')
      );
      await giveawayMsg.edit({ components: [updatedRow] });

      db.giveaways.set(giveawayMsg.id, giveawayData);

      // Delete the summon command message to keep channel tidy
      message.delete().catch(() => {});
      return;
    }

    // 2. !giveaway end [message-id]
    if (sub === 'end') {
      const targetId = args[1]?.replace(/[^0-9]/g, '');
      if (!targetId) {
        return message.reply({ content: `${config.emojis.error} Please specify the giveaway message ID. Format: \`!giveaway end [message-id]\`` });
      }

      const giveaways = db.giveaways.all();
      const giveaway = giveaways[targetId];

      if (!giveaway) {
        return message.reply({ content: `${config.emojis.error} Giveaway with ID \`${targetId}\` was not found.` });
      }

      if (giveaway.ended) {
        return message.reply({ content: `${config.emojis.warning} That giveaway has already ended!` });
      }

      const winners = await endGiveaway(message.client, targetId, false);
      return message.reply({
        content: `${config.emojis.success} Giveaway ended successfully! ${winners && winners.length ? `Winners: ${winners.map(w => `<@${w}>`).join(', ')}` : 'No winners were chosen.'}`
      });
    }

    // 3. !giveaway reroll [message-id] OR !giveaway rerole [message-id]
    if (sub === 'reroll' || sub === 'rerole') {
      const targetId = args[1]?.replace(/[^0-9]/g, '');
      if (!targetId) {
        return message.reply({ content: `${config.emojis.error} Please provide the giveaway message ID. Format: \`!giveaway reroll [message-id]\`` });
      }

      const giveaways = db.giveaways.all();
      const giveaway = giveaways[targetId];

      if (!giveaway) {
        return message.reply({ content: `${config.emojis.error} Giveaway with ID \`${targetId}\` was not found.` });
      }

      const winners = await endGiveaway(message.client, targetId, true);
      return message.reply({
        content: `${config.emojis.success} Rerolled giveaway! New winner(s): ${winners && winners.length ? winners.map(w => `<@${w}>`).join(', ') : 'None'}`
      });
    }

    // 4. !giveaway blacklist [user/role] & !giveaway unblacklist [user/role]
    if (sub === 'blacklist' || sub === 'unblacklist') {
      const action = sub;
      const targetArg = args[1];

      if (!targetArg) {
        return message.reply({ content: `${config.emojis.error} Format: \`!giveaway ${action} [@user / @role / ID]\`` });
      }

      const targetId = targetArg.replace(/[^0-9]/g, '');
      const guildBlacklist = db.blacklist.get(guild.id) || { users: [], roles: [] };
      guildBlacklist.users = guildBlacklist.users || [];
      guildBlacklist.roles = guildBlacklist.roles || [];

      const isRole = guild.roles.cache.has(targetId);

      if (action === 'blacklist') {
        if (isRole) {
          if (!guildBlacklist.roles.includes(targetId)) guildBlacklist.roles.push(targetId);
        } else {
          if (!guildBlacklist.users.includes(targetId)) guildBlacklist.users.push(targetId);
        }
      } else {
        guildBlacklist.roles = guildBlacklist.roles.filter(id => id !== targetId);
        guildBlacklist.users = guildBlacklist.users.filter(id => id !== targetId);
      }

      db.blacklist.set(guild.id, guildBlacklist);

      return message.reply({
        content: `${config.emojis.success} Successfully ${action === 'blacklist' ? 'added' : 'removed'} <@${isRole ? '&' : ''}${targetId}> ${action === 'blacklist' ? 'to' : 'from'} giveaway blacklist!`
      });
    }

    // 5. !giveaway prizechange [message-id] [new-prize]
    if (sub === 'prizechange') {
      const targetId = args[1]?.replace(/[^0-9]/g, '');
      const newPrize = args.slice(2).join(' ');

      if (!targetId || !newPrize) {
        return message.reply({ content: `${config.emojis.error} Format: \`!giveaway prizechange [message-id] [new-prize]\`` });
      }

      const giveaways = db.giveaways.all();
      const giveaway = giveaways[targetId];

      if (!giveaway) {
        return message.reply({ content: `${config.emojis.error} Giveaway with ID \`${targetId}\` was not found.` });
      }

      giveaway.prize = newPrize;
      db.giveaways.set(targetId, giveaway);

      // Edit message embed
      try {
        const ch = message.guild.channels.cache.get(giveaway.channelId);
        if (ch) {
          const gMsg = await ch.messages.fetch(targetId);
          if (gMsg) {
            const embed = buildGiveawayEmbed(giveaway, giveaway.ended);
            await gMsg.edit({ embeds: [embed] });
          }
        }
      } catch (err) {
        console.error('Failed to update giveaway message embed for prizechange:', err);
      }

      return message.reply({
        content: `${config.emojis.success} Prize for giveaway \`${targetId}\` changed to **${newPrize}**!`
      });
    }

    // 6. !giveaway winnerchange [message-id] [winner-numbers]
    if (sub === 'winnerchange') {
      const targetId = args[1]?.replace(/[^0-9]/g, '');
      const countArg = parseInt(args[2], 10);

      if (!targetId || isNaN(countArg) || countArg < 1) {
        return message.reply({ content: `${config.emojis.error} Format: \`!giveaway winnerchange [message-id] [number-of-winners]\`` });
      }

      const giveaways = db.giveaways.all();
      const giveaway = giveaways[targetId];

      if (!giveaway) {
        return message.reply({ content: `${config.emojis.error} Giveaway with ID \`${targetId}\` was not found.` });
      }

      giveaway.winnersCount = countArg;
      db.giveaways.set(targetId, giveaway);

      try {
        const ch = message.guild.channels.cache.get(giveaway.channelId);
        if (ch) {
          const gMsg = await ch.messages.fetch(targetId);
          if (gMsg) {
            const embed = buildGiveawayEmbed(giveaway, giveaway.ended);
            await gMsg.edit({ embeds: [embed] });
          }
        }
      } catch (err) {
        console.error('Failed to update giveaway message embed for winnerchange:', err);
      }

      return message.reply({
        content: `${config.emojis.success} Winner count for giveaway \`${targetId}\` updated to **${countArg}**!`
      });
    }

    // Help overview
    const helpEmbed = new EmbedBuilder()
      .setColor(config.colors.giveaway)
      .setTitle('🎉 Giveaway System Commands')
      .setDescription('Available giveaway commands:')
      .addFields(
        { name: '!giveaway start [time] [winners] [prize]', value: 'Starts a giveaway with live entry button counter' },
        { name: '!giveaway end [message-id]', value: 'Forces an ongoing giveaway to end and picks winner' },
        { name: '!giveaway reroll [message-id]', value: 'Selects new winners from valid entries and auto-replies' },
        { name: '!giveaway blacklist [user/role]', value: 'Blocks a user or role from participating/winning' },
        { name: '!giveaway unblacklist [user/role]', value: 'Removes user or role from giveaway blacklist' },
        { name: '!giveaway prizechange [message-id] [prize]', value: 'Updates the prize of an active giveaway' },
        { name: '!giveaway winnerchange [message-id] [number]', value: 'Changes the number of winners' }
      );

    return message.reply({ embeds: [helpEmbed] });
  }
};
