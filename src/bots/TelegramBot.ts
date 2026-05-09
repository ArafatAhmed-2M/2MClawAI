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
