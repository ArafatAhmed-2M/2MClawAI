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

  // --- BOT PLATFORM SELECTION ---
  console.log('Which bot platform would you like to connect?');
  console.log('1) Telegram');
  console.log('2) Discord');
  console.log('3) Both');
  console.log('4) Skip for now');
  const botChoice = await askQuestion('\nEnter choice (1-4): ');

  if (botChoice === '1' || botChoice === '3') {
    const token = await askQuestion('📱 Enter Telegram Bot Token: ');
    updateEnv('TELEGRAM_BOT_TOKEN', token);
  }
  if (botChoice === '2' || botChoice === '3') {
    const token = await askQuestion('🎮 Enter Discord Bot Token: ');
    updateEnv('DISCORD_BOT_TOKEN', token);
  }

  // --- AI PROVIDER SELECTION ---
  console.log('\nWhich AI Provider do you want to use?');
  console.log('1) Groq (Fastest & Free)');
  console.log('2) Gemini (Google AI Studio)');
  console.log('3) OpenRouter (Multiple Models)');
  console.log('4) OpenAI');
  console.log('5) Skip / Configure later');
  const providerChoice = await askQuestion('\nEnter choice (1-5): ');

  if (providerChoice === '1') {
    const key = await askQuestion('🚀 Enter Groq API Key: ');
    updateEnv('GROQ_API_KEY', key);
    updateEnv('DEFAULT_PROVIDER', 'groq');
  } else if (providerChoice === '2') {
    const key = await askQuestion('🧠 Enter Gemini API Key: ');
    updateEnv('GEMINI_API_KEY', key);
    updateEnv('DEFAULT_PROVIDER', 'gemini');
  } else if (providerChoice === '3') {
    const key = await askQuestion('🌐 Enter OpenRouter API Key: ');
    updateEnv('OPENROUTER_API_KEY', key);
    updateEnv('DEFAULT_PROVIDER', 'openrouter');
  } else if (providerChoice === '4') {
    const key = await askQuestion('🤖 Enter OpenAI API Key: ');
    updateEnv('OPENAI_API_KEY', key);
    updateEnv('DEFAULT_PROVIDER', 'openai');
  }

  // Write changes
  fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf-8');

  console.log('\n==========================================');
  console.log('✅ Setup Complete! Configuration saved to .env.');
  console.log('==========================================\n');

  rl.close();
}

runSetup().catch(err => {
  console.error('Setup failed:', err);
  rl.close();
});
