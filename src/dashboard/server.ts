import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { LLMService } from '../llm/LLMService';
import { globalMemory } from '../memory/LongTermMemory';
import { BotRegistry } from '../bots/BotRegistry';
import { globalCronManager } from '../memory/CronManager';
import { globalSkillLoader } from '../skills/SkillLoader';

export class DashboardServer {
  public static start(port: number) {
    const app = express();
    const server = createServer(app);
    const io = new Server(server, { cors: { origin: '*' } });

    app.use(cors());
    app.use(express.json());

    // Serve static frontend files
    const dashboardPath = path.join(__dirname, '../../dashboard');
    app.use(express.static(dashboardPath, {
      setHeaders: (res) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    }));

    // API Routes for Dashboard
    app.get('/api/status', (req, res) => {
      res.json({ status: 'online', version: '1.0.0', memory_size: 1024 });
    });

    app.get('/api/llm/providers', (req, res) => {
        const getModels = (envStr: string, defaultModels: string) => {
            const str = process.env[envStr] === undefined ? defaultModels : process.env[envStr];
            return str.split(',').map(s => s.trim()).filter(Boolean).map(id => ({ id, name: id }));
        };

        res.json([
            { id: 'openai', name: 'OpenAI', models: getModels('OPENAI_MODELS', 'gpt-4o,gpt-5-turbo') },
            { id: 'claude', name: 'Anthropic (Claude)', models: getModels('CLAUDE_MODELS', 'claude-3-opus,claude-3-sonnet') },
            { id: 'gemini', name: 'Google (Gemini)', models: getModels('GEMINI_MODELS', 'gemini-3.1-pro-preview,gemini-3-flash-preview,gemini-3.1-flash-lite,gemini-3.1-flash-image-preview') },
            { id: 'groq', name: 'Groq', models: getModels('GROQ_MODELS', 'llama3-70b-8192,llama3-8b-8192') },
            { id: 'ollama', name: 'Ollama', models: getModels('OLLAMA_MODELS', 'llama3,mistral') },
            { id: 'openrouter', name: 'OpenRouter', models: getModels('OPENROUTER_MODELS', 'nvidia/nemotron-3-super-120b-a12b:free,openai/gpt-oss-120b:free,google/gemma-4-26b-a4b-it:free,z-ai/glm-5.1') },
            { id: 'deepseek', name: 'DeepSeek', models: getModels('DEEPSEEK_MODELS', 'deepseek-chat,deepseek-coder') },
            { id: 'cohere', name: 'Cohere', models: getModels('COHERE_MODELS', 'command-r-plus,command-r') },
            { id: 'huggingface', name: 'Hugging Face', models: getModels('HF_MODELS', 'meta-llama/Llama-3-70b-chat-hf') },
            { id: 'together', name: 'Together AI', models: getModels('TOGETHER_MODELS', 'meta-llama/Llama-3-70b-chat-hf') },
            { id: 'custom', name: 'Custom Endpoint', models: getModels('CUSTOM_MODELS', '') }
        ]);
    });

    // --- A2A Protocol (Agent Identity Card) ---
    app.get('/.well-known/agent-card.json', (req, res) => {
        res.json({
            agent_name: "2M Claw",
            version: "1.0.0",
            protocol: "A2A",
            capabilities: [
                "read_file",
                "write_file",
                "delete_file",
                "memorize",
                "send_file"
            ],
            endpoints: {
                execute: "/api/webhook/execute"
            }
        });
    });

    // --- Webhook Ingress for External Tools (Zapier, Github Actions, etc) ---
    app.post('/api/webhook/execute', async (req, res) => {
        const { prompt, api_key } = req.body;
        
        // Simple security check (could be expanded)
        const expectedKey = process.env.WEBHOOK_SECRET || 'default-secret-2mclaw';
        if (api_key !== expectedKey) {
            return res.status(401).json({ error: 'Unauthorized: Invalid WEBHOOK_SECRET' });
        }

        if (!prompt) return res.status(400).json({ error: 'No prompt provided.' });

        console.log(`[Webhook] Incoming task received: ${prompt}`);
        res.json({ status: 'Processing started in background.' });

        try {
            const defaultProvider = process.env.DEFAULT_PROVIDER;
            const defaultModel = process.env.DEFAULT_MODEL;
            const { provider, model } = defaultProvider && defaultModel
              ? { provider: defaultProvider, model: defaultModel }
              : LLMService.getDefaultProviderAndModel();

            // Ask the LLM to execute the webhook payload
            const reply = await LLMService.generateResponse(provider, model, `Webhook Triggered: ${prompt}`);
            
            // Execute Agent Commands if any
            const commandMatch = reply.match(/```(?:system_command|json)?\n?([\s\S]*?)\n?```/);
            let commandStr = null;
            if (commandMatch && commandMatch[1].includes('"action"')) {
                commandStr = commandMatch[1];
            } else {
                const fallbackMatch = reply.match(/({[\s\S]*?"action"[\s\S]*})/);
                if (fallbackMatch) commandStr = fallbackMatch[1];
            }

            if (commandStr) {
                const cmd = JSON.parse(commandStr);
                const targetPath = cmd.path ? path.resolve(process.cwd(), cmd.path) : '';
                
                if (cmd.action === 'write_file' && targetPath) {
                    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
                    fs.writeFileSync(targetPath, cmd.content || '', 'utf-8');
                } else if (cmd.action === 'delete_file' && targetPath) {
                    fs.unlinkSync(targetPath);
                } else if (cmd.action === 'memorize') {
                    globalMemory.addFact(cmd.fact);
                }
                console.log(`[Webhook] Executed background action: ${cmd.action}`);
            }
        } catch (err: any) {
            console.error('[Webhook] Background execution failed:', err.message);
        }
    });

    // --- Bot Connect Endpoints (no restart needed) ---
    app.post('/api/telegram/connect', (req, res) => {
        const { token } = req.body;
        if (!token) return res.status(400).json({ success: false, error: 'No token provided.' });

        process.env.TELEGRAM_BOT_TOKEN = token;
        const envPath = path.join(__dirname, '../../../.env');
        let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
        const regex = /^TELEGRAM_BOT_TOKEN=.*$/m;
        envContent = regex.test(envContent)
            ? envContent.replace(regex, `TELEGRAM_BOT_TOKEN=${token}`)
            : envContent + `\nTELEGRAM_BOT_TOKEN=${token}`;
        fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf-8');

        const bot = BotRegistry.getTelegram();
        if (!bot) return res.status(503).json({ success: false, error: 'Bot registry not ready yet. Is the server starting?' });

        try {
            bot.start(token);
            res.json({ success: true, message: '✈️ Telegram bot connected!' });
        } catch (e: any) {
            res.status(500).json({ success: false, error: e.message });
        }
    });

    app.post('/api/discord/connect', (req, res) => {
        const { token } = req.body;
        if (!token) return res.status(400).json({ success: false, error: 'No token provided.' });

        process.env.DISCORD_BOT_TOKEN = token;
        const envPath = path.join(__dirname, '../../../.env');
        let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
        const regex = /^DISCORD_BOT_TOKEN=.*$/m;
        envContent = regex.test(envContent)
            ? envContent.replace(regex, `DISCORD_BOT_TOKEN=${token}`)
            : envContent + `\nDISCORD_BOT_TOKEN=${token}`;
        fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf-8');

        const bot = BotRegistry.getDiscord();
        if (!bot) return res.status(503).json({ success: false, error: 'Bot registry not ready yet.' });

        try {
            bot.start();
            res.json({ success: true, message: '🤖 Discord bot connected!' });
        } catch (e: any) {
            res.status(500).json({ success: false, error: e.message });
        }
    });
    // ----------------------------------------------------

    // Settings API
    app.get('/api/settings/keys', (req, res) => {
        res.json({
            OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
            CLAUDE_API_KEY: process.env.CLAUDE_API_KEY || '',
            GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
            GROQ_API_KEY: process.env.GROQ_API_KEY || '',
            OLLAMA_ENDPOINT: process.env.OLLAMA_ENDPOINT || 'http://localhost:11434',
            OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || '',
            DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY || '',
            COHERE_API_KEY: process.env.COHERE_API_KEY || '',
            HF_API_KEY: process.env.HF_API_KEY || '',
            TOGETHER_API_KEY: process.env.TOGETHER_API_KEY || '',
            CUSTOM_BASE_URL: process.env.CUSTOM_BASE_URL || '',
            CUSTOM_API_KEY: process.env.CUSTOM_API_KEY || '',
            DISCORD_BOT_TOKEN: process.env.DISCORD_BOT_TOKEN || '',
            TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
            OPENAI_MODELS: process.env.OPENAI_MODELS || 'gpt-4o,gpt-5-turbo',
            CLAUDE_MODELS: process.env.CLAUDE_MODELS || 'claude-3-opus,claude-3-sonnet',
            GEMINI_MODELS: process.env.GEMINI_MODELS || 'gemini-3.1-pro-preview,gemini-3-flash-preview,gemini-3.1-flash-lite,gemini-3.1-flash-image-preview',
            GROQ_MODELS: process.env.GROQ_MODELS || 'llama3-70b-8192,llama3-8b-8192',
            OLLAMA_MODELS: process.env.OLLAMA_MODELS || 'llama3,mistral',
            OPENROUTER_MODELS: process.env.OPENROUTER_MODELS || 'nvidia/nemotron-3-super-120b-a12b:free,openai/gpt-oss-120b:free,google/gemma-4-26b-a4b-it:free,z-ai/glm-5.1',
            DEEPSEEK_MODELS: process.env.DEEPSEEK_MODELS || 'deepseek-chat,deepseek-coder',
            COHERE_MODELS: process.env.COHERE_MODELS || 'command-r-plus,command-r',
            HF_MODELS: process.env.HF_MODELS || 'meta-llama/Llama-3-70b-chat-hf',
            TOGETHER_MODELS: process.env.TOGETHER_MODELS || 'meta-llama/Llama-3-70b-chat-hf',
            CUSTOM_MODELS: process.env.CUSTOM_MODELS || ''
        });
    });

    app.post('/api/settings/keys', (req, res) => {
        const keys = req.body;
        const envPath = path.join(__dirname, '../../../.env');
        
        // Update process.env
        if(keys.OPENAI_API_KEY !== undefined) process.env.OPENAI_API_KEY = keys.OPENAI_API_KEY;
        if(keys.CLAUDE_API_KEY !== undefined) process.env.CLAUDE_API_KEY = keys.CLAUDE_API_KEY;
        if(keys.GEMINI_API_KEY !== undefined) process.env.GEMINI_API_KEY = keys.GEMINI_API_KEY;
        if(keys.GROQ_API_KEY !== undefined) process.env.GROQ_API_KEY = keys.GROQ_API_KEY;
        if(keys.OLLAMA_ENDPOINT !== undefined) process.env.OLLAMA_ENDPOINT = keys.OLLAMA_ENDPOINT;
        if(keys.OPENROUTER_API_KEY !== undefined) process.env.OPENROUTER_API_KEY = keys.OPENROUTER_API_KEY;
        if(keys.DEEPSEEK_API_KEY !== undefined) process.env.DEEPSEEK_API_KEY = keys.DEEPSEEK_API_KEY;
        if(keys.COHERE_API_KEY !== undefined) process.env.COHERE_API_KEY = keys.COHERE_API_KEY;
        if(keys.HF_API_KEY !== undefined) process.env.HF_API_KEY = keys.HF_API_KEY;
        if(keys.TOGETHER_API_KEY !== undefined) process.env.TOGETHER_API_KEY = keys.TOGETHER_API_KEY;
        if(keys.CUSTOM_BASE_URL !== undefined) process.env.CUSTOM_BASE_URL = keys.CUSTOM_BASE_URL;
        if(keys.CUSTOM_API_KEY !== undefined) process.env.CUSTOM_API_KEY = keys.CUSTOM_API_KEY;
        if(keys.DISCORD_BOT_TOKEN !== undefined) process.env.DISCORD_BOT_TOKEN = keys.DISCORD_BOT_TOKEN;
        if(keys.TELEGRAM_BOT_TOKEN !== undefined) process.env.TELEGRAM_BOT_TOKEN = keys.TELEGRAM_BOT_TOKEN;

        if(keys.OPENAI_MODELS !== undefined) process.env.OPENAI_MODELS = keys.OPENAI_MODELS;
        if(keys.CLAUDE_MODELS !== undefined) process.env.CLAUDE_MODELS = keys.CLAUDE_MODELS;
        if(keys.GEMINI_MODELS !== undefined) process.env.GEMINI_MODELS = keys.GEMINI_MODELS;
        if(keys.GROQ_MODELS !== undefined) process.env.GROQ_MODELS = keys.GROQ_MODELS;
        if(keys.OLLAMA_MODELS !== undefined) process.env.OLLAMA_MODELS = keys.OLLAMA_MODELS;
        if(keys.OPENROUTER_MODELS !== undefined) process.env.OPENROUTER_MODELS = keys.OPENROUTER_MODELS;
        if(keys.DEEPSEEK_MODELS !== undefined) process.env.DEEPSEEK_MODELS = keys.DEEPSEEK_MODELS;
        if(keys.COHERE_MODELS !== undefined) process.env.COHERE_MODELS = keys.COHERE_MODELS;
        if(keys.HF_MODELS !== undefined) process.env.HF_MODELS = keys.HF_MODELS;
        if(keys.TOGETHER_MODELS !== undefined) process.env.TOGETHER_MODELS = keys.TOGETHER_MODELS;
        if(keys.CUSTOM_MODELS !== undefined) process.env.CUSTOM_MODELS = keys.CUSTOM_MODELS;

        // Write back to .env
        let envContent = '';
        try {
            if (fs.existsSync(envPath)) {
                envContent = fs.readFileSync(envPath, 'utf-8');
            }
            
            const updateOrAdd = (key: string, value: string) => {
                const regex = new RegExp(`^${key}=.*$`, 'm');
                if (regex.test(envContent)) {
                    envContent = envContent.replace(regex, `${key}=${value}`);
                } else {
                    envContent += `\n${key}=${value}`;
                }
            };

            updateOrAdd('OPENAI_API_KEY', keys.OPENAI_API_KEY || '');
            updateOrAdd('CLAUDE_API_KEY', keys.CLAUDE_API_KEY || '');
            updateOrAdd('GEMINI_API_KEY', keys.GEMINI_API_KEY || '');
            updateOrAdd('GROQ_API_KEY', keys.GROQ_API_KEY || '');
            updateOrAdd('OLLAMA_ENDPOINT', keys.OLLAMA_ENDPOINT || 'http://localhost:11434');
            updateOrAdd('OPENROUTER_API_KEY', keys.OPENROUTER_API_KEY || '');
            updateOrAdd('DEEPSEEK_API_KEY', keys.DEEPSEEK_API_KEY || '');
            updateOrAdd('COHERE_API_KEY', keys.COHERE_API_KEY || '');
            updateOrAdd('HF_API_KEY', keys.HF_API_KEY || '');
            updateOrAdd('TOGETHER_API_KEY', keys.TOGETHER_API_KEY || '');
            updateOrAdd('CUSTOM_BASE_URL', keys.CUSTOM_BASE_URL || '');
            updateOrAdd('CUSTOM_API_KEY', keys.CUSTOM_API_KEY || '');
            updateOrAdd('DISCORD_BOT_TOKEN', keys.DISCORD_BOT_TOKEN || '');
            updateOrAdd('TELEGRAM_BOT_TOKEN', keys.TELEGRAM_BOT_TOKEN || '');

            updateOrAdd('OPENAI_MODELS', keys.OPENAI_MODELS || '');
            updateOrAdd('CLAUDE_MODELS', keys.CLAUDE_MODELS || '');
            updateOrAdd('GEMINI_MODELS', keys.GEMINI_MODELS || '');
            updateOrAdd('GROQ_MODELS', keys.GROQ_MODELS || '');
            updateOrAdd('OLLAMA_MODELS', keys.OLLAMA_MODELS || '');
            updateOrAdd('OPENROUTER_MODELS', keys.OPENROUTER_MODELS || '');
            updateOrAdd('DEEPSEEK_MODELS', keys.DEEPSEEK_MODELS || '');
            updateOrAdd('COHERE_MODELS', keys.COHERE_MODELS || '');
            updateOrAdd('HF_MODELS', keys.HF_MODELS || '');
            updateOrAdd('TOGETHER_MODELS', keys.TOGETHER_MODELS || '');
            updateOrAdd('CUSTOM_MODELS', keys.CUSTOM_MODELS || '');

            fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf-8');
            res.json({ success: true });
        } catch(e) {
            console.error('Failed to save .env', e);
            res.status(500).json({ success: false });
        }
    });

    // --- Automation / Cron API ---
    app.get('/api/cron/jobs', (req, res) => {
        res.json(globalCronManager.getAllJobs());
    });

    app.post('/api/cron/jobs', (req, res) => {
        const { name, schedule, prompt } = req.body;
        if (!name || !schedule || !prompt) return res.status(400).json({ error: 'Missing fields' });
        try {
            const job = globalCronManager.addJob(name, schedule, prompt);
            res.json(job);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    });

    app.post('/api/cron/jobs/:id/toggle', (req, res) => {
        const { id } = req.params;
        const { active } = req.body;
        globalCronManager.toggleJob(id, active);
        res.json({ success: true });
    });

    app.delete('/api/cron/jobs/:id', (req, res) => {
        const { id } = req.params;
        globalCronManager.deleteJob(id);
        res.json({ success: true });
    });

    // --- Skills API ---
    app.get('/api/skills', (req, res) => {
        const skills = globalSkillLoader.getSkills().map(s => ({
            name: s.name,
            description: s.description,
            triggers: s.triggers
        }));
        res.json(skills);
    });

    // WebSocket for Real-time chat history
    io.on('connection', (socket) => {
      console.log('🔌 Dashboard client connected.');
      socket.emit('log', { message: 'Connected to 2M Claw Backend' });

      socket.on('chat_message', async (data) => {
        const { provider, model, message } = data;

        // --- Telegram Token Quick-Connect Interceptor ---
        // Detects a Telegram bot token anywhere in the message (no keywords required)
        const telegramTokenMatch = message.match(/(\d{8,10}:[A-Za-z0-9_-]{35})/);
        if (telegramTokenMatch) {
            const token = telegramTokenMatch[1];
            process.env.TELEGRAM_BOT_TOKEN = token;

            const envPath = path.join(__dirname, '../../../.env');
            let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
            const regex = /^TELEGRAM_BOT_TOKEN=.*$/m;
            envContent = regex.test(envContent)
                ? envContent.replace(regex, `TELEGRAM_BOT_TOKEN=${token}`)
                : envContent + `\nTELEGRAM_BOT_TOKEN=${token}`;
            fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf-8');

            socket.emit('log', { message: `✈️ [Agent OS] Telegram token detected! Connecting your bot now...` });

            // Hot-connect via BotRegistry (no circular import, no restart needed)
            const telegramBot = BotRegistry.getTelegram();
            if (telegramBot) {
                try {
                    telegramBot.start(token);
                    socket.emit('chat_response', {
                        message: "✅ **Telegram Bot Connected!** Your token has been saved and the bot is live.\n\nHead to Telegram and send a message — 2M Claw will reply instantly! 🚀",
                        provider: "Agent OS",
                        model: "Core Interceptor"
                    });
                } catch (e: any) {
                    socket.emit('log', { message: `❌ [Agent OS] Token saved but bot failed to start: ${e.message}` });
                }
            } else {
                socket.emit('log', { message: `⚠️ [Agent OS] Token saved to .env but bot registry is not ready yet. The bot will connect on next startup.` });
            }
            return; // Skip LLM generation
        }
        // ------------------------------------------------

        try {
          socket.emit('chat_status', { status: 'thinking' });
          const reply = await LLMService.generateResponse(provider, model, message);
          
          // Agentic System Command Interceptor (Robust Parsing)
          let commandStr: string | null = null;
          const commandMatch = reply.match(/```(?:system_command|json)?\n?([\s\S]*?)\n?```/);
          
          if (commandMatch && commandMatch[1].includes('"action"')) {
              commandStr = commandMatch[1];
          } else {
              const fallbackMatch = reply.match(/({[\s\S]*?"action"[\s\S]*})/);
              if (fallbackMatch) commandStr = fallbackMatch[1];
          }

          if (commandStr) {
            try {
              const cmd = JSON.parse(commandStr);
              // Allow absolute paths and workspace paths (only if path is provided)
              const targetPath = cmd.path ? path.resolve(process.cwd(), cmd.path) : '';
              
              if (cmd.action === 'write_file' && targetPath) {
                fs.mkdirSync(path.dirname(targetPath), { recursive: true });
                fs.writeFileSync(targetPath, cmd.content || '', 'utf-8');
                socket.emit('log', { message: `✅ [Agent OS] Executed write_file: ${cmd.path}` });
              } else if (cmd.action === 'read_file' && targetPath) {
                const content = fs.readFileSync(targetPath, 'utf-8');
                socket.emit('log', { message: `✅ [Agent OS] Read file: ${cmd.path}\n\n${content.substring(0, 500)}${content.length > 500 ? '...' : ''}` });
              } else if (cmd.action === 'delete_file' && targetPath) {
                fs.unlinkSync(targetPath);
                socket.emit('log', { message: `✅ [Agent OS] Deleted file: ${cmd.path}` });
              } else if (cmd.action === 'memorize') {
                globalMemory.addFact(cmd.fact);
                socket.emit('log', { message: `🧠 [Agent OS] Memorized new fact: ${cmd.fact}` });
              } else {
                socket.emit('log', { message: `⚠️ [Agent OS] Unknown action: ${cmd.action}` });
              }
            } catch (e: any) {
              socket.emit('log', { message: `❌ [Agent OS] Execution Failed: ${e.message}` });
            }
          }

          socket.emit('chat_response', { message: reply, provider, model });
        } catch (err: any) {
          socket.emit('chat_error', { message: err.message || 'Unknown error occurred.' });
        }
      });
    });

    server.listen(port, () => {
      console.log(`\n🚀 [Web UI] Dashboard running at: http://localhost:${port}`);
      console.log(`👉 Press Ctrl+C to stop.\n`);
    });
  }
}
