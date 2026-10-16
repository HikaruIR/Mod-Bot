const {
  ChannelType,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require('discord.js');
const db = require('../utils/database');
const config = require('../../config');

/**
 * Creates and returns the interactive Ticket Panel with Dropdown Menu
 */
function createTicketPanelEmbed() {
  const embed = new EmbedBuilder()
    .setColor(config.colors.ticket)
    .setTitle('🎫 مرکز پشتیبانی و تیکت Sevinnny')
    .setDescription(
      'برای برقراری ارتباط با تیم مدیریت و پشتیبانی، موضوع تیکت خود را از منوی زیر انتخاب کنید.\n\n' +
      '📌 **قوانین باز کردن تیکت:**\n' +
      '• از باز کردن تیکت‌های اسپم و بیهوده خودداری کنید.\n' +
      '• لطفاً صبور باشید، همکاران ما در اولین فرصت پاسخ شما را خواهند داد.\n' +
      '• اطلاعات فرم را به صورت دقیق و کامل تکمیل کنید.'
    )
    .setFooter({ text: 'Sevinnny Support System • پشتیبانی ۲۴/۷' })
    .setTimestamp();

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('ticket_category_select')
    .setPlaceholder('برای باز کردن تیکت یک بخش را انتخاب کنید...')
    .addOptions([
      {
        label: 'پشتیبانی عمومی (General Support)',
        description: 'سوالات و راهنمایی‌های کلی سرور',
        value: 'general',
        emoji: '💭'
      },
      {
        label: 'گزارش پلیر یا تخلف (Player Report)',
        description: 'گزارش چیت، فید، فحاشی یا تخلف قوانین',
        value: 'report',
        emoji: '🚨'
      },
      {
        label: 'فروشگاه و خرید (Store & Purchases)',
        description: 'امور رنک، دونیت و آیتم‌های فروشگاه',
        value: 'store',
        emoji: '💳'
      },
      {
        label: 'مشکلات فنی و باگ (Bugs & Technical)',
        description: 'گزارش باگ سرور یا مشکلات لاگین و اتصال',
        value: 'technical',
        emoji: '🛠️'
      }
    ]);

  const row = new ActionRowBuilder().addComponents(selectMenu);
  return { embeds: [embed], components: [row] };
}

/**
 * Creates the private ticket channel in the specific category
 */
async function createTicketChannel(guild, user, categoryType, subject, description) {
  const guildConfig = db.config.get(guild.id) || {};
  const ticketCategories = guildConfig.ticketCategories || {};
  const supportRoleId = guildConfig.supportRoleId;

  // Determine category parent ID
  const parentId = ticketCategories[categoryType] || ticketCategories['default'] || null;

  // Set channel permissions
  const permissionOverwrites = [
    {
      id: guild.id, // @everyone
      deny: [PermissionsBitField.Flags.ViewChannel]
    },
    {
      id: user.id, // Ticket owner
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.AttachFiles,
        PermissionsBitField.Flags.ReadMessageHistory
      ]
    },
    {
      id: guild.client.user.id, // Bot
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ManageChannels,
        PermissionsBitField.Flags.EmbedLinks,
        PermissionsBitField.Flags.AttachFiles
      ]
    }
  ];

  // If support role is configured, allow them
  if (supportRoleId && guild.roles.cache.has(supportRoleId)) {
    permissionOverwrites.push({
      id: supportRoleId,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.AttachFiles,
        PermissionsBitField.Flags.ReadMessageHistory
      ]
    });
  }

  const categoryNames = {
    general: 'عمومی',
    report: 'گزارش',
    store: 'فروشگاه',
    technical: 'فنی'
  };

  const channelName = `ticket-${categoryType}-${user.username}`.toLowerCase().replace(/[^a-z0-9-_]/g, '');

  const ticketChannel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: parentId && guild.channels.cache.has(parentId) ? parentId : null,
    permissionOverwrites,
    topic: `Ticket by ${user.tag} (${user.id}) | Category: ${categoryNames[categoryType] || categoryType}`
  });

  // Ticket Control Buttons
  const buttonsRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_close')
      .setLabel('بستن تیکت (Close)')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('ticket_claim')
      .setLabel('برداشتن تیکت (Claim)')
      .setEmoji('✋')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('ticket_transcript')
      .setLabel('ترنسکریپت (Save)')
      .setEmoji('📜')
      .setStyle(ButtonStyle.Secondary)
  );

  const welcomeEmbed = new EmbedBuilder()
    .setColor(config.colors.ticket)
    .setTitle(`🎫 تیکت پشتیبانی: ${categoryNames[categoryType] || categoryType}`)
    .setDescription(`سلام <@${user.id}> عزیز! تیکت شما با موفقیت باز شد.\nتیم ساپورت به زودی پاسخگوی شما خواهند بود.`)
    .addFields(
      { name: '📌 موضوع (Subject)', value: subject || 'ثبت نشده', inline: false },
      { name: '📝 توضیحات (Details)', value: description || 'توضیحی داده نشده است', inline: false },
      { name: '👤 باز کننده تیکت', value: `<@${user.id}> (${user.tag})`, inline: true },
      { name: '🏷️ بخش تیکت', value: categoryNames[categoryType] || categoryType, inline: true }
    )
    .setFooter({ text: 'برای مدیریت تیکت از دکمه‌های زیر استفاده کنید' })
    .setTimestamp();

  await ticketChannel.send({
    content: `${user} ${supportRoleId ? `<@&${supportRoleId}>` : ''}`.trim(),
    embeds: [welcomeEmbed],
    components: [buttonsRow]
  });

  // Save ticket in db
  const allTickets = db.tickets.get(guild.id) || {};
  allTickets[ticketChannel.id] = {
    channelId: ticketChannel.id,
    userId: user.id,
    categoryType,
    subject,
    description,
    claimedBy: null,
    createdAt: Date.now()
  };
  db.tickets.set(guild.id, allTickets);

  return ticketChannel;
}

module.exports = {
  createTicketPanelEmbed,
  createTicketChannel
};
