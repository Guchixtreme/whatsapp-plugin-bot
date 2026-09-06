import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import readline from 'readline';
import { loadPlugins, handleCommand } from './pluginHandler.js';
import { PREFIX } from './config.js';

const usePairingCode = process.argv.includes('--pairing-code');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (text) => new Promise((resolve) => rl.question(text, resolve));

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');

  await loadPlugins();

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: !usePairingCode,
  });

  sock.ev.on('creds.update', saveCreds);

  if (usePairingCode && !sock.authState.creds.registered) {
    const phoneNumber = await question('\n📱 Enter phone number with country code (e.g., 233XXXXXXXXX): ');
    const code = await sock.requestPairingCode(phoneNumber.trim());
    console.log(`\n🔑 PAIRING CODE: ${code}\n`);
  }

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(`Connection closed (reason: ${statusCode}). Reconnecting...`, shouldReconnect);
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('\n⚡ WhatsApp Bot is connected and ready!\n');
    }
  });

  // Listen for incoming messages across DMs, Groups, and Self-Chat
  sock.ev.on('messages.upsert', async (m) => {
    if (m.type !== 'notify') return;

    for (const msg of m.messages) {
      if (!msg.message) continue;

      const body =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        msg.message.videoMessage?.caption ||
        '';

      if (body.startsWith(PREFIX)) {
        console.log(`⚡ Command received in ${msg.key.remoteJid}: ${body}`);
        await handleCommand(sock, msg, body);
      }
    }
  });
}

startBot();