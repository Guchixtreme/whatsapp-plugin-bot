export default {
  name: 'echo',
  description: 'Repeats back your text message',
  async execute({ sock, msg, args }) {
    const jid = msg.key.remoteJid;
    const text = args.join(' ');

    if (!text) {
      return sock.sendMessage(jid, { text: '⚠️ Please provide text to echo! Example: !echo Hello' });
    }

    await sock.sendMessage(jid, { text });
  },
};