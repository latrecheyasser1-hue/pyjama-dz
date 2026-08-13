import { processMessageWithAIAgent } from '../src/services/aiAgentService.js';
import { transcribeVoiceNote, getWhatsAppMediaUrl } from '../src/services/audioTranscriber.js';

const WEBHOOK_VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN || 'pyjama_dz_secret_webhook_token_2026';

export default async function handler(req, res) {
  // 1. Meta Webhook Verification (GET)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
      console.log('✅ Meta WhatsApp Webhook Verified!');
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden: Token mismatch');
  }

  // 2. Incoming WhatsApp Message Event (POST)
  if (req.method === 'POST') {
    try {
      const body = req.body;

      if (body && body.entry && body.entry[0] && body.entry[0].changes) {
        const value = body.entry[0].changes[0].value;

        if (value && value.messages && value.messages[0]) {
          const msg = value.messages[0];
          const fromPhone = msg.from; // Customer WhatsApp Phone number

          // A. Handle Incoming Text Message
          if (msg.type === 'text' && msg.text && msg.text.body) {
            console.log(`💬 Received WhatsApp Text from ${fromPhone}: ${msg.text.body}`);
            await processMessageWithAIAgent(fromPhone, msg.text.body);
          }

          // B. Handle Incoming Voice Note (Audio Vocaux)
          else if (msg.type === 'audio' || msg.type === 'voice') {
            console.log(`🎙️ Received WhatsApp Voice Note from ${fromPhone}`);
            const audioId = msg.audio?.id || msg.voice?.id;
            const transcribedText = await transcribeVoiceNote(audioId);
            console.log(`🗣️ Transcribed Voice Note: ${transcribedText}`);
            await processMessageWithAIAgent(fromPhone, transcribedText);
          }
        }
      }

      return res.status(200).json({ status: 'success' });
    } catch (err) {
      console.error('Error handling WhatsApp webhook event:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
