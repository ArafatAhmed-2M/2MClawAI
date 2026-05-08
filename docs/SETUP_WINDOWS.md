# 2M Claw Windows Setup Guide

## Requirements
1. **Windows 10 or 11**
2. **Node.js**: Version 18.x or higher

## Installation
1. Clone the repository: `git clone https://github.com/ArafatAhmed-2M/2MClawAI.git`
2. Navigate to the folder: `cd 2MClawAI`
3. Right-click on `setup/install-windows.ps1` and select **Run with PowerShell**.
4. The setup will automatically:
   - Verify Node.js is installed
   - Install all `npm` dependencies
   - Compile the TypeScript backend
   - Create your `.env` configuration file

## Starting 2M Claw
After installation, open your terminal (PowerShell or CMD) in the project folder and run:
```bash
npm start
```

The Web Dashboard will automatically start at `http://localhost:3000`. Open this URL in your web browser.
