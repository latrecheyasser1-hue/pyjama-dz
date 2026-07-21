import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSupabase } from "../_shared/supabase.ts";
import { generateGeminiResponse } from "../_shared/gemini.ts";
import { sendWhatsAppMessage } from "../_shared/meta.ts";

const SYSTEM_INSTRUCTION_REPLY = `أنت مساعد ذكي لمتجر بيجامات نسائية جزائري (Pyjama DZ).
تتحدث مع زبونة مهتمة بمنتجاتنا أو زبونة قامت بالطلب وتستفسر.
الهدف: الرد على الزبونة بأسلوب جزائري دارج محترم، الإجابة عن استفساراتها، وإذا كانت تريد تأكيد طلبيتها فقم بالترحيب وتأكيد الطلب.
يجب أن تكون الرسالة قصيرة قدر الإمكان، ودية، ومفيدة جداً.
بما أن الزبونة بدأت المحادثة (أو ردت)، يمكنك التحدث بحرية كاملة دون قيود القوالب الجاهزة.`;

serve(async (req) => {
  const url = new URL(req.url);

  // 1. Webhook Verification (Meta requires this when setting up the webhook)
  if (req.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    // The verify token you set in Meta Developer Dashboard
    const VERIFY_TOKEN = Deno.env.get("META_VERIFY_TOKEN");

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("WEBHOOK_VERIFIED");
      return new Response(challenge, { status: 200 });
    } else {
      return new Response("Forbidden", { status: 403 });
    }
  }

  // 2. Handle Incoming WhatsApp Messages
  if (req.method === "POST") {
    try {
      const body = await req.json();

      // Check if this is a WhatsApp API event
      if (body.object === "whatsapp_business_account") {
        for (const entry of body.entry) {
          for (const change of entry.changes) {
            if (change.value && change.value.messages) {
              for (const message of change.value.messages) {
                const fromPhone = message.from; // Phone number of the sender
                const messageText = message.text?.body; // The text they sent

                if (messageText) {
                  console.log(`Received message from ${fromPhone}: ${messageText}`);

                  // Find if we have a pending order for this phone
                  // (Note: in production you might want to clean the phone number format)
                  const supabase = getSupabase();
                  const { data: order } = await supabase
                    .from('orders')
                    .select('*')
                    .ilike('whatsapp', `%${fromPhone.replace(/^\+?213/, '0')}%`) // Basic matching for Algerian numbers
                    .eq('bot_status', 'pending_3h')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                  let prompt = `رسالة الزبونة: "${messageText}"`;
                  if (order) {
                    prompt += `\nمعلومات الزبونة: اسمها ${order.nom} وطلبت ${order.product_id} مقاس ${order.taille} لولاية ${order.wilaya}.`;
                    
                    // If the user said something like "ok" or "yes", update order to confirmed
                    const isConfirmation = ["ok", "oui", "daweq", "sah", "confirm", "نعم", "اوكي", "أكدي"].some(word => messageText.toLowerCase().includes(word));
                    if (isConfirmation) {
                      await supabase.from('orders').update({
                        status: 'Confirmé',
                        bot_status: 'confirmed'
                      }).eq('id', order.id);
                    }
                  }

                  // Generate reply
                  const aiReply = await generateGeminiResponse(prompt, SYSTEM_INSTRUCTION_REPLY);

                  // Send reply
                  if (aiReply) {
                    await sendWhatsAppMessage(fromPhone, aiReply);
                  }
                }
              }
            }
          }
        }
        return new Response("EVENT_RECEIVED", { status: 200 });
      } else {
        return new Response("Not Found", { status: 404 });
      }
    } catch (error) {
      console.error("Error handling webhook:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }

  return new Response("Method Not Allowed", { status: 405 });
});
