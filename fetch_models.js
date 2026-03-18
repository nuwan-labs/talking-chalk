import fs from 'fs';

try {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  let apiKey = '';
  for (const line of envContent.split('\\n')) {
    if (line.startsWith('GEMINI_API_KEY=')) {
      apiKey = line.substring('GEMINI_API_KEY='.length).trim();
    }
  }

  if (!apiKey) {
    console.error('API key not found');
    process.exit(1);
  }

  fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
    .then(r => r.json())
    .then(data => {
      if (data.error) {
        console.error('API Error:', data.error.message);
      } else if (data.models) {
        const geminiModels = data.models
          .filter(m => m.name.includes('gemini-3'))
          .map(m => `- ${m.name} (${m.displayName})`);
        console.log('Available Gemini 3 Series Models:\\n' + geminiModels.join('\\n'));
      } else {
        console.log('Unexpected response:', data);
      }
      process.exit(0);
    })
    .catch(err => {
      console.error('Fetch error:', err);
      process.exit(1);
    });
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
