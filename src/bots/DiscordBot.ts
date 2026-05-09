import fs from 'fs';
import path from 'path';
import { AttachmentBuilder, Client, GatewayIntentBits, Message, Partials } from 'discord.js';
import { LLMService } from '../llm/LLMService';
import { globalMemory } from '../memory/LongTermMemory';

export class DiscordBot {
  private client: Client;
  /** Tracks the last file written per channel so "send it to me" works */
  private lastFile: Map<string, string> = new Map();

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

    const isDM = message.channel.type === 1;
    const isMentioned = message.mentions.has(this.client.user?.id || '');
    if (!isDM && !isMentioned) return;

    const content = message.content.replace(/<@!?\d+>/g, '').trim();
    if (!content) return;

    const channelId = message.channelId;
    const userText = content.toLowerCase();

    try {
      if ('sendTyping' in message.channel) await message.channel.sendTyping();

      // ── Shortcut: "send it to me" → send the last created file ──
      const sendItTriggers = ['send it', 'send it to me', 'send the file', 'give it to me', 'send now'];
      if (sendItTriggers.some(t => userText.includes(t))) {
        const lastPath = this.lastFile.get(channelId);
        if (lastPath && fs.existsSync(lastPath)) {
          const attachment = new AttachmentBuilder(lastPath, { name: path.basename(lastPath) });
          await message.reply({ content: `📂 Here is your file: \`${path.basename(lastPath)}\``, files: [attachment] });
          return;
        }
      }

      // Auto-detect provider
      const defaultProvider = process.env.DEFAULT_PROVIDER;
      const defaultModel   = process.env.DEFAULT_MODEL;
      const { provider, model } = defaultProvider && defaultModel
        ? { provider: defaultProvider, model: defaultModel }
        : LLMService.getDefaultProviderAndModel();

      const rawReply = await LLMService.generateResponse(provider, model, content);

      // --- Agentic System Command Interceptor ---
      const { cmd, visibleReply } = this.parseCommand(rawReply);

      if (cmd) {
        await this.dispatch(message, channelId, cmd, visibleReply);
      } else {
        await this.sendChunked(message, rawReply);
      }
      // ------------------------------------------

    } catch (err: any) {
      console.error(err);
      await message.reply(`❌ [Agent OS] System Error: ${err.message}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Parse — try multiple formats the LLM might use
  // ─────────────────────────────────────────────────────────────────
  private parseCommand(rawReply: string): { cmd: Record<string, any> | null; visibleReply: string } {
    // 1. ```system_command { ... } ```
    const scMatch = rawReply.match(/```system_command\s*(\{[\s\S]*?\})\s*```/i);
    if (scMatch) return this.tryParse(scMatch[1], rawReply, scMatch[0]);

    // 2. ```json { ... } ``` or ``` { ... } ``` containing "action"
    const jbMatch = rawReply.match(/```(?:json)?\s*(\{[\s\S]*?"action"[\s\S]*?\})\s*```/i);
    if (jbMatch) return this.tryParse(jbMatch[1], rawReply, jbMatch[0]);

    // 3. Raw JSON block anywhere in the reply — { ... "action" ... }
    const rawMatch = rawReply.match(/(\{[^{}]*"action"\s*:\s*"[^"]+?"[^{}]*\})/s);
    if (rawMatch) return this.tryParse(rawMatch[1], rawReply, rawMatch[0]);

    return { cmd: null, visibleReply: rawReply };
  }

  private tryParse(
    jsonStr: string,
    rawReply: string,
    toStrip: string
  ): { cmd: Record<string, any> | null; visibleReply: string } {
    try {
      const cmd = JSON.parse(jsonStr.trim());
      const visibleReply = rawReply.replace(toStrip, '').trim();
      return { cmd, visibleReply };
    } catch {
      return { cmd: null, visibleReply: rawReply };
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Dispatch — execute the action
  // ─────────────────────────────────────────────────────────────────
  private async dispatch(
    message: Message,
    channelId: string,
    cmd: Record<string, any>,
    visibleReply: string
  ) {
    const action = (cmd.action || '').toLowerCase();
    console.log(`[Discord] ▶ action="${action}" path="${cmd.path || ''}"`);

    try {
      switch (action) {
        case 'write_file': {
          const fp = this.resolvePath(cmd.path);
          fs.mkdirSync(path.dirname(fp), { recursive: true });
          fs.writeFileSync(fp, cmd.content ?? '', 'utf-8');
          this.lastFile.set(channelId, fp);
          console.log(`[Discord] ✅ write_file → ${fp}`);
          await message.reply(`✅ File created: \`${path.basename(fp)}\`\n\nSay **"send it to me"** to receive it as an attachment.`);
          if (visibleReply) await this.sendChunked(message, visibleReply);
          break;
        }

        case 'send_file': {
          const fp = this.resolvePath(cmd.path);
          fs.mkdirSync(path.dirname(fp), { recursive: true });
          fs.writeFileSync(fp, cmd.content ?? '', 'utf-8');
          this.lastFile.set(channelId, fp);
          console.log(`[Discord] 📤 send_file → ${fp}`);
          if (visibleReply) await this.sendChunked(message, visibleReply);
          const attachment = new AttachmentBuilder(fp, {
            name: path.basename(fp),
            description: 'File created by 2M Claw'
          });
          await message.reply({
            content: `📂 Here is your file: \`${path.basename(fp)}\``,
            files: [attachment]
          });
          break;
        }

        case 'memorize': {
          if (cmd.fact) {
            globalMemory.addFact(cmd.fact);
            console.log(`[Discord] 🧠 memorized: ${cmd.fact}`);
          }
          if (visibleReply) await this.sendChunked(message, visibleReply);
          else await message.reply(`🧠 Fact memorized.`);
          break;
        }

        case 'read_file': {
          const fp = this.resolvePath(cmd.path);
          if (fs.existsSync(fp)) {
            const fileContent = fs.readFileSync(fp, 'utf-8');
            const preview = fileContent.substring(0, 1800);
            await message.reply(`📖 \`${path.basename(fp)}\`:\n\`\`\`\n${preview}\n\`\`\``);
          } else {
            await message.reply(`❌ File not found: \`${cmd.path}\``);
          }
          break;
        }

        case 'delete_file': {
          const fp = this.resolvePath(cmd.path);
          if (fs.existsSync(fp)) {
            fs.unlinkSync(fp);
            await message.reply(`🗑️ Deleted: \`${path.basename(fp)}\``);
          } else {
            await message.reply(`❌ File not found: \`${cmd.path}\``);
          }
          break;
        }

        default:
          console.warn(`[Discord] Unknown action: "${action}"`);
          await this.sendChunked(message, visibleReply || '🤔 Unknown action.');
      }
    } catch (err: any) {
      console.error(`[Discord] Error during "${action}":`, err.message);
      await message.reply(`❌ Agent Error (${action}): ${err.message}`);
    }
  }

  private async sendChunked(message: Message, text: string) {
    if (!text) return;
    const chunks = text.match(/[\s\S]{1,1999}/g) || [];
    for (const chunk of chunks) await message.reply(chunk);
  }

  private resolvePath(filePath: string): string {
    if (!filePath) throw new Error('No file path in command.');
    return path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  }
}
