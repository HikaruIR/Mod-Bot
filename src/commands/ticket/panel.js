const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  PermissionsBitField
} = require('discord.js');
const db = require('../../utils/database');
const config = require('../../../config');
const { isBotAdmin, getGuildConfig } = require('../../utils/permissions');

/**
 * Builds the components (buttons or dropdown) for a panel
 */
function buildPanelComponents(panel) {
  const rows = [];

  if (panel.dropdown) {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId(`ticket_select_${panel.name}`)
      .setPlaceholder('Select a category to open a ticket...');

    if (panel.dropdownOptions && panel.dropdownOptions.length > 0) {
      panel.dropdownOptions.forEach(opt => {
        const option = new StringSelectMenuOptionBuilder()
          .setLabel(opt.name.slice(0, 100))
          .setValue(opt.name.slice(0, 100))
          .setDescription((opt.description || 'Open a ticket for this category').slice(0, 100));

        if (opt.emoji) {
          try {
            option.setEmoji(opt.emoji);
          } catch (e) {}
        }
        selectMenu.addOptions(option);
      });
    } else {
      // Default fallback option if none added yet
      selectMenu.addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('General Support')
          .setValue('General Support')
          .setDescription('Click to open a support ticket')
          .setEmoji('🎫')
      );
    }
    rows.push(new ActionRowBuilder().addComponents(selectMenu));
  } else {
    const button = new ButtonBuilder()
      .setCustomId(`ticket_button_${panel.name}`)
      .setLabel('Open Ticket')
      .setStyle(ButtonStyle.Success)
      .setEmoji('🎫');

    rows.push(new ActionRowBuilder().addComponents(button));
  }

  return rows;
}

