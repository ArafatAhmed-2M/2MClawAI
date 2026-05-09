import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { LLMService } from '../llm/LLMService';

export interface CronJobConfig {
    id: string;
    name: string;
    schedule: string;
    prompt: string;
    active: boolean;
}

export class CronManager {
    private static _instance: CronManager;
    private jobsFilePath!: string;
    private jobs: Map<string, CronJobConfig> = new Map();
    private scheduledTasks: Map<string, cron.ScheduledTask> = new Map();

    constructor() {
        if (CronManager._instance) {
            return CronManager._instance;
        }
        CronManager._instance = this;
        this.jobsFilePath = path.join(process.cwd(), 'cron_jobs.json');
        this.loadJobs();
    }

    public static getInstance(): CronManager {
        if (!CronManager._instance) {
            new CronManager();
        }
        return CronManager._instance;
    }

    private loadJobs() {
        if (!fs.existsSync(this.jobsFilePath)) {
            // Create a default job to demonstrate functionality
            const defaultJob: CronJobConfig = {
                id: 'default-digest',
                name: 'Morning Digest',
                schedule: '0 9 * * *',
                prompt: 'Analyze yesterday’s logs and generate a short daily digest of system health.',
                active: true
            };
            this.jobs.set(defaultJob.id, defaultJob);
            this.saveJobs();
        } else {
            try {
                const data = fs.readFileSync(this.jobsFilePath, 'utf-8');
                const parsed: CronJobConfig[] = JSON.parse(data);
                parsed.forEach(job => this.jobs.set(job.id, job));
            } catch (err) {
                console.error('❌ Failed to load cron_jobs.json:', err);
            }
        }
    }

    private saveJobs() {
        const jobsArray = Array.from(this.jobs.values());
        fs.writeFileSync(this.jobsFilePath, JSON.stringify(jobsArray, null, 2), 'utf-8');
    }

    public startAll() {
        console.log(`🕒 Starting ${this.jobs.size} automation cron jobs...`);
        this.jobs.forEach(job => {
            if (job.active) {
                this.scheduleJob(job);
            }
        });
    }

    private scheduleJob(job: CronJobConfig) {
        if (!cron.validate(job.schedule)) {
            console.error(`❌ Invalid cron expression for job ${job.name}: ${job.schedule}`);
            return;
        }

        // Cancel existing if redefining
        if (this.scheduledTasks.has(job.id)) {
            this.scheduledTasks.get(job.id)?.stop();
        }

        const task = cron.schedule(job.schedule, async () => {
            console.log(`\n[Cron Trigger] Executing Automation: ${job.name}`);
            try {
                const defaultProvider = process.env.DEFAULT_PROVIDER;
                const defaultModel = process.env.DEFAULT_MODEL;
                const { provider, model } = defaultProvider && defaultModel
                  ? { provider: defaultProvider, model: defaultModel }
                  : LLMService.getDefaultProviderAndModel();

                // Generate response
                const reply = await LLMService.generateResponse(provider, model, `CRON JOB TRIGGERED [${job.name}]: ${job.prompt}`);
                
                // Parse potential actions (same logic as webhook ingress)
                const commandMatch = reply.match(/```(?:system_command|json)?\n?([\s\S]*?)\n?```/);
                let commandStr = null;
                if (commandMatch && commandMatch[1].includes('"action"')) {
                    commandStr = commandMatch[1];
                } else {
                    const fallbackMatch = reply.match(/({[\s\S]*?"action"[\s\S]*})/);
                    if (fallbackMatch) commandStr = fallbackMatch[1];
                }

                if (commandStr) {
                    const cmd = JSON.parse(commandStr);
                    console.log(`[Cron Automation] Extracted action: ${cmd.action}`);
                    // Execute action (this assumes the AI's action handler is elsewhere, but for now we log it. 
                    // In a full system, you would abstract action execution into an AgentExecutor class.
                    // For the sake of this file, we let the AI's standard system prompt dictate the action.)
                } else {
                    console.log(`[Cron Automation] Execution completed without file actions. Response: ${reply.substring(0, 50)}...`);
                }
            } catch (err: any) {
                console.error(`❌ Cron Job Execution Failed (${job.name}):`, err.message);
            }
        });

        this.scheduledTasks.set(job.id, task);
        console.log(`🕒 Scheduled: [${job.name}] at ${job.schedule}`);
    }

    public addJob(name: string, schedule: string, prompt: string): CronJobConfig {
        const id = 'cron_' + Date.now().toString(36);
        const job: CronJobConfig = { id, name, schedule, prompt, active: true };
        this.jobs.set(id, job);
        this.saveJobs();
        this.scheduleJob(job);
        return job;
    }

    public deleteJob(id: string) {
        if (this.scheduledTasks.has(id)) {
            this.scheduledTasks.get(id)?.stop();
            this.scheduledTasks.delete(id);
        }
        this.jobs.delete(id);
        this.saveJobs();
    }

    public toggleJob(id: string, active: boolean) {
        const job = this.jobs.get(id);
        if (job) {
            job.active = active;
            this.saveJobs();
            if (active) {
                this.scheduleJob(job);
            } else {
                if (this.scheduledTasks.has(id)) {
                    this.scheduledTasks.get(id)?.stop();
                }
            }
        }
    }

    public getAllJobs(): CronJobConfig[] {
        return Array.from(this.jobs.values());
    }
}

export const globalCronManager = new CronManager();
