const { EmbedBuilder } = require('discord.js');
const db = require('./database');
const config = require('../../config');

/**
 * Sends a moderation or event log to the configured log channel
 */
async function sendModLog(guild, embed) {
  if (!guild) return;
  const logChannelId = db.logs.get(guild.id);
  if (!logChannelId) return;

  const channel = guild.channels.cache.get(logChannelId);
  if (channel && channel.isTextBased()) {
    try {
      await channel.send({ embeds: [embed] });
    } catch (err) {
      console.warn(`Failed to send log to channel ${logChannelId}:`, err.message);
    }
  }
}

module.exports = {
  sendModLog
};
