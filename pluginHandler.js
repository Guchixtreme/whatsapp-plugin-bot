import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { PREFIX } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const plugins = new Map();

// Load all plugins dynamically from /plugins folder
export async function loadPlugins() {
  plugins.clear();
  const pluginDir = path.join(__dirname, 'plugins');
  
  if (!fs.existsSync(pluginDir)) {
    fs.mkdirSync(pluginDir);
  }

  const files = fs.readdirSync(pluginDir);

  for (const file of files) {
    if (file.endsWith('.js')) {
      const filePath = path.join(pluginDir, file);
      const fileUrl = pathToFileURL(filePath).href;
      
      try {
        const plugin = await import(`${fileUrl}?update=${Date.now()}`);
        if (plugin.default && plugin.default.name) {
          plugins.set(plugin.default.name.toLowerCase(), plugin.default);
          console.log(`✅ Loaded Plugin: ${plugin.default.name}`);
        }
      } catch (err) {
        console.error(`❌ Failed to load plugin ${file}:`, err);
      }
    }
  }
}

// Route incoming messages to the right plugin
export async function handleCommand(sock, msg, body) {
  const args = body.slice(PREFIX.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const plugin = plugins.get(commandName);

  if (!plugin) return;

  try {
    await plugin.execute({ sock, msg, args, body, plugins });
  } catch (error) {
    console.error(`Error running command [${commandName}]:`, error);
    await sock.sendMessage(msg.key.remoteJid, {
      text: `⚠️ Error executing command: ${error.message}`,
    });
  }
}