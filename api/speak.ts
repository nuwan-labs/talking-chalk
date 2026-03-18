export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: 'Missing text parameter' });
  }
  
  if (!process.env.ELEVENLABS_API_KEY) {
    return res.status(500).json({ error: 'Missing ElevenLabs API Key in Vercel environment' });
  }

  // A default playful/optimistic voice (e.g. Adam or Gigi). 
  // Can be swapped out for a fully custom cloned voice later.
  const voiceId = "pNInz6obpgDQGcFmaJcg";
  
  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: errText });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', buffer.length.toString());
    res.end(buffer);

  } catch (error: any) {
    console.error("ElevenLabs API Error:", error);
    res.status(500).json({ error: error.message });
  }
}
