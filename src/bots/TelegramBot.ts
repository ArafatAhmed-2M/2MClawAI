import fs from 'fs';
import path from 'path';
import TelegramBotAPI from 'node-telegram-bot-api';
import { LLMService } from '../llm/LLMService';
import { globalMemory } from '../memory/LongTermMemory';

export class TelegramBot {
  private bot: TelegramBotAPI | null = null;
  /** Tracks the last file written per chat so "send it to me" works */
  private lastFile: Map<number, string> = new Map();

  public stop() {
    if (this.bot) {
      this.bot.stopPolling();
      this.bot = null;
      console.log('🛑 [Telegram] Bot stopped.');
    }
  }

  public start(tokenOverride?: string) {
    const token = tokenOverride || process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return;

    this.stop();

    try {
      this.bot = new TelegramBotAPI(token, { polling: true });
      console.log('\n✈️ [Telegram] Bot connected!');

      this.bot.on('message', async (msg) => {
        if (!msg.text || msg.from?.is_bot) return;
        const chatId = msg.chat.id;
        const userText = msg.text.trim().toLowerCase();

        try {
          await this.bot?.sendChatAction(chatId, 'typing');

          // ── Shortcut: "send it to me" → send the last created file ──
          const sendItTriggers = ['send it', 'send it to me', 'send the file', 'give it to me', 'send now'];
          if (sendItTriggers.some(t => userText.includes(t))) {
            const lastPath = this.lastFile.get(chatId);
            if (lastPath && fs.existsSync(lastPath)) {
              await this.bot?.sendDocument(
                chatId,
                lastPath,
                { caption: `📂 Here is your file: \`${path.basename(lastPath)}\`` }
              );
              return;
            }
          }

          // Auto-detect provider
          const defaultProvider = process.env.DEFAULT_PROVIDER;
          const defaultModel   = process.env.DEFAULT_MODEL;
          const { provider, model } = defaultProvider && defaultModel
            ? { provider: defaultProvider, model: defaultModel }
            : LLMService.getDefaultProviderAndModel();

          const rawReply = await LLMService.generateResponse(provider, model, msg.text);

          // --- Agentic System Command Interceptor ---
          const { cmd, visibleReply } = this.parseCommand(rawReply);

          if (cmd) {
            await this.dispatch(chatId, cmd, visibleReply);
          } else {
            // No command — send the plain reply
            const safe = rawReply.substring(0, 4096);
            await this.bot?.sendMessage(chatId, safe || '🤔 No response.');
          }
          // ------------------------------------------

        } catch (e: any) {
          console.error(e);
          await this.bot?.sendMessage(chatId, `❌ [Agent OS] System Error: ${e.message}`);
        }
      });
    } catch (e: any) {
      console.error('❌ [Telegram] Failed to login:', e.message);
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
  private async dispatch(chatId: number, cmd: Record<string, any>, visibleReply: string) {
    const action = (cmd.action || '').toLowerCase();
    console.log(`[Telegram] ▶ action="${action}" path="${cmd.path || ''}"`);

    try {
      switch (action) {
        case 'write_file': {
          const fp = this.resolvePath(cmd.path);
          fs.mkdirSync(path.dirname(fp), { recursive: true });
          fs.writeFileSync(fp, cmd.content ?? '', 'utf-8');
          this.lastFile.set(chatId, fp);
          console.log(`[Telegram] ✅ write_file → ${fp}`);
          await this.bot?.sendMessage(chatId, `✅ File created: \`${path.basename(fp)}\`\n\nSay **"send it to me"** to receive it as a file.`);
          if (visibleReply) await this.bot?.sendMessage(chatId, visibleReply.substring(0, 4096));
          break;
        }

        case 'send_file': {
          const fp = this.resolvePath(cmd.path);
          fs.mkdirSync(path.dirname(fp), { recursive: true });
          fs.writeFileSync(fp, cmd.content ?? '', 'utf-8');
          this.lastFile.set(chatId, fp);
          console.log(`[Telegram] 📤 send_file → ${fp}`);
          if (visibleReply) await this.bot?.sendMessage(chatId, visibleReply.substring(0, 4096));
          await this.bot?.sendDocument(
            chatId,
            fp,
            { caption: `📂 Here is your file: \`${path.basename(fp)}\`` }
          );
          break;
        }

        case 'memorize': {
          if (cmd.fact) {
            globalMemory.addFact(cmd.fact);
            console.log(`[Telegram] 🧠 memorized: ${cmd.fact}`);
          }
          if (visibleReply) await this.bot?.sendMessage(chatId, visibleReply.substring(0, 4096));
          else await this.bot?.sendMessage(chatId, `🧠 Fact memorized.`);
          break;
        }

        case 'read_file': {
          const fp = this.resolvePath(cmd.path);
          if (fs.existsSync(fp)) {
            const content = fs.readFileSync(fp, 'utf-8');
            await this.bot?.sendMessage(chatId, `📖 \`${path.basename(fp)}\`:\n\n${content.substring(0, 4000)}`);
          } else {
            await this.bot?.sendMessage(chatId, `❌ File not found: \`${cmd.path}\``);
          }
          break;
        }

        case 'delete_file': {
          const fp = this.resolvePath(cmd.path);
          if (fs.existsSync(fp)) {
            fs.unlinkSync(fp);
            await this.bot?.sendMessage(chatId, `🗑️ Deleted: \`${path.basename(fp)}\``);
          } else {
            await this.bot?.sendMessage(chatId, `❌ File not found: \`${cmd.path}\``);
          }
          break;
        }

        default:
          console.warn(`[Telegram] Unknown action: "${action}"`);
          // Unknown action — just send the raw reply
          await this.bot?.sendMessage(chatId, visibleReply.substring(0, 4096) || '🤔 Unknown action.');
      }
    } catch (err: any) {
      console.error(`[Telegram] Error during "${action}":`, err.message);
      await this.bot?.sendMessage(chatId, `❌ Agent Error (${action}): ${err.message}`);
    }
  }

  private resolvePath(filePath: string): string {
    if (!filePath) throw new Error('No file path in command.');
    return path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  }
}
