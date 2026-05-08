import cron from 'node-cron';
import { LongTermMemory } from '../memory/LongTermMemory';

export class ProactiveAgent {
  private memory: LongTermMemory;

  constructor(memory: LongTermMemory) {
    this.memory = memory;
  }

  public start() {
    // Schedule a daily digest at 9:00 AM
    cron.schedule('0 9 * * *', () => {
      console.log('⏰ [Proactive Agent] Generating daily digest...');
      this.generateDigest();
    });
  }

  private generateDigest() {
    // In a real scenario, this would call the LLM to summarize recent events.
    console.log('🤖 [Proactive Agent] Digest generated and sent to default messaging platform.');
    this.memory.set('last_digest', new Date().toISOString());
  }
}
