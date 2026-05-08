import dotenv from 'dotenv';
import { DashboardServer } from '../dashboard/server';
import { LongTermMemory } from '../memory/LongTermMemory';
import { ProactiveAgent } from '../proactive/ProactiveAgent';
import { AutoUpdater } from '../updater/AutoUpdater';

dotenv.config();

class GatewayManager {
  private memory: LongTermMemory;
  private proactiveAgent: ProactiveAgent;
  private autoUpdater: AutoUpdater;

  constructor() {
    console.log('🐾 Initializing 2M Claw Gateway...');
    
    // Initialize Core Components
    this.memory = new LongTermMemory();
    this.proactiveAgent = new ProactiveAgent(this.memory);
    this.autoUpdater = new AutoUpdater();
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

    console.log('✅ 2M Claw Gateway is running and ready to handle messages.');
  }
}

// Bootstrap
const gateway = new GatewayManager();
gateway.start().catch((err) => {
  console.error('❌ Failed to start 2M Claw:', err);
  process.exit(1);
});
