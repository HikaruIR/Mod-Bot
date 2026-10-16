const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const config = require('../../config');

const NUMBER_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

module.exports = {
  name: 'poll',
  description: 'Create a reaction poll with multiple options or yes/no',
  async execute(message, args) {
    if (!args.length) {
      return message.reply({
        content: `📊 **Poll Usage:**\n• Simple Yes/No: \`!poll Should we host a tournament this weekend?\`\n• Multiple Options: \`!poll "Favorite Game?" "Minecraft" "Valorant" "CS:GO"\``
      });
    }

    const fullContent = args.join(' ');
    // Match quoted strings
    const matches = fullContent.match(/"([^"]+)"|'([^']+)'/g);

    let question = '';
    let options = [];

    if (matches && matches.length >= 2) {
      question = matches[0].replace(/["']/g, '');
      options = matches.slice(1).map(opt => opt.replace(/["']/g, ''));
    } else {
      question = fullContent;
    }

    if (options.length > 10) {
      return message.reply({ content: `${config.emojis.error} You cannot provide more than 10 options in a poll!` });
    }

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`📊 ${question}`)
      .setAuthor({
        name: `Poll by ${message.author.tag}`,
        iconURL: message.author.displayAvatarURL({ dynamic: true })
      })
      .setFooter({ text: 'React below to cast your vote!' })
      .setTimestamp();

    if (options.length > 0) {
      let description = '';
      for (let i = 0; i < options.length; i++) {
        description += `${NUMBER_EMOJIS[i]} **${options[i]}**\n\n`;
      }
      embed.setDescription(description);

      const pollMsg = await message.channel.send({ embeds: [embed] });
      for (let i = 0; i < options.length; i++) {
        await pollMsg.react(NUMBER_EMOJIS[i]).catch(() => {});
      }
    } else {
      embed.setDescription('👍 **Yes / Agree**\n👎 **No / Disagree**');
      const pollMsg = await message.channel.send({ embeds: [embed] });
      await pollMsg.react('👍').catch(() => {});
      await pollMsg.react('👎').catch(() => {});
    }
  }
};
