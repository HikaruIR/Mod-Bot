const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const db = require('../../utils/database');
const config = require('../../../config');
const { createTicketPanelEmbed } = require('../../services/ticketService');

module.exports = {
  name: 'ticket',
  aliases: ['tickets'],
  description: 'Manage advanced dropdown and modal ticket system',
  async execute(message, args) {
    const member = message.member;
    const guild = message.guild;

    const sub = args[0]?.toLowerCase();

    // 1. Send Ticket Panel: ?ticket panel #channel
    if (sub === 'panel') {
      if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply({ content: `${config.emojis.error} You need \`Administrator\` permission to setup ticket panel!` });
      }

      const targetChannel = message.mentions.channels.first() || (args[1] ? guild.channels.cache.get(args[1].replace(/[^0-9]/g, '')) : null) || message.channel;
      const panelData = createTicketPanelEmbed();

      await targetChannel.send(panelData);
      return message.reply({ content: `✅ Ticket panel with dropdown successfully sent to <#${targetChannel.id}>!` });
    }

    // 2. Configure Support Role: ?ticket support @role
    if (sub === 'support') {
      if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply({ content: `${config.emojis.error} You need \`Administrator\` permission!` });
      }

      const role = message.mentions.roles.first() || (args[1] ? guild.roles.cache.get(args[1].replace(/[^0-9]/g, '')) : null);
      if (!role) {
        return message.reply({ content: `${config.emojis.error} Usage: \`?ticket support @role\`` });
      }

      const guildConfig = db.config.get(guild.id) || {};
      guildConfig.supportRoleId = role.id;
      db.config.set(guild.id, guildConfig);

      return message.reply({ content: `✅ Ticket support role set to <@&${role.id}>!` });
    }

    // 3. Map Ticket Category to Discord Category: ?ticket category [general/report/store/technical/default] [categoryId]
    if (sub === 'category') {
      if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply({ content: `${config.emojis.error} You need \`Administrator\` permission!` });
      }

      const type = args[1]?.toLowerCase();
      const categoryId = args[2]?.replace(/[^0-9]/g, '');

      const validTypes = ['general', 'report', 'store', 'technical', 'default'];
      if (!type || !validTypes.includes(type) || !categoryId) {
        return message.reply({
          content: `${config.emojis.error} **Invalid usage!**\nFormat: \`?ticket category [general/report/store/technical/default] [category-id]\`\nExample: \`?ticket category report 123456789012345678\``
        });
      }

      const categoryChannel = guild.channels.cache.get(categoryId);
      if (!categoryChannel) {
        return message.reply({ content: `${config.emojis.error} Category with ID \`${categoryId}\` was not found!` });
      }

      const guildConfig = db.config.get(guild.id) || {};
      if (!guildConfig.ticketCategories) guildConfig.ticketCategories = {};
      guildConfig.ticketCategories[type] = categoryId;
      db.config.set(guild.id, guildConfig);

      return message.reply({ content: `✅ Ticket type **${type}** mapped to Discord category **${categoryChannel.name}** (\`${categoryId}\`)!` });
    }

    // 4. Close ticket inside a ticket channel: ?ticket close
    if (sub === 'close') {
      const allTickets = db.tickets.get(guild.id) || {};
      const ticketData = allTickets[message.channel.id];

      if (!ticketData && !message.channel.name.startsWith('ticket-')) {
        return message.reply({ content: `${config.emojis.error} This command can only be used inside an active ticket channel!` });
      }

      await message.channel.send('🔒 Closing ticket and deleting channel in 5 seconds...');
      setTimeout(async () => {
        delete allTickets[message.channel.id];
        db.tickets.set(guild.id, allTickets);
        await message.channel.delete().catch(() => {});
      }, 5000);
      return;
    }

    // 5. Add user to ticket: ?ticket add @user
    if (sub === 'add') {
      const target = message.mentions.members.first() || (args[1] ? await guild.members.fetch(args[1].replace(/[^0-9]/g, '')).catch(() => null) : null);
      if (!target) {
        return message.reply({ content: `❌ Usage: \`?ticket add @user\`` });
      }

      await message.channel.permissionOverwrites.create(target.id, {
        ViewChannel: true,
        SendMessages: true,
        AttachFiles: true,
        ReadMessageHistory: true
      });

      return message.reply({ content: `✅ Added ${target} to this ticket channel!` });
    }

    // 6. Remove user from ticket: ?ticket remove @user
    if (sub === 'remove') {
      const target = message.mentions.members.first() || (args[1] ? await guild.members.fetch(args[1].replace(/[^0-9]/g, '')).catch(() => null) : null);
      if (!target) {
        return message.reply({ content: `❌ Usage: \`?ticket remove @user\`` });
      }

      await message.channel.permissionOverwrites.delete(target.id);
      return message.reply({ content: `✅ Removed ${target} from this ticket channel!` });
    }

    // Default Help
    const helpEmbed = new EmbedBuilder()
      .setColor(config.colors.ticket)
      .setTitle('🎫 Ticket System Commands')
      .setDescription('Configure ticket categories, support roles, and dropdown panels:')
      .addFields(
        { name: '1. Setup Panel', value: '`?ticket panel #channel` - Send interactive dropdown panel' },
        { name: '2. Support Role', value: '`?ticket support @role` - Set support role for tickets' },
        { name: '3. Category Mapping', value: '`?ticket category [general/report/store/technical/default] [categoryId]`\nRoute each ticket type to its own category!' },
        { name: '4. Channel Controls', value: '`?ticket close` - Close current ticket\n`?ticket add @user` - Add user to ticket\n`?ticket remove @user` - Remove user from ticket' }
      )
      .setFooter({ text: 'Sevinnny Support System' })
      .setTimestamp();

    return message.reply({ embeds: [helpEmbed] });
  }
};
