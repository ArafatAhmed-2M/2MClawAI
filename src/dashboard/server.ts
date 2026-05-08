import express from 'express';
import cors from 'cors';
import path from 'path';
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
    const dashboardPath = path.join(__dirname, '../../../dashboard');
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
            { id: 'ollama', name: 'Ollama (Local)' }
        ]);
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
