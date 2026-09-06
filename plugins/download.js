import fetch from 'node-fetch';

export default {
  name: 'dl',
  description: 'Download media from TikTok, Twitter/X, YouTube, or search Apps',
  async execute({ sock, msg, args }) {
    const jid = msg.key.remoteJid;
    const subCommand = args[0]?.toLowerCase();
    const query = args.slice(1).join(' ');

    if (!subCommand) {
      const menuText = `📥 *DOWNLOAD CENTER*\n\n` +
        `• *!dl tiktok <link>*: Download TikTok video without watermark\n` +
        `• *!dl twitter <link>*: Download Twitter/X video\n` +
        `• *!dl song <title/link>*: Download MP3 audio\n\n` +
        `_Example: !dl tiktok https://vt.tiktok.com/..._`;

      return sock.sendMessage(jid, { text: menuText });
    }

    if (!query) {
      return sock.sendMessage(jid, { text: `⚠️ Please provide a link or search query.` });
    }

    await sock.sendMessage(jid, { text: '⏳ Processing your download request...' });

    try {
      switch (subCommand) {
        case 'tiktok': {
          const res = await fetch(`https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(query)}`);
          const data = await res.json();
          const videoUrl = data.video?.noWatermark || data.video?.watermark;

          if (!videoUrl) throw new Error('Could not fetch TikTok video.');

          await sock.sendMessage(jid, {
            video: { url: videoUrl },
            caption: `🎵 *TikTok Download*\n👤 Author: ${data.author?.name || 'N/A'}`
          });
          break;
        }

        case 'twitter':
        case 'x': {
          const res = await fetch(`https://api.twitsave.com/api/download?url=${encodeURIComponent(query)}`);
          const data = await res.json();
          const videoUrl = data.download_url || data.media_url;

          if (!videoUrl) throw new Error('Could not fetch Twitter video.');

          await sock.sendMessage(jid, {
            video: { url: videoUrl },
            caption: `🐦 *Twitter/X Media Download*`
          });
          break;
        }

        default:
          await sock.sendMessage(jid, { text: '❌ Invalid download command. Type `!dl` to see options.' });
      }
    } catch (error) {
      await sock.sendMessage(jid, { text: `❌ Download failed: ${error.message}` });
    }
  }
};