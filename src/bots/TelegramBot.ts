import TelegramBotAPI from 'node-telegram-bot-api';
import { LLMService } from '../llm/LLMService';

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

          // Auto-detect the first configured provider — no hardcoded OpenAI fallback
          const defaultProvider = process.env.DEFAULT_PROVIDER;
          const defaultModel   = process.env.DEFAULT_MODEL;
          const { provider, model } = defaultProvider && defaultModel
            ? { provider: defaultProvider, model: defaultModel }
            : LLMService.getDefaultProviderAndModel();

          const reply = await LLMService.generateResponse(provider, model, msg.text);
          
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
                await this.bot?.sendMessage(chatId, `✅ [Agent OS] File written: ${cmd.path}`);
              } else if (cmd.action === 'memorize') {
                globalMemory.addFact(cmd.fact);
                await this.bot?.sendMessage(chatId, `🧠 [Agent OS] Fact memorized: ${cmd.fact}`);
              } else if (cmd.action === 'send_file' && targetPath) {
                if (fs.existsSync(targetPath)) {
                  await this.bot?.sendDocument(chatId, targetPath, { caption: `📂 Here is your file: ${cmd.path}` });
                } else {
                  await this.bot?.sendMessage(chatId, `❌ [Agent OS] Error: File not found at ${cmd.path}`);
                }
              }
            } catch (e: any) {
              await this.bot?.sendMessage(chatId, `❌ [Agent OS] Execution Failed: ${e.message}`);
            }
          }
          // ------------------------------------------

          await this.bot?.sendMessage(chatId, reply);
        } catch (e: any) {
          console.error(e);
          await this.bot?.sendMessage(chatId, `❌ [Agent OS] System Error: ${e.message}`);
        }
      });
    } catch (e: any) {
      console.error('❌ [Telegram] Failed to login:', e.message);
    }
  }
}
