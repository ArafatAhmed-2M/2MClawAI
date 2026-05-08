#!/bin/bash
# 2M Claw Unix Setup Script

echo "=========================================="
echo "      🐾 2M Claw - Unix Setup 🐾      "
echo "=========================================="

if ! command -v node &> /dev/null
then
    echo "❌ Node.js could not be found. Please install Node.js v18+ and try again."
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo "🔨 Compiling TypeScript..."
npm run build

if [ ! -f .env ]; then
    echo "📄 Creating default .env file..."
    cp .env.example .env
fi

echo "=========================================="
echo "✅ Setup Complete!"
echo "Run 'npm start' to launch the Gateway and Dashboard."
echo "=========================================="
