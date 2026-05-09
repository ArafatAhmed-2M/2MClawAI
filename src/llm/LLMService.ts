import axios from 'axios';

const AGENT_SYSTEM_PROMPT = `You are 2M Claw, an autonomous AI operating system. 
You can write code, edit files, and execute system commands.
If the user asks you to read, edit, or delete a file, you MUST output a JSON block wrapped in EXACTLY this format to trigger the agentic execution engine:

\`\`\`system_command
{
  "action": "write_file",
  "path": "relative/path/to/file.ext",
  "content": "file content here if writing"
}
\`\`\`

When you output this block, the backend will automatically intercept it, run the command, and feed the result back to the user. Do not use this block for normal conversational replies, ONLY when modifying or interacting with the file system.`;

export class LLMService {
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
        { role: 'system', content: AGENT_SYSTEM_PROMPT },
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
      system: AGENT_SYSTEM_PROMPT,
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
      system_instruction: { parts: [{ text: AGENT_SYSTEM_PROMPT }] },
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
        { role: 'system', content: AGENT_SYSTEM_PROMPT },
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
      preamble: AGENT_SYSTEM_PROMPT,
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
      inputs: `System: ${AGENT_SYSTEM_PROMPT}\nUser: ${prompt}`,
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
