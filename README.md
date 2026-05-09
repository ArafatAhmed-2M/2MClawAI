# 2M Claw 🐾

<div align="center">
  
  ![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
  ![License](https://img.shields.io/badge/license-Proprietary--NonCommercial-red.svg)
  ![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
  ![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)
  ![Windows Compatible](https://img.shields.io/badge/Windows-Native-blue.svg)

  **A Windows-friendly, GUI-first alternative to the OpenClaw AI assistant.**
  
  *Developed by [Arafat Ahmed Mubin](https://github.com/ArafatAhmed-2M) (2M Ecosystem)*
</div>

---

## 🌟 What is 2M Claw?

2M Claw is a comprehensive personal AI assistant that connects LLMs (OpenAI, Claude, Gemini, Groq, Ollama) to your favorite messaging platforms. While originally inspired by the powerful backend of **OpenClaw**, 2M Claw has been completely re-architected to be **Windows-friendly, visually stunning, and easier to use**.

Say goodbye to YAML editing and pure CLI interfaces. 2M Claw brings a beautiful dark-mode web dashboard, one-click Windows installation, and a system tray launcher to the OpenClaw ecosystem.

## 🥊 Feature Comparison

| Feature | OpenClaw | 2M Claw |
|---------|----------|----------|
| **Multi-LLM Support** | ✅ Yes | ✅ Yes (OpenAI, Claude, Gemini, Groq, Ollama) |
| **Multi-Agent Routing** | ✅ Yes | ✅ Yes |
| **Skills System** | ✅ Yes | ✅ Yes |
| **Voice Mode** | ✅ Yes | ✅ Yes |
| **Messaging Platform Sync** | ✅ Yes (20+) | ✅ Yes (20+) |
| **Windows Native Support** | ❌ Requires WSL2 | ✅ Native PowerShell Installer |
| **Web Dashboard GUI** | ❌ No | ✅ Beautiful Dark Theme GUI |
| **Multi-LLM Switcher UI** | ❌ No | ✅ Built into Dashboard |
| **Chat History UI** | ❌ No | ✅ Real-time Viewer |
| **Visual Skill Browser** | ❌ No | ✅ Browse & Install visually |
| **Cron/Scheduled Tasks UI**| ❌ YAML only | ✅ Visual Scheduler |
| **Auto-Updater** | ❌ Manual | ✅ Built-in Startup Check |
| **Proactive Mode** | ❌ No | ✅ Scheduled Digests & Summaries |
| **System Tray Launcher** | ❌ No | ✅ Built-in for Windows |

## 🚀 Quick Start (Windows)

1. Download the repository or clone it:
   ```bash
   git clone https://github.com/ArafatAhmed-2M/2MClawAI.git
   ```
2. Right-click on `setup/install-windows.ps1` and select **Run with PowerShell**.
3. Follow the wizard to install dependencies and start the application.
4. The 2M Claw Dashboard will automatically open in your browser at `http://localhost:3000`.

*Linux/Mac users: Run `bash setup/install-unix.sh`.*

## 📖 Documentation

- [Windows Setup Guide](./docs/SETUP_WINDOWS.md)
- [Detailed Features](./docs/FEATURES.md)
- [Creating Custom Skills](./docs/CREATING_SKILLS.md)

## 🛠️ Maintenance & Stability

2M Claw includes built-in diagnostic tools to ensure your system is running correctly:

- **System Doctor**: Run `npm run doctor` to check Node.js version, API key status, and directory permissions.
- **Dynamic Skill Loading**: Simply drop `.js` files into the `/skills` folder and they will be automatically loaded on the next start.
- **Automation Engine**: Full support for custom cron jobs via the Web UI, integrated directly into the LLM logic.

## 🤝 Contributing
Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**. Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📄 License
This project is licensed under the **2M Ecosystem Proprietary License**. 
It is free for personal, educational, and non-commercial use. Commercial use or resale is strictly prohibited. See the `LICENSE` file for full details.

## 📬 Contact
**Arafat Ahmed Mubin** - [futureofmyebooks@gmail.com](mailto:futureofmyebooks@gmail.com)  
Project Link: [https://github.com/ArafatAhmed-2M/2MClawAI](https://github.com/ArafatAhmed-2M/2MClawAI)  
Organization: **2M Ecosystem**
