import { PREFIX, BOT_NAME } from '../config.js';

export default {
  name: 'menu',
  description: 'Display all available commands',
  async execute({ sock, msg, plugins }) {
    const jid = msg.key.remoteJid;
    let menuText = `🤖 *${BOT_NAME} Menu*\n\n`;

    plugins.forEach((plugin) => {
      menuText += `• *${PREFIX}${plugin.name}*: ${plugin.description}\n`;
    });

    await sock.sendMessage(jid, { text: menuText });
  },
};