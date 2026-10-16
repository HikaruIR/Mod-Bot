const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  AttachmentBuilder
} = require('discord.js');
const { createTicketChannel } = require('../services/ticketService');
const db = require('../utils/database');
const config = require('../../config');

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

      // 2. Select Menu Interaction (Ticket Category Dropdown)
      if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_category_select') {
        const selectedCategory = interaction.values[0];

        const modal = new ModalBuilder()
          .setCustomId(`ticket_modal_${selectedCategory}`)
          .setTitle('فرم باز کردن تیکت پشتیبانی');

        const subjectInput = new TextInputBuilder()
          .setCustomId('ticket_subject')
          .setLabel('موضوع تیکت (Subject)')
          .setPlaceholder('خلاصه مشکل یا درخواست خود را بنویسید...')
          .setStyle(TextInputStyle.Short)
          .setMinLength(3)
          .setMaxLength(100)
          .setRequired(true);

        const descInput = new TextInputBuilder()
          .setCustomId('ticket_description')
          .setLabel('توضیحات تکمیلی (Description)')
          .setPlaceholder('توضیحات کامل مشکل، آیدی، مدارک یا لینک...')
          .setStyle(TextInputStyle.Paragraph)
          .setMinLength(10)
          .setMaxLength(1000)
          .setRequired(true);

        modal.addComponents(
          new ActionRowBuilder().addComponents(subjectInput),
          new ActionRowBuilder().addComponents(descInput)
        );

        return await interaction.showModal(modal);
      }

      // 3. Modal Form Submission
      if (interaction.isModalSubmit() && interaction.customId.startsWith('ticket_modal_')) {
        const categoryType = interaction.customId.replace('ticket_modal_', '');
        const subject = interaction.fields.getTextInputValue('ticket_subject');
        const description = interaction.fields.getTextInputValue('ticket_description');

        await interaction.deferReply({ ephemeral: true });

        // Check if user already has an open ticket
        const allTickets = db.tickets.get(interaction.guild.id) || {};
        const userExistingTicket = Object.values(allTickets).find(t => t.userId === interaction.user.id);

        if (userExistingTicket && interaction.guild.channels.cache.has(userExistingTicket.channelId)) {
          return interaction.editReply({
            content: `⚠️ شما در حال حاضر یک تیکت باز در کانال <#${userExistingTicket.channelId}> دارید! ابتدا آن را ببندید.`
          });
        }

        const channel = await createTicketChannel(
          interaction.guild,
          interaction.user,
          categoryType,
          subject,
          description
        );

        return interaction.editReply({
          content: `✅ تیکت شما با موفقیت در کانال ${channel} باز شد!`
        });
      }

      // 4. Ticket Control Buttons
      if (interaction.isButton()) {
        const customId = interaction.customId;

        // Button: Close Ticket
        if (customId === 'ticket_close') {
          await interaction.reply({ content: '🔒 این تیکت تا ۵ ثانیه دیگر بسته و حذف خواهد شد...' });

          const allTickets = db.tickets.get(interaction.guild.id) || {};
          delete allTickets[interaction.channel.id];
          db.tickets.set(interaction.guild.id, allTickets);

          setTimeout(async () => {
            await interaction.channel.delete().catch(() => {});
          }, 5000);
          return;
        }

        // Button: Claim Ticket
        if (customId === 'ticket_claim') {
          const allTickets = db.tickets.get(interaction.guild.id) || {};
          const ticketData = allTickets[interaction.channel.id];

          if (ticketData && ticketData.claimedBy) {
            return interaction.reply({
              content: `⚠️ این تیکت قبلاً توسط <@${ticketData.claimedBy}> برداشته (Claim) شده است!`,
              ephemeral: true
            });
          }

          if (ticketData) {
            ticketData.claimedBy = interaction.user.id;
            allTickets[interaction.channel.id] = ticketData;
            db.tickets.set(interaction.guild.id, allTickets);
          }

          const claimEmbed = new EmbedBuilder()
            .setColor(config.colors.success)
            .setDescription(`✋ این تیکت توسط ${interaction.user} به عنوان پشتیبان پیگیری می‌شود.`)
            .setTimestamp();

          return interaction.reply({ embeds: [claimEmbed] });
        }

        // Button: Transcript
        if (customId === 'ticket_transcript') {
          await interaction.deferReply({ ephemeral: true });

          const messages = await interaction.channel.messages.fetch({ limit: 100 });
          const transcriptLines = messages.reverse().map(m => {
            const time = new Date(m.createdTimestamp).toISOString();
            return `[${time}] ${m.author.tag}: ${m.content || '(Embed / Attachment)'}`;
          });

          const buffer = Buffer.from(transcriptLines.join('\n'), 'utf-8');
          const attachment = new AttachmentBuilder(buffer, { name: `transcript-${interaction.channel.name}.txt` });

          return interaction.editReply({
            content: '📜 فایل متنی ترنسکریپت پیام‌های تیکت:',
            files: [attachment]
          });
        }
      }
    } catch (err) {
      console.error('Error handling interaction:', err);
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: `${config.emojis.error} خطایی رخ داد: \`${err.message}\``,
          ephemeral: true
        }).catch(() => {});
      }
    }
  }
};
