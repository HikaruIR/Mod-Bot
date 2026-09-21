# 🤖 Advanced Discord Bot (Discord.js v14)

A modular, multi-system Discord bot built with **Node.js** and **Discord.js v14**. Includes an advanced **Ticket System** (with interactive Dropdowns and Modal forms), a complete **Giveaway System** (with button entries, reroll, blacklist, and automated winner announcements/replies), and an extensive **Moderation System** (temporary bans, timeouts, channel lock/hide, and operator role management).

---

## 🌟 Features

### 🎫 1. Ticket System
- **Interactive Panels**: Deploy panels with Buttons or Dropdown Menus (Select Menus).
- **Custom Dropdown Options**: Add multiple categories to the dropdown menu, each linked to a specific channel category.
- **Dynamic Modal Forms**: Ask users questions (up to 5) in a popup modal before creating their ticket. Answers are automatically posted into the ticket.
- **Role Mentions**: Automatically ping staff and user on ticket creation.
- **In-Ticket Controls**:
  - 🔒 **Close Ticket**: Confirmation prompt, automatic chat transcript (`.txt`), DMs the transcript to the ticket creator, and deletes the channel after 5 seconds.
  - ✋ **Claim Ticket**: Staff can claim tickets to avoid duplicated efforts.

### 🎉 2. Giveaway System
- **Interactive Button Entry**: Clean embed with one-click entry and real-time entry counter.
- **Auto-Announce & Reply**: Automatically replies directly to the giveaway message upon completion, mentioning all winners and stating the prize won!
- **Reroll & Early Finish**: Reroll new winners anytime or force-end an active giveaway.
- **Blacklist System**: Blacklist specific users or roles from entering or winning.
- **Dynamic Edits**: Change prize or winner count on the fly.

### 🛡️ 3. Moderation System
- **Ban (`!ban`)**: Supports permanent or temporary bans (e.g., `1d`, `12h`) with automatic unban when the timer expires. Sends DM to the banned user with the reason and server name.
- **Unban (`!unban`)**: Unbans members by ID and clears pending tempbans.
- **Kick (`!kick`)**: Kicks a user from the server with DM reason.
- **Timeout (`!to` & `!unto`)**: Discord native timeout with customizable durations (e.g. `10m`, `1h`) and DM alerts.
- **Channel Locks (`!lock` & `!unlock`)**: Restrict or restore sending messages for `@everyone`.
- **Channel Hiding (`!hide` & `!unhide`)**: Hide or unhide channels from `@everyone`.
- **Operator System (`!oprole`, `!op`, `!deop`)**: Grant or revoke server administrator privileges with custom OP roles.

---

## 📋 Command Reference

### 🎫 Ticket Commands
| Command | Description |
|---|---|
| `!panel create [name] [dropdown(enable/disable)] [form(enable/disable)] [support-role] [mention-role]` | Creates and posts an interactive ticket panel |
| `!panel dropdownstyle add [name] [desc] [emoji] [category-id]` | Adds an option to the dropdown menu pointing to a category |
| `!panel dropdownstyle remove [name]` | Removes an option from the dropdown menu |
| `!panel dropdownstyle edit [name] [desc] [emoji] [category-id]` | Edits an existing dropdown option |
| `!panel form [create/edit/delete] "Q1" "Q2" "Q3"` | Configures questions for the popup modal form |
| `!panel delete [name]` | Deletes a panel configuration |
| `!panel support [set/unset] [user/role-id]` | Configures global ticket support staff |
| `!panel setadmin [set/unset] [user/role-id]` | Configures bot administrators |

> 💡 **What is `desc` in `!panel dropdownstyle`?**
> `desc` stands for **Description**. It is a short explanatory text displayed underneath the option label in the Discord dropdown menu (e.g. *"Click here to report server rule violations"*).

---

### 🎉 Giveaway Commands
| Command | Description |
|---|---|
| `!giveaway start [time] [winners] [prize]` | Starts a giveaway (e.g. `!giveaway start 10m 1w Discord Nitro`) |
| `!giveaway end [message-id]` | Force-ends an active giveaway immediately |
| `!giveaway reroll [message-id]` | Picks new winner(s) and automatically replies to the giveaway |
| `!giveaway blacklist [user/role]` | Adds a user or role to the giveaway blacklist |
| `!giveaway unblacklist [user/role]` | Removes a user or role from the blacklist |
| `!giveaway prizechange [message-id] [new-prize]` | Modifies the prize for an ongoing giveaway |
| `!giveaway winnerchange [message-id] [number]` | Modifies the number of winners |

---

### 🛡️ Moderation Commands
| Command | Description |
|---|---|
| `!ban @user [time] [reason]` | Bans a user (supports tempbans like `1d`) with DM notification |
| `!unban [user-id]` | Unbans a user by ID |
| `!kick @user [reason]` | Kicks a member with reason and DM notification |
| `!to @user [time] [reason]` | Puts a member in timeout (mute) with duration and reason |
| `!unto @user` | Removes timeout from a member |
| `!lock [channel]` | Prevents `@everyone` from sending messages in the channel |
| `!unlock [channel]` | Restores `@everyone` sending permissions |
| `!hide [channel]` | Hides the channel from normal members (`@everyone`) |
| `!unhide [channel]` | Unhides the channel for normal members |
| `!oprole [set/unsetup] [role-id]` | Sets or unsets the Operator (OP) role |
| `!op @user` | Grants the OP role / administrator privileges to a user |
| `!deop @user` | Revokes the OP role from a user |
| `!help` | Displays the help menu with all commands |

---

## 🚀 Setup & Installation

### 1. Clone the repository
```bash
git clone https://github.com/HikaruIR/Mod-Bot.git
cd Mod-Bot
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Open `.env` and insert your Discord Bot Token:
```env
DISCORD_TOKEN=your_bot_token_here
PREFIX=!
```

### 4. Enable Discord Gateway Intents (Crucial!) ⚠️
In the [Discord Developer Portal](https://discord.com/developers/applications):
1. Select your application and go to the **Bot** tab.
2. Scroll down to **Privileged Gateway Intents** and enable:
   - ✅ **Presence Intent**
   - ✅ **Server Members Intent**
   - ✅ **Message Content Intent**
3. Save changes.

### 5. Run the Bot
```bash
node index.js
```

---

## 📁 Project Structure

```
discord-bot/
├── .env.example              # Template for credentials
├── .gitignore                # Protects secrets, node_modules, and database
├── package.json              # Project dependencies
├── index.js                  # Main entry point & event loader
├── config.js                 # Global colors, emojis, and defaults
├── src/
│   ├── commands/
│   │   ├── ticket/panel.js   # Ticket panel management commands
│   │   ├── giveaway/giveaway.js # Giveaway commands
│   │   ├── moderation/       # Moderation commands (ban, kick, lock, op, etc.)
│   │   └── help.js           # Interactive help menu
│   ├── events/               # Event handlers (ready, messageCreate, interactionCreate)
│   ├── handlers/             # Ticket, giveaway, and tempban processors
│   └── utils/                # Database manager, time parser, permissions
└── test/
    └── verify.js             # Automated verification test suite
```

---

## 📄 License
ISC License. Feel free to use and modify for your servers!
