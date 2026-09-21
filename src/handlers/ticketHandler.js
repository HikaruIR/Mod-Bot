const {
  ChannelType,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  AttachmentBuilder
} = require('discord.js');
const db = require('../utils/database');
const config = require('../../config');
const { isSupport, isBotAdmin, getGuildConfig } = require('../utils/permissions');

/**
 * Handle interaction for creating a ticket (from Button or SelectMenu)
 */
async function handleTicketTrigger(interaction, panelName, selectedOption = null) {
  const guild = interaction.guild;
  const member = interaction.member;
  const guildPanels = db.panels.get(guild.id) || {};
  const panel = guildPanels[panelName];

  if (!panel) {
    return interaction.reply({
      content: `${config.emojis.error} Panel configuration not found.`,
      ephemeral: true
    });
  }

  // Check if user already has an active ticket for this panel
  const allTickets = db.tickets.all();
  const existingTicket = Object.values(allTickets).find(
    t => t.guildId === guild.id && t.userId === member.id && !t.closed && t.panelName === panelName
  );

  if (existingTicket) {
    const existingChannel = guild.channels.cache.get(existingTicket.channelId);
    if (existingChannel) {
      return interaction.reply({
        content: `${config.emojis.error} You already have an active ticket open in ${existingChannel}!`,
        ephemeral: true
      });
    }
  }

  // Check if form is enabled and panel has questions
  if (panel.form && panel.questions && panel.questions.length > 0) {
    const modalId = `ticket_modal_${panelName}_${selectedOption ? encodeURIComponent(selectedOption) : 'default'}`;
    const modal = new ModalBuilder()
      .setCustomId(modalId)
      .setTitle(`Ticket: ${panel.name.slice(0, 30)}`);

    // Discord allows up to 5 text inputs
    const questions = panel.questions.slice(0, 5);
    questions.forEach((q, idx) => {
      const input = new TextInputBuilder()
        .setCustomId(`q_${idx}`)
        .setLabel(q.slice(0, 45))
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(input));
    });

    return interaction.showModal(modal);
  }

  // If no form, create ticket directly
  await interaction.deferReply({ ephemeral: true });
  await createTicketChannel(interaction, panel, selectedOption, null);
}

/**
 * Create the actual ticket channel
 */
