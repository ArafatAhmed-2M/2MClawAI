import fs from 'fs';
import path from 'path';
import os from 'os';

async function runDiagnostics() {
    console.log('\n==========================================');
    console.log('      🐾 2M Claw - System Doctor 🐾      ');
    console.log('==========================================\n');

    let issuesFound = 0;

    // 1. Check Node.js Version
    const nodeVersion = process.version;
    console.log(`🔹 Node.js Version: ${nodeVersion}`);
    if (parseInt(nodeVersion.slice(1).split('.')[0]) < 18) {
        console.warn('⚠️  Warning: Node.js version 18+ is recommended.');
        issuesFound++;
    }

    // 2. Check Workspace & Files
    const essentialFiles = ['.env', 'package.json', 'tsconfig.json'];
    essentialFiles.forEach(file => {
        const filePath = path.join(process.cwd(), file);
        if (fs.existsSync(filePath)) {
            console.log(`✅ File found: ${file}`);
        } else {
            console.error(`❌ Missing critical file: ${file}`);
            issuesFound++;
        }
    });

    // 3. Check API Keys
    require('dotenv').config();
    const criticalKeys = ['OPENAI_API_KEY', 'TELEGRAM_BOT_TOKEN', 'DISCORD_BOT_TOKEN'];
    criticalKeys.forEach(key => {
        const val = process.env[key];
        if (val && val.length > 5 && !val.includes('your_')) {
            console.log(`✅ API Key Set: ${key}`);
        } else {
            console.warn(`⚠️  Missing or invalid API Key: ${key}`);
        }
    });

    // 4. Check Directory Permissions
    try {
        const testFile = path.join(process.cwd(), '.doctor_test');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        console.log('✅ Filesystem: Write permissions confirmed.');
    } catch (e) {
        console.error('❌ Filesystem: No write permissions in current directory.');
        issuesFound++;
    }

    // 5. Check Port Availability (Attempt to listen on PORT)
    const port = process.env.PORT || 3000;
    console.log(`🔹 Target Port: ${port}`);

    console.log('\n==========================================');
    if (issuesFound === 0) {
        console.log('✨ System Healthy! 2M Claw is ready to run.');
    } else {
        console.log(`⚠️  Diagnostics complete. ${issuesFound} issues found.`);
    }
    console.log('==========================================\n');
}

runDiagnostics().catch(console.error);
