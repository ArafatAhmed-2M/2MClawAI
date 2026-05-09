import { TelegramBot } from './TelegramBot';
import { DiscordBot } from './DiscordBot';

/**
 * BotRegistry — a simple singleton that holds live bot instances.
 * This breaks the circular import between server.ts and gateway/index.ts.
 * The GatewayManager registers bots here on startup;
 * the DashboardServer reads from here on hot-connect.
 */
export class BotRegistry {
  private static _telegram: TelegramBot | null = null;
  private static _discord: DiscordBot | null = null;

  public static setTelegram(bot: TelegramBot) {
    this._telegram = bot;
  }

  public static getTelegram(): TelegramBot | null {
    return this._telegram;
  }

  public static setDiscord(bot: DiscordBot) {
    this._discord = bot;
  }

  public static getDiscord(): DiscordBot | null {
    return this._discord;
  }
}
