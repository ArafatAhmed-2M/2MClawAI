/**
 * System Health Skill
 * Trigger: "system health" or "status"
 */

module.exports = {
    name: "System Health",
    description: "Checks the local system status and resource usage.",
    triggers: ["system health", "status check", "how are you"],
    
    execute: async (context, args) => {
        const os = require('os');
        const freeMem = Math.round(os.freemem() / 1024 / 1024);
        const totalMem = Math.round(os.totalmem() / 1024 / 1024);
        const uptime = Math.round(os.uptime() / 60);

        return {
            success: true,
            response: `🖥️ **System Health Report**\n\n- **Memory:** ${freeMem}MB free / ${totalMem}MB total\n- **Uptime:** ${uptime} minutes\n- **Platform:** ${os.platform()} (${os.arch()})\n- **Load Average:** ${os.loadavg().map(l => l.toFixed(2)).join(', ')}\n\nEverything is running smoothly! 🐾`
        };
    }
};
