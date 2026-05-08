import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { createServer } from 'http';
import { Server } from 'socket.io';

export class DashboardServer {
  public static start(port: number) {
    const app = express();
    const server = createServer(app);
    const io = new Server(server, { cors: { origin: '*' } });

    app.use(cors());
    app.use(express.json());

    // Serve static frontend files
    const dashboardPath = path.join(__dirname, '../../dashboard');
    app.use(express.static(dashboardPath));

    // API Routes for Dashboard
    app.get('/api/status', (req, res) => {
      res.json({ status: 'online', version: '1.0.0', memory_size: 1024 });
    });

    app.get('/api/llm/providers', (req, res) => {
        res.json([
            { id: 'openai', name: 'OpenAI (GPT-4)' },
            { id: 'claude', name: 'Anthropic (Claude 3)' },
            { id: 'gemini', name: 'Google (Gemini Pro)' },
            { id: 'groq', name: 'Groq (Llama 3)' },
            { id: 'ollama', name: 'Ollama (Local)' },
            { id: 'openrouter', name: 'OpenRouter' },
            { id: 'deepseek', name: 'DeepSeek' },
            { id: 'cohere', name: 'Cohere' },
            { id: 'huggingface', name: 'Hugging Face' },
            { id: 'together', name: 'Together AI' },
            { id: 'custom', name: 'Custom Model Endpoint' }
        ]);
    });

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
            CUSTOM_API_KEY: process.env.CUSTOM_API_KEY || ''
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

            fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf-8');
            res.json({ success: true });
        } catch(e) {
            console.error('Failed to save .env', e);
            res.status(500).json({ success: false });
        }
    });

    // WebSocket for Real-time chat history
    io.on('connection', (socket) => {
      console.log('🔌 Dashboard client connected.');
      socket.emit('log', { message: 'Connected to 2M Claw Backend' });
    });

    server.listen(port, () => {
      console.log(`\n🚀 [Web UI] Dashboard running at: http://localhost:${port}`);
      console.log(`👉 Press Ctrl+C to stop.\n`);
    });
  }
}