module.exports = {
  name: 'panel',
  description: 'Manage ticket panels and ticket configuration',
  async execute(message, args) {
    const member = message.member;
    const guild = message.guild;

    if (!isBotAdmin(member)) {
      return message.reply({
        content: `${config.emojis.error} You do not have permission to use panel commands. (Bot Admin required)`
      });
    }

    const sub = args[0]?.toLowerCase();

    // 1. !panel create [panel-name] [dropdownstyle(enable/disable)] [form(enable/disable)] [support-role-id] [mention-role-id]
    if (sub === 'create') {
      const panelName = args[1]?.toLowerCase();
      const dropdownArg = args[2]?.toLowerCase();
      const formArg = args[3]?.toLowerCase();
      const supportRoleArg = args[4];
      const mentionRoleArg = args[5];

      if (!panelName || !dropdownArg || !formArg || !supportRoleArg || !mentionRoleArg) {
        return message.reply({
          content: `${config.emojis.error} **Invalid usage!**\nFormat: \`!panel create [panel-name] [dropdownstyle(enable/disable)] [form(enable/disable)] [support-role-id] [mention-role-id]\`\nExample: \`!panel create support enable enable 123456789 987654321\``
        });
      }

      const dropdownEnabled = ['enable', 'enabled', 'true', 'yes', '1'].includes(dropdownArg);
      const formEnabled = ['enable', 'enabled', 'true', 'yes', '1'].includes(formArg);

      const supportRoleId = supportRoleArg.replace(/[^0-9]/g, '');
      const mentionRoleId = mentionRoleArg.replace(/[^0-9]/g, '');

      const allPanels = db.panels.get(guild.id) || {};
      const existingPanel = allPanels[panelName] || {};

      const panelData = {
        name: panelName,
        dropdown: dropdownEnabled,
        form: formEnabled,
        supportRoleId: supportRoleId,
        mentionRoleId: mentionRoleId,
        channelId: message.channel.id,
        dropdownOptions: existingPanel.dropdownOptions || [],
        questions: existingPanel.questions || ['Please explain your reason for opening this ticket:']
      };

      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle(`🎫 ${panelName.toUpperCase()} SUPPORT TICKET`)
        .setDescription('Need help or want to speak with our support staff?\nInteract with the control below to create a private ticket!')
        .addFields(
          { name: 'Support Staff', value: `<@&${supportRoleId}>`, inline: true },
          { name: 'Form Questions', value: formEnabled ? 'Enabled (Modal)' : 'Disabled', inline: true }
        )
        .setFooter({ text: `${guild.name} • Ticket System` })
        .setTimestamp();

      const components = buildPanelComponents(panelData);

      const panelMsg = await message.channel.send({
        embeds: [embed],
        components: components
      });

      panelData.messageId = panelMsg.id;
      allPanels[panelName] = panelData;
      db.panels.set(guild.id, allPanels);

      return message.reply({
        content: `${config.emojis.success} Successfully created and deployed panel **${panelName}**!`
      });
    }

    // 2. !panel dropdownstyle [add/remove/edit] [dropdown-name] [dropdown-discribe] [dropdown-emoji] [category-for-this-dropdown]
    // Flexible format: allows specifying [panel-name] or defaults to first panel
    if (sub === 'dropdownstyle') {
      const action = args[1]?.toLowerCase();
      if (!['add', 'remove', 'edit'].includes(action)) {
        return message.reply({
          content: `${config.emojis.error} **Invalid usage!**\nAction must be \`add\`, \`remove\`, or \`edit\`.\nFormat: \`!panel dropdownstyle [add/remove/edit] [dropdown-name] [dropdown-describe] [dropdown-emoji] [category-id]\``
        });
      }

      const allPanels = db.panels.get(guild.id) || {};
      const panelNames = Object.keys(allPanels);

      if (panelNames.length === 0) {
        return message.reply({
          content: `${config.emojis.error} No ticket panels found! Create a panel first using \`!panel create\`.`
        });
      }

      // Check if user passed panel name as 2nd arg or if we use args
      let targetPanel = null;
      let optionName = null;
      let description = null;
      let emoji = null;
      let categoryId = null;

      // Syntax check: !panel dropdownstyle add [dropdown-name] [dropdown-describe] [dropdown-emoji] [category-id]
      // Or: !panel dropdownstyle [panel-name] add ...
      if (allPanels[args[2]?.toLowerCase()]) {
        targetPanel = allPanels[args[2].toLowerCase()];
        optionName = args[3];
        description = args[4];
        emoji = args[5];
        categoryId = args[6]?.replace(/[^0-9]/g, '');
      } else {
        // default to first panel or active dropdown panel
        const dropdownPanelKey = panelNames.find(k => allPanels[k].dropdown) || panelNames[0];
        targetPanel = allPanels[dropdownPanelKey];
        optionName = args[2];
        description = args[3];
        emoji = args[4];
        categoryId = args[5]?.replace(/[^0-9]/g, '');
      }

      if (!targetPanel) {
        return message.reply({ content: `${config.emojis.error} Target panel could not be determined.` });
      }

      targetPanel.dropdownOptions = targetPanel.dropdownOptions || [];

      if (action === 'add') {
        if (!optionName || !categoryId) {
          return message.reply({
            content: `${config.emojis.error} Format: \`!panel dropdownstyle add [name] [description] [emoji] [category-id]\``
          });
        }

        const existingIdx = targetPanel.dropdownOptions.findIndex(o => o.name.toLowerCase() === optionName.toLowerCase());
        if (existingIdx !== -1) {
          return message.reply({ content: `${config.emojis.warning} Option **${optionName}** already exists. Use \`edit\` to modify it.` });
        }

        targetPanel.dropdownOptions.push({
          name: optionName,
          description: description || 'Select for support',
          emoji: emoji || '📁',
          categoryId: categoryId
        });

        allPanels[targetPanel.name] = targetPanel;
        db.panels.set(guild.id, allPanels);

        // Update the posted panel message if possible
        await refreshPanelMessage(guild, targetPanel);

        return message.reply({
          content: `${config.emojis.success} Added dropdown option **${optionName}** linked to category \`${categoryId}\` on panel **${targetPanel.name}**!`
        });
      }

      if (action === 'remove') {
        if (!optionName) {
          return message.reply({ content: `${config.emojis.error} Please specify the dropdown option name to remove.` });
        }

        const initialLen = targetPanel.dropdownOptions.length;
        targetPanel.dropdownOptions = targetPanel.dropdownOptions.filter(o => o.name.toLowerCase() !== optionName.toLowerCase());

        if (targetPanel.dropdownOptions.length === initialLen) {
          return message.reply({ content: `${config.emojis.error} Option **${optionName}** was not found in panel **${targetPanel.name}**.` });
        }

        allPanels[targetPanel.name] = targetPanel;
        db.panels.set(guild.id, allPanels);
        await refreshPanelMessage(guild, targetPanel);

        return message.reply({
          content: `${config.emojis.success} Removed dropdown option **${optionName}** from panel **${targetPanel.name}**.`
        });
      }

      if (action === 'edit') {
        if (!optionName) {
          return message.reply({ content: `${config.emojis.error} Please specify the dropdown option name to edit.` });
        }

        const opt = targetPanel.dropdownOptions.find(o => o.name.toLowerCase() === optionName.toLowerCase());
        if (!opt) {
          return message.reply({ content: `${config.emojis.error} Option **${optionName}** not found.` });
        }

        if (description) opt.description = description;
        if (emoji) opt.emoji = emoji;
        if (categoryId) opt.categoryId = categoryId;

        allPanels[targetPanel.name] = targetPanel;
        db.panels.set(guild.id, allPanels);
        await refreshPanelMessage(guild, targetPanel);

        return message.reply({
          content: `${config.emojis.success} Successfully updated dropdown option **${optionName}** on panel **${targetPanel.name}**.`
        });
      }
    }

    // 3. !panel form [create/edit/delete] [question1] [question2] [question3] ...
    if (sub === 'form') {
      const action = args[1]?.toLowerCase();
      if (!['create', 'edit', 'delete'].includes(action)) {
        return message.reply({
          content: `${config.emojis.error} **Invalid usage!**\nAction must be \`create\`, \`edit\`, or \`delete\`.\nFormat: \`!panel form [create/edit/delete] "Question 1" "Question 2" ...\`\n*(Enclose multi-word questions in quotes)*`
        });
      }

      const allPanels = db.panels.get(guild.id) || {};
      const panelNames = Object.keys(allPanels);
      if (panelNames.length === 0) {
        return message.reply({ content: `${config.emojis.error} No ticket panel found. Please create one first.` });
      }

      // Extract quoted questions or separate args
      const rawText = message.content.slice(message.content.indexOf(args[1]) + args[1].length).trim();
      const questionMatches = rawText.match(/"([^"]+)"|'([^']+)'|(\S+)/g) || [];
      const cleanedQuestions = questionMatches.map(q => q.replace(/^["']|["']$/g, '').trim()).filter(Boolean);

      let targetPanel = null;
      let questions = [];

      // Check if first item is a panel name
      if (cleanedQuestions.length > 0 && allPanels[cleanedQuestions[0].toLowerCase()]) {
        targetPanel = allPanels[cleanedQuestions[0].toLowerCase()];
        questions = cleanedQuestions.slice(1);
      } else {
        const formPanelKey = panelNames.find(k => allPanels[k].form) || panelNames[0];
        targetPanel = allPanels[formPanelKey];
        questions = cleanedQuestions;
      }

      if (action === 'delete') {
        targetPanel.questions = [];
        allPanels[targetPanel.name] = targetPanel;
        db.panels.set(guild.id, allPanels);
        return message.reply({
          content: `${config.emojis.success} Deleted all form questions from panel **${targetPanel.name}**.`
        });
      }

      if (questions.length === 0) {
        return message.reply({
          content: `${config.emojis.error} Please specify at least one question! Example: \`!panel form create "Why do you need help?" "What is your username?"\``
        });
      }

      if (questions.length > 5) {
        questions = questions.slice(0, 5);
        message.channel.send({ content: `${config.emojis.warning} Discord Modals support a maximum of 5 questions. Truncated to first 5 questions.` });
      }

      targetPanel.questions = questions;
      targetPanel.form = true;
      allPanels[targetPanel.name] = targetPanel;
      db.panels.set(guild.id, allPanels);

      const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle(`📋 Form Questions Configured for ${targetPanel.name}`)
        .setDescription(questions.map((q, idx) => `**${idx + 1}.** ${q}`).join('\n'))
        .setFooter({ text: 'These questions will be asked in a Modal when users click open ticket' });

      return message.reply({ embeds: [embed] });
    }

    // 4. !panel delete [panel-name]
    if (sub === 'delete') {
      const panelName = args[1]?.toLowerCase();
      if (!panelName) {
        return message.reply({ content: `${config.emojis.error} Please provide the panel name to delete. Format: \`!panel delete [panel-name]\`` });
      }

      const allPanels = db.panels.get(guild.id) || {};
      if (!allPanels[panelName]) {
        return message.reply({ content: `${config.emojis.error} Panel **${panelName}** not found.` });
      }

      delete allPanels[panelName];
      db.panels.set(guild.id, allPanels);

      return message.reply({
        content: `${config.emojis.success} Panel **${panelName}** has been deleted from database.`
      });
    }

    // 5. !panel support [set/unset] [user/role-id]
    if (sub === 'support') {
      const action = args[1]?.toLowerCase();
      const targetArg = args[2];

      if (!['set', 'unset'].includes(action) || !targetArg) {
        return message.reply({
          content: `${config.emojis.error} Format: \`!panel support [set/unset] [user/role-id]\``
        });
      }

      const targetId = targetArg.replace(/[^0-9]/g, '');
      const cfg = getGuildConfig(guild.id);
      cfg.supportRoles = cfg.supportRoles || [];
      cfg.supportUsers = cfg.supportUsers || [];

      const isRole = guild.roles.cache.has(targetId);

      if (action === 'set') {
        if (isRole) {
          if (!cfg.supportRoles.includes(targetId)) cfg.supportRoles.push(targetId);
        } else {
          if (!cfg.supportUsers.includes(targetId)) cfg.supportUsers.push(targetId);
        }
      } else {
        cfg.supportRoles = cfg.supportRoles.filter(id => id !== targetId);
        cfg.supportUsers = cfg.supportUsers.filter(id => id !== targetId);
      }

      const allConfigs = db.config.all();
      allConfigs[guild.id] = cfg;
      db.config.save();

      return message.reply({
        content: `${config.emojis.success} ${action === 'set' ? 'Added' : 'Removed'} <@${isRole ? '&' : ''}${targetId}> ${action === 'set' ? 'to' : 'from'} global ticket support list!`
      });
    }

    // 6. !panel setadmin [set/unset] [user/role-id]
    if (sub === 'setadmin') {
      const action = args[1]?.toLowerCase();
      const targetArg = args[2];

      if (!['set', 'unset'].includes(action) || !targetArg) {
        return message.reply({
          content: `${config.emojis.error} Format: \`!panel setadmin [set/unset] [user/role-id]\``
        });
      }

      const targetId = targetArg.replace(/[^0-9]/g, '');
      const cfg = getGuildConfig(guild.id);
      cfg.adminRoles = cfg.adminRoles || [];
      cfg.adminUsers = cfg.adminUsers || [];

      const isRole = guild.roles.cache.has(targetId);

      if (action === 'set') {
        if (isRole) {
          if (!cfg.adminRoles.includes(targetId)) cfg.adminRoles.push(targetId);
        } else {
          if (!cfg.adminUsers.includes(targetId)) cfg.adminUsers.push(targetId);
        }
      } else {
        cfg.adminRoles = cfg.adminRoles.filter(id => id !== targetId);
        cfg.adminUsers = cfg.adminUsers.filter(id => id !== targetId);
      }

      const allConfigs = db.config.all();
      allConfigs[guild.id] = cfg;
      db.config.save();

      return message.reply({
        content: `${config.emojis.success} ${action === 'set' ? 'Granted' : 'Revoked'} bot admin privileges for <@${isRole ? '&' : ''}${targetId}>!`
      });
    }

    // Help overview if no recognized subcommand
    const helpEmbed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle('🎫 Ticket Panel Help')
      .setDescription('Available commands to manage ticket panels and staff:')
      .addFields(
        { name: '!panel create [panel-name] [dropdown(enable/disable)] [form(enable/disable)] [support-role] [mention-role]', value: 'Creates and posts an interactive panel' },
        { name: '!panel dropdownstyle [add/remove/edit] [name] [description] [emoji] [category-id]', value: 'Manage dropdown options & target categories' },
        { name: '!panel form [create/edit/delete] [q1] [q2] [q3] ...', value: 'Configure modal questions (up to 5)' },
        { name: '!panel delete [panel-name]', value: 'Delete a panel configuration' },
        { name: '!panel support [set/unset] [user/role]', value: 'Set/unset global ticket support staff' },
        { name: '!panel setadmin [set/unset] [user/role]', value: 'Set/unset bot administrator' }
      );

    return message.reply({ embeds: [helpEmbed] });
  }
};

async function refreshPanelMessage(guild, panel) {
  if (!panel.channelId || !panel.messageId) return;
  try {
    const channel = guild.channels.cache.get(panel.channelId);
    if (!channel) return;
    const msg = await channel.messages.fetch(panel.messageId);
    if (!msg) return;

    const components = buildPanelComponents(panel);
    await msg.edit({ components: components });
  } catch (err) {
    console.error('Could not refresh panel message:', err);
  }
}