async function createTicketChannel(interaction, panel, selectedOption = null, formAnswers = null) {
  const guild = interaction.guild;
  const user = interaction.user;
  const member = interaction.member;

  let targetCategory = null;
  let categoryId = null;

  // Determine target category
  if (selectedOption && panel.dropdownOptions) {
    const optionData = panel.dropdownOptions.find(o => o.name.toLowerCase() === selectedOption.toLowerCase());
    if (optionData && optionData.categoryId) {
      categoryId = optionData.categoryId;
    }
  }

  if (categoryId) {
    targetCategory = guild.channels.cache.get(categoryId);
  }

  const ticketCount = Object.keys(db.tickets.all()).length + 1;
  const channelName = `ticket-${user.username.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || ticketCount}`;

  // Permission overwrites
  const permissionOverwrites = [
    {
      id: guild.id, // @everyone
      deny: [PermissionsBitField.Flags.ViewChannel]
    },
    {
      id: user.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.AttachFiles,
        PermissionsBitField.Flags.ReadMessageHistory
      ]
    },
    {
      id: guild.members.me.id, // Bot itself
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ManageChannels,
        PermissionsBitField.Flags.ManageMessages,
        PermissionsBitField.Flags.EmbedLinks,
        PermissionsBitField.Flags.AttachFiles
      ]
    }
  ];

  // Add Support Role permissions
  if (panel.supportRoleId) {
    permissionOverwrites.push({
      id: panel.supportRoleId,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.AttachFiles,
        PermissionsBitField.Flags.ReadMessageHistory
      ]
    });
  }

  // Add global support roles
  const cfg = getGuildConfig(guild.id);
  if (cfg.supportRoles && cfg.supportRoles.length > 0) {
    cfg.supportRoles.forEach(rId => {
      if (rId !== panel.supportRoleId && guild.roles.cache.has(rId)) {
        permissionOverwrites.push({
          id: rId,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.AttachFiles,
            PermissionsBitField.Flags.ReadMessageHistory
          ]
        });
      }
    });
  }

  try {
    const ticketChannel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: targetCategory ? targetCategory.id : null,
      permissionOverwrites: permissionOverwrites
    });

    // Save in database
    db.tickets.set(ticketChannel.id, {
      guildId: guild.id,
      channelId: ticketChannel.id,
      panelName: panel.name,
      userId: user.id,
      openedAt: Date.now(),
      claimedBy: null,
      closed: false,
      answers: formAnswers || {}
    });

    // Create Initial Embed inside ticket
    const ticketEmbed = new EmbedBuilder()
      .setColor(config.colors.ticket)
      .setTitle(`🎫 Ticket Created - ${panel.name}`)
      .setDescription(`Welcome <@${user.id}>! Support staff will be with you shortly.\nPlease describe your issue in detail.`)
      .addFields(
        { name: 'Opened By', value: `<@${user.id}>`, inline: true },
        { name: 'Panel', value: panel.name, inline: true }
      );

    if (selectedOption) {
      ticketEmbed.addFields({ name: 'Category / Reason', value: selectedOption, inline: true });
    }

    if (formAnswers && Object.keys(formAnswers).length > 0) {
      const answerFields = Object.entries(formAnswers).map(([question, answer]) => ({
        name: `❓ ${question}`,
        value: answer || 'No response provided',
        inline: false
      }));
      ticketEmbed.addFields(answerFields);
    }

    ticketEmbed.setFooter({ text: 'Use the buttons below to manage this ticket' })
      .setTimestamp();

    // Action buttons: Close & Claim
    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_action_close')
        .setLabel('Close')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒'),
      new ButtonBuilder()
        .setCustomId('ticket_action_claim')
        .setLabel('Claim')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('✋')
    );

    let mentionText = '';
    if (panel.mentionRoleId) {
      mentionText = `<@&${panel.mentionRoleId}> `;
    }
    mentionText += `<@${user.id}>`;

    await ticketChannel.send({
      content: mentionText,
      embeds: [ticketEmbed],
      components: [actionRow]
    });

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({
        content: `${config.emojis.success} Your ticket has been created: ${ticketChannel}`,
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: `${config.emojis.success} Your ticket has been created: ${ticketChannel}`,
        ephemeral: true
      });
    }
  } catch (error) {
    console.error('Error creating ticket channel:', error);
    const msg = `${config.emojis.error} Failed to create ticket channel: ${error.message}`;
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: msg, ephemeral: true });
    } else {
      await interaction.reply({ content: msg, ephemeral: true });
    }
  }
}

/**
 * Handle Modal Submissions
 */
async function handleModalSubmit(interaction) {
  if (!interaction.customId.startsWith('ticket_modal_')) return;

  const parts = interaction.customId.replace('ticket_modal_', '').split('_');
  const panelName = parts[0];
  const selectedOption = parts[1] !== 'default' ? decodeURIComponent(parts[1]) : null;

  const guild = interaction.guild;
  const guildPanels = db.panels.get(guild.id) || {};
  const panel = guildPanels[panelName];

  if (!panel) {
    return interaction.reply({
      content: `${config.emojis.error} Panel configuration could not be found.`,
      ephemeral: true
    });
  }

  await interaction.deferReply({ ephemeral: true });

  const answers = {};
  if (panel.questions) {
    panel.questions.slice(0, 5).forEach((q, idx) => {
      try {
        const val = interaction.fields.getTextInputValue(`q_${idx}`);
        answers[q] = val;
      } catch (err) {
        answers[q] = 'N/A';
      }
    });
  }

  await createTicketChannel(interaction, panel, selectedOption, answers);
}

/**
 * Handle Ticket Actions (Close, Claim, Confirm Close)
 */
