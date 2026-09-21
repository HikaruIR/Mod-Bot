const {
  handleTicketTrigger,
  handleTicketAction,
  handleModalSubmit
} = require('../handlers/ticketHandler');
const { handleGiveawayEnter } = require('../handlers/giveawayHandler');

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    try {
      // 1. Buttons
      if (interaction.isButton()) {
        const customId = interaction.customId;

        if (customId.startsWith('ticket_button_')) {
          const panelName = customId.replace('ticket_button_', '');
          return await handleTicketTrigger(interaction, panelName);
        }

        if (
          customId.startsWith('ticket_action_') ||
          customId === 'ticket_confirm_close' ||
          customId === 'ticket_cancel_close'
        ) {
          return await handleTicketAction(interaction);
        }

        if (customId.startsWith('giveaway_enter_')) {
          return await handleGiveawayEnter(interaction);
        }
      }

      // 2. Dropdown / String Select Menus
      if (interaction.isStringSelectMenu()) {
        const customId = interaction.customId;

        if (customId.startsWith('ticket_select_')) {
          const panelName = customId.replace('ticket_select_', '');
          const selectedOption = interaction.values[0];
          return await handleTicketTrigger(interaction, panelName, selectedOption);
        }
      }

      // 3. Modal Submissions
      if (interaction.isModalSubmit()) {
        if (interaction.customId.startsWith('ticket_modal_')) {
          return await handleModalSubmit(interaction);
        }
      }
    } catch (err) {
      console.error('Error in interactionCreate handler:', err);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: `❌ An interaction error occurred: ${err.message}`, ephemeral: true }).catch(() => {});
      } else {
        await interaction.reply({ content: `❌ An interaction error occurred: ${err.message}`, ephemeral: true }).catch(() => {});
      }
    }
  }
};
