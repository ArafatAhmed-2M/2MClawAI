import { Client, GatewayIntentBits, Message, Partials } from 'discord.js';
import { LLMService } from '../llm/LLMService';

export class DiscordBot {
  private client: Client;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
      partials: [Partials.Channel, Partials.Message]
    });

    this.client.on('ready', () => {
      console.log(`\n🤖 [Discord] Bot logged in as ${this.client.user?.tag}!`);
    });

    this.client.on('messageCreate', this.handleMessage.bind(this));
  }

  public async start() {
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) return;
    try {
      await this.client.login(token);
    } catch (e: any) {
      console.error('❌ [Discord] Failed to login:', e.message);
    }
  }

  private async handleMessage(message: Message) {
    if (message.author.bot) return;

    // Type 1 is DM
    const isDM = message.channel.type === 1;
    const isMentioned = message.mentions.has(this.client.user?.id || '');

    if (!isDM && !isMentioned) return;

    const content = message.content.replace(/<@!?\d+>/g, '').trim();
    if (!content) return;

    try {
      if ('sendTyping' in message.channel) {
        await message.channel.sendTyping();
      }

      // Auto-detect the first configured provider — no hardcoded OpenAI fallback
      const defaultProvider = process.env.DEFAULT_PROVIDER;
      const defaultModel   = process.env.DEFAULT_MODEL;
      const { provider, model } = defaultProvider && defaultModel
        ? { provider: defaultProvider, model: defaultModel }
        : LLMService.getDefaultProviderAndModel();
      
      const reply = await LLMService.generateResponse(provider, model, content);
      
      // --- Agentic System Command Interceptor ---
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
          const path = require('path');
          const fs = require('fs');
          const { globalMemory } = require('../memory/LongTermMemory');

          const targetPath = cmd.path ? path.resolve(process.cwd(), cmd.path) : '';
          
          if (cmd.action === 'write_file' && targetPath) {
            fs.mkdirSync(path.dirname(targetPath), { recursive: true });
            fs.writeFileSync(targetPath, cmd.content || '', 'utf-8');
            await message.reply(`✅ [Agent OS] File written: ${cmd.path}`);
          } else if (cmd.action === 'memorize') {
            globalMemory.addFact(cmd.fact);
            await message.reply(`🧠 [Agent OS] Fact memorized: ${cmd.fact}`);
          } else if (cmd.action === 'send_file' && targetPath) {
            if (fs.existsSync(targetPath)) {
              await message.reply({ 
                content: `📂 Here is your file: ${cmd.path}`,
                files: [targetPath] 
              });
            } else {
              await message.reply(`❌ [Agent OS] Error: File not found at ${cmd.path}`);
            }
          } else if (cmd.action === 'read_file' && targetPath) {
            if (fs.existsSync(targetPath)) {
              const content = fs.readFileSync(targetPath, 'utf-8');
              await message.reply(`📖 [Agent OS] Read file: ${cmd.path}\n\n${content.substring(0, 2000)}`);
            } else {
              await message.reply(`❌ [Agent OS] Error: File not found at ${cmd.path}`);
            }
          } else if (cmd.action === 'delete_file' && targetPath) {
            if (fs.existsSync(targetPath)) {
              fs.unlinkSync(targetPath);
              await message.reply(`🗑️ [Agent OS] Deleted file: ${cmd.path}`);
            } else {
              await message.reply(`❌ [Agent OS] Error: File not found at ${cmd.path}`);
            }
          }
        } catch (e: any) {
          await message.reply(`❌ [Agent OS] Execution Failed: ${e.message}`);
        }
      }
      // ------------------------------------------

      // Discord max length is 2000 chars, so split if necessary
      if (reply.length > 2000) {
        const chunks = reply.match(/[\s\S]{1,1999}/g) || [];
        for (const chunk of chunks) {
          await message.reply(chunk);
        }
      } else {
        await message.reply(reply);
      }
    } catch (err: any) {
      console.error(err);
      await message.reply(`❌ [Agent OS] System Error: ${err.message}`);
    }
  }
}
