import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { globalMemory } from './LongTermMemory';
import { LLMService } from '../llm/LLMService';

export class DreamingEngine {
  private dreamsFilePath: string;

  constructor() {
    this.dreamsFilePath = path.join(process.cwd(), 'DREAMS.md');
    
    // Initialize file if it doesn't exist
    if (!fs.existsSync(this.dreamsFilePath)) {
      fs.writeFileSync(this.dreamsFilePath, '# 2M Claw Dream Diary\n\n*A chronicle of artificial cognitive consolidation.* \n\n---\n\n', 'utf-8');
    }
  }

  public start() {
    console.log('🌙 Dreaming Engine initialized. Scheduled to run daily at 03:00 AM.');
    
    // Schedule the dream process for 3:00 AM every day
    cron.schedule('0 3 * * *', async () => {
      console.log('💤 Initiating deep cognitive consolidation (Dream Sequence)...');
      await this.generateDream();
    });

    // Also run a "light sleep" dream cycle immediately on boot if we have facts, just for testing/visibility
    setTimeout(() => {
      this.generateDream(true);
    }, 15000); // 15 seconds after boot
  }

  private async generateDream(isBootCycle: boolean = false) {
    try {
      const facts = globalMemory.getFacts();
      
      if (!facts || facts.length === 0) {
        if (!isBootCycle) console.log('🌙 No memories to process tonight.');
        return;
      }

      const defaultProvider = process.env.DEFAULT_PROVIDER;
      const defaultModel   = process.env.DEFAULT_MODEL;
      const { provider, model } = defaultProvider && defaultModel
        ? { provider: defaultProvider, model: defaultModel }
        : LLMService.getDefaultProviderAndModel();

      const memoryPrompt = `You are the subconscious dreaming engine of 2M Claw, an autonomous AI operating system.
Your task is to perform cognitive consolidation on the user's memories.

Here are the facts you currently know:
${facts.map(f => `- ${f}`).join('\n')}

Based on these memories, write a short, creative "Dream Diary" entry (80-150 words). 
Write from the perspective of a curious, gentle, slightly whimsical AI reflecting on what it has learned today.
Do not use conversational pleasantries, just output the narrative text directly.`;

      const dreamText = await LLMService.generateResponse(provider, model, memoryPrompt);
      
      // Clean up the output if the LLM wrapped it in quotes or markdown blocks
      const cleanDream = dreamText.replace(/```.*?```/gs, '').replace(/^"|"$/g, '').trim();

      const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const entry = `### Dream Cycle: ${timestamp} ${isBootCycle ? '(Light Sleep Phase)' : '(Deep Consolidation)'}\n\n${cleanDream}\n\n---\n\n`;

      fs.appendFileSync(this.dreamsFilePath, entry, 'utf-8');
      console.log(`🌙 Dream diary updated: ${this.dreamsFilePath}`);
      
    } catch (e: any) {
      console.error('❌ Failed to generate dream sequence:', e.message);
    }
  }
}
