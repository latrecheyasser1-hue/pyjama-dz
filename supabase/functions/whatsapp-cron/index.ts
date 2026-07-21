import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getSupabase } from "../_shared/supabase.ts";
import { generateGeminiResponse } from "../_shared/gemini.ts";
import { sendWhatsAppTemplate } from "../_shared/meta.ts";

const SYSTEM_INSTRUCTION_30M = `أنت مساعد ذكي لمتجر بيجامات نسائية جزائري (Pyjama DZ).
قم بكتابة رسالة تأكيد للزبونة بالدارجة الجزائرية المحترمة جدا.
الهدف: إشعارها بأن طلبيتها قيد المعالجة وأننا ننتظر ردها لتأكيد الطلبية (مثلا بالقول 'أوكي' أو 'أكديلي').
القواعد:
1. يجب أن تكون الرسالة قصيرة، ودية، ومباشرة.
2. لا تستخدم قوالب جاهزة، بل اجعلها تبدو كأن إنسان حقيقي كتبها.
3. اذكر اسم الزبونة، المنتج الذي طلبته، ولونه ومقاسه، وولايتها.
4. النص الناتج سيتم وضعه داخل قالب رسالة جاهز في واتساب (لأنها الرسالة الأولى). النص يجب أن يكون فقرة واحدة متصلة.`;

const SYSTEM_INSTRUCTION_3H = `أنت مساعد ذكي لمتجر بيجامات نسائية جزائري (Pyjama DZ).
الزبونة قامت بطلب منذ أكثر من 3 ساعات ولم تقم بالرد لتأكيد الطلبية بعد رسالتنا الأولى.
قم بكتابة رسالة تذكيرية بالدارجة الجزائرية المحترمة.
الهدف: تذكيرها بلطف بأننا ننتظر تأكيدها لكي لا يتم إلغاء الطلبية.
القواعد:
1. كن ودوداً جداً ومحترماً، ربما كانت مشغولة.
2. اذكر المنتج.
3. النص سيكون فقرة واحدة.`;

serve(async (req) => {
  try {
    const supabase = getSupabase();

    // 1. Handle Cancellations (48 hours)
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    
    const { data: expiredOrders, error: expError } = await supabase
      .from('orders')
      .select('id, bot_contact_attempts')
      .eq('bot_status', 'pending_3h')
      .lt('bot_last_contacted_at', fortyEightHoursAgo);

    if (expiredOrders && expiredOrders.length > 0) {
      for (const order of expiredOrders) {
        await supabase.from('orders').update({
          status: 'Annulé',
          bot_status: 'cancelled_no_reply'
        }).eq('id', order.id);
        console.log(`Order ${order.id} cancelled due to no reply after 48h.`);
      }
    }

    // 2. Handle 3-Hour Reminders
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    
    const { data: reminderOrders, error: remError } = await supabase
      .from('orders')
      .select('*')
      .eq('bot_status', 'pending_3h')
      .lt('bot_last_contacted_at', threeHoursAgo);

    if (reminderOrders && reminderOrders.length > 0) {
      for (const order of reminderOrders) {
        // Prevent infinite loops, max 2 reminders
        if (order.bot_contact_attempts >= 3) continue;

        const prompt = `اسم الزبونة: ${order.nom}\nالمنتج: ${order.product_id}\nاللون: ${order.couleur}\nالمقاس: ${order.taille}\nالولاية: ${order.wilaya}\nالوقت الحالي: ${new Date().toLocaleTimeString('ar-DZ')}`;
        
        const aiMessage = await generateGeminiResponse(prompt, SYSTEM_INSTRUCTION_3H);
        
        if (aiMessage) {
          // Send via WhatsApp (assuming you have an approved template named 'order_reminder' with 1 body variable)
          const sent = await sendWhatsAppTemplate(order.whatsapp, "order_reminder", [aiMessage]);
          
          if (sent) {
            await supabase.from('orders').update({
              bot_last_contacted_at: new Date().toISOString(),
              bot_contact_attempts: order.bot_contact_attempts + 1
            }).eq('id', order.id);
            console.log(`Sent 3h reminder for order ${order.id}`);
          }
        }
      }
    }

    // 3. Handle First Contact (30 mins)
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    
    const { data: newOrders, error: newError } = await supabase
      .from('orders')
      .select('*')
      .eq('bot_status', 'pending_30m')
      .lt('created_at', thirtyMinsAgo);

    if (newOrders && newOrders.length > 0) {
      for (const order of newOrders) {
        const prompt = `اسم الزبونة: ${order.nom}\nالمنتج: ${order.product_id}\nاللون: ${order.couleur}\nالمقاس: ${order.taille}\nالولاية: ${order.wilaya}\nالوقت الحالي: ${new Date().toLocaleTimeString('ar-DZ')}`;
        
        const aiMessage = await generateGeminiResponse(prompt, SYSTEM_INSTRUCTION_30M);
        
        if (aiMessage) {
          // Send via WhatsApp (assuming you have an approved template named 'order_confirmation' with 1 body variable)
          const sent = await sendWhatsAppTemplate(order.whatsapp, "order_confirmation", [aiMessage]);
          
          if (sent) {
            await supabase.from('orders').update({
              bot_status: 'pending_3h',
              bot_last_contacted_at: new Date().toISOString(),
              bot_contact_attempts: 1
            }).eq('id', order.id);
            console.log(`Sent 30m confirmation for order ${order.id}`);
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, message: "Cron executed successfully" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Cron execution error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
