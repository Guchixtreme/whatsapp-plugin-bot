import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Initialize Plugin Storage
const plugins = new Map();

// Helper for terminal interactive input
const askQuestion = (query) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
};

// 2. Dynamic Plugin Loader
async function loadPlugins() {
  plugins.clear();
  const pluginsDir = path.join(__dirname, 'plugins');
  if (!fs.existsSync(pluginsDir)) {
    fs.mkdirSync(pluginsDir);
  }

  const files = fs.readdirSync(pluginsDir).filter((file) => file.endsWith('.js'));

  for (const file of files) {
    try {
      const filePath = path.join(pluginsDir, file);
      const fileUrl = pathToFileURL(filePath).href;
      const pluginModule = await import(`${fileUrl}?update=${Date.now()}`);
      const plugin = pluginModule.default;

      if (plugin && plugin.name) {
        plugins.set(plugin.name, plugin);
        console.log(`✅ Loaded Plugin: ${plugin.name}`);
      }
    } catch (error) {
      console.error(`❌ Failed to load plugin ${file}:`, error);
    }
  }
}

// 3. Main Connection Lifecycle
async function startBot() {
  await loadPlugins();

  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const usePairingCode = process.argv.includes('--pairing-code') || process.env.PAIRING === 'true';

  const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    auth: state,
    printQRInTerminal: !usePairingCode,
    browser: ['Ubuntu', 'Chrome', '20.0.04'],
  });

  // Pairing Code Authentication Mode
  if (usePairingCode && !sock.authState.creds.registered) {
    let phoneNumber = process.env.BOT_PHONE_NUMBER;
    if (!phoneNumber) {
      phoneNumber = await askQuestion('\n📱 Enter phone number with country code (digits only, e.g. 233XXXXXXXXX): ');
    }
    phoneNumber = phoneNumber.replace(/[^0-9]/g, '');

    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(phoneNumber);
        console.log(`\n🔑 PAIRING CODE: ${code}\n`);
      } catch (err) {
        console.error('Failed to request pairing code:', err);
      }
    }, 3000);
  }

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'close') {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(`Connection closed. Reconnecting: ${shouldReconnect}`);
      if (shouldReconnect) {
        startBot();
      }
    } else if (connection === 'open') {
      console.log('\n⚡ Guchi X is online and ready!\n');
    }
  });

  // 4. Incoming Message Handler & Plugin Execution Engine
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message) continue;

      // --- 1. RUN PASS-THROUGH PLUGINS (e.g. Anti-ViewOnce) ---
      for (const plugin of plugins.values()) {
        if (plugin.name === 'antiviewonce') {
          try {
            await plugin.execute({ sock, msg, args: [], plugins });
          } catch (err) {
            console.error('Anti-ViewOnce Execution Error:', err);
          }
        }
      }

      // --- 2. EXTRACT TEXT CONTENT ACROSS ALL MESSAGE WRAPPERS ---
      const messageContent = msg.message;
      const textMessage =
        messageContent.conversation ||
        messageContent.extendedTextMessage?.text ||
        messageContent.imageMessage?.caption ||
        messageContent.videoMessage?.caption ||
        '';

      // Ignore non-commands
      if (!textMessage.startsWith('!')) continue;

      const args = textMessage.slice(1).trim().split(/ +/);
      const commandName = args.shift().toLowerCase();

      // Locate matching plugin or alias
      const plugin =
        plugins.get(commandName) ||
        Array.from(plugins.values()).find((p) => p.aliases?.includes(commandName));

      if (plugin) {
        console.log(`⚡ Executing Command [!${commandName}] from ${msg.key.remoteJid}`);
        try {
          await plugin.execute({ sock, msg, args, plugins });
        } catch (error) {
          console.error(`Error executing plugin [${commandName}]:`, error);
          await sock.sendMessage(msg.key.remoteJid, {
            text: `⚠️ Error executing command \`!${commandName}\`.`,
          });
        }
      }
    }
  });
}

startBot();