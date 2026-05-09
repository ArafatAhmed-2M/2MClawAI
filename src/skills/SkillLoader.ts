import fs from 'fs';
import path from 'path';

export interface Skill {
    name: string;
    description: string;
    triggers: string[];
    execute: (context: any, args: any) => Promise<{ success: boolean; response: string }>;
}

export class SkillLoader {
    private static _instance: SkillLoader;
    private skills: Map<string, Skill> = new Map();
    private skillsDir!: string;

    constructor() {
        if (SkillLoader._instance) return SkillLoader._instance;
        SkillLoader._instance = this;
        this.skillsDir = path.join(process.cwd(), 'skills');
        this.initialize();
    }

    public static getInstance(): SkillLoader {
        if (!SkillLoader._instance) {
            new SkillLoader();
        }
        return SkillLoader._instance;
    }

    private initialize() {
        if (!fs.existsSync(this.skillsDir)) {
            fs.mkdirSync(this.skillsDir, { recursive: true });
        }
        this.loadSkills();
    }

    public loadSkills() {
        console.log('🔌 [Skill Loader] Scanning for skills...');
        const files = fs.readdirSync(this.skillsDir);
        
        files.forEach(file => {
            if (file.endsWith('.js') && file !== 'skill-template.js') {
                try {
                    const skillPath = path.join(this.skillsDir, file);
                    // Clear cache for hot-loading if needed
                    delete require.cache[require.resolve(skillPath)];
                    const skill: Skill = require(skillPath);
                    
                    if (skill.name) {
                        this.skills.set(skill.name, skill);
                        console.log(`✅ [Skill Loader] Loaded skill: ${skill.name}`);
                    }
                } catch (err) {
                    console.error(`❌ [Skill Loader] Failed to load skill from ${file}:`, err);
                }
            }
        });
        console.log(`🔌 [Skill Loader] Total skills active: ${this.skills.size}`);
    }

    public getSkills(): Skill[] {
        return Array.from(this.skills.values());
    }

    public findSkillByTrigger(text: string): Skill | null {
        const lowerText = text.toLowerCase();
        for (const skill of this.skills.values()) {
            if (skill.triggers.some(t => lowerText.includes(t.toLowerCase()))) {
                return skill;
            }
        }
        return null;
    }
}

export const globalSkillLoader = SkillLoader.getInstance();
