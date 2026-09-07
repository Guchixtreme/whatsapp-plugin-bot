import fetch from 'node-fetch';

export default {
  name: 'dl',
  description: 'Universal media downloader for TikTok, Twitter, Instagram & YouTube (!dl <url>)',
  async execute({ sock, msg, args }) {
    const jid = msg.key.remoteJid;
    const url = args[0];

    if (!url) {
      return sock.sendMessage(jid, { 
        text: '❌ Please provide a media URL.\n\n*Example:* `!dl https://vm.tiktok.com/XYZ` or `!dl https://youtu.be/XYZ`' 
      });
    }

    await sock.sendMessage(jid, { text: '⏳ Fetching media...' });

    try {
      // 1. YouTube Downloader Flow
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const res = await fetch(`https://api.cobalt.tools/api/json`, {
          method: 'POST',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: url })
        });
        const data = await res.json();

        if (data.url) {
          return sock.sendMessage(jid, { 
            video: { url: data.url }, 
            caption: '🎥 *Guchi X YouTube Downloader*' 
          });
        }
      }

      // 2. TikTok / Twitter / Instagram Universal Fallback
      const res = await fetch(`https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(url)}`);
      const data = await res.json();

      if (data.video?.noWatermark) {
        return sock.sendMessage(jid, { 
          video: { url: data.video.noWatermark }, 
          caption: `🎥 *${data.title || 'Guchi X Downloader'}*` 
        });
      }

      await sock.sendMessage(jid, { text: '❌ Could not extract video from that link. Please try another URL.' });

    } catch (error) {
      console.error('Download error:', error);
      await sock.sendMessage(jid, { text: '⚠️ Failed to process download request.' });
    }
  }
};