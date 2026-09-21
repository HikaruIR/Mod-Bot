const { PermissionsBitField } = require('discord.js');
const db = require('./database');

function getGuildConfig(guildId) {
  const allConfigs = db.config.all();
  return allConfigs[guildId] || {
    adminRoles: [],
    adminUsers: [],
    supportRoles: [],
    supportUsers: [],
    opRole: null
  };
}

function isBotAdmin(member) {
  if (!member || !member.guild) return false;
  if (member.guild.ownerId === member.id) return true;
  if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;

  const cfg = getGuildConfig(member.guild.id);
  if (cfg.adminUsers && cfg.adminUsers.includes(member.id)) return true;
  if (cfg.adminRoles && member.roles.cache.some(r => cfg.adminRoles.includes(r.id))) return true;

  return false;
}

function isSupport(member, specificRoleId = null) {
  if (!member || !member.guild) return false;
  if (isBotAdmin(member)) return true;

  const cfg = getGuildConfig(member.guild.id);
  if (cfg.supportUsers && cfg.supportUsers.includes(member.id)) return true;
  if (cfg.supportRoles && member.roles.cache.some(r => cfg.supportRoles.includes(r.id))) return true;
  if (specificRoleId && member.roles.cache.has(specificRoleId)) return true;

  return false;
}

function isGiveawayManager(member) {
  if (!member || !member.guild) return false;
  if (isBotAdmin(member)) return true;
  return member.permissions.has(PermissionsBitField.Flags.ManageGuild) ||
         member.permissions.has(PermissionsBitField.Flags.ManageEvents);
}

module.exports = {
  getGuildConfig,
  isBotAdmin,
  isSupport,
  isGiveawayManager
};
