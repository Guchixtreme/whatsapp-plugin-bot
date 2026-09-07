export default {
  name: 'menu',
  aliases: ['help'],
  description: 'Displays all available bot commands',
  async execute({ sock, msg, plugins }) {
    const jid = msg.key.remoteJid;

    try {
      let menuText = `⚡ *GUCHI X BOT MENU* ⚡\n\n`;

      if (plugins && plugins.size > 0) {
        for (const [name, plugin] of plugins.entries()) {
          menuText += `▪ *!${name}* : ${plugin.description || 'No description'}\n`;
        }
      } else {
        menuText += `▪ *!ping* : Check bot latency\n▪ *!menu* : Show menu\n`;
      }

      menuText += `\n💡 _Type any command with the prefix ! to execute._`;

      await sock.sendMessage(jid, { text: menuText }, { quoted: msg });
    } catch (error) {
      console.error('Menu Plugin Error:', error);
      await sock.sendMessage(jid, { text: '⚠️ Failed to generate menu list.' }, { quoted: msg });
    }
  }
};