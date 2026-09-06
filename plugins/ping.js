export default {
  name: 'ping',
  description: 'Check bot responsiveness and latency',
  async execute({ sock, msg }) {
    const start = Date.now();
    const jid = msg.key.remoteJid;

    await sock.sendMessage(jid, {
      text: `🏓 Pong! Response time: ${Date.now() - start}ms`,
    });
  },
};