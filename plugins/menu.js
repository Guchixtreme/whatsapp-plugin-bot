import { BOT_NAME, PREFIX } from '../config.js';

export default {
  name: 'menu',
  description: 'Displays all available commands',
  async execute({ sock, msg, plugins }) {
    const jid = msg.key.remoteJid;

    let menuText = `⚡ *${BOT_NAME}* ⚡\n`;
    menuText += `_The Modular WhatsApp Assistant_\n\n`;
    menuText += `*Available Commands:*\n`;

    plugins.forEach((plugin) => {
      menuText += `• *${PREFIX}${plugin.name}*: ${plugin.description}\n`;
    });

    await sock.sendMessage(jid, { text: menuText });
  }
};