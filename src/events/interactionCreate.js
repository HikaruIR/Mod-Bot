const {
  handleTicketControlInteraction,
  createPrivateTicket,
  addMemberToTicket,
  removeMemberFromTicket
} = require('../services/ticketService');
const { createOrder, updateOrderStatus, getOrder } = require('../services/orderService');
const { handleGiveawayEnter } = require('../handlers/giveawayHandler');
const {
  handleTicketTrigger: handleLegacyTicketTrigger,
  handleTicketAction: handleLegacyTicketAction,
  handleModalSubmit: handleLegacyModalSubmit
} = require('../handlers/ticketHandler');
const db = require('../utils/database');
const config = require('../../config');
const { isSupport } = require('../utils/permissions');

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    try {
      // 1. Slash Commands
      if (interaction.isChatInputCommand()) {
        const command = client.slashCommands?.get(interaction.commandName);
        if (command && typeof command.executeSlash === 'function') {
          return await command.executeSlash(interaction);
        }
      }

      // 2. Button Clicks
      if (interaction.isButton()) {
        const customId = interaction.customId;

        // --- SHOP: BUY BUTTON ---
        if (customId.startsWith('shop_buy_')) {
          const productId = customId.replace('shop_buy_', '');
          const product = db.products.get(productId);

          if (!product) {
            return interaction.reply({
              content: `${config.emojis.error} This product was not found or has been removed.`,
              ephemeral: true
            });
          }

          if (product.status === 'disabled' || product.stockStatus?.toLowerCase() === 'out of stock') {
            return interaction.reply({
              content: `${config.emojis.error} Sorry, this product is currently out of stock or disabled.`,
              ephemeral: true
            });
          }

          await interaction.deferReply({ ephemeral: true });

          // Create Order
          const order = await createOrder(interaction.guild, interaction.user, product);

          // Create dedicated purchase ticket
          const ticketChannel = await createPrivateTicket(interaction.guild, interaction.user, 'purchase', {
            orderId: order.orderId,
            productId: product.id,
            productName: product.name,
            price: product.price
          });

          return interaction.editReply({
            content:
              `✅ Order created with ID \`${order.orderId}\`!\n` +
              `Please head over to your private ticket channel to complete payment:\n` +
              `👉 <#${ticketChannel.id}>`
          });
        }

        // --- SHOP: SUPPORT BUTTON ON PRODUCT ---
        if (customId.startsWith('shop_support_')) {
          const productId = customId.replace('shop_support_', '');
          const product = db.products.get(productId);

          await interaction.deferReply({ ephemeral: true });
          const ticketChannel = await createPrivateTicket(interaction.guild, interaction.user, 'support', {
            productId: product?.id,
            productName: product?.name
          });

          return interaction.editReply({
            content: `🛎️ Support ticket created for **${product ? product.name : 'General Support'}**:\n👉 <#${ticketChannel.id}>`
          });
        }

        // --- TICKET CREATION BUTTONS (FROM TICKET PANEL) ---
        if (customId.startsWith('ticket_create_')) {
          const ticketType = customId.replace('ticket_create_', '');
          await interaction.deferReply({ ephemeral: true });

          try {
            const channel = await createPrivateTicket(interaction.guild, interaction.user, ticketType);
            return interaction.editReply({
              content: `✅ Your ticket for \`${ticketType}\` has been created:\n👉 <#${channel.id}>`
            });
          } catch (err) {
            return interaction.editReply({ content: `❌ ${err.message}` });
          }
        }

        // --- TICKET CONTROLS (CLOSE, REOPEN, CLAIM, DELETE, ADDUSER, REMOVEUSER) ---
        if (customId.startsWith('ticket_ctrl_')) {
          return await handleTicketControlInteraction(interaction);
        }

        // --- STAFF PAYMENT APPROVE / REJECT BUTTONS ---
        if (customId.startsWith('order_approve_')) {
          if (!isSupport(interaction.member)) {
            return interaction.reply({ content: '❌ Only staff members can approve payments.', ephemeral: true });
          }
          const orderId = customId.replace('order_approve_', '');
          await updateOrderStatus(interaction.guild, orderId, 'Paid', interaction.user);
          return interaction.reply({
            content: `✅ Payment for order \`${orderId}\` approved by <@${interaction.user.id}>.`
          });
        }

        if (customId.startsWith('order_reject_')) {
          if (!isSupport(interaction.member)) {
            return interaction.reply({ content: '❌ Only staff members can reject payments.', ephemeral: true });
          }
          const orderId = customId.replace('order_reject_', '');
          await updateOrderStatus(interaction.guild, orderId, 'Cancelled', interaction.user, 'Payment rejected by staff');
          return interaction.reply({
            content: `❌ Payment for order \`${orderId}\` rejected by <@${interaction.user.id}>.`
          });
        }

        // --- LEGACY BOT BUTTONS (GIVEAWAY & OLD TICKET PANELS) ---
        if (customId.startsWith('giveaway_enter_')) {
          return await handleGiveawayEnter(interaction);
        }

        if (customId.startsWith('ticket_button_')) {
          const panelName = customId.replace('ticket_button_', '');
          return await handleLegacyTicketTrigger(interaction, panelName);
        }

        if (
          customId.startsWith('ticket_action_') ||
          customId === 'ticket_confirm_close' ||
          customId === 'ticket_cancel_close'
        ) {
          return await handleLegacyTicketAction(interaction);
        }
      }

      // 3. String Select Menus
      if (interaction.isStringSelectMenu()) {
        const customId = interaction.customId;

        // TICKET PANEL DROPDOWN
        if (customId === 'ticket_panel_menu') {
          const selectedType = interaction.values[0];
          await interaction.deferReply({ ephemeral: true });

          try {
            const channel = await createPrivateTicket(interaction.guild, interaction.user, selectedType);
            return interaction.editReply({
              content: `✅ Your ticket has been created:\n👉 <#${channel.id}>`
            });
          } catch (err) {
            return interaction.editReply({ content: `❌ ${err.message}` });
          }
        }

        // LEGACY SELECT MENUS
        if (customId.startsWith('ticket_select_')) {
          const panelName = customId.replace('ticket_select_', '');
          const selectedOption = interaction.values[0];
          return await handleLegacyTicketTrigger(interaction, panelName, selectedOption);
        }
      }

      // 4. Modal Submissions
      if (interaction.isModalSubmit()) {
        if (interaction.customId === 'ticket_modal_adduser') {
          const rawInput = interaction.fields.getTextInputValue('user_id_input');
          const cleanId = rawInput.replace(/[^0-9]/g, '');
          const targetMember = await interaction.guild.members.fetch(cleanId).catch(() => null);

          if (!targetMember) {
            return interaction.reply({ content: '❌ User not found with ID/mention: `' + rawInput + '`', ephemeral: true });
          }

          try {
            await addMemberToTicket(interaction.channel, targetMember, interaction.member);
            return interaction.reply({ content: `✅ Added <@${targetMember.id}> to this ticket.`, ephemeral: true });
          } catch (err) {
            return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          }
        }

        if (interaction.customId === 'ticket_modal_removeuser') {
          const rawInput = interaction.fields.getTextInputValue('user_id_input');
          const cleanId = rawInput.replace(/[^0-9]/g, '');
          const targetMember = await interaction.guild.members.fetch(cleanId).catch(() => null);

          if (!targetMember) {
            return interaction.reply({ content: '❌ User not found with ID/mention: `' + rawInput + '`', ephemeral: true });
          }

          try {
            await removeMemberFromTicket(interaction.channel, targetMember, interaction.member);
            return interaction.reply({ content: `✅ Removed <@${targetMember.id}> from this ticket.`, ephemeral: true });
          } catch (err) {
            return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
          }
        }

        if (interaction.customId.startsWith('ticket_modal_')) {
          return await handleLegacyModalSubmit(interaction);
        }
      }
    } catch (err) {
      console.error('Error in interactionCreate handler:', err);
      const errorMsg = `❌ Interaction error: \`${err.message}\``;
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMsg, ephemeral: true }).catch(() => {});
      } else {
        await interaction.reply({ content: errorMsg, ephemeral: true }).catch(() => {});
      }
    }
  }
};
