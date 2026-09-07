import fetch from 'node-fetch';

export default {
  name: 'dl',
  description: 'Universal downloader for TikTok, Twitter/X, YouTube & Instagram (!dl <url>)',
  async execute({ sock, msg, args }) {
    const jid = msg.key.remoteJid;
    const url = args[0];

    if (!url) {
      return sock.sendMessage(jid, {
        text: '❌ Please provide a media URL.\n\n*Example:* `!dl https://vm.tiktok.com/XYZ`',
      });
    }

    await sock.sendMessage(jid, { text: '⏳ Fetching media...' });

    try {
      // 1. TikTok Specialized Downloader (TikWM API)
      if (url.includes('tiktok.com')) {
        const tikRes = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
        const tikData = await tikRes.json();

        if (tikData?.data?.play) {
          const videoUrl = tikData.data.play.startsWith('http') 
            ? tikData.data.play 
            : `https://www.tikwm.com${tikData.data.play}`;

          return sock.sendMessage(jid, {
            video: { url: videoUrl },
            caption: `⚡ *TikTok Downloader*\n\n📝 ${tikData.data.title || 'Guchi X Video'}`
          });
        }
      }

      // 2. Twitter / X / YouTube / Instagram Universal Engine (Cobalt)
      const cobaltRes = await fetch('https://api.cobalt.tools/', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        body: JSON.stringify({
          url: url,
          videoQuality: '720'
        })
      });

      const cobaltData = await cobaltRes.json();

      if (cobaltData?.url) {
        return sock.sendMessage(jid, {
          video: { url: cobaltData.url },
          caption: '⚡ *Guchi X Downloader*'
        });
      }

      // If both fail, print the raw response in terminal for debugging
      console.log('🔴 DL Error response:', { tikData: tikRes || null, cobaltData });
      await sock.sendMessage(jid, { text: '❌ Unable to extract media from this URL. Link may be private or restricted.' });

    } catch (error) {
      console.error('🔴 DL Plugin Exception:', error);
      await sock.sendMessage(jid, { text: '⚠️ Failed to process download request.' });
    }
  }
};