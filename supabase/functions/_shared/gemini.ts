export async function generateGeminiResponse(prompt, systemInstruction = "") {
  // Pool of up to 10 keys (configure these in Supabase dashboard)
  const keys = [];
  for (let i = 1; i <= 10; i++) {
    const key = Deno.env.get(`GEMINI_API_KEY_${i}`);
    if (key) keys.push(key);
  }
  
  if (keys.length === 0) {
    // Fallback to single key if defined
    const singleKey = Deno.env.get("GEMINI_API_KEY");
    if (singleKey) keys.push(singleKey);
  }

  if (keys.length === 0) {
    throw new Error("No Gemini API keys found in environment variables.");
  }

  // Randomly select a key to distribute the load (basic rotation)
  const selectedKey = keys[Math.floor(Math.random() * keys.length)];
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${selectedKey}`;

  const requestBody = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ],
    systemInstruction: systemInstruction ? {
      parts: [{ text: systemInstruction }]
    } : undefined,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 250,
    }
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Gemini API Error:", errorData);
      throw new Error(`Gemini API returned ${response.status}: ${errorData}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (err) {
    console.error("Error generating text:", err);
    return null;
  }
}
