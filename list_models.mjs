import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getApiKey() {
  const envLocalPath = path.join(__dirname, '.env.local');
  const envPath = path.join(__dirname, '.env');
  
  let key = process.env.GEMINI_API_KEY;
  
  if (!key && fs.existsSync(envLocalPath)) {
    const content = fs.readFileSync(envLocalPath, 'utf8');
    const match = content.match(/GEMINI_API_KEY=([^\r\n]+)/);
    if (match) key = match[1];
  }
  
  if (!key && fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/GEMINI_API_KEY=([^\r\n]+)/);
    if (match) key = match[1];
  }
  return key;
}

const apiKey = getApiKey();

if (!apiKey) {
  console.error("Could not find GEMINI_API_KEY in .env or .env.local");
  process.exit(1);
}

try {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
  const data = await response.json();
  
  if (data.models) {
    const modelInfo = data.models
      .filter((m) => m.name.includes("gemini"))
      .map((m) => `- Name: ${m.name} (Display: ${m.displayName})`);
    console.log("Available Gemini Models:\\n" + modelInfo.join("\\n"));
  } else {
    console.log("Received unexpected format:", JSON.stringify(data, null, 2));
  }
} catch (error) {
  console.error("Error fetching models:", error);
}
