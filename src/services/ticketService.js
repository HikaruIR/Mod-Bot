const {
  ChannelType,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  AttachmentBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');
const db = require('../utils/database');
const config = require('../../config');
const { sendLog } = require('./logService');
const { isSupport, isBotAdmin, getGuildConfig } = require('../utils/permissions');

/**
 * Builds ticket control buttons:
 * Row 1: Close, Reopen, Claim, Delete
 * Row 2: Add Member, Remove Member
 */
function buildTicketControls(ticket) {
  const isClosed = Boolean(ticket.closed);

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_ctrl_close')
      .setLabel('Close Ticket')
      .setEmoji(config.emojis.lock)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(isClosed),
    new ButtonBuilder()
      .setCustomId('ticket_ctrl_reopen')
      .setLabel('Reopen')
      .setEmoji(config.emojis.unlock)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!isClosed),
    new ButtonBuilder()
      .setCustomId('ticket_ctrl_claim')
      .setLabel(ticket.claimedBy ? 'Unclaim' : 'Claim Ticket')
      .setEmoji(config.emojis.claim)
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('ticket_ctrl_delete')
      .setLabel('Delete')
      .setEmoji(config.emojis.delete)
      .setStyle(ButtonStyle.Danger)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_ctrl_adduser')
      .setLabel('Add Member')
      .setEmoji('➕')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('ticket_ctrl_removeuser')
      .setLabel('Remove Member')
      .setEmoji('➖')
      .setStyle(ButtonStyle.Secondary)
  );

  return [row1, row2];
}

/**
 * Adds a member to an existing ticket channel
 */
async function addMemberToTicket(channel, targetMember, authorMember) {
  if (!isSupport(authorMember)) {
    throw new Error('You do not have staff permissions to add members to this ticket.');
  }

  await channel.permissionOverwrites.edit(targetMember.id, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
    AttachFiles: true,
    EmbedLinks: true
  });

  const embed = new EmbedBuilder()
    .setTitle('➕ Member Added')
    .setDescription(`<@${targetMember.id}> has been added to this ticket by <@${authorMember.id}>.`)
    .setColor(config.colors.success)
    .setTimestamp();

  await channel.send({ embeds: [embed] });

  await sendLog(channel.guild, {
    title: 'Ticket Member Added',
    description: `<@${targetMember.id}> added to <#${channel.id}> by <@${authorMember.id}>.`,
    color: config.colors.success,
    user: authorMember.user,
    action: 'TICKET_ADD_MEMBER'
  });
}

/**
 * Removes a member from an existing ticket channel
 */
async function removeMemberFromTicket(channel, targetMember, authorMember) {
  if (!isSupport(authorMember)) {
    throw new Error('You do not have staff permissions to remove members from this ticket.');
  }

  // Prevent removing ticket creator unless admin
  const ticket = db.tickets.get(`ticket_${channel.id}`);
  if (ticket && ticket.userId === targetMember.id && !isBotAdmin(authorMember)) {
    throw new Error('You cannot remove the ticket creator from their own ticket.');
  }

  await channel.permissionOverwrites.delete(targetMember.id).catch(() => {});

  const embed = new EmbedBuilder()
    .setTitle('➖ Member Removed')
    .setDescription(`<@${targetMember.id}> has been removed from this ticket by <@${authorMember.id}>.`)
    .setColor(config.colors.warning)
    .setTimestamp();

  await channel.send({ embeds: [embed] });

  await sendLog(channel.guild, {
    title: 'Ticket Member Removed',
    description: `<@${targetMember.id}> removed from <#${channel.id}> by <@${authorMember.id}>.`,
    color: config.colors.warning,
    user: authorMember.user,
    action: 'TICKET_REMOVE_MEMBER'
  });
}

/**
 * Creates a private ticket channel with category resolution
 */
