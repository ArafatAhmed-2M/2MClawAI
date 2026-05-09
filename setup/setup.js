const fs = require('fs');
const path = require('path');
const readline = require('readline');

const envPath = path.join(__dirname, '../.env');
const envExamplePath = path.join(__dirname, '../.env.example');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function runSetup() {
  console.log('\n==========================================');
  console.log('      🐾 2M Claw - Terminal Setup 🐾      ');
  console.log('==========================================\n');

  // Ensure .env exists
  if (!fs.existsSync(envPath)) {
    console.log('Creating .env file from .env.example...');
    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
    } else {
      fs.writeFileSync(envPath, 'PORT=3000\nNODE_ENV=development\n');
    }
  }

  let envContent = fs.readFileSync(envPath, 'utf-8');

  function updateEnv(key, value) {
    if (!value) return;
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}`;
    }
  }

  console.log('Leave blank and press Enter to skip any setting.\n');

  // Ask for Bot Tokens
  const telegramToken = await askQuestion('📱 Enter Telegram Bot Token (from @BotFather): ');
  updateEnv('TELEGRAM_BOT_TOKEN', telegramToken);

  const discordToken = await askQuestion('🎮 Enter Discord Bot Token: ');
  updateEnv('DISCORD_BOT_TOKEN', discordToken);

  console.log('\n--- AI Providers ---');
  const groqKey = await askQuestion('🚀 Enter Groq API Key (Fastest & Free): ');
  updateEnv('GROQ_API_KEY', groqKey);

  const geminiKey = await askQuestion('🧠 Enter Gemini API Key (Google AI Studio): ');
  updateEnv('GEMINI_API_KEY', geminiKey);

  const openrouterKey = await askQuestion('🌐 Enter OpenRouter API Key: ');
  updateEnv('OPENROUTER_API_KEY', openrouterKey);

  const openaiKey = await askQuestion('🤖 Enter OpenAI API Key: ');
  updateEnv('OPENAI_API_KEY', openaiKey);

  // Write changes
  fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf-8');

  console.log('\n==========================================');
  console.log('✅ Setup Complete! Configuration saved to .env.');
  console.log('You can also configure more keys anytime via the Web Dashboard at http://localhost:3000');
  console.log('To start the bot, run: npm run dev');
  console.log('==========================================\n');

  rl.close();
}

runSetup().catch(err => {
  console.error('Setup failed:', err);
  rl.close();
});
