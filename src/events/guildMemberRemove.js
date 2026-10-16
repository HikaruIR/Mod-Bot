const { handleMemberLeave } = require('../services/inviteService');

module.exports = {
  name: 'guildMemberRemove',
  async execute(client, member) {
    try {
      await handleMemberLeave(member);
    } catch (err) {
      console.error('Error handling guildMemberRemove event:', err);
    }
  }
};
