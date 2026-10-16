const {
  SlashCommandBuilder,
  EmbedBuilder,
  ChannelType
} = require('discord.js');
const db = require('../../utils/database');
const config = require('../../../config');
const { isBotAdmin, isSupport, getGuildConfig } = require('../../utils/permissions');
const {
  buildTicketPanelEmbed,
  createPrivateTicket,
  addMemberToTicket,
  removeMemberFromTicket
} = require('../../services/ticketService');

module.exports = {
  name: 'ticket',
  description: 'Manage support tickets, panels, member access, and category settings',
  slashData: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Manage support, purchase, warranty, and payment tickets')
    .addSubcommand(sub =>
      sub
        .setName('panel')
        .setDescription('Send the official Ocean Shop ticket panel into this channel')
        .addStringOption(opt => opt.setName('title').setDescription('Panel embed title (optional)'))
        .addStringOption(opt => opt.setName('description').setDescription('Panel embed description (optional)'))
    )
    .addSubcommand(sub =>
      sub
        .setName('create')
        .setDescription('Open a private ticket')
        .addStringOption(opt =>
          opt
            .setName('type')
            .setDescription('Ticket department/type')
            .setRequired(true)
            .addChoices(
              { name: 'Product Purchase / Order 🛒', value: 'purchase' },
              { name: 'Warranty & Replacement 🛡️', value: 'warranty' },
              { name: 'Payment Proof & Billing 💳', value: 'payment' },
              { name: 'General Support ❓', value: 'support' }
            )
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Add a user to the current ticket channel')
        .addUserOption(opt => opt.setName('user').setDescription('User to add to this ticket').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Remove a user from the current ticket channel')
        .addUserOption(opt => opt.setName('user').setDescription('User to remove from this ticket').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('setcategory')
        .setDescription('Configure category for a specific ticket type or all tickets')
        .addStringOption(opt =>
          opt
            .setName('type')
            .setDescription('Ticket type to configure')
            .setRequired(true)
            .addChoices(
              { name: 'All Tickets (Default)', value: 'default' },
              { name: 'Product Purchase 🛒', value: 'purchase' },
              { name: 'Warranty 🛡️', value: 'warranty' },
              { name: 'Payment & Billing 💳', value: 'payment' },
              { name: 'General Support ❓', value: 'support' }
            )
        )
        .addChannelOption(opt =>
          opt
            .setName('category')
            .setDescription('Target Discord category channel')
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true)
        )
    ),

  async executeSlash(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'panel') {
      if (!isBotAdmin(interaction.member)) {
        return interaction.reply({
          content: `${config.emojis.error} You do not have permission to deploy the ticket panel.`,
          ephemeral: true
        });
      }

      const title = interaction.options.getString('title');
      const desc = interaction.options.getString('description');
      const { embed, selectRow, buttonRow } = buildTicketPanelEmbed(title, desc);

      await interaction.channel.send({
        embeds: [embed],
        components: [selectRow, buttonRow]
      });

      return interaction.reply({
        content: `${config.emojis.success} Ticket panel successfully posted in this channel!`,
        ephemeral: true
      });
    }

    if (sub === 'create') {
      await interaction.deferReply({ ephemeral: true });
      const type = interaction.options.getString('type');

      try {
        const channel = await createPrivateTicket(interaction.guild, interaction.user, type);
        return interaction.editReply({
          content: `${config.emojis.success} Your private ticket has been created: <#${channel.id}>`
        });
      } catch (err) {
        return interaction.editReply({
          content: `${config.emojis.error} ${err.message}`
        });
      }
    }

    if (sub === 'add') {
      const targetUser = interaction.options.getUser('user');
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

      if (!targetMember) {
        return interaction.reply({ content: '❌ Member not found in this server.', ephemeral: true });
      }

      try {
        await addMemberToTicket(interaction.channel, targetMember, interaction.member);
        return interaction.reply({
          content: `${config.emojis.success} Successfully added <@${targetMember.id}> to this ticket.`,
          ephemeral: true
        });
      } catch (err) {
        return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
      }
    }

    if (sub === 'remove') {
      const targetUser = interaction.options.getUser('user');
      const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

      if (!targetMember) {
        return interaction.reply({ content: '❌ Member not found in this server.', ephemeral: true });
      }

      try {
        await removeMemberFromTicket(interaction.channel, targetMember, interaction.member);
        return interaction.reply({
          content: `${config.emojis.success} Successfully removed <@${targetMember.id}> from this ticket.`,
          ephemeral: true
        });
      } catch (err) {
        return interaction.reply({ content: `❌ ${err.message}`, ephemeral: true });
      }
    }

    if (sub === 'setcategory') {
      if (!isBotAdmin(interaction.member)) {
        return interaction.reply({ content: '❌ Only bot admins can configure ticket categories.', ephemeral: true });
      }

      const type = interaction.options.getString('type');
      const category = interaction.options.getChannel('category');
      const guildConfig = getGuildConfig(interaction.guild.id);

      if (type === 'default') {
        guildConfig.ticketCategoryId = category.id;
      } else {
        if (!guildConfig.ticketCategories) guildConfig.ticketCategories = {};
        guildConfig.ticketCategories[type] = category.id;
      }

      db.config.set(interaction.guild.id, guildConfig);

      return interaction.reply({
        content: `${config.emojis.success} Ticket category for **${type}** set to **${category.name}**!`,
        ephemeral: true
      });
    }
  },

  async execute(message, args) {
    const action = args[0]?.toLowerCase();

    if (action === 'panel') {
      if (!isBotAdmin(message.member)) {
        return message.channel.send(`${config.emojis.error} You do not have permission to deploy the ticket panel.`);
      }

      const { embed, selectRow, buttonRow } = buildTicketPanelEmbed();
      await message.channel.send({
        embeds: [embed],
        components: [selectRow, buttonRow]
      });
      return;
    }

    if (action === 'create') {
      const type = args[1]?.toLowerCase() || 'support';
      try {
        const channel = await createPrivateTicket(message.guild, message.author, type);
        return message.channel.send(`✅ Your ticket has been created: <#${channel.id}>`);
      } catch (err) {
        return message.channel.send(`❌ ${err.message}`);
      }
    }

    if (action === 'add') {
      const targetMember = message.mentions.members.first() || (args[1] ? await message.guild.members.fetch(args[1]).catch(() => null) : null);
      if (!targetMember) {
        return message.channel.send('❌ Usage: `!ticket add @user` or `!ticket add <user_id>`');
      }

      try {
        await addMemberToTicket(message.channel, targetMember, message.member);
      } catch (err) {
        return message.channel.send(`❌ ${err.message}`);
      }
      return;
    }

    if (action === 'remove') {
      const targetMember = message.mentions.members.first() || (args[1] ? await message.guild.members.fetch(args[1]).catch(() => null) : null);
      if (!targetMember) {
        return message.channel.send('❌ Usage: `!ticket remove @user` or `!ticket remove <user_id>`');
      }

      try {
        await removeMemberFromTicket(message.channel, targetMember, message.member);
      } catch (err) {
        return message.channel.send(`❌ ${err.message}`);
      }
      return;
    }

    if (action === 'setcategory') {
      if (!isBotAdmin(message.member)) {
        return message.channel.send('❌ Only admins can configure ticket categories.');
      }

      const type = args[1]?.toLowerCase() || 'default';
      const categoryId = args[2]?.replace(/[^0-9]/g, '');
      const category = message.guild.channels.cache.get(categoryId);

      if (!category || category.type !== ChannelType.GuildCategory) {
        return message.channel.send('❌ Please specify a valid category ID: `!ticket setcategory <purchase|warranty|payment|support|default> <category_id>`');
      }

      const guildConfig = getGuildConfig(message.guild.id);
      if (type === 'default') {
        guildConfig.ticketCategoryId = category.id;
      } else {
        if (!guildConfig.ticketCategories) guildConfig.ticketCategories = {};
        guildConfig.ticketCategories[type] = category.id;
      }
      db.config.set(message.guild.id, guildConfig);

      return message.channel.send(`✅ Ticket category for **${type}** set to **${category.name}**!`);
    }

    const help = new EmbedBuilder()
      .setTitle('🎫 Ticket System Commands')
      .setColor(config.colors.ticket)
      .setDescription(
        '`!ticket panel` - Deploy interactive ticket panel\n' +
        '`!ticket create <type>` - Open a private ticket directly\n' +
        '`!ticket add @user` - Add user access to the current ticket\n' +
        '`!ticket remove @user` - Revoke user access from the current ticket\n' +
        '`!ticket setcategory <type> <category_id>` - Set category per ticket type'
      )
      .setFooter({ text: config.brand.footer });
    return message.channel.send({ embeds: [help] });
  }
};
