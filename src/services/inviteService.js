const { EmbedBuilder } = require('discord.js');
const db = require('../utils/database');
const config = require('../../config');
const { getGuildConfig } = require('../utils/permissions');
const { sendLog } = require('./logService');

// In-memory cache of invites: guildId -> Map(code => uses)
const guildInvitesCache = new Map();

/**
 * Cache all invites for a guild
 */
async function cacheGuildInvites(guild) {
  try {
    if (!guild.members.me?.permissions.has('ManageGuild')) return;
    const invites = await guild.invites.fetch().catch(() => null);
    if (!invites) return;

    const codeUses = new Map();
    invites.forEach(inv => codeUses.set(inv.code, inv.uses));
    guildInvitesCache.set(guild.id, codeUses);
  } catch (err) {
    console.warn(`Could not cache invites for guild ${guild.id}:`, err.message);
  }
}

/**
 * Initialize invite cache for all client guilds
 */
async function initInviteTracker(client) {
  for (const guild of client.guilds.cache.values()) {
    await cacheGuildInvites(guild);
  }
  console.log(`[Invite Tracker] Cached invites for ${guildInvitesCache.size} guild(s).`);
}

/**
 * Get user invite stats
 */
function getUserInvites(guildId, userId) {
  const all = db.invites.get(guildId) || {};
  const stats = all[userId] || { regular: 0, leaves: 0, fake: 0, bonus: 0 };
  const total = (stats.regular || 0) + (stats.bonus || 0) - (stats.leaves || 0);
  return {
    regular: stats.regular || 0,
    leaves: stats.leaves || 0,
    fake: stats.fake || 0,
    bonus: stats.bonus || 0,
    total: Math.max(0, total)
  };
}

/**
 * Update user invite stats
 */
function updateUserInvites(guildId, userId, updater) {
  const all = db.invites.get(guildId) || {};
  const current = all[userId] || { regular: 0, leaves: 0, fake: 0, bonus: 0 };
  updater(current);
  all[userId] = current;
  db.invites.set(guildId, all);
  return current;
}

/**
 * Handle new member join - EXACT MATCH TO USER'S SCREENSHOT
 */
async function handleMemberJoin(member) {
  const guild = member.guild;
  const cachedInvites = guildInvitesCache.get(guild.id) || new Map();
  let usedInvite = null;
  let inviter = null;
  let isVanity = false;

  try {
    if (guild.members.me?.permissions.has('ManageGuild')) {
      const newInvites = await guild.invites.fetch().catch(() => null);
      if (newInvites) {
        for (const [code, inv] of newInvites) {
          const cachedUses = cachedInvites.get(code) || 0;
          if (inv.uses > cachedUses) {
            usedInvite = inv;
            inviter = inv.inviter;
            break;
          }
        }
        const freshCodeUses = new Map();
        newInvites.forEach(inv => freshCodeUses.set(inv.code, inv.uses));
        guildInvitesCache.set(guild.id, freshCodeUses);
      }
    }

    if (!usedInvite && guild.vanityURLCode) {
      const vanityData = await guild.fetchVanityData().catch(() => null);
      if (vanityData) {
        isVanity = true;
      }
    }
  } catch (err) {
    console.warn(`Error resolving invite for ${member.user.tag}:`, err.message);
  }

  const accountAgeMs = Date.now() - member.user.createdTimestamp;
  const isFake = accountAgeMs < 3 * 24 * 60 * 60 * 1000;

  let inviterStats = null;
  if (inviter && !member.user.bot) {
    updateUserInvites(guild.id, inviter.id, stats => {
      if (isFake) {
        stats.fake = (stats.fake || 0) + 1;
      } else {
        stats.regular = (stats.regular || 0) + 1;
      }
    });
    inviterStats = getUserInvites(guild.id, inviter.id);

    db.memberJoins.set(`${guild.id}_${member.id}`, {
      inviterId: inviter.id,
      code: usedInvite?.code || null,
      isFake,
      joinedAt: new Date().toISOString()
    });
  }

  // Format date time: DD/MM/YYYY HH:MM
  const now = new Date();
  const dateFormatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Find target channel: welcome channel, join channel, or log channel
  const guildConfig = getGuildConfig(guild.id);
  const targetChannelId = (guildConfig.welcome && guildConfig.welcome.enabled !== false && guildConfig.welcome.channelId) || guildConfig.welcomeChannelId;

  if (targetChannelId) {
    const channel = guild.channels.cache.get(targetChannelId);
    if (channel && channel.isTextBased()) {
      let invitedByValue = 'Direct Link /\nUnknown';
      if (inviter) {
        invitedByValue = `${inviter.username}\n( ${inviterStats ? inviterStats.total : 1} invites )`;
      } else if (isVanity) {
        invitedByValue = `Vanity Link\n( ${guild.vanityURLCode} )`;
      }

      let descriptionText = `Welcome <@${member.id}> to **${guild.name}**! Member #${guild.memberCount}.`;
      if (guildConfig.welcome && guildConfig.welcome.message) {
        descriptionText = guildConfig.welcome.message
          .replace(/<user>/g, `<@${member.id}>`)
          .replace(/<server>/g, guild.name)
          .replace(/<membersnow>/g, guild.memberCount.toString());
      }

      const embed = new EmbedBuilder()
        .setTitle(`🎉 Welcome to ${guild.name}!`)
        .setDescription(descriptionText)
        .setColor('#5865F2')
        .setThumbnail(member.user.displayAvatarURL({ extension: 'png', forceStatic: false, size: 512 }))
        .addFields(
          {
            name: '👤 Member',
            value: `${member.user.username}\n( \`${member.id}\` )`,
            inline: true
          },
          {
            name: '📊 Member Count',
            value: `#${guild.memberCount}`,
            inline: true
          },
          {
            name: '✉️ Invited By',
            value: invitedByValue,
            inline: true
          }
        )
        .setFooter({
          text: `${guild.name} • User Joined • ${dateFormatted}`,
          iconURL: guild.iconURL() || config.brand.avatar
        });

      channel.send({ embeds: [embed] }).catch(() => {});
    }
  }

  await sendLog(guild, {
    title: 'Member Joined',
    description: `<@${member.id}> joined the server. ${inviter ? `Invited by <@${inviter.id}>` : ''}`,
    color: '#5865F2',
    user: member.user,
    action: 'MEMBER_JOIN'
  });
}

