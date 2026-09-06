import { WORK_MODE, OWNER_NUMBER, setWorkMode } from '../config.js';

export default {
  name: 'mode',
  description: 'Switch bot mode between public and private (!mode public/private)',
  async execute({ sock, msg, args }) {
    const jid = msg.key.remoteJid;
    const senderJid = msg.key.participant || jid;
    const senderNumber = senderJid.split('@')[0];
    const isOwner = msg.key.fromMe || senderNumber === OWNER_NUMBER;

    if (!isOwner) {
      return sock.sendMessage(jid, { text: '❌ Only the bot owner can change the work mode.' });
    }

    const targetMode = args[0]?.toLowerCase();

    if (!targetMode || !['public', 'private'].includes(targetMode)) {
      return sock.sendMessage(jid, { 
        text: `🌐 *Current Mode:* \`${WORK_MODE.toUpperCase()}\`\n\nUse \`!mode public\` or \`!mode private\` to switch.` 
      });
    }

    setWorkMode(targetMode);
    await sock.sendMessage(jid, { text: `✅ *Guchi X* is now in *${targetMode.toUpperCase()}* mode.` });
  }
};