async function createPrivateTicket(guild, user, ticketType = 'support', extraData = {}) {
  const guildConfig = getGuildConfig(guild.id);
  const allTickets = db.tickets.all();

  // Check for existing active ticket of same type
  const activeTicket = Object.values(allTickets).find(
    t => t.guildId === guild.id && t.userId === user.id && !t.closed && t.type === ticketType
  );

  if (activeTicket) {
    const existingChannel = guild.channels.cache.get(activeTicket.channelId);
    if (existingChannel) {
      throw new Error(`You already have an active ticket open in <#${existingChannel.id}>!`);
    }
  }

  // Determine category per ticket type (support, purchase, warranty, payment)
  let parentCategory = null;
  const targetCatId =
    (guildConfig.ticketCategories && guildConfig.ticketCategories[ticketType]) ||
    guildConfig.ticketCategoryId;

  if (targetCatId) {
    parentCategory = guild.channels.cache.get(targetCatId);
  }

  // Format channel name
  const cleanUsername = user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
  const typePrefix = {
    purchase: 'order',
    warranty: 'warranty',
    payment: 'payment',
    support: 'support'
  }[ticketType] || 'ticket';

  const channelName = `${typePrefix}-${cleanUsername || user.id.slice(-4)}`;

  // Permission overwrites: @everyone deny, bot allow, user allow, staff roles allow
  const permissionOverwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionsBitField.Flags.ViewChannel]
    },
    {
      id: user.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.AttachFiles,
        PermissionsBitField.Flags.EmbedLinks
      ]
    },
    {
      id: guild.members.me.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ManageChannels,
        PermissionsBitField.Flags.ManageMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.AttachFiles,
        PermissionsBitField.Flags.EmbedLinks
      ]
    }
  ];

  // Staff roles permissions
  if (guildConfig.staffRoles && Array.isArray(guildConfig.staffRoles)) {
    for (const rId of guildConfig.staffRoles) {
      if (guild.roles.cache.has(rId)) {
        permissionOverwrites.push({
          id: rId,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ReadMessageHistory,
            PermissionsBitField.Flags.AttachFiles,
            PermissionsBitField.Flags.EmbedLinks
          ]
        });
      }
    }
  }

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: parentCategory ? parentCategory.id : undefined,
    topic: `Ocean Shop Ticket | User: ${user.tag} (${user.id}) | Type: ${ticketType.toUpperCase()}${extraData.orderId ? ` | Order: ${extraData.orderId}` : ''}`,
    permissionOverwrites
  });

  const ticketId = `ticket_${channel.id}`;
  const ticketRecord = {
    id: ticketId,
    channelId: channel.id,
    guildId: guild.id,
    userId: user.id,
    userTag: user.tag || user.username,
    type: ticketType,
    status: 'open',
    closed: false,
    closedAt: null,
    closedBy: null,
    claimedBy: null,
    createdAt: new Date().toISOString(),
    orderId: extraData.orderId || null,
    productId: extraData.productId || null,
    productName: extraData.productName || null
  };

  db.tickets.set(ticketId, ticketRecord);

  if (extraData.orderId) {
    const order = db.orders.get(extraData.orderId);
    if (order) {
      order.ticketChannelId = channel.id;
      db.orders.set(extraData.orderId, order);
    }
  }

  const typeDisplayNames = {
    purchase: '🛒 Product Purchase / Order',
    warranty: '🛡️ Warranty & Replacement Service',
    payment: '💳 Payment Verification & Inquiries',
    support: '❓ General Customer Support'
  };

  const welcomeEmbed = new EmbedBuilder()
    .setTitle(`${config.emojis.ticket} ${config.brand.name} Support Ticket`)
    .setDescription(
      `Hello <@${user.id}>! Thank you for reaching out to **${config.brand.name}**.\n` +
      `Our staff team has been notified and will assist you shortly. Please describe your request or upload your payment receipt below.`
    )
    .setColor(config.colors.primary)
    .addFields(
      { name: '👤 Creator', value: `<@${user.id}>`, inline: true },
      { name: '📂 Ticket Category', value: typeDisplayNames[ticketType] || ticketType, inline: true },
      { name: '⚡ Status', value: '🟢 Awaiting Staff Response', inline: true }
    )
    .setFooter({ text: config.brand.footer, iconURL: config.brand.avatar })
    .setTimestamp();

  if (extraData.orderId) {
    welcomeEmbed.addFields(
      { name: '🧾 Order ID', value: `\`${extraData.orderId}\``, inline: true },
      { name: '📦 Product', value: extraData.productName || 'N/A', inline: true },
      { name: '💰 Price', value: extraData.price || 'N/A', inline: true }
    );
  }

  if (ticketType === 'payment') {
    welcomeEmbed.addFields({
      name: '💳 Receipt Instructions',
      value: 'Please upload an image or screenshot of your payment receipt in this channel. Our bot will automatically log it and notify our billing department.'
    });
  }

  const controlRows = buildTicketControls(ticketRecord);

  await channel.send({
    content: `<@${user.id}> Welcome to your private support channel!`,
    embeds: [welcomeEmbed],
    components: controlRows
  });

  await sendLog(guild, {
    title: 'Ticket Created',
    description: `Ticket <#${channel.id}> created by <@${user.id}> (${ticketType}).`,
    color: config.colors.ticket,
    fields: [
      { name: 'Type', value: ticketType, inline: true },
      { name: 'User', value: `<@${user.id}>`, inline: true },
      ...(extraData.orderId ? [{ name: 'Order ID', value: `\`${extraData.orderId}\``, inline: true }] : [])
    ],
    user,
    action: 'TICKET_CREATE'
  });

  return channel;
}

/**
 * Generate transcript before deletion
 */
