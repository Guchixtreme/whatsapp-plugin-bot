import { downloadContentFromMessage } from '@whiskeysockets/baileys';

export default {
  name: 'antiviewonce',
  description: 'Captures View Once media when replied to',
  async execute({ sock, msg }) {
    try {
      const messageContent = msg.message;
      if (!messageContent) return;

      // Extract quoted context across all possible message types (text, sticker, image, video)
      const contextInfo =
        messageContent.extendedTextMessage?.contextInfo ||
        messageContent.stickerMessage?.contextInfo ||
        messageContent.imageMessage?.contextInfo ||
        messageContent.videoMessage?.contextInfo;

      const quotedMsg = contextInfo?.quotedMessage;
      if (!quotedMsg) return;

      // Extract inner media payload from ViewOnce wrappers
      const viewOnceContent =
        quotedMsg.viewOnceMessage?.message ||
        quotedMsg.viewOnceMessageV2?.message ||
        quotedMsg.viewOnceMessageV2Extension?.message ||
        quotedMsg;

      const mediaType = viewOnceContent.imageMessage ? 'image' : viewOnceContent.videoMessage ? 'video' : null;
      if (!mediaType) return;

      const mediaObject = viewOnceContent.imageMessage || viewOnceContent.videoMessage;

      console.log(`⚡ ViewOnce detected! Decrypting ${mediaType}...`);

      // Stream media buffer directly using Baileys stream decoder
      const stream = await downloadContentFromMessage(mediaObject, mediaType);
      let buffer = Buffer.alloc(0);

      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      // Target private owner chat JID
      const ownerJid = sock.user.id.split(':')[0] + '@s.whatsapp.net';
      const sender = msg.key.participant || msg.key.remoteJid;

      const captionText = `🔓 *Anti-ViewOnce Captured*\n\n👤 *Sender:* @${sender.split('@')[0]}\n💬 *Source:* ${msg.key.remoteJid.endsWith('@g.us') ? 'Group Chat' : 'Private Chat'}`;

      if (mediaType === 'image') {
        await sock.sendMessage(ownerJid, {
          image: buffer,
          caption: captionText,
          mentions: [sender]
        });
      } else if (mediaType === 'video') {
        await sock.sendMessage(ownerJid, {
          video: buffer,
          caption: captionText,
          mentions: [sender]
        });
      }

      console.log(`✅ Decrypted ViewOnce media sent to ${ownerJid}`);

    } catch (error) {
      console.error('Anti-ViewOnce Error:', error);
    }
  }
};