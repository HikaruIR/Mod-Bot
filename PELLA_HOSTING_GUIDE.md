# راهنمای جامع و گام‌به‌گام ران کردن ربات روی هاستینگ Pella (Pterodactyl)

این ربات به صورت ۱۰۰٪ آماده و سازگار با کنترل‌پنل Pella و سایر کنترل‌پنل‌های پتروداکتیل (Pterodactyl) طراحی شده است. به دلیل اینکه دیتابیس ربات به صورت JSON ذخیره‌سازی می‌شود، نیازی به نصب بیلد تولزهای پیچیده لینوکس ندارد و بدون ارور اجرا می‌شود.

---

### مرحله اول: فعال‌سازی دسترسی‌های ربات در دیسکورد (بسیار مهم!) ⚠️
برای اینکه دستورات متنی (`!`)، دکمه‌ها و سیستم‌های تیکت و گیو‌اوی به درستی کار کنند:
1. وارد [Discord Developer Portal](https://discord.com/developers/applications) شوید.
2. روی بات خود کلیک کنید و از منوی سمت چپ به بخش **Bot** بروید.
3. در قسمت **Privileged Gateway Intents**، این ۳ گزینه را روشن (Enable) کنید:
   - ✅ **Presence Intent**
   - ✅ **Server Members Intent**
   - ✅ **Message Content Intent**
4. دکمه سبز رنگ **Save Changes** در پایین صفحه را بزنید.

---

### مرحله دوم: آماده‌سازی فایل‌ها برای آپلود
فولدر پروژه در سیستم شما در این مسیر قرار دارد:
`C:\Users\Mohammad\.gemini\antigravity\scratch\discord-bot`

1. تمام فایل‌ها و پوشه‌های داخل این پوشه را فشرده (Zip) کنید:
   - `index.js`
   - `config.js`
   - `package.json`
   - `.env` (شامل توکن شما)
   - پوشه `src`
   - پوشه `data`
   *(پوشه `node_modules` را لازم نیست زیپ کنید، چون هاست خودش نصب می‌کند یا می‌توانید همراه با فایل‌ها آپلود کنید)*

---

### مرحله سوم: آپلود روی پنل هاست Pella
1. وارد سایت [Pella](https://pella.ir) و پنل کاربری هاست دیسکورد خود شوید.
2. به بخش **File Manager** (مدیریت فایل) بروید.
3. فایل زیپ شده را آپلود (Upload) کرده و سپس آن را **Unarchive** (استخراج) کنید.
4. مطمئن شوید فایل `.env` وجود دارد و مقدار توکن در آن نوشته شده است:
   ```env
   DISCORD_TOKEN=your_discord_bot_token_here
   PREFIX=!
   ```

---

### مرحله چهارم: تنظیمات استارت‌آپ (Startup) و اجرای بات
1. در پنل پتروداکتیل Pella به سربرگ **Startup** بروید:
   - مقدار **Main File** یا **Start Command** را روی `index.js` یا `node index.js` تنظیم کنید.
   - مطمئن شوید نسخه Node.js سرور روی **Node 18 یا Node 20+** تنظیم باشد.
2. به سربرگ **Console** بروید.
3. در صورتی که پوشه `node_modules` را آپلود نکرده‌اید، در خط فرمان کنسول تایپ کنید:
   ```bash
   npm install
   ```
4. دکمه **Start** را بزنید!
5. پیام زیر در کنسول ظاهر شده و بات آنلاین می‌شود:
   ```
   ========================================
   ✅ Logged in successfully as: [نام بات]
   🤖 Bot ID: ...
   🌐 Serving 1 server(s)
   ========================================
   ⚡ Background tickers initialized (Giveaway & Tempban check).
   ```

---

## لیست دستورات بات (Commands List)

### 🎫 سیستم تیکت (Ticket System):
- `!panel create [name] [dropdown: enable/disable] [form: enable/disable] [support-role-id] [mention-role-id]`
- `!panel dropdownstyle [add/remove/edit] [name] [description] [emoji] [category-id]`
- `!panel form [create/edit/delete] "Question 1" "Question 2"`
- `!panel delete [name]`
- `!panel support [set/unset] [user/role-id]`
- `!panel setadmin [set/unset] [user/role-id]`

### 🎉 سیستم گیو‌اوی (Giveaway System):
- `!giveaway start [time] [winners] [prize]` (مثال: `!giveaway start 10m 1w Discord Nitro`)
- `!giveaway end [message-id]` (پایان زودهنگام و قرعه‌کشی خودکار)
- `!giveaway reroll [message-id]` (انتخاب مجدد برنده با ریپلای و منشن)
- `!giveaway blacklist [user/role]` (مسدودسازی کاربر/رول از شرکت در قرعه‌کشی)
- `!giveaway unblacklist [user/role]`
- `!giveaway prizechange [message-id] [new-prize]`
- `!giveaway winnerchange [message-id] [number]`

### 🛡️ سیستم مدیریت و مادریشن (Moderation System):
- `!ban @user [time] [reason]` (بن موقت/دائم به همراه ارسال دلیل در پی‌وی کاربر)
- `!unban [user-id]` (آن‌بن کاربر با آیدی)
- `!kick @user [reason]` (کیک کاربر به همراه ارسال دلیل در پی‌وی)
- `!to @user [time] [reason]` (تایم‌اوت/میوت موقت کاربر با ارسال پیام در پی‌وی)
- `!unto @user` (حذف تایم‌اوت کاربر)
- `!lock [channel]` (قفل کردن چنل برای کاربران عادی)
- `!unlock [channel]` (باز کردن قفل چنل)
- `!hide [channel]` (مخفی کردن چنل برای کاربران عادی)
- `!unhide [channel]` (نمایان کردن مجدد چنل)
- `!oprole [set/unsetup] [role-id]` (تنظیم رول ادمین/OP)
- `!op @user` (دادن دسترسی کامل و رول OP به کاربر)
- `!deop @user` (گرفتن رول OP از کاربر)
