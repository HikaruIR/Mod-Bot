const {
  SlashCommandBuilder,
  EmbedBuilder
} = require('discord.js');
const db = require('../../utils/database');
const config = require('../../../config');
const { isBotAdmin } = require('../../utils/permissions');
const { setKeyword, removeKeyword } = require('../../services/keywordService');

module.exports = {
  name: 'keyword',
  description: 'Manage automated responses to keywords (Keyword Auto-reply)',
  slashData: new SlashCommandBuilder()
    .setName('keyword')
    .setDescription('Configure automated keyword responses')
    .addSubcommand(sub =>
      sub
        .setName('add')
        .setDescription('Add or update an automated reply for a keyword')
        .addStringOption(opt => opt.setName('word').setDescription('Keyword or phrase to match (e.g. card number)').setRequired(true))
        .addStringOption(opt => opt.setName('reply').setDescription('Automated response text').setRequired(true))
        .addStringOption(opt =>
          opt
            .setName('match_type')
            .setDescription('Matching strategy')
            .addChoices(
              { name: 'Contains (keyword appears in message)', value: 'contains' },
              { name: 'Exact (message matches keyword exactly)', value: 'exact' }
            )
        )
        .addBooleanOption(opt => opt.setName('case_sensitive').setDescription('Case sensitive matching'))
        .addIntegerOption(opt => opt.setName('cooldown').setDescription('Cooldown in seconds (default: 5)'))
        .addChannelOption(opt => opt.setName('channel').setDescription('Limit to specific channel (optional)'))
        .addStringOption(opt => opt.setName('image').setDescription('Image URL to attach (optional)'))
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Remove a keyword auto-reply')
        .addStringOption(opt => opt.setName('word').setDescription('Keyword to remove').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('list')
        .setDescription('List all registered keyword auto-replies')
    ),

  async executeSlash(interaction) {
    if (!isBotAdmin(interaction.member)) {
      return interaction.reply({
        content: `${config.emojis.error} You do not have permission to manage keywords.`,
        ephemeral: true
      });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'add') {
      const word = interaction.options.getString('word');
      const reply = interaction.options.getString('reply');
      const matchType = interaction.options.getString('match_type') || 'contains';
      const caseSensitive = interaction.options.getBoolean('case_sensitive') || false;
      const cooldown = interaction.options.getInteger('cooldown') || 5;
      const channel = interaction.options.getChannel('channel');
      const image = interaction.options.getString('image');

      const saved = await setKeyword(interaction.guild, {
        keyword: word,
        content: reply,
        matchType,
        caseSensitive,
        cooldownSeconds: cooldown,
        channels: channel ? [channel.id] : [],
        imageUrl: image,
        responseType: image ? 'embed' : 'text'
      }, interaction.user);

      return interaction.reply({
        content: `${config.emojis.success} Keyword **"${saved.keyword}"** saved!\nMatch: \`${saved.matchType}\` | Cooldown: \`${saved.cooldownSeconds}s\``,
        ephemeral: true
      });
    }

    if (sub === 'remove') {
      const word = interaction.options.getString('word');
      try {
        await removeKeyword(interaction.guild, word, interaction.user);
        return interaction.reply({
          content: `${config.emojis.success} Keyword **"${word}"** successfully deleted.`,
          ephemeral: true
        });
      } catch (err) {
        return interaction.reply({
          content: `${config.emojis.error} ${err.message}`,
          ephemeral: true
        });
      }
    }

    if (sub === 'list') {
      const all = db.keywords.get(interaction.guild.id) || {};
      const list = Object.values(all);
      if (list.length === 0) {
        return interaction.reply({
          content: '📭 No keywords configured for this server.',
          ephemeral: true
        });
      }

      const embed = new EmbedBuilder()
        .setTitle('🔑 Keyword Auto-replies')
        .setColor(config.colors.primary)
        .setDescription(
          list.map(k => `• **"${k.keyword}"** [${k.matchType}] -> ${k.content.slice(0, 50)}...`).join('\n')
        )
        .setFooter({ text: config.brand.footer });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  },

  async execute(message, args) {
    if (!isBotAdmin(message.member)) {
      return message.channel.send(`${config.emojis.error} You do not have permission to manage keywords.`);
    }

    const action = args[0]?.toLowerCase();

    if (!action || action === 'help') {
      const help = new EmbedBuilder()
        .setTitle('🔑 Keyword Auto-reply Commands')
        .setColor(config.colors.primary)
        .setDescription(
          '`!keyword add <word> <response>` - Add auto-reply\n' +
          '`!keyword remove <word>` - Remove auto-reply\n' +
          '`!keyword list` - List keywords'
        );
      return message.channel.send({ embeds: [help] });
    }

    if (action === 'add') {
      const word = args[1];
      const reply = args.slice(2).join(' ');
      if (!word || !reply) {
        return message.channel.send('❌ Usage: `!keyword add <word> <response>`');
      }

      await setKeyword(message.guild, {
        keyword: word,
        content: reply,
        matchType: 'contains'
      }, message.author);

      return message.channel.send(`✅ Keyword **"${word}"** registered!`);
    }

    if (action === 'remove') {
      const word = args[1];
      if (!word) return message.channel.send('❌ Usage: `!keyword remove <word>`');
      try {
        await removeKeyword(message.guild, word, message.author);
        return message.channel.send(`✅ Keyword **"${word}"** deleted.`);
      } catch (err) {
        return message.channel.send(`❌ Error: ${err.message}`);
      }
    }

    if (action === 'list') {
      const all = db.keywords.get(message.guild.id) || {};
      const list = Object.values(all);
      if (list.length === 0) return message.channel.send('📭 No keywords registered.');

      const str = list.map(k => `• **"${k.keyword}"** -> ${k.content.slice(0, 60)}`).join('\n');
      return message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('🔑 Active Keywords')
            .setDescription(str)
            .setColor(config.colors.primary)
        ]
      });
    }
  }
};
