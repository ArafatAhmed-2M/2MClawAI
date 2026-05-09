import axios from 'axios';
import os from 'os';
import { globalMemory } from '../memory/LongTermMemory';

export class LLMService {
  private static getAgentSystemPrompt(): string {
    const facts = globalMemory.getFacts().map(f => `- ${f}`).join('\n');
    return `You are 2M Claw, an autonomous AI operating system. 
You can write code, edit files, execute system commands, and memorize facts about the user.
If the user asks to read, write, edit, or delete a file, OR if they ask you to SEND them a file (especially on Telegram/Discord), OR if you learn a new important fact, you MUST use the JSON format below.

\`\`\`system_command
{
  "action": "write_file" | "memorize" | "send_file" | "read_file" | "delete_file",
  "path": "filename.ext",
  "content": "text content (for write_file)",
  "fact": "fact string (for memorize)"
}
\`\`\`

CRITICAL RULES:
1. **Sending Files**: If a user on Telegram/Discord says "send me the file", use action: "send_file".
2. **First Time Creation**: If you need to create a file before sending it, use action: "write_file" in your first response, and then tell the user you've created it. In the next turn, use action: "send_file".
3. **Paths**: Always use relative paths from the current directory unless told otherwise.
4. **Agent OS Interceptor**: The backend automatically intercepts these JSON blocks. Do not include them in normal conversation unless you want to trigger an action.

ENVIRONMENT CONTEXT:
- Current Working Directory: ${process.cwd()}
- User Home Directory: ${os.homedir()}

USER MEMORY (FACTS):
${facts || 'No facts memorized yet.'}

You are the 2M Claw OS. Be helpful, autonomous, and professional.`;
  }

  /**
   * Returns the first configured provider+model based on what API keys are set.
   * Priority: openrouter > groq > deepseek > together > claude > gemini > cohere > huggingface > ollama > openai > custom
   * Falls back to openai if nothing is found (will give a clear key-missing error).
   */
  public static getDefaultProviderAndModel(): { provider: string; model: string } {
    const env = process.env;
    if (env.OPENROUTER_API_KEY && env.OPENROUTER_API_KEY.length > 10 && !env.OPENROUTER_API_KEY.includes('your_')) {
      const model = (env.OPENROUTER_MODELS || 'openai/gpt-4o-mini').split(',')[0].trim();
      return { provider: 'openrouter', model };
    }
    if (env.GROQ_API_KEY && env.GROQ_API_KEY.length > 10 && !env.GROQ_API_KEY.includes('your_')) {
      const model = (env.GROQ_MODELS || 'llama3-70b-8192').split(',')[0].trim();
      return { provider: 'groq', model };
    }
    if (env.DEEPSEEK_API_KEY && env.DEEPSEEK_API_KEY.length > 10 && !env.DEEPSEEK_API_KEY.includes('your_')) {
      const model = (env.DEEPSEEK_MODELS || 'deepseek-chat').split(',')[0].trim();
      return { provider: 'deepseek', model };
    }
    if (env.TOGETHER_API_KEY && env.TOGETHER_API_KEY.length > 10 && !env.TOGETHER_API_KEY.includes('your_')) {
      const model = (env.TOGETHER_MODELS || 'meta-llama/Llama-3-70b-chat-hf').split(',')[0].trim();
      return { provider: 'together', model };
    }
    if (env.CLAUDE_API_KEY && env.CLAUDE_API_KEY.length > 10 && !env.CLAUDE_API_KEY.includes('your_')) {
      const model = (env.CLAUDE_MODELS || 'claude-3-sonnet').split(',')[0].trim();
      return { provider: 'claude', model };
    }
    if (env.GEMINI_API_KEY && env.GEMINI_API_KEY.length > 10 && !env.GEMINI_API_KEY.includes('your_')) {
      const model = (env.GEMINI_MODELS || 'gemini-3-flash-preview').split(',')[0].trim();
      return { provider: 'gemini', model };
    }
    if (env.COHERE_API_KEY && env.COHERE_API_KEY.length > 10 && !env.COHERE_API_KEY.includes('your_')) {
      const model = (env.COHERE_MODELS || 'command-r').split(',')[0].trim();
      return { provider: 'cohere', model };
    }
    if (env.HF_API_KEY && env.HF_API_KEY.length > 10 && !env.HF_API_KEY.includes('your_')) {
      const model = (env.HF_MODELS || 'meta-llama/Llama-3-70b-chat-hf').split(',')[0].trim();
      return { provider: 'huggingface', model };
    }
    if (env.OLLAMA_ENDPOINT && env.OLLAMA_ENDPOINT.length > 5) {
      const model = (env.OLLAMA_MODELS || 'llama3').split(',')[0].trim();
      return { provider: 'ollama', model };
    }
    if (env.CUSTOM_BASE_URL && env.CUSTOM_BASE_URL.length > 5) {
      const model = (env.CUSTOM_MODELS || 'custom').split(',')[0].trim();
      return { provider: 'custom', model };
    }
    if (env.OPENAI_API_KEY && env.OPENAI_API_KEY.length > 10 && !env.OPENAI_API_KEY.includes('your_')) {
      const model = (env.OPENAI_MODELS || 'gpt-4o').split(',')[0].trim();
      return { provider: 'openai', model };
    }
    // Nothing configured — return openai so the user gets a clear "key missing" error
    return { provider: 'openai', model: 'gpt-4o' };
  }

