import fs from 'fs';
import path from 'path';
import { AttachmentBuilder, Client, GatewayIntentBits, Message, Partials } from 'discord.js';
import { LLMService } from '../llm/LLMService';
import { globalMemory } from '../memory/LongTermMemory';

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

      // Auto-detect the first configured provider
      const defaultProvider = process.env.DEFAULT_PROVIDER;
      const defaultModel   = process.env.DEFAULT_MODEL;
      const { provider, model } = defaultProvider && defaultModel
        ? { provider: defaultProvider, model: defaultModel }
        : LLMService.getDefaultProviderAndModel();

      const rawReply = await LLMService.generateResponse(provider, model, content);

      // --- Agentic System Command Interceptor ---
      const { handled, visibleReply } = await this.executeCommand(message, rawReply);

      if (!handled) {
        // Normal reply — split if over Discord's 2000-char limit
        await this.sendChunked(message, visibleReply || rawReply);
      } else if (visibleReply) {
        // Send the clean explanation text (without the JSON block)
        await this.sendChunked(message, visibleReply);
      }
      // ------------------------------------------

    } catch (err: any) {
      console.error(err);
      await message.reply(`❌ [Agent OS] System Error: ${err.message}`);
    }
  }

  /**
   * Parses and executes a system_command block embedded in the LLM reply.
   * Returns whether a command was handled and the clean visible reply text.
   */
  private async executeCommand(
    message: Message,
    rawReply: string
  ): Promise<{ handled: boolean; visibleReply: string }> {
    const BLOCK_REGEX = /```system_command\s*([\s\S]*?)```/i;
    const match = rawReply.match(BLOCK_REGEX);

    // No command block — nothing to do
    if (!match) return { handled: false, visibleReply: rawReply };

    // Strip the JSON block to get the clean conversational text
    const visibleReply = rawReply.replace(BLOCK_REGEX, '').trim();

    let cmd: Record<string, any>;
    try {
      cmd = JSON.parse(match[1].trim());
    } catch (e) {
      console.error('[Discord] Failed to parse system_command JSON:', e);
      return { handled: false, visibleReply };
    }

    const action: string = (cmd.action || '').toLowerCase();

    try {
      switch (action) {
        case 'write_file': {
          const filePath = this.resolvePath(cmd.path);
          fs.mkdirSync(path.dirname(filePath), { recursive: true });
          fs.writeFileSync(filePath, cmd.content ?? '', 'utf-8');
          console.log(`[Discord] ✅ write_file → ${filePath}`);
          await message.reply(`✅ [Agent OS] File written: \`${cmd.path}\``);
          return { handled: true, visibleReply };
        }

        case 'send_file': {
          const filePath = this.resolvePath(cmd.path);
          // Write the file first (it may not exist yet)
          fs.mkdirSync(path.dirname(filePath), { recursive: true });
          fs.writeFileSync(filePath, cmd.content ?? '', 'utf-8');
          console.log(`[Discord] 📤 send_file → ${filePath}`);
          // Send as attachment
          const attachment = new AttachmentBuilder(filePath, {
            name: path.basename(filePath),
            description: `File created by 2M Claw`
          });
          await message.reply({
            content: `📂 Here is your file: \`${path.basename(filePath)}\``,
            files: [attachment]
          });
          return { handled: true, visibleReply };
        }

        case 'memorize': {
          if (cmd.fact) {
            globalMemory.addFact(cmd.fact);
            console.log(`[Discord] 🧠 memorized: ${cmd.fact}`);
            await message.reply(`🧠 [Agent OS] Fact memorized.`);
          }
          return { handled: true, visibleReply };
        }

        case 'read_file': {
          const filePath = this.resolvePath(cmd.path);
          if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const preview = fileContent.substring(0, 1900);
            await message.reply(`📖 [Agent OS] \`${cmd.path}\`:\n\`\`\`\n${preview}\n\`\`\``);
          } else {
            await message.reply(`❌ [Agent OS] File not found: \`${cmd.path}\``);
          }
          return { handled: true, visibleReply };
        }

        case 'delete_file': {
          const filePath = this.resolvePath(cmd.path);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            await message.reply(`🗑️ [Agent OS] Deleted: \`${cmd.path}\``);
          } else {
            await message.reply(`❌ [Agent OS] File not found: \`${cmd.path}\``);
          }
          return { handled: true, visibleReply };
        }

        default:
          console.warn(`[Discord] Unknown action: "${action}"`);
          return { handled: false, visibleReply };
      }
    } catch (err: any) {
      console.error(`[Discord] Error during "${action}":`, err.message);
      await message.reply(`❌ [Agent OS] Execution Error (${action}): ${err.message}`);
      return { handled: true, visibleReply };
    }
  }

  /** Splits a long reply into 2000-char chunks for Discord's limit */
  private async sendChunked(message: Message, text: string) {
    if (!text) return;
    if (text.length <= 2000) {
      await message.reply(text);
    } else {
      const chunks = text.match(/[\s\S]{1,1999}/g) || [];
      for (const chunk of chunks) {
        await message.reply(chunk);
      }
    }
  }

  private resolvePath(filePath: string): string {
    if (!filePath) throw new Error('No file path specified in system_command.');
    return path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  }
}
