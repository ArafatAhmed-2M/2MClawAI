import fs from 'fs';
import path from 'path';

export class LongTermMemory {
  private dataPath: string;
  private memoryData: Record<string, any> = {};

  constructor() {
    this.dataPath = process.env.MEMORY_STORAGE_PATH || path.join(__dirname, '../../../data/memory.json');
  }

  public async initialize() {
    const dir = path.dirname(this.dataPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(this.dataPath)) {
      const content = fs.readFileSync(this.dataPath, 'utf-8');
      try {
        this.memoryData = JSON.parse(content);
      } catch (e) {
        console.warn('⚠️ Memory file corrupted, creating fresh memory.');
        this.memoryData = {};
      }
    } else {
      this.save();
    }
  }

  public get(key: string): any {
    return this.memoryData[key];
  }

  public set(key: string, value: any): void {
    this.memoryData[key] = value;
    this.save();
  }

  private save() {
    fs.writeFileSync(this.dataPath, JSON.stringify(this.memoryData, null, 2), 'utf-8');
  }
}
