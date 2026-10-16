const { cacheGuildInvites } = require('../services/inviteService');

module.exports = {
  name: 'inviteCreate',
  async execute(client, invite) {
    if (invite.guild) {
      await cacheGuildInvites(invite.guild);
    }
  }
};
