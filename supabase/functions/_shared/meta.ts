export async function sendWhatsAppMessage(toPhone, messageText) {
  const token = Deno.env.get("META_WHATSAPP_TOKEN");
  const phoneNumberId = Deno.env.get("META_PHONE_NUMBER_ID");

  if (!token || !phoneNumberId) {
    console.error("Missing META_WHATSAPP_TOKEN or META_PHONE_NUMBER_ID");
    return false;
  }

  const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: toPhone,
    type: "text",
    text: {
      preview_url: false,
      body: messageText
    }
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`WhatsApp API error: ${response.status} - ${errorData}`);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Error sending WhatsApp message:", err);
    return false;
  }
}

export async function sendWhatsAppTemplate(toPhone, templateName, variables = [], languageCode = "ar") {
  const token = Deno.env.get("META_WHATSAPP_TOKEN");
  const phoneNumberId = Deno.env.get("META_PHONE_NUMBER_ID");

  if (!token || !phoneNumberId) {
    console.error("Missing META_WHATSAPP_TOKEN or META_PHONE_NUMBER_ID");
    return false;
  }

  const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

  const parameters = variables.map(v => ({ type: "text", text: v }));

  const payload = {
    messaging_product: "whatsapp",
    to: toPhone,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: languageCode
      },
      components: parameters.length > 0 ? [
        {
          type: "body",
          parameters: parameters
        }
      ] : []
    }
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`WhatsApp Template API error: ${response.status} - ${errorData}`);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Error sending WhatsApp template:", err);
    return false;
  }
}
