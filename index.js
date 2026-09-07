import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import readline from 'readline';
import { loadPlugins, handleCommand } from './pluginHandler.js';
import { PREFIX, WORK_MODE, OWNER_NUMBER } from './config.js';

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

  let pairingRequested = false;

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Request pairing code only when socket is ready (fires on qr update)
    if (usePairingCode && qr && !sock.authState.creds.registered && !pairingRequested) {
      pairingRequested = true;
      const phoneNumber = await question('\n📱 Enter phone number with country code (digits only, e.g. 233XXXXXXXXX): ');
      const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
      const code = await sock.requestPairingCode(cleanNumber);
      console.log(`\n🔑 PAIRING CODE: ${code}\n`);
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`Connection closed (${statusCode}). Reconnecting...`);
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('\n⚡ Guchi X is online and ready!\n');
    }
  });

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

      if (!body.startsWith(PREFIX)) continue;

      const senderJid = msg.key.participant || msg.key.remoteJid;
      const senderNumber = senderJid.split('@')[0];
      const isOwner = msg.key.fromMe || senderNumber === OWNER_NUMBER;

      if (WORK_MODE === 'private' && !isOwner) {
        console.log(`🔒 Ignored command from ${senderNumber} (Private Mode)`);
        continue;
      }

      console.log(`⚡ Command [${body}] in ${msg.key.remoteJid}`);
      await handleCommand(sock, msg, body);
    }
  });
}

startBot();