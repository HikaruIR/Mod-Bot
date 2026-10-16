const { EmbedBuilder } = require('discord.js');
const db = require('../utils/database');
const config = require('../../config');

/**
 * Send an audit/action log to the configured log channel
 * @param {import('discord.js').Guild} guild 
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.description
 * @param {string} [options.color]
 * @param {Array<{name: string, value: string, inline?: boolean}>} [options.fields]
 * @param {import('discord.js').User} [options.user]
 * @param {string} [options.action]
 */
async function sendLog(guild, { title, description, color, fields = [], user = null, action = null }) {
  if (!guild) return;

  const guildConfig = db.config.get(guild.id) || {};
  const logChannelId = guildConfig.logChannelId;
  if (!logChannelId) return;

  const channel = guild.channels.cache.get(logChannelId);
  if (!channel || !channel.isTextBased()) return;

  try {
    const embed = new EmbedBuilder()
      .setTitle(`${config.emojis.shop} ${title}`)
      .setDescription(description || 'Action recorded in Ocean Shop audit trail.')
      .setColor(color || config.colors.primary)
      .setTimestamp();

    if (fields && fields.length > 0) {
      embed.addFields(fields);
    }

    if (user) {
      embed.setFooter({
        text: `User: ${user.tag || user.username} (${user.id})`,
        iconURL: user.displayAvatarURL ? user.displayAvatarURL({ dynamic: true }) : undefined
      });
    } else {
      embed.setFooter({
        text: config.brand.footer
      });
    }

    if (action) {
      embed.setAuthor({ name: `[LOG] ${action.toUpperCase()}` });
    }

    await channel.send({ embeds: [embed] }).catch(() => {});
  } catch (err) {
    console.error('Failed to dispatch log embed:', err);
  }
}

module.exports = {
  sendLog
};
