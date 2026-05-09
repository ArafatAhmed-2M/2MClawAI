import fs from 'fs';
import path from 'path';
import TelegramBotAPI from 'node-telegram-bot-api';
import { LLMService } from '../llm/LLMService';
import { globalMemory } from '../memory/LongTermMemory';

export class TelegramBot {
  private bot: TelegramBotAPI | null = null;

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

    this.stop(); // Ensure old bot is killed

    try {
      this.bot = new TelegramBotAPI(token, { polling: true });
      console.log('\n✈️ [Telegram] Bot connected!');

      this.bot.on('message', async (msg) => {
        if (!msg.text || msg.from?.is_bot) return;
        const chatId = msg.chat.id;

        try {
          await this.bot?.sendChatAction(chatId, 'typing');

          // Auto-detect the first configured provider
          const defaultProvider = process.env.DEFAULT_PROVIDER;
          const defaultModel   = process.env.DEFAULT_MODEL;
          const { provider, model } = defaultProvider && defaultModel
            ? { provider: defaultProvider, model: defaultModel }
            : LLMService.getDefaultProviderAndModel();

          const rawReply = await LLMService.generateResponse(provider, model, msg.text);

          // --- Agentic System Command Interceptor ---
          const { handled, visibleReply } = await this.executeCommand(chatId, rawReply);

          // Only send the text reply when the command didn't already handle everything
          if (!handled) {
            await this.bot?.sendMessage(chatId, visibleReply || rawReply);
          } else if (visibleReply) {
            // Send the clean text part (description/explanation before the JSON block)
            await this.bot?.sendMessage(chatId, visibleReply);
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

  /**
   * Parses and executes a system_command block embedded in the LLM reply.
   * Returns whether a command was handled and the clean visible reply text.
   */
  private async executeCommand(
    chatId: number,
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
      console.error('[Telegram] Failed to parse system_command JSON:', e);
      return { handled: false, visibleReply };
    }

    const action: string = (cmd.action || '').toLowerCase();

    try {
      switch (action) {
        case 'write_file': {
          const filePath = this.resolvePath(cmd.path);
          fs.mkdirSync(path.dirname(filePath), { recursive: true });
          fs.writeFileSync(filePath, cmd.content ?? '', 'utf-8');
          console.log(`[Telegram] ✅ write_file → ${filePath}`);
          await this.bot?.sendMessage(chatId, `✅ [Agent OS] File written: \`${cmd.path}\``);
          return { handled: true, visibleReply };
        }

        case 'send_file': {
          const filePath = this.resolvePath(cmd.path);
          // Write the file first (it may not exist yet)
          fs.mkdirSync(path.dirname(filePath), { recursive: true });
          fs.writeFileSync(filePath, cmd.content ?? '', 'utf-8');
          console.log(`[Telegram] 📤 send_file → ${filePath}`);
          // Send the file as a document
          await this.bot?.sendDocument(
            chatId,
            filePath,
            { caption: `📂 Here is your file: \`${path.basename(filePath)}\`` }
          );
          return { handled: true, visibleReply };
        }

        case 'memorize': {
          if (cmd.fact) {
            globalMemory.addFact(cmd.fact);
            console.log(`[Telegram] 🧠 memorized: ${cmd.fact}`);
            await this.bot?.sendMessage(chatId, `🧠 [Agent OS] Fact memorized.`);
          }
          return { handled: true, visibleReply };
        }

        case 'read_file': {
          const filePath = this.resolvePath(cmd.path);
          if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf-8');
            await this.bot?.sendMessage(
              chatId,
              `📖 [Agent OS] \`${cmd.path}\`:\n\n${content.substring(0, 4000)}`
            );
          } else {
            await this.bot?.sendMessage(chatId, `❌ [Agent OS] File not found: \`${cmd.path}\``);
          }
          return { handled: true, visibleReply };
        }

        case 'delete_file': {
          const filePath = this.resolvePath(cmd.path);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            await this.bot?.sendMessage(chatId, `🗑️ [Agent OS] Deleted: \`${cmd.path}\``);
          } else {
            await this.bot?.sendMessage(chatId, `❌ [Agent OS] File not found: \`${cmd.path}\``);
          }
          return { handled: true, visibleReply };
        }

        default:
          console.warn(`[Telegram] Unknown action: "${action}"`);
          return { handled: false, visibleReply };
      }
    } catch (err: any) {
      console.error(`[Telegram] Error during "${action}":`, err.message);
      await this.bot?.sendMessage(chatId, `❌ [Agent OS] Execution Error (${action}): ${err.message}`);
      return { handled: true, visibleReply };
    }
  }

  private resolvePath(filePath: string): string {
    if (!filePath) throw new Error('No file path specified in system_command.');
    return path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  }
}
