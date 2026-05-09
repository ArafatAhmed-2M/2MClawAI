# 🛠️ 2M Claw: Windows Setup Guide

This guide ensures a smooth installation of the 2M Claw Agentic OS on Windows 10/11.

---

## 📋 Prerequisites

Before starting, ensure you have the following installed:
1. **Node.js (v18 or higher)**: [Download here](https://nodejs.org/)
2. **Git**: [Download here](https://git-scm.com/)
3. **PowerShell 5.1+**: (Built into Windows)

## 🚀 One-Click Installation (Recommended)

2M Claw comes with a native PowerShell installer that handles everything for you.

1. **Clone the Repo**:
   ```powershell
   git clone https://github.com/ArafatAhmed-2M/2MClawAI.git
   cd 2MClawAI
   ```

2. **Run the Installer**:
   - Locate the `setup/install-windows.ps1` file.
   - Right-click and select **Run with PowerShell**.
   - *If prompted about execution policies, type `Y` to allow the script to run.*

3. **Follow the Wizard**:
   The installer will:
   - Check your Node/NPM versions.
   - Install all required dependencies.
   - Create your `.env` configuration file.
   - Open the Dashboard at `http://localhost:3000`.

## ⚙️ Manual Setup

If you prefer to set up manually:

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   - Copy `.env.example` to `.env`.
   - Add your API keys (OpenAI, Anthropic, etc.).

3. **Build & Run**:
   ```bash
   npm run build
   # To start in production mode
   npm start
   # To start in development mode
   npm run dev
   ```

## 🩺 Verifying Success

Once running, run the diagnostic tool to confirm everything is perfect:
```bash
npm run doctor
```

## ❓ Troubleshooting

- **Port 3000 in use**: Change the `PORT` variable in your `.env` file.
- **Execution Policy Error**: Run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser` in PowerShell as Administrator.

---
*Back to [README.md](../README.md)*