async function generateTranscript(channel) {
  try {
    const messages = await channel.messages.fetch({ limit: 100 });
    const sorted = Array.from(messages.values()).reverse();

    let transcript = `========================================================\n`;
    transcript += `OCEAN SHOP TICKET TRANSCRIPT\n`;
    transcript += `Channel: #${channel.name} (${channel.id})\n`;
    transcript += `Exported: ${new Date().toISOString()}\n`;
    transcript += `========================================================\n\n`;

    for (const msg of sorted) {
      const time = msg.createdAt.toLocaleString();
      const author = `${msg.author.tag} (${msg.author.id})`;
      let content = msg.content || '';

      if (msg.attachments.size > 0) {
        content += ` [Attachments: ${msg.attachments.map(a => a.url).join(', ')}]`;
      }
      if (msg.embeds.length > 0) {
        content += ` [Embeds: ${msg.embeds.map(e => e.title || 'Embed').join(', ')}]`;
      }

      transcript += `[${time}] ${author}:\n${content}\n\n`;
    }

    const buffer = Buffer.from(transcript, 'utf-8');
    return new AttachmentBuilder(buffer, { name: `transcript-${channel.name}.txt` });
  } catch (err) {
    console.error('Failed to create transcript:', err);
    return null;
  }
}

/**
 * Handle ticket action buttons (close, reopen, claim, delete, adduser, removeuser)
 */
async function handleTicketControlInteraction(interaction) {
  const customId = interaction.customId;
  const channel = interaction.channel;
  const guild = interaction.guild;
  const user = interaction.user;

  const ticketId = `ticket_${channel.id}`;
  const ticket = db.tickets.get(ticketId);

  if (!ticket) {
    return interaction.reply({
      content: '❌ Ticket data not found in database.',
      ephemeral: true
    });
  }

  // ADD USER MODAL
  if (customId === 'ticket_ctrl_adduser') {
    if (!isSupport(interaction.member)) {
      return interaction.reply({ content: '❌ Only staff members can add users to this ticket.', ephemeral: true });
    }

    const modal = new ModalBuilder()
      .setCustomId('ticket_modal_adduser')
      .setTitle('Add Member to Ticket')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('user_id_input')
            .setLabel('User ID or Mention')
            .setPlaceholder('Enter User ID (e.g. 123456789012345678)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );

    return interaction.showModal(modal);
  }

  // REMOVE USER MODAL
  if (customId === 'ticket_ctrl_removeuser') {
    if (!isSupport(interaction.member)) {
      return interaction.reply({ content: '❌ Only staff members can remove users from this ticket.', ephemeral: true });
    }

    const modal = new ModalBuilder()
      .setCustomId('ticket_modal_removeuser')
      .setTitle('Remove Member from Ticket')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('user_id_input')
            .setLabel('User ID or Mention')
            .setPlaceholder('Enter User ID to remove')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        )
      );

    return interaction.showModal(modal);
  }

  // CLOSE
  if (customId === 'ticket_ctrl_close') {
    if (ticket.closed) {
      return interaction.reply({ content: 'This ticket is already closed.', ephemeral: true });
    }

    ticket.closed = true;
    ticket.status = 'closed';
    ticket.closedAt = new Date().toISOString();
    ticket.closedBy = user.id;
    db.tickets.set(ticketId, ticket);

    await channel.permissionOverwrites.edit(ticket.userId, {
      SendMessages: false
    }).catch(() => {});

    const closeEmbed = new EmbedBuilder()
      .setTitle('🔒 Ticket Closed')
      .setDescription(`This ticket was closed by <@${user.id}>.\nClick **Reopen** to open it again.`)
      .setColor(config.colors.warning)
      .setTimestamp();

    await interaction.update({
      components: buildTicketControls(ticket)
    });

    await channel.send({ embeds: [closeEmbed] });

    await sendLog(guild, {
      title: 'Ticket Closed',
      description: `Ticket <#${channel.id}> closed by <@${user.id}>.`,
      color: config.colors.warning,
      user,
      action: 'TICKET_CLOSE'
    });
    return;
  }

  // REOPEN
  if (customId === 'ticket_ctrl_reopen') {
    if (!ticket.closed) {
      return interaction.reply({ content: 'This ticket is already open.', ephemeral: true });
    }

    ticket.closed = false;
    ticket.status = 'open';
    ticket.closedAt = null;
    ticket.closedBy = null;
    db.tickets.set(ticketId, ticket);

    await channel.permissionOverwrites.edit(ticket.userId, {
      SendMessages: true,
      ViewChannel: true
    }).catch(() => {});

    const reopenEmbed = new EmbedBuilder()
      .setTitle('🔓 Ticket Reopened')
      .setDescription(`This ticket has been reopened by <@${user.id}>.`)
      .setColor(config.colors.success)
      .setTimestamp();

    await interaction.update({
      components: buildTicketControls(ticket)
    });

    await channel.send({ embeds: [reopenEmbed] });

    await sendLog(guild, {
      title: 'Ticket Reopened',
      description: `Ticket <#${channel.id}> reopened by <@${user.id}>.`,
      color: config.colors.success,
      user,
      action: 'TICKET_REOPEN'
    });
    return;
  }

  // CLAIM
  if (customId === 'ticket_ctrl_claim') {
    if (!isSupport(interaction.member)) {
      return interaction.reply({
        content: '❌ Only staff members can claim or unclaim tickets.',
        ephemeral: true
      });
    }

    if (ticket.claimedBy === user.id) {
      ticket.claimedBy = null;
      db.tickets.set(ticketId, ticket);
      await interaction.update({ components: buildTicketControls(ticket) });
      return channel.send(`✋ Ticket unclaimed by <@${user.id}> and is now open for all staff.`);
    }

    ticket.claimedBy = user.id;
    db.tickets.set(ticketId, ticket);

    await interaction.update({ components: buildTicketControls(ticket) });
    return channel.send(`✋ This ticket is now claimed by <@${user.id}>.`);
  }

  // DELETE
  if (customId === 'ticket_ctrl_delete') {
    await interaction.reply({
      content: '⏳ Generating transcript and deleting ticket channel in 5 seconds...',
      ephemeral: false
    });

    const transcriptAttachment = await generateTranscript(channel);
    const guildConfig = getGuildConfig(guild.id);

    if (guildConfig.logChannelId && transcriptAttachment) {
      const logCh = guild.channels.cache.get(guildConfig.logChannelId);
      if (logCh) {
        await logCh.send({
          content: `📜 **Transcript for deleted ticket:** #${channel.name} (<@${ticket.userId}>)`,
          files: [transcriptAttachment]
        }).catch(() => {});
      }
    }

    if (transcriptAttachment) {
      const ticketCreator = await guild.members.fetch(ticket.userId).catch(() => null);
      if (ticketCreator) {
        ticketCreator.send({
          content: `Here is the transcript for your ticket in **${guild.name}**:`,
          files: [transcriptAttachment]
        }).catch(() => {});
      }
    }

    db.tickets.delete(ticketId);

    setTimeout(() => {
      channel.delete('Ticket deleted by staff').catch(() => {});
    }, 4000);
  }
}

