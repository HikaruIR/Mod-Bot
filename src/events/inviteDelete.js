const { cacheGuildInvites } = require('../services/inviteService');

module.exports = {
  name: 'inviteDelete',
  async execute(client, invite) {
    if (invite.guild) {
      await cacheGuildInvites(invite.guild);
    }
  }
};
