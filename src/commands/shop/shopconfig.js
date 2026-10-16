const {
  SlashCommandBuilder,
  EmbedBuilder,
  ChannelType
} = require('discord.js');
const db = require('../../utils/database');
const config = require('../../../config');
const { isBotAdmin, getGuildConfig } = require('../../utils/permissions');

module.exports = {
  name: 'config',
  description: 'Configure store settings (staff roles, log channel, categories)',
  slashData: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configure Ocean Shop settings')
    .addSubcommand(sub =>
      sub
        .setName('setstaff')
        .setDescription('Add a staff/support role')
        .addRoleOption(opt => opt.setName('role').setDescription('Role to grant staff permissions').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('setlog')
        .setDescription('Configure the audit log channel')
        .addChannelOption(opt => opt.setName('channel').setDescription('Log channel').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('setticketcategory')
        .setDescription('Set the default category for tickets')
        .addChannelOption(opt =>
          opt
            .setName('category')
            .setDescription('Ticket category')
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('setproductcategory')
        .setDescription('Set the default category for product channels')
        .addChannelOption(opt =>
          opt
            .setName('category')
            .setDescription('Product category')
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('view')
        .setDescription('View current server configuration')
    ),

  async executeSlash(interaction) {
    if (!isBotAdmin(interaction.member)) {
      return interaction.reply({
        content: `${config.emojis.error} You do not have permission to manage bot settings.`,
        ephemeral: true
      });
    }

    const sub = interaction.options.getSubcommand();
    const guildConfig = getGuildConfig(interaction.guild.id);

    if (sub === 'setstaff') {
      const role = interaction.options.getRole('role');
      if (!guildConfig.staffRoles) guildConfig.staffRoles = [];
      if (!guildConfig.staffRoles.includes(role.id)) {
        guildConfig.staffRoles.push(role.id);
      }
      db.config.set(interaction.guild.id, guildConfig);

      return interaction.reply({
        content: `${config.emojis.success} Role <@&${role.id}> added to staff roles!`,
        ephemeral: true
      });
    }

    if (sub === 'setlog') {
      const channel = interaction.options.getChannel('channel');
      guildConfig.logChannelId = channel.id;
      db.config.set(interaction.guild.id, guildConfig);

      return interaction.reply({
        content: `${config.emojis.success} Log channel set to <#${channel.id}>!`,
        ephemeral: true
      });
    }

    if (sub === 'setticketcategory') {
      const category = interaction.options.getChannel('category');
      guildConfig.ticketCategoryId = category.id;
      db.config.set(interaction.guild.id, guildConfig);

      return interaction.reply({
        content: `${config.emojis.success} Ticket category set to **${category.name}**!`,
        ephemeral: true
      });
    }

    if (sub === 'setproductcategory') {
      const category = interaction.options.getChannel('category');
      guildConfig.productCategoryId = category.id;
      db.config.set(interaction.guild.id, guildConfig);

      return interaction.reply({
        content: `${config.emojis.success} Product category set to **${category.name}**!`,
        ephemeral: true
      });
    }

    if (sub === 'view') {
      const cfg = getGuildConfig(interaction.guild.id);
      const staffList = (cfg.staffRoles || []).map(r => `<@&${r}>`).join(', ') || 'Not configured';
      const logCh = cfg.logChannelId ? `<#${cfg.logChannelId}>` : 'Not configured';
      const ticketCat = cfg.ticketCategoryId ? `<#${cfg.ticketCategoryId}>` : 'Not configured';
      const prodCat = cfg.productCategoryId ? `<#${cfg.productCategoryId}>` : 'Not configured';

      const embed = new EmbedBuilder()
        .setTitle(`⚙️ Store Configuration: ${interaction.guild.name}`)
        .setColor(config.colors.primary)
        .addFields(
          { name: '👮 Staff Roles', value: staffList },
          { name: '📜 Log Channel', value: logCh },
          { name: '🎫 Ticket Category', value: ticketCat },
          { name: '🛒 Product Category', value: prodCat }
        )
        .setFooter({ text: config.brand.footer });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },

  async execute(message, args) {
    if (!isBotAdmin(message.member)) {
      return message.channel.send(`${config.emojis.error} You do not have permission to manage bot settings.`);
    }

    const sub = args[0]?.toLowerCase();
    const cfg = getGuildConfig(message.guild.id);

    if (sub === 'setlog') {
      const ch = message.mentions.channels.first();
      if (!ch) return message.channel.send('❌ Usage: `!config setlog #logs`');
      cfg.logChannelId = ch.id;
      db.config.set(message.guild.id, cfg);
      return message.channel.send(`✅ Log channel set to <#${ch.id}>.`);
    }

    if (sub === 'setstaff') {
      const role = message.mentions.roles.first();
      if (!role) return message.channel.send('❌ Usage: `!config setstaff @Role`');
      if (!cfg.staffRoles) cfg.staffRoles = [];
      if (!cfg.staffRoles.includes(role.id)) cfg.staffRoles.push(role.id);
      db.config.set(message.guild.id, cfg);
      return message.channel.send(`✅ Staff role added: <@&${role.id}>`);
    }

    if (sub === 'view') {
      const staffList = (cfg.staffRoles || []).map(r => `<@&${r}>`).join(', ') || 'Not configured';
      const logCh = cfg.logChannelId ? `<#${cfg.logChannelId}>` : 'Not configured';
      const embed = new EmbedBuilder()
        .setTitle('⚙️ Store Configuration')
        .addFields(
          { name: 'Staff Roles', value: staffList },
          { name: 'Log Channel', value: logCh }
        )
        .setColor(config.colors.primary);
      return message.channel.send({ embeds: [embed] });
    }

    const help = new EmbedBuilder()
      .setTitle('⚙️ Config Commands')
      .setColor(config.colors.primary)
      .setDescription(
        '`!config setlog #channel` - Set audit log channel\n' +
        '`!config setstaff @Role` - Add staff role\n' +
        '`!config view` - View configuration'
      );
    return message.channel.send({ embeds: [help] });
  }
};
