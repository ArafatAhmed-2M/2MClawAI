import TelegramBotAPI from 'node-telegram-bot-api';
import { LLMService } from '../llm/LLMService';

export class TelegramBot {
  private bot: TelegramBotAPI | null = null;

  public start() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return;

    try {
      this.bot = new TelegramBotAPI(token, { polling: true });
      console.log('\n✈️ [Telegram] Bot connected!');

      this.bot.on('message', async (msg) => {
        if (!msg.text || msg.from?.is_bot) return;
        const chatId = msg.chat.id;

        try {
          await this.bot?.sendChatAction(chatId, 'typing');
          const provider = process.env.DEFAULT_PROVIDER || 'openai';
          const model = process.env.DEFAULT_MODEL || 'gpt-4o';

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
