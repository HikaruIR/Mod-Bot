require('dotenv').config();
const fs = require('fs');
const path = require('path');
const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  ActivityType
} = require('discord.js');

const client = new Client({
  presence: {
    status: 'dnd',
    activities: [
      {
        name: 'Ocean🐋',
        type: ActivityType.Watching
      }
    ]
  },
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.User
  ]
});

client.commands = new Collection();
client.slashCommands = new Collection();

/**
 * Recursively load all command files
 */
function loadCommands(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      loadCommands(fullPath);
    } else if (file.name.endsWith('.js')) {
      try {
        const command = require(fullPath);
        if (command.name && typeof command.execute === 'function') {
          client.commands.set(command.name, command);
          console.log(`[Command Loaded] !${command.name}`);
        }
        if (command.slashData || typeof command.executeSlash === 'function') {
          const slashName = command.slashData ? command.slashData.name : command.name;
          client.slashCommands.set(slashName, command);
          console.log(`[SlashCommand Loaded] /${slashName}`);
        }
      } catch (err) {
        console.error(`Failed to load command at ${fullPath}:`, err);
      }
    }
  }
}

const commandsPath = path.join(__dirname, 'src', 'commands');
if (fs.existsSync(commandsPath)) {
  loadCommands(commandsPath);
}

/**
 * Load event files
 */
const eventsPath = path.join(__dirname, 'src', 'events');
if (fs.existsSync(eventsPath)) {
  const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));
  for (const file of eventFiles) {
    const event = require(path.join(eventsPath, file));
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args));
    } else {
      client.on(event.name, (...args) => event.execute(client, ...args));
    }
    console.log(`[Event Loaded] ${event.name}`);
  }
}

// Error handling to prevent crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
});

// Start the bot (supports DISCORD_BOT_TOKEN or DISCORD_TOKEN)
const token = process.env.DISCORD_BOT_TOKEN || process.env.DISCORD_TOKEN;
if (!token || token === 'your_bot_token_here') {
  console.error('❌ DISCORD_BOT_TOKEN / DISCORD_TOKEN is missing or not configured!');
  process.exit(1);
}

client.login(token).catch(err => {
  console.error('❌ Failed to login to Discord:', err.message);
});
