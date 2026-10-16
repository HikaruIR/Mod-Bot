const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const db = require('../utils/database');
const config = require('../../config');
const { sendLog } = require('./logService');

// In-memory cooldown tracking per guild+keyword+user
const cooldowns = new Map();

/**
 * Add or update a keyword
 */
async function setKeyword(guild, keywordData, author = null) {
  const allKeywords = db.keywords.get(guild.id) || {};
  const id = (keywordData.id || keywordData.keyword).toLowerCase().trim();

  const record = {
    id,
    keyword: keywordData.keyword,
    matchType: keywordData.matchType || 'contains', // 'exact' | 'contains'
    caseSensitive: Boolean(keywordData.caseSensitive),
    responseType: keywordData.responseType || 'text', // 'text' | 'embed' | 'image'
    content: keywordData.content || '',
    embedTitle: keywordData.embedTitle || null,
    embedDescription: keywordData.embedDescription || null,
    embedColor: keywordData.embedColor || config.colors.primary,
    imageUrl: keywordData.imageUrl || null,
    buttons: keywordData.buttons || [], // Array of { label, url, emoji }
    channels: keywordData.channels || [], // Allowed channel IDs (empty = all)
    roles: keywordData.roles || [], // Required role IDs (empty = all)
    cooldownSeconds: keywordData.cooldownSeconds || 5,
    enabled: keywordData.enabled !== false,
    createdAt: new Date().toISOString()
  };

  allKeywords[id] = record;
  db.keywords.set(guild.id, allKeywords);

  await sendLog(guild, {
    title: 'Keyword Auto-Reply Saved',
    description: `Keyword **"${record.keyword}"** saved. Match type: \`${record.matchType}\`.`,
    color: config.colors.primary,
    user: author,
    action: 'KEYWORD_SET'
  });

  return record;
}

/**
 * Delete a keyword
 */
async function removeKeyword(guild, keywordId, author = null) {
  const allKeywords = db.keywords.get(guild.id) || {};
  const id = keywordId.toLowerCase().trim();

  if (!allKeywords[id]) {
    throw new Error(`Keyword "${keywordId}" not found.`);
  }

  const removed = allKeywords[id];
  delete allKeywords[id];
  db.keywords.set(guild.id, allKeywords);

  await sendLog(guild, {
    title: 'Keyword Auto-Reply Deleted',
    description: `Keyword **"${removed.keyword}"** was removed.`,
    color: config.colors.danger,
    user: author,
    action: 'KEYWORD_DELETE'
  });

  return removed;
}

/**
 * Process an incoming message and trigger matching keyword if any
 */
async function checkMessageKeywords(message) {
  if (!message.guild || message.author.bot) return false;

  const guildKeywords = db.keywords.get(message.guild.id) || {};
  const keywordsList = Object.values(guildKeywords);
  if (keywordsList.length === 0) return false;

  const messageText = message.content.trim();
  if (!messageText) return false;

  for (const kw of keywordsList) {
    if (!kw.enabled) continue;

    // Channel restrictions
    if (kw.channels && kw.channels.length > 0) {
      if (!kw.channels.includes(message.channel.id)) continue;
    }

    // Role restrictions
    if (kw.roles && kw.roles.length > 0) {
      const hasRole = kw.roles.some(rId => message.member?.roles.cache.has(rId));
      if (!hasRole) continue;
    }

    // Matching logic
    const testText = kw.caseSensitive ? messageText : messageText.toLowerCase();
    const targetWord = kw.caseSensitive ? kw.keyword : kw.keyword.toLowerCase();

    let isMatch = false;
    if (kw.matchType === 'exact') {
      isMatch = (testText === targetWord);
    } else {
      isMatch = testText.includes(targetWord);
    }

    if (!isMatch) continue;

    // Cooldown check
    const cdKey = `${message.guild.id}_${kw.id}_${message.author.id}`;
    const now = Date.now();
    const lastUsed = cooldowns.get(cdKey) || 0;
    const cdMs = (kw.cooldownSeconds || 5) * 1000;

    if (now - lastUsed < cdMs) {
      // In cooldown, ignore
      return false;
    }

    cooldowns.set(cdKey, now);

    // Build response
    const payload = {};

    if (kw.responseType === 'text') {
      payload.content = kw.content;
    } else if (kw.responseType === 'embed') {
      const embed = new EmbedBuilder()
        .setTitle(kw.embedTitle || `Auto-Reply: ${kw.keyword}`)
        .setDescription(kw.embedDescription || kw.content)
        .setColor(kw.embedColor || config.colors.primary)
        .setFooter({ text: config.brand.footer, iconURL: config.brand.avatar })
        .setTimestamp();

      if (kw.imageUrl) embed.setImage(kw.imageUrl);
      payload.embeds = [embed];
      if (kw.content) payload.content = kw.content;
    } else if (kw.responseType === 'image') {
      payload.content = kw.content || undefined;
      if (kw.imageUrl) {
        const embed = new EmbedBuilder()
          .setImage(kw.imageUrl)
          .setColor(config.colors.primary);
        payload.embeds = [embed];
      }
    }

    // Attach buttons if any
    if (kw.buttons && kw.buttons.length > 0) {
      const row = new ActionRowBuilder();
      for (const btn of kw.buttons.slice(0, 5)) {
        const b = new ButtonBuilder()
          .setLabel(btn.label || 'Link')
          .setStyle(ButtonStyle.Link)
          .setURL(btn.url);
        if (btn.emoji) b.setEmoji(btn.emoji);
        row.addComponents(b);
      }
      payload.components = [row];
    }

    try {
      await message.reply(payload);
      return true; // Match found and handled
    } catch (err) {
      console.error(`Failed to reply with keyword ${kw.id}:`, err);
    }
  }

  return false;
}

module.exports = {
  setKeyword,
  removeKeyword,
  checkMessageKeywords
};
