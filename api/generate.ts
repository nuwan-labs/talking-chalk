import { GoogleGenAI, Type } from "@google/genai";

const strokeSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      type: { type: Type.STRING, description: "oval, arc, line, or path" },
      label: { type: Type.STRING },
      thought: { type: Type.STRING, description: "Socratic explanation or question for the student" },
      phase: { type: Type.INTEGER, description: "1 (Ghost), 2 (Construction), 3 (Defining), 5 (Detail)" },
      cx: { type: Type.NUMBER }, cy: { type: Type.NUMBER },
      rx: { type: Type.NUMBER }, ry: { type: Type.NUMBER },
      rotation: { type: Type.NUMBER },
      startDeg: { type: Type.NUMBER }, endDeg: { type: Type.NUMBER },
      x1: { type: Type.NUMBER }, y1: { type: Type.NUMBER },
      x2: { type: Type.NUMBER }, y2: { type: Type.NUMBER },
      points: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } } } }
    },
    required: ["type", "label", "phase"]
  }
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { image } = req.body;

  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Missing Gemini API Key in Vercel environment' });
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  try {
    const responseStream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: [
        { inlineData: { mimeType: "image/jpeg", data: image } },
        `Look at the chalkboard. A child is drawing. Add 1 to 3 simple, fun chalk strokes to continue their drawing or add a playful detail. DO NOT draw a complete picture.`
      ],
      config: {
        systemInstruction: `You are a magical, playful chalkboard companion for a child. You share this edgeless digital canvas.
Canvas: [0,0]=top-left [1,1]=bottom-right. 
CRITICAL SPATIAL AWARENESS: Look at the provided image. DO NOT draw over the child's lines. Find empty space nearby or logically connect to their drawing (e.g., adding a hat to their circle, or a star in the sky).

Pedagogy & Play:
- Be highly interactive and iterative.
- Add ONLY 1 to 3 simple strokes. Keep it sketchy and fun.
- Use the 'thought' property to say something encouraging, funny, or curious to the child (e.g., "Is that a monster? Let's give him a friend!").

Stroke types:
- oval: cx, cy, rx, ry, rotation
- arc: cx, cy, rx, ry, startDeg, endDeg
- line: x1, y1, x2, y2
- path: points [{x,y},...] (MANDATORY for organic forms)

Phases:
Always use phase 3 (Defining Strokes) or 5 (Detail) so it's visible.

CRITICAL RULES:
- Keep it extremely simple. 1 to 3 strokes max.
- Start the JSON array immediately. No preamble.`,
        responseMimeType: "application/json",
        responseSchema: strokeSchema,
        temperature: 0.8,
      }
    });

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');

    for await (const chunk of responseStream) {
      if (chunk.text) {
        res.write(chunk.text);
      }
    }
    
    res.end();
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    } else {
      res.end();
    }
  }
}
