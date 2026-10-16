const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const db = require('../utils/database');
const config = require('../../config');
const { sendLog } = require('./logService');

// In-memory cooldowns: guildId + channelId
const triggerCooldowns = new Map();

/**
 * Configure an attachment trigger
 */
function setAttachmentTrigger(guild, triggerData) {
  const allTriggers = db.triggers.get(guild.id) || {};
  const id = triggerData.id || `trigger_${Date.now()}`;

  const trigger = {
    id,
    guildId: guild.id,
    type: triggerData.type || 'image', // 'image' | 'any' | 'extension'
    extensions: triggerData.extensions || ['.png', '.jpg', '.jpeg', '.webp'],
    channels: triggerData.channels || [], // specific channel IDs
    ticketCategories: triggerData.ticketCategories || ['payment', 'support'], // ticket types to respond in
    responseTitle: triggerData.responseTitle || '🧾 Payment Receipt Received',
    responseText: triggerData.responseText || '✅ Your receipt has been received successfully.\nOur staff and billing team will review and verify your transaction shortly.',
    cooldownSeconds: triggerData.cooldownSeconds || 15,
    enabled: triggerData.enabled !== false
  };

  allTriggers[id] = trigger;
  db.triggers.set(guild.id, allTriggers);
  return trigger;
}

/**
 * Check if incoming message has attachment and responds appropriately
 */
async function checkAttachmentTrigger(message) {
  if (!message.guild || message.author.bot) return false;
  if (!message.attachments || message.attachments.size === 0) return false;

  const guild = message.guild;
  const channel = message.channel;
  const guildTriggers = db.triggers.get(guild.id) || {};
  const triggersList = Object.values(guildTriggers);

  // Check if channel is a ticket
  const allTickets = db.tickets.all();
  const ticket = Object.values(allTickets).find(t => t.channelId === channel.id && !t.closed);

  const isTicketPayment = ticket && (ticket.type === 'payment' || ticket.type === 'purchase');

  let matchedTrigger = null;

  for (const tr of triggersList) {
    if (!tr.enabled) continue;

    // Channel check
    if (tr.channels && tr.channels.length > 0) {
      if (!tr.channels.includes(channel.id)) continue;
    }

    // Ticket category check
    if (ticket && tr.ticketCategories && tr.ticketCategories.length > 0) {
      if (!tr.ticketCategories.includes(ticket.type)) continue;
    } else if (!ticket && tr.ticketCategories && tr.ticketCategories.length > 0 && tr.channels.length === 0) {
      continue;
    }

    matchedTrigger = tr;
    break;
  }

  // Smart fallback if user opens payment ticket and sends receipt
  if (!matchedTrigger && isTicketPayment) {
    matchedTrigger = {
      type: 'image',
      extensions: ['.png', '.jpg', '.jpeg', '.webp'],
      responseTitle: '🧾 Payment Receipt Received',
      responseText: '✅ Your payment receipt has been received successfully.\nOur billing staff will manually review and verify the transaction shortly.\n\n> ⚠️ *Note: Order status remains Pending until manual verification by staff.*',
      cooldownSeconds: 20
    };
  }

  if (!matchedTrigger) return false;

  // Verify attachment type
  const hasValidAttachment = message.attachments.some(att => {
    const name = att.name ? att.name.toLowerCase() : '';
    const contentType = att.contentType || '';
    if (matchedTrigger.type === 'image') {
      return contentType.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(name);
    }
    if (matchedTrigger.type === 'extension' && matchedTrigger.extensions) {
      return matchedTrigger.extensions.some(ext => name.endsWith(ext.toLowerCase()));
    }
    return true; // Any attachment
  });

  if (!hasValidAttachment) return false;

  // Cooldown check
  const cdKey = `${guild.id}_${channel.id}_${message.author.id}`;
  const now = Date.now();
  const lastTime = triggerCooldowns.get(cdKey) || 0;
  if (now - lastTime < (matchedTrigger.cooldownSeconds || 15) * 1000) {
    return false;
  }
  triggerCooldowns.set(cdKey, now);

  const receiptUrl = message.attachments.first()?.url;

  const embed = new EmbedBuilder()
    .setTitle(matchedTrigger.responseTitle)
    .setDescription(matchedTrigger.responseText)
    .setColor(config.colors.receipt)
    .setFooter({ text: config.brand.footer, iconURL: config.brand.avatar })
    .setTimestamp();

  if (ticket && ticket.orderId) {
    embed.addFields({
      name: '🏷️ Order Reference',
      value: `\`${ticket.orderId}\``,
      inline: true
    });

    const order = db.orders.get(ticket.orderId);
    if (order && !order.receiptAttachmentUrl) {
      order.receiptAttachmentUrl = receiptUrl;
      db.orders.set(ticket.orderId, order);
    }
  }

  // Staff action row for payment ticket
  let components = [];
  if (ticket && ticket.orderId) {
    const approveBtn = new ButtonBuilder()
      .setCustomId(`order_approve_${ticket.orderId}`)
      .setLabel('Approve Payment (Staff)')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success);

    const rejectBtn = new ButtonBuilder()
      .setCustomId(`order_reject_${ticket.orderId}`)
      .setLabel('Reject Payment (Staff)')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Danger);

    components = [new ActionRowBuilder().addComponents(approveBtn, rejectBtn)];
  }

  try {
    await message.reply({ embeds: [embed], components });

    await sendLog(guild, {
      title: 'Receipt / Attachment Received',
      description: `Payment receipt submitted in <#${channel.id}> by <@${message.author.id}>.`,
      color: config.colors.receipt,
      fields: [
        { name: 'Channel', value: `<#${channel.id}>`, inline: true },
        { name: 'User', value: `<@${message.author.id}>`, inline: true },
        ...(ticket?.orderId ? [{ name: 'Order ID', value: `\`${ticket.orderId}\``, inline: true }] : [])
      ],
      user: message.author,
      action: 'RECEIPT_RECEIVED'
    });

    return true;
  } catch (err) {
    console.error('Error replying to attachment trigger:', err);
    return false;
  }
}

module.exports = {
  setAttachmentTrigger,
  checkAttachmentTrigger
};
