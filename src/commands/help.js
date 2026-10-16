const { EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  name: 'help',
  aliases: ['h', 'commands'],
  description: 'List all commands and capabilities for Sevinnny server',
  async execute(message, args) {
    const prefix = process.env.PREFIX || config.defaultPrefix || '?';

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle(`✨ منوی راهنمای ربات سرور ${config.brand.name}`)
      .setDescription(`پیشوند دستورات: \`${prefix}\``)
      .addFields(
        {
          name: '🛡️ دستورات مدیریت (Moderation)',
          value:
            `\`${prefix}ban [user] [reason] [time]\` - بن دائم یا موقت کاربر\n` +
            `\`${prefix}unban [user-id]\` - آن‌بن کاربر با آیدی\n` +
            `\`${prefix}mute [user] [reason] [time]\` - میوت کاربر با زمان انقضا\n` +
            `\`${prefix}unmute [user]\` - آن‌میوت کاربر\n` +
            `\`${prefix}timeout [user] [reason] [time]\` - تایم‌اوت نیتیو دیسکورد\n` +
            `\`${prefix}untimeout [user]\` - لغو تایم‌اوت\n` +
            `\`${prefix}qr [user] [reason] [time]\` - قرنطینه و بستن تمام چنل‌ها\n` +
            `\`${prefix}unqr [user]\` - حذف قرنطینه و بازگردانی رول‌ها\n` +
            `\`${prefix}logchannel [channel] [set/unset]\` - تنظیم چنل لاگ سرور`
        },
        {
          name: '🎫 سیستم تیکت حرفه‌ای (Ticket System)',
          value:
            `\`${prefix}ticket panel #channel\` - ارسال پنل تیکت همراه با دراپ‌دان (Dropdown)\n` +
            `\`${prefix}ticket support @role\` - تنظیم رول پشتیبانان تیکت\n` +
            `\`${prefix}ticket category [general/report/store/technical] [categoryId]\` - انتقال هر بخش تیکت به یک کتگوری اختصاصی\n` +
            `\`${prefix}ticket close\` - بستن و حذف تیکت جاری\n` +
            `\`${prefix}ticket add @user\` - اضافه کردن کاربر به تیکت\n` +
            `\`${prefix}ticket remove @user\` - حذف کاربر از تیکت`
        },
        {
          name: '🔒 کنترل چنل‌ها (Channel Controls)',
          value:
            `\`${prefix}lock [channel]\` - قفل کردن ارسال پیام در چنل\n` +
            `\`${prefix}unlock [channel]\` - باز کردن ارسال پیام\n` +
            `\`${prefix}hide [channel]\` - مخفی کردن چنل برای @everyone\n` +
            `\`${prefix}show [channel]\` - نمایان کردن چنل برای @everyone`
        },
        {
          name: '👋 سیستم ولکام و جوین (مستقل از گودبای)',
          value:
            `\`${prefix}welcome setup [message] [channel]\` - متغیرها: \`<user>\`, \`<server>\`, \`<membersnow>\`\n` +
            `\`${prefix}welcome test\` - تست امبد ولکام در چنل مشخص‌شده\n` +
            `\`${prefix}welcome delete\` - غیرفعال‌سازی ولکام`
        },
        {
          name: '🚪 سیستم گودبای و لفت (مستقل از ولکام)',
          value:
            `\`${prefix}goodbye setup [message] [channel]\` - متغیرها: \`<user>\`, \`<server>\`, \`<membersnow>\`\n` +
            `\`${prefix}goodbye test\` - تست امبد لفت در چنل مشخص‌شده\n` +
            `\`${prefix}goodbye delete\` - غیرفعال‌سازی گودبای`
        },
        {
          name: '📢 خبررسان خودکار (Live & Media)',
          value:
            `\`${prefix}livenews [enable/disable] [channel] [message] [liveurl] [mentions]\` - استریم الرت\n` +
            `\`${prefix}medianews [enable/disable] [channel] [message] [mediaurl] [mentions]\` - مدیا الرت`
        },
        {
          name: '🔊 ویس و نظرسنجی',
          value:
            `\`${prefix}join\` - جوین شدن بات به ویس چنل کاربر\n` +
            `\`${prefix}poll [question]\` - نظرسنجی با ری‌اکشن بله/خیر یا چندگزینه‌ای`
        }
      )
      .setFooter({
        text: config.brand.footer,
        iconURL: message.guild.iconURL({ dynamic: true }) || config.brand.avatar
      })
      .setTimestamp();

    return message.reply({ embeds: [embed] });
  }
};