/**
 * Builds the interactive Ticket Panel with Buttons / Select Menu
 */
function buildTicketPanelEmbed(title, description) {
  const embed = new EmbedBuilder()
    .setTitle(title || `🎫 ${config.brand.name} Support & Ticket Center`)
    .setDescription(
      description ||
      `Welcome to **${config.brand.name}** Support Center!\n\n` +
      `Select an option below to create a private ticket with our team:\n\n` +
      `🛒 **Product Purchase:** Place a new order or inquire about products\n` +
      `🛡️ **Warranty & Claim:** Request warranty assistance or replacement\n` +
      `💳 **Billing & Payments:** Upload payment receipts and billing questions\n` +
      `❓ **General Support:** General inquiries and technical assistance`
    )
    .setColor(config.colors.primary)
    .setImage('https://dummyimage.com/800x200/0a192f/00a8ff&text=OCEAN+SHOP+SUPPORT+CENTER')
    .setFooter({ text: config.brand.footer, iconURL: config.brand.avatar })
    .setTimestamp();

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('ticket_panel_menu')
    .setPlaceholder('Select a ticket department to open a ticket...')
    .addOptions([
      {
        label: 'Product Purchase / Order',
        value: 'purchase',
        description: 'Place a new order or ask product questions',
        emoji: '🛒'
      },
      {
        label: 'Warranty & Replacement',
        value: 'warranty',
        description: 'Verify and claim product warranty',
        emoji: '🛡️'
      },
      {
        label: 'Billing & Payment Receipt',
        value: 'payment',
        description: 'Upload payment proof and billing verification',
        emoji: '💳'
      },
      {
        label: 'General Support',
        value: 'support',
        description: 'Contact server staff and customer support',
        emoji: '❓'
      }
    ]);

  const selectRow = new ActionRowBuilder().addComponents(selectMenu);

  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_create_purchase').setLabel('Buy Product').setEmoji('🛒').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('ticket_create_warranty').setLabel('Warranty').setEmoji('🛡️').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('ticket_create_payment').setLabel('Payment').setEmoji('💳').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('ticket_create_support').setLabel('Support').setEmoji('❓').setStyle(ButtonStyle.Secondary)
  );

  return { embed, selectRow, buttonRow };
}

module.exports = {
  buildTicketControls,
  createPrivateTicket,
  handleTicketControlInteraction,
  buildTicketPanelEmbed,
  generateTranscript,
  addMemberToTicket,
  removeMemberFromTicket
};
