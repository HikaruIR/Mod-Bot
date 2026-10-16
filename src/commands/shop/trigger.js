const {
  SlashCommandBuilder,
  EmbedBuilder
} = require('discord.js');
const db = require('../../utils/database');
const config = require('../../../config');
const { isBotAdmin } = require('../../utils/permissions');
const { setAttachmentTrigger } = require('../../services/triggerService');

module.exports = {
  name: 'trigger',
  description: 'Manage automated image & receipt triggers',
  slashData: new SlashCommandBuilder()
    .setName('trigger')
    .setDescription('Configure automated replies to images and payment receipts')
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Create a new attachment/receipt trigger')
        .addStringOption(opt => opt.setName('message').setDescription('Response message text').setRequired(true))
        .addStringOption(opt => opt.setName('title').setDescription('Response title (default: Receipt Received)'))
        .addChannelOption(opt => opt.setName('channel').setDescription('Limit to specific channel (optional)'))
        .addIntegerOption(opt => opt.setName('cooldown').setDescription('Cooldown in seconds (default: 15)'))
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('View active attachment triggers')
    ),

  async executeSlash(interaction) {
    if (!isBotAdmin(interaction.member)) {
      return interaction.reply({
        content: `${config.emojis.error} You do not have permission to manage triggers.`,
        ephemeral: true
      });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'add') {
      const text = interaction.options.getString('message');
      const title = interaction.options.getString('title') || '🧾 Receipt Received';
      const channel = interaction.options.getChannel('channel');
      const cooldown = interaction.options.getInteger('cooldown') || 15;

      const trig = setAttachmentTrigger(interaction.guild, {
        responseTitle: title,
        responseText: text,
        channels: channel ? [channel.id] : [],
        cooldownSeconds: cooldown
      });

      return interaction.reply({
        content: `${config.emojis.success} Image trigger registered!\nChannel: ${channel ? `<#${channel.id}>` : 'All payment tickets'} | Cooldown: \`${trig.cooldownSeconds}s\``,
        ephemeral: true
      });
    }

    if (sub === 'list') {
      const all = db.triggers.get(interaction.guild.id) || {};
      const list = Object.values(all);

      const embed = new EmbedBuilder()
        .setTitle('🖼️ Attachment & Receipt Triggers')
        .setColor(config.colors.receipt)
        .setDescription(
          list.length > 0
            ? list.map(t => `• **${t.responseTitle}** -> ${t.responseText.slice(0, 50)}...`).join('\n')
            : 'No custom triggers added (default smart receipt trigger is active on payment tickets).'
        )
        .setFooter({ text: config.brand.footer });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },

  async execute(message, args) {
    if (!isBotAdmin(message.member)) {
      return message.channel.send(`${config.emojis.error} You do not have permission to manage triggers.`);
    }

    const sub = args[0]?.toLowerCase();

    if (sub === 'add') {
      const text = args.slice(1).join(' ');
      if (!text) return message.channel.send('❌ Usage: `!trigger add <response text>`');

      setAttachmentTrigger(message.guild, {
        responseText: text
      });

      return message.channel.send('✅ Image trigger registered successfully!');
    }

    const help = new EmbedBuilder()
      .setTitle('🖼️ Receipt & Attachment Trigger Guide')
      .setColor(config.colors.receipt)
      .setDescription(
        '`!trigger add <response message>` - Add automated response to uploaded images/receipts\n' +
        '*Use slash command `/trigger add` for cooldown and channel options.*'
      );
    return message.channel.send({ embeds: [help] });
  }
};
