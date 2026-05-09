import dotenv from 'dotenv';
import { DashboardServer } from '../dashboard/server';
import { globalMemory, LongTermMemory } from '../memory/LongTermMemory';
import { ProactiveAgent } from '../proactive/ProactiveAgent';
import { AutoUpdater } from '../updater/AutoUpdater';
import { DiscordBot } from '../bots/DiscordBot';
import { TelegramBot } from '../bots/TelegramBot';

dotenv.config();

class GatewayManager {
  private memory: LongTermMemory;
  private proactiveAgent: ProactiveAgent;
  private autoUpdater: AutoUpdater;
  private discordBot: DiscordBot;
  private telegramBot: TelegramBot;

  constructor() {
    console.log('🐾 Initializing 2M Claw Gateway...');
    
    // Initialize Core Components
    this.memory = globalMemory;
    this.proactiveAgent = new ProactiveAgent(this.memory);
    this.autoUpdater = new AutoUpdater();
    this.discordBot = new DiscordBot();
    this.telegramBot = new TelegramBot();
  }

  public async start() {
    console.log('🔄 Checking for updates...');
    await this.autoUpdater.checkForUpdates();

    console.log('🧠 Loading memory system...');
    await this.memory.initialize();

    console.log('🕒 Starting proactive agent scheduler...');
    this.proactiveAgent.start();

    // Start Dashboard Web UI
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    DashboardServer.start(port);

    // Start Bots (they will early return if no token)
    this.discordBot.start();
    this.telegramBot.start();

    console.log('✅ 2M Claw Gateway is running and ready to handle messages.');
  }
}

// Bootstrap
const gateway = new GatewayManager();
gateway.start().catch((err) => {
  console.error('❌ Failed to start 2M Claw:', err);
  process.exit(1);
});
