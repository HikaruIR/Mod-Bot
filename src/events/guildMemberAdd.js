const { handleMemberJoin } = require('../services/inviteService');

module.exports = {
  name: 'guildMemberAdd',
  async execute(client, member) {
    try {
      await handleMemberJoin(member);
    } catch (err) {
      console.error('Error handling guildMemberAdd event:', err);
    }
  }
};