  public static async generateResponse(provider: string, model: string, prompt: string): Promise<string> {
    try {
      switch (provider) {
        case 'openai':
          return await this.openAiCompatible('https://api.openai.com/v1/chat/completions', process.env.OPENAI_API_KEY, model, prompt);
        case 'openrouter':
          return await this.openAiCompatible('https://openrouter.ai/api/v1/chat/completions', process.env.OPENROUTER_API_KEY, model, prompt);
        case 'deepseek':
          return await this.openAiCompatible('https://api.deepseek.com/v1/chat/completions', process.env.DEEPSEEK_API_KEY, model, prompt);
        case 'groq':
          return await this.openAiCompatible('https://api.groq.com/openai/v1/chat/completions', process.env.GROQ_API_KEY, model, prompt);
        case 'together':
          return await this.openAiCompatible('https://api.together.xyz/v1/chat/completions', process.env.TOGETHER_API_KEY, model, prompt);
        case 'custom':
          const baseUrl = process.env.CUSTOM_BASE_URL?.replace(/\/$/, '') || '';
          return await this.openAiCompatible(`${baseUrl}/chat/completions`, process.env.CUSTOM_API_KEY, model, prompt);
        case 'claude':
          return await this.anthropic(model, prompt);
        case 'gemini':
          return await this.gemini(model, prompt);
        case 'ollama':
          return await this.ollama(model, prompt);
        case 'cohere':
          return await this.cohere(model, prompt);
        case 'huggingface':
          return await this.huggingface(model, prompt);
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
    } catch (error: any) {
      console.error(`[LLMService] Error with ${provider}:`, error.response?.data || error.message);
      return `❌ Error communicating with ${provider.toUpperCase()}: ${error.response?.data?.error?.message || error.response?.data?.error || error.message}`;
    }
  }

  private static async openAiCompatible(endpoint: string, apiKey: string | undefined, model: string, prompt: string): Promise<string> {
    if (!apiKey && endpoint.indexOf('localhost') === -1) throw new Error('API Key missing. Please set it in Settings.');
    const res = await axios.post(endpoint, {
      model,
      messages: [
        { role: 'system', content: this.getAgentSystemPrompt() },
        { role: 'user', content: prompt }
      ]
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/ArafatAhmed-2M/2MClawAI',
        'X-Title': '2M Claw AI Gateway'
      }
    });
    return res.data.choices[0].message.content;
  }

  private static async anthropic(model: string, prompt: string): Promise<string> {
    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) throw new Error('Claude API Key missing. Please set it in Settings.');
    const res = await axios.post('https://api.anthropic.com/v1/messages', {
      model,
      system: this.getAgentSystemPrompt(),
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    }, {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      }
    });
    return res.data.content[0].text;
  }

  private static async gemini(model: string, prompt: string): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Gemini API Key missing. Please set it in Settings.');
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await axios.post(endpoint, {
      system_instruction: { parts: [{ text: this.getAgentSystemPrompt() }] },
      contents: [{ parts: [{ text: prompt }] }]
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    return res.data.candidates[0].content.parts[0].text;
  }

  private static async ollama(model: string, prompt: string): Promise<string> {
    const endpoint = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';
    const res = await axios.post(`${endpoint}/api/chat`, {
      model,
      messages: [
        { role: 'system', content: this.getAgentSystemPrompt() },
        { role: 'user', content: prompt }
      ],
      stream: false
    });
    return res.data.message.content;
  }

  private static async cohere(model: string, prompt: string): Promise<string> {
    const apiKey = process.env.COHERE_API_KEY;
    if (!apiKey) throw new Error('Cohere API Key missing. Please set it in Settings.');
    const res = await axios.post('https://api.cohere.ai/v1/chat', {
      model,
      preamble: this.getAgentSystemPrompt(),
      message: prompt
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    return res.data.text;
  }

  private static async huggingface(model: string, prompt: string): Promise<string> {
    const apiKey = process.env.HF_API_KEY;
    if (!apiKey) throw new Error('Hugging Face Token missing. Please set it in Settings.');
    const res = await axios.post(`https://api-inference.huggingface.co/models/${model}`, {
      inputs: `System: ${this.getAgentSystemPrompt()}\nUser: ${prompt}`,
      parameters: { max_new_tokens: 250 }
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (Array.isArray(res.data)) {
        return res.data[0].generated_text || res.data[0].summary_text || JSON.stringify(res.data);
    }
    return res.data.generated_text || JSON.stringify(res.data);
  }
}
