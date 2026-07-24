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
                  const supabase = getSupabase();

                  // A. WORKER STOCK RESTOCK via REPLY
                  // Check if message is a reply containing REF context or if the message text contains [REF:productId:colorIdx:size]
                  const refMatch = messageText.match(/\[REF:([^:]+):([^:]+):([^:]+)\]/) || 
                                   (message.context && message.context.id ? null : null);

                  if (refMatch) {
                    const productId = refMatch[1];
                    const colorIdx = parseInt(refMatch[2]);
                    const size = refMatch[3];
                    const addedQty = parseInt(messageText.replace(/\D/g, ''));

                    if (!isNaN(addedQty) && addedQty > 0) {
                      const { data: product } = await supabase.from('products').select('*').eq('id', productId).single();
                      if (product && Array.isArray(product.colorVariants) && product.colorVariants[colorIdx]) {
                        const updatedVariants = [...product.colorVariants];
                        const currentQty = updatedVariants[colorIdx].stock?.[size] || 0;
                        const newQty = currentQty + addedQty;

                        updatedVariants[colorIdx] = {
                          ...updatedVariants[colorIdx],
                          stock: {
                            ...(updatedVariants[colorIdx].stock || {}),
                            [size]: newQty
                          }
                        };

                        await supabase.from('products').update({ colorVariants: updatedVariants }).eq('id', productId);
                        await sendWhatsAppMessage(fromPhone, `✅ تم تحديث السطوك بنجاح! تم إضافة +${addedQty} حبة للمنتج "${product.title}" (${updatedVariants[colorIdx].name} - ${size}). السطوك الحالي الآن: ${newQty} حبة.`);
                        continue;
                      }
                    }
                  }

                  // B. CUSTOMER ORDER CONFIRMATION / CANCELLATION / AI SALES
                  const { data: order } = await supabase
                    .from('orders')
                    .select('*')
                    .ilike('whatsapp', `%${fromPhone.replace(/^\+?213/, '0')}%`)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                  let prompt = `رسالة الزبون: "${messageText}"`;
                  if (order) {
                    prompt += `\nمعلومات طلب الزبون الحالي:
- الاسم: ${order.nom}
- رقم الطلب: ${order.id}
- الولاية: ${order.wilaya}
- الحالة الحالية: ${order.status}`;
                    
                    const textLower = messageText.toLowerCase();
                    const isConfirmation = ["ok", "oui", "daweq", "sah", "confirm", "نعم", "اوكي", "أكدي", "تأكيد", "موافق"].some(w => textLower.includes(w));
                    const isCancellation = ["annuler", "الغاء", "إلغاء", "حبس", "لا أريد", "non", "بطّلت"].some(w => textLower.includes(w));

                    if (isConfirmation) {
                      await supabase.from('orders').update({ status: 'Confirmé', bot_status: 'confirmed' }).eq('id', order.id);
                      await sendWhatsAppMessage(fromPhone, `شكراً لك سيد ${order.nom}! ❤️ تم تأكيد طلبيتك رقم #${order.id} بنجاح، وسنقوم بتجهيزها وشحنها لك فوراً.`);
                      continue;
                    } else if (isCancellation) {
                      await supabase.from('orders').update({ status: 'Annulé', bot_status: 'canceled' }).eq('id', order.id);
                      await sendWhatsAppMessage(fromPhone, `تم إلغاء الطلبية رقم #${order.id} بناءً على رغبتك سيد ${order.nom}. نأمل أن نخدمك في المرات القادمة! ✨`);
                      continue;
                    }
                  }

                  // C. AI SALES & RECLAMATION ASSISTANT (Gemini Powered)
                  const aiReply = await generateGeminiResponse(prompt, SYSTEM_INSTRUCTION_REPLY);
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