async function handleTicketAction(interaction) {
  const customId = interaction.customId;
  const channel = interaction.channel;
  const member = interaction.member;
  const ticketData = db.tickets.get(channel.id);

  if (!ticketData) {
    return interaction.reply({
      content: `${config.emojis.error} This channel is not recognized as a registered ticket!`,
      ephemeral: true
    });
  }

  // CLAIM BUTTON
  if (customId === 'ticket_action_claim') {
    const guildPanels = db.panels.get(interaction.guild.id) || {};
    const panel = guildPanels[ticketData.panelName];
    const isAllowed = isSupport(member, panel?.supportRoleId);

    if (!isAllowed) {
      return interaction.reply({
        content: `${config.emojis.error} You do not have permission to claim this ticket! Only support staff can claim tickets.`,
        ephemeral: true
      });
    }

    if (ticketData.claimedBy) {
      return interaction.reply({
        content: `${config.emojis.warning} This ticket has already been claimed by <@${ticketData.claimedBy}>!`,
        ephemeral: true
      });
    }

    ticketData.claimedBy = member.id;
    db.tickets.set(channel.id, ticketData);

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setDescription(`✋ This ticket has been claimed by <@${member.id}>. They will assist you now!`);

    await interaction.reply({ embeds: [embed] });
    return;
  }

  // CLOSE BUTTON
  if (customId === 'ticket_action_close') {
    const confirmRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_confirm_close')
        .setLabel('Yes, close ticket')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🗑️'),
      new ButtonBuilder()
        .setCustomId('ticket_cancel_close')
        .setLabel('Cancel')
        .setStyle(ButtonStyle.Secondary)
    );

    return interaction.reply({
      content: '⚠️ Are you sure you want to close and delete this ticket?',
      components: [confirmRow]
    });
  }

  // CANCEL CLOSE
  if (customId === 'ticket_cancel_close') {
    await interaction.message.delete().catch(() => {});
    return interaction.reply({
      content: 'Ticket close cancelled.',
      ephemeral: true
    });
  }

  // CONFIRM CLOSE
  if (customId === 'ticket_confirm_close') {
    await interaction.reply({
      content: '🔒 Closing ticket and preparing transcript... Channel will be deleted in 5 seconds.'
    });

    ticketData.closed = true;
    ticketData.closedAt = Date.now();
    ticketData.closedBy = member.id;
    db.tickets.set(channel.id, ticketData);

    // Generate Transcript
    try {
      const messages = await channel.messages.fetch({ limit: 100 });
      const sorted = Array.from(messages.values()).reverse();
      let transcriptText = `--- TICKET TRANSCRIPT FOR #${channel.name} ---\n`;
      transcriptText += `Opened By: ${ticketData.userId}\n`;
      transcriptText += `Panel: ${ticketData.panelName}\n`;
      transcriptText += `Date: ${new Date().toISOString()}\n\n`;

      sorted.forEach(m => {
        transcriptText += `[${new Date(m.createdTimestamp).toLocaleString()}] ${m.author.tag}: ${m.cleanContent}\n`;
      });

      const buffer = Buffer.from(transcriptText, 'utf-8');
      const attachment = new AttachmentBuilder(buffer, { name: `transcript-${channel.name}.txt` });

      // DM transcript to ticket creator if possible
      try {
        const creator = await interaction.guild.members.fetch(ticketData.userId);
        if (creator) {
          await creator.send({
            content: `📄 Here is the transcript for your closed ticket in **${interaction.guild.name}**:`,
            files: [attachment]
          });
        }
      } catch (dmErr) {
        // DM failed (closed DMs)
      }
    } catch (err) {
      console.error('Failed to generate transcript:', err);
    }

    // Delete channel after 5 seconds
    setTimeout(async () => {
      try {
        await channel.delete('Ticket closed by user/staff');
      } catch (delErr) {
        console.error('Failed to delete ticket channel:', delErr);
      }
    }, 5000);
  }
}

module.exports = {
  handleTicketTrigger,
  createTicketChannel,
  handleModalSubmit,
  handleTicketAction
};
