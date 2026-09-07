import fetch from 'node-fetch';

export default {
  name: 'dl',
  description: 'Universal media downloader (!dl <url>)',
  async execute({ sock, msg, args }) {
    const jid = msg.key.remoteJid;
    const url = args[0];

    if (!url) {
      return sock.sendMessage(jid, {
        text: '❌ Please provide a link.\n\n*Example:* `!dl https://vm.tiktok.com/XYZ`',
      });
    }

    await sock.sendMessage(jid, { text: '⏳ Fetching media...' });

    try {
      // 1. TikTok Engine
      if (url.includes('tiktok.com')) {
        const response = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
        const json = await response.json();

        if (json?.data?.play) {
          const videoUrl = json.data.play.startsWith('http')
            ? json.data.play
            : `https://www.tikwm.com${json.data.play}`;

          return sock.sendMessage(jid, {
            video: { url: videoUrl },
            caption: `⚡ *TikTok Video*\n\n📝 ${json.data.title || 'Guchi X Video'}`
          });
        }
      }

      // 2. Twitter / Instagram / YouTube Engine
      const res = await fetch(`https://api.vkrdown.com/v2/download?url=${encodeURIComponent(url)}`);
      const data = await res.json();

      if (data?.data?.downloads?.[0]?.url) {
        return sock.sendMessage(jid, {
          video: { url: data.data.downloads[0].url },
          caption: '⚡ *Guchi X Media Downloader*'
        });
      }

      await sock.sendMessage(jid, { text: '❌ Could not extract media from that link.' });

    } catch (error) {
      console.error('DL Plugin Error:', error);
      await sock.sendMessage(jid, { text: '⚠️ Failed to process download request.' });
    }
  }
};