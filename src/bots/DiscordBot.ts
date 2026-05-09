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
      // Default to OpenAI / Claude
      const provider = process.env.DEFAULT_PROVIDER || 'openai';
      const model = process.env.DEFAULT_MODEL || 'gpt-4o';
      
      const reply = await LLMService.generateResponse(provider, model, content);
      
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
