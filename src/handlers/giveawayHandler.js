const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../utils/database');
const config = require('../../config');

/**
 * Checks if user or their roles are blacklisted in guild
 */
function isBlacklisted(guildId, member) {
  const guildBlacklist = db.blacklist.get(guildId) || { users: [], roles: [] };

  if (guildBlacklist.users && guildBlacklist.users.includes(member.id)) {
    return true;
  }

  if (guildBlacklist.roles && guildBlacklist.roles.length > 0) {
    if (member.roles.cache.some(r => guildBlacklist.roles.includes(r.id))) {
      return true;
    }
  }

  return false;
}

/**
 * Builds the Giveaway Embed
 */
function buildGiveawayEmbed(giveaway, ended = false) {
  const embed = new EmbedBuilder()
    .setColor(ended ? config.colors.neutral : config.colors.giveaway)
    .setTitle(`${config.emojis.giveaway} GIVEAWAY: ${giveaway.prize}`)
    .setDescription(
      ended
        ? `**Ended:** <t:${Math.floor(giveaway.endAt / 1000)}:R>\n` +
          `**Hosted By:** <@${giveaway.hostedBy}>\n` +
          `**Winners:** ${giveaway.winners && giveaway.winners.length > 0 ? giveaway.winners.map(w => `<@${w}>`).join(', ') : 'None'}`
        : `Click the button below to enter!\n\n` +
          `⏳ **Ends:** <t:${Math.floor(giveaway.endAt / 1000)}:R> (<t:${Math.floor(giveaway.endAt / 1000)}:f>)\n` +
          `👑 **Hosted By:** <@${giveaway.hostedBy}>\n` +
          `🏆 **Winners:** **${giveaway.winnersCount}**\n` +
          `👥 **Entries:** **${giveaway.participants ? giveaway.participants.length : 0}**`
    )
    .setFooter({ text: ended ? 'Giveaway Ended' : 'Good luck!' })
    .setTimestamp(new Date(giveaway.endAt));

  return embed;
}

/**
 * Handle user clicking the enter giveaway button
 */
async function handleGiveawayEnter(interaction) {
  const messageId = interaction.message.id;
  const giveaways = db.giveaways.all();
  const giveaway = giveaways[messageId];

  if (!giveaway) {
    return interaction.reply({
      content: `${config.emojis.error} This giveaway was not found in the database.`,
      ephemeral: true
    });
  }

  if (giveaway.ended || Date.now() >= giveaway.endAt) {
    return interaction.reply({
      content: `${config.emojis.warning} This giveaway has already ended!`,
      ephemeral: true
    });
  }

  // Check blacklist
  if (isBlacklisted(interaction.guild.id, interaction.member)) {
    return interaction.reply({
      content: `${config.emojis.error} You or one of your roles is blacklisted from participating in giveaways on this server.`,
      ephemeral: true
    });
  }

  giveaway.participants = giveaway.participants || [];

  const userIdx = giveaway.participants.indexOf(interaction.user.id);
  if (userIdx !== -1) {
    // Leave giveaway
    giveaway.participants.splice(userIdx, 1);
    db.giveaways.set(messageId, giveaway);

    // Update message
    const embed = buildGiveawayEmbed(giveaway, false);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`giveaway_enter_${messageId}`)
        .setLabel(`Enter (${giveaway.participants.length})`)
        .setStyle(ButtonStyle.Success)
        .setEmoji('🎉')
    );
    await interaction.message.edit({ embeds: [embed], components: [row] }).catch(() => {});

    return interaction.reply({
      content: `${config.emojis.warning} You have left the giveaway.`,
      ephemeral: true
    });
  } else {
    // Enter giveaway
    giveaway.participants.push(interaction.user.id);
    db.giveaways.set(messageId, giveaway);

    const embed = buildGiveawayEmbed(giveaway, false);
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`giveaway_enter_${messageId}`)
        .setLabel(`Enter (${giveaway.participants.length})`)
        .setStyle(ButtonStyle.Success)
        .setEmoji('🎉')
    );
    await interaction.message.edit({ embeds: [embed], components: [row] }).catch(() => {});

    return interaction.reply({
      content: `${config.emojis.success} You successfully entered the giveaway for **${giveaway.prize}**! Good luck! 🎉`,
      ephemeral: true
    });
  }
}

/**
 * Conclude a giveaway and automatically mention winners with a reply
 */
async function endGiveaway(client, messageId, reroll = false) {
  const giveaways = db.giveaways.all();
  const giveaway = giveaways[messageId];

  if (!giveaway) return null;
  if (!reroll && giveaway.ended) return null;

  try {
    const channel = client.channels.cache.get(giveaway.channelId) || await client.channels.fetch(giveaway.channelId).catch(() => null);
    if (!channel) return null;

    const giveawayMsg = await channel.messages.fetch(messageId).catch(() => null);
    if (!giveawayMsg) return null;

    // Filter valid participants (exclude blacklisted users/roles)
    const validParticipants = [];
    const guild = channel.guild;
    const guildBlacklist = db.blacklist.get(guild.id) || { users: [], roles: [] };

    for (const userId of (giveaway.participants || [])) {
      if (guildBlacklist.users && guildBlacklist.users.includes(userId)) continue;
      try {
        const m = await guild.members.fetch(userId).catch(() => null);
        if (m) {
          if (guildBlacklist.roles && m.roles.cache.some(r => guildBlacklist.roles.includes(r.id))) {
            continue;
          }
          validParticipants.push(userId);
        }
      } catch (err) {}
    }

    // Pick random winners
    const winners = [];
    const count = Math.min(giveaway.winnersCount || 1, validParticipants.length);
    const pool = [...validParticipants];

    for (let i = 0; i < count; i++) {
      if (pool.length === 0) break;
      const randIdx = Math.floor(Math.random() * pool.length);
      winners.push(pool[randIdx]);
      pool.splice(randIdx, 1);
    }

    giveaway.ended = true;
    giveaway.winners = winners;
    db.giveaways.set(messageId, giveaway);

    // Update original giveaway message
    const endedEmbed = buildGiveawayEmbed(giveaway, true);
    await giveawayMsg.edit({
      embeds: [endedEmbed],
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`giveaway_ended_${messageId}`)
            .setLabel(`Giveaway Ended (${giveaway.participants ? giveaway.participants.length : 0})`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true)
            .setEmoji('🎉')
        )
      ]
    }).catch(() => {});

    // Reply to the giveaway message and mention winners!
    if (winners.length > 0) {
      const winnerMentions = winners.map(w => `<@${w}>`).join(', ');
      await giveawayMsg.reply({
        content: `🎉 Congratulations ${winnerMentions}! You won the **${giveaway.prize}**!`
      });
    } else {
      await giveawayMsg.reply({
        content: `${config.emojis.warning} No valid entries found for **${giveaway.prize}**, so no winner could be chosen!`
      });
    }

    return winners;
  } catch (err) {
    console.error(`Error ending giveaway ${messageId}:`, err);
    return null;
  }
}

/**
 * Background ticker to check and end giveaways on schedule
 */
function initGiveawayTicker(client) {
  setInterval(async () => {
    const giveaways = db.giveaways.all();
    const now = Date.now();

    for (const [messageId, g] of Object.entries(giveaways)) {
      if (!g.ended && now >= g.endAt) {
        await endGiveaway(client, messageId, false);
      }
    }
  }, 5000);
}

module.exports = {
  isBlacklisted,
  buildGiveawayEmbed,
  handleGiveawayEnter,
  endGiveaway,
  initGiveawayTicker
};