/**
 * Handle member leave
 */
async function handleMemberLeave(member) {
  const guild = member.guild;
  const joinRecord = db.memberJoins.get(`${guild.id}_${member.id}`);

  let inviter = null;
  let inviterStats = null;

  if (joinRecord && joinRecord.inviterId) {
    updateUserInvites(guild.id, joinRecord.inviterId, stats => {
      stats.leaves = (stats.leaves || 0) + 1;
    });
    inviterStats = getUserInvites(guild.id, joinRecord.inviterId);
    inviter = await guild.client.users.fetch(joinRecord.inviterId).catch(() => null);
  }

  const now = new Date();
  const dateFormatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const goodbyeConfig = db.goodbye.get(guild.id);
  if (goodbyeConfig && goodbyeConfig.enabled && goodbyeConfig.channelId) {
    const channel = guild.channels.cache.get(goodbyeConfig.channelId);
    if (channel && channel.isTextBased()) {
      let descriptionText = `Goodbye **${member.user.tag}**! We now have ${guild.memberCount} members in **${guild.name}**.`;
      if (goodbyeConfig.message) {
        descriptionText = goodbyeConfig.message
          .replace(/<user>/g, `**${member.user.tag}**`)
          .replace(/<server>/g, guild.name)
          .replace(/<membersnow>/g, guild.memberCount.toString());
      }

      const embed = new EmbedBuilder()
        .setTitle(`🚪 Member Left ${guild.name}`)
        .setDescription(descriptionText)
        .setColor(config.colors.danger)
        .setThumbnail(member.user.displayAvatarURL({ extension: 'png', forceStatic: false, size: 512 }))
        .addFields(
          { name: '👤 Member', value: `${member.user.username}\n( \`${member.id}\` )`, inline: true },
          { name: '📊 Remaining Members', value: `#${guild.memberCount}`, inline: true }
        )
        .setFooter({
          text: `${guild.name} • User Left • ${dateFormatted}`,
          iconURL: guild.iconURL() || config.brand.avatar
        });

      channel.send({ embeds: [embed] }).catch(() => {});
    }
  }

  await sendLog(guild, {
    title: 'Member Left',
    description: `**${member.user.tag}** left the server. ${inviter ? `Invited by <@${inviter.id}>` : ''}`,
    color: config.colors.danger,
    user: member.user,
    action: 'MEMBER_LEAVE'
  });
}

module.exports = {
  cacheGuildInvites,
  initInviteTracker,
  getUserInvites,
  handleMemberJoin,
  handleMemberLeave
};
